"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Code2,
  Crown,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Music,
  Pause,
  Play,
  Plus,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import { PlatformIcon } from "@/components/links/PlatformIcons";
import { resolvePlatformDef } from "@/components/studio/socialsEngine";
import {
  BuilderCanvasSettings,
  BuilderComponentConfig,
  BuilderDeviceMode,
  BuilderNode,
  ProfileBadgeItem,
  ProfileBuilderDocument,
} from "./profileBuilderTypes";
import {
  MAX_NESTING_DEPTH,
  hexToRgbaSafe,
  isContainerType,
  sanitizeExternalUrl,
} from "./componentRegistry";

export interface ProfileLiveActivityData {
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  discordPresence?: {
    hasActivity?: boolean;
    status?: string | null;
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null;
}

interface ProfileBuilderRendererProps {
  document: ProfileBuilderDocument;
  deviceMode: BuilderDeviceMode;
  isInteractive?: boolean;
  liveData?: ProfileLiveActivityData;
  selectedId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onQuickAddGalleryImage?: (galleryId: string) => void;
  renderInteractiveChrome?: (
    node: BuilderNode,
    childrenRendered: React.ReactNode
  ) => React.ReactNode;
  children?: React.ReactNode;
}

function getBadgeIcon(icon: ProfileBadgeItem["icon"], size = 11) {
  switch (icon) {
    case "crown":
      return <Crown size={size} />;
    case "premium":
      return <Sparkles size={size} />;
    case "dev":
      return <Code2 size={size} />;
    case "verified":
      return <BadgeCheck size={size} />;
    case "shield":
      return <Shield size={size} />;
    case "flame":
      return <Flame size={size} />;
    default:
      return <Star size={size} />;
  }
}

export function resolveEffectiveBackground(
  canvas: BuilderCanvasSettings,
  nodes: BuilderNode[]
): {
  visible: boolean;
  type: "solid" | "gradient" | "image" | "video";
  color: string;
  gradientTo: string;
  gradientAngle: number;
  imageUrl: string;
  videoUrl: string;
  position: string;
  size: "cover" | "contain" | "auto";
  opacity: number;
  blur: number;
  overlayOpacity: number;
  overlayColor: string;
} {
  const bgNode = nodes.find((n) => n.parentId === null && n.type === "background");
  if (bgNode) {
    return {
      visible: bgNode.visible,
      type: (bgNode.config.bgType as BuilderComponentConfig["bgType"]) || canvas.backgroundType,
      color: bgNode.config.bgColor || canvas.backgroundColor,
      gradientTo: bgNode.config.bgGradientTo || canvas.backgroundGradientTo,
      gradientAngle: bgNode.config.bgGradientAngle ?? canvas.backgroundGradientAngle,
      imageUrl:
        bgNode.config.bgImageUrl !== undefined
          ? bgNode.config.bgImageUrl
          : canvas.backgroundImage,
      videoUrl:
        bgNode.config.bgVideoUrl !== undefined
          ? bgNode.config.bgVideoUrl
          : canvas.backgroundVideo,
      position: bgNode.config.bgPosition || canvas.backgroundPosition || "center center",
      size: bgNode.config.bgSize || canvas.backgroundSize || "cover",
      opacity: bgNode.style.opacity ?? canvas.backgroundOpacity ?? 1,
      blur: bgNode.style.blur ?? canvas.backgroundBlur ?? 0,
      overlayOpacity: bgNode.config.bgOverlayOpacity ?? canvas.overlayOpacity ?? 0.35,
      overlayColor: canvas.overlayColor || "#000000",
    };
  }
  return {
    visible: true,
    type: canvas.backgroundType,
    color: canvas.backgroundColor,
    gradientTo: canvas.backgroundGradientTo,
    gradientAngle: canvas.backgroundGradientAngle,
    imageUrl: canvas.backgroundImage,
    videoUrl: canvas.backgroundVideo,
    position: canvas.backgroundPosition || "center center",
    size: canvas.backgroundSize || "cover",
    opacity: canvas.backgroundOpacity ?? 1,
    blur: canvas.backgroundBlur ?? 0,
    overlayOpacity: canvas.overlayOpacity ?? 0.35,
    overlayColor: canvas.overlayColor || "#000000",
  };
}

export const ProfileBuilderRenderer: React.FC<ProfileBuilderRendererProps> = ({
  document,
  deviceMode,
  isInteractive = false,
  liveData,
  onSelectNode,
  onQuickAddGalleryImage,
  renderInteractiveChrome,
  children,
}) => {
  const { canvas, nodes } = document;
  const bg = resolveEffectiveBackground(canvas, nodes);
  const publicStageHostRef = useRef<HTMLDivElement>(null);
  const [measuredHostWidth, setMeasuredHostWidth] = useState<number>(1280);

  useEffect(() => {
    if (isInteractive) return;
    const el = publicStageHostRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = el.clientWidth;
      if (next > 0) setMeasuredHostWidth(next);
    };
    updateWidth();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateWidth);
      ro.observe(el);
    }
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
      ro?.disconnect();
    };
  }, [isInteractive, deviceMode]);

  const viewportWidth =
    deviceMode === "mobile"
      ? Math.min(390, canvas.width)
      : deviceMode === "tablet"
        ? Math.min(768, canvas.width)
        : canvas.width;

  const viewportHeight =
    deviceMode === "mobile"
      ? Math.max(canvas.height, 740)
      : deviceMode === "tablet"
        ? Math.max(canvas.height, 680)
        : canvas.height;

  const renderNodeInner = (
    node: BuilderNode,
    depth: number,
    ancestors: Set<string>
  ): React.ReactNode => {
    if (!node.visible) return null;
    if (node.responsive?.hiddenOn?.includes(deviceMode)) return null;

    if (depth > MAX_NESTING_DEPTH) {
      return (
        <div className="w-full h-full border border-dashed border-amber-500/60 bg-amber-950/30 rounded-lg flex items-center justify-center p-2 text-[10px] font-mono text-amber-300 text-center">
          Nesting depth limit ({MAX_NESTING_DEPTH}) reached
        </div>
      );
    }

    if (isContainerType(node.type)) {
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(node.id);
      const childrenNodes = nodes
        .filter((n) => n.parentId === node.id && n.visible && !nextAncestors.has(n.id))
        .filter((n) => !n.responsive?.hiddenOn?.includes(deviceMode))
        .sort((a, b) => a.zIndex - b.zIndex);

      const layoutMode = node.style.layoutMode || "absolute";
      const padding =
        deviceMode === "mobile" && node.responsive.paddingOverride?.mobile !== undefined
          ? node.responsive.paddingOverride.mobile
          : deviceMode === "tablet" && node.responsive.paddingOverride?.tablet !== undefined
            ? node.responsive.paddingOverride.tablet
            : node.style.padding ?? 0;

      const isGallery = node.type === "image-gallery";
      const galleryCols = isGallery
        ? deviceMode === "mobile"
          ? node.responsive.galleryColumns?.mobile ?? Math.min(2, node.config.galleryColumns ?? 3)
          : deviceMode === "tablet"
            ? node.responsive.galleryColumns?.tablet ?? Math.min(2, node.config.galleryColumns ?? 3)
            : node.responsive.galleryColumns?.desktop ?? node.config.galleryColumns ?? 3
        : 1;

      const bgFill =
        node.style.backgroundType === "gradient" && node.style.backgroundGradientTo
          ? `linear-gradient(${node.style.backgroundGradientAngle ?? 135}deg, ${hexToRgbaSafe(
              node.style.backgroundColor || "#0d0d12",
              node.style.backgroundOpacity ?? 0.92
            )}, ${hexToRgbaSafe(
              node.style.backgroundGradientTo,
              node.style.backgroundOpacity ?? 0.92
            )})`
          : node.style.backgroundType === "transparent"
            ? "transparent"
            : hexToRgbaSafe(
                node.style.backgroundColor || "#0d0d11",
                node.style.backgroundOpacity ?? 0.92
              );

      const boxShadow =
        node.style.shadowBlur && node.style.shadowBlur > 0
          ? `${node.style.shadowOffsetX ?? 0}px ${node.style.shadowOffsetY ?? 12}px ${node.style.shadowBlur}px ${node.style.shadowColor || "rgba(0,0,0,0.6)"}`
          : undefined;

      const renderedChildren = childrenNodes.map((child) => {
        const rendered = renderNodeInner(child, depth + 1, nextAncestors);
        if (renderInteractiveChrome) {
          return (
            <React.Fragment key={child.id}>
              {renderInteractiveChrome(child, rendered)}
            </React.Fragment>
          );
        }

        // Public / Static nested node positioning
        const childStyle: React.CSSProperties =
          layoutMode === "absolute" && !isGallery
            ? {
                position: "absolute",
                left: `${child.x}px`,
                top: `${child.y}px`,
                width: `${child.width}px`,
                height: `${child.height}px`,
                zIndex: child.zIndex,
                opacity: child.style.opacity ?? 1,
                transform: child.rotation ? `rotate(${child.rotation}deg)` : undefined,
              }
            : {
                position: "relative",
                width: isGallery ? "100%" : `${child.width}px`,
                height: `${child.height}px`,
                zIndex: child.zIndex,
                opacity: child.style.opacity ?? 1,
              };

        return (
          <div key={child.id} style={childStyle}>
            {rendered}
          </div>
        );
      });

      const containerSurfaceStyle: React.CSSProperties = {
        background: bgFill,
        backgroundImage:
          node.style.backgroundType === "image" && node.style.backgroundImage
            ? `url("${node.style.backgroundImage}")`
            : undefined,
        backgroundSize: node.style.backgroundSize || "cover",
        backgroundPosition: node.style.backgroundPosition || "center",
        borderWidth: `${node.style.borderWidth ?? 1}px`,
        borderStyle: node.style.borderStyle || "solid",
        borderColor: node.style.borderColor || "#282830",
        borderRadius: `${node.style.borderRadius ?? 16}px`,
        backdropFilter: node.style.blur ? `blur(${node.style.blur}px)` : undefined,
        boxShadow,
        overflow: node.style.overflow || "hidden",
        padding: `${padding}px`,
      };

      if (isGallery && layoutMode === "absolute" && !isInteractive) {
        return (
          <div
            className="w-full h-full relative"
            style={{
              ...containerSurfaceStyle,
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, galleryCols)}, minmax(0, 1fr))`,
              gap: `${node.config.gallerySpacing ?? 8}px`,
              alignItems: "stretch",
            }}
          >
            {childrenNodes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-neutral-500 text-[11px] font-mono border border-dashed border-[#272730] rounded-lg p-3">
                <ImageIcon size={16} className="mb-1 opacity-60" />
                <span>Empty Image Gallery</span>
              </div>
            ) : (
              renderedChildren
            )}
          </div>
        );
      }

      if (layoutMode !== "absolute" && !isInteractive) {
        const isGrid = layoutMode === "grid";
        const isRow = layoutMode === "flex-row" && !(deviceMode === "mobile" && node.responsive.mobileStack);
        return (
          <div
            className="w-full h-full relative"
            style={{
              ...containerSurfaceStyle,
              display: isGrid ? "grid" : "flex",
              flexDirection: isGrid ? undefined : isRow ? "row" : "column",
              gridTemplateColumns: isGrid
                ? `repeat(${Math.max(1, galleryCols || 2)}, minmax(0, 1fr))`
                : undefined,
              gap: `${node.style.gap ?? 12}px`,
              alignItems:
                node.style.alignItems === "center"
                  ? "center"
                  : node.style.alignItems === "end"
                    ? "flex-end"
                    : node.style.alignItems === "stretch"
                      ? "stretch"
                      : "flex-start",
              justifyContent:
                node.style.justifyContent === "center"
                  ? "center"
                  : node.style.justifyContent === "end"
                    ? "flex-end"
                    : node.style.justifyContent === "between"
                      ? "space-between"
                      : "flex-start",
              flexWrap: isRow ? "wrap" : undefined,
            }}
          >
            {renderedChildren}
          </div>
        );
      }

      return (
        <div
          className="w-full h-full relative"
          style={containerSurfaceStyle}
          data-testid={`builder-container-${node.id}`}
        >
          {childrenNodes.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 pointer-events-none select-none">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                {node.name}
              </span>
              <span className="text-[10px] font-mono text-neutral-500 mt-0.5">
                {isGallery
                  ? "Add images to populate gallery"
                  : "Drop components here or click + Add Element"}
              </span>
            </div>
          )}

          {renderedChildren}

          {isInteractive &&
            isGallery &&
            childrenNodes.length < (node.config.galleryMaxImages ?? 9) &&
            onQuickAddGalleryImage && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddGalleryImage(node.id);
                }}
                className="absolute right-2 bottom-2 w-7 h-7 rounded-lg bg-[#141418]/90 hover:bg-[#1e1e26] border border-white/15 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer z-30"
                title="Add gallery image"
                data-testid={`gallery-quick-add-${node.id}`}
              >
                <Plus size={13} />
              </button>
            )}
        </div>
      );
    }

    // LEAF COMPONENT RENDERERS
    switch (node.type) {
      case "banner-image":
      case "image": {
        const isBannerPlaceholder =
          node.type === "banner-image" &&
          (!node.config.src ||
            node.config.src === "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80");
        const src = (isBannerPlaceholder && liveData?.bannerUrl) ? liveData.bannerUrl : node.config.src;
        const radius = node.style.borderRadius ?? 10;
        return (
          <div
            className="w-full h-full overflow-hidden bg-[#111116]"
            style={{
              borderRadius: `${radius}px`,
              borderWidth: `${node.style.borderWidth ?? 0}px`,
              borderColor: node.style.borderColor || "#272730",
              borderStyle: node.style.borderStyle || "solid",
            }}
          >
            {src ? (
              <img
                src={src}
                alt={node.name}
                draggable={false}
                className="w-full h-full select-none pointer-events-none"
                style={{
                  objectFit: node.config.fit || "cover",
                  objectPosition: node.config.objectPosition || "center",
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 font-mono text-[10px]">
                <ImageIcon size={16} className="mb-1 opacity-60" />
                <span>No Image</span>
              </div>
            )}
          </div>
        );
      }

      case "profile-image": {
        const isDefaultPlaceholderAvatar =
          !node.config.src ||
          node.config.src === "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80";
        const avatarSrc =
          isDefaultPlaceholderAvatar && liveData?.avatarUrl ? liveData.avatarUrl : node.config.src;
        const shapeRadius =
          node.config.avatarShape === "circle"
            ? "9999px"
            : node.config.avatarShape === "square"
              ? "0px"
              : `${node.style.borderRadius ?? 14}px`;
        return (
          <div className="relative w-full h-full">
            <div
              className="w-full h-full overflow-hidden bg-[#131318]"
              style={{
                borderRadius: shapeRadius,
                borderWidth: `${node.style.borderWidth ?? 2}px`,
                borderColor: node.style.borderColor || "#52525b",
                borderStyle: node.style.borderStyle || "solid",
                boxShadow: node.style.shadowBlur
                  ? `0 8px ${node.style.shadowBlur}px ${node.style.shadowColor || "rgba(0,0,0,0.65)"}`
                  : undefined,
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={node.name}
                  draggable={false}
                  className="w-full h-full select-none pointer-events-none"
                  style={{
                    objectFit: node.config.fit || "cover",
                    objectPosition: node.config.objectPosition || "center",
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-neutral-500">
                  PFP
                </div>
              )}
            </div>
            {node.config.showStatusDot && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0b0b0e]"
                style={{ backgroundColor: node.config.statusColor || "#22c55e" }}
              />
            )}
          </div>
        );
      }

      case "name-text": {
        const fontSize =
          (deviceMode === "mobile" && node.responsive.fontSizeOverride?.mobile) ||
          (deviceMode === "tablet" && node.responsive.fontSizeOverride?.tablet) ||
          node.config.fontSize ||
          22;
        return (
          <div
            className="w-full h-full flex items-center gap-1.5 overflow-hidden select-none"
            style={{
              justifyContent:
                node.config.textAlign === "center"
                  ? "center"
                  : node.config.textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              fontFamily: node.config.fontFamily || "Space Grotesk, sans-serif",
              fontSize: `${fontSize}px`,
              fontWeight: node.config.fontWeight ?? 700,
              color: node.config.color || "#ffffff",
              letterSpacing: `${node.config.letterSpacing ?? 0.4}px`,
              lineHeight: node.config.lineHeight ?? 1.15,
            }}
          >
            <span className="truncate">
              {node.config.text && node.config.text !== "PIXEL USER"
                ? node.config.text
                : liveData?.displayName || liveData?.username || node.config.text || "PIXEL USER"}
            </span>
            {node.config.showVerifiedBadge && (
              <BadgeCheck size={Math.max(14, Math.round(fontSize * 0.72))} className="text-neutral-200 shrink-0" />
            )}
          </div>
        );
      }

      case "subtitle": {
        const fontSize =
          (deviceMode === "mobile" && node.responsive.fontSizeOverride?.mobile) ||
          (deviceMode === "tablet" && node.responsive.fontSizeOverride?.tablet) ||
          node.config.fontSize ||
          12;
        return (
          <div
            className="w-full h-full flex items-center justify-between gap-2 overflow-hidden select-none"
            style={{
              fontFamily: node.config.fontFamily || "JetBrains Mono, monospace",
              fontSize: `${fontSize}px`,
              fontWeight: node.config.fontWeight ?? 500,
              color: node.config.color || "#a1a1aa",
              letterSpacing: `${node.config.letterSpacing ?? 0.2}px`,
              lineHeight: node.config.lineHeight ?? 1.3,
              textAlign: node.config.textAlign || "left",
            }}
          >
            <span className="truncate flex-1">
              {node.config.text && !node.config.text.startsWith("@pixeluser")
                ? node.config.text
                : liveData?.username
                  ? `@${liveData.username}${
                      node.config.text?.includes("·")
                        ? ` · ${node.config.text.split("·").slice(1).join("·").trim()}`
                        : ""
                    }`
                  : node.config.text || "@pixeluser"}
            </span>
            {node.config.statusPillActive && node.config.statusPillText && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#121216] border border-[#26262f] text-[10px] font-mono text-neutral-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {node.config.statusPillText}
              </span>
            )}
          </div>
        );
      }

      case "description": {
        const fontSize =
          (deviceMode === "mobile" && node.responsive.fontSizeOverride?.mobile) ||
          (deviceMode === "tablet" && node.responsive.fontSizeOverride?.tablet) ||
          node.config.fontSize ||
          12;
        const overflowMode = node.config.overflowBehavior || "wrap";
        return (
          <div
            className={`w-full h-full select-none ${overflowMode === "ellipsis" ? "truncate" : "overflow-hidden"}`}
            style={{
              fontFamily: node.config.fontFamily || "JetBrains Mono, monospace",
              fontSize: `${fontSize}px`,
              fontWeight: node.config.fontWeight ?? 400,
              color: node.config.color || "#d4d4d8",
              textAlign: node.config.textAlign || "left",
              lineHeight: node.config.lineHeight ?? 1.45,
              maxWidth: node.config.maxWidth ? `${node.config.maxWidth}px` : undefined,
              whiteSpace: overflowMode === "wrap" ? "pre-wrap" : "nowrap",
              wordBreak: "break-word",
            }}
          >
            {node.config.text || liveData?.bio || "Profile bio description."}
          </div>
        );
      }

      case "badges-group": {
        const badges = (node.config.badges || []).filter((b) => b.visible);
        return (
          <div className="w-full h-full flex items-center flex-wrap gap-1.5 overflow-hidden select-none">
            {badges.length === 0 ? (
              <span className="text-[10px] font-mono text-neutral-500">No visible badges</span>
            ) : (
              badges.map((badge) => (
                <span
                  key={badge.id}
                  title={badge.tooltip || badge.label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold border"
                  style={{
                    color: badge.color,
                    backgroundColor: badge.backgroundColor,
                    borderColor: badge.borderColor,
                    borderRadius: `${badge.borderRadius ?? 6}px`,
                  }}
                >
                  {getBadgeIcon(badge.icon)}
                  <span>{badge.label}</span>
                </span>
              ))
            )}
          </div>
        );
      }

      case "separator": {
        return (
          <div className="w-full h-full flex items-center">
            <div
              className="w-full"
              style={{
                borderTopWidth: `${node.config.separatorThickness ?? 1}px`,
                borderTopStyle: node.config.separatorStyle || "solid",
                borderTopColor: node.config.separatorColor || "#272730",
              }}
            />
          </div>
        );
      }

      case "music-display": {
        const hasLiveTrack = Boolean(liveData?.musicTitle);
        const showConfigured = !node.config.useLiveActivity || hasLiveTrack;
        const trackTitle = node.config.useLiveActivity
          ? liveData?.musicTitle || node.config.trackName
          : node.config.trackName;
        const artist = node.config.useLiveActivity
          ? liveData?.musicArtist || node.config.artist
          : node.config.artist;
        const accent = node.config.accentColor || "#22c55e";

        return (
          <div
            className="w-full h-full p-2.5 flex flex-col justify-between overflow-hidden select-none font-mono"
            style={{
              backgroundColor: node.style.backgroundColor || "#111116",
              borderColor: node.style.borderColor || "#272730",
              borderWidth: `${node.style.borderWidth ?? 1}px`,
              borderStyle: "solid",
              borderRadius: `${node.style.borderRadius ?? 12}px`,
            }}
          >
            <div className="flex items-center justify-between text-[9px] text-neutral-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-200">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                Listening to {node.config.musicPlatform || "Spotify"}
              </span>
              {node.config.isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </div>

            {showConfigured && trackTitle ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0 my-1">
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-[#1a1a22] border border-white/10 shrink-0 flex items-center justify-center">
                    {node.config.artworkUrl ? (
                      <img
                        src={node.config.artworkUrl}
                        alt={trackTitle}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <Music size={14} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate">{trackTitle}</div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {artist || "Unknown Artist"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-neutral-500">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, node.config.progressPercent ?? 45))}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                  <span className="shrink-0 tabular-nums">
                    {node.config.elapsedText || "0:00"}/{node.config.durationText || "0:00"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center text-[10px] text-neutral-500">
                {node.config.musicEmptyText || "No audio currently playing"}
              </div>
            )}
          </div>
        );
      }

      case "custom-rpc": {
        const live = liveData?.discordPresence;
        const activeLive =
          node.config.useLiveRpc && live && (live.hasActivity || live.appName || live.details)
            ? live
            : null;
        const appName = activeLive ? activeLive.appName : node.config.appName;
        const details = activeLive ? activeLive.details : node.config.details;
        const state = activeLive ? activeLive.state : node.config.state;
        const image = activeLive
          ? activeLive.largeImage || node.config.largeImage
          : node.config.largeImage;
        const statusDot =
          node.config.statusIndicator === "dnd"
            ? "#ef4444"
            : node.config.statusIndicator === "idle"
              ? "#f59e0b"
              : node.config.statusIndicator === "offline"
                ? "#71717a"
                : "#22c55e";

        return (
          <div
            className="w-full h-full p-2.5 flex flex-col justify-between overflow-hidden select-none font-mono"
            style={{
              backgroundColor: node.style.backgroundColor || "#111116",
              borderColor: node.style.borderColor || "#272730",
              borderWidth: `${node.style.borderWidth ?? 1}px`,
              borderStyle: "solid",
              borderRadius: `${node.style.borderRadius ?? 12}px`,
            }}
          >
            <div className="flex items-center justify-between text-[9px] text-neutral-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-200">
                <Gamepad2 size={11} className="text-neutral-300" />
                Custom RPC
              </span>
              <span className="inline-flex items-center gap-1 uppercase text-[8px] text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDot }} />
                {node.config.statusIndicator || "online"}
              </span>
            </div>

            {appName ? (
              <div className="flex items-center gap-2.5 min-w-0 my-auto">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#181820] border border-white/10 shrink-0 flex items-center justify-center">
                  {image ? (
                    <img
                      src={image}
                      alt={appName}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <Activity size={16} className="text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">{appName}</div>
                  {details && (
                    <div className="text-[10px] text-neutral-300 truncate">{details}</div>
                  )}
                  {state && (
                    <div className="text-[9px] text-neutral-500 truncate">{state}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center text-[10px] text-neutral-500">
                {node.config.rpcEmptyText || "No active Discord RPC session"}
              </div>
            )}
          </div>
        );
      }

      case "social-group": {
        const items = (node.config.socialItems || []).filter((i) => i.visible);
        return (
          <div className="w-full h-full flex items-center flex-wrap gap-2 overflow-hidden select-none">
            {items.length === 0 ? (
              <span className="text-[10px] font-mono text-neutral-500">No social links configured</span>
            ) : (
              items.map((item) => {
                const def = resolvePlatformDef(item.platform, item.label);
                const safeHref = sanitizeExternalUrl(item.url);
                const pillClass =
                  "h-8 px-2.5 rounded-lg bg-[#141419] border border-[#272732] hover:border-white/30 flex items-center gap-1.5 text-[11px] font-mono text-neutral-200 transition-colors";
                const content = (
                  <>
                    <PlatformIcon id={item.platform} className="w-3.5 h-3.5 shrink-0" />
                    {item.style !== "circle" && (
                      <span className="truncate max-w-[90px]">{item.label || def.name}</span>
                    )}
                  </>
                );
                if (!isInteractive && safeHref) {
                  return (
                    <a
                      key={item.id}
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.tooltip || item.label || def.name}
                      className={pillClass}
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <div
                    key={item.id}
                    title={item.tooltip || item.label || def.name}
                    className={pillClass}
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
        );
      }

      case "custom-component": {
        return (
          <div
            className="w-full h-full p-2.5 flex flex-col justify-between font-mono select-none overflow-hidden"
            style={{
              backgroundColor: node.style.backgroundColor || "#121217",
              borderColor: node.style.borderColor || "#262630",
              borderWidth: `${node.style.borderWidth ?? 1}px`,
              borderStyle: "solid",
              borderRadius: `${node.style.borderRadius ?? 10}px`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                {node.config.customSubtitle || "MODULE"}
              </span>
              {node.config.customBadge && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white"
                  style={{ backgroundColor: node.config.accentColor || "#d71920" }}
                >
                  {node.config.customBadge}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white truncate">
              {node.config.customTitle || node.name}
            </div>
          </div>
        );
      }

      case "shape": {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: node.config.shapeFill || "#1a1a22",
              borderColor: node.config.shapeStroke || "#ffffff",
              borderWidth: `${node.config.shapeStrokeWidth ?? 1}px`,
              borderStyle: "solid",
              borderRadius:
                node.config.shapeKind === "circle"
                  ? "9999px"
                  : `${node.style.borderRadius ?? 8}px`,
            }}
          />
        );
      }

      case "sticker": {
        return (
          <div className="w-full h-full rounded-lg bg-[#141418] border border-white/15 flex items-center justify-center text-white">
            <Sparkles size={Math.max(16, Math.round(Math.min(node.width, node.height) * 0.55))} />
          </div>
        );
      }

      default:
        return (
          <div className="w-full h-full border border-dashed border-white/20 flex items-center justify-center text-[10px] font-mono text-neutral-500">
            {node.name}
          </div>
        );
    }
  };

  const topLevelNodes = nodes
    .filter((n) => n.parentId === null && n.type !== "background" && n.visible)
    .filter((n) => !n.responsive?.hiddenOn?.includes(deviceMode))
    .sort((a, b) => a.zIndex - b.zIndex);

  // Compute composition bounding box for faithful static/public/preview rendering
  const compositionBounds = React.useMemo(() => {
    if (topLevelNodes.length === 0) {
      return { minX: 0, minY: 0, width: 720, height: 610 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of topLevelNodes) {
      const x = Number.isFinite(n.x) ? n.x : 0;
      const y = Number.isFinite(n.y) ? n.y : 0;
      const w = Math.max(20, Number.isFinite(n.width) ? n.width : 320);
      const h = Math.max(20, Number.isFinite(n.height) ? n.height : 120);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
    return {
      minX,
      minY,
      width: Math.max(240, maxX - minX),
      height: Math.max(120, maxY - minY),
    };
  }, [topLevelNodes]);

  const targetContainerWidth =
    deviceMode === "mobile"
      ? Math.min(390, measuredHostWidth)
      : deviceMode === "tablet"
        ? Math.min(768, measuredHostWidth)
        : measuredHostWidth;

  const horizontalPadding = deviceMode === "mobile" ? 24 : 48;
  const availableStageWidth = Math.max(240, targetContainerWidth - horizontalPadding);
  const publicScale = Math.min(1, availableStageWidth / compositionBounds.width);
  const scaledStageWidth = Math.round(compositionBounds.width * publicScale);
  const scaledStageHeight = Math.round(compositionBounds.height * publicScale);

  return (
    <div
      ref={isInteractive ? undefined : publicStageHostRef}
      id={isInteractive ? "canvas-artboard" : "profile-builder-canvas-root"}
      onClick={(e) => {
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement)?.dataset?.canvasBg === "true"
        ) {
          onSelectNode?.(null);
        }
      }}
      style={{
        width: isInteractive ? `${viewportWidth}px` : "100%",
        height: isInteractive ? `${viewportHeight}px` : undefined,
        minHeight: isInteractive ? undefined : "100vh",
        backgroundColor: bg.color || "#060608",
      }}
      className="relative overflow-hidden select-none"
      data-testid="builder-canvas-surface"
    >
      {/* Level A: Full-Canvas Background Layer */}
      {bg.visible && (
        <div
          data-canvas-bg="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: bg.opacity,
            filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
            background:
              bg.type === "gradient"
                ? `linear-gradient(${bg.gradientAngle}deg, ${bg.color}, ${bg.gradientTo})`
                : bg.color,
          }}
        >
          {bg.type === "image" && bg.imageUrl && (
            <img
              src={bg.imageUrl}
              alt="Canvas Background"
              draggable={false}
              className="w-full h-full"
              style={{
                objectFit: bg.size === "contain" ? "contain" : bg.size === "auto" ? "none" : "cover",
                objectPosition: bg.position,
              }}
            />
          )}
          {bg.type === "video" && bg.videoUrl && (
            <video
              src={bg.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ objectPosition: bg.position }}
            />
          )}
          {bg.overlayOpacity > 0 && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: bg.overlayColor || "#000000",
                opacity: bg.overlayOpacity,
              }}
            />
          )}
        </div>
      )}

      {/* Optional Grid Overlay (Interactive Editor Only) */}
      {isInteractive && document.preferences?.showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: `${canvas.gridSize || 16}px ${canvas.gridSize || 16}px`,
          }}
          data-testid="canvas-grid-overlay"
        />
      )}

      {/* Extra interactive canvas overlays (snap guides, drop indicators) */}
      {children}

      {/* Top-Level Embed Containers & Root Nodes */}
      {isInteractive ? (
        topLevelNodes.map((node) => {
          const inner = renderNodeInner(node, 1, new Set());
          if (renderInteractiveChrome) {
            return (
              <React.Fragment key={node.id}>
                {renderInteractiveChrome(node, inner)}
              </React.Fragment>
            );
          }
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                zIndex: node.zIndex,
                opacity: node.style.opacity ?? 1,
              }}
            >
              {inner}
            </div>
          );
        })
      ) : (
        <div
          className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center py-6 sm:py-10 px-3 sm:px-6"
          data-testid="public-profile-composition"
        >
          {topLevelNodes.length > 0 && (
            <div
              className="relative shrink-0"
              style={{
                width: `${scaledStageWidth}px`,
                height: `${scaledStageHeight}px`,
              }}
            >
              <div
                className="relative"
                style={{
                  width: `${compositionBounds.width}px`,
                  height: `${compositionBounds.height}px`,
                  transform: publicScale < 1 ? `scale(${publicScale})` : undefined,
                  transformOrigin: "top left",
                }}
              >
                {topLevelNodes.map((node) => (
                  <div
                    key={node.id}
                    data-testid={`public-node-${node.id}`}
                    style={{
                      position: "absolute",
                      left: `${node.x - compositionBounds.minX}px`,
                      top: `${node.y - compositionBounds.minY}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex,
                      opacity: node.style.opacity ?? 1,
                      transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
                    }}
                  >
                    {renderNodeInner(node, 1, new Set())}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
