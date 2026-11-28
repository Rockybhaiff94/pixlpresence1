const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const pluginDistDir = path.join(distDir, 'pixelsrpc');

console.log('[PixelsRPC Build] Verifying source files...');

const requiredFiles = [
  'index.ts',
  'settings.ts',
  'types.ts',
  'rpcFormat.ts',
  'assetResolver.ts',
  'nativeActivityCapture.ts',
  'styles.css',
  path.join('components', 'StatusCard.tsx'),
  path.join('components', 'ActionControls.tsx'),
  path.join('components', 'SettingsAbout.tsx'),
];

for (const file of requiredFiles) {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[PixelsRPC Build] Missing required source file: ${filePath}`);
    process.exit(1);
  }
}

// 1. Create dist/pixelsrpc structure for direct drop-in to Vencord (src/plugins/pixelsrpc or src/userplugins/pixelsrpc)
if (!fs.existsSync(pluginDistDir)) {
  fs.mkdirSync(pluginDistDir, { recursive: true });
}
const componentsDist = path.join(pluginDistDir, 'components');
if (!fs.existsSync(componentsDist)) {
  fs.mkdirSync(componentsDist, { recursive: true });
}

// Copy clean files to dist/pixelsrpc
fs.copyFileSync(path.join(srcDir, 'index.ts'), path.join(pluginDistDir, 'index.ts'));
fs.copyFileSync(path.join(srcDir, 'settings.ts'), path.join(pluginDistDir, 'settings.ts'));
fs.copyFileSync(path.join(srcDir, 'types.ts'), path.join(pluginDistDir, 'types.ts'));
fs.copyFileSync(path.join(srcDir, 'rpcFormat.ts'), path.join(pluginDistDir, 'rpcFormat.ts'));
fs.copyFileSync(path.join(srcDir, 'assetResolver.ts'), path.join(pluginDistDir, 'assetResolver.ts'));
fs.copyFileSync(path.join(srcDir, 'nativeActivityCapture.ts'), path.join(pluginDistDir, 'nativeActivityCapture.ts'));
fs.copyFileSync(path.join(srcDir, 'styles.css'), path.join(pluginDistDir, 'styles.css'));
if (fs.existsSync(path.join(srcDir, 'native.ts'))) {
  fs.copyFileSync(path.join(srcDir, 'native.ts'), path.join(pluginDistDir, 'native.ts'));
}
fs.copyFileSync(
  path.join(srcDir, 'components', 'StatusCard.tsx'),
  path.join(componentsDist, 'StatusCard.tsx')
);
fs.copyFileSync(
  path.join(srcDir, 'components', 'ActionControls.tsx'),
  path.join(componentsDist, 'ActionControls.tsx')
);
fs.copyFileSync(
  path.join(srcDir, 'components', 'SettingsAbout.tsx'),
  path.join(componentsDist, 'SettingsAbout.tsx')
);
fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(pluginDistDir, 'README.md'));

console.log('[PixelsRPC Build] Clean native plugin packaged to dist/pixelsrpc/');

// 1.5 Sync to apps/web/public/pixelsrpc-plugin/ for the PowerShell CLI installer
const webPluginDir = path.resolve(rootDir, '../../apps/web/public/pixelsrpc-plugin');
if (fs.existsSync(webPluginDir)) {
  const webComponentsDir = path.join(webPluginDir, 'components');
  if (!fs.existsSync(webComponentsDir)) fs.mkdirSync(webComponentsDir, { recursive: true });

  fs.copyFileSync(path.join(srcDir, 'index.ts'), path.join(webPluginDir, 'index.ts'));
  fs.copyFileSync(path.join(srcDir, 'settings.ts'), path.join(webPluginDir, 'settings.ts'));
  fs.copyFileSync(path.join(srcDir, 'types.ts'), path.join(webPluginDir, 'types.ts'));
  fs.copyFileSync(path.join(srcDir, 'rpcFormat.ts'), path.join(webPluginDir, 'rpcFormat.ts'));
  fs.copyFileSync(path.join(srcDir, 'assetResolver.ts'), path.join(webPluginDir, 'assetResolver.ts'));
  fs.copyFileSync(path.join(srcDir, 'nativeActivityCapture.ts'), path.join(webPluginDir, 'nativeActivityCapture.ts'));
  fs.copyFileSync(path.join(srcDir, 'styles.css'), path.join(webPluginDir, 'styles.css'));
  if (fs.existsSync(path.join(srcDir, 'native.ts'))) {
    fs.copyFileSync(path.join(srcDir, 'native.ts'), path.join(webPluginDir, 'native.ts'));
  }
  fs.copyFileSync(
    path.join(srcDir, 'components', 'StatusCard.tsx'),
    path.join(webComponentsDir, 'StatusCard.tsx')
  );
  fs.copyFileSync(
    path.join(srcDir, 'components', 'ActionControls.tsx'),
    path.join(webComponentsDir, 'ActionControls.tsx')
  );
  fs.copyFileSync(
    path.join(srcDir, 'components', 'SettingsAbout.tsx'),
    path.join(webComponentsDir, 'SettingsAbout.tsx')
  );
  console.log('[PixelsRPC Build] Synchronized plugin files to apps/web/public/pixelsrpc-plugin/');
}

// 2. Build standalone single-file distribution (PixelsRPC.vencord.js)
const standaloneBundle = `/**
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

    let sessionNowTimestamp = null;
    const assetCache = new Map();
    let nativePresenceHash = null;
    let nativePresenceSeq = 0;
    let nativeDebounce = null;
    let nativeListener = null;

    function resolveNativeImg(appId, val) {
        if (!val || typeof val !== 'string') return null;
        const r = val.trim();
        if (!r) return null;
        if (r.startsWith('http://') || r.startsWith('https://')) return r;
        if (r.startsWith('spotify:')) return 'https://i.scdn.co/image/' + r.slice(8);
        if (r.startsWith('mp:external/')) return 'https://media.discordapp.net/external/' + r.slice(12);
        if (appId && /^[0-9a-zA-Z_-]+$/.test(r)) return 'https://cdn.discordapp.com/app-assets/' + appId + '/' + r + '.png';
        return r;
    }

    async function pushNativePresence() {
        if (!config.token) return;
        const common = window.Vencord?.Webpack?.Common || {};
        const findProps = window.Vencord?.Webpack?.findByProps;
        const uStore = common.UserStore || (findProps && findProps('getCurrentUser'));
        const pStore = common.PresenceStore || (findProps && findProps('getStatus', 'getActivities'));
        const uid = uStore?.getCurrentUser?.()?.id;
        if (!uid || !pStore) return;

        const rawStatus = String(pStore.getStatus(uid) || 'offline').toLowerCase();
        const status = (rawStatus === 'online' || rawStatus === 'idle' || rawStatus === 'dnd') ? rawStatus : 'offline';
        const rawActs = status === 'offline' ? [] : (pStore.getActivities(uid) || []);
        const activities = [];
        for (const a of rawActs) {
            if (!a || a.type === 4 || a.session_id === SOCKET_ID || a.id === SOCKET_ID || !a.name) continue;
            const appId = a.application_id || a.applicationId || null;
            const lImg = resolveNativeImg(appId, a.assets?.large_image || a.assets?.largeImage);
            const sImg = resolveNativeImg(appId, a.assets?.small_image || a.assets?.smallImage);
            const start = a.timestamps?.start || null;
            const end = a.timestamps?.end || null;
            const urls = Array.isArray(a.metadata?.button_urls) ? a.metadata.button_urls : [];
            const btns = Array.isArray(a.buttons)
                ? a.buttons.slice(0, 2).map((b, i) => typeof b === 'string'
                    ? { label: b, url: urls[i] || '' }
                    : { label: b?.label || '', url: b?.url || urls[i] || '' }).filter(x => x.label)
                : null;
            activities.push({
                name: a.name,
                appName: a.name,
                applicationId: appId,
                type: typeof a.type === 'number' ? a.type : 0,
                details: a.details || null,
                state: a.state || null,
                largeImage: lImg,
                largeImageText: a.assets?.large_text || a.assets?.largeText || null,
                smallImage: sImg,
                smallImageText: a.assets?.small_text || a.assets?.smallText || null,
                streamUrl: a.url || null,
                timestamps: (start || end) ? { start, end } : null,
                party: a.party?.size ? { size: a.party.size } : null,
                buttons: btns && btns.length > 0 ? btns : null
            });
        }
        const primary = activities[0] || null;
        const hash = JSON.stringify({ status, activities });
        if (hash === nativePresenceHash) return;
        try {
            const url = config.apiUrl.replace(/\\/+$/, '');
            const r = await fetch(url + '/api/rpc/presence', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, activity: primary, activities, timestamp: Date.now(), sequence: ++nativePresenceSeq })
            });
            if (r.ok) nativePresenceHash = hash;
        } catch (_) {}
    }

    function subscribeNative() {
        if (nativeListener) return;
        const pStore = window.Vencord?.Webpack?.Common?.PresenceStore || window.Vencord?.Webpack?.findByProps?.('getStatus', 'getActivities');
        const disp = getDispatcher();
        nativeListener = (ev) => {
            if (ev?.type === 'LOCAL_ACTIVITY_UPDATE' && ev?.socketId === SOCKET_ID) return;
            if (nativeDebounce) clearTimeout(nativeDebounce);
            nativeDebounce = setTimeout(pushNativePresence, 150);
        };
        pStore?.addChangeListener?.(nativeListener);
        disp?.subscribe?.('PRESENCE_UPDATES', nativeListener);
        disp?.subscribe?.('LOCAL_ACTIVITY_UPDATE', nativeListener);
        disp?.subscribe?.('SPOTIFY_PLAYER_STATE', nativeListener);
    }

    function unsubscribeNative() {
        if (!nativeListener) return;
        const pStore = window.Vencord?.Webpack?.Common?.PresenceStore || window.Vencord?.Webpack?.findByProps?.('getStatus', 'getActivities');
        const disp = getDispatcher();
        pStore?.removeChangeListener?.(nativeListener);
        disp?.unsubscribe?.('PRESENCE_UPDATES', nativeListener);
        disp?.unsubscribe?.('LOCAL_ACTIVITY_UPDATE', nativeListener);
        disp?.unsubscribe?.('SPOTIFY_PLAYER_STATE', nativeListener);
        nativeListener = null;
    }

    async function resolveAsset(appId, input) {
        if (!input || !String(input).trim()) return undefined;
        const raw = String(input).trim();
        if (raw.startsWith('mp:') || raw.startsWith('spotify:') || raw.startsWith('twitch:')) return raw;
        let target = raw;
        if (/^https?:\\/\\/(cdn|media)\\.discordapp\\.(com|net)\\//i.test(raw)) {
            const anim = /(\\ba_[a-f0-9]{8,}\\b|\\.gif|\\.webp)/i.test(raw);
            target = 'https://wsrv.nl/' + (anim ? 'avatar.gif' : 'avatar.png') + '?url=' + encodeURIComponent(raw) + (anim ? '&n=-1' : '');
        }
        const key = appId + ':' + target;
        if (assetCache.has(key)) return assetCache.get(key);
        const utils = window.Vencord?.Webpack?.Common?.ApplicationAssetUtils;
        if (utils && typeof utils.fetchAssetIds === 'function') {
            try {
                const res = await utils.fetchAssetIds(appId, [target]);
                if (Array.isArray(res) && res[0]) {
                    assetCache.set(key, res[0]);
                    return res[0];
                }
            } catch (_) {}
        }
        return target;
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
        sessionNowTimestamp = null;
    }

    async function applyActivity(rpc) {
        if (!config.enabled || rpc.enableDiscordRpc === false) {
            clearActivity();
            return;
        }

        const typeMap = { playing: 0, streaming: 1, listening: 2, watching: 3, competing: 5 };
        const actType = typeof rpc.activityType === 'number'
            ? rpc.activityType
            : (typeMap[String(rpc.activityType || 'streaming').toLowerCase()] ?? 1);

        const buttons = [];
        if (rpc.button1Enabled !== false && rpc.button1Label && rpc.button1Url) buttons.push({ label: rpc.button1Label.trim(), url: rpc.button1Url.trim() });
        if (rpc.button2Enabled !== false && rpc.button2Label && rpc.button2Url) buttons.push({ label: rpc.button2Label.trim(), url: rpc.button2Url.trim() });

        const appId = rpc.appId || DEFAULT_APP_ID;
        const activity = {
            application_id: appId,
            name: rpc.appName || 'Pixel.gg',
            type: actType
        };

        if (actType === 1 && rpc.streamUrl) activity.url = rpc.streamUrl.trim();
        if (rpc.stateEnabled !== false && rpc.state) activity.state = rpc.state.trim();
        if (rpc.detailsEnabled !== false && rpc.details) activity.details = rpc.details.trim();
        if (rpc.detailsUrl) activity.details_url = rpc.detailsUrl.trim();
        if (rpc.stateUrl) activity.state_url = rpc.stateUrl.trim();

        const isLargeEnabled = rpc.largeImageEnabled !== false;
        const isSmallEnabled = rpc.smallImageEnabled !== false;
        const hasLarge = Boolean(isLargeEnabled && rpc.largeImage);
        const hasSmall = Boolean(isSmallEnabled && rpc.smallImage);

        if (hasLarge || hasSmall) {
            activity.assets = {};
            if (hasLarge && rpc.largeImage) activity.assets.large_image = await resolveAsset(appId, rpc.largeImage);
            if (hasLarge && rpc.largeImageText) activity.assets.large_text = rpc.largeImageText.trim();
            if (hasLarge && rpc.largeImageUrl) activity.assets.large_url = rpc.largeImageUrl.trim();
            if (hasSmall && rpc.smallImage) activity.assets.small_image = await resolveAsset(appId, rpc.smallImage);
            if (hasSmall && rpc.smallImageText) activity.assets.small_text = rpc.smallImageText.trim();
            if (hasSmall && rpc.smallImageUrl) activity.assets.small_url = rpc.smallImageUrl.trim();
        }

        const tMode = String(rpc.timestampMode || 'now').toLowerCase();
        if (tMode === 'now' || tMode === '1') {
            if (!sessionNowTimestamp) sessionNowTimestamp = Date.now();
            activity.timestamps = { start: sessionNowTimestamp };
        } else if (tMode === 'time' || tMode === '2') {
            const now = new Date();
            activity.timestamps = { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() };
        } else if (rpc.startTimestamp || rpc.endTimestamp) {
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
            const url = config.apiUrl.replace(/\\/+$/, '');
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
        version: '1.3.0',
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
            pushNativePresence();
            subscribeNative();
            syncTimer = setInterval(fetchAndSync, config.interval * 1000);
            console.log('[PixelsRPC] Native plugin active. Connected to:', config.apiUrl);
        },
        stop() {
            if (syncTimer) {
                clearInterval(syncTimer);
                syncTimer = null;
            }
            if (nativeDebounce) {
                clearTimeout(nativeDebounce);
                nativeDebounce = null;
            }
            unsubscribeNative();
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
`;

fs.writeFileSync(path.join(distDir, 'PixelsRPC.vencord.js'), standaloneBundle, 'utf8');

// Also update apps/web/public/PixelsRPC.vencord.js
const webPublicPath = path.resolve(rootDir, '../../apps/web/public/PixelsRPC.vencord.js');
if (fs.existsSync(path.dirname(webPublicPath))) {
  fs.writeFileSync(webPublicPath, standaloneBundle, 'utf8');
  console.log('[PixelsRPC Build] Updated apps/web/public/PixelsRPC.vencord.js');
}

console.log('[PixelsRPC Build] All builds generated successfully.');
