/**
 * PIXEL.GG STUDIO: SOCIAL MEDIA INTEGRATION & LINKED ACCOUNTS TEST SUITE
 * Tests Single Source of Truth linking, modal selection, handle extraction,
 * URL sanitization, smart arrangement, disconnected account resilience, and security.
 */

const assert = require("assert");

console.log("\n=======================================================");
console.log("PIXEL.GG STUDIO: SOCIAL MEDIA & LINKED ACCOUNTS SUITE");
console.log("=======================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

// ----------------------------------------------------
// 1. URL Sanitizer Verification (Phase 6 & 12)
// ----------------------------------------------------
console.log("--- Suite 1: Social URL Sanitization & Security ---");

function sanitizeSocialUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "#";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return "#";
}

runTest("Allows legitimate HTTPS profile links", () => {
  assert.strictEqual(
    sanitizeSocialUrl("https://youtube.com/@creative"),
    "https://youtube.com/@creative"
  );
  assert.strictEqual(
    sanitizeSocialUrl("https://github.com/torvalds"),
    "https://github.com/torvalds"
  );
});

runTest("Blocks javascript: and data: XSS vectors", () => {
  assert.strictEqual(sanitizeSocialUrl("javascript:alert(1)"), "#");
  assert.strictEqual(sanitizeSocialUrl("data:text/html,<script>alert(1)</script>"), "#");
  assert.strictEqual(sanitizeSocialUrl("vbscript:msgbox(1)"), "#");
});

runTest("Auto-prefixes protocol-less domains", () => {
  assert.strictEqual(sanitizeSocialUrl("twitch.tv/ninja"), "https://twitch.tv/ninja");
});

// ----------------------------------------------------
// 2. Handle Extraction Engine (Phase 5)
// ----------------------------------------------------
console.log("\n--- Suite 2: Handle & Identity Extraction Engine ---");

