export type DiscordAccountStatus = "online" | "idle" | "dnd" | "offline";

export interface AccountStatusSnapshot {
    discordUserId: string;
    accountStatus: DiscordAccountStatus;
    statusUpdatedAt: string;
    source: "vencord_client";
}

const VALID_STATUSES = new Set<DiscordAccountStatus>(["online", "idle", "dnd", "offline"]);

export function normalizeDiscordAccountStatus(rawStatus: unknown): DiscordAccountStatus {
    const clean = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : "";
    if (clean === "online") return "online";
    if (clean === "idle") return "idle";
    if (clean === "dnd") return "dnd";
    // "invisible" maps to "offline" cleanly
    return "offline";
}

export function isValidDiscordAccountStatus(value: unknown): value is DiscordAccountStatus {
    return typeof value === "string" && VALID_STATUSES.has(value as DiscordAccountStatus);
}

export function readCurrentDiscordAccountStatus(params: {
    getCurrentUser?: () => { id?: string } | null;
    getPresenceStatus?: (userId: string) => unknown;
    getSelfPresenceStatus?: () => unknown;
}): AccountStatusSnapshot | null {
    const currentUser = params.getCurrentUser?.();
    if (!currentUser?.id) return null;

    let rawStatus: unknown = params.getPresenceStatus?.(currentUser.id);
    if (
        (rawStatus === undefined || rawStatus === null || rawStatus === "" || rawStatus === "unknown") &&
        typeof params.getSelfPresenceStatus === "function"
    ) {
        rawStatus = params.getSelfPresenceStatus();
    }

    return {
        discordUserId: String(currentUser.id),
        accountStatus: normalizeDiscordAccountStatus(rawStatus),
        statusUpdatedAt: new Date().toISOString(),
        source: "vencord_client",
    };
}
