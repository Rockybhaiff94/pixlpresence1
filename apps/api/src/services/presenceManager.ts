import { prisma } from '@discord-rpc/database';
import { io } from '../index';
import { formatRichPresenceField } from '../utils/rpcFormat';

export interface LiveActivity {
  name: string;
  applicationId?: string | null;
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
  spotify?: {
    track_id?: string | null;
    song?: string | null;
    artist?: string | null;
    album?: string | null;
    album_art_url?: string | null;
    timestamps?: {
      start?: number | null;
      end?: number | null;
    } | null;
  } | null;
}

export type RpcPriorityMode = 'discord' | 'custom';

export interface LivePresence {
  userId?: string | null;
  username: string;
  discordId?: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  hasActivity: boolean;
  activity: LiveActivity | null;
  activities?: LiveActivity[];
  discordActivity?: LiveActivity | null;
  customRpcEnabled?: boolean;
  rpcPriority?: RpcPriorityMode;
  activitySource?: 'discord' | 'custom' | 'none';
  updatedAt: number;
  sequence: number;
  clientSequence?: number;
  source: 'discord_bot' | 'lanyard' | 'client' | 'database' | 'idle';
}

export function parseRpcPriority(customConfigRaw: unknown): RpcPriorityMode {
  if (!customConfigRaw) return 'discord';
  try {
    const parsed = typeof customConfigRaw === 'string' ? JSON.parse(customConfigRaw) : customConfigRaw;
    if (parsed && typeof parsed === 'object' && (parsed as any).rpcPriority === 'custom') {
      return 'custom';
    }
  } catch {}
  return 'discord';
}

export function resolveActivityByPriority(params: {
  discordActivity: LiveActivity | null;
  customActivity: LiveActivity | null;
  customRpcEnabled: boolean;
  rpcPriority: RpcPriorityMode;
}): { activity: LiveActivity | null; activitySource: 'discord' | 'custom' | 'none' } {
  const { discordActivity, customActivity, customRpcEnabled, rpcPriority } = params;
  const validCustom = customRpcEnabled && customActivity ? customActivity : null;

  if (!customRpcEnabled) {
    return discordActivity
      ? { activity: discordActivity, activitySource: 'discord' }
      : { activity: null, activitySource: 'none' };
  }

  if (rpcPriority === 'custom') {
    if (validCustom) return { activity: validCustom, activitySource: 'custom' };
    if (discordActivity) return { activity: discordActivity, activitySource: 'discord' };
    return { activity: null, activitySource: 'none' };
  }

  if (discordActivity) return { activity: discordActivity, activitySource: 'discord' };
  if (validCustom) return { activity: validCustom, activitySource: 'custom' };
  return { activity: null, activitySource: 'none' };
}

function normalizeEpochMs(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === false) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value < 1e12 && value > 1e8) return Math.round(value * 1000);
    if (value >= 1e12) return Math.round(value);
    return null;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) && t > 1e11 ? Math.round(t) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return normalizeEpochMs(Number(trimmed));
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed > 1e11 ? Math.round(parsed) : null;
  }
  return null;
}

function sanitizeButtonUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/.+/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
}

function normalizeActivityButtons(
  buttonsRaw: unknown,
  buttonUrlsRaw?: unknown
): Array<{ label: string; url: string }> | null {
  if (!Array.isArray(buttonsRaw) || buttonsRaw.length === 0) return null;
  const urls = Array.isArray(buttonUrlsRaw) ? buttonUrlsRaw : [];
  const normalized: Array<{ label: string; url: string }> = [];
  for (let i = 0; i < Math.min(2, buttonsRaw.length); i++) {
    const item = buttonsRaw[i];
    if (typeof item === 'string') {
      const label = item.trim();
      if (!label) continue;
      const url = sanitizeButtonUrl(urls[i]) || '';
      normalized.push({ label, url });
    } else if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const label = typeof rec.label === 'string' ? rec.label.trim() : '';
      if (!label) continue;
      const url = sanitizeButtonUrl(rec.url) || sanitizeButtonUrl(urls[i]) || '';
      normalized.push({ label, url });
    }
  }
  return normalized.length > 0 ? normalized : null;
}

