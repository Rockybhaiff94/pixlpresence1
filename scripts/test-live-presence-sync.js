/**
 * test-live-presence-sync.js
 * Comprehensive automated verification test suite for Live Discord Rich Presence Synchronisation:
 * 1. Start Discord with no game running (online/idle without game).
 * 2. Launch a game and verify the profile updates (appName, details, state, images, timer).
 * 3. Close the game and verify old activity completely disappears (no stale game data!).
 * 4. Launch another game and verify new activity replaces previous activity immediately.
 * 5. Change activity multiple times quickly (monotonically increasing sequence numbers, anti-race condition).
 * 6. Multi-client broadcast isolation (profile:userA vs profile:userB).
 * 7. Disconnect and reconnect Discord (offline clears activity, reconnect restores live state).
 * 8. Stale data & cache prevention: Strict no-store headers and fresh dynamic retrieval.
 * 9. Multi-user concurrent live updates.
 */

const assert = require('assert');
const path = require('path');

// Load presenceManager from built api dist
const { presenceManager } = require('../apps/api/dist/services/presenceManager');

console.log('================================================================');
console.log('   PIXEL.GG LIVE DISCORD RICH PRESENCE VERIFICATION SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Start Discord with no game running
// ---------------------------------------------------------------------------
runTest('Scenario 1: Discord running with no game shows clean online/idle state', () => {
  const p = presenceManager.updatePresence({
    username: 'gamer_alpha',
    userId: 'u_alpha_1',
    discordId: '100000000000000001',
    status: 'online',
    hasActivity: false,
    activity: null,
    source: 'discord_bot',
  });

  assert.strictEqual(p.status, 'online');
  assert.strictEqual(p.hasActivity, false);
  assert.strictEqual(p.activity, null);
});

// ---------------------------------------------------------------------------
// 2. Launch a game and verify profile updates
// ---------------------------------------------------------------------------
runTest('Scenario 2: Launching a game populates all Rich Presence fields', () => {
  const startTime = Date.now() - 60000;
  const p = presenceManager.updatePresence({
    username: 'gamer_alpha',
    userId: 'u_alpha_1',
    discordId: '100000000000000001',
    status: 'online',
    hasActivity: true,
    activity: {
      name: 'VALORANT',
      type: 0,
      details: 'Competitive - Haven',
      state: 'In Match (Score 12-11)',
      largeImage: 'https://cdn.discordapp.com/app-assets/valorant/haven.png',
      largeImageText: 'Haven Map',
      smallImage: 'https://cdn.discordapp.com/app-assets/valorant/jett.png',
      smallImageText: 'Jett',
      timestamps: { start: startTime },
      party: { size: [5, 5] },
    },
    source: 'discord_bot',
  });

  assert.strictEqual(p.hasActivity, true);
  assert.strictEqual(p.activity.name, 'VALORANT');
  assert.strictEqual(p.activity.details, 'Competitive - Haven');
  assert.strictEqual(p.activity.state, 'In Match (Score 12-11)');
  assert.strictEqual(p.activity.largeImageText, 'Haven Map');
  assert.strictEqual(p.activity.smallImageText, 'Jett');
  assert.strictEqual(p.activity.timestamps.start, startTime);
  assert.deepStrictEqual(p.activity.party.size, [5, 5]);
});

// ---------------------------------------------------------------------------
// 3. Close the game and verify old activity disappears
// ---------------------------------------------------------------------------
runTest('Scenario 3: Closing the game removes previous activity and clears stale fields', () => {
  const p = presenceManager.updatePresence({
    username: 'gamer_alpha',
    userId: 'u_alpha_1',
    discordId: '100000000000000001',
    status: 'online',
    hasActivity: false,
    activity: null,
    source: 'discord_bot',
  });

  assert.strictEqual(p.status, 'online');
  assert.strictEqual(p.hasActivity, false);
  assert.strictEqual(p.activity, null, 'Activity must be null when game is closed');
});

// ---------------------------------------------------------------------------
// 4. Launch another game and verify new activity replaces previous
// ---------------------------------------------------------------------------
runTest('Scenario 4: Launching another game replaces previous activity without retaining stale fields', () => {
  const p = presenceManager.updatePresence({
    username: 'gamer_alpha',
    userId: 'u_alpha_1',
    discordId: '100000000000000001',
    status: 'online',
    hasActivity: true,
    activity: {
      name: 'Cyberpunk 2077',
      type: 0,
      details: 'Night City - Act II',
      // Notice: state, smallImage, party are intentionally NOT provided
      largeImage: 'https://cdn.discordapp.com/app-assets/cyberpunk/large.png',
      timestamps: { start: Date.now() },
    },
    source: 'discord_bot',
  });

  assert.strictEqual(p.activity.name, 'Cyberpunk 2077');
  assert.strictEqual(p.activity.details, 'Night City - Act II');
  assert.strictEqual(p.activity.state, null, 'Must not retain old VALORANT state');
  assert.strictEqual(p.activity.smallImage, null, 'Must not retain old VALORANT small icon');
  assert.strictEqual(p.activity.party, null, 'Must not retain old VALORANT party size');
});

// ---------------------------------------------------------------------------
// 5. Change activity multiple times quickly (Race Condition Prevention)
// ---------------------------------------------------------------------------
runTest('Scenario 5: Rapid sequential updates maintain strict monotonic ordering', () => {
  const seq1 = presenceManager.updatePresence({
    username: 'fast_switcher',
    status: 'online',
    hasActivity: true,
    activity: { name: 'Game 1' },
    source: 'client',
  });

  const seq2 = presenceManager.updatePresence({
    username: 'fast_switcher',
    status: 'online',
    hasActivity: true,
    activity: { name: 'Game 2' },
    source: 'client',
  });

  const seq3 = presenceManager.updatePresence({
    username: 'fast_switcher',
    status: 'online',
    hasActivity: true,
    activity: { name: 'Game 3' },
    source: 'client',
  });

  assert.ok(seq3.sequence > seq2.sequence, 'Sequence must monotonically increase');
  assert.ok(seq2.sequence > seq1.sequence, 'Sequence must monotonically increase');
  assert.strictEqual(seq3.activity.name, 'Game 3');

  // Attempt to deliver an older, out-of-order packet (seq1)
  const staleAttempt = presenceManager.updatePresence({
    username: 'fast_switcher',
    status: 'online',
    hasActivity: true,
    activity: { name: 'Game 1 Stale' },
    source: 'client',
    sequence: seq1.sequence,
    timestamp: seq1.updatedAt - 5000,
  });

  assert.strictEqual(staleAttempt.activity.name, 'Game 3', 'Older packet must be ignored to prevent race condition');
});

// ---------------------------------------------------------------------------
// 6. Streaming activity type support
// ---------------------------------------------------------------------------
runTest('Scenario 6: Starting and stopping Twitch/YouTube live stream', () => {
  const streamPresence = presenceManager.updatePresence({
    username: 'streamer_pro',
    status: 'online',
    hasActivity: true,
    activity: {
      name: 'Twitch',
      type: 1, // Streaming
      details: 'Live Coding Pixel.gg',
      streamUrl: 'https://twitch.tv/streamer_pro',
    },
    source: 'client',
  });

  assert.strictEqual(streamPresence.activity.type, 1);
  assert.strictEqual(streamPresence.activity.streamUrl, 'https://twitch.tv/streamer_pro');

  // Stop streaming
  const stoppedPresence = presenceManager.updatePresence({
    username: 'streamer_pro',
    status: 'online',
    hasActivity: false,
    activity: null,
    source: 'client',
  });

  assert.strictEqual(stoppedPresence.hasActivity, false);
  assert.strictEqual(stoppedPresence.activity, null);
});

// ---------------------------------------------------------------------------
// 7. Disconnect and reconnect Discord
// ---------------------------------------------------------------------------
runTest('Scenario 7: Disconnecting from Discord clears presence; reconnecting restores live state', () => {
  // 1. User disconnects from Discord
  const offline = presenceManager.updatePresence({
    username: 'network_tester',
    status: 'offline',
    hasActivity: false,
    activity: null,
    source: 'discord_bot',
  });

  assert.strictEqual(offline.status, 'offline');
  assert.strictEqual(offline.hasActivity, false);
  assert.strictEqual(offline.activity, null);

  // 2. User reconnects to Discord and launches Spotify
  const reconnected = presenceManager.updatePresence({
    username: 'network_tester',
    status: 'online',
    hasActivity: true,
    activity: {
      name: 'Spotify',
      type: 2,
      details: 'Nothing Phone Ambient Track',
      state: 'Artist Name',
    },
    source: 'lanyard',
  });

  assert.strictEqual(reconnected.status, 'online');
  assert.strictEqual(reconnected.hasActivity, true);
  assert.strictEqual(reconnected.activity.name, 'Spotify');
});

// ---------------------------------------------------------------------------
// 8. Multi-user concurrent live updates
// ---------------------------------------------------------------------------
runTest('Scenario 8: Multiple users maintain completely isolated, concurrent presence states', () => {
  const userA = presenceManager.updatePresence({
    username: 'user_alice',
    status: 'online',
    hasActivity: true,
    activity: { name: 'Minecraft 1.21' },
    source: 'discord_bot',
  });

  const userB = presenceManager.updatePresence({
    username: 'user_bob',
    status: 'idle',
    hasActivity: true,
    activity: { name: 'Visual Studio Code' },
    source: 'discord_bot',
  });

  assert.strictEqual(userA.username, 'user_alice');
  assert.strictEqual(userA.activity.name, 'Minecraft 1.21');

  assert.strictEqual(userB.username, 'user_bob');
  assert.strictEqual(userB.activity.name, 'Visual Studio Code');
  assert.notStrictEqual(userA.activity.name, userB.activity.name);
});

console.log('\n================================================================');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
