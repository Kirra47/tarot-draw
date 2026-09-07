const { chromium } = require("playwright");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

function sse(text) {
  return text.match(/.{1,18}/gs).map((content) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
  ).join("") + "data: [DONE]\n\n";
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/api/tarot-reading", async (route) => {
    const payload = route.request().postDataJSON();
    requests.push(payload);
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body: sse("## 牌面总览\n梅花同步资料已收到。\n\n## 梅花易数观照\n沿用本次卦象。"),
    });
  });
  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.fill("#questionInput", "我最近的项目该怎么推进？");
  await page.locator("#questionConfirm").click();

  async function selectAndConfirmCard() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let target = null;
      for (let y = 180; y <= 700 && !target; y += 35) {
        for (let x = 120; x <= 1160; x += 35) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(20);
          if (await page.locator("#c").evaluate((canvas) => canvas.style.cursor === "pointer")) {
            target = { x, y };
            break;
          }
        }
      }
      if (!target) { await page.waitForTimeout(300); continue; }
      await page.mouse.click(target.x, target.y);
      if (!await page.locator("#cardInfo").waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false)) continue;
      await page.mouse.click(target.x, target.y);
      await page.locator("#cardInfo").waitFor({ state: "hidden", timeout: 5_000 });
      return;
    }
    throw new Error("无法完成一次抽牌");
  }

  for (let i = 0; i < 3; i += 1) await selectAndConfirmCard();
  await page.locator("#meihuaPanel:not([hidden])").waitFor({ state: "visible", timeout: 8_000 });
  await page.locator("#followupPanel.show").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator(".followupChip").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".followupTurn").length === 2);
  await page.locator(".meihuaSupporting summary").click();

  const result = await page.evaluate(() => {
    const text = (id) => document.querySelector(id)?.textContent?.trim() || "";
    const history = JSON.parse(localStorage.getItem("tarot-reading-history-v3") || "[]");
    const latest = history.at(-1) || {};
    return {
      panelVisible: !document.querySelector("#meihuaPanel")?.hidden,
      baseHexagram: text("#meihuaTitle"),
      baseReading: text("#meihuaBaseReading"),
      lineCount: document.querySelectorAll("#meihuaBaseReading .hexagramLine").length,
      supportingOpen: Boolean(document.querySelector(".meihuaSupporting")?.open),
      tarotReferenceOpen: Boolean(document.querySelector("#tarotReference")?.open),
      aiTitle: text("#aiReadingTitle"),
      question: text("#readingQuestion"),
      summary: text("#meihuaSummary"),
      cells: [...document.querySelectorAll("#meihuaGrid .meihuaCell")].map((node) => node.innerText),
      trace: text("#meihuaTraceText"),
      sourceColor: getComputedStyle(document.querySelector("#meihuaSourceLink")).color,
      historyHasMeihua: Boolean(latest.meihua?.inputs),
      historyHexagram: latest.meihua?.upper && latest.meihua?.lower ? `${latest.meihua.upper}-${latest.meihua.lower}` : "",
    };
  });
  result.requests = requests.map((payload) => ({
    hasMeihua: Boolean(payload.meihua),
    sameMeihua: payload.meihua === requests[0]?.meihua,
    followUp: payload.followUp || null,
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  result.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: "D:/codex/outputs/tarot-base-reading-mobile.png", fullPage: true });
  result.errors = errors;
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    !result.panelVisible ||
    !result.baseHexagram ||
    !result.baseReading.includes("本卦主题") ||
    !result.baseReading.includes("用白话读这一卦") ||
    !result.baseReading.includes("放回你的问题") ||
    !result.baseReading.includes("二爻 · 承接") ||
    result.lineCount !== 6 ||
    !result.supportingOpen ||
    result.tarotReferenceOpen ||
    result.mobileOverflow ||
    result.aiTitle !== "本卦重点分析" ||
    !result.question.includes("项目") ||
    result.cells.length !== 5 ||
    !result.summary.includes("第一张牌") ||
    !result.summary.includes("体卦") ||
    !result.trace.includes("上卦取数") ||
    !result.historyHasMeihua ||
    result.requests.length < 2 ||
    !result.requests.every((request) => request.hasMeihua) ||
    !result.requests.slice(1).every((request) => request.sameMeihua) ||
    result.errors.length
  ) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
