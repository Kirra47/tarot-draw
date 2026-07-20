const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const sharp = require("sharp");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

function sse(text) {
  return text
    .match(/.{1,18}/gs)
    .map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
    .join("") + "data: [DONE]\n\n";
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: (data) => Boolean(data?.files?.length) });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => { window.__sharedPoster = { name: data.files?.[0]?.name, type: data.files?.[0]?.type, size: data.files?.[0]?.size }; },
    });
  });
  const requests = [];
  const errors = [];
  let failNextFollowup = false;

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/api/tarot-reading", async (route) => {
    const payload = route.request().postDataJSON();
    requests.push(payload);
    if (payload.followUp && failNextFollowup) {
      failNextFollowup = false;
      await route.fulfill({ status: 200, contentType: "text/event-stream; charset=utf-8", body: "data: [DONE]\n\n" });
      return;
    }
    const answer = payload.followUp
      ? `继续回答：${payload.followUp}。把牌面洞察转化为一个可以验证的小行动。`
      : "## 牌面总览\n这是一段用于回归测试的初次解读。\n\n## 综合指引\n观察现实证据，再决定下一步。";
    await route.fulfill({ status: 200, contentType: "text/event-stream; charset=utf-8", body: sse(answer) });
  });

  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.locator("#questionInput").fill("接下来最值得投入的方向是什么？");
  await page.locator("#questionConfirm").click();
  if (await page.locator("#appNotice.show").isVisible().catch(() => false)) await page.locator("#appNoticeDismiss").click();

  async function selectAndConfirmCard() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let target = null;
      for (let y = 180; y <= 700 && !target; y += 35) {
        for (let x = 120; x <= 1160; x += 35) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(22);
          if (await page.locator("#c").evaluate((canvas) => canvas.style.cursor === "pointer")) {
            target = { x, y };
            break;
          }
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

  for (let i = 0; i < 3; i += 1) await selectAndConfirmCard();
  await page.locator("#settleOverlay.show").waitFor({ state: "visible", timeout: 8_000 });
  await page.locator("#followupPanel.show").waitFor({ state: "visible", timeout: 5_000 });

  await page.locator(".followupChip").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".followupTurn").length === 2);
  await page.waitForFunction(() => !document.querySelector("#followupSubmit").disabled);

  await page.locator("#shareReadingBtn").click();
  await page.locator("#posterOverlay.show").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector("#posterPreview")?.naturalWidth === 1080);
  const previewDimensions = await page.locator("#posterPreview").evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight }));
  const firstPreviewUrl = await page.locator("#posterPreview").getAttribute("src");
  await page.locator("#posterQuestionToggle").uncheck();
  await page.waitForFunction((previous) => document.querySelector("#posterPreview")?.src !== previous && document.querySelector("#posterPreview")?.naturalWidth === 1080, firstPreviewUrl);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#posterSave").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  await fs.copyFile(downloadPath, "D:/codex/outputs/tarot-share-poster.png");
  const posterMetadata = await sharp(downloadPath).metadata();
  await page.locator("#posterShare").click();
  await page.waitForFunction(() => window.__sharedPoster?.size > 0);
  const sharedPoster = await page.evaluate(() => window.__sharedPoster);
  await page.screenshot({ path: "D:/codex/outputs/tarot-poster-preview.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "D:/codex/outputs/tarot-poster-preview-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator("#posterClose").click();

  failNextFollowup = true;
  await page.locator(".followupChip").nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll(".followupTurn").length === 4);
  await page.waitForFunction(() => !document.querySelector("#followupSubmit").disabled);

  const result = await page.evaluate(() => {
    const history = JSON.parse(localStorage.getItem("tarot-reading-history-v3") || "[]");
    const latest = history.at(-1) || {};
    return {
      count: document.querySelector("#followupCount").textContent,
      turns: [...document.querySelectorAll(".followupTurn")].map((node) => ({
        role: node.classList.contains("user") ? "user" : "assistant",
        local: node.classList.contains("local"),
        text: node.innerText.slice(0, 80),
      })),
      savedInitial: Boolean(latest.aiReading),
      savedFollowups: latest.followUps?.length || 0,
    };
  });
  result.poster = { previewDimensions, metadata: { width: posterMetadata.width, height: posterMetadata.height }, sharedPoster };
  result.requests = requests.map((payload) => ({
    followUp: payload.followUp || null,
    conversationTurns: payload.conversation?.length || 0,
  }));
  result.errors = errors;
  await page.screenshot({ path: "D:/codex/outputs/tarot-followup.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  result.mobileLayout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    widest: [...document.querySelectorAll("body *")]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { tag: node.tagName, id: node.id, className: String(node.className || ""), left: rect.left, right: rect.right, width: rect.width };
      })
      .filter((item) => item.width > 390 || item.right > 391 || item.left < -1)
      .sort((a, b) => b.width - a.width)
      .slice(0, 8),
  }));
  await page.screenshot({ path: "D:/codex/outputs/tarot-followup-mobile.png", fullPage: true });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    result.count.trim() !== "2 / 4" ||
    result.turns.length !== 4 ||
    !result.turns[3].local ||
    !result.savedInitial ||
    result.savedFollowups !== 4 ||
    result.requests[1]?.conversationTurns !== 1 ||
    result.poster.previewDimensions.width !== 1080 || result.poster.previewDimensions.height !== 1440 ||
    result.poster.metadata.width !== 1080 || result.poster.metadata.height !== 1440 ||
    result.poster.sharedPoster.type !== "image/png" || !result.poster.sharedPoster.name.endsWith(".png") ||
    result.mobileLayout.scrollWidth > result.mobileLayout.viewportWidth + 1 ||
    errors.length
  ) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
