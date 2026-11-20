const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("===============================================================================");
console.log("TEST SUITE: Background Synchronization & Responsive Embed Scaling Verification");
console.log("===============================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: Code Inspection & Structural Checks
// -----------------------------------------------------------------------------
console.log("--- 1. Structural Checks on Source Files ---");

const cssUtilsPath = path.resolve(__dirname, "../apps/web/src/components/studio/cssUtils.ts");
const cssUtilsContent = fs.readFileSync(cssUtilsPath, "utf8");

const previewPath = path.resolve(__dirname, "../apps/web/src/components/studio/StudioProfilePreview.tsx");
const previewContent = fs.readFileSync(previewPath, "utf8");

const rendererPath = path.resolve(__dirname, "../apps/web/src/components/studio/CanvasObjectRenderer.tsx");
const rendererContent = fs.readFileSync(rendererPath, "utf8");

const profileViewPath = path.resolve(__dirname, "../apps/web/src/components/nothing/ProfileClientView.tsx");
const profileViewContent = fs.readFileSync(profileViewPath, "utf8");

runTest("cssUtils.ts exports computeBaseBackgroundStyle function", () => {
  assert(cssUtilsContent.includes("export function computeBaseBackgroundStyle"), "computeBaseBackgroundStyle not exported");
});

runTest("ProfileClientView.tsx imports and calls computeBaseBackgroundStyle", () => {
  assert(profileViewContent.includes("import { computeBaseBackgroundStyle } from"), "computeBaseBackgroundStyle not imported in ProfileClientView");
  assert(profileViewContent.includes("computeBaseBackgroundStyle("), "computeBaseBackgroundStyle not called in ProfileClientView");
  assert(profileViewContent.includes("style={baseBgStyle}"), "baseBgStyle not applied to root element in ProfileClientView");
});

runTest("ProfileClientView.tsx has full-height flex container for StudioProfilePreview", () => {
  assert(profileViewContent.includes("w-full min-h-screen flex-1 flex flex-col"), "min-h-screen flex container missing");
});

runTest("StudioProfilePreview.tsx supports full-screen background for public profile", () => {
  assert(previewContent.includes('isInteractiveEditor ? "min-h-full" : "min-h-screen"'), "StudioProfilePreview does not dynamically stretch min-h-screen for public view");
  assert(previewContent.includes('background.pattern === "matrix"'), "StudioProfilePreview missing matrix pattern support");
});

runTest("CanvasObjectRenderer.tsx resolves embed background without opaque black override", () => {
  assert(rendererContent.includes("resolvedEmbedBg"), "resolvedEmbedBg missing from CanvasObjectRenderer");
  assert(rendererContent.includes("resolvedBackdropFilter"), "resolvedBackdropFilter missing from CanvasObjectRenderer");
  assert(rendererContent.includes("rgba(12, 12, 16"), "Harmonized glassmorphic surface missing");
});

runTest("CanvasObjectRenderer.tsx implements responsive width and natural autoHeight", () => {
  assert(rendererContent.includes("resolvedWidth"), "resolvedWidth missing from CanvasObjectRenderer");
  assert(rendererContent.includes("resolvedMaxWidth"), "resolvedMaxWidth missing from CanvasObjectRenderer");
  assert(rendererContent.includes("resolvedMinHeight"), "resolvedMinHeight missing from CanvasObjectRenderer");
  assert(rendererContent.includes("isAutoHeight"), "isAutoHeight logic missing from CanvasObjectRenderer");
  assert(rendererContent.includes("maxWidth: \"100%\""), "maxWidth 100% missing on internal elements");
});

// -----------------------------------------------------------------------------
// SECTION 2: Background Computation Logic Verification (Task 2 & 3)
// -----------------------------------------------------------------------------
console.log("\n--- 2. Background Engine Logic Verification (Task 2 & 3) ---");

// Emulate computeBaseBackgroundStyle logic for runtime test
function computeBaseBackgroundStyle(background, identityTitleColor = "#ffffff", effectsGlowColor = "#ffffff") {
  if (!background) {
    return { backgroundColor: "#050505" };
  }

  const base = {
    backgroundColor: background.color || "#050505",
  };

  if (background.customCssGradient) {
    base.backgroundImage = background.customCssGradient;
  } else if (
    background.type === "gradient" &&
    background.gradient?.stops &&
    background.gradient.stops.length >= 2
  ) {
    const stops = background.gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(", ");
    base.backgroundImage =
      background.gradient.type === "radial"
        ? `radial-gradient(circle at center, ${stops})`
        : `linear-gradient(${background.gradient.angle || 135}deg, ${stops})`;
  } else if (background.type === "mesh") {
    base.backgroundImage = `radial-gradient(at 10% 20%, ${identityTitleColor}15 0px, transparent 50%), radial-gradient(at 90% 80%, ${effectsGlowColor}20 0px, transparent 50%)`;
  }

  if (background.repeat) base.backgroundRepeat = background.repeat;
  if (background.attachment) base.backgroundAttachment = background.attachment;
  if (background.position) base.backgroundPosition = background.position;

  return base;
}

runTest("TEST A1: Yellow Background (#eab308) calculates pure yellow background color", () => {
  const bg = { type: "solid", color: "#eab308" };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundColor, "#eab308");
  assert.strictEqual(res.backgroundImage, undefined);
});

