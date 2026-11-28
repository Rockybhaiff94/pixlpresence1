import { prisma } from '@discord-rpc/database';
import { io } from '../index';
import { formatRichPresenceField } from '../utils/rpcFormat';
import { resolveDiscordAvatarUrl } from '../auth';

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
export type AccountStatus = 'online' | 'idle' | 'dnd' | 'offline';

export function isValidAccountStatus(value: unknown): value is AccountStatus {
  return value === 'online' || value === 'idle' || value === 'dnd' || value === 'offline';
}

export interface LivePresence {
  userId?: string | null;
  username: string;
  discordId?: string | null;
  status: AccountStatus;
  accountStatus?: AccountStatus;
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

const NATIVE_ACTIVITY_RANK: Record<number, number> = {
  1: 1, // Streaming
  0: 2, // Playing Game
  2: 3, // Listening (Spotify)
  5: 4, // Competing
  3: 5, // Watching
};

export function selectPrimaryNativeActivity(activities: LiveActivity[]): LiveActivity | null {
  if (!Array.isArray(activities) || activities.length === 0) return null;
  const eligible = activities.filter((a) => a && a.type !== 4 && Boolean(a.name));
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => (NATIVE_ACTIVITY_RANK[a.type] ?? 99) - (NATIVE_ACTIVITY_RANK[b.type] ?? 99));
  return eligible[0] || null;
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

function parseActivityTypeNum(rawType: unknown): number {
  if (typeof rawType === 'number' && Number.isFinite(rawType)) return rawType;
  const s = String(rawType || '').trim().toLowerCase();
  if (s === '1' || s === 'streaming') return 1;
  if (s === '2' || s === 'listening') return 2;
  if (s === '3' || s === 'watching') return 3;
  if (s === '5' || s === 'competing') return 5;
  return 0;
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
  private accountStatusDevicesByUser = new Map<
    string,
    Map<
      string,
      {
        deviceId: string;
        discordUserId: string | null;
        accountStatus: AccountStatus;
        statusUpdatedAt: number;
        lastSeenAt: number;
        source: string;
      }
    >
  >();
  private accountStatusByUsername = new Map<
    string,
    {
      userId?: string | null;
      username: string;
      discordId?: string | null;
      accountStatus: AccountStatus;
      updatedAt: number;
      source: string;
    }
  >();
  private readonly ACCOUNT_STATUS_STALE_MS = 65_000;
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

  private emitAccountStatusBroadcast(payload: {
    username: string;
    userId?: string | null;
    discordId?: string | null;
    accountStatus: AccountStatus;
    updatedAt: number;
  }) {
    if (!io) return;
    const key = payload.username.trim().toLowerCase();
    const event = {
      type: 'account_status_sync',
      username: payload.username,
      accountStatus: payload.accountStatus,
      updatedAt: payload.updatedAt,
    };
    io.to(`profile:${key}`).emit('account_status_sync', event);
    if (payload.discordId) {
      io.to(`profile:discord:${payload.discordId}`).emit('account_status_sync', event);
    }
    if (payload.userId) {
      io.to(`user_${payload.userId}`).emit('account_status_sync', event);
    }
  }

  private aggregateAccountStatusForUser(key: string, now: number): {
    accountStatus: AccountStatus;
    updatedAt: number;
    source: string;
  } {
    const devices = this.accountStatusDevicesByUser.get(key);
    if (!devices || devices.size === 0) {
      return { accountStatus: 'offline', updatedAt: now, source: 'timeout' };
    }
    let best: {
      accountStatus: AccountStatus;
      statusUpdatedAt: number;
      lastSeenAt: number;
      source: string;
    } | null = null;
    for (const [devId, entry] of devices.entries()) {
      if (now - entry.lastSeenAt > this.ACCOUNT_STATUS_STALE_MS) {
        devices.delete(devId);
        continue;
      }
      if (
        !best ||
        entry.statusUpdatedAt > best.statusUpdatedAt ||
        (entry.statusUpdatedAt === best.statusUpdatedAt && entry.lastSeenAt > best.lastSeenAt)
      ) {
        best = entry;
      }
    }
    if (!best) {
      return { accountStatus: 'offline', updatedAt: now, source: 'timeout' };
    }
    return {
      accountStatus: best.accountStatus,
      updatedAt: best.statusUpdatedAt,
      source: best.source,
    };
  }

  public updateAccountStatus(params: {
    username: string;
    userId?: string | null;
    discordId?: string | null;
    discordUserId?: string | null;
    deviceId?: string | null;
    accountStatus: AccountStatus;
    statusUpdatedAt?: number | string | null;
    source?: string;
    forceBroadcast?: boolean;
  }): { accountStatus: AccountStatus; updatedAt: number; changed: boolean } {
    const key = params.username.trim().toLowerCase();
    const now = Date.now();
    const parsedUpdatedAt = normalizeEpochMs(params.statusUpdatedAt) ?? now;
    const devId = (params.deviceId || 'default').trim();
    const source = params.source || 'vencord_client';

    let devices = this.accountStatusDevicesByUser.get(key);
    if (!devices) {
      devices = new Map();
      this.accountStatusDevicesByUser.set(key, devices);
    }

    const existingDev = devices.get(devId);
    if (existingDev && parsedUpdatedAt < existingDev.statusUpdatedAt) {
      // Stale out-of-order status packet for this device: refresh lastSeenAt only
      existingDev.lastSeenAt = Math.max(existingDev.lastSeenAt, now);
      const current = this.accountStatusByUsername.get(key);
      return {
        accountStatus: current?.accountStatus || existingDev.accountStatus,
        updatedAt: current?.updatedAt || existingDev.statusUpdatedAt,
        changed: false,
      };
    }

    devices.set(devId, {
      deviceId: devId,
      discordUserId: params.discordUserId || params.discordId || null,
      accountStatus: params.accountStatus,
      statusUpdatedAt: parsedUpdatedAt,
      lastSeenAt: now,
      source,
    });

    const prevEntry = this.accountStatusByUsername.get(key);
    const aggregated = this.aggregateAccountStatusForUser(key, now);
    const changed = !prevEntry || prevEntry.accountStatus !== aggregated.accountStatus;

    this.accountStatusByUsername.set(key, {
      userId: params.userId || prevEntry?.userId || null,
      username: params.username,
      discordId: params.discordId || prevEntry?.discordId || null,
      accountStatus: aggregated.accountStatus,
      updatedAt: aggregated.updatedAt,
      source: aggregated.source,
    });

    // Sync ONLY the status field on discordPresenceByUsername without touching any RPC/native activity
    const existingDiscord = this.discordPresenceByUsername.get(key);
    if (existingDiscord) {
      existingDiscord.status = aggregated.accountStatus;
      existingDiscord.updatedAt = Math.max(existingDiscord.updatedAt, now);
      this.discordPresenceByUsername.set(key, existingDiscord);
    } else {
      this.discordPresenceByUsername.set(key, {
        userId: params.userId || null,
        discordId: params.discordId || null,
        status: aggregated.accountStatus,
        activity: null,
        activities: [],
        updatedAt: now,
        source: 'client',
      });
    }

    if (changed || params.forceBroadcast) {
      this.emitAccountStatusBroadcast({
        username: params.username,
        userId: params.userId || prevEntry?.userId || null,
        discordId: params.discordId || prevEntry?.discordId || null,
        accountStatus: aggregated.accountStatus,
        updatedAt: aggregated.updatedAt,
      });
      const resolved = this.composeResolvedPresence(
        params.username,
        params.userId || prevEntry?.userId || null,
        params.discordId || prevEntry?.discordId || null,
        'client',
        now
      );
      this.emitPresenceBroadcast(resolved);
    }

    return {
      accountStatus: aggregated.accountStatus,
      updatedAt: aggregated.updatedAt,
      changed,
    };
  }

  public touchAccountStatusDevice(username: string, deviceId?: string | null) {
    if (!username) return;
    const key = username.trim().toLowerCase();
    const devices = this.accountStatusDevicesByUser.get(key);
    if (!devices) return;
    const devId = (deviceId || 'default').trim();
    const entry = devices.get(devId);
    if (entry) {
      entry.lastSeenAt = Date.now();
    }
  }

  public handleAccountStatusDeviceDisconnect(
    username: string,
    userId?: string | null,
    discordId?: string | null,
    deviceId?: string | null
  ) {
    if (!username) return;
    const key = username.trim().toLowerCase();
    const devices = this.accountStatusDevicesByUser.get(key);
    if (!devices || devices.size === 0) return;

    if (deviceId) {
      devices.delete(deviceId.trim());
    }
    const now = Date.now();
    const prevEntry = this.accountStatusByUsername.get(key);
    const aggregated = this.aggregateAccountStatusForUser(key, now);
    const changed = !prevEntry || prevEntry.accountStatus !== aggregated.accountStatus;

    this.accountStatusByUsername.set(key, {
      userId: userId || prevEntry?.userId || null,
      username,
      discordId: discordId || prevEntry?.discordId || null,
      accountStatus: aggregated.accountStatus,
      updatedAt: now,
      source: aggregated.source,
    });

    const existingDiscord = this.discordPresenceByUsername.get(key);
    if (existingDiscord) {
      existingDiscord.status = aggregated.accountStatus;
      existingDiscord.updatedAt = Math.max(existingDiscord.updatedAt, now);
      this.discordPresenceByUsername.set(key, existingDiscord);
    }

    if (changed) {
      this.emitAccountStatusBroadcast({
        username,
        userId: userId || prevEntry?.userId || null,
        discordId: discordId || prevEntry?.discordId || null,
        accountStatus: aggregated.accountStatus,
        updatedAt: now,
      });
      const resolved = this.composeResolvedPresence(
        username,
        userId || prevEntry?.userId || null,
        discordId || prevEntry?.discordId || null,
        'client',
        now
      );
      this.emitPresenceBroadcast(resolved);
    }
  }

  public hasFreshAccountStatus(username: string, maxAgeMs = this.ACCOUNT_STATUS_STALE_MS): boolean {
    if (!username) return false;
    const key = username.trim().toLowerCase();
    const devices = this.accountStatusDevicesByUser.get(key);
    if (!devices || devices.size === 0) return false;
    const now = Date.now();
    for (const entry of devices.values()) {
      if (now - entry.lastSeenAt < maxAgeMs) {
        return true;
      }
    }
    return false;
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

    // Prevent race conditions: Ignore demonstrably older packets using timestamps or per-user client sequence.
    // If timestamp advances >= 5s (e.g., plugin/Discord restart resetting local sequence), allow sequence reset.
    if (update.source === 'discord_bot' || update.source === 'lanyard' || update.source === 'client') {
      if (existingDiscord) {
        if (update.timestamp && existingDiscord.updatedAt > update.timestamp) {
          return existing || this.composeResolvedPresence(update.username, update.userId, update.discordId, update.source);
        }
        const isSessionReset = Boolean(update.timestamp && update.timestamp - existingDiscord.updatedAt >= 5000);
        if (
          !isSessionReset &&
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

    const cleanActivities = Array.isArray(update.activities) && update.status !== 'offline'
      ? update.activities
          .filter((a) => a && a.type !== 4 && Boolean(a.name))
          .map((a) => this.sanitizeLiveActivity(a))
      : [];

    let cleanActivity: LiveActivity | null = null;
    if (update.status !== 'offline') {
      if (update.hasActivity && update.activity && update.activity.type !== 4) {
        cleanActivity = this.sanitizeLiveActivity(update.activity);
      } else if (cleanActivities.length > 0) {
        cleanActivity = selectPrimaryNativeActivity(cleanActivities);
      }
    }

    const finalActivities = cleanActivities.length > 0 ? cleanActivities : cleanActivity ? [cleanActivity] : [];

    if (update.source === 'discord_bot' || update.source === 'lanyard' || update.source === 'client') {
      this.discordPresenceByUsername.set(key, {
        userId: update.userId || existingDiscord?.userId || existing?.userId || null,
        discordId: update.discordId || existingDiscord?.discordId || existing?.discordId || null,
        status: update.status,
        activity: cleanActivity,
        activities: finalActivities,
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
    const accountEntry = this.accountStatusByUsername.get(key);
    const hasFreshDeviceStatus = this.hasFreshAccountStatus(username);

    // Discord Account Status is strictly independent from Custom RPC / activities
    const discordStatus: AccountStatus = hasFreshDeviceStatus && accountEntry
      ? accountEntry.accountStatus
      : discordState?.status || accountEntry?.accountStatus || 'offline';
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
      accountStatus: discordStatus,
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

    // Map all supported non-custom activities and pick primary deterministically
    const nonCustomActivities = rawPresence.activities.filter((a: any) => a && a.type !== 4 && a.name);
    if (nonCustomActivities.length === 0) {
      return this.updatePresence({
        username: user.username,
        userId: user.id,
        discordId,
        status: rawPresence.status,
        hasActivity: false,
        activity: null,
        activities: [],
        source: 'discord_bot',
      });
    }

    const mappedActivities: LiveActivity[] = nonCustomActivities.map((rawAct: any) => {
      const aId = rawAct.applicationId || rawAct.application_id;
      const lImg = this.resolveDiscordAssetUrl(aId, rawAct.assets?.largeImage || rawAct.assets?.large_image);
      const sImg = this.resolveDiscordAssetUrl(aId, rawAct.assets?.smallImage || rawAct.assets?.small_image);
      const st = normalizeEpochMs(rawAct.timestamps?.start);
      const en = normalizeEpochMs(rawAct.timestamps?.end);
      const btns = normalizeActivityButtons(rawAct.buttons, rawAct.metadata?.button_urls);
      const isSp = rawAct.name === 'Spotify' && (rawAct.type === 2 || rawAct.type === 'LISTENING');
      return {
        name: rawAct.name,
        appName: rawAct.name,
        applicationId: aId || null,
        type: typeof rawAct.type === 'number' ? rawAct.type : 0,
        details: rawAct.details || null,
        state: rawAct.state || null,
        largeImage: lImg,
        largeImageText: rawAct.assets?.largeText || rawAct.assets?.large_text || null,
        smallImage: sImg,
        smallImageText: rawAct.assets?.smallText || rawAct.assets?.small_text || null,
        streamUrl: rawAct.url || null,
        timestamps: (st !== null || en !== null) ? { start: st, end: en } : null,
        startTimestamp: st !== null ? new Date(st).toISOString() : null,
        endTimestamp: en !== null ? new Date(en).toISOString() : null,
        party: rawAct.party?.size ? { size: rawAct.party.size } : null,
        buttons: btns,
        spotify: isSp
          ? {
              track_id: rawAct.syncId || rawAct.sync_id || null,
              song: rawAct.details || null,
              artist: rawAct.state || null,
              album: rawAct.assets?.largeText || rawAct.assets?.large_text || null,
              album_art_url: lImg,
              timestamps: (st !== null || en !== null) ? { start: st, end: en } : null,
            }
          : null,
      };
    });

    const liveActivity = selectPrimaryNativeActivity(mappedActivities) || mappedActivities[0];

    return this.updatePresence({
      username: user.username,
      userId: user.id,
      discordId,
      status: rawPresence.status,
      hasActivity: true,
      activity: liveActivity,
      activities: mappedActivities,
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

  public hasFreshDiscordPresence(username: string, maxAgeMs = 90_000): boolean {
    if (!username) return false;
    const key = username.trim().toLowerCase();
    const existing = this.discordPresenceByUsername.get(key);
    return Boolean(existing && Date.now() - existing.updatedAt < maxAgeMs);
  }

  public async getLivePresenceForUser(user: {
    id: string;
    username: string;
    discordId?: string | null;
    avatar?: string | null;
    profile?: { avatarUrl?: string | null } | null;
    richPresence?: any;
  }): Promise<LivePresence> {
    const key = user.username.trim().toLowerCase();
    const now = Date.now();
    const LIVE_CACHE_FRESH_MS = 8000;
    const CLIENT_AUTHORITY_WINDOW_MS = 60_000;
    const LIVE_CACHE_MAX_STALE_MS = 5 * 60 * 1000; // 5 minutes max stale window

    const dbRpc = user.richPresence || (await prisma.richPresence.findUnique({
      where: { userId: user.id },
    }));

    let avatarSource = user.avatar || user.profile?.avatarUrl || null;
    if (dbRpc && dbRpc.useProfileAvatar !== false && !avatarSource) {
      const userWithAvatar = await prisma.user.findUnique({
        where: { id: user.id },
        select: { avatar: true, profile: { select: { avatarUrl: true } } },
      }).catch(() => null);
      avatarSource = userWithAvatar?.avatar || userWithAvatar?.profile?.avatarUrl || null;
    }
    const resolvedDynamicAvatar =
      dbRpc && dbRpc.useProfileAvatar !== false
        ? resolveDiscordAvatarUrl(user.discordId, avatarSource)
        : null;

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
        type: parseActivityTypeNum(dbRpc.activityType),
        details: formattedDetails || null,
        state: formattedState || null,
        largeImage:
          customCfg.largeImageEnabled !== false
            ? ((dbRpc.useProfileAvatar !== false ? resolvedDynamicAvatar : null) || dbRpc.largeImage || null)
            : null,
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

    // Refresh Discord state if stale/missing and user has a Discord ID.
    // Do not let external Lanyard polling overwrite a recently active Vencord plugin ('client') snapshot or fresh accountStatus.
    const existingDiscord = this.discordPresenceByUsername.get(key);
    const hasFreshAcct = this.hasFreshAccountStatus(user.username);
    if (existingDiscord) {
      const ageMs = now - existingDiscord.updatedAt;
      if (
        hasFreshAcct ||
        ageMs < LIVE_CACHE_FRESH_MS ||
        (existingDiscord.source === 'client' && ageMs < CLIENT_AUTHORITY_WINDOW_MS)
      ) {
        return this.composeResolvedPresence(user.username, user.id, user.discordId, existingDiscord.source, now);
      }
    } else if (hasFreshAcct) {
      return this.composeResolvedPresence(user.username, user.id, user.discordId, 'client', now);
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

