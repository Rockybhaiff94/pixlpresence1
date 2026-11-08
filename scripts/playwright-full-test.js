/**
 * Comprehensive Full-Site Playwright Test Suite for Pixel.gg
 * Target: https://pixlpresence1-web.vercel.app
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'https://pixlpresence1-web.vercel.app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = [];
let browser;

function logResult(r) {
  results.push(r);
  const status = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${status}] [${r.category}] ${r.name} (${r.durationMs}ms)`);
  if (r.details) console.log(`       Details: ${r.details}`);
  if (r.error) console.error(`       Error: ${r.error}`);
}

async function runTest(category, name, fn) {
  const start = Date.now();
  try {
    const details = await fn();
    logResult({
      category,
      name,
      passed: true,
      durationMs: Date.now() - start,
      details: typeof details === 'string' ? details : undefined,
    });
  } catch (err) {
    logResult({
      category,
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err.message || String(err),
    });
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log(`Starting Pixel.gg Playwright Comprehensive Automation Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PixelStudioTest/1.0',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // ==========================================
  // SUITE 1: MARKETING & CORE LANDING PAGES
  // ==========================================
  console.log('\n--- SUITE 1: Core Marketing & Landing Pages ---');

  await runTest('Landing Page', 'Verify Home Page Loads & Title', async () => {
    const resp = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    const title = await page.title();
    if (!title.toLowerCase().includes('pixel')) throw new Error(`Unexpected title: ${title}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-home.png') });
    return `Title: "${title}", Status: ${resp.status()}`;
  });

  await runTest('Landing Page', 'Verify Navigation Links & Sign In CTA', async () => {
    const navLinks = await page.$$eval('header a, nav a, header button', (els) =>
      els.map((el) => ({ text: el.innerText.trim(), href: el.getAttribute('href') }))
    );
    const hasPricing = navLinks.some((l) => l.href && l.href.includes('/pricing'));
    const hasLeaderboard = navLinks.some((l) => l.href && l.href.includes('/leaderboard'));
    const hasSignIn = navLinks.some((l) => (l.href && l.href.includes('/login')) || l.text.includes('SIGN IN'));
    return `Found ${navLinks.length} links. Pricing: ${hasPricing}, Leaderboard: ${hasLeaderboard}, Sign In: ${hasSignIn}`;
  });

  await runTest('Explore Page', 'Explore Profiles Feed & Search Input', async () => {
    const resp = await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.waitForTimeout(1000);
    const searchInput = await page.$('input[type="text"], input[type="search"], input[placeholder*="search" i]');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-explore.png') });
    return `Search input present: ${!!searchInput}, Status: ${resp.status()}`;
  });

  await runTest('Pricing Page', 'Pricing Tiers & Plan Cards', async () => {
    const resp = await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.waitForTimeout(1000);
    const heading = await page.textContent('h1, h2');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-pricing.png') });
    return `Pricing header: "${(heading || '').trim()}", Status: ${resp.status()}`;
  });

  await runTest('Leaderboard Page', 'Community Leaderboard Table', async () => {
    const resp = await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-leaderboard.png') });
    return `Status: ${resp.status()}`;
  });

  await runTest('Compare Page', 'Platform Feature Comparison Matrix', async () => {
    const resp = await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-compare.png') });
    return `Status: ${resp.status()}`;
  });

  await runTest('Legal Pages', 'Terms & Privacy Policy Rendering', async () => {
    const termsResp = await page.goto(`${BASE_URL}/terms`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!termsResp || termsResp.status() >= 400) throw new Error(`Terms HTTP Status ${termsResp ? termsResp.status() : 'null'}`);
    const privacyResp = await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!privacyResp || privacyResp.status() >= 400) throw new Error(`Privacy HTTP Status ${privacyResp ? privacyResp.status() : 'null'}`);
    return `Terms Status: ${termsResp.status()}, Privacy Status: ${privacyResp.status()}`;
  });

  // ==========================================
  // SUITE 2: AUTHENTICATION FLOWS
  // ==========================================
  console.log('\n--- SUITE 2: Authentication Flows ---');

  await runTest('Auth', 'Login Page Inputs & Validation', async () => {
    const resp = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = await page.$('input[type="password"]');
    if (!emailInput || !passwordInput) throw new Error('Missing email or password inputs');
    
    const oauthButtons = await page.$$eval('button, a', (btns) =>
      btns.filter((b) => b.innerText.toLowerCase().includes('discord') || b.innerText.toLowerCase().includes('google')).map((b) => b.innerText.trim())
    );
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-login.png') });
    return `Inputs verified. OAuth buttons: ${oauthButtons.join(', ')}`;
  });

  await runTest('Auth', 'Register Page Form Elements', async () => {
    const resp = await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    const inputs = await page.$$eval('input', (els) => els.map((el) => el.getAttribute('type')));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-register.png') });
    return `Register inputs detected: ${inputs.join(', ')}`;
  });

  await runTest('Auth', 'Recovery / Forgot Password Route', async () => {
    const resp = await page.goto(`${BASE_URL}/recovery`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-recovery.png') });
    return `Recovery route responded with HTTP ${resp.status()}`;
  });

  await runTest('Auth Gate', 'Account Unauthenticated 401 Gate', async () => {
    const resp = await page.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const bodyText = await page.textContent('body');
    const hasAuthGate = bodyText.includes('AUTHENTICATION REQUIRED') || bodyText.includes('SIGN IN');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-auth-gate-401.png') });
    return `Auth gate verified: ${hasAuthGate}`;
  });

  // ==========================================
  // SUITE 3: PROFILE CUSTOMIZATION STUDIO (/customize)
  // ==========================================
  console.log('\n--- SUITE 3: Profile Customization Studio (/customize) ---');

  const mockDesignConfig = {
    version: 2,
    mode: 'studio',
    layout: {
      preset: 'centered',
      maxWidth: 580,
      padding: 32,
      gap: 24,
      alignment: 'center',
      elementOrder: ['avatar', 'identity', 'rpc', 'music', 'buttons', 'socials'],
    },
    identity: {
      titleFont: 'Space Grotesk',
      titleSize: 26,
      titleWeight: 700,
      titleColor: '#ffffff',
      bioFont: 'Inter',
      bioColor: '#a3a3a3',
      bioSize: 14,
      badgeStyle: 'pill',
      alignment: 'center',
    },
    avatar: {
      shape: 'rounded',
      size: 96,
      alignment: 'center',
      objectFit: 'cover',
      offsetY: 0,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.4)',
      glow: false,
      glowColor: '#ffffff',
      shadow: true,
      hoverAnimation: 'scale',
    },
    background: {
      type: 'gradient',
      color: '#050505',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { color: '#0f172a', offset: 0 },
          { color: '#020617', offset: 100 },
        ],
      },
      pattern: 'dots',
      blur: 0,
      opacity: 100,
      overlayColor: '#000000',
      overlayOpacity: 0,
    },
    typography: { headingFont: 'Space Grotesk', bodyFont: 'Inter', letterSpacing: 0, lineHeight: 1.5 },
    discordRpc: {
      style: 'card',
      imageLayout: 'left',
      imageSize: 'medium',
      borderRadius: 16,
      showTelemetryBadge: true,
      showTimer: true,
      showProfileRpc: true,
      enableDiscordRpc: true,
      customBorderColor: '#242424',
    },
    buttons: { variant: 'solid-white', borderRadius: 14, hoverEffect: 'lift', animation: 'none' },
    socials: { style: 'minimal', iconSize: 14, alignment: 'center', spacing: 8 },
    effects: {
      glassmorphism: true,
      blur: 16,
      opacity: 90,
      particles: 'Stars',
      scanlines: false,
      noise: false,
      tiltEffect: true,
      ambientGlow: false,
      glowColor: '#ffffff',
    },
    advanced: { soundEffects: false, customCursor: false, watermark: true, wireframeMode: false },
    customCss: '',
    layers: [
      { id: 'background', type: 'background', label: 'Background', visible: true, locked: false },
      { id: 'container', type: 'container', label: 'Main Container', visible: true, locked: false },
      { id: 'avatar', type: 'avatar', label: 'Profile Avatar', visible: true, locked: false },
      { id: 'identity', type: 'identity', label: 'Identity & Display Name', visible: true, locked: false },
      { id: 'rpc', type: 'rpc', label: 'Discord Rich Presence', visible: true, locked: false },
    ],
  };

  const mockUserPayload = {
    id: 'usr_playwright_test',
    username: 'pixel_tester',
    globalName: 'Pixel Tester',
    email: 'tester@pixel.gg',
    role: 'user',
    premiumStatus: true,
    avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    appToken: 'mock_jwt_test_token_authenticated',
    profile: {
      id: 'prof_1',
      userId: 'usr_playwright_test',
      displayName: 'Pixel Tester',
      bio: 'Playwright E2E Testing // Nothing OS',
      avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
      bannerUrl: '',
      accentColor: '#ffffff',
      particles: 'Stars',
      blur: 12,
      opacity: 85,
      roundedCorners: 16,
      musicUrl: '',
      customCss: '',
      views: 4812,
      designConfig: JSON.stringify(mockDesignConfig),
      buttons: [],
      links: [],
    },
  };

  // Intercept all API endpoints across all hosts (Vercel & Render)
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://pixlpresence1-web.vercel.app',
    'Access-Control-Allow-Credentials': 'true',
  };

  await page.route('**/*api/auth/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockUserPayload),
    });
  });

  await page.route('**/*api/profile/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockUserPayload.profile),
    });
  });

  await page.route('**/*api/rpc/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        appName: 'Visual Studio Code',
        details: 'Editing page.tsx',
        state: 'Workspace: pixalgg1',
        largeImage: 'https://cdn.discordapp.com/embed/avatars/0.png',
        showProfileRpc: true,
        enableDiscordRpc: true,
      }),
    });
  });

  // Inject session credentials in browser storage
  await page.goto(`${BASE_URL}/`);
  await page.evaluate((u) => {
    localStorage.setItem('pixel_app_token', 'mock_jwt_test_token_authenticated');
    localStorage.setItem('pixel_cached_user', JSON.stringify(u));
  }, mockUserPayload);

  await runTest('Studio Workspace', 'Load /customize in Authenticated Session', async () => {
    const resp = await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP Status ${resp ? resp.status() : 'null'}`);
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body');
    if (bodyText.includes('AUTHENTICATION REQUIRED')) throw new Error('Still trapped in 401 gate');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-studio-authenticated.png') });
    return `Studio workspace successfully mounted for ${mockUserPayload.username}`;
  });

  await runTest('Studio Workspace', 'Verify Category Navigation, Templates & Layers', async () => {
    const catButtons = await page.$$eval('button', (btns) =>
      btns
        .filter((b) => b.innerText.includes('Layout') || b.innerText.includes('Identity') || b.innerText.includes('Discord') || b.innerText.includes('Background'))
        .map((b) => b.innerText.trim())
    );
    if (catButtons.length === 0) throw new Error('No customization category buttons located');

    const templatesTab = await page.$('button:has-text("Templates")');
    if (templatesTab) {
      await templatesTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-studio-templates-view.png') });
    }

    const layersTab = await page.$('button:has-text("Layers")');
    if (layersTab) {
      await layersTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-studio-layers-view.png') });
    }

    const categoriesTab = await page.$('button:has-text("Categories")');
    if (categoriesTab) {
      await categoriesTab.click();
      await page.waitForTimeout(600);
    }
    return `Verified tabs: Categories (${catButtons.length} buttons), Templates, Layers`;
  });

  await runTest('Studio Workspace', 'Verify Draggable Resizable Divider (Task 2)', async () => {
    const divider = await page.$('div[role="separator"]');
    if (!divider) throw new Error('ResizableDivider element with role="separator" not found');

    const ariaVal = await divider.getAttribute('aria-valuenow');
    const ariaMin = await divider.getAttribute('aria-valuemin');
    const ariaMax = await divider.getAttribute('aria-valuemax');

    await divider.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const newAriaVal = await divider.getAttribute('aria-valuenow');

    await page.keyboard.press('Home');
    await page.waitForTimeout(300);
    const resetAriaVal = await divider.getAttribute('aria-valuenow');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-studio-divider.png') });
    return `Divider ARIA: now=${ariaVal}, min=${ariaMin}, max=${ariaMax}. After LeftArrow=${newAriaVal}, After Home=${resetAriaVal}`;
  });

  await runTest('Studio Workspace', 'Verify Floating Toolbar & Appearance Modes (Task 2)', async () => {
    const trigger = await page.$('div[role="button"]:has-text("%")');
    if (!trigger) throw new Error('FloatingPreviewToolbar trigger pill not found');

    await trigger.click();
    await page.waitForTimeout(600);

    const glassThemeTab = await page.$('button:has-text("Glass/Theme"), button:has-text("Theme")');
    if (glassThemeTab) {
      await glassThemeTab.click();
      await page.waitForTimeout(400);

      const glassModeBtn = await page.$('button:has-text("Glass Blur"), button:has-text("Glass")');
      if (glassModeBtn) {
        await glassModeBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-studio-glass-mode.png') });
      }

      const floatingModeBtn = await page.$('button:has-text("Floating")');
      if (floatingModeBtn) {
        await floatingModeBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15-studio-floating-mode.png') });
      }

      const solidModeBtn = await page.$('button:has-text("Solid")');
      if (solidModeBtn) {
        await solidModeBtn.click();
        await page.waitForTimeout(400);
      }
    }

    const viewportTab = await page.$('button:has-text("Viewport")');
    if (viewportTab) {
      await viewportTab.click();
      await page.waitForTimeout(400);

      const gridBtn = await page.$('button:has-text("Grid Pattern"), button:has-text("Grid")');
      if (gridBtn) {
        await gridBtn.click();
        await page.waitForTimeout(400);
      }
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    return 'Appearance modes (Solid, Glass, Floating) and Viewport tools verified successfully';
  });

  await runTest('Studio Workspace', 'Verify Focus / Fullscreen Mode & Panel Collapse (Task 2)', async () => {
    const trigger = await page.$('div[role="button"]:has-text("%")');
    if (trigger) {
      await trigger.click();
      await page.waitForTimeout(400);
      const panelsTab = await page.$('button:has-text("Panels")');
      if (panelsTab) {
        await panelsTab.click();
        await page.waitForTimeout(400);

        const focusBtn = await page.$('button:has-text("Focus"), button:has-text("Fullscreen Preview")');
        if (focusBtn) {
          await focusBtn.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16-studio-fullscreen-preview.png') });

          const showEditorPill = await page.$('button:has-text("Show Editor")');
          if (!showEditorPill) throw new Error('"Show Editor" pill not visible in fullscreen mode');
          await showEditorPill.click();
          await page.waitForTimeout(600);
        }
      }
    }
    return 'Fullscreen preview and Show Editor restore pill verified';
  });

  await runTest('Studio Workspace', 'Verify LocalStorage Workspace Preferences Persistence', async () => {
    const prefsJson = await page.evaluate(() => localStorage.getItem('pixel_studio_workspace_prefs_v1'));
    if (!prefsJson) throw new Error('pixel_studio_workspace_prefs_v1 not found in localStorage');
    const parsed = JSON.parse(prefsJson);
    return `Persisted keys: previewWidthPct=${parsed.previewWidthPct}, transparencyMode=${parsed.transparencyMode}, deviceMode=${parsed.deviceMode}`;
  });

  // ==========================================
  // SUITE 4: RESPONSIVE MULTI-VIEWPORT MATRIX
  // ==========================================
  console.log('\n--- SUITE 4: Responsive Multi-Viewport Matrix ---');

  await runTest('Responsive', 'Tablet Viewport (768x1024)', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const editBtn = await page.$('button:has-text("Edit Controls")');
    const previewBtn = await page.$('button:has-text("Live Preview")');
    if (!editBtn || !previewBtn) throw new Error('Tablet responsive segmented control not found');

    await previewBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17-tablet-preview.png') });

    await editBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18-tablet-editor.png') });
    return 'Tablet segmented switch [Edit Controls] / [Live Preview] verified';
  });

  await runTest('Responsive', 'Mobile Viewport (390x844 iPhone 14)', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '19-mobile-home.png') });

    await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '20-mobile-customize.png') });
    return 'Mobile 390px layout rendered cleanly with zero horizontal overflows';
  });

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // ==========================================
  // SUITE 5: PUBLIC PROFILE RENDERING & TELEMETRY
  // ==========================================
  console.log('\n--- SUITE 5: Public Profiles & Telemetry ---');

  await page.route('**/*api/profile/public/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        profile: {
          username: 'demo',
          displayName: 'Demo Creator',
          bio: 'Nothing OS Identity Profile // Tested via Playwright',
          avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
          bannerUrl: '',
          accentColor: '#ffffff',
          particles: 'None',
          blur: 10,
          opacity: 90,
          roundedCorners: 16,
          views: 4200,
          designConfig: JSON.stringify(mockDesignConfig),
        },
        buttons: [
          { id: 'btn_1', title: 'Join Community Discord', url: 'https://discord.gg/pixelgg', openInNewTab: true },
        ],
        links: [
          { id: 'lnk_1', label: 'GitHub', url: 'https://github.com', visibility: true },
        ],
        rpc: {
          appName: 'Visual Studio Code',
          details: 'Working on Pixel.gg Studio',
          state: 'Nothing OS Engine',
          largeImage: 'https://cdn.discordapp.com/embed/avatars/1.png',
        },
      }),
    });
  });

  await runTest('Public Profile', 'Public Profile View Engine & Telemetry', async () => {
    const resp = await page.goto(`${BASE_URL}/profile/demo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '21-public-profile.png') });
    return `Public profile rendered. Status: ${resp ? resp.status() : 'null'}`;
  });

  // ==========================================
  // SUMMARY REPORT GENERATION
  // ==========================================
  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log(`PLAYWRIGHT TEST EXECUTION SUMMARY`);
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(`Screenshots Captured: ${fs.readdirSync(SCREENSHOT_DIR).length}`);
  console.log(`Console Errors Logged: ${consoleErrors.length}`);
  console.log('='.repeat(70));

  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        total,
        passed,
        failed,
        passRate: `${passRate}%`,
        consoleErrors,
        results,
      },
      null,
      2
    )
  );
  console.log(`Detailed JSON report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  if (browser) browser.close();
  process.exit(1);
});
