import definePlugin from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, React } from "@webpack/common";
import { findByProps } from "@webpack";
import { settings } from "./settings";
import { SettingsAbout } from "./components/SettingsAbout";
import { ConnectionState, DiscordActivity, RpcResponse } from "./types";
import { formatRichPresenceField } from "./rpcFormat";

const SOCKET_ID = "pixels-rpc";
const DEFAULT_APP_ID = "1523632136878559302";

let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimerId: ReturnType<typeof setInterval> | null = null;
let activeAbortController: AbortController | null = null;
let lastActivityHash: string | null = null;

let state: ConnectionState = {
    status: "not_linked",
    discordAvailable: true,
    publishingStatus: "not_published",
    appliedRevision: 0,
    lastSync: null,
    lastHeartbeat: null,
    lastError: null,
    retryCount: 0,
    activeTitle: null,
    linkedUsername: null,
    deviceId: null
};

// UI subscriber callback for re-rendering SettingsAbout
let onStateChangeCallback: (() => void) | null = null;

function updateState(partial: Partial<ConnectionState>) {
    state = { ...state, ...partial };
    if (onStateChangeCallback) {
        onStateChangeCallback();
    }
}

function handleServerDisconnection(reason: string) {
    const store = settings.store;
    logDebug(`Server disconnection detected: ${reason}`);

    stopHeartbeat();
    clearActivity();

    store.deviceToken = "";
    store.linkedUsername = "";
    store.token = "";

    updateState({
        status: "unauthorized",
        discordAvailable: true,
        publishingStatus: "cleared",
        lastError: reason,
        activeTitle: null,
        linkedUsername: null,
        deviceId: null
    });
}

async function sendHeartbeat(): Promise<void> {
    const store = settings.store;
    const token = getActiveToken();
    const apiUrl = (store.apiUrl || "https://pixlpresence1-web.vercel.app").trim().replace(/\/+$/, "");

    if (!token) return;

    const dispatcher = getDispatcher();
    const discordAvailable = Boolean(dispatcher);

    try {
        const res = await fetch(`${apiUrl}/api/rpc/device/heartbeat`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                deviceId: state.deviceId || undefined,
                deviceToken: token,
                pluginVersion: "1.1.0",
                discordAvailable,
                publishingStatus: state.publishingStatus,
                lastAppliedRevision: state.appliedRevision,
                activeTitle: state.activeTitle,
                lastError: state.lastError,
                timestamp: Date.now()
            })
        });

        if (res.status === 401) {
            handleServerDisconnection("Device was unlinked from Pixel.gg dashboard.");
            return;
        }

        if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.runtime?.deviceId && !state.deviceId) {
                updateState({ deviceId: data.runtime.deviceId });
            }
            updateState({
                lastHeartbeat: new Date(),
                discordAvailable,
                ...(state.status === "offline" || state.status === "reconnecting" ? { status: "connected", lastError: null } : {})
            });
        }
    } catch (err: any) {
        logDebug("Heartbeat ping failed:", err);
    }
}

function startHeartbeat() {
    stopHeartbeat();
    sendHeartbeat();
    heartbeatTimerId = setInterval(() => {
        sendHeartbeat();
    }, 15000);
}

function stopHeartbeat() {
    if (heartbeatTimerId) {
        clearInterval(heartbeatTimerId);
        heartbeatTimerId = null;
    }
}

function logDebug(message: string, ...args: any[]) {
    if (settings.store.debugLogging) {
        console.log(`[PixelsRPC] ${message}`, ...args);
    }
}

function getDispatcher() {
    return FluxDispatcher ?? findByProps("dispatch", "isDispatching");
}

function getActiveToken(): string {
    const store = settings.store;
    return (store.deviceToken || store.token || "").trim();
}

export function clearActivity() {
    const dispatcher = getDispatcher();
    if (!dispatcher) return;

    dispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        socketId: SOCKET_ID,
        activity: null
    });

    lastActivityHash = null;
    updateState({ activeTitle: null });
    logDebug("Local activity cleared.");
}

