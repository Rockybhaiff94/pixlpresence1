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

  // Fallback demo/session user if no session for development/preview
  const sessionUser = req.session?.passport?.user;
  if (sessionUser) {
    const user = await prisma.user.findUnique({ where: { id: sessionUser } });
    if (user) {
      req.user = user;
      return next();
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

    const completedWeight = completionTasks
      .filter((t) => t.completed)
      .reduce((acc, curr) => acc + curr.weight, 0);

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
