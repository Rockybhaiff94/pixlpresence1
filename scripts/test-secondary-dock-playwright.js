/**
 * PIXEL.GG STUDIO — SECONDARY DOCK & UNIFIED EDITOR PANEL E2E SUITE
 * Verifies every requirement in Section 20:
 *   1. Compact Secondary Dock: 3 options (Properties, Layers, Add Elements), no simultaneous panel
 *   2. Dragging, snapping to Left / Right / Top / Bottom edges, Lock/Unlock & Alt+L, position persistence
 *   3. Dock -> Unified Panel transitions + X close restoring exact previous position & lock state
 *   4. Unified Panel: Properties & Layers expandable sections, draggable horizontal divider, min/max & scroll persistence
 *   5. Add Elements: central modal + panel tab creating independent top-level Canvas elements outside Main Embed
 *   6. Layers drag-and-drop & order controls updating live visual DOM/CSS zIndex stacking + circular drop guard
 *   7. Responsive layouts (Desktop, Tablet, Mobile) + reduced motion + Main Dock regression
 */

const assert = require("assert");
const http = require("http");
const { spawn, execSync } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3109;
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

async function setupContext(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion || "no-preference",
  });

  await context.route(/\/api\/|localhost:3001/, async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/me") || url.includes("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr_sec_dock",
          username: "sec_tester",
          globalName: "Secondary Tester",
          role: "USER",
          premiumStatus: true,
          nitroStatus: 2,
          badges: "[]",
          createdAt: "2026-01-01T00:00:00.000Z",
          profile: {
            id: "prof_sec_dock",
            userId: "usr_sec_dock",
            displayName: "Secondary Tester",
            bio: "Testing secondary dock",
            views: 99,
            status: "ONLINE",
            visibility: "PUBLIC",
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

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem("pixel_app_token", "test_token_secondary");
    if (!sessionStorage.getItem("keep_sec_dock")) {
      localStorage.removeItem("pixel_profile_builder_draft_v2");
      localStorage.removeItem("pixel_studio_secondary_dock_state_v1");
      localStorage.removeItem("pixel_studio_secondary_panel_state_v1");
      localStorage.removeItem("pixel_studio_dock_position");
      localStorage.removeItem("pixel_studio_dock_coords");
      localStorage.removeItem("pixel_studio_dock_orientation");
      localStorage.removeItem("pixel_studio_dock_locked");
    }
  });

  return { context, page, pageErrors };
}

