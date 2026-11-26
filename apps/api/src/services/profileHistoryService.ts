import { prisma } from '@discord-rpc/database';

export const HISTORY_RETENTION_DAYS = 7;
export const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

let schemaEnsured = false;

/**
 * Ensures ProfileHistorySnapshot table & indexes exist even in environments where
 * build scripts only ran `prisma generate` without `prisma db push`.
 */
export async function ensureHistoryTableExists(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProfileHistorySnapshot" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "profileId" TEXT NOT NULL,
        "profileVersion" INTEGER NOT NULL DEFAULT 1,
        "schemaVersion" TEXT NOT NULL DEFAULT '2.0',
        "saveSource" TEXT NOT NULL DEFAULT 'manual_save_draft',
        "snapshotJson" TEXT NOT NULL,
        "assetUrlsJson" TEXT NOT NULL DEFAULT '[]',
        "clientRequestId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ProfileHistorySnapshot_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ProfileHistorySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ProfileHistorySnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "ProfileHistorySnapshot_userId_clientRequestId_key" ON "ProfileHistorySnapshot"("userId", "clientRequestId")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ProfileHistorySnapshot_userId_createdAt_idx" ON "ProfileHistorySnapshot"("userId", "createdAt")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ProfileHistorySnapshot_profileId_createdAt_idx" ON "ProfileHistorySnapshot"("profileId", "createdAt")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ProfileHistorySnapshot_expiresAt_idx" ON "ProfileHistorySnapshot"("expiresAt")`
    );
    schemaEnsured = true;
  } catch (err) {
    console.warn('[ProfileHistory] ensureHistoryTableExists warning:', err);
  }
}

function addAssetRef(set: Set<string>, val: unknown) {
  if (typeof val !== 'string') return;
  const trimmed = val.trim();
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return;
  set.add(trimmed);
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const u = new URL(trimmed);
      if (u.pathname) set.add(u.pathname);
    }
  } catch {
    // ignore malformed URLs
  }
}

function collectFromBuilderDoc(doc: any, set: Set<string>) {
  if (!doc || typeof doc !== 'object') return;
  if (doc.canvas && typeof doc.canvas === 'object') {
    addAssetRef(set, doc.canvas.backgroundImage);
    addAssetRef(set, doc.canvas.backgroundVideo);
  }
  if (Array.isArray(doc.nodes)) {
    for (const node of doc.nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node.style && typeof node.style === 'object') {
        addAssetRef(set, node.style.backgroundImage);
      }
      if (node.config && typeof node.config === 'object') {
        addAssetRef(set, node.config.src);
        addAssetRef(set, node.config.bgImageUrl);
        addAssetRef(set, node.config.bgVideoUrl);
        addAssetRef(set, node.config.artworkUrl);
        addAssetRef(set, node.config.largeImage);
        addAssetRef(set, node.config.appIcon);
      }
    }
  }
}

/**
 * Extracts all durable media/asset references from a serialized profile or history snapshot.
 */
export function extractAssetUrlsFromSnapshot(snapshotObj: any): string[] {
  const refs = new Set<string>();
  if (!snapshotObj || typeof snapshotObj !== 'object') return [];

  addAssetRef(refs, snapshotObj.avatarUrl);
  addAssetRef(refs, snapshotObj.bannerUrl);
  addAssetRef(refs, snapshotObj.musicUrl);

  let cfg = snapshotObj.designConfig;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = null;
    }
  }
  if (cfg && typeof cfg === 'object') {
    addAssetRef(refs, cfg.background?.imageUrl);
    addAssetRef(refs, cfg.background?.videoUrl);
    addAssetRef(refs, cfg.audio?.url);
    collectFromBuilderDoc(cfg.profileBuilder, refs);
    collectFromBuilderDoc(cfg.draftProfileBuilder, refs);
  }
  // If caller passed a builder document directly
  if (snapshotObj.version === '2.0' && Array.isArray(snapshotObj.nodes)) {
    collectFromBuilderDoc(snapshotObj, refs);
  }

  return Array.from(refs);
}

function normalizeSnapshotForDiff(snapshotObj: Record<string, any>): string {
  const clone: Record<string, any> = JSON.parse(JSON.stringify(snapshotObj || {}));
  if (clone.designConfig && typeof clone.designConfig === 'object') {
    if (clone.designConfig.draftProfileBuilder?.metadata) {
      clone.designConfig.draftProfileBuilder.metadata = {
        ...clone.designConfig.draftProfileBuilder.metadata,
        updatedAt: undefined,
      };
    }
    if (clone.designConfig.profileBuilder?.metadata) {
      clone.designConfig.profileBuilder.metadata = {
        ...clone.designConfig.profileBuilder.metadata,
        updatedAt: undefined,
      };
    }
  }
  return JSON.stringify(clone);
}

/**
 * Persists a complete profile snapshot inside a Prisma transaction.
 * Deduplicates duplicate clientRequestId retries and unchanged consecutive snapshots.
 */
export async function createHistorySnapshotTx(
  tx: any,
  params: {
    userId: string;
    profileId: string;
    profileVersion: number;
    schemaVersion?: string;
    saveSource?: string;
    snapshotObj: Record<string, any>;
    clientRequestId?: string | null;
    createdAt?: Date;
  }
) {
  await ensureHistoryTableExists();

  const cleanClientReqId =
    typeof params.clientRequestId === 'string' && params.clientRequestId.trim().length > 0
      ? params.clientRequestId.trim().slice(0, 80)
      : null;

  if (cleanClientReqId) {
    const existing = await tx.profileHistorySnapshot.findFirst({
      where: { userId: params.userId, clientRequestId: cleanClientReqId },
    });
    if (existing) {
      return existing;
    }
  }

  const now = params.createdAt ?? new Date();
  const latest = await tx.profileHistorySnapshot.findFirst({
    where: {
      userId: params.userId,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (latest?.snapshotJson) {
    try {
      const prevNorm = normalizeSnapshotForDiff(JSON.parse(latest.snapshotJson));
      const nextNorm = normalizeSnapshotForDiff(params.snapshotObj);
      if (prevNorm === nextNorm) {
        return latest;
      }
    } catch {
      // Proceed to create snapshot if prior JSON was unreadable
    }
  }

  const createdAt = now;
  const expiresAt = new Date(createdAt.getTime() + HISTORY_RETENTION_MS);
  const assetUrls = extractAssetUrlsFromSnapshot(params.snapshotObj);

  return tx.profileHistorySnapshot.create({
    data: {
      userId: params.userId,
      profileId: params.profileId,
      profileVersion: params.profileVersion,
      schemaVersion: params.schemaVersion || '2.0',
      saveSource: params.saveSource || 'manual_save_draft',
      snapshotJson: JSON.stringify(params.snapshotObj),
      assetUrlsJson: JSON.stringify(assetUrls),
      clientRequestId: cleanClientReqId,
      createdAt,
      expiresAt,
    },
  });
}

export async function listUserHistory(userId: string, limit = 50) {
  await ensureHistoryTableExists();
  const now = new Date();
  const rows = await prisma.profileHistorySnapshot.findMany({
    where: {
      userId,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
    select: {
      id: true,
      profileId: true,
      profileVersion: true,
      schemaVersion: true,
      saveSource: true,
      assetUrlsJson: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  return rows;
}

export async function getUserHistorySnapshot(userId: string, snapshotId: string) {
  await ensureHistoryTableExists();
  const now = new Date();
  return prisma.profileHistorySnapshot.findFirst({
    where: {
      id: snapshotId,
      userId,
      expiresAt: { gt: now },
    },
  });
}

/**
 * Checks whether an UploadedAsset URL/path is still referenced by the user's active profile
 * or any non-expired retained history snapshot.
 */
export async function isAssetReferencedByProfileOrHistory(
  userId: string,
  candidateUrls: string[]
): Promise<{ referenced: boolean; source?: 'active_profile' | 'history_snapshot' }> {
  const normalizedCandidates = new Set<string>();
  for (const url of candidateUrls) {
    addAssetRef(normalizedCandidates, url);
  }
  if (normalizedCandidates.size === 0) {
    return { referenced: false };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { avatarUrl: true, bannerUrl: true, musicUrl: true, designConfig: true },
  });
  if (profile) {
    const activeRefs = extractAssetUrlsFromSnapshot(profile);
    for (const ref of activeRefs) {
      if (normalizedCandidates.has(ref)) {
        return { referenced: true, source: 'active_profile' };
      }
    }
  }

  await ensureHistoryTableExists();
  const retainedSnapshots = await prisma.profileHistorySnapshot.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    select: { assetUrlsJson: true },
  });

  for (const snap of retainedSnapshots) {
    try {
      const urls = JSON.parse(snap.assetUrlsJson || '[]');
      if (Array.isArray(urls)) {
        for (const u of urls) {
          if (typeof u === 'string' && normalizedCandidates.has(u)) {
            return { referenced: true, source: 'history_snapshot' };
          }
        }
      }
    } catch {
      // ignore malformed json
    }
  }

  return { referenced: false };
}

/**
 * Removes expired ProfileHistorySnapshot rows (>7 days old).
 * Never modifies or deletes active Profiles or referenced UploadedAssets.
 */
export async function cleanupExpiredHistory(now: Date = new Date()): Promise<{
  deletedSnapshots: number;
  retainedSnapshots: number;
}> {
  await ensureHistoryTableExists();
  const deleted = await prisma.profileHistorySnapshot.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });
  const retainedSnapshots = await prisma.profileHistorySnapshot.count({
    where: {
      expiresAt: { gt: now },
    },
  });
  return {
    deletedSnapshots: deleted.count,
    retainedSnapshots,
  };
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startHistoryRetentionScheduler() {
  // Run initial startup pass asynchronously without blocking HTTP listen
  setTimeout(() => {
    cleanupExpiredHistory()
      .then((res) => {
        if (res.deletedSnapshots > 0) {
          console.log(
            `[ProfileHistory] Retention cleanup removed ${res.deletedSnapshots} expired snapshot(s); ${res.retainedSnapshots} active snapshot(s) retained.`
          );
        }
      })
      .catch((err) => console.warn('[ProfileHistory] Initial cleanup error:', err));
  }, 5000);

  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      cleanupExpiredHistory().catch((err) =>
        console.warn('[ProfileHistory] Scheduled cleanup error:', err)
      );
    }, 6 * 60 * 60 * 1000);
    cleanupInterval.unref?.();
  }
}
