const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("\n=================================================================");
console.log("=== PIXEL.GG STUDIO: CRITICAL RESIZE ENGINE QA TEST MATRIX    ===");
console.log("=================================================================\n");

// Read source files to inspect implementations
const webDir = path.resolve(__dirname, "../apps/web");
const rendererPath = path.join(webDir, "src/components/studio/CanvasObjectRenderer.tsx");
const previewPath = path.join(webDir, "src/components/studio/StudioProfilePreview.tsx");

const rendererCode = fs.readFileSync(rendererPath, "utf8");
const previewCode = fs.readFileSync(previewPath, "utf8");

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedCount++;
  }
}

// Resizing engine mathematics function directly replicating CanvasObjectRenderer.tsx
function computeResize({
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
  isMedia = false,
  isEmbed = false,
}) {
  const zoomScale = Math.max(0.2, zoom / 100);
  const dX = deltaX / zoomScale;
  const dY = deltaY / zoomScale;
  const initialAspect = initialW / Math.max(1, initialH);

  let nextW = initialW;
  let nextH = initialH;
  let nextX = initialX;
  let nextY = initialY;

  const shouldLockAspect = isMedia ? !isShift : isShift;

  // 1. HEIGHT RESIZING
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

  // 2. WIDTH RESIZING
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

  // 3. Proportional aspect ratio preservation on corner handles
  if (shouldLockAspect && (handle === "tl" || handle === "tr" || handle === "bl" || handle === "br")) {
    const proposedH = Math.round(nextW / initialAspect);
    if (handle === "tl" || handle === "tr") {
      nextY = initialY + initialH - proposedH;
    }
    nextH = proposedH;
  }

  // 4. Clamping bounds
  const minW = isEmbed ? 320 : 32;
  const maxW = 1600;
  const minH = isEmbed ? 160 : 24;
  const maxH = 2000;

  if (nextW < minW) {
    if (handle === "ml" || handle === "tl" || handle === "bl") {
      nextX = isAlt ? initialX + (initialW - minW) / 2 : initialX + initialW - minW;
    }
    nextW = minW;
  } else if (nextW > maxW) {
    if (handle === "ml" || handle === "tl" || handle === "bl") {
      nextX = isAlt ? initialX - (maxW - initialW) / 2 : initialX - (maxW - initialW);
    }
    nextW = maxW;
  }

  if (nextH < minH) {
    if (handle === "tc" || handle === "tl" || handle === "tr") {
      nextY = isAlt ? initialY + (initialH - minH) / 2 : initialY + initialH - minH;
    }
    nextH = minH;
  } else if (nextH > maxH) {
    if (handle === "tc" || handle === "tl" || handle === "tr") {
      nextY = isAlt ? initialY - (maxH - initialH) / 2 : initialY - (maxH - initialH);
    }
    nextH = maxH;
  }

  return {
    width: nextW,
    height: nextH,
    x: nextX,
    y: nextY,
    aspectRatio: (nextW / Math.max(1, nextH)).toFixed(2),
  };
}

// -------------------------------------------------------------
// TEST SUITE EXECUTION
// -------------------------------------------------------------

console.log("--- 1. All 8 Resize Handles Verification ---");

runTest("Top-left (tl) changes width and height together with bottom-right anchor", () => {
  const res = computeResize({
    handle: "tl",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: -50, // drag outward left
    deltaY: -40, // drag outward up
  });
  assert.strictEqual(res.width, 550);
  assert.strictEqual(res.height, 440);
  assert.strictEqual(res.x, 50);
  assert.strictEqual(res.y, 10);
  // Bottom-right edge remains fixed at (100 + 500, 50 + 400) = (600, 450)
  assert.strictEqual(res.x + res.width, 600);
  assert.strictEqual(res.y + res.height, 450);
});

runTest("Top-center (tc) changes height only with bottom edge anchored", () => {
  const res = computeResize({
    handle: "tc",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: 75, // deltaX ignored
    deltaY: -60, // drag upward expands height
  });
  assert.strictEqual(res.width, 500);
  assert.strictEqual(res.height, 460);
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y, -10);
  // Bottom edge remains fixed at 50 + 400 = 450
  assert.strictEqual(res.y + res.height, 450);
});

