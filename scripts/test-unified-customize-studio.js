const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-screenshots/unified-studio');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const mockUser = {
  id: 'usr_test_design_migration',
  username: 'pixeltester',
  email: 'tester@pixel.gg',
  role: 'user',
  tier: 'premium',
  isPremium: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: {
    displayName: 'Pixel Tester',
    bio: 'Digital Designer & System Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    accentColor: '#38bdf8',
    particles: 'stars',
    blur: 16,
    opacity: 85,
    roundedCorners: 24,
    designConfig: JSON.stringify({
      mode: 'studio',
      layout: { preset: 'centered', maxWidth: 580, height: 520, padding: 28, gap: 22 },
      identity: { titleSize: 26, bioSize: 14, titleColor: '#ffffff' },
      avatar: { size: 96, shape: 'rounded' },
      background: { type: 'solid', color: '#09090b', pattern: 'grid' },
      discordRpc: { showProfileRpc: true, enableDiscordRpc: true },
      socials: { alignment: 'center' },
    }),
  },
  discordPresence: {
    details: 'Designing in Unified Studio',
    state: 'Pixel Studio Pro',
  },
};

(async () => {
  console.log('--- STARTING PLAYWRIGHT VALIDATION: UNIFIED CUSTOMIZE STUDIO ---');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Mock API endpoints
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: mockUser }),
      });
    }

    if (url.includes('/api/profile/custom') || url.includes('/api/profile/design') || url.includes('/api/profile/save-draft')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Saved successfully' }),
      });
    }

    if (url.includes('/api/profile')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, profile: mockUser.profile }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Set auth tokens in localStorage before load
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'mock_jwt_token_for_playwright');
    localStorage.setItem('user', JSON.stringify(user));
  }, mockUser);

  console.log('Navigating to http://localhost:3000/customize...');
  await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for studio container to be visible
  await page.waitForTimeout(2000);

  // 1. Check Fullscreen Studio Shell (AccountLayout sidebar must NOT exist)
  const accountSidebar = await page.$('aside[data-testid="account-sidebar"]');
  const sidebarCount = await page.locator('text=Overview').count();
  console.log(`[CHECK 1] Account sidebar count: ${sidebarCount} (Expected: 0 or not dashboard sidebar)`);

  // 2. Check Contextual Properties Inspector exists on right
  const inspectorPanel = await page.locator('text=Canvas').or(page.locator('text=Properties')).first();
  const isInspectorVisible = await inspectorPanel.isVisible().catch(() => false);
  console.log(`[CHECK 2] Contextual Properties Panel visible: ${isInspectorVisible}`);

  // Capture Initial State Screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_studio_view.png') });
  console.log('Captured screenshot: 01_initial_studio_view.png');

  // 3. Test Inspector Toggle Button
  const inspectorToggle = page.locator('button[title*="Inspector"]').first();
  if (await inspectorToggle.isVisible()) {
    console.log('[CHECK 3] Clicking Inspector Toggle to collapse panel...');
    await inspectorToggle.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inspector_collapsed.png') });

    console.log('Clicking Inspector Toggle to re-open panel...');
    await inspectorToggle.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_inspector_reopened.png') });
  }

  // 4. Test Save Draft Button Inline Animation (Verify ZERO layout shift and NO banner)
  const saveBtn = page.locator('button[data-testid="save-draft-button"]').first();
  if (await saveBtn.isVisible()) {
    console.log('[CHECK 4] Clicking Save Draft button...');
    await saveBtn.click();
    // Wait slightly to capture saving state
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_save_button_saving.png') });

    // Wait for saved state
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_save_button_saved.png') });

    // Verify banner is NOT shifting layout
    const banner = await page.$('.border-b.border-\\[\\#4ade80\\]');
    console.log(`[CHECK 5] Top intrusive banner present: ${Boolean(banner)} (Expected: false)`);
  }

  // 5. Test redirects from /editor and /customize/design
  console.log('Testing redirect from /editor...');
  await page.goto(`${BASE_URL}/editor`, { waitUntil: 'networkidle', timeout: 15000 });
  const editorUrl = page.url();
  console.log(`[CHECK 6] /editor redirected to: ${editorUrl} (Expected: includes /customize)`);

  console.log('Testing redirect from /customize/design...');
  await page.goto(`${BASE_URL}/customize/design`, { waitUntil: 'networkidle', timeout: 15000 });
  const designUrl = page.url();
  console.log(`[CHECK 7] /customize/design redirected to: ${designUrl} (Expected: includes /customize)`);

  await browser.close();
  console.log('--- PLAYWRIGHT VALIDATION COMPLETE ---');
})();
