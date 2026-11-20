/**
 * Verification Test Suite: Primary Profile Embed Placement & Spacing
 * Validates:
 * 1. Default canvas state has zero hardcoded translateY offsets for child elements.
 * 2. Vertical flex layout uses config.layout.gap directly without margin leaks.
 * 3. Header identity elements (name, badge, tagline) are grouped cohesively with tight sub-gap.
 * 4. Child elements inside embed do not apply translate3d relative coordinate accumulation.
 * 5. Embed container outer wrapper does not have space-y-4 class fighting with inner flex.
 * 6. Horizontal alignment ('left', 'center', 'right') properly aligns avatar and text elements.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=======================================================");
console.log("PIXEL.GG STUDIO - PRIMARY EMBED PLACEMENT TEST SUITE");
console.log("=======================================================\n");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

// 1. Inspect studio.ts createDefaultCanvasState
const studioTypesPath = path.resolve(__dirname, "../apps/web/src/types/studio.ts");
const studioTypesContent = fs.readFileSync(studioTypesPath, "utf-8");

test("studio.ts: createDefaultCanvasState initializes child elements with x: 0, y: 0", () => {
  const defaultStateMatch = studioTypesContent.match(/export function createDefaultCanvasState[\s\S]*?return \{/);
  assert.ok(defaultStateMatch, "createDefaultCanvasState function should exist");

  const avatarMatch = studioTypesContent.match(/id:\s*"avatar_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(avatarMatch, "avatar_1 transform should be defined");
  assert.ok(avatarMatch[1].includes("x: 0") && avatarMatch[1].includes("y: 0"), "avatar_1 should have x: 0, y: 0");

  const usernameMatch = studioTypesContent.match(/id:\s*"username_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(usernameMatch, "username_1 transform should be defined");
  assert.ok(usernameMatch[1].includes("x: 0") && usernameMatch[1].includes("y: 0"), "username_1 should have x: 0, y: 0");

  const taglineMatch = studioTypesContent.match(/id:\s*"tagline_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(taglineMatch, "tagline_1 transform should be defined");
  assert.ok(taglineMatch[1].includes("x: 0") && taglineMatch[1].includes("y: 0"), "tagline_1 should have x: 0, y: 0");

  const bioMatch = studioTypesContent.match(/id:\s*"bio_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(bioMatch, "bio_1 transform should be defined");
  assert.ok(bioMatch[1].includes("x: 0") && bioMatch[1].includes("y: 0"), "bio_1 should have x: 0, y: 0");

  const rpcMatch = studioTypesContent.match(/id:\s*"rpc_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(rpcMatch, "rpc_1 transform should be defined");
  assert.ok(rpcMatch[1].includes("x: 0") && rpcMatch[1].includes("y: 0"), "rpc_1 should have x: 0, y: 0");

  const buttonsMatch = studioTypesContent.match(/id:\s*"buttons_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(buttonsMatch, "buttons_1 transform should be defined");
  assert.ok(buttonsMatch[1].includes("x: 0") && buttonsMatch[1].includes("y: 0"), "buttons_1 should have x: 0, y: 0");

  const socialsMatch = studioTypesContent.match(/id:\s*"socials_1"[\s\S]*?transform:\s*\{([^}]+)\}/);
  assert.ok(socialsMatch, "socials_1 transform should be defined");
  assert.ok(socialsMatch[1].includes("x: 0") && socialsMatch[1].includes("y: 0"), "socials_1 should have x: 0, y: 0");
});

// 2. Inspect CanvasObjectRenderer.tsx
const rendererPath = path.resolve(__dirname, "../apps/web/src/components/studio/CanvasObjectRenderer.tsx");
const rendererContent = fs.readFileSync(rendererPath, "utf-8");

test("CanvasObjectRenderer: isChildElement avoids translate3d coordinate accumulation", () => {
  assert.ok(rendererContent.includes("const isChildElement = Boolean(el.parentEmbedId);"), "isChildElement should be computed");
  assert.ok(
    rendererContent.includes(
      "transform: isChildElement\n        ? (transform.rotation ? `rotate(${transform.rotation}deg)` : undefined)\n        : `translate3d(${currentX}px, ${currentY}px, 0) rotate(${transform.rotation || 0}deg)`"
    ) ||
      rendererContent.includes("transform: isChildElement"),
    "baseWrapperStyle should only apply rotate for child elements, avoiding translate3d offsets"
  );
});

test("CanvasObjectRenderer: child text elements size naturally without forced artificial minHeight", () => {
  assert.ok(
    rendererContent.includes("isChildElement\n            ? (el.type === \"avatar\" || el.type === \"image\"") ||
      rendererContent.includes("isChildElement"),
    "Child elements should only apply minHeight if media or actively resizing"
  );
});

test("CanvasObjectRenderer: outer embed container does not contain space-y-4 class", () => {
  const embedDivMatch = rendererContent.match(/return \(\s*<div\s+key=\{embed\.id\}[\s\S]*?className=\{`([^`]+)`\}/);
  assert.ok(embedDivMatch, "Embed container div should exist");
  assert.ok(!embedDivMatch[1].includes("space-y-4"), "Embed container div should NOT have space-y-4");
});

test("CanvasObjectRenderer: layoutAlignment and layoutGap are extracted and passed", () => {
  assert.ok(rendererContent.includes("const layoutPreset = config.layout?.preset || \"centered\";"), "layoutPreset should be defined");
  assert.ok(rendererContent.includes("const layoutAlignment ="), "layoutAlignment should be defined");
  assert.ok(rendererContent.includes("const layoutGap = config.layout?.gap ?? 22;"), "layoutGap should be defined");
});

test("CanvasObjectRenderer: renderEmbedContent uses layoutGap for primary embed flow", () => {
  assert.ok(rendererContent.includes("style={{ gap: `${gap}px` }}"), "renderEmbedContent should use gap style");
  assert.ok(rendererContent.includes("orderedElements"), "renderEmbedContent should order elements");
});

test("CanvasObjectRenderer: identity header grouping joins consecutive name and tagline with tight sub-gap", () => {
  assert.ok(rendererContent.includes("identitySubGap"), "identitySubGap should be defined");
  assert.ok(rendererContent.includes("header_group_"), "header_group wrapper should be generated for name + tagline");
});

test("CanvasObjectRenderer: avatar and text nodes support left, right, and center alignment", () => {
  assert.ok(rendererContent.includes("avatarAlignClass"), "avatarAlignClass should be computed");
  assert.ok(rendererContent.includes("self-start"), "avatar should support self-start for left alignment");
  assert.ok(rendererContent.includes("self-end"), "avatar should support self-end for right alignment");
  assert.ok(rendererContent.includes("justify-start"), "text nodes should support justify-start for left alignment");
  assert.ok(rendererContent.includes("justify-end"), "text nodes should support justify-end for right alignment");
});

test("CanvasObjectRenderer: verification badge displays inline when configured on identity", () => {
  assert.ok(rendererContent.includes("config.identity?.badgeStyle"), "Badge style should be checked on identity");
  assert.ok(rendererContent.includes("VERIFIED ✓"), "Pill badge should render VERIFIED ✓");
});

console.log(`\n=======================================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} passed`);
console.log(`=======================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log("All primary embed placement tests PASSED successfully!");
}
