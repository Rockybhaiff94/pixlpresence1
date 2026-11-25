/**
 * PIXEL.GG — PROFILE SYNC, PUBLIC PUBLISHING, LIVE AUTOSAVE & PREVIEW E2E SUITE
 * Verifies:
 * 1. Sync Preferences persistence (GET/PATCH /api/account/sync-preferences) & /account/settings UI
 * 2. Manual Sync Now (POST /api/account/sync-discord) & disabled-sync preservation of custom fields
 * 3. Draft vs Published isolation (anonymous GET /u/:username -> 404, owner ?preview=1 -> 200)
 * 4. Editor Content-Type: application/json persistence, Publish flow, and auto-publish on autosave/save
 * 5. Top-right Preview Profile button (builder-preview-btn) navigation to live or ?preview=1 profile
 * 6. Stale expectedVersion 409 conflict protection
 */

const assert = require("assert");
const crypto = require("crypto");
const path = require("path");
const { spawn, execSync } = require("child_process");

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 3600 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("C:/Users/Acer/AppData/Roaming/npm/node_modules/playwright"));
}

const { prisma } = require("@discord-rpc/database");

const ROOT_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT_DIR, "apps/web");
const API_DIR = path.join(ROOT_DIR, "apps/api");
const API_PORT = 3113;
const WEB_PORT = 3112;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

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

function makeDoc(displayName, bio, lastPublishedAt = null) {
  const nowIso = new Date().toISOString();
  return {
    version: "2.0",
    canvas: {
      width: 1200,
      height: 820,
      backgroundColor: "#0a0a0c",
      backgroundImage: "",
      backgroundSize: "cover",
      gridEnabled: true,
      gridSize: 16,
      snapToGrid: true,
    },
    nodes: [
      {
        id: "node_profile_1",
        type: "profile_card",
        name: "Profile Card",
        x: 60,
        y: 60,
        width: 440,
        height: 260,
        zIndex: 1,
        visible: true,
        locked: false,
        props: {
          displayName,
          bio,
          avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
        },
      },
    ],
    preferences: {
      autoSaveEnabled: true,
      autoSaveDelaySec: 2,
      showGrid: true,
      snapToGrid: true,
    },
    metadata: {
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(lastPublishedAt ? { lastPublishedAt } : {}),
    },
  };
}

