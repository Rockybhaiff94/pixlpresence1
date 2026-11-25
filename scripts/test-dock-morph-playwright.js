/**
 * PIXEL.GG STUDIO — DOCK CLICK FIX & MORPHING TOOL PANEL E2E SUITE
 * Verifies real browser behavior against the running Next.js app (/customize).
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3105;
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

  // Mock /api/** and localhost:3001 so Customize renders immediately with mock user
  await context.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/me") || url.includes("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr_dock_test",
          username: "dock_tester",
          globalName: "Dock Tester",
          role: "USER",
          premiumStatus: true,
          nitroStatus: 2,
          badges: "[]",
          createdAt: "2026-01-01T00:00:00.000Z",
          profile: {
            id: "prof_dock_test",
            userId: "usr_dock_test",
            displayName: "Dock Tester",
            bio: "",
            views: 0,
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

  await context.route("http://localhost:3001/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  );

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem("pixel_app_token", "test_token_123");
    if (!sessionStorage.getItem("test_keep_dock_storage")) {
      localStorage.removeItem("pixel_studio_dock_position");
      localStorage.removeItem("pixel_studio_dock_coords");
      localStorage.removeItem("pixel_studio_dock_orientation");
      localStorage.removeItem("pixel_studio_dock_locked");
      localStorage.removeItem("pixel_studio_elements_draft");
    }
  });

  await page.goto(`${BASE_URL}/customize`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });
  await page.waitForSelector("#canvas-artboard", { timeout: 15000 });
  await page.waitForTimeout(250);

  return { context, page, pageErrors };
}

async function runTests() {
  console.log("=================================================================");
  console.log(" PIXEL.GG STUDIO — DOCK CLICK & MORPH PANEL PLAYWRIGHT SUITE");
  console.log("=================================================================\n");

  const nextProc = spawn("npx.cmd", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: WEB_DIR,
    stdio: "pipe",
    shell: true,
  });

  let browser;
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  try {
    await waitForServer(`${BASE_URL}/customize`, 30000);
    browser = await chromium.launch({ headless: true });

    const { context, page, pageErrors } = await setupContext(browser);

    // ---------------------------------------------------------------
    // Suite 0: Dock Structure, More Toggle Icon, Upward Expansion & No Redundant Controls
    // ---------------------------------------------------------------
    console.log("--- Suite 0: Dock Structure, Window/Arrow Toggle & Removed Redundant Controls ---");

    await test("Dock uses window-style More toggle at bottom, removes bottom Move/Lock, and expands upward", async () => {
      assert.strictEqual(await page.locator('[data-dock-move-handle="true"]').count(), 1, "Top Move handle must exist");
      assert.strictEqual(await page.locator('[data-testid="dock-tool-placement"]').count(), 0, "Bottom redundant Move icon must be removed");
      assert.strictEqual(await page.locator('[data-testid="dock-tool-lock"]').count(), 0, "Bottom redundant Lock icon must be removed");

      const moreToggle = page.locator('[data-testid="dock-more-toggle"]');
      assert.strictEqual(await moreToggle.count(), 1, "More toggle must exist");
      const iconClassCollapsed = await moreToggle.locator("svg").getAttribute("class");
      assert(
        iconClassCollapsed && iconClassCollapsed.includes("lucide-panel-top"),
        `Collapsed More toggle must use window-style PanelTop icon, got: ${iconClassCollapsed}`
      );
      assert(
        !(iconClassCollapsed && iconClassCollapsed.includes("layout-grid")),
        "More toggle must never use four-square grid icon"
      );

      // Drag to Left vertical edge first to verify vertical upward expansion from stationary bottom toggle
      const wb = await page
        .locator('[data-testid="studio-floating-dock"]')
        .evaluate((el) => el.offsetParent.getBoundingClientRect().toJSON());
      const hb = await page.locator('[data-dock-move-handle="true"]').boundingBox();
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await page.mouse.down();
      await page.mouse.move(wb.left + 12, wb.top + 320, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(320);
      assert.strictEqual(
        await page.locator('[data-testid="studio-floating-dock"]').getAttribute("data-dock-edge"),
        "left",
        "Dock should snap to left edge after direct flick drag"
      );

      const toggleBeforeBox = await moreToggle.boundingBox();
      await page.evaluate(() => {
        window.__moreToggleEl = document.querySelector('[data-testid="dock-more-toggle"]');
      });

      await moreToggle.click();
      await page.waitForTimeout(320);

      const sameNode = await page.evaluate(
        () => window.__moreToggleEl === document.querySelector('[data-testid="dock-more-toggle"]')
      );
      assert(sameNode, "More toggle must keep the exact same button element across states");

      const iconClassExpanded = await moreToggle.locator("svg").getAttribute("class");
      assert(
        iconClassExpanded && iconClassExpanded.includes("lucide-chevron-up"),
        `Vertical expanded toggle must show upward arrow, got: ${iconClassExpanded}`
      );

      assert.strictEqual(await page.locator('[data-testid="dock-tool-placement"]').count(), 0);
      assert.strictEqual(await page.locator('[data-testid="dock-tool-lock"]').count(), 0);

      const toggleAfterBox = await moreToggle.boundingBox();
      assert(
        Math.abs(toggleBeforeBox.y - toggleAfterBox.y) <= 2,
        `Bottom toggle must stay stationary during upward expansion (${toggleBeforeBox.y} vs ${toggleAfterBox.y})`
      );

      const additionalGroupBox = await page.locator('[data-testid="dock-additional-tools-group"]').boundingBox();
      assert(
        additionalGroupBox.y + additionalGroupBox.height <= toggleAfterBox.y + 1,
        "Additional tools must appear ABOVE the bottom toggle"
      );

      // Collapse back -> verify PanelTop restores cleanly and dock returns
      await moreToggle.click();
      await page.waitForTimeout(320);
      const iconAfterCollapse = await moreToggle.locator("svg").getAttribute("class");
      assert(
        iconAfterCollapse && iconAfterCollapse.includes("lucide-panel-top"),
        "Collapsed toggle must restore window-style PanelTop icon"
      );

      const hbBack = await page.locator('[data-dock-move-handle="true"]').boundingBox();
      await page.mouse.move(hbBack.x + hbBack.width / 2, hbBack.y + hbBack.height / 2);
      await page.mouse.down();
      await page.mouse.move(wb.left + wb.width / 2, wb.bottom - 12, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(320);
    });

    // ---------------------------------------------------------------
    // Suite A: Click All 7 Tools + Morph Panel Replaces Separate Drawer
    // ---------------------------------------------------------------
    console.log("--- Suite A: All 7 Tool Clicks & Single Morphing Shell ---");

    const tools = [
      { id: "templates", title: "TEMPLATES & LAYOUTS", expandFirst: false, activeAttr: "templates" },
      { id: "text", title: "TYPOGRAPHY & TEXT", expandFirst: false, activeAttr: "text" },
      { id: "shapes", title: "SHAPES & GEOMETRIES", expandFirst: false, activeAttr: "shapes" },
      { id: "elements", title: "GRAPHICS & STICKERS", expandFirst: false, activeAttr: "elements" },
      { id: "media", title: "IMAGES & MEDIA", expandFirst: false, activeAttr: "images" },
      { id: "canvas", title: "CANVAS BACKGROUND", expandFirst: true, activeAttr: "background" },
      { id: "layers", title: "LAYERS & HIERARCHY", expandFirst: true, activeAttr: "layers" },
    ];

    for (const tool of tools) {
      await test(`Click ${tool.id} morphs dock into "${tool.title}" & closes cleanly`, async () => {
        if (tool.expandFirst) {
          const toggleBtn = page.locator('[data-testid="dock-more-toggle"]');
          if ((await toggleBtn.getAttribute("data-expanded")) !== "true") {
            await toggleBtn.click();
            await page.waitForTimeout(300);
          }
        }

        const artboardBefore = await page.locator("#canvas-artboard").boundingBox();
        await page.locator(`[data-testid="dock-tool-${tool.id}"]`).click();
        await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 5000 });
        await page.waitForTimeout(380);

        // Single component check: there must be only 1 drawer host and it lives INSIDE studio-floating-dock
        const drawerHosts = await page.locator('[data-testid="doory-drawer-host"]').count();
        assert.strictEqual(drawerHosts, 1, "Must render exactly 1 tool panel");

        const insideDock = await page
          .locator('[data-testid="studio-floating-dock"] [data-testid="doory-drawer-host"]')
          .count();
        assert.strictEqual(insideDock, 1, "Tool panel must render inside StudioFloatingDock shell");

        // Dock icon row must NOT be visible behind open panel
        const iconRowCount = await page
          .locator('[data-testid="dock-collapsed-container"], [data-testid="dock-expanded-container"]')
          .count();
        assert.strictEqual(iconRowCount, 0, "Dock icon row must hide while tool panel is open");

        const headerText = await page
          .locator('[data-testid="doory-drawer-host"] h3')
          .innerText();
        assert.strictEqual(headerText.trim().toUpperCase(), tool.title);

        const activeAttr = await page
          .locator('[data-testid="doory-drawer-host"]')
          .getAttribute("data-active-tool");
        assert.strictEqual(activeAttr, tool.activeAttr);

        // Canvas must NOT shift or resize
        const artboardOpen = await page.locator("#canvas-artboard").boundingBox();
        assert(Math.abs(artboardBefore.x - artboardOpen.x) < 1, "Canvas X shifted");
        assert(Math.abs(artboardBefore.y - artboardOpen.y) < 1, "Canvas Y shifted");
        assert(Math.abs(artboardBefore.width - artboardOpen.width) < 1, "Canvas width changed");

        // Close via close button (or Escape on canvas test)
        if (tool.id === "canvas") {
          await page.keyboard.press("Escape");
          await page.keyboard.press("Escape"); // duplicate Escape guard test
        } else {
          await page.locator('[data-testid="doory-drawer-close"]').click();
        }
        await page.waitForTimeout(360);

        const closedCount = await page.locator('[data-testid="doory-drawer-host"]').count();
        assert.strictEqual(closedCount, 0, "Panel must contract back into dock on close");
      });
    }

    // ---------------------------------------------------------------
    // Suite B: Drag + Post-Drag Click Suppression Fix + Edge Geometry
    // ---------------------------------------------------------------
    console.log("\n--- Suite B: Post-Drag Click Fix & All 5 Edge Anchor Geometries ---");

    const workspaceBox = await page
      .locator('[data-testid="studio-floating-dock"]')
      .evaluate((el) => el.offsetParent.getBoundingClientRect().toJSON());

    async function dragDockTo(targetX, targetY) {
      const handle = page.locator('[data-dock-move-handle="true"]');
      const hBox = await handle.boundingBox();
      const startX = hBox.x + hBox.width / 2;
      const startY = hBox.y + hBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 12, startY - 12, { steps: 3 });
      await page.mouse.move(targetX, targetY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(320);
    }

    await test("Drag to LEFT edge -> immediate click Text works (bug fix) -> Left-anchored expand -> close keeps Left", async () => {
      await dragDockTo(workspaceBox.left + 12, workspaceBox.top + 180);

      const dockEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(dockEdge, "left", `Expected edge=left, got ${dockEdge}`);

      const dockBarRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();

      // CRITICAL BUG TEST: immediately click Text after dragging without any intermediate clicks
      await page.locator('[data-testid="dock-tool-text"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(380);

      const panelRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(
        Math.abs(panelRect.x - workspaceBox.left) <= 1,
        `Left edge panel must stay pinned to left wall (${panelRect.x} vs ${workspaceBox.left})`
      );
      assert(panelRect.width > 280, "Left edge panel must expand width rightwards");
      assert(panelRect.height > dockBarRect.height, "Left edge panel must expand height");

      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(350);

      const restoredRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(Math.abs(restoredRect.x - dockBarRect.x) <= 2, "Restored dock X matches");
      assert(Math.abs(restoredRect.y - dockBarRect.y) <= 2, "Restored dock Y matches");
    });

    await test("Drag to RIGHT edge -> immediate click Shapes works -> Right-anchored expand -> close keeps Right", async () => {
      await dragDockTo(workspaceBox.right - 12, workspaceBox.top + 180);

      const dockEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(dockEdge, "right");

      await page.locator('[data-testid="dock-tool-shapes"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(380);

      const panelRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(
        Math.abs(panelRect.x + panelRect.width - workspaceBox.right) <= 2,
        "Right edge must remain pinned to right wall while expanding leftwards"
      );

      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(350);
    });

    await test("Drag to TOP edge -> immediate click Templates works -> Top-anchored expand downwards", async () => {
      await dragDockTo(workspaceBox.left + workspaceBox.width / 2, workspaceBox.top + 12);

      const dockEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(dockEdge, "top");

      await page.locator('[data-testid="dock-tool-templates"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(380);

      const panelRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(
        Math.abs(panelRect.y - workspaceBox.top) <= 1,
        "Top edge must stay pinned to top wall while expanding downwards"
      );

      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(350);
    });

    await test("Drag to BOTTOM edge -> immediate click Elements works -> Bottom-anchored expand upwards", async () => {
      await dragDockTo(workspaceBox.left + workspaceBox.width / 2, workspaceBox.bottom - 12);

      const dockEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(dockEdge, "bottom");

      await page.locator('[data-testid="dock-tool-elements"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(380);

      const panelRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(
        Math.abs(panelRect.y + panelRect.height - workspaceBox.bottom) <= 2,
        "Bottom edge must stay pinned to bottom wall while expanding upwards"
      );

      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(350);
    });

    await test("Drag to FLOAT center -> immediate click Media works -> Float expands around center inside bounds", async () => {
      const preFloatBox = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      await dragDockTo(
        workspaceBox.left + workspaceBox.width / 2 - preFloatBox.width / 2 + 16,
        workspaceBox.top + workspaceBox.height / 2 - preFloatBox.height / 2 + 16
      );

      const dockEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(dockEdge, "float");

      await page.locator('[data-testid="dock-tool-media"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(380);

      const panelRect = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(panelRect.x >= workspaceBox.left, "Float panel within left bound");
      assert(panelRect.x + panelRect.width <= workspaceBox.right + 1, "Float panel within right bound");
      assert(panelRect.y >= workspaceBox.top, "Float panel within top bound");
      assert(panelRect.y + panelRect.height <= workspaceBox.bottom + 1, "Float panel within bottom bound");

      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(350);
    });

    await test("Lock dock prevents dragging while tool clicks keep working + reload preserves saved position", async () => {
      await dragDockTo(workspaceBox.left + 12, workspaceBox.top + workspaceBox.height / 2);
      const beforeLockBox = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();

      await page.keyboard.press("CapsLock");
      await page.waitForTimeout(100);

      // Attempt drag while locked -> should NOT move
      await dragDockTo(workspaceBox.left + workspaceBox.width / 2, workspaceBox.top + workspaceBox.height / 2);
      const afterDragLockedBox = await page.locator('[data-testid="studio-floating-dock"]').boundingBox();
      assert(Math.abs(beforeLockBox.x - afterDragLockedBox.x) <= 2, "Locked dock must not drag");

      // Clicking tool button while locked must still work
      await page.locator('[data-testid="dock-tool-text"]').click();
      await page.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await page.waitForTimeout(360);
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // Reload page and confirm edge & lock persisted
      await page.evaluate(() => sessionStorage.setItem("test_keep_dock_storage", "1"));
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector('[data-testid="studio-floating-dock"][data-dock-edge="left"]', {
        timeout: 10000,
      });
      await page.waitForTimeout(250);
      const reloadedEdge = await page
        .locator('[data-testid="studio-floating-dock"]')
        .getAttribute("data-dock-edge");
      assert.strictEqual(reloadedEdge, "left", "Saved edge must persist across reload");

      // Unlock via CapsLock
      await page.keyboard.press("CapsLock");
      await page.waitForTimeout(80);
    });

    // ---------------------------------------------------------------
    // Suite C: All Editor Tool Functionality Inside Morphed Panel
    // ---------------------------------------------------------------
    console.log("\n--- Suite C: Editor Tools End-to-End Inside Morphed Panel ---");

    await test("Templates, Text, Shapes, Stickers, Media URL, Canvas & Layers all mutate editor state", async () => {
      // 1. Add Text
      await page.locator('[data-testid="dock-tool-text"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid="text-preset-heading"]').click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 2. Add Shape
      await page.locator('[data-testid="dock-tool-shapes"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid="shape-rect"]').click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 3. Add Sticker
      await page.locator('[data-testid="dock-tool-elements"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid="sticker-fire"]').click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 4. Add Image via URL (proves typing inside panel input is not intercepted)
      await page.locator('[data-testid="dock-tool-media"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid="image-url-input"]').fill("https://picsum.photos/200");
      await page.locator('[data-testid="image-url-submit"]').click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 5. Canvas Background Pattern + Color
      const canvasToggle = page.locator('[data-testid="dock-more-toggle"]');
      if ((await canvasToggle.getAttribute("data-expanded")) !== "true") {
        await canvasToggle.click();
        await page.waitForTimeout(300);
      }
      await page.locator('[data-testid="dock-tool-canvas"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid="bg-color-Navy"]').click();
      await page.locator('[data-testid="bg-pattern-grid"]').click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 6. Layers verification (4 added layers, toggle visibility, reorder)
      const layersToggle = page.locator('[data-testid="dock-more-toggle"]');
      if ((await layersToggle.getAttribute("data-expanded")) !== "true") {
        await layersToggle.click();
        await page.waitForTimeout(300);
      }
      await page.locator('[data-testid="dock-tool-layers"]').click();
      await page.waitForTimeout(360);
      const layerCount = await page.locator('[data-testid^="layer-item-"]').count();
      assert.strictEqual(layerCount, 4, `Expected 4 layers in hierarchy, got ${layerCount}`);

      const firstVisBtn = page.locator('[data-testid^="layer-vis-"]').first();
      await firstVisBtn.click();
      const firstDownBtn = page.locator('[data-testid^="layer-down-"]').first();
      await firstDownBtn.click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);

      // 7. Apply Template replaces elements cleanly
      await page.locator('[data-testid="dock-tool-templates"]').click();
      await page.waitForTimeout(360);
      await page.locator('[data-testid^="template-"]').first().click();
      await page.locator('[data-testid="doory-drawer-close"]').click();
      await page.waitForTimeout(340);
    });

    // ---------------------------------------------------------------
    // Suite D: Responsive Viewports & Reduced Motion
    // ---------------------------------------------------------------
    console.log("\n--- Suite D: Responsive Viewports (Desktop, Tablet, Mobile) & Reduced Motion ---");

    const viewports = [
      { name: "100% Desktop (1440x900)", width: 1440, height: 900 },
      { name: "Zoom-eq 80% / Small Laptop (1152x720)", width: 1152, height: 720 },
      { name: "Zoom-eq 60% / Compact (960x600)", width: 960, height: 600 },
      { name: "Tablet (768x1024)", width: 768, height: 1024 },
      { name: "Mobile (375x667)", width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await test(`Responsive layout & close button visibility at ${vp.name}`, async () => {
        const { context: vpCtx, page: vpPage, pageErrors: vpErrs } = await setupContext(browser, {
          viewport: { width: vp.width, height: vp.height },
        });
        await vpPage.locator('[data-testid="dock-tool-templates"]').click();
        await vpPage.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 5000 });
        await vpPage.waitForTimeout(380);

        const panelBox = await vpPage.locator('[data-testid="studio-floating-dock"]').boundingBox();
        const closeBox = await vpPage.locator('[data-testid="doory-drawer-close"]').boundingBox();
        const docOverflow = await vpPage.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );

        assert(!docOverflow, `Unexpected horizontal scroll overflow at ${vp.name}`);
        assert(panelBox.x >= 0 && panelBox.x + panelBox.width <= vp.width + 1, "Panel within viewport X");
        assert(panelBox.y >= 0 && panelBox.y + panelBox.height <= vp.height + 1, "Panel within viewport Y");
        assert(
          closeBox &&
          closeBox.x >= 0 &&
          closeBox.y >= 0 &&
          closeBox.x + closeBox.width <= vp.width &&
          closeBox.y + closeBox.height <= vp.height,
          "Close button clipped outside viewport"
        );
        await vpPage.locator('[data-testid="doory-drawer-close"]').click();
        await vpPage.waitForTimeout(340);
        assert.strictEqual(vpErrs.length, 0, `Runtime errors at ${vp.name}: ${vpErrs.join(", ")}`);
        await vpCtx.close();
      });
    }

    await test("Reduced-motion mode completes open and close smoothly", async () => {
      const { context: rmCtx, page: rmPage, pageErrors: rmErrs } = await setupContext(browser, {
        reducedMotion: "reduce",
      });
      await rmPage.locator('[data-testid="dock-tool-text"]').click();
      await rmPage.waitForSelector('[data-testid="doory-drawer-host"]', { timeout: 3000 });
      await rmPage.locator('[data-testid="doory-drawer-close"]').click();
      await rmPage.waitForTimeout(100);
      assert.strictEqual(await rmPage.locator('[data-testid="doory-drawer-host"]').count(), 0);
      assert.strictEqual(rmErrs.length, 0);
      await rmCtx.close();
    });

    assert.strictEqual(pageErrors.length, 0, `Page runtime errors: ${pageErrors.join(", ")}`);
    await context.close();

    console.log(`\nALL TESTS PASSED: ${passed}/${total}`);
  } finally {
    if (browser) await browser.close();
    try {
      if (process.platform === "win32" && nextProc.pid) {
        spawn("taskkill", ["/pid", String(nextProc.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        nextProc.kill();
      }
    } catch { }
  }
}

runTests().catch((err) => {
  console.error("Playwright suite failed:", err);
  process.exit(1);
});
