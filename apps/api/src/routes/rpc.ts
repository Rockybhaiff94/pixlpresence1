import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '@discord-rpc/database';
import { io } from '../index'; // Import socket io
import { uploadRateLimiter } from '../rateLimiter'; // Import upload rate limiter
import { resolveDiscordAvatarUrl } from '../auth';
import { presenceManager, LiveActivity } from '../services/presenceManager';
import { rpcSyncHub } from '../services/rpcSyncHub';

export const rpcRouter = Router();

// In-memory rate limiting map for device verification attempts
const verifyAttempts = new Map<string, { count: number; resetAt: number }>();

export function getDefaultRpcConfig(user: {
  id: string;
  username: string;
  discordId?: string | null;
  avatar?: string | null;
  profile?: { avatarUrl?: string | null } | null;
}) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://pixlpresence1-web.vercel.app').replace(/\/+$/, '');
  const resolvedAvatar = resolveDiscordAvatarUrl(user.discordId, user.avatar || user.profile?.avatarUrl);

  return {
    appName: 'Pixel.gg',
    appId: '1523632136878559302',
    activityType: 'streaming',
    streamUrl: `https://twitch.tv/${user.username || 'pixelgg'}`,
    details: 'Welcome to my profile!',
    state: 'Discover my personal page on PIXEL.GG.',
    useProfileAvatar: true,
    largeImageEnabled: true,
    largeImage: resolvedAvatar,
    largeImageText: `@${user.username || 'User'} on PIXEL.GG`,
    largeImageCrop: null,
    smallImageEnabled: true,
    smallImage: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png',
    smallImageText: 'PIXEL.GG',
    smallImageCrop: null,
    button1Enabled: true,
    button1Label: 'View Profile',
    button1Url: `${frontendUrl}/${user.username}`,
    button2Enabled: true,
    button2Label: 'Get PixelsRPC',
    button2Url: `${frontendUrl}/rpc`,
    buttonSize: 'medium',
    showProfileRpc: true,
    enableDiscordRpc: true,
  };
}

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = verifyAttempts.get(ip);
  if (!record || now > record.resetAt) {
    verifyAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (record.count >= 10) {
    return false;
  }
  record.count += 1;
  return true;
}

