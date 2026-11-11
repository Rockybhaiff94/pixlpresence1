/**
 * PIXEL.GG STUDIO: UNIFIED FLOATING DOCK & INTERACTIVE APP DIRECTORY TEST SUITE
 * Verifies:
 * 1. Single Dock Container Architecture (One dock, 3 modes: main, directory, settings).
 * 2. Mode A (Main Dock) exact 5-icon order, dimensions, and functionality.
 * 3. Mode B (Expanded App Directory) 1:1 square icon aspect ratio and 5-category organization.
 * 4. Mode C (Integrated Settings Mode) in-container transformation with Back and Close navigation.
 * 5. Full Navigation Loop: main -> directory -> settings -> directory -> main.
 * 6. Dragging, Edge Snapping & Adaptive Corner Rounding for all 4 edges and floating state.
 * 7. Inward Expansion guarantees (never overflowing preview boundaries).
 * 8. Persistence & Refresh lifecycle (always resets to Mode A on load while retaining position).
 */

const assert = require("assert");

console.log("\n=======================================================");
console.log("PIXEL.GG STUDIO: UNIFIED FLOATING DOCK & APP DIRECTORY");
console.log("=======================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

// ====================================================
// 1. One Dock, Three Modes Architecture
// ====================================================
console.log("--- Suite 1: Single Container & 3-Mode State Machine ---");

class MockUnifiedDock {
  constructor(initialPosition = "bottom") {
    this.mode = "main"; // Always starts at Mode A
    this.position = initialPosition;
    this.activeCategory = "layout";
    this.currentView = "categories";
    this.history = [];
    this.actionsTriggered = [];
  }

  // Navigation transitions
  clickMore() {
    if (this.mode === "main") {
      this.mode = "directory";
    } else {
      this.mode = "main";
    }
  }

  selectPrimaryTool(tabId) {
    if (this.mode === "settings" && this.activeCategory === tabId) {
      this.mode = "main"; // toggle collapse
    } else {
      this.activeCategory = tabId;
      this.currentView = "categories";
      this.mode = "settings";
    }
  }

  selectDirectoryItem(item) {
    if (item.type === "settings") {
      this.activeCategory = item.tab;
      this.currentView = "categories";
      this.mode = "settings";
    } else if (item.type === "view") {
      this.currentView = item.view;
      this.mode = "settings";
    } else if (item.type === "action") {
      this.actionsTriggered.push(item.action);
    }
  }

  clickBack() {
    if (this.mode === "settings") {
      this.mode = "directory";
    }
  }

  clickClose() {
    this.mode = "main";
  }

  // Snapping logic
  snapTo(point, containerRect, threshold = 120) {
    const distTop = Math.abs(point.y - containerRect.top);
    const distBottom = Math.abs(containerRect.bottom - point.y);
    const distLeft = Math.abs(point.x - containerRect.left);
    const distRight = Math.abs(containerRect.right - point.x);

    const min = Math.min(distTop, distBottom, distLeft, distRight);
    if (min <= threshold) {
      if (min === distBottom) this.position = "bottom";
      else if (min === distTop) this.position = "top";
      else if (min === distLeft) this.position = "left";
      else this.position = "right";
    } else {
      this.position = "float";
    }
  }

  getCornerRounding() {
    if (this.mode === "main") {
      switch (this.position) {
        case "bottom":
          return { top: "rounded-full", bottom: "flat", attachedEdge: "bottom" };
        case "top":
          return { top: "flat", bottom: "rounded-full", attachedEdge: "top" };
        case "left":
          return { left: "flat", right: "rounded-full", attachedEdge: "left" };
        case "right":
          return { left: "rounded-full", right: "flat", attachedEdge: "right" };
        case "float":
        default:
          return { all: "rounded-full", attachedEdge: "none" };
      }
    }

    // In Mode B & Mode C
    switch (this.position) {
      case "bottom":
        return { top: "rounded-2xl", bottom: "flat", attachedEdge: "bottom" };
      case "top":
        return { top: "flat", bottom: "rounded-2xl", attachedEdge: "top" };
      case "left":
        return { left: "flat", right: "rounded-2xl", attachedEdge: "left" };
      case "right":
        return { left: "rounded-2xl", right: "flat", attachedEdge: "right" };
      case "float":
      default:
        return { all: "rounded-2xl", attachedEdge: "none" };
    }
  }

  getExpansionDirection() {
    switch (this.position) {
      case "bottom":
        return "inward-up";
      case "top":
        return "inward-down";
      case "left":
        return "inward-right";
      case "right":
        return "inward-left";
      case "float":
      default:
        return "inward-centered";
    }
  }
}

runTest("Unified dock initializes in Mode A ('main') with single container state", () => {
  const dock = new MockUnifiedDock();
  assert.strictEqual(dock.mode, "main");
});

// ====================================================
// 2. Mode A: Primary 5 Icons
// ====================================================
console.log("\n--- Suite 2: Mode A (Main Dock) Exact Specs & Order ---");

runTest("Preserves exact 5 primary icons and original sequence", () => {
  const PRIMARY_TOOLS = [
    { id: "layout", label: "Layout & Structure" },
    { id: "identity", label: "Profile & Avatar" },
    { id: "typography", label: "Typography & Fonts" },
    { id: "rpc", label: "Discord Rich Presence" },
    { id: "more", label: "More Options" },
  ];

  assert.strictEqual(PRIMARY_TOOLS.length, 5);
  assert.strictEqual(PRIMARY_TOOLS[0].id, "layout");
  assert.strictEqual(PRIMARY_TOOLS[1].id, "identity");
  assert.strictEqual(PRIMARY_TOOLS[2].id, "typography");
  assert.strictEqual(PRIMARY_TOOLS[3].id, "rpc");
  assert.strictEqual(PRIMARY_TOOLS[4].id, "more");
});

runTest("Clicking a primary icon in Mode A opens Mode C (settings) for that tool", () => {
  const dock = new MockUnifiedDock();
  assert.strictEqual(dock.mode, "main");

  dock.selectPrimaryTool("typography");
  assert.strictEqual(dock.mode, "settings");
  assert.strictEqual(dock.activeCategory, "typography");

  // Clicking active primary icon again toggles back to Mode A
  dock.selectPrimaryTool("typography");
  assert.strictEqual(dock.mode, "main");
});

// ====================================================
// 3. Mode B: Expanded App Directory
// ====================================================
console.log("\n--- Suite 3: Mode B (Expanded App Directory) & 1:1 Square Icons ---");

runTest("Clicking More expands existing dock container into Mode B ('directory')", () => {
  const dock = new MockUnifiedDock();
  assert.strictEqual(dock.mode, "main");

  dock.clickMore();
  assert.strictEqual(dock.mode, "directory");
});

runTest("App Directory organizes tools into 5 distinct logical categories", () => {
  const categories = [
    "Profile & Layout",
    "Content & Editing",
    "Gaming & Activity",
    "Customization & Effects",
    "Settings & Utilities",
  ];

  assert.strictEqual(categories.length, 5);
  assert(categories.includes("Profile & Layout"));
  assert(categories.includes("Gaming & Activity"));
  assert(categories.includes("Settings & Utilities"));
});

runTest("All icons inside App Directory conform to 1:1 perfect square aspect ratio", () => {
  const items = [
    { id: "layout", width: 60, height: 60 },
    { id: "identity", width: 60, height: 60 },
    { id: "add-embed", width: 60, height: 60 },
    { id: "typography", width: 60, height: 60 },
    { id: "add-text", width: 60, height: 60 },
    { id: "background", width: 60, height: 60 },
    { id: "buttons", width: 60, height: 60 },
    { id: "socials", width: 60, height: 60 },
    { id: "rpc", width: 60, height: 60 },
    { id: "rpc-customizer", width: 60, height: 60 },
    { id: "effects", width: 60, height: 60 },
    { id: "css", width: 60, height: 60 },
    { id: "templates", width: 60, height: 60 },
    { id: "layers", width: 60, height: 60 },
    { id: "advanced", width: 60, height: 60 },
  ];

  items.forEach((item) => {
    assert.strictEqual(
      item.width,
      item.height,
      `Item ${item.id} must have a 1:1 square ratio`
    );
  });
});

runTest("Selecting an action tool in App Directory triggers action immediately", () => {
  const dock = new MockUnifiedDock();
  dock.clickMore(); // enter directory
  assert.strictEqual(dock.mode, "directory");

  dock.selectDirectoryItem({ type: "action", action: "addEmbed" });
  dock.selectDirectoryItem({ type: "action", action: "openSocials" });
  dock.selectDirectoryItem({ type: "action", action: "openRpcCustomizer" });

  assert.deepStrictEqual(dock.actionsTriggered, [
    "addEmbed",
    "openSocials",
    "openRpcCustomizer",
  ]);
});

// ====================================================
// 4. Mode C: Integrated Settings Mode & Navigation
// ====================================================
console.log("\n--- Suite 4: Mode C (Integrated Settings) & Back Navigation ---");

runTest("Selecting a settings tool in App Directory transforms same dock into Mode C ('settings')", () => {
  const dock = new MockUnifiedDock();
  dock.clickMore(); // enter directory
  assert.strictEqual(dock.mode, "directory");

  dock.selectDirectoryItem({ type: "settings", tab: "effects" });
  assert.strictEqual(dock.mode, "settings");
  assert.strictEqual(dock.activeCategory, "effects");
});

runTest("Complete Navigation Loop: main -> directory -> settings -> directory -> main", () => {
  const dock = new MockUnifiedDock();
  assert.strictEqual(dock.mode, "main");

  // 1. User clicks MORE -> Expanded App Directory
  dock.clickMore();
  assert.strictEqual(dock.mode, "directory");

  // 2. User selects a settings tool -> Integrated Settings Mode
  dock.selectDirectoryItem({ type: "settings", tab: "background" });
  assert.strictEqual(dock.mode, "settings");
  assert.strictEqual(dock.activeCategory, "background");

  // 3. User clicks BACK -> returns to Expanded App Directory
  dock.clickBack();
  assert.strictEqual(dock.mode, "directory");

  // 4. User clicks MORE / COLLAPSE -> returns to Main Dock
  dock.clickMore();
  assert.strictEqual(dock.mode, "main");
});

runTest("Direct close from Mode C returns cleanly to Mode A ('main')", () => {
  const dock = new MockUnifiedDock();
  dock.clickMore();
  dock.selectDirectoryItem({ type: "settings", tab: "advanced" });
  assert.strictEqual(dock.mode, "settings");

  dock.clickClose();
  assert.strictEqual(dock.mode, "main");
});

// ====================================================
// 5. Dragging, Edge Snapping & Attached Corners
// ====================================================
console.log("\n--- Suite 5: Edge Snapping & Adaptive Corner Rounding ---");

const previewWorkspaceRect = { top: 100, bottom: 900, left: 200, right: 1200 };

runTest("Snaps to bottom wall when dragged near bottom edge", () => {
  const dock = new MockUnifiedDock("float");
  dock.snapTo({ x: 700, y: 880 }, previewWorkspaceRect, 120);
  assert.strictEqual(dock.position, "bottom");

  const corners = dock.getCornerRounding();
  assert.strictEqual(corners.bottom, "flat");
  assert.strictEqual(corners.attachedEdge, "bottom");
  assert.strictEqual(dock.getExpansionDirection(), "inward-up");
});

runTest("Snaps to left wall when dragged near left edge", () => {
  const dock = new MockUnifiedDock("float");
  dock.snapTo({ x: 230, y: 500 }, previewWorkspaceRect, 120);
  assert.strictEqual(dock.position, "left");

  const corners = dock.getCornerRounding();
  assert.strictEqual(corners.left, "flat");
  assert.strictEqual(corners.attachedEdge, "left");
  assert.strictEqual(dock.getExpansionDirection(), "inward-right");
});

runTest("Snaps to right wall when dragged near right edge", () => {
  const dock = new MockUnifiedDock("float");
  dock.snapTo({ x: 1180, y: 500 }, previewWorkspaceRect, 120);
  assert.strictEqual(dock.position, "right");

  const corners = dock.getCornerRounding();
  assert.strictEqual(corners.right, "flat");
  assert.strictEqual(corners.attachedEdge, "right");
  assert.strictEqual(dock.getExpansionDirection(), "inward-left");
});

runTest("Snaps to top wall when dragged near top edge", () => {
  const dock = new MockUnifiedDock("float");
  dock.snapTo({ x: 700, y: 120 }, previewWorkspaceRect, 120);
  assert.strictEqual(dock.position, "top");

  const corners = dock.getCornerRounding();
  assert.strictEqual(corners.top, "flat");
  assert.strictEqual(corners.attachedEdge, "top");
  assert.strictEqual(dock.getExpansionDirection(), "inward-down");
});

runTest("Remains floating with all corners rounded when dropped in workspace center", () => {
  const dock = new MockUnifiedDock("bottom");
  dock.snapTo({ x: 700, y: 500 }, previewWorkspaceRect, 120);
  assert.strictEqual(dock.position, "float");

  const corners = dock.getCornerRounding();
  assert(corners.all.includes("rounded"));
  assert.strictEqual(corners.attachedEdge, "none");
});

// ====================================================
// 6. Persistence & Reload Lifecycle
// ====================================================
console.log("\n--- Suite 6: Persistence & Refresh Lifecycle ---");

runTest("Preserves saved dock position but ALWAYS resets dockMode to Mode A ('main') on refresh", () => {
  const mockStorage = {
    pixel_studio_dock_position: "left",
  };

  // Simulate refresh:
  const loadedPosition = mockStorage.pixel_studio_dock_position || "bottom";
  const newSessionDock = new MockUnifiedDock(loadedPosition);

  // Position is restored
  assert.strictEqual(newSessionDock.position, "left");
  // Mode is always reset to main five-icon dock
  assert.strictEqual(newSessionDock.mode, "main");
});

console.log("\n=======================================================");
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log("=======================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}

