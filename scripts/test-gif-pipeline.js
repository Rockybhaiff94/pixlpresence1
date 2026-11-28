/**
 * End-to-End Animated GIF & Asset Resolution Verification Suite
 * Covers Tests A, B, C, D, and E (excluding live Electron UI visual check).
 */
const assert = require('assert');
const sharp = require('sharp');
const { ImageAssetService } = require('../apps/api/dist/services/imageAssetService');
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function loadTsModule(tsFilePath) {
  const source = fs.readFileSync(tsFilePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', transpiled.outputText);
  fn(require, mod, mod.exports);
  return mod.exports;
}

async function createSyntheticGif(width, height, frames, delayMs = 80) {
  // Build stacked multi-page raw RGBA buffer for Sharp animated GIF encoding
  const pageHeight = height;
  const totalHeight = height * frames;
  const buf = Buffer.alloc(width * totalHeight * 4);
  for (let f = 0; f < frames; f++) {
    const r = (f * 20) % 255;
    const g = (255 - f * 15) % 255;
    const b = (f * 45) % 255;
    const startRow = f * height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = ((startRow + y) * width + x) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255;
      }
    }
  }
  return sharp(buf, {
    raw: { width, height: totalHeight, channels: 4, pageHeight },
  })
    .gif({ loop: 0, delay: Array(frames).fill(delayMs) })
    .toBuffer();
}

