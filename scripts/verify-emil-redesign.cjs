const { chromium } = require("playwright");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

async function inspect(page, viewport) {
  await page.goto(`${baseUrl}/tarot.html?design=${viewport.width}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  if (await page.locator("#appNotice.show").count()) {
    await page.locator("#appNoticeDismiss").click();
  }

  const entry = await page.evaluate(() => {
    const title = document.querySelector("#questionTitle");
    const input = document.querySelector("#questionInput");
    const confirm = document.querySelector("#questionConfirm");
    const archive = document.querySelector("#questionArchive");
    const spread = document.querySelector(".spreadOption");
    const styleSheets = [...document.styleSheets].map((sheet) => sheet.href || "");
    return {
      stylesheetLoaded: styleSheets.some((href) => href.includes("emil-redesign.css")),
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      inputSize: parseFloat(getComputedStyle(input).fontSize),
      confirmHeight: confirm.getBoundingClientRect().height,
      archiveHeight: archive.getBoundingClientRect().height,
      spreadHeight: spread.getBoundingClientRect().height,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: title.textContent.trim(),
      confirm: confirm.textContent.trim(),
    };
  });

  await page.locator("#questionArchive").click();
  await page.locator("#histPanel").waitFor({ state: "visible" });
  const archive = await page.evaluate(() => {
    const panel = document.querySelector("#histPanel");
    return {
      background: getComputedStyle(panel).backgroundColor,
      modal: panel.classList.contains("modalArchive"),
      width: panel.getBoundingClientRect().width,
    };
  });
  await page.locator("#histClose").click();

  await page.locator("#questionConfirm").click();
  await page.waitForTimeout(300);
  const ritual = await page.evaluate(() => ({
    overlayHidden: document.querySelector("#questionOverlay").classList.contains("hidden"),
    headerVisible: getComputedStyle(document.querySelector("#topBar")).display !== "none",
    cameraVisible: document.querySelector("#camWrap").getBoundingClientRect().width > 0,
  }));

  return { viewport, entry, archive, ritual };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const errors = [];
  const results = [];

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    results.push(await inspect(page, viewport));
    await context.close();
  }

  await browser.close();
  const report = { results, errors };
  console.log(JSON.stringify(report, null, 2));

  const valid = results.every(({ viewport, entry, archive, ritual }) =>
    entry.stylesheetLoaded &&
    entry.titleSize >= (viewport.width <= 720 ? 33 : 38) &&
    entry.inputSize >= 16 &&
    entry.confirmHeight >= 54 &&
    entry.archiveHeight >= 46 &&
    entry.spreadHeight >= 72 &&
    entry.horizontalOverflow <= 1 &&
    entry.title.includes("交给牌面") &&
    entry.confirm.includes("开始抽牌") &&
    archive.modal &&
    archive.width <= viewport.width &&
    ritual.overlayHidden &&
    ritual.headerVisible &&
    !ritual.cameraVisible
  );

  if (!valid || errors.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
