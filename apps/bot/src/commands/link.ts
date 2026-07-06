import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Get a link to customize your profile and Rich Presence.'),
  async execute(interaction: ChatInputCommandInteraction) {
    const linkButton = new ButtonBuilder()
      .setLabel('Customize Profile')
      .setURL('http://localhost:3001/dashboard')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

    await interaction.reply({
      content: 'Click the button below to log into the web dashboard and configure your Discord RPC Platform profile.',
      components: [row],
      ephemeral: true
    });
  },
};
