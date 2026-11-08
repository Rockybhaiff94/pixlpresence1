import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { FRONTEND_BASE_URL } from '../utils/profileCard';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View PixelBot commands and platform instructions'),
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('✨ PixelBot — Official Discord Companion')
      .setColor('#8b5cf6')
      .setDescription(
        'PixelBot connects your Discord presence and server identity directly to your customized **Pixel.gg** profile page.\n\nHere are the available commands:'
      )
      .addFields(
        {
          name: '`/profile [user]`',
          value: 'Showcases your or another user’s Pixel.gg profile card with live status, custom theme, and links.',
          inline: false,
        },
        {
          name: '`/status <status> [game]`',
          value: 'Updates your Pixel.gg profile status (`Online`, `In-Game`, `Away`, `Offline`) in real-time.',
          inline: false,
        },
        {
          name: '`/settings user`',
          value: 'Check your personal connected profile, quick status, and web dashboard links.',
          inline: false,
        },
        {
          name: '`/settings server`',
          value: '*(Admins only)* Configure server-specific embed styling, custom footers, and profile channels.',
          inline: false,
        },
        {
          name: '`/help`',
          value: 'Displays this helpful guide and links to Pixel.gg.',
          inline: false,
        }
      )
      .setFooter({ text: 'Pixel.gg • Customizable Digital Identity Platform' });

    const webBtn = new ButtonBuilder()
      .setLabel('Visit Pixel.gg')
      .setURL(FRONTEND_BASE_URL)
      .setStyle(ButtonStyle.Link);

    const dashboardBtn = new ButtonBuilder()
      .setLabel('Account Studio')
      .setURL(`${FRONTEND_BASE_URL}/account`)
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(webBtn, dashboardBtn);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

