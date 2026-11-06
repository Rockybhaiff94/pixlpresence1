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
    activeTitle: null
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
    if (!settings.store.activityVisibility) {
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

export async function fetchAndSync(): Promise<void> {
    const store = settings.store;
    const token = (store.token || "").trim();
    const apiUrl = (store.apiUrl || "https://pixlpresence1-web.vercel.app").trim().replace(/\/+$/, "");

    if (!token) {
        clearActivity();
        updateState({
            status: "disconnected",
            lastError: "Token not configured"
        });
        return;
    }

    // Abort prior request if still pending
    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    updateState({ status: "connecting" });

    try {
        const response = await fetch(`${apiUrl}/api/rpc/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            signal: activeAbortController.signal
        });

        if (response.status === 401 || response.status === 403) {
            clearActivity();
            updateState({
                status: "unauthorized",
                lastError: "Unauthorized (check your App Token)",
                retryCount: 0
            });
            console.warn("[PixelsRPC] Unauthorized: App Token is invalid or expired. Please update it in Vencord settings.");
            return;
        }

        if (response.status === 429) {
            updateState({
                status: "rate_limited",
                lastError: "Rate limited by server"
            });
            scheduleNextSync(true);
            return;
        }

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const data: RpcResponse = await response.json();
        applyActivity(data);

        updateState({
            status: "connected",
            lastSync: new Date(),
            lastError: null,
            retryCount: 0
        });

        scheduleNextSync(false);
    } catch (err: any) {
        if (err?.name === "AbortError") {
            logDebug("Fetch request was aborted.");
            return;
        }

        const errorMessage = err?.message || "Network request failed";
        updateState({
            status: "error",
            lastError: errorMessage,
            retryCount: state.retryCount + 1
        });

        logDebug("Sync error:", errorMessage);
        scheduleNextSync(true);
    } finally {
        activeAbortController = null;
    }
}

function scheduleNextSync(isRetry: boolean) {
    if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
        syncTimeoutId = null;
    }

    const intervalSec = Math.max(5, settings.store.refreshInterval || 15);
    let delayMs = intervalSec * 1000;

    if (isRetry) {
        // Exponential backoff: min 5s, max 300s, with jitter
        const backoffSec = Math.min(300, Math.pow(2, state.retryCount) * 5);
        const jitter = Math.random() * 2000;
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

    return React.createElement(SettingsAbout, {
        state,
        tokenConfigured: Boolean((store.token || "").trim()),
        apiUrl: store.apiUrl || "https://pixlpresence1-web.vercel.app",
        onSync: () => fetchAndSync(),
        onReconnect: () => {
            updateState({ retryCount: 0 });
            fetchAndSync();
        },
        onClear: () => clearActivity()
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

    settings,
    settingsAboutComponent: SettingsAboutWrapper,

    start() {
        logDebug("Plugin starting...");

        // Initial fetch
        fetchAndSync();

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
