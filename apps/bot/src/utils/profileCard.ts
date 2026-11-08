import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';
import { prisma } from '@discord-rpc/database';

export const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'https://pixlpresence1-web.vercel.app';

export async function buildProfileResponse(targetDiscordId: string, requestingDiscordId: string, guildId?: string | null) {
  // 1. Fetch user & profile from database
  const user = await prisma.user.findUnique({
    where: { discordId: targetDiscordId },
    include: {
      profile: {
        include: { links: true, buttons: true }
      }
    }
  });

  // 2. Fetch Guild configuration if invoked inside a server
  let guildConfig = null;
  if (guildId) {
    guildConfig = await prisma.guildConfiguration.findUnique({
      where: { guildId }
    });
  }

  // Graceful handling if user has not connected their account
  if (!user || !user.profile) {
    const isSelf = targetDiscordId === requestingDiscordId;
    const connectButton = new ButtonBuilder()
      .setLabel('Connect Pixel.gg')
      .setURL(`${FRONTEND_BASE_URL}/account`)
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(connectButton);

    const embed = new EmbedBuilder()
      .setTitle('Profile Not Found')
      .setColor('#8b5cf6')
      .setDescription(
        isSelf
          ? `You have not connected your Discord account to **Pixel.gg** yet!\nClick below to connect and create your custom identity.`
          : `<@${targetDiscordId}> has not connected their Discord account to **Pixel.gg** yet.`
      );

    return {
      embeds: [embed],
      components: [row],
      isEphemeral: false,
    };
  }

  const p = user.profile;

  // 3. Privacy / Visibility check
  const isOwner = targetDiscordId === requestingDiscordId;
  if (p.visibility === 'PRIVATE' && !isOwner) {
    const embed = new EmbedBuilder()
      .setTitle(`${p.displayName || user.username}'s Profile`)
      .setColor('#6b7280')
      .setDescription('🔒 This user has set their Pixel.gg profile to **Private**.');
    return {
      embeds: [embed],
      components: [],
      isEphemeral: true,
    };
  }

  // 4. Resolve Colors and Styling
  const color = (p.accentColor || guildConfig?.embedColor || '#8b5cf6') as ColorResolvable;
  const profileUrl = `${FRONTEND_BASE_URL}/${user.username}`;

  // Status badge formatting
  const statusEmojiMap: Record<string, string> = {
    ONLINE: '🟢 Online',
    IN_GAME: '🎮 In-Game',
    AWAY: '🟡 Away',
    OFFLINE: '⚪ Offline',
  };
  const statusDisplay = statusEmojiMap[p.status] || p.status;

  const embed = new EmbedBuilder()
    .setTitle(`${p.displayName || user.username}`)
    .setURL(profileUrl)
    .setDescription(p.bio || '*No bio provided.*')
    .setThumbnail(p.avatarUrl || user.avatar ? (user.avatar?.startsWith('http') ? user.avatar : `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`) : null)
    .setColor(color)
    .addFields(
      { name: 'Status', value: statusDisplay, inline: true },
      { name: 'Username', value: `@${user.username}`, inline: true },
      { name: 'Profile Link', value: `[pixel.gg/${user.username}](${profileUrl})`, inline: true }
    );

  if (p.currentGame) {
    embed.addFields({ name: 'Current Game', value: p.currentGame, inline: true });
  }

  if (p.links && p.links.length > 0) {
    const validLinks = p.links
      .filter((l: any) => l.visibility !== false && l.url && l.url.startsWith('http'))
      .map((l: any) => `[${l.label || 'Link'}](${l.url})`);
    if (validLinks.length > 0) {
      embed.addFields({
        name: 'Socials',
        value: validLinks.slice(0, 5).join(' • '),
        inline: false,
      });
    }
  }

  // Guild or default footer
  const footerText = guildConfig?.footer || `Views: ${p.views} • Updated ${new Date(p.updatedAt).toLocaleDateString()}`;
  embed.setFooter({ text: footerText });

  // 5. Interactive Buttons
  const visitButton = new ButtonBuilder()
    .setLabel('Visit Profile')
    .setURL(profileUrl)
    .setStyle(ButtonStyle.Link);

  const refreshButton = new ButtonBuilder()
    .setCustomId(`refresh_profile:${targetDiscordId}`)
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Secondary);

  const manageButton = new ButtonBuilder()
    .setLabel('Manage Profile')
    .setURL(`${FRONTEND_BASE_URL}/account`)
    .setStyle(ButtonStyle.Link);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(visitButton, refreshButton, manageButton);

  return {
    embeds: [embed],
    components: [row],
    isEphemeral: false,
  };
}

