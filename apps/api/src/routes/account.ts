import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';
import bcrypt from 'bcryptjs';
import { resolveDiscordAvatarUrl } from '../auth';
import {
  COUNTRY_NAMES,
  INDIA_STATE_NAMES,
  CITY_COORDINATES,
  COUNTRY_CENTROIDS,
} from '../utils/geo';

export const accountRouter = Router();

// Middleware to check authentication via Session OR Bearer Token OR Token Cookie
const requireAuth = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  
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
    const user = await prisma.user.findFirst({ where: { appToken: token } });
    if (user) {
      req.user = user;
      return next();
    }

    const deviceAuth = await prisma.rpcDeviceAuthorization.findUnique({
      where: { deviceToken: token },
      include: { user: true },
    });

    if (deviceAuth && deviceAuth.status === 'CONSUMED' && deviceAuth.user) {
      req.user = deviceAuth.user;
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
};

// RPC config retrieval endpoint for Vencord plugin compatibility
accountRouter.get('/rpc', requireAuth, async (req: any, res) => {
  try {
    const rpc = await prisma.richPresence.findUnique({
      where: { userId: req.user.id },
    });
    res.json(rpc || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RPC configuration' });
  }
});

// Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'api', 'auth', 'system', 'root', 'support',
  'dashboard', 'account', 'overview', 'analytics', 'badges', 'settings',
  'customize', 'links', 'premium', 'image-host', 'templates', 'login',
  'register', 'recovery', 'terms', 'privacy', 'leaderboard', 'compare',
  'pricing', 'explore', 'null', 'undefined'
]);