function resolveActivityType(rawType: string | number | null | undefined): { type: number; defaultName: string } {
    if (typeof rawType === "number") {
        switch (rawType) {
            case 0: return { type: 0, defaultName: "Pixel.gg" };
            case 1: return { type: 1, defaultName: "Twitch" };
            case 2: return { type: 2, defaultName: "Spotify" };
            case 3: return { type: 3, defaultName: "YouTube" };
            case 5: return { type: 5, defaultName: "Arena" };
            default: return { type: 1, defaultName: "Twitch" }; // Default to Streaming
        }
    }
    const str = String(rawType || "streaming").toLowerCase().trim();
    switch (str) {
        case "playing":
        case "0":
            return { type: 0, defaultName: "Pixel.gg" };
        case "listening":
        case "2":
            return { type: 2, defaultName: "Spotify" };
        case "watching":
        case "3":
            return { type: 3, defaultName: "YouTube" };
        case "competing":
        case "5":
            return { type: 5, defaultName: "Arena" };
        case "streaming":
        case "1":
        default:
            return { type: 1, defaultName: "Twitch" }; // Default to Streaming
    }
}

const assetResolutionCache = new Map<string, string>();
let applySequence = 0;

async function resolveDiscordAsset(appId: string, assetInput: string | null | undefined): Promise<string | undefined> {
    if (!assetInput || !assetInput.trim()) return undefined;
    const raw = assetInput.trim();

    // Discord's media proxy identifiers are already resolved.
    if (raw.startsWith("mp:")) {
        return raw;
    }

    // IMPORTANT: External image URLs must be sent directly in the activity payload.
    // Discord converts them to mp: identifiers on the Gateway. Do not run external
    // URLs through ApplicationAssetUtils.fetchAssetIds: that utility resolves
    // Developer Portal asset keys, and that upload path cannot preserve GIF animation.
    // Passing the original public URL lets Discord's Media Proxy serve animated GIF/WebP.
    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    // Only non-URL values are Developer Portal application asset keys.
    const cacheKey = `${appId}:${raw}`;
    if (assetResolutionCache.has(cacheKey)) {
        return assetResolutionCache.get(cacheKey);
    }

    try {
        if (ApplicationAssetUtils && typeof ApplicationAssetUtils.fetchAssetIds === "function") {
            const resolvedList = await ApplicationAssetUtils.fetchAssetIds(appId, [raw]);
            if (Array.isArray(resolvedList) && resolvedList[0]) {
                const assetId = resolvedList[0];
                assetResolutionCache.set(cacheKey, assetId);
                logDebug(`[PixelsRPC] Resolved Discord application asset key [${raw}] -> [${assetId}]`);
                return assetId;
            }
        }
    } catch (e) {
        logDebug("[PixelsRPC] Application asset key resolution failed for:", raw, e);
    }

    // Preserve the key as a fallback if Discord's application-asset lookup is unavailable.
    return raw;
}

