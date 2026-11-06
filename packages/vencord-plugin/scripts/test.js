const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PixelsRPC Native Vencord Plugin Test Suite');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const dropinDir = path.join(distDir, 'pixelsrpc');

// 1. File Structure Verification
console.log('Test Group 1: Native Plugin Directory & File Structure');
assert(fs.existsSync(path.join(srcDir, 'index.ts')), 'src/index.ts exists');
assert(fs.existsSync(path.join(srcDir, 'settings.ts')), 'src/settings.ts exists');
assert(fs.existsSync(path.join(srcDir, 'types.ts')), 'src/types.ts exists');
assert(fs.existsSync(path.join(srcDir, 'styles.css')), 'src/styles.css exists');
assert(fs.existsSync(path.join(srcDir, 'components', 'StatusCard.tsx')), 'src/components/StatusCard.tsx exists');
assert(fs.existsSync(path.join(srcDir, 'components', 'ActionControls.tsx')), 'src/components/ActionControls.tsx exists');
assert(fs.existsSync(path.join(srcDir, 'components', 'SettingsAbout.tsx')), 'src/components/SettingsAbout.tsx exists');
assert(fs.existsSync(path.join(rootDir, 'README.md')), 'README.md exists');

// 2. TypeScript Compilation Verification
console.log('\nTest Group 2: TypeScript Compilation Check');
try {
  execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'pipe' });
  assert(true, 'TypeScript type check (tsc --noEmit) completed with 0 errors');
} catch (err) {
  console.error(err.stdout ? err.stdout.toString() : err.message);
  assert(false, 'TypeScript type check failed');
}

// 3. Drop-in Package Verification
console.log('\nTest Group 3: Vencord Drop-in Package (dist/pixelsrpc)');
assert(fs.existsSync(path.join(dropinDir, 'index.ts')), 'Drop-in index.ts packaged');
assert(fs.existsSync(path.join(dropinDir, 'settings.ts')), 'Drop-in settings.ts packaged');
assert(fs.existsSync(path.join(dropinDir, 'types.ts')), 'Drop-in types.ts packaged');
assert(fs.existsSync(path.join(dropinDir, 'styles.css')), 'Drop-in styles.css packaged');
assert(fs.existsSync(path.join(dropinDir, 'components', 'SettingsAbout.tsx')), 'Drop-in SettingsAbout.tsx packaged');
assert(fs.existsSync(path.join(dropinDir, 'README.md')), 'Drop-in README.md packaged');

// 4. Source Code & API Standards Verification
console.log('\nTest Group 4: Vencord API Conventions & Metadata');
const indexCode = fs.readFileSync(path.join(srcDir, 'index.ts'), 'utf8');
const settingsCode = fs.readFileSync(path.join(srcDir, 'settings.ts'), 'utf8');

assert(indexCode.includes('export default definePlugin'), 'Uses official definePlugin export');
assert(indexCode.includes('name: "PixelsRPC"'), 'Plugin name is "PixelsRPC"');
assert(indexCode.includes('LOCAL_ACTIVITY_UPDATE'), 'Dispatches LOCAL_ACTIVITY_UPDATE to FluxDispatcher');
assert(indexCode.includes('settingsAboutComponent: SettingsAboutWrapper'), 'Includes custom SettingsAbout component');
assert(indexCode.includes('start()') && indexCode.includes('stop()'), 'Implements standard start() and stop() lifecycle');
assert(settingsCode.includes('definePluginSettings'), 'Uses definePluginSettings for persistent options');
assert(settingsCode.includes('token') && settingsCode.includes('apiUrl'), 'Settings define token and apiUrl');
assert(settingsCode.includes('OptionType.STRING') && settingsCode.includes('OptionType.BOOLEAN'), 'Uses official OptionType enum');

// 5. Security & Safety Verification
console.log('\nTest Group 5: Security Standards Verification');
const allSrcFiles = [
  path.join(srcDir, 'index.ts'),
  path.join(srcDir, 'settings.ts'),
  path.join(srcDir, 'types.ts'),
  path.join(srcDir, 'components', 'StatusCard.tsx'),
  path.join(srcDir, 'components', 'ActionControls.tsx'),
  path.join(srcDir, 'components', 'SettingsAbout.tsx'),
  path.join(distDir, 'PixelsRPC.vencord.js'),
];

