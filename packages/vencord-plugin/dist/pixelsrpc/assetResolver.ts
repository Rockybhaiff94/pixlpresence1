export type AssetCategory = "media_proxy" | "external_url" | "app_asset_key";

export interface PreparedExternalTarget {
    target: string;
    originalUrl: string;
    isDiscordCdn: boolean;
    isAnimatedHint: boolean;
}

export interface DiagnosticLogger {
    (stage: string, details: Record<string, any>): void;
}

export function classifyAssetInput(rawInput: string): AssetCategory {
    const raw = rawInput.trim();
    if (raw.startsWith("mp:") || raw.startsWith("spotify:") || raw.startsWith("twitch:")) {
        return "media_proxy";
    }
    if (/^https?:\/\//i.test(raw)) {
        return "external_url";
    }
    return "app_asset_key";
}

/**
 * Extracts the underlying source URL if a legacy config stored a wsrv.nl/?url=... wrapper
 * for a non-Discord-CDN origin (so clean .gif URLs are passed directly to Discord's proxy).
 */
export function unwrapLegacyWsrvUrl(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname.toLowerCase() === "wsrv.nl") {
            const inner = parsed.searchParams.get("url");
            if (inner && /^https?:\/\//i.test(inner)) {
                return inner;
            }
        }
    } catch {
        // Not a valid URL
    }
    return rawUrl;
}

/**
 * Prepares an external HTTP(S) URL for Discord ApplicationAssetUtils.fetchAssetIds().
 * - Public external URLs (including /uploads/rpc/*.gif) are passed untouched so their
 *   .gif path suffix is preserved in mp:external/... and Discord Media Proxy animates them.
 * - Discord CDN URLs (which Discord /external-assets rejects to avoid proxy recursion)
 *   are routed through wsrv.nl with an explicit .gif/.png path filename so animation survives.
 */
export function prepareExternalAssetTarget(rawUrl: string): PreparedExternalTarget {
    const cleanUrl = unwrapLegacyWsrvUrl(rawUrl.trim());
    const isDiscordCdn = /^https?:\/\/(cdn|media)\.discordapp\.(com|net)\//i.test(cleanUrl);
    const isAnimatedHint = /(\.gif|\.webp|format=gif|image\/gif|\ba_[a-f0-9]{8,}\b|tenor\.com|giphy\.com)/i.test(cleanUrl);

    if (isDiscordCdn) {
        const filename = isAnimatedHint ? "avatar.gif" : "avatar.png";
        const suffix = isAnimatedHint ? "&n=-1" : "";
        return {
            target: `https://wsrv.nl/${filename}?url=${encodeURIComponent(cleanUrl)}${suffix}`,
            originalUrl: cleanUrl,
            isDiscordCdn: true,
            isAnimatedHint
        };
    }

    return {
        target: cleanUrl,
        originalUrl: cleanUrl,
        isDiscordCdn: false,
        isAnimatedHint
    };
}

export function getSafeUrlHost(rawInput: string): string {
    try {
        return new URL(rawInput).hostname;
    } catch {
        return "discord-app-asset";
    }
}

