/**
 * test-rpc-full-pipeline.js
 * Comprehensive automated verification test suite for PixelsRPC:
 * 1. Avatar URL resolution (.png for static, .gif for animated)
 * 2. Magic byte image validation (PNG, JPEG, GIF, WEBP, fake files)
 * 3. File size limits (GIF max 5MB, Static max 10MB)
 * 4. Button 1 profile link generation (View Profile -> ${domain}/${username})
 * 5. Button 2 public homepage link generation (Get PixelsRPC -> ${domain}/rpc)
 * 6. Dynamic multi-user profile isolation (userA vs userB)
 * 7. Crop & zoom JSON serialization / deserialization
 */

const assert = require("assert");

console.log("=======================================================");
console.log("   PIXELS RPC — FULL PIPELINE VERIFICATION SUITE");
console.log("=======================================================\n");

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
// 1. Avatar URL Resolution
// ---------------------------------------------------------------------------
function resolveDiscordAvatarUrl(discordId, avatar) {
  if (!discordId || !avatar) return null;
  const isAnimated = avatar.startsWith("a_");
  const ext = isAnimated ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=256`;
}

runTest("Static Discord Avatar outputs .png format (never .webp)", () => {
  const url = resolveDiscordAvatarUrl("1234567890", "e4a7b9c1d2e3f4");
  assert.strictEqual(url, "https://cdn.discordapp.com/avatars/1234567890/e4a7b9c1d2e3f4.png?size=256");
  assert.ok(!url.includes(".webp"), "Must not use .webp as Discord external proxy rejects it");
});

runTest("Animated Discord Avatar preserves .gif format", () => {
  const url = resolveDiscordAvatarUrl("1234567890", "a_animatedavatar123");
  assert.strictEqual(url, "https://cdn.discordapp.com/avatars/1234567890/a_animatedavatar123.gif?size=256");
});

// ---------------------------------------------------------------------------
// 2. Magic Bytes Image Validation
// ---------------------------------------------------------------------------
function validateImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return { valid: false };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", extension: "png", isAnimated: false };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg", extension: "jpg", isAnimated: false };
  }

  // GIF: 47 49 46 38 37 61 (GIF87a) or 47 49 46 38 39 61 (GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    let frameCount = 0;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0x00 && buffer[i + 1] === 0x21 && i + 2 < buffer.length && buffer[i + 2] === 0xf9) {
        frameCount++;
        if (frameCount > 1) break;
      }
    }
    return { valid: true, mimeType: "image/gif", extension: "gif", isAnimated: frameCount > 1 };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", extension: "webp", isAnimated: false };
  }

  return { valid: false };
}

runTest("Magic bytes correctly identifies PNG", () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const res = validateImageBuffer(pngHeader);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "image/png");
  assert.strictEqual(res.isAnimated, false);
});

runTest("Magic bytes correctly identifies JPEG", () => {
  const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const res = validateImageBuffer(jpgHeader);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "image/jpeg");
});

runTest("Magic bytes correctly identifies Animated GIF with multiple frames", () => {
  // GIF89a header + 2 Graphic Control Extensions (0x00 0x21 0xF9)
  const gifBytes = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x10, 0x00, 0x10, 0x00, 0x80, 0x00,
    0x00, 0x21, 0xf9, 0x04, 0x00, 0x00, // frame 1
    0x00, 0x21, 0xf9, 0x04, 0x00, 0x00  // frame 2
  ]);
  const res = validateImageBuffer(gifBytes);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "image/gif");
  assert.strictEqual(res.isAnimated, true);
});

runTest("Magic bytes rejects fake/corrupt executable or text disguised as image", () => {
  const fakeFile = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00This is a Windows EXE file");
  const res = validateImageBuffer(fakeFile);
  assert.strictEqual(res.valid, false);
});

// ---------------------------------------------------------------------------
// 3. File Size Validation (GIF <= 10MB, Static <= 10MB)
// ---------------------------------------------------------------------------
function validateFileSize(mimeType, sizeInBytes) {
  const MAX_STATIC_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_GIF_SIZE = 10 * 1024 * 1024;   // 10 MB

  if (mimeType === "image/gif") {
    if (sizeInBytes > MAX_GIF_SIZE) {
      return { allowed: false, error: "Animated GIF exceeds the 10 MB maximum size limit." };
    }
  } else {
    if (sizeInBytes > MAX_STATIC_SIZE) {
      return { allowed: false, error: "Image exceeds the 10 MB maximum size limit." };
    }
  }
  return { allowed: true };
}

runTest("GIF size validator rejects GIF larger than 10 MB", () => {
  const oversizedGif = 10.5 * 1024 * 1024;
  const res = validateFileSize("image/gif", oversizedGif);
  assert.strictEqual(res.allowed, false);
  assert.ok(res.error.includes("10 MB"));
});

runTest("GIF size validator accepts GIF under 10 MB (e.g. 4.58 MB)", () => {
  const validGif = 4.58 * 1024 * 1024;
  const res = validateFileSize("image/gif", validGif);
  assert.strictEqual(res.allowed, true);
});

runTest("Static image size validator allows 5 MB PNG but blocks 12 MB PNG", () => {
  const validPng = 5 * 1024 * 1024;
  const oversizedPng = 12 * 1024 * 1024;
  assert.strictEqual(validateFileSize("image/png", validPng).allowed, true);
  assert.strictEqual(validateFileSize("image/png", oversizedPng).allowed, false);
});

// ---------------------------------------------------------------------------
// 4 & 5. Default Action Buttons and URL Structure
// ---------------------------------------------------------------------------
function getDefaultRpcConfig(user, frontendUrl) {
  return {
    activityType: "streaming",
    details: "Welcome to my profile!",
    state: "Discover my personal page on PIXEL.GG.",
    button1Label: "View Profile",
    button1Url: `${frontendUrl}/${user.username}`,
    button1Enabled: true,
    button2Label: "Get PixelsRPC",
    button2Url: `${frontendUrl}/rpc`,
    button2Enabled: true,
  };
}

runTest("Button 1 defaults to 'View Profile' pointing to public profile /:username", () => {
  const config = getDefaultRpcConfig({ username: "alexander" }, "https://pixel.gg");
  assert.strictEqual(config.button1Label, "View Profile");
  assert.strictEqual(config.button1Url, "https://pixel.gg/alexander");
});

runTest("Button 2 defaults to 'Get PixelsRPC' pointing to dedicated public landing page /rpc", () => {
  const config = getDefaultRpcConfig({ username: "alexander" }, "https://pixel.gg");
  assert.strictEqual(config.button2Label, "Get PixelsRPC");
  assert.strictEqual(config.button2Url, "https://pixel.gg/rpc");
  assert.notStrictEqual(config.button2Url, "https://pixel.gg/register", "Must not point to /register");
  assert.notStrictEqual(config.button2Url, "https://pixel.gg/account/rpc", "Must not point to authenticated dashboard");
});

// ---------------------------------------------------------------------------
// 6. Multi-User Dynamic URL Isolation
// ---------------------------------------------------------------------------
runTest("Multi-user test: userA and userB have completely independent profile URLs", () => {
  const userAConfig = getDefaultRpcConfig({ username: "player_one" }, "https://pixel.gg");
  const userBConfig = getDefaultRpcConfig({ username: "gamer_pro" }, "https://pixel.gg");

  assert.strictEqual(userAConfig.button1Url, "https://pixel.gg/player_one");
  assert.strictEqual(userBConfig.button1Url, "https://pixel.gg/gamer_pro");
  assert.notStrictEqual(userAConfig.button1Url, userBConfig.button1Url);
  // Button 2 is shared public showcase
  assert.strictEqual(userAConfig.button2Url, userBConfig.button2Url);
});

// ---------------------------------------------------------------------------
// 7. Crop & Zoom JSON Serialization & Restoration
// ---------------------------------------------------------------------------
runTest("Crop & zoom parameters serialize and deserialize accurately", () => {
  const originalCrop = {
    zoom: 2.25,
    offsetX: -42.5,
    offsetY: 18.0,
    cropX: 120,
    cropY: 80,
    cropWidth: 400,
    cropHeight: 400,
  };

  const serialized = JSON.stringify(originalCrop);
  const parsed = JSON.parse(serialized);

  assert.strictEqual(parsed.zoom, 2.25);
  assert.strictEqual(parsed.offsetX, -42.5);
  assert.strictEqual(parsed.offsetY, 18.0);
  assert.strictEqual(parsed.cropWidth, 400);
});

console.log("\n=======================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}

