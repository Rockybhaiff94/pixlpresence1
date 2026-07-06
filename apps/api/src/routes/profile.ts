import { Router } from 'express';
import { prisma } from '@discord-rpc/database';

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

    // Omit sensitive data
    const { email, appToken, ...safeUser } = user;
    res.json({ user: safeUser, profile: user.profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
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

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  next();
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

// Generate or Regenerate App Token
import crypto from 'crypto';

profileRouter.post('/me/token', requireAuth, async (req: any, res) => {
  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: req.user.id },
      data: { appToken: newToken }
    });
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
      data,
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
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
