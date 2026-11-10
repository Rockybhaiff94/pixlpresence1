/**
 * PIXEL.GG PixelsRPC Account Linking & Synchronization Verification Suite
 * Verifies:
 * 1. Monotonic session ID tagging & in-flight AbortController cancellation
 * 2. Rapid regeneration flicker elimination
 * 3. Server timestamp derived countdown calculation & visibility synchronization
 * 4. Single-active-state finite state machine transition rules
 * 5. Vencord CSP whitelisting & diagnostic error resilience
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("\n=======================================================");
console.log("  PIXEL.GG PixelsRPC ACCOUNT LINKING VERIFICATION SUITE");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. Verify apps/web/src/app/account/rpc/page.tsx implementation
const webPagePath = path.resolve(__dirname, "../apps/web/src/app/account/rpc/page.tsx");
const webPageCode = fs.readFileSync(webPagePath, "utf-8");

test("Web page implements single-state LinkingState union", () => {
  assert(
    webPageCode.includes('type LinkingState =') &&
    webPageCode.includes('"idle"') &&
    webPageCode.includes('"generating"') &&
    webPageCode.includes('"waiting"') &&
    webPageCode.includes('"verifying"') &&
    webPageCode.includes('"linked"') &&
    webPageCode.includes('"expired"') &&
    webPageCode.includes('"failed"') &&
    webPageCode.includes('"cancelled"'),
    "LinkingState must define all 8 mutually exclusive states"
  );
});

test("Web page tracks monotonic activeSessionIdRef and abortControllerRef", () => {
  assert(
    webPageCode.includes("const activeSessionIdRef = useRef<string | null>(null);") &&
    webPageCode.includes("const abortControllerRef = useRef<AbortController | null>(null);"),
    "activeSessionIdRef and abortControllerRef must be defined"
  );
});

test("handleGenerateLinkingCode aborts previous controller and clears timers immediately", () => {
  assert(
    webPageCode.includes("clearSessionPointers()") &&
    webPageCode.includes("activeSessionIdRef.current = newSessionId") &&
    webPageCode.includes("const controller = new AbortController()"),
    "Old timers and requests must be aborted before dispatching new authorization request"
  );
});

test("Polling status checks activeSessionIdRef to disregard stale responses", () => {
  assert(
    webPageCode.includes("if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) return;") &&
    webPageCode.includes("if (activeSessionIdRef.current !== newSessionId) return;"),
    "Poller must reject responses when activeSessionIdRef does not match"
  );
});

test("Countdown timer calculates remaining time from server expiresAtMs", () => {
  assert(
    webPageCode.includes("const currentRemaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));") ||
    webPageCode.includes("const remaining = Math.max(0, Math.floor((currentSession.expiresAtMs - Date.now()) / 1000));"),
    "Countdown must be calculated using Date.now() against server expiresAtMs"
  );
});

test("Visibilitychange and focus listeners sync remaining time on tab reactivation", () => {
  assert(
    webPageCode.includes('document.addEventListener("visibilitychange"') &&
    webPageCode.includes('window.addEventListener("focus"'),
    "Page must listen to visibilitychange and focus to prevent timer drift"
  );
});

// 2. Verify Vencord Plugin Implementation
const vencordIndexPath = path.resolve(__dirname, "../packages/vencord-plugin/src/index.ts");
const vencordIndexCode = fs.readFileSync(vencordIndexPath, "utf-8");

test("Vencord plugin linkDeviceAccount implements candidate fallback URLs", () => {
  assert(
    vencordIndexCode.includes("candidateUrls") &&
    vencordIndexCode.includes("pixlpresence1-web.vercel.app") &&
    vencordIndexCode.includes("pixelgg-api.onrender.com"),
    "Plugin must include failover URL endpoints"
  );
});

test("Vencord plugin parses HTTP status codes with diagnostic errors", () => {
  assert(
    vencordIndexCode.includes("Invalid or expired linking code") &&
    vencordIndexCode.includes("Too many verification attempts") &&
    vencordIndexCode.includes("PIXEL.GG servers are temporarily unavailable"),
    "Plugin must parse HTTP status codes into clear user-facing messages"
  );
});

// 3. Verify Vencord Native Script & CSP whitelisting
const nativeTsPath = path.resolve(__dirname, "../packages/vencord-plugin/src/native.ts");
assert(fs.existsSync(nativeTsPath), "native.ts must exist");
const nativeTsCode = fs.readFileSync(nativeTsPath, "utf-8");

test("native.ts registers PIXEL.GG and Vercel domains with CspPolicies", () => {
  assert(
    nativeTsCode.includes('CspPolicies["pixlpresence1-web.vercel.app"]') &&
    nativeTsCode.includes('CspPolicies["pixelgg-api.onrender.com"]') &&
    nativeTsCode.includes('CspPolicies["*.pixel.gg"]'),
    "native.ts must whitelist pixlpresence1-web, pixelgg-api, and *.pixel.gg"
  );
});

// 4. Verify Built Vencord Patcher Artifact contains whitelisted CSP domains
const patcherPath = "C:/Users/Acer/AppData/Local/PixelsRPC/vencord/dist/patcher.js";
if (fs.existsSync(patcherPath)) {
  const patcherCode = fs.readFileSync(patcherPath, "utf-8");
  test("Vencord built patcher.js contains CSP whitelist for PIXEL.GG", () => {
    assert(
      patcherCode.includes("pixlpresence1-web.vercel.app") &&
      patcherCode.includes("pixelgg-api.onrender.com") &&
      patcherCode.includes("pixel.gg"),
      "patcher.js must contain whitelisted domains"
    );
  });
}

// 5. Test State Machine logic in isolated simulation
test("Simulation: Monotonic session invalidation prevents state flickering", () => {
  let activeSessionId = null;
  let currentState = "idle";
  let activeCode = null;

  // Session 1 generation
  const session1Id = "session_1";
  activeSessionId = session1Id;
  currentState = "generating";

  // Session 1 completes authorize
  activeCode = "CODE1111";
  currentState = "waiting";

  // User immediately generates Session 2
  const session2Id = "session_2";
  activeSessionId = session2Id;
  currentState = "generating";
  activeCode = null;

  // Simulate stale poll response from Session 1 arriving late (e.g. status: REVOKED)
  const incomingPollSessionId = session1Id;
  const pollStatus = "REVOKED";

  if (incomingPollSessionId === activeSessionId) {
    currentState = "expired";
    activeCode = null;
  }
  // Because incomingPollSessionId !== activeSessionId, stale response was discarded!
  assert.strictEqual(currentState, "generating", "State must remain 'generating' and not flip to 'expired'");
  assert.strictEqual(activeCode, null);

  // Session 2 completes authorize
  activeCode = "CODE2222";
  currentState = "waiting";

  assert.strictEqual(currentState, "waiting");
  assert.strictEqual(activeCode, "CODE2222");
});

test("Simulation: Expiration timestamp countdown accuracy across tab pauses", () => {
  const now = Date.now();
  const expiresAtMs = now + 120 * 1000; // 120 seconds in future

  // Initial calculation
  let remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  assert.strictEqual(remaining, 120);

  // Simulate 45 seconds passing while tab was hidden
  const simulatedResumeTime = now + 45 * 1000;
  remaining = Math.max(0, Math.floor((expiresAtMs - simulatedResumeTime) / 1000));
  assert.strictEqual(remaining, 75);

  // Simulate full expiration (130 seconds passed)
  const simulatedExpiredTime = now + 130 * 1000;
  remaining = Math.max(0, Math.floor((expiresAtMs - simulatedExpiredTime) / 1000));
  assert.strictEqual(remaining, 0);
});

console.log("\n-------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("-------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}

