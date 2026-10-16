const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'index.tsx');
const distPath = path.join(__dirname, '..', 'dist', 'PixelsRPC.vencord.js');

if (!fs.existsSync(srcPath)) {
  console.error('Source file missing: ' + srcPath);
  process.exit(1);
}
if (!fs.existsSync(distPath)) {
  console.error('Dist bundle missing: ' + distPath);
  process.exit(1);
}

const content = fs.readFileSync(distPath, 'utf8');
if (!content.includes('LOCAL_ACTIVITY_UPDATE') || !content.includes('PixelsRPC')) {
  console.error('Dist file validation failed: missing expected tokens.');
  process.exit(1);
}

console.log('PixelsRPC Vencord plugin tests passed: files and structure verified.');
process.exit(0);
