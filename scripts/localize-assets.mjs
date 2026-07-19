import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const THREE_VERSION = "0.160.0";
const MEDIAPIPE_VERSION = "0.4.1675469240";
const TAROT_IMAGE_COMMIT = "e6414a098acc87831a8953bca7576b033b2fda54";

const majorFiles = Array.from({ length: 22 }, (_, i) => `ar${String(i).padStart(2, "0")}.jpg`);
const suitCodes = ["wa", "cu", "sw", "pe"];
const rankCodes = ["ac", "02", "03", "04", "05", "06", "07", "08", "09", "10", "pa", "kn", "qu", "ki"];
const minorFiles = suitCodes.flatMap((suit) => rankCodes.map((rank) => `${suit}${rank}.jpg`));
const cardFiles = [...majorFiles, ...minorFiles];

function tarotImageSource(localFile) {
  if (localFile.startsWith("ar")) return `m${localFile.slice(2)}`;
  const suitMap = { wa: "w", cu: "c", sw: "s", pe: "p" };
  const rankMap = { ac: "01", pa: "11", kn: "12", qu: "13", ki: "14" };
  const suit = suitMap[localFile.slice(0, 2)];
  const rawRank = localFile.slice(2, 4);
  const rank = rankMap[rawRank] || rawRank;
  return `${suit}${rank}.jpg`;
}

const mediapipeFiles = [
  ["hands.js", 40_000],
  ["hands.binarypb", 100],
  ["hand_landmark_full.tflite", 5_000_000],
  ["hand_landmark_lite.tflite", 2_000_000],
  ["hands_solution_packed_assets_loader.js", 7_000],
  ["hands_solution_packed_assets.data", 4_000_000],
  ["hands_solution_simd_wasm_bin.data", 0],
  ["hands_solution_simd_wasm_bin.js", 250_000],
  ["hands_solution_simd_wasm_bin.wasm", 5_500_000],
  ["hands_solution_wasm_bin.js", 250_000],
  ["hands_solution_wasm_bin.wasm", 5_500_000],
];

const targets = [
  {
    path: "vendor/three/three.module.min.js",
    url: `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.min.js`,
    minBytes: 500_000,
  },
  {
    path: "vendor/three/LICENSE",
    url: `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/LICENSE`,
    minBytes: 500,
  },
  {
    path: "vendor/mediapipe/hands/LICENSE",
    url: "https://www.apache.org/licenses/LICENSE-2.0.txt",
    minBytes: 10_000,
  },
  ...mediapipeFiles.map(([file, minBytes]) => ({
    path: `vendor/mediapipe/hands/${file}`,
    url: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/${file}`,
    minBytes,
  })),
  ...cardFiles.map((file) => ({
    path: `assets/cards/${file}`,
    url: `https://raw.githubusercontent.com/metabismuth/tarot-json/${TAROT_IMAGE_COMMIT}/cards/${tarotImageSource(file)}`,
    minBytes: 1_000,
    jpeg: true,
  })),
];

function validateBuffer(buffer, target) {
  if (buffer.length < target.minBytes) {
    throw new Error(`${target.path}: expected at least ${target.minBytes} bytes, received ${buffer.length}`);
  }
  if (target.jpeg && !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    throw new Error(`${target.path}: response is not a JPEG file`);
  }
}

async function getExisting(target) {
  const fullPath = join(ROOT, target.path);
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return null;
    const buffer = await readFile(fullPath);
    validateBuffer(buffer, target);
    return buffer;
  } catch {
    return null;
  }
}

async function download(target) {
  const existing = await getExisting(target);
  if (existing) return { ...target, buffer: existing, status: "cached" };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(target.url, {
        headers: { "user-agent": "tarot-draw-asset-localizer/1.0" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      validateBuffer(buffer, target);
      const fullPath = join(ROOT, target.path);
      const tempPath = `${fullPath}.download`;
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(tempPath, buffer);
      await rm(fullPath, { force: true });
      await rename(tempPath, fullPath);
      return { ...target, buffer, status: "downloaded" };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`${target.path}: ${lastError?.message || "download failed"}`);
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function consume() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, consume));
  return results;
}

console.log(`Localizing ${targets.length} files (${cardFiles.length} tarot cards)...`);
let completed = 0;
const results = await runPool(targets, 6, async (target) => {
  const result = await download(target);
  completed += 1;
  console.log(`[${completed}/${targets.length}] ${result.status.padEnd(10)} ${target.path}`);
  return result;
});

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  versions: {
    three: THREE_VERSION,
    mediapipeHands: MEDIAPIPE_VERSION,
    tarotImages: `metabismuth/tarot-json@${TAROT_IMAGE_COMMIT}`,
  },
  counts: { total: results.length, cards: cardFiles.length },
  files: results.map(({ path, url, buffer }) => ({
    path,
    source: url,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  })),
};

await writeFile(join(ROOT, "assets/asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Done. Wrote assets/asset-manifest.json with ${results.length} traceable entries.`);
