import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';
import { resolveTelemetry } from '../utils/geo';
import { viewRateLimiter } from '../rateLimiter';
import { presenceManager } from '../services/presenceManager';
import { getUserCapabilities, validateProfileCapabilities } from '../services/entitlements';

export const profileRouter = Router();

// Helper to resolve viewer identity (session or token) without throwing 401
async function resolveOptionalViewer(req: any) {
  if (req.user) return req.user;
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) return req.user;

  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim() || null;
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)pixel_app_token=([^;]+)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]).trim();
    }
  }

  if (token) {
    try {
      const user = await prisma.user.findUnique({ where: { appToken: token } });
      if (user) return user;
    } catch (_) {}
  }

  return null;
}

// Bot & crawler detection
function isBotRequest(ua: string | undefined): boolean {
  if (!ua) return false;
  return /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse|curl|wget|python|postman|headless/i.test(ua);
}

// Salted privacy-preserving one-way hash for IP
function hashClientIp(rawIp: string): string {
  const salt = process.env.SESSION_SECRET || 'pixel_analytics_salt_2026';
  return crypto.createHmac('sha256', salt).update(rawIp).digest('hex').slice(0, 32);
}

// Helper to resolve user by username (case-insensitive), leading @, CUID id, or Discord ID
export async function findUserByIdentifier(rawIdentifier: string) {
  if (!rawIdentifier) return null;
  const clean = decodeURIComponent(rawIdentifier).trim().replace(/^@+/, '').trim();
  if (!clean) return null;

  // 1. Primary lookup: Case-insensitive username match
  let user = await prisma.user.findFirst({
    where: {
      username: {
        equals: clean,
        mode: 'insensitive',
      },
    },
    include: {
      profile: {
        include: { links: true, buttons: true },
      },
      richPresence: true,
    },
  });

  // 2. Direct user ID (cuid) match if not found
  if (!user && (clean.startsWith('cmw') || clean.length >= 20)) {
    user = await prisma.user.findUnique({
      where: { id: clean },
      include: {
        profile: {
          include: { links: true, buttons: true },
        },
        richPresence: true,
      },
    });
  }

  // 3. Discord ID match if purely numeric snowflake (17-20 digits)
  if (!user && /^\d{17,20}$/.test(clean)) {
    user = await prisma.user.findUnique({
      where: { discordId: clean },
      include: {
        profile: {
          include: { links: true, buttons: true },
        },
        richPresence: true,
      },
    });
  }

  return user;
}