// 1. Get Complete Account Overview
accountRouter.get('/overview', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: {
          include: {
            links: true,
            buttons: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse aliases safely
    let aliases: string[] = [];
    try {
      if ((user as any).aliases) {
        aliases = JSON.parse((user as any).aliases);
      }
    } catch {
      aliases = [];
    }

    // Parse badges
    let userBadges: any[] = [];
    try {
      userBadges = JSON.parse(user.badges || '[]');
    } catch {
      userBadges = [];
    }

    const profile = user.profile || {
      displayName: user.globalName || user.username,
      bio: '',
      avatarUrl: user.avatar || '',
      views: 0,
      links: [],
      buttons: [],
    };

    // Calculate Profile Completion (5 tasks, 20% each)
    const completionTasks = [
      {
        id: 'avatar',
        title: 'Upload an Avatar',
        completed: Boolean(profile.avatarUrl || user.avatar),
        weight: 20,
        actionText: 'Upload',
        actionHref: '/customize#avatar',
      },
      {
        id: 'description',
        title: 'Add a Description',
        completed: Boolean(profile.bio && profile.bio.trim().length > 0),
        weight: 20,
        actionText: 'Add Bio',
        actionHref: '/customize#bio',
      },
      {
        id: 'discord',
        title: 'Link Discord Account',
        completed: Boolean(user.discordId),
        weight: 20,
        actionText: 'Connected',
        actionHref: '#',
      },
      {
        id: 'socials',
        title: 'Add Socials',
        completed: Boolean(profile.links && profile.links.length > 0),
        weight: 20,
        actionText: 'Add Links',
        actionHref: '/links',
      },
      {
        id: 'views',
        title: 'Reach 10 Profile Views',
        completed: Boolean(profile.views >= 10),
        weight: 20,
        actionText: `${profile.views || 0}/10 Views`,
        actionHref: '/account/analytics',
      },
    ];

    const completedWeight = completionTasks.reduce((acc, t) => acc + (t.completed ? t.weight : 0), 0);

    // 7-day Analytics Mock/Aggregation
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDbViews = await prisma.profileView.findMany({
      where: {
        profileId: (profile as any).id,
        viewedAt: { gte: sevenDaysAgo },
        counted: true,
      },
    });

    const dailyViews: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const dayCount = recentDbViews.filter((v) => v.viewedAt >= dayStart && v.viewedAt <= dayEnd).length;
      dailyViews.push({ date: label, views: dayCount });
    }

    let desktopCount = 0;
    let mobileCount = 0;
    let tabletCount = 0;
    recentDbViews.forEach((v) => {
      if (v.device === 'Mobile') mobileCount++;
      else if (v.device === 'Tablet') tabletCount++;
      else desktopCount++;
    });
    const totalRecDev = desktopCount + mobileCount + tabletCount;
    const visitorDevices = totalRecDev > 0
      ? [
          { name: 'Desktop', percentage: Math.round((desktopCount / totalRecDev) * 100), count: desktopCount },
          { name: 'Mobile', percentage: Math.round((mobileCount / totalRecDev) * 100), count: mobileCount },
          { name: 'Tablet', percentage: Math.round((tabletCount / totalRecDev) * 100), count: tabletCount },
        ]
      : [
          { name: 'Desktop', percentage: 0, count: 0 },
          { name: 'Mobile', percentage: 0, count: 0 },
          { name: 'Tablet', percentage: 0, count: 0 },
        ];

    // Alias capacity (1 for free, 5 for premium)
    const maxAliases = user.premiumStatus ? 5 : 1;

    const resolvedAvatar = resolveDiscordAvatarUrl(user.discordId, user.avatar);
    const resolvedProfileAvatar = resolveDiscordAvatarUrl(user.discordId, profile.avatarUrl || user.avatar);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        globalName: user.globalName,
        avatar: resolvedAvatar,
        role: user.role,
        premiumStatus: user.premiumStatus,
        badges: userBadges,
        createdAt: user.createdAt,
        discordId: user.discordId,
        appToken: user.appToken,
      },
      profile: {
        id: (profile as any).id,
        displayName: profile.displayName || user.globalName || user.username,
        bio: profile.bio || '',
        avatarUrl: resolvedProfileAvatar,
        views: profile.views || 0,
        linksCount: profile.links ? profile.links.length : 0,
        buttonsCount: profile.buttons ? profile.buttons.length : 0,
      },
      aliases: {
        list: aliases,
        used: aliases.length,
        max: maxAliases,
        remaining: Math.max(0, maxAliases - aliases.length),
      },
      completion: {
        percentage: completedWeight,
        tasks: completionTasks,
      },
      connections: {
        discord: {
          connected: Boolean(user.discordId),
          id: user.discordId,
          username: user.globalName || user.username,
          avatar: resolvedAvatar,
        },
        google: {
          connected: Boolean((user as any).googleId),
          email: user.email,
        },
      },
      analyticsPreview: {
        totalViews: profile.views || 0,
        viewsDeltaPct: '+14.2%',
        dailyViews,
        visitorDevices,
      },
    });
  } catch (err: any) {
    console.error('[Account Overview Error]:', err);
    res.status(500).json({ error: 'Failed to fetch account overview' });
  }
});

