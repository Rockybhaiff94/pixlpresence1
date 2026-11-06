export interface RpcResponse {
    id?: string;
    appName?: string | null;
    appId?: string | null;
    state?: string | null;
    details?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
    largeImageText?: string | null;
    smallImageText?: string | null;
    startTimestamp?: string | number | Date | null;
    endTimestamp?: string | number | Date | null;
    partySize?: number | null;
    partyMax?: number | null;
    button1Label?: string | null;
    button1Url?: string | null;
    button2Label?: string | null;
    button2Url?: string | null;
}

export type ConnectionStatus =
    | "disconnected"
    | "connecting"
    | "connected"
    | "unauthorized"
    | "error"
    | "rate_limited";

export interface ConnectionState {
    status: ConnectionStatus;
    lastSync: Date | null;
    lastError: string | null;
    retryCount: number;
    activeTitle: string | null;
}

export interface DiscordActivity {
    application_id: string;
    name: string;
    type: number; // 0 = PLAYING
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
