const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'https://pixlpresence1-web.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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
    buttons: [],
    links: [
      { id: 'l1', label: 'Discord', url: 'https://discord.gg/pixelgg', icon: 'discord', visibility: true },
      { id: 'l2', label: 'YouTube', url: 'https://youtube.com/@pixelgg', icon: 'youtube', visibility: true },
      { id: 'l3', label: 'Spotify', url: 'https://spotify.com', icon: 'spotify', visibility: true },
      { id: 'l4', label: 'Cash App', url: 'https://cash.app/$pixel', icon: 'cashapp', visibility: true },
      { id: 'l5', label: 'GitHub', url: 'https://github.com', icon: 'github', visibility: true },
    ],
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pixlpresence1-web.vercel.app',
  'Access-Control-Allow-Credentials': 'true',
};

async function main() {
  console.log('='.repeat(70));
  console.log('STARTING SOCIAL LOGOS PLAYWRIGHT VERIFICATION');
  console.log(`Target: ${BASE_URL}/links`);
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });

  const page = await context.newPage();

  // Setup Mocks
  await page.route('**/*api/auth/me*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(mockUser) });
  });

  await page.route('**/*api/profile/me*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(mockUser.profile) });
  });

  // Track image load failures
  const failedImages = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/logos/') && res.status() >= 400) {
      failedImages.push({ url, status: res.status() });
      console.error(`[FAIL] Image failed to load: ${url} (${res.status()})`);
    }
  });

  // Inject Auth
  await page.goto(`${BASE_URL}/`);
  await page.evaluate((u) => {
    localStorage.setItem('pixel_app_token', 'mock_jwt_test_token_audit');
    localStorage.setItem('pixel_cached_user', JSON.stringify(u));
  }, mockUser);

  // Navigate to /links
  console.log('Navigating to /links...');
  await page.goto(`${BASE_URL}/links`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Inspect the logo grid
  const logoButtons = await page.$$('.grid button');
  console.log(`Found ${logoButtons.length} social logo buttons in the grid.`);

  // Check how many images loaded inside the grid
  const renderedImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('.grid button img');
    return Array.from(imgs).map(img => ({
      src: img.getAttribute('src'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    }));
  });

  console.log(`Rendered <img> tags inside grid: ${renderedImages.length}`);
  const fullyLoaded = renderedImages.filter(img => img.complete && img.naturalWidth > 0);
  console.log(`Images with naturalWidth > 0: ${fullyLoaded.length} / ${renderedImages.length}`);

  // Capture screenshot of the full links page
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'links-social-logos-live.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  // Test opening a modal by clicking Discord button
  const discordBtn = await page.$('button[title="Discord"]');
  if (discordBtn) {
    console.log('Clicking Discord button to open modal...');
    await discordBtn.click();
    await page.waitForTimeout(500);

    const modalScreenshotPath = path.join(SCREENSHOTS_DIR, 'links-modal-discord.png');
    await page.screenshot({ path: modalScreenshotPath });
    console.log(`Modal screenshot saved to: ${modalScreenshotPath}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Also check public profile view or preview
  console.log('Navigating to /customize to verify social icons in live preview...');
  await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const previewScreenshotPath = path.join(SCREENSHOTS_DIR, 'customize-preview-social-icons.png');
  await page.screenshot({ path: previewScreenshotPath });
  console.log(`Customize preview screenshot saved to: ${previewScreenshotPath}`);

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`VERIFICATION COMPLETE`);
  console.log(`Grid logo count: ${logoButtons.length}`);
  console.log(`Loaded images: ${fullyLoaded.length} / ${renderedImages.length}`);
  console.log(`Failed / 404 images: ${failedImages.length}`);
  console.log('='.repeat(70));

  if (failedImages.length > 0) {
    console.error('FAILURES:', failedImages);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});

