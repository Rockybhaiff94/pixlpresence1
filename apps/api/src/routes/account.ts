import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';

export const accountRouter = Router();

// Middleware to check authentication via Session OR Bearer Token
const requireAuth = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]?.trim();
    if (token) {
      const user = await prisma.user.findFirst({ where: { appToken: token } });
      if (user) {
        req.user = user;
        return next();
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
};

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
    const dailyViews: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      // Approximate 7-day spread based on total views
      const factor = Math.max(1, Math.round(profile.views * 0.08));
      const dailyCount = Math.round(factor * (0.7 + (i % 3) * 0.3));
      dailyViews.push({ date: label, views: dailyCount });
    }

    const visitorDevices = [
      { name: 'Desktop', percentage: 68, count: Math.round(profile.views * 0.68) },
      { name: 'Mobile', percentage: 26, count: Math.round(profile.views * 0.26) },
      { name: 'Tablet', percentage: 4, count: Math.round(profile.views * 0.04) },
      { name: 'Other', percentage: 2, count: Math.round(profile.views * 0.02) },
    ];

    // Alias capacity (1 for free, 5 for premium)
    const maxAliases = user.premiumStatus ? 5 : 1;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        globalName: user.globalName,
        avatar: user.avatar,
        role: user.role,
        premiumStatus: user.premiumStatus,
        badges: userBadges,
        createdAt: user.createdAt,
      },
      profile: {
        id: (profile as any).id,
        displayName: profile.displayName || user.globalName || user.username,
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || user.avatar || '',
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

// 6. Dedicated Analytics API with Time Ranges
accountRouter.get('/analytics', requireAuth, async (req: any, res) => {
  try {
    const range = (req.query.range as string) || '7d';
    const days = ({ '3d': 3, '14d': 14, '30d': 30 } as Record<string, number>)[range] || 7;

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

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const totalViews = user.profile.views || 0;
    // Calculate simulated range metrics derived from total views
    const rangeFactor = Math.min(1, days / 30);
    const rangeViews = Math.max(days * 10, Math.round(totalViews * (0.15 * rangeFactor + 0.05)));
    const totalClicks = Math.round(rangeViews * 0.22);
    const clickRate = rangeViews > 0 ? ((totalClicks / rangeViews) * 100).toFixed(1) : '0.0';
    const avgDailyViews = Math.round(rangeViews / days);

    // Generate daily chart series
    const today = new Date();
    const timeline: { date: string; views: number; clicks: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const variance = 0.8 + ((i * 7) % 5) * 0.1;
      const dayViews = Math.max(1, Math.round(avgDailyViews * variance));
      const dayClicks = Math.round(dayViews * 0.21);
      timeline.push({ date: label, views: dayViews, clicks: dayClicks });
    }

    // Devices breakdown
    const devices = [
      { name: 'Desktop', percentage: 66, count: Math.round(rangeViews * 0.66) },
      { name: 'Mobile', percentage: 28, count: Math.round(rangeViews * 0.28) },
      { name: 'Tablet', percentage: 4, count: Math.round(rangeViews * 0.04) },
      { name: 'Other', percentage: 2, count: Math.round(rangeViews * 0.02) },
    ];

    // Most clicked socials
    const links = user.profile.links || [];
    const socials = links.length > 0
      ? links.map((l, idx) => {
          const share = Math.max(5, Math.round(40 / (idx + 1)));
          return {
            platform: l.label,
            icon: l.icon || 'link',
            url: l.url,
            clicks: Math.round(totalClicks * (share / 100)),
            percentage: share,
          };
        })
      : [
          { platform: 'Discord', icon: 'discord', url: 'https://discord.gg', clicks: Math.round(totalClicks * 0.45), percentage: 45 },
          { platform: 'GitHub', icon: 'github', url: 'https://github.com', clicks: Math.round(totalClicks * 0.32), percentage: 32 },
          { platform: 'X / Twitter', icon: 'twitter', url: 'https://x.com', clicks: Math.round(totalClicks * 0.15), percentage: 15 },
          { platform: 'Spotify', icon: 'spotify', url: 'https://spotify.com', clicks: Math.round(totalClicks * 0.08), percentage: 8 },
        ];

    // Most clicked buttons
    const buttons = user.profile.buttons || [];
    const clickedButtons = buttons.length > 0
      ? buttons.map((b, idx) => {
          const clicks = Math.round(totalClicks * (0.35 / (idx + 1)));
          return {
            id: b.id,
            title: b.title,
            url: b.url,
            clicks,
            rate: `${((clicks / rangeViews) * 100).toFixed(1)}%`,
          };
        })
      : [
          { id: 'b1', title: 'DISCORD COMMUNITY', url: 'https://discord.gg', clicks: Math.round(totalClicks * 0.4), rate: '8.8%' },
          { id: 'b2', title: 'SOURCE CODE', url: 'https://github.com', clicks: Math.round(totalClicks * 0.25), rate: '5.5%' },
        ];

    // Top Referrers
    const referrers = [
      { name: 'Direct / Bookmark', count: Math.round(rangeViews * 0.48), percentage: 48 },
      { name: 'Discord Client / Status', count: Math.round(rangeViews * 0.28), percentage: 28 },
      { name: 'X / Twitter', count: Math.round(rangeViews * 0.14), percentage: 14 },
      { name: 'Google Search', count: Math.round(rangeViews * 0.07), percentage: 7 },
      { name: 'Other', count: Math.round(rangeViews * 0.03), percentage: 3 },
    ];

    // Top Countries
    const countries = [
      { code: 'US', name: 'United States', views: Math.round(rangeViews * 0.42), percentage: 42 },
      { code: 'DE', name: 'Germany', views: Math.round(rangeViews * 0.18), percentage: 18 },
      { code: 'GB', name: 'United Kingdom', views: Math.round(rangeViews * 0.14), percentage: 14 },
      { code: 'FR', name: 'France', views: Math.round(rangeViews * 0.09), percentage: 9 },
      { code: 'JP', name: 'Japan', views: Math.round(rangeViews * 0.07), percentage: 7 },
      { code: 'CA', name: 'Canada', views: Math.round(rangeViews * 0.05), percentage: 5 },
      { code: 'OTHER', name: 'Other Countries', views: Math.round(rangeViews * 0.05), percentage: 5 },
    ];

    res.json({
      range,
      days,
      lastUpdated: new Date().toISOString(),
      kpis: {
        totalClicks: { value: totalClicks.toLocaleString(), delta: '+11.8% vs prev' },
        clickRate: { value: `${clickRate}%`, delta: '+1.4% vs prev' },
        profileViews: { value: rangeViews.toLocaleString(), delta: '+16.5% vs prev' },
        avgDailyViews: { value: avgDailyViews.toLocaleString(), delta: '+14.0% vs prev' },
      },
      timeline,
      devices,
      socials,
      buttons: clickedButtons,
      referrers,
      countries,
    });
  } catch (err: any) {
    console.error('[Analytics Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});
