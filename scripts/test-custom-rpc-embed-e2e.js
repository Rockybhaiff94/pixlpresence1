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
    } catch { }
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

    // Open Elements Panel: verify ONLY ONE unified Custom RPC exists (no duplicate custom-rpc-embed)
    await premPage.getByTestId("dock-more-toggle").click();
    await premPage.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 4000 });
    await premPage.getByTestId("dock-open-elements-panel").click();
    await premPage.waitForSelector('[data-testid="library-add-custom-rpc"]', { timeout: 4000 });
    assert.strictEqual(
      await premPage.locator('[data-testid="library-add-custom-rpc-embed"]').count(),
      0,
      "Duplicate Custom RPC Embed entry must NOT exist in Elements panel"
    );
    await premPage.getByTestId("library-add-custom-rpc").click();
    await premPage.waitForTimeout(150);
    await premPage.getByTestId("elements-panel-close").click();
    await premPage.waitForSelector('[data-testid="dock-more-toggle"]', { timeout: 3000 });
    await premPage.getByTestId("dock-more-toggle").click();

    // Default starter profile already has node-rpc-1 inside embed-profile-root; clicking Custom RPC adds a 2nd unified custom-rpc!
    const allCustomRpcs = premPage.locator('[data-node-type="custom-rpc"]');
    const rpcCount = await allCustomRpcs.count();
    assert(rpcCount >= 2, `Expected newly inserted Custom RPC plus default node-rpc-1, got ${rpcCount}`);
    const rpcEmbedNode = allCustomRpcs.last();
    const rpcEmbedId = await rpcEmbedNode.getAttribute("data-testid");
    const embedRawId = rpcEmbedId.replace("canvas-node-", "");
    assert.strictEqual(
      await rpcEmbedNode.getAttribute("data-parent-id"),
      "embed-profile-root",
      "Unified Custom RPC inserted with embed active must nest cleanly inside Profile Parent Embed (Level 1 -> Level 2)"
    );

    // Verify structured child nodes exist inside unified Custom RPC (node-rpc -> rpc-*)
    for (const childType of ["rpc-status", "rpc-icon", "rpc-title", "rpc-details", "rpc-state", "rpc-timestamp", "rpc-achievement", "rpc-buttons"]) {
      const cnt = await premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="${childType}"]`).count();
      assert.strictEqual(cnt, 1, `Expected 1 ${childType} child inside unified custom-rpc`);
    }

    // Open Properties Panel -> Select Parent Embed edge (not center child) & test Stretching + Bug A/C/D checks!
    await rpcEmbedNode.click({ position: { x: 6, y: 6 }, force: true });
    await premPage.getByTestId("secondary-dock-btn-properties").click();
    await premPage.waitForSelector('[data-testid="container-bg-mode-video"]', { timeout: 5000 });

    const iconChild = premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="rpc-icon"]`).first();
    const iconInitW = await iconChild.evaluate((el) => parseInt(el.style.width, 10));
    const iconInitH = await iconChild.evaluate((el) => parseInt(el.style.height, 10));

    // Stretch parent container wider & taller -> fixed main icon stays fixed-size (Bug A!), anchored title expands (Bug C!), scroll stays 0 (Bug D!)
    await premPage.getByTestId("prop-width-input").fill("520");
    await premPage.getByTestId("prop-height-input").fill("220");
    await premPage.waitForTimeout(120);

    const iconAfterStretchW = await iconChild.evaluate((el) => parseInt(el.style.width, 10));
    const iconAfterStretchH = await iconChild.evaluate((el) => parseInt(el.style.height, 10));
    assert.strictEqual(iconAfterStretchW, iconInitW, `Bug A regression: fixed main icon width must stay ${iconInitW}, got ${iconAfterStretchW}`);
    assert.strictEqual(iconAfterStretchH, iconInitH, `Bug A regression: fixed main icon height must stay ${iconInitH}, got ${iconAfterStretchH}`);

    const containerScroll = await premPage.locator(`[data-testid="builder-container-${embedRawId}"]`).evaluate((el) => ({
      top: el.scrollTop,
      left: el.scrollLeft,
    }));
    assert.strictEqual(containerScroll.top, 0, "Inner container scrollTop must stay 0");
    assert.strictEqual(containerScroll.left, 0, "Inner container scrollLeft must stay 0");

    // Set final dimensions 460x204 for persistence verification
    await premPage.getByTestId("prop-y-input").fill("40");
    await premPage.getByTestId("prop-width-input").fill("460");
    await premPage.getByTestId("prop-height-input").fill("204");
    await premPage.waitForTimeout(100);

    // Test Bug B: Small image & icon proportional scaling + Zoom resize accuracy
    await iconChild.click({ force: true });
    await premPage.waitForSelector('[data-testid="prop-width-input"]', { timeout: 3000 });
    await premPage.getByTestId("prop-width-input").fill("120");
    await premPage.waitForTimeout(100);
    assert.strictEqual(
      await iconChild.evaluate((el) => parseInt(el.style.width, 10)),
      120,
      "Main icon should resize when directly edited"
    );
    await premPage.getByTestId("prop-width-input").fill("72");
    await premPage.waitForTimeout(80);

    // Zoom in and test free horizontal corner drag on Custom RPC parent (without forced aspect ratio lock)
    await premPage.getByTestId("unified-panel-close").click();
    await premPage.getByTestId("secondary-unified-panel").waitFor({ state: "detached", timeout: 3000 });
    await premPage.getByTestId("zoom-in-btn").click();
    await rpcEmbedNode.click({ position: { x: 6, y: 6 }, force: true });
    await premPage.waitForSelector('[data-testid="builder-container-outline"]', { timeout: 3000 });
    await premPage.waitForSelector('[data-testid="builder-handle-se"]', { timeout: 3000 });
    await premPage.getByTestId("builder-handle-se").scrollIntoViewIfNeeded();
    const seHandle = await premPage.getByTestId("builder-handle-se").boundingBox();
    const preZoomW = await rpcEmbedNode.evaluate((el) => parseInt(el.style.width, 10));
    await premPage.mouse.move(seHandle.x + seHandle.width / 2, seHandle.y + seHandle.height / 2);
    await premPage.mouse.down();
    await premPage.mouse.move(seHandle.x + seHandle.width / 2 + 40, seHandle.y + seHandle.height / 2, { steps: 5 });
    await premPage.mouse.up();
    await premPage.waitForTimeout(100);
    const postZoomW = await rpcEmbedNode.evaluate((el) => parseInt(el.style.width, 10));
    assert(postZoomW > preZoomW, `Horizontal corner drag at zoomed scale must stretch width (${postZoomW} > ${preZoomW})`);
    await premPage.getByTestId("zoom-fit-btn").click();
    await premPage.getByTestId("secondary-dock-btn-properties").click();

    // Restore 460x204 exact target dimensions for persistence check
    await premPage.waitForSelector('[data-testid="prop-width-input"]', { timeout: 3000 });
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
      "Container <video> layer must render inside unified Custom RPC"
    );

    // Test B: Select a child element (rpc-title), move/resize it, verify clamping & outer parent clamping
    const titleChild = premPage.locator(`[data-parent-id="${embedRawId}"][data-node-type="rpc-title"]`).first();
    const origChildTestId = await titleChild.getAttribute("data-testid");
    await titleChild.click({ force: true });
    await premPage.waitForSelector('[data-testid="prop-x-input"]', { timeout: 4000 });
    await premPage.getByTestId("prop-x-input").fill("9999");
    await premPage.getByTestId("prop-x-input").press("Enter");
    const clampedChildX = Number(await premPage.getByTestId("prop-x-input").inputValue());
    assert(clampedChildX < 460 && clampedChildX > 0, `Child X (${clampedChildX}) must clamp strictly inside Custom RPC (460px)`);
    await premPage.getByTestId("prop-width-input").fill("290");
    await premPage.getByTestId("prop-x-input").fill("140");
    await premPage.getByTestId("prop-y-input").fill("52");
    await premPage.waitForTimeout(100);

    // Verify Test B: Duplicate child inside unified Custom RPC and delete duplicate
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

    // Also test canvas drag-into-embed: add an independent root Custom RPC from Modal and drag it into Profile Parent Embed!
    if (await premPage.getByTestId("unified-panel-close").isVisible()) {
      await premPage.getByTestId("unified-panel-close").click();
      await premPage.getByTestId("secondary-unified-panel").waitFor({ state: "detached", timeout: 3000 });
    }
    await premPage.getByTestId("secondary-dock-btn-add-elements").click();
    await premPage.waitForSelector('[data-testid="modal-add-custom-rpc"]', { timeout: 4000 });
    assert.strictEqual(
      await premPage.locator('[data-testid="modal-add-custom-rpc-embed"]').count(),
      0,
      "Duplicate Custom RPC Embed must NOT exist in Add Elements modal"
    );
    await premPage.getByTestId("modal-add-custom-rpc").click();
    await premPage.waitForTimeout(150);
    const rootRpcCandidate = premPage.locator('[data-node-type="custom-rpc"][data-parent-id=""]').first();
    assert.strictEqual(await rootRpcCandidate.count(), 1, "Independent Add Elements modal must place Custom RPC at root");
    const rootRpcRawId = (await rootRpcCandidate.getAttribute("data-testid")).replace("canvas-node-", "");
    const rootRpcBox = await rootRpcCandidate.boundingBox();
    const outerEmbedBox = await premPage.getByTestId("canvas-node-embed-profile-root").boundingBox();
    await rootRpcCandidate.click({ position: { x: 8, y: 8 } });
    await premPage.mouse.move(rootRpcBox.x + 8, rootRpcBox.y + 8);
    await premPage.mouse.down();
    const dropScreenX = outerEmbedBox.x + outerEmbedBox.width * 0.5 - rootRpcBox.width / 2 + 8;
    const dropScreenY = outerEmbedBox.y + outerEmbedBox.height * 0.5 - rootRpcBox.height / 2 + 8;
    await premPage.mouse.move(dropScreenX, dropScreenY, { steps: 8 });
    await premPage.mouse.up();
    await premPage.waitForTimeout(200);
    assert.strictEqual(
      await premPage.locator(`[data-testid="canvas-node-${rootRpcRawId}"]`).getAttribute("data-parent-id"),
      "embed-profile-root",
      "Dragging root Custom RPC into Profile Parent Embed must nest it inside embed-profile-root"
    );
    // Clean up extra nested test node so live public test targets cleanly one card
    await premPage.locator(`[data-testid="canvas-node-${rootRpcRawId}"]`).click({ position: { x: 6, y: 6 }, force: true });
    await premPage.getByTestId("ft-delete").click();
    await premPage.waitForTimeout(120);

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
    assert.strictEqual(reloadedChildX, "140px", `Expected persisted child left 140px, got ${reloadedChildX}`);

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
    const valTitle = await pubPage.getByTestId("rpc-child-rpc-title").last().innerText();
    const valDetails = await pubPage.getByTestId("rpc-child-rpc-details").last().innerText();
    const valState = await pubPage.getByTestId("rpc-child-rpc-state").last().innerText();
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

    const mcPublicTitle = await pubPage.getByTestId("rpc-child-rpc-title").last().innerText();
    const mcStudioTitle = await premPage.getByTestId("rpc-child-rpc-title").last().innerText();
    assert.ok(mcPublicTitle.includes("Minecraft"), `Public profile must switch to Minecraft, got "${mcPublicTitle}"`);
    assert.ok(mcStudioTitle.includes("Minecraft"), `Studio canvas must switch to Minecraft, got "${mcStudioTitle}"`);

    // Verify Studio layout & video background remained untouched across activity switch
    assert.strictEqual(
      await premPage.locator(`[data-testid="canvas-node-${embedRawId}"]`).evaluate((el) => el.style.width),
      "460px"
    );
    assert.strictEqual(
      await premPage.locator(`[data-testid="${origChildTestId}"]`).evaluate((el) => el.style.left),
      "140px"
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
    const offlineTitle = await pubPage.getByTestId("rpc-child-rpc-title").last().innerText();
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

    // Free user CAN add default unified Custom RPC
    await freePage.getByTestId("dock-more-toggle").click();
    await freePage.getByTestId("dock-open-elements-panel").click();
    await freePage.getByTestId("library-add-custom-rpc").click();
    await freePage.waitForTimeout(150);
    await freePage.getByTestId("elements-panel-close").click();
    await freePage.waitForSelector('[data-testid="dock-more-toggle"]', { timeout: 3000 });
    await freePage.getByTestId("dock-more-toggle").click();

    const freeRpcEmbed = freePage.locator('[data-node-type="custom-rpc"]').last();
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

    // =========================================================================
    // LEGACY MIGRATION (custom-rpc-embed + childless custom-rpc)
    // =========================================================================
    console.log("[5/5] Verifying idempotent legacy Custom RPC migration (custom-rpc-embed & childless custom-rpc)...");
    const legacyParentId = `legacy-parent-${suffix}`;
    const legacyEmbedId = `legacy-rpc-embed-${suffix}`;
    const legacyTitleId = `legacy-rpc-title-${suffix}`;
    const legacyLeafId = `legacy-rpc-leaf-${suffix}`;
    const legacyDoc = {
      version: "2.0",
      canvas: { width: 1920, height: 1080, backgroundColor: "#0a0a10", gridSize: 8 },
      preferences: {
        snapEnabled: true,
        snapToGrid: true,
        snapToElements: true,
        smartGuides: true,
        showGrid: false,
        showComponentOutlines: true,
        defaultInsertTarget: "embed",
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        defaultElementsInitialized: true,
      },
      rootIds: [legacyParentId],
      nodes: [
        {
          id: legacyParentId,
          type: "embed",
          name: "Profile Card",
          x: 0,
          y: 0,
          width: 420,
          height: 680,
          zIndex: 1,
          parentId: null,
          childIds: [legacyEmbedId, legacyLeafId],
          layoutMode: "absolute",
          visible: true,
          locked: false,
          style: { backgroundColor: "#0d0f18", borderRadius: 20 },
          config: {},
        },
        {
          id: legacyEmbedId,
          type: "custom-rpc-embed",
          name: "Legacy Custom RPC Embed",
          x: 16,
          y: 20,
          width: 380,
          height: 168,
          zIndex: 2,
          parentId: legacyParentId,
          childIds: [legacyTitleId],
          layoutMode: "absolute",
          visible: true,
          locked: false,
          style: { backgroundType: "solid", backgroundColor: "#141622", borderRadius: 16 },
          config: { rpcTemplateId: "rpc-tpl-valorant" },
        },
        {
          id: legacyTitleId,
          type: "rpc-title",
          name: "Legacy Activity Title",
          x: 112,
          y: 44,
          width: 240,
          height: 24,
          zIndex: 3,
          parentId: legacyEmbedId,
          childIds: [],
          layoutMode: "absolute",
          visible: true,
          locked: false,
          style: { textColor: "#ffffff", fontSize: 16, fontWeight: "700" },
          config: { rpcFieldBinding: "title" },
        },
        {
          id: legacyLeafId,
          type: "custom-rpc",
          name: "Legacy Leaf RPC",
          x: 16,
          y: 220,
          width: 320,
          height: 92,
          zIndex: 4,
          parentId: legacyParentId,
          childIds: [],
          layoutMode: "absolute",
          visible: true,
          locked: false,
          style: { backgroundColor: "#141824", borderRadius: 14 },
          config: { text: "Legacy Status" },
        },
      ],
    };
    const premCfgNow = await apiJson(tokenPremium, "/api/profile/me", "GET");
    const migPatch = await apiJson(tokenPremium, "/api/profile/me", "PATCH", {
      designConfig: { ...(premCfgNow.data?.designConfig || {}), draftProfileBuilder: legacyDoc },
    });
    assert.strictEqual(migPatch.status, 200, `Legacy migration doc save failed: ${migPatch.status}`);

    const migCtx = await createAuthedContext(browser, tokenPremium);
    const migPage = await migCtx.newPage();
    await migPage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await migPage.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

    assert.strictEqual(
      await migPage.locator('[data-node-type="custom-rpc-embed"]').count(),
      0,
      "Legacy custom-rpc-embed nodes must migrate cleanly into unified custom-rpc"
    );
    const migratedEmbed = migPage.locator(`[data-testid="canvas-node-${legacyEmbedId}"]`);
    const migratedLeaf = migPage.locator(`[data-testid="canvas-node-${legacyLeafId}"]`);
    assert.strictEqual(await migratedEmbed.getAttribute("data-node-type"), "custom-rpc");
    assert.strictEqual(await migratedLeaf.getAttribute("data-node-type"), "custom-rpc");
    assert.strictEqual(await migratedLeaf.evaluate((el) => el.style.top), "220px");
    assert.ok(
      (await migratedLeaf.locator('[data-node-type^="rpc-"]').count()) > 0,
      "Legacy childless custom-rpc must auto-populate modular rpc-* child nodes on migration"
    );
    await migCtx.close();

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
        try { proc.kill(); } catch { }
      }
    };
    if (browser) await browser.close().catch(() => { });
    killTree(apiProc);
    killTree(webProc);
    for (const tid of createdTemplateIds) {
      await prisma.activityTemplate.deleteMany({ where: { id: tid } }).catch(() => { });
    }
    await prisma.activityTemplate.deleteMany({ where: { userId: { in: [userFree.id, userPremium.id, userAdmin.id] } } }).catch(() => { });
    await prisma.user.deleteMany({ where: { id: { in: [userFree.id, userPremium.id, userAdmin.id] } } }).catch(() => { });
    await prisma.$disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Custom RPC Embed E2E FAILED:", err);
    process.exit(1);
  });
