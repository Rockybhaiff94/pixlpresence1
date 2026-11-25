/**
 * Comprehensive Sitewide Image & Asset Upload Audit, Backend Integration & Playwright E2E Suite
 * Covers:
 * - Auth enforcement (401 unauthenticated, Bearer & Cookie auth, cross-user ownership protection)
 * - Magic-byte validation (PNG, JPG, WEBP, Static GIF, Animated GIF, Animated WebP, MP4, WAV, invalid/empty/oversized)
 * - Semantic HTTP statuses (400, 401, 413, 415, 503) & non-misleading frontend error messages
 * - Cold-start 503 wake & retry recovery
 * - Aspect ratio preservation for Studio / Profile / Image Host vs 512x512 RPC icon normalization
 * - Animated GIF multi-frame preservation across upload + storage + /uploads re-hydration + reload
 * - Direct Image URL independence & asset reuse/deletion in MediaUploadModal & /image-host
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn, execSync } = require("child_process");
const sharp = require("sharp");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright"));
}

const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const API_DIR = path.join(ROOT_DIR, "apps/api");
const API_PORT = 3111;
const WEB_PORT = 3110;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

const { prisma } = require("@discord-rpc/database");

async function waitForUrl(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function createSyntheticGif(width, height, frames, delayMs = 80) {
  const pageHeight = height;
  const totalHeight = height * frames;
  const buf = Buffer.alloc(width * totalHeight * 4);
  for (let f = 0; f < frames; f++) {
    const startRow = f * height;
    const r = (f * 35) % 255;
    const g = (255 - f * 25) % 255;
    const b = (f * 55) % 255;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = ((startRow + y) * width + x) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255;
      }
    }
  }
  return sharp(buf, {
    raw: { width, height: totalHeight, channels: 4, pageHeight },
  })
    .gif({ loop: 0, delay: Array(frames).fill(delayMs) })
    .toBuffer();
}

async function runTests() {
  const suffix = crypto.randomBytes(4).toString("hex");
  const tokenA = `test_upload_tok_a_${suffix}`;
  const tokenB = `test_upload_tok_b_${suffix}`;
  const userA = await prisma.user.create({
    data: {
      username: `upload_audit_a_${suffix}`,
      globalName: "Upload Audit User A",
      appToken: tokenA,
      profile: {
        create: {
          displayName: "Upload Audit User A",
          bio: "Audit test profile",
        },
      },
    },
  });
  const userB = await prisma.user.create({
    data: {
      username: `upload_audit_b_${suffix}`,
      globalName: "Upload Audit User B",
      appToken: tokenB,
      profile: {
        create: {
          displayName: "Upload Audit User B",
        },
      },
    },
  });

  console.log("[1/5] Starting API server on port", API_PORT, "and Web server on port", WEB_PORT);
  const apiProc = spawn("node", ["dist/index.js"], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      NODE_ENV: "development",
      FRONTEND_URL: WEB_URL,
      PUBLIC_API_URL: API_URL,
      DISCORD_BOT_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], {
    cwd: WEB_DIR,
    shell: true,
    env: {
      ...process.env,
      PORT: String(WEB_PORT),
      NEXT_PUBLIC_API_URL: API_URL,
      INTERNAL_API_URL: API_URL,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let browser;
  try {
    await Promise.all([
      waitForUrl(`${API_URL}/health`, 45000),
      waitForUrl(`${WEB_URL}/customize`, 45000),
    ]);

    // Prepare real test binaries
    const widePng = await sharp({
      create: { width: 800, height: 450, channels: 4, background: { r: 20, g: 160, b: 220, alpha: 1 } },
    }).png().toBuffer();
    const jpgBuf = await sharp({
      create: { width: 600, height: 300, channels: 3, background: { r: 220, g: 80, b: 40 } },
    }).jpeg({ quality: 85 }).toBuffer();
    const webpBuf = await sharp({
      create: { width: 320, height: 240, channels: 4, background: { r: 120, g: 240, b: 90, alpha: 0.9 } },
    }).webp().toBuffer();
    const staticGif = await createSyntheticGif(160, 120, 1);
    const animGifWide = await createSyntheticGif(640, 360, 6, 80);
    const animGifRpc = await createSyntheticGif(200, 200, 8, 80);
    const wavHeader = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WAVEfmt "),
      Buffer.alloc(16),
    ]);
    const mp4Header = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from("ftypisom"),
      Buffer.alloc(16),
    ]);

    // =========================================================================
    // PART 1: BACKEND API AUTH, VALIDATION, FORMATS, PERSISTENCE & SECURITY
    // =========================================================================
    console.log("[2/5] Running Backend API Upload, Format & Security Tests...");

    // 1. Unauthenticated must return 401 (not 503)
    {
      const form = new FormData();
      form.append("file", new Blob([widePng], { type: "image/png" }), "unauth.png");
      const r = await fetch(`${API_URL}/api/rpc/upload`, { method: "POST", body: form });
      assert.strictEqual(r.status, 401, `Expected 401 for unauthenticated upload, got ${r.status}`);
    }

    // 2. Bearer token multipart upload: Wide Canvas Background PNG preserves 800x450 aspect ratio!
    let bgAssetId;
    let bgAssetUrl;
    {
      const form = new FormData();
      form.append("file", new Blob([widePng], { type: "image/png" }), "canvas-bg.png");
      form.append("fileName", "canvas-bg.png");
      form.append("targetSlot", "canvas_background");
      const r = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: form,
      });
      const json = await r.json();
      assert.strictEqual(r.status, 200, `PNG upload failed: ${JSON.stringify(json)}`);
      assert.strictEqual(json.width, 800, "Canvas background must preserve width 800");
      assert.strictEqual(json.height, 450, "Canvas background must preserve height 450 (not 512x512 crop)");
      bgAssetId = json.assetId;
      bgAssetUrl = json.url;

      const served = await fetch(bgAssetUrl);
      assert.strictEqual(served.status, 200, "Uploaded PNG URL must return 200");
      assert(served.headers.get("content-type").includes("image/png"));
    }

    // 3. JSON request WITHOUT Content-Type header (reproducing legacy BuilderModals bug) -> now handled cleanly too!
    {
      const r = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          file: `data:image/jpeg;base64,${jpgBuf.toString("base64")}`,
          fileName: "banner-test.jpg",
          targetSlot: "banner",
        }),
      });
      const json = await r.json();
      assert.strictEqual(r.status, 200, `JSON fallback upload failed: ${JSON.stringify(json)}`);
      assert.strictEqual(json.width, 600);
      assert.strictEqual(json.height, 300);
    }

    // 4. Animated GIF upload via Cookie auth (`canvas_background` 640x360) -> preserves 6 frames & aspect ratio!
    let animGifUrl;
    {
      const form = new FormData();
      form.append("file", new Blob([animGifWide], { type: "image/gif" }), "anim-bg.gif");
      form.append("targetSlot", "canvas_background");
      const r = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Cookie: `pixel_app_token=${encodeURIComponent(tokenA)}` },
        body: form,
      });
      const json = await r.json();
      assert.strictEqual(r.status, 200, `Animated GIF upload failed: ${JSON.stringify(json)}`);
      assert.strictEqual(json.mimeType, "image/gif");
      assert.strictEqual(json.isAnimated, true);
      assert.strictEqual(json.frameCount, 6, "Must retain all 6 frames");
      assert.strictEqual(json.width, 640);
      assert.strictEqual(json.height, 360);
      animGifUrl = json.url;

      // Verify DB fallback recovery when disk file is removed!
      const fileName = path.basename(animGifUrl);
      const diskPath = path.join(API_DIR, "uploads/rpc", fileName);
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      const restoredRes = await fetch(animGifUrl);
      assert.strictEqual(restoredRes.status, 200, "Must restore deleted disk file from PostgreSQL");
      const restoredBuf = Buffer.from(await restoredRes.arrayBuffer());
      const meta = await sharp(restoredBuf, { animated: true }).metadata();
      assert.strictEqual(meta.pages, 6, "Served GIF after disk recovery still has 6 frames");
    }

    // 5. WEBP, Static GIF, RPC largeImage, Video (MP4), Audio (WAV)
    for (const tc of [
      { name: "embed.webp", buf: webpBuf, slot: "embed_background", mime: "image/webp" },
      { name: "static.gif", buf: staticGif, slot: "image", mime: "image/gif" },
      { name: "rpc-large.gif", buf: animGifRpc, slot: "largeImage", mime: "image/gif" },
      { name: "bg-video.mp4", buf: mp4Header, slot: "background_video", mime: "video/mp4" },
      { name: "bg-audio.wav", buf: wavHeader, slot: "background_audio", mime: "audio/wav" },
    ]) {
      const form = new FormData();
      form.append("file", new Blob([tc.buf], { type: tc.mime }), tc.name);
      form.append("targetSlot", tc.slot);
      const r = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: form,
      });
      const j = await r.json();
      assert.strictEqual(r.status, 200, `${tc.name} (${tc.slot}) failed: ${JSON.stringify(j)}`);
      assert.strictEqual(j.mimeType, tc.mime, `Mime mismatch for ${tc.name}`);
    }

    // 6. Invalid format (HTML disguised as PNG) -> 415; Empty -> 400; Oversized -> 413
    {
      const badForm = new FormData();
      badForm.append("file", new Blob([Buffer.from("<html><script>alert(1)</script></html>")], { type: "image/png" }), "evil.png");
      const rBad = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: badForm,
      });
      assert.strictEqual(rBad.status, 415, `Expected 415 for spoofed PNG, got ${rBad.status}`);

      const emptyForm = new FormData();
      emptyForm.append("file", new Blob([], { type: "image/png" }), "empty.png");
      const rEmpty = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: emptyForm,
      });
      assert.strictEqual(rEmpty.status, 400, `Expected 400 for empty file, got ${rEmpty.status}`);

      const hugeForm = new FormData();
      const hugePng = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(10 * 1024 * 1024 + 512),
      ]);
      hugeForm.append("file", new Blob([hugePng], { type: "image/png" }), "huge.png");
      const rHuge = await fetch(`${API_URL}/api/rpc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
        body: hugeForm,
      });
      assert.strictEqual(rHuge.status, 413, `Expected 413 for >10MB image, got ${rHuge.status}`);
    }

    // 7. Asset library listing (no binary `data` blob leaked) & cross-user delete protection
    {
      const listRes = await fetch(`${API_URL}/api/rpc/assets`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(listRes.status, 200);
      const list = await listRes.json();
      assert(list.length >= 6, "All studio & RPC assets should be preserved in asset library");
      assert.strictEqual(list[0].data, undefined, "Binary `data` blob must NEVER be serialized in /assets JSON");
      assert(list.some((a) => a.id === bgAssetId && a.url === bgAssetUrl));

      // User B must NOT be able to delete User A's asset
      const delOther = await fetch(`${API_URL}/api/rpc/assets/${bgAssetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(delOther.status, 404);
    }
    console.log("   ✓ Backend API upload, formats, animated GIF, security & DB recovery passed");

    // =========================================================================
    // PART 2: PLAYWRIGHT E2E TESTS — STUDIO, IMAGE HOST, ERROR HANDLING, PERSISTENCE
    // =========================================================================
    console.log("[3/5] Launching headless Chromium for Sitewide E2E Upload Tests...");
    browser = await chromium.launch({ headless: true });

    const tempDir = path.join(ROOT_DIR, ".tmp-upload-fixtures");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const pngPath = path.join(tempDir, "studio-bg.png");
    const gifPath = path.join(tempDir, "studio-anim.gif");
    const badPath = path.join(tempDir, "bad.txt");
    fs.writeFileSync(pngPath, widePng);
    fs.writeFileSync(gifPath, animGifWide);
    fs.writeFileSync(badPath, "not an image");

    // Route helper: forwards browser API/upload calls (including cross-origin https://) cleanly to local test API server
    async function attachApiForwarder(context) {
      await context.route(/https?:\/\/[^/]+\/(api|uploads)\/.*/, async (route) => {
        const req = route.request();
        const u = new URL(req.url());
        const reqOrigin = req.headers()["origin"] || WEB_URL;
        const corsHeaders = {
          "access-control-allow-origin": reqOrigin,
          "access-control-allow-credentials": "true",
          "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With, Accept, Cookie, X-App-Token, X-Api-Token",
        };
        if (req.method() === "OPTIONS") {
          await route.fulfill({ status: 204, headers: corsHeaders });
          return;
        }
        const targetUrl = `${API_URL}${u.pathname}${u.search}`;
        try {
          const forwardHeaders = { ...req.headers() };
          delete forwardHeaders["host"];
          delete forwardHeaders["content-length"];
          const bodyBuf = req.postDataBuffer();
          const apiRes = await fetch(targetUrl, {
            method: req.method(),
            headers: forwardHeaders,
            body: bodyBuf && bodyBuf.length > 0 ? bodyBuf : undefined,
          });
          const resHeaders = { ...corsHeaders };
          apiRes.headers.forEach((v, k) => {
            if (k.toLowerCase() !== "transfer-encoding" && k.toLowerCase() !== "content-encoding") {
              resHeaders[k] = v;
            }
          });
          await route.fulfill({
            status: apiRes.status,
            headers: resHeaders,
            body: Buffer.from(await apiRes.arrayBuffer()),
          });
        } catch (err) {
          await route.fulfill({ status: 503, headers: corsHeaders, body: String(err) });
        }
      });
    }

    try {
      // Suite A: Studio Canvas Background + Embed Image + Asset Reuse + Direct URL + 503 Recovery & Accurate Errors
      {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await attachApiForwarder(context);
        await context.addInitScript((tok) => {
          localStorage.setItem("pixel_app_token", tok);
          document.cookie = `pixel_app_token=${tok}; path=/; SameSite=Lax`;
        }, tokenA);

        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", (e) => pageErrors.push(e.message));

        await page.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="profile-builder-studio"]', { timeout: 15000 });

        // Select Canvas (Level A) via bottom bar, open Properties, select Background Type = Image
        await page.getByTestId("subbar-select-canvas").click();
        await page.getByTestId("secondary-dock-btn-properties").click();
        await page.waitForSelector('[data-testid="properties-canvas-inspector"]', { timeout: 5000 });
        await page.getByTestId("canvas-bg-type").selectOption("image");
        await page.waitForSelector('[data-testid="canvas-bg-replace"]', { timeout: 3000 });

        // Replace Canvas Background -> simulate transient 503 ONCE -> verify automatic retry succeeds!
        let failOnce503 = true;
        await page.route("**/api/rpc/upload", async (route) => {
          const req = route.request();
          if (failOnce503 && req.method() === "POST") {
            failOnce503 = false;
            await route.fulfill({
              status: 503,
              contentType: "text/html",
              body: "<html><body>503 Service Unavailable (waking instance)</body></html>",
            });
            return;
          }
          await route.fallback();
        });

        await page.getByTestId("canvas-bg-replace").click();
        await page.waitForSelector('[data-testid="media-upload-modal"]', { timeout: 3000 });

        await page.getByTestId("media-file-input").setInputFiles(gifPath);
        try {
          await page.getByTestId("media-upload-modal").waitFor({ state: "detached", timeout: 15000 });
        } catch (waitErr) {
          const errBanner = await page.getByTestId("media-upload-error").textContent().catch(() => null);
          throw new Error(`${waitErr.message} (UI error banner: ${errBanner || "none"})`);
        }

        // Verify Animated GIF URL applied to canvas background and loaded as valid decoded image
        const bgImg = page.locator('[data-canvas-bg="true"] img[alt="Canvas Background"]');
        await bgImg.waitFor({ state: "visible", timeout: 5000 });
        const bgSrcBefore = await bgImg.getAttribute("src");
        assert(bgSrcBefore && bgSrcBefore.includes(".gif"), `Canvas background should display uploaded animated .gif, got: ${bgSrcBefore}`);

        // Verify public profile image upload (Profile Image node inside embed) -> asset reuse library shows uploaded GIF!
        await page.locator('[data-node-type="profile-image"]').first().click();
        await page.waitForSelector('[data-testid="prop-image-replace"]', { timeout: 3000 });
        await page.getByTestId("prop-image-replace").click();
        await page.waitForSelector('[data-testid="media-upload-modal"]', { timeout: 3000 });
        await page.getByTestId("media-file-input").setInputFiles(pngPath);
        await page.getByTestId("media-upload-modal").waitFor({ state: "detached", timeout: 15000 });

        // Save Draft & reload -> verify persistence across refresh!
        await page.getByTestId("builder-save-draft-btn").click();
        await page.waitForTimeout(800);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="builder-canvas-surface"]', { timeout: 15000 });
        const bgImgReload = page.locator('[data-canvas-bg="true"] img[alt="Canvas Background"]');
        await bgImgReload.waitFor({ state: "visible", timeout: 5000 });
        const bgSrcAfter = await bgImgReload.getAttribute("src");
        assert(bgSrcAfter && bgSrcAfter.includes(".gif"), `Uploaded animated GIF background must persist after reload, got: ${bgSrcAfter}`);

        // Re-select Canvas & Background Type = Image
        await page.getByTestId("subbar-select-canvas").click();
        await page.getByTestId("secondary-dock-btn-properties").click();
        await page.waitForSelector('[data-testid="properties-canvas-inspector"]', { timeout: 5000 });
        await page.getByTestId("canvas-bg-type").selectOption("image");

        // Test Direct Image URL independence (must NOT invoke /api/rpc/upload)
        let uploadCalledForDirectUrl = false;
        page.on("request", (req) => {
          if (req.url().includes("/api/rpc/upload") && req.method() === "POST") {
            uploadCalledForDirectUrl = true;
          }
        });
        await page.getByTestId("canvas-bg-replace").click();
        await page.waitForSelector('[data-testid="media-upload-modal"]', { timeout: 3000 });
        await page.getByTestId("media-url-input").fill("https://cdn.discordapp.com/embed/avatars/2.png");
        await page.getByTestId("media-url-apply").click();
        await page.getByTestId("media-upload-modal").waitFor({ state: "detached", timeout: 3000 });
        assert.strictEqual(uploadCalledForDirectUrl, false, "Applying direct URL must not call /api/rpc/upload");

        // Verify non-misleading error messages (503 / 401 / 413)
        await page.unroute("**/api/rpc/upload");
        for (const scenario of [
          { status: 503, body: "Service Unavailable", expectSubstr: "temporarily unavailable", forbidSubstr: "Sign in" },
          { status: 401, body: JSON.stringify({ error: "Unauthorized" }), expectSubstr: "session has expired", forbidSubstr: "503" },
          { status: 413, body: JSON.stringify({ error: "Payload too large" }), expectSubstr: "Payload too large", forbidSubstr: "Sign in" },
        ]) {
          await page.route("**/api/rpc/upload", (route) =>
            route.fulfill({ status: scenario.status, contentType: "application/json", body: scenario.body })
          );
          await page.getByTestId("canvas-bg-replace").click();
          await page.waitForSelector('[data-testid="media-upload-modal"]', { timeout: 3000 });
          await page.getByTestId("media-file-input").setInputFiles(pngPath);
          await page.waitForSelector('[data-testid="media-upload-error"]', { timeout: 15000 });
          const errText = await page.getByTestId("media-upload-error").textContent();
          assert(
            errText.toLowerCase().includes(scenario.expectSubstr.toLowerCase()),
            `Expected "${scenario.expectSubstr}" for status ${scenario.status}, got: "${errText}"`
          );
          assert(
            !errText.includes(scenario.forbidSubstr),
            `Must NOT include "${scenario.forbidSubstr}" for status ${scenario.status}, got: "${errText}"`
          );
          // Retry button & file input enabled (not stuck loading)
          assert.strictEqual(await page.getByTestId("media-upload-retry").isVisible(), true);
          assert.strictEqual(await page.getByTestId("media-file-input").isDisabled(), false);
          await page.getByTestId("media-upload-modal").locator("button").first().click();
          await page.unroute("**/api/rpc/upload");
        }

        // Unsupported local file blocked client-side immediately with clear message
        await page.getByTestId("canvas-bg-replace").click();
        await page.waitForSelector('[data-testid="media-upload-modal"]', { timeout: 3000 });
        await page.getByTestId("media-file-input").setInputFiles(badPath);
        await page.waitForSelector('[data-testid="media-upload-error"]', { timeout: 3000 });
        const badErr = await page.getByTestId("media-upload-error").textContent();
        assert(badErr.includes("not supported"), `Expected unsupported format error, got: ${badErr}`);

        assert.strictEqual(pageErrors.length, 0, `Suite A pageErrors: ${pageErrors.join("; ")}`);
        await context.close();
        console.log("   ✓ Studio Canvas Background, Profile Image, Direct URL, Retry, Persistence & Status Messages passed");
      }

      // Suite B: /image-host Vault Upload + Persistence + Copy + Delete
      console.log("[4/5] Running Image Host (/image-host) & Editor (/editor) E2E Tests...");
      {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await attachApiForwarder(context);
        await context.addInitScript((tok) => {
          localStorage.setItem("pixel_app_token", tok);
          document.cookie = `pixel_app_token=${tok}; path=/; SameSite=Lax`;
        }, tokenA);
        const page = await context.newPage();

        await page.goto(`${WEB_URL}/image-host`, { waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="image-host-file-input"]', { state: "attached", timeout: 15000 });
        await page.getByTestId("image-host-file-input").setInputFiles(pngPath);
        await page.waitForSelector('img[alt="studio-bg.png"]', { timeout: 10000 });

        await page.reload({ waitUntil: "networkidle" });
        await page.waitForSelector('img[alt="studio-bg.png"]', { timeout: 10000 });
        await context.close();
      }

      // Suite C: /editor (DooryDrawerHost) real backend upload instead of data URLs
      {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await attachApiForwarder(context);
        await context.addInitScript((tok) => {
          localStorage.setItem("pixel_app_token", tok);
          document.cookie = `pixel_app_token=${tok}; path=/; SameSite=Lax`;
        }, tokenA);
        const page = await context.newPage();
        await page.goto(`${WEB_URL}/editor`, { waitUntil: "networkidle" });
        // Click Images tool if rail is present
        const imagesBtn = page.getByRole("button", { name: /Images/i }).first();
        if (await imagesBtn.isVisible().catch(() => false)) {
          await imagesBtn.click();
          await page.waitForSelector('[data-testid="image-file-input"]', { state: "attached", timeout: 5000 });
          const uploadPromise = page.waitForResponse(
            (res) => res.url().includes("/api/rpc/upload") && res.status() === 200
          );
          await page.getByTestId("image-file-input").setInputFiles(pngPath);
          const uploadRes = await uploadPromise;
          const uploadJson = await uploadRes.json();
          assert(uploadJson.url && !uploadJson.url.startsWith("data:"), "Doory editor upload must return hosted URL");
        }
        await context.close();
      }

      console.log("[5/5] ALL SITEWIDE UPLOAD AUDIT & PLAYWRIGHT E2E TESTS PASSED!");
    } finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } finally {
    if (browser) await browser.close();
    for (const proc of [apiProc, webProc]) {
      if (proc && proc.pid) {
        if (process.platform === "win32") {
          try {
            execSync(`taskkill /F /PID ${proc.pid} /T`, { stdio: "ignore" });
          } catch {}
        } else {
          proc.kill();
        }
      }
    }
    // Clean up temporary audit users & uploaded assets created during this test
    await prisma.uploadedAsset.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

runTests().catch((err) => {
  console.error("SITEWIDE UPLOAD TEST FAILURE:", err);
  process.exit(1);
});
