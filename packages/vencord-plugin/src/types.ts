export interface RpcResponse {
    id?: string;
    appName?: string | null;
    appId?: string | null;
    activityType?: string | number | null;
    streamUrl?: string | null;
    state?: string | null;
    details?: string | null;
    useProfileAvatar?: boolean | null;
    largeImageEnabled?: boolean | null;
    largeImage?: string | null;
    smallImageEnabled?: boolean | null;
    smallImage?: string | null;
    largeImageText?: string | null;
    smallImageText?: string | null;
    largeImageCrop?: string | null;
    smallImageCrop?: string | null;
    buttonSize?: "small" | "medium" | "large" | null;
    startTimestamp?: string | number | Date | null;
    endTimestamp?: string | number | Date | null;
    partySize?: number | null;
    partyMax?: number | null;
    button1Enabled?: boolean | null;
    button1Label?: string | null;
    button1Url?: string | null;
    button2Enabled?: boolean | null;
    button2Label?: string | null;
    button2Url?: string | null;
    showProfileRpc?: boolean | null;
    enableDiscordRpc?: boolean | null;
    username?: string | null;
    revision?: number | null;
}

export type ConnectionStateEnum =
    | "not_linked"
    | "authorizing"
    | "linking"
    | "connecting"
    | "connected"
    | "syncing"
    | "reconnecting"
    | "disconnected"
    | "offline"
    | "unauthorized"
    | "discord_unavailable"
    | "error";

export type PublishingStatus =
    | "not_published"
    | "preparing"
    | "publishing"
    | "active"
    | "update_pending"
    | "failed"
    | "cleared";

// Backwards-compatible alias for existing UI components
export type ConnectionStatus = ConnectionStateEnum;

export interface ConnectionState {
    status: ConnectionStateEnum;
    discordAvailable: boolean;
    publishingStatus: PublishingStatus;
    appliedRevision: number;
    lastSync: Date | null;
    lastHeartbeat: Date | null;
    lastError: string | null;
    retryCount: number;
    activeTitle: string | null;
    linkedUsername: string | null;
    deviceId: string | null;
}

export interface DiscordActivity {
    application_id: string;
    name: string;
    type: number; // 0 = PLAYING, 1 = STREAMING, 2 = LISTENING, 3 = WATCHING, 5 = COMPETING
    url?: string; // Required for type 1 (STREAMING)
    details?: string;
    state?: string;
    assets?: {
        large_image?: string;
        large_text?: string;
        small_image?: string;
        small_text?: string;
    };
    timestamps?: {
        start?: number;
        end?: number;
    };
    party?: {
        size: [number, number];
    };
    buttons?: string[];
    metadata?: {
        button_urls: string[];
    };
}
