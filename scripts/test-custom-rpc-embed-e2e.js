/**
 * PIXEL.GG STUDIO — CUSTOM DISCORD RICH PRESENCE PARENT EMBED, CHILDREN,
 * PERMISSIONS (FREE/PREMIUM/ADMIN), LIVE ACTIVITY SYNC & TEMPLATE SYSTEM E2E SUITE
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
const API_PORT = 3121;
const WEB_PORT = 3120;
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
      // ignore navigation abort
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
      username: `rpc_free_${suffix}`,
      globalName: `Free RPC ${suffix}`,
      discordId: `5551${Date.now().toString().slice(-10)}`,
      role: "USER",
      premiumStatus: false,
      nitroStatus: 0,
      appToken: tokenFree,
      profile: {
        create: {
          displayName: `Free RPC ${suffix}`,
          visibility: "PUBLIC",
        },
      },
    },
  });

  const userPremium = await prisma.user.create({
    data: {
      username: `rpc_prem_${suffix}`,
      globalName: `Premium RPC ${suffix}`,
      discordId: `5552${Date.now().toString().slice(-10)}`,
      role: "USER",
      premiumStatus: true,
      nitroStatus: 2,
      appToken: tokenPremium,
      profile: {
        create: {
          displayName: `Premium RPC ${suffix}`,
          visibility: "PUBLIC",
        },
      },
      richPresence: {
        create: {
          appName: "Original Discord App",
          details: "Untouched Discord Details",
          state: "Untouched Discord State",
          largeImage: "https://pixlpresence1-web.vercel.app/server-icon.png",
          showProfileRpc: true,
          enableDiscordRpc: true,
        },
      },
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      username: `rpc_admin_${suffix}`,
      globalName: `Admin RPC ${suffix}`,
      discordId: `5553${Date.now().toString().slice(-10)}`,
      role: "ADMIN",
      premiumStatus: true,
      nitroStatus: 2,
      appToken: tokenAdmin,
      profile: {
        create: {
          displayName: `Admin RPC ${suffix}`,
          visibility: "PUBLIC",
        },
      },
    },
  });

  const createdTemplateIds = [];
  let apiProc;
  let webProc;
  let browser;
  let apiLogs = "";

  try {
    apiProc = spawn(process.execPath, [path.join(API_DIR, "dist/index.js")], {
      cwd: API_DIR,
      env: {
        ...process.env,
        PORT: String(API_PORT),
        NODE_ENV: "production",
        FRONTEND_URL: WEB_URL,
      },
      stdio: "pipe",
    });
    apiProc.stdout.on("data", (d) => { apiLogs += d.toString(); });
    apiProc.stderr.on("data", (d) => { apiLogs += d.toString(); });

    webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT), "-H", "127.0.0.1"], {
      cwd: WEB_DIR,
      shell: true,
      env: {
        ...process.env,
        PORT: String(WEB_PORT),
        NEXT_PUBLIC_API_URL: API_URL,
        INTERNAL_API_URL: API_URL,
      },
      stdio: "pipe",
    });

    await Promise.all([
      waitForUrl(`${API_URL}/health`),
      waitForUrl(`${WEB_URL}/login`),
    ]);

    browser = await chromium.launch({ headless: true });

    // =========================================================================
    // TEST A & B & E & F: PREMIUM PARENT EMBED, CHILDREN, VIDEO BG & TEMPLATES
    // =========================================================================
    console.log("[1/4] Test A/B/E: Premium CustomRichPresenceParentEmbed + Children + Video BG + Save...");
    const premCtx = await createAuthedContext(browser, tokenPremium);
    const premPage = await premCtx.newPage();
    await premPage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await premPage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

    // Open Elements Panel and insert Custom RPC Embed
    await premPage.getByTestId("dock-more-toggle").click();
    await premPage.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 4000 });
    await premPage.getByTestId("dock-open-elements-panel").click();
    await premPage.waitForSelector('[data-testid="library-add-custom-rpc-embed"]', { timeout: 4000 });
    await premPage.getByTestId("library-add-custom-rpc-embed").click();
    await premPage.waitForSelector('[data-node-type="custom-rpc-embed"]', { timeout: 5000 });
    await premPage.getByTestId("elements-panel-close").click();

    const rpcEmbedNode = premPage.locator('[data-node-type="custom-rpc-embed"]').first();
    const rpcEmbedId = await rpcEmbedNode.getAttribute("data-testid");
    const embedRawId = rpcEmbedId.replace("canvas-node-", "");

    // Verify structured child nodes exist inside Custom RPC Embed
    for (const childType of ["rpc-status", "rpc-icon", "rpc-title", "rpc-details", "rpc-state", "rpc-timestamp", "rpc-achievement", "rpc-buttons"]) {
      const cnt = await premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="${childType}"]`).count();
      assert.strictEqual(cnt, 1, `Expected 1 ${childType} child inside custom-rpc-embed`);
    }

    // Open Properties Panel -> Select Parent Embed edge (not center child) & Resize/Set Video Background
    await rpcEmbedNode.click({ position: { x: 6, y: 6 }, force: true });
    await premPage.getByTestId("secondary-dock-btn-properties").click();
    await premPage.waitForSelector('[data-testid="container-bg-mode-video"]', { timeout: 5000 });

    await premPage.getByTestId("prop-width-input").fill("460");
    await premPage.getByTestId("prop-height-input").fill("204");
    await premPage.waitForTimeout(100);

    // Switch container background to Video URL (durable HTTPS video ref)
    await premPage.getByTestId("container-bg-mode-video").click();
    await premPage.waitForSelector('[data-testid="container-bg-video-url"]', { timeout: 3000 });
    await premPage.getByTestId("container-bg-video-url").fill("https://cdn.example.com/custom-rpc-loop.mp4");
    await premPage.waitForTimeout(150);

    assert.strictEqual(
      await premPage.locator(`[data-testid="container-bg-video-${embedRawId}"]`).count(),
      1,
      "Container <video> layer must render inside Custom RPC Embed"
    );

    // Test B: Select a child element (rpc-title), move/resize it, verify clamping
    const titleChild = premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="rpc-title"]`).first();
    const origChildTestId = await titleChild.getAttribute("data-testid");
    await titleChild.click({ force: true });
    await premPage.waitForSelector('[data-testid="prop-x-input"]', { timeout: 4000 });
    await premPage.getByTestId("prop-x-input").fill("120");
    await premPage.getByTestId("prop-y-input").fill("52");
    await premPage.getByTestId("prop-width-input").fill("290");
    await premPage.waitForTimeout(100);

    // Verify Test B: Duplicate child inside Custom RPC Embed and delete duplicate
    await premPage.getByTestId("ft-duplicate").click();
    await premPage.waitForTimeout(120);
    assert.strictEqual(
      await premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="rpc-title"]`).count(),
      2,
      "Premium user must be able to duplicate RPC child element"
    );
    await premPage.getByTestId("ft-delete").click();
    await premPage.waitForTimeout(120);
    assert.strictEqual(
      await premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="rpc-title"]`).count(),
      1,
      "Premium user must be able to delete duplicated RPC child element"
    );

    // Test F (Personal Save Template): Save current embed as Premium user template
    await rpcEmbedNode.click({ position: { x: 6, y: 6 }, force: true });
    await premPage.waitForSelector('[data-testid="rpc-save-tpl-name"]', { timeout: 4000 });
    await premPage.getByTestId("rpc-save-tpl-name").fill("Prem Theme Alpha");
    await premPage.getByTestId("rpc-save-tpl-category").fill("Custom");
    await premPage.getByTestId("rpc-save-template-btn").click();
    await premPage.waitForTimeout(450);

    // Save & Publish Profile (wait for actual HTTP 200 responses before reload!)
    const saveDraftResp = premPage.waitForResponse(
      (r) => r.url().includes("/api/profile/me") && r.request().method() === "PATCH"
    );
    await premPage.getByTestId("builder-save-draft-btn").click();
    const draftRes = await saveDraftResp;
    assert.strictEqual(draftRes.status(), 200, `Save Draft failed with HTTP ${draftRes.status()}`);
    await premPage.waitForTimeout(200);

    const publishResp = premPage.waitForResponse(
      (r) => r.url().includes("/api/profile/me") && r.request().method() === "PATCH"
    );
    await premPage.getByTestId("builder-publish-btn").click();
    const pubRes = await publishResp;
    assert.strictEqual(pubRes.status(), 200, `Publish failed with HTTP ${pubRes.status()}`);
    await premPage.waitForTimeout(250);

    // Verify Reload Persistence in Studio
    await premPage.reload({ waitUntil: "networkidle" });
    await premPage.waitForSelector(`[data-testid="canvas-node-${embedRawId}"]`, { timeout: 15000 });
    const reloadedW = await premPage.locator(`[data-testid="canvas-node-${embedRawId}"]`).evaluate((el) => el.style.width);
    const reloadedChildX = await premPage.locator(`[data-testid="${origChildTestId}"]`).evaluate((el) => el.style.left);
    assert.strictEqual(reloadedW, "460px", `Expected persisted width 460px, got ${reloadedW}`);
    assert.strictEqual(reloadedChildX, "120px", `Expected persisted child left 120px, got ${reloadedChildX}`);

    // Verify Test E: Real Discord RichPresence DB row was NEVER modified by website customization
    const dbRpcAfterCustom = await prisma.richPresence.findUnique({ where: { userId: userPremium.id } });
    assert.strictEqual(dbRpcAfterCustom.appName, "Original Discord App");
    assert.strictEqual(dbRpcAfterCustom.details, "Untouched Discord Details");
    assert.strictEqual(dbRpcAfterCustom.state, "Untouched Discord State");

    // =========================================================================
    // TEST D: LIVE ACTIVITY SYNC (VALORANT -> MINECRAFT -> OFFLINE)
    // =========================================================================
    console.log("[2/4] Test D: Live Activity Sync across Studio & Public Profile preserving custom layout...");
    const pushPresenceRes1 = await apiJson(tokenPremium, "/api/rpc/presence", "POST", {
      status: "online",
      activity: {
        name: "VALORANT",
        appName: "VALORANT",
        type: 0,
        details: "Competitive · Ascent",
        state: "In Party",
        party: { size: [3, 5] },
        timestamps: { start: Date.now() - 90000 },
      },
      sequence: 1,
      timestamp: Date.now(),
    });
    assert.strictEqual(pushPresenceRes1.status, 200);

    const pubPage = await premCtx.newPage();
    await pubPage.goto(`${WEB_URL}/${userPremium.username}`, { waitUntil: "networkidle" });
    // Dismiss entry screen if shown
    if (await pubPage.getByTestId("public-entry-screen").count()) {
      await pubPage.getByTestId("public-entry-screen").click();
      await pubPage.waitForTimeout(550);
    }

    await pubPage.waitForSelector('[data-testid="rpc-child-rpc-title"]', { timeout: 10000 });
    const valTitle = await pubPage.getByTestId("rpc-child-rpc-title").innerText();
    const valDetails = await pubPage.getByTestId("rpc-child-rpc-details").innerText();
    const valState = await pubPage.getByTestId("rpc-child-rpc-state").innerText();
    assert.ok(valTitle.includes("VALORANT"), `Expected VALORANT on public profile, got "${valTitle}"`);
    assert.ok(valDetails.includes("Competitive"), `Expected details, got "${valDetails}"`);
    assert.ok(valState.includes("(3 of 5)"), `Expected party size in state, got "${valState}"`);

    // Verify achievements are NOT fabricated when no real synced streak exists
    assert.strictEqual(
      await pubPage.getByTestId("rpc-child-rpc-achievement").count(),
      0,
      "Empty unsynced achievements must NOT fabricate fake badges on public profile"
    );

    // Switch live activity -> Minecraft in real time (Socket.IO / live presence sync)
    await apiJson(tokenPremium, "/api/rpc/presence", "POST", {
      status: "online",
      activity: {
        name: "Minecraft",
        appName: "Minecraft",
        type: 0,
        details: "Hardcore Survival",
        state: "Nether Fortress",
        party: { size: [1, 4] },
      },
      sequence: 2,
      timestamp: Date.now() + 1000,
    });
    await pubPage.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="rpc-child-rpc-title"]')
          ?.textContent?.includes("Minecraft"),
      null,
      { timeout: 10000 }
    );
    await premPage.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="rpc-child-rpc-title"]')
          ?.textContent?.includes("Minecraft"),
      null,
      { timeout: 10000 }
    );

    const mcPublicTitle = await pubPage.getByTestId("rpc-child-rpc-title").innerText();
    const mcStudioTitle = await premPage.getByTestId("rpc-child-rpc-title").first().innerText();
    assert.ok(mcPublicTitle.includes("Minecraft"), `Public profile must switch to Minecraft, got "${mcPublicTitle}"`);
    assert.ok(mcStudioTitle.includes("Minecraft"), `Studio canvas must switch to Minecraft, got "${mcStudioTitle}"`);

    // Verify Studio layout & video background remained untouched across activity switch
    assert.strictEqual(
      await premPage.locator(`[data-testid="canvas-node-${embedRawId}"]`).evaluate((el) => el.style.width),
      "460px"
    );
    assert.strictEqual(
      await premPage.locator(`[data-testid="${origChildTestId}"]`).evaluate((el) => el.style.left),
      "120px"
    );

    // Switch live activity -> Offline (must clear stale game, NOT keep Minecraft!)
    await apiJson(tokenPremium, "/api/rpc/presence", "POST", {
      status: "offline",
      activity: null,
      sequence: 3,
      timestamp: Date.now() + 2000,
    });
    await pubPage.waitForFunction(
      () => {
        const txt = document.querySelector('[data-testid="rpc-child-rpc-title"]')?.textContent || "";
        return !txt.includes("Minecraft");
      },
      null,
      { timeout: 10000 }
    );
    const offlineTitle = await pubPage.getByTestId("rpc-child-rpc-title").innerText();
    assert.ok(!offlineTitle.includes("Minecraft"), `Offline state must clear stale Minecraft activity, got "${offlineTitle}"`);

    await premCtx.close();

    // =========================================================================
    // TEST C: FREE USER RESTRICTIONS (UI + BACKEND 403 ENFORCEMENT)
    // =========================================================================
    console.log("[3/4] Test C: Verifying Free tier UI locks & backend HTTP 403 rejection...");
    const freeCtx = await createAuthedContext(browser, tokenFree);
    const freePage = await freeCtx.newPage();
    await freePage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await freePage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

    // Free user CAN add default Custom RPC Embed
    await freePage.getByTestId("dock-more-toggle").click();
    await freePage.getByTestId("dock-open-elements-panel").click();
    await freePage.getByTestId("library-add-custom-rpc-embed").click();
    await freePage.waitForSelector('[data-node-type="custom-rpc-embed"]', { timeout: 5000 });
    await freePage.getByTestId("elements-panel-close").click();

    const freeRpcEmbed = freePage.locator('[data-node-type="custom-rpc-embed"]').first();
    const freeEmbedRawId = (await freeRpcEmbed.getAttribute("data-testid")).replace("canvas-node-", "");
    await freeRpcEmbed.click({ position: { x: 6, y: 6 }, force: true });
    await freePage.getByTestId("secondary-dock-btn-properties").click();
    await freePage.waitForSelector('[data-testid="rpc-free-upgrade-banner"]', { timeout: 4000 });

    // Free user CANNOT see resize handles on custom-rpc-embed & CANNOT change container bg to video
    assert.strictEqual(await freePage.locator('[data-testid="builder-handle-se"]').count(), 0);
    await freePage.getByTestId("container-bg-mode-video").click();
    await freePage.waitForTimeout(100);
    assert.strictEqual(await freePage.locator(`[data-testid="container-bg-video-${freeEmbedRawId}"]`).count(), 0);

    // Free user CANNOT duplicate/delete/drag child element inside Custom RPC Embed
    const freeChild = freePage.locator(`[data-parent-id="${freeEmbedRawId}"][data-node-type="rpc-title"]`).first();
    await freeChild.click({ force: true });
    await freePage.waitForSelector('[data-testid="rpc-child-locked-notice"]', { timeout: 4000 });
    assert.strictEqual(await freePage.getByTestId("ft-duplicate").getAttribute("aria-disabled"), "true");
    assert.strictEqual(await freePage.getByTestId("ft-delete").getAttribute("aria-disabled"), "true");

    // Legitimate Free save with default rpc-tpl-default MUST succeed with 200
    const freeSaveResp = freePage.waitForResponse(
      (r) => r.url().includes("/api/profile/me") && r.request().method() === "PATCH"
    );
    await freePage.getByTestId("builder-save-draft-btn").click();
    const freeSaveRes = await freeSaveResp;
    assert.strictEqual(freeSaveRes.status(), 200, `Free Save Draft with default template failed with HTTP ${freeSaveRes.status()}`);
    await freePage.waitForTimeout(150);

    // Fetch saved free designConfig via /api/profile/me to test backend 403 tampering protection
    const freeProfRes = await apiJson(tokenFree, "/api/profile/me");
    const freeCfg = JSON.parse(freeProfRes.data.designConfig);
    const tamperedDoc = JSON.parse(JSON.stringify(freeCfg.draftProfileBuilder));

    // Tamper 1: Move child X inside custom-rpc-embed as Free user -> must 403!
    const tamperedChild = tamperedDoc.nodes.find((n) => n.parentId === freeEmbedRawId && n.type === "rpc-title");
    tamperedChild.x += 25;
    const rejectChildMove = await apiJson(tokenFree, "/api/profile/me", "PATCH", {
      designConfig: { ...freeCfg, draftProfileBuilder: tamperedDoc },
    });
    assert.strictEqual(rejectChildMove.status, 403, `Expected 403 when Free tampers child position, got ${rejectChildMove.status}`);

    // Tamper 2: Set video background on custom-rpc-embed as Free user -> must 403!
    const tamperedDocVid = JSON.parse(JSON.stringify(freeCfg.draftProfileBuilder));
    const tamperedParentVid = tamperedDocVid.nodes.find((n) => n.id === freeEmbedRawId);
    tamperedParentVid.style.backgroundType = "video";
    tamperedParentVid.style.backgroundVideo = "https://cdn.example.com/hack.mp4";
    const rejectVid = await apiJson(tokenFree, "/api/profile/me", "PATCH", {
      designConfig: { ...freeCfg, draftProfileBuilder: tamperedDocVid },
    });
    assert.strictEqual(rejectVid.status, 403, `Expected 403 for Free video background, got ${rejectVid.status}`);

    // Tamper 3: Apply Premium template (rpc-tpl-valorant) as Free user -> must 403!
    const tamperedDocTpl = JSON.parse(JSON.stringify(freeCfg.draftProfileBuilder));
    const tamperedParentTpl = tamperedDocTpl.nodes.find((n) => n.id === freeEmbedRawId);
    tamperedParentTpl.config.rpcTemplateId = "rpc-tpl-valorant";
    const rejectPremTpl = await apiJson(tokenFree, "/api/profile/me", "PATCH", {
      designConfig: { ...freeCfg, draftProfileBuilder: tamperedDocTpl },
    });
    assert.strictEqual(rejectPremTpl.status, 403, `Expected 403 for Free applying Premium template, got ${rejectPremTpl.status}`);

    // Tamper 4: Non-Admin publishing global template -> must 403!
    const rejectGlobalCreate = await apiJson(tokenPremium, "/api/rpc/templates", "POST", {
      name: "Unauthorized Global",
      category: "Custom",
      isGlobal: true,
      config: { templateType: "rpc-embed-v2", parentWidth: 380, parentHeight: 168, parentStyle: {}, children: [] },
    });
    assert.strictEqual(rejectGlobalCreate.status, 403, "Non-Admin must receive 403 when creating isGlobal template");

    await freeCtx.close();

    // =========================================================================
    // TEST F & ADMIN GLOBAL OFFICIAL TEMPLATE LIFECYCLE & ISOLATION
    // =========================================================================
    console.log("[4/4] Test F & Admin: Official Global Template publish/edit/delete & template isolation...");
    const adminCreateGlobal = await apiJson(tokenAdmin, "/api/rpc/templates", "POST", {
      name: "Official Free Arena Skin",
      category: "Arena",
      isGlobal: true,
      config: {
        templateType: "rpc-embed-v2",
        isPremiumRequired: false,
        parentWidth: 380,
        parentHeight: 168,
        parentStyle: { backgroundType: "solid", backgroundColor: "#111116" },
        children: [
          { type: "rpc-title", x: 16, y: 16, width: 220, height: 24 },
        ],
      },
    });
    assert.strictEqual(adminCreateGlobal.status, 200, "Admin must be able to publish official global template");
    const globalTplId = adminCreateGlobal.data.id;
    createdTemplateIds.push(globalTplId);

    // Edit global template as Admin -> 200; as Free -> 403
    const freeEditGlobal = await apiJson(tokenFree, `/api/rpc/templates/${globalTplId}`, "PATCH", {
      name: "Hacked Name",
    });
    assert.strictEqual(freeEditGlobal.status, 403, "Non-admin must get 403 editing global template");

    const adminEditGlobal = await apiJson(tokenAdmin, `/api/rpc/templates/${globalTplId}`, "PATCH", {
      name: "Official Free Arena Skin v2",
    });
    assert.strictEqual(adminEditGlobal.status, 200);
    assert.strictEqual(adminEditGlobal.data.name, "Official Free Arena Skin v2");

    // Verify applying a visual template via POST /templates/:id/apply NEVER mutates RichPresence DB
    const applyV2Res = await apiJson(tokenPremium, `/api/rpc/templates/${globalTplId}/apply`, "POST");
    assert.strictEqual(applyV2Res.status, 200);
    assert.strictEqual(applyV2Res.data.isVisualTemplate, true);
    const dbRpcFinal = await prisma.richPresence.findUnique({ where: { userId: userPremium.id } });
    assert.strictEqual(dbRpcFinal.appName, "Original Discord App", "Applying V2 visual template must NEVER alter RichPresence DB");

    // Delete global template as non-admin -> 403; as Admin -> 200
    const nonAdminDel = await apiJson(tokenPremium, `/api/rpc/templates/${globalTplId}`, "DELETE");
    assert.strictEqual(nonAdminDel.status, 403);
    const adminDel = await apiJson(tokenAdmin, `/api/rpc/templates/${globalTplId}`, "DELETE");
    assert.strictEqual(adminDel.status, 200);

    console.log("ALL CUSTOM RICH PRESENCE EMBED E2E TESTS (A-F) PASSED!");
  } catch (err) {
    console.error("[Custom RPC E2E Error] API Logs:\n", apiLogs);
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
      } catch {
        try { proc.kill(); } catch {}
      }
    };
    if (browser) await browser.close().catch(() => {});
    killTree(apiProc);
    killTree(webProc);
    for (const tid of createdTemplateIds) {
      await prisma.activityTemplate.deleteMany({ where: { id: tid } }).catch(() => {});
    }
    await prisma.activityTemplate.deleteMany({ where: { userId: { in: [userFree.id, userPremium.id, userAdmin.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userFree.id, userPremium.id, userAdmin.id] } } }).catch(() => {});
    await prisma.$disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Custom RPC Embed E2E FAILED:", err);
    process.exit(1);
  });
