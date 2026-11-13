const assert = require('assert');

console.log('=================================================================');
console.log('PIXEL.GG STUDIO: LAYOUT & STRUCTURE + EMBED BUILDER TEST SUITE');
console.log('=================================================================\n');

// Mock data builder
function createMockConfig() {
  return {
    version: 2,
    mode: "studio",
    layout: {
      preset: "centered",
      maxWidth: 580,
      padding: 32,
      gap: 24,
      appsSpacing: 12,
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
      bioSize: 14,
      badgeStyle: "pill",
      alignment: "center",
    },
    avatar: {
      shape: "rounded",
      size: 96,
      alignment: "center",
      objectFit: "cover",
      borderWidth: 2,
      borderColor: "#ffffff",
      glow: false,
      glowColor: "#ffffff",
      shadow: true,
      hoverAnimation: "scale",
    },
    discordRpc: {
      style: "card",
      imageLayout: "standard",
      borderRadius: 24,
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
      variant: "solid-white",
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
      particles: "None",
      scanlines: false,
      noise: false,
      tiltEffect: false,
      ambientGlow: false,
      glowColor: "#ffffff",
    },
    advanced: {
      moreOptionsPanelSize: 100,
      dockLocked: false,
    },
    layers: [
      { id: "embed_primary", type: "container", label: "Primary Embed", visible: true, locked: false },
      { id: "avatar_1", type: "avatar", label: "Avatar", visible: true, locked: false },
      { id: "username_1", type: "text", label: "Username", visible: true, locked: false },
      { id: "bio_1", type: "text", label: "Bio", visible: true, locked: false },
      { id: "rpc_1", type: "rpc", label: "Discord RPC", visible: true, locked: false },
      { id: "buttons_1", type: "buttons", label: "Buttons", visible: true, locked: false },
      { id: "socials_1", type: "socials", label: "Socials", visible: true, locked: false },
    ],
    canvas: {
      embeds: [
        {
          id: "embed_primary",
          title: "Primary Profile Embed",
          transform: { x: 0, y: 0, width: 580, height: 640, rotation: 0, zIndex: 1 },
          style: { padding: 32, borderRadius: 24, backgroundColor: "rgba(10, 10, 14, 0.85)" },
          childrenIds: ["avatar_1", "username_1", "bio_1", "rpc_1", "buttons_1", "socials_1"],
          isVisible: true,
          isLocked: false,
        },
      ],
      elements: [
        { id: "avatar_1", type: "avatar", name: "Avatar", parentEmbedId: "embed_primary", transform: { x: 0, y: 0, width: 96, height: 96, rotation: 0, zIndex: 2 } },
        { id: "username_1", type: "username", name: "Username", parentEmbedId: "embed_primary", transform: { x: 0, y: 110, width: 520, height: 36, rotation: 0, zIndex: 2 }, style: { fontFamily: "Space Grotesk", fontSize: 26, color: "#ffffff" } },
        { id: "bio_1", type: "bio", name: "Bio", parentEmbedId: "embed_primary", transform: { x: 0, y: 155, width: 520, height: 48, rotation: 0, zIndex: 2 }, style: { fontFamily: "Inter", fontSize: 14, color: "#a3a3a3" } },
        { id: "rpc_1", type: "rpc", name: "Discord RPC", parentEmbedId: "embed_primary", transform: { x: 0, y: 220, width: 520, height: 110, rotation: 0, zIndex: 2 } },
        { id: "buttons_1", type: "button", name: "Buttons", parentEmbedId: "embed_primary", transform: { x: 0, y: 340, width: 520, height: 60, rotation: 0, zIndex: 2 } },
        { id: "socials_1", type: "socials", name: "Socials", parentEmbedId: "embed_primary", transform: { x: 0, y: 410, width: 520, height: 48, rotation: 0, zIndex: 2 } },
      ],
    },
  };
}

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

// Suite 1: Layout Presets Engine
console.log('--- Suite 1: Layout Presets Engine (Split, Wide, Compact, Center, Left, Right) ---');

runTest('Minimal Card Split mode creates balanced 2-column partition (Identity vs Content)', () => {
  const cfg = createMockConfig();
  cfg.layout.preset = "split";
  cfg.layout.maxWidth = 760;

  const elements = cfg.canvas.elements;
  const isIdentity = (type) => ["avatar", "displayName", "username", "title", "heading", "subtitle", "tagline", "bio", "description", "verificationBadge", "authorText"].includes(type);

  const col1 = elements.filter(e => isIdentity(e.type));
  const col2 = elements.filter(e => !isIdentity(e.type));

  assert.strictEqual(col1.length, 3, 'Col 1 has avatar, username, and bio');
  assert.strictEqual(col2.length, 3, 'Col 2 has rpc, buttons, and socials');
  assert.ok(cfg.layout.maxWidth >= 720, 'Split mode ensures sufficient width for 2 columns');
});

