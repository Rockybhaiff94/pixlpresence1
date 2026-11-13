const assert = require('assert');

// Simulate the runtime logic of updateConfigWithHistory and ProfileClientView
function createDefaultConfig() {
  const primaryEmbedId = "embed_primary";
  const maxWidth = 580;

  return {
    version: 2,
    mode: "studio",
    layout: {
      preset: "centered",
      maxWidth: 580,
      padding: 32,
      gap: 24,
      alignment: "center",
      elementOrder: ["avatar", "identity", "rpc", "music", "buttons", "socials"],
    },
    identity: {
      titleFont: "Space Grotesk",
      titleSize: 26,
      titleWeight: 700,
      titleColor: "#ffffff",
      bioFont: "Inter",
      bioColor: "#a3a3a3",
      badgeStyle: "glyph",
    },
    avatar: {
      shape: "rounded",
      size: 96,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.4)",
      glow: false,
      glowColor: "#ffffff",
      shadow: true,
      hoverAnimation: "scale",
    },
    discordRpc: {
      style: "compact",
      imageLayout: "standard",
      borderRadius: 16,
      showTelemetryBadge: true,
      showTimer: true,
      showProfileRpc: true,
      enableDiscordRpc: true,
    },
    typography: {
      headingFont: "Space Grotesk",
      bodyFont: "Inter",
      letterSpacing: 0,
      lineHeight: 1.4,
    },
    buttons: {
      variant: "default",
      borderRadius: 14,
      hoverEffect: "lift",
      animation: "none",
    },
    socials: {
      style: "default",
      iconSize: 20,
      alignment: "center",
      spacing: 12,
    },
    effects: {
      glassmorphism: true,
      blur: 16,
      opacity: 85,
      particles: "none",
      scanlines: false,
      noise: false,
      tiltEffect: false,
      ambientGlow: false,
      glowColor: "#ffffff",
    },
    advanced: {
      soundEffects: true,
      watermark: true,
      wireframeMode: false,
      moreOptionsPanelSize: 100,
    },
    layers: [],
    canvas: {
      embeds: [
        {
          id: primaryEmbedId,
          title: "Primary Profile Embed",
          transform: { x: 0, y: 0, width: maxWidth, height: 640, rotation: 0, zIndex: 1 },
          style: { padding: 28, borderRadius: 24, backgroundColor: "rgba(10, 10, 14, 0.85)" },
          childrenIds: ["avatar_1", "username_1", "bio_1"],
          isLocked: false,
          isVisible: true,
        },
      ],
      elements: [
        {
          id: "avatar_1",
          type: "avatar",
          transform: { x: 0, y: 0, width: 96, height: 96, rotation: 0, zIndex: 2 },
          isLocked: false,
          isVisible: true,
        },
        {
          id: "username_1",
          type: "username",
          transform: { x: 0, y: 110, width: 520, height: 36, rotation: 0, zIndex: 2 },
          style: {
            fontFamily: "Space Grotesk",
            fontSize: 26,
            fontWeight: 700,
            color: "#ffffff",
            hasCustomTypographyOverride: false,
          },
          isLocked: false,
          isVisible: true,
        },
        {
          id: "bio_1",
          type: "bio",
          transform: { x: 0, y: 185, width: 520, height: 48, rotation: 0, zIndex: 2 },
          style: {
            fontFamily: "Inter",
            fontSize: 14,
            color: "#a3a3a3",
            hasCustomTypographyOverride: false,
          },
          isLocked: false,
          isVisible: true,
        },
      ],
    },
  };
}

// Synchronizer function mirroring page.tsx updateConfigWithHistory
function synchronizeConfig(next) {
  let synchronizedCanvas = next.canvas;
  if (synchronizedCanvas && synchronizedCanvas.embeds && synchronizedCanvas.embeds.length > 0) {
    const maxWidth = next.layout?.maxWidth || 580;
    const padding = next.layout?.padding || 28;
    const borderRadius = next.discordRpc?.borderRadius ?? 24;
    const avatarSize = next.avatar?.size || 96;

    const titleFont = next.identity?.titleFont || next.typography?.headingFont || "Space Grotesk";
    const titleColor = next.identity?.titleColor || "#ffffff";
    const titleSize = next.identity?.titleSize || 26;
    const titleWeight = next.identity?.titleWeight || 700;

    const bioFont = next.identity?.bioFont || next.typography?.bodyFont || "Inter";
    const bioColor = next.identity?.bioColor || "#a3a3a3";
    const bioSize = next.identity?.bioSize || 14;

    const embeds = synchronizedCanvas.embeds.map((em) => {
      if (em.id === "embed_primary") {
        return {
          ...em,
          transform: { ...em.transform, width: maxWidth },
          style: { ...em.style, padding, borderRadius },
        };
      }
      return em;
    });

    const elements = synchronizedCanvas.elements.map((el) => {
      if (el.id === "avatar_1" || el.type === "avatar") {
        return {
          ...el,
          transform: { ...el.transform, width: avatarSize, height: avatarSize },
        };
      }
      if (el.style?.hasCustomTypographyOverride) return el;

      if (el.id === "username_1" || el.type === "username" || el.type === "displayName") {
        return {
          ...el,
          transform: { ...el.transform, width: Math.max(120, maxWidth - 60) },
          style: {
            ...el.style,
            fontFamily: titleFont,
            fontSize: titleSize,
            fontWeight: titleWeight,
            color: titleColor,
          },
        };
      }

      if (el.id === "bio_1" || el.type === "bio") {
        return {
          ...el,
          transform: { ...el.transform, width: Math.max(120, maxWidth - 60) },
          style: {
            ...el.style,
            fontFamily: bioFont,
            fontSize: bioSize,
            color: bioColor,
          },
        };
      }

      return el;
    });

    synchronizedCanvas = {
      ...synchronizedCanvas,
      embeds,
      elements,
    };
  }

  return {
    ...next,
    ...(synchronizedCanvas ? { canvas: synchronizedCanvas } : {}),
  };
}

