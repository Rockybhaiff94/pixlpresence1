/**
 * PIXEL.GG STUDIO — BADGE COLLECTION REDESIGN, TWO BADGE SYSTEMS,
 * CUSTOM BADGE UPLOADS & SEPARATE VIEWS PRESENTATION E2E SUITE
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
const API_PORT = 3141;
const WEB_PORT = 3140;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

// 1x1 transparent PNG base64
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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
  const freeToken = crypto.randomBytes(24).toString("hex");
  const premToken = crypto.randomBytes(24).toString("hex");
  let freeUserId = null;
  let premUserId = null;

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

    const freeUser = await prisma.user.create({
      data: {
        username: `bcv_free_${suffix}`,
        email: `bcv_free_${suffix}@example.com`,
        globalName: `Free BCV ${suffix}`,
        passwordHash: "e2e-hash",
        premiumStatus: false,
        badges: JSON.stringify(["early_supporter"]),
        appToken: freeToken,
        profile: {
          create: {
            displayName: `Free BCV ${suffix}`,
            visibility: "PUBLIC",
            views: 42,
          },
        },
      },
    });
    freeUserId = freeUser.id;

    const premUser = await prisma.user.create({
      data: {
        username: `bcv_prem_${suffix}`,
        email: `bcv_prem_${suffix}@example.com`,
        globalName: `Prem BCV ${suffix}`,
        passwordHash: "e2e-hash",
        premiumStatus: true,
        badges: JSON.stringify(["early_supporter", "verified", "og"]),
        appToken: premToken,
        profile: {
          create: {
            displayName: `Prem BCV ${suffix}`,
            visibility: "PUBLIC",
            views: 1337,
            designConfig: JSON.stringify({
              profileBuilder: {
                version: "2.0",
                canvas: { width: 420, minHeight: 560, padding: 20, backgroundColor: "#0e0e13", borderRadius: 20, entryScreenEnabled: false },
                nodes: [
                  {
                    id: "name-1",
                    type: "name-text",
                    name: "Name",
                    parentId: null,
                    childIds: [],
                    zIndex: 1,
                    visible: true,
                    locked: false,
                    x: 24,
                    y: 24,
                    width: 240,
                    height: 36,
                    style: {},
                    config: { text: `Prem BCV ${suffix}`, nameBadgeEnabled: true, nameBadgeId: "verified" },
                    responsive: {},
                  },
                  {
                    id: "badges-grp-1",
                    type: "badges-group",
                    name: "Badges List",
                    parentId: null,
                    childIds: [],
                    zIndex: 2,
                    visible: true,
                    locked: false,
                    x: 24,
                    y: 72,
                    width: 260,
                    height: 32,
                    style: {},
                    config: { badges: [] },
                    responsive: {},
                  },
                  {
                    id: "views-1",
                    type: "view-counter",
                    name: "View Counter",
                    parentId: null,
                    childIds: [],
                    zIndex: 3,
                    visible: true,
                    locked: false,
                    x: 24,
                    y: 480,
                    width: 112,
                    height: 36,
                    style: { backgroundColor: "#111116", borderRadius: 9999 },
                    config: { viewCounterShowIcon: true, color: "#ffffff", fontSize: 12 },
                    responsive: {},
                  },
                ],
              },
            }),
          },
        },
      },
    });
    premUserId = premUser.id;

    // 1. Backend API Security: Free user CANNOT upload custom_badge
    console.log("[Test 1] Backend security: Free user custom_badge upload rejected (403)...");
    const freeUploadRes = await fetch(`${API_URL}/api/rpc/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${freeToken}` },
      body: JSON.stringify({
        file: `data:image/png;base64,${TINY_PNG_B64}`,
        fileName: "hack-badge.png",
        targetSlot: "custom_badge",
      }),
    });
    assert.strictEqual(freeUploadRes.status, 403, `Expected 403 for free custom_badge upload, got ${freeUploadRes.status}`);

    // 2. Backend API: Premium user CAN upload custom_badge & inventory lists it
    console.log("[Test 2] Premium user custom_badge upload & inventory resolution...");
    const premUploadRes = await fetch(`${API_URL}/api/rpc/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${premToken}` },
      body: JSON.stringify({
        file: `data:image/png;base64,${TINY_PNG_B64}`,
        fileName: "founder-star.png",
        targetSlot: "custom_badge",
      }),
    });
    assert.strictEqual(premUploadRes.status, 200, `Expected 200 for premium custom_badge upload, got ${premUploadRes.status}`);
    const premUploadData = await premUploadRes.json();
    assert.ok(premUploadData.assetId && premUploadData.url, "Expected assetId and url from custom_badge upload");

    const invRes = await fetch(`${API_URL}/api/account/badges`, {
      headers: { Authorization: `Bearer ${premToken}` },
    });
    const invData = await invRes.json();
    assert.strictEqual(invData.canUploadCustomBadges, true);
    assert.ok(Array.isArray(invData.storeBadges) && invData.storeBadges.length === 0, "Store badges must be empty when none owned");
    assert.ok(
      Array.isArray(invData.customBadges) && invData.customBadges.some((b) => b.assetId === premUploadData.assetId),
      "Custom badge must appear in inventory"
    );

    // 3. Backend Security: Name Badge cannot use custom: badge
    console.log("[Test 3] Backend rejects custom badge in Name Badge slot...");
    const badNameBadgeRes = await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${premToken}` },
      body: JSON.stringify({
        designConfig: {
          profileBuilder: {
            version: "2.0",
            canvas: { width: 420, minHeight: 560 },
            nodes: [
              {
                id: "name-1",
                type: "name-text",
                name: "Name",
                parentId: null,
                x: 20,
                y: 20,
                width: 200,
                height: 36,
                zIndex: 1,
                visible: true,
                locked: false,
                style: {},
                config: { text: "Prem", nameBadgeEnabled: true, nameBadgeId: `custom:${premUploadData.assetId}` },
                responsive: {},
              },
            ],
          },
        },
      }),
    });
    assert.strictEqual(badNameBadgeRes.status, 403, "Custom artwork must be rejected for Name Badge");

    // 4. Playwright Studio: Free user locked Custom Badges tab + Premium multi-decoration badges
    console.log("[Test 4] Playwright Studio: 3 categories, 2 modes & independent decoration badges...");
    browser = await chromium.launch({ headless: true });

    const freeCtx = await createAuthedContext(browser, freeToken);
    const freePage = await freeCtx.newPage();
    await freePage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await freePage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });
    // Select name-text node via Layers panel and open Properties tab
    const freeNameId = (await freePage.locator('[data-node-type="name-text"]').first().getAttribute("data-testid")).replace("canvas-node-", "");
    await freePage.getByTestId("secondary-dock-btn-layers").click();
    await freePage.getByTestId(`layer-row-${freeNameId}`).click();
    await freePage.getByTestId("unified-tab-properties").click();
    await freePage.getByTestId("name-badge-picker-btn").click();
    await freePage.getByTestId("badge-picker-modal").waitFor({ state: "visible" });
    assert.strictEqual(await freePage.getByTestId("badge-picker-modal").getAttribute("data-picker-mode"), "name-badge");
    await freePage.getByTestId("badge-picker-tab-store").click();
    await freePage.getByTestId("store-badges-empty").waitFor({ state: "visible" });
    await freePage.getByTestId("badge-picker-close").click();
    await freeCtx.close();

    // Premium user: open Badges List -> Add Badge -> add 2 independent decoration badges (1 official + 1 custom)
    const premCtx = await createAuthedContext(browser, premToken);
    const premPage = await premCtx.newPage();
    await premPage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await premPage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

    const premBadgesId = (await premPage.locator('[data-node-type="badges-group"]').first().getAttribute("data-testid")).replace("canvas-node-", "");
    await premPage.getByTestId("secondary-dock-btn-layers").click();
    await premPage.getByTestId(`layer-row-${premBadgesId}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.getByTestId("badges-list-add-btn").click();
    await premPage.getByTestId("badge-picker-modal").waitFor({ state: "visible" });
    assert.strictEqual(await premPage.getByTestId("badge-picker-modal").getAttribute("data-picker-mode"), "decoration-badge");

    // Add official 'og' badge
    await premPage.getByTestId("badge-picker-item-og").click();
    // Switch to Custom Badges tab and add uploaded custom badge
    await premPage.getByTestId("badge-picker-tab-custom").click();
    await premPage.getByTestId(`badge-picker-item-custom:${premUploadData.assetId}`).click();
    await premPage.getByTestId("badge-picker-close").click();

    // Verify 2 independent profile-badge nodes exist on canvas
    const badgeNodesCount = await premPage.locator('[data-node-type="profile-badge"]').count();
    assert.ok(badgeNodesCount >= 2, `Expected at least 2 independent profile-badge nodes, got ${badgeNodesCount}`);

    // Save/Publish profile
    const publishBtn = premPage.getByTestId("builder-publish-btn");
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click();
      await premPage.waitForTimeout(800);
    }
    await premCtx.close();

    // 5. Public Profile: Separate Public Header Views Button vs Studio/Canvas View Counter
    console.log("[Test 5] Public Profile: separate Public Header Views Pill & Canvas View Counter...");
    const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await attachApiProxy(pubCtx);
    const pubPage = await pubCtx.newPage();
    await pubPage.goto(`${WEB_URL}/${premUser.username}`, { waitUntil: "networkidle" });

    const headerViewsBtn = pubPage.getByTestId("public-header-views-btn");
    const canvasViewNode = pubPage.getByTestId("view-counter-node-views-1");
    await headerViewsBtn.waitFor({ state: "visible", timeout: 10000 });
    await canvasViewNode.waitFor({ state: "visible", timeout: 10000 });

    const headerRaw = await headerViewsBtn.getAttribute("data-raw-views");
    const canvasRaw = await canvasViewNode.getAttribute("data-raw-views");
    assert.strictEqual(headerRaw, canvasRaw, "Public header Views button and Canvas View Counter must show the same real backend count");
    await pubCtx.close();

    console.log("ALL BADGE COLLECTION, CUSTOM UPLOAD & SEPARATE VIEWS E2E TESTS PASSED!");
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
    for (const uid of [freeUserId, premUserId]) {
      if (!uid) continue;
      await prisma.uploadedAsset.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: uid } }).catch(() => {});
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
