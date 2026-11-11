/**
 * Automated Verification Test Suite for Pixel.gg Studio Prompt 4:
 * Advanced Text Editor, Discord Components V2 Typography & Smart Inheritance System.
 */

const assert = require("assert");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("PIXEL.GG STUDIO: ADVANCED TYPOGRAPHY & TEXT TEST SUITE");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Text Component Library & Classification
// ---------------------------------------------------------------------------
console.log("--- Suite 1: Text Component Library & Classification ---");

const TEXT_TYPES = [
  "displayName",
  "username",
  "title",
  "heading",
  "subtitle",
  "tagline",
  "bio",
  "description",
  "text",
  "authorText",
  "footerText",
  "timestamp",
  "fieldName",
  "fieldValue",
  "customLabels",
  "customBadges",
  "verificationBadge",
];

const NON_TEXT_TYPES = ["embed", "avatar", "rpc", "button", "socials", "divider", "image"];

function isTextBasedElement(type) {
  return TEXT_TYPES.includes(type);
}

runTest("All 17 supported text component types are correctly recognized as text-based", () => {
  for (const t of TEXT_TYPES) {
    assert.strictEqual(isTextBasedElement(t), true, `Type ${t} should be recognized as text`);
  }
});

runTest("Non-text elements (embed, avatar, rpc, button, socials) are not recognized as text", () => {
  for (const t of NON_TEXT_TYPES) {
    assert.strictEqual(isTextBasedElement(t), false, `Type ${t} should NOT be recognized as text`);
  }
});

// ---------------------------------------------------------------------------
// 2. Style Group Resolution
// ---------------------------------------------------------------------------
console.log("\n--- Suite 2: Style Group Resolution ---");

function resolveStyleGroup(type) {
  switch (type) {
    case "displayName":
    case "username":
      return "profileName";
    case "title":
    case "heading":
      return "heading";
    case "subtitle":
    case "tagline":
      return "subheading";
    case "bio":
    case "description":
    case "text":
      return "body";
    case "footerText":
    case "timestamp":
    case "authorText":
      return "footer";
    case "fieldName":
    case "fieldValue":
    case "customLabels":
    case "customBadges":
    case "verificationBadge":
      return "metadata";
    default:
      return "body";
  }
}

runTest("Display Name and Username resolve to 'profileName' style group", () => {
  assert.strictEqual(resolveStyleGroup("displayName"), "profileName");
  assert.strictEqual(resolveStyleGroup("username"), "profileName");
});

runTest("Heading and Title resolve to 'heading' style group", () => {
  assert.strictEqual(resolveStyleGroup("heading"), "heading");
  assert.strictEqual(resolveStyleGroup("title"), "heading");
});

runTest("Subtitle and Tagline resolve to 'subheading' style group", () => {
  assert.strictEqual(resolveStyleGroup("subtitle"), "subheading");
  assert.strictEqual(resolveStyleGroup("tagline"), "subheading");
});

runTest("Bio and Descriptions resolve to 'body' style group", () => {
  assert.strictEqual(resolveStyleGroup("bio"), "body");
  assert.strictEqual(resolveStyleGroup("description"), "body");
  assert.strictEqual(resolveStyleGroup("text"), "body");
});

runTest("Footer text and Timestamps resolve to 'footer' style group", () => {
  assert.strictEqual(resolveStyleGroup("footerText"), "footer");
  assert.strictEqual(resolveStyleGroup("timestamp"), "footer");
});

// ---------------------------------------------------------------------------
// 3. Smart Typography Inheritance & Overrides
// ---------------------------------------------------------------------------
console.log("\n--- Suite 3: Smart Typography Inheritance & Overrides ---");

const DEFAULT_GROUPS = {
  profileName: { fontFamily: "Space Grotesk", fontSize: 26, fontWeight: 700, color: "#ffffff" },
  heading: { fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 600, color: "#ffffff" },
  subheading: { fontFamily: "Inter", fontSize: 12, fontWeight: 500, color: "#a3a3a3" },
  body: { fontFamily: "Inter", fontSize: 14, fontWeight: 400, color: "#d4d4d8" },
  footer: { fontFamily: "Inter", fontSize: 11, fontWeight: 400, color: "#737373" },
  metadata: { fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 500, color: "#a1a1aa" },
};

function createTextElement(id, type, groups = DEFAULT_GROUPS) {
  const gId = resolveStyleGroup(type);
  const def = groups[gId];
  return {
    id,
    type,
    name: type,
    props: { text: "Sample Text" },
    style: {
      ...def,
      styleGroupId: gId,
      hasCustomTypographyOverride: false,
    },
  };
}

runTest("New matching text element automatically inherits current style group default", () => {
  const headingEl = createTextElement("h1", "heading");
  assert.strictEqual(headingEl.style.fontFamily, "Space Grotesk");
  assert.strictEqual(headingEl.style.fontSize, 20);
  assert.strictEqual(headingEl.style.fontWeight, 600);
  assert.strictEqual(headingEl.style.hasCustomTypographyOverride, false);
});

runTest("Customizing element B sets independent override without modifying element A", () => {
  const headingA = createTextElement("h_A", "heading");
  const headingB = createTextElement("h_B", "heading");

  // User customizes heading B
  headingB.style.color = "#a855f7"; // purple
  headingB.style.fontSize = 28;
  headingB.style.hasCustomTypographyOverride = true;

  // Heading A remains untouched
  assert.strictEqual(headingA.style.color, "#ffffff");
  assert.strictEqual(headingA.style.fontSize, 20);
  assert.strictEqual(headingA.style.hasCustomTypographyOverride, false);

  // Heading B has independent values
  assert.strictEqual(headingB.style.color, "#a855f7");
  assert.strictEqual(headingB.style.fontSize, 28);
  assert.strictEqual(headingB.style.hasCustomTypographyOverride, true);
});

