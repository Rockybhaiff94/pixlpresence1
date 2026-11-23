export interface CustomStreak {
    id: string;
    enabled: boolean;
    name: string;        // e.g. "Win Streak", "Daily Grind", "Day Streak"
    value: number;       // e.g. 5, 12, 25, 100
    prefix?: string;     // e.g. "🔥", "⚡", ""
    suffix?: string;     // e.g. "x", "Days", "Wins", "Streak"
    displayText?: string;// custom override text or auto-computed
    targetField: "details" | "state"; // whether to append to Details or State
    mode?: "manual" | "dynamic";      // manual value or dynamic
}

export interface CustomStatistic {
    id: string;
    enabled: boolean;
    label: string;       // e.g. "Wins", "Kills", "Level", "Rank", "Score", "Hours"
    value: string | number; // e.g. "120", "450", "25", "Diamond", "9,500"
    prefix?: string;     // e.g. "🏆", "⚔️", "⭐", ""
    suffix?: string;     // e.g. "W", "K", "h", "pts", ""
    targetField: "details" | "state"; // whether to append to Details or State
    mode?: "manual" | "dynamic";
}

export interface CustomStatusLabel {
    id: string;
    enabled: boolean;
    label: string;       // e.g. "MVP", "Competitive", "Trending", "Legendary", "Online"
    emoji?: string;      // e.g. "👑", "🔥", "🟢", "⚔️"
    targetField: "details" | "state";
}

export interface RpcCustomConfig {
    detailsUrl?: string | null;
    stateUrl?: string | null;
    detailsEnabled?: boolean | null;
    stateEnabled?: boolean | null;
    largeImageUrl?: string | null;
    smallImageUrl?: string | null;
    timestampMode?: "none" | "now" | "time" | "custom" | null;
    streaks?: CustomStreak[] | null;
    statistics?: CustomStatistic[] | null;
    statusLabels?: CustomStatusLabel[] | null;
}

export interface RpcResponse {
    id?: string;
    appName?: string | null;
    appId?: string | null;
    activityType?: string | number | null;
    streamUrl?: string | null;
    state?: string | null;
    details?: string | null;
    detailsUrl?: string | null;
    stateUrl?: string | null;
    detailsEnabled?: boolean | null;
    stateEnabled?: boolean | null;
    useProfileAvatar?: boolean | null;
    largeImageEnabled?: boolean | null;
    largeImage?: string | null;
    largeImageUrl?: string | null;
    smallImageEnabled?: boolean | null;
    smallImage?: string | null;
    smallImageUrl?: string | null;
    largeImageText?: string | null;
    smallImageText?: string | null;
    largeImageCrop?: string | null;
    smallImageCrop?: string | null;
    buttonSize?: "small" | "medium" | "large" | null;
    timestampMode?: "none" | "now" | "time" | "custom" | number | null;
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
    customConfig?: string | null;
    streaks?: CustomStreak[] | null;
    statistics?: CustomStatistic[] | null;
    statusLabels?: CustomStatusLabel[] | null;
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
    details_url?: string;
    state_url?: string;
    assets?: {
        large_image?: string;
        large_text?: string;
        large_url?: string;
        small_image?: string;
        small_text?: string;
        small_url?: string;
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
