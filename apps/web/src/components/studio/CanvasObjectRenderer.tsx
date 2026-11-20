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
  Copy,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  ArrowUp,
  ArrowDown,
  Move,
  Eye,
  EyeOff,
  MoreHorizontal,
  Edit2,
} from "lucide-react";
import { EmbedAdjustmentPanel } from "./EmbedAdjustmentPanel";
import { ContentInsertionMenu } from "./ContentInsertionMenu";
import { ContextualEditModal, ContextualModalTarget } from "./ContextualEditModal";

interface CanvasObjectRendererProps {
  embeds: CanvasEmbed[];
  elements: CanvasElement[];
  config: ProfileDesignConfig;
  data: PreviewData;
  isInteractive?: boolean;
  isPremium?: boolean;
  selectedId?: string | null;
  inlineEditingId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onSetInlineEditingId?: (id: string | null) => void;
  onUpdateElementProps?: (id: string, props: Record<string, any>) => void;
  onPointerDownElement?: (e: React.PointerEvent, id: string, isEmbed: boolean) => void;
  onOpenComponentLibrary?: (parentEmbedId: string) => void;
  zoom?: number;
  onResizeEmbed?: (embedId: string, width: number, height: number, x?: number, y?: number) => void;
  onDuplicateEmbed?: (embedId: string) => void;
  onDeleteEmbed?: (embedId: string) => void;
  onDeleteElement?: (elementId: string) => void;
  onToggleLockEmbed?: (embedId: string) => void;
  onToggleHideEmbed?: (embedId: string) => void;
  onChangeZIndexEmbed?: (embedId: string, delta: number) => void;
  onInsertElement?: (embedId: string, type: any) => void;
  onContextualSave?: (target: ContextualModalTarget, updatedData: any) => void;
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
  zoom = 100,
  onResizeEmbed,
  onDuplicateEmbed,
  onDeleteEmbed,
  onDeleteElement,
  onToggleLockEmbed,
  onToggleHideEmbed,
  onChangeZIndexEmbed,
  onInsertElement,
  onContextualSave,
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

  const [hoveredElementId, setHoveredElementId] = React.useState<string | null>(null);
  const [activeModalTarget, setActiveModalTarget] = React.useState<ContextualModalTarget | null>(null);
  const [contentMenuEmbedId, setContentMenuEmbedId] = React.useState<string | null>(null);
  const [advancedPanelEmbedId, setAdvancedPanelEmbedId] = React.useState<string | null>(null);

