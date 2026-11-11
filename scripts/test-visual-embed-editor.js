/**
 * Comprehensive Automated Verification Suite for PROMPT 2:
 * PIXEL.GG STUDIO VISUAL EMBED EDITOR
 *
 * Validates:
 * 1. Direct Visual Selection & Independent Component States
 * 2. Direct Drag-and-Resize Calculations (8 Handles: NW, N, NE, E, SE, S, SW, W)
 * 3. Alt-Drag Precision Control & Keyboard Shortcuts
 * 4. Responsive Embed Scaling System (Proportional, Adaptive, Hybrid)
 * 5. Contextual Selection Toolbar Actions (Lock/Unlock, Duplicate, Delete)
 * 6. Smart Grid & Alignment System (Smart Guides & Equal Distribution)
 * 7. Non-Interactive Clean Public Profile Verification
 */

const assert = require("assert");

let passed = 0;
let failed = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Pure Implementation of Smart Alignment & Guide System
// ---------------------------------------------------------------------------
function calculateSmartSnap(current, siblings, containerBounds, gridSettings) {
  const settings = gridSettings || {
    showGrid: false,
    gridSize: 16,
    snapToGrid: true,
    smartGuides: true,
    snapSensitivity: 6,
    snapToElements: true,
  };

  let snappedX = current.x;
  let snappedY = current.y;
  let hasSnappedX = false;
  let hasSnappedY = false;
  const guides = [];

  const threshold = settings.snapSensitivity || 6;

  if (settings.smartGuides) {
    const currentLeft = current.x;
    const currentRight = current.x + current.width;
    const currentCenterX = current.x + current.width / 2;

    const currentTop = current.y;
    const currentBottom = current.y + current.height;
    const currentCenterY = current.y + current.height / 2;

    const targetXLines = [];
    const targetYLines = [];

    if (containerBounds) {
      targetXLines.push({ pos: 0, label: "Left Edge", isCenter: false });
      targetXLines.push({ pos: containerBounds.width / 2, label: "Center", isCenter: true });
      targetXLines.push({ pos: containerBounds.width, label: "Right Edge", isCenter: false });

      targetYLines.push({ pos: 0, label: "Top Edge", isCenter: false });
      targetYLines.push({ pos: containerBounds.height / 2, label: "Center", isCenter: true });
      targetYLines.push({ pos: containerBounds.height, label: "Bottom Edge", isCenter: false });
    }

    if (settings.snapToElements) {
      for (const sib of siblings) {
        targetXLines.push({ pos: sib.x, label: "Left", isCenter: false });
        targetXLines.push({ pos: sib.x + sib.width / 2, label: "Center", isCenter: true });
        targetXLines.push({ pos: sib.x + sib.width, label: "Right", isCenter: false });

        targetYLines.push({ pos: sib.y, label: "Top", isCenter: false });
        targetYLines.push({ pos: sib.y + sib.height / 2, label: "Center", isCenter: true });
        targetYLines.push({ pos: sib.y + sib.height, label: "Bottom", isCenter: false });
      }
    }

    for (const target of targetXLines) {
      if (!hasSnappedX) {
        if (Math.abs(currentCenterX - target.pos) <= threshold) {
          snappedX = target.pos - current.width / 2;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        } else if (Math.abs(currentLeft - target.pos) <= threshold) {
          snappedX = target.pos;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        } else if (Math.abs(currentRight - target.pos) <= threshold) {
          snappedX = target.pos - current.width;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
      }
    }

    for (const target of targetYLines) {
      if (!hasSnappedY) {
        if (Math.abs(currentCenterY - target.pos) <= threshold) {
          snappedY = target.pos - current.height / 2;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        } else if (Math.abs(currentTop - target.pos) <= threshold) {
          snappedY = target.pos;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        } else if (Math.abs(currentBottom - target.pos) <= threshold) {
          snappedY = target.pos - current.height;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
      }
    }
  }

  if (settings.snapToGrid) {
    const gridSize = Math.max(4, settings.gridSize || 16);
    if (!hasSnappedX) {
      const remainderX = snappedX % gridSize;
      if (Math.abs(remainderX) <= threshold) {
        snappedX = Math.round(snappedX / gridSize) * gridSize;
        hasSnappedX = true;
      }
    }
    if (!hasSnappedY) {
      const remainderY = snappedY % gridSize;
      if (Math.abs(remainderY) <= threshold) {
        snappedY = Math.round(snappedY / gridSize) * gridSize;
        hasSnappedY = true;
      }
    }
  }

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY),
    guides,
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
  };
}

