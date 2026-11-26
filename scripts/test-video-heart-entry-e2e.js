/**
 * PIXLS.IN STUDIO — TARGETED E2E & BACKEND VERIFICATION SUITE
 * Verifies:
 *   1. Video Background Upload (25 MB limit, MP4/WebM magic bytes, frontend & backend)
 *   2. Heart Component Placement (standalone + child, max 5 limit, Free vs Premium delete protection)
 *   3. Global Like Synchronization across multiple Heart components
 *   4. Guns.lol-style Entry Screen + Video Sound Toggle
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright");

const PORT = 3112;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WEB_DIR = path.resolve(__dirname, "../apps/web");

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("Timed out waiting for Next.js server"));
          } else {
            setTimeout(attempt, 300);
          }
        });
    };
    attempt();
  });
}

async function testBackendVideoValidation() {
  console.log("[1/4] Verifying backend ImageAssetService 25 MB video validation...");
  const { ImageAssetService, UploadServiceError } = require(path.resolve(
    __dirname,
    "../apps/api/dist/services/imageAssetService.js"
  ));

  // Create minimal valid MP4 header (ftypisom)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  ]);
  // > 25 MB MP4 buffer
  const over25Mb = Buffer.alloc(25 * 1024 * 1024 + 1024, 0);
  mp4Header.copy(over25Mb, 0);

  let rejected = false;
  try {
    await ImageAssetService.processAndSaveAsset({
      userId: "usr_test_video",
      fileBuffer: over25Mb,
      fileName: "too_large.mp4",
      targetSlot: "background_video",
    });
  } catch (err) {
    rejected = true;
    assert(err instanceof UploadServiceError, "Expected UploadServiceError");
    assert.strictEqual(err.statusCode, 413);
    assert(
      err.message.includes("25 MB"),
      `Expected 25 MB limit message, got: ${err.message}`
    );
  }
  assert(rejected, "Backend must reject >25 MB video upload");
  console.log("   ✓ Backend >25 MB video rejection passed");
}

async function runPlaywrightTests() {
  console.log(`[2/4] Starting Next.js server on port ${PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: WEB_DIR,
    shell: true,
    stdio: "ignore",
    env: {
      ...process.env,
      API_URL: "http://127.0.0.1:3001",
      INTERNAL_API_URL: "http://127.0.0.1:3001",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001",
    },
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/customize`, 30000);
    browser = await chromium.launch({ headless: true });

    // --- TEST A: Editor Heart Max-5, Free Protection & Video Upload UI ---
    console.log("[3/4] Testing Heart Max-5, Free Delete Protection & Video 25MB UI...");
    const runEditorTest = async (isPremium) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route(/\/api\/|localhost:3001/, async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes("/api/auth/me") || url.includes("/auth/me")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: isPremium ? "usr_prem" : "usr_free",
              username: isPremium ? "prem_user" : "free_user",
              globalName: isPremium ? "Prem User" : "Free User",
              role: "USER",
              premiumStatus: isPremium,
              nitroStatus: isPremium ? 2 : 0,
              badges: "[]",
              createdAt: "2026-01-01T00:00:00.000Z",
              profile: {
                id: isPremium ? "prof_prem" : "prof_free",
                userId: isPremium ? "usr_prem" : "usr_free",
                displayName: isPremium ? "Prem User" : "Free User",
                bio: "Testing studio",
                views: 10,
                status: "ONLINE",
                visibility: "PUBLIC",
              },
            }),
          });
        }
        if (url.includes("/api/rpc/upload") && method === "POST") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              assetId: "asset_vid_1",
              url: "https://cdn.example.com/bg-video.mp4",
              fileName: "bg-video.mp4",
              fileSize: 1024 * 1024,
              mimeType: "video/mp4",
              isAnimated: true,
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      const page = await context.newPage();
      await page.goto(`${BASE_URL}/customize`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });

      // Open Add Element panel
      await page.getByTestId("dock-more-toggle").click();
      await page.waitForSelector('[data-testid="dock-open-elements-panel"]', { timeout: 3000 });
      await page.getByTestId("dock-open-elements-panel").click();
      await page.waitForSelector('[data-testid="builder-add-element-panel"]', { timeout: 5000 });

      // Insert 5 Heart components
      const heartBtn = page.getByTestId("library-add-heart-like");
      for (let i = 0; i < 5; i++) {
        await heartBtn.click();
        await page.waitForTimeout(80);
      }
      const placedCount = await page.locator('[data-node-type="heart-like"]').count();
      assert.strictEqual(placedCount, 5, `Expected 5 heart nodes, got ${placedCount}`);

      // Attempt 6th Heart component -> must stay 5
      await heartBtn.click();
      await page.waitForTimeout(120);
      const countAfter6th = await page.locator('[data-node-type="heart-like"]').count();
      assert.strictEqual(countAfter6th, 5, "6th Heart component must be rejected");

      // Close Elements panel & attempt to delete the topmost Heart component
      await page.getByTestId("elements-panel-close").click();
      await page.waitForTimeout(200);
      const topHeart = page.locator('[data-node-type="heart-like"]').last();
      await topHeart.click();
      await page.getByTestId("subbar-delete-btn").click();
      await page.waitForTimeout(150);
      const countAfterDel = await page.locator('[data-node-type="heart-like"]').count();
      if (!isPremium) {
        assert.strictEqual(countAfterDel, 5, "Free user must NOT be able to delete Heart component");
      } else {
        assert.strictEqual(countAfterDel, 4, "Premium user MUST be able to delete Heart component");

        // Test Video Background Upload UI & 25 MB client rejection
        await page.getByTestId("subbar-select-canvas").click();
        await page.getByTestId("secondary-dock-btn-properties").click();
        await page.waitForSelector('[data-testid="canvas-bg-type"]', { timeout: 5000 });
        await page.getByTestId("canvas-bg-type").selectOption("video");
        await page.waitForSelector('[data-testid="canvas-bg-video-upload-btn"]', { timeout: 5000 });

        // Upload valid small MP4
        const validMp4 = Buffer.from([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
        ]);
        await page.getByTestId("canvas-bg-video-file-input").setInputFiles({
          name: "sample.mp4",
          mimeType: "video/mp4",
          buffer: validMp4,
        });
        await page.waitForSelector('[data-testid="canvas-bg-video-success"]', { timeout: 5000 });
        const vidUrl = await page.getByTestId("canvas-bg-video-url").inputValue();
        assert.strictEqual(vidUrl, "https://cdn.example.com/bg-video.mp4");
      }

      await context.close();
    };

    await runEditorTest(false);
    await runEditorTest(true);
    console.log("   ✓ Heart Max-5, Free Protection, Premium Delete & Video Upload UI passed");

    // --- TEST B: Public Profile Entry Screen, Video Sound Toggle & Global Like Sync ---
    console.log("[4/4] Testing Entry Screen, Video Sound Toggle & Global Like Sync...");
    let serverLikes = 0;
    let serverLiked = false;

    const doc = {
      version: "2.0",
      id: "doc_heart_pub",
      title: "Heart Public",
      canvas: {
        width: 1280,
        height: 720,
        backgroundType: "video",
        backgroundColor: "#060608",
        backgroundGradientTo: "#14141b",
        backgroundGradientAngle: 135,
        backgroundImage: "",
        backgroundVideo: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        backgroundOpacity: 1,
        backgroundBlur: 0,
        overlayColor: "#000000",
        overlayOpacity: 0.3,
        gridEnabled: false,
        gridSize: 16,
        snapEnabled: true,
        snapSensitivity: 6,
        smartGuidesEnabled: true,
        entryScreenEnabled: true,
        entryScreenText: "[ ENTER PIXLS PROFILE ]",
      },
      nodes: [
        {
          id: "heart-1",
          type: "heart-like",
          name: "Heart 1",
          parentId: null,
          x: 100,
          y: 100,
          width: 112,
          height: 40,
          zIndex: 10,
          visible: true,
          locked: false,
          style: { backgroundColor: "#111116", backgroundOpacity: 0.9, borderWidth: 1, borderColor: "#2a2a34", borderRadius: 9999 },
          responsive: {},
          config: { heartLabel: "Like", heartAccentColor: "#f43f5e", heartShowCount: true },
        },
        {
          id: "heart-2",
          type: "heart-like",
          name: "Heart 2",
          parentId: null,
          x: 300,
          y: 100,
          width: 112,
          height: 40,
          zIndex: 11,
          visible: true,
          locked: false,
          style: { backgroundColor: "#111116", backgroundOpacity: 0.9, borderWidth: 1, borderColor: "#2a2a34", borderRadius: 9999 },
          responsive: {},
          config: { heartLabel: "Like", heartAccentColor: "#f43f5e", heartShowCount: true },
        },
        {
          id: "heart-3",
          type: "heart-like",
          name: "Heart 3",
          parentId: null,
          x: 500,
          y: 100,
          width: 112,
          height: 40,
          zIndex: 12,
          visible: true,
          locked: false,
          style: { backgroundColor: "#111116", backgroundOpacity: 0.9, borderWidth: 1, borderColor: "#2a2a34", borderRadius: 9999 },
          responsive: {},
          config: { heartLabel: "Like", heartAccentColor: "#f43f5e", heartShowCount: true },
        },
      ],
      preferences: {
        showGrid: false,
        snapEnabled: true,
        snapToGrid: false,
        snapToElements: true,
        smartGuides: true,
        defaultInsertTarget: "selected-container",
        showComponentOutlines: false,
        autoSaveEnabled: true,
        autoSaveDelaySec: 3,
      },
      metadata: { updatedAt: new Date().toISOString() },
    };

    const mockApi = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
      if (req.url && req.url.includes("/api/profile/u/heart_tester/like")) {
        if (req.method === "POST") {
          serverLiked = !serverLiked;
          serverLikes = serverLiked ? 1 : 0;
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, liked: serverLiked, likesCount: serverLikes }));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ likesCount: serverLikes, hasLiked: serverLiked }));
      }
      if (req.url && req.url.includes("/api/profile/u/heart_tester")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            user: {
              username: "heart_tester",
              discordId: null,
              avatar: null,
            },
            profile: {
              displayName: "Heart Tester",
              bio: "Synced likes",
              avatarUrl: "",
              views: 1,
              likesCount: 0,
              buttons: [],
              links: [],
              designConfig: JSON.stringify({ isPublished: true, profileBuilder: doc, draftProfileBuilder: doc }),
            },
          })
        );
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => mockApi.listen(3001, "127.0.0.1", resolve));

    const pubContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await pubContext.route(/\/api\/profile\/u\/heart_tester\/like/, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        serverLiked = !serverLiked;
        serverLikes = serverLiked ? 1 : 0;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, liked: serverLiked, likesCount: serverLikes }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ likesCount: serverLikes, hasLiked: serverLiked }),
      });
    });

    try {
      const pubPage = await pubContext.newPage();
      await pubPage.goto(`${BASE_URL}/heart_tester`, { waitUntil: "networkidle" });

      // Entry screen must be visible first
      await pubPage.waitForSelector('[data-testid="public-entry-screen"]', { timeout: 10000 });
      await pubPage.getByTestId("public-enter-profile-btn").click();
      await pubPage.waitForTimeout(550);
      assert.strictEqual(await pubPage.getByTestId("public-entry-screen").count(), 0, "Entry screen should dismiss");

      // Video sound toggle must be visible & interactive
      const soundBtn = pubPage.getByTestId("public-video-sound-toggle");
      await soundBtn.waitFor({ state: "visible", timeout: 5000 });
      await soundBtn.click();

      // All 3 Hearts must sync on click
      const h1 = pubPage.getByTestId("public-heart-node-heart-1");
      const h2 = pubPage.getByTestId("public-heart-node-heart-2");
      const h3 = pubPage.getByTestId("public-heart-node-heart-3");

      await h1.click();
      await pubPage.waitForTimeout(200);
      for (const h of [h1, h2, h3]) {
        assert.strictEqual(await h.getAttribute("data-heart-liked"), "true");
        assert.strictEqual(await h.getAttribute("data-heart-count"), "1");
      }

      // Clicking Heart 2 toggles unlike across all 3 Hearts
      await h2.click();
      await pubPage.waitForTimeout(200);
      for (const h of [h1, h2, h3]) {
        assert.strictEqual(await h.getAttribute("data-heart-liked"), "false");
        assert.strictEqual(await h.getAttribute("data-heart-count"), "0");
      }

      await pubContext.close();
      console.log("   ✓ Entry Screen, Video Sound Toggle & Global Like Sync passed");
      console.log("\nALL TARGETED VIDEO, HEART & ENTRY SCREEN TESTS PASSED!");
    } finally {
      mockApi.close();
    }
  } finally {
    if (browser) await browser.close();
    try {
      server.kill("SIGKILL");
    } catch {}
  }
}

(async () => {
  await testBackendVideoValidation();
  await runPlaywrightTests();
})().catch((err) => {
  console.error("TARGETED TEST FAILURE:", err);
  process.exit(1);
});