// Public Profile Endpoint
profileRouter.get('/u/:username', async (req: any, res) => {
  try {
    const user = await findUserByIdentifier(req.params.username);

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check visibility permissions
    const isOwner = req.user && req.user.id === user.id;
    if (user.profile.visibility === 'PRIVATE' && !isOwner) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Omit sensitive data
    const { email, passwordHash, appToken, ...safeUser } = user as any;
    const rawRpc = (user as any).richPresence || null;
    let safeRpc = rawRpc;
    if (rawRpc && rawRpc.showProfileRpc === false) {
      // If website RPC is disabled, hide it completely from public profile visitors
      safeRpc = isOwner ? rawRpc : null;
    }

    // Retrieve fresh live presence from central manager / Discord
    const livePresence = await presenceManager.getLivePresenceForUser(user as any);
    if (livePresence.hasActivity && livePresence.activity) {
      safeRpc = livePresence.activity;
    } else if (livePresence.status === 'offline' || !livePresence.hasActivity) {
      // If user is offline or has no live activity, do NOT serve a stale game snapshot
      if (rawRpc && rawRpc.showProfileRpc !== false && rawRpc.enableDiscordRpc === false) {
        // Only retain custom manual presence if explicitly configured as static custom presence
        safeRpc = rawRpc;
      } else {
        safeRpc = null;
      }
    }

    res.json({
      user: safeUser,
      profile: user.profile,
      richPresence: safeRpc,
      livePresence,
    });
  } catch (err) {
    console.error('[Public Profile Error]:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Dedicated Real-Time Presence Polling Endpoint (Strict No-Cache)
profileRouter.get('/u/:username/presence', async (req: any, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    const user = await findUserByIdentifier(req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const livePresence = await presenceManager.getLivePresenceForUser(user as any);
    res.json({
      success: true,
      presence: livePresence,
    });
  } catch (err) {
    console.error('[Live Presence Polling Error]:', err);
    res.status(500).json({ error: 'Failed to fetch live presence' });
  }
});

// Lookup Profile by Discord ID
profileRouter.get('/by-discord/:discordId', async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { discordId: req.params.discordId },
      include: {
        profile: {
          include: { links: true, buttons: true }
        }
      }
    });

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { email, appToken, ...safeUser } = user;
    res.json({ user: safeUser, profile: user.profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile by discord id' });
  }
});

// Configurable Deduplication Window (default 24 hours)
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Track Profile View with Deduplication, Bot Filtering & Owner Exemption
profileRouter.post('/u/:username/view', viewRateLimiter, async (req: any, res) => {
  try {
    const rawUsername = req.params.username;
    const userAgent = req.headers['user-agent'] || '';

    // 1. Bot & Crawler Filtering
    if (isBotRequest(userAgent)) {
      return res.json({ success: true, counted: false, reason: 'bot_ignored' });
    }

    // 2. Resolve Profile
    const targetUser = await findUserByIdentifier(rawUsername);
    if (!targetUser || !targetUser.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = targetUser.profile.id;
    const targetUserId = targetUser.id;

    // 3. Resolve Current Viewer (Session or Bearer token)
    const viewer = await resolveOptionalViewer(req);
    const viewerUserId = viewer ? viewer.id : null;
    const isOwner = Boolean(viewerUserId && viewerUserId === targetUserId);

    // 4. Rule: Profile Owner's own visits NEVER increase public view count
    if (isOwner) {
      // Record internal owner visit for analytics (counted: false) without altering public profile.views
      try {
        const geo = resolveTelemetry(req);
        await prisma.profileView.create({
          data: {
            profileId,
            viewerUserId,
            anonymousVisitorId: null,
            sessionId: req.sessionID || null,
            viewSource: 'OWNER',
            counted: false,
            deduplicationKey: `${profileId}:owner:${new Date().toISOString().slice(0, 10)}:${Date.now()}`,
            userAgent: userAgent.slice(0, 255),
            countryCode: geo.countryCode,
            countryName: geo.countryName,
            region: geo.region,
            city: geo.city,
            latitude: geo.latitude,
            longitude: geo.longitude,
            trafficSource: geo.trafficSource,
            referrer: geo.referrer,
            device: geo.device,
            browser: geo.browser,
            os: geo.os,
          },
        });
      } catch (ownerErr) {
        console.warn('[Track Owner Visit Warning]:', ownerErr);
      }

      return res.json({
        success: true,
        counted: false,
        reason: 'owner_visit',
        currentViews: targetUser.profile.views,
      });
    }

    // 5. Generate / Resolve Privacy-Conscious Visitor Identifier
    const clientIp = (
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown'
    ).trim();

    const ipHash = hashClientIp(clientIp);
    const bodyVisitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim().slice(0, 64) : null;
    const cookieVisitorId = req.headers.cookie?.match(/(?:^|;\s*)pixel_vid=([^;]+)/)?.[1]?.trim() || null;
    const anonymousVisitorId = bodyVisitorId || cookieVisitorId || ipHash;

    const windowStart = new Date(Date.now() - DEDUPE_WINDOW_MS);

    // 6. Deduplication Check (24 hours)
    // - Registered users are tracked uniquely by their authenticated viewerUserId
    // - Anonymous guests are deduplicated by their persistent anonymousVisitorId / ipHash
    const dedupeWhere: any = {
      profileId,
      viewedAt: { gte: windowStart },
      counted: true,
    };

    if (viewerUserId) {
      dedupeWhere.viewerUserId = viewerUserId;
    } else {
      const guestOr: any[] = [];
      if (anonymousVisitorId) guestOr.push({ anonymousVisitorId });
      if (ipHash) guestOr.push({ ipHash });
      dedupeWhere.OR = guestOr;
    }

    const existingRecentView = await prisma.profileView.findFirst({
      where: dedupeWhere,
    });

    if (existingRecentView) {
      return res.json({
        success: true,
        counted: false,
        reason: 'deduplicated_within_24h',
        currentViews: targetUser.profile.views,
      });
    }

    // 7. Atomic Transaction: Record Unique View + Increment Profile Views
    const dateBucket = new Date().toISOString().slice(0, 10);
    const deduplicationKey = `${profileId}:${viewerUserId || anonymousVisitorId}:${dateBucket}`;

    // Resolve geographic and client telemetry
    const geo = resolveTelemetry(req);

    const [viewRecord, updatedProfile] = await prisma.$transaction([
      prisma.profileView.create({
        data: {
          profileId,
          viewerUserId: viewerUserId || null,
          anonymousVisitorId: anonymousVisitorId || null,
          sessionId: req.sessionID || null,
          viewSource: viewerUserId ? 'REGISTERED' : 'GUEST',
          counted: true,
          deduplicationKey,
          ipHash,
          userAgent: userAgent.slice(0, 255),
          countryCode: geo.countryCode,
          countryName: geo.countryName,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
          trafficSource: geo.trafficSource,
          referrer: geo.referrer,
          device: geo.device,
          browser: geo.browser,
          os: geo.os,
        },
      }),
      prisma.profile.update({
        where: { id: profileId },
        data: { views: { increment: 1 } },
      }),
    ]);

    // Also set or refresh pixel_vid cookie on guest response so browser maintains anonymous identifier
    if (!cookieVisitorId) {
      res.cookie('pixel_vid', anonymousVisitorId, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      });
    }

    return res.json({
      success: true,
      counted: true,
      currentViews: updatedProfile.views,
    });
  } catch (err: any) {
    console.error('[Track Profile View Error]:', err);
    return res.status(500).json({ error: 'Failed to record profile view' });
  }
});

// Middleware to check authentication via Session OR Bearer Token
const requireAuth = async (req: any, res: any, next: any) => {
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) return next();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]?.trim();
    if (token) {
      const user = await prisma.user.findUnique({ where: { appToken: token } });
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

// Get Profile
profileRouter.get('/me', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: { links: true, buttons: true }
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get or Generate App Token
profileRouter.get('/me/token', requireAuth, async (req: any, res) => {
  try {
    let token = req.user.appToken;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: req.user.id },
        data: { appToken: token }
      });
      req.user.appToken = token;
    }
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve token' });
  }
});

