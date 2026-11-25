/**
 * PIXEL.GG STUDIO — ADVANCED PROFILE BUILDER E2E VERIFICATION SUITE
 * Verifies real browser behavior across Canvas, Profile Embeds, Nesting,
 * Component Library, Layers, Properties, Persistence, Publish & Protected Dock.
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3107;
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

async function setupContext(browser) {
  const savedPayloads = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.route(/\/api\/|localhost:3001/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/api/auth/me") || url.includes("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr_builder_test",
          username: "builder_pro",
          globalName: "Builder Pro",
          role: "USER",
          premiumStatus: true,
          nitroStatus: 2,
          badges: "[]",
          createdAt: "2026-01-01T00:00:00.000Z",
          profile: {
            id: "prof_builder_test",
            userId: "usr_builder_test",
            displayName: "Builder Pro",
            bio: "Building modular profiles",
            views: 120,
            status: "ONLINE",
            visibility: "PUBLIC",
          },
        }),
      });
    }

    if (url.includes("/api/profile/me") && method === "PATCH") {
      try {
        savedPayloads.push(route.request().postDataJSON());
      } catch { }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }

    if (url.includes("/presence")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          presence: {
            hasActivity: true,
            status: "online",
            appName: "Visual Studio Code",
            details: "Editing Profile Builder",
            state: "Pixel.gg Workspace",
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
    localStorage.setItem("pixel_app_token", "test_token_builder");
    if (!sessionStorage.getItem("keep_builder_draft")) {
      localStorage.removeItem("pixel_profile_builder_draft_v2");
      localStorage.removeItem("pixel_studio_dock_position");
      localStorage.removeItem("pixel_studio_dock_coords");
      localStorage.removeItem("pixel_studio_dock_orientation");
      localStorage.removeItem("pixel_studio_dock_locked");
      localStorage.removeItem("pixel_studio_secondary_dock_state_v1");
      localStorage.removeItem("pixel_studio_secondary_panel_state_v1");
    }
  });

  return { context, page, pageErrors, savedPayloads };
}

async function runTests() {
  console.log("[1/5] Starting production Next.js server on port", PORT);
  const serverProc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: WEB_DIR,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/customize`, 30000);
    console.log("[2/5] Server ready. Launching Chromium...");
    browser = await chromium.launch({ headless: true });

    // SUITE 1 & 2: Full Layout, Two Levels, Search & Component Insertion, Independent Child Selection
    console.log("[3/5] Running Suite 1 & 2 (Layout, Canvas vs Embed, Search, Child Selection)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="profile-builder-studio"]', { timeout: 15000 });

      // Protected Main Dock starts in Normal State, Secondary Dock starts compact (Properties/Layers/Add Elements), Bottom Bar visible
      assert.strictEqual(await page.getByTestId("studio-floating-dock").isVisible(), true);
      assert.strictEqual(await page.getByTestId("secondary-floating-dock").isVisible(), true);
      assert.strictEqual(await page.getByTestId("builder-top-toolbar").isVisible(), true);
      assert.strictEqual(await page.getByTestId("builder-add-element-panel").count(), 0);
      assert.strictEqual(await page.getByTestId("secondary-unified-panel").count(), 0);
      assert.strictEqual(await page.getByTestId("builder-bottom-bar").isVisible(), true);

      // Open Secondary Unified Panel via Properties button (shows expandable Properties + Layers)
      await page.getByTestId("secondary-dock-btn-properties").click();
      await page.waitForSelector('[data-testid="builder-layers-panel"]', { timeout: 3000 });
      assert.strictEqual(await page.getByTestId("builder-layers-panel").isVisible(), true);

      // Select Canvas (Level A)
      await page.getByTestId("subbar-select-canvas").click();
      await page.waitForSelector('[data-testid="properties-canvas-inspector"]', { timeout: 3000 });
      assert.strictEqual(await page.getByTestId("canvas-width-input").inputValue(), "1920");
      assert.strictEqual(await page.getByTestId("canvas-height-input").inputValue(), "1080");

      // Update Canvas width & verify preserved
      await page.getByTestId("canvas-width-input").fill("1600");
      await page.getByTestId("canvas-width-input").press("Enter");
      assert.strictEqual(await page.getByTestId("canvas-width-input").inputValue(), "1600");

      // Open State 2 (Expanded Dock) -> State 3 (Elements Panel), verify search, then close back to Expanded Dock
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 3000 });
      await page.getByTestId("dock-open-elements-panel").click();
      await page.waitForSelector('[data-testid="builder-add-element-panel"]', { timeout: 3000 });
      await page.getByTestId("studio-floating-dock").waitFor({ state: "detached", timeout: 2000 });
      assert.strictEqual(await page.getByTestId("studio-floating-dock").count(), 0);

      // Search Component Library (positive match & empty state)
      await page.getByTestId("add-element-search").fill("Gallery");
      assert.strictEqual(await page.getByTestId("library-add-image-gallery").isVisible(), true);
      assert.strictEqual(await page.getByTestId("library-add-name-text").count(), 0);
      await page.getByTestId("add-element-search").fill("zzzznotfound");
      assert.strictEqual(await page.getByTestId("add-element-empty").isVisible(), true);
      await page.getByTestId("add-element-search").fill("");

      await page.getByTestId("elements-panel-close").click();
      await page.waitForSelector('[data-testid="dock-expanded-container"]', { timeout: 3000 });
      await page.getByTestId("builder-add-element-panel").waitFor({ state: "detached", timeout: 2000 });
      assert.strictEqual(await page.getByTestId("builder-add-element-panel").count(), 0);

      // Click Embed in Canvas -> selects parent container (shows ft-add-element)
      const rootEmbed = page.getByTestId("canvas-node-embed-profile-root");
      await rootEmbed.click({ position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="builder-floating-toolbar"]', { timeout: 3000 });
      assert.strictEqual(await page.getByTestId("ft-add-element").isVisible(), true);
      assert.strictEqual(await page.getByTestId("properties-node-inspector").isVisible(), true);

      // Click child component (Name Text) -> MUST select child only and hide ft-add-element
      await page.getByTestId("canvas-node-node-name-1").click();
      assert.strictEqual(await page.getByTestId("builder-child-outline").count(), 1);
      assert.strictEqual(await page.getByTestId("ft-add-element").count(), 0);

      // Edit Name Text content live in Properties
      await page.getByTestId("prop-text-content").fill("ARCHITECT STUDIO");
      assert((await page.getByTestId("canvas-node-node-name-1").innerText()).includes("ARCHITECT STUDIO"));

      // Insert a Nested Embed into root embed via Floating Toolbar "+ Add Element"
      await rootEmbed.click({ position: { x: 10, y: 10 } });
      await page.getByTestId("ft-add-element").click();
      await page.waitForSelector('[data-testid="ft-add-menu"]', { timeout: 3000 });
      await page.getByTestId("ft-add-opt-nested-embed").click();
      await page.waitForTimeout(100);
      assert.strictEqual(
        await page.locator('[data-node-type="nested-embed"][data-parent-id="embed-profile-root"]').count(),
        2
      );

      assert.strictEqual(pageErrors.length, 0, `Suite 1/2 errors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 1 & 2 passed");
    }

    // SUITE 3 & 4: Drag, Resize, Lock, Duplicate, Delete, Undo/Redo, Layers & Metrics
    console.log("[4/5] Running Suite 3 & 4 (Drag, Resize, Undo/Redo, Layers Hierarchy, Metrics)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="profile-builder-studio"]', { timeout: 15000 });
      await page.getByTestId("secondary-dock-btn-layers").click();
      await page.waitForSelector('[data-testid="builder-layers-panel"]', { timeout: 3000 });

      const metricsBefore = await page.getByTestId("builder-status-metrics").innerText();
      assert(metricsBefore.includes("Nested: 1"), `Expected Nested: 1 in metrics, got: ${metricsBefore}`);

      // Select root embed & drag it from bottom padding strip -> children move identically
      const rootEmbed = page.getByTestId("canvas-node-embed-profile-root");
      const childName = page.getByTestId("canvas-node-node-name-1");
      await rootEmbed.click({ position: { x: 10, y: 10 } });

      const p0 = await rootEmbed.boundingBox();
      const c0 = await childName.boundingBox();
      const grabX = p0.x + p0.width / 2;
      const grabY = p0.y + p0.height - 10;
      await page.mouse.move(grabX, grabY);
      await page.mouse.down();
      await page.mouse.move(grabX - 32, grabY - 24, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const p1 = await rootEmbed.boundingBox();
      const c1 = await childName.boundingBox();
      assert(p0.x - p1.x > 15, "Parent embed should move when dragged");
      assert(Math.abs((p1.x - p0.x) - (c1.x - c0.x)) < 3, "Children must move with parent");

      // Undo restores parent position in 1 transaction!
      await page.getByTestId("builder-undo-btn").click();
      await page.waitForTimeout(100);
      const pUndo = await rootEmbed.boundingBox();
      assert(Math.abs(pUndo.x - p0.x) < 4, "Undo must restore embed position");

      // Redo moves it forward again without duplicating
      await page.getByTestId("builder-redo-btn").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await page.locator('[data-node-type="embed"]').count(), 1);

      // Resize root embed via top-right handle-ne
      const ne = await page.getByTestId("builder-handle-ne").boundingBox();
      const preResize = await rootEmbed.boundingBox();
      await page.mouse.move(ne.x + ne.width / 2, ne.y + ne.height / 2);
      await page.mouse.down();
      await page.mouse.move(ne.x + ne.width / 2 + 30, ne.y + ne.height / 2 - 15, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const postResize = await rootEmbed.boundingBox();
      assert(
        postResize.width > preResize.width + 10,
        `NE handle drag increases embed width (ne=${JSON.stringify(ne)}, preW=${preResize.width}, postW=${postResize.width})`
      );

      // Lock via floating toolbar -> hides handles & blocks drag -> Unlock from Layers panel
      await page.getByTestId("ft-lock").click();
      assert.strictEqual(await page.getByTestId("builder-locked-outline").isVisible(), true);
      assert.strictEqual(await page.getByTestId("builder-handle-se").count(), 0);
      await page.getByTestId("layer-lock-embed-profile-root").click();
      assert.strictEqual(await page.getByTestId("builder-handle-se").isVisible(), true);

      // Duplicate embed -> 2 root embeds -> Delete clone -> Undo
      await page.getByTestId("ft-duplicate").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await page.locator('[data-node-type="embed"]').count(), 2);
      await page.getByTestId("ft-delete").click();
      await page.waitForTimeout(100);
      assert.strictEqual(await page.locator('[data-node-type="embed"]').count(), 1);

      // Layers rename & collapse & visibility toggle
      await page.getByTestId("layer-name-node-name-1").dblclick();
      const renameInput = page.getByTestId("layer-rename-input-node-name-1");
      await renameInput.fill("Hero Display Name");
      await renameInput.press("Enter");
      assert((await page.getByTestId("layer-row-node-name-1").innerText()).includes("Hero Display Name"));

      await page.getByTestId("layer-vis-node-name-1").click();
      assert.strictEqual(await page.getByTestId("canvas-node-node-name-1").count(), 0);
      await page.getByTestId("layer-vis-node-name-1").click();
      assert.strictEqual(await page.getByTestId("canvas-node-node-name-1").isVisible(), true);

      assert.strictEqual(pageErrors.length, 0, `Suite 3/4 errors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 3 & 4 passed");
    }

    // SUITE 5: Device Previews, Settings Grid, Export, Save Draft, Publish Validation & Reload
    console.log("[5/5] Running Suite 5 (Device Previews, Settings, Save Draft, Publish & Reload)...");
    {
      const { context, page, pageErrors, savedPayloads } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="profile-builder-studio"]', { timeout: 15000 });

      // Device previews preserve desktop dimensions
      const desktopBox = await page.getByTestId("builder-canvas-surface").boundingBox();
      await page.getByTestId("builder-device-mobile").click();
      await page.waitForTimeout(120);
      const mobileBox = await page.getByTestId("builder-canvas-surface").boundingBox();
      assert(mobileBox.width < desktopBox.width, "Mobile preview switches canvas width");
      await page.getByTestId("builder-device-desktop").click();
      await page.waitForTimeout(120);

      // Settings modal grid toggle
      await page.getByTestId("builder-settings-btn").click();
      await page.waitForSelector('[data-testid="builder-settings-modal"]', { timeout: 3000 });
      await page.getByTestId("setting-toggle-grid").click();
      await page.getByTestId("settings-modal-close").click();
      assert.strictEqual(await page.getByTestId("canvas-grid-overlay").isVisible(), true);

      // Open Secondary Dock -> Properties to inspect & edit node properties
      await page.getByTestId("secondary-dock-btn-properties").click();
      await page.waitForSelector('[data-testid="secondary-unified-panel"]', { timeout: 3000 });

      // Edit a child & verify Publish sends profileBuilder V2 payload and persists across reload
      await page.getByTestId("canvas-node-node-name-1").click();
      await page.getByTestId("prop-text-content").fill("PUBLISHED USER");

      // Also verify Publish validation blocks unsafe URL in social-group
      await page.getByTestId("canvas-node-node-social-1").click();
      const firstUrlInput = page.locator('[data-testid="properties-node-inspector"] input[placeholder="https://..."]').first();
      await firstUrlInput.fill("javascript:alert(1)");
      await page.getByTestId("builder-publish-btn").click();
      await page.waitForSelector('[data-testid="builder-error-banner"]', { timeout: 3000 });
      assert((await page.getByTestId("builder-error-banner").innerText()).includes("Publish blocked"));

      // Restore valid URL & Publish cleanly
      await firstUrlInput.fill("https://discord.gg/pixelgg");
      await page.evaluate(() => sessionStorage.setItem("keep_builder_draft", "1"));
      await page.getByTestId("builder-publish-btn").click();
      await page.waitForTimeout(500);

      assert(savedPayloads.length >= 1, "Publish must PATCH /api/profile/me");
      assert.strictEqual(savedPayloads[savedPayloads.length - 1].designConfig.profileBuilder.version, "2.0");

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="canvas-node-node-name-1"]', { timeout: 15000 });
      assert((await page.getByTestId("canvas-node-node-name-1").innerText()).includes("PUBLISHED USER"));

      assert.strictEqual(pageErrors.length, 0, `Suite 5 errors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 5 passed");
    }

    console.log("\nALL ADVANCED PROFILE BUILDER PLAYWRIGHT SUITES PASSED!");
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
  console.error("\nPROFILE BUILDER TEST FAILED:", err);
  process.exit(1);
});
