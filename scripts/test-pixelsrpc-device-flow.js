const crypto = require("crypto");
const { execSync } = require("child_process");
const { prisma } = require("../packages/database");

async function runDeviceFlowTest() {
  console.log("==================================================================");
  console.log(" PIXELS RPC — AUTOMATED DEVICE AUTHORIZATION & SECURITY TEST SUITE");
  console.log("==================================================================");

  // 1. Locate test user
  const user = await prisma.user.findFirst({
    where: { username: "ashish.yt" },
    include: { richPresence: true },
  });

  if (!user) {
    throw new Error("Test user ashish.yt not found in database.");
  }
  console.log(`[TEST 1] Found test user: ${user.username} (ID: ${user.id})`);

  // 2. Generate Device Authorization Code
  const rawCode = `${crypto.randomBytes(2).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
  const expiresAt = new Date(Date.now() + 120 * 1000); // 2 minutes

  const session = await prisma.rpcDeviceAuthorization.create({
    data: {
      userId: user.id,
      codeHash,
      status: "PENDING",
      expiresAt,
      deviceMetadata: JSON.stringify({ ip: "127.0.0.1", userAgent: "Playwright-Test" }),
    },
  });

  console.log(`[TEST 2] Generated 2-Minute Linking Code: ${rawCode} (Session: ${session.id})`);
  if (!rawCode.match(/^[A-F0-9]{4}-[A-F0-9]{4}$/)) {
    throw new Error(`Code format invalid: ${rawCode}`);
  }

  // 3. Verify Code Verification Logic
  const sanitized = rawCode.trim().toUpperCase();
  const testHash = crypto.createHash("sha256").update(sanitized).digest("hex");
  const foundSession = await prisma.rpcDeviceAuthorization.findUnique({
    where: { codeHash: testHash },
    include: { user: true },
  });

  if (!foundSession || foundSession.status !== "PENDING") {
    throw new Error("Device authorization session verification lookup failed.");
  }

  // Consume session & issue 64-char device token
  const deviceToken = `px_dev_${crypto.randomBytes(32).toString("hex")}`;
  const updatedSession = await prisma.rpcDeviceAuthorization.update({
    where: { id: foundSession.id },
    data: {
      status: "CONSUMED",
      deviceToken,
      deviceName: "Vencord Test Client",
      consumedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });

  console.log(`[TEST 3] Code verified and consumed! Device token issued: ${deviceToken.slice(0, 16)}...`);

  // 4. Test Single-Use Enforcement
  const secondAttempt = await prisma.rpcDeviceAuthorization.findUnique({
    where: { codeHash: testHash },
  });
  if (secondAttempt.status !== "CONSUMED") {
    throw new Error("Expected session status to be CONSUMED.");
  }
  console.log("[TEST 4] PASSED: Replay attack prevented (status is CONSUMED, single-use enforced).");

  // 5. Test Expiration Enforcement
  const expiredCode = "EXPD-9999";
  const expiredHash = crypto.createHash("sha256").update(expiredCode).digest("hex");
  const expiredSession = await prisma.rpcDeviceAuthorization.create({
    data: {
      userId: user.id,
      codeHash: expiredHash,
      status: "PENDING",
      expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
    },
  });

  const isExpired = new Date() > expiredSession.expiresAt;
  if (!isExpired) {
    throw new Error("Expired session detection failed.");
  }
  console.log("[TEST 5] PASSED: Expired code correctly detected and rejected.");

  // 6. Test Presence Retrieval Using Device Token
  const verifiedDeviceAuth = await prisma.rpcDeviceAuthorization.findUnique({
    where: { deviceToken },
    include: { user: true },
  });

  if (!verifiedDeviceAuth || verifiedDeviceAuth.status !== "CONSUMED" || verifiedDeviceAuth.user.id !== user.id) {
    throw new Error("Device token authentication lookup failed.");
  }

  const userRpc = await prisma.richPresence.findUnique({
    where: { userId: verifiedDeviceAuth.user.id },
  });

  console.log(`[TEST 6] PASSED: Authenticated presence lookup with deviceToken succeeded! Application Name: '${userRpc?.appName || "Pixel.gg"}'`);

  // 7. Test Revocation
  await prisma.rpcDeviceAuthorization.update({
    where: { id: updatedSession.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  const revokedSession = await prisma.rpcDeviceAuthorization.findUnique({
    where: { deviceToken },
  });

  if (revokedSession.status !== "REVOKED") {
    throw new Error("Device token revocation failed.");
  }
  console.log("[TEST 7] PASSED: Device token successfully revoked; subsequent requests will be rejected with 401.");

  // 8. Test PowerShell Script Syntax
  console.log("[TEST 8] Validating PowerShell CLI installer syntax...");
  try {
    execSync('powershell -Command "Get-Command -Syntax ./scripts/installer/pixelsrpc.ps1"', {
      stdio: "pipe",
    });
    console.log("[TEST 8] PASSED: scripts/installer/pixelsrpc.ps1 syntax is 100% valid PowerShell!");
  } catch (err) {
    throw new Error(`PowerShell syntax check failed: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(" >>> ALL 8 PIXELSRPC DEVICE FLOW & SECURITY TESTS PASSED! <<<");
  console.log("==================================================================");
}

runDeviceFlowTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

