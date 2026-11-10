import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';

export const guildRouter = Router();

// Middleware to enforce authentication
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
  return res.status(401).json({ error: 'Unauthorized: Authentication required to manage guild settings.' });
};

// Helper to verify guild management authorization
const canManageGuild = (req: any): boolean => {
  if (!req.user) return false;
  if (req.user.role === 'ADMIN') return true;
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '704548873145942076')
    .split(',')
    .map((id) => id.trim());
  if (req.user.discordId && adminIds.includes(req.user.discordId)) return true;
  return false;
};

// Get Guild Configuration (or return defaults)
guildRouter.get('/:guildId', async (req: any, res) => {
  try {
    const { guildId } = req.params;
    let config = await prisma.guildConfiguration.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = {
        id: '',
        guildId,
        theme: 'default',
        embedColor: '#8b5cf6',
        footer: 'Pixel.gg Profile Platform',
        profileChannel: null,
        allowedChannels: '[]',
        featureSettings: '{}',
        authorizedRoles: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guild settings' });
  }
});

// Update Guild Configuration (Strictly Protected)
guildRouter.patch('/:guildId', requireAuth, async (req: any, res) => {
  try {
    const { guildId } = req.params;

    if (!canManageGuild(req)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage this Discord guild configuration.',
      });
    }

    const { embedColor, footer, profileChannel, allowedChannels, featureSettings, theme } = req.body;

    // Validate and sanitize inputs
    const safeEmbedColor = typeof embedColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(embedColor.trim()) ? embedColor.trim() : undefined;
    const safeFooter = typeof footer === 'string' ? footer.trim().slice(0, 100) : undefined;
    const safeProfileChannel = typeof profileChannel === 'string' ? profileChannel.trim().slice(0, 32) : undefined;
    const safeTheme = typeof theme === 'string' ? theme.trim().slice(0, 32) : undefined;

    const updated = await prisma.guildConfiguration.upsert({
      where: { guildId },
      create: {
        guildId,
        embedColor: safeEmbedColor || '#8b5cf6',
        footer: safeFooter || 'Pixel.gg Profile Platform',
        profileChannel: safeProfileChannel || null,
        allowedChannels: allowedChannels ? JSON.stringify(allowedChannels) : '[]',
        featureSettings: featureSettings ? JSON.stringify(featureSettings) : '{}',
        theme: safeTheme || 'default',
      },
      update: {
        ...(safeEmbedColor !== undefined ? { embedColor: safeEmbedColor } : {}),
        ...(safeFooter !== undefined ? { footer: safeFooter } : {}),
        ...(safeProfileChannel !== undefined ? { profileChannel: safeProfileChannel } : {}),
        ...(allowedChannels !== undefined ? { allowedChannels: typeof allowedChannels === 'string' ? allowedChannels : JSON.stringify(allowedChannels) } : {}),
        ...(featureSettings !== undefined ? { featureSettings: typeof featureSettings === 'string' ? featureSettings : JSON.stringify(featureSettings) } : {}),
        ...(safeTheme !== undefined ? { theme: safeTheme } : {}),
      },
    });

    await recordSyncEvent('guild.settings.updated', guildId, {
      embedColor: updated.embedColor,
      footer: updated.footer,
      profileChannel: updated.profileChannel,
    });

    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update guild settings' });
  }
});