async function buildDiscordActivity(rpc: RpcResponse): Promise<DiscordActivity> {
    const store = settings.store;
    const appId = (rpc.appId || "").trim() || DEFAULT_APP_ID;
    const appName = (rpc.appName || "").trim() || store.fallbackAppName || "Pixel.gg";

    const resolvedType = resolveActivityType(rpc.activityType);

    const activity: DiscordActivity = {
        application_id: appId,
        name: appName,
        type: resolvedType.type
    };

    // Unpack extended custom configuration if present
    let streaks = rpc.streaks;
    let statistics = rpc.statistics;
    let statusLabels = rpc.statusLabels;
    let detailsUrl = rpc.detailsUrl;
    let stateUrl = rpc.stateUrl;
    let detailsEnabled = rpc.detailsEnabled;
    let stateEnabled = rpc.stateEnabled;
    let largeImageUrl = rpc.largeImageUrl;
    let smallImageUrl = rpc.smallImageUrl;
    let timestampMode = rpc.timestampMode;

    if (rpc.customConfig && typeof rpc.customConfig === "string") {
        try {
            const parsed = JSON.parse(rpc.customConfig);
            if (parsed && typeof parsed === "object") {
                if (!streaks && parsed.streaks) streaks = parsed.streaks;
                if (!statistics && parsed.statistics) statistics = parsed.statistics;
                if (!statusLabels && parsed.statusLabels) statusLabels = parsed.statusLabels;
                if (detailsUrl === undefined && parsed.detailsUrl !== undefined) detailsUrl = parsed.detailsUrl;
                if (stateUrl === undefined && parsed.stateUrl !== undefined) stateUrl = parsed.stateUrl;
                if (detailsEnabled === undefined && parsed.detailsEnabled !== undefined) detailsEnabled = parsed.detailsEnabled;
                if (stateEnabled === undefined && parsed.stateEnabled !== undefined) stateEnabled = parsed.stateEnabled;
                if (largeImageUrl === undefined && parsed.largeImageUrl !== undefined) largeImageUrl = parsed.largeImageUrl;
                if (smallImageUrl === undefined && parsed.smallImageUrl !== undefined) smallImageUrl = parsed.smallImageUrl;
                if (timestampMode === undefined && parsed.timestampMode !== undefined) timestampMode = parsed.timestampMode;
            }
        } catch (_) {}
    }

    // Discord requires a valid stream URL for type: 1 (Streaming)
    if (activity.type === 1) {
        const streamUrl = (rpc.streamUrl || "").trim();
        activity.url = (streamUrl.startsWith("http://") || streamUrl.startsWith("https://"))
            ? streamUrl
            : `https://twitch.tv/${rpc.username || "pixelgg"}`;
    }

    // Compile Details and State incorporating base text, status labels, streaks, and statistics
    const formattedDetails = formatRichPresenceField(
        rpc.details,
        detailsEnabled,
        "details",
        statusLabels,
        streaks,
        statistics
    );
    if (formattedDetails) {
        activity.details = formattedDetails;
    }

    const formattedState = formatRichPresenceField(
        rpc.state,
        stateEnabled,
        "state",
        statusLabels,
        streaks,
        statistics
    );
    if (formattedState) {
        activity.state = formattedState;
    }

    // Clickable URLs for Details and State where supported
    if (detailsUrl && (detailsUrl.startsWith("http://") || detailsUrl.startsWith("https://"))) {
        activity.details_url = detailsUrl.trim();
    }
    if (stateUrl && (stateUrl.startsWith("http://") || stateUrl.startsWith("https://"))) {
        activity.state_url = stateUrl.trim();
    }

    // Resolve Large Image and Small Icon with Discord Asset system
    // Respect independent enable/disable toggles (largeImageEnabled and smallImageEnabled)
    const isLargeEnabled = (rpc as any).largeImageEnabled !== false;
    const isSmallEnabled = (rpc as any).smallImageEnabled !== false;
    const hasLarge = Boolean(isLargeEnabled && rpc.largeImage && rpc.largeImage.trim());
    const hasSmall = Boolean(isSmallEnabled && rpc.smallImage && rpc.smallImage.trim());

    if (hasLarge || hasSmall) {
        activity.assets = {};
        if (hasLarge && rpc.largeImage) {
            const resolvedLarge = await resolveDiscordAsset(appId, rpc.largeImage.trim());
            if (resolvedLarge) activity.assets.large_image = resolvedLarge;
            if (rpc.largeImageText && rpc.largeImageText.trim()) {
                activity.assets.large_text = rpc.largeImageText.trim().slice(0, 128);
            }
            if (largeImageUrl && (largeImageUrl.startsWith("http://") || largeImageUrl.startsWith("https://"))) {
                activity.assets.large_url = largeImageUrl.trim();
            }
        }
        if (hasSmall && rpc.smallImage) {
            const resolvedSmall = await resolveDiscordAsset(appId, rpc.smallImage.trim());
            if (resolvedSmall) activity.assets.small_image = resolvedSmall;
            if (rpc.smallImageText && rpc.smallImageText.trim()) {
                activity.assets.small_text = rpc.smallImageText.trim().slice(0, 128);
            }
            if (smallImageUrl && (smallImageUrl.startsWith("http://") || smallImageUrl.startsWith("https://"))) {
                activity.assets.small_url = smallImageUrl.trim();
            }
        }
    }

    // Timestamp Configuration
    // Modes: 'none' (0), 'now' (1), 'time' (2), 'custom' (3)
    const tMode = String(timestampMode ?? "now").toLowerCase();
    if (store.showTimestamps && tMode !== "none" && tMode !== "0") {
        if (tMode === "now" || tMode === "1") {
            activity.timestamps = {
                start: Date.now()
            };
        } else if (tMode === "time" || tMode === "2") {
            const now = new Date();
            const startOfDay = Date.now() - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
            activity.timestamps = {
                start: startOfDay
            };
        } else if (tMode === "custom" || tMode === "3" || rpc.startTimestamp || rpc.endTimestamp) {
            activity.timestamps = {};
            if (rpc.startTimestamp) {
                const start = new Date(rpc.startTimestamp).getTime();
                if (!Number.isNaN(start)) activity.timestamps.start = Math.floor(start);
            }
            if (rpc.endTimestamp) {
                const end = new Date(rpc.endTimestamp).getTime();
                if (!Number.isNaN(end)) activity.timestamps.end = Math.floor(end);
            }
            if (!activity.timestamps.start && !activity.timestamps.end) {
                delete activity.timestamps;
            }
        }
    }

    // Custom Buttons (2 independently configurable buttons with validation)
    if (store.showButtons) {
        const labels: string[] = [];
        const urls: string[] = [];

        // Button 1
        if (rpc.button1Enabled !== false && rpc.button1Url && (rpc.button1Url.startsWith("http://") || rpc.button1Url.startsWith("https://"))) {
            const label = (rpc.button1Label || "View Profile").trim().slice(0, 31);
            labels.push(label);
            urls.push(rpc.button1Url.trim());
        }

        // Button 2
        if (rpc.button2Enabled !== false && rpc.button2Url && (rpc.button2Url.startsWith("http://") || rpc.button2Url.startsWith("https://")) && labels.length < 2) {
            const label = (rpc.button2Label || "Get PixelsRPC").trim().slice(0, 31);
            labels.push(label);
            urls.push(rpc.button2Url.trim());
        }

        if (labels.length > 0) {
            activity.buttons = labels;
            activity.metadata = { button_urls: urls };
        }
    }

    // Party Size
    if (
        typeof rpc.partySize === "number" &&
        typeof rpc.partyMax === "number" &&
        rpc.partySize > 0 &&
        rpc.partyMax > 0 &&
        rpc.partySize <= rpc.partyMax
    ) {
        activity.party = {
            size: [Math.floor(rpc.partySize), Math.floor(rpc.partyMax)]
        };
    }

    return activity;
}

