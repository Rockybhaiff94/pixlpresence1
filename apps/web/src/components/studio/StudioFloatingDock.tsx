"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layout,
  User,
  Type,
  Gamepad2,
  LayoutGrid,
  Palette,
  ImageIcon,
  Link2,
  Sparkles,
  Code2,
  Settings,
  LayoutTemplate,
  Layers,
  GripHorizontal,
  GripVertical,
  Lock,
  Unlock,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Check,
  PlusSquare,
  FileText,
  Share2,
  Flame,
  ChevronLeft,
  Shapes,
} from "lucide-react";
import { StudioTab } from "@/types/studio";
import { StudioView } from "./StudioTopBar";
import { DockPortalTooltip, DockTooltipData } from "./DockPortalTooltip";

export type DockMode = "main" | "directory" | "settings";
export type DockPosition = "bottom" | "top" | "left" | "right" | "float";

export interface ToolSelection {
  type: "category" | "view";
  id: StudioTab | StudioView;
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

  // Direct actions invoked from App Directory
  onAddEmbed?: () => void;
  onAddElement?: (type: any) => void;
  onOpenSocialSelector?: () => void;
  onOpenRpcCustomizer?: () => void;

  // Controlled dock mode (optional)
  dockMode?: DockMode;
  onDockModeChange?: (mode: DockMode) => void;

  // Mode C integrated settings content
  children?: React.ReactNode;

  // Customization & Lock Enhancements
  dockLockShortcut?: string;
  isDockLocked?: boolean;
  onDockLockChange?: (locked: boolean) => void;
  moreOptionsPanelSize?: number; // 20 to 100 percentage
  snapThreshold?: number; // In px (160–190px range)
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

export const StudioFloatingDock: React.FC<StudioFloatingDockProps> = ({
  position: externalPosition,
  onPositionChange,
  activeCategory,
  currentView,
  isSettingsOpen,
  onSelectTool,
  onCloseSettings,
  containerRef,
  themeAccentColor = "#ffffff",
  onAddEmbed,
  onAddElement,
  onOpenSocialSelector,
  onOpenRpcCustomizer,
  dockMode: externalDockMode,
  onDockModeChange,
  children,
  dockLockShortcut: propShortcut,
  isDockLocked: propLocked,
  onDockLockChange,
  moreOptionsPanelSize: propPanelSize,
  snapThreshold: propSnapThreshold,
}) => {
  // Navigation State: Always starts in Mode A ("main") on load / refresh
  const [internalMode, setInternalMode] = useState<DockMode>("main");
  const dockMode = externalDockMode !== undefined ? externalDockMode : internalMode;

  const setDockMode = useCallback(
    (mode: DockMode) => {
      if (mode !== "main") {
        // FIX-02: FR-02.5 - Opening the dock during an active drag must immediately cancel movement
        setDragState({ isDragging: false, currentPos: null });
        isPointerDownRef.current = false;
        hasMovedPastThresholdRef.current = false;
      }
      if (onDockModeChange) {
        onDockModeChange(mode);
      } else {
        setInternalMode(mode);
      }
      if (mode === "main") {
        onCloseSettings?.();
      }
    },
    [onDockModeChange, onCloseSettings]
  );

  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [dockTooltip, setDockTooltip] = useState<DockTooltipData | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const directoryScrollRef = useRef<HTMLDivElement>(null);

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

  // Dismiss tooltip on external scroll or resize
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
  // Normalized position along the attached edge or in floating space (0.0 to 1.0)
  const [ratio, setRatio] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Customizable Lock State & Shortcut
  const [isLocked, setIsLocked] = useState<boolean>(propLocked ?? false);
  const [lockShortcut, setLockShortcut] = useState<string>(propShortcut || "CapsLock");

  // FIX-03: More Options Panel Size (40% to 100%, default 100%) - persistent across movement and snapping
  const [internalPanelSize, setInternalPanelSize] = useState<number>(() => {
    if (typeof propPanelSize === "number") return propPanelSize;
    if (typeof window !== "undefined") {
      try {
        const savedCoords = localStorage.getItem("pixel_studio_dock_coords");
        if (savedCoords) {
          const parsed = JSON.parse(savedCoords);
          if (typeof parsed.panelSize === "number") return parsed.panelSize;
        }
        const savedPrefs = localStorage.getItem("pixel_studio_preferences_v1");
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          if (typeof parsed.moreOptionsPanelSize === "number") return parsed.moreOptionsPanelSize;
        }
        const savedSize = localStorage.getItem("pixel_studio_dock_panel_size");
        if (savedSize) return Number(savedSize);
      } catch {}
    }
    return 100;
  });

