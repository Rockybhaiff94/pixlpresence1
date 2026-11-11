"use client";

import React, { useState, useEffect } from "react";
import { Activity, Radio, Music, Tv, Swords, ExternalLink } from "lucide-react";
import { DiscordRpcConfig } from "@/types/studio";
import {
  resolveRpcElementText,
  isRpcElementDataAvailable,
} from "./rpcPresets";

export interface DiscordRpcData {
  appName?: string | null;
  name?: string | null;
  details?: string | null;
  state?: string | null;
  largeImage?: string | null;
  largeImageText?: string | null;
  smallImage?: string | null;
  smallImageText?: string | null;
  activityType?: string | number | null;
  type?: number;
  streamUrl?: string | null;
  status?: "online" | "idle" | "dnd" | "offline" | string | null;
  hasActivity?: boolean;
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
            "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
          largeImageText: "Visual Studio Code",
          activityType: 0,
        }
      : (data || {});

  // Live ticking timer
  useEffect(() => {
    let startMs: number | null = null;
    if (rpc.timestamps?.start) {
      startMs = typeof rpc.timestamps.start === "number" ? rpc.timestamps.start : new Date(rpc.timestamps.start).getTime();
    } else if (rpc.startTimestamp) {
      startMs = typeof rpc.startTimestamp === "number" ? rpc.startTimestamp : new Date(rpc.startTimestamp).getTime();
    }

    if (!startMs || Number.isNaN(startMs)) {
      setElapsed("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startMs!) / 1000));
      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      const formatted =
        hrs > 0
          ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
          : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      setElapsed(`${formatted} elapsed`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rpc.timestamps?.start, rpc.startTimestamp]);

  const imgSizeClass =
    config.imageSize === "small"
      ? "w-10 h-10"
      : config.imageSize === "large"
      ? "w-16 h-16"
      : "w-12 h-12";

  const rawType = rpc.type ?? rpc.activityType ?? 0;
  const numType = typeof rawType === "number" ? rawType : rawType === "streaming" ? 1 : rawType === "listening" ? 2 : rawType === "watching" ? 3 : rawType === "competing" ? 5 : 0;

  // Resolve buttons
  const buttons: Array<{ label: string; url: string }> = [];
  if (Array.isArray(rpc.buttons) && rpc.buttons.length > 0) {
    buttons.push(...rpc.buttons.slice(0, 2));
  } else {
    if (rpc.button1Enabled !== false && rpc.button1Url) {
      buttons.push({ label: rpc.button1Label || "View Profile", url: rpc.button1Url });
    }
    if (rpc.button2Enabled !== false && rpc.button2Url) {
      buttons.push({ label: rpc.button2Label || "Get PixelsRPC", url: rpc.button2Url });
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

              {el.type === "timestamps" && (
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
                  <span className="truncate">{elapsed || "00:01 elapsed"}</span>
                </div>
              )}

              {el.type === "actionButtons" && (
                <div className="w-full h-full flex flex-wrap gap-2 items-center">
                  {buttons.length > 0 ? (
                    buttons.map((btn, idx) => (
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
                    ))
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
          {rpc.details && (
            <p className="text-neutral-400 text-[11px] truncate">{rpc.details}</p>
          )}
          {rpc.state && (
            <p className="text-neutral-500 text-[10px] truncate">{rpc.state}</p>
          )}

          {/* Party size indicator */}
          {(rpc.party?.size || (rpc.partySize && rpc.partyMax)) && (
            <p className="text-neutral-500 text-[10px] truncate">
              Party ({rpc.party?.size ? rpc.party.size[0] : rpc.partySize} of{" "}
              {rpc.party?.size ? rpc.party.size[1] : rpc.partyMax})
            </p>
          )}

          {/* Dynamic elapsed timer */}
          {config.showTimer && (elapsed || "Active") && (
            <p className="text-neutral-400 text-[10px] font-mono pt-0.5">
              {elapsed || "00:01 elapsed"}
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-800/60">
          {buttons.map((btn, idx) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