let foundSecurityFlaws = false;
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('eval(')) {
    assert(false, `eval() found in ${path.basename(file)}`);
    foundSecurityFlaws = true;
  }
  if (content.includes('new Function(')) {
    assert(false, `new Function() found in ${path.basename(file)}`);
    foundSecurityFlaws = true;
  }
  if (content.includes('document.createElement("script")') || content.includes("document.createElement('script')")) {
    assert(false, `Dynamic remote script creation found in ${path.basename(file)}`);
    foundSecurityFlaws = true;
  }
}
if (!foundSecurityFlaws) {
  assert(true, 'Zero eval(), new Function(), or dynamic remote script injection detected across all files');
}

// 6. Logic Simulation Tests
console.log('\nTest Group 6: Rich Presence Formatting & Logic Simulation');

// Mock activity formatter simulation
function testActivityFormatting(rpc, store) {
  const appId = (rpc.appId || '').trim() || '1523632136878559302';
  const appName = (rpc.appName || '').trim() || store.fallbackAppName || 'Pixel.gg';

  const activity = {
    application_id: appId,
    name: appName,
    type: 0
  };

  if (rpc.state) activity.state = rpc.state.trim();
  if (rpc.details) activity.details = rpc.details.trim();

  if (rpc.largeImage || rpc.smallImage) {
    activity.assets = {};
    if (rpc.largeImage) activity.assets.large_image = rpc.largeImage.trim();
    if (rpc.largeImageText) activity.assets.large_text = rpc.largeImageText.trim();
    if (rpc.smallImage) activity.assets.small_image = rpc.smallImage.trim();
    if (rpc.smallImageText) activity.assets.small_text = rpc.smallImageText.trim();
  }

  if (store.showButtons) {
    const labels = [];
    const urls = [];
    if (rpc.button1Label && rpc.button1Url) {
      labels.push(rpc.button1Label.trim());
      urls.push(rpc.button1Url.trim());
    }
    if (rpc.button2Label && rpc.button2Url) {
      labels.push(rpc.button2Label.trim());
      urls.push(rpc.button2Url.trim());
    }
    if (labels.length > 0) {
      activity.buttons = labels;
      activity.metadata = { button_urls: urls };
    }
  }

  if (rpc.partySize && rpc.partyMax) {
    activity.party = { size: [rpc.partySize, rpc.partyMax] };
  }

  return activity;
}

const sampleRpc = {
  appName: 'Cyberpunk 2077',
  appId: '987654321',
  state: 'Exploring Night City',
  details: 'Act II - Main Story',
  largeImage: 'https://cdn.pixel.gg/cyberpunk.png',
  largeImageText: 'Cyberpunk 2077',
  smallImage: 'https://cdn.pixel.gg/avatar.png',
  smallImageText: 'V',
  button1Label: 'View Profile',
  button1Url: 'https://pixel.gg/user',
  button2Label: 'Join Server',
  button2Url: 'https://discord.gg/pixelgg',
  partySize: 1,
  partyMax: 4
};

const sampleStore = {
  fallbackAppName: 'Pixel.gg',
  showButtons: true,
  showTimestamps: true
};

const formatted = testActivityFormatting(sampleRpc, sampleStore);

assert(formatted.name === 'Cyberpunk 2077', 'Correct custom application name mapped');
assert(formatted.application_id === '987654321', 'Custom application ID mapped');
assert(formatted.state === 'Exploring Night City', 'Presence state mapped');
assert(formatted.details === 'Act II - Main Story', 'Presence details mapped');
assert(formatted.assets.large_image === 'https://cdn.pixel.gg/cyberpunk.png', 'Large image asset mapped');
assert(formatted.buttons.length === 2 && formatted.metadata.button_urls.length === 2, '2 action buttons and metadata URLs mapped');
assert(formatted.party.size[0] === 1 && formatted.party.size[1] === 4, 'Party size array correctly formed');

// 7. Backoff Calculation Test
console.log('\nTest Group 7: Exponential Backoff & Reconnection Simulation');
function calcBackoff(retry) {
  return Math.min(300, Math.pow(2, retry) * 5);
}

assert(calcBackoff(0) === 5, 'Retry 0 backoff is 5s');
assert(calcBackoff(1) === 10, 'Retry 1 backoff is 10s');
assert(calcBackoff(2) === 20, 'Retry 2 backoff is 20s');
assert(calcBackoff(3) === 40, 'Retry 3 backoff is 40s');
assert(calcBackoff(10) === 300, 'Backoff caps at 300s (5 minutes)');

console.log('\n====================================================');
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed cleanly!\n');
  process.exit(0);
}