profileRouter.post('/me/token', requireAuth, async (req: any, res) => {
  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: req.user.id },
      data: { appToken: newToken }
    });
    req.user.appToken = newToken;
    res.json({ token: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

function sanitizeCustomCss(rawCss: string | undefined | null): string {
  if (!rawCss || typeof rawCss !== 'string') return '';
  return rawCss
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/behavior\s*:[^;}]*/gi, '')
    .replace(/javascript\s*:[^;}]*/gi, '')
    .replace(/@import\s+[^;]+;/gi, '')
    .trim();
}

// Get current user studio capabilities & entitlements (Phase 9)
profileRouter.get('/capabilities', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, premiumStatus: true, nitroStatus: true },
    });
    const caps = getUserCapabilities(user || req.user);
    res.json(caps);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user capabilities' });
  }
});

// Update Profile
profileRouter.patch('/me', requireAuth, async (req: any, res) => {
  try {
    const data = { ...req.body };
    // Remove protected or relation fields
    delete data.id;
    delete data.userId;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.views;
    delete data.links;
    delete data.buttons;
    delete data.viewRecords;

    if (data.customCss !== undefined) {
      data.customCss = sanitizeCustomCss(data.customCss);
    }

    // Validate capabilities / entitlements
    const caps = getUserCapabilities(req.user);
    if (data.designConfig !== undefined) {
      let parsedCfg = data.designConfig;
      if (typeof parsedCfg === 'string') {
        try {
          parsedCfg = JSON.parse(parsedCfg);
        } catch {
          // ignore
        }
      }
      const capValidation = validateProfileCapabilities(parsedCfg, caps);
      if (!capValidation.valid) {
        return res.status(403).json({ error: capValidation.error });
      }
    }

    if (data.designConfig !== undefined && typeof data.designConfig === 'object') {
      data.designConfig = JSON.stringify(data.designConfig);
    }

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: {
        ...data,
        profileVersion: { increment: 1 }
      },
      include: { links: true, buttons: true },
    });

    await recordSyncEvent('profile.updated', req.user.id, data, profile.profileVersion);
    res.json(profile);
  } catch (err: any) {
    console.error('[Update Profile Error]:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Status (ONLINE, IN_GAME, AWAY, OFFLINE)
profileRouter.patch('/me/status', requireAuth, async (req: any, res) => {
  try {
    const { status, currentGame, customStatus } = req.body;
    const validStatuses = ['ONLINE', 'IN_GAME', 'AWAY', 'OFFLINE'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ONLINE, IN_GAME, AWAY, or OFFLINE' });
    }

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: {
        ...(status ? { status } : {}),
        ...(currentGame !== undefined ? { currentGame } : {}),
        ...(customStatus !== undefined ? { customStatus } : {}),
        profileVersion: { increment: 1 }
      }
    });

    await recordSyncEvent('player.status.updated', req.user.id, {
      status: updatedProfile.status,
      currentGame: updatedProfile.currentGame,
      customStatus: updatedProfile.customStatus
    }, updatedProfile.profileVersion);

    res.json({ success: true, profile: updatedProfile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Manage Links (IDOR-protected: validates caller profile ownership)
profileRouter.post('/me/links', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { url, label, icon, color, animation, visibility, order } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    const link = await prisma.link.create({
      data: {
        profileId: profile.id,
        url: url.trim().slice(0, 500),
        label: typeof label === 'string' ? label.trim().slice(0, 60) : 'Link',
        icon: typeof icon === 'string' ? icon.trim().slice(0, 60) : null,
        color: typeof color === 'string' ? color.trim().slice(0, 30) : null,
        animation: typeof animation === 'string' ? animation.trim().slice(0, 30) : null,
        visibility: visibility !== undefined ? Boolean(visibility) : true,
        order: typeof order === 'number' ? order : 0,
      },
    });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

profileRouter.delete('/me/links/:id', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Enforce strict ownership check
    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        profileId: profile.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    await prisma.link.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Link deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

profileRouter.patch('/me/links/:id', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Enforce strict ownership check
    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        profileId: profile.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found or unauthorized' });
    }

    const { url, label, icon, color, animation, visibility, order } = req.body || {};
    const safeData: any = {};
    if (url !== undefined) safeData.url = String(url).trim().slice(0, 500);
    if (label !== undefined) safeData.label = String(label).trim().slice(0, 60);
    if (icon !== undefined) safeData.icon = icon ? String(icon).trim().slice(0, 60) : null;
    if (color !== undefined) safeData.color = color ? String(color).trim().slice(0, 30) : null;
    if (animation !== undefined) safeData.animation = animation ? String(animation).trim().slice(0, 30) : null;
    if (visibility !== undefined) safeData.visibility = Boolean(visibility);
    if (order !== undefined && typeof order === 'number') safeData.order = order;

    const link = await prisma.link.update({
      where: { id: existing.id },
      data: safeData,
    });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Manage Buttons (IDOR-protected: validates caller profile ownership)
profileRouter.post('/me/buttons', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { title, subtitle, url, icon, gradient, animation, hoverEffect, openInNewTab, order } = req.body || {};
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }

    const button = await prisma.button.create({
      data: {
        profileId: profile.id,
        title: String(title).trim().slice(0, 80),
        subtitle: subtitle ? String(subtitle).trim().slice(0, 120) : null,
        url: String(url).trim().slice(0, 500),
        icon: icon ? String(icon).trim().slice(0, 60) : null,
        gradient: gradient ? String(gradient).trim().slice(0, 60) : null,
        animation: animation ? String(animation).trim().slice(0, 40) : null,
        hoverEffect: hoverEffect ? String(hoverEffect).trim().slice(0, 40) : null,
        openInNewTab: openInNewTab !== undefined ? Boolean(openInNewTab) : true,
        order: typeof order === 'number' ? order : 0,
      },
    });
    res.json(button);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create button' });
  }
});

profileRouter.delete('/me/buttons/:id', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Enforce strict ownership check
    const existing = await prisma.button.findFirst({
      where: {
        id: req.params.id,
        profileId: profile.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Button not found or unauthorized' });
    }

    await prisma.button.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Button deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete button' });
  }
});

profileRouter.patch('/me/buttons/:id', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const existing = await prisma.button.findFirst({
      where: {
        id: req.params.id,
        profileId: profile.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Button not found or unauthorized' });
    }

    const { title, subtitle, url, icon, gradient, animation, hoverEffect, openInNewTab, order } = req.body || {};
    const safeData: any = {};
    if (title !== undefined) safeData.title = String(title).trim().slice(0, 80);
    if (subtitle !== undefined) safeData.subtitle = subtitle ? String(subtitle).trim().slice(0, 120) : null;
    if (url !== undefined) safeData.url = String(url).trim().slice(0, 500);
    if (icon !== undefined) safeData.icon = icon ? String(icon).trim().slice(0, 60) : null;
    if (gradient !== undefined) safeData.gradient = gradient ? String(gradient).trim().slice(0, 60) : null;
    if (animation !== undefined) safeData.animation = animation ? String(animation).trim().slice(0, 40) : null;
    if (hoverEffect !== undefined) safeData.hoverEffect = hoverEffect ? String(hoverEffect).trim().slice(0, 40) : null;
    if (openInNewTab !== undefined) safeData.openInNewTab = Boolean(openInNewTab);
    if (order !== undefined && typeof order === 'number') safeData.order = order;

    const button = await prisma.button.update({
      where: { id: existing.id },
      data: safeData,
    });
    res.json(button);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update button' });
  }
});