  // Global Keyboard Navigation (Escape, Arrow Nudge, Delete)
  React.useEffect(() => {
    if (!isInteractive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        if (activeModalTarget) {
          setActiveModalTarget(null);
          return;
        }
        if (contentMenuEmbedId) {
          setContentMenuEmbedId(null);
          return;
        }
        if (advancedPanelEmbedId) {
          setAdvancedPanelEmbedId(null);
          return;
        }
        if (inlineEditingId) {
          onSetInlineEditingId?.(null);
          return;
        }
        if (selectedId) {
          onSelectElement?.(null);
          return;
        }
      }

      // Do not nudge or delete if user is typing in an input/textarea
      if (isInputActive || inlineEditingId) return;

      // Nudge with Arrow keys when an embed or element is selected
      if (
        selectedId &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const deltaX = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const deltaY = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

        const targetEmbed = embeds.find((em) => em.id === selectedId);
        if (targetEmbed && onResizeEmbed) {
          const newX = (targetEmbed.transform.x || 0) + deltaX;
          const newY = (targetEmbed.transform.y || 0) + deltaY;
          onResizeEmbed(
            targetEmbed.id,
            targetEmbed.transform.width,
            targetEmbed.transform.height,
            newX,
            newY
          );
          return;
        }

        const targetElement = elements.find((el) => el.id === selectedId);
        if (targetElement && onUpdateElementProps) {
          const currentTransform = targetElement.transform || { x: 0, y: 0 };
          onUpdateElementProps(targetElement.id, {
            transform: {
              ...currentTransform,
              x: (currentTransform.x || 0) + deltaX,
              y: (currentTransform.y || 0) + deltaY,
            },
          });
          return;
        }
      }

      // Delete / Backspace key deletes selected item (if not locked)
      if (selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        const targetEmbed = embeds.find((em) => em.id === selectedId);
        if (targetEmbed && !targetEmbed.isLocked && targetEmbed.id !== "embed_primary") {
          e.preventDefault();
          onDeleteEmbed?.(targetEmbed.id);
          onSelectElement?.(null);
          return;
        }

        const targetElement = elements.find((el) => el.id === selectedId);
        if (targetElement && !targetElement.isLocked) {
          e.preventDefault();
          onDeleteElement?.(targetElement.id);
          onSelectElement?.(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isInteractive,
    activeModalTarget,
    contentMenuEmbedId,
    advancedPanelEmbedId,
    inlineEditingId,
    selectedId,
    embeds,
    elements,
    onSetInlineEditingId,
    onSelectElement,
    onResizeEmbed,
    onDeleteEmbed,
    onDeleteElement,
    onUpdateElementProps,
  ]);

  const [resizingEmbed, setResizingEmbed] = React.useState<{
    embedId: string;
    handle: "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";
    currentWidth: number;
    currentHeight: number;
    currentX: number;
    currentY: number;
    isShiftPressed: boolean;
    isAltPressed: boolean;
  } | null>(null);

  const [movingEmbed, setMovingEmbed] = React.useState<{
    embedId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    currentX: number;
    currentY: number;
    isSnappedX: boolean;
  } | null>(null);

  const [showInspectorEmbedId, setShowInspectorEmbedId] = React.useState<string | null>(null);

  const handleResizePointerDown = (
    e: React.PointerEvent,
    embedId: string,
    handle: "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br",
    initialW: number,
    initialH: number,
    initialX: number = 0,
    initialY: number = 0
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const zoomScale = Math.max(0.2, (zoom || 100) / 100);
    const initialAspect = initialW / Math.max(1, initialH);

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    let lastW = initialW;
    let lastH = initialH;
    let lastX = initialX;
    let lastY = initialY;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startX) / zoomScale;
      const deltaY = (ev.clientY - startY) / zoomScale;
      const isShift = ev.shiftKey;
      const isAlt = ev.altKey;

      let nextW = initialW;
      let nextH = initialH;
      let nextX = initialX;
      let nextY = initialY;

      // 1. HEIGHT RESIZING (Independent top vs bottom boundary control)
      if (handle === "bc" || handle === "bl" || handle === "br") {
        if (isAlt) {
          // Alt: symmetric vertical expansion around center
          nextH = Math.round(initialH + deltaY * 2);
          nextY = Math.round(initialY - deltaY);
        } else {
          // Standard: bottom boundary moves; top stays 100% fixed
          nextH = Math.round(initialH + deltaY);
          nextY = initialY;
        }
      } else if (handle === "tc" || handle === "tl" || handle === "tr") {
        if (isAlt) {
          // Alt: symmetric vertical expansion around center
          nextH = Math.round(initialH - deltaY * 2);
          nextY = Math.round(initialY + deltaY);
        } else {
          // Standard: top boundary moves; bottom stays 100% fixed
          nextH = Math.round(initialH - deltaY);
          nextY = Math.round(initialY + deltaY);
        }
      }

      // 2. WIDTH RESIZING (Horizontal boundary control)
      if (handle === "mr" || handle === "tr" || handle === "br") {
        if (isAlt) {
          nextW = Math.round(initialW + deltaX * 2);
          nextX = Math.round(initialX - deltaX);
        } else {
          nextW = Math.round(initialW + deltaX);
          nextX = initialX;
        }
      } else if (handle === "ml" || handle === "tl" || handle === "bl") {
        if (isAlt) {
          nextW = Math.round(initialW - deltaX * 2);
          nextX = Math.round(initialX + deltaX);
        } else {
          nextW = Math.round(initialW - deltaX);
          nextX = Math.round(initialX + deltaX);
        }
      }

      // 3. Proportional aspect ratio preservation on corner handles with Shift
      if (isShift && (handle === "tl" || handle === "tr" || handle === "bl" || handle === "br")) {
        const proposedH = Math.round(nextW / initialAspect);
        if (handle === "tl" || handle === "tr") {
          nextY = initialY + initialH - proposedH;
        }
        nextH = proposedH;
      }

      // 4. Enforce strict bounds: min 320x160, max 1600x2000
      if (nextW < 320) {
        if (handle === "ml" || handle === "tl" || handle === "bl") {
          nextX = isAlt ? initialX + (initialW - 320) / 2 : initialX + initialW - 320;
        }
        nextW = 320;
      } else if (nextW > 1600) {
        if (handle === "ml" || handle === "tl" || handle === "bl") {
          nextX = isAlt ? initialX - (1600 - initialW) / 2 : initialX - (1600 - initialW);
        }
        nextW = 1600;
      }

      if (nextH < 160) {
        if (handle === "tc" || handle === "tl" || handle === "tr") {
          nextY = isAlt ? initialY + (initialH - 160) / 2 : initialY + initialH - 160;
        }
        nextH = 160;
      } else if (nextH > 2000) {
        if (handle === "tc" || handle === "tl" || handle === "tr") {
          nextY = isAlt ? initialY - (2000 - initialH) / 2 : initialY - (2000 - initialH);
        }
        nextH = 2000;
      }

      lastW = nextW;
      lastH = nextH;
      lastX = nextX;
      lastY = nextY;

      setResizingEmbed({
        embedId,
        handle,
        currentWidth: nextW,
        currentHeight: nextH,
        currentX: nextX,
        currentY: nextY,
        isShiftPressed: isShift,
        isAltPressed: isAlt,
      });

      onResizeEmbed?.(embedId, nextW, nextH, nextX, nextY);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(ev.pointerId);
      } catch {}
      targetEl.removeEventListener("pointermove", onPointerMove);
      targetEl.removeEventListener("pointerup", onPointerUp);
      targetEl.removeEventListener("pointercancel", onPointerUp);

      onResizeEmbed?.(embedId, lastW, lastH, lastX, lastY);
      setResizingEmbed(null);
    };

    targetEl.addEventListener("pointermove", onPointerMove);
    targetEl.addEventListener("pointerup", onPointerUp);
    targetEl.addEventListener("pointercancel", onPointerUp);
  };