export async function applyActivity(rpc: RpcResponse) {
    if (
        !settings.store.activityVisibility ||
        rpc.enableDiscordRpc === false ||
        (rpc as any).enable_discord_rpc === false ||
        (rpc as any).enabled === false
    ) {
        clearActivity();
        updateState({ publishingStatus: "cleared" });
        return;
    }

    // Monotonic revision check: never overwrite newer local activity with older incoming payload
    if (rpc.revision && typeof rpc.revision === "number") {
        if (rpc.revision < state.appliedRevision) {
            logDebug(`Discarding stale config revision #${rpc.revision} (current: #${state.appliedRevision})`);
            return;
        }
    }

    const hasContent = Boolean(
        rpc.appName || rpc.state || rpc.details || rpc.largeImage || rpc.smallImage
    );

    if (!hasContent) {
        clearActivity();
        updateState({ publishingStatus: "cleared" });
        return;
    }

    updateState({ publishingStatus: "publishing" });

    const currentSeq = ++applySequence;
    const activity = await buildDiscordActivity(rpc);
    if (currentSeq !== applySequence) {
        logDebug(`Discarding stale async activity build #${currentSeq} (latest: #${applySequence})`);
        return;
    }
    const hash = JSON.stringify(activity);

    const dispatcher = getDispatcher();
    if (!dispatcher) {
        console.warn("[PixelsRPC] Discord FluxDispatcher is not available.");
        updateState({
            publishingStatus: "failed",
            discordAvailable: false,
            status: "discord_unavailable",
            lastError: "Discord FluxDispatcher is unavailable."
        });
        return;
    }

    // Prevent redundant Flux dispatches if payload hasn't changed
    if (hash === lastActivityHash) {
        logDebug("Presence payload unchanged, skipping dispatch.");
        updateState({
            publishingStatus: "active",
            discordAvailable: true,
            appliedRevision: rpc.revision || state.appliedRevision
        });
        return;
    }

    try {
        dispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: SOCKET_ID,
            activity
        });

        lastActivityHash = hash;
        updateState({
            activeTitle: activity.name,
            publishingStatus: "active",
            discordAvailable: true,
            appliedRevision: rpc.revision || state.appliedRevision + 1,
            lastError: null
        });
        logDebug("Updated local Discord presence:", activity);
    } catch (dispatchErr: any) {
        console.error("[PixelsRPC] Local activity dispatch failed:", dispatchErr);
        updateState({
            publishingStatus: "failed",
            lastError: dispatchErr?.message || "Failed to publish activity to Discord."
        });
    }
}

