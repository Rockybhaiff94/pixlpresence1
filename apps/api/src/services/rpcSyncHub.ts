import { Server, Socket } from 'socket.io';
import { prisma } from '@discord-rpc/database';

export type ConnectionState =
  | 'not_linked'
  | 'authorizing'
  | 'linking'
  | 'connected'
  | 'syncing'
  | 'reconnecting'
  | 'disconnected'
  | 'offline'
  | 'unauthorized'
  | 'discord_unavailable'
  | 'error';

export type PublishingStatus =
  | 'not_published'
  | 'preparing'
  | 'publishing'
  | 'active'
  | 'update_pending'
  | 'failed'
  | 'cleared';

export interface DeviceRuntimeState {
  deviceId: string;
  userId: string;
  username?: string;
  deviceName: string;
  pluginVersion: string;
  connectionState: ConnectionState;
  discordAvailable: boolean;
  publishingStatus: PublishingStatus;
  lastAppliedRevision: number;
  activeTitle: string | null;
  lastHeartbeat: number;
  lastSync: number;
  isOnline: boolean;
  lastError: string | null;
}

export interface HeartbeatPayload {
  deviceId?: string;
  deviceToken?: string;
  pluginVersion?: string;
  discordAvailable?: boolean;
  publishingStatus?: PublishingStatus;
  lastAppliedRevision?: number;
  activeTitle?: string | null;
  lastError?: string | null;
  timestamp?: number;
}

export interface ConfigAckPayload {
  revision: number;
  success: boolean;
  publishingStatus?: PublishingStatus;
  activeTitle?: string | null;
  error?: string | null;
}

class RpcSyncHub {
  private io: Server | null = null;
  private runtimeDevices = new Map<string, DeviceRuntimeState>();
  private activeSocketsByDevice = new Map<string, Set<string>>();
  private activeSocketsByUser = new Map<string, Set<string>>();
  private monitorTimer: NodeJS.Timeout | null = null;

  public initialize(ioInstance: Server) {
    this.io = ioInstance;
    this.setupSocketHandlers();
    this.startStaleConnectionMonitor();
    console.log('[RpcSyncHub] Initialized with real-time bidirectional synchronization.');
  }