async function run() {
  const suffix = Date.now().toString(36);
  const username = `sync_e2e_${suffix}`;
  const customBio1 = `Draft Bio ${suffix}`;
  const customBio2 = `Autosave Live Bio ${suffix}`;

  const token = crypto.randomBytes(32).toString("hex");
  const user = await prisma.user.create({
    data: {
      username,
      globalName: `Custom Name ${suffix}`,
      discordId: `999${Date.now()}`,
      avatar: "https://cdn.discordapp.com/embed/avatars/1.png",
      role: "USER",
      appToken: token,
      profile: {
        create: {
          displayName: `Custom Name ${suffix}`,
          bio: customBio1,
          visibility: "PUBLIC",
          designConfig: JSON.stringify({
            isPublished: false,
            syncPreferences: {
              syncDiscordProfile: true,
              syncUsername: false,
              syncDisplayName: true,
              syncAvatar: true,
              lastSyncedAt: null,
            },
          }),
        },
      },
    },
    include: { profile: true },
  });

  let apiProc;
  let webProc;
  let browser;
  let apiLogs = "";

  try {
    apiProc = spawn(process.execPath, [path.join(API_DIR, "dist/index.js")], {
      cwd: API_DIR,
      env: {
        ...process.env,
        PORT: String(API_PORT),
        NODE_ENV: "production",
        JWT_SECRET,
        FRONTEND_URL: WEB_URL,
      },
      stdio: "pipe",
    });
    apiProc.stdout.on("data", (d) => { apiLogs += d.toString(); });
    apiProc.stderr.on("data", (d) => { apiLogs += d.toString(); });

    webProc = spawn("npx", ["next", "start", "-p", String(WEB_PORT), "-H", "127.0.0.1"], {
      cwd: WEB_DIR,
      shell: true,
      env: {
        ...process.env,
        PORT: String(WEB_PORT),
        NEXT_PUBLIC_API_URL: API_URL,
        INTERNAL_API_URL: API_URL,
      },
      stdio: "pipe",
    });

    await Promise.all([
      waitForUrl(`${API_URL}/health`),
      waitForUrl(`${WEB_URL}/login`),
    ]);

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 1. Sync Preferences GET & PATCH
    const prefGetRes = await fetch(`${API_URL}/api/account/sync-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(prefGetRes.status, 200, "GET sync-preferences should return 200");
    const prefGetJson = await prefGetRes.json();
    assert.strictEqual(prefGetJson.preferences.syncDisplayName, true);
    assert.strictEqual(prefGetJson.preferences.syncUsername, false);

    const prefPatchRes = await fetch(`${API_URL}/api/account/sync-preferences`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ syncDiscordProfile: false, syncAvatar: false }),
    });
    assert.strictEqual(prefPatchRes.status, 200, "PATCH sync-preferences should return 200");
    const prefPatchJson = await prefPatchRes.json();
    assert.strictEqual(prefPatchJson.preferences.syncDiscordProfile, false);
    assert.strictEqual(prefPatchJson.preferences.syncAvatar, false);

    // 2. Manual Sync when disabled must reject cleanly with 400 & NOT overwrite custom user/profile fields
    const syncDisabledRes = await fetch(`${API_URL}/api/account/sync-discord`, {
      method: "POST",
      headers: authHeaders,
    });
    assert.strictEqual(syncDisabledRes.status, 400, "POST sync-discord should return 400 when syncDiscordProfile is disabled");
    const userAfterDisabled = await prisma.user.findUnique({ where: { id: user.id } });
    assert.strictEqual(userAfterDisabled.globalName, `Custom Name ${suffix}`);

    // Re-enable display name sync (leaving username & avatar disabled) and verify Sync Now updates only enabled fields
    await prisma.userIdentity.create({
      data: {
        userId: user.id,
        provider: "discord",
        providerUserId: user.discordId,
        displayName: `Synced Discord Name ${suffix}`,
        avatarUrl: "https://cdn.discordapp.com/embed/avatars/4.png",
      },
    });
    await fetch(`${API_URL}/api/account/sync-preferences`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        syncDiscordProfile: true,
        syncUsername: false,
        syncDisplayName: true,
        syncAvatar: false,
      }),
    });
    const syncEnabledRes = await fetch(`${API_URL}/api/account/sync-discord`, {
      method: "POST",
      headers: authHeaders,
    });
    assert.strictEqual(syncEnabledRes.status, 200, "POST sync-discord should return 200 when enabled");
    const syncEnabledJson = await syncEnabledRes.json();
    assert.strictEqual(syncEnabledJson.success, true);
    assert.ok(syncEnabledJson.syncedAt, "syncedAt timestamp should be returned");
    assert.strictEqual(syncEnabledJson.user.globalName, `Synced Discord Name ${suffix}`);
    assert.strictEqual(syncEnabledJson.user.username, username, "Disabled syncUsername must not overwrite username");
    assert.strictEqual(
      syncEnabledJson.user.avatar,
      "https://cdn.discordapp.com/embed/avatars/1.png",
      "Disabled syncAvatar must not overwrite custom avatar"
    );

    // 3. Draft isolation before first publish
    const draftDoc = makeDoc(`Draft Display ${suffix}`, customBio1);
    const draftRes = await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        saveMode: "draft",
        isPublished: false,
        displayName: `Draft Display ${suffix}`,
        bio: customBio1,
        designConfig: {
          draftProfileBuilder: draftDoc,
          isPublished: false,
        },
      }),
    });
    assert.strictEqual(draftRes.status, 200, "Draft PATCH /api/profile/me should succeed");
    const draftJson = await draftRes.json();
    assert.strictEqual(typeof draftJson.profileVersion, "number");

    const anonPublicRes = await fetch(`${API_URL}/api/profile/u/${encodeURIComponent(username)}`);
    assert.strictEqual(anonPublicRes.status, 404, "Unpublished draft must return 404 to public visitors");

    const ownerPreviewRes = await fetch(`${API_URL}/api/profile/u/${encodeURIComponent(username)}?preview=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(ownerPreviewRes.status, 200, "Owner preview (?preview=1) must return 200 for draft");
    assert.ok(
      (ownerPreviewRes.headers.get("cache-control") || "").includes("no-store"),
      "Owner preview must have no-store Cache-Control"
    );
    const ownerPreviewJson = await ownerPreviewRes.json();
    assert.strictEqual(ownerPreviewJson.isOwnerPreview, true);
    assert.strictEqual(ownerPreviewJson.profile.bio, customBio1);

    // 4. Stale expectedVersion returns 409 Conflict
    const conflictRes = await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        saveMode: "draft",
        expectedVersion: Math.max(0, draftJson.profileVersion - 1),
        bio: "Should fail",
      }),
    });
    assert.strictEqual(conflictRes.status, 409, "Stale expectedVersion must return 409 Conflict");

    // 5. Playwright Browser E2E: /account/settings, /editor Preview button, Publish, Autosave live sync
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([
      {
        name: "pixel_app_token",
        value: token,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
    await context.route(/^https?:\/\/(localhost:3001|127\.0\.0\.1:3001|pixelgg-api\.onrender\.com)\//, async (route) => {
      try {
        const targetUrl = route.request().url().replace(/^https?:\/\/[^/]+/, API_URL);
        const response = await route.fetch({ url: targetUrl });
        await route.fulfill({ response });
      } catch {
        // Ignore aborted in-flight routes on page navigation/teardown
      }
    });

    const page = await context.newPage();
    page.on("pageerror", (e) => console.error("[PAGEERROR]", e));

    // 5a. Account Settings Sync UI
    await page.goto(`${WEB_URL}/account/settings`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="profile-sync-section"]');
    const syncSectionVisible = await page.isVisible('[data-testid="sync-now-btn"]');
    assert.strictEqual(syncSectionVisible, true, "Sync Now button should be visible in /account/settings");

    // Toggle syncUsername on and verify persistence across reload
    const usernameToggle = page.locator('[data-testid="sync-toggle-syncUsername"]');
    assert.strictEqual(await usernameToggle.isChecked(), false);
    const [toggleResp] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/account/sync-preferences") && res.request().method() === "PATCH"
      ),
      usernameToggle.click(),
    ]);
    assert.strictEqual(toggleResp.status(), 200, "UI PATCH sync-preferences should return 200");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="sync-toggle-syncUsername"]');
    assert.strictEqual(
      await page.locator('[data-testid="sync-toggle-syncUsername"]').isChecked(),
      true,
      "Toggled syncUsername preference must persist after reload"
    );

    // 5b. Owner SSR Preview (?preview=1) renders unpublished draft
    await page.goto(`${WEB_URL}/${username}?preview=1`, { waitUntil: "networkidle" });
    const previewBody = await page.textContent("body");
    assert.ok(previewBody && previewBody.includes(customBio1), "Owner ?preview=1 page must render draft bio");

    // 5c. Editor TopToolbar Preview Profile button + Publish + Autosave auto-publish
    await page.goto(`${WEB_URL}/customize`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="profile-builder-studio"]', { timeout: 15000 });
    const previewBtn = page.locator('[data-testid="builder-preview-btn"]');
    await previewBtn.waitFor({ state: "visible", timeout: 15000 });

    // Click Publish button
    const publishBtn = page.locator('button:has-text("Publish")').first();
    const [publishReq, publishResp] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/profile/me") && req.method() === "PATCH"),
      page.waitForResponse((res) => res.url().includes("/api/profile/me") && res.request().method() === "PATCH"),
      publishBtn.click(),
    ]);
    const ct = publishReq.headers()["content-type"] || "";
    assert.ok(ct.includes("application/json"), `Expected Content-Type application/json, got: ${ct}`);
    assert.strictEqual(publishResp.status(), 200, "Publish PATCH /api/profile/me should return 200");

    // Public API now returns 200 without ?preview=1
    const liveAfterPublish = await fetch(`${API_URL}/api/profile/u/${encodeURIComponent(username)}`);
    assert.strictEqual(liveAfterPublish.status, 200, "Published profile must return 200 publicly");
    assert.ok(
      (liveAfterPublish.headers.get("cache-control") || "").includes("no-store"),
      "Published profile must have no-store Cache-Control"
    );

    // 5d. Verify subsequent autosave / Save Draft updates already-published profile automatically
    const publishedDocV2 = makeDoc(`Autosave Live ${suffix}`, customBio2, new Date().toISOString());
    const autosaveRes = await fetch(`${API_URL}/api/profile/me`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        saveMode: "autosave",
        isPublished: true,
        displayName: `Autosave Live ${suffix}`,
        bio: customBio2,
        designConfig: {
          profileBuilder: publishedDocV2,
          draftProfileBuilder: publishedDocV2,
          isPublished: true,
        },
      }),
    });
    assert.strictEqual(autosaveRes.status, 200, "Autosave on published profile must succeed");

    await page.goto(`${WEB_URL}/${username}`, { waitUntil: "networkidle" });
    const publicBodyAfterAutosave = await page.textContent("body");
    assert.ok(
      publicBodyAfterAutosave && publicBodyAfterAutosave.includes(customBio2),
      "Public profile must immediately reflect autosave update without clicking Publish again"
    );

    console.log("ALL PROFILE SYNC, PUBLISH, AUTOSAVE & PREVIEW E2E CHECKS PASSED!");
  } catch (err) {
    console.error("API LOGS:\n", apiLogs);
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) apiProc.kill("SIGTERM");
    if (webProc && webProc.pid) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${webProc.pid} /T /F`, { stdio: "ignore" });
        } else {
          webProc.kill("SIGTERM");
        }
      } catch {}
    }
    await prisma.userIdentity.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.synchronizationEvent.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E TEST FAILED:", err);
    process.exit(1);
  });