// Middleware to check authentication via Session OR Bearer Token (App Token or Device Token) OR Token Cookie
export const requireAuth = async (req: any, res: any, next: any) => {
  // 1. Passport authenticated session or attached user
  if (req.user) {
    return next();
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. Fallback to userId stored in express session
  const sessionUserId = (req.session as any)?.userId || (req.session as any)?.passport?.user;
  if (sessionUserId) {
    try {
      const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (sessionUser) {
        req.user = sessionUser;
        return next();
      }
    } catch (_) {}
  }

  // 3. Extract token from Authorization header, Cookie, or Query parameter
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim() || null;
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)pixel_app_token=([^;]+)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]).trim();
    }
  } else if (req.cookies && req.cookies.pixel_app_token) {
    token = String(req.cookies.pixel_app_token).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (token) {
    // 1. Try finding by user appToken
    const user = await prisma.user.findFirst({ where: { appToken: token } });
    if (user) {
      req.user = user;
      return next();
    }

    // 2. Try finding by active deviceToken
    const deviceAuth = await prisma.rpcDeviceAuthorization.findUnique({
      where: { deviceToken: token },
      include: { user: true },
    });

    if (deviceAuth && deviceAuth.status === 'CONSUMED' && deviceAuth.user) {
      req.user = deviceAuth.user;
      req.deviceAuth = deviceAuth;

      // Async update lastUsedAt without blocking request
      prisma.rpcDeviceAuthorization
        .update({
          where: { id: deviceAuth.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});

      return next();
    }
  }

  res.status(401).json({ error: 'Unauthorized. Please sign in or provide a valid token.' });
};

// ============================================================================
// DEVICE AUTHORIZATION & ROBLOX-STYLE QUICK ACCOUNT LINKING
// ============================================================================

/**
 * POST /api/rpc/device/authorize
 * Initiated by the authenticated user in the PIXEL.GG website.
 * Generates a short-lived (2 minutes) cryptographically random linking code.
 */
rpcRouter.post('/device/authorize', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Invalidate any existing PENDING codes for this user
    await prisma.rpcDeviceAuthorization.updateMany({
      where: {
        userId,
        status: 'PENDING',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // Clean up revoked or expired sessions for this user older than 1 hour to prevent clutter
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.rpcDeviceAuthorization.deleteMany({
      where: {
        userId,
        status: { in: ['REVOKED', 'EXPIRED'] },
        createdAt: { lt: oneHourAgo },
      },
    }).catch(() => {});

    // Generate user-friendly 8-char code in format "ABCD-1234" with collision protection (up to 3 attempts)
    let deviceSession: any = null;
    let rawCode = '';
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    for (let attempt = 0; attempt < 3; attempt++) {
      rawCode = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      try {
        deviceSession = await prisma.rpcDeviceAuthorization.create({
          data: {
            userId,
            codeHash,
            status: 'PENDING',
            expiresAt,
            deviceMetadata: JSON.stringify({
              ip: req.ip,
              userAgent: req.headers['user-agent'] || 'Unknown',
            }),
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 2) {
          continue; // Unique constraint collision retry
        }
        throw err;
      }
    }

    if (!deviceSession) {
      throw new Error('Failed to create device authorization session after retries');
    }

    res.json({
      success: true,
      code: rawCode,
      codeId: deviceSession.id,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 120,
    });
  } catch (err) {
    console.error('[Device Authorize Error]:', err);
    res.status(500).json({ error: 'Failed to generate device authorization code' });
  }
});

/**
 * GET /api/rpc/device/status
 * Polled by the website while the user is viewing the linking code.
 */
rpcRouter.get('/device/status', requireAuth, async (req: any, res) => {
  try {
    const codeId = String(req.query.codeId || '');
    if (!codeId) {
      return res.status(400).json({ error: 'Missing codeId parameter' });
    }

    const deviceSession = await prisma.rpcDeviceAuthorization.findFirst({
      where: {
        id: codeId,
        userId: req.user.id,
      },
    });

    if (!deviceSession) {
      return res.status(404).json({ error: 'Authorization session not found' });
    }

    // Check expiration
    if (deviceSession.status === 'PENDING' && new Date() > deviceSession.expiresAt) {
      await prisma.rpcDeviceAuthorization.update({
        where: { id: codeId },
        data: { status: 'EXPIRED' },
      });
      return res.json({ status: 'EXPIRED' });
    }

    res.json({
      status: deviceSession.status,
      deviceName: deviceSession.deviceName,
      consumedAt: deviceSession.consumedAt,
    });
  } catch (err) {
    console.error('[Device Status Error]:', err);
    res.status(500).json({ error: 'Failed to check device status' });
  }
});

/**
 * POST /api/rpc/device/verify
 * Called by the Vencord PixelsRPC plugin when user enters the linking code.
 */
rpcRouter.post('/device/verify', async (req: any, res) => {
  try {
    const clientIp = req.ip || '127.0.0.1';
    if (!checkVerifyRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Too many verification attempts. Please wait 5 minutes before trying again.',
      });
    }

    const { code, clientName, platform } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Please enter a valid linking code.' });
    }

    const sanitizedCode = code.trim().toUpperCase();
    const codeHash = crypto.createHash('sha256').update(sanitizedCode).digest('hex');

    const deviceAuth = await prisma.rpcDeviceAuthorization.findUnique({
      where: { codeHash },
      include: { user: true },
    });

    if (!deviceAuth) {
      return res.status(400).json({ error: 'Invalid linking code. Please check and try again.' });
    }

    if (new Date() > deviceAuth.expiresAt || deviceAuth.status === 'EXPIRED') {
      if (deviceAuth.status === 'PENDING') {
        await prisma.rpcDeviceAuthorization.update({
          where: { id: deviceAuth.id },
          data: { status: 'EXPIRED' },
        });
      }
      return res.status(400).json({ error: 'This linking code has expired. Please generate a new one on Pixel.gg.' });
    }

    if (deviceAuth.status !== 'PENDING') {
      return res.status(400).json({ error: 'This linking code has already been used or revoked.' });
    }

    // Generate secure 64-char device token
    const deviceToken = `px_dev_${crypto.randomBytes(32).toString('hex')}`;
    const deviceName = clientName || 'Vencord Discord Client';

    const updated = await prisma.rpcDeviceAuthorization.update({
      where: { id: deviceAuth.id },
      data: {
        status: 'CONSUMED',
        deviceToken,
        deviceName,
        consumedAt: new Date(),
        lastUsedAt: new Date(),
        deviceMetadata: JSON.stringify({
          platform: platform || 'Vencord',
          ip: clientIp,
          userAgent: req.headers['user-agent'] || 'Vencord Plugin',
        }),
      },
    });

    // Notify connected browser session via websocket if active
    io.to(`user_${deviceAuth.userId}`).emit('device_linked', {
      deviceId: updated.id,
      deviceName,
      linkedAt: updated.consumedAt,
    });

    // Register active heartbeat in sync hub
    await rpcSyncHub.handleHeartbeat({
      deviceId: updated.id,
      deviceToken,
      pluginVersion: '1.1.0',
      discordAvailable: true,
      publishingStatus: 'active',
      timestamp: Date.now(),
    });

    // Initialize default Rich Presence if user does not have one yet
    try {
      const existingRpc = await prisma.richPresence.findUnique({
        where: { userId: deviceAuth.userId },
      });
      if (!existingRpc) {
        const userWithProfile = await prisma.user.findUnique({
          where: { id: deviceAuth.userId },
          include: { profile: true },
        });
        const defaults = getDefaultRpcConfig(userWithProfile || deviceAuth.user);
        await prisma.richPresence.create({
          data: {
            ...defaults,
            userId: deviceAuth.userId,
          },
        });
      }
    } catch (rpcInitErr) {
      console.warn('[Device Verify] Default RPC initialization notice:', rpcInitErr);
    }

    res.json({
      success: true,
      deviceToken,
      username: deviceAuth.user.username,
      globalName: deviceAuth.user.globalName || deviceAuth.user.username,
      userId: deviceAuth.user.id,
      message: 'Account linked successfully!',
    });
  } catch (err) {
    console.error('[Device Verify Error]:', err);
    res.status(500).json({ error: 'Failed to verify device linking code' });
  }
});

/**
 * POST /api/rpc/device/revoke
 * Allows unlinking a device. Can be called with either session or Bearer deviceToken.
 * Broadcasts bidirectional real-time disconnect events to connected plugins and website.
 */
rpcRouter.post('/device/revoke', requireAuth, async (req: any, res) => {
  try {
    const { deviceId } = req.body || {};

    if (deviceId) {
      // User revoking a specific device from web dashboard
      await rpcSyncHub.handleDeviceRevoked(deviceId, req.user.id, 'unlinked_from_dashboard');
      return res.json({ success: true, message: 'Device unlinked.', deviceId });
    }

    if (req.deviceAuth) {
      // Plugin revoking its own token
      await rpcSyncHub.handleDeviceRevoked(req.deviceAuth.id, req.user.id, 'disconnected_from_plugin');
      return res.json({ success: true, message: 'Current device unlinked.', deviceId: req.deviceAuth.id });
    }

    // Revoke all devices for current user
    const devices = await prisma.rpcDeviceAuthorization.findMany({
      where: { userId: req.user.id, status: 'CONSUMED' },
      select: { id: true },
    });

    for (const d of devices) {
      await rpcSyncHub.handleDeviceRevoked(d.id, req.user.id, 'all_devices_unlinked');
    }

    res.json({ success: true, message: 'All devices unlinked.' });
  } catch (err) {
    console.error('[Device Revoke Error]:', err);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/**
 * GET /api/rpc/device/list
 * Returns the list of currently linked devices for the user with live connection state.
 */
rpcRouter.get('/device/list', requireAuth, async (req: any, res) => {
  try {
    const devices = await rpcSyncHub.getDevicesForUser(req.user.id);
    res.json(devices);
  } catch (err) {
    console.error('[Device List Error]:', err);
    res.status(500).json({ error: 'Failed to fetch linked devices' });
  }
});

/**
 * POST /api/rpc/device/heartbeat
 * Periodic heartbeat from Vencord plugin (15s interval) to confirm connectivity and Discord RPC health.
 */
rpcRouter.post('/device/heartbeat', requireAuth, async (req: any, res) => {
  try {
    const payload = req.body || {};
    const updated = await rpcSyncHub.handleHeartbeat({
      ...payload,
      deviceId: req.deviceAuth?.id || payload.deviceId,
      deviceToken: req.deviceAuth?.deviceToken || payload.deviceToken,
    });

    if (!updated) {
      return res.status(401).json({ error: 'Device unauthorized or revoked', disconnected: true });
    }

    res.json({
      success: true,
      runtime: updated,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Device Heartbeat Error]:', err);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// ============================================================================
// RICH PRESENCE CONFIGURATION (Supports Web, App Token & Device Token)
// ============================================================================

// Get RPC Config (Supports both /api/rpc/me and /api/account/rpc)
rpcRouter.get('/me', requireAuth, async (req: any, res) => {
  try {
    const userWithProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    const currentUser = userWithProfile || req.user;
    const resolvedAvatar = resolveDiscordAvatarUrl(
      currentUser.discordId,
      currentUser.avatar || currentUser.profile?.avatarUrl
    );

    let rpc = await prisma.richPresence.findUnique({
      where: { userId: req.user.id },
    });

    // If first-time user without RPC record, initialize complete default configuration
    if (!rpc) {
      const defaults = getDefaultRpcConfig(currentUser);
      rpc = await prisma.richPresence.create({
        data: {
          ...defaults,
          userId: req.user.id,
        },
      });
    }

    const responseData: any = { ...rpc };

    const frontendUrl = (process.env.FRONTEND_URL || 'https://pixlpresence1-web.vercel.app').replace(/\/+$/, '');

    // Normalize default buttons to user's existing public profile and public RPC page
    if (!responseData.button1Label || responseData.button1Label === 'View My Page') {
      responseData.button1Label = 'View Profile';
    }
    if (!responseData.button1Url || responseData.button1Url.includes('/register')) {
      responseData.button1Url = `${frontendUrl}/${currentUser.username}`;
    }
    if (!responseData.button2Label || responseData.button2Label === 'Get Your Own Page') {
      responseData.button2Label = 'Get PixelsRPC';
    }
    if (!responseData.button2Url || responseData.button2Url.endsWith('/register')) {
      responseData.button2Url = `${frontendUrl}/rpc`;
    }

    // Dynamic profile avatar resolution:
    // If useProfileAvatar is active (or enabled by default), dynamic avatar overrides largeImage
    if (responseData.useProfileAvatar !== false) {
      responseData.largeImage = resolvedAvatar;
    }

    // Attach user profile metadata for client convenience
    responseData.username = currentUser.username;
    responseData.userAvatar = resolvedAvatar;
    responseData.revision = rpc.updatedAt ? new Date(rpc.updatedAt).getTime() : Date.now();

    res.json(responseData);
  } catch (err) {
    console.error('[RPC Me Error]:', err);
    res.status(500).json({ error: 'Failed to fetch RPC' });
  }
});

// Update RPC Config
rpcRouter.patch('/me', requireAuth, async (req: any, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.userId;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.username;
    delete data.userAvatar;

    if (data.show_profile_rpc !== undefined && data.showProfileRpc === undefined) {
      data.showProfileRpc = Boolean(data.show_profile_rpc);
      delete data.show_profile_rpc;
    }
    if (data.enable_discord_rpc !== undefined && data.enableDiscordRpc === undefined) {
      data.enableDiscordRpc = Boolean(data.enable_discord_rpc);
      delete data.enable_discord_rpc;
    }

    // Parse boolean toggles
    if (data.useProfileAvatar !== undefined) data.useProfileAvatar = Boolean(data.useProfileAvatar);
    if (data.largeImageEnabled !== undefined) data.largeImageEnabled = Boolean(data.largeImageEnabled);
    if (data.smallImageEnabled !== undefined) data.smallImageEnabled = Boolean(data.smallImageEnabled);
    if (data.button1Enabled !== undefined) data.button1Enabled = Boolean(data.button1Enabled);
    if (data.button2Enabled !== undefined) data.button2Enabled = Boolean(data.button2Enabled);

    // Sanitize button size if provided
    if (data.buttonSize && !['small', 'medium', 'large'].includes(data.buttonSize)) {
      data.buttonSize = 'medium';
    }

    const rpc = await prisma.richPresence.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { ...data, userId: req.user.id },
    });

    const userWithProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    const currentUser = userWithProfile || req.user;
    const resolvedAvatar = resolveDiscordAvatarUrl(
      currentUser.discordId,
      currentUser.avatar || currentUser.profile?.avatarUrl
    );

    const fullPayload: any = { ...rpc };
    if (fullPayload.useProfileAvatar !== false) {
      fullPayload.largeImage = resolvedAvatar;
    }
    // If largeImageEnabled is explicitly false, suppress large image from outgoing presence payload
    if (fullPayload.largeImageEnabled === false) {
      fullPayload.outgoingLargeImage = null;
    } else {
      fullPayload.outgoingLargeImage = fullPayload.largeImage;
    }

    // If smallImageEnabled is explicitly false, suppress small image from outgoing presence payload
    if (fullPayload.smallImageEnabled === false) {
      fullPayload.outgoingSmallImage = null;
    } else {
      fullPayload.outgoingSmallImage = fullPayload.smallImage;
    }

    fullPayload.username = currentUser.username;
    const revision = Date.now();
    fullPayload.revision = revision;

    // Broadcast revision-controlled configuration to connected Vencord plugins in real time
    rpcSyncHub.broadcastConfigUpdate(currentUser.id, fullPayload, revision);

    // Emit a Socket.io event to notify active desktop/browser clients
    const rpcRecord = rpc as typeof rpc & { enableDiscordRpc?: boolean; showProfileRpc?: boolean };
    if (rpcRecord.enableDiscordRpc === false) {
      io.to(`user_${req.user.id}`).emit('rpc_update', { ...fullPayload, enabled: false, enableDiscordRpc: false });
    } else {
      io.to(`user_${req.user.id}`).emit('rpc_update', fullPayload);
    }

    // Synchronize live presence manager so public profile visitors get immediate update
    if (rpcRecord.showProfileRpc !== false && (fullPayload.appName || fullPayload.details || fullPayload.state)) {
      presenceManager.updatePresence({
        username: currentUser.username,
        userId: currentUser.id,
        discordId: currentUser.discordId,
        status: 'online',
        hasActivity: rpcRecord.enableDiscordRpc !== false,
        activity: rpcRecord.enableDiscordRpc !== false ? {
          name: fullPayload.appName || 'Active Application',
          appName: fullPayload.appName || 'Active Application',
          type: typeof fullPayload.activityType === 'number' ? fullPayload.activityType : 0,
          details: fullPayload.details || null,
          state: fullPayload.state || null,
          largeImage: fullPayload.largeImageEnabled !== false ? (fullPayload.largeImage || null) : null,
          smallImage: fullPayload.smallImageEnabled !== false ? (fullPayload.smallImage || null) : null,
          largeImageText: fullPayload.largeImageEnabled !== false ? (fullPayload.largeImageText || null) : null,
          smallImageText: fullPayload.smallImageEnabled !== false ? (fullPayload.smallImageText || null) : null,
          streamUrl: fullPayload.streamUrl || null,
          startTimestamp: fullPayload.startTimestamp ? new Date(fullPayload.startTimestamp).toISOString() : null,
          endTimestamp: fullPayload.endTimestamp ? new Date(fullPayload.endTimestamp).toISOString() : null,
          party: (fullPayload.partySize && fullPayload.partyMax) ? { size: [fullPayload.partySize, fullPayload.partyMax] } : null,
        } : null,
        source: 'database',
      });
    }

    res.json(fullPayload);
  } catch (err) {
    console.error('[RPC Update Error]:', err);
    res.status(500).json({ error: 'Failed to update RPC' });
  }
});

/**
 * POST /api/rpc/presence
 * Direct live presence synchronization endpoint for desktop app, Vencord plugin, or scripts.
 */
rpcRouter.post('/presence', requireAuth, async (req: any, res) => {
  try {
    const { activity, status, timestamp, sequence } = req.body || {};
    const updated = presenceManager.updatePresence({
      username: req.user.username,
      userId: req.user.id,
      discordId: req.user.discordId,
      status: status || 'online',
      hasActivity: Boolean(activity && activity.name),
      activity: activity || null,
      source: 'client',
      timestamp,
      sequence,
    });
    res.json({ success: true, presence: updated });
  } catch (err) {
    console.error('[RPC Direct Presence Error]:', err);
    res.status(500).json({ error: 'Failed to synchronize presence' });
  }
});

// ============================================================================
// CUSTOM IMAGE UPLOAD & ASSET MANAGEMENT PIPELINE
// ============================================================================

export function validateImageBuffer(buffer: Buffer): {
  valid: boolean;
  mimeType: string;
  isAnimated: boolean;
  ext: string;
  error?: string;
} {
  if (!buffer || buffer.length < 8) {
    return { valid: false, mimeType: '', isAnimated: false, ext: '', error: 'File is too small to be a valid media file.' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: 'image/png', isAnimated: false, ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg', isAnimated: false, ext: 'jpg' };
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37 61 / 47 49 46 38 39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    // Detect whether GIF has multiple frames (animation)
    let frameCount = 0;
    for (let i = 0; i < buffer.length - 3; i++) {
      if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9 && buffer[i + 2] === 0x04) {
        frameCount++;
        if (frameCount > 1) break;
      }
    }
    return { valid: true, mimeType: 'image/gif', isAnimated: frameCount > 1, ext: 'gif' };
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const isAnimWebp = buffer.indexOf('ANIM') !== -1;
    return { valid: true, mimeType: 'image/webp', isAnimated: isAnimWebp, ext: 'webp' };
  }

  // MP4: buffer[4..7] === 'ftyp'
  if (buffer.length >= 8 && buffer.slice(4, 8).toString() === 'ftyp') {
    return { valid: true, mimeType: 'video/mp4', isAnimated: true, ext: 'mp4' };
  }

  // WebM: 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, mimeType: 'video/webm', isAnimated: true, ext: 'webm' };
  }

  // MP3: ID3 header (49 44 33) or sync word (FF FB / FF F3 / FF F2)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return { valid: true, mimeType: 'audio/mpeg', isAnimated: false, ext: 'mp3' };
  }

  // WAV: RIFF....WAVE
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return { valid: true, mimeType: 'audio/wav', isAnimated: false, ext: 'wav' };
  }

  // OGG: 4F 67 67 53 ('OggS')
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { valid: true, mimeType: 'audio/ogg', isAnimated: false, ext: 'ogg' };
  }

  return {
    valid: false,
    mimeType: '',
    isAnimated: false,
    ext: '',
    error: 'Unsupported media format. Please upload a valid PNG, JPG, WEBP, GIF, MP4, WebM, MP3, WAV, or OGG file.',
  };
}

/**
 * POST /api/rpc/upload
 * Handles custom image and animated GIF uploads for Large Activity Image & Small Icon slots.
 * Features:
 * - Content-based magic-byte validation (PNG, JPEG, GIF, WEBP)
 * - Strict 5 MB limit for animated GIFs
 * - 10 MB limit for static images
 * - Image transformation coordinate & zoom persistence
 * - Discord CDN / public URL generation
 */
rpcRouter.post('/upload', requireAuth, uploadRateLimiter, async (req: any, res) => {
  try {
    const { file, fileName, targetSlot, cropData } = req.body || {};

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'No image data provided. Please provide a base64 encoded image or data URL.' });
    }

    // Extract raw base64 buffer
    let rawBase64 = file;
    if (file.includes(';base64,')) {
      rawBase64 = file.split(';base64,')[1];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawBase64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid base64 image data encoding.' });
    }

    // Validate file content via magic bytes
    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid image file content.' });
    }

    // Enforce size limits: 25 MB for video/audio, 10 MB for GIFs and static images
    const MAX_GIF_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_STATIC_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB

    if (validation.mimeType.startsWith('video/') || validation.mimeType.startsWith('audio/')) {
      if (buffer.length > MAX_MEDIA_BYTES) {
        return res.status(400).json({
          error: `Media file exceeds the 25 MB maximum size limit. Uploaded file size is ${(buffer.length / (1024 * 1024)).toFixed(2)} MB.`,
          fileSize: buffer.length,
          maxAllowed: MAX_MEDIA_BYTES,
        });
      }
    } else if (validation.mimeType === 'image/gif') {
      if (buffer.length > MAX_GIF_BYTES) {
        return res.status(400).json({
          error: `GIF animation exceeds the 10 MB maximum size limit. Uploaded file size is ${(buffer.length / (1024 * 1024)).toFixed(2)} MB.`,
          fileSize: buffer.length,
          maxAllowed: MAX_GIF_BYTES,
        });
      }
    } else {
      if (buffer.length > MAX_STATIC_BYTES) {
        return res.status(400).json({
          error: `Image file exceeds the 10 MB maximum size limit. Uploaded file size is ${(buffer.length / (1024 * 1024)).toFixed(2)} MB.`,
          fileSize: buffer.length,
          maxAllowed: MAX_STATIC_BYTES,
        });
      }
    }

    // Save to disk in uploads/rpc/
    const uploadsDir = path.resolve(__dirname, '../../uploads/rpc');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(6).toString('hex');
    const safeExt = validation.ext;
    const storedFileName = `px_rpc_${req.user.id}_${Date.now()}_${uniqueId}.${safeExt}`;
    const filePath = path.join(uploadsDir, storedFileName);

    await fs.promises.writeFile(filePath, buffer);

    // Compute public URL
    // In production, ensure uploads use the public reachable HTTPS endpoint (Render or custom domain)
    // Avoid defaulting to localhost when requests come from reverse proxy or production browsers
    const frontendOrApi = (
      process.env.PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.INTERNAL_API_URL ||
      ''
    ).replace(/\/+$/, '');

    let baseUrl = frontendOrApi;
    if (!baseUrl) {
      const host = req.get('host') || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      if (isLocal) {
        baseUrl = `${req.protocol}://${host}`;
      } else {
        // Production host fallback to Render production API URL if host is internal/empty
        baseUrl = host ? `https://${host}` : 'https://pixelgg-api.onrender.com';
      }
    }
    const publicUrl = `${baseUrl}/uploads/rpc/${storedFileName}`;

    // Extract crop & transformation metadata if provided
    const crop = typeof cropData === 'object' && cropData !== null ? cropData : {};
    const cropX = typeof crop.cropX === 'number' ? crop.cropX : 0;
    const cropY = typeof crop.cropY === 'number' ? crop.cropY : 0;
    const cropWidth = typeof crop.cropWidth === 'number' ? crop.cropWidth : null;
    const cropHeight = typeof crop.cropHeight === 'number' ? crop.cropHeight : null;
    const zoom = typeof crop.zoom === 'number' ? crop.zoom : 1;
    const offsetX = typeof crop.offsetX === 'number' ? crop.offsetX : 0;
    const offsetY = typeof crop.offsetY === 'number' ? crop.offsetY : 0;

    // Persist asset in database
    const asset = await prisma.uploadedAsset.create({
      data: {
        userId: req.user.id,
        originalUrl: publicUrl,
        processedUrl: publicUrl,
        fileName: (fileName || storedFileName).slice(0, 120),
        fileSize: buffer.length,
        mimeType: validation.mimeType,
        isAnimated: validation.isAnimated,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        zoom,
        offsetX,
        offsetY,
        targetSlot: targetSlot === 'smallImage' ? 'smallImage' : 'largeImage',
      },
    });

    res.json({
      success: true,
      assetId: asset.id,
      url: publicUrl,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      isAnimated: asset.isAnimated,
      cropData: {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        zoom,
        offsetX,
        offsetY,
      },
      message: `${validation.isAnimated ? 'Animated GIF' : 'Image'} uploaded successfully!`,
    });
  } catch (err: any) {
    console.error('[RPC Upload Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to process image upload' });
  }
});