  /**
   * Register socket handlers for both Web clients and Vencord Plugin clients
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      // 1. Authenticate either Web client (via appToken) or Plugin client (via deviceToken or appToken)
      socket.on('authenticate', async (token: string, clientInfo?: { clientType?: 'web' | 'plugin'; version?: string; deviceName?: string }) => {
        if (!token || typeof token !== 'string') {
          return socket.emit('authenticated', false, { error: 'Missing token' });
        }

        const cleanToken = token.trim();

        // A. Check user appToken (Web dashboard or direct token)
        const user = await prisma.user.findFirst({ where: { appToken: cleanToken } });
        if (user) {
          (socket as any).userId = user.id;
          (socket as any).clientType = clientInfo?.clientType || 'web';
          socket.join(`user_${user.id}`);

          let userSockets = this.activeSocketsByUser.get(user.id);
          if (!userSockets) {
            userSockets = new Set();
            this.activeSocketsByUser.set(user.id, userSockets);
          }
          userSockets.add(socket.id);

          return socket.emit('authenticated', true, {
            clientType: (socket as any).clientType,
            userId: user.id,
            username: user.username,
          });
        }

        // B. Check deviceToken (Vencord Plugin)
        const deviceAuth = await prisma.rpcDeviceAuthorization.findUnique({
          where: { deviceToken: cleanToken },
          include: { user: true },
        });

        if (deviceAuth && deviceAuth.status === 'CONSUMED' && deviceAuth.user) {
          (socket as any).userId = deviceAuth.user.id;
          (socket as any).deviceId = deviceAuth.id;
          (socket as any).deviceToken = deviceAuth.deviceToken;
          (socket as any).clientType = 'plugin';

          socket.join(`user_${deviceAuth.user.id}`);
          socket.join(`device_${deviceAuth.id}`);

          let devSockets = this.activeSocketsByDevice.get(deviceAuth.id);
          if (!devSockets) {
            devSockets = new Set();
            this.activeSocketsByDevice.set(deviceAuth.id, devSockets);
          }
          devSockets.add(socket.id);

          // Update runtime state
          this.recordDeviceActivity(deviceAuth.id, deviceAuth.user.id, deviceAuth.deviceName || 'Vencord Discord Client', {
            isOnline: true,
            connectionState: 'connected',
            pluginVersion: clientInfo?.version || '1.1.0',
            lastHeartbeat: Date.now(),
          });

          // Notify user room that device is online
          this.broadcastDeviceStatus(deviceAuth.user.id, deviceAuth.id);

          return socket.emit('authenticated', true, {
            clientType: 'plugin',
            deviceId: deviceAuth.id,
            userId: deviceAuth.user.id,
            username: deviceAuth.user.username,
          });
        }

        return socket.emit('authenticated', false, { error: 'Invalid or revoked token' });
      });

      // 2. Real-time heartbeat from connected Vencord plugin
      socket.on('device_heartbeat', async (payload: HeartbeatPayload) => {
        const deviceId = (socket as any).deviceId || payload?.deviceId;
        const userId = (socket as any).userId;
        const deviceToken = (socket as any).deviceToken || payload?.deviceToken;

        if (!deviceId && !deviceToken) return;

        await this.handleHeartbeat(payload, socket);
      });

      // 3. Configuration application acknowledgment from plugin
      socket.on('rpc_config_ack', async (payload: ConfigAckPayload) => {
        const deviceId = (socket as any).deviceId;
        const userId = (socket as any).userId;

        if (!deviceId || !userId) return;
        this.handleConfigAck(deviceId, userId, payload);
      });

      // 4. Intentional disconnect event from plugin
      socket.on('plugin_disconnect', async () => {
        const deviceId = (socket as any).deviceId;
        const userId = (socket as any).userId;
        if (deviceId && userId) {
          await this.handleDeviceRevoked(deviceId, userId, 'disconnected_from_plugin');
        }
      });

      // 5. Socket disconnection cleanup
      socket.on('disconnect', () => {
        const deviceId = (socket as any).deviceId;
        const userId = (socket as any).userId;

        if (deviceId) {
          const devSockets = this.activeSocketsByDevice.get(deviceId);
          if (devSockets) {
            devSockets.delete(socket.id);
            if (devSockets.size === 0) {
              this.activeSocketsByDevice.delete(deviceId);
            }
          }
        }

        if (userId) {
          const userSockets = this.activeSocketsByUser.get(userId);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              this.activeSocketsByUser.delete(userId);
            }
          }
        }
      });
    });
  }

  /**
   * Process a heartbeat from either WebSocket or HTTP endpoint
   */
  public async handleHeartbeat(payload: HeartbeatPayload, socket?: Socket): Promise<DeviceRuntimeState | null> {
    const rawToken = payload?.deviceToken || (socket as any)?.deviceToken;
    let deviceId = payload?.deviceId || (socket as any)?.deviceId;
    let userId = (socket as any)?.userId;

    let deviceRecord: any = null;
    if (deviceId) {
      deviceRecord = await prisma.rpcDeviceAuthorization.findUnique({
        where: { id: deviceId },
        include: { user: true },
      });
    } else if (rawToken) {
      deviceRecord = await prisma.rpcDeviceAuthorization.findUnique({
        where: { deviceToken: rawToken },
        include: { user: true },
      });
    }

    if (!deviceRecord || deviceRecord.status !== 'CONSUMED' || !deviceRecord.user) {
      if (socket) {
        socket.emit('device_revoked', { deviceId, reason: 'unauthorized_or_revoked' });
      }
      return null;
    }

    deviceId = deviceRecord.id;
    userId = deviceRecord.user.id;

    const now = Date.now();
    const discordAvailable = payload.discordAvailable !== false;
    let connectionState: ConnectionState = 'connected';
    if (!discordAvailable) {
      connectionState = 'discord_unavailable';
    } else if (payload.lastError) {
      connectionState = 'error';
    }

    const publishingStatus: PublishingStatus = payload.publishingStatus || (discordAvailable ? 'active' : 'failed');

    const updated = this.recordDeviceActivity(deviceId, userId, deviceRecord.deviceName || 'Discord Client', {
      username: deviceRecord.user.username,
      pluginVersion: payload.pluginVersion || '1.1.0',
      connectionState,
      discordAvailable,
      publishingStatus,
      lastAppliedRevision: typeof payload.lastAppliedRevision === 'number' ? payload.lastAppliedRevision : 0,
      activeTitle: payload.activeTitle || null,
      lastError: payload.lastError || null,
      lastHeartbeat: now,
      lastSync: now,
      isOnline: true,
    });

    // Update database lastUsedAt and deviceMetadata asynchronously
    prisma.rpcDeviceAuthorization
      .update({
        where: { id: deviceId },
        data: {
          lastUsedAt: new Date(),
          deviceMetadata: JSON.stringify({
            pluginVersion: updated.pluginVersion,
            discordAvailable: updated.discordAvailable,
            publishingStatus: updated.publishingStatus,
            lastAppliedRevision: updated.lastAppliedRevision,
            activeTitle: updated.activeTitle,
            lastHeartbeat: now,
            isOnline: true,
            lastError: updated.lastError,
          }),
        },
      })
      .catch(() => {});

    // Broadcast updated state to the user's dashboard room
    this.broadcastDeviceStatus(userId, deviceId);

    if (socket) {
      socket.emit('heartbeat_ack', {
        success: true,
        timestamp: now,
        serverTime: new Date().toISOString(),
      });
    }

    return updated;
  }

