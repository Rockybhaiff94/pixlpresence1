"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutTemplate,
  Type,
  Shapes,
  Sparkles,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  PaintBucket,
  Layers,
  Move,
  Lock,
  Unlock,
  GripHorizontal,
  GripVertical,
  Check,
} from "lucide-react";
import { StudioTab } from "@/types/studio";
import { StudioView } from "./StudioTopBar";
import { DockPortalTooltip, DockTooltipData } from "./DockPortalTooltip";

export type DockMode = "main" | "directory" | "settings";
export type DockPosition = "bottom" | "top" | "left" | "right" | "float";
export type DockOrientation = "horizontal" | "vertical";

export interface ToolSelection {
  type: "category" | "view";
  id: StudioTab | StudioView | string;
  label: string;
}

export interface StudioFloatingDockProps {
  position: DockPosition;
  onPositionChange: (pos: DockPosition) => void;
  activeCategory?: StudioTab;
  currentView?: StudioView;
  isSettingsOpen?: boolean;
  onSelectTool?: (tool: ToolSelection) => void;
  onCloseSettings?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  themeAccentColor?: string;

  // Editor tools integration
  activeTool?: string | null;
  onToggleTool?: (tool: string) => void;

  // Direct actions invoked from App Directory
  onAddEmbed?: () => void;
  onAddElement?: (type: any) => void;
  onOpenSocialSelector?: () => void;
  onOpenRpcCustomizer?: () => void;

  // Controlled dock mode (optional)
  dockMode?: DockMode;
  onDockModeChange?: (mode: DockMode) => void;

  // Integrated settings content
  children?: React.ReactNode;

  // Customization & Lock Enhancements
  dockLockShortcut?: string;
  isDockLocked?: boolean;
  onDockLockChange?: (locked: boolean) => void;
  moreOptionsPanelSize?: number;
  snapThreshold?: number; // In px (150–190px range)
}

// Utility: format shortcut display for human readability
export const formatShortcutDisplay = (shortcut?: string): string => {
  if (!shortcut) return "CAPS LOCK";
  if (shortcut.toLowerCase() === "capslock") return "CAPS LOCK";
  return shortcut;
};

// Utility: match incoming keyboard event to assigned shortcut
export const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
  if (!shortcut) return false;
  const s = shortcut.trim();
  if (s.toLowerCase() === "capslock") {
    return e.code === "CapsLock" || e.key === "CapsLock";
  }

  const parts = s.split("+").map((p) => p.trim().toLowerCase());
  const hasCtrl = parts.includes("ctrl") || parts.includes("control");
  const hasShift = parts.includes("shift");
  const hasAlt = parts.includes("alt");
  const hasMeta = parts.includes("meta") || parts.includes("cmd") || parts.includes("command");

  if (hasCtrl !== (e.ctrlKey || (!hasMeta && e.metaKey))) return false;
  if (hasShift !== e.shiftKey) return false;
  if (hasAlt !== e.altKey) return false;

  const keyPart = parts.find(
    (p) => !["ctrl", "control", "shift", "alt", "meta", "cmd", "command"].includes(p)
  );
  if (!keyPart) return false;

  return (
    e.key.toLowerCase() === keyPart.toLowerCase() ||
    e.code.toLowerCase() === keyPart.toLowerCase()
  );
};

// 1. Primary 5 Tool Definitions (Default collapsed dock)
export const PRIMARY_DOCK_TOOLS = [
  { id: "templates", label: "Templates", icon: LayoutTemplate, desc: "Starter templates & layouts" },
  { id: "text", label: "Text", icon: Type, desc: "Add typography & headings" },
  { id: "shapes", label: "Shapes", icon: Shapes, desc: "Vector shapes, lines & arrows" },
  { id: "elements", label: "Elements", icon: Sparkles, desc: "Graphics, stickers & badges" },
  { id: "media", label: "Media", icon: UploadCloud, desc: "Upload files & media images" },
] as const;

// 2. Additional Tools (Revealed when expanded in matching orientation)
export const ADDITIONAL_DOCK_TOOLS = [
  { id: "canvas", label: "Canvas", icon: PaintBucket, desc: "Canvas color, dot-matrix & patterns" },
  { id: "layers", label: "Layers", icon: Layers, desc: "Manage layers & z-order hierarchy" },
] as const;

