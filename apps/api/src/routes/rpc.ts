import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@discord-rpc/database';
import { io } from '../index'; // Import the socket io instance
import { resolveDiscordAvatarUrl } from '../auth';

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
    largeImage: resolvedAvatar,
    largeImageText: `@${user.username || 'User'} on PIXEL.GG`,
    smallImage: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png',
    smallImageText: 'PIXEL.GG',
    button1Enabled: true,
    button1Label: 'View My Page',
    button1Url: `${frontendUrl}/${user.username}`,
    button2Enabled: true,
    button2Label: 'Get Your Own Page',
    button2Url: `${frontendUrl}/register`,
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

// Middleware to check authentication via Session OR Bearer Token (App Token or Device Token)
export const requireAuth = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]?.trim();
    if (token) {
      // 1. Try finding by user appToken
      const user = await prisma.user.findUnique({ where: { appToken: token } });
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

    // Generate user-friendly 8-char code in format "ABCD-1234"
    const rawCode = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    const deviceSession = await prisma.rpcDeviceAuthorization.create({
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
      deviceName,
      linkedAt: updated.consumedAt,
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
 */
rpcRouter.post('/device/revoke', requireAuth, async (req: any, res) => {
  try {
    const { deviceId } = req.body || {};

    if (deviceId) {
      // User revoking a specific device from web dashboard
      await prisma.rpcDeviceAuthorization.updateMany({
        where: {
          id: deviceId,
          userId: req.user.id,
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });
      return res.json({ success: true, message: 'Device unlinked.' });
    }

    if (req.deviceAuth) {
      // Plugin revoking its own token
      await prisma.rpcDeviceAuthorization.update({
        where: { id: req.deviceAuth.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });
      return res.json({ success: true, message: 'Current device unlinked.' });
    }

    // Revoke all devices for current user
    await prisma.rpcDeviceAuthorization.updateMany({
      where: {
        userId: req.user.id,
        status: 'CONSUMED',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'All devices unlinked.' });
  } catch (err) {
    console.error('[Device Revoke Error]:', err);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/**
 * GET /api/rpc/device/list
 * Returns the list of currently linked devices for the user.
 */
rpcRouter.get('/device/list', requireAuth, async (req: any, res) => {
  try {
    const devices = await prisma.rpcDeviceAuthorization.findMany({
      where: {
        userId: req.user.id,
        status: 'CONSUMED',
      },
      select: {
        id: true,
        deviceName: true,
        consumedAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    res.json(devices);
  } catch (err) {
    console.error('[Device List Error]:', err);
    res.status(500).json({ error: 'Failed to fetch linked devices' });
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

    // Dynamic profile avatar resolution:
    // If useProfileAvatar is active (or enabled by default), dynamic avatar overrides largeImage
    if (responseData.useProfileAvatar !== false) {
      responseData.largeImage = resolvedAvatar;
    }

    // Attach user profile metadata for client convenience
    responseData.username = currentUser.username;
    responseData.userAvatar = resolvedAvatar;

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
    if (data.button1Enabled !== undefined) data.button1Enabled = Boolean(data.button1Enabled);
    if (data.button2Enabled !== undefined) data.button2Enabled = Boolean(data.button2Enabled);

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
    fullPayload.username = currentUser.username;

    // Emit a Socket.io event to notify active desktop/browser clients
    const rpcRecord = rpc as typeof rpc & { enableDiscordRpc?: boolean; showProfileRpc?: boolean };
    if (rpcRecord.enableDiscordRpc === false) {
      io.to(`user_${req.user.id}`).emit('rpc_update', { ...fullPayload, enabled: false, enableDiscordRpc: false });
    } else {
      io.to(`user_${req.user.id}`).emit('rpc_update', fullPayload);
    }

    res.json(fullPayload);
  } catch (err) {
    console.error('[RPC Update Error]:', err);
    res.status(500).json({ error: 'Failed to update RPC' });
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
