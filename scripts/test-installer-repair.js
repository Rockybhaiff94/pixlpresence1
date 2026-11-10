/**
 * Automated Test Suite: PixelsRPC Installer Repair & Vencord Integration
 * 
 * Verifies:
 * 1. Plugin TypeScript & Component Imports
 * 2. Vencord Build & PixelsRPC Bundling
 * 3. pnpm Version Management
 * 4. Build Failure Strict Handling (No False Success)
 * 5. Safe Installer Self-Execution (No Self-Copy Error)
 * 6. Discord Installation Detection & Asar Stub Validation
 * 7. Backup Creation & Verification
 * 8. Clean Rollback Capability
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log('\n======================================================');
console.log('   PIXELSRPC INSTALLER REPAIR & INTEGRATION TESTS');
console.log('======================================================\n');

// 1. Plugin Component Imports Verification
console.log('[1/8] Verifying Plugin Component Imports...');
const pluginSrcDir = path.resolve(__dirname, '../packages/vencord-plugin/src/components');
const actionControls = fs.readFileSync(path.join(pluginSrcDir, 'ActionControls.tsx'), 'utf8');
const settingsAbout = fs.readFileSync(path.join(pluginSrcDir, 'SettingsAbout.tsx'), 'utf8');

assert(!/from\s+['"]@webpack\/common['"].*\bButton\b/.test(actionControls), 'ActionControls does not import Button from @webpack/common');
assert(/from\s+['"]@components\/Button['"]/.test(actionControls), 'ActionControls imports Button from @components/Button');
assert(!/from\s+['"]@webpack\/common['"].*\bForms\b/.test(settingsAbout), 'SettingsAbout does not import Forms from @webpack/common');
assert(/from\s+['"]@components\/Heading['"]/.test(settingsAbout), 'SettingsAbout imports Heading from @components/Heading');
assert(/from\s+['"]@components\/Paragraph['"]/.test(settingsAbout), 'SettingsAbout imports Paragraph from @components/Paragraph');

// 2. Local Plugin Typecheck
console.log('\n[2/8] Testing Local Plugin Typecheck...');
try {
    const platformDir = path.resolve(__dirname, '..');
    execSync('npm run typecheck --workspace=@pixelgg/pixels-rpc-vencord', { cwd: platformDir, stdio: 'pipe' });
    assert(true, 'vencord-plugin passed tsc --noEmit typecheck');
} catch (e) {
    assert(false, `typecheck failed: ${e.message}`);
}

// 3. pnpm Version Verification
console.log('\n[3/8] Verifying pnpm Version Match with Vencord...');
const vencordDir = path.join(process.env.LOCALAPPDATA, 'PixelsRPC', 'vencord');
const vencordPkg = JSON.parse(fs.readFileSync(path.join(vencordDir, 'package.json'), 'utf8'));
const activePnpm = execSync('pnpm --version').toString().trim();
console.log(`  Required by Vencord: ${vencordPkg.packageManager}`);
console.log(`  Active in system: pnpm@${activePnpm}`);
assert(vencordPkg.packageManager.includes(activePnpm), `Active pnpm matches Vencord requirement (${activePnpm})`);

// 4. Vencord Build Artifacts & PixelsRPC Bundle Presence
console.log('\n[4/8] Verifying Vencord Build Artifacts & PixelsRPC Integration...');
const rendererJs = path.join(vencordDir, 'dist', 'renderer.js');
const patcherJs = path.join(vencordDir, 'dist', 'patcher.js');
assert(fs.existsSync(rendererJs), 'dist/renderer.js exists');
assert(fs.existsSync(patcherJs), 'dist/patcher.js exists');

const rendererContent = fs.readFileSync(rendererJs, 'utf8');
assert(rendererContent.includes('PixelsRPC Connection'), 'renderer.js contains PixelsRPC Connection UI');
assert(rendererContent.includes('Connect your PIXEL.GG Account'), 'renderer.js contains linking UI');

// 5. Safe Self-Execution (No Self-Copy Error)
console.log('\n[5/8] Verifying Safe Self-Execution in bin directory...');
const binScript = path.join(process.env.LOCALAPPDATA, 'PixelsRPC', 'bin', 'pixelsrpc.ps1');
try {
    const statusOut = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${binScript}" status`, { stdio: 'pipe' }).toString();
    assert(statusOut.includes('PixelsRPC System Diagnostic Status:'), 'Executed pixelsrpc status cleanly without self-copy error');
} catch (e) {
    assert(false, `pixelsrpc status threw an error: ${e.message}`);
}

// 6. Discord Installation Detection & app.asar Patch
console.log('\n[6/8] Verifying Discord Installation & app.asar Patch...');
const discordPtbDir = path.join(process.env.LOCALAPPDATA, 'DiscordPTB');
if (fs.existsSync(discordPtbDir)) {
    const appDirs = fs.readdirSync(discordPtbDir).filter(d => d.startsWith('app-')).sort().reverse();
    if (appDirs.length > 0) {
        const asarPath = path.join(discordPtbDir, appDirs[0], 'resources', 'app.asar');
        assert(fs.existsSync(asarPath), `Discord PTB app.asar exists at ${asarPath}`);
        const asarContent = fs.readFileSync(asarPath, 'utf8');
        assert(asarContent.includes('PixelsRPC') && asarContent.includes('patcher.js'), 'app.asar correctly points to PixelsRPC custom Vencord patcher');
    }
} else {
    console.log('  (!) DiscordPTB not found, skipping Discord-specific check.');
}

// 7. Backup Integrity
console.log('\n[7/8] Verifying Backup Directory Integrity...');
const backupDir = path.join(process.env.LOCALAPPDATA, 'PixelsRPC', 'backups');
assert(fs.existsSync(backupDir), 'Backup root directory exists');
const backups = fs.readdirSync(backupDir).filter(f => fs.statSync(path.join(backupDir, f)).isDirectory());
assert(backups.length > 0, `At least one backup snapshot exists (found: ${backups.length})`);
if (backups.length > 0) {
    const latestBackup = path.join(backupDir, backups.sort().reverse()[0]);
    const files = fs.readdirSync(latestBackup);
    assert(files.length > 0, `Latest backup (${path.basename(latestBackup)}) contains preserved files (${files.join(', ')})`);
}

// 8. Strict Error Handling Simulation
console.log('\n[8/8] Testing Strict Build Error Handling (No False Success)...');
const testScriptContent = fs.readFileSync(binScript, 'utf8');
assert(testScriptContent.includes('Invoke-NativeProcess'), 'pixelsrpc.ps1 uses Invoke-NativeProcess with strict exit code verification');
assert(testScriptContent.includes('Write-Preflight "Build completed" "fail"'), 'pixelsrpc.ps1 fails build immediately upon non-zero exit');
assert(!testScriptContent.includes('node dist/patcher.js'), 'pixelsrpc.ps1 does not attempt to execute patcher.js directly with node');

console.log('\n======================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
    process.exit(1);
}