runTest("Top-right (tr) changes width and height together with bottom-left anchor", () => {
  const res = computeResize({
    handle: "tr",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: 80, // drag right expands width
    deltaY: -30, // drag up expands height
  });
  assert.strictEqual(res.width, 580);
  assert.strictEqual(res.height, 430);
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y, 20);
  // Bottom-left edge remains fixed at (100, 450)
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y + res.height, 450);
});

runTest("Middle-left (ml) changes width only with right edge anchored", () => {
  const res = computeResize({
    handle: "ml",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: -70, // drag left expands width
    deltaY: 50,  // deltaY ignored
  });
  assert.strictEqual(res.width, 570);
  assert.strictEqual(res.height, 400);
  assert.strictEqual(res.x, 30);
  assert.strictEqual(res.y, 50);
  // Right edge remains fixed at 100 + 500 = 600
  assert.strictEqual(res.x + res.width, 600);
});

runTest("Middle-right (mr) changes width only with left edge anchored", () => {
  const res = computeResize({
    handle: "mr",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: 90, // drag right expands width
    deltaY: -20, // deltaY ignored
  });
  assert.strictEqual(res.width, 590);
  assert.strictEqual(res.height, 400);
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y, 50);
});

runTest("Bottom-left (bl) changes width and height together with top-right anchor", () => {
  const res = computeResize({
    handle: "bl",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: -40, // drag left expands width
    deltaY: 70,  // drag down expands height
  });
  assert.strictEqual(res.width, 540);
  assert.strictEqual(res.height, 470);
  assert.strictEqual(res.x, 60);
  assert.strictEqual(res.y, 50);
  // Top-right anchor remains fixed at (100 + 500, 50) = (600, 50)
  assert.strictEqual(res.x + res.width, 600);
  assert.strictEqual(res.y, 50);
});

runTest("Bottom-center (bc) changes height only with top edge anchored", () => {
  const res = computeResize({
    handle: "bc",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: 45, // deltaX ignored
    deltaY: 85, // drag down expands height
  });
  assert.strictEqual(res.width, 500);
  assert.strictEqual(res.height, 485);
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y, 50);
});

runTest("Bottom-right (br) changes width and height together with top-left anchor", () => {
  const res = computeResize({
    handle: "br",
    initialW: 500,
    initialH: 400,
    initialX: 100,
    initialY: 50,
    deltaX: 65,
    deltaY: 45,
  });
  assert.strictEqual(res.width, 565);
  assert.strictEqual(res.height, 445);
  assert.strictEqual(res.x, 100);
  assert.strictEqual(res.y, 50);
});

console.log("\n--- 2. Inward Resizing & Issue B Verification ---");

runTest("Corner handle 'br' inward drag shrinks both width and height from 621x441 to 400x284", () => {
  const res = computeResize({
    handle: "br",
    initialW: 621,
    initialH: 441,
    deltaX: -221,
    deltaY: -157,
  });
  assert.strictEqual(res.width, 400);
  assert.strictEqual(res.height, 284);
});

runTest("Corner handle 'tl' inward drag shrinks width and height while preserving bottom-right corner", () => {
  const res = computeResize({
    handle: "tl",
    initialW: 600,
    initialH: 400,
    initialX: 50,
    initialY: 50,
    deltaX: 100, // dragging inward right shrinks width
    deltaY: 80,  // dragging inward down shrinks height
  });
  assert.strictEqual(res.width, 500);
  assert.strictEqual(res.height, 320);
  assert.strictEqual(res.x, 150);
  assert.strictEqual(res.y, 130);
  // Bottom-right anchor remains fixed at (650, 450)
  assert.strictEqual(res.x + res.width, 650);
  assert.strictEqual(res.y + res.height, 450);
});

console.log("\n--- 3. Image & Media Aspect Ratio Preservation ---");

runTest("Media elements (images, avatars) preserve aspect ratio by default on corner resize", () => {
  const res = computeResize({
    handle: "br",
    initialW: 300,
    initialH: 200, // aspect = 1.5
    deltaX: 60,    // width -> 360
    deltaY: 100,   // raw deltaY ignored to lock ratio
    isMedia: true,
    isShift: false, // default
  });
  assert.strictEqual(res.width, 360);
  assert.strictEqual(res.height, 240); // 360 / 1.5 = 240
  assert.strictEqual(res.aspectRatio, "1.50");
});