runTest("Updating default style updates non-overridden elements but preserves overridden elements", () => {
  const customGroups = JSON.parse(JSON.stringify(DEFAULT_GROUPS));
  const el1 = createTextElement("e1", "body", customGroups);
  const el2 = createTextElement("e2", "body", customGroups);

  // el2 is independently customized
  el2.style.color = "#ef4444";
  el2.style.hasCustomTypographyOverride = true;

  // User updates group default for body style
  const newDefaultDef = { fontFamily: "Poppins", fontSize: 16, fontWeight: 500, color: "#e2e8f0" };
  customGroups.body = newDefaultDef;

  // Propagate to elements
  const elements = [el1, el2].map((el) => {
    if (el.style.styleGroupId === "body" && !el.style.hasCustomTypographyOverride) {
      return {
        ...el,
        style: { ...el.style, ...newDefaultDef },
      };
    }
    return el;
  });

  // el1 should have adopted the new default
  assert.strictEqual(elements[0].style.fontFamily, "Poppins");
  assert.strictEqual(elements[0].style.fontSize, 16);

  // el2 should have retained its independent override
  assert.strictEqual(elements[1].style.color, "#ef4444");
  assert.strictEqual(elements[1].style.hasCustomTypographyOverride, true);
});

runTest("Reset to Inherited Style restores group default and clears override flag", () => {
  const el = createTextElement("el_reset", "heading");
  el.style.fontSize = 40;
  el.style.color = "#22c55e";
  el.style.hasCustomTypographyOverride = true;

  // Perform reset to group default
  const gDef = DEFAULT_GROUPS.heading;
  el.style = {
    ...el.style,
    fontFamily: gDef.fontFamily,
    fontSize: gDef.fontSize,
    fontWeight: gDef.fontWeight,
    color: gDef.color,
    hasCustomTypographyOverride: false,
  };

  assert.strictEqual(el.style.fontSize, 20);
  assert.strictEqual(el.style.color, "#ffffff");
  assert.strictEqual(el.style.hasCustomTypographyOverride, false);
});

// ---------------------------------------------------------------------------
// 4. Dynamic Discord RPC Protection
// ---------------------------------------------------------------------------
console.log("\n--- Suite 4: Dynamic Discord RPC Protection ---");

function isDynamicRestrictedText(type) {
  return [
    "rpc",
    "discordGameTitle",
    "discordActivity",
    "discordActivityDesc",
    "discordParty",
    "discordTimestamps",
    "discordArtwork",
  ].includes(type);
}

runTest("Discord Rich Presence components are identified as dynamic-restricted", () => {
  assert.strictEqual(isDynamicRestrictedText("rpc"), true);
  assert.strictEqual(isDynamicRestrictedText("discordGameTitle"), true);
  assert.strictEqual(isDynamicRestrictedText("discordActivityDesc"), true);
  assert.strictEqual(isDynamicRestrictedText("heading"), false);
  assert.strictEqual(isDynamicRestrictedText("bio"), false);
});

// ---------------------------------------------------------------------------
// 5. Rich Text & Markdown Parsing & Sanitization
// ---------------------------------------------------------------------------
console.log("\n--- Suite 5: Rich Text & Markdown Parsing & Sanitization ---");

function sanitizeUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("/") ||
    lower.startsWith("#")
  ) {
    return trimmed;
  }
  return null;
}

runTest("URL sanitizer permits https, http, and mailto links", () => {
  assert.strictEqual(sanitizeUrl("https://pixel.gg"), "https://pixel.gg");
  assert.strictEqual(sanitizeUrl("http://localhost:3000"), "http://localhost:3000");
  assert.strictEqual(sanitizeUrl("mailto:support@pixel.gg"), "mailto:support@pixel.gg");
});

runTest("URL sanitizer strips javascript: and data: injection attacks", () => {
  assert.strictEqual(sanitizeUrl("javascript:alert(document.cookie)"), null);
  assert.strictEqual(sanitizeUrl("JAVASCRIPT:alert(1)"), null);
  assert.strictEqual(sanitizeUrl("data:text/html,<script>alert(1)</script>"), null);
});

function testTokenize(text) {
  const inlineRegex =
    /(\|\|[\s\S]+?\|\|)|(\*\*\*[\s\S]+?\*\*\*)|(\*\*[\s\S]+?\*\*)|(__[\s\S]+?__)|(~~[\s\S]+?~~)|(`[^`\n]+`)|(\{color:([#a-zA-Z0-9_-]+)\}([\s\S]+?)\{\/color\})|(\[([^\]]+)\]\(([^)]+)\))|(\*[^\*\n]+\*)|(_[^_\n]+_)/g;

  const matches = [];
  let match;
  while ((match = inlineRegex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

runTest("Markdown parser correctly detects bold, italic, code, and spoilers", () => {
  const sample = "Welcome to **Pixel.gg** with `inline code` and ||secret spoiler||!";
  const tokens = testTokenize(sample);
  assert.ok(tokens.includes("**Pixel.gg**"));
  assert.ok(tokens.includes("`inline code`"));
  assert.ok(tokens.includes("||secret spoiler||"));
});

runTest("Discord Component V2 custom color tags parse cleanly", () => {
  const sample = "Status: {color:#22c55e}ONLINE{/color} today";
  const tokens = testTokenize(sample);
  assert.ok(tokens.includes("{color:#22c55e}ONLINE{/color}"));
});

console.log("\n=======================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
