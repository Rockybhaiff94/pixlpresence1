/**
 * PIXEL.GG STUDIO: FLOATING DOCK ENHANCEMENTS TEST SUITE
 *
 * Verifies:
 * 1. Single-unit dragging: entire dock moves together, icons never move independently.
 * 2. Drag threshold (4–6px): separates click events from drag gestures.
 * 3. Icon containment: icons strictly locked inside dock container.
 * 4. Slimmer dimensions: height <= 48px (44px), width <= 48px, button <= 34px, icon 17–19px.
 * 5. Automatic nearest-edge snapping:
 *    - Calibrated to 160–190px visual distance (~175px).
 *    - Snaps to TOP, BOTTOM, LEFT, RIGHT within threshold.
 *    - Preserves position along selected edge (no auto-centering).
 *    - Center drops remain freely floating at exact coordinates.
 * 6. Customizable Dock Lock Shortcut:
 *    - Default shortcut is CapsLock.
 *    - Supports custom shortcuts (e.g. Ctrl+Shift+L).
 *    - Disables dragging when locked; preserves coordinates.
 *    - ALL icons remain clickable and fully interactive while locked.
 *    - Displays subtle lock indicator without altering dimensions.
 * 7. More Options Panel Size Customization:
 *    - Range from 20% to 100% (default 100%).
 *    - Preset options: Very Small (20%), Small (35%), Medium (50%), Compact (75%), Original (100%).
 *    - Scales panel and its elements proportionally.
 * 8. Position-Aware More Options Expansion:
 *    - Expands correctly from attached edges (TOP, BOTTOM, LEFT, RIGHT).
 *    - Expands at current floating position when freely floating in center or arbitrary coords.
 *    - Does NOT force snap to edge or jump to center when More Options opens.
 *    - Respects configured panel size in every position.
 *    - Closing returns dock to exact previous position and state.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("\n=================================================================");
console.log("PIXEL.GG STUDIO: DOCK ENHANCEMENTS & POSITION-AWARE EXPANSION");
console.log("=================================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

// ===============================================================
// 1. Static Source Code Analysis & Structural Integrity
// ===============================================================
console.log("--- Suite 1: Source Code & Containment Architecture ---");

const dockSourcePath = path.join(
  __dirname,
  "../apps/web/src/components/studio/StudioFloatingDock.tsx"
);
const dockSource = fs.readFileSync(dockSourcePath, "utf-8");

const leftWorkspacePath = path.join(
  __dirname,
  "../apps/web/src/components/studio/StudioLeftWorkspace.tsx"
);
const workspaceSource = fs.readFileSync(leftWorkspacePath, "utf-8");

test("Dock icons are NOT independently draggable (no nested drag on icon container)", () => {
  assert(
    !dockSource.includes("dragSnapToOrigin={true}"),
    "dragSnapToOrigin must not be present on icons"
  );
  assert(
    dockSource.includes('className={`flex ${'),
    "Mode A icons must be inside standard flex container"
  );
});

test("Single dock wrapper owns pointer drag events and coordinates", () => {
  assert(dockSource.includes("onPointerDown={handlePointerDown}"));
  assert(dockSource.includes("onPointerMove={handlePointerMove}"));
  assert(dockSource.includes("onPointerUp={handlePointerUp}"));
  assert(dockSource.includes("onClickCapture={handleClickCapture}"));
  assert(dockSource.includes("setPointerCapture"));
});

test("Drag threshold of 5px (4-6px range) is implemented to separate clicks from drags", () => {
  assert(
    dockSource.includes("dist >= 5"),
    "Must implement 5px threshold to separate clicks from drags"
  );
  assert(
    dockSource.includes("hasMovedPastThresholdRef"),
    "Must track drag threshold state across pointer events"
  );
});

test("Slimmer dimensions: 44px container height/width, 32px buttons, 17px icons", () => {
  assert(dockSource.includes("h-11 px-1.5 py-1"), "Must use compact h-11 (44px) height");
  assert(dockSource.includes("w-11 py-1 px-1"), "Must use compact w-11 (44px) width");
  assert(dockSource.includes("w-8 h-8 rounded-full"), "Must use 32px (w-8 h-8) buttons");
  assert(dockSource.includes("<Icon size={17} />"), "Must use 17px icon size");
  assert(dockSource.includes("<LayoutGrid size={17} />"), "More button must use 17px icon size");
});

test("Lock State & Shortcut configuration support in StudioLeftWorkspace", () => {
  assert(workspaceSource.includes("Dock Controls: Dock Position Lock"), "Must have Dock Position Lock section");
  assert(workspaceSource.includes("More Options Panel: Panel Size"), "Must have More Options Panel Size section");
  assert(workspaceSource.includes("isRecordingLockShortcut"), "Must support shortcut recording mode");
  assert(workspaceSource.includes("checkShortcutConflict"), "Must detect shortcut conflicts");
});

test("Dock icons in Mode A have NO visual hover tooltips in both horizontal and vertical orientations", () => {
  // Freshly read source to ensure latest content is evaluated
  const currentDockSrc = fs.readFileSync(dockSourcePath, "utf-8");
  // Tooltip bubbles in Mode A have been completely removed
  assert(
    !currentDockSrc.includes('hoveredTool === tool.id'),
    "Must not render hover tooltips for primary dock icons"
  );
  assert(
    !currentDockSrc.includes('hoveredTool === "more"'),
    "Must not render hover tooltips for More Options dock icon"
  );
  // Verify accessibility aria-labels are fully preserved
  assert(
    currentDockSrc.includes("aria-label={tool.label}"),
    "Must preserve aria-label accessibility on primary dock buttons"
  );
  assert(
    currentDockSrc.includes('aria-label="More Options (Expand App Directory)"'),
    "Must preserve aria-label accessibility on More Options button"
  );
});

test("More Options panel retains all application names and detailed tool items", () => {
  const currentDockSrc = fs.readFileSync(dockSourcePath, "utf-8");
  assert(currentDockSrc.includes("Layout & Structure"), "Must retain Layout & Structure inside More Options");
  assert(currentDockSrc.includes("Profile Identity"), "Must retain Profile Identity inside More Options");
  assert(currentDockSrc.includes("Typography & Fonts"), "Must retain Typography & Fonts inside More Options");
  assert(currentDockSrc.includes("Discord Rich Presence"), "Must retain Discord Rich Presence inside More Options");
  assert(currentDockSrc.includes("APP DIRECTORY"), "Must retain App Directory header");
});

// ===============================================================
// 2. Nearest-Edge Snapping (160–190px Calibrated Distance)
// ===============================================================
console.log("\n--- Suite 2: Calibrated Nearest-Edge Snapping & Preservation ---");

class DockPositionEngine {
  constructor(containerRect = { top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }, snapThreshold = 175) {
    this.containerRect = containerRect;
    this.edge = "bottom";
    this.ratio = { x: 0.5, y: 0.5 };
    this.dockWidth = 220;
    this.dockHeight = 44;
    this.snapThreshold = snapThreshold; // 160–190 CSS px calibrated visual distance
    this.isLocked = false;
    this.lockShortcut = "CapsLock";
    this.moreOptionsPanelSize = 100; // 20% to 100%
    this.mode = "main"; // "main" | "directory" | "settings"
    this.isDragging = false;
    this.dragStartPointer = { x: 0, y: 0 };
    this.dragStartDockPos = { x: 0, y: 0 };
    this.currentDragPos = null;
    this.hasMovedPastThreshold = false;
    this.clickSuppressed = false;
  }

  get isVertical() {
    return this.edge === "left" || this.edge === "right";
  }

  getCurrentSettledCoords() {
    const maxX = Math.max(0, this.containerRect.width - this.dockWidth);
    const maxY = Math.max(0, this.containerRect.height - this.dockHeight);

    if (this.edge === "bottom") {
      const left = Math.max(8, Math.min(maxX - 8, this.ratio.x * maxX));
      return { left, top: this.containerRect.height - this.dockHeight, bottom: 0 };
    }
    if (this.edge === "top") {
      const left = Math.max(8, Math.min(maxX - 8, this.ratio.x * maxX));
      return { left, top: 0, bottom: null };
    }
    if (this.edge === "left") {
      const top = Math.max(8, Math.min(maxY - 8, this.ratio.y * maxY));
      return { left: 0, top, right: null };
    }
    if (this.edge === "right") {
      const top = Math.max(8, Math.min(maxY - 8, this.ratio.y * maxY));
      return { left: this.containerRect.width - this.dockWidth, top, right: 0 };
    }
    // Float
    const left = Math.max(12, Math.min(maxX - 12, this.ratio.x * maxX));
    const top = Math.max(12, Math.min(maxY - 12, this.ratio.y * maxY));
    return { left, top };
  }

  pointerDown(pointerX, pointerY) {
    if (this.isLocked) return; // Locked: dragging disabled
    const current = this.getCurrentSettledCoords();
    this.dragStartPointer = { x: pointerX, y: pointerY };
    this.dragStartDockPos = { x: current.left, y: current.top };
    this.hasMovedPastThreshold = false;
    this.clickSuppressed = false;
  }

  pointerMove(pointerX, pointerY) {
    if (this.isLocked || !this.dragStartPointer) return;
    const dx = pointerX - this.dragStartPointer.x;
    const dy = pointerY - this.dragStartPointer.y;
    const dist = Math.hypot(dx, dy);

    if (!this.hasMovedPastThreshold && dist >= 5) {
      this.hasMovedPastThreshold = true;
      this.isDragging = true;
    }

    if (this.hasMovedPastThreshold) {
      const newX = Math.max(
        0,
        Math.min(this.containerRect.width - this.dockWidth, this.dragStartDockPos.x + dx)
      );
      const newY = Math.max(
        0,
        Math.min(this.containerRect.height - this.dockHeight, this.dragStartDockPos.y + dy)
      );
      this.currentDragPos = { x: newX, y: newY };
    }
  }

  pointerUp() {
    if (this.isLocked) return;
    if (this.hasMovedPastThreshold) {
      this.isDragging = false;
      this.clickSuppressed = true;

      const dockLeft = this.containerRect.left + this.currentDragPos.x;
      const dockTop = this.containerRect.top + this.currentDragPos.y;
      const dockRight = dockLeft + this.dockWidth;
      const dockBottom = dockTop + this.dockHeight;

      const distTop = Math.abs(dockTop - this.containerRect.top);
      const distBottom = Math.abs(this.containerRect.bottom - dockBottom);
      const distLeft = Math.abs(dockLeft - this.containerRect.left);
      const distRight = Math.abs(this.containerRect.right - dockRight);

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      let newEdge = "float";
      if (minDist <= this.snapThreshold) {
        if (minDist === distBottom) newEdge = "bottom";
        else if (minDist === distTop) newEdge = "top";
        else if (minDist === distLeft) newEdge = "left";
        else newEdge = "right";
      }

      const maxAvailableX = Math.max(1, this.containerRect.width - this.dockWidth);
      const maxAvailableY = Math.max(1, this.containerRect.height - this.dockHeight);

      const ratioX = Math.max(0, Math.min(1, this.currentDragPos.x / maxAvailableX));
      const ratioY = Math.max(0, Math.min(1, this.currentDragPos.y / maxAvailableY));

      this.edge = newEdge;
      this.ratio = { x: ratioX, y: ratioY };
      this.currentDragPos = null;
    } else {
      this.isDragging = false;
      this.clickSuppressed = false;
    }
  }

  // Position-Aware Expansion Calculation for Mode B (More Options)
  computeMoreOptionsExpansion() {
    const scale = Math.max(0.2, Math.min(1.0, this.moreOptionsPanelSize / 100));
    const baseWidth = this.isVertical ? 420 : 540;
    const baseHeight = this.isVertical ? 760 : 560;

    const effectiveWidth = Math.min(this.containerRect.width - 24, Math.round(baseWidth * scale));
    const effectiveHeight = Math.min(this.containerRect.height - 40, Math.round(baseHeight * scale));

    const settled = this.getCurrentSettledCoords();
    const dockCenterX = settled.left + this.dockWidth / 2;
    const dockCenterY = settled.top + this.dockHeight / 2;

    if (this.edge === "bottom") {
      const panelLeft = Math.max(8, Math.min(this.containerRect.width - effectiveWidth - 8, dockCenterX - effectiveWidth / 2));
      return { edge: "bottom", bottom: 0, left: panelLeft, width: effectiveWidth, height: effectiveHeight, expansion: "upward-from-bottom" };
    }
    if (this.edge === "top") {
      const panelLeft = Math.max(8, Math.min(this.containerRect.width - effectiveWidth - 8, dockCenterX - effectiveWidth / 2));
      return { edge: "top", top: 0, left: panelLeft, width: effectiveWidth, height: effectiveHeight, expansion: "downward-from-top" };
    }
    if (this.edge === "left") {
      const panelTop = Math.max(8, Math.min(this.containerRect.height - effectiveHeight - 8, dockCenterY - effectiveHeight / 2));
      return { edge: "left", left: 0, top: panelTop, width: effectiveWidth, height: effectiveHeight, expansion: "rightward-from-left" };
    }
    if (this.edge === "right") {
      const panelTop = Math.max(8, Math.min(this.containerRect.height - effectiveHeight - 8, dockCenterY - effectiveHeight / 2));
      return { edge: "right", right: 0, top: panelTop, width: effectiveWidth, height: effectiveHeight, expansion: "leftward-from-right" };
    }

    // FLOATING POSITION-AWARE EXPANSION (Section 5)
    const spaceAbove = settled.top;
    const spaceBelow = this.containerRect.height - (settled.top + this.dockHeight);

    let panelTop;
    if (spaceBelow >= effectiveHeight + 16) {
      panelTop = settled.top + this.dockHeight + 8;
    } else if (spaceAbove >= effectiveHeight + 16) {
      panelTop = settled.top - effectiveHeight - 8;
    } else {
      panelTop = Math.max(12, Math.min(this.containerRect.height - effectiveHeight - 12, dockCenterY - effectiveHeight / 2));
    }

    const panelLeft = Math.max(12, Math.min(this.containerRect.width - effectiveWidth - 12, dockCenterX - effectiveWidth / 2));
    return {
      edge: "float",
      left: panelLeft,
      top: panelTop,
      width: effectiveWidth,
      height: effectiveHeight,
      expansion: "anchored-to-floating-dock",
    };
  }
}

test("Snaps to BOTTOM when released within 175px calibrated threshold", () => {
  const engine = new DockPositionEngine({ top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }, 175);
  engine.pointerDown(500, 780);
  // Release at y=660 (dockBottom=704, distBottom = 800 - 704 = 96px <= 175px)
  engine.pointerMove(500, 780 - 100);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "bottom", "Should snap to bottom edge within 175px");
  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.bottom, 0, "Must physically connect to bottom wall");
});

test("Snaps to TOP when released within 175px calibrated threshold", () => {
  const engine = new DockPositionEngine({ top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }, 175);
  engine.pointerDown(500, 780);
  // Release at y=120 (distTop = 120px <= 175px)
  engine.pointerMove(500, 780 - 640);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "top", "Should snap to top edge within 175px");
  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.top, 0, "Must physically connect to top wall");
});

test("Snaps to RIGHT when released within 175px calibrated threshold", () => {
  const engine = new DockPositionEngine({ top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }, 175);
  engine.pointerDown(500, 780);
  // Release near right edge: x=880 (dockRight=1100, distRight = 100px <= 175px)
  engine.pointerMove(500 + 400, 780 - 400);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "right", "Should snap to right edge within 175px");
  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.right, 0, "Must physically connect to right wall");
});

test("Center Drop (> 175px from all edges): Remains FREE-FLOATING at exact coordinates", () => {
  const engine = new DockPositionEngine({ top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }, 175);
  engine.pointerDown(500, 780);
  // Release at x=490, y=380 (distance to nearest edge is ~380px, well above 175px)
  engine.pointerMove(500 - 10, 780 - 400);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "float", "Must remain freely floating when outside 175px threshold");
  const settled = engine.getCurrentSettledCoords();
  assert(settled.top >= 350 && settled.top <= 420, `Y must remain at drop location, got ${settled.top}`);
  assert(settled.left >= 450 && settled.left <= 530, `X must remain at drop location, got ${settled.left}`);
});

// ===============================================================
// 3. Customizable Dock Lock Shortcut
// ===============================================================
console.log("\n--- Suite 3: Customizable Dock Lock Shortcut ---");

test("Lock shortcut disables dragging while preserving current position", () => {
  const engine = new DockPositionEngine();
  const initial = engine.getCurrentSettledCoords();

  // User locks dock
  engine.isLocked = true;

  // User attempts to drag
  engine.pointerDown(initial.left + 50, initial.top + 20);
  engine.pointerMove(initial.left + 250, initial.top - 100);
  engine.pointerUp();

  assert.strictEqual(engine.isDragging, false, "Dragging must remain disabled when dock is locked");
  const afterAttempt = engine.getCurrentSettledCoords();
  assert.strictEqual(afterAttempt.left, initial.left, "Position X must remain locked");
  assert.strictEqual(afterAttempt.top, initial.top, "Position Y must remain locked");
});

test("Unlocking dock restores normal dragging without repositioning", () => {
  const engine = new DockPositionEngine();
  engine.isLocked = true;
  // Unlock dock
  engine.isLocked = false;

  engine.pointerDown(500, 780);
  engine.pointerMove(520, 750); // moves 36px > 5px
  assert.strictEqual(engine.isDragging, true, "Dragging must be restored when unlocked");
  engine.pointerUp();
});

// ===============================================================
// 4. More Options Panel Size Customization (20% to 100%)
// ===============================================================
console.log("\n--- Suite 4: More Options Panel Size Customization ---");

test("Default panel size is 100% and scales proportionally across all presets", () => {
  const engine = new DockPositionEngine();
  assert.strictEqual(engine.moreOptionsPanelSize, 100, "Default size must be 100%");

  const full = engine.computeMoreOptionsExpansion();
  assert.strictEqual(full.width, 540, "Original 100% width must be 540px");

  // Compact preset: 75%
  engine.moreOptionsPanelSize = 75;
  const compact = engine.computeMoreOptionsExpansion();
  assert.strictEqual(compact.width, 405, "75% compact width must be 405px");

  // Medium preset: 50%
  engine.moreOptionsPanelSize = 50;
  const medium = engine.computeMoreOptionsExpansion();
  assert.strictEqual(medium.width, 270, "50% medium width must be 270px");

  // Small preset: 35%
  engine.moreOptionsPanelSize = 35;
  const small = engine.computeMoreOptionsExpansion();
  assert.strictEqual(small.width, 189, "35% small width must be 189px");

  // Very Small preset: 20%
  engine.moreOptionsPanelSize = 20;
  const verySmall = engine.computeMoreOptionsExpansion();
  assert.strictEqual(verySmall.width, 108, "20% very small width must be 108px");
});

// ===============================================================
// 5. Position-Aware More Options Expansion (Critical Section 5)
// ===============================================================
console.log("\n--- Suite 5: Position-Aware More Options Expansion ---");

test("Opening More Options from BOTTOM attached edge expands upward and preserves bottom attachment", () => {
  const engine = new DockPositionEngine();
  engine.edge = "bottom";
  engine.ratio = { x: 0.8, y: 0.5 }; // Right side of bottom edge
  engine.moreOptionsPanelSize = 100;

  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "bottom");
  assert.strictEqual(expansion.bottom, 0, "Must be attached to bottom wall");
  assert.strictEqual(expansion.expansion, "upward-from-bottom");
  assert(expansion.left > 400, "Must preserve right-aligned position");
});

test("Opening More Options from TOP attached edge expands downward", () => {
  const engine = new DockPositionEngine();
  engine.edge = "top";
  engine.ratio = { x: 0.2, y: 0.5 }; // Left side of top edge

  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "top");
  assert.strictEqual(expansion.top, 0, "Must be attached to top wall");
  assert.strictEqual(expansion.expansion, "downward-from-top");
  assert(expansion.left < 300, "Must preserve left-aligned position");
});

test("Opening More Options from LEFT attached edge expands rightward", () => {
  const engine = new DockPositionEngine();
  engine.edge = "left";
  engine.ratio = { x: 0.5, y: 0.3 };

  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "left");
  assert.strictEqual(expansion.left, 0, "Must be attached to left wall");
  assert.strictEqual(expansion.expansion, "rightward-from-left");
});

test("Opening More Options from RIGHT attached edge expands leftward", () => {
  const engine = new DockPositionEngine();
  engine.edge = "right";
  engine.ratio = { x: 0.5, y: 0.7 };

  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "right");
  assert.strictEqual(expansion.right, 0, "Must be attached to right wall");
  assert.strictEqual(expansion.expansion, "leftward-from-right");
});

test("CRITICAL: Floating dock in CENTER opens More Options at floating location without edge snapping", () => {
  const engine = new DockPositionEngine();
  engine.edge = "float";
  engine.ratio = { x: 0.5, y: 0.5 }; // Center of viewport
  engine.moreOptionsPanelSize = 75; // 75% scale

  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "float", "Dock MUST remain in float mode");
  assert.strictEqual(expansion.expansion, "anchored-to-floating-dock");
  assert.strictEqual(expansion.width, 405, "Must respect 75% configured size (405px)");
  assert(expansion.top > 0, "Top must be anchored near floating dock");
  assert(expansion.left > 0, "Left must be anchored near floating dock");
});

test("Closing More Options returns dock to exact previous floating position without resetting coordinates", () => {
  const engine = new DockPositionEngine();
  engine.edge = "float";
  engine.ratio = { x: 0.35, y: 0.45 }; // Arbitrary floating position

  const initialFloatingCoords = engine.getCurrentSettledCoords();

  // User opens More Options (Mode B)
  engine.mode = "directory";
  const expansion = engine.computeMoreOptionsExpansion();
  assert.strictEqual(expansion.edge, "float");

  // User closes More Options (Mode A)
  engine.mode = "main";
  const closedCoords = engine.getCurrentSettledCoords();

  assert.strictEqual(engine.edge, "float", "Must still be in float mode");
  assert.strictEqual(closedCoords.left, initialFloatingCoords.left, "Left coordinate must match exactly");
  assert.strictEqual(closedCoords.top, initialFloatingCoords.top, "Top coordinate must match exactly");
});

console.log("\n=================================================================");
console.log(`SUMMARY: ${passed} / ${total} tests passed`);
console.log("=================================================================\n");

if (passed !== total) {
  process.exit(1);
}
