import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const hostingPath = join(root, ".openai", "hosting.json");
const hosting = JSON.parse(await readFile(hostingPath, "utf8"));
if (!hosting.project_id) throw new Error("Missing Site project_id in .openai/hosting.json");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const directory of ["assets", "books", "knowledge", "scripts", "vendor"]) {
  await cp(join(root, directory), join(dist, directory), { recursive: true });
}

for (const filename of [
  "index.html",
  "tarot.html",
  "emil-redesign.css",
  "manifest.webmanifest",
  "service-worker.js",
  "tarot-bg.jpg",
  "tarot-bg.png",
]) {
  await cp(join(root, filename), join(dist, filename));
}

await mkdir(join(dist, ".openai"), { recursive: true });
await mkdir(join(dist, "server"), { recursive: true });
await writeFile(
  join(dist, ".openai", "hosting.json"),
  `${JSON.stringify({ project_id: hosting.project_id }, null, 2)}\n`,
);
await cp(join(root, "worker", "index.js"), join(dist, "server", "index.js"));
await cp(
  join(root, "netlify", "functions", "tarot-reading.mjs"),
  join(dist, "server", "tarot-reading.mjs"),
);

console.log(`Built Codex Site worker and ${["assets", "books", "knowledge", "scripts", "vendor"].length} static asset groups.`);
