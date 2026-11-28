import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@discord-rpc/database';
import { io } from '../index';
import { recordSyncEvent } from '../utils/sync';
import { resolveTelemetry } from '../utils/geo';
import { viewRateLimiter } from '../rateLimiter';
import { presenceManager } from '../services/presenceManager';
import { getUserCapabilities, validateProfileCapabilities } from '../services/entitlements';
import { getUserOwnedBadgeIds, validateBadgeOwnershipInDoc } from '../services/badgeInventory';
import { parseDesignConfigObject } from '../services/profileSyncService';
import { resolveDiscordAvatarUrl, resolveDiscordBannerUrl } from '../auth';
import {
  createHistorySnapshotTx,
  getUserHistorySnapshot,
  listUserHistory,
} from '../services/profileHistoryService';

export const profileRouter = Router();

// Helper to resolve viewer identity (session or token) without throwing 401
async function resolveOptionalViewer(req: any) {
  if (req.user) return req.user;
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) return req.user;

  // Session fallback
  const sessionUserId = (req.session as any)?.userId || (req.session as any)?.passport?.user;
  if (sessionUserId) {
    try {
      const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (sessionUser) return sessionUser;
    } catch (_) {}
  }

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

// Middleware to check authentication via Session OR Bearer Token
const requireAuth = async (req: any, res: any, next: any) => {
  const user = await resolveOptionalViewer(req);
  if (user) {
    req.user = user;
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

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

  // 4. Previous username / alias resolution via SynchronizationEvent (safe across schema variants)
  if (!user) {
    try {
      const recentRename = await prisma.synchronizationEvent.findFirst({
        where: {
          eventType: 'user.username.updated',
          payload: { contains: clean.toLowerCase() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentRename?.entityId) {
        const parsedPayload = (() => {
          try {
            return JSON.parse(recentRename.payload);
          } catch {
            return null;
          }
        })();
        if (parsedPayload?.previousUsername?.toLowerCase() === clean.toLowerCase()) {
          user = await prisma.user.findUnique({
            where: { id: recentRename.entityId },
            include: {
              profile: {
                include: { links: true, buttons: true },
              },
              richPresence: true,
            },
          });
        }
      }
    } catch {
      // Ignore if sync event table query fails
    }
  }

  return user;
}

// Public Profile Endpoint (Strict no-store to prevent stale profile versions)
profileRouter.get('/u/:username', async (req: any, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const viewer = await resolveOptionalViewer(req);
    const user = await findUserByIdentifier(req.params.username);

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check visibility & draft publication permissions
    const isOwner = Boolean(viewer && viewer.id === user.id);
    const isPreviewMode = req.query.preview === '1' || req.query.preview === 'true';

    if (user.profile.visibility === 'PRIVATE' && !isOwner) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    const cfgObj = parseDesignConfigObject(user.profile.designConfig);
    const hasPublishedDoc = cfgObj.isPublished !== false;
    const isUnpublishedDraftOnly = cfgObj.isPublished === false && !cfgObj.profileBuilder;

    if (isUnpublishedDraftOnly && !(isOwner && isPreviewMode)) {
      return res.status(404).json({ error: 'Profile has not been published yet' });
    }

    // Prepare profile payload; for owner preview, swap in latest draftProfileBuilder if available
    const responseProfile: any = { ...user.profile };
    if (isOwner && isPreviewMode && cfgObj.draftProfileBuilder) {
      responseProfile.designConfig = JSON.stringify({
        ...cfgObj,
        profileBuilder: cfgObj.draftProfileBuilder,
      });
    } else if (!hasPublishedDoc && isOwner && isPreviewMode && cfgObj.draftProfileBuilder) {
      responseProfile.designConfig = JSON.stringify({
        ...cfgObj,
        profileBuilder: cfgObj.draftProfileBuilder,
      });
    }

    // Omit sensitive data & normalize avatar + banner URLs (including raw Discord hashes in saved nodes)
    const { email, passwordHash, appToken, ...safeUser } = user as any;
    safeUser.ownedBadgeIds = getUserOwnedBadgeIds(user as any);
    safeUser.avatar = resolveDiscordAvatarUrl(safeUser.discordId, safeUser.avatar);
    safeUser.banner = resolveDiscordBannerUrl(safeUser.discordId, safeUser.banner);
    responseProfile.avatarUrl = resolveDiscordAvatarUrl(
      safeUser.discordId,
      responseProfile.avatarUrl || safeUser.avatar
    );
    responseProfile.bannerUrl = resolveDiscordBannerUrl(
      safeUser.discordId,
      responseProfile.bannerUrl || safeUser.banner
    );
    if (safeUser.discordId && responseProfile.designConfig) {
      try {
        const parsedResCfg =
          typeof responseProfile.designConfig === 'string'
            ? JSON.parse(responseProfile.designConfig)
            : responseProfile.designConfig;
        const normalizeBannerInDoc = (docObj: any) => {
          if (!docObj || !Array.isArray(docObj.nodes)) return;
          for (const n of docObj.nodes) {
            if (n?.type === 'banner-image' && n?.config?.src) {
              const resolved = resolveDiscordBannerUrl(safeUser.discordId, n.config.src);
              if (resolved) n.config.src = resolved;
            }
          }
        };
        normalizeBannerInDoc(parsedResCfg?.profileBuilder);
        normalizeBannerInDoc(parsedResCfg?.draftProfileBuilder);
        responseProfile.designConfig = JSON.stringify(parsedResCfg);
      } catch {
        // ignore invalid json
      }
    }
    const rawRpc = (user as any).richPresence || null;
    let safeRpc = rawRpc;
    if (rawRpc && rawRpc.showProfileRpc === false) {
      // If website RPC is disabled, hide it completely from public profile visitors
      safeRpc = isOwner ? rawRpc : null;
    }

    // Retrieve fresh live presence from central manager / Discord
    const livePresence = await presenceManager.getLivePresenceForUser(user as any);
    let rpcExtras: { streaks?: any[]; statistics?: any[]; statusLabels?: any[] } | null = null;
    if (rawRpc && rawRpc.showProfileRpc !== false && (rawRpc as any).customConfig) {
      try {
        const parsedCustom = JSON.parse((rawRpc as any).customConfig);
        if (parsedCustom && typeof parsedCustom === 'object') {
          rpcExtras = {
            streaks: Array.isArray(parsedCustom.streaks) ? parsedCustom.streaks : [],
            statistics: Array.isArray(parsedCustom.statistics) ? parsedCustom.statistics : [],
            statusLabels: Array.isArray(parsedCustom.statusLabels) ? parsedCustom.statusLabels : [],
          };
        }
      } catch {
        // ignore invalid customConfig
      }
    }

    if (livePresence.hasActivity && livePresence.activity) {
      safeRpc = {
        ...livePresence.activity,
        status: livePresence.status,
        hasActivity: true,
        activitySource: livePresence.activitySource,
        rpcPriority: livePresence.rpcPriority,
        ...(livePresence.activitySource === 'custom' ? (rpcExtras || {}) : {}),
      };
    } else if (livePresence.status !== 'offline') {
      safeRpc = {
        status: livePresence.status,
        hasActivity: false,
        activitySource: 'none',
        rpcPriority: livePresence.rpcPriority,
      };
    } else {
      safeRpc = null;
    }

    res.json({
      user: safeUser,
      profile: responseProfile,
      richPresence: safeRpc,
      livePresence,
      isOwnerPreview: Boolean(isOwner && isPreviewMode),
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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
    // 0. Explicit Studio Preview Guard — Studio editor renders must NEVER track views
    if (req.body?.isPreview || req.headers['x-studio-preview'] === '1') {
      return res.json({ success: true, counted: false, reason: 'studio_preview_ignored' });
    }

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

    // Explicit UTC day boundary for deduplication
    const now = new Date();
    const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const dateBucket = now.toISOString().slice(0, 10);

    // 4. Rule: Profile Owner's own visits count at most once per UTC day
    if (isOwner) {
      const ownerDedupeKey = `${profileId}:owner:${dateBucket}`;
      const existingOwnerViewToday = await prisma.profileView.findFirst({
        where: {
          profileId,
          viewSource: 'OWNER',
          counted: true,
          viewedAt: { gte: todayUtcStart },
        },
      });

      if (existingOwnerViewToday) {
        // Owner has already contributed their 1 view for today
        return res.json({
          success: true,
          counted: false,
          reason: 'owner_daily_limit_reached',
          currentViews: targetUser.profile.views,
        });
      }

      // First owner visit of the UTC day: count 1 view!
      const geo = resolveTelemetry(req);
      const [viewRecord, updatedProfile] = await prisma.$transaction([
        prisma.profileView.create({
          data: {
            profileId,
            viewerUserId,
            anonymousVisitorId: null,
            sessionId: req.sessionID || null,
            viewSource: 'OWNER',
            counted: true,
            deduplicationKey: ownerDedupeKey,
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

      return res.json({
        success: true,
        counted: true,
        reason: 'owner_first_daily_view',
        currentViews: updatedProfile.views,
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

    // 6. Deduplication Check (1 unique view per profile per UTC day)
    // - Authenticated users are tracked uniquely by their viewerUserId
    // - Anonymous guests are deduplicated by their anonymousVisitorId / ipHash
    const dedupeWhere: any = {
      profileId,
      viewedAt: { gte: todayUtcStart },
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
        reason: 'deduplicated_within_today_utc',
        currentViews: targetUser.profile.views,
      });
    }

    // 7. Atomic Transaction: Record Unique View + Increment Profile Views
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
      viewId: viewRecord.id,
      currentViews: updatedProfile.views,
    });
  } catch (err: any) {
    console.error('[Track Profile View Error]:', err);
    return res.status(500).json({ error: 'Failed to record profile view' });
  }
});

/**
 * GET /api/profile/u/:username/like
 * Retrieves the genuine database-backed like count and the current viewer's like status.
 */
profileRouter.get('/u/:username/like', async (req: any, res) => {
  try {
    const rawUsername = req.params.username;
    const targetUser = await findUserByIdentifier(rawUsername);
    if (!targetUser || !targetUser.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const viewer = await resolveOptionalViewer(req);
    let hasLiked = false;
    if (viewer) {
      const existing = await prisma.profileLike.findUnique({
        where: {
          profileId_userId: {
            profileId: targetUser.profile.id,
            userId: viewer.id,
          },
        },
      });
      hasLiked = Boolean(existing);
    }

    res.json({
      likesCount: targetUser.profile.likesCount || 0,
      hasLiked,
    });
  } catch (err: any) {
    console.error('[Get Profile Like Status Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve like status' });
  }
});

/**
 * POST /api/profile/u/:username/like
 * Toggles like for authenticated users with atomic database transactions.
 * Rules:
 * - Requires authentication.
 * - Cannot like own profile.
 * - Toggle: click again unlikes.
 * - Database-enforced unique constraint prevents duplicate concurrent likes.
 */
profileRouter.post('/u/:username/like', requireAuth, async (req: any, res) => {
  try {
    const rawUsername = req.params.username;
    const targetUser = await findUserByIdentifier(rawUsername);
    if (!targetUser || !targetUser.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = targetUser.profile.id;
    const userId = req.user.id;

    // Prevent self-liking
    if (userId === targetUser.id) {
      return res.status(400).json({ error: 'You cannot like your own profile.' });
    }

    // Atomic transaction prevents concurrent duplicate likes/unlikes
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.profileLike.findUnique({
        where: {
          profileId_userId: {
            profileId,
            userId,
          },
        },
      });

      if (existing) {
        await tx.profileLike.delete({
          where: {
            profileId_userId: {
              profileId,
              userId,
            },
          },
        });
        const current = await tx.profile.findUnique({
          where: { id: profileId },
          select: { likesCount: true },
        });
        const updatedProfile = await tx.profile.update({
          where: { id: profileId },
          data: {
            likesCount: {
              decrement: (current?.likesCount || 0) > 0 ? 1 : 0,
            },
          },
        });
        return {
          liked: false,
          likesCount: Math.max(0, updatedProfile.likesCount),
        };
      }

      try {
        await tx.profileLike.create({
          data: {
            profileId,
            userId,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          const current = await tx.profile.findUnique({
            where: { id: profileId },
            select: { likesCount: true },
          });
          return {
            liked: true,
            likesCount: Math.max(0, current?.likesCount || 0),
          };
        }
        throw err;
      }

      const updatedProfile = await tx.profile.update({
        where: { id: profileId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });
      return {
        liked: true,
        likesCount: updatedProfile.likesCount,
      };
    });

    if (targetUser.username) {
      io.to(`profile:${targetUser.username.toLowerCase()}`).emit('profile_like_updated', {
        username: targetUser.username,
        likesCount: result.likesCount,
      });
    }

    return res.json({
      success: true,
      liked: result.liked,
      likesCount: result.likesCount,
    });
  } catch (err: any) {
    console.error('[Profile Like Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle like' });
  }
});

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

function containsUnsafeAssetUrls(obj: any): string | null {
  const inspectValue = (val: unknown, field: string): string | null => {
    if (typeof val === 'number') {
      return `Invalid numeric value in ${field}`;
    }
    if (typeof val !== 'string') return null;
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      return `Invalid numeric identifier in ${field}; expected media URL`;
    }
    if (trimmed.startsWith('blob:') || trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
      return `Invalid non-persistent or unsafe URL in ${field}`;
    }
    return null;
  };

  if (!obj || typeof obj !== 'object') return null;
  for (const key of ['avatarUrl', 'bannerUrl', 'musicUrl']) {
    const err = inspectValue(obj[key], key);
    if (err) return err;
  }

  const checkDoc = (doc: any) => {
    if (!doc || typeof doc !== 'object') return null;
    if (doc.canvas) {
      const err1 = inspectValue(doc.canvas.backgroundImage, 'canvas.backgroundImage');
      if (err1) return err1;
      const err2 = inspectValue(doc.canvas.backgroundVideo, 'canvas.backgroundVideo');
      if (err2) return err2;
    }
    if (Array.isArray(doc.nodes)) {
      for (const node of doc.nodes) {
        if (!node || typeof node !== 'object') continue;
        for (const f of ['src', 'bgImageUrl', 'bgVideoUrl', 'artworkUrl', 'largeImage', 'appIcon']) {
          const err = inspectValue(node.config?.[f], `${node.id}.${f}`);
          if (err) return err;
        }
        const bgErr = inspectValue(node.style?.backgroundImage, `${node.id}.backgroundImage`);
        if (bgErr) return bgErr;
        const bgVidErr = inspectValue(node.style?.backgroundVideo, `${node.id}.backgroundVideo`);
        if (bgVidErr) return bgVidErr;
      }
    }
    return null;
  };

  let cfg = obj.designConfig;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = null;
    }
  }
  if (cfg && typeof cfg === 'object') {
    return checkDoc(cfg.draftProfileBuilder) || checkDoc(cfg.profileBuilder);
  }
  return null;
}

// Update Profile (Save Draft / Autosave / Publish with version concurrency, syncPreferences preservation & explicit Save Draft history)
profileRouter.patch('/me', requireAuth, async (req: any, res) => {
  try {
    const data = { ...(req.body || {}) };
    const expectedVersion =
      typeof data.expectedVersion === 'number' ? data.expectedVersion : undefined;
    const saveMode =
      typeof data.saveMode === 'string' ? data.saveMode.trim() : undefined;
    const clientRequestId =
      typeof data.clientRequestId === 'string' ? data.clientRequestId.trim() : undefined;

    // Remove protected, relation, or non-column fields
    delete data.id;
    delete data.userId;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.views;
    delete data.links;
    delete data.buttons;
    delete data.viewRecords;
    delete data.expectedVersion;
    delete data.saveMode;
    delete data.clientRequestId;
    delete data.isPublished;

    const unsafeUrlError = containsUnsafeAssetUrls(data);
    if (unsafeUrlError) {
      return res.status(400).json({ error: unsafeUrlError });
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: { profileVersion: true, designConfig: true, visibility: true },
    });

    if (
      expectedVersion !== undefined &&
      existingProfile &&
      expectedVersion < existingProfile.profileVersion
    ) {
      return res.status(409).json({
        error: 'A newer profile version was already saved.',
        currentVersion: existingProfile.profileVersion,
      });
    }

    if (data.customCss !== undefined) {
      data.customCss = sanitizeCustomCss(data.customCss);
    }

    // Validate capabilities / entitlements & preserve existing syncPreferences
    const caps = getUserCapabilities(req.user);
    let parsedIncomingCfg: Record<string, any> | null = null;
    if (data.designConfig !== undefined) {
      let parsedCfg = data.designConfig;
      if (typeof parsedCfg === 'string') {
        try {
          parsedCfg = JSON.parse(parsedCfg);
        } catch {
          // ignore
        }
      }
      let permittedGlobalRpcTemplates: Array<{
        id: string;
        parentWidth?: number;
        parentHeight?: number;
        children?: Array<{ type: string; x: number; y: number; width: number; height: number }>;
      }> = [];
      if (!caps.allowCustomRpcLayout && parsedCfg && typeof parsedCfg === 'object') {
        const hasCustomRpcEmbed =
          (Array.isArray(parsedCfg.draftProfileBuilder?.nodes) &&
            parsedCfg.draftProfileBuilder.nodes.some(
              (n: any) => n?.type === 'custom-rpc' || n?.type === 'custom-rpc-embed'
            )) ||
          (Array.isArray(parsedCfg.profileBuilder?.nodes) &&
            parsedCfg.profileBuilder.nodes.some(
              (n: any) => n?.type === 'custom-rpc' || n?.type === 'custom-rpc-embed'
            ));
        if (hasCustomRpcEmbed) {
          const globalTemplates = await prisma.activityTemplate.findMany({
            where: { isGlobal: true },
          });
          permittedGlobalRpcTemplates = globalTemplates
            .map((tpl) => {
              try {
                const parsed = JSON.parse(tpl.config);
                if (parsed?.templateType !== 'rpc-embed-v2' || parsed?.isPremiumRequired !== false) {
                  return null;
                }
                return {
                  id: tpl.id,
                  parentWidth: parsed.parentWidth,
                  parentHeight: parsed.parentHeight,
                  children: Array.isArray(parsed.children) ? parsed.children : undefined,
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean) as typeof permittedGlobalRpcTemplates;
        }
      }

      const capValidation = validateProfileCapabilities(parsedCfg, caps, permittedGlobalRpcTemplates);
      if (!capValidation.valid) {
        return res.status(403).json({ error: capValidation.error });
      }
      if (parsedCfg && typeof parsedCfg === 'object') {
        const ownedBadgeIds = getUserOwnedBadgeIds(req.user);
        const isAdminUser = caps.tier === 'ADMIN';
        const canUseCustomBadges = caps.allowCustomBadgeUpload;
        const ownedCustomAssets = canUseCustomBadges
          ? await prisma.uploadedAsset.findMany({
              where: { userId: req.user.id, targetSlot: 'custom_badge' },
              select: { id: true, fileName: true, originalUrl: true, processedUrl: true, isAnimated: true },
            })
          : [];
        const existingCfg = parseDesignConfigObject(existingProfile?.designConfig);
        for (const docKey of ['draftProfileBuilder', 'profileBuilder'] as const) {
          const builderDoc = parsedCfg[docKey];
          const existingDoc = existingCfg[docKey];
          const badgeCheck = validateBadgeOwnershipInDoc(
            builderDoc,
            ownedBadgeIds,
            isAdminUser,
            ownedCustomAssets,
            canUseCustomBadges
          );
          if (!badgeCheck.valid) {
            return res.status(403).json({ error: badgeCheck.error });
          }
          const existingHadViewCounter =
            Array.isArray(existingDoc?.nodes) &&
            existingDoc.nodes.some((n: any) => n && n.type === 'view-counter');
          if (!isAdminUser && existingHadViewCounter && builderDoc && Array.isArray(builderDoc.nodes)) {
            const hasViewCounter = builderDoc.nodes.some((n: any) => n && n.type === 'view-counter');
            if (!hasViewCounter) {
              return res.status(403).json({
                error: 'The Profile View Counter is a mandatory system component and cannot be removed.',
              });
            }
          }
        }
        const countHearts = (doc: any) =>
          Array.isArray(doc?.nodes)
            ? doc.nodes.filter((n: any) => n && n.type === 'heart-like').length
            : 0;
        const incomingDraftHearts = countHearts(parsedCfg.draftProfileBuilder);
        const incomingPubHearts = countHearts(parsedCfg.profileBuilder);
        if (caps.tier === 'FREE') {
          if (incomingDraftHearts > 5 || incomingPubHearts > 5) {
            return res.status(400).json({
              error: 'Free plan limit reached! You can add up to 5 Like Buttons to your profile. Upgrade to Premium to unlock additional customization.',
            });
          }
          if (
            (parsedCfg.draftProfileBuilder && Array.isArray(parsedCfg.draftProfileBuilder.nodes) && incomingDraftHearts < 1) ||
            (parsedCfg.profileBuilder && Array.isArray(parsedCfg.profileBuilder.nodes) && incomingPubHearts < 1)
          ) {
            return res.status(403).json({
              error: 'The default Like Button cannot be deleted on the Free plan. Upgrade to Premium to remove it.',
            });
          }
          const hasSingleVisibleClaim = (doc: any) => {
            if (!doc || !Array.isArray(doc.nodes)) return true;
            const claims = doc.nodes.filter((n: any) => n && n.type === 'claim-profile');
            return claims.length === 1 && claims[0].visible !== false;
          };
          if (!hasSingleVisibleClaim(parsedCfg.draftProfileBuilder) || !hasSingleVisibleClaim(parsedCfg.profileBuilder)) {
            return res.status(403).json({
              error: 'Adding, duplicating, hiding, or removing Claim Your Profile buttons requires Premium.',
            });
          }
        }
        if (existingCfg.syncPreferences && !parsedCfg.syncPreferences) {
          parsedCfg.syncPreferences = existingCfg.syncPreferences;
        }
        parsedIncomingCfg = parsedCfg;
        data.designConfig = JSON.stringify(parsedCfg);
      }
    }

    const { profile, historySnapshot } = await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.profile.upsert({
        where: { userId: req.user.id },
        update: {
          ...data,
          profileVersion: { increment: 1 },
        },
        create: {
          userId: req.user.id,
          displayName: data.displayName || req.user.globalName || req.user.username,
          bio: data.bio || null,
          avatarUrl: data.avatarUrl || req.user.avatar || '',
          bannerUrl: data.bannerUrl || null,
          designConfig: typeof data.designConfig === 'string' ? data.designConfig : null,
        },
        include: { links: true, buttons: true },
      });

      let snapshotRecord: { id: string } | null = null;
      // Strict Rule: ONLY explicit "Save Draft" or pre-reset backup creates a 7-day history snapshot.
      // Autosave, Publish, Preview, Undo/Redo, and Restore do NOT create spurious history entries.
      if (saveMode === 'manual_save_draft' || saveMode === 'pre_reset_backup') {
        const parsedCfg = parseDesignConfigObject(updatedProfile.designConfig);
        const builderDoc = parsedCfg.draftProfileBuilder || parsedCfg.profileBuilder || null;
        snapshotRecord = await createHistorySnapshotTx(tx, {
          userId: req.user.id,
          profileId: updatedProfile.id,
          profileVersion: updatedProfile.profileVersion,
          schemaVersion: builderDoc?.version || '2.0',
          saveSource: saveMode,
          clientRequestId,
          snapshotObj: {
            displayName: updatedProfile.displayName,
            bio: updatedProfile.bio,
            avatarUrl: updatedProfile.avatarUrl,
            bannerUrl: updatedProfile.bannerUrl,
            accentColor: updatedProfile.accentColor,
            musicUrl: updatedProfile.musicUrl,
            customCss: updatedProfile.customCss,
            visibility: updatedProfile.visibility,
            designConfig: parsedCfg,
          },
        });
      }

      return { profile: updatedProfile, historySnapshot: snapshotRecord };
    }, { maxWait: 10000, timeout: 15000 });

    await recordSyncEvent('profile.updated', req.user.id, data, profile.profileVersion);

    // Notify active public profile viewers via existing Socket.IO room when published
    const isPublished = parsedIncomingCfg ? parsedIncomingCfg.isPublished !== false : true;
    if (isPublished && req.user.username) {
      io.to(`profile:${req.user.username.toLowerCase()}`).emit('profile_updated', {
        username: req.user.username,
        profileVersion: profile.profileVersion,
        updatedAt: profile.updatedAt,
      });
    }

    res.json({
      ...profile,
      historySnapshotId: historySnapshot?.id || null,
    });
  } catch (err: any) {
    console.error('[Update Profile Error]:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// List User Profile History (Non-expired 7-day snapshots, strictly scoped to authenticated owner)
profileRouter.get('/me/history', requireAuth, async (req: any, res) => {
  try {
    const snapshots = await listUserHistory(req.user.id, 50);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      retentionDays: 7,
      snapshots: snapshots.map((s) => {
        let assetCount = 0;
        try {
          const parsed = JSON.parse(s.assetUrlsJson || '[]');
          assetCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          assetCount = 0;
        }
        return {
          id: s.id,
          profileId: s.profileId,
          profileVersion: s.profileVersion,
          schemaVersion: s.schemaVersion,
          saveSource: s.saveSource,
          assetCount,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        };
      }),
    });
  } catch (err: any) {
    console.error('[Profile History List Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve profile history' });
  }
});

// Retrieve Single Complete Historical Snapshot (Strictly owned by authenticated caller)
profileRouter.get('/me/history/:snapshotId', requireAuth, async (req: any, res) => {
  try {
    const snap = await getUserHistorySnapshot(req.user.id, req.params.snapshotId);
    if (!snap) {
      return res.status(404).json({ error: 'History snapshot not found or expired' });
    }
    let data: any = null;
    try {
      data = JSON.parse(snap.snapshotJson);
    } catch {
      return res.status(500).json({ error: 'Corrupted snapshot payload' });
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      snapshot: {
        id: snap.id,
        profileId: snap.profileId,
        profileVersion: snap.profileVersion,
        schemaVersion: snap.schemaVersion,
        saveSource: snap.saveSource,
        createdAt: snap.createdAt,
        expiresAt: snap.expiresAt,
        data,
      },
    });
  } catch (err: any) {
    console.error('[Profile History Detail Error]:', err);
    res.status(500).json({ error: 'Failed to load profile snapshot' });
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
