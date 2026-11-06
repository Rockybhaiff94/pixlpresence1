import { Router } from 'express';
import { prisma } from '@discord-rpc/database';
import { recordSyncEvent } from '../utils/sync';

export const guildRouter = Router();

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

// Update Guild Configuration
guildRouter.patch('/:guildId', async (req: any, res) => {
  try {
    const { guildId } = req.params;
    const { embedColor, footer, profileChannel, allowedChannels, featureSettings, theme } = req.body;

    const updated = await prisma.guildConfiguration.upsert({
      where: { guildId },
      create: {
        guildId,
        embedColor: embedColor || '#8b5cf6',
        footer: footer || 'Pixel.gg Profile Platform',
        profileChannel: profileChannel || null,
        allowedChannels: allowedChannels ? JSON.stringify(allowedChannels) : '[]',
        featureSettings: featureSettings ? JSON.stringify(featureSettings) : '{}',
        theme: theme || 'default',
      },
      update: {
        ...(embedColor !== undefined ? { embedColor } : {}),
        ...(footer !== undefined ? { footer } : {}),
        ...(profileChannel !== undefined ? { profileChannel } : {}),
        ...(allowedChannels !== undefined ? { allowedChannels: typeof allowedChannels === 'string' ? allowedChannels : JSON.stringify(allowedChannels) } : {}),
        ...(featureSettings !== undefined ? { featureSettings: typeof featureSettings === 'string' ? featureSettings : JSON.stringify(featureSettings) } : {}),
        ...(theme !== undefined ? { theme } : {}),
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

