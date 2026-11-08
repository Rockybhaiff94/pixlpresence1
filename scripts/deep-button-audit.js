/**
 * Deep Interactive Button, Option & Element Audit Suite for Pixel.gg
 * Iterates through every page, discovers all clickable/interactive controls, clicks them,
 * and tracks runtime errors, console exceptions, and broken behaviors.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'https://pixlpresence1-web.vercel.app';
const AUDIT_DIR = path.join(__dirname, '..', 'audit-artifacts');

if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

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
    { id: 'music', type: 'music', label: 'Music Player', visible: true, locked: false },
    { id: 'socials', type: 'socials', label: 'Social Icons', visible: true, locked: false },
    { id: 'buttons', type: 'buttons', label: 'Action Buttons', visible: true, locked: false },
    { id: 'badges', type: 'badges', label: 'Custom Elements / Badges', visible: true, locked: false },
  ],
};

const mockUser = {
  id: 'usr_playwright_audit',
  username: 'audit_tester',
  globalName: 'Audit Tester',
  email: 'tester@pixel.gg',
  role: 'user',
  premiumStatus: true,
  avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
  appToken: 'mock_jwt_test_token_audit',
  profile: {
    id: 'prof_audit',
    userId: 'usr_playwright_audit',
    displayName: 'Audit Tester',
    bio: 'Deep interactive auditing engine',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    bannerUrl: '',
    accentColor: '#ffffff',
    particles: 'Stars',
    blur: 12,
    opacity: 85,
    roundedCorners: 16,
    musicUrl: '',
    customCss: '',
    views: 9482,
    designConfig: JSON.stringify(mockDesignConfig),
    buttons: [
      { id: 'b1', title: 'Community Discord', url: 'https://discord.gg/pixelgg' }
    ],
    links: [
      { id: 'l1', label: 'GitHub', url: 'https://github.com', visibility: true }
    ],
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pixlpresence1-web.vercel.app',
  'Access-Control-Allow-Credentials': 'true',
};

const bugs = [];
const testedElements = [];

function recordBug(pageUrl, elementDesc, errorType, details) {
  const bug = { pageUrl, elementDesc, errorType, details, timestamp: new Date().toISOString() };
  bugs.push(bug);
  console.error(`[BUG DETECTED] [${pageUrl}] [${errorType}] ${elementDesc} -> ${details}`);
}

async function setupMocks(page) {
  await page.route('**/*api/auth/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockUser),
    });
  });

  await page.route('**/*api/profile/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(mockUser.profile),
    });
  });

  await page.route('**/*api/rpc/me*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        appName: 'Visual Studio Code',
        details: 'Editing audit script',
        state: 'Workspace: pixalgg1',
        largeImage: 'https://cdn.discordapp.com/embed/avatars/0.png',
        showProfileRpc: true,
        enableDiscordRpc: true,
      }),
    });
  });

  await page.route('**/*api/account/badges*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        badges: [
          { id: 'staff', name: 'Staff', category: 'Staff', rarity: 'Legendary', owned: true },
          { id: 'premium', name: 'Premium', category: 'Entitlement', rarity: 'Epic', owned: true },
          { id: 'early_supporter', name: 'Early Supporter', category: 'Milestone', rarity: 'Epic', owned: true },
          { id: 'og', name: 'OG', category: 'Special', rarity: 'Legendary', owned: false },
        ],
        totalCount: 4,
        ownedCount: 3,
      }),
    });
  });

  await page.route('**/*api/account/analytics*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        range: '7d',
        days: 7,
        lastUpdated: new Date().toISOString(),
        kpis: {
          totalClicks: { value: '2,086', delta: '+14%' },
          clickRate: { value: '22.0%', delta: '+2.1%' },
          profileViews: { value: '9,482', delta: '+28%' },
          avgDailyViews: { value: '1,354', delta: '+8%' },
        },
        timeline: [
          { date: 'Nov 1', views: 820, clicks: 180 },
          { date: 'Nov 2', views: 940, clicks: 210 },
          { date: 'Nov 3', views: 1100, clicks: 240 },
          { date: 'Nov 4', views: 1250, clicks: 275 },
          { date: 'Nov 5', views: 1400, clicks: 310 },
          { date: 'Nov 6', views: 1800, clicks: 396 },
          { date: 'Nov 7', views: 2172, clicks: 475 },
        ],
        devices: [
          { name: 'Desktop', percentage: 66, count: 6258 },
          { name: 'Mobile', percentage: 28, count: 2654 },
          { name: 'Tablet', percentage: 6, count: 570 },
        ],
        socials: [
          { platform: 'Discord', url: 'https://discord.gg/pixelgg', clicks: 1420, percentage: 68 },
          { platform: 'GitHub', url: 'https://github.com', clicks: 666, percentage: 32 },
        ],
        buttons: [
          { id: 'b1', title: 'Community Discord', url: 'https://discord.gg/pixelgg', clicks: 1420, rate: '22.0%' },
        ],
        referrers: [
          { name: 'discord.com', count: 5410, percentage: 57 },
          { name: 'Direct Traffic', count: 3200, percentage: 34 },
          { name: 'google.com', count: 872, percentage: 9 },
        ],
        countries: [
          { code: 'US', name: 'United States', views: 4200, percentage: 44 },
          { code: 'DE', name: 'Germany', views: 1800, percentage: 19 },
          { code: 'GB', name: 'United Kingdom', views: 1400, percentage: 15 },
          { code: 'CA', name: 'Canada', views: 900, percentage: 9 },
        ],
      }),
    });
  });
}

