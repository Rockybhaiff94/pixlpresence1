import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '@discord-rpc/database';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change your Pixel.gg profile status')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Select your profile status')
        .setRequired(true)
        .addChoices(
          { name: '🟢 Online', value: 'ONLINE' },
          { name: '🎮 In-Game', value: 'IN_GAME' },
          { name: '🟡 Away', value: 'AWAY' },
          { name: '⚪ Offline', value: 'OFFLINE' }
        )
    )
    .addStringOption(option =>
      option.setName('game')
        .setDescription('The game you are playing (optional, for In-Game status)')
        .setRequired(false)
        .setMaxLength(64)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const selectedStatus = interaction.options.getString('status', true);
    const selectedGame = interaction.options.getString('game');

    // 1. Resolve user & profile
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return interaction.reply({
        content: '❌ You do not have a connected Pixel.gg account. Please connect your account first via the website dashboard.',
        ephemeral: true,
      });
    }

    // 2. Update Profile status and increment version
    const updated = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        status: selectedStatus,
        currentGame: selectedStatus === 'IN_GAME' ? (selectedGame || 'Playing a Game') : (selectedGame || null),
        profileVersion: { increment: 1 },
      },
    });

    // 3. Record synchronization event
    try {
      await prisma.synchronizationEvent.create({
        data: {
          eventType: 'player.status.updated',
          entityId: user.id,
          version: updated.profileVersion,
          payload: JSON.stringify({
            status: updated.status,
            currentGame: updated.currentGame,
            updatedVia: 'discord_bot',
          }),
          deliveryStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (e) {
      // Non-fatal logging
      console.error('[Status Sync Event Error]:', e);
    }

    const statusLabels: Record<string, string> = {
      ONLINE: '🟢 Online',
      IN_GAME: `🎮 In-Game ${updated.currentGame ? `(${updated.currentGame})` : ''}`,
      AWAY: '🟡 Away',
      OFFLINE: '⚪ Offline',
    };

    const embed = new EmbedBuilder()
      .setTitle('Status Updated')
      .setColor('#10b981')
      .setDescription(`Your Pixel.gg profile status is now set to **${statusLabels[selectedStatus]}**!`)
      .setFooter({ text: 'Changes are synchronized in real-time with your profile page.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

