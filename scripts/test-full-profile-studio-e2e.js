/**
 * PIXEL.GG STUDIO — FULL PROFILE PREVIEW, PERSISTENCE, IDENTITY SYNC, HISTORY (7-DAY), RESET & SECURITY E2E SUITE
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
const { cleanupExpiredHistory } = require("../apps/api/dist/services/profileHistoryService");

const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const API_DIR = path.join(ROOT_DIR, "apps/api");
const API_PORT = 3115;
const WEB_PORT = 3114;
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
      // Ignore aborted routes during navigation/close
    }
  });
}

async function run() {
  const suffix = Date.now().toString(36);
  const usernameA = `studio_a_${suffix}`;
  const displayNameA = `Ashish Real ${suffix}`;
  const avatarUrlA = "https://cdn.discordapp.com/embed/avatars/2.png";
  const tokenA = crypto.randomBytes(32).toString("hex");

  const usernameB = `studio_b_${suffix}`;
  const tokenB = crypto.randomBytes(32).toString("hex");

  const userA = await prisma.user.create({
    data: {
      username: usernameA,
      globalName: displayNameA,
      discordId: `888${Date.now()}`,
      avatar: avatarUrlA,
      role: "USER",
      appToken: tokenA,
      profile: {
        create: {
          displayName: displayNameA,
          bio: `Bio for ${usernameA}`,
          avatarUrl: avatarUrlA,
          visibility: "PUBLIC",
          // Intentionally NO profileBuilder JSON yet to test Test A (first-time real identity hydration!)
          designConfig: JSON.stringify({ isPublished: false }),
        },
      },
    },
    include: { profile: true },
  });

  const userB = await prisma.user.create({
    data: {
      username: usernameB,
      globalName: `Other User ${suffix}`,
      discordId: `777${Date.now()}`,
      avatar: "https://cdn.discordapp.com/embed/avatars/3.png",
      role: "USER",
      appToken: tokenB,
      profile: {
        create: {
          displayName: `Other User ${suffix}`,
          visibility: "PRIVATE",
        },
      },
    },
    include: { profile: true },
  });

  // Create an uploaded asset owned by User A that will be referenced in Profile/History
  const assetUrlA = `/uploads/protected-${suffix}.png`;
  const assetA = await prisma.uploadedAsset.create({
    data: {
      userId: userA.id,
      originalUrl: assetUrlA,
      processedUrl: assetUrlA,
      fileName: `protected-${suffix}.png`,
      fileSize: 1024,
      mimeType: "image/png",
      targetSlot: "studio_asset",
    },
  });

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
    // TEST A & C & E & G: Authentic Identity, Live Preview, Strict History, Reset
    // =========================================================================
    console.log("[1/5] Test A: Verifying authenticated real identity hydration (no PIXEL USER)...");
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachApiProxy(contextA);
    await contextA.addCookies([
      {
        name: "pixel_app_token",
        value: tokenA,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
    await contextA.addInitScript((tok) => {
      localStorage.setItem("pixel_app_token", tok);
    }, tokenA);

    const page = await contextA.newPage();
    await page.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="canvas-node-node-name-1"]', { timeout: 15000 });

    const initialNameText = await page.getByTestId("canvas-node-node-name-1").innerText();
    const initialSubText = await page.getByTestId("canvas-node-node-subtitle-1").innerText();
    assert.ok(
      initialNameText.includes(displayNameA),
      `Expected real displayName "${displayNameA}", got "${initialNameText}"`
    );
    assert.ok(!initialNameText.includes("PIXEL USER"), "Must NEVER display generic PIXEL USER");
    assert.ok(
      initialSubText.includes(`@${usernameA}`),
      `Expected real handle "@${usernameA}", got "${initialSubText}"`
    );
    assert.ok(!initialSubText.includes("@pixeluser"), "Must NEVER display generic @pixeluser");
    console.log("   ✓ Test A passed");

    // =========================================================================
    // TEST B & C & E: Edit + Unsaved Preview (Desktop/Tablet/Mobile) + Save Draft History Rule
    // =========================================================================
    console.log("[2/5] Test B, C & E: Preview fidelity, breakpoints, Save Draft vs Autosave history...");
    await page.getByTestId("secondary-dock-btn-properties").click();
    await page.waitForSelector('[data-testid="secondary-unified-panel"]', { timeout: 5000 });

    // Change Name Text WITHOUT saving yet
    const v1Name = `Draft One ${suffix}`;
    await page.getByTestId("canvas-node-node-name-1").click();
    await page.getByTestId("prop-text-content").fill(v1Name);

    // Confirm no history snapshots exist yet from editing!
    let countBeforeSave = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(countBeforeSave, 0, "Normal editing must NOT create history snapshots");

    // Verify top-right View Public Page button is visible in toolbar (without creating any history snapshot)
    assert.strictEqual(await page.getByTestId("builder-view-public-btn").isVisible(), true);

    // Wait for debounced Autosave to complete -> must persist draft, but create ZERO history snapshots!
    await page.waitForTimeout(3500);
    const countAfterAutosave = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(countAfterAutosave, 0, "Autosave must NOT create history snapshots");

    // Explicitly click Save Draft -> must create EXACTLY 1 history snapshot in DB!
    const [saveResp1] = await Promise.all([
      page.waitForResponse((r) => {
        if (!r.url().includes("/api/profile/me") || r.request().method() !== "PATCH") return false;
        try {
          return r.request().postDataJSON()?.saveMode === "manual_save_draft";
        } catch {
          return false;
        }
      }),
      page.getByTestId("builder-save-draft-btn").click(),
    ]);
    assert.strictEqual(saveResp1.status(), 200);
    const saveJson1 = await saveResp1.json().catch(() => ({}));
    const countAfterSave1 = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(
      countAfterSave1,
      1,
      `Explicit Save Draft must create exactly 1 history snapshot (saveMode=${saveResp1.request().postDataJSON()?.saveMode}, resHistoryId=${saveJson1.historySnapshotId})`
    );

    // Edit to V2 & Save Draft (without triggering premature 409 from out-of-band Node requests)
    const v2Name = `Draft Two ${suffix}`;
    await page.getByTestId("canvas-node-node-name-1").click();
    await page.getByTestId("prop-text-content").fill(v2Name);
    await page.waitForTimeout(250);
    const [saveResp2] = await Promise.all([
      page.waitForResponse((r) => {
        if (!r.url().includes("/api/profile/me") || r.request().method() !== "PATCH") return false;
        try {
          return r.request().postDataJSON()?.saveMode === "manual_save_draft";
        } catch {
          return false;
        }
      }),
      page.getByTestId("builder-save-draft-btn").click(),
    ]);
    assert.strictEqual(saveResp2.status(), 200);

    // Open Settings -> Profile History tab -> Preview older V1 & Restore V1 without creating a new snapshot!
    const totalBeforeRestore = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    await page.getByTestId("builder-settings-btn").click();
    await page.getByTestId("settings-tab-history").click();
    await page.waitForSelector('[data-testid="settings-history-panel"]', { timeout: 5000 });

    const snapshots = await prisma.profileHistorySnapshot.findMany({
      where: { userId: userA.id },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(snapshots.length >= 2);
    const oldestV1Snap = snapshots[snapshots.length - 1];

    // Preview oldest V1 in Desktop + Mobile responsive frames
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/profile/me/history/${oldestV1Snap.id}`) && r.status() === 200),
      page.getByTestId(`history-preview-${oldestV1Snap.id}`).click(),
    ]);
    await page.waitForSelector('[data-testid="builder-preview-modal"]', { timeout: 5000 });
    const histPreviewText = await page.getByTestId("preview-viewport-frame").innerText();
    assert.ok(histPreviewText.includes(v1Name), "Historical preview must render V1 snapshot content");
    await page.getByTestId("preview-device-mobile").click();
    await page.waitForTimeout(150);
    const histMobileCanvas = await page
      .locator('[data-testid="builder-preview-modal"] [data-testid="public-profile-canvas-frame"]')
      .boundingBox();
    const histMobileEmbed = await page
      .locator('[data-testid="builder-preview-modal"] [data-testid="public-node-embed-profile-root"]')
      .boundingBox();
    assert.ok(
      histMobileCanvas &&
        histMobileCanvas.width <= 390 &&
        Math.abs(histMobileCanvas.width / histMobileCanvas.height - 1920 / 1080) < 0.05,
      `Mobile preview full canvas must scale uniformly inside 390px preserving 16:9! Got: ${JSON.stringify(histMobileCanvas)}`
    );
    assert.ok(
      histMobileEmbed && histMobileEmbed.width <= 390 && histMobileEmbed.height > 80,
      `Mobile preview embed must remain proportionally visible inside canvas: ${JSON.stringify(histMobileEmbed)}`
    );
    await page.getByTestId("preview-device-desktop").click();
    await page.getByTestId("preview-modal-close").click();

    // Restore oldest V1 -> confirmation -> updates editor WITHOUT deleting newer snapshots or adding a snapshot
    await page.getByTestId(`history-restore-${oldestV1Snap.id}`).click();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/profile/me/history/${oldestV1Snap.id}`) && r.status() === 200),
      page.getByTestId(`history-confirm-restore-${oldestV1Snap.id}`).click(),
    ]);
    await page.waitForSelector('[data-testid="builder-settings-modal"]', { state: "detached", timeout: 5000 });
    const restoredNameText = await page.getByTestId("canvas-node-node-name-1").innerText();
    assert.ok(
      restoredNameText.includes(v1Name),
      `Editor must show restored V1 name "${v1Name}", got "${restoredNameText}"`
    );
    const totalAfterRestore = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(totalAfterRestore, totalBeforeRestore, "Restore must NOT create a history snapshot until Save Draft");

    // Brand new browser context (empty localStorage) proves pure DB persistence!
    const [saveAfterRestoreResp] = await Promise.all([
      page.waitForResponse((r) => {
        if (!r.url().includes("/api/profile/me") || r.request().method() !== "PATCH") return false;
        try {
          return r.request().postDataJSON()?.saveMode === "manual_save_draft";
        } catch {
          return false;
        }
      }),
      page.getByTestId("builder-save-draft-btn").click(),
    ]);
    assert.strictEqual(saveAfterRestoreResp.status(), 200, "Save Draft after restore must return 200");
    const freshContextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await attachApiProxy(freshContextA);
    await freshContextA.addCookies([
      {
        name: "pixel_app_token",
        value: tokenA,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
    await freshContextA.addInitScript((tok) => {
      localStorage.setItem("pixel_app_token", tok);
    }, tokenA);
    const freshPage = await freshContextA.newPage();
    await freshPage.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await freshPage.waitForSelector('[data-testid="canvas-node-node-name-1"]', { timeout: 15000 });
    const dbReloadedName = await freshPage.getByTestId("canvas-node-node-name-1").innerText();
    assert.ok(
      dbReloadedName.includes(v1Name),
      `Fresh browser context must restore full composition from PostgreSQL (expected "${v1Name}", got "${dbReloadedName}")`
    );
    await freshContextA.close();
    console.log("   ✓ Tests B, C & E passed");

    // =========================================================================
    // TEST D: Publish Public Profile & Visual Height / Auto-Sync Verification
    // =========================================================================
    console.log("[3/5] Test D: Verifying public profile rendering & auto-update after Publish...");
    const snapshotsBeforePublish = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    const [pubResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/profile/me") && r.request().method() === "PATCH"),
      page.getByTestId("builder-publish-btn").click(),
    ]);
    assert.strictEqual(pubResp.status(), 200);
    const snapshotsAfterPublish = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(snapshotsAfterPublish, snapshotsBeforePublish, "Publish must NOT create a history snapshot");

    // Anonymous visitor views public profile (Desktop 1280x900)
    const anonContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`${WEB_URL}/${usernameA}`, { waitUntil: "networkidle" });
    await anonPage.waitForSelector('[data-testid="public-profile-canvas-frame"]', { timeout: 15000 });
    const canvasFrameBox = await anonPage.getByTestId("public-profile-canvas-frame").boundingBox();
    assert.ok(
      canvasFrameBox &&
        Math.abs(canvasFrameBox.width - 1280) < 4 &&
        Math.abs(canvasFrameBox.height - 720) < 4,
      `Desktop 1280x900 must fit 1920x1080 canvas uniformly to 1280x720! Got: ${JSON.stringify(canvasFrameBox)}`
    );

    const pubBox = await anonPage.getByTestId("public-node-embed-profile-root").boundingBox();
    assert.ok(
      pubBox &&
        pubBox.width > 400 &&
        pubBox.height > 340 &&
        Math.abs(pubBox.width / pubBox.height - 720 / 610) < 0.05,
      `Public embed must match 720:610 aspect inside scaled canvas! Got: ${JSON.stringify(pubBox)}`
    );

    // Heart & CLAIM YOUR OWN PROFILE controls must sit INSIDE the scaled canvas frame (not outside footer!)
    const likeBtnBox = await anonPage.getByTestId("public-profile-like-btn").boundingBox();
    const claimLinkBox = await anonPage.getByTestId("public-profile-claim-link").boundingBox();
    assert.ok(
      likeBtnBox &&
        likeBtnBox.x >= canvasFrameBox.x - 1 &&
        likeBtnBox.y >= canvasFrameBox.y - 1 &&
        likeBtnBox.x + likeBtnBox.width <= canvasFrameBox.x + canvasFrameBox.width + 1 &&
        likeBtnBox.y + likeBtnBox.height <= canvasFrameBox.y + canvasFrameBox.height + 1,
      `Heart button must lie inside canvas frame: like=${JSON.stringify(likeBtnBox)}, canvas=${JSON.stringify(canvasFrameBox)}`
    );
    assert.ok(
      claimLinkBox &&
        claimLinkBox.x >= canvasFrameBox.x - 1 &&
        claimLinkBox.y >= canvasFrameBox.y - 1 &&
        claimLinkBox.x + claimLinkBox.width <= canvasFrameBox.x + canvasFrameBox.width + 1 &&
        claimLinkBox.y + claimLinkBox.height <= canvasFrameBox.y + canvasFrameBox.height + 1,
      `Claim link must lie inside canvas frame: claim=${JSON.stringify(claimLinkBox)}, canvas=${JSON.stringify(canvasFrameBox)}`
    );

    // Check Tablet (768x1024) & Mobile (390x844) full-canvas fit with zero horizontal overflow
    for (const vp of [
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      await anonPage.setViewportSize({ width: vp.width, height: vp.height });
      await anonPage.waitForTimeout(150);
      const vpFrame = await anonPage.getByTestId("public-profile-canvas-frame").boundingBox();
      const scrollCheck = await anonPage.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      }));
      assert.ok(
        vpFrame &&
          vpFrame.width <= vp.width + 1 &&
          vpFrame.height <= vp.height + 1 &&
          Math.abs(vpFrame.width / vpFrame.height - 1920 / 1080) < 0.05,
        `${vp.name} viewport must uniformly scale full 1920x1080 canvas: ${JSON.stringify(vpFrame)}`
      );
      assert.ok(
        scrollCheck.scrollW <= scrollCheck.innerW,
        `${vp.name} viewport must have zero horizontal overflow: ${JSON.stringify(scrollCheck)}`
      );
    }
    await anonPage.setViewportSize({ width: 1280, height: 900 });
    await anonPage.waitForTimeout(100);

    const pubText = await anonPage.getByTestId("public-profile-composition").innerText();
    assert.ok(pubText.includes(v1Name), "Public page must render published composition text");

    // Subsequent Save Draft updates already-published public page automatically WITHOUT clicking Publish!
    const v3Name = `Live AutoSync ${suffix}`;
    await page.getByTestId("canvas-node-node-name-1").click();
    await page.getByTestId("prop-text-content").fill(v3Name);
    await page.waitForTimeout(150);
    const [saveAfterPubResp] = await Promise.all([
      page.waitForResponse((r) => {
        if (!r.url().includes("/api/profile/me") || r.request().method() !== "PATCH") return false;
        try {
          return r.request().postDataJSON()?.saveMode === "manual_save_draft";
        } catch {
          return false;
        }
      }),
      page.getByTestId("builder-save-draft-btn").click(),
    ]);
    assert.strictEqual(saveAfterPubResp.status(), 200);
    await anonPage.reload({ waitUntil: "networkidle" });
    const pubTextAfterSave = await anonPage.getByTestId("public-profile-composition").innerText();
    assert.ok(
      pubTextAfterSave.includes(v3Name),
      `Public profile must immediately update on Save Draft after publish (expected "${v3Name}", got "${pubTextAfterSave}")`
    );
    await anonContext.close();
    console.log("   ✓ Test D passed");

    // Clicking View Public Page redirects directly to the user's live public profile page!
    await page.getByTestId("builder-view-public-btn").click();
    await page.waitForURL(new RegExp(`/${usernameA}$`), { timeout: 15000 });
    await page.waitForSelector('[data-testid="public-profile-composition"]', { timeout: 15000 });
    await page.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="canvas-node-node-name-1"]', { timeout: 15000 });

    // =========================================================================
    // TEST CORNER & EDGE RESIZING ON PARENT CONTAINER (ALL 4 CORNERS + EDGE)
    // =========================================================================
    console.log("[3b/5] Testing proportional corner resizing (nw, ne, se, sw) & non-scaling edge resize...");
    const rootEmbed = page.getByTestId("canvas-node-embed-profile-root");
    const nameChild = page.getByTestId("canvas-node-node-name-1");
    await rootEmbed.click({ position: { x: 10, y: 10 } });

    const verifyCornerResize = async (handleId, dx, dy, anchorCheck) => {
      const pBefore = await rootEmbed.boundingBox();
      const cBefore = await nameChild.boundingBox();
      const handleBox = await page.getByTestId(`builder-handle-${handleId}`).boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2 + dx, handleBox.y + handleBox.height / 2 + dy, {
        steps: 6,
      });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const pAfter = await rootEmbed.boundingBox();
      const cAfter = await nameChild.boundingBox();
      assert.ok(
        Math.abs(pAfter.width / pAfter.height - pBefore.width / pBefore.height) < 0.04,
        `Handle ${handleId} must preserve parent aspect ratio`
      );
      const parentScale = pAfter.width / pBefore.width;
      const childWidthScale = cAfter.width / cBefore.width;
      assert.ok(
        Math.abs(childWidthScale - parentScale) < 0.08,
        `Handle ${handleId} must scale children proportionally (parentScale=${parentScale.toFixed(3)}, childScale=${childWidthScale.toFixed(3)})`
      );
      anchorCheck(pBefore, pAfter);
      // Undo back to clean state before next corner check
      await page.getByTestId("builder-undo-btn").click();
      await page.waitForTimeout(100);
    };

    await verifyCornerResize("se", 60, 50, (b, a) => {
      assert.ok(Math.abs(a.x - b.x) < 3 && Math.abs(a.y - b.y) < 3, "SE drag anchors top-left corner");
      assert.ok(a.width > b.width + 20, "SE expands towards pointer");
    });
    await verifyCornerResize("nw", -50, -40, (b, a) => {
      assert.ok(
        Math.abs(a.x + a.width - (b.x + b.width)) < 4 &&
          Math.abs(a.y + a.height - (b.y + b.height)) < 4,
        "NW drag anchors bottom-right corner"
      );
    });
    await verifyCornerResize("ne", 50, -40, (b, a) => {
      assert.ok(
        Math.abs(a.x - b.x) < 4 && Math.abs(a.y + a.height - (b.y + b.height)) < 4,
        "NE drag anchors bottom-left corner"
      );
    });
    await verifyCornerResize("sw", -50, 40, (b, a) => {
      assert.ok(
        Math.abs(a.x + a.width - (b.x + b.width)) < 4 && Math.abs(a.y - b.y) < 4,
        "SW drag anchors top-right corner"
      );
    });

    // Edge handle (e) should NOT proportionally scale child dimensions!
    const edgePreParent = await rootEmbed.boundingBox();
    const edgePreChild = await nameChild.boundingBox();
    const eHandle = await page.getByTestId("builder-handle-e").boundingBox();
    await page.mouse.move(eHandle.x + eHandle.width / 2, eHandle.y + eHandle.height / 2);
    await page.mouse.down();
    await page.mouse.move(eHandle.x + eHandle.width / 2 + 50, eHandle.y + eHandle.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const edgePostParent = await rootEmbed.boundingBox();
    const edgePostChild = await nameChild.boundingBox();
    assert.ok(edgePostParent.width > edgePreParent.width + 20, "East edge handle widens parent");
    assert.ok(Math.abs(edgePostParent.height - edgePreParent.height) < 3, "East edge handle keeps height fixed");
    assert.ok(Math.abs(edgePostChild.width - edgePreChild.width) < 3, "Edge handle must NOT scale children");
    await page.getByTestId("builder-undo-btn").click();
    await page.waitForTimeout(100);
    console.log("   ✓ All 4 proportional corners & non-scaling edge resize passed");

    // =========================================================================
    // TEST G: Reset to Default (Cancel, Confirm, Preserve Real Identity, Undo/Redo)
    // =========================================================================
    console.log("[4/5] Test G: Verifying Reset to Default, Cancel, Undo/Redo & Real Identity...");
    const snapshotsBeforeReset = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    await page.getByTestId("builder-reset-btn").click();
    await page.waitForSelector('[data-testid="builder-reset-modal"]', { timeout: 3000 });
    await page.getByTestId("reset-cancel-btn").click();
    assert.ok((await page.getByTestId("canvas-node-node-name-1").innerText()).includes(v3Name), "Cancel reset must keep current edits");

    await page.getByTestId("builder-reset-btn").click();
    await page.getByTestId("reset-confirm-btn").click();
    await page.waitForTimeout(200);
    const resetName = await page.getByTestId("canvas-node-node-name-1").innerText();
    assert.ok(resetName.includes(displayNameA), `Reset must preserve authenticated name (${displayNameA}), got ${resetName}`);
    assert.ok(!resetName.includes("PIXEL USER"), "Reset must NEVER revert to generic PIXEL USER");

    // Undo restores v3Name, Redo returns to resetName, zero history created before Save Draft
    await page.getByTestId("builder-undo-btn").click();
    await page.waitForTimeout(150);
    assert.ok((await page.getByTestId("canvas-node-node-name-1").innerText()).includes(v3Name), "Undo must restore pre-reset composition");
    await page.getByTestId("builder-redo-btn").click();
    await page.waitForTimeout(150);
    assert.ok((await page.getByTestId("canvas-node-node-name-1").innerText()).includes(displayNameA), "Redo must re-apply reset");
    const snapshotsAfterReset = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(snapshotsAfterReset, snapshotsBeforeReset, "Reset/Undo/Redo must NOT create history before Save Draft");
    await contextA.close();
    console.log("   ✓ Test G passed");

    // =========================================================================
    // TEST F & H: 7-Day History Retention, Asset Protection & Security IDOR Checks
    // =========================================================================
    console.log("[5/5] Tests F & H: Verifying 7-day retention cleanup, asset protection & IDOR security...");
    const now = Date.now();
    const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

    const sixDaySnap = await prisma.profileHistorySnapshot.create({
      data: {
        userId: userA.id,
        profileId: userA.profile.id,
        profileVersion: 90,
        schemaVersion: "2.0",
        saveSource: "manual_save_draft",
        snapshotJson: JSON.stringify({ displayName: "Six Days Old", designConfig: { background: { imageUrl: assetUrlA } } }),
        assetUrlsJson: JSON.stringify([assetUrlA]),
        createdAt: sixDaysAgo,
        expiresAt: new Date(sixDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const eightDaySnap = await prisma.profileHistorySnapshot.create({
      data: {
        userId: userA.id,
        profileId: userA.profile.id,
        profileVersion: 89,
        schemaVersion: "2.0",
        saveSource: "manual_save_draft",
        snapshotJson: JSON.stringify({ displayName: "Eight Days Old", designConfig: { background: { imageUrl: assetUrlA } } }),
        assetUrlsJson: JSON.stringify([assetUrlA]),
        createdAt: eightDaysAgo,
        expiresAt: new Date(eightDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const retentionRes = await cleanupExpiredHistory(new Date(now));
    assert.ok(retentionRes.deletedSnapshots >= 1, "Expired >7-day snapshot must be deleted");
    assert.strictEqual(
      await prisma.profileHistorySnapshot.findUnique({ where: { id: eightDaySnap.id } }),
      null,
      "8-day-old snapshot must be removed"
    );
    assert.ok(
      await prisma.profileHistorySnapshot.findUnique({ where: { id: sixDaySnap.id } }),
      "6-day-old snapshot must be retained"
    );
    assert.ok(
      await prisma.profile.findUnique({ where: { id: userA.profile.id } }),
      "Active profile must NEVER be deleted by retention cleanup"
    );
    assert.ok(
      await prisma.uploadedAsset.findUnique({ where: { id: assetA.id } }),
      "Asset referenced by retained snapshot must NEVER be deleted by retention cleanup"
    );

    // Deleting an asset still referenced by a retained 6-day snapshot must be blocked with 409!
    const delProtectedRes = await fetch(`${API_URL}/api/rpc/assets/${assetA.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(delProtectedRes.status, 409, "Deleting asset referenced by retained snapshot must return 409");

    // Security IDOR checks (User B accessing User A's history or private profile)
    const beforeDupIdem = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    const dupReqId = `dup-check-${suffix}`;
    const dupPayload = {
      displayName: v1Name,
      saveMode: "manual_save_draft",
      clientRequestId: dupReqId,
      designConfig: { isPublished: false },
    };
    await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify(dupPayload),
    });
    await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify(dupPayload),
    });
    const afterDupIdem = await prisma.profileHistorySnapshot.count({ where: { userId: userA.id } });
    assert.strictEqual(afterDupIdem, beforeDupIdem + 1, "Duplicate clientRequestId must create only 1 snapshot");

    const idorHistListRes = await fetch(`${API_URL}/api/profile/me/history`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(idorHistListRes.status, 200);
    const idorHistList = await idorHistListRes.json();
    assert.strictEqual(idorHistList.snapshots.length, 0, "User B must see 0 of User A's snapshots");

    const idorHistDetailRes = await fetch(`${API_URL}/api/profile/me/history/${sixDaySnap.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(idorHistDetailRes.status, 404, "User B must NOT access User A's snapshot by ID");

    // Anonymous access to User B's PRIVATE profile must be blocked (403)
    const privateRes = await fetch(`${API_URL}/api/profile/u/${usernameB}`);
    assert.strictEqual(privateRes.status, 403, "Anonymous access to PRIVATE profile must return 403");

    console.log("   ✓ Tests F & H passed");
    console.log("\nALL FULL PROFILE STUDIO E2E, RETENTION & SECURITY TESTS PASSED!");
  } catch (err) {
    console.error("API LOGS:\n", apiLogs);
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) apiProc.kill("SIGTERM");
    if (webProc && webProc.pid) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${webProc.pid} /T /F`, { stdio: "ignore" });
        } else {
          webProc.kill("SIGTERM");
        }
      } catch {}
    }
    await prisma.profileHistorySnapshot.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.uploadedAsset.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.synchronizationEvent.deleteMany({ where: { entityId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FULL PROFILE STUDIO E2E FAILED:", err);
    process.exit(1);
  });