  useEffect(() => {
    if (typeof propPanelSize === "number") {
      setInternalPanelSize(propPanelSize);
    }
  }, [propPanelSize]);

  const panelSize = Math.max(40, Math.min(100, propPanelSize ?? internalPanelSize ?? 100));
  const panelScale = Math.max(0.4, Math.min(1.0, panelSize / 100));

  // Snapping distance threshold (default ~175px calibrated to 160–190 CSS pixels)
  const snapThreshold = propSnapThreshold ?? 175;

  // Sync external position changes into internal edge state
  useEffect(() => {
    if (externalPosition && externalPosition !== edge && !isDragging) {
      setEdge(externalPosition);
    }
  }, [externalPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync prop changes for lock and shortcut
  useEffect(() => {
    if (propLocked !== undefined) setIsLocked(propLocked);
  }, [propLocked]);

  useEffect(() => {
    if (propShortcut) setLockShortcut(propShortcut);
  }, [propShortcut]);

  // SM-08: Unified Atomic Drag State Machine (eliminates desynchronization between isDragging and coordinates)
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

  // Re-render trigger on window / container resize to keep dock within bounds
  const [, setResizeTick] = useState(0);

  // Restore saved dock position & coordinates from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedCoords = localStorage.getItem("pixel_studio_dock_coords");
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (parsed.edge) {
          setEdge(parsed.edge);
          onPositionChange(parsed.edge);
        }
        if (typeof parsed.ratioX === "number" && typeof parsed.ratioY === "number") {
          setRatio({ x: parsed.ratioX, y: parsed.ratioY });
        }
        if (typeof parsed.panelSize === "number") {
          setInternalPanelSize(parsed.panelSize);
        }
      } else {
        const savedPos = localStorage.getItem("pixel_studio_dock_position") as DockPosition;
        if (savedPos) {
          setEdge(savedPos);
          onPositionChange(savedPos);
        }
      }

      // Restore lock settings
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
      // Do not trigger while typing in inputs, textareas, or contentEditable elements
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

  // Close menus on outside click when in directory mode
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        if (dockMode === "directory") {
          setDockMode("main");
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dockMode, setDockMode]);

