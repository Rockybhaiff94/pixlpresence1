/**
 * PIXEL.GG STUDIO — ADVANCED PROFILE EMBED BUILDER E2E SUITE
 * Verifies real browser behavior against the running Next.js app (/customize).
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3106;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WEB_DIR = path.resolve(__dirname, "../apps/web");

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("Timed out waiting for Next.js server"));
          } else {
            setTimeout(attempt, 300);
          }
        });
    };
    attempt();
  });
}

async function setupContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    reducedMotion: opts.reducedMotion || "no-preference",
  });

  await context.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/me") || url.includes("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr_embed_test",
          username: "embed_architect",
          globalName: "Embed Architect",
          role: "USER",
          premiumStatus: true,
          nitroStatus: 2,
          badges: "[]",
          createdAt: "2026-01-01T00:00:00.000Z",
          profile: {
            id: "prof_embed_test",
            userId: "usr_embed_test",
            displayName: "Embed Architect",
            bio: "Designing modular embeds in Pixel.gg",
            views: 42,
            status: "ONLINE",
            visibility: "PUBLIC",
          },
        }),
      });
    }
    if (url.includes("/api/rpc/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          config: {
            appName: "Pixel Studio IDE",
            details: "Crafting Profile Embed",
            state: "Workspace Ready",
            activityType: "PLAYING",
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await context.route("http://localhost:3001/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  );

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem("pixel_app_token", "test_token_embed");
    if (!sessionStorage.getItem("test_keep_embed_storage")) {
      localStorage.removeItem("pixel_studio_elements_draft");
      localStorage.removeItem("pixel_studio_canvas_draft");
      localStorage.removeItem("pixel_studio_draft_timestamp");
      localStorage.removeItem("pixel_studio_autosave_settings");
      localStorage.removeItem("pixel_studio_dock_position");
      localStorage.removeItem("pixel_studio_dock_coords");
      localStorage.removeItem("pixel_studio_dock_orientation");
      localStorage.removeItem("pixel_studio_dock_locked");
    }
  });

  return { context, page, pageErrors, consoleErrors };
}

async function ensureDockToolClick(page, testId) {
  const direct = page.getByTestId(testId);
  if ((await direct.count()) > 0 && (await direct.first().isVisible())) {
    await direct.first().click();
    return;
  }
  const drawerClose = page.getByTestId("doory-drawer-close");
  if ((await drawerClose.count()) > 0 && (await drawerClose.first().isVisible())) {
    await drawerClose.first().click();
    await page.getByTestId("dock-more-toggle").waitFor({ state: "visible", timeout: 4000 });
    if ((await direct.count()) > 0 && (await direct.first().isVisible())) {
      await direct.first().click();
      return;
    }
  }
  const moreBtn = page.getByTestId("dock-more-toggle");
  if ((await moreBtn.count()) > 0 && (await moreBtn.first().isVisible())) {
    await moreBtn.first().click();
    await direct.first().waitFor({ state: "visible", timeout: 3000 });
  }
  await direct.first().click();
}

async function runTests() {
  console.log("[1/6] Starting production Next.js server on port", PORT);
  const serverProc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: WEB_DIR,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverLogs = "";
  serverProc.stdout.on("data", (d) => (serverLogs += d.toString()));
  serverProc.stderr.on("data", (d) => (serverLogs += d.toString()));

  let browser;
  try {
    await waitForServer(`${BASE_URL}/customize`, 30000);
    console.log("[2/6] Server ready. Launching headless Chromium...");

    browser = await chromium.launch({ headless: true });

    // =========================================================================
    // TEST SUITE A: EMBED CONTAINER LIFECYCLE (CREATE, DRAG, RESIZE, LOCK, DUP, DEL, UNDO)
    // =========================================================================
    console.log("[3/6] Running Test Suite A (Embed container lifecycle)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });

      // Click Embed tool in dock
      await ensureDockToolClick(page, "dock-tool-embed");
      await page.waitForSelector('[data-testid="embed-create-btn"]', { timeout: 6000 });

      // Create Profile Embed
      await page.getByTestId("embed-create-btn").click();
      const embedBody = page.locator('[data-testid^="embed-container-body-"]').first();
      await embedBody.waitFor({ state: "visible", timeout: 5000 });

      // Collapse the morphed dock overlay so full canvas area is unobstructed for drag/resize tests
      const closePanelBtn = page.getByTestId("doory-drawer-close");
      if ((await closePanelBtn.count()) > 0 && (await closePanelBtn.isVisible())) {
        await closePanelBtn.click();
        await page.waitForTimeout(250);
      }

      const parentElem = page.locator('[data-testid^="canvas-elem-embed-"]').first();
      const parentIdAttr = await parentElem.getAttribute("data-testid");
      const embedId = parentIdAttr.replace("canvas-elem-", "");

      // Re-select embed cleanly and verify floating toolbar has all 4 actions for parent embed
      await parentElem.click({ position: { x: 20, y: 20 } });
      await page.waitForSelector('[data-testid="canvas-floating-toolbar"]', { timeout: 4000 });
      assert.strictEqual(await page.getByTestId("floating-toolbar-duplicate").isVisible(), true);
      assert.strictEqual(await page.getByTestId("floating-toolbar-lock").isVisible(), true);
      assert.strictEqual(await page.getByTestId("floating-toolbar-add-element").isVisible(), true);
      assert.strictEqual(await page.getByTestId("floating-toolbar-delete").isVisible(), true);

      // Drag embed container
      const beforeDrag = await parentElem.boundingBox();
      await page.mouse.move(beforeDrag.x + 24, beforeDrag.y + 24);
      await page.mouse.down();
      await page.mouse.move(beforeDrag.x + 64, beforeDrag.y + 54, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const afterDrag = await parentElem.boundingBox();
      assert(
        Math.abs((afterDrag.x - beforeDrag.x) - 40) < 12,
        `Embed should move horizontally when dragged (beforeX=${beforeDrag.x}, afterX=${afterDrag.x})`
      );
      assert(
        Math.abs((afterDrag.y - beforeDrag.y) - 30) < 12,
        `Embed should move vertically when dragged (beforeY=${beforeDrag.y}, afterY=${afterDrag.y})`
      );

      // Resize embed container via bottom-right (se) handle
      const seHandle = page.getByTestId("handle-se");
      const seBox = await seHandle.boundingBox();
      const beforeResize = await parentElem.boundingBox();
      await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(seBox.x + 50, seBox.y + 40, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const afterResize = await parentElem.boundingBox();
      assert(afterResize.width > beforeResize.width + 30, "Embed width should increase on SE handle drag");
      assert(afterResize.height > beforeResize.height + 25, "Embed height should increase on SE handle drag");

      // Lock & verify drag is blocked and handles are hidden
      await page.getByTestId("floating-toolbar-lock").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await page.getByTestId("locked-selection-outline").isVisible(), true);
      assert.strictEqual(await page.getByTestId("handle-se").count(), 0);
      const lockedBox = await parentElem.boundingBox();
      await page.mouse.move(lockedBox.x + 30, lockedBox.y + 30);
      await page.mouse.down();
      await page.mouse.move(lockedBox.x + 80, lockedBox.y + 80, { steps: 4 });
      await page.mouse.up();
      const afterLockedAttempt = await parentElem.boundingBox();
      assert.strictEqual(Math.round(afterLockedAttempt.x), Math.round(lockedBox.x), "Locked embed must not move");

      // Unlock embed
      await page.getByTestId("floating-toolbar-lock").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await page.getByTestId("handle-se").isVisible(), true);

      // Duplicate embed
      await page.getByTestId("floating-toolbar-duplicate").click();
      await page.waitForTimeout(200);
      const embedCountAfterDup = await page.locator('[data-testid^="canvas-elem-embed-"]').count();
      assert.strictEqual(embedCountAfterDup, 2, "Should have 2 embeds after duplicate");

      // Delete the cloned embed, verify 1 remains, then Undo brings it back
      await page.getByTestId("floating-toolbar-delete").click();
      await page.waitForTimeout(150);
      assert.strictEqual(await page.locator('[data-testid^="canvas-elem-embed-"]').count(), 1);
      await page.getByTestId("topbar-undo").click();
      await page.waitForTimeout(150);
      assert.strictEqual(await page.locator('[data-testid^="canvas-elem-embed-"]').count(), 2, "Undo should restore deleted embed");

      // Clean up extra embed before continuing? Wait: just close context and start fresh for Suite B!
      assert(embedId.startsWith("embed-"));
      assert.strictEqual(pageErrors.length, 0, `Suite A pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Test Suite A passed");
    }

    // =========================================================================
    // TEST SUITE B: ALL 8 COMPONENTS, PARENT/CHILD INDEPENDENCE, FLOATING TOOLBAR
    // =========================================================================
    console.log("[4/6] Running Test Suite B (All 8 child components + independent editing)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]');

      // Create embed
      await ensureDockToolClick(page, "dock-tool-embed");
      await page.getByTestId("embed-create-btn").click();
      const parentElem = page.locator('[data-testid^="canvas-elem-embed-"]').first();
      await parentElem.waitFor({ state: "visible" });

      // Collapse dock overlay temporarily to resize cleanly via handle-se, or move embed up first
      const closeBtnB = page.getByTestId("doory-drawer-close");
      if ((await closeBtnB.count()) > 0 && (await closeBtnB.isVisible())) {
        await closeBtnB.click();
        await page.waitForTimeout(200);
      }

      // Make embed generous size so all 8 children sit nicely inside
      await parentElem.click({ position: { x: 16, y: 16 } });
      const parentBox0 = await parentElem.boundingBox();
      const se0 = await page.getByTestId("handle-se").boundingBox();
      await page.mouse.move(se0.x + 3, se0.y + 3);
      await page.mouse.down();
      await page.mouse.move(se0.x + 120, se0.y + 180, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      assert((await parentElem.boundingBox()).height > parentBox0.height + 100);

      // Add first 4 via Floating Toolbar "+ Add Element" menu
      const firstBatch = ["profile-image", "name", "subtitle", "description"];
      for (const kind of firstBatch) {
        await parentElem.click({ position: { x: 12, y: 12 } });
        await page.getByTestId("floating-toolbar-add-element").click();
        await page.waitForSelector('[data-testid="embed-add-element-menu"]', { timeout: 3000 });
        await page.getByTestId(`add-embed-comp-${kind}`).click();
        await page.waitForTimeout(100);
      }

      // Reopen Embed tool drawer and add remaining 4 via drawer quick palette (testing both entry points!)
      await ensureDockToolClick(page, "dock-tool-embed");
      await page.waitForSelector('[data-testid="drawer-add-comp-rpc"]', { timeout: 4000 });
      const secondBatch = ["rpc", "music", "social", "custom-text"];
      for (const kind of secondBatch) {
        await page.getByTestId(`drawer-add-comp-${kind}`).click();
        await page.waitForTimeout(100);
      }
      // Also add a second social button to verify multiple independent social items
      await page.getByTestId("drawer-add-comp-social").click();
      await page.waitForTimeout(100);

      // Close dock panel before direct canvas child dragging
      if ((await closeBtnB.count()) > 0 && (await closeBtnB.isVisible())) {
        await closeBtnB.click();
        await page.waitForTimeout(200);
      }

      // Verify all 9 children exist inside the parent embed DOM!
      const nestedChildren = parentElem.locator('[data-testid^="embed-container-body-"] > [data-testid^="canvas-elem-"]');
      assert.strictEqual(await nestedChildren.count(), 9, "All 9 added components should render nested inside parent embed");

      // Select child #1 (profile image) -> MUST select child ONLY and NOT show Add Element button
      const firstChild = nestedChildren.nth(0);
      const firstChildBox = await firstChild.boundingBox();
      await firstChild.click();
      await page.waitForTimeout(120);
      assert.strictEqual(await page.getByTestId("child-selection-outline").count(), 1, "Child selection outline must appear");
      assert.strictEqual(await page.getByTestId("embed-selection-outline").count(), 0, "Parent embed outline must not be selected when child clicked");
      assert.strictEqual(await page.getByTestId("floating-toolbar-add-element").count(), 0, "Add Element must NOT render on child element toolbar");
      assert.strictEqual(await page.getByTestId("floating-toolbar-duplicate").isVisible(), true);
      assert.strictEqual(await page.getByTestId("floating-toolbar-lock").isVisible(), true);
      assert.strictEqual(await page.getByTestId("floating-toolbar-delete").isVisible(), true);

      // Drag child independently -> parent must stay still, child moves!
      const parentBeforeChildDrag = await parentElem.boundingBox();
      await page.mouse.move(firstChildBox.x + firstChildBox.width / 2, firstChildBox.y + firstChildBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(firstChildBox.x + firstChildBox.width / 2 + 24, firstChildBox.y + firstChildBox.height / 2 + 16, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const parentAfterChildDrag = await parentElem.boundingBox();
      const childAfterDrag = await firstChild.boundingBox();
      assert.strictEqual(Math.round(parentAfterChildDrag.x), Math.round(parentBeforeChildDrag.x), "Parent X must not change on child drag");
      assert.strictEqual(Math.round(parentAfterChildDrag.y), Math.round(parentBeforeChildDrag.y), "Parent Y must not change on child drag");
      assert(childAfterDrag.x > firstChildBox.x + 12, "Child X must move when dragged");

      // Select parent empty area & drag parent -> BOTH parent and child move together!
      await parentElem.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(120);
      assert.strictEqual(await page.getByTestId("embed-selection-outline").count(), 1, "Clicking parent background selects parent");
      assert.strictEqual(await page.getByTestId("floating-toolbar-add-element").isVisible(), true);

      const pDrag0 = await parentElem.boundingBox();
      const cDrag0 = await firstChild.boundingBox();
      await page.mouse.move(pDrag0.x + 10, pDrag0.y + 10);
      await page.mouse.down();
      await page.mouse.move(pDrag0.x + 50, pDrag0.y + 42, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const pDrag1 = await parentElem.boundingBox();
      const cDrag1 = await firstChild.boundingBox();
      const parentDeltaX = pDrag1.x - pDrag0.x;
      const childDeltaX = cDrag1.x - cDrag0.x;
      assert(parentDeltaX > 25, "Parent should move");
      assert(Math.abs(parentDeltaX - childDeltaX) < 3, "Child must move with parent with identical delta");

      // Lock child -> verify child cannot move -> delete second social child leaves 8 remaining
      const lastChild = nestedChildren.nth(8);
      await lastChild.click();
      await page.getByTestId("floating-toolbar-lock").click();
      await page.waitForTimeout(80);
      assert.strictEqual(await page.getByTestId("locked-selection-outline").isVisible(), true);
      await page.getByTestId("floating-toolbar-lock").click();
      await page.getByTestId("floating-toolbar-duplicate").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await nestedChildren.count(), 10, "Duplicating child should add nested sibling");
      await page.getByTestId("floating-toolbar-delete").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await nestedChildren.count(), 9, "Deleting child leaves parent & remaining siblings intact");

      assert.strictEqual(pageErrors.length, 0, `Suite B pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Test Suite B passed");
    }

    // =========================================================================
    // TEST SUITE C & D: TOOLBAR CLAMPING, SMART GUIDES, & RESPONSIVE VIEWPORTS
    // =========================================================================
    console.log("[5/6] Running Test Suite C & D (Toolbar clamping, snap guides, zoom, mobile)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]');

      await ensureDockToolClick(page, "dock-tool-embed");
      await page.getByTestId("embed-create-btn").click();
      const closeBtnCD = page.getByTestId("doory-drawer-close");
      if ((await closeBtnCD.count()) > 0 && (await closeBtnCD.isVisible())) {
        await closeBtnCD.click();
        await page.waitForTimeout(200);
      }
      const parentElem = page.locator('[data-testid^="canvas-elem-embed-"]').first();
      await parentElem.click({ position: { x: 10, y: 10 } });

      // Drag embed close to TOP edge of workspace (keeping left edge well inside visible workspace) to force toolbar flip & clamping
      const wsBox = await page.getByTestId("doory-canvas-workspace").boundingBox();
      const pBox = await parentElem.boundingBox();
      await page.mouse.move(pBox.x + 16, pBox.y + 12);
      await page.mouse.down();
      await page.mouse.move(wsBox.x + 140, wsBox.y + 24, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(150);

      const tbBox = await page.getByTestId("canvas-floating-toolbar").boundingBox();
      assert(tbBox.x >= wsBox.x - 2, "Floating toolbar X must stay inside workspace left edge");
      assert(tbBox.y >= wsBox.y - 2, "Floating toolbar Y must flip inside workspace top edge");
      assert(tbBox.x + tbBox.width <= wsBox.x + wsBox.width + 2, "Floating toolbar must stay inside right edge");
      assert(tbBox.y + tbBox.height <= wsBox.y + wsBox.height + 2, "Floating toolbar must stay inside bottom edge");

      // Smart snap guides check: add child name & drag horizontally toward center of embed
      await page.getByTestId("floating-toolbar-add-element").click();
      await page.getByTestId("add-embed-comp-name").click();
      await page.waitForTimeout(150);
      const child = parentElem.locator('[data-testid^="embed-container-body-"] > [data-testid^="canvas-elem-"]').first();
      const chBox = await child.boundingBox();
      const curParentBox = await parentElem.boundingBox();
      const targetCenterX = curParentBox.x + curParentBox.width / 2;

      const dragPtX = chBox.x + chBox.width / 2;
      const dragPtY = chBox.y + chBox.height / 2;
      await page.mouse.move(dragPtX, dragPtY);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.move(targetCenterX, dragPtY, { steps: 15 });
      await page.waitForTimeout(100);
      const guideXCount = await page.getByTestId("snap-guide-x").count();
      const guideYCount = await page.getByTestId("snap-guide-y").count();
      const guideVisibleDuringDrag = guideXCount > 0 || guideYCount > 0;
      await page.mouse.up();
      await page.waitForTimeout(80);
      const guidesClearedAfterUp =
        (await page.getByTestId("snap-guide-x").count()) === 0 &&
        (await page.getByTestId("snap-guide-y").count()) === 0;
      assert(guideVisibleDuringDrag, "Smart snap guide should appear near alignment during drag");
      assert(guidesClearedAfterUp, "Smart snap guides must clear after pointerup");

      // Zoom out twice & verify floating toolbar remains inside workspace bounds
      await page.getByTestId("zoom-out").click();
      await page.getByTestId("zoom-out").click();
      await page.waitForTimeout(150);
      const zoomTbBox = await page.getByTestId("canvas-floating-toolbar").boundingBox();
      assert(zoomTbBox.x >= wsBox.x - 2 && zoomTbBox.y >= wsBox.y - 2, "Toolbar must remain clamped at low zoom");

      // Mobile viewport check
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(250);
      const mobWsBox = await page.getByTestId("doory-canvas-workspace").boundingBox();
      const mobTbBox = await page.getByTestId("canvas-floating-toolbar").boundingBox();
      assert(mobTbBox.x >= mobWsBox.x - 2, "Mobile floating toolbar clamped left");
      assert(mobTbBox.x + mobTbBox.width <= mobWsBox.x + mobWsBox.width + 2, "Mobile floating toolbar clamped right");

      assert.strictEqual(pageErrors.length, 0, `Suite C/D pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Test Suite C & D passed");
    }

    // =========================================================================
    // TEST SUITE E, F & G: HIERARCHICAL LAYERS, AUTOSAVE RELOAD, NON-EMBED COMPAT
    // =========================================================================
    console.log("[6/6] Running Test Suite E, F & G (Layers hierarchy, autosave reload, non-embed elements)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]');

      // Also add a non-embed shape first (backwards compatibility)
      await ensureDockToolClick(page, "dock-tool-shapes");
      await page.getByTestId("shape-rect").click();
      await page.waitForTimeout(100);

      // Add embed + 2 children
      await ensureDockToolClick(page, "dock-tool-embed");
      await page.getByTestId("embed-create-btn").click();
      await page.getByTestId("drawer-add-comp-name").click();
      await page.getByTestId("drawer-add-comp-rpc").click();
      await page.waitForTimeout(150);

      // Open Layers panel (may be in More menu!)
      await ensureDockToolClick(page, "dock-tool-layers");
      await page.waitForSelector('[data-testid="layers-list"]', { timeout: 5000 });

      const parentRow = page.locator('[data-testid^="layer-item-embed-"]').first();
      const parentRowId = (await parentRow.getAttribute("data-testid")).replace("layer-item-", "");
      const childContainer = page.getByTestId(`layer-children-${parentRowId}`);
      assert.strictEqual(await childContainer.isVisible(), true, "Child layers group should start expanded");

      // Collapse & Expand parent embed in Layers
      await page.getByTestId(`layers-toggle-${parentRowId}`).click();
      assert.strictEqual(await childContainer.count(), 0, "Collapsed embed hides child layers");
      await page.getByTestId(`layers-toggle-${parentRowId}`).click();
      assert.strictEqual(await childContainer.isVisible(), true, "Expanded embed reveals child layers");

      // Double-click child layer name to rename inline
      const firstChildRow = childContainer.locator('[data-testid^="layer-item-"]').first();
      const childId = (await firstChildRow.getAttribute("data-testid")).replace("layer-item-", "");
      await firstChildRow.locator('[title="Double-click to rename"]').dblclick();
      const renameInput = page.getByTestId(`layer-rename-input-${childId}`);
      await renameInput.fill("Hero Display Name");
      await renameInput.press("Enter");
      await page.waitForTimeout(120);
      assert((await firstChildRow.innerText()).includes("Hero Display Name"), "Inline layer rename must update label");

      // Scoped reorder within parent keeps child nested inside childContainer!
      await page.getByTestId(`layer-down-${childId}`).click();
      await page.waitForTimeout(100);
      assert.strictEqual(
        await childContainer.locator(`[data-testid="layer-item-${childId}"]`).count(),
        1,
        "Reordered child must preserve parentId and stay nested"
      );

      // Trigger Save Draft / verify localStorage persistence & reload restoration
      await page.evaluate(() => sessionStorage.setItem("test_keep_embed_storage", "1"));
      await page.getByTestId("save-draft-button").click();
      await page.waitForTimeout(400);

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });

      // Reloaded canvas must contain the embed, its 2 children, and the top-level shape!
      const restoredEmbed = page.locator(`[data-testid="canvas-elem-${parentRowId}"]`);
      await restoredEmbed.waitFor({ state: "visible", timeout: 5000 });
      assert.strictEqual(
        await restoredEmbed.locator('[data-testid^="embed-container-body-"] > [data-testid^="canvas-elem-"]').count(),
        2,
        "Reloaded embed must retain its 2 nested children"
      );
      assert.strictEqual(
        await page.locator('[data-testid^="canvas-elem-shape-"]').count(),
        1,
        "Top-level non-embed elements must coexist seamlessly"
      );

      // Also check Layers still shows custom renamed child after reload
      await ensureDockToolClick(page, "dock-tool-layers");
      await page.waitForSelector('[data-testid="layers-list"]', { timeout: 5000 });
      assert((await page.getByTestId(`layer-item-${childId}`).innerText()).includes("Hero Display Name"));

      assert.strictEqual(pageErrors.length, 0, `Suite E/F/G pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Test Suite E, F & G passed");
    }

    console.log("\nALL EMBED BUILDER PLAYWRIGHT SUITES PASSED!");
  } finally {
    if (browser) await browser.close();
    if (serverProc && serverProc.pid) {
      try {
        require("child_process").execSync(`taskkill /F /PID ${serverProc.pid} /T`, { stdio: "ignore" });
      } catch {
        serverProc.kill();
      }
    }
  }
}

runTests().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
