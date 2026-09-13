const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "assets", "icons", "tarot-icon.svg");
const outputDir = path.dirname(source);
const background = "#07060b";

async function render(name, size) {
  await sharp(source)
    .resize(size, size)
    .flatten({ background })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDir, name));
}

Promise.all([
  render("tarot-icon-192.png", 192),
  render("tarot-icon-512.png", 512),
  render("tarot-maskable-512.png", 512),
  render("apple-touch-icon.png", 180),
]).then(async () => {
  const files = await fs.readdir(outputDir);
  console.log(files.filter((file) => file.endsWith(".png")).sort().join("\n"));
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
