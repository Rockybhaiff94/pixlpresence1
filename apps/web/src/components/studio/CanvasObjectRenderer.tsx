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
  onResizeEmbed?: (
    embedId: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    scaleOptions?: {
      scaleFactor?: number;
      gap?: number;
      padding?: number;
      avatarSize?: number;
      isSideSpacing?: boolean;
    }
  ) => void;
  onResizeElement?: (elementId: string, width: number, height: number, x?: number, y?: number) => void;
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
  onResizeElement,
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

  const layoutPreset = config.layout?.preset || "centered";
  const layoutAlignment =
    config.layout?.alignment ||
    (layoutPreset === "left" ? "left" : layoutPreset === "right" ? "right" : "center");

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
        if (targetElement) {
          const currentTransform = targetElement.transform || { x: 0, y: 0 };
          const newX = (currentTransform.x || 0) + deltaX;
          const newY = (currentTransform.y || 0) + deltaY;
          if (onResizeElement) {
            onResizeElement(
              targetElement.id,
              targetElement.transform.width,
              targetElement.transform.height,
              newX,
              newY
            );
          } else if (onUpdateElementProps) {
            onUpdateElementProps(targetElement.id, {
              transform: {
                ...currentTransform,
                x: newX,
                y: newY,
              },
            });
          }
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
    isShiftPressed?: boolean;
    isAltPressed?: boolean;
    scaleFactor?: number;
    currentGap?: number;
    currentPadding?: number;
    isSideSpacing?: boolean;
  } | null>(null);

  const effectiveGap =
    resizingEmbed && resizingEmbed.currentGap !== undefined
      ? resizingEmbed.currentGap
      : (config.layout?.gap ?? 22);

  const effectivePadding =
    resizingEmbed && resizingEmbed.currentPadding !== undefined
      ? resizingEmbed.currentPadding
      : (config.layout?.padding ?? 24);

  const layoutGap = effectiveGap;

  const [resizingElement, setResizingElement] = React.useState<{
    elementId: string;
    handle: "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";
    currentWidth: number;
    currentHeight: number;
    currentX: number;
    currentY: number;
    isShiftPressed: boolean;
    isAltPressed: boolean;
    isMedia: boolean;
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
  const isResizingJustFinishedRef = React.useRef(false);

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
    const initialGap = config.layout?.gap ?? 24;
    const initialPadding = config.layout?.padding ?? 28;
    const initialAvatarSize = config.avatar?.size ?? 96;

    const isSideVertical = handle === "tc" || handle === "bc";
    const isSideHorizontal = handle === "ml" || handle === "mr";
    console.log('[DEBUG_DOWN] handle:', handle, 'initialW:', initialW, 'initialH:', initialH);

    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {}

    let lastW = initialW;
    let lastH = initialH;
    let lastX = initialX;
    let lastY = initialY;
    let lastScale = 1;
    let lastGap = initialGap;
    let lastPadding = initialPadding;
    let lastAvatarSize = initialAvatarSize;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startX) / zoomScale;
      const deltaY = (ev.clientY - startY) / zoomScale;
      const isShift = ev.shiftKey;
      const isAlt = ev.altKey;

      if (isSideVertical) {
        // TOP-CENTER or BOTTOM-CENTER: adjust vertical spacing (gap) only.
        // Outer dimensions remain 100% UNCHANGED.
        const gapDelta = handle === "bc" ? deltaY : -deltaY;
        const proposedGap = Math.round(initialGap + gapDelta);
        // Automatic stopping system: clamp to safe non-colliding, non-overflowing range [4, 80]
        const clampedGap = Math.max(4, Math.min(80, proposedGap));

        lastGap = clampedGap;
        setResizingEmbed({
          embedId,
          handle,
          currentWidth: initialW,
          currentHeight: initialH,
          currentX: initialX,
          currentY: initialY,
          isShiftPressed: isShift,
          isAltPressed: isAlt,
          currentGap: clampedGap,
          currentPadding: initialPadding,
          scaleFactor: 1,
          isSideSpacing: true,
        });

        onResizeEmbed?.(embedId, initialW, initialH, initialX, initialY, {
          isSideSpacing: true,
          gap: clampedGap,
        });
        return;
      }

      if (isSideHorizontal) {
        // LEFT-CENTER or RIGHT-CENTER: adjust horizontal spacing (padding) only.
        // Outer dimensions remain 100% UNCHANGED.
        const paddingDelta = handle === "mr" ? deltaX : -deltaX;
        const proposedPadding = Math.round(initialPadding + paddingDelta);
        // Automatic stopping system: clamp to safe range [8, 80]
        const clampedPadding = Math.max(8, Math.min(80, proposedPadding));

        lastPadding = clampedPadding;
        setResizingEmbed({
          embedId,
          handle,
          currentWidth: initialW,
          currentHeight: initialH,
          currentX: initialX,
          currentY: initialY,
          isShiftPressed: isShift,
          isAltPressed: isAlt,
          currentGap: initialGap,
          currentPadding: clampedPadding,
          scaleFactor: 1,
          isSideSpacing: true,
        });

        onResizeEmbed?.(embedId, initialW, initialH, initialX, initialY, {
          isSideSpacing: true,
          padding: clampedPadding,
        });
        return;
      }

      // CORNER HANDLES: COMPLETE PROPORTIONAL EMBED SCALING
      let scale = 1;
      let nextW = initialW;
      let nextH = initialH;
      let nextX = initialX;
      let nextY = initialY;

      if (handle === "br") {
        const scaleX = (initialW + deltaX) / initialW;
        const scaleY = (initialH + deltaY) / initialH;
        scale = Math.max(0.25, (scaleX + scaleY) / 2);
        nextW = Math.round(initialW * scale);
        nextH = Math.round(initialH * scale);
        nextX = initialX;
        nextY = initialY;
      } else if (handle === "bl") {
        const scaleX = (initialW - deltaX) / initialW;
        const scaleY = (initialH + deltaY) / initialH;
        scale = Math.max(0.25, (scaleX + scaleY) / 2);
        nextW = Math.round(initialW * scale);
        nextH = Math.round(initialH * scale);
        nextX = isAlt ? initialX : Math.round(initialX + (initialW - nextW) / 2);
        nextY = initialY;
      } else if (handle === "tr") {
        const scaleX = (initialW + deltaX) / initialW;
        const scaleY = (initialH - deltaY) / initialH;
        scale = Math.max(0.25, (scaleX + scaleY) / 2);
        nextW = Math.round(initialW * scale);
        nextH = Math.round(initialH * scale);
        nextX = isAlt ? initialX : Math.round(initialX - (initialW - nextW) / 2);
        nextY = isAlt ? initialY : Math.round(initialY + initialH - nextH);
      } else if (handle === "tl") {
        const scaleX = (initialW - deltaX) / initialW;
        const scaleY = (initialH - deltaY) / initialH;
        scale = Math.max(0.25, (scaleX + scaleY) / 2);
        nextW = Math.round(initialW * scale);
        nextH = Math.round(initialH * scale);
        nextX = isAlt ? initialX : Math.round(initialX + (initialW - nextW) / 2);
        nextY = isAlt ? initialY : Math.round(initialY + initialH - nextH);
      }

      // Content visibility protection: enforce safe physical bounds [320x240, 1400x1800]
      if (nextW < 320) {
        const minScale = 320 / initialW;
        nextW = 320;
        nextH = Math.round(initialH * minScale);
        if (handle === "tl" || handle === "bl") nextX = isAlt ? initialX : Math.round(initialX + (initialW - 320) / 2);
        if (handle === "tr") nextX = isAlt ? initialX : Math.round(initialX - (initialW - 320) / 2);
        if (handle === "tl" || handle === "tr") nextY = isAlt ? initialY : Math.round(initialY + initialH - nextH);
        scale = minScale;
      } else if (nextW > 1400) {
        const maxScale = 1400 / initialW;
        nextW = 1400;
        nextH = Math.round(initialH * maxScale);
        if (handle === "tl" || handle === "bl") nextX = isAlt ? initialX : Math.round(initialX + (initialW - 1400) / 2);
        if (handle === "tr") nextX = isAlt ? initialX : Math.round(initialX - (initialW - 1400) / 2);
        if (handle === "tl" || handle === "tr") nextY = isAlt ? initialY : Math.round(initialY + initialH - nextH);
        scale = maxScale;
      }

      const scaledGap = Math.max(4, Math.min(80, Math.round(initialGap * scale)));
      const scaledPadding = Math.max(8, Math.min(100, Math.round(initialPadding * scale)));
      const scaledAvatarSize = Math.max(36, Math.min(220, Math.round(initialAvatarSize * scale)));

      lastW = nextW;
      lastH = nextH;
      lastX = nextX;
      lastY = nextY;
      lastScale = scale;
      lastGap = scaledGap;
      lastPadding = scaledPadding;
      lastAvatarSize = scaledAvatarSize;

      setResizingEmbed({
        embedId,
        handle,
        currentWidth: nextW,
        currentHeight: nextH,
        currentX: nextX,
        currentY: nextY,
        isShiftPressed: isShift,
        isAltPressed: isAlt,
        scaleFactor: scale,
        currentGap: scaledGap,
        currentPadding: scaledPadding,
        isSideSpacing: false,
      });

      onResizeEmbed?.(embedId, nextW, nextH, nextX, nextY, {
        scaleFactor: scale,
        gap: scaledGap,
        padding: scaledPadding,
        avatarSize: scaledAvatarSize,
        isSideSpacing: false,
      });
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(ev.pointerId);
      } catch {}
      targetEl.removeEventListener("pointermove", onPointerMove);
      targetEl.removeEventListener("pointerup", onPointerUp);
      targetEl.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      isResizingJustFinishedRef.current = true;
      setTimeout(() => {
        isResizingJustFinishedRef.current = false;
      }, 350);

      if (isSideVertical) {
        onResizeEmbed?.(embedId, initialW, initialH, initialX, initialY, {
          isSideSpacing: true,
          gap: lastGap,
        });
      } else if (isSideHorizontal) {
        onResizeEmbed?.(embedId, initialW, initialH, initialX, initialY, {
          isSideSpacing: true,
          padding: lastPadding,
        });
      } else {
        onResizeEmbed?.(embedId, lastW, lastH, lastX, lastY, {
          scaleFactor: lastScale,
          gap: lastGap,
          padding: lastPadding,
          avatarSize: lastAvatarSize,
          isSideSpacing: false,
        });
      }

      setResizingEmbed(null);
    };

    targetEl.addEventListener("pointermove", onPointerMove);
    targetEl.addEventListener("pointerup", onPointerUp);
    targetEl.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleElementResizePointerDown = (
    e: React.PointerEvent,
    elementId: string,
    handle: "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br",
    initialW: number,
    initialH: number,
    initialX: number = 0,
    initialY: number = 0,
    isMedia: boolean = false
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const zoomScale = Math.max(0.2, (zoom || 100) / 100);
    const initialAspect = initialW / Math.max(1, initialH);

    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {}

    let lastW = initialW;
    let lastH = initialH;
    let lastX = initialX;
    let lastY = initialY;
    let hasMoved = false;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startX) / zoomScale;
      const deltaY = (ev.clientY - startY) / zoomScale;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
      }
      const isShift = ev.shiftKey;
      const isAlt = ev.altKey;

      let nextW = initialW;
      let nextH = initialH;
      let nextX = initialX;
      let nextY = initialY;

      // Media elements preserve aspect ratio by default; Shift temporarily unlocks.
      // Other elements are unconstrained by default; Shift temporarily locks.
      const shouldLockAspect = isMedia ? !isShift : isShift;

      // 1. HEIGHT RESIZING (Independent vertical boundaries)
      if (handle === "bc" || handle === "bl" || handle === "br") {
        if (isAlt) {
          nextH = Math.round(initialH + deltaY * 2);
          nextY = Math.round(initialY - deltaY);
        } else {
          nextH = Math.round(initialH + deltaY);
          nextY = initialY;
        }
      } else if (handle === "tc" || handle === "tl" || handle === "tr") {
        if (isAlt) {
          nextH = Math.round(initialH - deltaY * 2);
          nextY = Math.round(initialY + deltaY);
        } else {
          nextH = Math.round(initialH - deltaY);
          nextY = Math.round(initialY + deltaY);
        }
      }

      // 2. WIDTH RESIZING (Horizontal boundaries)
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

      // 3. Proportional aspect ratio preservation on corner handles
      if (shouldLockAspect && (handle === "tl" || handle === "tr" || handle === "bl" || handle === "br")) {
        const proposedH = Math.round(nextW / initialAspect);
        if (handle === "tl" || handle === "tr") {
          nextY = initialY + initialH - proposedH;
        }
        nextH = proposedH;
      }

      // 4. Element bounds: min 32x24, max 1600x1200
      if (nextW < 32) {
        if (handle === "ml" || handle === "tl" || handle === "bl") {
          nextX = isAlt ? initialX + (initialW - 32) / 2 : initialX + initialW - 32;
        }
        nextW = 32;
      } else if (nextW > 1600) {
        if (handle === "ml" || handle === "tl" || handle === "bl") {
          nextX = isAlt ? initialX - (1600 - initialW) / 2 : initialX - (1600 - initialW);
        }
        nextW = 1600;
      }

      if (nextH < 24) {
        if (handle === "tc" || handle === "tl" || handle === "tr") {
          nextY = isAlt ? initialY + (initialH - 24) / 2 : initialY + initialH - 24;
        }
        nextH = 24;
      } else if (nextH > 1200) {
        if (handle === "tc" || handle === "tl" || handle === "tr") {
          nextY = isAlt ? initialY - (1200 - initialH) / 2 : initialY - (1200 - initialH);
        }
        nextH = 1200;
      }

      lastW = nextW;
      lastH = nextH;
      lastX = nextX;
      lastY = nextY;

      setResizingElement({
        elementId,
        handle,
        currentWidth: nextW,
        currentHeight: nextH,
        currentX: nextX,
        currentY: nextY,
        isShiftPressed: isShift,
        isAltPressed: isAlt,
        isMedia,
      });

      onResizeElement?.(elementId, nextW, nextH, nextX, nextY);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(ev.pointerId);
      } catch {}
      targetEl.removeEventListener("pointermove", onPointerMove);
      targetEl.removeEventListener("pointerup", onPointerUp);
      targetEl.removeEventListener("pointercancel", onPointerUp);

      if (hasMoved) {
        isResizingJustFinishedRef.current = true;
        setTimeout(() => {
          isResizingJustFinishedRef.current = false;
        }, 250);
      }

      onResizeElement?.(elementId, lastW, lastH, lastX, lastY);
      setResizingElement(null);
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
    let hasMoved = false;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startX) / zoomScale;
      const deltaY = (ev.clientY - startY) / zoomScale;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
      }

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

      if (hasMoved) {
        isResizingJustFinishedRef.current = true;
        setTimeout(() => {
          isResizingJustFinishedRef.current = false;
        }, 250);
      }

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
    const isThisElementResizing = resizingElement && resizingElement.elementId === el.id;
    const transform = el.transform;
    const effects = computeElementEffects(el.style, config.identity?.titleColor || "#ffffff");

    const currentW = isThisElementResizing
      ? resizingElement.currentWidth
      : (el.type === "avatar" ? (config.avatar?.size || transform.width || 96) : (transform.width || 120));
    const currentH = isThisElementResizing
      ? resizingElement.currentHeight
      : (el.type === "avatar" ? (config.avatar?.size || transform.height || 96) : (transform.height || 48));
    const currentX = isThisElementResizing
      ? resizingElement.currentX
      : (transform.x || 0);
    const currentY = isThisElementResizing
      ? resizingElement.currentY
      : (transform.y || 0);

    const isMedia = el.type === "image" || el.type === "thumbnail" || el.type === "avatar";
    const isChildElement = Boolean(el.parentEmbedId);

    const baseWrapperStyle: React.CSSProperties = {
      position: "relative",
      width: isChildElement
        ? (isThisElementResizing ? `${currentW}px` : (el.type === "avatar" ? `${currentW}px` : "100%"))
        : `${currentW}px`,
      maxWidth: "100%",
      boxSizing: "border-box",
      height: isThisElementResizing
        ? `${currentH}px`
        : (el.type === "avatar" || el.type === "image" || el.type === "thumbnail" || el.type === "banner"
            ? (transform.height ? `${transform.height}px` : undefined)
            : undefined),
      minHeight: isThisElementResizing
        ? `${currentH}px`
        : (isChildElement
            ? (el.type === "avatar" || el.type === "image" || el.type === "thumbnail" || el.type === "banner"
                ? (transform.height ? `${transform.height}px` : undefined)
                : undefined)
            : `${currentH}px`),
      transform: isChildElement
        ? (transform.rotation ? `rotate(${transform.rotation}deg)` : undefined)
        : `translate3d(${currentX}px, ${currentY}px, 0) rotate(${transform.rotation || 0}deg)`,
      zIndex: transform.zIndex || 2,
      cursor: isInteractive ? "pointer" : "default",
      transition: isThisElementResizing ? "none" : (effects.transition || "all 0.15s ease"),
      boxShadow: isSelected ? "0 0 14px rgba(56, 189, 248, 0.45)" : effects.boxShadow,
      background: effects.background,
      backdropFilter: effects.backdropFilter,
      animation: effects.animation,
      opacity: el.style?.opacity !== undefined ? el.style.opacity / 100 : undefined,
    };

    const handleClick = (e: React.MouseEvent) => {
      if (!isInteractive) return;
      if (isResizingJustFinishedRef.current) return;
      e.stopPropagation();
      onSelectElement?.(el.id);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (!isInteractive) return;
      if (isResizingJustFinishedRef.current) return;
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

    const renderElementResizeHandles = (
      targetElement: CanvasElement,
      width: number,
      height: number,
      posX: number,
      posY: number,
      isMediaType: boolean
    ) => {
      if (!isInteractive || selectedId !== targetElement.id || targetElement.isLocked) {
        return null;
      }
      return (
        <>
          {/* 4 Corner Handles */}
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "tl", width, height, posX, posY, isMediaType)
            }
            title="Resize Corner (NW) - Aspect ratio preserved for media"
            className="resize-handle absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nwse-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "tr", width, height, posX, posY, isMediaType)
            }
            title="Resize Corner (NE) - Aspect ratio preserved for media"
            className="resize-handle absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nesw-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "bl", width, height, posX, posY, isMediaType)
            }
            title="Resize Corner (SW) - Aspect ratio preserved for media"
            className="resize-handle absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nesw-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "br", width, height, posX, posY, isMediaType)
            }
            title="Resize Corner (SE) - Aspect ratio preserved for media"
            className="resize-handle absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-nwse-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />

          {/* 4 Edge Handles */}
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "tc", width, height, posX, posY, false)
            }
            title="Resize Height (North)"
            className="resize-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ns-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "bc", width, height, posX, posY, false)
            }
            title="Resize Height (South)"
            className="resize-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ns-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "ml", width, height, posX, posY, false)
            }
            title="Resize Width (West)"
            className="resize-handle absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ew-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />
          <div
            onPointerDown={(e) =>
              handleElementResizePointerDown(e, targetElement.id, "mr", width, height, posX, posY, false)
            }
            title="Resize Width (East)"
            className="resize-handle absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-sky-400 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] cursor-ew-resize hover:scale-125 transition-transform z-40 pointer-events-auto"
          />

          {/* Dimension Tag */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-sky-400 text-sky-300 font-mono text-[9px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-none select-none z-40 whitespace-nowrap">
            <span>{Math.round(width)} × {Math.round(height)} px</span>
            {isMediaType && (
              <>
                <span className="text-neutral-500">•</span>
                <span>{(width / Math.max(1, height)).toFixed(2)}:1</span>
              </>
            )}
          </div>
        </>
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
        textAlign: el.style?.textAlign || (layoutAlignment === "left" ? "left" : layoutAlignment === "right" ? "right" : "center"),
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
          data-element-id={el.id}
          data-element-type={el.type}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
          onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
          style={baseWrapperStyle}
          className={`relative flex items-center ${extraWrapperClass} ${outlineClasses}`}
        >
          {renderHoverBadge()}
          {renderElementResizeHandles(el, currentW, currentH, currentX, currentY, false)}
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
              className={`w-full select-none flex items-center gap-1.5 flex-wrap ${
                layoutAlignment === "left"
                  ? "justify-start"
                  : layoutAlignment === "right"
                  ? "justify-end"
                  : "justify-center"
              } ${el.style?.textOverflow === "truncate"
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

              {/* Inline badge variant for username/displayName if enabled and no standalone verification element exists */}
              {(el.type === "displayName" || el.type === "username") &&
                config.identity?.badgeStyle &&
                !elements.some((e) => e.type === "verificationBadge" && e.parentEmbedId === el.parentEmbedId) && (
                  <>
                    {config.identity.badgeStyle === "pill" && (
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-bold uppercase tracking-wider shrink-0">
                        VERIFIED ✓
                      </span>
                    )}
                    {config.identity.badgeStyle === "glyph" && (
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border border-white/60 text-white font-mono gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> (01)
                      </span>
                    )}
                    {config.identity.badgeStyle === "neon" && (
                      <span
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0"
                        style={{
                          backgroundColor: `${config.effects?.glowColor || "#22d3ee"}25`,
                          color: config.effects?.glowColor || "#22d3ee",
                          border: `1px solid ${config.effects?.glowColor || "#22d3ee"}`,
                          boxShadow: `0 0 10px ${config.effects?.glowColor || "#22d3ee"}40`,
                        }}
                      >
                        PRO &bull; LIVE
                      </span>
                    )}
                  </>
                )}
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

        const avatarSize = isThisElementResizing
          ? currentW
          : ((el.id === "avatar_1" || el.type === "avatar")
            ? (config.avatar?.size || transform.width || 96)
            : (transform.width || 96));

        const avatarAlignClass =
          (config.avatar?.alignment === "left" || (config.avatar?.alignment === undefined && layoutAlignment === "left"))
            ? "self-start"
            : (config.avatar?.alignment === "right" || (config.avatar?.alignment === undefined && layoutAlignment === "right"))
            ? "self-end"
            : "self-center";

        return (
          <div
            key={el.id}
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, width: `${avatarSize}px`, minHeight: `${avatarSize}px`, height: `${avatarSize}px` }}
            className={`relative flex items-center justify-center p-1 rounded-2xl shrink-0 ${avatarAlignClass} ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, avatarSize, avatarSize, currentX, currentY, true)}
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
      case "username": {
        const nameText = (el.type === "displayName" ? displayName : username) || "User";
        const textJustify = layoutAlignment === "left" ? "justify-start" : layoutAlignment === "right" ? "justify-end" : "justify-center";
        return renderEditableTextNode(
          nameText,
          false,
          `py-0.5 px-2 ${textJustify}`
        );
      }

      case "title":
      case "heading": {
        const textJustify = layoutAlignment === "left" ? "justify-start" : layoutAlignment === "right" ? "justify-end" : "justify-center";
        return renderEditableTextNode("Heading Title", false, `py-0.5 px-2 ${textJustify}`);
      }

      case "subtitle":
      case "tagline": {
        const textJustify = layoutAlignment === "left" ? "justify-start" : layoutAlignment === "right" ? "justify-end" : "justify-center";
        return renderEditableTextNode("Digital Identity // Nothing OS", false, `py-0.5 px-2 ${textJustify}`);
      }

      case "bio":
      case "description":
      case "text": {
        const textJustify = layoutAlignment === "left" ? "justify-start" : layoutAlignment === "right" ? "justify-end" : "justify-center";
        return renderEditableTextNode(
          el.type === "bio" ? (bio || el.props?.text || "Biography text...") : (el.props?.text || "Custom text content..."),
          true,
          `p-1 rounded-xl ${textJustify}`
        );
      }

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
            data-element-id={el.id}
            data-element-type={el.type}
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
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={baseWrapperStyle}
            className={`relative w-full ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, currentW, currentH, currentX, currentY, false)}
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
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 10}px` }}
            className={`relative w-full flex flex-col p-1 ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, currentW, currentH, currentX, currentY, false)}
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
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, gap: `${config.layout?.appsSpacing ?? 12}px` }}
            className={`relative w-full flex items-center justify-center py-2 flex-wrap ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, currentW, currentH, currentX, currentY, false)}
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
            data-element-id={el.id}
            data-element-type={el.type}
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
            data-element-id={el.id}
            data-element-type={el.type}
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
            data-element-id={el.id}
            data-element-type={el.type}
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
        const bannerH = isThisElementResizing ? currentH : (transform.height || 140);
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{ ...baseWrapperStyle, width: "100%", height: `${bannerH}px`, minHeight: `${bannerH}px` }}
            className={`relative overflow-hidden rounded-xl shadow-lg ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, 580, bannerH, currentX, currentY, false)}
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
        const imgH = isThisElementResizing ? currentH : (transform.height || 200);
        const imgW = isThisElementResizing ? currentW : (transform.width || (el.parentEmbedId ? "100%" : 300));
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            data-element-type={el.type}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => isInteractive && setHoveredElementId(el.id)}
            onPointerLeave={() => isInteractive && setHoveredElementId((prev) => (prev === el.id ? null : prev))}
            style={{
              ...baseWrapperStyle,
              width: typeof imgW === "number" ? `${imgW}px` : imgW,
              height: `${imgH}px`,
              minHeight: `${imgH}px`,
            }}
            className={`relative overflow-hidden rounded-xl shadow-lg ${outlineClasses}`}
          >
            {renderHoverBadge()}
            {renderElementResizeHandles(el, typeof imgW === "number" ? imgW : 300, imgH, currentX, currentY, true)}
            <img
              src={src}
              alt={el.name}
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                objectFit: el.style?.objectFit || "cover",
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
            data-element-id={el.id}
            data-element-type={el.type}
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
            data-element-id={el.id}
            data-element-type={el.type}
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
        <div className="flex flex-col w-full" style={{ gap: `${layoutGap}px` }}>
          {embedElements.map(renderElement)}
        </div>
      );
    }

    const preset = config.layout?.preset || "centered";
    const alignment = layoutAlignment;
    const gap = layoutGap;

    const getCanonicalOrder = (type: string): number => {
      switch (type) {
        case "banner": return 5;
        case "avatar": return 10;
        case "displayName":
        case "username": return 20;
        case "verificationBadge": return 22;
        case "tagline":
        case "subtitle": return 30;
        case "bio":
        case "description": return 40;
        case "rpc": return 50;
        case "music": return 60;
        case "button": return 70;
        case "socials":
        case "socialIcon":
        case "linkedAccount": return 80;
        case "divider": return 85;
        case "footerText":
        case "timestamp": return 90;
        default: return 65;
      }
    };

    const orderedElements = [...embedElements].sort((a, b) => {
      const idxA = embed.childrenIds?.indexOf(a.id) ?? -1;
      const idxB = embed.childrenIds?.indexOf(b.id) ?? -1;
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return getCanonicalOrder(a.type) - getCanonicalOrder(b.type);
    });

    // 1. Minimal Card Split: Balanced 2-column layout (Left = Identity, Right = Activity & Content)
    if (preset === "split") {
      const identityElements = orderedElements.filter((el) => isIdentityElement(el.type));
      const contentElements = orderedElements.filter((el) => !isIdentityElement(el.type));

      const colAlignClass =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
          ? "items-end text-right"
          : "items-center text-center";

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          <div className={`flex flex-col w-full ${colAlignClass}`} style={{ gap: `${Math.round(gap * 0.6)}px` }}>
            {identityElements.map(renderElement)}
          </div>
          <div className="flex flex-col w-full" style={{ gap: `${gap}px` }}>
            {contentElements.map(renderElement)}
          </div>
        </div>
      );
    }

    // 2. Minimal Card Wide: Horizontal header banner with wide distribution
    if (preset === "wide") {
      const avatarEl = orderedElements.find((el) => el.type === "avatar");
      const nameEl = orderedElements.find((el) => el.type === "displayName" || el.type === "username");
      const taglineEl = orderedElements.find((el) => el.type === "subtitle" || el.type === "tagline");
      const bioEl = orderedElements.find((el) => el.type === "bio" || el.type === "description");
      const rpcEl = orderedElements.find((el) => el.type === "rpc");
      const buttonEls = orderedElements.filter((el) => el.type === "button");
      const socialEls = orderedElements.filter(
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
      const otherEls = orderedElements.filter((el) => !handledIds.has(el.id));

      const headerAlign =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
          ? "items-end text-right"
          : "items-center text-center sm:items-start sm:text-left";

      return (
        <div className="flex flex-col w-full" style={{ gap: `${gap}px` }}>
          {/* Top Row: Horizontal Avatar + Identity header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full pb-3 border-b border-white/10">
            {avatarEl && <div className="shrink-0">{renderElement(avatarEl)}</div>}
            <div className={`flex-1 flex flex-col min-w-0 ${headerAlign}`} style={{ gap: "6px" }}>
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
      const avatarEl = orderedElements.find((el) => el.type === "avatar");
      const nameEl = orderedElements.find((el) => el.type === "displayName" || el.type === "username");
      const taglineEl = orderedElements.find((el) => el.type === "subtitle" || el.type === "tagline");
      const bioEl = orderedElements.find((el) => el.type === "bio" || el.type === "description");
      const handledIds = new Set([avatarEl?.id, nameEl?.id, taglineEl?.id, bioEl?.id].filter(Boolean));
      const remainingEls = orderedElements.filter((el) => !handledIds.has(el.id));
      const compactGap = Math.max(8, Math.round(gap * 0.5));

      return (
        <div className="flex flex-col w-full" style={{ gap: `${compactGap}px` }}>
          {/* Ultra-compact inline header */}
          <div className="flex items-center gap-3.5 w-full pb-2 border-b border-white/10">
            {avatarEl && (
              <div className="shrink-0 scale-85 origin-left">
                {renderElement(avatarEl)}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "2px" }}>
              {nameEl && renderElement(nameEl)}
              {taglineEl && renderElement(taglineEl)}
            </div>
          </div>

          {bioEl && <div className="w-full">{renderElement(bioEl)}</div>}

          <div className="flex flex-col w-full" style={{ gap: `${compactGap}px` }}>
            {remainingEls.map(renderElement)}
          </div>
        </div>
      );
    }

    // 4. Standard Linear (Center, Left, Right, Card, Minimal, Glass, Custom)
    const alignClass =
      alignment === "left"
        ? "items-start text-left"
        : alignment === "right"
        ? "items-end text-right"
        : "items-center text-center";

    // Group consecutive header elements (name, badge, tagline) with tight sub-gap
    const identitySubGap = Math.min(8, Math.max(2, Math.round(gap * 0.2)));
    const renderedNodes: React.ReactNode[] = [];
    let i = 0;
    while (i < orderedElements.length) {
      const el = orderedElements[i];

      const isName = el.type === "displayName" || el.type === "username";
      if (isName) {
        const next1 = orderedElements[i + 1];
        const next2 = orderedElements[i + 2];
        const isNext1Tagline = next1 && (next1.type === "tagline" || next1.type === "subtitle");
        const isNext1Badge = next1 && next1.type === "verificationBadge";
        const isNext2Tagline = isNext1Badge && next2 && (next2.type === "tagline" || next2.type === "subtitle");

        if (isNext1Tagline) {
          renderedNodes.push(
            <div
              key={`header_group_${el.id}`}
              className={`flex flex-col w-full ${alignClass}`}
              style={{ gap: `${identitySubGap}px` }}
            >
              {renderElement(el)}
              {renderElement(next1)}
            </div>
          );
          i += 2;
          continue;
        } else if (isNext2Tagline) {
          renderedNodes.push(
            <div
              key={`header_group_${el.id}`}
              className={`flex flex-col w-full ${alignClass}`}
              style={{ gap: `${identitySubGap}px` }}
            >
              {renderElement(el)}
              {renderElement(next1)}
              {renderElement(next2)}
            </div>
          );
          i += 3;
          continue;
        }
      }

      renderedNodes.push(renderElement(el));
      i++;
    }

    return (
      <div
        className={`flex flex-col w-full ${alignClass}`}
        style={{ gap: `${gap}px` }}
      >
        {renderedNodes}
      </div>
    );
  };

  return (
    <div
      data-studio-canvas="true"
      onClick={(e) => {
        if (!isInteractive) return;
        if (isResizingJustFinishedRef.current) return;
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
        const resolvedHeight = isThisResizing
          ? `${resizingEmbed.currentHeight}px`
          : (!isAutoHeight && currentH ? `${currentH}px` : undefined);
        const resolvedMinHeight = isThisResizing
          ? `${resizingEmbed.currentHeight}px`
          : (isAutoHeight
              ? (embedElements.length === 0 ? "180px" : undefined)
              : (config.layout?.height ? `${config.layout.height}px` : `${currentH}px`));
        const resolvedMaxHeight = isThisResizing
          ? `${resizingEmbed.currentHeight}px`
          : (!isAutoHeight && currentH ? `${currentH}px` : undefined);

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
            data-embed-id={embed.id}
            onClick={(e) => {
              if (!isInteractive) return;
              if (isResizingJustFinishedRef.current) return;
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
              height: resolvedHeight,
              minHeight: resolvedMinHeight,
              maxHeight: resolvedMaxHeight,
              overflow: "visible",
              boxSizing: "border-box",
              margin: "0 auto 32px auto",
              transform: `translate3d(${currentX}px, ${currentY}px, 0) rotate(${embed.transform.rotation || 0}deg)`,
              zIndex: embed.transform.zIndex || 1,
              backgroundColor: resolvedEmbedBg,
              border: isHiddenInEditor
                ? "1px dashed rgba(255, 255, 255, 0.4)"
                : `${embed.style.borderWidth ?? 1}px solid ${embed.style.borderColor || "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: `${embed.id === "embed_primary" ? (config.discordRpc?.borderRadius ?? embed.style.borderRadius ?? 24) : (embed.style.borderRadius ?? 24)}px`,
              padding: `${embed.id === "embed_primary" ? ((isThisResizing ? effectivePadding : config.layout?.padding) ?? embed.style.padding ?? 24) : (embed.style.padding ?? 24)}px`,
              opacity: isHiddenInEditor ? 0.35 : undefined,
              boxShadow: isSelectedEmbed
                ? "0 0 24px rgba(251, 191, 36, 0.55), inset 0 0 12px rgba(251, 191, 36, 0.15)"
                : effects.boxShadow,
              backdropFilter: resolvedBackdropFilter,
              animation: effects.animation,
              transition: (isThisResizing || isThisMoving) ? "none" : (effects.transition || "all 0.15s ease"),
              cursor: isInteractive ? (embed.isLocked ? "not-allowed" : (isSelectedEmbed ? "move" : "pointer")) : "default",
            }}
            className={`w-full max-w-full select-none ${isSelectedEmbed
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
                  top: currentY < 60 ? "calc(100% + 18px)" : "-56px",
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
                {/* 4 Corner Handles: Full Proportional Embed Scaling */}
                <div
                  data-handle="tl"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tl", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (NW) - Scales embed & internal content proportionally (Anchors SE corner)"
                  className="resize-handle group absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-55 pointer-events-auto"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-[3px] shadow-[0_1px_5px_rgba(0,0,0,0.7)] group-hover:scale-125 group-hover:bg-amber-100 transition-transform" />
                </div>
                <div
                  data-handle="tr"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tr", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (NE) - Scales embed & internal content proportionally (Anchors SW corner)"
                  className="resize-handle group absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-55 pointer-events-auto"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-[3px] shadow-[0_1px_5px_rgba(0,0,0,0.7)] group-hover:scale-125 group-hover:bg-amber-100 transition-transform" />
                </div>
                <div
                  data-handle="bl"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "bl", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (SW) - Scales embed & internal content proportionally (Anchors NE corner)"
                  className="resize-handle group absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-55 pointer-events-auto"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-[3px] shadow-[0_1px_5px_rgba(0,0,0,0.7)] group-hover:scale-125 group-hover:bg-amber-100 transition-transform" />
                </div>
                <div
                  data-handle="br"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "br", currentW, currentH, currentX, currentY)}
                  title="Resize Corner (SE) - Scales embed & internal content proportionally (Anchors NW corner)"
                  className="resize-handle group absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-55 pointer-events-auto"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-[3px] shadow-[0_1px_5px_rgba(0,0,0,0.7)] group-hover:scale-125 group-hover:bg-amber-100 transition-transform" />
                </div>

                {/* 4 Edge Handles: Internal Spacing Adjusters (Outer Dimensions Fixed) */}
                <div
                  data-handle="tc"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "tc", currentW, currentH, currentX, currentY)}
                  title="Adjust Vertical Spacing (Top) - Drag to adjust element gap (Fixed outer dimensions)"
                  className="resize-handle group absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center cursor-ns-resize z-55 pointer-events-auto"
                >
                  <div className="w-5 h-2 bg-neutral-900 border border-cyan-400 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.7)] group-hover:bg-cyan-500/30 group-hover:border-cyan-300 transition-all" />
                </div>
                <div
                  data-handle="bc"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "bc", currentW, currentH, currentX, currentY)}
                  title="Adjust Vertical Spacing (Bottom) - Drag to adjust element gap (Fixed outer dimensions)"
                  className="resize-handle group absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center cursor-ns-resize z-55 pointer-events-auto"
                >
                  <div className="w-5 h-2 bg-neutral-900 border border-cyan-400 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.7)] group-hover:bg-cyan-500/30 group-hover:border-cyan-300 transition-all" />
                </div>
                <div
                  data-handle="ml"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "ml", currentW, currentH, currentX, currentY)}
                  title="Adjust Horizontal Spacing (Left) - Drag to adjust container padding (Fixed outer dimensions)"
                  className="resize-handle group absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-7 flex items-center justify-center cursor-ew-resize z-55 pointer-events-auto"
                >
                  <div className="w-2 h-5 bg-neutral-900 border border-cyan-400 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.7)] group-hover:bg-cyan-500/30 group-hover:border-cyan-300 transition-all" />
                </div>
                <div
                  data-handle="mr"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={(e) => handleResizePointerDown(e, embed.id, "mr", currentW, currentH, currentX, currentY)}
                  title="Adjust Horizontal Spacing (Right) - Drag to adjust container padding (Fixed outer dimensions)"
                  className="resize-handle group absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 flex items-center justify-center cursor-ew-resize z-55 pointer-events-auto"
                >
                  <div className="w-2 h-5 bg-neutral-900 border border-cyan-400 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.7)] group-hover:bg-cyan-500/30 group-hover:border-cyan-300 transition-all" />
                </div>

                {/* Floating Dimension & Spacing Tag */}
                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#121216]/95 backdrop-blur-md border border-neutral-700/80 text-neutral-200 font-mono text-[10px] font-bold shadow-xl flex items-center gap-2 pointer-events-none select-none z-55 whitespace-nowrap">
                  {resizingEmbed?.isSideSpacing ? (
                    resizingEmbed.handle === "tc" || resizingEmbed.handle === "bc" ? (
                      <span className="text-cyan-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Vertical Spacing (Gap): {resizingEmbed.currentGap}px
                      </span>
                    ) : (
                      <span className="text-cyan-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Horizontal Spacing (Padding): {resizingEmbed.currentPadding}px
                      </span>
                    )
                  ) : (
                    <>
                      <span className="text-amber-400">{Math.round(currentW)} × {Math.round(currentH)} px</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-300">{Math.round((resizingEmbed?.scaleFactor ?? 1) * 100)}%</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-400">{(currentW / Math.max(1, currentH)).toFixed(2)}:1</span>
                      {resizingEmbed?.isShiftPressed && (
                        <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[8px] uppercase">
                          SHIFT: LOCKED
                        </span>
                      )}
                      {resizingEmbed?.isAltPressed && (
                        <span className="bg-cyan-500/20 text-cyan-400 px-1 rounded text-[8px] uppercase">
                          ALT: SYMMETRIC
                        </span>
                      )}
                    </>
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