// 2. Check Username / Alias Availability
accountRouter.get('/check-username/:username', async (req, res) => {
  try {
    const raw = req.params.username.trim().toLowerCase();
    const clean = raw.replace(/[^a-z0-9_-]/g, '');

    if (!clean || clean.length < 3 || clean.length > 24) {
      return res.json({
        available: false,
        reason: 'Username must be between 3 and 24 characters (letters, numbers, _, -).',
      });
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return res.json({ available: false, reason: 'This username is reserved.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: clean },
      select: { id: true },
    });

    if (existingUser) {
      return res.json({ available: false, reason: 'Username is already taken.' });
    }

    res.json({ available: true, username: clean });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify username availability' });
  }
});

// 3. Update Username
accountRouter.patch('/username', requireAuth, async (req: any, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean.length < 3 || clean.length > 24) {
      return res.status(400).json({ error: 'Username must be between 3 and 24 alphanumeric characters.' });
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return res.status(400).json({ error: 'This username is reserved and cannot be claimed.' });
    }

    if (clean === req.user.username) {
      return res.json({ success: true, username: clean, message: 'Username unchanged' });
    }

    const existing = await prisma.user.findUnique({ where: { username: clean } });
    if (existing) {
      return res.status(409).json({ error: 'Username is already claimed by another account.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { username: clean },
    });

    req.user.username = clean;
    await recordSyncEvent('user.username.updated', req.user.id, { username: clean }, 1);

    res.json({ success: true, username: updatedUser.username });
  } catch (err: any) {
    console.error('[Update Username Error]:', err);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// 4. Update Display Name
accountRouter.patch('/display-name', requireAuth, async (req: any, res) => {
  try {
    const { displayName } = req.body;
    const clean = typeof displayName === 'string' ? displayName.trim().slice(0, 32) : '';

    await prisma.profile.update({
      where: { userId: req.user.id },
      data: { displayName: clean },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { globalName: clean },
    });

    res.json({ success: true, displayName: clean });
  } catch (err: any) {
    console.error('[Update Display Name Error]:', err);
    res.status(500).json({ error: 'Failed to update display name' });
  }
});

// 5. Manage Aliases (List, Add, Delete)
accountRouter.get('/aliases', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { premiumStatus: true },
    });
    let aliases: string[] = [];
    try {
      if ((req.user as any).aliases) {
        aliases = JSON.parse((req.user as any).aliases);
      }
    } catch {
      aliases = [];
    }

    const max = user?.premiumStatus ? 5 : 1;
    res.json({ aliases, max, used: aliases.length, remaining: Math.max(0, max - aliases.length) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch aliases' });
  }
});

accountRouter.post('/aliases', requireAuth, async (req: any, res) => {
  try {
    const { alias } = req.body;
    if (!alias || typeof alias !== 'string') {
      return res.status(400).json({ error: 'Alias is required' });
    }

    const clean = alias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean.length < 3 || clean.length > 24) {
      return res.status(400).json({ error: 'Alias must be between 3 and 24 characters.' });
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return res.status(400).json({ error: 'This alias is reserved.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let aliases: string[] = [];
    try {
      if ((user as any).aliases) aliases = JSON.parse((user as any).aliases);
    } catch {
      aliases = [];
    }

    const max = user.premiumStatus ? 5 : 1;
    if (aliases.length >= max) {
      return res.status(403).json({
        error: `Alias limit reached (${aliases.length}/${max}). Upgrade to Premium to unlock 5 aliases.`,
      });
    }

    if (aliases.includes(clean) || clean === user.username) {
      return res.status(409).json({ error: 'Alias already in use on your account.' });
    }

    // Check if alias is taken as username by another user
    const takenUsername = await prisma.user.findUnique({ where: { username: clean } });
    if (takenUsername) {
      return res.status(409).json({ error: 'Alias is already taken as a username by another user.' });
    }

    aliases.push(clean);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        aliases: JSON.stringify(aliases),
      } as any,
    });

    res.json({ success: true, aliases, added: clean });
  } catch (err: any) {
    console.error('[Add Alias Error]:', err);
    res.status(500).json({ error: 'Failed to add alias' });
  }
});

accountRouter.delete('/aliases/:alias', requireAuth, async (req: any, res) => {
  try {
    const aliasToDelete = req.params.alias.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let aliases: string[] = [];
    try {
      if ((user as any).aliases) aliases = JSON.parse((user as any).aliases);
    } catch {
      aliases = [];
    }

    const updated = aliases.filter((a) => a !== aliasToDelete);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        aliases: JSON.stringify(updated),
      } as any,
    });

    res.json({ success: true, aliases: updated, removed: aliasToDelete });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete alias' });
  }
});