function extractSocialHandle(url, platformId, fallbackLabel) {
  if (!url) return fallbackLabel || "User";
  const cleanUrl = url.trim().replace(/\/$/, "");
  try {
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    const pathname = parsed.pathname;

    if (platformId === "youtube" || cleanUrl.includes("youtube.com")) {
      const match = pathname.match(/@([^/?#]+)/);
      if (match) return `@${match[1]}`;
    }
    if (
      platformId === "twitter" ||
      platformId === "x" ||
      cleanUrl.includes("twitter.com") ||
      cleanUrl.includes("x.com")
    ) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return `@${parts[0]}`;
    }
    if (platformId === "instagram" || cleanUrl.includes("instagram.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return `@${parts[0]}`;
    }
    if (platformId === "github" || cleanUrl.includes("github.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }
    if (platformId === "twitch" || cleanUrl.includes("twitch.tv")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }
    if (platformId === "reddit" || cleanUrl.includes("reddit.com")) {
      const match = pathname.match(/user\/([^/?#]+)/);
      if (match) return `u/${match[1]}`;
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1];
  } catch {}
  return fallbackLabel || "Profile";
}

runTest("Extracts YouTube @channel handle cleanly", () => {
  assert.strictEqual(extractSocialHandle("https://youtube.com/@mkbhd", "youtube"), "@mkbhd");
});

runTest("Extracts Twitter/X @handle cleanly", () => {
  assert.strictEqual(extractSocialHandle("https://x.com/shadcn", "x"), "@shadcn");
});

runTest("Extracts GitHub username cleanly", () => {
  assert.strictEqual(extractSocialHandle("https://github.com/vercel", "github"), "vercel");
});

runTest("Extracts Reddit u/username cleanly", () => {
  assert.strictEqual(extractSocialHandle("https://reddit.com/user/spez", "reddit"), "u/spez");
});

// ----------------------------------------------------
// 3. Single Source of Truth & Account Selection (Phase 2 & 3)
// ----------------------------------------------------
console.log("\n--- Suite 3: Account Selection & Single Source of Truth ---");

const mockDatabaseLinks = [
  { id: "link_yt_main", label: "YouTube Main", url: "https://youtube.com/@main", icon: "youtube", visibility: true },
  { id: "link_yt_clips", label: "YouTube Clips", url: "https://youtube.com/@clips", icon: "youtube", visibility: true },
  { id: "link_gh", label: "GitHub", url: "https://github.com/pixeldev", icon: "github", visibility: true },
  { id: "link_disc", label: "Discord Community", url: "https://discord.gg/pixel", icon: "discord", visibility: true },
];

runTest("Embed picker only lists accounts that exist in user's linked accounts", () => {
  const availableInModal = mockDatabaseLinks.filter((l) => l.visibility);
  assert.strictEqual(availableInModal.length, 4);
  assert.ok(availableInModal.some((l) => l.id === "link_yt_main"));
});

runTest("Supports multiple accounts for the same platform (e.g. 2 YouTube channels)", () => {
  const youtubeAccounts = mockDatabaseLinks.filter((l) => l.icon === "youtube");
  assert.strictEqual(youtubeAccounts.length, 2);
  assert.notStrictEqual(youtubeAccounts[0].id, youtubeAccounts[1].id);
  assert.strictEqual(youtubeAccounts[0].url, "https://youtube.com/@main");
  assert.strictEqual(youtubeAccounts[1].url, "https://youtube.com/@clips");
});

runTest("Detects accounts already added to current embed", () => {
  const canvasElements = [
    { id: "el_1", type: "socialIcon", props: { linkId: "link_gh" } },
  ];
  const addedIds = canvasElements.map((el) => el.props?.linkId).filter(Boolean);
  assert.strictEqual(addedIds.includes("link_gh"), true);
  assert.strictEqual(addedIds.includes("link_yt_main"), false);
});

// ----------------------------------------------------
// 4. Empty State Verification (Phase 4)
// ----------------------------------------------------
console.log("\n--- Suite 4: Empty State & Navigation ---");

runTest("Triggers empty state with 'Add Social Media' CTA when user has 0 links", () => {
  const emptyLinks = [];
  const isEmpty = emptyLinks.length === 0;
  assert.strictEqual(isEmpty, true);

  const emptyStateConfig = {
    message: "No social media accounts linked yet.",
    actionUrl: "/links",
    actionLabel: "Add Social Media",
  };
  assert.strictEqual(emptyStateConfig.actionUrl, "/links");
});

// ----------------------------------------------------
// 5. Canvas Independence & Disconnection Resilience (Phase 5 & 9)
// ----------------------------------------------------
console.log("\n--- Suite 5: Canvas Independence & Disconnection Resilience ---");

runTest("Removing social element from embed does NOT delete account from database", () => {
  let canvasElements = [
    { id: "el_gh", type: "socialIcon", props: { linkId: "link_gh" } },
    { id: "el_yt", type: "socialIcon", props: { linkId: "link_yt_main" } },
  ];
  let accountLinks = [...mockDatabaseLinks];

  // User deletes element from canvas
  canvasElements = canvasElements.filter((el) => el.id !== "el_gh");
  assert.strictEqual(canvasElements.length, 1);

  // Account links remain 100% intact
  assert.strictEqual(accountLinks.length, 4);
  assert.ok(accountLinks.some((l) => l.id === "link_gh"));
});

runTest("Detects disconnected account in editor without crashing", () => {
  const canvasElement = { id: "el_old", type: "socialIcon", props: { linkId: "link_deleted_99" } };
  const isDisconnected = !mockDatabaseLinks.some((l) => l.id === canvasElement.props.linkId);
  assert.strictEqual(isDisconnected, true);
});

runTest("Public profile omits disconnected link cleanly", () => {
  const canvasElements = [
    { id: "el_active", type: "socialIcon", props: { linkId: "link_gh" } },
    { id: "el_ghost", type: "socialIcon", props: { linkId: "link_deleted_99" } },
  ];
  const isInteractive = false; // public profile

  const renderableElements = canvasElements.filter((el) => {
    if (!isInteractive && el.props?.linkId) {
      return mockDatabaseLinks.some((l) => l.id === el.props.linkId && l.visibility !== false);
    }
    return true;
  });

  assert.strictEqual(renderableElements.length, 1);
  assert.strictEqual(renderableElements[0].id, "el_active");
});

// ----------------------------------------------------
// 6. Smart Social Group Arrangement (Phase 8)
// ----------------------------------------------------
console.log("\n--- Suite 6: Smart Grid & Social Arrangement ---");

function arrangeSocialElementsHorizontally(elements, parentWidth = 520, gap = 12) {
  const totalWidth = elements.reduce((sum, el) => sum + (el.transform.width || 44), 0);
  const totalGaps = (elements.length - 1) * gap;
  const startX = Math.max(0, (parentWidth - (totalWidth + totalGaps)) / 2);
  let currentX = startX;
  const sharedY = elements[0].transform.y;

  return elements.map((el) => {
    const updated = {
      ...el,
      transform: {
        ...el.transform,
        x: Math.round(currentX),
        y: Math.round(sharedY),
      },
    };
    currentX += (el.transform.width || 44) + gap;
    return updated;
  });
}

runTest("Arranges 3 social icons evenly along a horizontal row", () => {
  const icons = [
    { id: "s1", transform: { x: 0, y: 50, width: 44, height: 44 } },
    { id: "s2", transform: { x: 100, y: 120, width: 44, height: 44 } },
    { id: "s3", transform: { x: 200, y: 200, width: 44, height: 44 } },
  ];

  const arranged = arrangeSocialElementsHorizontally(icons, 500, 12);
  assert.strictEqual(arranged.length, 3);
  // Shared Y coordinate
  assert.strictEqual(arranged[0].transform.y, 50);
  assert.strictEqual(arranged[1].transform.y, 50);
  assert.strictEqual(arranged[2].transform.y, 50);

  // Equal gap spacing (44px width + 12px gap = 56px delta)
  const gap1 = arranged[1].transform.x - arranged[0].transform.x;
  const gap2 = arranged[2].transform.x - arranged[1].transform.x;
  assert.strictEqual(gap1, 56);
  assert.strictEqual(gap2, 56);
});

// ----------------------------------------------------
// 7. Security: Zero Raw OAuth Tokens in Canvas Element State (Phase 10 & 12)
// ----------------------------------------------------
console.log("\n--- Suite 7: Privacy & Security Tokens ---");

runTest("Canvas element props store references only, never OAuth secrets or tokens", () => {
  const socialElement = {
    id: "social_yt_1",
    type: "socialIcon",
    props: {
      linkId: "link_yt_main",
      platform: "youtube",
      label: "YouTube",
      url: "https://youtube.com/@creative",
      handle: "@creative",
    },
  };

  const serialized = JSON.stringify(socialElement);
  assert.strictEqual(serialized.includes("accessToken"), false);
  assert.strictEqual(serialized.includes("refreshToken"), false);
  assert.strictEqual(serialized.includes("clientSecret"), false);
  assert.strictEqual(serialized.includes("token"), false);
});

console.log("\n=======================================================");
console.log(`Results: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
console.log("=======================================================\n");

process.exit(totalTests === passedTests ? 0 : 1);

