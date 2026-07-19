const { chromium } = require("playwright");
const fs = require("node:fs/promises");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.addInitScript(() => {
    const day = 86_400_000;
    const now = Date.now();
    const card = (name, reversed, extra = {}) => ({ name, reversed, meaning: "测试牌意", ...extra });
    const readings = [
      {
        id: now - day * 8, time: now - day * 8, question: "旧记录里关于职业方向的问题", spread: 3,
        cards: [card("The Star 星星", false), card("Ace of Wands · 权杖A", false), card("Two of Cups · 圣杯二", true)],
        aiReading: "完整的初次深层观照文本。",
        followUps: [{ role: "user", content: "我该先做什么？" }, { role: "assistant", content: "先做一个小范围验证。" }],
      },
      {
        id: now - day * 3, time: now - day * 3, question: "关系中的边界", spread: 3,
        cards: [card("The Star 星星", false, { id: 17, type: "major" }), card("Three of Wands · 权杖三", false, { id: 24, type: "minor", suit: "Wands" }), card("Ace of Swords · 宝剑A", true, { id: 50, type: "minor", suit: "Swords" })],
      },
      {
        id: now - day * 2, time: now - day * 2, question: "学习计划", spread: 3,
        cards: [card("The Star 星星", true, { id: 17, type: "major" }), card("Four of Wands · 权杖四", false, { id: 25, type: "minor", suit: "Wands" }), card("Two of Swords · 宝剑二", false, { id: 51, type: "minor", suit: "Swords" })],
      },
      {
        id: now - day, time: now - day, question: "创作项目", spread: 3,
        cards: [card("The Star 星星", false, { id: 17, type: "major" }), card("Five of Wands · 权杖五", false, { id: 26, type: "minor", suit: "Wands" }), card("Three of Cups · 圣杯三", false, { id: 38, type: "minor", suit: "Cups" })],
      },
      {
        id: now, time: now, question: "现实资源如何安排", spread: 3,
        cards: [card("The Hermit 隐者", true, { id: 9, type: "major" }), card("Six of Wands · 权杖六", false, { id: 27, type: "minor", suit: "Wands" }), card("Ace of Pentacles · 星币A", false, { id: 64, type: "minor", suit: "Pentacles" })],
      },
    ];
    localStorage.setItem("tarot-reading-history-v3", JSON.stringify(readings));
  });

  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.locator("#questionArchive").click();
  await page.locator("#histPanel").waitFor({ state: "visible" });

  const overview = {
    readings: await page.locator("#archiveReadingCount").textContent(),
    cards: await page.locator("#archiveCardCount").textContent(),
    upright: await page.locator("#archiveUprightRate").textContent(),
    topCard: await page.locator("#archiveTopCard").textContent(),
    element: await page.locator("#archiveElement").textContent(),
    activeDays: await page.locator(".archiveDay").evaluateAll((nodes) => nodes.filter((node) => node.style.getPropertyValue("--activity") !== "0%").length),
  };

  await page.locator(".histItem:has(.histTranscript) > summary").click();
  await page.locator(".histTranscript summary").click();
  const transcript = await page.locator(".histTranscriptBody").innerText();

  await page.locator("#historySearch").fill("星星");
  const starMatches = await page.locator(".histItem").count();
  await page.locator("#historySearch").fill("");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#histExport").click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const exported = JSON.parse(await fs.readFile(downloadPath, "utf8"));

  await page.screenshot({ path: "D:/codex/outputs/tarot-archive.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "D:/codex/outputs/tarot-archive-mobile.png", fullPage: true });

  await page.locator("#histClear").click();
  const afterFirstClear = JSON.parse(await page.evaluate(() => localStorage.getItem("tarot-reading-history-v3"))).length;
  await page.locator("#histClear").click();
  const afterConfirmedClear = await page.evaluate(() => localStorage.getItem("tarot-reading-history-v3"));

  const result = {
    overview,
    transcriptSaved: transcript.includes("完整的初次深层观照文本") && transcript.includes("我该先做什么"),
    starMatches,
    export: { format: exported.format, readings: exported.readings?.length, filename: download.suggestedFilename() },
    clearGuard: { afterFirstClear, afterConfirmedClear },
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    overview.readings !== "5" || overview.cards !== "15" || overview.upright !== "73%" ||
    !overview.topCard.includes("星星 · 4次") || !overview.element.includes("火") ||
    overview.activeDays !== 4 || !result.transcriptSaved || starMatches !== 4 ||
    result.export.format !== "astral-tarot-archive" || result.export.readings !== 5 ||
    afterFirstClear !== 5 || afterConfirmedClear !== null || errors.length
  ) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