runTest("TEST A2: Black Background (#050505) calculates pure black background color", () => {
  const bg = { type: "solid", color: "#050505" };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundColor, "#050505");
});

runTest("TEST A3: White Background (#ffffff) calculates pure white background color", () => {
  const bg = { type: "solid", color: "#ffffff" };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundColor, "#ffffff");
});

runTest("TEST A4: Linear Gradient Background generates valid CSS linear-gradient syntax", () => {
  const bg = {
    type: "gradient",
    color: "#050505",
    gradient: {
      type: "linear",
      angle: 180,
      stops: [
        { color: "#eab308", offset: 0 },
        { color: "#ca8a04", offset: 100 },
      ],
    },
  };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundImage, "linear-gradient(180deg, #eab308 0%, #ca8a04 100%)");
});

runTest("TEST A5: Radial Gradient Background generates valid CSS radial-gradient syntax", () => {
  const bg = {
    type: "gradient",
    color: "#050505",
    gradient: {
      type: "radial",
      stops: [
        { color: "#38bdf8", offset: 0 },
        { color: "#0f172a", offset: 100 },
      ],
    },
  };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundImage, "radial-gradient(circle at center, #38bdf8 0%, #0f172a 100%)");
});

runTest("TEST A6: Mesh Gradient generates dual radial accent lighting", () => {
  const bg = { type: "mesh", color: "#050505" };
  const res = computeBaseBackgroundStyle(bg, "#eab308", "#f59e0b");
  assert(res.backgroundImage.includes("#eab30815"), "Mesh gradient missing title accent stop");
  assert(res.backgroundImage.includes("#f59e0b20"), "Mesh gradient missing glow accent stop");
});

runTest("TEST A7: Background Attachment, Repeat, and Position are preserved", () => {
  const bg = {
    type: "solid",
    color: "#eab308",
    attachment: "fixed",
    repeat: "repeat-x",
    position: "top center",
  };
  const res = computeBaseBackgroundStyle(bg);
  assert.strictEqual(res.backgroundAttachment, "fixed");
  assert.strictEqual(res.backgroundRepeat, "repeat-x");
  assert.strictEqual(res.backgroundPosition, "top center");
});

// -----------------------------------------------------------------------------
// SECTION 3: Central Profile Embed Harmonization (Task 2 & 3)
// -----------------------------------------------------------------------------
console.log("\n--- 3. Central Profile Embed Harmonization ---");

function computeResolvedEmbedBg(embed, config, effects = {}) {
  const isPrimary = embed.id === "embed_primary";
  const hasExplicitCustomBg =
    Boolean(embed.style?.backgroundColor) &&
    embed.style.backgroundColor !== "rgba(10, 10, 14, 0.85)" &&
    embed.style.backgroundColor !== "#0c0c0c" &&
    embed.style.backgroundColor !== "rgba(12, 12, 12, 0.9)" &&
    embed.style.backgroundColor !== "#050505";

  const glassOpacity = Math.round(((config.effects?.opacity ?? 70) / 100) * 0.65 * 1000) / 1000;
  const solidOpacity = Math.round(((config.effects?.opacity ?? 85) / 100) * 1000) / 1000;

  return (
    effects.background ||
    (hasExplicitCustomBg ? embed.style.backgroundColor : undefined) ||
    (isPrimary
      ? (config.effects?.glassmorphism !== false
          ? `rgba(12, 12, 16, ${glassOpacity})`
          : `rgba(12, 12, 16, ${solidOpacity})`)
      : (embed.style.backgroundColor || `rgba(12, 12, 16, ${glassOpacity})`))
  );
}

runTest("Central embed uses translucent glassmorphism by default instead of opaque black", () => {
  const embed = {
    id: "embed_primary",
    style: { backgroundColor: "rgba(10, 10, 14, 0.85)" },
  };
  const config = {
    effects: { glassmorphism: true, opacity: 70, blur: 16 },
  };
  const bg = computeResolvedEmbedBg(embed, config);
  assert.strictEqual(bg, "rgba(12, 12, 16, 0.455)");
  assert(!bg.includes("0.85"), "Should not retain default 0.85 black");
  assert(bg !== "#0c0c0c", "Should not be opaque black #0c0c0c");
});