export async function linkDeviceAccount(code: string): Promise<void> {
    const store = settings.store;
    const configuredApiUrl = (store.apiUrl || "https://pixlpresence1-web.vercel.app").trim().replace(/\/+$/, "");

    // Fallback URLs to protect against domain-level network issues or CORS/CSP blocks
    const candidateUrls = [configuredApiUrl];
    if (configuredApiUrl.includes("pixlpresence1-web.vercel.app")) {
        candidateUrls.push("https://pixelgg-api.onrender.com");
    } else if (configuredApiUrl.includes("pixelgg-api.onrender.com")) {
        candidateUrls.push("https://pixlpresence1-web.vercel.app");
    }

    updateState({ status: "connecting", lastError: null });

    let lastErrorMsg = "Failed to link account.";
    let isConnected = false;

    for (const baseUrl of candidateUrls) {
        try {
            logDebug(`Connecting to authorization endpoint at: ${baseUrl}/api/rpc/device/verify`);
            const response = await fetch(`${baseUrl}/api/rpc/device/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    code: code.trim().toUpperCase(),
                    clientName: "Vencord Discord Client",
                    platform: "Windows / Vencord"
                })
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.success) {
                if (data?.error) {
                    lastErrorMsg = data.error;
                } else if (response.status === 400) {
                    lastErrorMsg = "Invalid or expired linking code. Please generate a fresh code in your web dashboard.";
                } else if (response.status === 401 || response.status === 403) {
                    lastErrorMsg = "Authorization rejected. Please check your account status.";
                } else if (response.status === 404) {
                    lastErrorMsg = "Device verification endpoint not found. Please verify your API URL in settings.";
                } else if (response.status === 429) {
                    lastErrorMsg = "Too many verification attempts. Please wait 30 seconds before trying again.";
                } else if (response.status >= 500) {
                    lastErrorMsg = "PIXEL.GG servers are temporarily unavailable. Please try again shortly.";
                } else {
                    lastErrorMsg = `Verification failed (HTTP ${response.status}).`;
                }

                // If server responded with a definitive business error (e.g. invalid code), do not try fallback
                updateState({
                    status: "error",
                    lastError: lastErrorMsg
                });
                throw new Error(lastErrorMsg);
            }

            // Successfully authenticated
            store.deviceToken = data.deviceToken;
            store.linkedUsername = data.username;

            // If primary URL failed but fallback succeeded, save working URL
            if (baseUrl !== configuredApiUrl) {
                store.apiUrl = baseUrl;
            }

            updateState({
                status: "connected",
                linkedUsername: data.username,
                deviceId: data.deviceId || data.codeId || null,
                lastError: null,
                retryCount: 0
            });

            logDebug(`Account successfully linked as @${data.username}`);
            isConnected = true;

            // Immediately start heartbeat and fetch presence
            startHeartbeat();
            await fetchAndSync();
            break;
        } catch (err: any) {
            // If it's an explicit business error thrown above, re-throw immediately
            if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
                throw err;
            }
            logDebug(`Network error attempting ${baseUrl}:`, err);
            lastErrorMsg = "Network connection failed (Failed to fetch). Discord may be blocking requests via CSP, or PIXEL.GG is unreachable. Please verify your connection.";
        }
    }

    if (!isConnected) {
        updateState({
            status: "error",
            lastError: lastErrorMsg
        });
        throw new Error(lastErrorMsg);
    }
}

export async function disconnectDeviceAccount(): Promise<void> {
    const store = settings.store;
    const token = getActiveToken();
    const apiUrl = (store.apiUrl || "https://pixlpresence1-web.vercel.app").trim().replace(/\/+$/, "");

    stopHeartbeat();

    if (token) {
        try {
            await fetch(`${apiUrl}/api/rpc/device/revoke`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
        } catch {
            // Ignore network errors on logout
        }
    }

    store.deviceToken = "";
    store.linkedUsername = "";
    store.token = "";

    clearActivity();

    updateState({
        status: "disconnected",
        publishingStatus: "cleared",
        linkedUsername: null,
        deviceId: null,
        lastError: null,
        activeTitle: null
    });

    logDebug("Device unlinked successfully.");
}

export async function fetchAndSync(): Promise<void> {
    const store = settings.store;
    const token = getActiveToken();
    const apiUrl = (store.apiUrl || "https://pixlpresence1-web.vercel.app").trim().replace(/\/+$/, "");

    if (!token) {
        stopHeartbeat();
        clearActivity();
        updateState({
            status: "not_linked",
            publishingStatus: "cleared",
            linkedUsername: null,
            lastError: null
        });
        return;
    }

    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    try {
        updateState({ status: "syncing" });

        const response = await fetch(`${apiUrl}/api/rpc/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            signal: activeAbortController.signal
        });

        if (response.status === 401) {
            handleServerDisconnection("Session revoked or token invalid. Please re-link your account.");
            return;
        }

        if (response.status === 429) {
            updateState({
                status: "reconnecting",
                lastError: "Rate limit reached. Backing off..."
            });
            scheduleNextSync(true);
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: RpcResponse = await response.json();

        await applyActivity(data);

        updateState({
            status: "connected",
            lastSync: new Date(),
            lastError: null,
            retryCount: 0,
            linkedUsername: store.linkedUsername || null
        });

        // Ensure heartbeat is ticking
        if (!heartbeatTimerId) {
            startHeartbeat();
        }

        scheduleNextSync(false);
    } catch (err: any) {
        if (err.name === "AbortError") return;

        console.error("[PixelsRPC] Sync failed:", err);
        updateState({
            status: "offline",
            lastError: err.message || "Failed to sync"
        });

        scheduleNextSync(true);
    }
}

function scheduleNextSync(isError: boolean) {
    if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
        syncTimeoutId = null;
    }

    const intervalSec = Math.max(5, settings.store.refreshInterval || 15);
    let delayMs = intervalSec * 1000;

    if (isError) {
        state.retryCount += 1;
        // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
        const backoffSec = Math.min(60, 5 * Math.pow(2, state.retryCount - 1));
        const jitter = Math.floor(Math.random() * 2000);
        delayMs = backoffSec * 1000 + jitter;
        logDebug(`Scheduling retry in ${Math.round(delayMs / 1000)}s (attempt ${state.retryCount})`);
    }

    syncTimeoutId = setTimeout(() => {
        fetchAndSync();
    }, delayMs);
}

