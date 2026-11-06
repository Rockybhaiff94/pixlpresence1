import { prisma } from '@discord-rpc/database';

export async function recordSyncEvent(
  eventType: string,
  entityId: string,
  payload: Record<string, any>,
  version: number = 1
) {
  try {
    return await prisma.synchronizationEvent.create({
      data: {
        eventType,
        entityId,
        version,
        payload: JSON.stringify(payload),
        deliveryStatus: 'PROCESSED',
        processedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[SyncEvent Error] Failed to record event ${eventType}:`, err);
    return null;
  }
}

