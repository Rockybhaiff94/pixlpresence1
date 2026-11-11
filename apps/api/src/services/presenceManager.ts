import { prisma } from '@discord-rpc/database';
import { io } from '../index';

export interface LiveActivity {
  name: string;
  type: number; // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 5 = Competing
  details?: string | null;
  state?: string | null;
  largeImage?: string | null;
  largeImageText?: string | null;
  smallImage?: string | null;
  smallImageText?: string | null;
  streamUrl?: string | null;
  timestamps?: {
    start?: number | null; // epoch ms
    end?: number | null;   // epoch ms
  } | null;
  startTimestamp?: string | number | null;
  endTimestamp?: string | number | null;
  party?: {
    size: [number, number];
  } | null;
  buttons?: Array<{ label: string; url: string }> | null;
  appName?: string | null;
}

export interface LivePresence {
  userId?: string | null;
  username: string;
  discordId?: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  hasActivity: boolean;
  activity: LiveActivity | null;
  updatedAt: number;
  sequence: number;
  source: 'discord_bot' | 'lanyard' | 'client' | 'database' | 'idle';
}

class PresenceManager {
  // In-memory live presence stores
  private presenceByUsername = new Map<string, LivePresence>();
  private presenceByDiscordId = new Map<string, LivePresence>();
  private userLookupCache = new Map<string, { id: string; username: string; discordId: string | null }>();
  private sequenceCounter = 0;

  /**
   * Helper to resolve Discord asset URL to public CDN
   */
  public resolveDiscordAssetUrl(applicationId?: string | null, assetId?: string | null): string | null {
    if (!assetId || !assetId.trim()) return null;
    const raw = assetId.trim();

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    // Discord Media Proxy URL format (e.g. mp:external/...)
    if (raw.startsWith('mp:external/')) {
      return `https://media.discordapp.net/external/${raw.replace('mp:external/', '')}`;
    }
    // Spotify CDN asset format
    if (raw.startsWith('spotify:')) {
      return `https://i.scdn.co/image/${raw.replace('spotify:', '')}`;
    }
    // Application Asset ID format
    if (applicationId && /^[0-9a-fA-F]+$/.test(raw)) {
      return `https://cdn.discordapp.com/app-assets/${applicationId}/${raw}.png`;
    }
    return raw;
  }