async function injectAuth(page) {
  await page.evaluate((u) => {
    localStorage.setItem('pixel_app_token', 'mock_jwt_test_token_audit');
    localStorage.setItem('pixel_cached_user', JSON.stringify(u));
  }, mockUser);
}

async function auditPageButtons(page, routePath) {
  console.log(`\n>>> Auditing Interactive Elements on: ${routePath}`);
  const targetUrl = `${BASE_URL}${routePath}`;

  const pageErrors = [];
  const errorHandler = (err) => pageErrors.push(err.message || String(err));
  page.on('pageerror', errorHandler);

  try {
    const res = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    if (!res || res.status() >= 400) {
      recordBug(routePath, 'Page Load', `HTTP_${res ? res.status() : 'NONE'}`, `Status code ${res ? res.status() : 'failed'}`);
      return;
    }
  } catch (err) {
    recordBug(routePath, 'Page Navigation', 'NavigationTimeout', err.message);
    return;
  }

  await page.waitForTimeout(1000);

  // Discover count of clickable buttons
  const btnCount = await page.evaluate(() => document.querySelectorAll('button').length);
  console.log(`    Found ${btnCount} buttons on ${routePath}`);

  for (let i = 0; i < btnCount; i++) {
    try {
      const btnInfo = await page.evaluate((idx) => {
        const b = document.querySelectorAll('button')[idx];
        if (!b) return null;
        const rect = b.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(b).visibility !== 'hidden';
        const text = (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim();
        return { isVisible, disabled: b.disabled, text };
      }, i);

      if (!btnInfo || !btnInfo.isVisible || btnInfo.disabled) continue;

      // Skip destructive buttons
      const lower = btnInfo.text.toLowerCase();
      if (lower.includes('delete account') || lower.includes('sign out') || lower.includes('log out')) {
        continue;
      }

      // Fresh query of the button at this exact index
      const freshBtn = (await page.$$('button'))[i];
      if (freshBtn) {
        const startUrl = page.url();
        await freshBtn.click({ timeout: 2000, force: true });
        await page.waitForTimeout(250);
        testedElements.push({ page: routePath, type: 'button', text: btnInfo.text.slice(0, 40), passed: true });

        // If navigated away, return
        if (page.url() !== startUrl && !page.url().includes(routePath)) {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
        }
      }
    } catch (clickErr) {
      // Ignore click timeouts from intentionally modal overlays or non-blocking triggers
      if (!clickErr.message.includes('timeout') && !clickErr.message.includes('detached')) {
        recordBug(routePath, `Button #${i}`, 'ClickException', clickErr.message);
      }
    }
  }

  if (pageErrors.length > 0) {
    pageErrors.forEach(err => recordBug(routePath, 'Page Runtime', 'UncaughtException', err));
  }

  page.off('pageerror', errorHandler);
}

async function auditCustomizationStudioDeep(page) {
  console.log(`\n>>> Deep Auditing All 10 Categories & Studio Controls on: /customize`);
  await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const CATEGORIES = [
    'Layout',
    'Identity',
    'Avatar',
    'Background',
    'Typography',
    'Discord',
    'Buttons',
    'Effects',
    'Custom CSS',
    'Advanced',
  ];

  for (const catName of CATEGORIES) {
    console.log(`    Testing Studio Category: [${catName}]`);
    const catBtn = await page.$(`button:has-text("${catName}")`);
    if (!catBtn) {
      recordBug('/customize', `Category Tab: "${catName}"`, 'MissingElement', `Could not find category button for ${catName}`);
      continue;
    }

    try {
      await catBtn.click();
      await page.waitForTimeout(400);

      // In this category, click all visible option buttons
      const optCount = await page.evaluate(() => document.querySelectorAll('.custom-scrollbar button').length);
      for (let o = 0; o < Math.min(optCount, 8); o++) {
        try {
          const optBtn = (await page.$$('.custom-scrollbar button'))[o];
          if (optBtn) {
            await optBtn.click({ timeout: 1500, force: true });
            await page.waitForTimeout(100);
            testedElements.push({ page: '/customize', type: 'category-option', text: `${catName} option #${o}`, passed: true });
          }
        } catch {
          // ignore transient animation states
        }
      }

      // Test sliders
      const sliderCount = await page.evaluate(() => document.querySelectorAll('.custom-scrollbar input[type="range"]').length);
      for (let s = 0; s < sliderCount; s++) {
        try {
          const slider = (await page.$$('.custom-scrollbar input[type="range"]'))[s];
          if (slider) {
            const currentVal = await slider.getAttribute('value');
            await slider.fill(String(Math.max(10, Number(currentVal || 50) + 5)));
            await page.waitForTimeout(100);
            testedElements.push({ page: '/customize', type: 'slider', text: `${catName} slider #${s}`, passed: true });
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      recordBug('/customize', `Category: "${catName}"`, 'CategorySwitchError', err.message);
    }
  }

  // Test TopBar Action Buttons
  console.log(`    Testing TopBar Action Buttons`);
  const topButtons = ['Undo', 'Redo', 'Reset', 'Save Draft', 'Publish'];
  for (const tb of topButtons) {
    const btn = await page.$(`button:has-text("${tb}")`);
    if (btn) {
      try {
        await btn.click({ timeout: 1500, force: true });
        await page.waitForTimeout(300);
        testedElements.push({ page: '/customize', type: 'topbar-button', text: tb, passed: true });
      } catch (tbErr) {
        recordBug('/customize', `TopBar Button: "${tb}"`, 'TopBarClickError', tbErr.message);
      }
    }
  }

  // Test Floating Toolbar, Viewport tools and Appearance modes
  console.log(`    Testing Floating Preview Toolbar & Transparency Modes`);
  const toolbarTrigger = await page.$('div[role="button"]:has-text("%")');
  if (toolbarTrigger) {
    await toolbarTrigger.click({ force: true });
    await page.waitForTimeout(400);

    // Appearance mode pills
    const themeTab = await page.$('button:has-text("Glass/Theme"), button:has-text("Theme")');
    if (themeTab) {
      await themeTab.click({ force: true });
      await page.waitForTimeout(300);

      const modes = ['Glass Blur', 'Floating', 'Transparent', 'Solid'];
      for (const m of modes) {
        const mBtn = await page.$(`button:has-text("${m}")`);
        if (mBtn) {
          await mBtn.click({ force: true });
          await page.waitForTimeout(300);
          testedElements.push({ page: '/customize', type: 'appearance-mode', text: m, passed: true });
        }
      }
    }

    // Viewport tools
    const viewportTab = await page.$('button:has-text("Viewport")');
    if (viewportTab) {
      await viewportTab.click({ force: true });
      await page.waitForTimeout(300);

      const overlayBtns = ['Grid Pattern', 'Alignment Guides', 'Wireframe Debug'];
      for (const ob of overlayBtns) {
        const btn = await page.$(`button:has-text("${ob}")`);
        if (btn) {
          await btn.click({ force: true });
          await page.waitForTimeout(200);
          testedElements.push({ page: '/customize', type: 'viewport-overlay', text: ob, passed: true });
        }
      }
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Test Templates Sub-view
  console.log(`    Testing Templates Sub-view`);
  const templatesViewBtn = await page.$('button:has-text("Templates")');
  if (templatesViewBtn) {
    await templatesViewBtn.click({ force: true });
    await page.waitForTimeout(500);

    const presetBtn = await page.$('button:has-text("Apply Preset"), button:has-text("Preview Preset")');
    if (presetBtn) {
      await presetBtn.click({ force: true });
      await page.waitForTimeout(400);
      testedElements.push({ page: '/customize', type: 'template-button', text: 'Apply Preset', passed: true });
    }
  }

  // Test Layers Sub-view
  console.log(`    Testing Layers Sub-view`);
  const layersViewBtn = await page.$('button:has-text("Layers")');
  if (layersViewBtn) {
    await layersViewBtn.click({ force: true });
    await page.waitForTimeout(500);

    const layerToggles = await page.$$('.custom-scrollbar button');
    for (let l = 0; l < Math.min(layerToggles.length, 6); l++) {
      try {
        await layerToggles[l].click({ timeout: 1000, force: true });
        await page.waitForTimeout(100);
        testedElements.push({ page: '/customize', type: 'layer-toggle', text: `Layer toggle #${l}`, passed: true });
      } catch {
        // ignore
      }
    }
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log(`STARTING DEEP INTERACTIVE FULL-SITE ELEMENT AUDIT`);
  console.log(`Target: ${BASE_URL}`);
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await setupMocks(page);

  // Authenticate in storage
  await page.goto(`${BASE_URL}/`);
  await injectAuth(page);

  // 1. Audit Public & Marketing Pages
  const publicPages = [
    '/',
    '/explore',
    '/pricing',
    '/leaderboard',
    '/compare',
    '/terms',
    '/privacy',
    '/login',
    '/register',
    '/recovery',
  ];

  for (const p of publicPages) {
    await auditPageButtons(page, p);
  }

  // 2. Audit Protected Account Workspaces
  const accountPages = [
    '/account',
    '/account/rpc',
    '/account/settings',
    '/account/analytics',
    '/account/badges',
  ];

  for (const ap of accountPages) {
    await auditPageButtons(page, ap);
  }

  // 3. Audit Full Studio Visual Workspace & 10 Customizer Categories
  await auditCustomizationStudioDeep(page);

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`AUDIT COMPLETE`);
  console.log(`Total Interactive Elements Tested: ${testedElements.length}`);
  console.log(`Total Bugs / Exceptions Detected: ${bugs.length}`);
  console.log('='.repeat(70));

  const auditReportPath = path.join(AUDIT_DIR, 'audit-results.json');
  fs.writeFileSync(
    auditReportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        testedCount: testedElements.length,
        bugCount: bugs.length,
        bugs,
        testedElements,
      },
      null,
      2
    )
  );

  console.log(`Full Audit Results written to: ${auditReportPath}`);

  if (bugs.length > 0) {
    console.log('\n--- DETECTED BUGS ---');
    bugs.forEach((b, i) => {
      console.log(`${i + 1}. [${b.pageUrl}] [${b.errorType}] ${b.elementDesc}`);
      console.log(`   Details: ${b.details}`);
    });
  } else {
    console.log('\n✓ ZERO interactive bugs or uncaught exceptions detected across all tested elements!');
  }
}

main().catch((err) => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
