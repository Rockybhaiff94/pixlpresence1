import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '@discord-rpc/database';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Shows your customized Discord RPC Platform profile')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user whose profile you want to view')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('target') || interaction.user;

    const user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        profile: {
          include: { links: true, buttons: true }
        }
      }
    });

    if (!user || !user.profile) {
      return interaction.editReply(`${targetUser.username} has not set up their profile yet.`);
    }

    const p = user.profile;

    const embed = new EmbedBuilder()
      .setTitle(p.displayName || targetUser.username)
      .setDescription(p.bio || 'No bio provided.')
      .setThumbnail(p.avatarUrl || targetUser.displayAvatarURL())
      .setColor((p.accentColor as any) || '#8b5cf6')
      .setFooter({ text: `Profile Views: ${p.views}` });

    if (p.links.length > 0) {
      embed.addFields({
        name: 'Socials',
        value: p.links.map((l: any) => `[${l.label}](${l.url})`).join(' | ')
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
