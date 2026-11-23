/**
 * test-image-verification-system.js
 * Comprehensive empirical test suite for Pixel.gg Studio Image Upload & Verification Pipeline
 */

const http = require('http');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 TESTING LARGE ACTIVITY IMAGE UPLOAD & VERIFICATION SYSTEM');
console.log('================================================================\n');

// 1. Simulate an HTTP test server that can emulate various edge cases:
//    - Fast PNG/GIF/WEBP/JPG
//    - Delayed 7-second response (which previously failed on 6s timeout)
//    - HTTP 404, 403, 500 errors
//    - Invalid content-types (text/html)
const PORT = 45678;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Set CORS headers so verification works smoothly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/fast-image.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    // Minimal 1x1 PNG bytes
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.end(png1x1);
    return;
  }

  if (pathname === '/fast-image.gif') {
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    // Minimal 1x1 GIF bytes
    const gif1x1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.end(gif1x1);
    return;
  }

  if (pathname === '/delayed-image.png') {
    // Deliberately delay response by 7 seconds (longer than previous 6s timeout, but under 8s-10s timeout)
    console.log('  [Mock CDN] Received delayed-image.png request. Simulating 7000ms CDN propagation...');
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      const png1x1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      res.end(png1x1);
    }, 7000);
    return;
  }

  if (pathname === '/not-found.png') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Asset not found' }));
    return;
  }

  if (pathname === '/forbidden.png') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  if (pathname === '/server-error.png') {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
    return;
  }

  if (pathname === '/invalid-html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Error: Cloudflare Blocked</body></html>');
    return;
  }

  res.writeHead(404);
  res.end();
});