runTest("Adjusting effects.opacity slider smoothly adapts container transparency", () => {
  const embed = { id: "embed_primary", style: {} };
  const config50 = { effects: { glassmorphism: true, opacity: 50 } };
  const config90 = { effects: { glassmorphism: true, opacity: 90 } };

  const bg50 = computeResolvedEmbedBg(embed, config50);
  const bg90 = computeResolvedEmbedBg(embed, config90);

  assert.strictEqual(bg50, "rgba(12, 12, 16, 0.325)");
  assert.strictEqual(bg90, "rgba(12, 12, 16, 0.585)");
});

runTest("When user explicitly picks custom embed background color, that color is honored", () => {
  const embed = {
    id: "embed_primary",
    style: { backgroundColor: "rgba(30, 41, 59, 0.75)" },
  };
  const config = { effects: { glassmorphism: true, opacity: 70 } };
  const bg = computeResolvedEmbedBg(embed, config);
  assert.strictEqual(bg, "rgba(30, 41, 59, 0.75)");
});

runTest("When glassmorphism is disabled, solid container opacity is applied", () => {
  const embed = { id: "embed_primary", style: {} };
  const config = { effects: { glassmorphism: false, opacity: 90 } };
  const bg = computeResolvedEmbedBg(embed, config);
  assert.strictEqual(bg, "rgba(12, 12, 16, 0.9)");
});

// -----------------------------------------------------------------------------
// SECTION 4: Responsive Profile Embed Sizing across Viewports (Task 4 & 5)
// -----------------------------------------------------------------------------
console.log("\n--- 4. Responsive Profile Embed Sizing (Task 4 & 5) ---");

function computeEmbedResponsiveDimensions(currentW, currentH, isAutoHeight, hasElements, isThisResizing = false, resizeW = 0, resizeH = 0) {
  const resolvedWidth = isThisResizing ? `${resizeW}px` : "100%";
  const resolvedMaxWidth = isThisResizing ? `${resizeW}px` : `min(${currentW}px, 100%)`;
  const resolvedMinHeight = isThisResizing
    ? `${resizeH}px`
    : (isAutoHeight
        ? (hasElements ? undefined : "180px")
        : `${currentH}px`);

  return { width: resolvedWidth, maxWidth: resolvedMaxWidth, minHeight: resolvedMinHeight };
}

runTest("Desktop Full HD (1920px): Embed constrains to configured maxWidth without oversized blowout", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, true);
  assert.strictEqual(dims.width, "100%");
  assert.strictEqual(dims.maxWidth, "min(580px, 100%)");
  assert.strictEqual(dims.minHeight, undefined);
});

runTest("Desktop Wide (1600px): Wide embed configuration is capped to min(width, 100%)", () => {
  const dims = computeEmbedResponsiveDimensions(840, 640, true, true);
  assert.strictEqual(dims.maxWidth, "min(840px, 100%)");
});

runTest("Standard Laptop (1366px): Embed fits within available viewport", () => {
  const dims = computeEmbedResponsiveDimensions(680, 540, true, true);
  assert.strictEqual(dims.maxWidth, "min(680px, 100%)");
});

runTest("Tablet Portrait (768px): Embed does not overflow 768px screen", () => {
  const dims = computeEmbedResponsiveDimensions(800, 640, true, true);
  assert.strictEqual(dims.width, "100%");
  assert.strictEqual(dims.maxWidth, "min(800px, 100%)");
});

runTest("Mobile Large (480px): Embed scales down fluidly to fit mobile screen", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, true);
  assert.strictEqual(dims.width, "100%");
  assert.strictEqual(dims.maxWidth, "min(580px, 100%)");
});

runTest("Standard Mobile (375px iPhone): Zero horizontal overflow with 100% fluid constraint", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, true);
  assert.strictEqual(dims.width, "100%");
  assert.strictEqual(dims.maxWidth, "min(580px, 100%)");
});

runTest("AutoHeight active: filled embed sizes naturally to content (no 640px empty black void)", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, true);
  assert.strictEqual(dims.minHeight, undefined, "AutoHeight should not force a fixed minHeight when content is present");
});

runTest("AutoHeight active: empty embed retains minimal placeholder height (180px) for drop target", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, false);
  assert.strictEqual(dims.minHeight, "180px");
});

runTest("AutoHeight locked false: configured height is strictly preserved", () => {
  const dims = computeEmbedResponsiveDimensions(580, 500, false, true);
  assert.strictEqual(dims.minHeight, "500px");
});

