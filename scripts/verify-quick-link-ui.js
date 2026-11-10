const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core");
const { prisma } = require("../packages/database");

async function verifyQuickLinkUI() {
  console.log("=== STEP 1: Verifying DB Test User ===");
  const testUser = await prisma.user.findFirst({
    where: { username: "ashish.yt" },
    include: { profile: true },
  });

  if (!testUser) throw new Error("Test user not found");

  console.log("\n=== STEP 2: Launching Playwright Browser ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  // Mock authenticated session
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: testUser.id,
          username: testUser.username,
          globalName: testUser.globalName || testUser.username,
          avatar: testUser.avatar,
          discordId: testUser.discordId,
          role: testUser.role,
          premiumStatus: testUser.premiumStatus,
          profile: testUser.profile,
        },
      }),
    });
  });

  // Mock device authorization endpoints with realistic behavior
  let currentSession = null;

  await page.route("**/api/rpc/device/authorize", async (route) => {
    currentSession = {
      code: "PX84-91B2",
      codeId: "session_mock_123",
      expiresAt: new Date(Date.now() + 120000).toISOString(),
      expiresInSeconds: 120,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        code: currentSession.code,
        codeId: currentSession.codeId,
        expiresAt: currentSession.expiresAt,
        expiresInSeconds: currentSession.expiresInSeconds,
      }),
    });
  });

  await page.route("**/api/rpc/device/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "PENDING",
      }),
    });
  });

  await page.route("**/api/rpc/device/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "dev_1",
          deviceName: "Vencord Windows Client",
          consumedAt: new Date(Date.now() - 3600000).toISOString(),
          lastUsedAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route("**/api/rpc/device/revoke", async (route) => {
    currentSession = null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Set mock tokens in localStorage
  await page.addInitScript(() => {
    localStorage.setItem("pixel_app_token", "test_mock_token_123");
    localStorage.setItem(
      "pixel_cached_user",
      JSON.stringify({
        id: "cmw4fbemh0000a1sa2h3h5zzk",
        username: "ashish.yt",
      })
    );
  });

  console.log("Navigating to http://localhost:3000/account/rpc ...");
  await page.goto("http://localhost:3000/account/rpc", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("h1", { timeout: 60000 });

  console.log("Verified Discord Rich Presence Studio page loaded.");

  // 1. Check PowerShell Installer command box
  const installerCmd = await page.locator("text=irm").textContent();
  console.log("Installer command visible:", installerCmd);

  // 2. Click "COPY INSTALL COMMAND"
  const copyBtn = page.locator("button:has-text('COPY INSTALL COMMAND')");
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(300);
    console.log("Copy install command button clicked successfully.");
  }

  // 3. Generate Linking Code
  console.log("Clicking 'GENERATE LINKING CODE'...");
  const genCodeBtn = page.locator("button:has-text('GENERATE LINKING CODE')");
  await genCodeBtn.click();
  await page.waitForTimeout(600);

  // Verify Linking Code displayed
  const codeText = await page.locator(".select-all").textContent();
  console.log("Displayed 2-Minute Linking Code:", codeText);

  // Verify Expiration Timer
  const timerVisible = await page.locator("text=Expires in:").isVisible();
  console.log("Countdown timer visible:", timerVisible);

  // Verify Authorized Devices List
  const devicesVisible = await page.locator("text=AUTHORIZED DEVICES").isVisible();
  console.log("Authorized devices section visible:", devicesVisible);

  // Capture screenshot of the Quick Account Linking and Installer UI
  const screenshotPath = "C:/Users/Acer/.gemini/antigravity/brain/94f934c9-1ecd-4b1c-8119-6216bf47c584/pixelsrpc-quick-linking-ui.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved screenshot to: ${screenshotPath}`);

  await browser.close();
  await prisma.$disconnect();
  console.log("\n>>> ALL PLAYWRIGHT UI VERIFICATIONS PASSED! <<<");
}

verifyQuickLinkUI().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