class PresenceManager {
  // Separate in-memory stores for:
  // 1) Resolved public presence (status + prioritized activity)
  // 2) Original Discord user presence & activities (discord_bot / lanyard / client)
  // 3) Saved Custom RPC configuration & activity
  private presenceByUsername = new Map<string, LivePresence>();
  private presenceByDiscordId = new Map<string, LivePresence>();
  private discordPresenceByUsername = new Map<
    string,
    {
      userId?: string | null;
      discordId?: string | null;
      status: 'online' | 'idle' | 'dnd' | 'offline';
      activity: LiveActivity | null;
      activities: LiveActivity[];
      updatedAt: number;
      clientSequence?: number;
      source: 'discord_bot' | 'lanyard' | 'client';
    }
  >();
  private customRpcByUsername = new Map<
    string,
    {
      enabled: boolean;
      priority: RpcPriorityMode;
      activity: LiveActivity | null;
      updatedAt: number;
    }
  >();
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
  private sanitizeLiveActivity(act: LiveActivity): LiveActivity {
    const normStart = normalizeEpochMs(act.timestamps?.start ?? act.startTimestamp);
    const normEnd = normalizeEpochMs(act.timestamps?.end ?? act.endTimestamp);
    const normalizedTimestamps =
      normStart !== null || normEnd !== null ? { start: normStart, end: normEnd } : null;

    return {
      name: act.name,
      appName: act.appName || act.name,
      applicationId: act.applicationId || null,
      type: typeof act.type === 'number' ? act.type : 0,
      details: act.details || null,
      state: act.state || null,
      largeImage: act.largeImage || null,
      largeImageText: act.largeImageText || null,
      smallImage: act.smallImage || null,
      smallImageText: act.smallImageText || null,
      streamUrl: act.streamUrl || null,
      timestamps: normalizedTimestamps,
      startTimestamp: normStart !== null ? new Date(normStart).toISOString() : null,
      endTimestamp: normEnd !== null ? new Date(normEnd).toISOString() : null,
      party: act.party || null,
      buttons: normalizeActivityButtons(act.buttons),
      spotify: act.spotify || null,
    };
  }

  private emitPresenceBroadcast(newPresence: LivePresence) {
    const key = newPresence.username.trim().toLowerCase();
    this.presenceByUsername.set(key, newPresence);
    if (newPresence.discordId) {
      this.presenceByDiscordId.set(newPresence.discordId, newPresence);
    }
    if (io) {
      io.to(`profile:${key}`).emit('presence_update', newPresence);
      if (newPresence.discordId) {
        io.to(`profile:discord:${newPresence.discordId}`).emit('presence_update', newPresence);
      }
      if (newPresence.userId) {
        io.to(`user_${newPresence.userId}`).emit('presence_update', newPresence);
      }
    }
  }