  const handleMovePointerDown = (
    e: React.PointerEvent,
    embedId: string,
    initialX: number = 0,
    initialY: number = 0
  ) => {
    // Only drag with primary pointer button
    if (e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const zoomScale = Math.max(0.2, (zoom || 100) / 100);
    const targetEl = e.currentTarget as HTMLElement;

    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {}

    let lastX = initialX;
    let lastY = initialY;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startX) / zoomScale;
      const deltaY = (ev.clientY - startY) / zoomScale;

      let nextX = Math.round(initialX + deltaX);
      let nextY = Math.round(initialY + deltaY);

      // Snap to canvas center (x = 0) within 12px threshold
      const isSnappedX = Math.abs(nextX) <= 12;
      if (isSnappedX) {
        nextX = 0;
      }

      lastX = nextX;
      lastY = nextY;

      setMovingEmbed({
        embedId,
        startX,
        startY,
        initialX,
        initialY,
        currentX: nextX,
        currentY: nextY,
        isSnappedX,
      });

      const currentEmbed = embeds.find((em) => em.id === embedId);
      const curW = currentEmbed?.transform.width || 580;
      const curH = currentEmbed?.transform.height || 540;
      onResizeEmbed?.(embedId, curW, curH, nextX, nextY);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(ev.pointerId);
      } catch {}
      targetEl.removeEventListener("pointermove", onPointerMove);
      targetEl.removeEventListener("pointerup", onPointerUp);
      targetEl.removeEventListener("pointercancel", onPointerUp);

