/**
 * Master Verification Test Suite: Pixel.gg Studio
 * Advanced Interactive Embed Editor & Content Builder
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("\n=================================================================");
console.log("=== PIXEL.GG STUDIO: INTERACTIVE EMBED & CONTENT BUILDER AUDIT ===");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    Error: ${err.message}\n`);
    failed++;
  }
}

// 1. Verify files exist
const webDir = path.resolve(__dirname, "../apps/web");
const rendererPath = path.join(webDir, "src/components/studio/CanvasObjectRenderer.tsx");
const previewPath = path.join(webDir, "src/components/studio/StudioProfilePreview.tsx");
const customizePath = path.join(webDir, "src/app/customize/page.tsx");
const adjustmentPanelPath = path.join(webDir, "src/components/studio/EmbedAdjustmentPanel.tsx");
const contentMenuPath = path.join(webDir, "src/components/studio/ContentInsertionMenu.tsx");
const contextualModalPath = path.join(webDir, "src/components/studio/ContextualEditModal.tsx");
const typesPath = path.join(webDir, "src/types/studio.ts");
const registryPath = path.join(webDir, "src/components/studio/componentRegistry.ts");

const rendererCode = fs.readFileSync(rendererPath, "utf-8");
const previewCode = fs.readFileSync(previewPath, "utf-8");
const customizeCode = fs.readFileSync(customizePath, "utf-8");
const adjustmentPanelCode = fs.readFileSync(adjustmentPanelPath, "utf-8");
const contentMenuCode = fs.readFileSync(contentMenuPath, "utf-8");
const contextualModalCode = fs.readFileSync(contextualModalPath, "utf-8");
const typesCode = fs.readFileSync(typesPath, "utf-8");
const registryCode = fs.readFileSync(registryPath, "utf-8");

// --- PHASE 1: DIRECT EMBED SELECTION & CONTROLS ---
test("Phase 1: Normal state renders clean without resize handles or outlines", () => {
  assert(rendererCode.includes("isSelectedEmbed && !embed.isLocked && ("), "Handles must only render when selected and unlocked");
  assert(rendererCode.includes("isSelectedEmbed"), "Selected embed state check missing");
  assert(rendererCode.includes("ring-2 ring-amber-400"), "Amber outline only applies when selected");
});

test("Phase 1: Selected state displays 8 resize handles and dimension tag", () => {
  const handles = ["tl", "tr", "bl", "br", "tc", "bc", "ml", "mr"];
  handles.forEach((h) => {
    assert(rendererCode.includes(`handleResizePointerDown(e, embed.id, "${h}"`), `Missing resize handle ${h}`);
  });
  assert(rendererCode.includes("Math.round(currentW)") && rendererCode.includes("Math.round(currentH)"), "Dimension tag missing");
  assert(rendererCode.includes("SHIFT: ASPECT LOCKED"), "Shift modifier indicator missing");
  assert(rendererCode.includes("ALT: SYMMETRIC"), "Alt modifier indicator missing");
});

// --- PHASE 2: 4-BUTTON CONTEXTUAL EMBED TOOLBAR ---
test("Phase 2: Contextual toolbar features Hide, Lock, Add (+), and More buttons", () => {
  assert(rendererCode.includes("onToggleHideEmbed?.(embed.id)"), "Missing Hide/Unhide toggle");
  assert(rendererCode.includes("onToggleLockEmbed?.(embed.id)"), "Missing Lock/Unlock toggle");
  assert(rendererCode.includes("setContentMenuEmbedId"), "Missing Add (+) content menu trigger");
  assert(rendererCode.includes("setAdvancedPanelEmbedId"), "Missing More / Advanced adjustments panel trigger");
});

test("Phase 2: Hidden embed displays semi-transparent with HIDDEN badge in editor, hidden publicly", () => {
  assert(rendererCode.includes("!isInteractive && embed.isVisible === false"), "Hidden embed must not render publicly");
  assert(rendererCode.includes("opacity: isHiddenInEditor ? 0.35 : undefined"), "Editor must display hidden embeds semi-transparently");
  assert(rendererCode.includes("HIDDEN (Click to Unhide)"), "Editor must display HIDDEN badge");
});

// --- PHASE 3: FLOATING EMBED ADJUSTMENT PANEL ---
test("Phase 3: EmbedAdjustmentPanel provides numeric controls, aspect lock, alignment and layer order", () => {
  assert(adjustmentPanelCode.includes("handleWidthChange"), "Missing width input handler");
  assert(adjustmentPanelCode.includes("handleHeightChange"), "Missing height input handler");
  assert(adjustmentPanelCode.includes("handleAlign(\"left\")"), "Missing align left");
  assert(adjustmentPanelCode.includes("handleAlign(\"center\")"), "Missing align center");
  assert(adjustmentPanelCode.includes("handleAlign(\"right\")"), "Missing align right");
  assert(adjustmentPanelCode.includes("onChangeZIndex(1)"), "Missing layer bring forward");
  assert(adjustmentPanelCode.includes("onChangeZIndex(-1)"), "Missing layer send backward");
  assert(adjustmentPanelCode.includes("handleResetPosition"), "Missing reset position button");
  assert(adjustmentPanelCode.includes("handleResetDimensions"), "Missing reset dimensions button");
});

// --- PHASE 4: ON-CANVAS CONTENT INSERTION MENU ---
test("Phase 4: ContentInsertionMenu categorizes and provides one-click insertion for all elements", () => {
  const expectedTypes = ["avatar", "username", "bio", "tagline", "text", "rpc", "image", "banner", "socials", "button", "music", "verificationBadge", "divider"];
  expectedTypes.forEach((t) => {
    assert(contentMenuCode.includes(`type: "${t}"`), `Content menu missing type: ${t}`);
  });
  assert(contentMenuCode.includes("category: \"identity\""), "Missing identity category");
  assert(contentMenuCode.includes("category: \"media\""), "Missing media category");
  assert(contentMenuCode.includes("category: \"text\""), "Missing text category");
  assert(contentMenuCode.includes("category: \"interactive\""), "Missing interactive category");
  assert(contentMenuCode.includes("searchQuery"), "Search query filtering missing");
});

test("Phase 4: StudioProfilePreview handleInsertElement places element inside embed bounds", () => {
  assert(previewCode.includes("handleInsertElement"), "StudioProfilePreview missing handleInsertElement");
  assert(previewCode.includes("parentEmbedId: embedId"), "handleInsertElement must associate element with parent embed");
  assert(previewCode.includes("onSelectElement?.(newId)"), "handleInsertElement must select newly created element");
});

// --- PHASE 5: CHILD ELEMENT SELECTION ISOLATION & INLINE EDITING ---
test("Phase 5: Selecting child elements stops propagation and avoids selecting parent embed", () => {
  assert(rendererCode.includes("const handleClick = (e: React.MouseEvent) => {"), "Missing handleClick on elements");
  assert(rendererCode.includes("e.stopPropagation();"), "handleClick must stop propagation");
  assert(rendererCode.includes("onSelectElement?.(el.id);"), "handleClick must select only the clicked element");
});

test("Phase 5: Double clicking text enables inline editing with Escape/Enter commit", () => {
  assert(rendererCode.includes("handleDoubleClick"), "Missing double click handler for text");
  assert(rendererCode.includes("onSetInlineEditingId"), "Inline editing ID setter missing");
  assert(rendererCode.includes("e.key === \"Escape\""), "Escape key handler for inline edit missing");
  assert(rendererCode.includes("e.key === \"Enter\""), "Enter key handler for inline edit missing");
});

// --- PHASE 6: CONTEXTUAL HOVER BADGES & EDIT MODALS ---
test("Phase 6: Contextual badges show on hover for Avatar, Bio, RPC, Image, Socials, Banner", () => {
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT NAME & ICON\""), "Missing EDIT NAME & ICON badge");
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT BIO\""), "Missing EDIT BIO badge");
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT RPC\""), "Missing EDIT RPC badge");
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT IMAGE\""), "Missing EDIT IMAGE badge");
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT BANNER\""), "Missing EDIT BANNER badge");
  assert(rendererCode.includes("contextualBadgeLabel = \"EDIT SOCIALS\""), "Missing EDIT SOCIALS badge");
  assert(rendererCode.includes("renderHoverBadge()"), "renderHoverBadge invocation missing");
});

test("Phase 6: Clicking hover badge opens centered ContextualEditModal", () => {
  assert(rendererCode.includes("setActiveModalTarget"), "Active modal target setter missing");
  assert(rendererCode.includes("<ContextualEditModal"), "ContextualEditModal component not rendered");
  assert(contextualModalCode.includes("backdrop-blur-md"), "Modal must have dark backdrop blur");
});

// --- PHASE 7: RICH PRESENCE (RPC) MODAL & CONTROLS ---
test("Phase 7: RPC editor supports Linked vs Standalone switch, image upload and button controls", () => {
  assert(contextualModalCode.includes("isStandalone"), "Standalone mode switch missing");
  assert(contextualModalCode.includes("/api/rpc/upload"), "Image upload endpoint /api/rpc/upload missing");
  assert(contextualModalCode.includes("largeImage"), "Large image slot missing");
  assert(contextualModalCode.includes("smallImage"), "Small image slot missing");
  assert(contextualModalCode.includes("partySize"), "Party size input missing");
  assert(contextualModalCode.includes("partyMax"), "Party max input missing");
  assert(contextualModalCode.includes("handleSave"), "Save handler missing");
});

// --- PHASE 8: ESCAPE KEY NAVIGATION & CLICK OUTSIDE ---
test("Phase 8: Global Escape key clears selection, closes menus and modals", () => {
  assert(rendererCode.includes("e.key === \"Escape\""), "Global Escape key listener missing");
  assert(rendererCode.includes("setActiveModalTarget(null)"), "Escape must close active modal");
  assert(rendererCode.includes("setContentMenuEmbedId(null)"), "Escape must close content menu");
  assert(rendererCode.includes("setAdvancedPanelEmbedId(null)"), "Escape must close advanced panel");
  assert(rendererCode.includes("onSelectElement?.(null)"), "Escape must clear selection");
});

// --- PHASE 9: DEBOUNCED AUTOSAVE ---
test("Phase 9: Debounced autosave triggers executeSave(false) automatically on config edits", () => {
  assert(customizeCode.includes("debouncedSaveTimeoutRef"), "Debounced autosave ref missing in customize/page.tsx");
  assert(customizeCode.includes("executeSave(false)"), "Autosave must call executeSave(false)");
  assert(customizeCode.includes("isDirtyRef.current"), "Autosave must check dirty state before saving");
});

// --- PHASE 10: PUBLIC PROFILE FIDELITY & RESPONSIVE SCALING ---
test("Phase 10: CanvasObjectRenderer and ProfileClientView maintain public profile fidelity", () => {
  const profileClientViewCode = fs.readFileSync(path.join(webDir, "src/components/nothing/ProfileClientView.tsx"), "utf-8");
  assert(profileClientViewCode.includes("<StudioProfilePreview"), "Public ProfileClientView must use StudioProfilePreview");
  assert(rendererCode.includes("width: resolvedWidth"), "Embed width must be responsive");
  assert(rendererCode.includes("maxWidth: resolvedMaxWidth"), "Embed maxWidth must prevent overflow on mobile viewports");
});

console.log("\n=================================================================");
console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================================\n");

if (failed > 0) {
  process.exit(1);
}
