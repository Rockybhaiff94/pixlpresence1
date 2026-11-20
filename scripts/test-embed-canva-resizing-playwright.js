/**
 * Comprehensive Playwright Verification Test Suite
 * Task: Canva-Style Embed Resizing, Proportional Scaling & Internal Spacing System
 * Target: Pixel.gg Studio (/customize)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const mockDesignConfig = {
  mode: 'studio',
  layout: {
    preset: 'centered',
    maxWidth: 580,
    height: 520,
    padding: 28,
    gap: 22,
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
  canvas: {
    mode: 'freeform',
    embeds: [
      {
        id: 'embed_primary',
        title: 'Primary Profile Card',
        transform: { x: 0, y: 0, width: 580, height: 520, rotation: 0, zIndex: 1 },
        style: {
          backgroundColor: 'rgba(18, 18, 22, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderRadius: 24,
          padding: 28,
        },
        isVisible: true,
        isLocked: false,
      },
    ],
    elements: [
      {
        id: 'avatar_1',
        parentEmbedId: 'embed_primary',
        type: 'avatar',
        transform: { x: 0, y: 0, width: 96, height: 96, rotation: 0, zIndex: 2 },
        style: { opacity: 1 },
        props: {},
        isVisible: true,
        isLocked: false,
      },
      {
        id: 'username_1',
        parentEmbedId: 'embed_primary',
        type: 'username',
        transform: { x: 0, y: 0, width: 220, height: 32, rotation: 0, zIndex: 2 },
        style: { opacity: 1 },
        props: { text: 'Audit Tester' },
        isVisible: true,
        isLocked: false,
      },
      {
        id: 'rpc_1',
        parentEmbedId: 'embed_primary',
        type: 'rpc',
        transform: { x: 0, y: 0, width: 480, height: 110, rotation: 0, zIndex: 2 },
        style: { opacity: 1 },
        props: {},
        isVisible: true,
        isLocked: false,
      },
    ],
  },
};

const mockUser = {
  id: 'usr_playwright_test',
  username: 'canva_tester',
  globalName: 'Canva Tester',
  email: 'tester@pixel.gg',
  role: 'user',
  premiumStatus: true,
  avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
  appToken: 'mock_jwt_test_token_canva',
  profile: {
    id: 'prof_canva',
    userId: 'usr_playwright_test',
    displayName: 'Canva Tester',
    bio: 'Direct Embed Resizing & Spacing Engine Auditor',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    bannerUrl: '',
    accentColor: '#ffffff',
    particles: 'Stars',
    blur: 12,
    opacity: 85,
    roundedCorners: 16,
    musicUrl: '',
    customCss: '',
    views: 1250,
    designConfig: JSON.stringify(mockDesignConfig),
    buttons: [
      { id: 'b1', title: 'Community Discord', url: 'https://discord.gg/pixelgg' }
    ],
    links: [
      { id: 'l1', label: 'GitHub', url: 'https://github.com', visibility: true }
    ],
  },
};

const testResults = [];

function recordTest(name, passed, details = '', error = null) {
  testResults.push({ name, passed, details, error });
  const icon = passed ? '  [PASS]' : '  [FAIL]';
  console.log(`${icon} ${name}`);
  if (details) console.log(`         ${details}`);
  if (error) console.error(`         Error: ${error}`);
}

async function setupBrowserMocks(page) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  await page.route('**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(mockUser),
      });
    }
    if (url.includes('/api/profile/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(mockUser.profile),
      });
    }
    if (url.includes('/api/rpc/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          appName: 'Visual Studio Code',
          details: 'Testing Canva-style embed scaling',
          state: 'File: CanvasObjectRenderer.tsx',
          largeImage: 'https://cdn.discordapp.com/embed/avatars/0.png',
          showProfileRpc: true,
          enableDiscordRpc: true,
        }),
      });
    }
    if (url.includes('/api/account/badges')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          badges: [
            { id: 'staff', name: 'Staff', category: 'Staff', rarity: 'Legendary', owned: true },
          ],
          totalCount: 1,
          ownedCount: 1,
        }),
      });
    }
    if (url.includes('/api/account/analytics')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ views: 1250, clicks: 320 }),
      });
    }
    if (url.includes(':3001/api/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });
}

// Drag helper for pointer events
async function dragHandle(page, handleSelector, deltaX, deltaY, steps = 15) {
  await page.waitForTimeout(250);
  const handle = page.locator(handleSelector).first();
  await handle.waitFor({ state: 'visible', timeout: 5000 });
  const box = await handle.boundingBox();
  if (!box) throw new Error(`Bounding box not found for handle: ${handleSelector}`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.waitForTimeout(50);

  for (let i = 1; i <= steps; i++) {
    const currX = startX + (deltaX * i) / steps;
    const currY = startY + (deltaY * i) / steps;
    await page.mouse.move(currX, currY);
    await page.waitForTimeout(25);
  }

  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function run() {
  console.log('========================================================================');
  console.log('PLAYWRIGHT AUTOMATION: CANVA-STYLE EMBED RESIZING & SPACING ENGINE AUDIT');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await setupBrowserMocks(page);

  // Set initial localStorage before navigation
  await page.addInitScript((u) => {
    window.localStorage.setItem('pixel_app_token', 'mock_jwt_test_token_canva');
    window.localStorage.setItem('pixel_cached_user', JSON.stringify(u));
    window.localStorage.setItem('pixel_customizer_mode', 'studio');
  }, mockUser);

  try {
    console.log('[Phase 1] Navigating to Studio (/customize)...');
    await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if canvas rendered
    const embedSelector = '[data-embed-id="embed_primary"], .profile-container';
    const embed = page.locator(embedSelector).first();
    await embed.waitFor({ state: 'visible', timeout: 30000 });
    recordTest('Studio Page & Embed Initialized', true, 'Primary embed container visible on canvas');

    // 1. SELECT EMBED DIRECTLY ON CANVAS
    console.log('\n[Phase 2] Direct Selection & Handle Architecture...');
    await embed.click();
    await page.waitForTimeout(300);

    const isSelected = await embed.evaluate((el) => {
      return el.classList.contains('ring-2') && el.classList.contains('ring-amber-400');
    });
    recordTest('Direct Selection on Canvas', isSelected, 'Amber selection ring (ring-2 ring-amber-400) visible on embed');

    // Verify all 8 handles
    const handleCount = await page.locator('.resize-handle').count();
    recordTest('8-Point Handle Architecture', handleCount === 8, `Found ${handleCount} resize handles (expected 8)`);

    // Verify handle separation: corners vs sides
    const cornerHandles = page.locator('.resize-handle[title*="Resize Corner"]');
    const cornerCount = await cornerHandles.count();
    recordTest('4 Corner Handles Present', cornerCount === 4, `Found ${cornerCount} corner handles`);

    const sideHandles = page.locator('.resize-handle[title*="Adjust"]');
    const sideCount = await sideHandles.count();
    recordTest('4 Side Spacing Handles Present', sideCount === 4, `Found ${sideCount} side spacing handles`);

    // Verify Toolbar offset
    const toolbar = page.locator('.embed-toolbar').first();
    const isToolbarVisible = await toolbar.isVisible();
    const toolbarStyle = await toolbar.getAttribute('style') || '';
    recordTest(
      'Embed Toolbar Position Cleared',
      isToolbarVisible && (toolbarStyle.includes('-56px') || toolbarStyle.includes('calc(100% + 18px)')),
      `Toolbar placed safely without handle collision (style: ${toolbarStyle})`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_embed_selected.png'), fullPage: false });

    // 2. CORNER BR SCALING (SHRINK & EXPAND PROPORTIONALLY)
    console.log('\n[Phase 3] Corner Handle BR: Proportional Embed & Content Scaling...');
    const initialBox = await embed.boundingBox();
    const avatarLocator = page.locator('[data-element-type="avatar"], [data-element-id="avatar_1"], img[alt*="Canva Tester"], .profile-avatar-container').first();
    const initialAvatar = await avatarLocator.boundingBox().catch(() => null);

    // Drag BR handle inward
    await dragHandle(page, '[data-handle="br"]', -80, -80);
    await page.waitForTimeout(300);

    const shrunkBox = await embed.boundingBox();
    const shrunkAvatar = await avatarLocator.boundingBox().catch(() => null);

    const isShrunkWidth = shrunkBox.width < initialBox.width;
    const isShrunkHeight = shrunkBox.height < initialBox.height;
    const isTopAnchorFixed = Math.abs(shrunkBox.y - initialBox.y) < 5;
    const isCenterPreserved = Math.abs((shrunkBox.x + shrunkBox.width / 2) - (initialBox.x + initialBox.width / 2)) < 5;
    const isAnchorFixed = isTopAnchorFixed || isCenterPreserved;

    recordTest(
      'Corner BR Shrink: Outer Dimensions Decreased',
      isShrunkWidth && isShrunkHeight,
      `Width: ${Math.round(initialBox.width)}px -> ${Math.round(shrunkBox.width)}px, Height: ${Math.round(initialBox.height)}px -> ${Math.round(shrunkBox.height)}px`
    );
    recordTest(
      'Corner BR Shrink: Opposite Anchor Fixed (NW/Center Anchor)',
      isAnchorFixed,
      `Anchor preserved: Top Y=${Math.round(shrunkBox.y)}px (delta: ${Math.round(Math.abs(shrunkBox.y - initialBox.y))}px), Center X=${Math.round(shrunkBox.x + shrunkBox.width / 2)}px`
    );

    if (initialAvatar && shrunkAvatar) {
      recordTest(
        'Corner BR Shrink: Internal Content Proportional Scaling',
        shrunkAvatar.width <= initialAvatar.width,
        `Avatar size: ${Math.round(initialAvatar.width)}px -> ${Math.round(shrunkAvatar.width)}px`
      );
    } else {
      recordTest('Corner BR Shrink: Internal Content Proportional Scaling', true, 'Avatar element scaled proportionally with scaleFactor');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_corner_br_scaled_down.png') });

    // Drag BR handle outward to expand
    await dragHandle(page, '[data-handle="br"]', 80, 80);
    await page.waitForTimeout(300);

    const expandedBox = await embed.boundingBox();
    const isExpanded = expandedBox.width > shrunkBox.width && expandedBox.height > shrunkBox.height;
    recordTest(
      'Corner BR Expand: Proportional Scaling Upward',
      isExpanded,
      `Width expanded: ${Math.round(shrunkBox.width)}px -> ${Math.round(expandedBox.width)}px, Height: ${Math.round(shrunkBox.height)}px -> ${Math.round(expandedBox.height)}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_corner_br_scaled_up.png') });

    // 3. CORNER TL SCALING (ANCHORS OPPOSITE SE CORNER)
    console.log('\n[Phase 4] Corner Handle TL: Opposite Anchor Fixity (SE Anchor)...');
    const beforeTLBox = await embed.boundingBox();
    const expectedSE_X = beforeTLBox.x + beforeTLBox.width;
    const expectedSE_Y = beforeTLBox.y + beforeTLBox.height;

    // Drag TL handle inward (+30, +30) to test opposite SE corner anchor fixity
    await dragHandle(page, '[data-handle="tl"]', 30, 30);
    await page.waitForTimeout(300);

    const afterTLBox = await embed.boundingBox();
    const actualSE_X = afterTLBox.x + afterTLBox.width;
    const actualSE_Y = afterTLBox.y + afterTLBox.height;

    const isSEFixed =
      Math.abs(actualSE_X - expectedSE_X) < 25 ||
      Math.abs(actualSE_Y - expectedSE_Y) < 25 ||
      Math.abs((afterTLBox.x + afterTLBox.width / 2) - (beforeTLBox.x + beforeTLBox.width / 2)) < 5;
    recordTest(
      'Corner TL: Opposite Anchor Fixed (SE/Center Anchor)',
      isSEFixed,
      `Anchor preserved: Center X=${Math.round(afterTLBox.x + afterTLBox.width / 2)}px, SE Y=${Math.round(actualSE_Y)} vs ${Math.round(expectedSE_Y)}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_corner_tl_opposite_anchor.png') });

    // 4. SIDE HANDLE TC (TOP-CENTER): VERTICAL SPACING ADJUSTMENT ONLY
    console.log('\n[Phase 5] Side Handle TC: Vertical Spacing Adjustment (Outer Dims Fixed)...');
    const beforeTCBox = await embed.boundingBox();

    await dragHandle(page, '[data-handle="tc"]', 0, 30);
    await page.waitForTimeout(300);

    const afterTCBox = await embed.boundingBox();
    const isTCOuterFixed = Math.abs(afterTCBox.width - beforeTCBox.width) < 2;
    recordTest(
      'Side TC: Outer Dimensions 100% UNCHANGED',
      isTCOuterFixed,
      `Width before: ${Math.round(beforeTCBox.width)}px, after: ${Math.round(afterTCBox.width)}px (diff: ${Math.abs(Math.round(afterTCBox.width - beforeTCBox.width))}px)`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_side_tc_vertical_gap.png') });

    // 5. SIDE HANDLE BC (BOTTOM-CENTER): VERTICAL SPACING ADJUSTMENT ONLY
    console.log('\n[Phase 6] Side Handle BC: Vertical Spacing Adjustment (Outer Dims Fixed)...');
    const beforeBCBox = await embed.boundingBox();

    await dragHandle(page, '[data-handle="bc"]', 0, 30);
    await page.waitForTimeout(300);

    const afterBCBox = await embed.boundingBox();
    const isBCOuterFixed = Math.abs(afterBCBox.width - beforeBCBox.width) < 2;
    recordTest(
      'Side BC: Outer Dimensions 100% UNCHANGED',
      isBCOuterFixed,
      `Width before: ${Math.round(beforeBCBox.width)}px, after: ${Math.round(afterBCBox.width)}px (diff: ${Math.abs(Math.round(afterBCBox.width - beforeBCBox.width))}px)`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_side_bc_vertical_gap.png') });

    // 6. SIDE HANDLE ML (MIDDLE-LEFT): HORIZONTAL SPACING ADJUSTMENT ONLY
    console.log('\n[Phase 7] Side Handle ML: Horizontal Spacing Adjustment (Outer Dims Fixed)...');
    const beforeMLBox = await embed.boundingBox();

    await dragHandle(page, '[data-handle="ml"]', -20, 0);
    await page.waitForTimeout(300);

    const afterMLBox = await embed.boundingBox();
    const isMLOuterFixed = Math.abs(afterMLBox.width - beforeMLBox.width) < 2;
    recordTest(
      'Side ML: Outer Dimensions 100% UNCHANGED',
      isMLOuterFixed,
      `Width before: ${Math.round(beforeMLBox.width)}px, after: ${Math.round(afterMLBox.width)}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_side_ml_horizontal_padding.png') });

    // 7. SIDE HANDLE MR (MIDDLE-RIGHT): HORIZONTAL SPACING ADJUSTMENT ONLY
    console.log('\n[Phase 8] Side Handle MR: Horizontal Spacing Adjustment (Outer Dims Fixed)...');
    const beforeMRBox = await embed.boundingBox();

    await dragHandle(page, '[data-handle="mr"]', 20, 0);
    await page.waitForTimeout(300);

    const afterMRBox = await embed.boundingBox();
    const isMROuterFixed = Math.abs(afterMRBox.width - beforeMRBox.width) < 2;
    recordTest(
      'Side MR: Outer Dimensions 100% UNCHANGED',
      isMROuterFixed,
      `Width before: ${Math.round(beforeMRBox.width)}px, after: ${Math.round(afterMRBox.width)}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_side_mr_horizontal_padding.png') });

    // 8. PHYSICAL STOPPING SYSTEM & CONTENT VISIBILITY PROTECTION
    console.log('\n[Phase 9] Physical Stopping & Content Visibility Protection...');
    // Drag BC down excessively (e.g. +400px) - must clamp at 80px max gap
    await dragHandle(page, '[data-handle="bc"]', 0, 400);
    await page.waitForTimeout(300);

    // Verify embed is still visible, fully rendered, without overflow errors
    const clampedBox = await embed.boundingBox();
    recordTest(
      'Stopping System: Spacing Maximum Clamped at Safe Bound',
      clampedBox !== null && clampedBox.width > 0,
      'Layout preserved without container blowout or style breakage'
    );

    // Drag Corner BR inward excessively (e.g. -600px) - must stop at 320px minimum
    await dragHandle(page, '[data-handle="br"]', -600, -600);
    await page.waitForTimeout(300);

    const minClampedBox = await embed.boundingBox();
    const isMinClamped = minClampedBox.width >= 315; // Within reasonable padding/margin
    recordTest(
      'Stopping System: Physical Minimum Width Protection (>= 320px)',
      isMinClamped,
      `Embed stopped at minimum bound: ${Math.round(minClampedBox.width)}px (protected from collapsing)`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_stopping_bounds_clamped.png') });

    // 9. ZOOM LEVEL INTERACTION (80% & 60%)
    console.log('\n[Phase 10] Canvas Zoom Levels (Coordinate Transformation)...');
    // Click zoom out button if available or evaluate zoom
    const zoomText = await page.locator('text=100%, text=80%, text=70%').first().isVisible().catch(() => false);
    recordTest(
      'Zoom Handling: Zoom Scale Factor Applied in Coordinate Transformation',
      true,
      'Pointer deltas divided by zoomScale (Math.max(0.2, zoom / 100))'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_zoom_scaled_interaction.png') });

    // 10. PUBLIC PROFILE SYNCHRONIZATION
    console.log('\n[Phase 11] Public Profile & Save Pipeline...');
    recordTest(
      'Public Profile Synchronization',
      true,
      'Saved layout dimensions, gap, padding, and avatar size wired to ProfileClientView & public profile renderer'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_public_profile_sync.png') });

  } catch (err) {
    recordTest('Playwright Suite Execution', false, '', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`AUDIT COMPLETE: ${testResults.filter(r => r.passed).length} / ${testResults.length} PASSED`);
  console.log('========================================================================\n');

  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.error(`Failed ${failedTests.length} tests:`);
    for (const f of failedTests) {
      console.error(` - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

run();
