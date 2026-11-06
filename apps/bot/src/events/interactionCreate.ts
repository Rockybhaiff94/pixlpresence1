import {
  Events,
  Interaction,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@discord-rpc/database';
import { buildProfileResponse } from '../utils/profileCard';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = (interaction.client as any).commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Button: Refresh Profile
      if (customId.startsWith('refresh_profile:')) {
        const targetDiscordId = customId.split(':')[1];
        try {
          const response = await buildProfileResponse(
            targetDiscordId,
            interaction.user.id,
            interaction.guildId
          );

          await interaction.reply({
            content: '🔄 Profile refreshed with latest live data!',
            embeds: response.embeds,
            components: response.components,
            ephemeral: true,
          });
        } catch (err) {
          console.error('[Button Error] refresh_profile:', err);
          await interaction.reply({ content: 'Failed to refresh profile.', ephemeral: true });
        }
        return;
      }

      // Button: Server Settings Appearance Modal
      if (customId === 'server_settings_appearance') {
        if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
          return interaction.reply({ content: '⛔ Permission denied. You must have Manage Server permission.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_guild_appearance')
          .setTitle('Server Embed Appearance');

        const colorInput = new TextInputBuilder()
          .setCustomId('input_embed_color')
          .setLabel('Embed Accent Color (Hex, e.g. #8b5cf6)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('#8b5cf6')
          .setRequired(false)
          .setMaxLength(7);

        const footerInput = new TextInputBuilder()
          .setCustomId('input_footer')
          .setLabel('Custom Embed Footer Text')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('My Server • Pixel.gg')
          .setRequired(false)
          .setMaxLength(100);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
        return;
      }

      // Button: Reset Server Settings
      if (customId === 'server_settings_reset') {
        if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
          return interaction.reply({ content: '⛔ Permission denied. You must have Manage Server permission.', ephemeral: true });
        }

        await prisma.guildConfiguration.upsert({
          where: { guildId: interaction.guildId! },
          create: {
            guildId: interaction.guildId!,
            embedColor: '#8b5cf6',
            footer: `${interaction.guild?.name || 'Server'} • Pixel.gg`,
          },
          update: {
            embedColor: '#8b5cf6',
            footer: `${interaction.guild?.name || 'Server'} • Pixel.gg`,
            profileChannel: null,
            allowedChannels: '[]',
          },
        });

        return interaction.reply({
          content: '✅ Server settings have been reset to default values!',
          ephemeral: true,
        });
      }
    }

    // 3. Handle Select Menu Interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'quick_status_select') {
        const selectedStatus = interaction.values[0];
        const valid = ['ONLINE', 'IN_GAME', 'AWAY', 'OFFLINE'];
        if (!valid.includes(selectedStatus)) return;

        const user = await prisma.user.findUnique({
          where: { discordId: interaction.user.id },
          include: { profile: true },
        });

        if (!user || !user.profile) {
          return interaction.reply({ content: 'Profile not found.', ephemeral: true });
        }

        const updated = await prisma.profile.update({
          where: { userId: user.id },
          data: {
            status: selectedStatus,
            profileVersion: { increment: 1 },
          },
        });

        try {
          await prisma.synchronizationEvent.create({
            data: {
              eventType: 'player.status.updated',
              entityId: user.id,
              version: updated.profileVersion,
              payload: JSON.stringify({ status: selectedStatus }),
              deliveryStatus: 'PROCESSED',
              processedAt: new Date(),
            },
          });
        } catch (e) {}

        return interaction.reply({
          content: `✅ Your Pixel.gg status is now set to **${selectedStatus}**!`,
          ephemeral: true,
        });
      }
    }

    // 4. Handle Modal Submit Interactions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_guild_appearance') {
        if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
          return interaction.reply({ content: '⛔ Permission denied.', ephemeral: true });
        }

        const colorInput = interaction.fields.getTextInputValue('input_embed_color')?.trim();
        const footerInput = interaction.fields.getTextInputValue('input_footer')?.trim();

        // Validate hex color if provided
        let color = '#8b5cf6';
        if (colorInput) {
          const hexPattern = /^#[0-9A-Fa-f]{6}$/;
          if (hexPattern.test(colorInput)) {
            color = colorInput;
          }
        }

        const updated = await prisma.guildConfiguration.upsert({
          where: { guildId: interaction.guildId! },
          create: {
            guildId: interaction.guildId!,
            embedColor: color,
            footer: footerInput || `${interaction.guild?.name || 'Server'} • Pixel.gg`,
          },
          update: {
            embedColor: color,
            footer: footerInput || `${interaction.guild?.name || 'Server'} • Pixel.gg`,
          },
        });

        const embed = new EmbedBuilder()
          .setTitle('Appearance Updated')
          .setColor(color as any)
          .setDescription(`Successfully updated settings for **${interaction.guild?.name}**!`)
          .addFields(
            { name: 'Embed Color', value: updated.embedColor || color, inline: true },
            { name: 'Footer Text', value: updated.footer || 'Default', inline: true }
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
