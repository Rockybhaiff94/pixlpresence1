import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '@discord-rpc/database';

export default {
  data: new SlashCommandBuilder()
    .setName('cookie')
    .setDescription('Gift your daily cookie to another creator on Pixel.gg')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('gift')
        .setDescription('Send your daily cookie allowance to another user')
        .addUserOption((option) =>
          option.setName('recipient').setDescription('The user you want to gift a cookie to').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Optional friendly note to attach with your cookie')
            .setRequired(false)
            .setMaxLength(120)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() !== 'gift') {
      return interaction.reply({ content: 'Invalid command usage.', ephemeral: true });
    }

    const targetDiscordUser = interaction.options.getUser('recipient', true);
    const note = interaction.options.getString('message') || null;

    // 1. Prevent self-gifting
    if (targetDiscordUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ **Self-Gifting Restricted**: You cannot gift cookies to yourself! Spread the love to other creators.',
        ephemeral: true,
      });
    }

    // 2. Resolve sender account in Database
    const sender = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!sender) {
      return interaction.reply({
        content: '❌ **Account Unlinked**: You need a Pixel.gg account linked to your Discord to send cookies. Link your account at https://pixlpresence1-web.vercel.app/account',
        ephemeral: true,
      });
    }

    // 3. Resolve recipient account in Database
    const recipient = await prisma.user.findUnique({
      where: { discordId: targetDiscordUser.id },
    });

    if (!recipient) {
      return interaction.reply({
        content: `❌ **Recipient Not Registered**: <@${targetDiscordUser.id}> does not have a linked Pixel.gg profile yet!`,
        ephemeral: true,
      });
    }

    // 4. UTC Day Allowance Check
    const dateBucket = new Date().toISOString().slice(0, 10);

    const existingGiftToday = await prisma.cookieGift.findUnique({
      where: {
        senderId_dateBucket: {
          senderId: sender.id,
          dateBucket,
        },
      },
    });

    if (existingGiftToday) {
      return interaction.reply({
        content: '🍪 **Daily Limit Reached**: You have already gifted your daily cookie today! Your cookie allowance resets at midnight UTC.',
        ephemeral: true,
      });
    }

    try {
      // 5. Atomic Transaction: Record Cookie Gift
      const gift = await prisma.cookieGift.create({
        data: {
          senderId: sender.id,
          recipientId: recipient.id,
          dateBucket,
          message: note,
          source: 'DISCORD_BOT',
        },
      });

      const totalReceived = await prisma.cookieGift.count({
        where: { recipientId: recipient.id },
      });

      const embed = new EmbedBuilder()
        .setTitle('🍪 Cookie Gift Delivered!')
        .setDescription(
          `**<@${interaction.user.id}>** has gifted their daily cookie to **<@${targetDiscordUser.id}>**!\n\n` +
            (note ? `💬 *"${note}"*\n\n` : '') +
            `🏆 **<@${targetDiscordUser.id}>** has received **${totalReceived}** cookies total.\n` +
            `*Cookie statistics and activity are visible in your Analytics dashboard.*`
        )
        .setColor(0xd71920)
        .setFooter({ text: 'PIXLS.IN • Verified Cookie Delivery Protocol' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      // Handle concurrent duplicate attempts safely
      if (err.code === 'P2002') {
        return interaction.reply({
          content: '🍪 **Daily Limit Reached**: You have already gifted your daily cookie today!',
          ephemeral: true,
        });
      }
      console.error('[Cookie Command Error]:', err);
      return interaction.reply({
        content: '⚠️ Failed to deliver cookie due to an internal error. Please try again later.',
        ephemeral: true,
      });
    }
  },
};