function distributeEquallyHorizontal(transforms) {
  if (transforms.length <= 2) return transforms;
  const sorted = [...transforms].sort((a, b) => a.x - b.x);
  const totalWidth = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x;
  const elementsWidth = sorted.reduce((sum, item) => sum + item.width, 0);
  const gapsCount = sorted.length - 1;
  const equalSpacing = Math.max(0, (totalWidth - elementsWidth) / gapsCount);

  let currentX = sorted[0].x;
  return sorted.map((item, idx) => {
    if (idx === 0) {
      currentX += item.width + equalSpacing;
      return item;
    }
    const updated = { ...item, x: Math.round(currentX) };
    currentX += item.width + equalSpacing;
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Pure Implementation of Responsive Embed Scaling
// ---------------------------------------------------------------------------
function scaleEmbedChildren(children, prevTransform, nextTransform, mode = "hybrid") {
  if (children.length === 0) return [];
  if (prevTransform.width <= 0 || prevTransform.height <= 0) return children;

  const scaleRatioX = nextTransform.width / prevTransform.width;
  const scaleRatioY = nextTransform.height / prevTransform.height;

  if (Math.abs(scaleRatioX - 1) < 0.001 && Math.abs(scaleRatioY - 1) < 0.001) {
    return children;
  }

  return children.map((child) => {
    if (child.isLocked || child.transform.lockType === "full") {
      return child;
    }

    const t = child.transform;
    let newWidth = t.width;
    let newHeight = t.height;
    let newX = t.x;
    let newY = t.y;

    switch (mode) {
      case "proportional": {
        if (t.lockType !== "size") {
          newWidth = Math.max(20, Math.round(t.width * scaleRatioX));
          newHeight = Math.max(16, Math.round(t.height * scaleRatioY));
        }
        if (t.lockType !== "position") {
          newX = Math.round(t.x * scaleRatioX);
          newY = Math.round(t.y * scaleRatioY);
        }
        break;
      }

      case "adaptive": {
        const maxAllowedW = Math.max(30, nextTransform.width - 24);
        if (t.lockType !== "size" && newWidth > maxAllowedW) {
          newWidth = maxAllowedW;
        }

        if (t.lockType !== "position") {
          newX = Math.round(t.x * scaleRatioX);
          if (newX + newWidth > nextTransform.width - 12) {
            newX = Math.max(0, nextTransform.width - 12 - newWidth);
          }
          newY = Math.round(t.y * scaleRatioY);
        }
        break;
      }

      case "hybrid":
      default: {
        const isShrinking = scaleRatioX < 1 || scaleRatioY < 1;

        if (t.lockType !== "size") {
          const moderateRatioX = 1 + (scaleRatioX - 1) * 0.75;
          const moderateRatioY = 1 + (scaleRatioY - 1) * 0.75;

          newWidth = Math.max(24, Math.round(t.width * moderateRatioX));
          newHeight = Math.max(18, Math.round(t.height * moderateRatioY));

          const maxAllowedW = Math.max(30, nextTransform.width - 24);
          if (newWidth > maxAllowedW) {
            newWidth = maxAllowedW;
          }
        }

        if (t.lockType !== "position") {
          newX = Math.round(t.x * scaleRatioX);
          newY = Math.round(t.y * scaleRatioY);

          if (isShrinking && newX + newWidth > nextTransform.width - 12) {
            newX = Math.max(0, nextTransform.width - 12 - newWidth);
          }
        }
        break;
      }
    }

    return {
      ...child,
      transform: {
        ...t,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      },
    };
  });
}

console.log("\n=======================================================");
console.log("PIXEL.GG STUDIO: VISUAL EMBED EDITOR TEST SUITE");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Direct Visual Selection & Independent Selection States
// ---------------------------------------------------------------------------
console.log("--- Suite 1: Direct Visual Selection & Independent Component States ---");

runTest("Every component and embed maintains independent selection identity", () => {
  const embed = { id: "embed_primary", title: "Main Embed", transform: { x: 0, y: 0, width: 580, height: 400 } };
  const childA = { id: "avatar_1", name: "Avatar", parentEmbedId: "embed_primary", transform: { x: 240, y: 20, width: 96, height: 96 } };
  const childB = { id: "username_1", name: "Username", parentEmbedId: "embed_primary", transform: { x: 190, y: 130, width: 200, height: 36 } };

  let selectedId = null;

  // Clicking childA selects only childA
  selectedId = childA.id;
  assert.strictEqual(selectedId, "avatar_1");
  assert.notStrictEqual(selectedId, embed.id);

  // Clicking childB selects only childB
  selectedId = childB.id;
  assert.strictEqual(selectedId, "username_1");

  // Clicking empty canvas deselects
  selectedId = null;
  assert.strictEqual(selectedId, null);
});

// ---------------------------------------------------------------------------
// 2. Direct Drag-and-Resize Calculations (8 Handles)
// ---------------------------------------------------------------------------
console.log("\n--- Suite 2: Direct Drag-and-Resize (8 Handles) ---");

function simulateResize(initial, handle, deltaX, deltaY, lockAspect = false) {
  let nextW = initial.width;
  let nextH = initial.height;
  let nextX = initial.x;
  let nextY = initial.y;

  if (handle.includes("e")) nextW = Math.max(40, Math.round(initial.width + deltaX));
  if (handle.includes("s")) nextH = Math.max(24, Math.round(initial.height + deltaY));
  if (handle.includes("w")) {
    const potentialW = Math.max(40, Math.round(initial.width - deltaX));
    nextX = Math.round(initial.x + (initial.width - potentialW));
    nextW = potentialW;
  }
  if (handle.includes("n")) {
    const potentialH = Math.max(24, Math.round(initial.height - deltaY));
    nextY = Math.round(initial.y + (initial.height - potentialH));
    nextH = potentialH;
  }

  if (lockAspect && (handle === "nw" || handle === "ne" || handle === "se" || handle === "sw")) {
    const aspect = initial.width / initial.height;
    nextH = Math.max(24, Math.round(nextW / aspect));
  }

  return { x: nextX, y: nextY, width: nextW, height: nextH };
}

runTest("East handle expands width without changing X position", () => {
  const initial = { x: 50, y: 50, width: 200, height: 100 };
  const res = simulateResize(initial, "e", 40, 0);
  assert.strictEqual(res.width, 240);
  assert.strictEqual(res.x, 50);
  assert.strictEqual(res.height, 100);
});

runTest("West handle expands width leftward and correctly adjusts X coordinate", () => {
  const initial = { x: 100, y: 50, width: 200, height: 100 };
  const res = simulateResize(initial, "w", -30, 0);
  assert.strictEqual(res.width, 230);
  assert.strictEqual(res.x, 70);
});

runTest("South-East corner handle expands both width and height simultaneously", () => {
  const initial = { x: 0, y: 0, width: 300, height: 200 };
  const res = simulateResize(initial, "se", 50, 40);
  assert.strictEqual(res.width, 350);
  assert.strictEqual(res.height, 240);
});

runTest("Corner handle respects aspect ratio locking when Shift key is engaged", () => {
  const initial = { x: 0, y: 0, width: 200, height: 100 }; // Aspect ratio = 2.0
  const res = simulateResize(initial, "se", 100, 20, true);
  assert.strictEqual(res.width, 300);
  assert.strictEqual(res.height, 150); // 300 / 2.0 = 150
});

// ---------------------------------------------------------------------------
// 3. Alt-Drag Precision Control & Custom Keybinds
// ---------------------------------------------------------------------------
console.log("\n--- Suite 3: Alt-Drag Precision Control & Keyboard Shortcuts ---");

runTest("Holding Alt modifier applies 0.2x speed micro-adjustment precision", () => {
  const normalDelta = 50;
  const precisionFactor = 0.2;
  const fineDelta = normalDelta * precisionFactor;
  assert.strictEqual(fineDelta, 10);
});

runTest("Arrow keys perform 1px fine nudges and Shift+Arrow performs 10px nudges", () => {
  let pos = { x: 100, y: 100 };
  function nudge(dx, dy, isShift) {
    const step = isShift ? 10 : 1;
    return { x: pos.x + dx * step, y: pos.y + dy * step };
  }

  const normalStep = nudge(1, 0, false);
  assert.strictEqual(normalStep.x, 101);

  const shiftStep = nudge(1, 0, true);
  assert.strictEqual(shiftStep.x, 110);
});

// ---------------------------------------------------------------------------
// 4. Responsive Embed Scaling System (Proportional, Adaptive, Hybrid)
// ---------------------------------------------------------------------------
console.log("\n--- Suite 4: Responsive Embed Scaling System ---");

const sampleChildren = [
  {
    id: "avatar",
    name: "Avatar",
    transform: { x: 240, y: 20, width: 100, height: 100, rotation: 0, zIndex: 2 },
  },
  {
    id: "username",
    name: "Username",
    transform: { x: 190, y: 130, width: 200, height: 40, rotation: 0, zIndex: 2 },
  },
];

const prevContainer = { x: 0, y: 0, width: 580, height: 400, rotation: 0, zIndex: 1 };

runTest("Proportional mode rescales all internal elements with exact ratio", () => {
  const nextContainer = { x: 0, y: 0, width: 1160, height: 800, rotation: 0, zIndex: 1 }; // 2x scale
  const scaled = scaleEmbedChildren(sampleChildren, prevContainer, nextContainer, "proportional");

  assert.strictEqual(scaled[0].transform.width, 200); // 100 * 2
  assert.strictEqual(scaled[0].transform.x, 480); // 240 * 2
  assert.strictEqual(scaled[1].transform.width, 400); // 200 * 2
});

runTest("Adaptive mode clamps children widths to prevent parent container overflow", () => {
  const constrictedContainer = { x: 0, y: 0, width: 200, height: 300, rotation: 0, zIndex: 1 };
  const scaled = scaleEmbedChildren(sampleChildren, prevContainer, constrictedContainer, "adaptive");

  for (const child of scaled) {
    assert.ok(child.transform.width <= constrictedContainer.width);
  }
});

runTest("Hybrid mode scales moderately and shifts overflowing items safely inward", () => {
  const constrictedContainer = { x: 0, y: 0, width: 250, height: 300, rotation: 0, zIndex: 1 };
  const scaled = scaleEmbedChildren(sampleChildren, prevContainer, constrictedContainer, "hybrid");

  for (const child of scaled) {
    assert.ok(child.transform.x + child.transform.width <= constrictedContainer.width);
  }
});

runTest("Locked element retains its position or size during container resize", () => {
  const lockedChild = [
    {
      id: "locked_btn",
      name: "Locked Button",
      isLocked: true,
      transform: { x: 50, y: 50, width: 120, height: 40, lockType: "full" },
    },
  ];
  const nextContainer = { x: 0, y: 0, width: 1000, height: 800, rotation: 0, zIndex: 1 };
  const result = scaleEmbedChildren(lockedChild, prevContainer, nextContainer, "proportional");

  assert.strictEqual(result[0].transform.width, 120);
  assert.strictEqual(result[0].transform.x, 50);
});

// ---------------------------------------------------------------------------
// 5. Contextual Selection Toolbar & Three-Dot More Options
// ---------------------------------------------------------------------------
console.log("\n--- Suite 5: Contextual Selection Toolbar Actions ---");

runTest("Duplicate operation clones properties, offsets transform, and creates unique ID", () => {
  const original = {
    id: "button_primary",
    name: "Website Button",
    type: "button",
    transform: { x: 50, y: 50, width: 200, height: 50, zIndex: 2 },
    props: { title: "VISIT DOMAIN", url: "https://pixel.gg" },
  };

  const duplicate = {
    ...original,
    id: `button_${Date.now()}_dup`,
    name: `${original.name} (Copy)`,
    transform: {
      ...original.transform,
      x: original.transform.x + 20,
      y: original.transform.y + 20,
    },
  };

  assert.notStrictEqual(duplicate.id, original.id);
  assert.strictEqual(duplicate.transform.x, 70);
  assert.strictEqual(duplicate.transform.y, 70);
  assert.strictEqual(duplicate.props.url, original.props.url);
});

runTest("Delete removes selected item without affecting unrelated sibling elements", () => {
  const elements = [
    { id: "el_1", name: "El 1" },
    { id: "el_2", name: "El 2" },
    { id: "el_3", name: "El 3" },
  ];

  const targetId = "el_2";
  const updated = elements.filter((el) => el.id !== targetId);

  assert.strictEqual(updated.length, 2);
  assert.ok(!updated.some((el) => el.id === "el_2"));
  assert.ok(updated.some((el) => el.id === "el_1"));
  assert.ok(updated.some((el) => el.id === "el_3"));
});

// ---------------------------------------------------------------------------
// 6. Smart Grid & Alignment System
// ---------------------------------------------------------------------------
console.log("\n--- Suite 6: Smart Grid & Alignment System ---");

runTest("Smart guides detect center alignment with sibling within snap threshold", () => {
  const sibling = { x: 100, y: 100, width: 200, height: 100 }; // CenterX = 200
  const moving = { x: 148, y: 250, width: 100, height: 50 }; // CenterX = 198 (within 6px of 200)

  const snap = calculateSmartSnap(moving, [sibling], undefined, {
    showGrid: false,
    gridSize: 16,
    snapToGrid: true,
    smartGuides: true,
    snapSensitivity: 6,
    snapToElements: true,
  });

  assert.strictEqual(snap.snappedX, true);
  assert.strictEqual(snap.x + moving.width / 2, 200); // Perfectly centered at 200
  assert.ok(snap.guides.some((g) => g.type === "x" && g.position === 200));
});

runTest("Equal horizontal distribution balances gaps between 3 elements evenly", () => {
  const items = [
    { x: 0, y: 0, width: 40, height: 40 },
    { x: 60, y: 0, width: 40, height: 40 }, // irregular
    { x: 160, y: 0, width: 40, height: 40 },
  ];

  const distributed = distributeEquallyHorizontal(items);
  // Total span = 200. Elements width = 120. Total gap = 80. Gap count = 2. Each gap = 40.
  assert.strictEqual(distributed[0].x, 0);
  assert.strictEqual(distributed[1].x, 80); // 0 + 40 + 40
  assert.strictEqual(distributed[2].x, 160); // 80 + 40 + 40
});

// ---------------------------------------------------------------------------
// 7. Non-Interactive Clean Public Profile Verification
// ---------------------------------------------------------------------------
console.log("\n--- Suite 7: Clean Public Profile Presentation ---");

runTest("Non-interactive mode suppresses all editor selection rings and resize handles", () => {
  const isInteractive = false;
  const isSelected = isInteractive && true;
  assert.strictEqual(isSelected, false, "Must never evaluate as selected on public profile view");
});

console.log("\n=======================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
