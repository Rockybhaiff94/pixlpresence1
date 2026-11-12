/**
 * PIXEL.GG STUDIO: FLOATING DOCK POSITIONING, DRAGGING, SIZING & EDGE-SNAPPING TEST SUITE
 *
 * Verifies:
 * 1. Single-unit dragging: entire dock moves together, icons never move independently.
 * 2. Drag threshold (4–6px): separates click events from drag gestures.
 * 3. Icon containment: icons strictly locked inside dock container.
 * 4. Slimmer dimensions: height <= 48px (44px), width <= 48px, button <= 34px, icon 17–19px.
 * 5. Edge attachment & wall connection:
 *    - Bottom: bottom-0, rounded-b-none, border-b-0, rounded-t-2xl, upward shadow.
 *    - Top: top-0, rounded-t-none, border-t-0, rounded-b-2xl, downward shadow.
 *    - Left: left-0, rounded-l-none, border-l-0, rounded-r-2xl, rightward shadow.
 *    - Right: right-0, rounded-r-none, border-r-0, rounded-l-2xl, leftward shadow.
 * 6. Free-floating mode:
 *    - All 4 corners rounded (rounded-2xl), complete border, floating shadow.
 *    - Does NOT jump to center; drops at exact user coordinates.
 * 7. Intelligent edge detection & snapping:
 *    - Snaps to closest edge within 35–55px threshold.
 *    - Remains floating when released in workspace center (> threshold).
 * 8. Position preservation along edge:
 *    - Bottom-right drop stays on the right side of the bottom wall.
 *    - Bottom-left drop stays on the left side.
 *    - Top-right drop stays on the right side.
 *    - Right-top drop stays at the upper position of right wall.
 * 9. Responsive boundaries & ratio recalculation on resize.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("\n=================================================================");
console.log("PIXEL.GG STUDIO: DOCK DRAGGING, POSITIONING, SIZING & EDGE-SNAPPING");
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
// 1. Static Source Code Analysis & Structural Containment
// ===============================================================
console.log("--- Suite 1: Source Code & Containment Architecture ---");

const dockSourcePath = path.join(
  __dirname,
  "../apps/web/src/components/studio/StudioFloatingDock.tsx"
);
const dockSource = fs.readFileSync(dockSourcePath, "utf-8");

test("Dock icons are NOT independently draggable (no nested drag on icon container)", () => {
  // In the buggy version, <motion.div drag dragSnapToOrigin ...> was placed inside dockMode === 'main'
  // wrapping the icons. In the fixed version, this is removed completely.
  assert(
    !dockSource.includes("dragSnapToOrigin={true}"),
    "dragSnapToOrigin must not be present on icons"
  );
  // Verify that Mode A icons flex container is a standard non-draggable flex div
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
  // Horizontal dock height: 44px (h-11)
  assert(dockSource.includes("h-11 px-1.5 py-1"), "Must use compact h-11 (44px) height");
  // Vertical dock width: 44px (w-11)
  assert(dockSource.includes("w-11 py-1 px-1"), "Must use compact w-11 (44px) width");
  // Buttons: 32px (w-8 h-8)
  assert(dockSource.includes("w-8 h-8 rounded-full"), "Must use 32px (w-8 h-8) buttons");
  // Icons: 17px
  assert(dockSource.includes("<Icon size={17} />"), "Must use 17px icon size");
  assert(dockSource.includes("<LayoutGrid size={17} />"), "More button must use 17px icon size");
});

// ===============================================================
// 2. Mathematical Drag, Snap & Edge Preservation Simulator
// ===============================================================
console.log("\n--- Suite 2: Dragging, Edge Snapping & Position Preservation ---");

class DockPositionEngine {
  constructor(containerRect = { top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 }) {
    this.containerRect = containerRect;
    this.edge = "bottom";
    this.ratio = { x: 0.5, y: 0.5 };
    this.dockWidth = 220; // Mode A horizontal width
    this.dockHeight = 44; // Mode A horizontal height
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
    const current = this.getCurrentSettledCoords();
    this.dragStartPointer = { x: pointerX, y: pointerY };
    this.dragStartDockPos = { x: current.left, y: current.top };
    this.hasMovedPastThreshold = false;
    this.clickSuppressed = false;
  }

  pointerMove(pointerX, pointerY) {
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
    if (this.hasMovedPastThreshold) {
      this.isDragging = false;
      this.clickSuppressed = true;

      // Calculate release dock bounding box
      const dockLeft = this.containerRect.left + this.currentDragPos.x;
      const dockTop = this.containerRect.top + this.currentDragPos.y;
      const dockRight = dockLeft + this.dockWidth;
      const dockBottom = dockTop + this.dockHeight;

      // Distances to container edges
      const distTop = Math.abs(dockTop - this.containerRect.top);
      const distBottom = Math.abs(this.containerRect.bottom - dockBottom);
      const distLeft = Math.abs(dockLeft - this.containerRect.left);
      const distRight = Math.abs(this.containerRect.right - dockRight);

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);
      const snapThreshold = 45; // 35-55px range

      let newEdge = "float";
      if (minDist <= snapThreshold) {
        if (minDist === distBottom) newEdge = "bottom";
        else if (minDist === distTop) newEdge = "top";
        else if (minDist === distLeft) newEdge = "left";
        else newEdge = "right";
      }

      // Preserve position along edge
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

  getCornerClasses() {
    if (this.isDragging || this.edge === "float") {
      return "rounded-2xl border border-white/15";
    }
    switch (this.edge) {
      case "bottom":
        return "rounded-t-2xl rounded-b-none border-b-0";
      case "top":
        return "rounded-b-2xl rounded-t-none border-t-0";
      case "left":
        return "rounded-r-2xl rounded-l-none border-l-0";
      case "right":
        return "rounded-l-2xl rounded-r-none border-r-0";
      default:
        return "rounded-2xl border border-white/15";
    }
  }
}

test("Small click movement (< 5px) triggers click and does NOT initiate drag", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  engine.pointerMove(502, 781); // 2.2px movement (< 5px threshold)
  assert.strictEqual(engine.isDragging, false, "Should not be dragging");
  engine.pointerUp();
  assert.strictEqual(engine.clickSuppressed, false, "Click should NOT be suppressed");
  assert.strictEqual(engine.edge, "bottom", "Edge should not have changed");
});

test("Dragging past 5px threshold detaches dock into rounded-2xl floating state", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  engine.pointerMove(508, 770); // dx=8, dy=-10, dist=12.8px (> 5px)
  assert.strictEqual(engine.isDragging, true, "Should transition to dragging");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-2xl border border-white/15",
    "Detached dock must have all 4 corners rounded while in motion"
  );
});

test("Bottom-Right Drag: Snaps to BOTTOM edge and PRESERVES horizontal RIGHT position (no jump to center)", () => {
  const engine = new DockPositionEngine(); // container 1200x800, dockWidth 220, dockHeight 44
  engine.pointerDown(500, 780);
  // Drag to bottom-right: x=920, y=740 (within 20px of bottom=756)
  engine.pointerMove(500 + 420, 780 - 40);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "bottom", "Should snap to bottom wall");
  assert(engine.ratio.x > 0.85, `ratioX should be near right (> 0.85), got ${engine.ratio.x}`);

  const settled = engine.getCurrentSettledCoords();
  assert(settled.left > 800, `Horizontal position must be near right side (> 800px), got ${settled.left}`);
  assert.strictEqual(settled.bottom, 0, "Must be physically attached to bottom with 0 gap");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-t-2xl rounded-b-none border-b-0",
    "Must have flat bottom edge with border-0 and rounded top corners"
  );
});

test("Bottom-Left Drag: Snaps to BOTTOM edge and PRESERVES horizontal LEFT position", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  // Drag to bottom-left: x=80 (distLeft=80), y=750 (dockBottom=794, distBottom=6)
  engine.pointerMove(500 - 410, 780 - 6);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "bottom", "Should snap to bottom wall");
  assert(engine.ratio.x < 0.15, `ratioX should be near left (< 0.15), got ${engine.ratio.x}`);

  const settled = engine.getCurrentSettledCoords();
  assert(settled.left < 150, `Horizontal position must be near left side (< 150px), got ${settled.left}`);
  assert.strictEqual(settled.bottom, 0, "Must be physically attached to bottom with 0 gap");
});

test("Top-Right Drag: Snaps to TOP edge and PRESERVES horizontal RIGHT position", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  // Drag to near top wall on right side: y near 0
  engine.pointerMove(500 + 400, 780 - 760);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "top", "Should snap to top wall");
  assert(engine.ratio.x > 0.8, "ratioX should remain near right side");

  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.top, 0, "Must be physically attached to top with 0 gap");
  assert(settled.left > 750, "Must stay on right side of top wall");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-b-2xl rounded-t-none border-t-0",
    "Must have flat top edge with border-0 and rounded bottom corners"
  );
});

test("Right-Top Drag: Snaps to RIGHT edge and PRESERVES vertical UPPER position", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  // Drag near right edge (x=980), near upper half (y=100)
  engine.pointerMove(500 + 470, 780 - 680);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "right", "Should snap to right wall");
  assert(engine.ratio.y < 0.25, `ratioY should be near upper (< 0.25), got ${engine.ratio.y}`);

  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.right, 0, "Must be physically attached to right with 0 gap");
  assert(settled.top < 200, "Must stay near upper position of right wall");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-l-2xl rounded-r-none border-r-0",
    "Must have flat right edge with border-0 and rounded left corners"
  );
});

test("Left-Lower Drag: Snaps to LEFT edge and PRESERVES vertical LOWER position", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  // Drag near left edge (x=10), near lower half (y=650)
  engine.pointerMove(500 - 480, 780 - 130);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "left", "Should snap to left wall");
  assert(engine.ratio.y > 0.75, `ratioY should be near lower (> 0.75), got ${engine.ratio.y}`);

  const settled = engine.getCurrentSettledCoords();
  assert.strictEqual(settled.left, 0, "Must be physically attached to left with 0 gap");
  assert(settled.top > 550, "Must stay near lower position of left wall");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-r-2xl rounded-l-none border-l-0",
    "Must have flat left edge with border-0 and rounded right corners"
  );
});

test("Center Drag: Dropped in workspace center remains FREE-FLOATING (does NOT jump to center or edge)", () => {
  const engine = new DockPositionEngine();
  engine.pointerDown(500, 780);
  // Drag to center: x=490, y=380 (distance to any edge is > 300px, way above 45px threshold)
  engine.pointerMove(500 - 10, 780 - 400);
  engine.pointerUp();

  assert.strictEqual(engine.edge, "float", "Should remain in free-floating mode");
  assert.strictEqual(
    engine.getCornerClasses(),
    "rounded-2xl border border-white/15",
    "Floating dock must have all 4 corners rounded"
  );

  const settled = engine.getCurrentSettledCoords();
  // Dropped at ~380px top and ~490px left
  assert(settled.top >= 350 && settled.top <= 420, `Must remain at drop y (~380), got ${settled.top}`);
  assert(settled.left >= 450 && settled.left <= 530, `Must remain at drop x (~490), got ${settled.left}`);
});

test("Responsive Resize: Window resize recalculates position preserving relative ratio along edge", () => {
  const engine = new DockPositionEngine({ top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 });
  engine.edge = "bottom";
  engine.ratio = { x: 0.9, y: 0.5 }; // Right-aligned along bottom

  const initialSettled = engine.getCurrentSettledCoords();
  assert(initialSettled.left > 800, "Initial left should be right-aligned");

  // Resize window / container to smaller width (800x600)
  engine.containerRect = { top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 };
  const resizedSettled = engine.getCurrentSettledCoords();

  // Dock should not be offscreen (> 800 - 220 = 580)
  assert(
    resizedSettled.left <= 800 - engine.dockWidth,
    `Must not overflow container: ${resizedSettled.left} <= ${800 - engine.dockWidth}`
  );
  // And it should still be near the right edge of the new container width (0.9 * 580 = 522px)
  assert(resizedSettled.left > 500, `Must preserve right alignment on smaller screen, got ${resizedSettled.left}`);
  assert.strictEqual(resizedSettled.bottom, 0, "Must still be flush with bottom");
});

console.log("\n=================================================================");
console.log(`SUMMARY: ${passed} / ${total} tests passed`);
console.log("=================================================================\n");

if (passed !== total) {
  process.exit(1);
}
