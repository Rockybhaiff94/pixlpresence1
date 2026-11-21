/**
 * Playwright Automation Test Suite: Save Draft Button Animation & Inline Save Status
 * Target: Pixel.gg Studio (/customize)
 *
 * Verifies:
 *  1. 3-State animated button: Save Draft -> Saving... -> Saved -> Save Draft
 *  2. Green glow animation and subtle accent styling during saving and saved states
 *  3. Exact button dimension preservation (zero jitter / resize)
 *  4. Complete removal of the top "Draft saved successfully." banner
 *  5. Zero layout shift across toolbar, canvas, and adjacent buttons
 *  6. Concurrent click prevention
 *  7. Error handling on server failure (never shows false success)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Acer/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-screenshots/save-draft');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const mockUser = {
  id: 'usr_canva_test_999',
  username: 'canva_tester',
  email: 'tester@pixel.gg',
  role: 'user',
  tier: 'premium',
  isPremium: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: {
    displayName: 'Canva Tester',
    bio: 'Visual Canvas System Engineer',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
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
      discordRpc: { showProfileRpc: true, enableDiscordRpc: true },
      socials: { alignment: 'center' },
    }),
  },
  discordPresence: {
    details: 'Customizing in Studio',
    state: 'Pixel Presence Pro',
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

let profilePatchDelay = 500;
let shouldFailProfilePatch = false;
let patchRequestCount = 0;

async function setupBrowserMocks(page) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  await page.route('**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: '',
      });
    }

    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(mockUser),
      });
    }

    if (url.includes('/api/profile/me')) {
      if (method === 'PATCH') {
        patchRequestCount++;
        console.log(`         [PATCH /api/profile/me #${patchRequestCount}] time: ${Date.now()}`);
        if (profilePatchDelay > 0) {
          await new Promise((r) => setTimeout(r, profilePatchDelay));
        }
        if (shouldFailProfilePatch) {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Database transaction failed' }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, user: mockUser }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ profile: mockUser.profile }),
      });
    }

    if (url.includes('/api/rpc/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, presence: mockUser.discordPresence }),
      });
    }

    if (url.includes('/api/account/badges')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ badges: [], totalCount: 0, ownedCount: 0 }),
      });
    }

    if (url.includes('/api/account/analytics')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ views: 100, clicks: 20 }),
      });
    }

    return route.continue();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('PLAYWRIGHT AUTOMATION: SAVE DRAFT BUTTON ANIMATION & INLINE SAVE STATUS');
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
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Failed')) {
      console.log('    [BROWSER ERROR]:', msg.text());
    }
  });
  page.on('pageerror', (err) => console.error('    [PAGE EXCEPTION]:', err.message));
  await setupBrowserMocks(page);

  await page.addInitScript((u) => {
    window.localStorage.setItem('pixel_app_token', 'mock_jwt_test_token_canva');
    window.localStorage.setItem('pixel_cached_user', JSON.stringify(u));
    window.localStorage.setItem('pixel_customizer_mode', 'studio');
  }, mockUser);

  try {
    console.log('[Phase 1] Navigating to Studio (/customize)...');
    await page.goto(`${BASE_URL}/customize`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const saveButton = page.locator('[data-testid="save-draft-button"]').first();
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });
    const publishButton = page.locator('button:has-text("Publish")').first();
    const toolbar = page.locator('header').first();
    const canvasContainer = page.locator('#studio-live-canvas, .profile-container').first();

    recordTest('Studio Page & Save Draft Button Initialized', true, 'Save Draft button present in toolbar');

    // 1. INITIAL IDLE STATE
    console.log('\n[Phase 2] Verifying Initial Idle State...');
    const initialText = (await saveButton.textContent()).trim();
    const initialStatus = await saveButton.getAttribute('data-save-status');
    const initialBox = await saveButton.boundingBox();
    const initialToolbarBox = await toolbar.boundingBox();
    const initialCanvasBox = await canvasContainer.boundingBox();
    const initialPublishBox = await publishButton.boundingBox();

    const isIdleValid = initialText === 'Save Draft' && initialStatus === 'idle';
    recordTest(
      'Idle State: Text and Attributes',
      isIdleValid,
      `Text: "${initialText}", status: "${initialStatus}"`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_idle_state.png') });

    // 2. SAVING STATE WITH GREEN GLOW & ANIMATED SPINNER
    console.log('\n[Phase 3] Triggering Save & Verifying Saving State...');
    profilePatchDelay = 800; // Allow sufficient time to inspect "saving" state
    shouldFailProfilePatch = false;

    // Click Save Draft
    await saveButton.click();

    // Small wait for React state transition into saving
    await page.waitForTimeout(100);

    const savingText = (await saveButton.textContent()).trim();
    const savingStatus = await saveButton.getAttribute('data-save-status');
    const savingBox = await saveButton.boundingBox();
    const savingToolbarBox = await toolbar.boundingBox();
    const savingCanvasBox = await canvasContainer.boundingBox();
    const savingPublishBox = await publishButton.boundingBox();

    const spinnerPresent = await saveButton.locator('svg.animate-spin').count() > 0;
    const savingStyles = await saveButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        boxShadow: computed.boxShadow,
      };
    });

    const isSavingValid = savingStatus === 'saving' && savingText === 'Saving...' && spinnerPresent;
    recordTest(
      'Saving State: Text, Status & Spinner',
      isSavingValid,
      `Status: "${savingStatus}", Text: "${savingText}", Spinner active: ${spinnerPresent}`
    );

    // Green styling check: dark green bg (#123D29 -> rgb(18, 61, 41)), light green text (#4ADE80 -> rgb(74, 222, 128))
    const isGreenTheme =
      savingStyles.backgroundColor.includes('18, 61, 41') ||
      savingStyles.color.includes('74, 222, 128') ||
      savingStyles.boxShadow.includes('34, 197, 94');

    recordTest(
      'Saving State: Green Glow & Color Theme',
      isGreenTheme,
      `Background: ${savingStyles.backgroundColor}, Text: ${savingStyles.color}, Glow: ${savingStyles.boxShadow}`
    );

    // Zero Layout Shift during Saving
    const buttonWidthDriftSaving = Math.abs(savingBox.width - initialBox.width);
    const buttonHeightDriftSaving = Math.abs(savingBox.height - initialBox.height);
    const toolbarYDriftSaving = Math.abs(savingToolbarBox.y - initialToolbarBox.y);
    const canvasYDriftSaving = Math.abs(savingCanvasBox.y - initialCanvasBox.y);
    const publishXDriftSaving = Math.abs(savingPublishBox.x - initialPublishBox.x);

    const isZeroShiftSaving =
      buttonWidthDriftSaving <= 1 &&
      buttonHeightDriftSaving <= 1 &&
      toolbarYDriftSaving === 0 &&
      canvasYDriftSaving === 0 &&
      publishXDriftSaving === 0;

    recordTest(
      'Saving State: Zero Layout Shift & Dimension Stability',
      isZeroShiftSaving,
      `Button width drift: ${buttonWidthDriftSaving}px, Canvas Y drift: ${canvasYDriftSaving}px, Publish X drift: ${publishXDriftSaving}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_saving_state_glow.png') });

    // 3. SUCCESS STATE: SAVED WITH CHECKMARK
    console.log('\n[Phase 4] Awaiting Backend Confirmation & Verifying Saved State...');
    // Wait for the backend response to complete
    await page.waitForTimeout(900);

    const savedText = (await saveButton.textContent()).trim();
    const savedStatus = await saveButton.getAttribute('data-save-status');
    const savedBox = await saveButton.boundingBox();
    const savedToolbarBox = await toolbar.boundingBox();
    const savedCanvasBox = await canvasContainer.boundingBox();
    const checkmarkPresent = (await saveButton.locator('svg').count() > 0) && (await saveButton.locator('svg.animate-spin').count() === 0);

    const isSavedValid = savedStatus === 'saved' && savedText === 'Saved' && checkmarkPresent;
    recordTest(
      'Saved State: Text, Status & Checkmark',
      isSavedValid,
      `Status: "${savedStatus}", Text: "${savedText}", Checkmark icon present: ${checkmarkPresent}`
    );

    // Zero Layout Shift during Saved State
    const buttonWidthDriftSaved = Math.abs(savedBox.width - initialBox.width);
    const canvasYDriftSaved = Math.abs(savedCanvasBox.y - initialCanvasBox.y);
    const isZeroShiftSaved = buttonWidthDriftSaved <= 1 && canvasYDriftSaved === 0;

    recordTest(
      'Saved State: Zero Layout Shift & Dimensions Fixed',
      isZeroShiftSaved,
      `Button width drift: ${buttonWidthDriftSaved}px, Canvas Y drift: ${canvasYDriftSaved}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_saved_state.png') });

    // 4. VERIFY ABSENCE OF TOP NOTIFICATION BANNER
    console.log('\n[Phase 5] Verifying Absence of Top Notification Banner...');
    const bannerFound = await page.locator('text="Draft saved successfully."').count();
    recordTest(
      'Top Banner Elimination: No Layout-Shifting Banner Rendered',
      bannerFound === 0,
      `Banner instances found: ${bannerFound} (expected 0)`
    );

    // 5. AUTOMATIC RETURN TO IDLE STATE
    console.log('\n[Phase 6] Verifying Automatic Transition back to Save Draft...');
    // Saved state timer is 1300ms, wait 1500ms
    await page.waitForTimeout(1600);

    const revertedText = (await saveButton.textContent()).trim();
    const revertedStatus = await saveButton.getAttribute('data-save-status');
    const revertedBox = await saveButton.boundingBox();
    const isRevertedValid = revertedText === 'Save Draft' && revertedStatus === 'idle';

    recordTest(
      'Return to Idle: Automatically transitions back to Save Draft',
      isRevertedValid,
      `Status: "${revertedStatus}", Text: "${revertedText}"`
    );

    const isZeroShiftReverted = Math.abs(revertedBox.width - initialBox.width) <= 1;
    recordTest(
      'Return to Idle: Final Dimensions Preserved',
      isZeroShiftReverted,
      `Width: ${revertedBox.width}px vs initial: ${initialBox.width}px`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_reverted_to_idle.png') });

    // 6. CONCURRENT CLICK PREVENTION
    console.log('\n[Phase 7] Testing Concurrent Click Prevention...');
    patchRequestCount = 0;
    profilePatchDelay = 600;

    // Rapid multiple clicks dispatched simultaneously to test concurrency guard
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="save-draft-button"]');
      if (btn) {
        btn.click();
        btn.click();
        btn.click();
      }
    });
    await page.waitForTimeout(100);

    // Button should be disabled during saving
    const isDisabledDuringSaving = await saveButton.evaluate((el) => el.disabled);
    recordTest(
      'Concurrency Guard: Button disabled while saving',
      isDisabledDuringSaving,
      `Disabled attribute during save: ${isDisabledDuringSaving}`
    );

    await page.waitForTimeout(800);
    recordTest(
      'Concurrency Guard: Exactly 1 Request Dispatched',
      patchRequestCount === 1,
      `PATCH requests dispatched: ${patchRequestCount} (expected 1)`
    );

    await page.waitForTimeout(1500); // Return to idle

    // 7. BACKEND FAILURE & ERROR FEEDBACK (NO FALSE SUCCESS)
    console.log('\n[Phase 8] Testing Backend Failure & Error State...');
    shouldFailProfilePatch = true;
    profilePatchDelay = 300;

    await saveButton.click();
    await page.waitForTimeout(500);

    const errorStatus = await saveButton.getAttribute('data-save-status');
    const errorText = (await saveButton.textContent()).trim();
    const didNotShowFalseSuccess = errorStatus !== 'saved' && errorText !== 'Saved';

    recordTest(
      'Backend Failure: Never displays false success',
      didNotShowFalseSuccess,
      `Status during error: "${errorStatus}", Text: "${errorText}"`
    );

    const isErrorFeedbackVisible = errorStatus === 'error' || errorText.includes('Retry');
    recordTest(
      'Backend Failure: Error feedback or retry state shown',
      isErrorFeedbackVisible,
      `Button displayed error feedback: "${errorText}" (status: ${errorStatus})`
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_error_state.png') });

    // Wait for error timeout to revert
    await page.waitForTimeout(2700);
    const recoveredStatus = await saveButton.getAttribute('data-save-status');
    recordTest(
      'Backend Failure Recovery: Button recovers to idle for retry',
      recoveredStatus === 'idle',
      `Status recovered: "${recoveredStatus}"`
    );

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    recordTest('Test Suite Execution', false, '', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  const passedCount = testResults.filter((t) => t.passed).length;
  console.log(`AUDIT COMPLETE: ${passedCount} / ${testResults.length} PASSED`);
  console.log('========================================================================\n');

  const failedTests = testResults.filter((t) => !t.passed);
  if (failedTests.length > 0) {
    console.error(`Failed ${failedTests.length} tests:`);
    failedTests.forEach((t) => console.error(` - ${t.name}: ${t.error || t.details}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