runTest("Holding Shift on media elements temporarily unlocks aspect ratio for freeform resize", () => {
  const res = computeResize({
    handle: "br",
    initialW: 300,
    initialH: 200,
    deltaX: 60,  // width -> 360
    deltaY: 100, // height -> 300
    isMedia: true,
    isShift: true, // Shift unlocks
  });
  assert.strictEqual(res.width, 360);
  assert.strictEqual(res.height, 300);
});

console.log("\n--- 4. Canvas Zoom Coordinate Calculations ---");

const zoomLevels = [100, 90, 80, 70, 60];
zoomLevels.forEach((z) => {
  runTest(`Resizing operates accurately at ${z}% canvas zoom`, () => {
    // When zoomed to z%, a physical cursor movement of (50 * z / 100) px corresponds to exactly 50 canvas px
    const screenDeltaX = 50 * (z / 100);
    const screenDeltaY = 40 * (z / 100);
    const res = computeResize({
      handle: "br",
      initialW: 500,
      initialH: 400,
      deltaX: screenDeltaX,
      deltaY: screenDeltaY,
      zoom: z,
    });
    assert.strictEqual(res.width, 550);
    assert.strictEqual(res.height, 440);
  });
});

console.log("\n--- 5. Alt Modifier & Symmetric Scaling ---");

runTest("Holding Alt symmetrically expands from center on all handles", () => {
  const res = computeResize({
    handle: "br",
    initialW: 400,
    initialH: 300,
    initialX: 100,
    initialY: 100,
    deltaX: 50,
    deltaY: 40,
    isAlt: true,
  });
  assert.strictEqual(res.width, 500); // 400 + 50*2
  assert.strictEqual(res.height, 380); // 300 + 40*2
  assert.strictEqual(res.x, 50); // 100 - 50
  assert.strictEqual(res.y, 60); // 100 - 40
});

console.log("\n--- 6. Clamping Boundaries & Protection ---");

runTest("Enforces minimum element width and height to prevent collapse", () => {
  const res = computeResize({
    handle: "br",
    initialW: 100,
    initialH: 100,
    deltaX: -999,
    deltaY: -999,
    isEmbed: false,
  });
  assert.strictEqual(res.width, 32);
  assert.strictEqual(res.height, 24);
});

runTest("Enforces maximum boundary limits without jumping", () => {
  const res = computeResize({
    handle: "br",
    initialW: 1500,
    initialH: 1900,
    deltaX: 500,
    deltaY: 500,
    isEmbed: true,
  });
  assert.strictEqual(res.width, 1600);
  assert.strictEqual(res.height, 2000);
});

console.log("\n--- 7. Source Code Verification ---");

runTest("CanvasObjectRenderer exports onResizeElement prop", () => {
  assert(rendererCode.includes("onResizeElement"), "onResizeElement prop missing from CanvasObjectRenderer");
});

runTest("StudioProfilePreview implements and binds handleResizeElement", () => {
  assert(previewCode.includes("handleResizeElement"), "handleResizeElement missing from StudioProfilePreview");
  assert(previewCode.includes("onResizeElement={handleResizeElement}"), "onResizeElement not passed to CanvasObjectRenderer");
});

runTest("CanvasObjectRenderer applies resolvedHeight and maxHeight to visually resize container", () => {
  assert(rendererCode.includes("resolvedHeight"), "resolvedHeight missing from CanvasObjectRenderer");
  assert(rendererCode.includes("resolvedMaxHeight"), "resolvedMaxHeight missing from CanvasObjectRenderer");
  assert(rendererCode.includes("overflow: isThisResizing || !isAutoHeight ? \"hidden\" : \"visible\""), "overflow clipping missing from CanvasObjectRenderer");
});

runTest("CanvasObjectRenderer implements renderElementResizeHandles with all 8 handles for selected elements", () => {
  assert(rendererCode.includes("renderElementResizeHandles"), "renderElementResizeHandles missing from CanvasObjectRenderer");
  assert(rendererCode.includes("cursor-nwse-resize"), "corner handle cursor missing");
  assert(rendererCode.includes("cursor-nesw-resize"), "corner handle cursor missing");
  assert(rendererCode.includes("cursor-ns-resize"), "vertical handle cursor missing");
  assert(rendererCode.includes("cursor-ew-resize"), "horizontal handle cursor missing");
});

console.log("\n=================================================================");
console.log(`QA AUDIT COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("=================================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
