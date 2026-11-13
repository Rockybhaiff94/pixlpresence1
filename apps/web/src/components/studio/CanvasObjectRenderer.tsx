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
import { RichTextRenderer } from "./richTextRenderer";
import {
  sanitizeSocialUrl,
  resolvePlatformDef,
  extractSocialHandle,
} from "./socialsEngine";
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
  isPremium?: boolean;
  selectedId?: string | null;
  inlineEditingId?: string | null;
  onSelectElement?: (id: string) => void;
  onSetInlineEditingId?: (id: string | null) => void;
  onUpdateElementProps?: (id: string, props: Record<string, any>) => void;
  onPointerDownElement?: (e: React.PointerEvent, id: string, isEmbed: boolean) => void;
  onOpenComponentLibrary?: (parentEmbedId: string) => void;
}

export function CanvasObjectRenderer({
  embeds,
  elements,
  config,
  data,
  isInteractive = false,
  isPremium = false,
  selectedId,
  inlineEditingId,
  onSelectElement,
  onSetInlineEditingId,
  onUpdateElementProps,
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

    // Helper for all text-based elements supporting typography, Markdown, and direct inline editing
    const renderEditableTextNode = (
      defaultText: string,
      isMultiline: boolean = false,
      extraWrapperClass: string = "py-1 px-2"
    ) => {
      const rawText = el.props?.text ?? el.props?.content ?? defaultText;
      const isEditing = isInteractive && inlineEditingId === el.id;
      const gradient = el.style?.gradientBorder;
      const hasCustomTypography = Boolean(el.style?.hasCustomTypographyOverride);

      // Dynamically resolve typography inheritance when element doesn't have an explicit custom override
      let resolvedFontFamily = el.style?.fontFamily || "Inter";
      let resolvedFontSize = el.style?.fontSize || 14;
      let resolvedFontWeight = el.style?.fontWeight || 400;
      let resolvedColor = el.style?.color || "#ffffff";
      const resolvedLetterSpacing =
        el.style?.letterSpacing !== undefined
          ? `${el.style.letterSpacing}px`
          : config.typography?.letterSpacing !== undefined
            ? `${config.typography.letterSpacing}px`
            : undefined;
      const resolvedLineHeight = el.style?.lineHeight || config.typography?.lineHeight || 1.4;

      if (!hasCustomTypography) {
        if (el.type === "displayName" || el.type === "username" || el.style?.styleGroupId === "profileName") {
          resolvedFontFamily = config.identity?.titleFont || config.typography?.headingFont || el.style?.fontFamily || "Space Grotesk";
          resolvedFontSize = config.identity?.titleSize || el.style?.fontSize || 26;
          resolvedFontWeight = config.identity?.titleWeight || el.style?.fontWeight || 700;
          resolvedColor = config.identity?.titleColor || el.style?.color || "#ffffff";
        } else if (el.type === "title" || el.type === "heading") {
          resolvedFontFamily = config.typography?.headingFont || config.identity?.titleFont || el.style?.fontFamily || "Space Grotesk";
          resolvedColor = config.identity?.titleColor || el.style?.color || "#ffffff";
        } else if (el.type === "bio" || el.type === "description" || el.style?.styleGroupId === "body") {
          resolvedFontFamily = config.identity?.bioFont || config.typography?.bodyFont || el.style?.fontFamily || "Inter";
          resolvedFontSize = config.identity?.bioSize || el.style?.fontSize || 14;
          resolvedColor = config.identity?.bioColor || el.style?.color || "#a3a3a3";
        } else if (el.type === "subtitle" || el.type === "tagline" || el.style?.styleGroupId === "subheading") {
          resolvedFontFamily = config.typography?.bodyFont || el.style?.fontFamily || "Inter";
        }
      }

      const typographyStyle: React.CSSProperties = {
        fontFamily: resolvedFontFamily,
        fontSize: `${resolvedFontSize}px`,
        fontWeight: resolvedFontWeight,
        color: gradient ? "transparent" : resolvedColor,
        letterSpacing: resolvedLetterSpacing,
        lineHeight: resolvedLineHeight,
        textAlign: el.style?.textAlign || "left",
        textTransform: el.style?.textTransform || "none",
        textDecoration: el.style?.textDecoration || "none",
        backgroundImage: gradient ? gradient : undefined,
        WebkitBackgroundClip: gradient ? "text" : undefined,
        WebkitTextFillColor: gradient ? "transparent" : undefined,
        textShadow: el.style?.shadowBlur
          ? `0 2px ${el.style.shadowBlur}px ${el.style.shadowColor || "rgba(0,0,0,0.8)"}`
          : undefined,
        wordSpacing: el.style?.wordSpacing !== undefined ? `${el.style.wordSpacing}px` : undefined,
      };

      const handleDoubleClick = (e: React.MouseEvent) => {
        if (isInteractive && onSetInlineEditingId) {
          e.stopPropagation();
          onSetInlineEditingId(el.id);
        }
      };

      return (
        <div
          key={el.id}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          style={baseWrapperStyle}
          className={`flex items-center ${extraWrapperClass} ${outlineClasses}`}
        >
          {isEditing ? (
            isMultiline ? (
              <textarea
                autoFocus
                value={rawText}
                onChange={(e) => {
                  onUpdateElementProps?.(el.id, {
                    ...(el.props?.text !== undefined ? { text: e.target.value } : { content: e.target.value }),
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onSetInlineEditingId?.(null);
                  }
                }}
                onBlur={() => onSetInlineEditingId?.(null)}
                className="w-full bg-black/80 border border-sky-400 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 text-white"
                style={typographyStyle}
                rows={Math.max(2, rawText.split("\n").length)}
              />
            ) : (
              <input
                type="text"
                autoFocus
                value={rawText}
                onChange={(e) => {
                  onUpdateElementProps?.(el.id, {
                    ...(el.props?.text !== undefined ? { text: e.target.value } : { content: e.target.value }),
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    onSetInlineEditingId?.(null);
                  }
                }}
                onBlur={() => onSetInlineEditingId?.(null)}
                className="w-full bg-black/80 border border-sky-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400 text-white"
                style={typographyStyle}
              />
            )
          ) : (
            <div
              style={typographyStyle}
              className={`w-full select-none ${el.style?.textOverflow === "truncate"
                  ? "truncate"
                  : el.style?.textOverflow === "hidden"
                    ? "overflow-hidden"
                    : "break-words"
                }`}
            >
              <RichTextRenderer
                content={rawText}
                themeAccentColor={config.identity?.titleColor || "#ffffff"}
                allowBlockFormatting={isMultiline}
              />
            </div>
          )}
        </div>
      );
    };

    switch (el.type) {
      case "avatar": {
        const shape = config.avatar.shape;
        let radius = "20px";
        if (shape === "circle") radius = "9999px";
        else if (shape === "square") radius = "0px";
        else if (shape === "squircle") radius = "32%";

        const avatarSize = (el.id === "avatar_1" || el.type === "avatar")
          ? (config.avatar?.size || transform.width || 96)
          : (transform.width || 96);

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={{ ...baseWrapperStyle, width: `${avatarSize}px`, minHeight: `${avatarSize}px` }}
            className={`flex items-center justify-center p-1 rounded-2xl ${outlineClasses}`}
          >
            <div
              className="relative overflow-hidden group shadow-xl"
              style={{
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : radius,
                border: `${el.style?.borderWidth ?? config.avatar.borderWidth}px solid ${el.style?.borderColor || config.avatar.borderColor || "#ffffff"
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

      // Profile Text Components
      case "displayName":
      case "username":
        return renderEditableTextNode(
          (el.type === "displayName" ? displayName : username) || "User",
          false,
          "py-1 px-2 justify-center"
        );

      case "title":
      case "heading":
        return renderEditableTextNode("Heading Title", false, "py-1 px-2 justify-center");

      case "subtitle":
      case "tagline":
        return renderEditableTextNode("Digital Identity // Nothing OS", false, "py-0.5 px-2 justify-center");

      case "bio":
      case "description":
      case "text":
        return renderEditableTextNode(
          el.type === "bio" ? bio || "Biography text..." : "Custom text content...",
          true,
          "p-2.5 rounded-xl"
        );

      case "authorText":
      case "footerText":
      case "timestamp":
        return renderEditableTextNode(
          el.type === "footerText" ? "© Pixel.gg Studio" : el.type === "timestamp" ? "Updated just now" : "Author Name",
          false,
          "py-1 px-1.5"
        );

      case "fieldName":
      case "fieldValue":
      case "customLabels":
        return renderEditableTextNode(
          el.type === "fieldName" ? "FIELD LABEL" : "Field Value Information",
          false,
          "py-0.5 px-1"
        );

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
              isPremium={isPremium || data?.isPremium}
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
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 10}px` }}
            className={`w-full flex flex-col p-1 ${outlineClasses}`}
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
        let socialLinks = links.filter((l) => l.visibility);
        if (Array.isArray(el.props?.selectedLinkIds) && el.props.selectedLinkIds.length > 0) {
          socialLinks = socialLinks.filter((l) => el.props?.selectedLinkIds.includes(l.id));
        }

        if (socialLinks.length === 0 && !isInteractive) return null;

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 12}px` }}
            className={`w-full flex items-center justify-center py-2 flex-wrap ${outlineClasses}`}
          >
            {(socialLinks.length > 0
              ? socialLinks
              : [{ id: "l1", label: "Discord", url: "https://discord.gg", icon: "discord", color: "#5865F2", visibility: true }]
            ).map((link) => {
              const platform = resolvePlatformDef((link as any).icon, link.label);
              const destinationUrl = sanitizeSocialUrl(link.url);
              const iconSrc = el.style?.customIconUrl;
              const iconColor = effects.resolvedIconColor || (link as any).color || platform.brandColor;
              const iconVariant = el.style?.iconVariant || "default";

              let variantClasses = "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white";
              if (iconVariant === "minimal") {
                variantClasses = "bg-transparent border-0 text-neutral-300 hover:text-white";
              } else if (iconVariant === "outline") {
                variantClasses = "bg-transparent border border-neutral-700 text-neutral-200 hover:text-white";
              } else if (iconVariant === "filled") {
                variantClasses = "bg-white text-black font-bold";
              } else if (iconVariant === "glass") {
                variantClasses = "bg-white/5 backdrop-blur-md border border-white/10 text-white";
              } else if (iconVariant === "neon") {
                variantClasses = "bg-neutral-950 border border-current text-white shadow-lg";
              }

              return (
                <a
                  key={link.id}
                  href={isInteractive ? "#" : destinationUrl}
                  target={isInteractive ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (isInteractive) e.preventDefault();
                  }}
                  title={link.label || platform.name}
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
                      id={platform.id}
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

      case "socialIcon": {
        const linkId = el.props?.linkId;
        const boundLink = linkId ? links.find((l) => l.id === linkId) : null;
        const isDisconnected = Boolean(linkId && !boundLink);

        // On published profile, omit if strictly bound to deleted/hidden link
        if (!isInteractive && linkId && (!boundLink || boundLink.visibility === false)) {
          return null;
        }

        const platformId = boundLink?.icon || el.props?.platform || "globe";
        const platform = resolvePlatformDef(platformId, boundLink?.label || el.props?.label);
        const destinationUrl = sanitizeSocialUrl(boundLink?.url || el.props?.url || "#");
        const iconSrc = el.style?.customIconUrl;
        const iconColor = effects.resolvedIconColor || boundLink?.color || platform.brandColor;
        const iconVariant = el.style?.iconVariant || "default";

        let variantClasses = "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white";
        if (iconVariant === "minimal") {
          variantClasses = "bg-transparent border-0 text-neutral-300 hover:text-white";
        } else if (iconVariant === "outline") {
          variantClasses = "bg-transparent border border-neutral-700 text-neutral-200 hover:text-white";
        } else if (iconVariant === "filled") {
          variantClasses = "bg-white text-black font-bold";
        } else if (iconVariant === "glass") {
          variantClasses = "bg-white/5 backdrop-blur-md border border-white/10 text-white";
        } else if (iconVariant === "neon") {
          variantClasses = "bg-neutral-950 border border-current text-white shadow-lg";
        }

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`inline-flex items-center justify-center ${outlineClasses}`}
          >
            <a
              href={isInteractive ? "#" : destinationUrl}
              target={isInteractive ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isInteractive) e.preventDefault();
              }}
              title={isInteractive ? `${platform.name}: ${el.props?.handle || destinationUrl}` : platform.name}
              className={`w-full h-full transition-all shadow flex items-center justify-center relative group ${variantClasses}`}
              style={{
                boxShadow: effects.boxShadow,
                borderColor: el.style?.borderColor,
                borderRadius: el.style?.borderRadius !== undefined ? `${el.style.borderRadius}px` : "12px",
                color: iconColor,
              }}
            >
              {iconSrc ? (
                <img src={iconSrc} alt={platform.name} className="w-1/2 h-1/2 object-contain" />
              ) : (
                <PlatformIcon
                  id={platform.id}
                  color={iconColor}
                  className="w-1/2 h-1/2 max-w-[24px] max-h-[24px]"
                />
              )}

              {/* In Editor: Disconnected Warning Indicator */}
              {isInteractive && isDisconnected && (
                <div
                  title="Linked account disconnected or deleted"
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[8px] font-bold text-black"
                >
                  !
                </div>
              )}
            </a>
          </div>
        );
      }

      case "linkedAccount": {
        const linkId = el.props?.linkId;
        const boundLink = linkId ? links.find((l) => l.id === linkId) : null;
        const isDisconnected = Boolean(linkId && !boundLink);

        if (!isInteractive && linkId && (!boundLink || boundLink.visibility === false)) {
          return null;
        }

        const platformId = boundLink?.icon || el.props?.platform || "globe";
        const platform = resolvePlatformDef(platformId, boundLink?.label || el.props?.label);
        const destinationUrl = sanitizeSocialUrl(boundLink?.url || el.props?.url || "#");
        const handle =
          el.props?.handle ||
          (boundLink ? extractSocialHandle(boundLink.url, platform.id, boundLink.label) : "@account");
        const iconColor = effects.resolvedIconColor || boundLink?.color || platform.brandColor;
        const iconVariant = el.style?.iconVariant || "default";

        let variantClasses = "bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white";
        if (iconVariant === "minimal") {
          variantClasses = "bg-transparent border-0 text-neutral-300 hover:text-white";
        } else if (iconVariant === "outline") {
          variantClasses = "bg-transparent border border-neutral-700 text-neutral-200 hover:text-white";
        } else if (iconVariant === "filled") {
          variantClasses = "bg-white text-black font-bold";
        } else if (iconVariant === "glass") {
          variantClasses = "bg-white/5 backdrop-blur-md border border-white/10 text-white";
        }

        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            style={baseWrapperStyle}
            className={`inline-flex items-center justify-center ${outlineClasses}`}
          >
            <a
              href={isInteractive ? "#" : destinationUrl}
              target={isInteractive ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isInteractive) e.preventDefault();
              }}
              className={`w-full h-full px-3 py-1.5 transition-all shadow flex items-center justify-between gap-2 relative ${variantClasses}`}
              style={{
                boxShadow: effects.boxShadow,
                borderColor: el.style?.borderColor,
                borderRadius: el.style?.borderRadius !== undefined ? `${el.style.borderRadius}px` : "12px",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <PlatformIcon
                  id={platform.id}
                  color={iconColor}
                  className="w-4 h-4 shrink-0"
                />
                <span className="text-xs font-bold text-white truncate">
                  {el.props?.label || platform.name}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[120px]">
                {handle}
              </span>

              {isInteractive && isDisconnected && (
                <div
                  title="Linked account disconnected or deleted"
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[8px] font-bold text-black"
                >
                  !
                </div>
              )}
            </a>
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

  const isIdentityElement = (type: string) =>
    [
      "avatar",
      "displayName",
      "username",
      "title",
      "heading",
      "subtitle",
      "tagline",
      "bio",
      "description",
      "verificationBadge",
      "authorText",
    ].includes(type);

  const renderEmbedContent = (embed: CanvasEmbed, embedElements: CanvasElement[]) => {
    // Non-primary embeds render elements with embed's natural vertical flow
    if (embed.id !== "embed_primary") {
      return (
        <div className="flex flex-col w-full space-y-4">
          {embedElements.map(renderElement)}
        </div>
      );
    }

    const preset = config.layout?.preset || "centered";
    const alignment =
      config.layout?.alignment ||
      (preset === "left" ? "left" : preset === "right" ? "right" : "center");
    const gap = config.layout?.gap ?? 22;

    // 1. Minimal Card Split: Balanced 2-column layout (Left = Identity, Right = Activity & Content)
    if (preset === "split") {
      const identityElements = embedElements.filter((el) => isIdentityElement(el.type));
      const contentElements = embedElements.filter((el) => !isIdentityElement(el.type));

      const colAlignClass =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
          ? "items-end text-right"
          : "items-center text-center";

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          <div className={`flex flex-col space-y-3.5 w-full ${colAlignClass}`}>
            {identityElements.map(renderElement)}
          </div>
          <div className="flex flex-col space-y-4 w-full">
            {contentElements.map(renderElement)}
          </div>
        </div>
      );
    }

    // 2. Minimal Card Wide: Horizontal header banner with wide distribution
    if (preset === "wide") {
      const avatarEl = embedElements.find((el) => el.type === "avatar");
      const nameEl = embedElements.find((el) => el.type === "displayName" || el.type === "username");
      const taglineEl = embedElements.find((el) => el.type === "subtitle" || el.type === "tagline");
      const bioEl = embedElements.find((el) => el.type === "bio" || el.type === "description");
      const rpcEl = embedElements.find((el) => el.type === "rpc");
      const buttonEls = embedElements.filter((el) => el.type === "button");
      const socialEls = embedElements.filter(
        (el) => el.type === "socials" || el.type === "socialIcon" || el.type === "linkedAccount"
      );
      const handledIds = new Set(
        [
          avatarEl?.id,
          nameEl?.id,
          taglineEl?.id,
          bioEl?.id,
          rpcEl?.id,
          ...buttonEls.map((b) => b.id),
          ...socialEls.map((s) => s.id),
        ].filter(Boolean)
      );
      const otherEls = embedElements.filter((el) => !handledIds.has(el.id));

      const headerAlign =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
          ? "items-end text-right"
          : "items-center text-center sm:items-start sm:text-left";

      return (
        <div className="space-y-5 w-full">
          {/* Top Row: Horizontal Avatar + Identity header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full pb-3 border-b border-white/10">
            {avatarEl && <div className="shrink-0">{renderElement(avatarEl)}</div>}
            <div className={`flex-1 flex flex-col space-y-1.5 min-w-0 ${headerAlign}`}>
              {nameEl && renderElement(nameEl)}
              {taglineEl && renderElement(taglineEl)}
              {bioEl && renderElement(bioEl)}
            </div>
          </div>

          {/* Middle: Discord Rich Presence */}
          {rpcEl && <div className="w-full">{renderElement(rpcEl)}</div>}

          {/* Bottom Grid: Action buttons in 2 columns */}
          {buttonEls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {buttonEls.map(renderElement)}
            </div>
          )}

          {/* Bottom: Social links row */}
          {socialEls.map(renderElement)}

          {/* Any remaining custom elements */}
          {otherEls.map(renderElement)}
        </div>
      );
    }

    // 3. Minimal Card Compact: Dense, space-efficient Nothing OS HUD layout
    if (preset === "compact") {
      const avatarEl = embedElements.find((el) => el.type === "avatar");
      const nameEl = embedElements.find((el) => el.type === "displayName" || el.type === "username");
      const taglineEl = embedElements.find((el) => el.type === "subtitle" || el.type === "tagline");
      const bioEl = embedElements.find((el) => el.type === "bio" || el.type === "description");
      const handledIds = new Set([avatarEl?.id, nameEl?.id, taglineEl?.id, bioEl?.id].filter(Boolean));
      const remainingEls = embedElements.filter((el) => !handledIds.has(el.id));

      return (
        <div className="space-y-3 w-full">
          {/* Ultra-compact inline header */}
          <div className="flex items-center gap-3.5 w-full pb-2 border-b border-white/10">
            {avatarEl && (
              <div className="shrink-0 scale-85 origin-left">
                {renderElement(avatarEl)}
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-0.5">
              {nameEl && renderElement(nameEl)}
              {taglineEl && renderElement(taglineEl)}
            </div>
          </div>

          {bioEl && <div className="w-full">{renderElement(bioEl)}</div>}

          <div className="flex flex-col space-y-2.5 w-full">
            {remainingEls.map(renderElement)}
          </div>
        </div>
      );
    }

    // 4. Standard Linear (Center, Left, Right, Card, Minimal)
    const alignClass =
      alignment === "left"
        ? "items-start text-left"
        : alignment === "right"
        ? "items-end text-right"
        : "items-center text-center";

    return (
      <div
        className={`flex flex-col w-full ${alignClass}`}
        style={{ gap: `${gap}px` }}
      >
        {embedElements.map(renderElement)}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* 1. Embed Containers */}
      {embeds.map((embed) => {
        if (embed.isVisible === false) return null;

        const isSelectedEmbed = isInteractive && selectedId === embed.id;
        const embedElements = elements.filter((el) => el.parentEmbedId === embed.id);
        const effects = computeElementEffects(embed.style, config.identity?.titleColor || "#ffffff");

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
              position: "relative",
              width: `${embed.id === "embed_primary" ? (config.layout?.maxWidth || embed.transform.width || 580) : embed.transform.width}px`,
              minHeight: `${embed.transform.height}px`,
              margin: "0 auto 32px auto",
              transform: `rotate(${embed.transform.rotation || 0}deg)`,
              backgroundColor: effects.background || embed.style.backgroundColor || "rgba(10, 10, 14, 0.85)",
              border: `${embed.style.borderWidth ?? 1}px solid ${embed.style.borderColor || "#26262b"}`,
              borderRadius: `${embed.id === "embed_primary" ? (config.discordRpc?.borderRadius ?? embed.style.borderRadius ?? 24) : (embed.style.borderRadius ?? 24)}px`,
              padding: `${embed.id === "embed_primary" ? (config.layout?.padding ?? embed.style.padding ?? 24) : (embed.style.padding ?? 24)}px`,
              boxShadow: isSelectedEmbed
                ? "0 0 20px rgba(251, 191, 36, 0.5)"
                : effects.boxShadow,
              backdropFilter: effects.backdropFilter || (embed.style.backdropBlur ? `blur(${embed.style.backdropBlur}px)` : undefined),
              animation: effects.animation,
              transition: effects.transition || "all 0.15s ease",
              cursor: isInteractive ? "pointer" : "default",
            }}
            className={`space-y-4 ${isSelectedEmbed
                ? "ring-2 ring-amber-400"
                : isInteractive
                  ? "hover:ring-1 hover:ring-white/30"
                  : ""
              }`}
          >
            {/* Embed Header Label in Studio Mode */}
            {isInteractive && (
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800/80 pb-2 select-none">
                <span className="font-bold text-neutral-300 uppercase tracking-wider">{embed.title}</span>
                <span className="text-[9px] text-neutral-500">
                  {Math.round(embed.transform.width)} × {Math.round(embed.transform.height)}
                </span>
              </div>
            )}

            {/* Elements inside this embed */}
            {embedElements.length > 0 ? (
              renderEmbedContent(embed, embedElements)
            ) : (
              <div className="p-8 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl space-y-2 select-none font-mono">
                <p className="text-xs">Empty Embed Container</p>
                {isInteractive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenComponentLibrary?.(embed.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Add First Element
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Free-floating Elements */}
      {freeElements.map(renderElement)}
    </div>
  );
}