  public updatePresence(update: {
    username: string;
    userId?: string | null;
    discordId?: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    hasActivity: boolean;
    activity: LiveActivity | null;
    activities?: LiveActivity[];
    source: LivePresence['source'];
    timestamp?: number;
    sequence?: number;
  }): LivePresence {
    const key = update.username.trim().toLowerCase();
    const existing = this.presenceByUsername.get(key);
    const existingDiscord = this.discordPresenceByUsername.get(key);
    const now = update.timestamp || Date.now();

    // Prevent race conditions: Ignore demonstrably older packets using timestamps or per-user client sequence
    if (update.source === 'discord_bot' || update.source === 'lanyard' || update.source === 'client') {
      if (existingDiscord) {
        if (update.timestamp && existingDiscord.updatedAt > update.timestamp) {
          return existing || this.composeResolvedPresence(update.username, update.userId, update.discordId, update.source);
        }
        if (
          update.sequence !== undefined &&
          existingDiscord.clientSequence !== undefined &&
          existingDiscord.clientSequence > update.sequence
        ) {
          return existing || this.composeResolvedPresence(update.username, update.userId, update.discordId, update.source);
        }
      }
    } else if (existing) {
      if (update.timestamp && existing.updatedAt > update.timestamp) {
        return existing;
      }
      if (
        update.sequence !== undefined &&
        existing.clientSequence !== undefined &&
        existing.clientSequence > update.sequence
      ) {
        return existing;
      }
    }

    let cleanActivity: LiveActivity | null = null;
    if (update.hasActivity && update.activity && update.status !== 'offline') {
      cleanActivity = this.sanitizeLiveActivity(update.activity);
    }
    const cleanActivities = Array.isArray(update.activities) && update.status !== 'offline'
      ? update.activities.map((a) => this.sanitizeLiveActivity(a))
      : cleanActivity
      ? [cleanActivity]
      : [];

    if (update.source === 'discord_bot' || update.source === 'lanyard' || update.source === 'client') {
      this.discordPresenceByUsername.set(key, {
        userId: update.userId || existingDiscord?.userId || existing?.userId || null,
        discordId: update.discordId || existingDiscord?.discordId || existing?.discordId || null,
        status: update.status,
        activity: cleanActivity,
        activities: cleanActivities,
        updatedAt: now,
        clientSequence: update.sequence !== undefined ? update.sequence : existingDiscord?.clientSequence,
        source: update.source,
      });
    } else if (update.source === 'database') {
      const prevCustom = this.customRpcByUsername.get(key);
      this.customRpcByUsername.set(key, {
        enabled: true,
        priority: prevCustom?.priority || 'discord',
        activity: cleanActivity,
        updatedAt: now,
      });
    }

    const resolved = this.composeResolvedPresence(
      update.username,
      update.userId || existing?.userId || null,
      update.discordId || existing?.discordId || null,
      update.source,
      now,
      update.sequence
    );
    this.emitPresenceBroadcast(resolved);
    return resolved;
  }

  private composeResolvedPresence(
    username: string,
    userId?: string | null,
    discordId?: string | null,
    source: LivePresence['source'] = 'idle',
    now: number = Date.now(),
    clientSequence?: number
  ): LivePresence {
    const key = username.trim().toLowerCase();
    const discordState = this.discordPresenceByUsername.get(key);
    const customState = this.customRpcByUsername.get(key);

    // Discord User Presence is strictly controlled by Discord/Lanyard/Client (never Custom RPC!)
    const discordStatus: LivePresence['status'] = discordState?.status || 'offline';
    const discordActivity: LiveActivity | null =
      discordStatus !== 'offline' ? discordState?.activity || null : null;
    const discordActivities: LiveActivity[] =
      discordStatus !== 'offline' ? discordState?.activities || (discordActivity ? [discordActivity] : []) : [];

    const customRpcEnabled = customState ? customState.enabled : false;
    const rpcPriority: RpcPriorityMode = customState?.priority || 'discord';
    const customActivity = customState?.activity || null;

    const { activity, activitySource } = resolveActivityByPriority({
      discordActivity,
      customActivity,
      customRpcEnabled,
      rpcPriority,
    });

    this.sequenceCounter++;
    return {
      userId: userId || discordState?.userId || null,
      username,
      discordId: discordId || discordState?.discordId || null,
      status: discordStatus,
      hasActivity: Boolean(activity),
      activity,
      activities: discordActivities,
      discordActivity,
      customRpcEnabled,
      rpcPriority,
      activitySource,
      updatedAt: now,
      sequence: this.sequenceCounter,
      clientSequence: clientSequence !== undefined ? clientSequence : discordState?.clientSequence,
      source: activitySource === 'custom' ? 'database' : discordState?.source || source,
    };
  }

