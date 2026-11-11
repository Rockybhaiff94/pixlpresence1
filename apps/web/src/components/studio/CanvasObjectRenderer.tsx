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
import { ExternalLink, Sparkles, User, Flame } from "lucide-react";

interface CanvasObjectRendererProps {
  embeds: CanvasEmbed[];
  elements: CanvasElement[];
  config: ProfileDesignConfig;
  data: PreviewData;
  isInteractive?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string) => void;
  onPointerDownElement?: (e: React.PointerEvent, id: string, isEmbed: boolean) => void;
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

    const baseWrapperStyle: React.CSSProperties = {
      position: "relative",
      width: `${transform.width}px`,
      minHeight: `${transform.height}px`,
      transform: `rotate(${transform.rotation || 0}deg)`,
      zIndex: transform.zIndex || 2,
      cursor: isInteractive ? "pointer" : "default",
      transition: "outline 0.15s ease",
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
            className={`flex items-center justify-center p-1 rounded-2xl ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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

      case "username": {
        const text = el.props?.text || displayName || username;
        const fontColor = el.style?.color || config.identity.titleColor || "#ffffff";
        const gradient = el.style?.gradientBorder;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-1 px-2 ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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

      case "tagline": {
        // Tagline is now a completely customizable text element (not hardcoded)
        const taglineText = el.props?.text ?? "Digital Identity // Nothing OS";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`flex items-center justify-center py-0.5 px-2 ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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

      case "bio": {
        const bioText = el.props?.text ?? bio;
        if (!bioText && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`p-2.5 rounded-xl transition-all ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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

      case "rpc": {
        if (!config.discordRpc?.showProfileRpc && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`w-full ${
              isSelected ? "ring-2 ring-sky-400 rounded-2xl" : isInteractive ? "hover:ring-1 hover:ring-white/40 rounded-2xl" : ""
            }`}
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
            className={`w-full space-y-2.5 p-1 ${
              isSelected ? "ring-2 ring-sky-400 rounded-2xl" : isInteractive ? "hover:ring-1 hover:ring-white/40 rounded-2xl" : ""
            }`}
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
            className={`w-full flex items-center justify-center gap-3 py-2 flex-wrap ${
              isSelected ? "ring-2 ring-sky-400 rounded-xl" : isInteractive ? "hover:ring-1 hover:ring-white/40 rounded-xl" : ""
            }`}
          >
            {(socialLinks.length > 0
              ? socialLinks
              : [{ id: "l1", label: "Discord", url: "https://discord.gg" }]
            ).map((link) => (
              <a
                key={link.id}
                href={isInteractive ? "#" : link.url}
                target={isInteractive ? undefined : "_blank"}
                rel="noreferrer"
                onClick={(e) => {
                  if (isInteractive) e.preventDefault();
                }}
                className="w-9 h-9 rounded-full bg-[#141416] border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 transition-all shadow-sm"
              >
                <PlatformIcon id={(link as any).icon || link.label} className="w-4 h-4 shrink-0" />
              </a>
            ))}
          </div>
        );
      }

      case "image": {
        const src = el.props?.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`overflow-hidden rounded-xl shadow-lg ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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
            className={`p-2 rounded-lg ${
              isSelected ? "ring-2 ring-sky-400" : isInteractive ? "hover:ring-1 hover:ring-white/40" : ""
            }`}
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
            className={`flex items-center justify-center py-2 ${
              isSelected ? "ring-2 ring-sky-400 rounded" : isInteractive ? "hover:ring-1 hover:ring-white/40 rounded" : ""
            }`}
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
            className={`flex items-center justify-center py-2 ${
              isSelected ? "ring-2 ring-sky-400 rounded-full" : isInteractive ? "hover:ring-1 hover:ring-white/40 rounded-full" : ""
            }`}
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
              backgroundColor: embed.style.backgroundColor || "rgba(10, 10, 14, 0.85)",
              borderColor: embed.style.borderColor || "#26262b",
              borderWidth: `${embed.style.borderWidth ?? 1}px`,
              borderRadius: `${embed.style.borderRadius ?? 24}px`,
              padding: `${embed.style.padding ?? 28}px`,
              boxShadow: embed.style.shadowBlur
                ? `0 12px ${embed.style.shadowBlur}px ${embed.style.shadowColor || "rgba(0,0,0,0.5)"}`
                : undefined,
              backdropFilter: embed.style.backdropBlur ? `blur(${embed.style.backdropBlur}px)` : undefined,
              zIndex: embed.transform.zIndex || 1,
            }}
            className={`relative flex flex-col items-center justify-center gap-4 transition-all ${
              isEmbedSelected
                ? "ring-2 ring-sky-400"
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

