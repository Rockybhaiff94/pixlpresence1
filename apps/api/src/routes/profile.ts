import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';

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
    res.json({
      user: safeUser,
      profile: user.profile,
      richPresence: (user as any).richPresence || null,
    });
  } catch (err) {
    console.error('[Public Profile Error]:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
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
profileRouter.post('/u/:username/view', async (req: any, res) => {
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
        await prisma.profileView.create({
          data: {
            profileId,
            viewerUserId,
            anonymousVisitorId: null,
            sessionId: req.sessionID || null,
            viewSource: 'OWNER',
            counted: false,
            deduplicationKey: `${profileId}:owner:${new Date().toISOString().slice(0, 10)}`,
            userAgent: userAgent.slice(0, 255),
          },
        });
      } catch (_) {}

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

// Update Profile
profileRouter.patch('/me', requireAuth, async (req: any, res) => {
  try {
    const data = req.body;
    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: {
        ...data,
        profileVersion: { increment: 1 }
      },
    });

    await recordSyncEvent('profile.updated', req.user.id, data, profile.profileVersion);
    res.json(profile);
  } catch (err) {
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

// Manage Links
profileRouter.post('/me/links', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const link = await prisma.link.create({
      data: { ...req.body, profileId: profile.id }
    });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

profileRouter.delete('/me/links/:id', requireAuth, async (req: any, res) => {
  try {
    await prisma.link.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

profileRouter.patch('/me/links/:id', requireAuth, async (req: any, res) => {
  try {
    const link = await prisma.link.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Manage Buttons
profileRouter.post('/me/buttons', requireAuth, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    const button = await prisma.button.create({
      data: { ...req.body, profileId: profile.id }
    });
    res.json(button);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create button' });
  }
});

profileRouter.delete('/me/buttons/:id', requireAuth, async (req: any, res) => {
  try {
    await prisma.button.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete button' });
  }
});
