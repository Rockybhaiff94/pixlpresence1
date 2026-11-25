import { prisma } from '@discord-rpc/database';
import { resolveDiscordAvatarUrl } from '../auth';
import { recordSyncEvent } from '../utils/sync';

export interface ProfileSyncPreferences {
  syncDiscordProfile: boolean;
  syncUsername: boolean;
  syncDisplayName: boolean;
  syncAvatar: boolean;
  lastSyncedAt: string | null;
}

export const DEFAULT_SYNC_PREFERENCES: ProfileSyncPreferences = {
  syncDiscordProfile: true,
  syncUsername: false,
  syncDisplayName: true,
  syncAvatar: true,
  lastSyncedAt: null,
};

export interface DiscordIdentitySnapshot {
  discordId: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
  avatarUrl: string;
  banner: string | null;
  email?: string | null;
  nitroStatus?: number;
}

export function parseDesignConfigObject(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...(raw as any) };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function extractSyncPreferences(designConfigRaw: string | null | undefined): ProfileSyncPreferences {
  const cfg = parseDesignConfigObject(designConfigRaw);
  const sp = cfg.syncPreferences;
  if (!sp || typeof sp !== 'object') {
    return { ...DEFAULT_SYNC_PREFERENCES };
  }
  return {
    syncDiscordProfile: sp.syncDiscordProfile !== undefined ? Boolean(sp.syncDiscordProfile) : true,
    syncUsername: sp.syncUsername !== undefined ? Boolean(sp.syncUsername) : false,
    syncDisplayName: sp.syncDisplayName !== undefined ? Boolean(sp.syncDisplayName) : true,
    syncAvatar: sp.syncAvatar !== undefined ? Boolean(sp.syncAvatar) : true,
    lastSyncedAt: typeof sp.lastSyncedAt === 'string' ? sp.lastSyncedAt : null,
  };
}

export function mergeSyncPreferencesIntoDesignConfig(
  designConfigRaw: string | null | undefined,
  prefs: ProfileSyncPreferences
): string {
  const cfg = parseDesignConfigObject(designConfigRaw);
  cfg.syncPreferences = prefs;
  return JSON.stringify(cfg);
}

/**
 * Fetches fresh Discord user identity using OAuth accessToken (preferred) or Discord Bot token.
 * Never exposes any token to callers.
 */