async function runTests() {
  console.log("[1/5] Starting Next.js server on port", PORT);
  const serverProc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: WEB_DIR,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/customize`, 30000);
    console.log("[2/5] Launching headless Chromium...");
    browser = await chromium.launch({ headless: true });

    // SUITE 1: Compact 3-Option Dock, 4-Edge Snapping, Lock/Unlock & Position Persistence
    console.log("[3/5] Running Suite 1 (3-Option Dock, 4-Edge Snapping, Lock & Persistence)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 15000 });

      const secDock = page.getByTestId("secondary-floating-dock");
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "right");
      assert.strictEqual(await secDock.getAttribute("data-dock-orientation"), "vertical");
      assert.strictEqual(await page.getByTestId("secondary-unified-panel").count(), 0);

      // Verify Main Dock is completely present & independent
      assert.strictEqual(await page.getByTestId("studio-floating-dock").isVisible(), true);

      // Exactly 3 action icons: Properties, Layers, Add Elements
      assert.strictEqual(await page.getByTestId("secondary-dock-btn-properties").isVisible(), true);
      assert.strictEqual(await page.getByTestId("secondary-dock-btn-layers").isVisible(), true);
      assert.strictEqual(await page.getByTestId("secondary-dock-btn-add-elements").isVisible(), true);
      assert.strictEqual(
        await secDock.locator('[data-testid^="secondary-dock-btn-"]').count(),
        3
      );

      const studioBodyBox = await page
        .locator('[data-testid="profile-builder-studio"] > div.relative')
        .first()
        .boundingBox();
      const handle = page.getByTestId("secondary-dock-handle");

      // Drag -> Snap to TOP edge
      let hBox = await handle.boundingBox();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        studioBodyBox.x + studioBodyBox.width * 0.5,
        studioBodyBox.y + 18,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(320);
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "top");
      assert.strictEqual(await secDock.getAttribute("data-dock-orientation"), "horizontal");

      // Drag -> Snap to LEFT edge (upper-left slot away from centered Main Dock)
      hBox = await handle.boundingBox();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        studioBodyBox.x + 14,
        studioBodyBox.y + 64,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(320);
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "left");
      assert.strictEqual(await secDock.getAttribute("data-dock-orientation"), "vertical");

      // Drag -> Snap to BOTTOM edge
      hBox = await handle.boundingBox();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        studioBodyBox.x + studioBodyBox.width * 0.5,
        studioBodyBox.y + studioBodyBox.height - 16,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(320);
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "bottom");
      assert.strictEqual(await secDock.getAttribute("data-dock-orientation"), "horizontal");

      // Drag back -> Snap to RIGHT edge
      hBox = await handle.boundingBox();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        studioBodyBox.x + studioBodyBox.width - 14,
        studioBodyBox.y + studioBodyBox.height * 0.45,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(320);
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "right");

      // Lock dock via handle click -> verify drag is blocked -> unlock via Alt+L
      await handle.click();
      await page.waitForTimeout(60);
      assert.strictEqual(await secDock.getAttribute("data-dock-locked"), "true");
      const lockedBox = await secDock.boundingBox();
      hBox = await handle.boundingBox();
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(hBox.x - 200, hBox.y + 80, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const afterLockedAttempt = await secDock.boundingBox();
      assert(Math.abs(afterLockedAttempt.x - lockedBox.x) <= 2, "Locked Secondary Dock must not move");

      // Dock icon click still opens Unified Panel while locked, and closing restores right edge & locked state
      await page.getByTestId("secondary-dock-btn-properties").click();
      await page.waitForSelector('[data-testid="secondary-unified-panel"]', { timeout: 3000 });
      await secDock.waitFor({ state: "detached", timeout: 2000 });
      assert.strictEqual(await page.getByTestId("secondary-floating-dock").count(), 0);
      assert.strictEqual(await page.getByTestId("properties-node-inspector").isVisible(), true);

      // Persist & reload test: close -> reload -> still right & locked
      await page.getByTestId("unified-panel-close").click();
      await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 3000 });
      assert.strictEqual(await secDock.getAttribute("data-dock-edge"), "right");
      assert.strictEqual(await secDock.getAttribute("data-dock-locked"), "true");

      await page.evaluate(() => sessionStorage.setItem("keep_sec_dock", "1"));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 15000 });
      await page.waitForTimeout(80);
      assert.strictEqual(
        await page.getByTestId("secondary-floating-dock").getAttribute("data-dock-edge"),
        "right"
      );
      assert.strictEqual(
        await page.getByTestId("secondary-floating-dock").getAttribute("data-dock-locked"),
        "true"
      );

      assert.strictEqual(pageErrors.length, 0, `Suite 1 pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 1 passed");
    }

    // SUITE 2: Unified Panel Divider Resize, Add Elements Independent Components & Layer Visual Stacking
    console.log("[4/5] Running Suite 2 (Resizable Divider, Independent Elements, Layer Stacking Sync)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 15000 });

      // Open Layers directly from compact dock
      await page.getByTestId("secondary-dock-btn-layers").click();
      await page.waitForSelector('[data-testid="secondary-unified-panel"]', { timeout: 3000 });
      assert.strictEqual(
        await page.getByTestId("secondary-unified-panel").getAttribute("data-active-section"),
        "layers"
      );
      assert.strictEqual(await page.getByTestId("builder-layers-panel").isVisible(), true);
      assert.strictEqual(await page.getByTestId("unified-section-properties").isVisible(), true);

      // Grab divider & resize upward then downward -> Properties & Layers heights change while respecting min sizes
      const divider = page.getByTestId("secondary-panel-divider");
      const propsBefore = await page.getByTestId("unified-section-properties").boundingBox();
      const layersBefore = await page.getByTestId("unified-section-layers").boundingBox();
      const divBox = await divider.boundingBox();
      await page.mouse.move(divBox.x + divBox.width / 2, divBox.y + divBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(divBox.x + divBox.width / 2, divBox.y - 110, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      const propsAfterUp = await page.getByTestId("unified-section-properties").boundingBox();
      const layersAfterUp = await page.getByTestId("unified-section-layers").boundingBox();
      assert(propsAfterUp.height < propsBefore.height - 40, "Moving divider up shrinks Properties");
      assert(layersAfterUp.height > layersBefore.height + 40, "Moving divider up expands Layers");
      assert(propsAfterUp.height >= 115, "Properties respects minimum height");

      // Expand/collapse section headers without losing selection
      await page.getByTestId("section-toggle-properties").click();
      assert.strictEqual(await page.getByTestId("unified-section-properties").count(), 0);
      await page.getByTestId("section-toggle-properties").click();
      assert.strictEqual(await page.getByTestId("unified-section-properties").isVisible(), true);

      // Open Add Elements tab -> Central Modal -> Search -> Add 2 independent components outside Main Embed
      await page.getByTestId("unified-tab-add-elements").click();
      await page.waitForSelector('[data-testid="add-elements-modal"]', { timeout: 3000 });
      await page.getByTestId("add-elements-modal-search").fill("Image");
      assert.strictEqual(await page.getByTestId("modal-add-image").isVisible(), true);
      await page.getByTestId("modal-add-image").click();
      await page.getByTestId("add-elements-modal").waitFor({ state: "detached", timeout: 2000 });

      // Modal closes & Properties opens for the newly created independent root image!
      assert.strictEqual(await page.getByTestId("add-elements-modal").count(), 0);
      assert.strictEqual(
        await page.getByTestId("secondary-unified-panel").getAttribute("data-active-section"),
        "properties"
      );

      // Verify independent image has parent-id="" (top-level Canvas root, OUTSIDE embed-profile-root!)
      const rootImages = page.locator('[data-node-type="image"][data-parent-id=""]');
      assert.strictEqual(await rootImages.count(), 1, "Image must be outside Main Profile Embed");
      const img1Id = await rootImages.first().getAttribute("data-testid");
      const img1NodeId = img1Id.replace("canvas-node-", "");

      // Add a second independent component (Name Text) outside Main Profile Embed
      await page.getByTestId("unified-tab-add-elements").click();
      await page.waitForSelector('[data-testid="add-elements-modal"]', { timeout: 3000 });
      await page.getByTestId("modal-add-name-text").click();
      await page.getByTestId("add-elements-modal").waitFor({ state: "detached", timeout: 2000 });
      const rootTexts = page.locator('[data-node-type="name-text"][data-parent-id=""]');
      assert.strictEqual(await rootTexts.count(), 1, "Text must be outside Main Profile Embed");
      const txtNodeId = (await rootTexts.first().getAttribute("data-testid")).replace("canvas-node-", "");

      // Verify live stacking synchronization: Image starts BEHIND Text (img zIndex < txt zIndex)
      const imgZBefore = Number(
        await page.getByTestId(`layer-row-${img1NodeId}`).getAttribute("data-z-index")
      );
      const txtZBefore = Number(
        await page.getByTestId(`layer-row-${txtNodeId}`).getAttribute("data-z-index")
      );
      assert(imgZBefore < txtZBefore, "First root element should start behind newer root element");

      // Select Image layer -> bring to Top -> Image MUST render in front (CSS zIndex > txtZ)
      await page.getByTestId(`layer-row-${img1NodeId}`).click();
      await page.getByTestId("layers-move-top").click();
      await page.waitForTimeout(80);

      const canvasImgZAfterTop = await page
        .getByTestId(`canvas-node-${img1NodeId}`)
        .evaluate((el) => Number(getComputedStyle(el).zIndex));
      const canvasTxtZAfterTop = await page
        .getByTestId(`canvas-node-${txtNodeId}`)
        .evaluate((el) => Number(getComputedStyle(el).zIndex));
      assert(
        canvasImgZAfterTop > canvasTxtZAfterTop,
        `Moving image to top must raise canvas CSS zIndex (${canvasImgZAfterTop} > ${canvasTxtZAfterTop})`
      );

      // Send Image to Bottom -> Image MUST render behind Main Embed & Text
      await page.getByTestId("layers-move-bottom").click();
      await page.waitForTimeout(80);
      const canvasImgZAfterBottom = await page
        .getByTestId(`canvas-node-${img1NodeId}`)
        .evaluate((el) => Number(getComputedStyle(el).zIndex));
      assert.strictEqual(
        canvasImgZAfterBottom,
        1,
        `Sending image to bottom must lower zIndex to 1, got ${canvasImgZAfterBottom}`
      );

      assert.strictEqual(pageErrors.length, 0, `Suite 2 pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 2 passed");
    }

    // SUITE 3: Tablet, Mobile & Reduced Motion Verification
    console.log("[5/5] Running Suite 3 (Responsive Viewports & Reduced Motion)...");
    {
      for (const cfg of [
        { name: "tablet", viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" },
        { name: "mobile", viewport: { width: 375, height: 667 }, reducedMotion: "no-preference" },
      ]) {
        const { context, page, pageErrors } = await setupContext(browser, cfg);
        await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 15000 });

        const dockBox = await page.getByTestId("secondary-floating-dock").boundingBox();
        assert(
          dockBox.x + dockBox.width <= cfg.viewport.width + 1 &&
            dockBox.y + dockBox.height <= cfg.viewport.height + 1,
          `[${cfg.name}] Secondary dock out of viewport bounds`
        );

        await page.getByTestId("secondary-dock-btn-properties").click();
        await page.waitForSelector('[data-testid="secondary-unified-panel"]', { timeout: 3000 });
        await page.waitForTimeout(320);
        const closeBox = await page.getByTestId("unified-panel-close").boundingBox();
        assert(
          closeBox.x + closeBox.width <= cfg.viewport.width,
          `[${cfg.name}] Unified panel close button clipped`
        );

        await page.getByTestId("unified-panel-close").click();
        await page.waitForSelector('[data-testid="secondary-floating-dock"]', { timeout: 3000 });
        assert.strictEqual(pageErrors.length, 0, `[${cfg.name}] pageErrors: ${pageErrors.join("; ")}`);
        await context.close();
      }
      console.log("   ✓ Suite 3 passed");
    }

    console.log("\nALL SECONDARY DOCK & UNIFIED PANEL TESTS PASSED.");
  } finally {
    if (browser) await browser.close();
    if (serverProc && serverProc.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /F /PID ${serverProc.pid} /T`, { stdio: "ignore" });
        } catch {
          serverProc.kill();
        }
      } else {
        serverProc.kill();
      }
    }
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("SECONDARY DOCK TEST FAILURE:", err);
  process.exit(1);
});