  /**
   * Record or update in-memory runtime device state
   */
  private recordDeviceActivity(
    deviceId: string,
    userId: string,
    deviceName: string,
    partial: Partial<DeviceRuntimeState>
  ): DeviceRuntimeState {
    const existing = this.runtimeDevices.get(deviceId) || {
      deviceId,
      userId,
      deviceName,
      pluginVersion: '1.1.0',
      connectionState: 'connected',
      discordAvailable: true,
      publishingStatus: 'active',
      lastAppliedRevision: 0,
      activeTitle: null,
      lastHeartbeat: Date.now(),
      lastSync: Date.now(),
      isOnline: true,
      lastError: null,
    };

    const next: DeviceRuntimeState = {
      ...existing,
      ...partial,
      deviceId,
      userId,
      deviceName,
    };

    this.runtimeDevices.set(deviceId, next);
    return next;
  }

  /**
   * Handle configuration application acknowledgment from connected plugin
   */
  public handleConfigAck(deviceId: string, userId: string, payload: ConfigAckPayload) {
    const existing = this.runtimeDevices.get(deviceId);
    if (existing) {
      existing.lastAppliedRevision = payload.revision;
      existing.publishingStatus = payload.publishingStatus || (payload.success ? 'active' : 'failed');
      existing.lastError = payload.error || null;
      if (payload.activeTitle) existing.activeTitle = payload.activeTitle;
      this.runtimeDevices.set(deviceId, existing);
    }

    if (this.io) {
      this.io.to(`user_${userId}`).emit('rpc_sync_confirmed', {
        deviceId,
        revision: payload.revision,
        success: payload.success,
        publishingStatus: payload.publishingStatus || 'active',
        activeTitle: payload.activeTitle,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Broadcast a configuration change from website to all connected plugins for this user
   */
  public broadcastConfigUpdate(userId: string, config: any, revision: number) {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit('rpc_config_updated', {
      config,
      revision,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle device revocation / unlinking from either Website or Plugin
   */
  public async handleDeviceRevoked(deviceId: string, userId: string, reason: string = 'revoked') {
    // 1. Update database
    await prisma.rpcDeviceAuthorization.updateMany({
      where: { id: deviceId, userId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // 2. Remove runtime cache
    this.runtimeDevices.delete(deviceId);

    // 3. Broadcast real-time revocation to user room AND device-specific room
    if (this.io) {
      this.io.to(`user_${userId}`).emit('device_revoked', {
        deviceId,
        userId,
        reason,
        timestamp: Date.now(),
      });
      this.io.to(`device_${deviceId}`).emit('device_revoked', {
        deviceId,
        userId,
        reason,
        timestamp: Date.now(),
      });
    }

    // 4. Force disconnect active sockets for this device
    const sockets = this.activeSocketsByDevice.get(deviceId);
    if (sockets && this.io) {
      for (const sId of sockets) {
        const sock = this.io.sockets.sockets.get(sId);
        if (sock) {
          sock.leave(`device_${deviceId}`);
          sock.emit('unauthorized', { reason });
        }
      }
      this.activeSocketsByDevice.delete(deviceId);
    }
  }

  /**
   * Broadcast comprehensive status for a device to user's dashboard
   */
  private broadcastDeviceStatus(userId: string, deviceId: string) {
    if (!this.io) return;
    const runtime = this.runtimeDevices.get(deviceId);
    if (runtime) {
      this.io.to(`user_${userId}`).emit('device_status_update', runtime);
    }
  }

  /**
   * Periodically check for stale heartbeats (> 45s) and mark them as offline
   */
  private startStaleConnectionMonitor(intervalMs: number = 15000, timeoutMs: number = 45000) {
    if (this.monitorTimer) clearInterval(this.monitorTimer);

    this.monitorTimer = setInterval(() => {
      const now = Date.now();
      for (const [deviceId, state] of this.runtimeDevices.entries()) {
        const hasOpenSocket = (this.activeSocketsByDevice.get(deviceId)?.size || 0) > 0;
        const timeSinceHeartbeat = now - state.lastHeartbeat;

        if (timeSinceHeartbeat > timeoutMs && !hasOpenSocket) {
          if (state.isOnline) {
            state.isOnline = false;
            state.connectionState = 'offline';
            this.runtimeDevices.set(deviceId, state);
            this.broadcastDeviceStatus(state.userId, deviceId);
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Get all authorized devices for a user, enriched with live connection status
   */
  public async getDevicesForUser(userId: string) {
    const dbDevices = await prisma.rpcDeviceAuthorization.findMany({
      where: {
        userId,
        status: 'CONSUMED',
      },
      select: {
        id: true,
        deviceName: true,
        deviceMetadata: true,
        consumedAt: true,
        lastUsedAt: true,
        createdAt: true,
        status: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    const now = Date.now();
    return dbDevices.map((d) => {
      const runtime = this.runtimeDevices.get(d.id);
      let parsedMeta: any = {};
      try {
        if (d.deviceMetadata) parsedMeta = JSON.parse(d.deviceMetadata);
      } catch (_) {}

      const hasOpenSocket = (this.activeSocketsByDevice.get(d.id)?.size || 0) > 0;
      const lastUsedMs = d.lastUsedAt ? new Date(d.lastUsedAt).getTime() : 0;
      const isRecentlyActive = now - lastUsedMs < 45000;
      const isOnline = runtime ? runtime.isOnline : hasOpenSocket || isRecentlyActive;

      let connectionState: ConnectionState = 'offline';
      if (isOnline) {
        connectionState = runtime?.connectionState || 'connected';
      }

      let discordAvailable = true;
      if (runtime) {
        discordAvailable = runtime.discordAvailable;
      } else if (typeof parsedMeta.discordAvailable === 'boolean') {
        discordAvailable = parsedMeta.discordAvailable;
      }

      let publishingStatus: PublishingStatus = 'not_published';
      if (runtime) {
        publishingStatus = runtime.publishingStatus;
      } else if (parsedMeta.publishingStatus) {
        publishingStatus = parsedMeta.publishingStatus;
      } else if (isOnline) {
        publishingStatus = 'active';
      }

      return {
        id: d.id,
        deviceName: d.deviceName || 'Vencord Discord Client',
        consumedAt: d.consumedAt,
        lastUsedAt: d.lastUsedAt,
        createdAt: d.createdAt,
        isOnline,
        connectionState,
        discordAvailable,
        publishingStatus,
        pluginVersion: runtime?.pluginVersion || parsedMeta.pluginVersion || '1.1.0',
        lastAppliedRevision: runtime?.lastAppliedRevision || parsedMeta.lastAppliedRevision || 0,
        activeTitle: runtime?.activeTitle || parsedMeta.activeTitle || null,
        lastError: runtime?.lastError || parsedMeta.lastError || null,
      };
    });
  }
}

export const rpcSyncHub = new RpcSyncHub();
