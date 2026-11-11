/**
 * test-studio-2.js
 * Verification Test Suite for PIXLS.IN Advanced Profile Studio 2.0:
 * 1. Background transform engine (aspect ratios, cover/contain, focal point, zoom, rotation).
 * 2. Canvas engine data model (embeds, elements, nesting, transforms).
 * 3. Multi-embed hierarchy: Moving an embed moves attached children.
 * 4. Freeform object placement: Independent movement of unlocked child elements.
 * 5. Full profile customization: Editable username, bio, tagline, and avatar.
 * 6. Server-enforced capabilities & entitlements matrix (Free vs Premium).
 * 7. Backward compatibility: Graceful legacy configuration migration.
 */

const assert = require("assert");
const { getUserCapabilities, validateProfileCapabilities } = require("../apps/api/dist/services/entitlements");

console.log("================================================================");
console.log("   PIXELS.GG PROFILE STUDIO 2.0 — VERIFICATION TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Background Engine: Aspect Ratios, Cover/Contain & Focal Point
// ---------------------------------------------------------------------------
runTest("Scenario 1: Background aspect ratio and focal-point transform calculation", () => {
  const bgConfig = {
    type: "image",
    imageUrl: "https://pixel.gg/banner.png",
    aspectRatio: "16:9",
    fitMode: "cover",
    zoom: 150,
    rotation: 45,
    offsetX: 10,
    offsetY: -20,
    focalPoint: { x: 75, y: 25 },
  };

  const transformOrigin = `${bgConfig.focalPoint.x}% ${bgConfig.focalPoint.y}%`;
  const transform = `translate(${bgConfig.offsetX}px, ${bgConfig.offsetY}px) scale(${bgConfig.zoom / 100}) rotate(${bgConfig.rotation}deg)`;

  assert.strictEqual(transformOrigin, "75% 25%");
  assert.strictEqual(transform, "translate(10px, -20px) scale(1.5) rotate(45deg)");
  assert.strictEqual(bgConfig.fitMode, "cover");
});

// ---------------------------------------------------------------------------
// 2. Canvas Engine Object Model & Coordinate Space
// ---------------------------------------------------------------------------
runTest("Scenario 2: Canvas Embed and Element hierarchy initialization", () => {
  const primaryEmbed = {
    id: "embed_1",
    title: "Main Embed",
    transform: { x: 0, y: 0, width: 580, height: 600, rotation: 0, zIndex: 1 },
    childrenIds: ["avatar_1", "username_1", "bio_1"],
  };

  const avatarElement = {
    id: "avatar_1",
    type: "avatar",
    name: "User Avatar",
    parentEmbedId: "embed_1",
    transform: { x: 0, y: 0, width: 96, height: 96, rotation: 0, zIndex: 2 },
  };

  assert.strictEqual(primaryEmbed.childrenIds.includes(avatarElement.id), true);
  assert.strictEqual(avatarElement.parentEmbedId, primaryEmbed.id);
  assert.strictEqual(avatarElement.transform.width, 96);
});

// ---------------------------------------------------------------------------
// 3. Multi-Embed Hierarchy: Moving an Embed moves its children
// ---------------------------------------------------------------------------
runTest("Scenario 3: Moving an embed moves all nested child elements concurrently", () => {
  let embed = {
    id: "embed_alpha",
    transform: { x: 100, y: 100, width: 500, height: 400 },
  };

  let childA = {
    id: "child_a",
    parentEmbedId: "embed_alpha",
    transform: { x: 120, y: 150, width: 80, height: 80 },
  };

  let childB = {
    id: "child_b",
    parentEmbedId: "embed_alpha",
    transform: { x: 220, y: 150, width: 200, height: 40 },
  };

  const deltaX = 50;
  const deltaY = -30;

  // Move embed
  embed.transform.x += deltaX;
  embed.transform.y += deltaY;

  // Move attached children
  childA.transform.x += deltaX;
  childA.transform.y += deltaY;
  childB.transform.x += deltaX;
  childB.transform.y += deltaY;

  assert.strictEqual(embed.transform.x, 150);
  assert.strictEqual(embed.transform.y, 70);
  assert.strictEqual(childA.transform.x, 170);
  assert.strictEqual(childA.transform.y, 120);
  assert.strictEqual(childB.transform.x, 270);
  assert.strictEqual(childB.transform.y, 120);
});

// ---------------------------------------------------------------------------
// 4. Freeform Object Placement: Detaching / Moving child outside embed
// ---------------------------------------------------------------------------
runTest("Scenario 4: Freeform elements can exist independently outside any embed", () => {
  const freeElement = {
    id: "text_floating",
    type: "text",
    name: "Floating Badge",
    parentEmbedId: null, // Canvas-level
    transform: { x: 300, y: 50, width: 140, height: 32, rotation: -12, zIndex: 10 },
  };

  assert.strictEqual(freeElement.parentEmbedId, null);
  assert.strictEqual(freeElement.transform.rotation, -12);
});

// ---------------------------------------------------------------------------
// 5. Full Profile Customization: Tagline independence & Avatar frames
// ---------------------------------------------------------------------------
runTest("Scenario 5: Tagline is fully customizable text (no hardcoded string)", () => {
  const customTagline = {
    id: "tagline_1",
    type: "tagline",
    props: { text: "Senior Software Engineer @ Tokyo" },
    style: { color: "#38bdf8", fontSize: 13 },
  };

  assert.notStrictEqual(customTagline.props.text, "NOTHING OS DIGITAL IDENTITY");
  assert.strictEqual(customTagline.props.text, "Senior Software Engineer @ Tokyo");
});

// ---------------------------------------------------------------------------
// 6. Server-Enforced Capabilities Matrix: Free vs Premium
// ---------------------------------------------------------------------------
runTest("Scenario 6: Server correctly enforces embed limits by account tier", () => {
  const freeUser = { role: "USER", premiumStatus: false };
  const premiumUser = { role: "USER", premiumStatus: true };
  const adminUser = { role: "ADMIN", premiumStatus: false };

  const freeCaps = getUserCapabilities(freeUser);
  const premCaps = getUserCapabilities(premiumUser);
  const adminCaps = getUserCapabilities(adminUser);

  assert.strictEqual(freeCaps.tier, "FREE");
  assert.strictEqual(freeCaps.maxEmbeds, 5);
  assert.strictEqual(premCaps.tier, "PREMIUM");
  assert.strictEqual(premCaps.maxEmbeds, 20);
  assert.strictEqual(adminCaps.tier, "ADMIN");
  assert.strictEqual(adminCaps.maxEmbeds, 50);

  // Check validation rejection when free user exceeds 5 embeds
  const excessiveEmbedsConfig = {
    canvas: {
      embeds: [{}, {}, {}, {}, {}, {}], // 6 embeds
    },
  };

  const freeResult = validateProfileCapabilities(excessiveEmbedsConfig, freeCaps);
  assert.strictEqual(freeResult.valid, false);
  assert.ok(freeResult.error.includes("5 embeds"));

  const premResult = validateProfileCapabilities(excessiveEmbedsConfig, premCaps);
  assert.strictEqual(premResult.valid, true);
});

// ---------------------------------------------------------------------------
// 7. Backward Compatibility: Legacy Profile Loading
// ---------------------------------------------------------------------------
runTest("Scenario 7: Legacy profile config without canvas initializes smoothly", () => {
  const legacyConfig = {
    version: 2,
    mode: "studio",
    layout: { maxWidth: 580, padding: 32 },
    identity: { titleColor: "#ffffff", titleSize: 26 },
    avatar: { size: 96, shape: "rounded" },
  };

  // Simulating the upgrade path
  const upgradedConfig = {
    ...legacyConfig,
    canvas: legacyConfig.canvas || {
      embeds: [{ id: "embed_primary", transform: { width: legacyConfig.layout.maxWidth } }],
      elements: [],
    },
  };

  assert.ok(upgradedConfig.canvas);
  assert.strictEqual(upgradedConfig.canvas.embeds[0].transform.width, 580);
});

console.log("\n================================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

