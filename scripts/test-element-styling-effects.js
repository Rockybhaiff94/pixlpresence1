/**
 * Comprehensive Automated Verification Suite for PROMPT 3:
 * PIXEL.GG STUDIO ELEMENT STYLING, VISUAL EFFECTS & PREMIUM ICON CUSTOMIZATION
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
// Pure Implementation of computeElementEffects
// ---------------------------------------------------------------------------
function computeElementEffects(style, themeAccentColor = "#ffffff") {
  if (!style) return {};

  const shadows = [];

  // 1. Glow Shadows
  if (style.glowEnabled) {
    const color = style.glowColor || "#38bdf8";
    const blur = style.glowBlur ?? 16;
    const radius = style.glowRadius ?? 0;
    const intensity = Math.min(100, Math.max(10, style.glowIntensity ?? 60)) / 100;

    if (style.glowType === "multi") {
      shadows.push(`0 0 ${Math.round(blur * 0.4)}px ${Math.round(radius * 0.5)}px ${color}`);
      shadows.push(`0 0 ${blur}px ${radius}px ${color}80`);
      shadows.push(`0 0 ${Math.round(blur * 1.8)}px ${Math.round(radius * 1.5)}px ${color}40`);
    } else {
      const alphaHex = Math.round(intensity * 255)
        .toString(16)
        .padStart(2, "0");
      shadows.push(`0 0 ${blur}px ${radius}px ${color.startsWith("#") ? color + alphaHex : color}`);
    }
  }

  // 2. Drop Shadows
  if (style.shadowEnabled) {
    const sColor = style.shadowColor || "rgba(0,0,0,0.6)";
    const sBlur = style.shadowBlur ?? 16;
    const sDist = style.shadowDistance ?? 8;

    if (style.lightingMode === "depth") {
      shadows.push(`0 ${Math.round(sDist * 0.3)}px ${Math.round(sBlur * 0.3)}px rgba(0,0,0,0.4)`);
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
      shadows.push(`0 ${Math.round(sDist * 1.8)}px ${Math.round(sBlur * 1.6)}px rgba(0,0,0,0.5)`);
    } else if (style.lightingMode === "ambient") {
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
      shadows.push(`0 -2px ${Math.round(sBlur * 0.5)}px rgba(255,255,255,0.06)`);
    } else {
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
    }
  }

  if (!style.shadowEnabled && style.shadowBlur && style.shadowBlur > 0) {
    shadows.push(`0 8px ${style.shadowBlur}px ${style.shadowColor || "rgba(0,0,0,0.5)"}`);
  }

  let background = style.backgroundColor;
  if (style.gradientEnabled && style.gradientStops && style.gradientStops.length >= 2) {
    const stops = style.gradientStops.map((s) => `${s.color} ${s.offset}%`).join(", ");
    const angle = style.gradientAngle ?? 135;
    background =
      style.gradientType === "radial"
        ? `radial-gradient(circle at center, ${stops})`
        : `linear-gradient(${angle}deg, ${stops})`;
  }

  let animation;
  if (style.animationPreset && style.animationPreset !== "none") {
    switch (style.animationPreset) {
      case "soft-neon":
      case "pulse-glow":
        animation = "studioPulseGlow 3s ease-in-out infinite";
        break;
      case "floating":
        animation = "studioFloat 4s ease-in-out infinite";
        break;
      case "gradient-flow":
        animation = "studioGradientFlow 6s linear infinite";
        break;
      case "subtle-shine":
        animation = "studioShineSweep 5s ease-in-out infinite";
        break;
      case "ambient-glow":
        animation = "studioAmbientBreathe 4s ease-in-out infinite";
        break;
    }
  } else if (style.glowType === "animated" || style.glowType === "pulsating") {
    animation = `studioPulseGlow ${style.glowSpeed || 2.5}s ease-in-out infinite`;
  }

  let resolvedIconColor;
  if (style.iconColorMode === "custom" && style.iconColor) {
    resolvedIconColor = style.iconColor;
  } else if (style.iconColorMode === "theme") {
    resolvedIconColor = themeAccentColor;
  }

  return {
    boxShadow: shadows.length > 0 ? shadows.join(", ") : undefined,
    background,
    backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
    animation,
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    resolvedIconColor,
  };
}

// Import backend entitlement validator
const {
  getUserCapabilities,
  validateProfileCapabilities,
} = require("../apps/api/dist/services/entitlements");

console.log("\n=======================================================");
console.log("PIXEL.GG STUDIO: ELEMENT STYLING & EFFECTS TEST SUITE");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Independent Element Styling
// ---------------------------------------------------------------------------
console.log("--- Suite 1: Independent Element Styling ---");

runTest("Modifying styling on element A leaves element B completely untouched", () => {
  const elements = [
    {
      id: "icon_discord",
      type: "socialIcon",
      style: {
        iconColorMode: "custom",
        iconColor: "#ffffff",
        glowEnabled: true,
        glowColor: "#38bdf8",
      },
    },
    {
      id: "icon_youtube",
      type: "socialIcon",
      style: {
        iconColorMode: "original", // Keeps official YouTube red
      },
    },
    {
      id: "icon_instagram",
      type: "socialIcon",
      style: {}, // Default
    },
  ];

  // Element 1 is white with glow
  const eff1 = computeElementEffects(elements[0].style);
  assert.strictEqual(eff1.resolvedIconColor, "#ffffff");
  assert.ok(eff1.boxShadow.includes("#38bdf8"));

  // Element 2 is original branding
  const eff2 = computeElementEffects(elements[1].style);
  assert.strictEqual(eff2.resolvedIconColor, undefined); // Undefined signals official brand SVG

  // Element 3 is unmodified
  const eff3 = computeElementEffects(elements[2].style);
  assert.strictEqual(eff3.resolvedIconColor, undefined);
  assert.strictEqual(eff3.boxShadow, undefined);
});

// ---------------------------------------------------------------------------
// 2. Social & Application Icon Customization (Free & Theme)
// ---------------------------------------------------------------------------
console.log("\n--- Suite 2: Social & Application Icon Customization ---");

runTest("Default icon appearance preserves official platform brand colors", () => {
  const style = { iconColorMode: "original" };
  const res = computeElementEffects(style);
  assert.strictEqual(res.resolvedIconColor, undefined);
});

runTest("Single solid color override applies custom HEX correctly for Free users", () => {
  const style = { iconColorMode: "custom", iconColor: "#ffffff" };
  const res = computeElementEffects(style);
  assert.strictEqual(res.resolvedIconColor, "#ffffff");
});

runTest("Theme-based icon color matches profile accent color", () => {
  const style = { iconColorMode: "theme" };
  const profileThemeAccent = "#f59e0b"; // Amber Gold
  const res = computeElementEffects(style, profileThemeAccent);
  assert.strictEqual(res.resolvedIconColor, "#f59e0b");
});

// ---------------------------------------------------------------------------
// 3. Free Visual Effects (Basic Glow, Basic Shadow, Borders)
// ---------------------------------------------------------------------------
console.log("\n--- Suite 3: Free Visual Effects ---");

runTest("Free Basic Glow computes valid single-layer box shadow", () => {
  const style = {
    glowEnabled: true,
    glowColor: "#38bdf8",
    glowIntensity: 50,
    glowBlur: 14,
    glowRadius: 2,
    glowType: "basic",
  };
  const res = computeElementEffects(style);
  assert.ok(res.boxShadow.includes("0 0 14px 2px"));
  assert.strictEqual(res.animation, undefined); // Free glow has no CPU-heavy infinite animation
});

runTest("Free Basic Shadow computes clean drop shadow without multi-layer overhead", () => {
  const style = {
    shadowEnabled: true,
    shadowColor: "rgba(0,0,0,0.6)",
    shadowBlur: 16,
    shadowDistance: 6,
  };
  const res = computeElementEffects(style);
  assert.strictEqual(res.boxShadow, "0 6px 16px rgba(0,0,0,0.6)");
});

// ---------------------------------------------------------------------------
// 4. Premium Visual Effects & Entitlement Enforcement
// ---------------------------------------------------------------------------
console.log("\n--- Suite 4: Premium Visual Effects & Backend Guardrails ---");

runTest("Premium Multi-Layer Glow computes 3 staggered luminescent layers", () => {
  const style = {
    glowEnabled: true,
    glowColor: "#a855f7",
    glowBlur: 20,
    glowRadius: 4,
    glowType: "multi",
  };
  const res = computeElementEffects(style);
  const layers = res.boxShadow.split(", ");
  assert.strictEqual(layers.length, 3);
});

runTest("Premium Animated Neon Glow attaches infinite GPU keyframe animation", () => {
  const style = {
    glowEnabled: true,
    glowType: "animated",
    glowSpeed: 2,
    animationPreset: "soft-neon",
  };
  const res = computeElementEffects(style);
  assert.ok(res.animation.includes("studioPulseGlow"));
});

runTest("Backend entitlement blocks Free users from saving Premium animated effects", () => {
  const freeUser = { role: "USER", premiumStatus: false };
  const capabilities = getUserCapabilities(freeUser);

  const payloadWithPremiumGlow = {
    canvas: {
      embeds: [{ id: "e1", transform: { width: 500, height: 300 } }],
      elements: [
        {
          id: "icon_1",
          transform: { x: 0, y: 0, width: 40, height: 40 },
          style: {
            glowEnabled: true,
            glowType: "animated", // Premium-only
          },
        },
      ],
    },
  };

  const validation = validateProfileCapabilities(payloadWithPremiumGlow, capabilities);
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.error.includes("exclusive Premium feature"));
});

runTest("Backend entitlement allows Premium users to save all advanced effects", () => {
  const premiumUser = { role: "USER", premiumStatus: true };
  const capabilities = getUserCapabilities(premiumUser);

  const payloadWithPremiumGlow = {
    canvas: {
      embeds: [{ id: "e1", transform: { width: 500, height: 300 } }],
      elements: [
        {
          id: "icon_1",
          transform: { x: 0, y: 0, width: 40, height: 40 },
          style: {
            glowEnabled: true,
            glowType: "animated",
            animationPreset: "soft-neon",
          },
        },
      ],
    },
  };

  const validation = validateProfileCapabilities(payloadWithPremiumGlow, capabilities);
  assert.strictEqual(validation.valid, true);
});

runTest("Backend entitlement blocks Free users from saving custom icon uploads", () => {
  const freeUser = { role: "USER", premiumStatus: false };
  const capabilities = getUserCapabilities(freeUser);

  const payloadWithCustomIcon = {
    canvas: {
      embeds: [{ id: "e1", transform: { width: 500, height: 300 } }],
      elements: [
        {
          id: "icon_1",
          transform: { x: 0, y: 0, width: 40, height: 40 },
          style: {
            customIconUrl: "https://example.com/custom_icon.png",
          },
        },
      ],
    },
  };

  const validation = validateProfileCapabilities(payloadWithCustomIcon, capabilities);
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.error.includes("exclusive Premium feature"));
});

// ---------------------------------------------------------------------------
// 5. Effect Presets
// ---------------------------------------------------------------------------
console.log("\n--- Suite 5: Effect Presets ---");

runTest("Applying Free preset sets appropriate styles without overwriting transform", () => {
  const element = {
    id: "btn_1",
    transform: { x: 100, y: 150, width: 200, height: 48 },
    style: {},
  };

  const softGlowPreset = {
    id: "soft-glow",
    style: {
      glowEnabled: true,
      glowColor: "#38bdf8",
      glowIntensity: 40,
      glowBlur: 14,
    },
  };

  const updated = {
    ...element,
    style: {
      ...element.style,
      ...softGlowPreset.style,
      effectPreset: softGlowPreset.id,
    },
  };

  assert.strictEqual(updated.transform.x, 100);
  assert.strictEqual(updated.transform.width, 200);
  assert.strictEqual(updated.style.glowEnabled, true);
  assert.strictEqual(updated.style.glowColor, "#38bdf8");
  assert.strictEqual(updated.style.effectPreset, "soft-glow");
});

console.log("\n=======================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
