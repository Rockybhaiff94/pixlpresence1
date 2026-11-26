/**
 * PIXEL.GG STUDIO — 3-STATE COMPONENT DOCK & ELEMENTS PANEL E2E SUITE
 * Verifies:
 *   1. Default State 1 (Normal Dock): 5 primary icons + bottom expand chevron, vertical 44px shell
 *   2. State 2 (Expanded Dock): all 17 icons in 8 / 7 / 2 categorized groups with 2 dividers, bottom collapse, right-edge arrow
 *   3. State 3 (Elements Panel): dock hides cleanly, panel shows "Elements" + X + search + 17 named items
 *   4. Close panel (X) restores State 2 (Expanded Dock) at the exact preserved drag position
 *   5. Dragging, snapping, CapsLock/click lock, short viewport scrolling, and reducedMotion compatibility
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3108;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WEB_DIR = path.resolve(__dirname, "../apps/web");

const EXPECTED_PRIMARY = [
  "profile-image",
  "subtitle",
  "description",
  "badges-group",
  "social-group",
];

const EXPECTED_ALL_17 = [
  // Profile Components (9)
  "profile-image",
  "name-text",
  "subtitle",
  "description",
  "badges-group",
  "social-group",
  "heart-like",
  "music-display",
  "custom-rpc",
  // Layout & Content (7)
  "embed",
  "nested-embed",
  "banner-image",
  "image",
  "image-gallery",
  "separator",
  "group-section",
  // Advanced (2)
  "background",
  "custom-component",
];

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
            bio: "Testing 3-state dock",
            views: 42,
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
    localStorage.setItem("pixel_app_token", "test_token_dock");
    localStorage.removeItem("pixel_profile_builder_draft_v2");
    localStorage.removeItem("pixel_studio_dock_position");
    localStorage.removeItem("pixel_studio_dock_coords");
    localStorage.removeItem("pixel_studio_dock_orientation");
    localStorage.removeItem("pixel_studio_dock_locked");
  });

  return { context, page, pageErrors };
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
    console.log("[2/5] Launching headless Chromium...");
    browser = await chromium.launch({ headless: true });

    // SUITE 1: 3-State Transitions & Component Ordering (Desktop 1440x900)
    console.log("[3/5] Running Suite 1 (State 1 -> State 2 -> State 3 -> State 2 + Collapse)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });

      const dock = page.getByTestId("studio-floating-dock");
      assert.strictEqual(await dock.getAttribute("data-dock-view"), "normal");
      assert.strictEqual(await dock.getAttribute("data-dock-edge"), "left");
      assert.strictEqual(await page.getByTestId("builder-add-element-panel").count(), 0);

      // Verify State 1 box width ~44px and exact 5 primary shortcuts (icons only)
      const normalBox = await dock.boundingBox();
      assert(Math.abs(normalBox.width - 44) <= 2, `Expected dock width ~44, got ${normalBox.width}`);
      const primaryButtons = page.locator('[data-testid="dock-primary-shortcuts"] > button');
      assert.strictEqual(await primaryButtons.count(), 5);
      for (let i = 0; i < EXPECTED_PRIMARY.length; i++) {
        const testId = await primaryButtons.nth(i).getAttribute("data-testid");
        assert.strictEqual(testId, `dock-component-${EXPECTED_PRIMARY[i]}`);
        const text = (await primaryButtons.nth(i).innerText()).trim();
        assert.strictEqual(text, "", `State 1 dock icon ${testId} should not render label text`);
      }

      // Clicking a primary shortcut inserts a component into canvas cleanly
      const beforeNamesCount = await page.locator('[data-node-type="subtitle"]').count();
      await page.getByTestId("dock-component-subtitle").click();
      await page.waitForTimeout(100);
      assert.strictEqual(
        await page.locator('[data-node-type="subtitle"]').count(),
        beforeNamesCount + 1,
        "Clicking Subtitle shortcut in Normal Dock must insert subtitle"
      );

      // Transition 1: Normal -> Expanded Dock (Vertical, 17 icons + 2 separators + side > arrow)
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-expanded-components-list"]', { timeout: 3000 });
      await page.waitForTimeout(280);
      assert.strictEqual(await dock.getAttribute("data-dock-view"), "expanded-dock");

      const expandedBox = await dock.boundingBox();
      assert(Math.abs(expandedBox.width - 44) <= 2, `Expanded width must stay ~44, got ${expandedBox.width}`);
      assert(expandedBox.height > normalBox.height + 150, "Expanded dock must expand vertically");
      assert(expandedBox.y >= 0 && expandedBox.y + expandedBox.height <= 900, "Must fit inside viewport");

      const expandedButtons = page.locator('[data-testid="dock-expanded-components-list"] > button');
      assert.strictEqual(await expandedButtons.count(), EXPECTED_ALL_17.length);
      for (let i = 0; i < EXPECTED_ALL_17.length; i++) {
        const testId = await expandedButtons.nth(i).getAttribute("data-testid");
        assert.strictEqual(testId, `dock-component-${EXPECTED_ALL_17[i]}`);
        const text = (await expandedButtons.nth(i).innerText()).trim();
        assert.strictEqual(text, "", `Expanded dock icon ${testId} should render icon only`);
      }

      assert.strictEqual(await page.getByTestId("dock-group-separator-layout").count(), 1);
      assert.strictEqual(await page.getByTestId("dock-group-separator-advanced").count(), 1);
      assert.strictEqual(await page.getByTestId("dock-open-elements-panel").isVisible(), true);

      // Collapse back to State 1 -> verify restored 5 primary shortcuts
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-primary-shortcuts"]', { timeout: 3000 });
      await page.waitForTimeout(280);
      assert.strictEqual(await dock.getAttribute("data-dock-view"), "normal");

      // Expand again -> click Side Arrow -> State 3 (Elements Panel)
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 3000 });
      await page.getByTestId("dock-open-elements-panel").click();
      await page.waitForSelector('[data-testid="builder-add-element-panel"]', { timeout: 4000 });
      await page.waitForTimeout(260);

      // Mutual exclusion: dock MUST NOT be visible while Elements Panel is open
      assert.strictEqual(await page.getByTestId("studio-floating-dock").count(), 0);
      const panelText = await page.getByTestId("builder-add-element-panel").innerText();
      assert(panelText.includes("Elements"), "State 3 header must read Elements");
      assert(panelText.includes("Profile Components"), "Must include Profile Components group");
      assert(panelText.includes("Layout & Content"), "Must include Layout & Content group");
      assert(panelText.includes("Advanced"), "Must include Advanced group");
      assert(panelText.includes("Custom Components"), "Must show Custom Components item");
      assert.strictEqual(
        await page.locator('[data-testid="builder-add-element-panel"] [data-testid^="library-add-"]').count(),
        EXPECTED_ALL_17.length
      );

      // Close Elements Panel (X) -> MUST restore State 2 (Expanded Dock), NOT collapse back to Normal Dock
      await page.getByTestId("elements-panel-close").click();
      await page.waitForSelector('[data-testid="dock-expanded-components-list"]', { timeout: 4000 });
      await page.waitForTimeout(260);
      assert.strictEqual(await page.getByTestId("builder-add-element-panel").count(), 0);
      assert.strictEqual(await page.getByTestId("studio-floating-dock").getAttribute("data-dock-view"), "expanded-dock");

      assert.strictEqual(pageErrors.length, 0, `Suite 1 pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 1 passed");
    }

    // SUITE 2: Dragging, Lock + CapsLock, Preserved Position across State 3 Round-Trip
    console.log("[4/5] Running Suite 2 (Drag, Lock/CapsLock, Preserved Position Round-Trip)...");
    {
      const { context, page, pageErrors } = await setupContext(browser);
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });

      const dock = page.getByTestId("studio-floating-dock");
      const handle = dock.locator('[data-dock-move-handle="true"]');
      const hBox = await handle.boundingBox();

      // Drag dock into floating center area (beyond left snapThreshold 175px)
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(hBox.x + 260, hBox.y + 40, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(260);

      assert.strictEqual(await dock.getAttribute("data-dock-edge"), "float");
      const draggedBox = await dock.boundingBox();
      assert(draggedBox.x > 400, `Expected dock dragged into workspace, x=${draggedBox.x}`);

      // Test CapsLock lock toggle -> dragging while locked MUST NOT move dock
      await page.keyboard.press("CapsLock");
      await page.waitForTimeout(80);
      assert.strictEqual(await handle.getAttribute("aria-pressed"), "true");
      const hBoxLocked = await handle.boundingBox();
      await page.mouse.move(hBoxLocked.x + hBoxLocked.width / 2, hBoxLocked.y + hBoxLocked.height / 2);
      await page.mouse.down();
      await page.mouse.move(hBoxLocked.x + 120, hBoxLocked.y + 80, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const afterLockedBox = await dock.boundingBox();
      assert(Math.abs(afterLockedBox.x - draggedBox.x) <= 2, "Locked dock must not drag");

      // Expand -> Open Elements Panel -> Close Panel -> Dock MUST return to same float X & Expanded state!
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 3000 });
      await page.getByTestId("dock-open-elements-panel").click();
      await page.waitForSelector('[data-testid="elements-panel-close"]', { timeout: 3000 });
      await page.waitForTimeout(260);

      await page.getByTestId("elements-panel-close").click();
      await page.waitForSelector('[data-testid="dock-expanded-components-list"]', { timeout: 3000 });
      await page.waitForTimeout(280);

      const restoredDock = page.getByTestId("studio-floating-dock");
      assert.strictEqual(await restoredDock.getAttribute("data-dock-view"), "expanded-dock");
      assert.strictEqual(await restoredDock.getAttribute("data-dock-edge"), "float");
      const restoredBox = await restoredDock.boundingBox();
      assert(
        Math.abs(restoredBox.x - draggedBox.x) <= 5,
        `Expected dock X preserved (~${draggedBox.x}), got ${restoredBox.x}`
      );

      assert.strictEqual(pageErrors.length, 0, `Suite 2 pageErrors: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("   ✓ Suite 2 passed");
    }

    // SUITE 3: Responsive Short Viewport Scrolling & Reduced Motion
    console.log("[5/5] Running Suite 3 (Tablet/Mobile Clamping, Scrollable Expanded List & Reduced Motion)...");
    {
      for (const cfg of [
        { name: "short-desktop", viewport: { width: 1280, height: 520 }, reducedMotion: "no-preference" },
        { name: "tablet", viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" },
        { name: "mobile", viewport: { width: 375, height: 667 }, reducedMotion: "no-preference" },
      ]) {
        const { context, page, pageErrors } = await setupContext(browser, cfg);
        await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="studio-floating-dock"]', { timeout: 15000 });

        await page.getByTestId("dock-more-toggle").click();
        await page.waitForSelector('[data-testid="dock-expanded-components-list"]', { timeout: 3000 });
        await page.waitForTimeout(260);

        const dockBox = await page.getByTestId("studio-floating-dock").boundingBox();
        const collapseBtnBox = await page.getByTestId("dock-more-toggle").boundingBox();
        assert(
          dockBox.y >= 0 && dockBox.y + dockBox.height <= cfg.viewport.height + 1,
          `[${cfg.name}] Expanded dock exceeded viewport height (${dockBox.y + dockBox.height} > ${cfg.viewport.height})`
        );
        assert(
          collapseBtnBox.y + collapseBtnBox.height <= cfg.viewport.height,
          `[${cfg.name}] Collapse button clipped below viewport`
        );

        await page.getByTestId("dock-open-elements-panel").click();
        await page.waitForSelector('[data-testid="builder-add-element-panel"]', { timeout: 3000 });
        await page.getByTestId("studio-floating-dock").waitFor({ state: "detached", timeout: 2000 });
        assert.strictEqual(await page.getByTestId("studio-floating-dock").count(), 0);

        await page.getByTestId("elements-panel-close").click();
        await page.waitForSelector('[data-testid="dock-expanded-components-list"]', { timeout: 3000 });
        assert.strictEqual(pageErrors.length, 0, `[${cfg.name}] pageErrors: ${pageErrors.join("; ")}`);
        await context.close();
      }
      console.log("   ✓ Suite 3 passed");
    }

    console.log("\nALL 3-STATE COMPONENT DOCK & ELEMENTS PANEL TESTS PASSED.");
  } finally {
    if (browser) await browser.close();
    if (serverProc && serverProc.pid) {
      if (process.platform === "win32") {
        try {
          require("child_process").execSync(`taskkill /F /PID ${serverProc.pid} /T`, { stdio: "ignore" });
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
  console.error("TEST FAILURE:", err);
  process.exit(1);
});