/**
 * GET /api/rpc/assets
 * Lists all custom uploaded assets for the authenticated user.
 */
rpcRouter.get('/assets', requireAuth, async (req: any, res) => {
  try {
    const assets = await prisma.uploadedAsset.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(assets);
  } catch (err) {
    console.error('[RPC Assets Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve uploaded assets' });
  }
});

/**
 * DELETE /api/rpc/assets/:id
 * Removes an uploaded asset and unlinks the local file if present.
 */
rpcRouter.delete('/assets/:id', requireAuth, async (req: any, res) => {
  try {
    const asset = await prisma.uploadedAsset.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or unauthorized' });
    }

    // Attempt to unlink local file
    try {
      const fileName = asset.originalUrl.split('/').pop();
      if (fileName) {
        const filePath = path.resolve(__dirname, '../../uploads/rpc', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (fsErr) {
      console.warn('[Asset Delete Notice] Local file removal:', fsErr);
    }

    await prisma.uploadedAsset.delete({
      where: { id: asset.id },
    });

    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (err) {
    console.error('[RPC Asset Delete Error]:', err);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// GET /rpc/templates
rpcRouter.get('/templates', requireAuth, async (req: any, res) => {
  try {
    const templates = await prisma.activityTemplate.findMany({
      where: {
        OR: [{ isGlobal: true }, { userId: req.user.id }],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /rpc/templates
rpcRouter.post('/templates', requireAuth, async (req: any, res) => {
  try {
    const { name, category, config } = req.body;

    // Check premium limits
    if (!req.user.premiumStatus) {
      const count = await prisma.activityTemplate.count({ where: { userId: req.user.id } });
      if (count >= 1) {
        return res.status(403).json({
          error: 'Standard users can only save 1 template. Upgrade to Premium for unlimited.',
        });
      }
    }

    const template = await prisma.activityTemplate.create({
      data: {
        userId: req.user.id,
        name,
        category: category || 'Custom',
        config: JSON.stringify(config),
        isGlobal: req.user.role === 'ADMIN' ? req.body.isGlobal : false,
      },
    });

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /rpc/templates/:id/apply
rpcRouter.post('/templates/:id/apply', requireAuth, async (req: any, res) => {
  try {
    const template = await prisma.activityTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!template || (!template.isGlobal && template.userId !== req.user.id)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const configData = JSON.parse(template.config);

    const updated = await prisma.richPresence.upsert({
      where: { userId: req.user.id },
      update: configData,
      create: { ...configData, userId: req.user.id },
    });

    io.to(`user_${req.user.id}`).emit('rpc_update', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// DELETE /rpc/templates/:id
rpcRouter.delete('/templates/:id', requireAuth, async (req: any, res) => {
  try {
    await prisma.activityTemplate.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