      const currentEmbed = embeds.find((em) => em.id === embedId);
      const curW = currentEmbed?.transform.width || 580;
      const curH = currentEmbed?.transform.height || 540;
      onResizeEmbed?.(embedId, curW, curH, lastX, lastY);
      setMovingEmbed(null);
    };

    targetEl.addEventListener("pointermove", onPointerMove);
    targetEl.addEventListener("pointerup", onPointerUp);
    targetEl.addEventListener("pointercancel", onPointerUp);
  };

  // Render an individual canvas element
  const renderElement = (el: CanvasElement) => {
    if (el.isVisible === false) return null;

    const isSelected = isInteractive && selectedId === el.id;
    const transform = el.transform;
    const effects = computeElementEffects(el.style, config.identity?.titleColor || "#ffffff");

    const baseWrapperStyle: React.CSSProperties = {
      position: "relative",
      width: el.parentEmbedId ? "100%" : `${transform.width}px`,
      maxWidth: "100%",
      boxSizing: "border-box",
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

    const isHovered = isInteractive && hoveredElementId === el.id && !inlineEditingId;
    let contextualBadgeLabel = "EDIT TEXT";
    if (el.type === "avatar" || el.type === "username" || el.type === "displayName") {
      contextualBadgeLabel = "EDIT NAME & ICON";
    } else if (el.type === "bio" || el.type === "description") {
      contextualBadgeLabel = "EDIT BIO";
    } else if (el.type === "rpc") {
      contextualBadgeLabel = "EDIT RPC";
    } else if (el.type === "banner") {
      contextualBadgeLabel = "EDIT BANNER";
    } else if (el.type === "image") {
      contextualBadgeLabel = "EDIT IMAGE";
    } else if (el.type === "button") {
      contextualBadgeLabel = "EDIT BUTTON";
    } else if (el.type === "socials") {
      contextualBadgeLabel = "EDIT SOCIALS";
    }

    const renderHoverBadge = () => {
      if (!isHovered) return null;
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (el.type === "avatar" || el.type === "username" || el.type === "displayName") {
              setActiveModalTarget({
                type: "info",
                title: "Edit Name & Profile Icon",
                data: { displayName, username, avatarUrl, accentColor: config.identity?.titleColor || "#ffffff" },
              });
            } else if (el.type === "bio" || el.type === "description") {
              setActiveModalTarget({
                type: "bio",
                title: "Edit Biography",
                data: { bio: bio || el.props?.text || "" },
              });
            } else if (el.type === "rpc") {
              setActiveModalTarget({
                type: "rpc",
                title: "Customize Discord Rich Presence",
                data: {
                  appName: discordPresence?.appName || discordPresence?.name || "Visual Studio Code",
                  details: discordPresence?.details || "",
                  state: discordPresence?.state || "",
                  largeImage: discordPresence?.largeImage || "",
                  smallImage: discordPresence?.smallImage || "",
                  partySize: discordPresence?.partySize || 1,
                  partyMax: discordPresence?.partyMax || 5,
                  buttons: discordPresence?.buttons || [{ label: "Join Project", url: "https://pixel.gg", visible: true }],
                  isStandalone: Boolean(config.discordRpc?.customLayout),
                  showProfileRpc: config.discordRpc?.showProfileRpc !== false,
                },
              });
            } else if (el.type === "banner") {
              setActiveModalTarget({
                type: "banner",
                title: "Edit Banner Graphic",
                data: { bannerUrl: config.background?.imageUrl || "" },
              });
            } else if (el.type === "image") {
              setActiveModalTarget({
                type: "image",
                title: "Edit Image Graphic",
                elementId: el.id,
                data: { url: el.props?.url || "" },
              });
            } else {
              setActiveModalTarget({
                type: "text",
                title: "Edit Text Block",
                elementId: el.id,
                data: { text: el.props?.text || el.props?.content || "" },
              });
            }
          }}
          className="contextual-edit-badge absolute -top-3 left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded-full bg-black/90 border border-amber-400 text-amber-300 font-mono text-[9px] font-bold shadow-lg flex items-center gap-1 cursor-pointer hover:bg-amber-400 hover:text-black transition-all select-none"
        >
          <Edit2 size={9} />
          <span>{contextualBadgeLabel}</span>
        </div>
      );
    };

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
          onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
          onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
          style={baseWrapperStyle}
          className={`relative flex items-center ${extraWrapperClass} ${outlineClasses}`}
        >
          {renderHoverBadge()}
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
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, width: `${avatarSize}px`, minHeight: `${avatarSize}px` }}
            className={`relative flex items-center justify-center p-1 rounded-2xl ${outlineClasses}`}
          >
            {renderHoverBadge()}
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
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={baseWrapperStyle}
            className={`relative w-full ${outlineClasses}`}
          >
            {renderHoverBadge()}
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
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 10}px` }}
            className={`relative w-full flex flex-col p-1 ${outlineClasses}`}
          >
            {renderHoverBadge()}
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
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 12}px` }}
            className={`relative w-full flex items-center justify-center py-2 flex-wrap ${outlineClasses}`}
          >
            {renderHoverBadge()}
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

      case "banner": {
        const src = el.props?.src || el.props?.url || config.background?.imageUrl || "/placeholder.png";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, width: "100%", height: el.transform?.height ? `${el.transform.height}px` : "140px" }}
            className={`relative overflow-hidden rounded-xl shadow-lg ${outlineClasses}`}
          >
            {renderHoverBadge()}
            <img
              src={src}
              alt="Banner Graphic"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
              }}
            />
          </div>
        );
      }

      case "image":
      case "thumbnail": {
        const src = el.props?.src || el.props?.url || "/placeholder.png";
        return (
          <div
            key={el.id}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={baseWrapperStyle}
            className={`relative overflow-hidden rounded-xl shadow-lg ${outlineClasses}`}
          >
            {renderHoverBadge()}
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
    <div
      data-studio-canvas="true"
      onClick={(e) => {
        if (!isInteractive) return;
        if (e.target === e.currentTarget) {
          onSelectElement?.(null);
        }
      }}
      className="canvas-object-root relative w-full h-full min-h-[500px]"
    >
      {/* Visual Alignment Guides */}
      {movingEmbed?.isSnappedX && (
        <div
          className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-cyan-400 pointer-events-none z-50 shadow-[0_0_10px_rgba(34,211,238,0.9)]"
          style={{ transform: "translateX(-50%)" }}
        >
          <div className="sticky top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-[10px] font-mono font-bold text-cyan-200 shadow-lg">
            CENTER SNAP (X: 0)
          </div>
        </div>
      )}

      {/* 1. Embed Containers */}
      {embeds.map((embed) => {
        if (!isInteractive && embed.isVisible === false) return null;
        const isHiddenInEditor = isInteractive && embed.isVisible === false;

        const isSelectedEmbed = isInteractive && (selectedId === embed.id || (embed.id === "embed_primary" && (selectedId === "layout" || selectedId === "container")));
        const isThisMoving = movingEmbed && movingEmbed.embedId === embed.id;
        const isThisResizing = resizingEmbed && resizingEmbed.embedId === embed.id;

        const currentX = isThisMoving
          ? movingEmbed.currentX
          : (isThisResizing ? resizingEmbed.currentX : (embed.transform.x || 0));
        const currentY = isThisMoving
          ? movingEmbed.currentY
          : (isThisResizing ? resizingEmbed.currentY : (embed.transform.y || 0));

        const currentW = isThisResizing
          ? resizingEmbed.currentWidth
          : (embed.id === "embed_primary" ? (config.layout?.maxWidth || embed.transform.width || 580) : embed.transform.width);
        const currentH = isThisResizing
          ? resizingEmbed.currentHeight
          : (embed.transform.height || config.layout?.height || 540);

        const embedElements = elements.filter((el) => el.parentEmbedId === embed.id);
        const effects = computeElementEffects(embed.style, config.identity?.titleColor || "#ffffff");

        const isPrimary = embed.id === "embed_primary";
        const hasExplicitCustomBg =
          Boolean(embed.style?.backgroundColor) &&
          embed.style.backgroundColor !== "rgba(10, 10, 14, 0.85)" &&
          embed.style.backgroundColor !== "#0c0c0c" &&
          embed.style.backgroundColor !== "rgba(12, 12, 12, 0.9)" &&
          embed.style.backgroundColor !== "#050505";

        const glassOpacity = Math.round(((config.effects?.opacity ?? 70) / 100) * 0.65 * 1000) / 1000;
        const solidOpacity = Math.round(((config.effects?.opacity ?? 85) / 100) * 1000) / 1000;

        const resolvedEmbedBg =
          effects.background ||
          (hasExplicitCustomBg ? embed.style.backgroundColor : undefined) ||
          (isPrimary
            ? (config.effects?.glassmorphism !== false
                ? `rgba(12, 12, 16, ${glassOpacity})`
                : `rgba(12, 12, 16, ${solidOpacity})`)
            : (embed.style.backgroundColor || `rgba(12, 12, 16, ${glassOpacity})`));

        const resolvedBackdropFilter =
          effects.backdropFilter ||
          (embed.style.backdropBlur ? `blur(${embed.style.backdropBlur}px)` : undefined) ||
          (isPrimary && (config.effects?.blur ?? 16) > 0
            ? `blur(${config.effects.blur || 16}px) saturate(180%)`
            : undefined);

        const isAutoHeight = config.layout?.autoHeight !== false;
        const resolvedMinHeight = isThisResizing
          ? `${resizingEmbed.currentHeight}px`
          : (isAutoHeight
              ? (embedElements.length === 0 ? "180px" : undefined)
              : (config.layout?.height ? `${config.layout.height}px` : `${currentH}px`));

        const resolvedWidth = isThisResizing
          ? `${resizingEmbed.currentWidth}px`
          : "100%";

        const resolvedMaxWidth = isThisResizing
          ? `${resizingEmbed.currentWidth}px`
          : (isPrimary
              ? `min(${currentW}px, 100%)`
              : `min(${currentW}px, 100%)`);

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
              if (embed.isLocked) return;
              const target = e.target as HTMLElement;
              if (
                target.closest("button") ||
                target.closest("input") ||
                target.closest("textarea") ||
                target.closest("a") ||
                target.closest(".resize-handle") ||
                target.closest(".embed-toolbar") ||
                target.closest(".embed-inspector") ||
                target.closest(".embed-adjustment-panel") ||
                target.closest(".content-insertion-menu")
              ) {
                return;
              }
              handleMovePointerDown(e, embed.id, currentX, currentY);
            }}
            style={{
              position: "relative",
              width: resolvedWidth,
              maxWidth: resolvedMaxWidth,
              minHeight: resolvedMinHeight,
              boxSizing: "border-box",
              margin: "0 auto 32px auto",
              transform: `translate3d(${currentX}px, ${currentY}px, 0) rotate(${embed.transform.rotation || 0}deg)`,
              zIndex: embed.transform.zIndex || 1,
              backgroundColor: resolvedEmbedBg,
              border: isHiddenInEditor
                ? "1px dashed rgba(255, 255, 255, 0.4)"
                : `${embed.style.borderWidth ?? 1}px solid ${embed.style.borderColor || "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: `${embed.id === "embed_primary" ? (config.discordRpc?.borderRadius ?? embed.style.borderRadius ?? 24) : (embed.style.borderRadius ?? 24)}px`,
              padding: `${embed.id === "embed_primary" ? (config.layout?.padding ?? embed.style.padding ?? 24) : (embed.style.padding ?? 24)}px`,
              opacity: isHiddenInEditor ? 0.35 : undefined,
              boxShadow: isSelectedEmbed
                ? "0 0 24px rgba(251, 191, 36, 0.55), inset 0 0 12px rgba(251, 191, 36, 0.15)"
                : effects.boxShadow,
              backdropFilter: resolvedBackdropFilter,
              animation: effects.animation,
              transition: (isThisResizing || isThisMoving) ? "none" : (effects.transition || "all 0.15s ease"),
              cursor: isInteractive ? (embed.isLocked ? "not-allowed" : (isSelectedEmbed ? "move" : "pointer")) : "default",
            }}
            className={`space-y-4 w-full max-w-full select-none ${isSelectedEmbed
                ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
                : isInteractive
                  ? "hover:ring-1 hover:ring-white/30"
                  : ""
              }`}
          >
            {/* Hidden Embed Indicator in Editor */}
            {isHiddenInEditor && (
              <div className="absolute top-2 right-2 z-40 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 font-mono text-[9px] flex items-center gap-1.5 pointer-events-none">
                <EyeOff size={10} />
                <span>HIDDEN (Click to Unhide)</span>
              </div>
            )}

            {/* Embed Selection Toolbar: 4 Primary Controls (Hide, Lock, Add, More) */}
            {isSelectedEmbed && (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  top: currentY < 48 ? "calc(100% + 14px)" : "-44px",
                }}
                className="embed-toolbar absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#121216]/95 backdrop-blur-md border border-neutral-700/80 shadow-[0_8px_24px_rgba(0,0,0,0.65)] select-none pointer-events-auto"
              >
                {/* 1. Hide / Unhide */}
                <button
                  type="button"
                  title={embed.isVisible === false ? "Unhide embed" : "Hide embed from preview"}
                  onClick={() => onToggleHideEmbed?.(embed.id)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    embed.isVisible === false
                      ? "text-amber-400 bg-amber-500/20 font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {embed.isVisible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>

                {/* 2. Lock / Unlock */}
                <button
                  type="button"
                  title={embed.isLocked ? "Unlock embed position & size" : "Lock embed position & size"}
                  onClick={() => onToggleLockEmbed?.(embed.id)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    embed.isLocked
                      ? "text-amber-400 bg-amber-500/20 font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {embed.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                {/* 3. Add (+) */}
                <button
                  type="button"
                  title="Add content to embed"
                  onClick={() => setContentMenuEmbedId(contentMenuEmbedId === embed.id ? null : embed.id)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    contentMenuEmbedId === embed.id
                      ? "bg-amber-400 text-black font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Plus size={13} />
                </button>

                {/* 4. More / Advanced Adjustments */}
                <button
                  type="button"
                  title="Advanced Adjustments (floating panel)"
                  onClick={() => setAdvancedPanelEmbedId(advancedPanelEmbedId === embed.id ? null : embed.id)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    advancedPanelEmbedId === embed.id
                      ? "text-cyan-400 bg-cyan-500/20 font-bold"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <MoreHorizontal size={13} />
                </button>

                <div className="w-[1px] h-3.5 bg-neutral-800 mx-0.5" />

                {/* Drag / Move Coordinates Badge */}
                <div
                  title="Drag embed anywhere on canvas"
                  className="flex items-center gap-1.5 px-1.5 py-0.5 text-neutral-400 font-mono text-[10px] cursor-move"
                >
                  <Move size={11} className="text-amber-400" />
                  <span className="font-semibold text-neutral-300">
                    X:{Math.round(currentX)} Y:{Math.round(currentY)}
                  </span>
                </div>

                <div className="w-[1px] h-3.5 bg-neutral-800 mx-0.5" />

                {/* Duplicate */}
                <button
                  type="button"
                  title="Duplicate embed"
                  onClick={() => onDuplicateEmbed?.(embed.id)}
                  className="p-1 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                </button>

                {/* Layer order: Bring Forward / Send Backward */}
                <button
                  type="button"
                  title="Bring forward (Z-Index +1)"
                  onClick={() => onChangeZIndexEmbed?.(embed.id, 1)}
                  className="p-1 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  title="Send backward (Z-Index -1)"
                  onClick={() => onChangeZIndexEmbed?.(embed.id, -1)}
                  className="p-1 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ArrowDown size={13} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  title="Delete embed"
                  onClick={() => onDeleteEmbed?.(embed.id)}
                  className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* 8-Point Figma / Photoshop Resize Handles (Only when unlocked) */}
            {isSelectedEmbed && !embed.isLocked && (
              <>
                {/* 4 Corner Handles */}
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tl", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (NW) - Hold Shift to preserve aspect ratio, Alt for symmetric scaling"
                  className="resize-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nwse-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tr", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (NE) - Hold Shift to preserve aspect ratio, Alt for symmetric scaling"
                  className="resize-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nesw-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "bl", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (SW) - Hold Shift to preserve aspect ratio, Alt for symmetric scaling"
                  className="resize-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nesw-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "br", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (SE) - Hold Shift to preserve aspect ratio, Alt for symmetric scaling"
                  className="resize-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nwse-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />

                {/* 4 Edge Handles */}
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tc", currentW, currentH, currentX, currentY)}
                  title="Resize Top Edge (North) - Independent: bottom remains fixed. Hold Alt for symmetric scaling."
                  className="resize-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ns-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "bc", currentW, currentH, currentX, currentY)}
                  title="Resize Bottom Edge (South) - Independent: top remains fixed. Hold Alt for symmetric scaling."
                  className="resize-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ns-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "ml", currentW, currentH, currentX, currentY)}
                  title="Resize Left Edge (West) - Hold Alt for symmetric scaling"
                  className="resize-handle absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ew-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "mr", currentW, currentH, currentX, currentY)}
                  title="Resize Right Edge (East) - Hold Alt for symmetric scaling"
                  className="resize-handle absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ew-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
                />

                {/* Floating Dimension & Aspect Ratio Tag */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-neutral-900/95 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold shadow-xl flex items-center gap-2 pointer-events-none select-none z-40 whitespace-nowrap">
                  <span>{Math.round(currentW)} × {Math.round(currentH)} px</span>
                  <span className="text-neutral-500">•</span>
                  <span>{(currentW / Math.max(1, currentH)).toFixed(2)}:1</span>
                  {resizingEmbed?.isShiftPressed && (
                    <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[8px] uppercase">
                      SHIFT: ASPECT LOCKED
                    </span>
                  )}
                  {resizingEmbed?.isAltPressed && (
                    <span className="bg-cyan-500/20 text-cyan-400 px-1 rounded text-[8px] uppercase">
                      ALT: SYMMETRIC
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Embed Header Label in Studio Mode */}
            {isInteractive && (
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800/80 pb-2 select-none">
                <span className="font-bold text-neutral-300 uppercase tracking-wider">{embed.title}</span>
                <span className="text-[9px] text-neutral-500">
                  {Math.round(currentW)} × {Math.round(currentH)} px (X:{Math.round(currentX)} Y:{Math.round(currentY)})
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
                      setContentMenuEmbedId(embed.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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

      {/* 3. On-Canvas Content Insertion Menu */}
      {contentMenuEmbedId && (
        <ContentInsertionMenu
          embedId={contentMenuEmbedId}
          onSelectContentType={(type) => {
            onInsertElement?.(contentMenuEmbedId, type);
            setContentMenuEmbedId(null);
          }}
          onClose={() => setContentMenuEmbedId(null)}
        />
      )}

      {/* 4. Floating Embed Adjustment Panel */}
      {advancedPanelEmbedId && (() => {
        const targetEmbed = embeds.find((em) => em.id === advancedPanelEmbedId);
        if (!targetEmbed) return null;
        const currentW = targetEmbed.transform.width;
        const currentH = targetEmbed.transform.height;
        const currentX = targetEmbed.transform.x || 0;
        const currentY = targetEmbed.transform.y || 0;
        return (
          <EmbedAdjustmentPanel
            embed={targetEmbed}
            currentWidth={currentW}
            currentHeight={currentH}
            currentX={currentX}
            currentY={currentY}
            isLocked={Boolean(targetEmbed.isLocked)}
            onUpdateTransform={(t) => {
              onResizeEmbed?.(
                targetEmbed.id,
                t.width ?? currentW,
                t.height ?? currentH,
                t.x ?? currentX,
                t.y ?? currentY
              );
            }}
            onToggleLock={() => onToggleLockEmbed?.(targetEmbed.id)}
            onChangeZIndex={(delta) => onChangeZIndexEmbed?.(targetEmbed.id, delta)}
            onClose={() => setAdvancedPanelEmbedId(null)}
          />
        );
      })()}

      {/* 5. Centered Contextual Edit Modal */}
      <ContextualEditModal
        target={activeModalTarget}
        isOpen={Boolean(activeModalTarget)}
        onClose={() => setActiveModalTarget(null)}
        onSave={(target, updatedData) => {
          onContextualSave?.(target, updatedData);
          setActiveModalTarget(null);
        }}
      />
    </div>
  );
}
