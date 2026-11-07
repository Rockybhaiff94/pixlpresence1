import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';

export const profileRouter = Router();

// Public Profile Endpoint
profileRouter.get('/u/:username', async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
        profile: {
          include: { links: true, buttons: true }
        }
      }
    });

    if (!user || !user.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check visibility permissions
    const isOwner = req.user && req.user.id === user.id;
    if (user.profile.visibility === 'PRIVATE' && !isOwner) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Omit sensitive data
    const { email, appToken, ...safeUser } = user;
    res.json({ user: safeUser, profile: user.profile });
  } catch (err) {
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

// Simple in-memory rate limiting for views
const viewCache = new Set<string>();

// Track Profile View
profileRouter.post('/u/:username/view', async (req: any, res) => {
  try {
    const username = req.params.username;
    
    // Very basic IP + Username hashing for spam prevention
    // In production, use req.ip, but for local dev we might just use a generic identifier
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const viewKey = `${username}_${clientIp}`;

    if (viewCache.has(viewKey)) {
      return res.json({ success: true, message: 'View already counted' });
    }

    // Register view in cache (expires roughly never in this simple memory setup, or we could use node-cache)
    // For now, it just prevents F5 spam in a single session
    viewCache.add(viewKey);
    // Clear cache every hour to allow return visitors
    setTimeout(() => viewCache.delete(viewKey), 1000 * 60 * 60);

    const user = await prisma.user.findUnique({
      where: { username },
      select: { profile: { select: { id: true } } }
    });

    if (user && user.profile) {
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { views: { increment: 1 } }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track view' });
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
import crypto from 'crypto';

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
