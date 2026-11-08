"use client";

import React, { useEffect } from "react";
import {
  Activity,
  Play,
  ExternalLink,
  Volume2,
  Share2,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { ProfileDesignConfig } from "@/types/studio";
import { ensureFontLoaded } from "./fonts";
import { scopeAndSanitizeCss } from "./cssUtils";
import { ParticlesCanvas } from "./ParticlesCanvas";

export interface PreviewData {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  views?: number;
  buttons?: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    url: string;
    openInNewTab?: boolean;
    gradient?: string | null;
  }>;
  links?: Array<{
    id: string;
    label: string;
    url: string;
    visibility: boolean;
  }>;
  discordPresence?: {
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null;
}

interface StudioProfilePreviewProps {
  config: ProfileDesignConfig;
  data: PreviewData;
  isInteractiveEditor?: boolean;
  activeElementId?: string;
  onSelectElement?: (elementId: string) => void;
  scopeId?: string;
}

export const StudioProfilePreview: React.FC<StudioProfilePreviewProps> = ({
  config,
  data,
  isInteractiveEditor = false,
  activeElementId,
  onSelectElement,
  scopeId = "profile-preview-root",
}) => {
  const {
    layout,
    identity,
    avatar,
    background,
    typography,
    discordRpc,
    buttons: buttonConfig,
    socials,
    effects,
    customCss,
    layers,
  } = config;

  // Dynamically load selected fonts
  useEffect(() => {
    if (typography.headingFont) ensureFontLoaded(typography.headingFont);
    if (typography.bodyFont) ensureFontLoaded(typography.bodyFont);
    if (identity.titleFont) ensureFontLoaded(identity.titleFont);
    if (identity.bioFont) ensureFontLoaded(identity.bioFont);
  }, [typography, identity]);

  const isLayerVisible = (id: string) => {
    const layer = layers?.find((l) => l.id === id);
    return layer ? layer.visible : true;
  };

  const getElementSelectProps = (elementId: string) => {
    if (!isInteractiveEditor) return {};
    const isSelected = activeElementId === elementId;
    return {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectElement?.(elementId);
      },
      className: `relative transition-all cursor-pointer rounded-xl ${
        isSelected
          ? "ring-2 ring-white ring-offset-2 ring-offset-black"
          : "hover:ring-1 hover:ring-white/40"
      }`,
    };
  };

  // Avatar border-radius computation based on shape
  const getAvatarRadius = () => {
    switch (avatar.shape) {
      case "circle":
        return "9999px";
      case "square":
        return "0px";
      case "squircle":
        return "32%";
      case "rounded":
      default:
        return "20px";
    }
  };

  // Compute background styling
  const getBackgroundStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      backgroundColor: background.color || "#050505",
    };

    if (background.type === "gradient" && background.gradient?.stops?.length >= 2) {
      const stops = background.gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(", ");
      base.backgroundImage =
        background.gradient.type === "radial"
          ? `radial-gradient(circle at center, ${stops})`
          : `linear-gradient(${background.gradient.angle || 135}deg, ${stops})`;
    } else if (background.type === "mesh") {
      base.backgroundImage = `radial-gradient(at 10% 20%, ${identity.titleColor}15 0px, transparent 50%), radial-gradient(at 90% 80%, ${effects.glowColor}20 0px, transparent 50%)`;
    } else if (background.type === "image" && background.imageUrl) {
      base.backgroundImage = `url("${background.imageUrl}")`;
      base.backgroundSize = background.size || "cover";
      base.backgroundPosition = background.position || "center";
      base.backgroundRepeat = background.repeat || "no-repeat";
    }

    return base;
  };

  const scopedCssCode = customCss ? scopeAndSanitizeCss(customCss, `.${scopeId}`) : "";

  return (
    <div
      id={scopeId}
      className={`${scopeId} relative min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden select-none transition-colors duration-300`}
      style={{
        ...getBackgroundStyle(),
        fontFamily: typography.bodyFont ? `"${typography.bodyFont}", sans-serif` : "inherit",
      }}
      onClick={() => onSelectElement?.("background")}
    >
      {/* Dynamic Scoped CSS */}
      {scopedCssCode && <style dangerouslySetInnerHTML={{ __html: scopedCssCode }} />}

      {/* Background Pattern Overlays */}
      {background.pattern === "dots" && (
        <div className="absolute inset-0 nt-dot-grid opacity-60 pointer-events-none z-0" />
      )}
      {background.pattern === "grid" && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      )}
      {background.pattern === "scanlines" && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-15"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 50%, transparent 50%)",
            backgroundSize: "100% 4px",
          }}
        />
      )}

      {/* Particle Effects Canvas */}
      {effects.particles !== "None" && (
        <ParticlesCanvas effect={effects.particles} accentColor={effects.glowColor || "#ffffff"} />
      )}

      {/* Background Dim / Blur Overlay */}
      {background.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundColor: background.overlayColor || "#000000",
            opacity: background.overlayOpacity,
            backdropFilter: background.blur > 0 ? `blur(${background.blur}px)` : undefined,
          }}
        />
      )}

      {/* Main Container Card */}
      <motion.div
        layout
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="profile-container w-full relative z-10 transition-all border shadow-2xl"
        style={{
          maxWidth: `${layout.maxWidth || 580}px`,
          padding: `${layout.padding || 32}px`,
          gap: `${layout.gap || 24}px`,
          borderRadius: `${discordRpc.borderRadius + 8}px`,
          backgroundColor: effects.glassmorphism
            ? `rgba(12, 12, 12, ${effects.opacity / 100})`
            : "#0c0c0c",
          backdropFilter: effects.blur > 0 ? `blur(${effects.blur}px)` : undefined,
          borderColor: effects.ambientGlow ? effects.glowColor : "#242424",
          boxShadow: effects.ambientGlow
            ? `0 0 35px ${effects.glowColor}25, 0 20px 40px rgba(0,0,0,0.8)`
            : "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Top Minimalist Header */}
        <div className="flex items-center justify-between text-[11px] pb-4 mb-4 border-b border-white/10 text-neutral-400 font-mono">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: effects.glowColor || "#ffffff" }}
            />
            <span className="text-white font-semibold tracking-wider">
              PIXEL.GG // {(data.username || "USER").toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-neutral-400">
              <Eye size={12} />
              <span>{(data.views || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-500 hover:text-white transition-colors cursor-pointer">
              <Share2 size={12} />
            </div>
          </div>
        </div>

        {/* Dynamic Element Ordering */}
        <div
          className={`flex flex-col ${
            layout.alignment === "left"
              ? "items-start text-left"
              : layout.alignment === "right"
              ? "items-end text-right"
              : "items-center text-center"
          }`}
          style={{ gap: `${layout.gap || 22}px` }}
        >
          {layout.elementOrder?.map((elementId) => {
            if (!isLayerVisible(elementId)) return null;

            // 1. Avatar
            if (elementId === "avatar") {
              const alignClass =
                avatar.alignment === "left"
                  ? "self-start"
                  : avatar.alignment === "right"
                  ? "self-end"
                  : "self-center";

              const animClass =
                avatar.hoverAnimation === "scale"
                  ? "hover:scale-105"
                  : avatar.hoverAnimation === "rotate"
                  ? "hover:rotate-6"
                  : avatar.hoverAnimation === "pulse"
                  ? "animate-pulse"
                  : "";

              return (
                <div
                  key="avatar"
                  {...getElementSelectProps("avatar")}
                  className={`shrink-0 ${alignClass}`}
                  style={{
                    transform: avatar.offsetY ? `translateY(${avatar.offsetY}px)` : undefined,
                  }}
                >
                  <div
                    className={`profile-avatar relative overflow-hidden flex items-center justify-center font-bold text-white shadow-xl transition-all duration-300 ${animClass}`}
                    style={{
                      width: `${avatar.size}px`,
                      height: `${avatar.size}px`,
                      borderRadius: getAvatarRadius(),
                      borderWidth: `${avatar.borderWidth}px`,
                      borderStyle: "solid",
                      borderColor: avatar.borderColor || "#ffffff",
                      backgroundColor: "#18181b",
                      boxShadow: avatar.glow
                        ? `0 0 24px ${avatar.glowColor || "#ffffff"}80`
                        : undefined,
                    }}
                  >
                    {data.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={data.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full"
                        style={{ objectFit: avatar.objectFit || "cover" }}
                      />
                    ) : (
                      <span className="text-2xl">
                        {(data.displayName || data.username || "P").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // 2. Identity (Name, Badges & Bio)
            if (elementId === "identity") {
              return (
                <div
                  key="identity"
                  {...getElementSelectProps("identity")}
                  className={`profile-identity w-full space-y-1.5 flex flex-col ${
                    layout.alignment === "left"
                      ? "items-start text-left"
                      : layout.alignment === "right"
                      ? "items-end text-right"
                      : "items-center text-center"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="profile-username tracking-tight truncate"
                      style={{
                        fontFamily: identity.titleFont ? `"${identity.titleFont}", sans-serif` : "inherit",
                        fontSize: `${identity.titleSize}px`,
                        fontWeight: identity.titleWeight,
                        color: identity.titleColor || "#ffffff",
                        letterSpacing: `${typography.letterSpacing}px`,
                      }}
                    >
                      {data.displayName || data.username || "Pixel Identity"}
                    </h1>

                    {/* Badge variants */}
                    {identity.badgeStyle === "pill" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-bold uppercase tracking-wider">
                        VERIFIED ✓
                      </span>
                    )}
                    {identity.badgeStyle === "glyph" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/60 text-white font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> (01)
                      </span>
                    )}
                    {identity.badgeStyle === "neon" && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${effects.glowColor}25`,
                          color: effects.glowColor || "#22d3ee",
                          border: `1px solid ${effects.glowColor}`,
                          boxShadow: `0 0 10px ${effects.glowColor}40`,
                        }}
                      >
                        PRO &bull; LIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 font-mono">@{data.username}</p>

                  {data.bio && (
                    <p
                      className="profile-bio text-xs leading-relaxed max-w-md pt-1"
                      style={{
                        fontFamily: identity.bioFont ? `"${identity.bioFont}", sans-serif` : "inherit",
                        color: identity.bioColor || "#a3a3a3",
                        lineHeight: typography.lineHeight || 1.5,
                      }}
                    >
                      {data.bio}
                    </p>
                  )}
                </div>
              );
            }

            // 3. Discord Rich Presence Tile
            if (elementId === "rpc") {
              // Website Profile RPC visibility check:
              // If disabled or layer hidden, do not display and do NOT reserve space
              if (discordRpc.showProfileRpc === false || !isLayerVisible("rpc")) {
                return null;
              }

              const rpc = data.discordPresence || {
                appName: "Visual Studio Code",
                details: "Designing Nothing OS Presence",
                state: "Pixel.gg Studio Engine",
                largeImage: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
              };

              const imgSizeClass =
                discordRpc.imageSize === "small"
                  ? "w-10 h-10"
                  : discordRpc.imageSize === "large"
                  ? "w-16 h-16"
                  : "w-12 h-12";

              return (
                <div key="rpc" {...getElementSelectProps("rpc")} className="w-full">
                  <div
                    className="discord-rpc w-full p-4 text-left space-y-2.5 font-mono border transition-all"
                    style={{
                      borderRadius: `${discordRpc.borderRadius}px`,
                      borderColor: discordRpc.customBorderColor || "#242424",
                      backgroundColor:
                        discordRpc.style === "glass"
                          ? "rgba(18, 18, 18, 0.7)"
                          : discordRpc.style === "neon"
                          ? "#090610"
                          : "#111111",
                      backdropFilter: discordRpc.style === "glass" ? "blur(14px)" : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1.5 text-white font-semibold">
                        <Activity size={12} className="text-white" /> DISCORD RICH PRESENCE
                      </span>
                      {discordRpc.showTelemetryBadge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE TELEMETRY
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex ${
                        discordRpc.imageLayout === "stacked"
                          ? "flex-col items-start gap-2"
                          : discordRpc.imageLayout === "right"
                          ? "flex-row-reverse items-center justify-between gap-3"
                          : "flex-row items-center gap-3"
                      }`}
                    >
                      {discordRpc.imageLayout !== "hidden" && (
                        <div className={`${imgSizeClass} rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-md`}>
                          {rpc.largeImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={rpc.largeImage}
                              alt="RPC"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>RPC</span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 text-xs truncate flex-1">
                        <p className="text-white font-semibold truncate">
                          {rpc.appName || "Active Discord Application"}
                        </p>
                        {rpc.details && (
                          <p className="text-neutral-400 text-[11px] truncate">{rpc.details}</p>
                        )}
                        {rpc.state && (
                          <p className="text-neutral-500 text-[10px] truncate">{rpc.state}</p>
                        )}
                        {discordRpc.showTimer && (
                          <p className="text-neutral-400 text-[10px] font-mono pt-0.5">
                            14:45 elapsed
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 4. Music Player Dock
            if (elementId === "music") {
              return (
                <div key="music" {...getElementSelectProps("music")} className="w-full">
                  <div className="bg-[#111111] border border-[#242424] rounded-2xl p-3.5 space-y-2.5 font-mono text-xs w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                          <Play size={12} className="ml-0.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-white font-medium text-xs truncate">
                            {data.musicTitle || "Nothing Soundscape (01)"}
                          </p>
                          <p className="text-neutral-500 text-[10px] truncate">
                            {data.musicArtist || "Ambient Audio Engine"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                        <Volume2 size={13} />
                        <div className="w-14 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="w-2/3 h-full bg-white rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              );
            }

            // 5. Action Buttons
            if (elementId === "buttons") {
              const buttonsList = data.buttons || [
                { id: "b1", title: "DISCORD COMMUNITY", subtitle: "Join the verified network", url: "#" },
                { id: "b2", title: "GITHUB REPOSITORY", subtitle: "Inspect source code", url: "#" },
              ];

              return (
                <div key="buttons" {...getElementSelectProps("buttons")} className="w-full space-y-2">
                  {buttonsList.map((btn) => (
                    <div
                      key={btn.id}
                      className="profile-button w-full py-3 px-4 font-mono text-xs font-semibold flex items-center justify-between transition-all"
                      style={{
                        borderRadius: `${buttonConfig.borderRadius}px`,
                        backgroundColor:
                          buttonConfig.variant === "solid-white"
                            ? "#ffffff"
                            : buttonConfig.variant === "glass"
                            ? "rgba(255, 255, 255, 0.08)"
                            : buttonConfig.variant === "neon"
                            ? `${effects.glowColor}15`
                            : "transparent",
                        color:
                          buttonConfig.variant === "solid-white"
                            ? "#000000"
                            : buttonConfig.variant === "neon"
                            ? effects.glowColor || "#22d3ee"
                            : "#ffffff",
                        border:
                          buttonConfig.variant === "outline"
                            ? "1px solid rgba(255, 255, 255, 0.4)"
                            : buttonConfig.variant === "neon"
                            ? `1px solid ${effects.glowColor || "#22d3ee"}`
                            : "1px solid rgba(255, 255, 255, 0.15)",
                        boxShadow:
                          buttonConfig.variant === "neon"
                            ? `0 0 12px ${effects.glowColor}30`
                            : undefined,
                      }}
                    >
                      <div className="text-left truncate">
                        <p className="truncate">{btn.title}</p>
                        {btn.subtitle && (
                          <p className="text-[10px] opacity-70 font-sans font-normal truncate">
                            {btn.subtitle}
                          </p>
                        )}
                      </div>
                      <ExternalLink size={13} className="shrink-0 opacity-70" />
                    </div>
                  ))}
                </div>
              );
            }

            // 6. Social Links Row
            if (elementId === "socials") {
              const linksList = data.links || [
                { id: "l1", label: "Discord", url: "#", visibility: true },
                { id: "l2", label: "GitHub", url: "#", visibility: true },
                { id: "l3", label: "X / Twitter", url: "#", visibility: true },
              ];

              return (
                <div
                  key="socials"
                  {...getElementSelectProps("socials")}
                  className={`profile-socials flex flex-wrap gap-2 pt-1 ${
                    socials.alignment === "left"
                      ? "justify-start"
                      : socials.alignment === "right"
                      ? "justify-end"
                      : "justify-center"
                  }`}
                >
                  {linksList
                    .filter((l) => l.visibility)
                    .map((link) => (
                      <div
                        key={link.id}
                        className="px-3.5 py-1.5 border text-xs font-mono flex items-center gap-1.5 transition-all"
                        style={{
                          borderRadius:
                            socials.style === "circle" || socials.style === "pill"
                              ? "9999px"
                              : "8px",
                          borderColor:
                            socials.style === "neon"
                              ? effects.glowColor
                              : "rgba(255, 255, 255, 0.15)",
                          backgroundColor:
                            socials.style === "glass"
                              ? "rgba(255, 255, 255, 0.05)"
                              : socials.style === "neon"
                              ? `${effects.glowColor}15`
                              : "#141414",
                          color:
                            socials.style === "neon"
                              ? effects.glowColor || "#ffffff"
                              : "#d4d4d8",
                        }}
                      >
                        <span style={{ fontSize: `${socials.iconSize}px` }}>{link.label}</span>
                        <ExternalLink size={11} className="opacity-60" />
                      </div>
                    ))}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Branding Footer */}
        <div className="pt-4 mt-2 border-t border-white/10 text-center text-[10px] text-neutral-500 font-mono">
          POWERED BY <span className="text-neutral-300 font-bold">PIXEL.GG STUDIO (01)</span> &bull; NOTHING OS
        </div>
      </motion.div>
    </div>
  );
};
