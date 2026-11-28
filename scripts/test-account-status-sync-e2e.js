/**
 * PIXEL.GG STUDIO — DEDICATED DISCORD ACCOUNT STATUS SYNC E2E TEST SUITE
 * Tests: Online, Idle, DND, Offline, No-RPC, Active-RPC Independence,
 * Auth/DiscordId Validation, Stale Packet Protection, Multi-Device & Live Socket.IO UI.
 */

const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const { spawn } = require("child_process");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright"));
}

const { prisma } = require("@discord-rpc/database");

const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const API_DIR = path.join(ROOT_DIR, "apps/api");
const API_PORT = 3161;
const WEB_PORT = 3160;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

async function waitForUrl(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function attachApiProxy(context) {
  await context.route(/^https?:\/\/(localhost:3001|127\.0\.0\.1:3001|pixelgg-api\.onrender\.com)\//, async (route) => {
    try {
      const req = route.request();
      const targetUrl = req.url().replace(/^https?:\/\/[^/]+/, API_URL);
      const origin = req.headers()["origin"] || WEB_URL;
      const corsHeaders = {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With, Accept, Cookie, X-App-Token",
      };
      if (req.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      const response = await route.fetch({ url: targetUrl });
      await route.fulfill({
        status: response.status(),
        headers: { ...response.headers(), ...corsHeaders },
        body: await response.body(),
      });
    } catch {}
  });
}

async function run() {
  const suffix = Date.now().toString(36);
  const appToken = crypto.randomBytes(32).toString("hex");
  const discordId = `7771${Date.now().toString().slice(-10)}`;
  const username = `acct_status_${suffix}`;

  const designConfig = JSON.stringify({
    isPublished: true,
    profileBuilder: {
      version: "2.0",
      canvas: { width: 1280, height: 720, entryScreenEnabled: false },
      nodes: [
        {
          id: "avatar-1",
          type: "profile-image",
          name: "Avatar",
          parentId: null,
          childIds: [],
          x: 80,
          y: 60,
          width: 96,
          height: 96,
          zIndex: 2,
          visible: true,
          config: { showStatusDot: true, syncStatusWithDiscord: true, avatarShape: "circle" },
          style: {},
        },
        {
          id: "rpc-1",
          type: "custom-rpc",
          name: "Custom RPC",
          parentId: null,
          x: 80,
          y: 180,
          width: 360,
          height: 110,
          zIndex: 2,
          visible: true,
          config: { useLiveRpc: true },
          style: {},
        },
      ],
    },
  });

  const user = await prisma.user.create({
    data: {
      username,
      globalName: `Status ${suffix}`,
      discordId,
      role: "USER",
      premiumStatus: true,
      appToken,
      profile: {
        create: {
          displayName: `Status ${suffix}`,
          visibility: "PUBLIC",
          designConfig,
        },
      },
      richPresence: {
        create: {
          appName: "Grand Theft Auto VI",
          details: "Vice City Story",
          state: "Free Roam",
          showProfileRpc: false,
          enableDiscordRpc: true,
          button1Enabled: true,
          button1Label: "View Profile",
          button1Url: "https://pixel.gg",
        },
      },
    },
  });

  const dev1Token = `px_dev_${crypto.randomBytes(24).toString("hex")}`;
  const dev2Token = `px_dev_${crypto.randomBytes(24).toString("hex")}`;
  const dev1 = await prisma.rpcDeviceAuthorization.create({
    data: {
      userId: user.id,
      codeHash: crypto.createHash("sha256").update(`DEV1-${suffix}`).digest("hex"),
      deviceToken: dev1Token,
      deviceName: "Desktop 1",
      status: "CONSUMED",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const dev2 = await prisma.rpcDeviceAuthorization.create({
    data: {
      userId: user.id,
      codeHash: crypto.createHash("sha256").update(`DEV2-${suffix}`).digest("hex"),
      deviceToken: dev2Token,
      deviceName: "Desktop 2",
      status: "CONSUMED",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  const apiProc = spawn("node", ["dist/index.js"], {
    cwd: API_DIR,
    env: { ...process.env, PORT: String(API_PORT), NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], {
    cwd: WEB_DIR,
    shell: true,
    env: {
      ...process.env,
      PORT: String(WEB_PORT),
      INTERNAL_API_URL: API_URL,
      NEXT_PUBLIC_API_URL: API_URL,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    console.log(`[Setup] Waiting for API (${API_PORT}) and Web (${WEB_PORT})...`);
    await Promise.all([waitForUrl(`${API_URL}/health`), waitForUrl(`${WEB_URL}/login`)]);

    const postAccountStatus = async (tok, body) => {
      const r = await fetch(`${API_URL}/api/rpc/account-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify(body),
      });
      return { status: r.status, data: await r.json().catch(() => ({})) };
    };

    // Test G: Validation & Auth checks
    console.log("[Test G] Validation, Auth & Stale Timestamp Protection...");
    const unauthRes = await fetch(`${API_URL}/api/rpc/account-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: "online" }),
    });
    assert.strictEqual(unauthRes.status, 401);

    const invalidRes = await postAccountStatus(dev1Token, { accountStatus: "playing_gta" });
    assert.strictEqual(invalidRes.status, 400);

    const mismatchRes = await postAccountStatus(dev1Token, {
      discordUserId: "999999999999999999",
      accountStatus: "online",
    });
    assert.strictEqual(mismatchRes.status, 403);

    // Open Playwright public profile BEFORE setting statuses (Test E: Custom RPC disabled, no games)
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await attachApiProxy(ctx);
    const page = await ctx.newPage();

    console.log("[Test A & E] Online status without RPC activity...");
    const tBase = Date.now();
    const okOnline = await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "online",
      statusUpdatedAt: new Date(tBase).toISOString(),
      source: "vencord_client",
    });
    assert.strictEqual(okOnline.status, 200);
    assert.strictEqual(okOnline.data.accountStatus, "online");

    await page.goto(`${WEB_URL}/${username}`, { waitUntil: "networkidle" });
    const dot = page.getByTestId("avatar-status-dot-avatar-1");
    await dot.waitFor({ state: "visible", timeout: 10000 });
    assert.strictEqual(await dot.getAttribute("data-status"), "online");

    // Stale packet older than tBase must NOT overwrite online
    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "offline",
      statusUpdatedAt: new Date(tBase - 10000).toISOString(),
    });
    const checkAfterStale = await fetch(`${API_URL}/api/profile/u/${username}/presence`).then((r) => r.json());
    assert.strictEqual(checkAfterStale.presence.accountStatus, "online");

    // Test B, C, D & J: Live Socket.IO transitions WITHOUT page reload!
    console.log("[Test B, C, D & J] Live Idle -> DND -> Offline transitions without page refresh...");
    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "idle",
      statusUpdatedAt: new Date(tBase + 1000).toISOString(),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "idle",
      { timeout: 8000 }
    );

    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "dnd",
      statusUpdatedAt: new Date(tBase + 2000).toISOString(),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "dnd",
      { timeout: 8000 }
    );

    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "offline",
      statusUpdatedAt: new Date(tBase + 3000).toISOString(),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "offline",
      { timeout: 8000 }
    );

    // Test F: Enable Custom RPC and verify account status changes do NOT mutate/clear Custom RPC!
    console.log("[Test F] RPC activity running independently of account status...");
    await fetch(`${API_URL}/api/rpc/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${appToken}` },
      body: JSON.stringify({ showProfileRpc: true, appName: "Grand Theft Auto VI" }),
    });
    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "online",
      statusUpdatedAt: new Date(tBase + 4000).toISOString(),
    });
    await page.reload({ waitUntil: "networkidle" });
    assert.strictEqual(await dot.getAttribute("data-status"), "online");
    assert.ok((await page.locator("body").innerText()).includes("Grand Theft Auto VI"));

    await postAccountStatus(dev1Token, {
      discordUserId: discordId,
      accountStatus: "dnd",
      statusUpdatedAt: new Date(tBase + 5000).toISOString(),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "dnd",
      { timeout: 8000 }
    );
    assert.ok((await page.locator("body").innerText()).includes("Grand Theft Auto VI"), "Custom RPC must stay intact");

    // Test I: Multiple authorized devices — disconnecting one preserves the other!
    console.log("[Test I] Multiple authorized devices deterministic aggregation & disconnect...");
    await postAccountStatus(dev2Token, {
      discordUserId: discordId,
      accountStatus: "idle",
      statusUpdatedAt: new Date(tBase + 6000).toISOString(),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "idle",
      { timeout: 8000 }
    );

    // Revoke dev1 -> dev2 is still connected and reporting idle!
    await fetch(`${API_URL}/api/rpc/device/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${appToken}` },
      body: JSON.stringify({ deviceId: dev1.id }),
    });
    const afterDev1Revoke = await fetch(`${API_URL}/api/profile/u/${username}/presence`).then((r) => r.json());
    assert.strictEqual(afterDev1Revoke.presence.accountStatus, "idle", "dev2 status must remain active after dev1 disconnects");

    // Revoke dev2 -> no authorized devices left -> transitions to offline
    await fetch(`${API_URL}/api/rpc/device/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${appToken}` },
      body: JSON.stringify({ deviceId: dev2.id }),
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="avatar-status-dot-avatar-1"]')?.getAttribute("data-status") === "offline",
      { timeout: 8000 }
    );

    console.log("ALL DEDICATED DISCORD ACCOUNT STATUS SYNC E2E TESTS PASSED!");
  } finally {
    if (browser) await browser.close().catch(() => {});
    apiProc.kill("SIGTERM");
    webProc.kill("SIGTERM");
    await prisma.rpcDeviceAuthorization.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.richPresence.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error("ACCOUNT STATUS E2E TEST FAILED:", err);
  process.exit(1);
});