  public syncCustomRpcUpdate(params: {
    username: string;
    userId?: string | null;
    discordId?: string | null;
    showProfileRpc: boolean;
    rpcPriority: RpcPriorityMode;
    customActivity: LiveActivity | null;
  }): LivePresence {
    const key = params.username.trim().toLowerCase();
    const now = Date.now();
    this.customRpcByUsername.set(key, {
      enabled: params.showProfileRpc,
      priority: params.rpcPriority,
      activity: params.showProfileRpc && params.customActivity ? this.sanitizeLiveActivity(params.customActivity) : null,
      updatedAt: now,
    });

    const resolved = this.composeResolvedPresence(
      params.username,
      params.userId,
      params.discordId,
      'database',
      now
    );
    this.emitPresenceBroadcast(resolved);
    return resolved;
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

    const startTime = normalizeEpochMs(active.timestamps?.start);
    const endTime = normalizeEpochMs(active.timestamps?.end);
    const normalizedBtns = normalizeActivityButtons(active.buttons, active.metadata?.button_urls);
    const isSpotify = active.name === 'Spotify' && (active.type === 2 || active.type === 'LISTENING');

    const liveActivity: LiveActivity = {
      name: active.name,
      appName: active.name,
      applicationId: appId || null,
      type: typeof active.type === 'number' ? active.type : 0,
      details: active.details || null,
      state: active.state || null,
      largeImage,
      largeImageText: active.assets?.largeText || active.assets?.large_text || null,
      smallImage,
      smallImageText: active.assets?.smallText || active.assets?.small_text || null,
      streamUrl: active.url || null,
      timestamps: (startTime !== null || endTime !== null) ? { start: startTime, end: endTime } : null,
      startTimestamp: startTime !== null ? new Date(startTime).toISOString() : null,
      endTimestamp: endTime !== null ? new Date(endTime).toISOString() : null,
      party: active.party?.size ? { size: active.party.size } : null,
      buttons: normalizedBtns,
      spotify: isSpotify
        ? {
            track_id: active.syncId || null,
            song: active.details || null,
            artist: active.state || null,
            album: active.assets?.largeText || active.assets?.large_text || null,
            album_art_url: largeImage,
            timestamps: (startTime !== null || endTime !== null) ? { start: startTime, end: endTime } : null,
          }
        : null,
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
        const spStart = normalizeEpochMs(spotify.timestamps?.start);
        const spEnd = normalizeEpochMs(spotify.timestamps?.end);
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
          timestamps: (spStart !== null || spEnd !== null) ? {
            start: spStart,
            end: spEnd,
          } : null,
          startTimestamp: spStart !== null ? new Date(spStart).toISOString() : null,
          endTimestamp: spEnd !== null ? new Date(spEnd).toISOString() : null,
          spotify: {
            track_id: spotify.track_id || null,
            song: spotify.song || null,
            artist: spotify.artist || null,
            album: spotify.album || null,
            album_art_url: spotify.album_art_url || null,
            timestamps: (spStart !== null || spEnd !== null) ? { start: spStart, end: spEnd } : null,
          },
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

      const gaStart = normalizeEpochMs(gameActivity.timestamps?.start);
      const gaEnd = normalizeEpochMs(gameActivity.timestamps?.end);
      const liveActivity: LiveActivity = {
        name: gameActivity.name,
        appName: gameActivity.name,
        applicationId: appId || null,
        type: gameActivity.type || 0,
        details: gameActivity.details || null,
        state: gameActivity.state || null,
        largeImage,
        largeImageText: gameActivity.assets?.large_text || null,
        smallImage,
        smallImageText: gameActivity.assets?.small_text || null,
        streamUrl: gameActivity.url || null,
        timestamps: (gaStart !== null || gaEnd !== null) ? {
          start: gaStart,
          end: gaEnd,
        } : null,
        startTimestamp: gaStart !== null ? new Date(gaStart).toISOString() : null,
        endTimestamp: gaEnd !== null ? new Date(gaEnd).toISOString() : null,
        party: gameActivity.party?.size ? { size: gameActivity.party.size } : null,
        buttons: normalizeActivityButtons(gameActivity.buttons, gameActivity.metadata?.button_urls),
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
  public clearDatabasePresence(username: string, discordId?: string | null) {
    const key = username.trim().toLowerCase();
    const prevCustom = this.customRpcByUsername.get(key);
    this.customRpcByUsername.set(key, {
      enabled: false,
      priority: prevCustom?.priority || 'discord',
      activity: null,
      updatedAt: Date.now(),
    });
    const resolved = this.composeResolvedPresence(username, null, discordId, 'idle');
    this.emitPresenceBroadcast(resolved);
  }

  public async getLivePresenceForUser(user: {
    id: string;
    username: string;
    discordId?: string | null;
    richPresence?: any;
  }): Promise<LivePresence> {
    const key = user.username.trim().toLowerCase();
    const now = Date.now();
    const LIVE_CACHE_FRESH_MS = 8000;
    const LIVE_CACHE_MAX_STALE_MS = 5 * 60 * 1000; // 5 minutes max stale window

    const dbRpc = user.richPresence || (await prisma.richPresence.findUnique({
      where: { userId: user.id },
    }));

    // Always sync Custom RPC config into customRpcByUsername without overwriting Discord status/activity
    const customEnabled = dbRpc ? dbRpc.showProfileRpc !== false : false;
    const rpcPriority = parseRpcPriority(dbRpc?.customConfig);
    let customActivity: LiveActivity | null = null;
    if (dbRpc && customEnabled && (dbRpc.appName || dbRpc.details || dbRpc.state)) {
      const startTime = normalizeEpochMs(dbRpc.startTimestamp);
      const endTime = normalizeEpochMs(dbRpc.endTimestamp);
      let customCfg: any = {};
      if ((dbRpc as any).customConfig) {
        try {
          customCfg = JSON.parse((dbRpc as any).customConfig) || {};
        } catch (_) {}
      }
      const formattedDetails = formatRichPresenceField(
        dbRpc.details,
        customCfg.detailsEnabled,
        'details',
        customCfg.statusLabels,
        customCfg.streaks,
        customCfg.statistics
      );
      const formattedState = formatRichPresenceField(
        dbRpc.state,
        customCfg.stateEnabled,
        'state',
        customCfg.statusLabels,
        customCfg.streaks,
        customCfg.statistics
      );
      const buttons: Array<{ label: string; url: string }> = [];
      if (dbRpc.button1Enabled !== false && dbRpc.button1Url) {
        const u1 = sanitizeButtonUrl(dbRpc.button1Url);
        if (u1) buttons.push({ label: dbRpc.button1Label || 'View Profile', url: u1 });
      }
      if (dbRpc.button2Enabled !== false && dbRpc.button2Url) {
        const u2 = sanitizeButtonUrl(dbRpc.button2Url);
        if (u2) buttons.push({ label: dbRpc.button2Label || 'Get PixelsRPC', url: u2 });
      }
      customActivity = {
        name: dbRpc.appName || 'Active Application',
        appName: dbRpc.appName || 'Active Application',
        type: typeof dbRpc.activityType === 'number' ? dbRpc.activityType : 0,
        details: formattedDetails || null,
        state: formattedState || null,
        largeImage: customCfg.largeImageEnabled !== false ? (dbRpc.largeImage || null) : null,
        largeImageText: customCfg.largeImageEnabled !== false ? (dbRpc.largeImageText || null) : null,
        smallImage: customCfg.smallImageEnabled !== false ? (dbRpc.smallImage || null) : null,
        smallImageText: customCfg.smallImageEnabled !== false ? (dbRpc.smallImageText || null) : null,
        streamUrl: dbRpc.streamUrl || null,
        timestamps: (startTime !== null || endTime !== null) ? { start: startTime, end: endTime } : null,
        startTimestamp: startTime !== null ? new Date(startTime).toISOString() : null,
        endTimestamp: endTime !== null ? new Date(endTime).toISOString() : null,
        party: (dbRpc.partySize && dbRpc.partyMax) ? { size: [dbRpc.partySize, dbRpc.partyMax] } : null,
        buttons: buttons.length > 0 ? buttons : null,
      };
    }

    this.customRpcByUsername.set(key, {
      enabled: customEnabled,
      priority: rpcPriority,
      activity: customActivity,
      updatedAt: now,
    });

    // Refresh Discord state if stale/missing and user has a Discord ID
    const existingDiscord = this.discordPresenceByUsername.get(key);
    if (existingDiscord && (now - existingDiscord.updatedAt < LIVE_CACHE_FRESH_MS)) {
      return this.composeResolvedPresence(user.username, user.id, user.discordId, existingDiscord.source, now);
    }

    if (user.discordId) {
      const lanyardPresence = await this.fetchLanyardPresence(user.discordId);
      if (lanyardPresence) {
        return lanyardPresence;
      }
    }

    if (existingDiscord && (now - existingDiscord.updatedAt < LIVE_CACHE_MAX_STALE_MS)) {
      return this.composeResolvedPresence(user.username, user.id, user.discordId, existingDiscord.source, now);
    }

    return this.composeResolvedPresence(user.username, user.id, user.discordId, 'idle', now);
  }
}

export const presenceManager = new PresenceManager();

