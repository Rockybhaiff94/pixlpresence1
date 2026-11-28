/**
 * PIXEL.GG STUDIO — DISCORD PRESENCE, ORIGINAL ACTIVITY & CUSTOM RPC PRIORITY
 * 12-SCENARIO E2E VERIFICATION SUITE
 */

const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const { spawn, execSync } = require("child_process");

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
const API_PORT = 3151;
const WEB_PORT = 3150;
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

async function createAuthedContext(browser, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await attachApiProxy(context);
  await context.addCookies([
    {
      name: "pixel_app_token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
  await context.addInitScript((tok) => {
    localStorage.setItem("pixel_app_token", tok);
  }, token);
  return context;
}

async function main() {
  let apiProc;
  let webProc;
  let browser;
  const suffix = crypto.randomBytes(3).toString("hex");
  const token = crypto.randomBytes(24).toString("hex");
  const username = `prio_e2e_${suffix}`;
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

    // Legacy user without rpcPriority in customConfig (Tests 12 backward compatibility too!)
    const user = await prisma.user.create({
      data: {
        username,
        email: `${username}@example.com`,
        globalName: "Priority E2E",
        passwordHash: "e2e-hash",
        premiumStatus: true,
        appToken: token,
        profile: {
          create: {
            displayName: "Priority E2E",
            visibility: "PUBLIC",
            designConfig: JSON.stringify({
              profileBuilder: {
                version: "2.0",
                canvas: { width: 420, minHeight: 540, padding: 20, backgroundColor: "#0e0e13", borderRadius: 20, entryScreenEnabled: false },
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
                    },
                    responsive: {},
                  },
                  {
                    id: "rpc-1",
                    type: "custom-rpc",
                    name: "Custom RPC",
                    parentId: null,
                    childIds: ["rpc-title-1", "rpc-details-1", "rpc-state-1"],
                    zIndex: 2,
                    visible: true,
                    locked: false,
                    x: 20,
                    y: 120,
                    width: 380,
                    height: 150,
                    style: { backgroundColor: "#14141b", borderRadius: 12 },
                    config: { useLiveRpc: true },
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
                    config: { useLiveRpc: true },
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
                    config: { useLiveRpc: true },
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
                    y: 62,
                    width: 350,
                    height: 20,
                    style: {},
                    config: { useLiveRpc: true },
                    responsive: {},
                  },
                ],
              },
            }),
          },
        },
        richPresence: {
          create: {
            appName: "PixelCustomApp",
            details: "My Custom Details",
            state: "My Custom State",
            showProfileRpc: true,
            enableDiscordRpc: true,
          },
        },
      },
    });
    userId = user.id;

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const getLive = async () => (await (await fetch(`${API_URL}/api/profile/u/${username}/presence`)).json()).presence;
    const pushDiscord = async (status, activity, seq) => {
      const res = await fetch(`${API_URL}/api/rpc/presence`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ status, activity, sequence: seq }),
      });
      assert.strictEqual(res.status, 200);
    };
    const patchRpc = async (body) => {
      const res = await fetch(`${API_URL}/api/rpc/me`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      assert.strictEqual(res.status, 200);
      return res.json();
    };

    const spotifyAct = {
      name: "Spotify",
      type: 2,
      details: "Kasturi",
      state: "Arijit Singh",
      largeImageText: "Amar Prem Ki Prem Kahani",
      timestamps: { start: Date.now() - 25000, end: Date.now() + 185000 },
    };

    // Test 1 & Test 12: DND + Spotify + Custom RPC Enabled (legacy default -> discord priority)
    console.log("[Test 1 & 12] DND + Spotify + Custom RPC Enabled (default Discord priority)...");
    await pushDiscord("dnd", spotifyAct, 1);
    let p = await getLive();
    assert.strictEqual(p.status, "dnd");
    assert.strictEqual(p.activitySource, "discord");
    assert.strictEqual(p.activity.details, "Kasturi");
    assert.strictEqual(p.activity.state, "Arijit Singh");

    // Test 2: Online + No Discord Activity + Custom RPC Enabled -> Online + Custom RPC fallback
    console.log("[Test 2] Online + No Discord Activity + Custom RPC Enabled...");
    await pushDiscord("online", null, 2);
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.hasActivity, true);
    assert.strictEqual(p.activitySource, "custom");
    assert.strictEqual(p.activity.name, "PixelCustomApp");

    // Test 3: DND + Spotify + Custom RPC Disabled -> DND + Spotify, Custom RPC not rendered
    console.log("[Test 3] DND + Custom RPC Disabled...");
    await pushDiscord("dnd", spotifyAct, 3);
    await patchRpc({ showProfileRpc: false });
    p = await getLive();
    assert.strictEqual(p.status, "dnd");
    assert.strictEqual(p.activitySource, "discord");
    assert.strictEqual(p.activity.details, "Kasturi");

    // Test 4: Online + Custom RPC Disabled + No Activity -> Online + Empty activity
    console.log("[Test 4] Online + Custom RPC Disabled + No Activity...");
    await pushDiscord("online", null, 4);
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.hasActivity, false);
    assert.strictEqual(p.activity, null);

    // Test 5 & 6: Discord Priority vs Custom RPC Priority while Spotify is active
    console.log("[Test 5 & 6] Discord Activity Priority vs Custom RPC Priority...");
    await pushDiscord("online", spotifyAct, 5);
    await patchRpc({ showProfileRpc: true, rpcPriority: "discord" });
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.activitySource, "discord");
    assert.strictEqual(p.activity.details, "Kasturi");

    await patchRpc({ rpcPriority: "custom" });
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.activitySource, "custom");
    assert.strictEqual(p.activity.name, "PixelCustomApp");
    assert.strictEqual(p.discordActivity.details, "Kasturi", "Background Discord Spotify activity must remain preserved");

    // Test 7: Custom RPC Disabled while Discord is Online -> switches to Spotify, NEVER offline
    console.log("[Test 7] Custom RPC Disabled while Discord Online...");
    await patchRpc({ showProfileRpc: false });
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.activitySource, "discord");
    assert.strictEqual(p.activity.details, "Kasturi");

    // Test 8 & 9: Activity Stops + Discord Status Changes independently
    console.log("[Test 8 & 9] Activity Stops & Discord Status Changes...");
    await pushDiscord("online", null, 6);
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.hasActivity, false);

    await pushDiscord("dnd", null, 7);
    p = await getLive();
    assert.strictEqual(p.status, "dnd");
    assert.strictEqual(p.hasActivity, false);

    // Test 10: Integration Reconnect (stale sequence ignored, fresh sequence accepted)
    console.log("[Test 10] Integration reconnect & stale sequence protection...");
    await pushDiscord("online", spotifyAct, 8);
    await pushDiscord("offline", null, 3); // stale seq 3 must be ignored!
    p = await getLive();
    assert.strictEqual(p.status, "online");
    assert.strictEqual(p.activity.details, "Kasturi");

    // Test 11: Playwright Profile Customizer <-> RPC Editor <-> Public Profile Consistency
    console.log("[Test 11] Playwright Customizer <-> RPC Editor <-> Public Profile consistency...");
    await patchRpc({ showProfileRpc: true, rpcPriority: "discord" });
    browser = await chromium.launch({ headless: true });
    const ctx = await createAuthedContext(browser, token);
    const page = await ctx.newPage();

    // Open Profile Customizer (/customize), select Custom RPC node, switch to Custom First
    await page.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });
    await page.getByTestId("secondary-dock-btn-layers").click();
    await page.getByTestId("layer-row-rpc-1").click();
    await page.getByTestId("unified-tab-properties").click();
    await page.getByTestId("customizer-rpc-priority-custom").waitFor({ state: "visible", timeout: 8000 });
    await page.getByTestId("customizer-rpc-priority-custom").click();
    await page.waitForTimeout(400);

    // Open /account/rpc and confirm Custom RPC Priority is active
    await page.goto(`${WEB_URL}/account/rpc`, { waitUntil: "networkidle" });
    const customBtnClass = await page.getByTestId("rpc-editor-priority-custom").getAttribute("class");
    assert.ok(customBtnClass.includes("bg-white"), "RPC Editor must reflect Custom RPC Priority saved in Customizer");

    // Check public profile renders PixelCustomApp (since Custom First) & online status
    await page.goto(`${WEB_URL}/${username}`, { waitUntil: "networkidle" });
    const pubText1 = await page.locator("body").innerText();
    assert.ok(pubText1.includes("PixelCustomApp"), "Public profile must display Custom RPC when Custom First");
    assert.strictEqual(await page.getByTestId("avatar-status-dot-avatar-1").getAttribute("data-status"), "online");

    // Switch back to Discord First via API and verify public profile displays Kasturi / Arijit Singh
    await patchRpc({ rpcPriority: "discord" });
    await page.reload({ waitUntil: "networkidle" });
    const pubText2 = await page.locator("body").innerText();
    assert.ok(pubText2.includes("Kasturi") && pubText2.includes("Arijit Singh"), "Public profile must display Spotify Kasturi / Arijit Singh when Discord First");

    await ctx.close();
    console.log("ALL 12 PRESENCE, ACTIVITY PRIORITY & SYNC E2E TESTS PASSED!");
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) apiProc.kill();
    if (webProc && webProc.pid) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /PID ${webProc.pid} /T /F`, { stdio: "ignore" });
        } else {
          webProc.kill();
        }
      } catch {}
    }
    if (userId) {
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
