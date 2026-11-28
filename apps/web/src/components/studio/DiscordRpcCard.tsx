"use client";

import React, { useState, useEffect } from "react";
import { Activity, Radio, Music, Tv, Swords, ExternalLink } from "lucide-react";
import { DiscordRpcConfig } from "@/types/studio";
import { formatRichPresenceField } from "@/lib/rpcFormat";
import {
  resolveRpcElementText,
  isRpcElementDataAvailable,
} from "./rpcPresets";

export interface DiscordRpcData {
  appName?: string | null;
  name?: string | null;
  details?: string | null;
  state?: string | null;
  detailsUrl?: string | null;
  stateUrl?: string | null;
  detailsEnabled?: boolean | null;
  stateEnabled?: boolean | null;
  largeImage?: string | null;
  largeImageText?: string | null;
  largeImageUrl?: string | null;
  smallImage?: string | null;
  smallImageText?: string | null;
  smallImageUrl?: string | null;
  activityType?: string | number | null;
  type?: number;
  streamUrl?: string | null;
  status?: "online" | "idle" | "dnd" | "offline" | string | null;
  hasActivity?: boolean;
  timestampMode?: "none" | "now" | "time" | "custom" | number | null;
  timestamps?: {
    start?: number | null;
    end?: number | null;
  } | null;
  startTimestamp?: string | number | null;
  endTimestamp?: string | number | null;
  party?: {
    size: [number, number];
  } | null;
  partySize?: number | null;
  partyMax?: number | null;
  buttons?: Array<{ label: string; url: string }> | null;
  button1Enabled?: boolean | null;
  button1Label?: string | null;
  button1Url?: string | null;
  button2Enabled?: boolean | null;
  button2Label?: string | null;
  button2Url?: string | null;
  streaks?: any[] | null;
  statistics?: any[] | null;
  statusLabels?: any[] | null;
  spotify?: {
    track_id?: string | null;
    song?: string | null;
    artist?: string | null;
    album?: string | null;
    album_art_url?: string | null;
    timestamps?: { start?: number | null; end?: number | null } | null;
  } | null;
}

interface DiscordRpcCardProps {
  config: DiscordRpcConfig;
  data?: DiscordRpcData | null;
  isInteractiveEditor?: boolean;
  isPremium?: boolean;
}