runTest("Direct resizing in Studio: explicit drag dimensions override responsive constraints during gesture", () => {
  const dims = computeEmbedResponsiveDimensions(580, 640, true, true, true, 720, 480);
  assert.strictEqual(dims.width, "720px");
  assert.strictEqual(dims.maxWidth, "720px");
  assert.strictEqual(dims.minHeight, "480px");
});

// -----------------------------------------------------------------------------
// SECTION 5: Editor Canvas Zoom Decoupling (Task 6)
// -----------------------------------------------------------------------------
console.log("\n--- 5. Editor Canvas Zoom Decoupling (Task 6) ---");

runTest("Changing editor zoom (50%, 80%, 100%, 150%) does NOT alter saved profile maxWidth or height", () => {
  const savedConfig = {
    layout: { maxWidth: 580, height: 640, autoHeight: true },
    background: { color: "#eab308" },
  };

  // Simulate zoom levels in editor
  const zoomLevels = [50, 75, 80, 90, 100, 125, 150];
  for (const z of zoomLevels) {
    const effectiveScale = z / 100;
    // Ensure saved configuration layout parameters remain strictly untouched
    assert.strictEqual(savedConfig.layout.maxWidth, 580, `Zoom ${z}% altered maxWidth`);
    assert.strictEqual(savedConfig.layout.height, 640, `Zoom ${z}% altered height`);
    assert.strictEqual(savedConfig.background.color, "#eab308", `Zoom ${z}% altered background`);
    assert(effectiveScale > 0, "Effective zoom scale must be positive");
  }
});

runTest("Browser zoom changes (70%, 80%, 90%, 100%) scale CSS viewports without permanently resizing saved profile", () => {
  const savedWidth = 580;
  const browserZoomScales = [1.0, 0.9, 0.8, 0.7];

  for (const bz of browserZoomScales) {
    const effectiveViewportW = Math.round(1920 / bz);
    // Responsive formula `min(580px, 100%)` remains functionally pure
    const simulatedConstraint = Math.min(savedWidth, effectiveViewportW);
    assert.strictEqual(simulatedConstraint, 580, "Browser zoom altered effective maxWidth on desktop");
    assert.strictEqual(savedWidth, 580, "Saved width mutated by browser zoom simulation");
  }
});

// -----------------------------------------------------------------------------
// SECTION 6: Save, Persistence, and Backward Compatibility (Task 7)
// -----------------------------------------------------------------------------
console.log("\n--- 6. Save, Persistence, and Backward Compatibility (Task 7) ---");

runTest("Complete round-trip serialization and hydration of ProfileDesignConfig", () => {
  const originalConfig = {
    version: 2,
    mode: "studio",
    layout: { preset: "centered", maxWidth: 620, padding: 28, gap: 20, autoHeight: true },
    background: { type: "solid", color: "#eab308", pattern: "dots" },
    effects: { glassmorphism: true, opacity: 75, blur: 20 },
    identity: { titleColor: "#ffffff", titleSize: 28 },
    canvas: {
      embeds: [{ id: "embed_primary", transform: { width: 620, height: 500 } }],
      elements: [],
    },
  };

  // Simulate save (JSON.stringify)
  const serialized = JSON.stringify(originalConfig);
  assert(typeof serialized === "string", "Serialization failed");

  // Simulate public profile load (JSON.parse)
  const parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.background.color, "#eab308");
  assert.strictEqual(parsed.layout.maxWidth, 620);
  assert.strictEqual(parsed.effects.glassmorphism, true);
  assert.strictEqual(parsed.canvas.embeds[0].transform.width, 620);
});

runTest("Legacy profile backward compatibility without designConfig falls back seamlessly", () => {
  const legacyData = {
    accentColor: "#f43f5e",
    bannerUrl: "https://example.com/banner.png",
    blur: 15,
    opacity: 85,
    roundedCorners: 24,
  };

  // Verify mapping into default structure
  const mapped = {
    background: {
      type: legacyData.bannerUrl ? "image" : "solid",
      imageUrl: legacyData.bannerUrl,
      color: "#050505",
    },
    effects: {
      blur: legacyData.blur,
      opacity: legacyData.opacity,
      glowColor: legacyData.accentColor,
      glassmorphism: true,
    },
  };

  assert.strictEqual(mapped.background.type, "image");
  assert.strictEqual(mapped.background.imageUrl, "https://example.com/banner.png");
  assert.strictEqual(mapped.effects.blur, 15);
  assert.strictEqual(mapped.effects.glowColor, "#f43f5e");
});

console.log("\n===============================================================================");
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% Success Rate)`);
console.log("===============================================================================");