export async function fetchFreshDiscordIdentity(
  discordId: string,
  oauthAccessToken?: string | null
): Promise<DiscordIdentitySnapshot | null> {
  try {
    let res: Response | null = null;
    if (oauthAccessToken) {
      res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${oauthAccessToken}` },
        signal: AbortSignal.timeout(6000),
      });
    }

    if ((!res || !res.ok) && process.env.DISCORD_BOT_TOKEN?.trim()) {
      res = await fetch(`https://discord.com/api/v10/users/${encodeURIComponent(discordId)}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN.trim()}` },
        signal: AbortSignal.timeout(6000),
      });
    }

    if (!res || !res.ok) {
      return null;
    }

    const data: any = await res.json();
    if (!data || !data.id || !data.username) {
      return null;
    }

    const avatarHash = data.avatar || null;
    const avatarUrl = resolveDiscordAvatarUrl(data.id, avatarHash);
    return {
      discordId: String(data.id),
      username: String(data.username),
      globalName: data.global_name ? String(data.global_name) : null,
      avatarHash,
      avatarUrl,
      banner: data.banner ? String(data.banner) : null,
      email: data.email ? String(data.email) : undefined,
      nitroStatus: typeof data.premium_type === 'number' ? data.premium_type : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Updates embedded Profile Builder V2 nodes (name-text / profile-image) inside designConfig
 * when Discord sync refreshes display name or avatar.
 */
function syncBuilderNodesInConfig(
  cfg: Record<string, any>,
  updates: { displayName?: string; avatarUrl?: string }
) {
  const applyToDoc = (doc: any) => {
    if (!doc || !Array.isArray(doc.nodes)) return;
    for (const node of doc.nodes) {
      if (updates.displayName !== undefined && node.type === 'name-text' && node.config) {
        node.config.text = updates.displayName;
      }
      if (updates.avatarUrl !== undefined && node.type === 'profile-image' && node.config) {
        node.config.src = updates.avatarUrl;
      }
    }
    if (doc.metadata && typeof doc.metadata === 'object') {
      doc.metadata.updatedAt = new Date().toISOString();
    }
  };

  if (cfg.profileBuilder) applyToDoc(cfg.profileBuilder);
  if (cfg.draftProfileBuilder) applyToDoc(cfg.draftProfileBuilder);
}

/**
 * Applies Discord identity updates to User, Profile, and UserIdentity inside a database transaction,
 * strictly respecting the user's persisted ProfileSyncPreferences.
 */
export async function applyDiscordSyncToUser(
  userId: string,
  snapshot: DiscordIdentitySnapshot,
  options: { force?: boolean } = {}
): Promise<{
  user: any;
  profile: any;
  preferences: ProfileSyncPreferences;
  syncedAt: string;
}> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  const prefs = extractSyncPreferences(existingUser.profile?.designConfig);
  const nowIso = new Date().toISOString();
  const shouldRun = options.force ? prefs.syncDiscordProfile : prefs.syncDiscordProfile;

  const nextPrefs: ProfileSyncPreferences = {
    ...prefs,
    lastSyncedAt: shouldRun ? nowIso : prefs.lastSyncedAt,
  };

  const userUpdateData: Record<string, any> = {};
  const profileUpdateData: Record<string, any> = {};

  if (snapshot.nitroStatus !== undefined) {
    userUpdateData.nitroStatus = snapshot.nitroStatus;
  }
  if (snapshot.banner !== undefined) {
    userUpdateData.banner = snapshot.banner;
  }
  if (snapshot.email !== undefined && snapshot.email) {
    userUpdateData.email = snapshot.email;
  }

  const effectiveDisplayName = snapshot.globalName || snapshot.username;
  const builderNodeUpdates: { displayName?: string; avatarUrl?: string } = {};

  if (shouldRun) {
    if (prefs.syncDisplayName) {
      userUpdateData.globalName = effectiveDisplayName;
      profileUpdateData.displayName = effectiveDisplayName;
      builderNodeUpdates.displayName = effectiveDisplayName;
    }

    if (prefs.syncAvatar) {
      userUpdateData.avatar = snapshot.avatarUrl;
      profileUpdateData.avatarUrl = snapshot.avatarUrl;
      builderNodeUpdates.avatarUrl = snapshot.avatarUrl;
    }

    if (prefs.syncUsername && snapshot.username) {
      const candidateUsername = snapshot.username
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');

      if (candidateUsername.length >= 3 && candidateUsername.length <= 24 && candidateUsername !== existingUser.username) {
        const collision = await prisma.user.findUnique({ where: { username: candidateUsername } });
        if (!collision) {
          userUpdateData.username = candidateUsername;

          // Preserve previous username in aliases so existing links keep resolving
          let aliases: string[] = [];
          try {
            if ((existingUser as any).aliases) {
              aliases = JSON.parse((existingUser as any).aliases);
            }
          } catch {
            aliases = [];
          }
          if (existingUser.username && !aliases.includes(existingUser.username)) {
            const maxAliases = existingUser.premiumStatus ? 5 : 1;
            if (aliases.length < maxAliases) {
              aliases.push(existingUser.username);
              userUpdateData.aliases = JSON.stringify(aliases);
            }
          }
        }
      }
    }
  }

  const currentCfg = parseDesignConfigObject(existingUser.profile?.designConfig);
  if (builderNodeUpdates.displayName !== undefined || builderNodeUpdates.avatarUrl !== undefined) {
    syncBuilderNodesInConfig(currentCfg, builderNodeUpdates);
  }
  currentCfg.syncPreferences = nextPrefs;
  profileUpdateData.designConfig = JSON.stringify(currentCfg);

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = Object.keys(userUpdateData).length > 0
      ? await tx.user.update({ where: { id: userId }, data: userUpdateData })
      : existingUser;

    const updatedProfile = await tx.profile.upsert({
      where: { userId },
      update: {
        ...profileUpdateData,
        profileVersion: { increment: 1 },
      },
      create: {
        userId,
        displayName: effectiveDisplayName,
        avatarUrl: snapshot.avatarUrl,
        designConfig: profileUpdateData.designConfig,
      },
      include: { links: true, buttons: true },
    });

    await tx.userIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: 'discord',
          providerUserId: snapshot.discordId,
        },
      },
      update: {
        email: snapshot.email ?? undefined,
        displayName: effectiveDisplayName,
        avatarUrl: snapshot.avatarUrl,
      },
      create: {
        userId,
        provider: 'discord',
        providerUserId: snapshot.discordId,
        email: snapshot.email ?? null,
        displayName: effectiveDisplayName,
        avatarUrl: snapshot.avatarUrl,
      },
    });

    return { updatedUser, updatedProfile };
  });

  await recordSyncEvent(
    'profile.discord.synced',
    userId,
    {
      username: result.updatedUser.username,
      displayName: result.updatedProfile.displayName,
      avatarUrl: result.updatedProfile.avatarUrl,
      syncedAt: nowIso,
    },
    result.updatedProfile.profileVersion
  );

  return {
    user: result.updatedUser,
    profile: result.updatedProfile,
    preferences: nextPrefs,
    syncedAt: nowIso,
  };
}