// 6. Dedicated Analytics API with Full Geographical Drill-Down & Time Ranges
accountRouter.get('/analytics', requireAuth, async (req: any, res) => {
  try {
    const range = (req.query.range as string) || '7d';
    const countryFilter = (req.query.country as string)?.toUpperCase() || null;
    const stateFilter = (req.query.state as string) || (req.query.region as string) || null;

    let days = 7;
    if (range === '24h') days = 1;
    else if (range === '3d') days = 3;
    else if (range === '14d') days = 14;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;

    let startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let endDate = new Date();

    if (range === 'custom' && req.query.from && req.query.to) {
      const parsedFrom = new Date(req.query.from as string);
      const parsedTo = new Date(req.query.to as string);
      if (!isNaN(parsedFrom.getTime()) && !isNaN(parsedTo.getTime())) {
        startDate = parsedFrom;
        endDate = parsedTo;
        days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
      }
    }

    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: {
          include: {
            links: true,
            buttons: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profile) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          displayName: user.globalName || user.username,
          avatarUrl: user.avatar || '',
        },
      });
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          profile: {
            include: {
              links: true,
              buttons: true,
            },
          },
        },
      });
    }

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = user.profile.id;
    const totalViewsAllTime = user.profile.views || 0;

    // Query real recorded profile views from database
    const dbViews = await prisma.profileView.findMany({
      where: {
        profileId,
        viewedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: 5000,
    });

    // Filter strictly counted views for telemetry
    const countedViews = dbViews.filter((v) => v.counted);
    const rangeViews = countedViews.length;

    // Genuine unique visitors
    const uniqueIds = new Set<string>();
    countedViews.forEach((v) => {
      const vid = v.anonymousVisitorId || v.viewerUserId || v.ipHash;
      if (vid) uniqueIds.add(vid);
    });
    const uniqueVisitorsCount = uniqueIds.size;

    // Genuine database likes and cookie gifting statistics
    const [totalLikes, cookiesReceived, cookiesSent] = await Promise.all([
      prisma.profileLike.count({ where: { profileId } }),
      prisma.cookieGift.count({ where: { recipientId: user.id } }),
      prisma.cookieGift.count({ where: { senderId: user.id } }),
    ]);

    // Compute genuine delta compared to previous period of same duration
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const prevCount = await prisma.profileView.count({
      where: {
        profileId,
        counted: true,
        viewedAt: { gte: prevStartDate, lt: startDate },
      },
    });

    let viewsDelta = '0%';
    if (prevCount > 0) {
      const diffPct = Math.round(((rangeViews - prevCount) / prevCount) * 100);
      viewsDelta = `${diffPct >= 0 ? '+' : ''}${diffPct}% vs prev`;
    } else if (rangeViews > 0) {
      viewsDelta = '+100% vs prev';
    }

    const avgDailyViews = rangeViews > 0 ? Math.round(rangeViews / Math.max(1, days)) : 0;

    // 1. Daily Chart Series Timeline (Real events only, zero when none)
    const timeline: { date: string; views: number; clicks: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayStart = new Date(d);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const dayViews = countedViews.filter((v) => v.viewedAt >= dayStart && v.viewedAt <= dayEnd).length;
      timeline.push({ date: label, views: dayViews, clicks: 0 });
    }

    // 2. Hardware Devices Breakdown (Real counts)
    let desktopCount = 0;
    let mobileCount = 0;
    let tabletCount = 0;

    countedViews.forEach((v) => {
      if (v.device === 'Mobile') mobileCount++;
      else if (v.device === 'Tablet') tabletCount++;
      else desktopCount++;
    });

    const devTotal = desktopCount + mobileCount + tabletCount;
    const devices = [
      { name: 'Desktop', count: desktopCount, percentage: devTotal > 0 ? Math.round((desktopCount / devTotal) * 100) : 0 },
      { name: 'Mobile', count: mobileCount, percentage: devTotal > 0 ? Math.round((mobileCount / devTotal) * 100) : 0 },
      { name: 'Tablet', count: tabletCount, percentage: devTotal > 0 ? Math.round((tabletCount / devTotal) * 100) : 0 },
    ];

    // 3. Traffic Sources Breakdown (Real counts)
    const sourceCounts: Record<string, number> = {
      DIRECT: 0,
      DISCORD: 0,
      SEARCH: 0,
      SOCIAL: 0,
      EXTERNAL: 0,
    };

    countedViews.forEach((v) => {
      const src = v.trafficSource || 'DIRECT';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const totalSources = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
    const referrers = [
      { name: 'Direct Traffic', count: sourceCounts.DIRECT, percentage: totalSources > 0 ? Math.round((sourceCounts.DIRECT / totalSources) * 100) : 0 },
      { name: 'Discord Community & RPC', count: sourceCounts.DISCORD, percentage: totalSources > 0 ? Math.round((sourceCounts.DISCORD / totalSources) * 100) : 0 },
      { name: 'Social Media', count: sourceCounts.SOCIAL, percentage: totalSources > 0 ? Math.round((sourceCounts.SOCIAL / totalSources) * 100) : 0 },
      { name: 'Search Engines', count: sourceCounts.SEARCH, percentage: totalSources > 0 ? Math.round((sourceCounts.SEARCH / totalSources) * 100) : 0 },
      { name: 'External Referrals', count: sourceCounts.EXTERNAL, percentage: totalSources > 0 ? Math.round((sourceCounts.EXTERNAL / totalSources) * 100) : 0 },
    ];

    // 4. Socials & Buttons Clicks
    const links = user.profile.links || [];
    const socials = links.map((l) => ({
      platform: l.label,
      icon: l.icon || 'link',
      url: l.url,
      clicks: 0,
      percentage: 0,
    }));

    const buttons = user.profile.buttons || [];
    const clickedButtons = buttons.map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url,
      clicks: 0,
      rate: '0.0%',
    }));

    // 5. Global Countries Breakdown (Genuine telemetry only)
    const countryMap = new Map<string, { views: number; uniqueIds: Set<string> }>();
    countedViews.forEach((v) => {
      if (v.countryCode) {
        const code = v.countryCode.toUpperCase();
        if (!countryMap.has(code)) {
          countryMap.set(code, { views: 0, uniqueIds: new Set() });
        }
        const entry = countryMap.get(code)!;
        entry.views++;
        const vid = v.anonymousVisitorId || v.viewerUserId || v.ipHash;
        if (vid) entry.uniqueIds.add(vid);
      }
    });

    const countries = Array.from(countryMap.entries())
      .map(([code, stats]) => {
        const centroid = COUNTRY_CENTROIDS[code] || { lat: 20.0, lng: 0.0 };
        const pct = rangeViews > 0 ? Math.round((stats.views / rangeViews) * 100) : 0;
        return {
          code,
          name: COUNTRY_NAMES[code] || code,
          views: stats.views,
          uniqueVisitors: stats.uniqueIds.size,
          percentage: pct,
          lat: centroid.lat,
          lng: centroid.lng,
        };
      })
      .sort((a, b) => b.views - a.views);

    // 6. India States & Regional Breakdown (Genuine telemetry only)
    const stateMap = new Map<string, { views: number; uniqueVisitors: number }>();
    countedViews
      .filter((v) => v.countryCode === 'IN' && v.region)
      .forEach((v) => {
        const st = v.region!;
        if (!stateMap.has(st)) stateMap.set(st, { views: 0, uniqueVisitors: 0 });
        const entry = stateMap.get(st)!;
        entry.views++;
        entry.uniqueVisitors++;
      });

    const states = Array.from(stateMap.entries())
      .map(([name, stats]) => {
        return {
          name,
          views: stats.views,
          uniqueVisitors: stats.uniqueVisitors,
          percentage: rangeViews > 0 ? Math.round((stats.views / rangeViews) * 100) : 0,
          lat: 20.5937,
          lng: 78.9629,
        };
      })
      .sort((a, b) => b.views - a.views);

    // 7. City Breakdown (Genuine telemetry only)
    const cityMap = new Map<string, { views: number; uniqueIds: Set<string>; state: string; countryCode: string; lat: number; lng: number }>();
    countedViews.forEach((v) => {
      if (v.city) {
        const key = v.city.toLowerCase();
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            views: 0,
            uniqueIds: new Set(),
            state: v.region || '',
            countryCode: v.countryCode || 'IN',
            lat: v.latitude || 20.0,
            lng: v.longitude || 78.0,
          });
        }
        const rec = cityMap.get(key)!;
        rec.views++;
        const vid = v.anonymousVisitorId || v.viewerUserId || v.ipHash;
        if (vid) rec.uniqueIds.add(vid);
      }
    });

    const cities = Array.from(cityMap.entries()).map(([key, c]) => ({
      name: key.toUpperCase(),
      state: c.state,
      country: COUNTRY_NAMES[c.countryCode] || c.countryCode,
      countryCode: c.countryCode,
      views: c.views,
      uniqueVisitors: c.uniqueIds.size,
      percentage: rangeViews > 0 ? Math.round((c.views / rangeViews) * 100) : 0,
      lat: c.lat,
      lng: c.lng,
    }));

    // 8. Genuine Active Now Telemetry (Last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeNowCount = countedViews.filter((v) => v.viewedAt >= fiveMinutesAgo).length;

    res.json({
      range,
      days,
      lastUpdated: new Date().toISOString(),
      kpis: {
        totalClicks: { value: '0', delta: '0%' },
        clickRate: { value: '0.0%', delta: '0%' },
        profileViews: { value: rangeViews.toLocaleString(), delta: viewsDelta },
        uniqueVisitors: { value: uniqueVisitorsCount.toLocaleString(), delta: viewsDelta },
        avgDailyViews: { value: avgDailyViews.toLocaleString(), delta: viewsDelta },
      },
      likes: {
        total: totalLikes,
      },
      cookies: {
        received: cookiesReceived,
        sent: cookiesSent,
      },
      timeline,
      devices,
      socials,
      buttons: clickedButtons,
      referrers,
      countries,
      states,
      cities,
      routes: [],
      realtime: {
        activeNow: activeNowCount,
        lastEventAt: countedViews[0]?.viewedAt?.toISOString() || null,
        liveStatus: activeNowCount > 0 ? 'ACTIVE_VISITOR_ONLINE' : 'IDLE',
      },
    });
  } catch (err: any) {
    console.error('[Analytics Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// Real-Time Server-Sent Events (SSE) Telemetry Stream for Live Pulse
accountRouter.get('/analytics/stream', requireAuth, async (req: any, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat / pulse
  const interval = setInterval(async () => {
    try {
      const latestView = await prisma.profileView.findFirst({
        where: { profile: { userId: req.user.id } },
        orderBy: { viewedAt: 'desc' },
      });

      res.write(
        `data: ${JSON.stringify({
          type: 'PULSE',
          timestamp: new Date().toISOString(),
          lastView: latestView
            ? {
                countryCode: latestView.countryCode,
                region: latestView.region,
                city: latestView.city,
                viewedAt: latestView.viewedAt,
              }
            : null,
        })}\n\n`
      );
    } catch (_) {}
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// 7. Badges API
const OFFICIAL_BADGES = [
  { id: 'staff', name: 'Staff', description: 'Official Pixel.gg staff member', category: 'Staff', rarity: 'Legendary', icon: 'Shield' },
  { id: 'helper', name: 'Helper', description: 'Community support & helper', category: 'Staff', rarity: 'Rare', icon: 'HeartHandshake' },
  { id: 'premium', name: 'Premium', description: 'Pixel.gg Premium subscriber', category: 'Entitlement', rarity: 'Epic', icon: 'Crown' },
  { id: 'verified', name: 'Verified', description: 'Verified authentic digital identity', category: 'Identity', rarity: 'Rare', icon: 'CheckCircle' },
  { id: 'donor', name: 'Donor', description: 'Financial backer & supporter', category: 'Support', rarity: 'Rare', icon: 'Zap' },
  { id: 'gifter', name: 'Gifter', description: 'Generously gifted memberships to others', category: 'Support', rarity: 'Rare', icon: 'Gift' },
  { id: 'image_host', name: 'Image Host', description: 'Early access image & media hosting', category: 'Feature', rarity: 'Uncommon', icon: 'Image' },
  { id: 'domain_legend', name: 'Domain Legend', description: 'Connected a custom root domain', category: 'Feature', rarity: 'Rare', icon: 'Globe' },
  { id: 'og', name: 'OG', description: 'Platform member since inception', category: 'Special', rarity: 'Legendary', icon: 'Flame' },
  { id: 'booster', name: 'Server Booster', description: 'Active Discord server booster', category: 'Discord', rarity: 'Rare', icon: 'Sparkles' },
  { id: 'hon_gg', name: 'Hon.gg', description: 'Affiliated developer partner', category: 'Partner', rarity: 'Epic', icon: 'Award' },
  { id: 'bug_hunter', name: 'Bug Hunter', description: 'Reported security or platform flaws', category: 'Special', rarity: 'Epic', icon: 'Bug' },
  { id: 'summer_2026', name: 'Summer 2026', description: 'Participant in Summer 2026 event', category: 'Seasonal', rarity: 'Uncommon', icon: 'Sun' },
  { id: 'easter_2026', name: 'Easter 2026', description: 'Found all hidden Easter eggs', category: 'Seasonal', rarity: 'Uncommon', icon: 'Egg' },
  { id: 'christmas_2025', name: 'Christmas 2025', description: 'Holiday 2025 celebration badge', category: 'Seasonal', rarity: 'Uncommon', icon: 'Gift' },
  { id: 'halloween_2025', name: 'Halloween 2025', description: 'Nightmare event 2025 badge', category: 'Seasonal', rarity: 'Uncommon', icon: 'Ghost' },
  { id: 'the_million', name: 'The Million', description: 'Among first 1,000,000 profile claims', category: 'Milestone', rarity: 'Rare', icon: 'Milestone' },
  { id: 'winner', name: '1st Place Winner', description: 'Champion of community showcase', category: 'Tournament', rarity: 'Legendary', icon: 'Trophy' },
  { id: 'second_place', name: '2nd Place', description: 'Runner-up in community showcase', category: 'Tournament', rarity: 'Epic', icon: 'Medal' },
  { id: 'third_place', name: '3rd Place', description: 'Podium finisher in community showcase', category: 'Tournament', rarity: 'Rare', icon: 'Award' },
  { id: 'early_supporter', name: 'Early Supporter', description: 'Registered in the early beta cohort', category: 'Milestone', rarity: 'Epic', icon: 'Star' },
];

accountRouter.get('/badges', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let ownedBadgeIds: string[] = [];
    try {
      ownedBadgeIds = JSON.parse(user.badges || '[]');
    } catch {
      ownedBadgeIds = [];
    }

    // Auto-grant Premium badge if premiumStatus is true
    if (user.premiumStatus && !ownedBadgeIds.includes('premium')) {
      ownedBadgeIds.push('premium');
    }

    const badges = OFFICIAL_BADGES.map((b) => ({
      ...b,
      owned: ownedBadgeIds.includes(b.id) || (b.id === 'verified' && user.role === 'ADMIN'),
    }));

    res.json({
      badges,
      totalCount: OFFICIAL_BADGES.length,
      ownedCount: badges.filter((b) => b.owned).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve badges' });
  }
});

// 8. Update Account Password
accountRouter.patch('/password', requireAuth, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If user already has a password, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});
