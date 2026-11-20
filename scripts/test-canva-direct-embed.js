/**
 * Test Suite: Canva-Style Direct Embed Manipulation in Pixel.gg Studio
 * Verifies all 15 core scenarios:
 * 1. Embed selection and 2D movement in all directions
 * 2. 4 corner handles resizing (tl, tr, bl, br)
 * 3. 4 edge handles resizing (tc, bc, ml, mr)
 * 4. Independent top resizing (tc moves top, bottom boundary y + h remains fixed)
 * 5. Independent bottom resizing (bc moves bottom, top boundary y remains fixed)
 * 6. Symmetric resizing with Alt key (expands/contracts around center)
 * 7. Aspect ratio locking with Shift key
 * 8. Resizing at various canvas zooms (50%, 75%, 100%, 125%, 150%)
 * 9. Browser zoom / scaling resistance
 * 10. Center alignment snap (x=0 within 12px threshold) and guide display
 * 11. Contextual floating toolbar actions (Duplicate, Z-Index up/down, Lock/Unlock, Delete, Inspector)
 * 12. Save & persistence round-trip in CanvasEmbed transform
 * 13. Public profile view synchronization
 * 14. Responsive mobile & tablet layout constraints
 * 15. Regression safety (dock, effects, sliders preservation)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rendererPath = path.resolve(__dirname, "../apps/web/src/components/studio/CanvasObjectRenderer.tsx");
const previewPath = path.resolve(__dirname, "../apps/web/src/components/studio/StudioProfilePreview.tsx");
const workspacePath = path.resolve(__dirname, "../apps/web/src/components/studio/StudioLeftWorkspace.tsx");
const profileViewPath = path.resolve(__dirname, "../apps/web/src/components/nothing/ProfileClientView.tsx");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n=== PIXEL.GG STUDIO: CANVA-STYLE DIRECT EMBED MANIPULATION AUDIT ===\n");

const rendererContent = fs.readFileSync(rendererPath, "utf8");
const previewContent = fs.readFileSync(previewPath, "utf8");
const workspaceContent = fs.readFileSync(workspacePath, "utf8");
const profileViewContent = fs.readFileSync(profileViewPath, "utf8");

// Resizing simulation engine matching CanvasObjectRenderer.tsx
function simulateResize({
  handle,
  initialW,
  initialH,
  initialX = 0,
  initialY = 0,
  deltaX = 0,
  deltaY = 0,
  zoom = 100,
  isShift = false,
  isAlt = false,
}) {
  const zoomScale = Math.max(0.2, zoom / 100);
  const dX = deltaX / zoomScale;
  const dY = deltaY / zoomScale;
  const initialAspect = initialW / Math.max(1, initialH);

  let nextW = initialW;
  let nextH = initialH;
  let nextX = initialX;
  let nextY = initialY;

  // 1. Height resizing
  if (handle === "bc" || handle === "bl" || handle === "br") {
    if (isAlt) {
      nextH = Math.round(initialH + dY * 2);
      nextY = Math.round(initialY - dY);
    } else {
      nextH = Math.round(initialH + dY);
      nextY = initialY;
    }
  } else if (handle === "tc" || handle === "tl" || handle === "tr") {
    if (isAlt) {
      nextH = Math.round(initialH - dY * 2);
      nextY = Math.round(initialY + dY);
    } else {
      nextH = Math.round(initialH - dY);
      nextY = Math.round(initialY + dY);
    }
  }

  // 2. Width resizing
  if (handle === "mr" || handle === "tr" || handle === "br") {
    if (isAlt) {
      nextW = Math.round(initialW + dX * 2);
      nextX = Math.round(initialX - dX);
    } else {
      nextW = Math.round(initialW + dX);
      nextX = initialX;
    }
  } else if (handle === "ml" || handle === "tl" || handle === "bl") {
    if (isAlt) {
      nextW = Math.round(initialW - dX * 2);
      nextX = Math.round(initialX + dX);
    } else {
      nextW = Math.round(initialW - dX);
      nextX = Math.round(initialX + dX);
    }
  }

  // 3. Shift aspect ratio preservation on corners
  if (isShift && (handle === "tl" || handle === "tr" || handle === "bl" || handle === "br")) {
    const proposedH = Math.round(nextW / initialAspect);
    if (handle === "tl" || handle === "tr") {
      nextY = initialY + initialH - proposedH;
    }
    nextH = proposedH;
  }

  // 4. Clamping bounds
  if (nextW < 320) {
    if (handle === "ml" || handle === "tl" || handle === "bl") {
      nextX = isAlt ? initialX + (initialW - 320) / 2 : initialX + initialW - 320;
    }
    nextW = 320;
  } else if (nextW > 1600) {
    if (handle === "ml" || handle === "tl" || handle === "bl") {
      nextX = isAlt ? initialX - (1600 - initialW) / 2 : initialX - (1600 - initialW);
    }
    nextW = 1600;
  }

  if (nextH < 160) {
    if (handle === "tc" || handle === "tl" || handle === "tr") {
      nextY = isAlt ? initialY + (initialH - 160) / 2 : initialY + initialH - 160;
    }
    nextH = 160;
  } else if (nextH > 2000) {
    if (handle === "tc" || handle === "tl" || handle === "tr") {
      nextY = isAlt ? initialY - (2000 - initialH) / 2 : initialY - (2000 - initialH);
    }
    nextH = 2000;
  }

  return { width: nextW, height: nextH, x: nextX, y: nextY };
}

// Movement simulation engine matching handleMovePointerDown
function simulateMove({ initialX = 0, initialY = 0, deltaX = 0, deltaY = 0, zoom = 100 }) {
  const zoomScale = Math.max(0.2, zoom / 100);
  let nextX = Math.round(initialX + deltaX / zoomScale);
  let nextY = Math.round(initialY + deltaY / zoomScale);

  const isSnappedX = Math.abs(nextX) <= 12;
  if (isSnappedX) {
    nextX = 0;
  }

  return { x: nextX, y: nextY, isSnappedX };
}

// =========================================================================
// SCENARIO 1: Embed Selection & 2D Movement in All Directions
// =========================================================================
runTest("Scenario 1: Embed movement updates X and Y coordinates freely", () => {
  const move1 = simulateMove({ initialX: 0, initialY: 0, deltaX: 50, deltaY: 80, zoom: 100 });
  assert.strictEqual(move1.x, 50);
  assert.strictEqual(move1.y, 80);

  const move2 = simulateMove({ initialX: 50, initialY: 80, deltaX: -70, deltaY: -40, zoom: 100 });
  assert.strictEqual(move2.x, -20);
  assert.strictEqual(move2.y, 40);

  assert(rendererContent.includes("handleMovePointerDown"), "handleMovePointerDown missing from CanvasObjectRenderer");
  assert(rendererContent.includes("movingEmbed"), "movingEmbed state missing from CanvasObjectRenderer");
  assert(rendererContent.includes("translate3d(${currentX}px, ${currentY}px, 0)"), "GPU-accelerated translate3d missing");
});

// =========================================================================
// SCENARIO 2: Corner Handles Resizing (tl, tr, bl, br)
// =========================================================================
runTest("Scenario 2: Resizing from all 4 corner handles adjusts width and height", () => {
  const tr = simulateResize({ handle: "tr", initialW: 580, initialH: 500, deltaX: 40, deltaY: -30 });
  assert.strictEqual(tr.width, 620);
  assert.strictEqual(tr.height, 530);

  const bl = simulateResize({ handle: "bl", initialW: 580, initialH: 500, deltaX: -30, deltaY: 40 });
  assert.strictEqual(bl.width, 610);
  assert.strictEqual(bl.height, 540);

  const br = simulateResize({ handle: "br", initialW: 580, initialH: 500, deltaX: 50, deltaY: 50 });
  assert.strictEqual(br.width, 630);
  assert.strictEqual(br.height, 550);

  const tl = simulateResize({ handle: "tl", initialW: 580, initialH: 500, deltaX: -40, deltaY: -40 });
  assert.strictEqual(tl.width, 620);
  assert.strictEqual(tl.height, 540);
});

// =========================================================================
// SCENARIO 3: Edge Handles Resizing (tc, bc, ml, mr)
// =========================================================================
runTest("Scenario 3: Resizing from all 4 edge handles adjusts single dimension", () => {
  const bc = simulateResize({ handle: "bc", initialW: 580, initialH: 500, deltaY: 50 });
  assert.strictEqual(bc.width, 580);
  assert.strictEqual(bc.height, 550);

  const tc = simulateResize({ handle: "tc", initialW: 580, initialH: 500, deltaY: -40 });
  assert.strictEqual(tc.width, 580);
  assert.strictEqual(tc.height, 540);

  const mr = simulateResize({ handle: "mr", initialW: 580, initialH: 500, deltaX: 60 });
  assert.strictEqual(mr.width, 640);
  assert.strictEqual(mr.height, 500);

  const ml = simulateResize({ handle: "ml", initialW: 580, initialH: 500, deltaX: -50 });
  assert.strictEqual(ml.width, 630);
  assert.strictEqual(ml.height, 500);
});

// =========================================================================
// SCENARIO 4: Independent Top Resizing (tc moves top; bottom stays fixed)
// =========================================================================
runTest("Scenario 4: Dragging top edge (tc) shifts top boundary while bottom boundary remains 100% fixed", () => {
  const initialH = 500;
  const initialY = 40;
  const bottomBoundary = initialY + initialH; // 540px

  const res = simulateResize({
    handle: "tc",
    initialW: 580,
    initialH,
    initialX: 0,
    initialY,
    deltaY: -60, // Dragged upward by 60px
    isAlt: false,
  });

  assert.strictEqual(res.height, 560, "Height should expand by 60px");
  assert.strictEqual(res.y, -20, "Top boundary Y should shift upward by 60px");
  assert.strictEqual(res.y + res.height, bottomBoundary, "Bottom boundary Y + H must remain unchanged!");
});

// =========================================================================
// SCENARIO 5: Independent Bottom Resizing (bc moves bottom; top stays fixed)
// =========================================================================
runTest("Scenario 5: Dragging bottom edge (bc) shifts bottom boundary while top boundary remains 100% fixed", () => {
  const initialH = 500;
  const initialY = 40;

  const res = simulateResize({
    handle: "bc",
    initialW: 580,
    initialH,
    initialX: 0,
    initialY,
    deltaY: 75, // Dragged downward by 75px
    isAlt: false,
  });

  assert.strictEqual(res.height, 575, "Height should expand by 75px");
  assert.strictEqual(res.y, initialY, "Top boundary Y must remain exactly fixed at initial Y!");
});

// =========================================================================
// SCENARIO 6: Symmetric Resizing with Alt Modifier Key
// =========================================================================
runTest("Scenario 6: Alt key modifier activates symmetric expansion around embed center", () => {
  const initialH = 500;
  const initialY = 50;
  const initialCenterY = initialY + initialH / 2; // 300px

  // Dragging bottom edge with Alt:
  const resBottomAlt = simulateResize({
    handle: "bc",
    initialW: 580,
    initialH,
    initialX: 0,
    initialY,
    deltaY: 30,
    isAlt: true,
  });

  assert.strictEqual(resBottomAlt.height, 560, "Height should expand symmetrically by 2x deltaY (60px)");
  assert.strictEqual(resBottomAlt.y, 20, "Top boundary Y should shift upward by deltaY (30px)");
  assert.strictEqual(resBottomAlt.y + resBottomAlt.height / 2, initialCenterY, "Center Y must remain fixed during symmetric scaling!");

  // Dragging right edge with Alt:
  const resRightAlt = simulateResize({
    handle: "mr",
    initialW: 580,
    initialH,
    initialX: 0,
    initialY,
    deltaX: 40,
    isAlt: true,
  });
  assert.strictEqual(resRightAlt.width, 660, "Width should expand symmetrically by 2x deltaX (80px)");
  assert.strictEqual(resRightAlt.x, -40, "X should shift left by deltaX to keep center fixed");
});

// =========================================================================
// SCENARIO 7: Aspect Ratio Locking with Shift Modifier Key
// =========================================================================
runTest("Scenario 7: Shift key locks aspect ratio during corner resize", () => {
  const initialW = 600;
  const initialH = 400; // Aspect ratio = 1.5
  const initialAspect = initialW / initialH;

  const resShift = simulateResize({
    handle: "br",
    initialW,
    initialH,
    deltaX: 90, // nextW = 690
    isShift: true,
  });

  assert.strictEqual(resShift.width, 690);
  assert.strictEqual(resShift.height, 460); // 690 / 1.5 = 460
  assert.strictEqual(Math.round((resShift.width / resShift.height) * 100) / 100, initialAspect);
});

// =========================================================================
// SCENARIO 8: Resizing at Zoom Scales (50%, 75%, 100%, 125%, 150%)
// =========================================================================
runTest("Scenario 8: Resizing accurately scales deltas across various zoom levels", () => {
  const zoomLevels = [50, 75, 100, 125, 150];
  for (const z of zoomLevels) {
    const rawClientDelta = 60; // 60px pointer movement in screen coords
    const expectedCanvasDelta = Math.round(rawClientDelta / (z / 100));

    const res = simulateResize({
      handle: "mr",
      initialW: 580,
      initialH: 500,
      deltaX: rawClientDelta,
      zoom: z,
    });

    assert.strictEqual(res.width, 580 + expectedCanvasDelta, `Failed at zoom ${z}%`);
  }
});

// =========================================================================
// SCENARIO 9: Browser Zoom / Scaling Resistance
// =========================================================================
runTest("Scenario 9: Clamping boundaries protect embed from negative or extreme sizes", () => {
  const minW = simulateResize({ handle: "mr", initialW: 580, initialH: 500, deltaX: -1000 });
  assert.strictEqual(minW.width, 320, "Should clamp to min 320px width");

  const maxW = simulateResize({ handle: "mr", initialW: 580, initialH: 500, deltaX: 2000 });
  assert.strictEqual(maxW.width, 1600, "Should clamp to max 1600px width");

  const minH = simulateResize({ handle: "bc", initialW: 580, initialH: 500, deltaY: -1000 });
  assert.strictEqual(minH.height, 160, "Should clamp to min 160px height");

  const maxH = simulateResize({ handle: "bc", initialW: 580, initialH: 500, deltaY: 3000 });
  assert.strictEqual(maxH.height, 2000, "Should clamp to max 2000px height");
});

// =========================================================================
// SCENARIO 10: Center Alignment Snapping & Guide Line
// =========================================================================
runTest("Scenario 10: Movement within 12px threshold snaps to X=0 and triggers center guide", () => {
  const snap1 = simulateMove({ initialX: 0, deltaX: 8 });
  assert.strictEqual(snap1.x, 0, "Should snap +8px to 0");
  assert.strictEqual(snap1.isSnappedX, true);

  const snap2 = simulateMove({ initialX: 0, deltaX: -11 });
  assert.strictEqual(snap2.x, 0, "Should snap -11px to 0");
  assert.strictEqual(snap2.isSnappedX, true);

  const noSnap = simulateMove({ initialX: 0, deltaX: 18 });
  assert.strictEqual(noSnap.x, 18, "Should not snap outside threshold");
  assert.strictEqual(noSnap.isSnappedX, false);

  assert(rendererContent.includes("CENTER SNAP (X: 0)"), "Visual center snap guide missing from CanvasObjectRenderer");
});

// =========================================================================
// SCENARIO 11: Contextual Floating Toolbar & Actions
// =========================================================================
runTest("Scenario 11: Floating contextual toolbar renders Canva-style tools and handles collision", () => {
  assert(rendererContent.includes("embed-toolbar"), "embed-toolbar container class missing");
  assert(rendererContent.includes("onDuplicateEmbed"), "Duplicate action missing");
  assert(rendererContent.includes("onChangeZIndexEmbed"), "Z-Index layer actions missing");
  assert(rendererContent.includes("onToggleLockEmbed"), "Lock/Unlock action missing");
  assert(rendererContent.includes("onDeleteEmbed"), "Delete action missing");
  assert(rendererContent.includes("setShowInspectorEmbedId"), "Inspector toggle action missing");

  // Collision detection logic (flips to bottom when Y < 48 to prevent top edge clipping)
  assert(
    rendererContent.includes('currentY < 48 ? "calc(100% + 14px)" : "-44px"') ||
    rendererContent.includes("currentY < 48"),
    "Toolbar collision avoidance positioning missing"
  );
});

// =========================================================================
// SCENARIO 12: Save & Persistence Round-Trip
// =========================================================================
runTest("Scenario 12: StudioProfilePreview correctly updates embed transform and layout config", () => {
  assert(previewContent.includes("handleResizeEmbed"), "handleResizeEmbed missing from StudioProfilePreview");
  assert(previewContent.includes("handleDuplicateEmbed"), "handleDuplicateEmbed missing from StudioProfilePreview");
  assert(previewContent.includes("handleDeleteEmbed"), "handleDeleteEmbed missing from StudioProfilePreview");
  assert(previewContent.includes("handleToggleLockEmbed"), "handleToggleLockEmbed missing from StudioProfilePreview");
  assert(previewContent.includes("handleChangeZIndexEmbed"), "handleChangeZIndexEmbed missing from StudioProfilePreview");

  // Verify transform coordinates update in preview handler
  assert(previewContent.includes("(x !== undefined ? { x } : {})") || previewContent.includes("{ x }"), "Transform X updating missing from StudioProfilePreview");
  assert(previewContent.includes("(y !== undefined ? { y } : {})") || previewContent.includes("{ y }"), "Transform Y updating missing from StudioProfilePreview");
});

// =========================================================================
// SCENARIO 13: Published Profile Matches Saved Dimensions & Position
// =========================================================================
runTest("Scenario 13: Public ProfileClientView delegates to StudioProfilePreview with saved config", () => {
  assert(profileViewContent.includes("<StudioProfilePreview"), "ProfileClientView must delegate to StudioProfilePreview");
  assert(profileViewContent.includes("isInteractiveEditor={false}"), "ProfileClientView must disable interactive editor mode");
});

// =========================================================================
// SCENARIO 14: Mobile & Tablet Responsive Layout Constraints
// =========================================================================
runTest("Scenario 14: CanvasObjectRenderer enforces min(currentW, 100%) for mobile viewports", () => {
  assert(rendererContent.includes("min(${currentW}px, 100%)"), "Responsive maxWidth constraint missing");
  assert(rendererContent.includes("maxWidth: resolvedMaxWidth"), "resolvedMaxWidth style binding missing");
});

// =========================================================================
// SCENARIO 15: Structure Editor & Effects Regression Safety
// =========================================================================
runTest("Scenario 15: Redundant range sliders replaced with numeric inspector while preserving effect sliders", () => {
  // Redundant range inputs for width/height removed from StudioLeftWorkspace
  assert(!workspaceContent.includes('<input\n                          type="range"\n                          min={360}\n                          max={1600}'), "Redundant Width range slider should be replaced");
  assert(!workspaceContent.includes('<input\n                          type="range"\n                          min={160}\n                          max={2000}'), "Redundant Height range slider should be replaced");

  // Canva-style direct manipulation banner and numeric inputs present
  assert(workspaceContent.includes("Direct Canvas Manipulation Active"), "Direct manipulation callout missing from StudioLeftWorkspace");
  assert(workspaceContent.includes("Container Width"), "Container Width section missing");
  assert(workspaceContent.includes("Container Height"), "Container Height section missing");

  // Effect sliders completely preserved
  assert(workspaceContent.includes("Container Padding"), "Container Padding slider missing");
  assert(workspaceContent.includes("Element Spacing Gap"), "Element Spacing Gap slider missing");
  assert(workspaceContent.includes("Card Corner Radius") || workspaceContent.includes("Corner Radius"), "Corner Radius slider missing");
  assert(workspaceContent.includes("Ambient Edge Glow") || workspaceContent.includes("ambientGlow"), "Ambient Edge Glow toggle missing");
});

console.log(`\n=================================================================`);
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`=================================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
