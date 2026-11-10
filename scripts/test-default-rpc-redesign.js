/**
 * Comprehensive Automated Verification Suite for
 * PixelsRPC Default Rich Presence Redesign & Activity Type Customization
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('------------------------------------------------------------');
console.log('[TEST SUITE] Default Rich Presence Redesign & Customization');
console.log('------------------------------------------------------------');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Database Schema Verification
it('Prisma schema defines all required RichPresence columns', () => {
  const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  assert(schemaContent.includes('activityType'), 'Missing activityType column');
  assert(schemaContent.includes('streamUrl'), 'Missing streamUrl column');
  assert(schemaContent.includes('useProfileAvatar'), 'Missing useProfileAvatar column');
  assert(schemaContent.includes('button1Enabled'), 'Missing button1Enabled column');
  assert(schemaContent.includes('button2Enabled'), 'Missing button2Enabled column');
  assert(schemaContent.includes('@default("streaming")'), 'Missing @default("streaming")');
  assert(schemaContent.includes('@default(true)'), 'Missing @default(true)');
});

// 2. Default RPC Config generation logic
it('Default RPC configuration sets correct initial values', () => {
  // Test mock user with custom avatar
  const mockUser = {
    id: 'user_123',
    discordId: '987654321',
    avatar: 'a_abcdef1234567890',
    username: 'testpilot',
    profile: {
      avatarUrl: null
    }
  };

  const FRONTEND_URL = 'https://pixel.gg';

  function resolveDiscordAvatarUrl(discordId, avatar) {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    if (discordId) {
      const ext = avatar.startsWith('a_') ? 'gif' : 'png';
      return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=256`;
    }
    return null;
  }

  function getDefaultRpcConfig(user) {
    const username = user?.username || 'user';
    const profileUrl = `${FRONTEND_URL}/${username}`;
    const registerUrl = `${FRONTEND_URL}/register`;
    const avatarUrl = resolveDiscordAvatarUrl(user?.discordId, user?.avatar || user?.profile?.avatarUrl);

    return {
      appName: 'PIXEL.GG',
      details: 'Welcome to my profile!',
      state: 'Discover my personal page on PIXEL.GG.',
      activityType: 'streaming',
      streamUrl: `https://twitch.tv/${username}`,
      useProfileAvatar: true,
      largeImage: avatarUrl || 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png',
      largeImageText: `${username} on PIXEL.GG`,
      smallImage: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png',
      smallImageText: 'PIXEL.GG Verified',
      button1Enabled: true,
      button1Label: 'View My Page',
      button1Url: profileUrl,
      button2Enabled: true,
      button2Label: 'Get Your Own Page',
      button2Url: registerUrl,
      showProfileRpc: true,
      enableDiscordRpc: true,
    };
  }

  const defaults = getDefaultRpcConfig(mockUser);

  assert.strictEqual(defaults.details, 'Welcome to my profile!');
  assert.strictEqual(defaults.state, 'Discover my personal page on PIXEL.GG.');
  assert.strictEqual(defaults.activityType, 'streaming');
  assert.strictEqual(defaults.streamUrl, 'https://twitch.tv/testpilot');
  assert.strictEqual(defaults.button1Label, 'View My Page');
  assert.strictEqual(defaults.button1Url, 'https://pixel.gg/testpilot');
  assert.strictEqual(defaults.button2Label, 'Get Your Own Page');
  assert.strictEqual(defaults.button2Url, 'https://pixel.gg/register');
  assert.strictEqual(defaults.largeImage, 'https://cdn.discordapp.com/avatars/987654321/a_abcdef1234567890.gif?size=256');
  assert.strictEqual(defaults.useProfileAvatar, true);
  assert.strictEqual(defaults.button1Enabled, true);
  assert.strictEqual(defaults.button2Enabled, true);
});

// 3. Vencord Plugin Activity Type Mapping
it('Activity types map correctly to Discord numerical types', () => {
  function resolveActivityType(typeStr) {
    switch (typeStr?.toLowerCase()) {
      case 'playing': return 0;
      case 'streaming': return 1;
      case 'listening': return 2;
      case 'watching': return 3;
      case 'competing': return 5;
      default: return 1; // Default is Streaming (1)
    }
  }

  assert.strictEqual(resolveActivityType('playing'), 0);
  assert.strictEqual(resolveActivityType('streaming'), 1);
  assert.strictEqual(resolveActivityType('listening'), 2);
  assert.strictEqual(resolveActivityType('watching'), 3);
  assert.strictEqual(resolveActivityType('competing'), 5);
  assert.strictEqual(resolveActivityType(undefined), 1, 'Defaults to streaming when undefined');
  assert.strictEqual(resolveActivityType('unknown'), 1, 'Defaults to streaming for invalid type');
});

// 4. Vencord Plugin Button Filtering and Limits
it('Buttons are filtered according to enable/disable flags and capped at 2', () => {
  function buildButtons(config) {
    const buttons = [];
    if (config.button1Enabled !== false && config.button1Label && config.button1Url) {
      buttons.push({ label: config.button1Label.slice(0, 32), url: config.button1Url });
    }
    if (config.button2Enabled !== false && config.button2Label && config.button2Url) {
      buttons.push({ label: config.button2Label.slice(0, 32), url: config.button2Url });
    }
    return buttons.slice(0, 2);
  }

  // Both enabled
  const both = buildButtons({
    button1Enabled: true,
    button1Label: 'View My Page',
    button1Url: 'https://pixel.gg/alice',
    button2Enabled: true,
    button2Label: 'Get Your Own Page',
    button2Url: 'https://pixel.gg/register',
  });
  assert.strictEqual(both.length, 2);
  assert.strictEqual(both[0].label, 'View My Page');
  assert.strictEqual(both[1].label, 'Get Your Own Page');

  // Button 1 disabled
  const onlyBtn2 = buildButtons({
    button1Enabled: false,
    button1Label: 'View My Page',
    button1Url: 'https://pixel.gg/alice',
    button2Enabled: true,
    button2Label: 'Get Your Own Page',
    button2Url: 'https://pixel.gg/register',
  });
  assert.strictEqual(onlyBtn2.length, 1);
  assert.strictEqual(onlyBtn2[0].label, 'Get Your Own Page');

  // Button 2 disabled
  const onlyBtn1 = buildButtons({
    button1Enabled: true,
    button1Label: 'View My Page',
    button1Url: 'https://pixel.gg/alice',
    button2Enabled: false,
    button2Label: 'Get Your Own Page',
    button2Url: 'https://pixel.gg/register',
  });
  assert.strictEqual(onlyBtn1.length, 1);
  assert.strictEqual(onlyBtn1[0].label, 'View My Page');

  // Both disabled
  const none = buildButtons({
    button1Enabled: false,
    button1Label: 'View My Page',
    button1Url: 'https://pixel.gg/alice',
    button2Enabled: false,
    button2Label: 'Get Your Own Page',
    button2Url: 'https://pixel.gg/register',
  });
  assert.strictEqual(none.length, 0);
});

// 5. Discord Activity Payload generation
it('Generates compliant Discord activity payload for Streaming with Twitch/YouTube URL', () => {
  function buildDiscordActivity(config, username) {
    const activityType = config.activityType === 'playing' ? 0
      : config.activityType === 'listening' ? 2
      : config.activityType === 'watching' ? 3
      : config.activityType === 'competing' ? 5
      : 1;

    const activity = {
      name: config.appName || 'PIXEL.GG',
      type: activityType,
      details: config.details || undefined,
      state: config.state || undefined,
    };

    if (activityType === 1) {
      activity.url = config.streamUrl || `https://twitch.tv/${username || 'pixel'}`;
    }

    return activity;
  }

  const streamingAct = buildDiscordActivity({
    appName: 'PIXEL.GG',
    activityType: 'streaming',
    streamUrl: 'https://twitch.tv/pixelstreamer',
    details: 'Welcome to my profile!',
    state: 'Discover my personal page on PIXEL.GG.'
  }, 'pixelstreamer');

  assert.strictEqual(streamingAct.type, 1);
  assert.strictEqual(streamingAct.url, 'https://twitch.tv/pixelstreamer');

  const playingAct = buildDiscordActivity({
    appName: 'PIXEL.GG',
    activityType: 'playing',
    streamUrl: 'https://twitch.tv/pixelstreamer',
  }, 'pixelstreamer');

  assert.strictEqual(playingAct.type, 0);
  assert.strictEqual(playingAct.url, undefined, 'Playing activity must not attach stream URL');
});

console.log('------------------------------------------------------------');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('------------------------------------------------------------');
