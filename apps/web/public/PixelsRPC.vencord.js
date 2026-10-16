/**
 * PixelsRPC — Discord Rich Presence for Pixel.gg (Vencord Plugin)
 * 
 * Sets your Discord Rich Presence directly based on your Pixel.gg web profile.
 * Only touches your local Discord client; never changes other users' clients.
 */
(function () {
    const SOCKET_ID = "pixels-rpc";
    const DEFAULT_APP_ID = "1523632136878559302";

    let syncTimer = null;
    let config = {
        token: localStorage.getItem("pixelsrpc_token") || "",
        apiUrl: localStorage.getItem("pixelsrpc_api_url") || "http://localhost:3001",
        interval: parseInt(localStorage.getItem("pixelsrpc_interval") || "15", 10)
    };

    function findDispatcher() {
        if (window.Vencord?.Webpack?.Common?.FluxDispatcher) {
            return window.Vencord.Webpack.Common.FluxDispatcher;
        }
        if (window.Vencord?.Webpack?.findByProps) {
            return window.Vencord.Webpack.findByProps("dispatch", "isDispatching");
        }
        // Fallback for standard Discord Webpack chunk
        try {
            const webpack = window.webpackChunkdiscord_app;
            if (webpack) {
                let found = null;
                webpack.push([[Symbol()], {}, (e) => {
                    for (const m of Object.values(e.c)) {
                        if (m?.exports?.default?.dispatch && m?.exports?.default?.isDispatching) {
                            found = m.exports.default;
                            break;
                        }
                    }
                }]);
                if (found) return found;
            }
        } catch (_) {}
        return null;
    }

    function clearActivity() {
        const dispatcher = findDispatcher();
        if (dispatcher) {
            dispatcher.dispatch({
                type: "LOCAL_ACTIVITY_UPDATE",
                socketId: SOCKET_ID,
                activity: null
            });
        }
    }

    function setActivity(rpc) {
        const dispatcher = findDispatcher();
        if (!dispatcher) {
            console.warn("[PixelsRPC] Discord FluxDispatcher not found.");
            return;
        }

        const buttons = [];
        if (rpc.button1Label && rpc.button1Url) buttons.push({ label: rpc.button1Label, url: rpc.button1Url });
        if (rpc.button2Label && rpc.button2Url) buttons.push({ label: rpc.button2Label, url: rpc.button2Url });

        const activity = {
            application_id: rpc.appId || DEFAULT_APP_ID,
            name: rpc.appName || "Pixel.gg",
            type: 0 // Playing
        };

        if (rpc.state) activity.state = rpc.state;
        if (rpc.details) activity.details = rpc.details;

        if (rpc.largeImage || rpc.smallImage) {
            activity.assets = {};
            if (rpc.largeImage) activity.assets.large_image = rpc.largeImage;
            if (rpc.largeImageText) activity.assets.large_text = rpc.largeImageText;
            if (rpc.smallImage) activity.assets.small_image = rpc.smallImage;
            if (rpc.smallImageText) activity.assets.small_text = rpc.smallImageText;
        }

        if (rpc.startTimestamp || rpc.endTimestamp) {
            activity.timestamps = {};
            if (rpc.startTimestamp) activity.timestamps.start = Math.floor(new Date(rpc.startTimestamp).getTime());
            if (rpc.endTimestamp) activity.timestamps.end = Math.floor(new Date(rpc.endTimestamp).getTime());
        }

        if (buttons.length > 0) {
            activity.buttons = buttons.map(b => b.label);
            activity.metadata = { button_urls: buttons.map(b => b.url) };
        }

        dispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: SOCKET_ID,
            activity
        });
    }

    async function fetchAndSync() {
        if (!config.token) {
            clearActivity();
            return;
        }

        try {
            const url = config.apiUrl.replace(/\/+$/, "");
            const res = await fetch(`${url}/api/rpc/me`, {
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    console.warn("[PixelsRPC] Unauthorized: App token invalid.");
                }
                return;
            }

            const data = await res.json();
            if (data && (data.state || data.details || data.appName || data.largeImage)) {
                setActivity(data);
            } else {
                clearActivity();
            }
        } catch (err) {
            console.error("[PixelsRPC] Failed to sync:", err);
        }
    }

    const PixelsRPC = {
        name: "PixelsRPC",
        start(options = {}) {
            if (options.token) {
                config.token = options.token;
                localStorage.setItem("pixelsrpc_token", options.token);
            }
            if (options.apiUrl) {
                config.apiUrl = options.apiUrl;
                localStorage.setItem("pixelsrpc_api_url", options.apiUrl);
            }
            if (options.interval) {
                config.interval = options.interval;
                localStorage.setItem("pixelsrpc_interval", String(options.interval));
            }

            if (syncTimer) clearInterval(syncTimer);

            fetchAndSync();
            syncTimer = setInterval(fetchAndSync, Math.max(5, config.interval) * 1000);
            console.log("[PixelsRPC] Sync started with API:", config.apiUrl);
        },

        stop() {
            if (syncTimer) {
                clearInterval(syncTimer);
                syncTimer = null;
            }
            clearActivity();
            console.log("[PixelsRPC] Rich Presence stopped.");
        },

        setToken(token) {
            this.start({ token });
        },

        getStatus() {
            return {
                running: Boolean(syncTimer),
                tokenConfigured: Boolean(config.token),
                apiUrl: config.apiUrl,
                interval: config.interval
            };
        }
    };

    window.PixelsRPC = PixelsRPC;

    // Auto-start if token was previously saved
    if (config.token) {
        PixelsRPC.start();
    }
})();