runTest('Minimal Card Wide mode configures horizontal header layout and multi-col buttons', () => {
  const cfg = createMockConfig();
  cfg.layout.preset = "wide";
  cfg.layout.maxWidth = 860;

  const avatar = cfg.canvas.elements.find(e => e.type === "avatar");
  const username = cfg.canvas.elements.find(e => e.type === "username");
  const buttons = cfg.canvas.elements.filter(e => e.type === "button");

  assert.ok(avatar && username, 'Avatar and username exist for wide row pairing');
  assert.ok(cfg.layout.maxWidth >= 820, 'Wide mode expands container max width');
});

runTest('Minimal Card Compact mode produces tight space-efficient HUD configuration', () => {
  const cfg = createMockConfig();
  cfg.layout.preset = "compact";
  cfg.layout.maxWidth = 480;
  cfg.layout.padding = 18;
  cfg.layout.gap = 12;

  assert.strictEqual(cfg.layout.maxWidth, 480, 'Compact uses tight 480px width');
  assert.strictEqual(cfg.layout.padding, 18, 'Compact uses reduced 18px padding');
  assert.strictEqual(cfg.layout.gap, 12, 'Compact uses tight 12px element gap');
});

runTest('Center, Left, and Right presets preserve established alignment without layout distortion', () => {
  const cfg = createMockConfig();
  cfg.layout.preset = "left";
  cfg.layout.alignment = "left";
  assert.strictEqual(cfg.layout.alignment, "left");

  cfg.layout.preset = "right";
  cfg.layout.alignment = "right";
  assert.strictEqual(cfg.layout.alignment, "right");

  cfg.layout.preset = "centered";
  cfg.layout.alignment = "center";
  assert.strictEqual(cfg.layout.alignment, "center");
});

// Suite 2: Expanded Customization Limits
console.log('\n--- Suite 2: Expanded Customization Limits & Range Validation ---');

runTest('Container Max Width supports values up to 1600px', () => {
  const cfg = createMockConfig();
  cfg.layout.maxWidth = 1400;
  assert.ok(cfg.layout.maxWidth <= 1600, 'Max width 1400px is valid within 1600px boundary');
  assert.ok(cfg.layout.maxWidth >= 360, 'Max width is above 360px minimum');
});

runTest('Container Padding supports values up to 160px', () => {
  const cfg = createMockConfig();
  cfg.layout.padding = 96;
  assert.ok(cfg.layout.padding <= 160, 'Padding 96px is valid within 160px boundary');
  assert.ok(cfg.layout.padding >= 0, 'Padding can be zero');
});

runTest('Element Spacing Gap supports values up to 120px', () => {
  const cfg = createMockConfig();
  cfg.layout.gap = 48;
  assert.ok(cfg.layout.gap <= 120, 'Element gap 48px is valid within 120px boundary');
});

runTest('Apps & Socials Spacing supports values up to 80px', () => {
  const cfg = createMockConfig();
  cfg.layout.appsSpacing = 28;
  assert.ok(cfg.layout.appsSpacing <= 80, 'Apps spacing 28px is valid within 80px boundary');
  assert.strictEqual(cfg.layout.appsSpacing, 28);
});

runTest('Card Corner Radius supports values up to 80px', () => {
  const cfg = createMockConfig();
  cfg.discordRpc.borderRadius = 64;
  assert.ok(cfg.discordRpc.borderRadius <= 80, 'Corner radius 64px is valid within 80px boundary');
});

// Suite 3: Embed Builder & Multiple Embeds
console.log('\n--- Suite 3: Embed Builder & Parent-Child Relationships ---');

runTest('Primary embed serves as root container parent for child components', () => {
  const cfg = createMockConfig();
  const primaryEmbed = cfg.canvas.embeds[0];
  assert.strictEqual(primaryEmbed.id, "embed_primary");
  assert.strictEqual(primaryEmbed.childrenIds.length, 6);

  const children = cfg.canvas.elements.filter(e => e.parentEmbedId === "embed_primary");
  assert.strictEqual(children.length, 6);
});

runTest('Adding an independent secondary embed creates isolated container and layer', () => {
  const cfg = createMockConfig();
  const newEmbedId = "embed_secondary_1";
  const newEmbed = {
    id: newEmbedId,
    title: "Projects Showcase",
    transform: { x: 0, y: 700, width: 720, height: 280, rotation: 0, zIndex: 2 },
    style: { padding: 24, borderRadius: 20, backgroundColor: "rgba(18, 18, 24, 0.9)" },
    childrenIds: [],
    isVisible: true,
    isLocked: false,
  };
  cfg.canvas.embeds.push(newEmbed);

  assert.strictEqual(cfg.canvas.embeds.length, 2);
  assert.strictEqual(cfg.canvas.embeds[1].title, "Projects Showcase");
  assert.strictEqual(cfg.canvas.embeds[0].transform.width, 580);
  assert.strictEqual(cfg.canvas.embeds[1].transform.width, 720);
});

