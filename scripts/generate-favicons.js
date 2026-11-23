const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_IMAGE = 'C:/Users/Acer/.gemini/antigravity/brain/8374b267-3ad8-4c98-9735-707d48c9feca/.user_uploaded/media_1795448299894_4dccb208.png';
const WEB_ROOT = path.resolve(__dirname, '../apps/web');

function createIco(pngEntries) {
  const count = pngEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = Buffer.alloc(count * 16);
  let dataOffset = 6 + count * 16;
  const dataBuffers = [];

  for (let i = 0; i < count; i++) {
    const { buffer, width, height } = pngEntries[i];
    const entryOffset = i * 16;
    dirEntries.writeUInt8(width >= 256 ? 0 : width, entryOffset);
    dirEntries.writeUInt8(height >= 256 ? 0 : height, entryOffset + 1);
    dirEntries.writeUInt8(0, entryOffset + 2); // Colors in palette
    dirEntries.writeUInt8(0, entryOffset + 3); // Reserved
    dirEntries.writeUInt16LE(1, entryOffset + 4); // Color planes
    dirEntries.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
    dirEntries.writeUInt32LE(buffer.length, entryOffset + 8); // Image size in bytes
    dirEntries.writeUInt32LE(dataOffset, entryOffset + 12); // Offset to image data

    dataBuffers.push(buffer);
    dataOffset += buffer.length;
  }

  return Buffer.concat([header, dirEntries, ...dataBuffers]);
}

async function run() {
  console.log('[Favicon Generator] Reading source image:', SOURCE_IMAGE);
  if (!fs.existsSync(SOURCE_IMAGE)) {
    throw new Error(`Source image not found at: ${SOURCE_IMAGE}`);
  }

  // 1. Perfectly center the character in a square canvas with balanced padding
  // minX: 138, maxX: 846, minY: 166, maxY: 894, width: 709, height: 729
  // Center is (492, 530). Extract 800x800 square:
  const centeredBuffer = await sharp(SOURCE_IMAGE)
    .extract({
      left: 92,
      top: 130,
      width: 800,
      height: 800,
    })
    .toBuffer();

  console.log('[Favicon Generator] Cropped and centered character to 800x800');

  // 2. Generate required resolutions
  const p16 = await sharp(centeredBuffer).resize(16, 16, { kernel: 'lanczos3' }).png().toBuffer();
  const p32 = await sharp(centeredBuffer).resize(32, 32, { kernel: 'lanczos3' }).png().toBuffer();
  const p48 = await sharp(centeredBuffer).resize(48, 48, { kernel: 'lanczos3' }).png().toBuffer();
  const p64 = await sharp(centeredBuffer).resize(64, 64, { kernel: 'lanczos3' }).png().toBuffer();
  const p180 = await sharp(centeredBuffer).resize(180, 180, { kernel: 'lanczos3' }).png().toBuffer();
  const p192 = await sharp(centeredBuffer).resize(192, 192, { kernel: 'lanczos3' }).png().toBuffer();
  const p512 = await sharp(centeredBuffer).resize(512, 512, { kernel: 'lanczos3' }).png().toBuffer();

  // 3. Create multi-resolution ICO (16, 32, 48)
  const icoBuffer = createIco([
    { buffer: p16, width: 16, height: 16 },
    { buffer: p32, width: 32, height: 32 },
    { buffer: p48, width: 48, height: 48 },
  ]);

  // 4. Ensure target directories exist
  const appDir = path.join(WEB_ROOT, 'src/app');
  const pubDir = path.join(WEB_ROOT, 'public');
  const logosDir = path.join(pubDir, 'logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  // 5. Write icon files
  // App router convention
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'icon.png'), p32);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), p180);

  // Public directory fallbacks
  fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(pubDir, 'icon.png'), p32);
  fs.writeFileSync(path.join(pubDir, 'apple-icon.png'), p180);
  fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), p180);
  fs.writeFileSync(path.join(pubDir, 'icon-192.png'), p192);
  fs.writeFileSync(path.join(pubDir, 'icon-512.png'), p512);

  // Logo asset for navbar/sidebar
  fs.writeFileSync(path.join(logosDir, 'pixel-icon.png'), p512);
  fs.writeFileSync(path.join(logosDir, 'pixel-icon-180.png'), p180);

  console.log('[Favicon Generator] Successfully created:');
  console.log(' - src/app/favicon.ico (Multi-res: 16x16, 32x32, 48x48)');
  console.log(' - src/app/icon.png (32x32)');
  console.log(' - src/app/apple-icon.png (180x180)');
  console.log(' - public/favicon.ico');
  console.log(' - public/icon.png');
  console.log(' - public/apple-icon.png & apple-touch-icon.png');
  console.log(' - public/icon-192.png');
  console.log(' - public/icon-512.png');
  console.log(' - public/logos/pixel-icon.png');
}

run().catch((err) => {
  console.error('[Favicon Generator] Error:', err);
  process.exit(1);
});
