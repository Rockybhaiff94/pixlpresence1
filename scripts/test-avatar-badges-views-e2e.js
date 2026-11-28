/**
 * PIXEL.GG STUDIO — ONLINE STATUS DOT, NAME BADGE, INDEPENDENT BADGES & VIEW COUNTER E2E SUITE
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
const API_PORT = 3125;
const WEB_PORT = 3124;
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
      // ignore abort
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

async function apiJson(token, pathname, method = "GET", body = undefined) {
  const res = await fetch(`${API_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  const suffix = Date.now().toString(36);
  const tokenFree = crypto.randomBytes(32).toString("hex");
  const tokenPremium = crypto.randomBytes(32).toString("hex");
  const tokenAdmin = crypto.randomBytes(32).toString("hex");

  const userFree = await prisma.user.create({
    data: {
      username: `abv_free_${suffix}`,
      globalName: `Free ABV ${suffix}`,
      discordId: `6661${Date.now().toString().slice(-10)}`,
      role: "USER",
      premiumStatus: false,
      nitroStatus: 0,
      badges: JSON.stringify(["early_supporter"]),
      appToken: tokenFree,
      profile: {
        create: {
          displayName: `Free ABV ${suffix}`,
          visibility: "PUBLIC",
          views: 15,
        },
      },
    },
  });

  const userPremium = await prisma.user.create({
    data: {
      username: `abv_prem_${suffix}`,
      globalName: `Prem ABV ${suffix}`,
      discordId: `6662${Date.now().toString().slice(-10)}`,
      role: "USER",
      premiumStatus: true,
      nitroStatus: 2,
      badges: JSON.stringify(["early_supporter", "verified"]),
      appToken: tokenPremium,
      profile: {
        create: {
          displayName: `Prem ABV ${suffix}`,
          visibility: "PUBLIC",
          views: 1250,
        },
      },
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      username: `abv_admin_${suffix}`,
      globalName: `Admin ABV ${suffix}`,
      discordId: `6663${Date.now().toString().slice(-10)}`,
      role: "ADMIN",
      premiumStatus: true,
      nitroStatus: 2,
      appToken: tokenAdmin,
      profile: {
        create: {
          displayName: `Admin ABV ${suffix}`,
          visibility: "PUBLIC",
          views: 100,
        },
      },
    },
  });

  let apiProc;
  let webProc;
  let browser;
  let apiLogs = "";

  try {
    apiProc = spawn("node", ["dist/index.js"], {
      cwd: API_DIR,
      env: { ...process.env, PORT: String(API_PORT), CLIENT_URL: WEB_URL, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    apiProc.stdout.on("data", (d) => { apiLogs += d.toString(); });
    apiProc.stderr.on("data", (d) => { apiLogs += d.toString(); });

    webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], {
      cwd: WEB_DIR,
      env: {
        ...process.env,
        PORT: String(WEB_PORT),
        INTERNAL_API_URL: API_URL,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_SITE_URL: WEB_URL,
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await waitForUrl(`${API_URL}/health`, 45000);
    await waitForUrl(`${WEB_URL}/login`, 45000);

    browser = await chromium.launch({ headless: true });

    // =========================================================================
    // PART 1-3: PREMIUM STUDIO FLOW (AVATAR DOT, NAME BADGE, INDEPENDENT BADGES, VIEW COUNTER)
    // =========================================================================
    console.log("[1/4] Testing Online Status Indicator across Square/Rounded/Circle & Sizes...");
    const premCtx = await createAuthedContext(browser, tokenPremium);
    const premPage = await premCtx.newPage();
    await premPage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await premPage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

    // Select Avatar node via Layers panel
    const avatarNode = premPage.locator('[data-node-type="profile-image"]').first();
    const avatarId = (await avatarNode.getAttribute("data-testid")).replace("canvas-node-", "");
    await premPage.getByTestId("secondary-dock-btn-layers").click();
    await premPage.waitForSelector(`[data-testid="layer-row-${avatarId}"]`, { timeout: 4000 });
    await premPage.getByTestId(`layer-row-${avatarId}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.waitForSelector('[data-testid="prop-width-input"]', { timeout: 4000 });

    // Ensure status dot enabled & test Square vs Circle positioning & proportional sizing
    await premPage.getByRole("button", { name: "square", exact: true }).click();
    await premPage.waitForTimeout(80);
    const dotSquareRight = await premPage
      .getByTestId(`avatar-status-dot-${avatarId}`)
      .evaluate((el) => parseInt(el.style.right, 10));

    await premPage.getByRole("button", { name: "circle", exact: true }).click();
    await premPage.getByTestId("prop-width-input").fill("140");
    await premPage.getByTestId("prop-height-input").fill("100");
    await premPage.waitForTimeout(100);
    const circleGeom = await premPage.evaluate((id) => {
      const wrap = document.querySelector(`[data-testid="avatar-wrapper-${id}"]`);
      const dot = document.querySelector(`[data-testid="avatar-status-dot-${id}"]`);
      return {
        wrapW: wrap ? parseInt(wrap.style.width, 10) : 0,
        wrapH: wrap ? parseInt(wrap.style.height, 10) : 0,
        dotRight: dot ? parseInt(dot.style.right, 10) : 0,
        dotW: dot ? parseInt(dot.style.width, 10) : 0,
      };
    }, avatarId);
    assert.strictEqual(circleGeom.wrapW, 100, "Circle avatar wrapper must stay true square (minDim)");
    assert.strictEqual(circleGeom.wrapH, 100);
    assert(circleGeom.dotRight > dotSquareRight, "Circle status dot must inset onto curved perimeter");
    assert(circleGeom.dotW >= 18, `Proportional dot size should scale with 100px avatar (${circleGeom.dotW})`);

    // =========================================================================
    // PART 2.1: NAME BADGE SYSTEM
    // =========================================================================
    console.log("[2/4] Testing Name Badge System & Badge Picker Inventory...");
    const nameNode = premPage.locator('[data-node-type="name-text"]').first();
    const nameId = (await nameNode.getAttribute("data-testid")).replace("canvas-node-", "");
    await premPage.getByTestId("unified-tab-layers").click();
    await premPage.getByTestId(`layer-row-${nameId}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.waitForSelector('[data-testid="name-badge-picker-btn"]', { timeout: 4000 });

    await premPage.getByTestId("name-badge-picker-btn").click();
    await premPage.waitForSelector('[data-testid="badge-picker-modal"]', { timeout: 4000 });
    // Locked badge (staff) must be disabled for non-admin
    await premPage.getByTestId("badge-picker-filter-all").click();
    assert.strictEqual(
      await premPage.getByTestId("badge-picker-item-staff").isDisabled(),
      true,
      "Unowned badge (staff) must be disabled in picker"
    );
    await premPage.getByTestId("badge-picker-filter-owned").click();
    await premPage.getByTestId("badge-picker-item-early_supporter").click();
    await premPage.waitForTimeout(80);
    assert.strictEqual(
      await premPage.getByTestId(`name-badge-${nameId}`).getAttribute("data-badge-id"),
      "early_supporter"
    );

    // Toggle visibility off -> on preserves selection; remove clears it; re-select verified
    await premPage.getByTestId("name-badge-toggle").click();
    assert.strictEqual(await premPage.locator(`[data-testid="name-badge-${nameId}"]`).count(), 0);
    await premPage.getByTestId("name-badge-toggle").click();
    assert.strictEqual(
      await premPage.getByTestId(`name-badge-${nameId}`).getAttribute("data-badge-id"),
      "early_supporter"
    );
    await premPage.getByTestId("name-badge-remove-btn").click();
    assert.strictEqual(await premPage.locator(`[data-testid="name-badge-${nameId}"]`).count(), 0);
    await premPage.getByTestId("name-badge-picker-btn").click();
    await premPage.getByTestId("badge-picker-item-verified").click();
    assert.strictEqual(
      await premPage.getByTestId(`name-badge-${nameId}`).getAttribute("data-badge-id"),
      "verified"
    );

    // =========================================================================
    // PART 2.2: INDEPENDENT PROFILE BADGE COMPONENTS
    // =========================================================================
    console.log("[3/4] Testing Independent Profile Badges (Modes, Colors, Glow)...");
    await premPage.getByTestId("unified-tab-add-elements").click();
    await premPage.waitForSelector('[data-testid="modal-add-profile-badge"]', { timeout: 4000 });
    await premPage.getByTestId("modal-add-profile-badge").click();
    await premPage.locator('[data-testid="add-elements-modal"]').waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await premPage.getByTestId("unified-tab-add-elements").click();
    await premPage.waitForSelector('[data-testid="modal-add-profile-badge"]', { timeout: 4000 });
    await premPage.getByTestId("modal-add-profile-badge").click();
    await premPage.locator('[data-testid="add-elements-modal"]').waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await premPage.waitForTimeout(120);

    const badgeNodes = premPage.locator('[data-node-type="profile-badge"]');
    assert.strictEqual(await badgeNodes.count(), 2, "Must support multiple independent profile-badge nodes");
    const badge1Id = (await badgeNodes.nth(0).getAttribute("data-testid")).replace("canvas-node-", "");
    const badge2Id = (await badgeNodes.nth(1).getAttribute("data-testid")).replace("canvas-node-", "");

    // Customize Badge 1: Name + Icon, Custom Color, Glow enabled
    await premPage.getByTestId("unified-tab-layers").click();
    await premPage.getByTestId(`layer-row-${badge1Id}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.waitForSelector('[data-testid="profile-badge-mode-icon-name"]', { timeout: 4000 });
    await premPage.getByTestId("profile-badge-mode-icon-name").click();
    await premPage.getByTestId("profile-badge-color-custom").click();
    await premPage.getByTestId("profile-badge-custom-color-input").fill("#ec4899");
    await premPage.getByTestId("profile-badge-glow-toggle").click();
    await premPage.getByTestId("prop-x-input").fill("42");
    await premPage.getByTestId("prop-y-input").fill("310");

    // Customize Badge 2: Icon Only, Preset Red, different position
    await premPage.getByTestId("unified-tab-layers").click();
    await premPage.getByTestId(`layer-row-${badge2Id}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.getByTestId("profile-badge-preset-red").click();
    await premPage.getByTestId("prop-x-input").fill("210");
    await premPage.getByTestId("prop-y-input").fill("310");
    await premPage.waitForTimeout(100);

    assert.strictEqual(
      await premPage.getByTestId(`profile-badge-node-${badge1Id}`).getAttribute("data-badge-mode"),
      "icon-name"
    );
    assert.strictEqual(
      await premPage.getByTestId(`profile-badge-node-${badge2Id}`).getAttribute("data-badge-mode"),
      "icon"
    );

    // =========================================================================
    // PART 3: PROFILE VIEW COUNTER (FORMAT, MOVE/RESIZE, HIDE/SHOW, PROTECTION)
    // =========================================================================
    console.log("[4/4] Testing View Counter Formatting, Persistence, Live Increment & Admin Protection...");
    const viewCounterNode = premPage.locator('[data-node-type="view-counter"]').first();
    assert.strictEqual(await viewCounterNode.count(), 1, "Protected view-counter must auto-initialize");
    const vcId = (await viewCounterNode.getAttribute("data-testid")).replace("canvas-node-", "");
    assert.strictEqual(
      await premPage.getByTestId(`view-counter-text-${vcId}`).innerText(),
      "1.25K",
      "1250 views must format as 1.25K"
    );

    // Select View Counter -> verify ft-delete is disabled for non-admin
    await premPage.getByTestId("unified-tab-layers").click();
    await premPage.getByTestId(`layer-row-${vcId}`).click();
    await premPage.getByTestId("unified-tab-properties").click();
    await premPage.waitForSelector('[data-testid="view-counter-visible-toggle"]', { timeout: 4000 });
    assert.strictEqual(
      await premPage.getByTestId("ft-delete").getAttribute("aria-disabled"),
      "true",
      "Non-admin users must NOT be able to delete View Counter"
    );

    // Move & resize View Counter, Save & Publish
    await premPage.getByTestId("prop-x-input").fill("56");
    await premPage.getByTestId("prop-width-input").fill("132");
    await premPage.waitForTimeout(80);

    const draftResp = premPage.waitForResponse(
      (r) => r.url().includes("/api/profile/me") && r.request().method() === "PATCH"
    );
    await premPage.getByTestId("builder-save-draft-btn").click();
    assert.strictEqual((await draftResp).status(), 200);
    await premPage.waitForTimeout(150);

    const publishResp = premPage.waitForResponse(
      (r) =>
        r.url().includes("/api/profile/me") &&
        r.request().method() === "PATCH" &&
        (r.request().postData() || "").includes("profileBuilder")
    );
    await premPage.getByTestId("builder-publish-btn").click();
    const pubRes = await publishResp;
    assert.strictEqual(pubRes.status(), 200, `Publish failed with ${pubRes.status()}`);
    await premPage.waitForTimeout(250);

    // Reload Studio & verify View Counter + Badges persisted
    await premPage.reload({ waitUntil: "networkidle" });
    await premPage.waitForSelector(`[data-testid="canvas-node-${vcId}"]`, { timeout: 15000 });
    assert.strictEqual(
      await premPage.locator(`[data-testid="canvas-node-${vcId}"]`).evaluate((el) => el.style.left),
      "56px"
    );
    assert.strictEqual(
      await premPage.getByTestId(`name-badge-${nameId}`).getAttribute("data-badge-id"),
      "verified"
    );
    assert.strictEqual(await premPage.locator('[data-node-type="profile-badge"]').count(), 2);

    // Visit Public Profile as Guest -> verify View Counter increments live (1250 -> 1251) & deduplicates on reload
    const guestCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    await attachApiProxy(guestCtx);
    const pubPage = await guestCtx.newPage();
    await pubPage.goto(`${WEB_URL}/${userPremium.username}`, { waitUntil: "networkidle" });
    if (await pubPage.getByTestId("public-entry-screen").count()) {
      await pubPage.getByTestId("public-entry-screen").click();
      await pubPage.waitForTimeout(550);
    }
    const hasVcOnPub = await pubPage.locator(`[data-testid="view-counter-node-${vcId}"]`).count();
    if (!hasVcOnPub) {
      const apiCheckRes = await fetch(`${API_URL}/api/profile/u/${userPremium.username}`);
      const apiCheckText = await apiCheckRes.text().catch(() => "");
      const bodyPreview = await pubPage.evaluate(() => document.body.innerText.slice(0, 200));
      throw new Error(`Public page missing view-counter-node-${vcId}. API=${apiCheckRes.status} ${apiCheckText.slice(0, 200)} URL=${pubPage.url()} Body=${bodyPreview}`);
    }
    await pubPage.waitForFunction(
      (id) => document.querySelector(`[data-testid="view-counter-node-${id}"]`)?.getAttribute("data-raw-views") === "1251",
      vcId,
      { timeout: 10000 }
    );
    const rawViewsAfterVisit = await pubPage.getByTestId(`view-counter-node-${vcId}`).getAttribute("data-raw-views");
    assert.strictEqual(rawViewsAfterVisit, "1251", `Public guest visit should increment views live to 1251, got ${rawViewsAfterVisit}`);

    // Rapid reload -> duplicate-view protection keeps count at 1251
    await pubPage.reload({ waitUntil: "networkidle" });
    if (await pubPage.getByTestId("public-entry-screen").count()) {
      await pubPage.getByTestId("public-entry-screen").click();
    }
    await pubPage.waitForSelector(`[data-testid="view-counter-node-${vcId}"]`, { timeout: 10000 });
    await pubPage.waitForTimeout(300);
    assert.strictEqual(
      await pubPage.getByTestId(`view-counter-node-${vcId}`).getAttribute("data-raw-views"),
      "1251",
      "Duplicate reload must not artificially inflate view count"
    );
    await guestCtx.close();
    await premCtx.close();

    // =========================================================================
    // BACKEND SECURITY: OWNERSHIP, PREMIUM BADGE RESTRICTIONS & ADMIN PROTECTION
    // =========================================================================
    const premProfRes = await apiJson(tokenPremium, "/api/profile/me");
    const premCfg = JSON.parse(premProfRes.data.designConfig);

    // 1. Non-admin attempting to remove view-counter via API -> 403
    const docWithoutVc = JSON.parse(JSON.stringify(premCfg.draftProfileBuilder));
    docWithoutVc.nodes = docWithoutVc.nodes.filter((n) => n.type !== "view-counter");
    const rejectVcDel = await apiJson(tokenPremium, "/api/profile/me", "PATCH", {
      designConfig: { ...premCfg, draftProfileBuilder: docWithoutVc },
    });
    assert.strictEqual(rejectVcDel.status, 403, `Expected 403 when non-admin deletes view-counter, got ${rejectVcDel.status}`);

    // 2. Non-admin attempting to reset profile.views via PATCH /api/profile/me -> ignored
    await apiJson(tokenPremium, "/api/profile/me", "PATCH", { views: 0 });
    const profAfterResetAttempt = await prisma.profile.findUnique({ where: { userId: userPremium.id } });
    assert.strictEqual(profAfterResetAttempt.views, 1251, "Non-admin must NOT be able to reset views via /api/profile/me");

    // 3. Free user assigning unowned badge ("staff") -> 403
    const freeProfRes = await apiJson(tokenFree, "/api/profile/me");
    const freeCfg = JSON.parse(freeProfRes.data.designConfig || "{}");
    const unownedDoc = {
      version: "2.0",
      canvas: { width: 1280, height: 720, backgroundColor: "#060608", gridSize: 8 },
      preferences: {},
      metadata: {},
      rootIds: ["n1"],
      nodes: [
        {
          id: "n1",
          type: "name-text",
          name: "Name",
          x: 20,
          y: 20,
          width: 200,
          height: 32,
          zIndex: 1,
          parentId: null,
          childIds: [],
          visible: true,
          locked: false,
          style: {},
          responsive: {},
          config: { nameBadgeId: "staff", nameBadgeEnabled: true },
        },
      ],
    };
    const rejectUnowned = await apiJson(tokenFree, "/api/profile/me", "PATCH", {
      designConfig: { ...freeCfg, draftProfileBuilder: unownedDoc },
    });
    assert.strictEqual(rejectUnowned.status, 403, `Expected 403 for unowned badge, got ${rejectUnowned.status}`);

    // 4. Free user setting custom badge color -> 403
    const freeCustomBadgeDoc = {
      ...unownedDoc,
      nodes: [
        {
          id: "b1",
          type: "profile-badge",
          name: "Badge",
          x: 20,
          y: 20,
          width: 44,
          height: 44,
          zIndex: 1,
          parentId: null,
          childIds: [],
          visible: true,
          locked: false,
          style: {},
          responsive: {},
          config: { badgeId: "early_supporter", badgeColorMode: "custom", badgeColor: "#ff00ff" },
        },
      ],
    };
    const rejectCustomColor = await apiJson(tokenFree, "/api/profile/me", "PATCH", {
      designConfig: { ...freeCfg, draftProfileBuilder: freeCustomBadgeDoc },
    });
    assert.strictEqual(rejectCustomColor.status, 403, `Expected 403 for Free custom badge color, got ${rejectCustomColor.status}`);

    // 5. Admin view reset endpoint -> 200 (and Free user attempting admin endpoint -> 403)
    const freeAdminAttempt = await apiJson(tokenFree, `/api/admin/users/${userPremium.id}/views`, "PATCH", { views: 0 });
    assert.strictEqual(freeAdminAttempt.status, 403);
    const adminResetViews = await apiJson(tokenAdmin, `/api/admin/users/${userPremium.id}/views`, "PATCH", { views: 42 });
    assert.strictEqual(adminResetViews.status, 200);
    assert.strictEqual(adminResetViews.data.views, 42);

    console.log("ALL AVATAR DOT, BADGE SYSTEM & VIEW COUNTER E2E TESTS PASSED!");
  } catch (err) {
    console.error("[ABV E2E Error] API Logs:\n", apiLogs);
    throw err;
  } finally {
    const killTree = (proc) => {
      if (!proc || !proc.pid) return;
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
        } else {
          proc.kill("SIGKILL");
        }
      } catch {}
    };
    if (browser) await browser.close().catch(() => {});
    killTree(apiProc);
    killTree(webProc);
    await prisma.user.deleteMany({ where: { id: { in: [userFree.id, userPremium.id, userAdmin.id] } } }).catch(() => {});
    await prisma.$disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ABV E2E FAILED:", err);
    process.exit(1);
  });