async function run() {
  console.log('====================================================');
  console.log('Pixel.gg Animated GIF & Asset Resolution Test Suite');
  console.log('====================================================\n');

  // TEST A: Multi-frame (12-frame) Animated GIF processing & binary inspection
  console.log('[Test A] 12-frame GIF preservation & metadata check');
  const gif12 = await createSyntheticGif(200, 200, 12, 90);
  const inputCheck = ImageAssetService.inspectGifBinary(gif12);
  assert.strictEqual(inputCheck.isGif, true, 'Input identified as GIF');
  assert.strictEqual(inputCheck.frameCount, 12, 'Input has 12 frames');
  assert.strictEqual(inputCheck.loopCount, 0, 'Input has infinite loop (0)');

  const processedA = await ImageAssetService.processAnimatedGif(gif12, { zoom: 1, offsetX: 0, offsetY: 0 });
  assert.strictEqual(processedA.mimeType, 'image/gif', 'Processed MIME type is image/gif');
  assert.strictEqual(processedA.ext, 'gif', 'Processed extension is gif');
  assert.strictEqual(processedA.isAnimated, true, 'Processed isAnimated is true');
  assert.strictEqual(processedA.frameCount, 12, 'Processed retains all 12 frames');
  assert.strictEqual(processedA.buffer.equals(gif12), true, 'Original <=8MB <=512px GIF bytes preserved untouched');
  console.log('  ✓ 12-frame GIF preserved cleanly (12 frames, 200x200, untouched buffer)\n');

  // TEST B: Oversized dimensions (>512px) resizing & custom crop preservation
  console.log('[Test B] Large (>512px) animated GIF resizing & custom crop');
  const gifLargeDim = await createSyntheticGif(640, 640, 10, 70);
  const processedLarge = await ImageAssetService.processAnimatedGif(gifLargeDim, { zoom: 1, offsetX: 0, offsetY: 0 });
  const largeMeta = await sharp(processedLarge.buffer, { animated: true }).metadata();
  assert.strictEqual(processedLarge.mimeType, 'image/gif');
  assert.strictEqual(largeMeta.pages, 10, 'Resized GIF still has 10 frames');
  assert.ok(processedLarge.fileSize <= 8 * 1024 * 1024, 'Resized GIF <= 8MB');

  const processedCropped = await ImageAssetService.processAnimatedGif(gif12, { zoom: 1.5, offsetX: 10, offsetY: -10 });
  const cropMeta = await sharp(processedCropped.buffer, { animated: true }).metadata();
  assert.strictEqual(cropMeta.pages, 12, 'Cropped animated GIF retains all 12 frames');
  console.log('  ✓ Resized (10 frames) & cropped (12 frames) GIFs preserved all frames <= 8MB\n');

  // TEST C: Static PNG, Animated WebP, and Invalid buffer handling
  console.log('[Test C] Static PNG, Animated WebP, and Invalid input');
  const staticPng = await sharp({
    create: { width: 128, height: 128, channels: 4, background: { r: 255, g: 0, b: 128, alpha: 1 } },
  }).png().toBuffer();
  const pngVal = ImageAssetService.validateMagicBytes(staticPng);
  assert.strictEqual(pngVal.valid, true);
  assert.strictEqual(pngVal.ext, 'png');
  const processedPng = await ImageAssetService.processStaticImage(staticPng, null);
  assert.strictEqual(processedPng.mimeType, 'image/png');
  assert.strictEqual(processedPng.isAnimated, false);

  const webpAnim = await sharp(
    Buffer.concat([
      Buffer.alloc(128 * 128 * 4, 120),
      Buffer.alloc(128 * 128 * 4, 220),
    ]),
    { raw: { width: 128, height: 256, channels: 4, pageHeight: 128 } }
  ).webp({ loop: 0 }).toBuffer();
  const webpVal = ImageAssetService.validateMagicBytes(webpAnim);
  assert.strictEqual(webpVal.valid, true);
  assert.strictEqual(webpVal.ext, 'webp');
  assert.strictEqual(webpVal.isAnimated, true);
  const processedWebp = await ImageAssetService.processAnimatedWebp(webpAnim, null);
  assert.strictEqual(processedWebp.mimeType, 'image/webp');
  assert.strictEqual(processedWebp.isAnimated, true);

  const invalidVal = ImageAssetService.validateMagicBytes(Buffer.from('not an image'));
  assert.strictEqual(invalidVal.valid, false);
  console.log('  ✓ Static PNG, Animated WebP, and Invalid buffer validation passed\n');

  // TEST D: Discord Asset Resolution Categories (assetResolver.ts)
  console.log('[Test D] Vencord Plugin assetResolver.ts 3-category resolution');
  const resolver = loadTsModule(path.resolve(__dirname, '../packages/vencord-plugin/src/assetResolver.ts'));
  assert.strictEqual(resolver.classifyAssetInput('mp:external/abc/https/example.com/a.gif'), 'media_proxy');
  assert.strictEqual(resolver.classifyAssetInput('my_portal_asset_key'), 'app_asset_key');
  assert.strictEqual(resolver.classifyAssetInput('https://pixelgg-api.onrender.com/uploads/rpc/test.gif'), 'external_url');

  // Legacy wsrv.nl unwrap check
  const legacyWrapped = 'https://wsrv.nl/?url=https%3A%2F%2Fpixelgg-api.onrender.com%2Fuploads%2Frpc%2Fdemo.gif&w=320&h=320&fit=cover&n=-1';
  const unwrapped = resolver.unwrapLegacyWsrvUrl(legacyWrapped);
  assert.strictEqual(unwrapped, 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif');

  const preparedDirect = resolver.prepareExternalAssetTarget('https://pixelgg-api.onrender.com/uploads/rpc/demo.gif');
  assert.strictEqual(preparedDirect.target, 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif', 'Direct GIF URL is NOT wrapped in wsrv.nl');
  assert.strictEqual(preparedDirect.isDiscordCdn, false);

  const preparedLegacy = resolver.prepareExternalAssetTarget(legacyWrapped);
  assert.strictEqual(preparedLegacy.target, 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif', 'Legacy wsrv.nl GIF URL unwraps cleanly');

  const preparedDiscordAnimAvatar = resolver.prepareExternalAssetTarget('https://cdn.discordapp.com/avatars/123456/a_abcdef123456.gif?size=256');
  assert.ok(preparedDiscordAnimAvatar.target.startsWith('https://wsrv.nl/avatar.gif?url='), 'Animated Discord CDN avatar routes through /avatar.gif');
  assert.ok(preparedDiscordAnimAvatar.target.includes('&n=-1'), 'Animated Discord CDN avatar includes &n=-1');

  // Simulated fetchAssetIds checks (including failure non-caching)
  const cache = new Map();
  let calls = 0;
  const resolvedGif = await resolver.resolveAssetForDiscord({
    appId: '1523632136878559302',
    assetInput: 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif',
    slot: 'largeImage',
    cache,
    fetchAssetIds: async (_appId, keys) => {
      calls++;
      assert.strictEqual(keys[0], 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif');
      return ['mp:external/MOCKHASH/https/pixelgg-api.onrender.com/uploads/rpc/demo.gif'];
    },
  });
  assert.strictEqual(resolvedGif, 'mp:external/MOCKHASH/https/pixelgg-api.onrender.com/uploads/rpc/demo.gif');
  assert.strictEqual(calls, 1);

  // Cache hit should avoid duplicate API call
  await resolver.resolveAssetForDiscord({
    appId: '1523632136878559302',
    assetInput: 'https://pixelgg-api.onrender.com/uploads/rpc/demo.gif',
    slot: 'largeImage',
    cache,
    fetchAssetIds: async () => { calls++; return ['should-not-run']; },
  });
  assert.strictEqual(calls, 1, 'Valid resolved asset is cached');

  // Transient failure must NOT cache fallback
  let failCalls = 0;
  const failedRes = await resolver.resolveAssetForDiscord({
    appId: '1523632136878559302',
    assetInput: 'https://pixelgg-api.onrender.com/uploads/rpc/retry_test.gif',
    slot: 'largeImage',
    cache,
    fetchAssetIds: async () => {
      failCalls++;
      throw new Error('503 temporary');
    },
  });
  assert.strictEqual(failedRes, undefined, 'Does not return raw HTTP URL or fabricated mp: ID on failure');
  assert.strictEqual(cache.has('ext:1523632136878559302:https://pixelgg-api.onrender.com/uploads/rpc/retry_test.gif'), false, 'Failed lookup not cached');
  console.log('  ✓ 3-category resolution, legacy wsrv unwrap, Discord CDN proxy & non-cached failure passed\n');

  // TEST E: Live HTTP verification of hosted uploaded GIF binary
  console.log('[Test E] Live hosted GIF binary verification (Render)');
  const liveUrl = 'https://pixelgg-api.onrender.com/uploads/rpc/largeImage_1795551471140_6698191a4e2fa350.gif';
  const liveRes = await fetch(liveUrl);
  assert.strictEqual(liveRes.status, 200, 'Live URL returns HTTP 200');
  assert.strictEqual(liveRes.headers.get('content-type'), 'image/gif', 'Live URL returns Content-Type: image/gif');
  const liveBuf = Buffer.from(await liveRes.arrayBuffer());
  const liveCheck = ImageAssetService.inspectGifBinary(liveBuf);
  assert.strictEqual(liveCheck.isGif, true);
  assert.ok(liveCheck.frameCount > 1, `Live served GIF has multiple frames (${liveCheck.frameCount})`);
  console.log(`  ✓ Live served GIF verified: ${liveCheck.frameCount} frames, ${liveBuf.length} bytes, image/gif\n`);

  console.log('ALL GIF & ASSET RESOLUTION TESTS PASSED!');
}

run().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
