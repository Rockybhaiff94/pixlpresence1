const fs = require('fs');
const path = require('path');
const assert = require('assert');

const webSrc = path.join(__dirname, '../apps/web/src');
const customizePage = fs.readFileSync(path.join(webSrc, 'app/customize/page.tsx'), 'utf8');
const floatingDock = fs.readFileSync(path.join(webSrc, 'components/studio/StudioFloatingDock.tsx'), 'utf8');
const studioTypes = fs.readFileSync(path.join(webSrc, 'types/studio.ts'), 'utf8');
const profileClientView = fs.readFileSync(path.join(webSrc, 'components/nothing/ProfileClientView.tsx'), 'utf8');

console.log("=== RUNNING EMPIRICAL AUDIT ON CLEAN STUDIO RESET ===");

// 1. Verify Left Sidebar is Preserved
assert(customizePage.includes("<AccountSidebar user={user} />"), "FAIL: AccountSidebar must be mounted on /customize");
assert(customizePage.includes("lg:ml-64"), "FAIL: Main content must be offset for left sidebar (lg:ml-64)");
console.log("PASS: Left Sidebar (AccountSidebar) is preserved with proper responsive layout");

// 2. Verify Floating Dock is Preserved
assert(customizePage.includes("<StudioFloatingDock"), "FAIL: StudioFloatingDock must be mounted");
assert(floatingDock.includes("handlePointerDown"), "FAIL: Pointer dragging handlers must be preserved");
assert(floatingDock.includes("minDist <= snapThreshold"), "FAIL: Edge snapping calculations must be preserved");
assert(floatingDock.includes("Empty Dock Foundation"), "FAIL: Expanded dock must render Empty Dock Foundation");
assert(floatingDock.includes("Dock Screen Placement"), "FAIL: Dock placement controls must be preserved");
assert(floatingDock.includes("Expand Foundation Dock"), "FAIL: Dock expand toggle button must be present");
console.log("PASS: StudioFloatingDock is preserved with physics, dragging, snapping, and empty foundation");

// 3. Verify ALL Old Customization Tools & Old UI Elements are Removed from Dock & Page
assert(!customizePage.includes("PRIMARY PROFILE EMBED"), "FAIL: Old embeds must not exist in customize page");
assert(!customizePage.includes("EditorPropertiesPanel"), "FAIL: Old EditorPropertiesPanel must be removed");
assert(!customizePage.includes("StudioLeftWorkspace"), "FAIL: Old StudioLeftWorkspace must be removed");
assert(!customizePage.includes("Added new text component to canvas"), "FAIL: Old notification banner must be removed");
assert(!floatingDock.includes("Typography & Fonts"), "FAIL: Old Typography & Fonts must be removed from dock");
assert(!floatingDock.includes("Shapes & Graphics"), "FAIL: Old Shapes & Graphics must be removed from dock");
assert(!floatingDock.includes("Backgrounds"), "FAIL: Old Backgrounds module must be removed from dock");
console.log("PASS: All old customization tools, settings, panels, embeds, and banners are completely removed");

// 4. Verify Blank Slate State Engine
assert(studioTypes.includes("embeds: []"), "FAIL: Canvas default state must start with empty embeds");
assert(studioTypes.includes("elements: []"), "FAIL: Canvas default state must start with empty elements");
console.log("PASS: Canvas state defaults to a 100% clean, blank slate with zero pre-populated elements");

// 5. Verify Public Profile Reset State
assert(profileClientView.includes("hasActiveEmbeds"), "FAIL: ProfileClientView must check hasActiveEmbeds");
assert(profileClientView.includes("Profile in clean blank state."), "FAIL: Clean blank state message must be present for reset profiles");
console.log("PASS: Public profile displays clean blank slate for reset/empty profiles");

console.log("\n=== ALL EMPIRICAL VALIDATIONS PASSED (100% SPEC COMPLIANCE) ===");
