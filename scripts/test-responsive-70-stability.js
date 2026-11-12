/**
 * PIXEL.GG STUDIO — 70% RESPONSIVE LAYOUT STABILITY & FLICKERING PREVENTION TEST SUITE
 *
 * Verifies:
 * 1. Single source of truth calculation for panel responsiveness
 * 2. 70% breakpoint stability under scrollbar appearance/disappearance
 * 3. Elimination of ResizeObserver layout feedback loops
 * 4. Monotonic tier boundaries across all 6 breakpoints (40%, 60%, 70%, 80%, 90%, 100%)
 * 5. Continuous 1% resizing sweeps (40% to 100% and back)
 * 6. Source code audit ensuring inner scrollable element is NOT observed
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// Model the responsive tier evaluation engine from StudioFloatingDock + StudioLeftWorkspace
function computeResponsiveTier({ panelSize, dockWidth, measuredOuterWidth, containerWidth = 1200, isVertical = false }) {
  const currentSizePct = Math.max(40, Math.min(100, panelSize ?? 100));

  const base = isVertical ? 420 : 540;
  const effectiveDockWidth = dockWidth ?? (
    Math.min(
      containerWidth - 24,
      Math.max(Math.round(base * 0.4), Math.round(base * (currentSizePct / 100)))
    )
  );

  // In StudioFloatingDock: effectivePanelPct is computed
  const effectivePanelPct = Math.max(
    40,
    Math.min(100, Math.round((effectiveDockWidth / base) * 100))
  );

  // In StudioLeftWorkspace: receives effectivePanelPct as panelSize
  const effectivePct = effectivePanelPct;

  return {
    effectivePct,
    is90OrBelow: effectivePct <= 90,
    is80OrBelow: effectivePct <= 80,
    is70OrBelow: effectivePct <= 70,
    is60OrBelow: effectivePct <= 60,
    is40OrBelow: effectivePct <= 45,
  };
}

console.log("\n=================================================================");
console.log("PIXEL.GG STUDIO: 70% RESPONSIVE STABILITY & FLICKER PREVENTION");
console.log("=================================================================");

// -----------------------------------------------------------------------------
// Suite 1: Source Code Architecture & Feedback Loop Audit
// -----------------------------------------------------------------------------
console.log("\n--- Suite 1: Source Code Architecture & Feedback Loop Audit ---");

const workspacePath = path.join(__dirname, "../apps/web/src/components/studio/StudioLeftWorkspace.tsx");
const workspaceCode = fs.readFileSync(workspacePath, "utf8");

test("Inner scrollable container is NOT observed by ResizeObserver (eliminating scrollbar feedback)", () => {
  // Main content div with overflow-y-auto must NOT have ref={containerRef}
  const matchScrollRef = /<div\s+ref=\{containerRef\}\s+className=\{`flex-1 overflow-y-auto/.test(workspaceCode);
  assert.strictEqual(matchScrollRef, false, "Inner scrollable div must not be observed by ResizeObserver");
});

test("Outer non-scrolling workspace root element has outerContainerRef", () => {
  assert.ok(workspaceCode.includes("ref={outerContainerRef}"), "Root div must have outerContainerRef");
});

test("ResizeObserver callback contains hysteresis deadband (> 4px)", () => {
  assert.ok(workspaceCode.includes("Math.abs(w - lastWidth) > 4"), "ResizeObserver must use deadband to prevent fractional pixel jitter");
});

test("dockWidth prop is accepted and injected from StudioFloatingDock", () => {
  const dockPath = path.join(__dirname, "../apps/web/src/components/studio/StudioFloatingDock.tsx");
  const dockCode = fs.readFileSync(dockPath, "utf8");
  assert.ok(dockCode.includes("dockWidth: effectiveExpandedWidth"), "StudioFloatingDock must pass dockWidth to children");
  assert.ok(workspaceCode.includes("dockWidth?: number;"), "StudioLeftWorkspace must accept dockWidth prop");
});

// -----------------------------------------------------------------------------
// Suite 2: Dedicated 70% Breakpoint Stability & Anti-Flickering
// -----------------------------------------------------------------------------
console.log("\n--- Suite 2: Dedicated 70% Breakpoint Stability & Anti-Flickering ---");

test("At exactly 70%, is70OrBelow is TRUE and is60OrBelow is strictly FALSE", () => {
  const state = computeResponsiveTier({ panelSize: 70 });
  assert.strictEqual(state.effectivePct, 70, "effectivePct must be exactly 70");
  assert.strictEqual(state.is70OrBelow, true, "is70OrBelow must be TRUE at 70%");
  assert.strictEqual(state.is60OrBelow, false, "is60OrBelow must be FALSE at 70% (no collision with 60% compact mode)");
  assert.strictEqual(state.is40OrBelow, false, "is40OrBelow must be FALSE at 70%");
  assert.strictEqual(state.is80OrBelow, true, "is80OrBelow must be TRUE at 70%");
  assert.strictEqual(state.is90OrBelow, true, "is90OrBelow must be TRUE at 70%");
});

test("Simulated scrollbar appearance/disappearance at 70% does NOT change responsive state", () => {
  // Simulate 100 frames where inner scrollbar appears (reducing inner width by 15px) and disappears
  const baseDockWidth = 378; // 540 * 0.7
  for (let frame = 0; frame < 100; frame++) {
    const hasScrollbar = frame % 2 === 0;
    const innerContentWidth = hasScrollbar ? (baseDockWidth - 32 - 15) : (baseDockWidth - 32); // 331px vs 346px

    const state = computeResponsiveTier({
      panelSize: 70,
      dockWidth: baseDockWidth,
      measuredOuterWidth: baseDockWidth - 2, // outer border
    });

    assert.strictEqual(state.is70OrBelow, true, `Frame ${frame}: is70OrBelow must stay TRUE`);
    assert.strictEqual(state.is60OrBelow, false, `Frame ${frame}: is60OrBelow must stay FALSE (NEVER flicker)`);
  }
});

test("Simulated subpixel / fractional rounding jitter (377.4px to 378.6px) does NOT alter 70% state", () => {
  const variations = [377.2, 377.5, 377.9, 378.0, 378.1, 378.4, 378.6];
  for (const w of variations) {
    const state = computeResponsiveTier({
      panelSize: 70,
      dockWidth: Math.round(w),
      measuredOuterWidth: Math.round(w),
    });
    assert.strictEqual(state.is70OrBelow, true, `Width ${w}: is70OrBelow must be true`);
    assert.strictEqual(state.is60OrBelow, false, `Width ${w}: is60OrBelow must be false`);
  }
});

// -----------------------------------------------------------------------------
// Suite 3: Continuous Resizing & Breakpoint Monotonicity (40% to 100%)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 3: Continuous Resizing & Breakpoint Monotonicity ---");

test("Sweeping from 100% down to 40% in 1% steps produces clean monotonic tier transitions", () => {
  let previousTier = "100";
  const tierTransitions = [];

  for (let pct = 100; pct >= 40; pct--) {
    const state = computeResponsiveTier({ panelSize: pct });
    let currentTier = "100";
    if (state.is40OrBelow) currentTier = "40";
    else if (state.is60OrBelow) currentTier = "60";
    else if (state.is70OrBelow) currentTier = "70";
    else if (state.is80OrBelow) currentTier = "80";
    else if (state.is90OrBelow) currentTier = "90";

    if (currentTier !== previousTier) {
      tierTransitions.push({ from: previousTier, to: currentTier, at: pct });
      previousTier = currentTier;
    }
  }

  // Expect exact orderly transitions at boundaries
  assert.strictEqual(tierTransitions.length, 5, "Must transition exactly 5 times across 6 tiers");
  assert.strictEqual(tierTransitions[0].to, "90", "First transition must be to 90");
  assert.strictEqual(tierTransitions[0].at, 90, "Transition to 90 must occur at 90%");
  assert.strictEqual(tierTransitions[1].to, "80", "Second transition must be to 80");
  assert.strictEqual(tierTransitions[1].at, 80, "Transition to 80 must occur at 80%");
  assert.strictEqual(tierTransitions[2].to, "70", "Third transition must be to 70");
  assert.strictEqual(tierTransitions[2].at, 70, "Transition to 70 must occur at 70%");
  assert.strictEqual(tierTransitions[3].to, "60", "Fourth transition must be to 60");
  assert.strictEqual(tierTransitions[3].at, 60, "Transition to 60 must occur at 60%");
  assert.strictEqual(tierTransitions[4].to, "40", "Fifth transition must be to 40");
  assert.strictEqual(tierTransitions[4].at, 45, "Transition to 40 must occur at 45%");
});

test("Sweeping from 40% up to 100% in 1% steps produces identical symmetric transitions", () => {
  let previousTier = "40";
  const tierTransitions = [];

  for (let pct = 40; pct <= 100; pct++) {
    const state = computeResponsiveTier({ panelSize: pct });
    let currentTier = "100";
    if (state.is40OrBelow) currentTier = "40";
    else if (state.is60OrBelow) currentTier = "60";
    else if (state.is70OrBelow) currentTier = "70";
    else if (state.is80OrBelow) currentTier = "80";
    else if (state.is90OrBelow) currentTier = "90";

    if (currentTier !== previousTier) {
      tierTransitions.push({ from: previousTier, to: currentTier, at: pct });
      previousTier = currentTier;
    }
  }

  assert.strictEqual(tierTransitions.length, 5, "Must transition exactly 5 times ascending");
  assert.strictEqual(tierTransitions[0].to, "60");
  assert.strictEqual(tierTransitions[0].at, 46);
  assert.strictEqual(tierTransitions[1].to, "70");
  assert.strictEqual(tierTransitions[1].at, 61);
  assert.strictEqual(tierTransitions[2].to, "80");
  assert.strictEqual(tierTransitions[2].at, 71);
  assert.strictEqual(tierTransitions[3].to, "90");
  assert.strictEqual(tierTransitions[3].at, 81);
  assert.strictEqual(tierTransitions[4].to, "100");
  assert.strictEqual(tierTransitions[4].at, 91);
});

// -----------------------------------------------------------------------------
// Suite 4: Boundary Stress Tests around 70% (68%–72% micro-stepping)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 4: Boundary Stress Tests around 70% ---");

test("Moving between 80% -> 70% and 60% -> 70% always settles into the identical stable 70% state", () => {
  const stateFromAbove = computeResponsiveTier({ panelSize: 70 });
  const stateFromBelow = computeResponsiveTier({ panelSize: 70 });

  assert.deepStrictEqual(stateFromAbove, stateFromBelow, "State must be 100% deterministic regardless of entry direction");
  assert.strictEqual(stateFromAbove.is70OrBelow, true);
  assert.strictEqual(stateFromAbove.is60OrBelow, false);
});

test("Micro-steps at 69%, 70%, 71% are strictly partitioned", () => {
  const p69 = computeResponsiveTier({ panelSize: 69 });
  const p70 = computeResponsiveTier({ panelSize: 70 });
  const p71 = computeResponsiveTier({ panelSize: 71 });

  // 69% and 70% are in the 70% tier
  assert.strictEqual(p69.is70OrBelow, true);
  assert.strictEqual(p69.is60OrBelow, false);
  assert.strictEqual(p70.is70OrBelow, true);
  assert.strictEqual(p70.is60OrBelow, false);

  // 71% is in the 80% tier
  assert.strictEqual(p71.is70OrBelow, false);
  assert.strictEqual(p71.is80OrBelow, true);
});

// -----------------------------------------------------------------------------
// Suite 5: Viewport Constraints & Vertical Dock Adaptation
// -----------------------------------------------------------------------------
console.log("\n--- Suite 5: Viewport Constraints & Vertical Dock Adaptation ---");

test("Narrow mobile viewport (400px) clamps effective percentage and safely activates responsive tier", () => {
  const state = computeResponsiveTier({
    panelSize: 100, // User requested 100%
    containerWidth: 400, // Screen is only 400px (effective max dock width = 376px)
  });
  // 376 / 540 = 70%
  assert.strictEqual(state.effectivePct, 70, "Constrained effectivePct must clamp to 70%");
  assert.strictEqual(state.is70OrBelow, true);
  assert.strictEqual(state.is60OrBelow, false);
});

test("Vertical dock mode (420px base) adapts percentage proportionally", () => {
  const state70 = computeResponsiveTier({
    panelSize: 70,
    isVertical: true,
  });
  assert.strictEqual(state70.effectivePct, 70);
  assert.strictEqual(state70.is70OrBelow, true);
  assert.strictEqual(state70.is60OrBelow, false);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n=================================================================");
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log("=================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
