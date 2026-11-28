import { CapturedNativeActivity, NativePresenceSnapshot } from "./types";

const CUSTOM_RPC_SOCKET_ID = "pixels-rpc";

export function mapDiscordStatus(rawStatus: unknown): "online" | "idle" | "dnd" | "offline" {
    const clean = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : "";
    if (clean === "online") return "online";
    if (clean === "idle") return "idle";
    if (clean === "dnd") return "dnd";
    // "invisible" maps to "offline" to respect Discord's user visibility privacy
    return "offline";
}

export function resolveNativeAssetUrl(applicationId?: string | null, assetInput?: string | null): string | null {
    if (!assetInput || typeof assetInput !== "string") return null;
    const raw = assetInput.trim();
    if (!raw) return null;

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }
    if (raw.startsWith("spotify:")) {
        return `https://i.scdn.co/image/${raw.slice("spotify:".length)}`;
    }
    if (raw.startsWith("mp:external/")) {
        return `https://media.discordapp.net/external/${raw.slice("mp:external/".length)}`;
    }
    if (raw.startsWith("twitch:")) {
        return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${raw.slice("twitch:".length)}-440x248.jpg`;
    }
    if (applicationId && /^[0-9a-zA-Z_-]+$/.test(raw)) {
        return `https://cdn.discordapp.com/app-assets/${applicationId}/${raw}.png`;
    }
    return raw;
}

export function isOwnCustomRpcActivity(rawAct: any, customAppId?: string | null): boolean {
    if (!rawAct || typeof rawAct !== "object") return false;
    if (rawAct.session_id === CUSTOM_RPC_SOCKET_ID || rawAct.id === CUSTOM_RPC_SOCKET_ID) {
        return true;
    }
    const actAppId = rawAct.application_id || rawAct.applicationId;
    if (customAppId && actAppId && String(actAppId) === String(customAppId) && rawAct.type !== 2) {
        return true;
    }
    return false;
}

function normalizeEpochMs(val: unknown): number | null {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") {
        if (!Number.isFinite(val) || val <= 0) return null;
        if (val < 1e12 && val > 1e8) return Math.round(val * 1000);
        return val >= 1e12 ? Math.round(val) : null;
    }
    if (typeof val === "string") {
        const t = val.trim();
        if (/^\d+(\.\d+)?$/.test(t)) return normalizeEpochMs(Number(t));
        const p = Date.parse(t);
        return Number.isFinite(p) && p > 1e11 ? Math.round(p) : null;
    }
    return null;
}

export function normalizeNativeActivities(
    rawActivities: unknown,
    options?: { customAppId?: string | null }
): CapturedNativeActivity[] {
    if (!Array.isArray(rawActivities)) return [];
    const results: CapturedNativeActivity[] = [];

    for (const raw of rawActivities) {
        if (!raw || typeof raw !== "object") continue;
        // Skip Custom Status (type 4) and our own PixelRPC local injection
        if (raw.type === 4) continue;
        if (isOwnCustomRpcActivity(raw, options?.customAppId)) continue;
        if (!raw.name || typeof raw.name !== "string") continue;

        const appId = raw.application_id || raw.applicationId || null;
        const rawLarge = raw.assets?.large_image ?? raw.assets?.largeImage ?? null;
        const rawSmall = raw.assets?.small_image ?? raw.assets?.smallImage ?? null;
        const largeImage = resolveNativeAssetUrl(appId, rawLarge);
        const smallImage = resolveNativeAssetUrl(appId, rawSmall);

        const start = normalizeEpochMs(raw.timestamps?.start);
        const end = normalizeEpochMs(raw.timestamps?.end);
        const timestamps = start !== null || end !== null ? { start, end } : null;

        const urls: string[] = Array.isArray(raw.metadata?.button_urls) ? raw.metadata.button_urls : [];
        const normalizedButtons: Array<{ label: string; url: string }> = [];
        if (Array.isArray(raw.buttons)) {
            for (let i = 0; i < Math.min(2, raw.buttons.length); i++) {
                const btn = raw.buttons[i];
                if (typeof btn === "string" && btn.trim()) {
                    const url = typeof urls[i] === "string" && /^https?:\/\//i.test(urls[i].trim()) ? urls[i].trim() : "";
                    normalizedButtons.push({ label: btn.trim(), url });
                } else if (btn && typeof btn === "object" && typeof btn.label === "string" && btn.label.trim()) {
                    const rawUrl = typeof btn.url === "string" ? btn.url.trim() : typeof urls[i] === "string" ? urls[i].trim() : "";
                    normalizedButtons.push({
                        label: btn.label.trim(),
                        url: /^https?:\/\//i.test(rawUrl) ? rawUrl : ""
                    });
                }
            }
        }

        const numericType = typeof raw.type === "number" ? raw.type : 0;
        const isSpotify = raw.name === "Spotify" && numericType === 2;

        const partySize = Array.isArray(raw.party?.size) && raw.party.size.length === 2
            ? ([Number(raw.party.size[0]), Number(raw.party.size[1])] as [number, number])
            : null;

        results.push({
            name: raw.name,
            appName: raw.name,
            applicationId: appId ? String(appId) : null,
            type: numericType,
            details: typeof raw.details === "string" ? raw.details : null,
            state: typeof raw.state === "string" ? raw.state : null,
            largeImage,
            largeImageText: raw.assets?.large_text ?? raw.assets?.largeText ?? null,
            smallImage,
            smallImageText: raw.assets?.small_text ?? raw.assets?.smallText ?? null,
            streamUrl: typeof raw.url === "string" ? raw.url : null,
            timestamps,
            party: partySize ? { size: partySize } : null,
            buttons: normalizedButtons.length > 0 ? normalizedButtons : null,
            spotify: isSpotify
                ? {
                    track_id: raw.sync_id || raw.syncId || null,
                    song: typeof raw.details === "string" ? raw.details : null,
                    artist: typeof raw.state === "string" ? raw.state : null,
                    album: raw.assets?.large_text ?? raw.assets?.largeText ?? null,
                    album_art_url: largeImage,
                    timestamps
                }
                : null
        });
    }

    return results;
}

const TYPE_RANK: Record<number, number> = {
    1: 1, // Streaming
    0: 2, // Playing Game
    2: 3, // Listening (Spotify)
    5: 4, // Competing
    3: 5  // Watching
};

export function selectPrimaryCapturedActivity(
    activities: CapturedNativeActivity[]
): CapturedNativeActivity | null {
    if (!Array.isArray(activities) || activities.length === 0) return null;
    const sorted = [...activities].sort((a, b) => {
        const ra = TYPE_RANK[a.type] ?? 99;
        const rb = TYPE_RANK[b.type] ?? 99;
        return ra - rb;
    });
    return sorted[0] || null;
}

export function captureLocalPresenceSnapshot(params: {
    userId?: string | null;
    getStatus?: (userId: string) => unknown;
    getActivities?: (userId: string) => unknown;
    customAppId?: string | null;
}): NativePresenceSnapshot | null {
    const { userId, getStatus, getActivities, customAppId } = params;
    if (!userId || !getStatus || !getActivities) return null;

    const status = mapDiscordStatus(getStatus(userId));
    const rawActivities = status === "offline" ? [] : getActivities(userId);
    const activities = normalizeNativeActivities(rawActivities, { customAppId });
    const activity = selectPrimaryCapturedActivity(activities);

    return {
        status,
        activities,
        activity
    };
}
