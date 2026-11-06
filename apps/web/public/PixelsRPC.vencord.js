/**
 * PixelsRPC — Native Vencord Plugin Standalone Distribution
 * Repository: https://github.com/Rockybhaiff94/pixlpresence1
 * Backend: https://pixlpresence1-web.vercel.app
 * 
 * Secure, zero-eval client modification plugin for Discord & Vencord.
 */
(function() {
    'use strict';
    const SOCKET_ID = 'pixels-rpc';
    const DEFAULT_APP_ID = '1523632136878559302';

    let syncTimer = null;
    let abortController = null;
    let lastActivityHash = null;
    let retryCount = 0;

    let config = {
        token: localStorage.getItem('pixelsrpc_token') || '',
        apiUrl: localStorage.getItem('pixelsrpc_api_url') || 'https://pixlpresence1-web.vercel.app',
        interval: parseInt(localStorage.getItem('pixelsrpc_interval') || '15', 10),
        enabled: localStorage.getItem('pixelsrpc_enabled') !== 'false'
    };

    function getDispatcher() {
        if (window.Vencord?.Webpack?.Common?.FluxDispatcher) {
            return window.Vencord.Webpack.Common.FluxDispatcher;
        }
        if (window.Vencord?.Webpack?.findByProps) {
            return window.Vencord.Webpack.findByProps('dispatch', 'isDispatching');
        }
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
        const dispatcher = getDispatcher();
        if (dispatcher) {
            dispatcher.dispatch({
                type: 'LOCAL_ACTIVITY_UPDATE',
                socketId: SOCKET_ID,
                activity: null
            });
        }
        lastActivityHash = null;
    }

    function applyActivity(rpc) {
        if (!config.enabled) {
            clearActivity();
            return;
        }

        const buttons = [];
        if (rpc.button1Label && rpc.button1Url) buttons.push({ label: rpc.button1Label.trim(), url: rpc.button1Url.trim() });
        if (rpc.button2Label && rpc.button2Url) buttons.push({ label: rpc.button2Label.trim(), url: rpc.button2Url.trim() });

        const activity = {
            application_id: rpc.appId || DEFAULT_APP_ID,
            name: rpc.appName || 'Pixel.gg',
            type: 0
        };

        if (rpc.state) activity.state = rpc.state.trim();
        if (rpc.details) activity.details = rpc.details.trim();

        if (rpc.largeImage || rpc.smallImage) {
            activity.assets = {};
            if (rpc.largeImage) activity.assets.large_image = rpc.largeImage.trim();
            if (rpc.largeImageText) activity.assets.large_text = rpc.largeImageText.trim();
            if (rpc.smallImage) activity.assets.small_image = rpc.smallImage.trim();
            if (rpc.smallImageText) activity.assets.small_text = rpc.smallImageText.trim();
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

        if (rpc.partySize && rpc.partyMax) {
            activity.party = { size: [rpc.partySize, rpc.partyMax] };
        }

        const hash = JSON.stringify(activity);
        if (hash === lastActivityHash) return;

        const dispatcher = getDispatcher();
        if (dispatcher) {
            dispatcher.dispatch({
                type: 'LOCAL_ACTIVITY_UPDATE',
                socketId: SOCKET_ID,
                activity
            });
            lastActivityHash = hash;
        }
    }

    async function fetchAndSync() {
        if (!config.token || !config.enabled) {
            clearActivity();
            return;
        }

        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();

        try {
            const url = config.apiUrl.replace(/\/+$/, '');
            const res = await fetch(url + '/api/rpc/me', {
                headers: {
                    Authorization: 'Bearer ' + config.token,
                    Accept: 'application/json'
                },
                signal: abortController.signal
            });

            if (res.status === 401 || res.status === 403) {
                console.warn('[PixelsRPC] Unauthorized: Invalid App Token. Please update your token.');
                clearActivity();
                return;
            }

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            const data = await res.json();
            if (data && (data.state || data.details || data.appName || data.largeImage)) {
                applyActivity(data);
            } else {
                clearActivity();
            }
            retryCount = 0;
        } catch (err) {
            if (err.name === 'AbortError') return;
            retryCount++;
            const backoff = Math.min(300, Math.pow(2, retryCount) * 5);
            console.warn('[PixelsRPC] Sync failed, retrying in ' + backoff + 's:', err.message);
        } finally {
            abortController = null;
        }
    }

    const PixelsRPC = {
        name: 'PixelsRPC',
        version: '1.0.0',
        start(options = {}) {
            if (options.token) {
                config.token = options.token.trim();
                localStorage.setItem('pixelsrpc_token', config.token);
            }
            if (options.apiUrl) {
                config.apiUrl = options.apiUrl.trim();
                localStorage.setItem('pixelsrpc_api_url', config.apiUrl);
            }
            if (options.interval) {
                config.interval = Math.max(5, options.interval);
                localStorage.setItem('pixelsrpc_interval', String(config.interval));
            }

            if (syncTimer) clearInterval(syncTimer);
            fetchAndSync();
            syncTimer = setInterval(fetchAndSync, config.interval * 1000);
            console.log('[PixelsRPC] Native plugin active. Connected to:', config.apiUrl);
        },
        stop() {
            if (syncTimer) {
                clearInterval(syncTimer);
                syncTimer = null;
            }
            if (abortController) {
                abortController.abort();
                abortController = null;
            }
            clearActivity();
            console.log('[PixelsRPC] Native plugin stopped.');
        },
        sync() {
            fetchAndSync();
        },
        clear() {
            clearActivity();
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
    if (config.token && config.enabled) {
        PixelsRPC.start();
    }
})();
