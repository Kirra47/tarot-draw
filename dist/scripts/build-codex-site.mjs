import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
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

// Copy every root stylesheet instead of a hand-kept list: the previous list
// omitted tarot-ui-v3.css and settings-trial.css, so a build from it shipped the
// page without its layout.
const stylesheets = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
  .map((entry) => entry.name);

for (const filename of [
  "index.html",
  "tarot.html",
  "manifest.webmanifest",
  "service-worker.js",
  "tarot-bg.jpg",
  "tarot-bg.png",
  ...stylesheets,
]) {
  await cp(join(root, filename), join(dist, filename));
}

await mkdir(join(dist, ".openai"), { recursive: true });
await writeFile(
  join(dist, ".openai", "hosting.json"),
  `${JSON.stringify({ project_id: hosting.project_id }, null, 2)}\n`,
);

console.log(`Built Codex Site static assets from ${["assets", "books", "knowledge", "scripts", "vendor"].length} asset groups and ${stylesheets.length} stylesheets.`);
