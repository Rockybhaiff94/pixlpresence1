"use client";

import React from "react";
import {
  CanvasElement,
  CanvasEmbed,
  ProfileDesignConfig,
} from "@/types/studio";
import { PreviewData } from "./StudioProfilePreview";
import { DiscordRpcCard } from "./DiscordRpcCard";
import { PlatformIcon } from "@/components/links/PlatformIcons";
import { computeElementEffects } from "./effectsRenderer";
import {
  ExternalLink,
  Sparkles,
  User,
  Flame,
  BadgeCheck,
  Music,
  Plus,
  Play,
  Share2,
  Tv,
} from "lucide-react";

interface CanvasObjectRendererProps {
  embeds: CanvasEmbed[];
  elements: CanvasElement[];
  config: ProfileDesignConfig;
  data: PreviewData;
  isInteractive?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string) => void;
  onPointerDownElement?: (e: React.PointerEvent, id: string, isEmbed: boolean) => void;
  onOpenComponentLibrary?: (parentEmbedId: string) => void;
}

export function CanvasObjectRenderer({
  embeds,
  elements,
  config,
  data,
  isInteractive = false,
  selectedId,
  onSelectElement,
  onPointerDownElement,
  onOpenComponentLibrary,
}: CanvasObjectRendererProps) {
  const {
    username,
    displayName = username,
    bio = "",
    avatarUrl = "",
    buttons = [],
    links = [],
    discordPresence,
  } = data;

  // Render an individual canvas element
  const renderElement = (el: CanvasElement) => {
    if (el.isVisible === false) return null;

    const isSelected = isInteractive && selectedId === el.id;
    const transform = el.transform;
    const effects = computeElementEffects(el.style, config.identity?.titleColor || "#ffffff");

    const baseWrapperStyle: React.CSSProperties = {
      position: "relative",
      width: `${transform.width}px`,
      minHeight: `${transform.height}px`,
      transform: `rotate(${transform.rotation || 0}deg)`,
      zIndex: transform.zIndex || 2,
      cursor: isInteractive ? "pointer" : "default",
      transition: effects.transition || "all 0.15s ease",
      boxShadow: isSelected ? "0 0 14px rgba(56, 189, 248, 0.45)" : effects.boxShadow,
      background: effects.background,
      backdropFilter: effects.backdropFilter,
      animation: effects.animation,
      opacity: el.style?.opacity !== undefined ? el.style.opacity / 100 : undefined,
    };

    const handleClick = (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();
      onSelectElement?.(el.id);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (!isInteractive) return;
      onPointerDownElement?.(e, el.id, false);
    };

    const outlineClasses = isSelected
      ? "ring-2 ring-sky-400"
      : isInteractive
      ? "hover:ring-1 hover:ring-white/40"
      : "";

    switch (el.type) {
      case "avatar": {
        const shape = config.avatar.shape;
        let radius = "20px";
        if (shape === "circle") radius = "9999px";
        else if (shape === "square") radius = "0px";
        else if (shape === "squircle") radius = "32%";

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center p-1 rounded-2xl ${outlineClasses}`}
          >
            <div
              className="relative overflow-hidden group shadow-xl"
              style={{
                width: `${transform.width}px`,
                height: `${transform.height}px`,
                borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : radius,
                border: `${el.style?.borderWidth ?? config.avatar.borderWidth}px solid ${
                  el.style?.borderColor || config.avatar.borderColor || "#ffffff"
                }`,
                boxShadow: config.avatar.glow
                  ? `0 0 24px ${config.avatar.glowColor || "#ffffff"}50`
                  : undefined,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || username}
                  className="w-full h-full object-cover select-none"
                  style={{
                    objectFit: config.avatar.objectFit || "cover",
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#18181b] flex items-center justify-center text-white font-bold text-lg select-none">
                  {(displayName || username).slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "displayName":
      case "username": {
        const text = el.props?.text || (el.type === "displayName" ? displayName : username);
        const fontColor = el.style?.color || config.identity.titleColor || "#ffffff";
        const gradient = el.style?.gradientBorder;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-1 px-2 ${outlineClasses}`}
          >
            <h1
              className="font-bold tracking-tight select-none text-center truncate max-w-full"
              style={{
                fontSize: `${el.style?.fontSize || config.identity.titleSize || 26}px`,
                fontWeight: el.style?.fontWeight || config.identity.titleWeight || 700,
                fontFamily: el.style?.fontFamily || config.identity.titleFont || "inherit",
                color: gradient ? "transparent" : fontColor,
                backgroundImage: gradient ? gradient : undefined,
                WebkitBackgroundClip: gradient ? "text" : undefined,
                WebkitTextFillColor: gradient ? "transparent" : undefined,
                textShadow: el.style?.shadowBlur
                  ? `0 2px ${el.style.shadowBlur}px ${el.style.shadowColor || "rgba(0,0,0,0.8)"}`
                  : undefined,
              }}
            >
              {text}
            </h1>
          </div>
        );
      }

      case "title":
      case "heading": {
        const titleText = el.props?.text ?? "Heading Title";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-1 px-2 ${outlineClasses}`}
          >
            <h2
              className="font-bold tracking-tight select-none text-center truncate max-w-full"
              style={{
                fontSize: `${el.style?.fontSize || 20}px`,
                fontWeight: el.style?.fontWeight || 600,
                color: el.style?.color || "#ffffff",
                fontFamily: el.style?.fontFamily || "Space Grotesk",
              }}
            >
              {titleText}
            </h2>
          </div>
        );
      }

      case "subtitle":
      case "tagline": {
        const taglineText = el.props?.text ?? "Digital Identity // Nothing OS";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-0.5 px-2 ${outlineClasses}`}
          >
            <span
              className="text-xs uppercase tracking-wider select-none text-center truncate max-w-full"
              style={{
                color: el.style?.color || "#a3a3a3",
                fontSize: `${el.style?.fontSize || 12}px`,
                fontWeight: el.style?.fontWeight || 500,
                fontFamily: el.style?.fontFamily || "Inter",
              }}
            >
              {taglineText}
            </span>
          </div>
        );
      }

      case "bio":
      case "description": {
        const bioText = el.props?.text ?? (el.type === "bio" ? bio : "Description text...");
        if (!bioText && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`p-2.5 rounded-xl transition-all ${outlineClasses}`}
          >
            <p
              className="text-xs leading-relaxed select-none text-center whitespace-pre-line"
              style={{
                color: el.style?.color || config.identity.bioColor || "#a3a3a3",
                fontSize: `${el.style?.fontSize || config.identity.bioSize || 14}px`,
                fontFamily: el.style?.fontFamily || config.identity.bioFont || "Inter",
              }}
            >
              {bioText || (isInteractive ? "Add your biography here..." : "")}
            </p>
          </div>
        );
      }

      case "verificationBadge": {
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center ${outlineClasses}`}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[10px] font-bold font-mono">
              <BadgeCheck size={12} className="shrink-0" />
              VERIFIED
            </span>
          </div>
        );
      }

      case "rpc": {
        if (!config.discordRpc?.showProfileRpc && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`w-full ${outlineClasses}`}
          >
            <DiscordRpcCard
              config={config.discordRpc}
              data={discordPresence}
              isInteractiveEditor={isInteractive}
            />
          </div>
        );
      }

      case "button": {
        const buttonList = buttons.length > 0 ? buttons : [
          { id: "b1", title: "WEBSITE", subtitle: "Visit Official Domain", url: "https://pixel.gg" },
        ];

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`w-full space-y-2.5 p-1 ${outlineClasses}`}
          >
            {buttonList.map((btn) => (
              <a
                key={btn.id}
                href={isInteractive ? "#" : btn.url}
                target={isInteractive ? undefined : "_blank"}
                rel="noreferrer"
                onClick={(e) => {
                  if (isInteractive) e.preventDefault();
                }}
                className="w-full p-3 rounded-xl bg-white text-black font-bold flex items-center justify-between hover:bg-neutral-200 transition-all shadow-md group"
                style={{
                  borderRadius: `${config.buttons?.borderRadius || 14}px`,
                }}
              >
                <div className="flex flex-col text-left truncate">
                  <span className="text-xs uppercase tracking-wider">{btn.title}</span>
                  {btn.subtitle && (
                    <span className="text-[10px] text-neutral-600 font-normal">{btn.subtitle}</span>
                  )}
                </div>
                <ExternalLink size={14} className="text-neutral-500 group-hover:text-black transition-colors shrink-0" />
              </a>
            ))}
          </div>
        );
      }

      case "socials": {
        const socialLinks = links.filter((l) => l.visibility);
        if (socialLinks.length === 0 && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`w-full flex items-center justify-center gap-3 py-2 flex-wrap ${outlineClasses}`}
          >
            {(socialLinks.length > 0
              ? socialLinks
              : [{ id: "l1", label: "Discord", url: "https://discord.gg" }]
            ).map((link) => {
              const iconSrc = el.style?.customIconUrl;
              const iconColor = effects.resolvedIconColor;
              const iconVariant = el.style?.iconVariant || "default";

              let variantClasses = "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white";
              if (iconVariant === "minimal") {
                variantClasses = "bg-transparent border-0 text-neutral-300 hover:text-white";
              } else if (iconVariant === "outline") {
                variantClasses = "bg-transparent border border-neutral-700 text-neutral-200 hover:text-white";
              } else if (iconVariant === "filled") {
                variantClasses = "bg-white text-black font-bold";
              }

              return (
                <a
                  key={link.id}
                  href={isInteractive ? "#" : link.url}
                  target={isInteractive ? undefined : "_blank"}
                  rel="noreferrer"
                  onClick={(e) => {
                    if (isInteractive) e.preventDefault();
                  }}
                  className={`p-2.5 rounded-xl transition-all shadow flex items-center justify-center ${variantClasses}`}
                  style={{
                    boxShadow: effects.boxShadow,
                    borderColor: el.style?.borderColor,
                    borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
                  }}
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt={link.label} className="w-4 h-4 object-contain" />
                  ) : (
                    <PlatformIcon
                      id={link.label.toLowerCase()}
                      color={iconColor}
                      className="w-4 h-4"
                    />
                  )}
                </a>
              );
            })}
          </div>
        );
      }

      case "music": {
        const trackTitle = el.props?.title || "Track Title - Artist";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`w-full p-3 rounded-xl bg-[#121216] border border-neutral-800 flex items-center justify-between gap-3 ${outlineClasses}`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <Music size={14} />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{trackTitle}</p>
                <p className="text-[10px] text-neutral-400">Audio Player // Studio</p>
              </div>
            </div>
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow hover:scale-105 transition-transform shrink-0"
            >
              <Play size={11} className="fill-current ml-0.5" />
            </button>
          </div>
        );
      }

      case "image":
      case "thumbnail": {
        const src = el.props?.src || "/placeholder.png";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`overflow-hidden rounded-xl shadow-lg ${outlineClasses}`}
          >
            <img
              src={src}
              alt={el.name}
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
              }}
            />
          </div>
        );
      }

      case "text": {
        const content = el.props?.content || "Custom text block...";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`p-2 rounded-lg ${outlineClasses}`}
          >
            <p
              className="select-none leading-relaxed"
              style={{
                color: el.style?.color || "#ffffff",
                fontSize: `${el.style?.fontSize || 14}px`,
                fontWeight: el.style?.fontWeight || 400,
                fontFamily: el.style?.fontFamily || "Inter",
                textAlign: el.style?.textAlign || "left",
              }}
            >
              {content}
            </p>
          </div>
        );
      }

      case "divider": {
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-2 ${outlineClasses}`}
          >
            <div
              className="w-full h-[1px] bg-neutral-800"
              style={{
                backgroundColor: el.style?.borderColor || "#26262b",
                height: el.style?.borderWidth ? `${el.style.borderWidth}px` : "1px",
              }}
            />
          </div>
        );
      }

      case "bottomIcon": {
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-2 ${outlineClasses}`}
          >
            <div className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white text-[10px] font-bold shadow">
              {(displayName || username).slice(0, 1).toUpperCase()}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Free elements not assigned to any embed
  const freeElements = elements.filter((el) => !el.parentEmbedId);

  return (
    <div className="relative w-full flex flex-col items-center justify-center gap-6 z-10">
      {/* Multi-Embed Rendering */}
      {embeds.map((embed) => {
        if (embed.isVisible === false) return null;
        const isEmbedSelected = isInteractive && selectedId === embed.id;
        const embedChildren = elements.filter((el) => el.parentEmbedId === embed.id);
        const embedEffects = computeElementEffects(embed.style, config.identity?.titleColor || "#ffffff");

        return (
          <div
            key={embed.id}
            onClick={(e) => {
              if (!isInteractive) return;
              e.stopPropagation();
              onSelectElement?.(embed.id);
            }}
            onPointerDown={(e) => {
              if (!isInteractive) return;
              onPointerDownElement?.(e, embed.id, true);
            }}
            style={{
              width: `${embed.transform.width}px`,
              minHeight: `${embed.transform.height}px`,
              transform: `rotate(${embed.transform.rotation || 0}deg)`,
              backgroundColor: embedEffects.background || embed.style.backgroundColor || "rgba(10, 10, 14, 0.85)",
              borderColor: embed.style.borderColor || "#26262b",
              borderWidth: `${embed.style.borderWidth ?? 1}px`,
              borderRadius: `${embed.style.borderRadius ?? 24}px`,
              padding: `${embed.style.padding ?? 28}px`,
              boxShadow: isEmbedSelected
                ? "0 0 20px rgba(251, 191, 36, 0.45)"
                : embedEffects.boxShadow ||
                  (embed.style.shadowBlur
                    ? `0 12px ${embed.style.shadowBlur}px ${embed.style.shadowColor || "rgba(0,0,0,0.5)"}`
                    : undefined),
              backdropFilter: embed.style.backdropBlur ? `blur(${embed.style.backdropBlur}px)` : undefined,
              animation: embedEffects.animation,
              zIndex: embed.transform.zIndex || 1,
            }}
            className={`relative flex flex-col items-center justify-center gap-4 transition-all ${
              isEmbedSelected
                ? "ring-2 ring-amber-400"
                : isInteractive
                ? "hover:ring-1 hover:ring-white/30"
                : ""
            }`}
          >
            {/* Embed Title Header if specified */}
            {embed.title && (
              <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono pb-1 border-b border-neutral-800/60">
                <span className="font-bold uppercase tracking-wider text-neutral-400">{embed.title}</span>
                <span className="text-neutral-600">// EMBED</span>
              </div>
            )}

            {/* Empty Embed Canvas State with "+ Add Component" */}
            {embedChildren.length === 0 && isInteractive && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComponentLibrary?.(embed.id);
                }}
                className="w-full py-10 px-4 rounded-xl border-2 border-dashed border-neutral-700/60 hover:border-sky-400/80 bg-neutral-900/30 hover:bg-sky-950/20 text-neutral-400 hover:text-sky-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-neutral-800 group-hover:bg-sky-500/20 border border-neutral-700 group-hover:border-sky-400/60 flex items-center justify-center text-white group-hover:text-sky-400 shadow transition-all">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-bold font-mono tracking-wide">
                  EMPTY EMBED CANVAS
                </span>
                <span className="text-[10px] text-neutral-500 group-hover:text-neutral-400 text-center max-w-[240px]">
                  Click to open the Component Library and add elements to this embed
                </span>
              </div>
            )}

            {/* Child elements inside this embed */}
            {embedChildren.map(renderElement)}
          </div>
        );
      })}

      {/* Freeform Canvas-Level Elements */}
      {freeElements.map(renderElement)}
    </div>
  );
}
