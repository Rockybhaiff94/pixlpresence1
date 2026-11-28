/**
 * PIXEL.GG STUDIO — PRESENCE SYNC, TIMESTAMPS, BUTTON 2, SPOTIFY & DISCORD STATUS E2E SUITE
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
const API_PORT = 3131;
const WEB_PORT = 3130;
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
    } catch {
      await route.abort();
    }
  });
}

async function main() {
  let apiProc;
  let webProc;
  let browser;
  const suffix = crypto.randomBytes(3).toString("hex");
  const username = `rpc_e2e_${suffix}`;
  const email = `${username}@example.com`;
  let userId = null;

  try {
    console.log(`[Setup] Starting API (${API_PORT}) and Web (${WEB_PORT})...`);
    apiProc = spawn("node", ["dist/index.js"], {
      cwd: API_DIR,
      env: { ...process.env, PORT: String(API_PORT), CLIENT_URL: WEB_URL, NODE_ENV: "production" },
      stdio: "pipe",
    });
    webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], {
      cwd: WEB_DIR,
      env: { ...process.env, NEXT_PUBLIC_API_URL: API_URL, API_URL: API_URL, INTERNAL_API_URL: API_URL, PORT: String(WEB_PORT) },
      shell: true,
      stdio: "pipe",
    });

    await Promise.all([waitForUrl(`${API_URL}/health`), waitForUrl(`${WEB_URL}/login`)]);
    console.log("[Setup] Both servers ready.");

    const sessionToken = crypto.randomBytes(24).toString("hex");
    const user = await prisma.user.create({
      data: {
        username,
        email,
        globalName: "Presence E2E",
        passwordHash: "e2e-hash",
        premiumStatus: true,
        appToken: sessionToken,
        profile: {
          create: {
            displayName: "Presence E2E",
            visibility: "PUBLIC",
            bio: "Presence & RPC E2E",
            accentColor: "#ffffff",
            designConfig: JSON.stringify({
              profileBuilder: {
                version: "2.0",
                canvas: { width: 420, minHeight: 540, padding: 20, backgroundColor: "#0e0e13", borderRadius: 20 },
                nodes: [
                  {
                    id: "avatar-1",
                    type: "profile-image",
                    name: "Avatar",
                    parentId: null,
                    childIds: [],
                    zIndex: 1,
                    visible: true,
                    locked: false,
                    x: 20,
                    y: 20,
                    width: 84,
                    height: 84,
                    style: {},
                    config: {
                      src: "https://cdn.discordapp.com/embed/avatars/0.png",
                      avatarShape: "circle",
                      showStatusDot: true,
                      syncStatusWithDiscord: true,
                      statusAnimationEnabled: true,
                      manualStatus: "online",
                    },
                    responsive: {},
                  },
                  {
                    id: "rpc-1",
                    type: "custom-rpc",
                    name: "Custom RPC",
                    parentId: null,
                    childIds: ["rpc-title-1", "rpc-details-1", "rpc-state-1", "rpc-ts-1", "rpc-btns-1"],
                    zIndex: 2,
                    visible: true,
                    locked: false,
                    x: 20,
                    y: 120,
                    width: 380,
                    height: 180,
                    style: { backgroundColor: "#14141b", borderRadius: 12 },
                    config: {
                      rpcUseLive: true,
                    },
                    responsive: {},
                  },
                  {
                    id: "rpc-title-1",
                    type: "rpc-title",
                    name: "RPC Title",
                    parentId: "rpc-1",
                    childIds: [],
                    zIndex: 3,
                    visible: true,
                    locked: false,
                    x: 12,
                    y: 12,
                    width: 350,
                    height: 22,
                    style: {},
                    config: { rpcUseLive: true },
                    responsive: {},
                  },
                  {
                    id: "rpc-details-1",
                    type: "rpc-details",
                    name: "RPC Details",
                    parentId: "rpc-1",
                    childIds: [],
                    zIndex: 4,
                    visible: true,
                    locked: false,
                    x: 12,
                    y: 38,
                    width: 350,
                    height: 20,
                    style: {},
                    config: { rpcUseLive: true },
                    responsive: {},
                  },
                  {
                    id: "rpc-state-1",
                    type: "rpc-state",
                    name: "RPC State",
                    parentId: "rpc-1",
                    childIds: [],
                    zIndex: 5,
                    visible: true,
                    locked: false,
                    x: 12,
                    y: 60,
                    width: 350,
                    height: 20,
                    style: {},
                    config: { rpcUseLive: true },
                    responsive: {},
                  },
                  {
                    id: "rpc-ts-1",
                    type: "rpc-timestamp",
                    name: "RPC Timestamp",
                    parentId: "rpc-1",
                    childIds: [],
                    zIndex: 6,
                    visible: true,
                    locked: false,
                    x: 12,
                    y: 84,
                    width: 350,
                    height: 20,
                    style: {},
                    config: { rpcUseLive: true },
                    responsive: {},
                  },
                  {
                    id: "rpc-btns-1",
                    type: "rpc-buttons",
                    name: "RPC Buttons",
                    parentId: "rpc-1",
                    childIds: [],
                    zIndex: 7,
                    visible: true,
                    locked: false,
                    x: 12,
                    y: 112,
                    width: 350,
                    height: 32,
                    style: {},
                    config: { rpcUseLive: true },
                    responsive: {},
                  },
                ],
              },
            }),
          },
        },
        richPresence: {
          create: {
            appName: "PixelRPC",
            details: "Testing RPC",
            state: "In Studio",
            showProfileRpc: true,
            enableDiscordRpc: true,
            button1Enabled: true,
            button1Label: "Btn One",
            button1Url: "https://example.com/one",
            button2Enabled: true,
            button2Label: "Btn Two",
            button2Url: "https://example.com/two",
          },
        },
      },
    });
    userId = user.id;

    const authHeaders = {
      "Content-Type": "application/json",
      "X-App-Token": sessionToken,
      Authorization: `Bearer ${sessionToken}`,
    };

    // 1. Test Epoch-Seconds Timestamp Normalization & No Fake Elapsed Fallback
    console.log("[Test 1] Epoch-seconds timestamp normalization...");
    const startSec = Math.floor(Date.now() / 1000) - 90;
    const postEpochRes = await fetch(`${API_URL}/api/rpc/presence`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        status: "online",
        activity: {
          name: "Elden Ring",
          type: 0,
          details: "Limgrave",
          state: "Exploring",
          timestamps: { start: startSec },
        },
      }),
    });
    assert.strictEqual(postEpochRes.status, 200, "POST /api/rpc/presence failed");

    const liveRes1 = await fetch(`${API_URL}/api/profile/u/${username}/presence`);
    const liveJson1 = await liveRes1.json();
    assert.strictEqual(liveJson1.success, true);
    assert.ok(
      liveJson1.presence.activity.timestamps.start > 1e12,
      `Expected epoch-ms > 1e12, got ${liveJson1.presence.activity.timestamps.start}`
    );

    // 2. Test Button 2 only + disabling Custom RPC preserves live presence
    console.log("[Test 2] Button 2 independent toggle & Custom RPC disable fallback...");
    const patchBtn2Res = await fetch(`${API_URL}/api/rpc/me`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        showProfileRpc: false,
        enableDiscordRpc: false,
        button1Enabled: false,
        button2Enabled: true,
        button2Label: "Join Discord",
        button2Url: "https://example.com/discord",
      }),
    });
    assert.strictEqual(patchBtn2Res.status, 200, "PATCH /api/rpc/me failed");

    const liveAfterDisable = await (await fetch(`${API_URL}/api/profile/u/${username}/presence`)).json();
    assert.strictEqual(liveAfterDisable.presence.hasActivity, true, "Live Discord activity must NOT be wiped when Custom RPC is disabled");
    assert.strictEqual(liveAfterDisable.presence.activity.name, "Elden Ring");

    // 3. Test Playwright UI: Spotify + Button 2 + Status Indicators + Sync Toggle
    console.log("[Test 3] Playwright Spotify, Button 2 & Discord Status Indicators...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await attachApiProxy(context);
    await context.addCookies([
      { name: "pixel_session", value: sessionToken, domain: "127.0.0.1", path: "/" },
    ]);

    const page = await context.newPage();

    // Push Spotify presence with progress timestamps & idle status
    await fetch(`${API_URL}/api/rpc/presence`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        status: "idle",
        activity: {
          name: "Spotify",
          type: 2,
          details: "Midnight City",
          state: "M83",
          largeImageText: "Hurry Up, We're Dreaming",
          timestamps: {
            start: Date.now() - 45000,
            end: Date.now() + 195000,
          },
          buttons: [
            { label: "Listen", url: "https://example.com/listen" },
            { label: "Artist", url: "https://example.com/artist" },
          ],
        },
      }),
    });

    await page.goto(`${WEB_URL}/${username}`, { waitUntil: "networkidle" });

    // Verify Discord idle status dot
    const statusDot = page.getByTestId("avatar-status-dot-avatar-1");
    await statusDot.waitFor({ state: "visible", timeout: 10000 });
    assert.strictEqual(await statusDot.getAttribute("data-status"), "idle", "Expected idle status synced from live presence");

    // Verify Spotify UI & both buttons
    const bodyText = await page.locator("body").innerText();
    assert.ok(bodyText.includes("Midnight City"), "Spotify track title should render");
    assert.ok(bodyText.includes("M83"), "Spotify artist should render");
    assert.ok(bodyText.includes("Listen") && bodyText.includes("Artist"), "Both Button 1 and Button 2 should render");

    // Push presence WITHOUT timestamps and confirm no fake "00:01 elapsed"
    await fetch(`${API_URL}/api/rpc/presence`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        status: "dnd",
        activity: {
          name: "VS Code",
          type: 0,
          details: "Editing presenceManager.ts",
          state: "Workspace",
          timestamps: null,
        },
      }),
    });

    await page.reload({ waitUntil: "networkidle" });
    const reloadedText = await page.locator("body").innerText();
    assert.ok(!reloadedText.includes("00:01 elapsed"), "Must NEVER fabricate '00:01 elapsed' when timestamps are missing");
    assert.strictEqual(await statusDot.getAttribute("data-status"), "dnd", "Expected dnd status on reload");

    console.log("ALL PRESENCE SYNC, TIMESTAMPS, BUTTON 2, SPOTIFY & STATUS E2E TESTS PASSED!");
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) apiProc.kill();
    if (webProc && webProc.pid) {
      try {
        if (process.platform === "win32") {
          require("child_process").execSync(`taskkill /PID ${webProc.pid} /T /F`, { stdio: "ignore" });
        } else {
          webProc.kill();
        }
      } catch {}
    }
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.richPresence.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E TEST FAILED:", err);
    process.exit(1);
  });
