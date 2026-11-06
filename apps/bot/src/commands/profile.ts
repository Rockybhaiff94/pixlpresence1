import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { buildProfileResponse } from '../utils/profileCard';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Display a user’s Pixel.gg profile inside Discord')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user whose profile you want to view (defaults to yourself)')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const response = await buildProfileResponse(
      targetUser.id,
      interaction.user.id,
      interaction.guildId
    );

    if (response.isEphemeral) {
      return interaction.reply({
        embeds: response.embeds,
        components: response.components,
        ephemeral: true,
      });
    }

    await interaction.reply({
      embeds: response.embeds,
      components: response.components,
    });
  },
};