  // Handle Escape key to step back or collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dockMode === "settings") {
          setDockMode("directory");
        } else if (dockMode === "directory") {
          setDockMode("main");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dockMode, setDockMode]);

  // SM-09: Synchronize with external isSettingsOpen via transition ref (prevents bidirectional loops)
  const prevIsSettingsOpenRef = useRef(isSettingsOpen);
  useEffect(() => {
    if (prevIsSettingsOpenRef.current !== isSettingsOpen) {
      prevIsSettingsOpenRef.current = isSettingsOpen;
      if (isSettingsOpen && dockMode !== "settings") {
        setDockMode("settings");
      } else if (!isSettingsOpen && dockMode === "settings") {
        setDockMode("main");
      }
    }
  }, [isSettingsOpen, dockMode, setDockMode]);

  // Determine orientation: Left and Right are vertical; Top, Bottom and Float are horizontal
  const isVertical = edge === "left" || edge === "right";

  // ========================================================
  // CORE POINTER DRAG & INTELLIGENT EDGE SNAPPING SYSTEM
  // ========================================================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button (left click)
    if (e.button !== 0) return;

    // FIX-02: State B - Movement is strictly locked whenever the dock is open (settings or directory)
    if (dockMode !== "main") return;

    // If dock/keyboard lock is active, dragging is disabled entirely
    if (isLocked) return;

    // FIX-02: FR-02.3 - Only the dedicated Move control may initiate dock movement
    const target = e.target as HTMLElement;
    const isMoveControl = target.closest('[data-dock-move-handle="true"]');
    if (!isMoveControl) return;

    // Don't drag if interacting with an input/textarea/select
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
    // FIX-02: Cancel/ignore if pointer is not down, dock is locked, or dock has opened
    if (!isPointerDownRef.current || isLocked || dockMode !== "main") {
      if (isDragging) {
        setDragState({ isDragging: false, currentPos: null });
      }
      return;
    }

    const dx = e.clientX - dragStartPointerRef.current.x;
    const dy = e.clientY - dragStartPointerRef.current.y;
    const dist = Math.hypot(dx, dy);

    // 4–6px Drag Threshold to separate clicks from drags
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
      const dockWidth = dockEl?.offsetWidth || (isVertical ? 44 : 220);
      const dockHeight = dockEl?.offsetHeight || (isVertical ? 220 : 44);

      // Clamp position inside container boundaries
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
      // Completed drag gesture - calculate nearest edge
      const container = containerRef?.current || document.body;
      const containerRect = container.getBoundingClientRect();
      const dockEl = dockRef.current;
      if (!dockEl) {
        setDragState({ isDragging: false, currentPos: null });
        return;
      }

      const dockRect = dockEl.getBoundingClientRect();

      // Calculate distances to all 4 edges of the container
      const distTop = Math.abs(dockRect.top - containerRect.top);
      const distBottom = Math.abs(containerRect.bottom - dockRect.bottom);
      const distLeft = Math.abs(dockRect.left - containerRect.left);
      const distRight = Math.abs(containerRect.right - dockRect.right);

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      // Section 1: Calibrated nearest-edge snapping threshold (160–190 CSS pixels)
      let newEdge: DockPosition = "float";
      if (minDist <= snapThreshold) {
        if (minDist === distBottom) newEdge = "bottom";
        else if (minDist === distTop) newEdge = "top";
        else if (minDist === distLeft) newEdge = "left";
        else newEdge = "right";
      }

      // Preserve position along the selected edge
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
          JSON.stringify({ edge: newEdge, ratioX, ratioY, panelSize })
        );
        localStorage.setItem("pixel_studio_dock_panel_size", String(panelSize));
      } catch {}
    } else {
      // Click interaction: no drag
      setDragState({ isDragging: false, currentPos: null });
    }
  };

  // Suppress clicks on child buttons if a drag just occurred
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedPastThresholdRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Click on More Options toggle
  const handleToggleMore = () => {
    if (dockMode === "main") {
      setDockMode("directory");
    } else {
      setDockMode("main");
    }
  };

  // ========================================================
  // POSITION-AWARE DOCK & MORE OPTIONS EXPANSION CALCULATIONS
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

  const baseExpandedWidth = isVertical ? 420 : 540;
  const baseExpandedHeight = isVertical ? 760 : 560;

  // Apply User-Configured More Options Panel Size (40% to 100%)
  const effectiveExpandedWidth = Math.min(
    currentContainerWidth - 24,
    Math.max(Math.round(baseExpandedWidth * 0.4), Math.round(baseExpandedWidth * panelScale))
  );
  const effectiveExpandedHeight = Math.min(
    currentContainerHeight - 40,
    Math.max(Math.round(baseExpandedHeight * 0.4), Math.round(baseExpandedHeight * panelScale))
  );

  const effectivePanelPct = Math.max(
    40,
    Math.min(100, Math.round((effectiveExpandedWidth / baseExpandedWidth) * 100))
  );

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

    // Base dimensions in Mode A
    const modeAWidth = isVertical ? 44 : 220;
    const modeAHeight = isVertical ? 220 : 44;

    // Subtle ease-out transition (180–260ms) when snapping or releasing
    const baseTransition =
      "left 220ms cubic-bezier(0.16, 1, 0.3, 1), top 220ms cubic-bezier(0.16, 1, 0.3, 1), width 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 180ms ease, box-shadow 180ms ease";

    // Mode A Anchor Coordinates
    const maxX_A = Math.max(0, containerWidth - modeAWidth);
    const maxY_A = Math.max(0, containerHeight - modeAHeight);
    const dockLeft = Math.max(8, Math.min(maxX_A - 8, ratio.x * maxX_A));
    const dockTop = Math.max(8, Math.min(maxY_A - 8, ratio.y * maxY_A));
    const dockCenterX = dockLeft + modeAWidth / 2;
    const dockCenterY = dockTop + modeAHeight / 2;

    // ========================================================
    // 1. MODE A (COMPACT DOCK)
    // ========================================================
    if (dockMode === "main") {
      if (edge === "bottom") {
        return {
          position: "absolute",
          bottom: 0,
          left: `${dockLeft}px`,
          top: "auto",
          right: "auto",
          transition: baseTransition,
          zIndex: 40,
          touchAction: "none",
        };
      }
      if (edge === "top") {
        return {
          position: "absolute",
          top: 0,
          left: `${dockLeft}px`,
          bottom: "auto",
          right: "auto",
          transition: baseTransition,
          zIndex: 40,
          touchAction: "none",
        };
      }
      if (edge === "left") {
        return {
          position: "absolute",
          left: 0,
          top: `${dockTop}px`,
          right: "auto",
          bottom: "auto",
          transition: baseTransition,
          zIndex: 40,
          touchAction: "none",
        };
      }
      if (edge === "right") {
        return {
          position: "absolute",
          right: 0,
          top: `${dockTop}px`,
          left: "auto",
          bottom: "auto",
          transition: baseTransition,
          zIndex: 40,
          touchAction: "none",
        };
      }
      // Free-floating mode in Mode A
      return {
        position: "absolute",
        left: `${dockLeft}px`,
        top: `${dockTop}px`,
        right: "auto",
        bottom: "auto",
        transition: baseTransition,
        zIndex: 40,
        touchAction: "none",
      };
    }

    // ========================================================
    // 2. POSITION-AWARE EXPANSION FOR MODES B & C
    // ========================================================

    // Case A: Attached to BOTTOM edge -> expand upward from bottom wall
    if (edge === "bottom") {
      const panelLeft = Math.max(
        8,
        Math.min(containerWidth - effectiveExpandedWidth - 8, dockCenterX - effectiveExpandedWidth / 2)
      );
      return {
        position: "absolute",
        bottom: 0,
        left: `${panelLeft}px`,
        top: "auto",
        right: "auto",
        width: `${effectiveExpandedWidth}px`,
        height: `${effectiveExpandedHeight}px`,
        transition: baseTransition,
        zIndex: 45,
        touchAction: "none",
      };
    }

    // Case B: Attached to TOP edge -> expand downward from top wall
    if (edge === "top") {
      const panelLeft = Math.max(
        8,
        Math.min(containerWidth - effectiveExpandedWidth - 8, dockCenterX - effectiveExpandedWidth / 2)
      );
      return {
        position: "absolute",
        top: 0,
        left: `${panelLeft}px`,
        bottom: "auto",
        right: "auto",
        width: `${effectiveExpandedWidth}px`,
        height: `${effectiveExpandedHeight}px`,
        transition: baseTransition,
        zIndex: 45,
        touchAction: "none",
      };
    }

    // Case C: Attached to LEFT edge -> expand rightward from left wall
    if (edge === "left") {
      const panelTop = Math.max(
        8,
        Math.min(containerHeight - effectiveExpandedHeight - 8, dockCenterY - effectiveExpandedHeight / 2)
      );
      return {
        position: "absolute",
        left: 0,
        top: `${panelTop}px`,
        right: "auto",
        bottom: "auto",
        width: `${effectiveExpandedWidth}px`,
        height: `${effectiveExpandedHeight}px`,
        transition: baseTransition,
        zIndex: 45,
        touchAction: "none",
      };
    }

    // Case D: Attached to RIGHT edge -> expand leftward from right wall
    if (edge === "right") {
      const panelTop = Math.max(
        8,
        Math.min(containerHeight - effectiveExpandedHeight - 8, dockCenterY - effectiveExpandedHeight / 2)
      );
      return {
        position: "absolute",
        right: 0,
        top: `${panelTop}px`,
        left: "auto",
        bottom: "auto",
        width: `${effectiveExpandedWidth}px`,
        height: `${effectiveExpandedHeight}px`,
        transition: baseTransition,
        zIndex: 45,
        touchAction: "none",
      };
    }

    // Case E: FREELY FLOATING ANYWHERE IN VIEWPORT (CRITICAL SECTION 5)
    // Preserves exact floating state and opens panel at dock's current location
    const spaceAbove = dockTop;
    const spaceBelow = containerHeight - (dockTop + modeAHeight);

    let panelTop: number;
    if (spaceBelow >= effectiveExpandedHeight + 16) {
      // Expand downward below the floating dock
      panelTop = dockTop + modeAHeight + 8;
    } else if (spaceAbove >= effectiveExpandedHeight + 16) {
      // Expand upward above the floating dock
      panelTop = dockTop - effectiveExpandedHeight - 8;
    } else {
      // Center vertically around the floating dock
      panelTop = Math.max(
        12,
        Math.min(containerHeight - effectiveExpandedHeight - 12, dockCenterY - effectiveExpandedHeight / 2)
      );
    }

    const panelLeft = Math.max(
      12,
      Math.min(containerWidth - effectiveExpandedWidth - 12, dockCenterX - effectiveExpandedWidth / 2)
    );

    return {
      position: "absolute",
      left: `${panelLeft}px`,
      top: `${panelTop}px`,
      right: "auto",
      bottom: "auto",
      width: `${effectiveExpandedWidth}px`,
      height: `${effectiveExpandedHeight}px`,
      transition: baseTransition,
      zIndex: 45,
      touchAction: "none",
    };
  };

  // Adaptive Corner Classes (Sections 4 & 5)
  // When attached to an edge: flat attached side with border-0, outer corners smoothly rounded
  // When detached / dragging / floating: all 4 corners rounded with full border
  const getCornerClasses = () => {
    if (isDragging || edge === "float") {
      return "rounded-2xl border border-white/15";
    }

    if (dockMode === "main") {
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
    }

    // In Mode B & Mode C (Expanded Directory & Settings)
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

  // Directional Edge Shadow
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
    >
      {/* ======================================================== */}
      {/* ONE UNIFIED DOCK CONTAINER (MODES A, B, C)               */}
      {/* ======================================================== */}
      <div
        className={`bg-[#0a0a0d]/96 backdrop-blur-2xl border border-white/15 flex flex-col overflow-hidden transition-all duration-200 relative ${getCornerClasses()} ${getShadowClass()} ${
          dockMode === "main"
            ? isVertical
              ? "w-11 py-1 px-1"
              : "h-11 px-1.5 py-1"
            : "w-full h-full"
        }`}
      >
        {/* Subtle Edge Contact Line (Wall connection accent) */}
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

        {/* ====================================================== */}
        {/* MODE A: MAIN DOCK (SLIM 44PX CONTAINER, 5 ICONS)       */}
        {/* ====================================================== */}
        {dockMode === "main" && (
          <div
            className={`flex ${
              isVertical ? "flex-col" : "flex-row"
            } items-center gap-1.5`}
          >
            {/* FIX-02: Dedicated Move Control with data-dock-move-handle attribute */}
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
              onFocus={(e) =>
                showTooltip(e, {
                  id: "dock-lock",
                  label: isLocked ? "Dock is Locked" : "Move Dock",
                  desc: isLocked
                    ? `Dock is locked in place. Click or press [${formatShortcutDisplay(lockShortcut)}] to unlock.`
                    : `Drag handle to move dock. Click or press [${formatShortcutDisplay(lockShortcut)}] to lock.`,
                  hotkey: formatShortcutDisplay(lockShortcut),
                })
              }
              onBlur={hideTooltip}
              className={`transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                isLocked
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-neutral-500 hover:text-neutral-300 cursor-grab active:cursor-grabbing"
              } ${isVertical ? "w-8 h-4 my-0.5" : "w-4 h-8 mx-0.5"}`}
              title={
                isLocked
                  ? `Dock is locked [${formatShortcutDisplay(lockShortcut)} to unlock]`
                  : `Drag to move dock. Click or press [${formatShortcutDisplay(
                      lockShortcut
                    )}] to lock.`
              }
            >
              {isLocked ? (
                <Lock size={12} className="shrink-0" />
              ) : isVertical ? (
                <GripHorizontal size={13} />
              ) : (
                <GripVertical size={13} />
              )}
            </div>

            {/* Expand Foundation Toggle Button */}
            <div className="relative group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hideTooltip();
                  handleToggleMore();
                }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    id: "expand-foundation",
                    label: "Studio Dock Foundation",
                    desc: "Expand foundation dock panel & screen placement controls",
                  })
                }
                onMouseLeave={hideTooltip}
                onFocus={(e) =>
                  showTooltip(e, {
                    id: "expand-foundation",
                    label: "Studio Dock Foundation",
                    desc: "Expand foundation dock panel & screen placement controls",
                  })
                }
                onBlur={hideTooltip}
                aria-label="Expand Foundation Dock"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer text-neutral-300 hover:text-white hover:bg-white/10"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* MODE B: EXPANDED APP DIRECTORY (POSITION-AWARE)       */}
        {/* ====================================================== */}
        {dockMode === "directory" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Header: Title, Active Mode Indicator & Collapse */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101014] shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  <LayoutGrid size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>STUDIO DOCK</span>
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Foundation View
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    hideTooltip();
                    setDockMode("main");
                  }}
                  onMouseEnter={(e) =>
                    showTooltip(e, {
                      id: "collapse-directory",
                      label: "Collapse Foundation",
                      desc: "Return to compact dock view",
                    })
                  }
                  onMouseLeave={hideTooltip}
                  onFocus={(e) =>
                    showTooltip(e, {
                      id: "collapse-directory",
                      label: "Collapse Foundation",
                      desc: "Return to compact dock view",
                    })
                  }
                  onBlur={hideTooltip}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-white/10"
                  aria-label="Collapse to Main Dock"
                >
                  <X size={12} />
                  <span>Collapse</span>
                </button>
              </div>
            </div>

            {/* Clean Empty Foundation Container */}
            <div
              ref={directoryScrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-8 text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400 shadow-inner">
                <LayoutGrid size={24} className="text-neutral-500" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Empty Dock Foundation
                </h4>
                <p className="text-[11px] text-neutral-500 font-mono leading-relaxed">
                  Dock positioning, edge snapping, dragging, and placement controls are preserved and active. Ready for new customization tools to be built from scratch.
                </p>
              </div>
            </div>

            {/* Edge Placement Interactive Controls (Section 10 & 11) */}
            <div className="p-3 border-t border-white/10 bg-[#0d0d10] shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <Move size={11} />
                  <span>Dock Screen Placement</span>
                </span>
                <span className="text-[9px] text-neutral-400 capitalize">
                  Active: {edge}
                </span>
              </div>
              <div className={`grid gap-1.5 ${effectivePanelPct <= 55 ? "grid-cols-3" : "grid-cols-5"}`}>
                {(["bottom", "top", "left", "right", "float"] as DockPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      hideTooltip();
                      setEdge(pos);
                      onPositionChange(pos);
                      try {
                        localStorage.setItem("pixel_studio_dock_position", pos);
                        localStorage.setItem(
                          "pixel_studio_dock_coords",
                          JSON.stringify({ edge: pos, ratioX: ratio.x, ratioY: ratio.y, panelSize })
                        );
                        localStorage.setItem("pixel_studio_dock_panel_size", String(panelSize));
                      } catch {}
                    }}
                    onMouseEnter={(e) =>
                      showTooltip(e, {
                        id: `edge-${pos}`,
                        label: `${pos.toUpperCase()} Dock`,
                        desc:
                          pos === "float"
                            ? "Freely position dock anywhere on canvas"
                            : `Snap and anchor dock to the ${pos} wall`,
                      })
                    }
                    onMouseLeave={hideTooltip}
                    onFocus={(e) =>
                      showTooltip(e, {
                        id: `edge-${pos}`,
                        label: `${pos.toUpperCase()} Dock`,
                        desc:
                          pos === "float"
                            ? "Freely position dock anywhere on canvas"
                            : `Snap and anchor dock to the ${pos} wall`,
                      })
                    }
                    onBlur={hideTooltip}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      edge === pos
                        ? "bg-white text-black border-white shadow"
                        : "bg-[#141418] hover:bg-[#1c1c22] text-neutral-400 hover:text-white border-white/5"
                    }`}
                  >
                    {pos === "top" && <ArrowUp size={11} />}
                    {pos === "bottom" && <ArrowDown size={11} />}
                    {pos === "left" && <ArrowLeft size={11} />}
                    {pos === "right" && <ArrowRight size={11} />}
                    {pos === "float" && <Move size={11} />}
                    <span>{pos}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================== */}
        {/* MODE C: INTEGRATED SETTINGS MODE                       */}
        {/* ====================================================== */}
        {dockMode === "settings" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Integrated Settings Content with Built-In Back & Collapse Controls */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {children ? (
                React.cloneElement(children as React.ReactElement<any>, {
                  isFloatingContext: true,
                  panelSize: panelSize,
                  dockWidth: effectiveExpandedWidth,
                  isVertical,
                  onBack: () => setDockMode("directory"),
                  onClose: () => setDockMode("main"),
                })
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101014] shrink-0">
                    <button
                      type="button"
                      onClick={() => setDockMode("directory")}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-white/10"
                    >
                      <ArrowLeft size={12} />
                      <span>Back to Foundation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDockMode("main")}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-white/10"
                    >
                      <X size={12} />
                      <span>Close</span>
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Empty Settings Foundation
                    </h4>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Ready for new tools and settings modules.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Portaled Collision-Aware Floating Tooltip */}
      <DockPortalTooltip tooltip={dockTooltip} dockEdge={edge} />
    </div>
  );
};
