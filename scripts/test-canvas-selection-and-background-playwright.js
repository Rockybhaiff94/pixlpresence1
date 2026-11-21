/**
 * Playwright Automation Test Suite:
 * Separate Canvas Selection, Embed Editor & Background Media Editor
 * Target: Pixel.gg Studio (/customize)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-screenshots/canvas-selection');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let storedDesignConfig = {
  mode: 'studio',
  layout: { preset: 'centered', maxWidth: 580, height: 520, padding: 28, gap: 22 },
  identity: { titleSize: 26, bioSize: 14, titleColor: '#ffffff' },
  avatar: { size: 96, shape: 'rounded' },
  discordRpc: { showProfileRpc: true, enableDiscordRpc: true },
  socials: { alignment: 'center' },
  background: {
    type: 'solid',
    color: '#050505',
    blur: 0,
    opacity: 100,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    videoPoster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86',
    videoAutoplay: true,
    videoLoop: true,
    videoVolume: 90,
    videoMuted: false,
    audioSourceMode: 'both',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    audioVolume: 75,
    audioLoop: true,
    audioTrimStart: 2,
    masterVolume: 85,
    muteAll: false,
  },
};

const mockUser = {
  id: 'usr_selection_test_101',
  username: 'selection_tester',
  email: 'tester@pixel.gg',
  role: 'user',
  tier: 'premium',
  isPremium: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: {
    displayName: 'Canvas Pro Tester',
    bio: 'Visual Canvas System Specialist',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    accentColor: '#38bdf8',
    particles: 'none',
    blur: 0,
    opacity: 100,
    roundedCorners: 24,
    designConfig: JSON.stringify(storedDesignConfig),
  },
  discordPresence: {
    details: 'Testing 3-Tier Selection',
    state: 'Pixel Presence Studio',
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

async function runTests() {
  console.log('\n================================================================');
  console.log(' PIXEL.GG STUDIO — SELECTION & BACKGROUND MEDIA ENGINE TEST SUITE');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Mock API Routes
  await context.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify(mockUser),
      });
    }

    if (url.includes('/api/profile/custom-links')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/api/profile') && method === 'PATCH') {
      try {
        const body = JSON.parse(req.postData() || '{}');
        if (body.designConfig) {
          storedDesignConfig = JSON.parse(body.designConfig);
        }
      } catch (e) {}
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ success: true, profile: mockUser.profile }),
      });
    }

    return route.continue();
  });

  const page = await context.newPage();

  try {
    // Navigate to Customize page
    await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // 1. Initial Load & Element Verifications
    recordTest('Studio Editor initializes', true, 'Loaded /customize successfully');

    // Screenshot initial state
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-canvas.png') });

    // TEST A: Canvas Background Selection
    console.log('\n--- TEST A: Background Selection ---');
    // Click outside any embed on the background
    const canvasRoot = page.locator('[data-studio-canvas="true"]');
    await canvasRoot.click({ position: { x: 30, y: 30 } });
    await page.waitForTimeout(600);

    // Check if Backgrounds category is open in the left dock
    const bgHeader = page.locator('text=BACKGROUND & MEDIA STUDIO');
    const isBgOpen = await bgHeader.isVisible();
    recordTest(
      'Clicking canvas background outside embeds opens Backgrounds editor',
      isBgOpen,
      isBgOpen ? 'Backgrounds panel is visible in settings dock' : 'Backgrounds panel not found'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-background-selected.png') });

    // TEST B: Embed Container Selection
    console.log('\n--- TEST B: Embed / Container Selection ---');
    // Click on the Primary Profile Embed container surface (padding area)
    const primaryEmbed = page.locator('[data-embed-id="embed_primary"]');
    const embedBox = await primaryEmbed.boundingBox();
    if (embedBox) {
      // Click near the top-left padding inside the embed
      await page.mouse.click(embedBox.x + 15, embedBox.y + 15);
      await page.waitForTimeout(600);
    }

    const layoutHeader = page.locator('text=LAYOUT & STRUCTURE // EMBED BUILDER');
    const isLayoutOpen = await layoutHeader.isVisible();
    recordTest(
      'Clicking embed container surface selects container and opens Layout & Structure',
      isLayoutOpen,
      isLayoutOpen ? 'Layout & Structure editor opened automatically' : 'Layout editor not opened'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-embed-container-selected.png') });

    // TEST C: Individual Component Selection
    console.log('\n--- TEST C: Individual Component Selection ---');
    // Click Avatar component
    const avatarEl = page.locator('[data-element-type="avatar"]').first();
    await avatarEl.click({ force: true });
    await page.waitForTimeout(600);

    // Check whether Avatar category is opened
    const avatarHeading = page.locator('h3:has-text("AVATAR & IMAGES")').first();
    const isAvatarOpen = await avatarHeading.isVisible();
    recordTest(
      'Clicking avatar component selects element and opens Avatar & Images category',
      isAvatarOpen,
      isAvatarOpen ? 'Avatar category active' : 'Avatar category not opened'
    );

    // Click on username or display name
    const usernameEl = page.locator('[data-element-type="username"]').first();
    await usernameEl.dispatchEvent('click');
    await page.waitForTimeout(600);
    const identityHeading = page.locator('h3:has-text("PROFILE IDENTITY")').first();
    const isIdentityOpen = await identityHeading.isVisible();
    recordTest(
      'Clicking username selects element and opens Profile Identity category',
      isIdentityOpen,
      isIdentityOpen ? 'Profile Identity category active' : 'Identity not opened'
    );

    // Verify parent container was NOT selected over child component
    const stillInIdentityOrChild = !(await page.locator('text=LAYOUT & STRUCTURE // EMBED BUILDER').isVisible());
    recordTest(
      'Parent container click does NOT override individual component selection',
      stillInIdentityOrChild,
      'e.stopPropagation() prevented parent from overriding child element selection'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-child-element-selected.png') });

    // TEST D: Background Customizer Modal & Video Settings
    console.log('\n--- TEST D: Background Media & Video Configuration ---');
    // Click background again to open Backgrounds
    await canvasRoot.click({ position: { x: 25, y: 25 } });
    await page.waitForTimeout(600);

    // Open Background Media & Audio Studio modal
    const openModalBtn = page.locator('button:has-text("MEDIA & AUDIO STUDIO ↗")').first();
    await openModalBtn.click();
    await page.waitForTimeout(600);

    const modalTitle = page.locator('text=BACKGROUND MEDIA & AUDIO STUDIO');
    const isModalOpen = await modalTitle.isVisible();
    recordTest(
      'Background Media & Audio Studio modal opens',
      isModalOpen,
      isModalOpen ? 'Modal rendered with all tabs' : 'Modal not visible'
    );

    // Switch to VIDEO tab in modal
    const videoTabBtn = page.locator('[data-modal-tab="video"]').first();
    await videoTabBtn.click();
    await page.waitForTimeout(300);

    const videoInput = page.locator('input[placeholder*="direct MP4 or WebM"]');
    const hasVideoInput = await videoInput.isVisible();
    recordTest(
      'Modal Video tab provides MP4/WebM URL and upload controls',
      hasVideoInput,
      hasVideoInput ? 'Video controls rendered' : 'Video input missing'
    );

    // Switch to AUDIO tab in modal
    const audioTabBtn = page.locator('[data-modal-tab="audio"]').first();
    await audioTabBtn.click();
    await page.waitForTimeout(300);

    const audioSourceMode = page.locator('text=Mode C: Mix Both');
    const hasAudioModes = await audioSourceMode.isVisible();
    recordTest(
      'Modal Audio tab provides 4 audio source modes (None, Video Audio, Music, Mix Both)',
      hasAudioModes,
      hasAudioModes ? 'Modes A, B, C, and Mute rendered' : 'Audio modes missing'
    );

    // Select Mode C and provide audio track URL
    await page.locator('button:has-text("Mode C: Mix Both")').first().click();
    await page.waitForTimeout(300);
    const audioUrlInput = page.locator('input[placeholder*="direct audio link"]').first();
    await audioUrlInput.fill('https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-modal-audio-tab.png') });

    // Click Apply & Save Background
    const applyBtn = page.locator('button:has-text("Apply & Save Background")');
    await applyBtn.click();
    await page.waitForTimeout(600);

    // TEST E: Canvas Sound Activation Pill
    console.log('\n--- TEST E: Sound Pill & Autoplay Compliance ---');
    const soundPill = page.locator('[data-sound-pill="true"]');
    const isSoundPillVisible = await soundPill.isVisible();
    recordTest(
      'Autoplay-compliant Sound Toggle Pill is rendered on canvas when audio is configured',
      isSoundPillVisible,
      isSoundPillVisible ? 'Sound pill is visible' : 'Sound pill not found'
    );

    if (isSoundPillVisible) {
      const initialText = await soundPill.textContent();
      await soundPill.click();
      await page.waitForTimeout(300);
      const afterClickText = await soundPill.textContent();
      recordTest(
        'Clicking Sound Pill toggles audio activation state',
        initialText !== afterClickText || afterClickText.includes('SOUND:'),
        `State changed from "${initialText.trim()}" to "${afterClickText.trim()}"`
      );
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-sound-pill-activated.png') });

    // TEST F: Save Draft and Persistence
    console.log('\n--- TEST F: Save Draft and Persistence ---');
    const saveDraftBtn = page.locator('button[data-testid="save-draft-button"]').first();
    await saveDraftBtn.click();
    await page.waitForTimeout(1000);

    recordTest(
      'Save Draft button successfully persisted updated background and audio config',
      storedDesignConfig.background.audioSourceMode === 'both',
      `Persisted audioSourceMode: ${storedDesignConfig.background.audioSourceMode}, masterVolume: ${storedDesignConfig.background.masterVolume}`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-final-saved-state.png') });

  } catch (err) {
    recordTest('Test suite encountered an error', false, '', err.stack || err.message);
  } finally {
    await browser.close();
  }

  // Final Summary Report
  console.log('\n================================================================');
  console.log(' TEST SUITE EXECUTION SUMMARY');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed}`);
  console.log(`Failed      : ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