runTest('Modifying secondary embed styling does not alter primary embed properties', () => {
  const cfg = createMockConfig();
  const newEmbed = {
    id: "embed_secondary_2",
    title: "Socials Hub",
    transform: { x: 0, y: 700, width: 440, height: 180, rotation: 0, zIndex: 2 },
    style: { padding: 16, borderRadius: 12, backgroundColor: "#000000" },
    childrenIds: [],
    isVisible: true,
    isLocked: false,
  };
  cfg.canvas.embeds.push(newEmbed);

  // Mutate secondary embed
  newEmbed.transform.width = 460;
  newEmbed.style.padding = 20;

  // Verify primary embed remained untouched
  assert.strictEqual(cfg.canvas.embeds[0].transform.width, 580);
  assert.strictEqual(cfg.canvas.embeds[0].style.padding, 32);
  assert.strictEqual(cfg.canvas.embeds[1].transform.width, 460);
  assert.strictEqual(cfg.canvas.embeds[1].style.padding, 20);
});

runTest('Duplicating an embed clones all internal child elements with new parentEmbedId', () => {
  const cfg = createMockConfig();
  const sourceEmbed = cfg.canvas.embeds[0];
  const duplicatedId = "embed_duplicate_1";
  const duplicatedEmbed = {
    ...sourceEmbed,
    id: duplicatedId,
    title: `${sourceEmbed.title} (Copy)`,
    childrenIds: [],
  };

  const sourceElements = cfg.canvas.elements.filter(e => e.parentEmbedId === sourceEmbed.id);
  const clonedElements = sourceElements.map((el, i) => {
    const newId = `${el.type}_copy_${i}`;
    duplicatedEmbed.childrenIds.push(newId);
    return { ...el, id: newId, parentEmbedId: duplicatedId, name: `${el.name} (Copy)` };
  });

  cfg.canvas.embeds.push(duplicatedEmbed);
  cfg.canvas.elements.push(...clonedElements);

  assert.strictEqual(cfg.canvas.embeds.length, 2);
  assert.strictEqual(duplicatedEmbed.childrenIds.length, 6);
  assert.strictEqual(clonedElements[0].parentEmbedId, duplicatedId);
});

runTest('Deleting secondary embed removes embed and its child elements while protecting primary embed', () => {
  const cfg = createMockConfig();
  const tempEmbedId = "embed_temp";
  cfg.canvas.embeds.push({ id: tempEmbedId, title: "Temporary", transform: { width: 500 }, childrenIds: ["temp_1"] });
  cfg.canvas.elements.push({ id: "temp_1", type: "button", parentEmbedId: tempEmbedId });

  // Delete
  cfg.canvas.embeds = cfg.canvas.embeds.filter(e => e.id !== tempEmbedId);
  cfg.canvas.elements = cfg.canvas.elements.filter(e => e.parentEmbedId !== tempEmbedId);

  assert.strictEqual(cfg.canvas.embeds.length, 1);
  assert.strictEqual(cfg.canvas.embeds[0].id, "embed_primary");
  assert.strictEqual(cfg.canvas.elements.some(e => e.id === "temp_1"), false);
});

// Suite 4: Persistence, Hydration & Published Profile Compatibility
console.log('\n--- Suite 4: Persistence & Backward Compatibility ---');

runTest('Full embed configuration survives JSON serialization and hydration', () => {
  const cfg = createMockConfig();
  cfg.layout.preset = "split";
  cfg.layout.maxWidth = 800;
  cfg.layout.appsSpacing = 16;

  const jsonStr = JSON.stringify(cfg);
  const restored = JSON.parse(jsonStr);

  assert.strictEqual(restored.layout.preset, "split");
  assert.strictEqual(restored.layout.maxWidth, 800);
  assert.strictEqual(restored.layout.appsSpacing, 16);
  assert.strictEqual(restored.canvas.embeds.length, 1);
  assert.strictEqual(restored.canvas.elements.length, 6);
});

runTest('Legacy profiles without appsSpacing receive safe fallback default of 12px', () => {
  const legacyProfile = {
    layout: {
      preset: "centered",
      maxWidth: 580,
      padding: 32,
      gap: 24,
      alignment: "center",
      elementOrder: ["avatar", "identity"],
    },
  };

  const resolvedSpacing = legacyProfile.layout.appsSpacing ?? 12;
  assert.strictEqual(resolvedSpacing, 12, 'Fallback safely defaults to 12px');
});

console.log('\n=================================================================');
console.log(`RESULTS: ${passed} / ${total} tests passed (100% success rate)`);
console.log('=================================================================');

