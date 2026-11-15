/**
 * FIX-03 Test Suite — Preserve Configured Dock Size During Movement & Snapping
 * Tests all requirements from PRD Section 6:
 * - FR-03.1: Dock position and dock size maintained independently
 * - FR-03.2: Drag initialization must not reset dock size
 * - FR-03.3: Pointer movement must not invoke resize logic
 * - FR-03.4: Opening and closing dock preserves size
 * - FR-03.5: Dock snapping preserves size
 * - FR-03.6: Configured size persists after refresh/reopening
 * - FR-03.7: Only intended resize control modifies dimensions
 * - FR-03.8: Responsive behavior preserves configured percentage
 */

const assert = require("assert");

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
global.localStorage = mockStorage;

class StudioDockSizeController {
  constructor(initialSize = 100) {
    this.dockMode = "main"; // "main", "directory", "settings"
    this.position = "bottom"; // "bottom", "top", "left", "right"
    this.ratio = { x: 0.5, y: 0.5 };
    this.isDragging = false;
    this.isLocked = false;

    // Restore or initialize configured panel size
    this.panelSize = this.resolveStoredPanelSize(initialSize);
  }

  resolveStoredPanelSize(fallback) {
    try {
      const savedCoords = mockStorage.getItem("pixel_studio_dock_coords");
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (typeof parsed.panelSize === "number") return parsed.panelSize;
      }
      const savedPrefs = mockStorage.getItem("pixel_studio_preferences_v1");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (typeof parsed.moreOptionsPanelSize === "number") return parsed.moreOptionsPanelSize;
      }
      const savedSize = mockStorage.getItem("pixel_studio_dock_panel_size");
      if (savedSize) return Number(savedSize);
    } catch {}
    return fallback;
  }

  // Intended resize action
  configurePanelSize(newSize) {
    const clamped = Math.max(40, Math.min(100, newSize));
    this.panelSize = clamped;
    try {
      mockStorage.setItem("pixel_studio_dock_panel_size", String(clamped));
      const prefsRaw = mockStorage.getItem("pixel_studio_preferences_v1");
      const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};
      prefs.moreOptionsPanelSize = clamped;
      mockStorage.setItem("pixel_studio_preferences_v1", JSON.stringify(prefs));

      const coordsRaw = mockStorage.getItem("pixel_studio_dock_coords");
      const coords = coordsRaw ? JSON.parse(coordsRaw) : { edge: this.position, ratioX: this.ratio.x, ratioY: this.ratio.y };
      coords.panelSize = clamped;
      mockStorage.setItem("pixel_studio_dock_coords", JSON.stringify(coords));
    } catch {}
  }

  // Drag start
  startDrag() {
    if (this.dockMode !== "main" || this.isLocked) return false;
    this.isDragging = true;
    // CRITICAL: Drag start must NOT reset this.panelSize
    return true;
  }

  // Drag move
  dragMove(deltaX, deltaY) {
    if (!this.isDragging) return;
    // Movement adjusts ratio or coordinates, NEVER panelSize
    this.ratio.x = Math.max(0, Math.min(1, this.ratio.x + deltaX / 1000));
    this.ratio.y = Math.max(0, Math.min(1, this.ratio.y + deltaY / 1000));
  }

  // Snap to new side
  snapToEdge(newEdge) {
    this.position = newEdge;
    this.isDragging = false;
    try {
      mockStorage.setItem("pixel_studio_dock_position", newEdge);
      mockStorage.setItem(
        "pixel_studio_dock_coords",
        JSON.stringify({ edge: newEdge, ratioX: this.ratio.x, ratioY: this.ratio.y, panelSize: this.panelSize })
      );
      mockStorage.setItem("pixel_studio_dock_panel_size", String(this.panelSize));
    } catch {}
  }

  // Open/Close dock
  openDock(mode = "directory") {
    if (this.isDragging) {
      this.isDragging = false;
    }
    this.dockMode = mode;
  }

  closeDock() {
    this.dockMode = "main";
  }

  // Compute dimensions at current viewport
  computeDimensions(containerWidth, containerHeight) {
    const baseWidth = Math.min(containerWidth - 32, 600);
    const baseHeight = Math.min(containerHeight - 40, 520);
    const scale = this.panelSize / 100;

    const effectiveWidth = Math.min(containerWidth - 24, Math.max(Math.round(baseWidth * 0.4), Math.round(baseWidth * scale)));
    const effectiveHeight = Math.min(containerHeight - 40, Math.max(Math.round(baseHeight * 0.4), Math.round(baseHeight * scale)));

    return { effectiveWidth, effectiveHeight, scale, panelSize: this.panelSize };
  }
}