export const StudioFloatingDock: React.FC<StudioFloatingDockProps> = ({
  position: externalPosition,
  onPositionChange,
  activeTool,
  onToggleTool,
  onSelectTool,
  containerRef,
  dockLockShortcut: propShortcut,
  isDockLocked: propLocked,
  onDockLockChange,
  snapThreshold: propSnapThreshold,
}) => {
  // Expansion State: Collapsed by default (5 primary tools), expands in current orientation
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showPlacementFlyout, setShowPlacementFlyout] = useState<boolean>(false);

  const [dockTooltip, setDockTooltip] = useState<DockTooltipData | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(
    (
      e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
      data: {
        id: string;
        label: string;
        desc?: string;
        hotkey?: string;
        preferredSide?: "top" | "bottom" | "left" | "right";
      }
    ) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setDockTooltip({
        id: data.id,
        label: data.label,
        desc: data.desc,
        hotkey: data.hotkey,
        targetRect: rect,
        preferredSide: data.preferredSide,
      });
    },
    []
  );

  const hideTooltip = useCallback(() => {
    setDockTooltip(null);
  }, []);

  // Dismiss tooltip on scroll or resize
  useEffect(() => {
    if (!dockTooltip) return;
    const handleDismiss = () => setDockTooltip(null);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [dockTooltip]);

  // Position & Edge Attachment State
  const [edge, setEdge] = useState<DockPosition>(externalPosition || "bottom");
  const [ratio, setRatio] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // SINGLE SOURCE OF TRUTH FOR ORIENTATION:
  // Top and Bottom force "horizontal".
  // Left and Right force "vertical".
  // Floating preserves the last chosen orientation.
  const [orientation, setOrientation] = useState<DockOrientation>(() => {
    if (externalPosition === "left" || externalPosition === "right") return "vertical";
    if (externalPosition === "top" || externalPosition === "bottom") return "horizontal";
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pixel_studio_dock_orientation") as DockOrientation;
        if (saved === "horizontal" || saved === "vertical") return saved;
      } catch {}
    }
    return "horizontal";
  });

  // Unified single source of truth boolean read by container, children, and measurements
  const isVertical = orientation === "vertical";

  // Customizable Lock State & Shortcut
  const [isLocked, setIsLocked] = useState<boolean>(propLocked ?? false);
  const [lockShortcut, setLockShortcut] = useState<string>(propShortcut || "CapsLock");

  // Snapping distance threshold (default ~175px calibrated to 150–190 CSS pixels)
  const snapThreshold = propSnapThreshold ?? 175;

  // Function to atomically update edge and enforce orientation rule
  const updateEdgeAndOrientation = useCallback(
    (newEdge: DockPosition) => {
      setEdge(newEdge);
      onPositionChange(newEdge);

      if (newEdge === "top" || newEdge === "bottom") {
        setOrientation("horizontal");
        try {
          localStorage.setItem("pixel_studio_dock_orientation", "horizontal");
        } catch {}
      } else if (newEdge === "left" || newEdge === "right") {
        setOrientation("vertical");
        try {
          localStorage.setItem("pixel_studio_dock_orientation", "vertical");
        } catch {}
      }
      // "float" preserves existing orientation!

      try {
        localStorage.setItem("pixel_studio_dock_position", newEdge);
      } catch {}
    },
    [onPositionChange]
  );

  // Sync external position changes into internal edge state
  useEffect(() => {
    if (externalPosition && externalPosition !== edge && !dragState.isDragging) {
      updateEdgeAndOrientation(externalPosition);
    }
  }, [externalPosition, edge, updateEdgeAndOrientation]);

  // Sync prop changes for lock and shortcut
  useEffect(() => {
    if (propLocked !== undefined) setIsLocked(propLocked);
  }, [propLocked]);

  useEffect(() => {
    if (propShortcut) setLockShortcut(propShortcut);
  }, [propShortcut]);

  // Unified Atomic Drag State Machine
  interface DragState {
    isDragging: boolean;
    currentPos: { x: number; y: number } | null;
  }
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    currentPos: null,
  });
  const isDragging = dragState.isDragging;
  const dragCurrentPos = dragState.currentPos;
  const isPointerDownRef = useRef(false);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartDockPosRef = useRef({ x: 0, y: 0 });
  const hasMovedPastThresholdRef = useRef(false);

  // Re-render trigger on window / container resize
  const [, setResizeTick] = useState(0);

  // Restore saved dock position & coordinates from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedCoords = localStorage.getItem("pixel_studio_dock_coords");
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (parsed.edge) {
          updateEdgeAndOrientation(parsed.edge);
        }
        if (typeof parsed.ratioX === "number" && typeof parsed.ratioY === "number") {
          setRatio({ x: parsed.ratioX, y: parsed.ratioY });
        }
      } else {
        const savedPos = localStorage.getItem("pixel_studio_dock_position") as DockPosition;
        if (savedPos) {
          updateEdgeAndOrientation(savedPos);
        }
      }

      const savedLock = localStorage.getItem("pixel_studio_dock_locked");
      if (savedLock !== null) {
        setIsLocked(savedLock === "true");
      }
      const savedShortcut = localStorage.getItem("pixel_studio_dock_lock_shortcut");
      if (savedShortcut) {
        setLockShortcut(savedShortcut);
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut listener to toggle Dock Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (matchesShortcut(e, lockShortcut)) {
        e.preventDefault();
        setIsLocked((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("pixel_studio_dock_locked", String(next));
          } catch {}
          onDockLockChange?.(next);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lockShortcut, onDockLockChange]);

  // Window & Container Resize Observer
  useEffect(() => {
    const handleResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [containerRef]);

  // Close flyouts on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setShowPlacementFlyout(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Check if a tool is currently active
  const isToolActive = (toolId: string) => {
    if (!activeTool) return false;
    if (toolId === "media" && (activeTool === "media" || activeTool === "images")) return true;
    if (toolId === "canvas" && (activeTool === "canvas" || activeTool === "background")) return true;
    return activeTool === toolId;
  };

  // Tool Click Handler
  const handleToolClick = (toolId: string) => {
    if (toolId === "media") {
      onToggleTool?.("images");
    } else if (toolId === "canvas") {
      onToggleTool?.("background");
    } else {
      onToggleTool?.(toolId);
    }
    onSelectTool?.({
      type: "category",
      id: toolId,
      label: toolId.charAt(0).toUpperCase() + toolId.slice(1),
    });
  };

  // ========================================================
  // CORE POINTER DRAG & INTELLIGENT EDGE SNAPPING SYSTEM
  // ========================================================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isLocked) return;

    const target = e.target as HTMLElement;
    const isMoveControl = target.closest('[data-dock-move-handle="true"]');
    if (!isMoveControl) return;

    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      return;
    }

    const dockEl = dockRef.current;
    if (!dockEl) return;

    const rect = dockEl.getBoundingClientRect();
    const container = containerRef?.current || document.body;
    const containerRect = container.getBoundingClientRect();

    dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
    dragStartDockPosRef.current = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
    };
    hasMovedPastThresholdRef.current = false;
    isPointerDownRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || isLocked) {
      if (isDragging) {
        setDragState({ isDragging: false, currentPos: null });
      }
      return;
    }

    const dx = e.clientX - dragStartPointerRef.current.x;
    const dy = e.clientY - dragStartPointerRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (!hasMovedPastThresholdRef.current && dist >= 5) {
      hasMovedPastThresholdRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }

    if (hasMovedPastThresholdRef.current) {
      const container = containerRef?.current || document.body;
      const containerRect = container.getBoundingClientRect();
      const dockEl = dockRef.current;
      const dockWidth = dockEl?.offsetWidth || (isVertical ? 44 : 290);
      const dockHeight = dockEl?.offsetHeight || (isVertical ? 290 : 44);

      const newX = Math.max(
        0,
        Math.min(containerRect.width - dockWidth, dragStartDockPosRef.current.x + dx)
      );
      const newY = Math.max(
        0,
        Math.min(containerRect.height - dockHeight, dragStartDockPosRef.current.y + dy)
      );

      setDragState({
        isDragging: true,
        currentPos: { x: newX, y: newY },
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedPastThresholdRef.current) {
      const container = containerRef?.current || document.body;
      const containerRect = container.getBoundingClientRect();
      const dockEl = dockRef.current;
      if (!dockEl) {
        setDragState({ isDragging: false, currentPos: null });
        return;
      }

      const dockRect = dockEl.getBoundingClientRect();

      const distTop = Math.abs(dockRect.top - containerRect.top);
      const distBottom = Math.abs(containerRect.bottom - dockRect.bottom);
      const distLeft = Math.abs(dockRect.left - containerRect.left);
      const distRight = Math.abs(containerRect.right - dockRect.right);

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      let newEdge: DockPosition = "float";
      if (minDist <= snapThreshold) {
        if (minDist === distBottom) {
          newEdge = "bottom";
          setOrientation("horizontal");
        } else if (minDist === distTop) {
          newEdge = "top";
          setOrientation("horizontal");
        } else if (minDist === distLeft) {
          newEdge = "left";
          setOrientation("vertical");
        } else {
          newEdge = "right";
          setOrientation("vertical");
        }
      } else {
        newEdge = "float";
        // Floating preserves existing orientation!
      }

      const maxAvailableX = Math.max(1, containerRect.width - dockRect.width);
      const maxAvailableY = Math.max(1, containerRect.height - dockRect.height);

      const ratioX = Math.max(0, Math.min(1, (dockRect.left - containerRect.left) / maxAvailableX));
      const ratioY = Math.max(0, Math.min(1, (dockRect.top - containerRect.top) / maxAvailableY));

      setEdge(newEdge);
      setRatio({ x: ratioX, y: ratioY });
      setDragState({ isDragging: false, currentPos: null });

      onPositionChange(newEdge);

      try {
        localStorage.setItem("pixel_studio_dock_position", newEdge);
        localStorage.setItem(
          "pixel_studio_dock_coords",
          JSON.stringify({ edge: newEdge, ratioX, ratioY })
        );
        localStorage.setItem(
          "pixel_studio_dock_orientation",
          newEdge === "top" || newEdge === "bottom"
            ? "horizontal"
            : newEdge === "left" || newEdge === "right"
            ? "vertical"
            : orientation
        );
      } catch {}
    } else {
      setDragState({ isDragging: false, currentPos: null });
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedPastThresholdRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // ========================================================
  // POSITION-AWARE DOCK & UNIFIED ORIENTATION CALCULATIONS
  // ========================================================

  const currentContainerWidth = containerRef?.current
    ? containerRef.current.clientWidth
    : typeof window !== "undefined"
    ? window.innerWidth
    : 1200;
  const currentContainerHeight = containerRef?.current
    ? containerRef.current.clientHeight
    : typeof window !== "undefined"
    ? window.innerHeight
    : 800;

  const computeDockStyle = (): React.CSSProperties => {
    const containerWidth = currentContainerWidth;
    const containerHeight = currentContainerHeight;

    // While dragging: follow pointer directly with zero transition delay
    if (isDragging && dragCurrentPos) {
      return {
        position: "absolute",
        left: `${dragCurrentPos.x}px`,
        top: `${dragCurrentPos.y}px`,
        transition: "none",
        zIndex: 50,
        touchAction: "none",
      };
    }

    // Single source of truth dimensions:
    // Horizontal mode: height is 44px, width expands horizontally (290px -> 440px)
    // Vertical mode: width is 44px, height expands vertically (290px -> 440px)
    const collapsedWidth = isVertical ? 44 : 290;
    const collapsedHeight = isVertical ? 290 : 44;
    const expandedWidth = isVertical ? 44 : Math.min(containerWidth - 16, 440);
    const expandedHeight = isVertical ? Math.min(containerHeight - 16, 440) : 44;

    const dockWidth = isExpanded ? expandedWidth : collapsedWidth;
    const dockHeight = isExpanded ? expandedHeight : collapsedHeight;

    const baseTransition =
      "left 220ms cubic-bezier(0.16, 1, 0.3, 1), top 220ms cubic-bezier(0.16, 1, 0.3, 1), width 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 180ms ease, box-shadow 180ms ease";

    const maxX = Math.max(0, containerWidth - dockWidth);
    const maxY = Math.max(0, containerHeight - dockHeight);
    const dockLeft = Math.max(8, Math.min(maxX - 8, ratio.x * maxX));
    const dockTop = Math.max(8, Math.min(maxY - 8, ratio.y * maxY));

    // Bottom edge attachment (Horizontal layout)
    if (edge === "bottom") {
      return {
        position: "absolute",
        bottom: 0,
        left: `${dockLeft}px`,
        top: "auto",
        right: "auto",
        width: `${dockWidth}px`,
        height: `${dockHeight}px`,
        transition: baseTransition,
        zIndex: 40,
        touchAction: "none",
      };
    }

    // Top edge attachment (Horizontal layout)
    if (edge === "top") {
      return {
        position: "absolute",
        top: 0,
        left: `${dockLeft}px`,
        bottom: "auto",
        right: "auto",
        width: `${dockWidth}px`,
        height: `${dockHeight}px`,
        transition: baseTransition,
        zIndex: 40,
        touchAction: "none",
      };
    }

    // Left edge attachment (Vertical layout)
    if (edge === "left") {
      return {
        position: "absolute",
        left: 0,
        top: `${dockTop}px`,
        right: "auto",
        bottom: "auto",
        width: `${dockWidth}px`,
        height: `${dockHeight}px`,
        transition: baseTransition,
        zIndex: 40,
        touchAction: "none",
      };
    }

    // Right edge attachment (Vertical layout)
    if (edge === "right") {
      return {
        position: "absolute",
        right: 0,
        top: `${dockTop}px`,
        left: "auto",
        bottom: "auto",
        width: `${dockWidth}px`,
        height: `${dockHeight}px`,
        transition: baseTransition,
        zIndex: 40,
        touchAction: "none",
      };
    }

    // Float mode (Preserves current orientation)
    return {
      position: "absolute",
      left: `${dockLeft}px`,
      top: `${dockTop}px`,
      right: "auto",
      bottom: "auto",
      width: `${dockWidth}px`,
      height: `${dockHeight}px`,
      transition: baseTransition,
      zIndex: 40,
      touchAction: "none",
    };
  };

  const getCornerClasses = () => {
    if (isDragging || edge === "float") {
      return "rounded-2xl border border-white/15";
    }
    switch (edge) {
      case "bottom":
        return "rounded-t-2xl rounded-b-none border-b-0";
      case "top":
        return "rounded-b-2xl rounded-t-none border-t-0";
      case "left":
        return "rounded-r-2xl rounded-l-none border-l-0";
      case "right":
        return "rounded-l-2xl rounded-r-none border-r-0";
      default:
        return "rounded-2xl border border-white/15";
    }
  };

  const getShadowClass = () => {
    if (isDragging) {
      return "shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/20";
    }
    switch (edge) {
      case "bottom":
        return "shadow-[0_-8px_30px_rgba(0,0,0,0.7)]";
      case "top":
        return "shadow-[0_8px_30px_rgba(0,0,0,0.7)]";
      case "left":
        return "shadow-[8px_0_30px_rgba(0,0,0,0.7)]";
      case "right":
        return "shadow-[-8px_0_30px_rgba(0,0,0,0.7)]";
      case "float":
      default:
        return "shadow-[0_20px_50px_rgba(0,0,0,0.8)]";
    }
  };

  return (
    <div
      ref={dockRef}
      style={computeDockStyle()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
      className={`select-none font-mono pointer-events-auto ${
        isDragging ? "cursor-grabbing" : ""
      }`}
      data-testid="studio-floating-dock"
      data-dock-orientation={orientation}
      data-dock-expanded={isExpanded}
    >
      {/* Dock Shell */}
      <div
        className={`bg-[#0a0a0d]/96 backdrop-blur-2xl border border-white/15 flex flex-col overflow-hidden transition-all duration-200 relative ${getCornerClasses()} ${getShadowClass()} w-full h-full`}
      >
        {/* Subtle Edge Contact Line */}
        {!isDragging && edge === "bottom" && (
          <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        )}
        {!isDragging && edge === "top" && (
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        )}
        {!isDragging && edge === "left" && (
          <div className="absolute left-0 inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent pointer-events-none" />
        )}
        {!isDragging && edge === "right" && (
          <div className="absolute right-0 inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent pointer-events-none" />
        )}

        {/* ======================================================== */}
        {/* UNIFIED DOCK CONTENT: SINGLE SOURCE OF TRUTH ORIENTATION */}
        {/* Both container and icons read from the exact same isVertical */}
        {/* ======================================================== */}
        <div
          className={`flex ${
            isVertical ? "flex-col py-1.5 px-1" : "flex-row px-2 py-1"
          } items-center justify-between w-full h-full gap-1`}
          data-testid={isExpanded ? "dock-expanded-container" : "dock-collapsed-container"}
        >
          {/* Dedicated Move Handle */}
          <div
            data-dock-move-handle="true"
            onClick={() => {
              if (hasMovedPastThresholdRef.current) return;
              const nextLock = !isLocked;
              setIsLocked(nextLock);
              try {
                localStorage.setItem("pixel_studio_dock_locked", String(nextLock));
              } catch {}
              onDockLockChange?.(nextLock);
            }}
            onMouseEnter={(e) =>
              showTooltip(e, {
                id: "dock-lock",
                label: isLocked ? "Dock is Locked" : "Move Dock",
                desc: isLocked
                  ? `Dock is locked in place. Click or press [${formatShortcutDisplay(lockShortcut)}] to unlock.`
                  : `Drag handle to move dock. Click or press [${formatShortcutDisplay(lockShortcut)}] to lock.`,
                hotkey: formatShortcutDisplay(lockShortcut),
              })
            }
            onMouseLeave={hideTooltip}
            className={`transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
              isLocked
                ? "text-amber-400 hover:text-amber-300"
                : "text-neutral-500 hover:text-neutral-300 cursor-grab active:cursor-grabbing"
            } ${isVertical ? "w-8 h-4 my-0.5" : "w-4 h-8 mx-0.5"}`}
            title={isLocked ? "Dock Locked" : "Drag to move dock"}
          >
            {isLocked ? (
              <Lock size={12} className="shrink-0" />
            ) : isVertical ? (
              <GripHorizontal size={13} />
            ) : (
              <GripVertical size={13} />
            )}
          </div>

          {/* Exactly 5 Primary Tool Icons */}
          {PRIMARY_DOCK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = isToolActive(tool.id);

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolClick(tool.id)}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    id: `dock-${tool.id}`,
                    label: tool.label,
                    desc: tool.desc,
                  })
                }
                onMouseLeave={hideTooltip}
                onFocus={(e) =>
                  showTooltip(e, {
                    id: `dock-${tool.id}`,
                    label: tool.label,
                    desc: tool.desc,
                  })
                }
                onBlur={hideTooltip}
                data-testid={`dock-tool-${tool.id}`}
                data-active={active}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 relative cursor-pointer shrink-0 ${
                  active
                    ? "bg-white/20 text-white border border-white/30 shadow-md shadow-black/40 scale-105"
                    : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
                aria-label={tool.label}
              >
                <Icon size={16} />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#d71920] shadow-[0_0_6px_#d71920]" />
                )}
              </button>
            );
          })}

          {/* Expand / Collapse Button (Directional Chevron matching current orientation) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hideTooltip();
              setIsExpanded(!isExpanded);
            }}
            onMouseEnter={(e) =>
              showTooltip(e, {
                id: "dock-expand",
                label: isExpanded ? "Collapse Tools" : "More Tools",
                desc: isExpanded
                  ? "Collapse dock back to 5 primary tool icons"
                  : isVertical
                  ? "Expand remaining editor tools vertically"
                  : "Expand remaining editor tools horizontally",
              })
            }
            onMouseLeave={hideTooltip}
            onFocus={(e) =>
              showTooltip(e, {
                id: "dock-expand",
                label: isExpanded ? "Collapse Tools" : "More Tools",
                desc: isExpanded
                  ? "Collapse dock back to 5 primary tool icons"
                  : isVertical
                  ? "Expand remaining editor tools vertically"
                  : "Expand remaining editor tools horizontally",
              })
            }
            onBlur={hideTooltip}
            data-testid={isExpanded ? "dock-collapse-button" : "dock-expand-button"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
              isExpanded
                ? "text-white bg-white/15 hover:bg-white/25"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
            aria-label={isExpanded ? "Collapse dock" : "Expand more tools"}
          >
            {isVertical ? (
              isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />
            ) : (
              isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />
            )}
          </button>

          {/* Additional Tools when Expanded (matching current orientation) */}
          {isExpanded && (
            <>
              {/* Orientation-aligned Divider Separator Line */}
              <div
                className={`bg-white/15 shrink-0 ${
                  isVertical ? "w-5 h-[1px] my-0.5" : "w-[1px] h-5 mx-0.5"
                }`}
              />

              {/* Additional Tools: Canvas & Layers */}
              {ADDITIONAL_DOCK_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const active = isToolActive(tool.id);

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool.id)}
                    onMouseEnter={(e) =>
                      showTooltip(e, {
                        id: `dock-${tool.id}`,
                        label: tool.label,
                        desc: tool.desc,
                      })
                    }
                    onMouseLeave={hideTooltip}
                    data-testid={`dock-tool-${tool.id}`}
                    data-active={active}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 relative cursor-pointer shrink-0 ${
                      active
                        ? "bg-white/20 text-white border border-white/30 shadow-md shadow-black/40 scale-105"
                        : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                    aria-label={tool.label}
                  >
                    <Icon size={16} />
                    {active && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#d71920] shadow-[0_0_6px_#d71920]" />
                    )}
                  </button>
                );
              })}

              {/* Dock Screen Placement Tool */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlacementFlyout(!showPlacementFlyout);
                }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    id: "dock-placement-btn",
                    label: "Screen Placement",
                    desc: "Position dock on Top, Bottom, Left, Right or Float",
                  })
                }
                onMouseLeave={hideTooltip}
                data-testid="dock-tool-placement"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
                  showPlacementFlyout
                    ? "bg-white/20 text-white border border-white/30"
                    : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
                aria-label="Dock Screen Placement"
              >
                <Move size={15} />
              </button>

              {/* Lock / Unlock Dock Tool */}
              <button
                type="button"
                onClick={() => {
                  const nextLock = !isLocked;
                  setIsLocked(nextLock);
                  try {
                    localStorage.setItem("pixel_studio_dock_locked", String(nextLock));
                  } catch {}
                  onDockLockChange?.(nextLock);
                }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    id: "dock-lock-btn",
                    label: isLocked ? "Unlock Dock" : "Lock Dock",
                    desc: isLocked
                      ? "Unlock dock to move anywhere"
                      : "Lock dock in its current position",
                    hotkey: formatShortcutDisplay(lockShortcut),
                  })
                }
                onMouseLeave={hideTooltip}
                data-testid="dock-tool-lock"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
                  isLocked
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
                aria-label={isLocked ? "Unlock Dock" : "Lock Dock"}
              >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Screen Placement Flyout Popover with safe screen orientation collision avoidance */}
      {showPlacementFlyout && (
        <div
          className={`absolute ${
            edge === "right"
              ? "right-full mr-2"
              : edge === "left"
              ? "left-full ml-2"
              : edge === "top"
              ? "top-full mt-2"
              : "bottom-full mb-2"
          } ${
            isVertical ? "top-1/2 -translate-y-1/2" : "left-1/2 -translate-x-1/2"
          } bg-[#101014]/98 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 w-32 font-mono text-xs`}
          onMouseLeave={() => setShowPlacementFlyout(false)}
          data-testid="dock-placement-flyout"
        >
          <div className="text-[9px] text-neutral-500 uppercase px-1.5 py-0.5 font-bold">
            Dock Placement
          </div>
          {(["bottom", "top", "left", "right", "float"] as DockPosition[]).map((pos) => (
            <button
              key={pos}
              onClick={(e) => {
                e.stopPropagation();
                updateEdgeAndOrientation(pos);
                setShowPlacementFlyout(false);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono capitalize text-left flex items-center justify-between cursor-pointer transition-colors ${
                edge === pos
                  ? "bg-white text-black font-bold"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
              data-testid={`placement-${pos}`}
            >
              <span>{pos}</span>
              {edge === pos && <Check size={11} />}
            </button>
          ))}
        </div>
      )}

      {/* Portaled Collision-Aware Floating Tooltip */}
      <DockPortalTooltip tooltip={dockTooltip} dockEdge={edge} />
    </div>
  );
};
