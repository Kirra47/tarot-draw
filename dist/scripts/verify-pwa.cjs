const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const baseUrl = process.env.TAROT_URL || "http://127.0.0.1:8766";

function loadChromium() {
  for (const id of ["playwright", "playwright-core", "D:/npm-global/node_modules/openclaw/node_modules/playwright-core"]) {
    try { return require(id).chromium; } catch {}
  }
  throw new Error("No playwright/playwright-core found; cannot run the browser checks.");
}

function pngDimensions(buffer) {
  assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a", "icon must be a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function cardCacheCount(page, cacheVersion) {
  return page.evaluate(async (version) => {
    const key = `${version}-assets`;
    if (!(await caches.keys()).includes(key)) return 0;
    const requests = await (await caches.open(key)).keys();
    return requests.filter((request) => new URL(request.url).pathname.includes("/assets/cards/")).length;
  }, cacheVersion);
}

async function waitForCardCache(page, cacheVersion, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await cardCacheCount(page, cacheVersion);
    if (count === 78) return count;
    await page.waitForTimeout(500);
  }
  throw new Error("离线牌库未在限定时间内完成缓存");
}

(async () => {
  const workerSource = await fs.readFile(path.join(root, "service-worker.js"), "utf8");
  const cacheVersion = (workerSource.match(/const CACHE_VERSION = "([^"]+)"/) || [])[1];
  assert.ok(cacheVersion, "service worker cache version is defined");
  const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.webmanifest"), "utf8"));
  const expectedIcons = [
    ["tarot-icon-192.png", 192],
    ["tarot-icon-512.png", 512],
    ["tarot-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];
  const iconMetadata = [];
  for (const [name, expectedSize] of expectedIcons) {
    const metadata = pngDimensions(await fs.readFile(path.join(root, "assets", "icons", name)));
    assert.equal(metadata.width, expectedSize);
    assert.equal(metadata.height, expectedSize);
    iconMetadata.push({ name, width: metadata.width, height: metadata.height });
  }
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.equal(manifest.shortcuts.length, 2);

  const browser = await loadChromium().launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(`${baseUrl}/tarot.html`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15_000 });
  await page.waitForTimeout(2_000);
  const earlyCardCacheCount = await cardCacheCount(page, cacheVersion);
  assert.ok(earlyCardCacheCount < 78, `card cache warmup should be deferred, got ${earlyCardCacheCount}`);
  const offlineCardCount = await waitForCardCache(page, cacheVersion);

  await context.setOffline(true);
  await page.waitForFunction(() => document.querySelector("#appNoticeTitle")?.textContent.includes("离线模式"));
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.locator("#questionOverlay").waitFor({ state: "visible" });
  const offlineReloadTitle = await page.title();
  await context.setOffline(false);
  await page.locator("#questionConfirm").click();
  await page.waitForFunction(() => document.querySelector("#questionOverlay")?.classList.contains("hidden"));
  await page.locator("#appNoticeDismiss").click();

  await page.evaluate(() => {
    localStorage.removeItem("astral-pwa-install-dismissed");
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: async () => { window.__installPromptCalled = true; } });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: "accepted" }) });
    window.dispatchEvent(event);
  });
  await page.waitForFunction(() => document.querySelector("#appNoticeTitle")?.textContent.includes("安装星象塔罗"));
  await page.screenshot({ path: "D:/codex/outputs/tarot-pwa-install.png", fullPage: true });
  await page.locator("#appNoticeAction").click();
  const installPromptCalled = await page.evaluate(() => window.__installPromptCalled === true);

  const archivePage = await context.newPage();
  await archivePage.goto(`${baseUrl}/tarot.html?archive=1`, { waitUntil: "domcontentloaded" });
  await archivePage.locator("#histPanel.modalArchive").waitFor({ state: "visible" });
  const shortcutOpenedArchive = await archivePage.locator("#histPanel.modalArchive").isVisible();

  const iosContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const iosPage = await iosContext.newPage();
  await iosPage.goto(`${baseUrl}/tarot.html`, { waitUntil: "domcontentloaded" });
  await iosPage.waitForFunction(() => document.querySelector("#appNoticeTitle")?.textContent.includes("装到 iPhone"), null, { timeout: 30_000 });
  await iosPage.locator("#appNoticeAction").click();
  const iosInstallDetail = await iosPage.locator("#appNoticeDetail").textContent();
  await iosPage.screenshot({ path: "D:/codex/outputs/tarot-pwa-ios.png", fullPage: true });

  const result = {
    manifest: { icons: manifest.icons.length, shortcuts: manifest.shortcuts.length, startUrl: manifest.start_url },
    iconMetadata,
    offlineCardCount,
    earlyCardCacheCount,
    offlineReloadTitle,
    installPromptCalled,
    iosInstallGuide: iosInstallDetail,
    shortcutOpenedArchive,
    updateMessageSupported: workerSource.includes('type === "SKIP_WAITING"'),
    progressMessagesSupported: workerSource.includes('type: "CARD_CACHE_PROGRESS"'),
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    offlineCardCount !== 78 || offlineReloadTitle !== "星象塔罗 · 牌面观测" ||
    !installPromptCalled || !iosInstallDetail.includes("Safari 分享按钮") || !shortcutOpenedArchive ||
    !result.updateMessageSupported || !result.progressMessagesSupported || errors.length
  ) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