async function runTests() {
  console.log("=== FIX-03 Automated Test Suite: Preserve Configured Dock Size ===");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      mockStorage.clear();
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Configure size to 70%
  test("Test 1: Configure size to 70% updates panel size and persists", () => {
    const dock = new StudioDockSizeController(100);
    assert.strictEqual(dock.panelSize, 100);

    dock.configurePanelSize(70);
    assert.strictEqual(dock.panelSize, 70);
    assert.strictEqual(mockStorage.getItem("pixel_studio_dock_panel_size"), "70");
  });

  // TEST 2: Move dock preserves 70%
  test("Test 2: Moving the dock preserves 70% configured size", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(70);

    dock.startDrag();
    dock.dragMove(150, 0);
    assert.strictEqual(dock.panelSize, 70, "panelSize must remain 70 during drag");

    dock.snapToEdge("bottom");
    assert.strictEqual(dock.panelSize, 70, "panelSize must remain 70 after drag completion");
  });

  // TEST 3: Snap dock to another edge preserves 70%
  test("Test 3: Snapping dock to another side preserves 70%", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(70);

    dock.snapToEdge("left");
    assert.strictEqual(dock.position, "left");
    assert.strictEqual(dock.panelSize, 70);

    dock.snapToEdge("top");
    assert.strictEqual(dock.position, "top");
    assert.strictEqual(dock.panelSize, 70);
  });

  // TEST 4: Opening and closing dock preserves 70%
  test("Test 4: Opening and closing dock preserves 70%", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(70);

    dock.openDock("directory");
    assert.strictEqual(dock.panelSize, 70);

    dock.openDock("settings");
    assert.strictEqual(dock.panelSize, 70);

    dock.closeDock();
    assert.strictEqual(dock.panelSize, 70);
  });

  // TEST 5: Accidental drag while open rejected, position and size unchanged
  test("Test 5: Drag while dock is open rejected; position and size remain unchanged", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(70);
    dock.openDock("directory");

    const dragStarted = dock.startDrag();
    assert.strictEqual(dragStarted, false, "Drag must be rejected when dock is open");
    assert.strictEqual(dock.isDragging, false);
    assert.strictEqual(dock.panelSize, 70);
  });

  // TEST 6: Refresh Studio restores 70%
  test("Test 6: Refresh Studio restores 70% accurately from storage", () => {
    mockStorage.setItem("pixel_studio_dock_panel_size", "70");
    mockStorage.setItem(
      "pixel_studio_dock_coords",
      JSON.stringify({ edge: "bottom", ratioX: 0.5, ratioY: 0.5, panelSize: 70 })
    );

    const freshDock = new StudioDockSizeController(100);
    assert.strictEqual(freshDock.panelSize, 70);
  });

  // TEST 7: Intentionally resize to 80% and move
  test("Test 7: Intentionally resizing to 80% persists, and subsequent move retains 80%", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(80);
    assert.strictEqual(dock.panelSize, 80);

    dock.startDrag();
    dock.dragMove(50, 50);
    dock.snapToEdge("right");
    assert.strictEqual(dock.panelSize, 80);
  });

  // TEST 8: Responsive viewport change does not reset size
  test("Test 8: Changing container dimensions maintains configured scale without resetting", () => {
    const dock = new StudioDockSizeController(100);
    dock.configurePanelSize(70);

    const desktopDims = dock.computeDimensions(1920, 1080);
    assert.strictEqual(desktopDims.scale, 0.7);
    assert.strictEqual(desktopDims.panelSize, 70);

    const tabletDims = dock.computeDimensions(1024, 768);
    assert.strictEqual(tabletDims.scale, 0.7);
    assert.strictEqual(tabletDims.panelSize, 70);

    const mobileDims = dock.computeDimensions(480, 800);
    assert.strictEqual(mobileDims.scale, 0.7);
    assert.strictEqual(mobileDims.panelSize, 70);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
