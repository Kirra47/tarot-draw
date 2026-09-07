const { chromium } = require("playwright");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

function sse(text) {
  return text.match(/.{1,18}/gs).map((content) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
  ).join("") + "data: [DONE]\n\n";
}

async function finishThreeCards(page) {
  async function selectAndConfirmCard() {
    const directPoints = [[650, 420], [620, 420], [680, 420], [650, 390], [650, 460]];
    for (const [x, y] of directPoints) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(120);
      await page.mouse.click(x, y);
      const shown = await page.locator("#cardInfo").waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false);
      if (shown) {
        await page.mouse.click(x, y);
        await page.locator("#cardInfo").waitFor({ state: "hidden", timeout: 5_000 });
        return;
      }
    }
    await page.waitForFunction(() => document.querySelector("#c")?.style.cursor === "pointer", null, { timeout: 15_000 }).catch(() => {});
    for (let attempt = 0; attempt < 12; attempt += 1) {
      let target = null;
      for (let y = 160; y <= 720 && !target; y += 32) {
        for (let x = 100; x <= 1180; x += 32) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(20);
          if (await page.locator("#c").evaluate((canvas) => canvas.style.cursor === "pointer")) {
            target = { x, y };
            break;
          }
        }
      }
      if (!target) { await page.waitForTimeout(600); continue; }
      await page.mouse.click(target.x, target.y);
      const shown = await page.locator("#cardInfo").waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false);
      if (!shown) continue;
      await page.mouse.click(target.x, target.y);
      await page.locator("#cardInfo").waitFor({ state: "hidden", timeout: 5_000 });
      return;
    }
    throw new Error("无法完成一次抽牌");
  }
  for (let index = 0; index < 3; index += 1) await selectAndConfirmCard();
  await page.locator("#meihuaPanel:not([hidden])").waitFor({ state: "visible", timeout: 8_000 });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/api/tarot-reading", async (route) => route.fulfill({
    status: 200,
    contentType: "text/event-stream; charset=utf-8",
    body: sse("## 牌面总览\n模式测试完成。"),
  }));

  await page.goto(`${baseUrl}/tarot.html?mode-test=three`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.selectOption("#castMode", "three");
  await page.fill("#castNum1", "17");
  await page.fill("#castNum2", "26");
  await page.fill("#castNum3", "8");
  const explicitFieldsVisible = await page.locator("#threeNumberFields:not([hidden])").count() === 1;
  await page.selectOption("#castMode", "auto");
  await page.fill("#questionInput", "请用 17、26、8 这三个数字起卦");
  const autoFieldsHidden = await page.locator("#threeNumberFields[hidden]").count() === 1;
  await page.locator("#questionConfirm").click();
  await finishThreeCards(page);
  const three = await page.evaluate(() => ({
    summary: document.querySelector("#meihuaSummary")?.textContent || "",
    trace: document.querySelector("#meihuaTraceText")?.textContent || "",
    observationHidden: Boolean(document.querySelector("#meihuaObservation")?.hidden),
  }));

  await page.locator("#settleClose").click();
  await page.locator("#castMode").waitFor({ state: "visible" });
  await page.selectOption("#castMode", "shooting");
  await page.fill("#questionInput", "他手里握着什么东西？");
  await page.fill("#castDetailInput", "只描述候选，不提前揭示答案");
  const shootingVisible = await page.locator("#castDetailField:not([hidden])").count() === 1;
  await page.locator("#questionConfirm").click();
  await finishThreeCards(page);
  const shooting = await page.evaluate(() => ({
    summary: document.querySelector("#meihuaSummary")?.textContent || "",
    labels: [...document.querySelectorAll("#meihuaObservationGrid .meihuaObservationCell span")].map((node) => node.textContent),
    values: [...document.querySelectorAll("#meihuaObservationGrid .meihuaObservationCell strong")].map((node) => node.textContent),
  }));

  const result = { explicitFieldsVisible, autoFieldsHidden, three, shootingVisible, shooting, errors };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!explicitFieldsVisible || !autoFieldsHidden || !three.summary.includes("三个数字起卦") || !three.trace.includes("17、26、8") || !three.observationHidden ||
      !shootingVisible || !shooting.summary.includes("射覆") || shooting.labels.length !== 5 ||
      !shooting.labels.includes("颜色倾向") || !shooting.labels.includes("候选物品") || errors.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exit(1); });
