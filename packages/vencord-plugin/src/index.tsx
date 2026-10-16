import definePlugin, { OptionType } from "@utils/types";
import { findByProps, Common } from "@webpack";

interface RpcResponse {
    id?: string;
    appName?: string | null;
    appId?: string | null;
    state?: string | null;
    details?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
    largeImageText?: string | null;
    smallImageText?: string | null;
    startTimestamp?: string | Date | null;
    endTimestamp?: string | Date | null;
    partySize?: number | null;
    partyMax?: number | null;
    button1Label?: string | null;
    button1Url?: string | null;
    button2Label?: string | null;
    button2Url?: string | null;
}

let syncIntervalTimer: any = null;
let socketInstance: WebSocket | null = null;
const SOCKET_ID = "pixels-rpc";
const DEFAULT_APP_ID = "1523632136878559302"; // Pixel.gg default client ID

function getFluxDispatcher() {
    return Common?.FluxDispatcher || findByProps("dispatch", "isDispatching");
}

function clearActivity() {
    const dispatcher = getFluxDispatcher();
    if (dispatcher) {
        dispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: SOCKET_ID,
            activity: null
        });
    }
}

function setActivity(rpc: RpcResponse) {
    const dispatcher = getFluxDispatcher();
    if (!dispatcher) return;

    const buttons: { label: string; url: string }[] = [];
    if (rpc.button1Label && rpc.button1Url) {
        buttons.push({ label: rpc.button1Label, url: rpc.button1Url });
    }
    if (rpc.button2Label && rpc.button2Url) {
        buttons.push({ label: rpc.button2Label, url: rpc.button2Url });
    }

    const hasAssets = Boolean(rpc.largeImage || rpc.smallImage);
    const hasTimestamps = Boolean(rpc.startTimestamp || rpc.endTimestamp);

    const activity: Record<string, any> = {
        application_id: rpc.appId || DEFAULT_APP_ID,
        name: rpc.appName || "Pixel.gg",
        type: 0, // ActivityType.PLAYING
    };

    if (rpc.state) activity.state = rpc.state;
    if (rpc.details) activity.details = rpc.details;

    if (hasAssets) {
        activity.assets = {};
        if (rpc.largeImage) activity.assets.large_image = rpc.largeImage;
        if (rpc.largeImageText) activity.assets.large_text = rpc.largeImageText;
        if (rpc.smallImage) activity.assets.small_image = rpc.smallImage;
        if (rpc.smallImageText) activity.assets.small_text = rpc.smallImageText;
    }

    if (hasTimestamps) {
        activity.timestamps = {};
        if (rpc.startTimestamp) {
            activity.timestamps.start = Math.floor(new Date(rpc.startTimestamp).getTime());
        }
        if (rpc.endTimestamp) {
            activity.timestamps.end = Math.floor(new Date(rpc.endTimestamp).getTime());
        }
    }

    if (buttons.length > 0) {
        activity.buttons = buttons.map(b => b.label);
        activity.metadata = {
            button_urls: buttons.map(b => b.url)
        };
    }

    if (rpc.partySize && rpc.partyMax) {
        activity.party = {
            size: [rpc.partySize, rpc.partyMax]
        };
    }

    dispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        socketId: SOCKET_ID,
        activity
    });
}

async function fetchAndApplyRpc(apiUrl: string, token: string) {
    if (!token) {
        clearActivity();
        return;
    }

    try {
        const normalizedUrl = apiUrl.replace(/\/+$/, "");
        const response = await fetch(`${normalizedUrl}/api/rpc/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("[PixelsRPC] Unauthorized: Check your Pixel.gg App Token.");
            }
            return;
        }

        const data: RpcResponse = await response.json();
        if (data && (data.state || data.details || data.appName || data.largeImage)) {
            setActivity(data);
        } else {
            clearActivity();
        }
    } catch (err) {
        console.error("[PixelsRPC] Failed to sync presence:", err);
    }
}

export default definePlugin({
    name: "PixelsRPC",
    description: "Syncs your Discord Rich Presence directly with your Pixel.gg web profile.",
    authors: [{ name: "Pixel.gg", id: 0n }],

    options: {
        token: {
            type: OptionType.STRING,
            description: "Your Pixel.gg App Token (obtain from your Pixel.gg Dashboard)",
            default: "",
            restartNeeded: false
        },
        apiUrl: {
            type: OptionType.STRING,
            description: "Pixel.gg API URL",
            default: "http://localhost:3001",
            restartNeeded: false
        },
        refreshInterval: {
            type: OptionType.NUMBER,
            description: "Sync interval (in seconds)",
            default: 15,
            restartNeeded: false
        }
    },

    start() {
        const settings = this.options as any;
        const token = (settings.token?.value ?? settings.token ?? "").trim();
        const apiUrl = (settings.apiUrl?.value ?? settings.apiUrl ?? "http://localhost:3001").trim();
        const intervalSec = Math.max(5, Number(settings.refreshInterval?.value ?? settings.refreshInterval ?? 15));

        // Initial synchronization
        fetchAndApplyRpc(apiUrl, token);

        // Periodic polling
        syncIntervalTimer = setInterval(() => {
            const currentToken = (settings.token?.value ?? settings.token ?? "").trim();
            const currentApiUrl = (settings.apiUrl?.value ?? settings.apiUrl ?? "http://localhost:3001").trim();
            fetchAndApplyRpc(currentApiUrl, currentToken);
        }, intervalSec * 1000);

        console.log("[PixelsRPC] Plugin started. Syncing with Pixel.gg platform.");
    },

    stop() {
        if (syncIntervalTimer) {
            clearInterval(syncIntervalTimer);
            syncIntervalTimer = null;
        }

        if (socketInstance) {
            socketInstance.close();
            socketInstance = null;
        }

        clearActivity();
        console.log("[PixelsRPC] Plugin stopped and Rich Presence cleared.");
    }
});