function SettingsAboutWrapper() {
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        onStateChangeCallback = () => setTick(t => t + 1);
        return () => {
            onStateChangeCallback = null;
        };
    }, []);

    const store = settings.store;
    const tokenConfigured = Boolean(getActiveToken());

    return React.createElement(SettingsAbout, {
        state,
        tokenConfigured,
        linkedUsername: store.linkedUsername || state.linkedUsername,
        apiUrl: store.apiUrl || "https://pixlpresence1-web.vercel.app",
        onSync: () => fetchAndSync(),
        onClear: () => clearActivity(),
        onLinkAccount: (code: string) => linkDeviceAccount(code),
        onDisconnectAccount: () => disconnectDeviceAccount()
    });
}

export default definePlugin({
    name: "PixelsRPC",
    description: "Syncs your Discord Rich Presence directly with your Pixel.gg web profile.",
    authors: [
        {
            name: "Pixel.gg",
            id: 1523632136878559302n
        }
    ],

    // Disabled by default after installation as requested in specifications
    default: false,

    patches: [
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false"
            }
        }
    ],

    settings,
    settingsAboutComponent: SettingsAboutWrapper,

    start() {
        logDebug("Plugin starting...");

        // Only start network polling if account is linked or token is present
        if (getActiveToken()) {
            startHeartbeat();
            fetchAndSync();
        } else {
            updateState({
                status: "not_linked",
                publishingStatus: "not_published",
                linkedUsername: null,
                lastError: null
            });
            logDebug("Plugin enabled, awaiting account linking before sync.");
        }

        console.log("[PixelsRPC] Plugin started successfully.");
    },

    stop() {
        logDebug("Plugin stopping...");

        stopHeartbeat();

        if (syncTimeoutId) {
            clearTimeout(syncTimeoutId);
            syncTimeoutId = null;
        }

        if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
        }

        clearActivity();

        updateState({
            status: "disconnected",
            publishingStatus: "cleared",
            retryCount: 0,
            activeTitle: null
        });

        console.log("[PixelsRPC] Plugin stopped and Rich Presence cleared.");
    }
});