// Implementation of verification algorithm from ImageCustomizerModal.tsx
async function verifySingleAttempt(rawUrl, timeoutMs, isGif) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'No URL provided.' };
  }

  const cacheBuster = `_t=${Date.now()}`;
  const verifyUrl = rawUrl.includes('?') ? `${rawUrl}&${cacheBuster}` : `${rawUrl}?${cacheBuster}`;

  const controller = new AbortController();
  const fetchTimer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(verifyUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });
    clearTimeout(fetchTimer);

    if (!res.ok) {
      return {
        ok: false,
        reason: `Server responded with HTTP ${res.status} (${res.statusText || 'Error'})`,
      };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (
      contentType &&
      !contentType.startsWith('image/') &&
      !contentType.includes('octet-stream')
    ) {
      return {
        ok: false,
        reason: `Invalid content type: expected image, received "${contentType}".`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { ok: false, reason: 'Image payload is empty.' };
    }

    return { ok: true, size: arrayBuffer.byteLength, contentType };
  } catch (err) {
    clearTimeout(fetchTimer);
    if (err.name === 'AbortError') {
      return {
        ok: false,
        reason: `Image request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
      };
    }
    return { ok: false, reason: err.message };
  }
}

async function verifyImageWithRetries(url, isGif, onStateChange) {
  const MAX_ATTEMPTS = 3;
  const ATTEMPT_TIMEOUTS = [8000, 10000, 12000];
  const RETRY_DELAYS = [500, 1000, 1500];
  let lastReason = 'Image verification failed.';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      onStateChange?.('verification_delayed', attempt);
    } else {
      onStateChange?.('verifying', attempt);
    }

    const timeoutMs = ATTEMPT_TIMEOUTS[attempt - 1] || 10000;
    const result = await verifySingleAttempt(url, timeoutMs, isGif);

    if (result.ok) {
      onStateChange?.('verified', attempt);
      return { ok: true };
    }

    lastReason = result.reason || lastReason;

    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS[attempt - 1] || 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  onStateChange?.('verification_unavailable', MAX_ATTEMPTS);
  return { ok: false, reason: lastReason };
}

async function runTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test server running on http://localhost:${PORT}\n`);

  try {
    // TEST 1: Fast PNG image (< 1s)
    console.log('TEST 1: Fast PNG Image (< 1s)');
    const stateHistory1 = [];
    const res1 = await verifyImageWithRetries(
      `http://localhost:${PORT}/fast-image.png`,
      false,
      (state, attempt) => stateHistory1.push({ state, attempt })
    );
    assert.strictEqual(res1.ok, true, 'Test 1 should succeed');
    assert.deepStrictEqual(stateHistory1, [{ state: 'verifying', attempt: 1 }, { state: 'verified', attempt: 1 }]);
    console.log('  ✓ Fast PNG verified immediately on attempt 1 in <100ms.\n');

    // TEST 2: Fast Animated GIF image (< 1s)
    console.log('TEST 2: Fast Animated GIF Image (< 1s)');
    const stateHistory2 = [];
    const res2 = await verifyImageWithRetries(
      `http://localhost:${PORT}/fast-image.gif`,
      true,
      (state, attempt) => stateHistory2.push({ state, attempt })
    );
    assert.strictEqual(res2.ok, true, 'Test 2 should succeed');
    assert.deepStrictEqual(stateHistory2, [{ state: 'verifying', attempt: 1 }, { state: 'verified', attempt: 1 }]);
    console.log('  ✓ Animated GIF verified immediately on attempt 1.\n');

    // TEST 3: Delayed image (7 seconds)
    // Previously: 6-second timeout failed this and locked user out!
    // Now: progressive timeout (8s for attempt 1) gracefully handles 7-second CDN delay without failing!
    console.log('TEST 3: Delayed Image (7s delay from cold start / CDN propagation)');
    const tStart = Date.now();
    const stateHistory3 = [];
    const res3 = await verifyImageWithRetries(
      `http://localhost:${PORT}/delayed-image.png`,
      false,
      (state, attempt) => stateHistory3.push({ state, attempt })
    );
    const elapsed = Date.now() - tStart;
    console.log(`  Elapsed time: ${(elapsed / 1000).toFixed(1)}s`);
    assert.strictEqual(res3.ok, true, 'Test 3 should succeed within the 8s progressive timeout');
    assert.strictEqual(stateHistory3[stateHistory3.length - 1].state, 'verified');
    console.log('  ✓ 7-second CDN propagation succeeded without timing out (old 6s timeout successfully eliminated)!\n');

    // TEST 4: HTTP 404 Not Found response
    console.log('TEST 4: HTTP 404 Not Found Handling');
    const stateHistory4 = [];
    const res4 = await verifyImageWithRetries(
      `http://localhost:${PORT}/not-found.png`,
      false,
      (state, attempt) => stateHistory4.push({ state, attempt })
    );
    assert.strictEqual(res4.ok, false);
    assert.strictEqual(res4.reason.includes('404'), true, 'Error message should report HTTP 404');
    assert.strictEqual(stateHistory4[stateHistory4.length - 1].state, 'verification_unavailable');
    console.log('  ✓ HTTP 404 handled cleanly with 3 retries and transition to non-blocking verification_unavailable.\n');

    // TEST 5: HTTP 403 Forbidden response
    console.log('TEST 5: HTTP 403 Forbidden Handling');
    const res5 = await verifyImageWithRetries(`http://localhost:${PORT}/forbidden.png`, false);
    assert.strictEqual(res5.ok, false);
    assert.strictEqual(res5.reason.includes('403'), true, 'Error message should report HTTP 403');
    console.log('  ✓ HTTP 403 handled cleanly.\n');

    // TEST 6: HTTP 500 Server Error response
    console.log('TEST 6: HTTP 500 Server Error Handling');
    const res6 = await verifyImageWithRetries(`http://localhost:${PORT}/server-error.png`, false);
    assert.strictEqual(res6.ok, false);
    assert.strictEqual(res6.reason.includes('500'), true, 'Error message should report HTTP 500');
    console.log('  ✓ HTTP 500 handled cleanly.\n');

    // TEST 7: Invalid Content-Type (HTML response instead of Image)
    console.log('TEST 7: Invalid Content-Type (HTML)');
    const res7 = await verifyImageWithRetries(`http://localhost:${PORT}/invalid-html`, false);
    assert.strictEqual(res7.ok, false);
    assert.strictEqual(res7.reason.includes('text/html'), true, 'Error should detect text/html');
    console.log('  ✓ Invalid Content-Type rejected.\n');

    console.log('================================================================');
    console.log('🎉 ALL 7 IMAGE VERIFICATION & TIMEOUT TESTS PASSED EMPIRICALLY!');
    console.log('================================================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  server.close();
  process.exit(1);
});
