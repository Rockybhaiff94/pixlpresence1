import definePlugin from "@utils/types";
import { FluxDispatcher, React } from "@webpack/common";
import { findByProps } from "@webpack";
import { settings } from "./settings";
import { SettingsAbout } from "./components/SettingsAbout";
import { ConnectionState, DiscordActivity, RpcResponse } from "./types";

const SOCKET_ID = "pixels-rpc";
const DEFAULT_APP_ID = "1523632136878559302";

let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activeAbortController: AbortController | null = null;
let lastActivityHash: string | null = null;

let state: ConnectionState = {
    status: "disconnected",
    lastSync: null,
    lastError: null,
    retryCount: 0,
    activeTitle: null,
    linkedUsername: null
};

// UI subscriber callback for re-rendering SettingsAbout
let onStateChangeCallback: (() => void) | null = null;

function updateState(partial: Partial<ConnectionState>) {
    state = { ...state, ...partial };
    if (onStateChangeCallback) {
        onStateChangeCallback();
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

function buildDiscordActivity(rpc: RpcResponse): DiscordActivity {
    const store = settings.store;
    const appId = (rpc.appId || "").trim() || DEFAULT_APP_ID;
    const appName = (rpc.appName || "").trim() || store.fallbackAppName || "Pixel.gg";

    const activity: DiscordActivity = {
        application_id: appId,
        name: appName,
        type: 0 // Playing
    };

    if (rpc.state && rpc.state.trim()) {
        activity.state = rpc.state.trim();
    }
    if (rpc.details && rpc.details.trim()) {
        activity.details = rpc.details.trim();
    }

    if (rpc.largeImage || rpc.smallImage) {
        activity.assets = {};
        if (rpc.largeImage) activity.assets.large_image = rpc.largeImage.trim();
        if (rpc.largeImageText) activity.assets.large_text = rpc.largeImageText.trim();
        if (rpc.smallImage) activity.assets.small_image = rpc.smallImage.trim();
        if (rpc.smallImageText) activity.assets.small_text = rpc.smallImageText.trim();
    }

    if (store.showTimestamps && (rpc.startTimestamp || rpc.endTimestamp)) {
        activity.timestamps = {};
        if (rpc.startTimestamp) {
            const start = new Date(rpc.startTimestamp).getTime();
            if (!Number.isNaN(start)) activity.timestamps.start = Math.floor(start);
        }
        if (rpc.endTimestamp) {
            const end = new Date(rpc.endTimestamp).getTime();
            if (!Number.isNaN(end)) activity.timestamps.end = Math.floor(end);
        }
    }

    if (store.showButtons) {
        const labels: string[] = [];
        const urls: string[] = [];

        if (rpc.button1Label && rpc.button1Url) {
            labels.push(rpc.button1Label.trim());
            urls.push(rpc.button1Url.trim());
        }
        if (rpc.button2Label && rpc.button2Url) {
            labels.push(rpc.button2Label.trim());
            urls.push(rpc.button2Url.trim());
        }

        if (labels.length > 0) {
            activity.buttons = labels;
            activity.metadata = { button_urls: urls };
        }
    }

    if (rpc.partySize && rpc.partyMax && rpc.partySize > 0 && rpc.partyMax > 0) {
        activity.party = {
            size: [Math.floor(rpc.partySize), Math.floor(rpc.partyMax)]
        };
    }

    return activity;
}

export function applyActivity(rpc: RpcResponse) {
    if (
        !settings.store.activityVisibility ||
        rpc.enableDiscordRpc === false ||
        (rpc as any).enable_discord_rpc === false ||
        (rpc as any).enabled === false
    ) {
        clearActivity();
        return;
    }

    const hasContent = Boolean(
        rpc.appName || rpc.state || rpc.details || rpc.largeImage || rpc.smallImage
    );

    if (!hasContent) {
        clearActivity();
        return;
    }

    const activity = buildDiscordActivity(rpc);
    const hash = JSON.stringify(activity);

    // Prevent redundant Flux dispatches if payload hasn't changed
    if (hash === lastActivityHash) {
        logDebug("Presence payload unchanged, skipping dispatch.");
        return;
    }

    const dispatcher = getDispatcher();
    if (!dispatcher) {
        console.warn("[PixelsRPC] Discord FluxDispatcher is not available.");
        return;
    }

    dispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        socketId: SOCKET_ID,
        activity
    });

    lastActivityHash = hash;
    updateState({ activeTitle: activity.name });
    logDebug("Updated local Discord presence:", activity);
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
                lastError: null,
                retryCount: 0
            });

            logDebug(`Account successfully linked as @${data.username}`);
            isConnected = true;

            // Immediately fetch presence
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
        linkedUsername: null,
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
        clearActivity();
        updateState({
            status: "disconnected",
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
        updateState({ status: "connecting" });

        const response = await fetch(`${apiUrl}/api/rpc/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            signal: activeAbortController.signal
        });

        if (response.status === 401) {
            clearActivity();
            updateState({
                status: "unauthorized",
                lastError: "Session expired or token invalid. Please re-link your account."
            });
            return;
        }

        if (response.status === 429) {
            updateState({
                status: "rate_limited",
                lastError: "Rate limit reached. Backing off..."
            });
            scheduleNextSync(true);
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: RpcResponse = await response.json();

        applyActivity(data);

        updateState({
            status: "connected",
            lastSync: new Date(),
            lastError: null,
            retryCount: 0,
            linkedUsername: store.linkedUsername || null
        });

        scheduleNextSync(false);
    } catch (err: any) {
        if (err.name === "AbortError") return;

        console.error("[PixelsRPC] Sync failed:", err);
        updateState({
            status: "error",
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

    settings,
    settingsAboutComponent: SettingsAboutWrapper,

    start() {
        logDebug("Plugin starting...");

        // Only start network polling if account is linked or token is present
        if (getActiveToken()) {
            fetchAndSync();
        } else {
            updateState({
                status: "disconnected",
                linkedUsername: null,
                lastError: null
            });
            logDebug("Plugin enabled, awaiting account linking before sync.");
        }

        console.log("[PixelsRPC] Plugin started successfully.");
    },

    stop() {
        logDebug("Plugin stopping...");

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
            retryCount: 0,
            activeTitle: null
        });

        console.log("[PixelsRPC] Plugin stopped and Rich Presence cleared.");
    }
});