console.log('--- RUNNING STUDIO RUNTIME SYNCHRONIZATION TEST SUITE ---');

// Test 1: Layout max width updates primary embed width and text element widths
let cfg = createDefaultConfig();
cfg.layout.maxWidth = 720;
cfg.layout.padding = 40;
cfg.discordRpc.borderRadius = 28;
let syncd = synchronizeConfig(cfg);

assert.strictEqual(syncd.canvas.embeds[0].transform.width, 720, 'Primary embed width tracks layout.maxWidth');
assert.strictEqual(syncd.canvas.embeds[0].style.padding, 40, 'Primary embed padding tracks layout.padding');
assert.strictEqual(syncd.canvas.embeds[0].style.borderRadius, 28, 'Primary embed borderRadius tracks discordRpc.borderRadius');
assert.strictEqual(syncd.canvas.elements.find(e => e.id === 'username_1').transform.width, 660, 'Username width adapts to layout.maxWidth');
console.log('✓ Test 1 Passed: Layout sliders synchronize primary embed and children width');

// Test 2: Avatar size updates avatar_1 element dimensions
cfg = syncd;
cfg.avatar.size = 128;
syncd = synchronizeConfig(cfg);
const avatarEl = syncd.canvas.elements.find(e => e.id === 'avatar_1');
assert.strictEqual(avatarEl.transform.width, 128, 'Avatar width tracks avatar.size');
assert.strictEqual(avatarEl.transform.height, 128, 'Avatar height tracks avatar.size');
console.log('✓ Test 2 Passed: Avatar size slider synchronizes avatar element transform');

// Test 3: Typography & Identity updates text styling
cfg = syncd;
cfg.identity.titleFont = 'Orbitron';
cfg.identity.titleColor = '#38bdf8';
cfg.identity.titleSize = 32;
cfg.identity.bioFont = 'Fira Code';
cfg.identity.bioColor = '#cbd5e1';
syncd = synchronizeConfig(cfg);

const userEl = syncd.canvas.elements.find(e => e.id === 'username_1');
const bioEl = syncd.canvas.elements.find(e => e.id === 'bio_1');

assert.strictEqual(userEl.style.fontFamily, 'Orbitron', 'Username font tracks identity.titleFont');
assert.strictEqual(userEl.style.color, '#38bdf8', 'Username color tracks identity.titleColor');
assert.strictEqual(userEl.style.fontSize, 32, 'Username size tracks identity.titleSize');
assert.strictEqual(bioEl.style.fontFamily, 'Fira Code', 'Bio font tracks identity.bioFont');
assert.strictEqual(bioEl.style.color, '#cbd5e1', 'Bio color tracks identity.bioColor');
console.log('✓ Test 3 Passed: Identity & Typography synchronize canvas text styling');

// Test 4: Custom overrides are preserved
userEl.style.hasCustomTypographyOverride = true;
userEl.style.color = '#ff0000';
cfg = syncd;
cfg.identity.titleColor = '#00ff00';
syncd = synchronizeConfig(cfg);
const preservedUserEl = syncd.canvas.elements.find(e => e.id === 'username_1');
assert.strictEqual(preservedUserEl.style.color, '#ff0000', 'Custom override is preserved');
console.log('✓ Test 4 Passed: Elements with custom typography override are safely preserved');

// Test 5: Serialization and ProfileClientView hydration
const serialized = JSON.stringify(syncd);
const parsed = JSON.parse(serialized);
assert.strictEqual(parsed.layout.maxWidth, 720);
assert.strictEqual(parsed.advanced.moreOptionsPanelSize, 100);
assert.strictEqual(parsed.canvas.embeds[0].transform.width, 720);
console.log('✓ Test 5 Passed: Profile payload serializes and hydrates without data loss');

console.log('\nALL 5 RUNTIME SYNCHRONIZATION TESTS PASSED PERFECTLY!');

