import { Events, Client, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);

    // Configurable Bot Presence (Section 3.1)
    const activityName = process.env.BOT_ACTIVITY_NAME || 'Pixel.gg Profiles';
    const rawActivityType = (process.env.BOT_ACTIVITY_TYPE || 'WATCHING').toUpperCase();
    
    let activityType: ActivityType = ActivityType.Watching;
    if (rawActivityType === 'PLAYING') activityType = ActivityType.Playing;
    else if (rawActivityType === 'LISTENING') activityType = ActivityType.Listening;
    else if (rawActivityType === 'COMPETING') activityType = ActivityType.Competing;

    const rawStatus = (process.env.BOT_STATUS || 'online').toLowerCase();
    const validStatuses = ['online', 'idle', 'dnd', 'invisible'] as const;
    const presenceStatus = validStatuses.includes(rawStatus as any) ? (rawStatus as any) : 'online';

    try {
      client.user?.setPresence({
        status: presenceStatus,
        activities: [{
          name: activityName,
          type: activityType,
        }],
      });
      console.log(`[Presence] Set presence to ${presenceStatus} - ${rawActivityType} ${activityName}`);
    } catch (err) {
      console.error('[Presence] Error setting bot presence:', err);
    }
  },
};