export function DiscordRpcCard({
  config,
  data,
  isInteractiveEditor = false,
  isPremium = false,
}: DiscordRpcCardProps) {
  const [elapsed, setElapsed] = useState<string>("");

  const hasActivity = Boolean(
    data?.hasActivity !== undefined
      ? data.hasActivity
      : data?.appName || data?.name || data?.details || data?.state
  );

  const status = data?.status || "online";

  // Sample fallback solely for interactive studio preview
  const rpc: DiscordRpcData =
    hasActivity && data
      ? data
      : isInteractiveEditor
      ? {
          appName: "Visual Studio Code",
          details: "Designing Nothing OS Presence",
          state: "Pixel.gg Studio Engine",
          largeImage:
            "https://pixlpresence1-web.vercel.app/server-icon.png",
          largeImageText: "Visual Studio Code",
          activityType: 0,
        }
      : (data || {});

  // Live ticking timer
  useEffect(() => {
    const normalizeMs = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") {
        if (!Number.isFinite(v) || v <= 0) return null;
        return v < 1e12 && v > 1e8 ? Math.round(v * 1000) : v >= 1e12 ? Math.round(v) : null;
      }
      if (typeof v === "string") {
        const t = v.trim();
        if (/^\d+(\.\d+)?$/.test(t)) return normalizeMs(Number(t));
        const p = Date.parse(t);
        return Number.isFinite(p) && p > 1e11 ? Math.round(p) : null;
      }
      return null;
    };

    const startMs = normalizeMs(rpc.timestamps?.start ?? rpc.startTimestamp);
    const endMs = normalizeMs(rpc.timestamps?.end ?? rpc.endTimestamp);

    if (!startMs && !endMs) {
      setElapsed("");
      return;
    }

    const fmtSec = (diffSec: number) => {
      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      return hrs > 0
        ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const updateTimer = () => {
      const now = Date.now();
      if (endMs && endMs > now) {
        setElapsed(`${fmtSec(Math.max(0, Math.floor((endMs - now) / 1000)))} left`);
      } else if (startMs) {
        setElapsed(`${fmtSec(Math.max(0, Math.floor((now - startMs) / 1000)))} elapsed`);
      } else {
        setElapsed("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rpc.timestamps?.start, rpc.timestamps?.end, rpc.startTimestamp, rpc.endTimestamp]);

  const imgSizeClass =
    config.imageSize === "small"
      ? "w-10 h-10"
      : config.imageSize === "large"
      ? "w-16 h-16"
      : "w-12 h-12";

  const rawType = rpc.type ?? rpc.activityType ?? 0;
  const numType = typeof rawType === "number" ? rawType : rawType === "streaming" ? 1 : rawType === "listening" ? 2 : rawType === "watching" ? 3 : rawType === "competing" ? 5 : 0;

  // Resolve buttons
  const sanitizeBtnUrl = (raw?: string | null): string | null => {
    if (typeof raw !== "string") return null;
    const t = raw.trim();
    if (!t || t === "#") return null;
    if (/^https?:\/\/.+/i.test(t)) return t;
    if (t.startsWith("/") && !t.startsWith("//")) return t;
    return null;
  };

  const buttons: Array<{ label: string; url: string | null }> = [];
  if (Array.isArray(rpc.buttons) && rpc.buttons.length > 0) {
    for (const b of rpc.buttons) {
      if (buttons.length >= 2) break;
      const label = typeof b?.label === "string" ? b.label.trim() : "";
      if (!label) continue;
      buttons.push({ label, url: sanitizeBtnUrl(b.url) });
    }
  }
  if (buttons.length === 0) {
    if (rpc.button1Enabled !== false && rpc.button1Url) {
      const u1 = sanitizeBtnUrl(rpc.button1Url);
      if (u1) buttons.push({ label: rpc.button1Label || "View Profile", url: u1 });
    }
    if (rpc.button2Enabled !== false && rpc.button2Url) {
      const u2 = sanitizeBtnUrl(rpc.button2Url);
      if (u2) buttons.push({ label: rpc.button2Label || "Get PixelsRPC", url: u2 });
    }
  }

  // Handle Offline / Idle without game on live profile
  if (!hasActivity && !isInteractiveEditor) {
    const isOffline = status === "offline";
    return (
      <div
        className="discord-rpc w-full p-4 text-left space-y-2 font-mono border transition-all"
        style={{
          borderRadius: `${config.borderRadius}px`,
          borderColor: config.customBorderColor || "#242424",
          backgroundColor:
            config.style === "glass"
              ? "rgba(18, 18, 18, 0.7)"
              : config.style === "neon"
              ? "#090610"
              : "#111111",
          backdropFilter: config.style === "glass" ? "blur(14px)" : undefined,
        }}
      >
        <div className="flex items-center justify-between text-[10px] text-neutral-400">
          <span className="flex items-center gap-1.5 text-white font-semibold">
            <Activity size={12} className={isOffline ? "text-neutral-500" : "text-white"} /> DISCORD PRESENCE
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-mono uppercase ${
              isOffline
                ? "bg-neutral-900 border-neutral-800 text-neutral-500"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOffline ? "bg-neutral-600" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {isOffline ? "OFFLINE" : status.toUpperCase()}
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 font-sans pt-0.5">
          {isOffline
            ? "Discord is currently disconnected or offline."
            : "Online on Discord. No active application or game running."}
        </p>
      </div>
    );
  }

  // Active Custom Layout Rich Presence Display (Exclusive Premium Tier)
  if (config.customLayout?.enabled && isPremium) {
    const layout = config.customLayout;
    const cardStyle = layout.cardStyle;
    const borderRadius =
      cardStyle?.borderRadius !== undefined ? cardStyle.borderRadius : config.borderRadius;
    const borderColor = cardStyle?.borderColor || config.customBorderColor || "#27272a";
    const backgroundColor =
      cardStyle?.backgroundColor ||
      (config.style === "glass"
        ? "rgba(18, 18, 18, 0.7)"
        : config.style === "neon"
        ? "#090610"
        : "#111111");

    // Filter elements that are marked visible AND have valid data available
    const activeElements = layout.elements.filter(
      (el) => el.visible && isRpcElementDataAvailable(el, rpc)
    );

    const dynamicHeight = Math.max(
      cardStyle?.height || 160,
      ...activeElements.map((el) => el.y + (el.height || 20) + 16)
    );

    return (
      <div
        className="discord-rpc custom-rpc-card w-full relative transition-all overflow-hidden select-none"
        style={{
          minHeight: `${dynamicHeight}px`,
          backgroundColor,
          borderColor,
          borderRadius: `${borderRadius}px`,
          borderWidth: `${cardStyle?.borderWidth ?? 1}px`,
          boxShadow: cardStyle?.boxShadow,
          backdropFilter: cardStyle?.backdropBlur ? `blur(${cardStyle.backdropBlur}px)` : undefined,
        }}
      >
        {activeElements.map((el) => {
          const textVal = resolveRpcElementText(el, rpc);

          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                maxWidth: `calc(100% - ${el.x}px - 8px)`,
                height: `${el.height}px`,
                zIndex: el.zIndex || 2,
              }}
              className="pointer-events-auto"
            >
              {el.type === "headerStatus" && (
                <div
                  style={{
                    fontSize: `${el.style?.fontSize || 10}px`,
                    fontWeight: el.style?.fontWeight || 700,
                    color: el.style?.color || "#ffffff",
                    textAlign: el.style?.textAlign || "left",
                    fontFamily: el.style?.fontFamily || "Space Grotesk",
                  }}
                  className="w-full h-full flex items-center gap-1.5 uppercase tracking-wide truncate"
                >
                  {el.props?.showIcon !== false && (
                    <Radio size={12} className="text-purple-400 animate-pulse shrink-0" />
                  )}
                  <span className="truncate">{textVal}</span>
                </div>
              )}

              {el.type === "telemetryBadge" && (
                <div
                  style={{
                    fontSize: `${el.style?.fontSize || 9}px`,
                    fontWeight: el.style?.fontWeight || 600,
                    color: el.style?.color || "#d4d4d8",
                    backgroundColor: el.style?.backgroundColor || "#18181b",
                    borderRadius: `${el.style?.borderRadius || 6}px`,
                  }}
                  className="w-full h-full flex items-center justify-center gap-1 border border-neutral-700/60 uppercase"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">LIVE TELEMETRY</span>
                </div>
              )}

              {el.type === "artworkLarge" && (
                <div
                  style={{
                    borderRadius: `${el.style?.borderRadius || 14}px`,
                    borderColor: el.style?.borderColor || "#27272a",
                    borderWidth: `${el.style?.borderWidth ?? 1}px`,
                    boxShadow: el.style?.boxShadow || "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                  className="w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-xs text-white"
                >
                  {rpc.largeImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={rpc.largeImage}
                      alt={rpc.largeImageText || "Large Artwork"}
                      className={`w-full h-full ${
                        el.style?.imageFit === "contain" ? "object-contain" : "object-cover"
                      }`}
                    />
                  ) : (
                    <span>RPC</span>
                  )}
                </div>
              )}

              {el.type === "artworkSmall" && (
                <div
                  style={{
                    borderRadius: `${el.style?.borderRadius || 9999}px`,
                    borderColor: el.style?.borderColor || "#111111",
                    borderWidth: `${el.style?.borderWidth ?? 2}px`,
                  }}
                  className="w-full h-full bg-[#111111] overflow-hidden flex items-center justify-center shadow"
                >
                  {rpc.smallImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={rpc.smallImage}
                      alt={rpc.smallImageText || "Small Artwork"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-500 rounded-full" />
                  )}
                </div>
              )}

              {(el.type === "gameTitle" ||
                el.type === "activityDetails" ||
                el.type === "activityState" ||
                el.type === "partyInfo") && (
                <div
                  style={{
                    fontFamily: el.style?.fontFamily || "Inter",
                    fontSize: `${el.style?.fontSize || 12}px`,
                    fontWeight: el.style?.fontWeight || 400,
                    color: el.style?.color || "#ffffff",
                    textAlign: el.style?.textAlign || "left",
                    letterSpacing: el.style?.letterSpacing ? `${el.style.letterSpacing}px` : undefined,
                  }}
                  className="w-full h-full flex items-center truncate"
                >
                  <span className="truncate">{textVal}</span>
                </div>
              )}

              {el.type === "timestamps" && elapsed && (
                <div
                  style={{
                    fontFamily: el.style?.fontFamily || "monospace",
                    fontSize: `${el.style?.fontSize || 10}px`,
                    fontWeight: el.style?.fontWeight || 400,
                    color: el.style?.color || "#a1a1aa",
                    textAlign: el.style?.textAlign || "left",
                  }}
                  className="w-full h-full flex items-center truncate"
                >
                  <span className="truncate">{elapsed}</span>
                </div>
              )}

              {el.type === "actionButtons" && (
                <div className="w-full h-full flex flex-wrap gap-2 items-center">
                  {buttons.length > 0 ? (
                    buttons.map((btn, idx) =>
                      btn.url ? (
                        <a
                          key={idx}
                          href={btn.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
                      >
                        <span className="truncate">{btn.label}</span>
                        <ExternalLink size={9} className="opacity-60 shrink-0" />
                      </a>
                      ) : (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900/70 border border-neutral-800 text-[10px] text-neutral-400 flex items-center gap-1 font-mono"
                        >
                          <span className="truncate">{btn.label}</span>
                        </span>
                      )
                    )
                  ) : (
                    isInteractiveEditor && (
                      <>
                        <div className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-white font-mono flex items-center gap-1 shadow">
                          <span>View Profile</span>
                          <ExternalLink size={9} />
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-white font-mono flex items-center gap-1 shadow">
                          <span>Get PixelsRPC</span>
                          <ExternalLink size={9} />
                        </div>
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Active Standard Rich Presence Display
  return (
    <div
      className="discord-rpc w-full p-4 text-left space-y-2.5 font-mono border transition-all"
      style={{
        borderRadius: `${config.borderRadius}px`,
        borderColor: config.customBorderColor || "#242424",
        backgroundColor:
          config.style === "glass"
            ? "rgba(18, 18, 18, 0.7)"
            : config.style === "neon"
            ? "#090610"
            : "#111111",
        backdropFilter: config.style === "glass" ? "blur(14px)" : undefined,
      }}
    >
      {/* Header status bar */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400">
        <span className="flex items-center gap-1.5 text-white font-semibold">
          {numType === 1 ? (
            <Radio size={12} className="text-purple-400 animate-pulse" />
          ) : numType === 2 ? (
            <Music size={12} className="text-emerald-400" />
          ) : numType === 3 ? (
            <Tv size={12} className="text-amber-400" />
          ) : numType === 5 ? (
            <Swords size={12} className="text-red-400" />
          ) : (
            <Activity size={12} className="text-white" />
          )}
          {numType === 1
            ? "STREAMING LIVE"
            : numType === 2
            ? "LISTENING TO SPOTIFY"
            : numType === 3
            ? "WATCHING"
            : numType === 5
            ? "COMPETING"
            : "PLAYING A GAME"}
        </span>

        {config.showTelemetryBadge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE TELEMETRY
          </span>
        )}
      </div>

      {/* Main Activity Layout */}
      <div
        className={`flex ${
          config.imageLayout === "stacked"
            ? "flex-col items-start gap-2"
            : config.imageLayout === "right"
            ? "flex-row-reverse items-center justify-between gap-3"
            : "flex-row items-center gap-3"
        }`}
      >
        {config.imageLayout !== "hidden" && (
          <div className="relative shrink-0">
            <div
              title={rpc.largeImageText || rpc.appName || "Application"}
              className={`${imgSizeClass} rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-md`}
            >
              {rpc.largeImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={rpc.largeImage}
                  alt={rpc.largeImageText || "RPC Image"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>RPC</span>
              )}
            </div>

            {/* Small asset icon overlay badge */}
            {rpc.smallImage && (
              <div
                title={rpc.smallImageText || undefined}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111111] border border-neutral-700 overflow-hidden shadow-sm flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rpc.smallImage}
                  alt={rpc.smallImageText || "Icon"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 text-xs truncate flex-1">
          <p className="text-white font-semibold truncate">
            {rpc.appName || rpc.name || "Active Discord Application"}
          </p>
          {(() => {
            const formattedDetails = formatRichPresenceField(
              rpc.details,
              rpc.detailsEnabled,
              "details",
              rpc.statusLabels,
              rpc.streaks,
              rpc.statistics
            );
            const formattedState = formatRichPresenceField(
              rpc.state,
              rpc.stateEnabled,
              "state",
              rpc.statusLabels,
              rpc.streaks,
              rpc.statistics
            );

            const tMode = String(rpc.timestampMode ?? "now").toLowerCase();
            const showTimestamp = tMode !== "none" && tMode !== "0" && config.showTimer;
            const isSpotify =
              numType === 2 &&
              ((rpc.name || rpc.appName || "").toLowerCase().includes("spotify") || Boolean(rpc.spotify));
            const rawStart = rpc.timestamps?.start ?? rpc.spotify?.timestamps?.start ?? rpc.startTimestamp;
            const rawEnd = rpc.timestamps?.end ?? rpc.spotify?.timestamps?.end ?? rpc.endTimestamp;
            const toMs = (v: unknown): number | null => {
              if (v === null || v === undefined || v === "") return null;
              if (typeof v === "number") {
                if (!Number.isFinite(v) || v <= 0) return null;
                return v < 1e12 && v > 1e8 ? v * 1000 : v >= 1e12 ? v : null;
              }
              if (typeof v === "string") {
                const t = v.trim();
                if (/^\d+(\.\d+)?$/.test(t)) return toMs(Number(t));
                const p = Date.parse(t);
                return Number.isFinite(p) && p > 1e11 ? p : null;
              }
              return null;
            };
            const spStartMs = toMs(rawStart);
            const spEndMs = toMs(rawEnd);
            const spTotalMs = spStartMs && spEndMs && spEndMs > spStartMs ? spEndMs - spStartMs : null;
            const spElapsedMs = spStartMs && spTotalMs ? Math.max(0, Math.min(spTotalMs, Date.now() - spStartMs)) : null;
            const spProgressPct = spTotalMs && spElapsedMs !== null ? Math.round((spElapsedMs / spTotalMs) * 100) : null;
            const fmtClock = (ms: number) => {
              const totalSec = Math.max(0, Math.floor(ms / 1000));
              const m = Math.floor(totalSec / 60);
              const s = totalSec % 60;
              return `${m}:${String(s).padStart(2, "0")}`;
            };

            return (
              <>
                {formattedDetails && (
                  <p className="text-neutral-400 text-[11px] truncate">{formattedDetails}</p>
                )}
                {formattedState && (
                  <p className="text-neutral-500 text-[10px] truncate">
                    {isSpotify ? `by ${formattedState}` : formattedState}
                  </p>
                )}
                {isSpotify && (rpc.spotify?.album || rpc.largeImageText) && (
                  <p className="text-neutral-500 text-[10px] truncate">
                    on {rpc.spotify?.album || rpc.largeImageText}
                  </p>
                )}

                {/* Party size indicator */}
                {(rpc.party?.size || (rpc.partySize && rpc.partyMax)) && (
                  <p className="text-neutral-500 text-[10px] truncate">
                    Party ({rpc.party?.size ? rpc.party.size[0] : rpc.partySize} of{" "}
                    {rpc.party?.size ? rpc.party.size[1] : rpc.partyMax})
                  </p>
                )}

                {/* Spotify Playback Progress Bar */}
                {isSpotify && spTotalMs && spElapsedMs !== null && spProgressPct !== null ? (
                  <div className="pt-1.5 space-y-1">
                    <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-[#1DB954] rounded-full transition-all duration-500"
                        style={{ width: `${spProgressPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono tabular-nums">
                      <span>{fmtClock(spElapsedMs)}</span>
                      <span>{fmtClock(spTotalMs)}</span>
                    </div>
                  </div>
                ) : (
                  showTimestamp &&
                  (tMode === "time" || tMode === "2" || Boolean(elapsed)) && (
                    <p className="text-neutral-400 text-[10px] font-mono pt-0.5">
                      {tMode === "time" || tMode === "2"
                        ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                        : elapsed}
                    </p>
                  )
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-800/60">
          {buttons.map((btn, idx) =>
            btn.url ? (
              <a
                key={idx}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
              >
                <span>{btn.label}</span>
                <ExternalLink size={9} className="opacity-60" />
              </a>
            ) : (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-neutral-900/70 border border-neutral-800 text-[10px] text-neutral-400 flex items-center gap-1 font-mono"
              >
                <span>{btn.label}</span>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

