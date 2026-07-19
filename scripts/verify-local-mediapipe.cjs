const { chromium } = require("playwright");

const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.grantPermissions(["camera"], { origin: baseUrl });
  const page = await context.newPage();
  const localRuntime = new Set();
  const external = new Set();
  const errors = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes("/vendor/mediapipe/")) localRuntime.add(url.pathname);
    if (url.origin !== baseUrl) external.add(url.origin);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.locator("#questionConfirm").click();
  await page.waitForTimeout(600);
  await page.locator("#modeBtn").click();
  await page.waitForTimeout(12_000);

  const result = {
    button: await page.locator("#modeBtn").textContent(),
    mode: await page.locator("#gestureInfo").textContent(),
    cameraVisible: await page.locator("#camWrap").isVisible(),
    localRuntime: [...localRuntime],
    external: [...external],
    errors,
  };
  await page.locator("#modeBtn").click();
  await page.waitForTimeout(250);
  result.afterExit = {
    button: await page.locator("#modeBtn").textContent(),
    cameraVisible: await page.locator("#camWrap").isVisible(),
    videoHasStream: await page.locator("#camVid").evaluate((video) => Boolean(video.srcObject)),
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    !result.button.includes("退出手势") ||
    !result.cameraVisible ||
    result.afterExit.cameraVisible ||
    result.afterExit.videoHasStream ||
    !result.afterExit.button.includes("启用手势") ||
    result.external.length ||
    result.errors.length
  ) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
