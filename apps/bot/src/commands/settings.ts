import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { prisma } from '@discord-rpc/database';
import { FRONTEND_BASE_URL } from '../utils/profileCard';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure your Pixel.gg profile or server integration settings')
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Manage your personal Pixel.gg profile settings')
    )
    .addSubcommand(sub =>
      sub.setName('server')
        .setDescription('Manage PixelBot settings for this server (Admins only)')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand() || 'user';

    // 1. User Settings Subcommand
    if (subcommand === 'user') {
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { profile: true },
      });

      if (!user || !user.profile) {
        const connectBtn = new ButtonBuilder()
          .setLabel('Connect Pixel.gg Account')
          .setURL(`${FRONTEND_BASE_URL}/dashboard`)
          .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(connectBtn);

        return interaction.reply({
          content: 'You do not have a connected Pixel.gg account yet. Click below to link your account!',
          components: [row],
          ephemeral: true,
        });
      }

      const p = user.profile;
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Personal Pixel.gg Settings')
        .setColor('#8b5cf6')
        .setDescription('Manage your connected identity and profile configuration.')
        .addFields(
          { name: 'Username', value: `@${user.username}`, inline: true },
          { name: 'Display Name', value: p.displayName || user.username, inline: true },
          { name: 'Status', value: p.status, inline: true },
          { name: 'Visibility', value: p.visibility, inline: true },
          { name: 'Profile Version', value: `v${p.profileVersion}`, inline: true },
          { name: 'Connected Since', value: new Date(user.createdAt).toLocaleDateString(), inline: true }
        )
        .setFooter({ text: 'Use the web dashboard for advanced visual layers & customization.' });

      const manageBtn = new ButtonBuilder()
        .setLabel('Open Web Dashboard')
        .setURL(`${FRONTEND_BASE_URL}/dashboard`)
        .setStyle(ButtonStyle.Link);

      const refreshBtn = new ButtonBuilder()
        .setCustomId(`refresh_profile:${interaction.user.id}`)
        .setLabel('View My Profile')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(manageBtn, refreshBtn);

      const statusMenu = new StringSelectMenuBuilder()
        .setCustomId('quick_status_select')
        .setPlaceholder('Quick Status Change...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Online').setValue('ONLINE').setEmoji('🟢'),
          new StringSelectMenuOptionBuilder().setLabel('In-Game').setValue('IN_GAME').setEmoji('🎮'),
          new StringSelectMenuOptionBuilder().setLabel('Away').setValue('AWAY').setEmoji('🟡'),
          new StringSelectMenuOptionBuilder().setLabel('Offline').setValue('OFFLINE').setEmoji('⚪')
        );

      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statusMenu);

      return interaction.reply({
        embeds: [embed],
        components: [menuRow, row],
        ephemeral: true,
      });
    }

    // 2. Server Settings Subcommand (Administrators only)
    if (subcommand === 'server') {
      if (!interaction.inGuild() || !interaction.guild) {
        return interaction.reply({
          content: 'Server settings can only be managed inside a Discord server.',
          ephemeral: true,
        });
      }

      // Check Discord administrator permissions
      const member = interaction.member;
      const permissions = interaction.memberPermissions;
      const hasAdmin = permissions?.has(PermissionsBitField.Flags.Administrator) || permissions?.has(PermissionsBitField.Flags.ManageGuild);

      if (!hasAdmin) {
        return interaction.reply({
          content: '⛔ You need the **Manage Server** or **Administrator** permission to configure PixelBot for this server.',
          ephemeral: true,
        });
      }

      // Fetch or create guild configuration
      let guildConfig = await prisma.guildConfiguration.findUnique({
        where: { guildId: interaction.guild.id },
      });

      if (!guildConfig) {
        guildConfig = await prisma.guildConfiguration.create({
          data: {
            guildId: interaction.guild.id,
            embedColor: '#8b5cf6',
            footer: `${interaction.guild.name} • Pixel.gg`,
            allowedChannels: '[]',
            featureSettings: '{}',
          },
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ PixelBot Settings — ${interaction.guild.name}`)
        .setColor((guildConfig.embedColor as any) || '#8b5cf6')
        .setDescription('Configure how Pixel.gg profiles and embeds are displayed in this server.')
        .addFields(
          { name: 'Embed Color', value: guildConfig.embedColor || '#8b5cf6', inline: true },
          { name: 'Custom Footer', value: guildConfig.footer || 'Default', inline: true },
          { name: 'Profile Channel', value: guildConfig.profileChannel ? `<#${guildConfig.profileChannel}>` : 'All Allowed Channels', inline: true },
          { name: 'Isolation Status', value: '✅ Dedicated Server Schema Active', inline: false }
        )
        .setFooter({ text: 'Changes here only affect this server.' });

      const appearanceBtn = new ButtonBuilder()
        .setCustomId('server_settings_appearance')
        .setLabel('Edit Embed Style')
        .setStyle(ButtonStyle.Primary);

      const resetBtn = new ButtonBuilder()
        .setCustomId('server_settings_reset')
        .setLabel('Reset Defaults')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(appearanceBtn, resetBtn);

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }
  },
};