  /**
   * Find user metadata by Discord snowflake ID
   */
  public async findUserByDiscordId(discordId: string) {
    if (this.userLookupCache.has(discordId)) {
      return this.userLookupCache.get(discordId)!;
    }
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { id: true, username: true, discordId: true },
    });
    if (user) {
      this.userLookupCache.set(discordId, user);
      return user;
    }
    return null;
  }

  /**
   * Find user metadata by username
   */
  public async findUserByUsername(username: string) {
    const clean = username.trim().toLowerCase();
    for (const cached of this.userLookupCache.values()) {
      if (cached.username.toLowerCase() === clean) return cached;
    }
    const user = await prisma.user.findFirst({
      where: {
        username: { equals: clean, mode: 'insensitive' },
      },
      select: { id: true, username: true, discordId: true },
    });
    if (user) {
      if (user.discordId) {
        this.userLookupCache.set(user.discordId, user);
      }
      return user;
    }
    return null;
  }

  /**
   * Core atomic method to update a user's presence state and broadcast
   */
  public updatePresence(update: {
    username: string;
    userId?: string | null;
    discordId?: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    hasActivity: boolean;
    activity: LiveActivity | null;
    source: LivePresence['source'];
    timestamp?: number;
    sequence?: number;
  }): LivePresence {
    const key = update.username.trim().toLowerCase();
    const existing = this.presenceByUsername.get(key);
    const now = update.timestamp || Date.now();

    // Prevent race conditions: Ignore updates that are demonstrably older
    if (existing) {
      if (update.timestamp && existing.updatedAt > update.timestamp) {
        return existing;
      }
      if (update.sequence !== undefined && existing.sequence > update.sequence) {
        return existing;
      }
    }

    this.sequenceCounter++;
    const nextSequence = this.sequenceCounter;

    // Build strictly clean activity without leaking fields from previous activities
    let cleanActivity: LiveActivity | null = null;
    if (update.hasActivity && update.activity && update.status !== 'offline') {
      const act = update.activity;
      cleanActivity = {
        name: act.name,
        appName: act.name,
        type: typeof act.type === 'number' ? act.type : 0,
        details: act.details || null,
        state: act.state || null,
        largeImage: act.largeImage || null,
        largeImageText: act.largeImageText || null,
        smallImage: act.smallImage || null,
        smallImageText: act.smallImageText || null,
        streamUrl: act.streamUrl || null,
        timestamps: act.timestamps || (act.startTimestamp ? {
          start: typeof act.startTimestamp === 'number' ? act.startTimestamp : new Date(act.startTimestamp).getTime(),
          end: act.endTimestamp ? (typeof act.endTimestamp === 'number' ? act.endTimestamp : new Date(act.endTimestamp).getTime()) : null,
        } : null),
        startTimestamp: act.startTimestamp || (act.timestamps?.start ? new Date(act.timestamps.start).toISOString() : null),
        endTimestamp: act.endTimestamp || (act.timestamps?.end ? new Date(act.timestamps.end).toISOString() : null),
        party: act.party || null,
        buttons: act.buttons || null,
      };
    }

    const newPresence: LivePresence = {
      userId: update.userId || existing?.userId || null,
      username: update.username,
      discordId: update.discordId || existing?.discordId || null,
      status: update.status,
      hasActivity: Boolean(cleanActivity),
      activity: cleanActivity,
      updatedAt: now,
      sequence: nextSequence,
      source: update.source,
    };

    // Store in-memory
    this.presenceByUsername.set(key, newPresence);
    if (newPresence.discordId) {
      this.presenceByDiscordId.set(newPresence.discordId, newPresence);
    }

    // Broadcast in real time via Socket.io
    if (io) {
      io.to(`profile:${key}`).emit('presence_update', newPresence);
      if (newPresence.discordId) {
        io.to(`profile:discord:${newPresence.discordId}`).emit('presence_update', newPresence);
      }
      if (newPresence.userId) {
        io.to(`user_${newPresence.userId}`).emit('presence_update', newPresence);
      }
    }

    return newPresence;
  }

  /**
   * Set presence directly from Discord Gateway presenceUpdate event
   */
  public async setPresenceFromDiscord(
    discordId: string,
    rawPresence: {
      status: 'online' | 'idle' | 'dnd' | 'offline';
      activities?: Array<any>;
    }
  ): Promise<LivePresence | null> {
    const user = await this.findUserByDiscordId(discordId);
    if (!user) return null;

    if (rawPresence.status === 'offline' || !rawPresence.activities || rawPresence.activities.length === 0) {
      return this.updatePresence({
        username: user.username,
        userId: user.id,
        discordId,
        status: rawPresence.status,
        hasActivity: false,
        activity: null,
        source: 'discord_bot',
      });
    }

    // Prefer non-custom status activity (Playing, Streaming, Listening, Watching, Competing)
    const active = rawPresence.activities.find((a: any) => a.type !== 4) || rawPresence.activities[0];
    if (!active || active.type === 4) {
      return this.updatePresence({
        username: user.username,
        userId: user.id,
        discordId,
        status: rawPresence.status,
        hasActivity: false,
        activity: null,
        source: 'discord_bot',
      });
    }

    const appId = active.applicationId || active.application_id;
    const largeAsset = active.assets?.largeImage || active.assets?.large_image;
    const smallAsset = active.assets?.smallImage || active.assets?.small_image;

    const largeImage = this.resolveDiscordAssetUrl(appId, largeAsset);
    const smallImage = this.resolveDiscordAssetUrl(appId, smallAsset);

    const startTime = active.timestamps?.start ? new Date(active.timestamps.start).getTime() : null;
    const endTime = active.timestamps?.end ? new Date(active.timestamps.end).getTime() : null;

    const liveActivity: LiveActivity = {
      name: active.name,
      appName: active.name,
      type: active.type,
      details: active.details || null,
      state: active.state || null,
      largeImage,
      largeImageText: active.assets?.largeText || active.assets?.large_text || null,
      smallImage,
      smallImageText: active.assets?.smallText || active.assets?.small_text || null,
      streamUrl: active.url || null,
      timestamps: (startTime || endTime) ? { start: startTime, end: endTime } : null,
      startTimestamp: startTime ? new Date(startTime).toISOString() : null,
      endTimestamp: endTime ? new Date(endTime).toISOString() : null,
      party: active.party?.size ? { size: active.party.size } : null,
      buttons: active.buttons || (active.metadata?.button_urls ? active.buttons?.map((label: string, i: number) => ({
        label,
        url: active.metadata.button_urls[i] || '#',
      })) : null),
    };

    return this.updatePresence({
      username: user.username,
      userId: user.id,
      discordId,
      status: rawPresence.status,
      hasActivity: true,
      activity: liveActivity,
      source: 'discord_bot',
    });
  }

  /**
   * Query Lanyard REST API for live Discord presence fallback
   */
  public async fetchLanyardPresence(discordId: string): Promise<LivePresence | null> {
    if (!discordId || !/^\d{17,20}$/.test(discordId)) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const json = await res.json();
      if (!json?.success || !json?.data) return null;

      const data = json.data;
      const user = await this.findUserByDiscordId(discordId);
      const username = user?.username || data.discord_user?.username || discordId;
      const status: 'online' | 'idle' | 'dnd' | 'offline' = data.discord_status || 'offline';

      // Check Spotify activity
      if (data.listening_to_spotify && data.spotify) {
        const spotify = data.spotify;
        const liveActivity: LiveActivity = {
          name: 'Spotify',
          appName: 'Spotify',
          type: 2, // Listening
          details: spotify.song || null,
          state: spotify.artist || null,
          largeImage: spotify.album_art_url || null,
          largeImageText: spotify.album || 'Spotify',
          smallImage: 'https://cdn.discordapp.com/emojis/862788939178344449.webp',
          smallImageText: 'Spotify',
          timestamps: spotify.timestamps ? {
            start: spotify.timestamps.start,
            end: spotify.timestamps.end,
          } : null,
          startTimestamp: spotify.timestamps?.start ? new Date(spotify.timestamps.start).toISOString() : null,
          endTimestamp: spotify.timestamps?.end ? new Date(spotify.timestamps.end).toISOString() : null,
        };

        return this.updatePresence({
          username,
          userId: user?.id,
          discordId,
          status,
          hasActivity: true,
          activity: liveActivity,
          source: 'lanyard',
        });
      }

      // Check other Discord activities
      const activities: any[] = data.activities || [];
      const gameActivity = activities.find((a) => a.type !== 4); // exclude custom status

      if (!gameActivity || status === 'offline') {
        return this.updatePresence({
          username,
          userId: user?.id,
          discordId,
          status,
          hasActivity: false,
          activity: null,
          source: 'lanyard',
        });
      }

      const appId = gameActivity.application_id;
      const largeAsset = gameActivity.assets?.large_image;
      const smallAsset = gameActivity.assets?.small_image;

      const largeImage = this.resolveDiscordAssetUrl(appId, largeAsset);
      const smallImage = this.resolveDiscordAssetUrl(appId, smallAsset);

      const liveActivity: LiveActivity = {
        name: gameActivity.name,
        appName: gameActivity.name,
        type: gameActivity.type || 0,
        details: gameActivity.details || null,
        state: gameActivity.state || null,
        largeImage,
        largeImageText: gameActivity.assets?.large_text || null,
        smallImage,
        smallImageText: gameActivity.assets?.small_text || null,
        streamUrl: gameActivity.url || null,
        timestamps: gameActivity.timestamps ? {
          start: gameActivity.timestamps.start || null,
          end: gameActivity.timestamps.end || null,
        } : null,
        startTimestamp: gameActivity.timestamps?.start ? new Date(gameActivity.timestamps.start).toISOString() : null,
        endTimestamp: gameActivity.timestamps?.end ? new Date(gameActivity.timestamps.end).toISOString() : null,
        party: gameActivity.party?.size ? { size: gameActivity.party.size } : null,
      };

      return this.updatePresence({
        username,
        userId: user?.id,
        discordId,
        status,
        hasActivity: true,
        activity: liveActivity,
        source: 'lanyard',
      });
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the freshest live presence for a user
   */
  public async getLivePresenceForUser(user: {
    id: string;
    username: string;
    discordId?: string | null;
    richPresence?: any;
  }): Promise<LivePresence> {
    const key = user.username.trim().toLowerCase();
    const cached = this.presenceByUsername.get(key);
    const now = Date.now();

    // If cached presence is recent (less than 8 seconds old), return it immediately
    if (cached && (now - cached.updatedAt < 8000)) {
      return cached;
    }

    // If user has a linked Discord snowflake ID, attempt Lanyard check
    if (user.discordId) {
      const lanyardPresence = await this.fetchLanyardPresence(user.discordId);
      if (lanyardPresence) {
        return lanyardPresence;
      }
    }

    // If previously cached presence exists (even if older), return it
    if (cached) {
      return cached;
    }

    // Fall back to database configured Rich Presence
    const dbRpc = user.richPresence || (await prisma.richPresence.findUnique({
      where: { userId: user.id },
    }));

    if (dbRpc && dbRpc.showProfileRpc !== false && (dbRpc.appName || dbRpc.details || dbRpc.state)) {
      const startTime = dbRpc.startTimestamp ? new Date(dbRpc.startTimestamp).getTime() : null;
      const endTime = dbRpc.endTimestamp ? new Date(dbRpc.endTimestamp).getTime() : null;

      const buttons: Array<{ label: string; url: string }> = [];
      if (dbRpc.button1Enabled !== false && dbRpc.button1Url) {
        buttons.push({ label: dbRpc.button1Label || 'View Profile', url: dbRpc.button1Url });
      }
      if (dbRpc.button2Enabled !== false && dbRpc.button2Url) {
        buttons.push({ label: dbRpc.button2Label || 'Get PixelsRPC', url: dbRpc.button2Url });
      }

      const dbActivity: LiveActivity = {
        name: dbRpc.appName || 'Active Application',
        appName: dbRpc.appName || 'Active Application',
        type: typeof dbRpc.activityType === 'number' ? dbRpc.activityType : 0,
        details: dbRpc.details || null,
        state: dbRpc.state || null,
        largeImage: dbRpc.largeImage || null,
        largeImageText: dbRpc.largeImageText || null,
        smallImage: dbRpc.smallImage || null,
        smallImageText: dbRpc.smallImageText || null,
        streamUrl: dbRpc.streamUrl || null,
        timestamps: (startTime || endTime) ? { start: startTime, end: endTime } : null,
        startTimestamp: dbRpc.startTimestamp ? new Date(dbRpc.startTimestamp).toISOString() : null,
        endTimestamp: dbRpc.endTimestamp ? new Date(dbRpc.endTimestamp).toISOString() : null,
        party: (dbRpc.partySize && dbRpc.partyMax) ? { size: [dbRpc.partySize, dbRpc.partyMax] } : null,
        buttons: buttons.length > 0 ? buttons : null,
      };

      return this.updatePresence({
        username: user.username,
        userId: user.id,
        discordId: user.discordId,
        status: 'online',
        hasActivity: true,
        activity: dbActivity,
        source: 'database',
      });
    }

    // Clean idle/offline state (no fake games!)
    return this.updatePresence({
      username: user.username,
      userId: user.id,
      discordId: user.discordId,
      status: 'offline',
      hasActivity: false,
      activity: null,
      source: 'idle',
    });
  }
}

export const presenceManager = new PresenceManager();