export async function resolveAssetForDiscord(params: {
    appId: string;
    assetInput: string | null | undefined;
    slot: "largeImage" | "smallImage";
    cache: Map<string, string>;
    fetchAssetIds?: (appId: string, keys: string[]) => Promise<string[]>;
    getAssetImage?: (appId: string, assetId: string, size?: [number, number]) => string;
    onDiagnostic?: DiagnosticLogger;
}): Promise<string | undefined> {
    const { appId, assetInput, slot, cache, fetchAssetIds, getAssetImage, onDiagnostic } = params;
    if (!assetInput || !assetInput.trim()) return undefined;

    const raw = assetInput.trim();
    const category = classifyAssetInput(raw);

    onDiagnostic?.("Input asset received", {
        slot,
        appId,
        category,
        host: getSafeUrlHost(raw),
        endsWithGif: /\.gif(\?.*)?$/i.test(raw)
    });

    if (category === "media_proxy") {
        onDiagnostic?.("Asset resolution completed", {
            slot,
            category,
            method: "passthrough_media_proxy",
            resolvedFormat: raw.slice(0, 18),
            durationMs: 0
        });
        return raw;
    }

    if (category === "app_asset_key") {
        const cacheKey = `key:${appId}:${raw}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const startedAt = Date.now();
        onDiagnostic?.("Asset resolution started", {
            slot,
            appId,
            category,
            method: "fetchAssetIds_app_key"
        });

        try {
            if (typeof fetchAssetIds === "function") {
                const resolvedList = await fetchAssetIds(appId, [raw]);
                if (Array.isArray(resolvedList) && resolvedList[0]) {
                    const assetId = resolvedList[0];
                    cache.set(cacheKey, assetId);
                    onDiagnostic?.("Asset resolution completed", {
                        slot,
                        category,
                        method: "fetchAssetIds_app_key",
                        resolvedPrefix: assetId.slice(0, 24),
                        durationMs: Date.now() - startedAt
                    });
                    return assetId;
                }
            }
        } catch (err: any) {
            onDiagnostic?.("Asset resolution failed", {
                slot,
                category,
                error: err?.message || "fetchAssetIds error",
                durationMs: Date.now() - startedAt
            });
        }
        return raw;
    }

    // Category 3: Public External HTTP/HTTPS URL -> resolve to mp:external/... via Discord
    const prepared = prepareExternalAssetTarget(raw);
    const cacheKey = `ext:${appId}:${prepared.target}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        onDiagnostic?.("Asset resolution completed", {
            slot,
            category,
            method: "cache_hit",
            host: getSafeUrlHost(prepared.target),
            resolvedPrefix: cached.slice(0, 28),
            isMpExternal: cached.startsWith("mp:external/"),
            durationMs: 0
        });
        return cached;
    }

    const startedAt = Date.now();
    onDiagnostic?.("Asset resolution started", {
        slot,
        appId,
        category,
        host: getSafeUrlHost(prepared.target),
        isDiscordCdn: prepared.isDiscordCdn,
        isAnimatedHint: prepared.isAnimatedHint,
        method: "fetchAssetIds_external_url"
    });

    const tryResolveTarget = async (candidateTarget: string): Promise<string | undefined> => {
        if (typeof fetchAssetIds !== "function") return undefined;
        try {
            const resolvedList = await fetchAssetIds(appId, [candidateTarget]);
            if (Array.isArray(resolvedList) && resolvedList[0]) {
                const resolved = resolvedList[0];
                if (!/^https?:\/\//i.test(resolved)) {
                    return resolved;
                }
            }
        } catch {
            // caller handles fallback
        }
        return undefined;
    };

    try {
        let resolved = await tryResolveTarget(prepared.target);

        // Retry via wsrv.nl proxy if direct external URL resolution fails or returns non-asset
        if (!resolved && !prepared.isDiscordCdn && /^https?:\/\//i.test(prepared.originalUrl)) {
            const filename = prepared.isAnimatedHint ? "avatar.gif" : "avatar.png";
            const suffix = prepared.isAnimatedHint ? "&n=-1" : "";
            const proxyTarget = `https://wsrv.nl/${filename}?url=${encodeURIComponent(prepared.originalUrl)}${suffix}`;
            resolved = await tryResolveTarget(proxyTarget);
        }

        if (resolved) {
            cache.set(cacheKey, resolved);

            let renderedPreviewUrl: string | undefined;
            try {
                if (typeof getAssetImage === "function") {
                    renderedPreviewUrl = getAssetImage(appId, resolved, [128, 128]);
                }
            } catch {
                // ignore optional preview check error
            }

            onDiagnostic?.("Asset resolution completed", {
                slot,
                category,
                method: "fetchAssetIds_external_url",
                host: getSafeUrlHost(prepared.target),
                isMpExternal: resolved.startsWith("mp:external/"),
                resolvedEnd: resolved.slice(-32),
                renderedPreviewUrl,
                durationMs: Date.now() - startedAt
            });
            return resolved;
        }
    } catch (err: any) {
        onDiagnostic?.("Asset resolution failed", {
            slot,
            category,
            host: getSafeUrlHost(prepared.target),
            error: err?.message || "fetchAssetIds rejected",
            durationMs: Date.now() - startedAt
        });
    }

    // Never return raw HTTP(S) URLs to Discord LOCAL_ACTIVITY_UPDATE (causes '?' broken icons)
    return undefined;
}
