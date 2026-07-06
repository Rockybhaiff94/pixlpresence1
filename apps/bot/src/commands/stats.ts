import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '@discord-rpc/database';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Displays platform statistics'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const totalUsers = await prisma.user.count();
    const totalProfiles = await prisma.profile.count();
    const totalRpcConfigs = await prisma.richPresence.count();

    const embed = new EmbedBuilder()
      .setTitle('Platform Statistics')
      .setColor('#ec4899')
      .addFields(
        { name: 'Total Users', value: totalUsers.toString(), inline: true },
        { name: 'Customized Profiles', value: totalProfiles.toString(), inline: true },
        { name: 'Active RPC Configs', value: totalRpcConfigs.toString(), inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
