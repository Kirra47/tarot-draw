const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const sharp = require("sharp");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/api/tarot-reading", (route) => route.fulfill({ status: 200, contentType: "text/event-stream", body: "data: [DONE]\n\n" }));

  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.locator('.spreadOption[data-count="5"]').click();
  await page.locator("#questionInput").fill("五牌阵海报布局验证");
  await page.locator("#questionConfirm").click();
  if (await page.locator("#appNotice.show").isVisible().catch(() => false)) await page.locator("#appNoticeDismiss").click();

  async function selectAndConfirmCard() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let target = null;
      for (let y = 180; y <= 700 && !target; y += 35) {
        for (let x = 120; x <= 1160; x += 35) {
          await page.mouse.move(x, y);await page.waitForTimeout(22);
          if (await page.locator("#c").evaluate((canvas) => canvas.style.cursor === "pointer")) { target = { x, y }; break; }
        }
      }
      if (!target) { await page.waitForTimeout(350); continue; }
      await page.mouse.click(target.x, target.y);
      const visible = await page.locator("#cardInfo").waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false);
      if (!visible) continue;
      await page.mouse.click(target.x, target.y);
      await page.locator("#cardInfo").waitFor({ state: "hidden", timeout: 5_000 });
      return;
    }
    throw new Error("Could not select a card after three attempts");
  }

  for (let i = 0; i < 5; i += 1) await selectAndConfirmCard();
  await page.locator("#settleOverlay.show").waitFor({ state: "visible", timeout: 8_000 });
  await page.locator("#shareReadingBtn").click();
  await page.waitForFunction(() => document.querySelector("#posterPreview")?.naturalWidth === 1080);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#posterSave").click();
  const download = await downloadPromise;const downloadPath = await download.path();
  await fs.copyFile(downloadPath, "D:/codex/outputs/tarot-share-poster-five.png");
  const metadata = await sharp(downloadPath).metadata();
  const result = { width: metadata.width, height: metadata.height, filename: download.suggestedFilename(), errors };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (metadata.width !== 1080 || metadata.height !== 1440 || errors.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exit(1); });
