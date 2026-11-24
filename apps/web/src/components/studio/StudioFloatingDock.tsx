"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutTemplate,
  Type,
  Shapes,
  Sparkles,
  UploadCloud,
  ChevronUp,
  ChevronLeft,
  PanelTop,
  PaintBucket,
  Layers,
  Lock,
  GripHorizontal,
  GripVertical,
  X,
} from "lucide-react";
import { StudioTab } from "@/types/studio";
import { StudioView } from "./StudioTopBar";
import { DockPortalTooltip, DockTooltipData } from "./DockPortalTooltip";
import { getDooryToolTitle } from "@/components/editor/DooryDrawerHost";

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
  onCloseToolPanel?: () => void;
  renderToolPanel?: (toolId: string) => React.ReactNode;

  // Direct actions invoked from App Directory
  onAddEmbed?: () => void;
  onAddElement?: (type: unknown) => void;
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
  onCloseToolPanel,
  renderToolPanel,
  onSelectTool,
  containerRef,
  dockLockShortcut: propShortcut,
  isDockLocked: propLocked,
  onDockLockChange,
  snapThreshold: propSnapThreshold,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Collapsed dock additional-tools expansion state (preserves pre-panel bar state)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [dockTooltip, setDockTooltip] = useState<DockTooltipData | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const lastToolTriggerRef = useRef<HTMLButtonElement | null>(null);
  const panelCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  // Normalize editor tool IDs cleanly (dock 'media' <-> 'images', 'canvas' <-> 'background')
  const normalizedActiveTool =
    activeTool === "media"
      ? "images"
      : activeTool === "canvas"
      ? "background"
      : activeTool || null;

  // Morph Panel Visual State Machine & Last Selected Tool tracking:
  // Keeps active panel content fading out gracefully during close contraction
  const [prevNormalizedTool, setPrevNormalizedTool] = useState<string | null>(normalizedActiveTool);
  const [displayTool, setDisplayTool] = useState<string | null>(normalizedActiveTool);
  const [lastSelectedTool, setLastSelectedTool] = useState<string | null>(normalizedActiveTool);
  const [isClosingPanel, setIsClosingPanel] = useState<boolean>(false);
  const isClosingPanelRef = useRef<boolean>(false);
  const closingTimerRef = useRef<number | null>(null);

  if (normalizedActiveTool !== prevNormalizedTool) {
    setPrevNormalizedTool(normalizedActiveTool);
    if (normalizedActiveTool) {
      setIsClosingPanel(false);
      setDisplayTool(normalizedActiveTool);
      setLastSelectedTool(normalizedActiveTool);
    } else if (displayTool) {
      setIsClosingPanel(true);
    }
  }

  const isPanelExpanded = Boolean(normalizedActiveTool) && !isClosingPanel;
  const showMorphPanelShell = Boolean(normalizedActiveTool) || isClosingPanel;

  const clearClosingTimer = useCallback(() => {
    if (closingTimerRef.current !== null) {
      window.clearTimeout(closingTimerRef.current);
      closingTimerRef.current = null;
    }
  }, []);

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
      if (showMorphPanelShell) return;
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
    [showMorphPanelShell]
  );

  const hideTooltip = useCallback(() => {
    setDockTooltip(null);
  }, []);

  // Manage closing timer lifecycle and tooltip dismissal cleanly without synchronous setState in effect
  useEffect(() => {
    isClosingPanelRef.current = isClosingPanel;
    if (!isClosingPanel) {
      clearClosingTimer();
      return;
    }

    const closeDurationMs = prefersReducedMotion ? 20 : 300;
    clearClosingTimer();
    closingTimerRef.current = window.setTimeout(() => {
      closingTimerRef.current = null;
      isClosingPanelRef.current = false;
      setIsClosingPanel(false);
      setDisplayTool(null);
      if (lastToolTriggerRef.current && document.activeElement === panelCloseBtnRef.current) {
        lastToolTriggerRef.current.focus({ preventScroll: true });
      }
    }, closeDurationMs);

    return () => clearClosingTimer();
  }, [isClosingPanel, clearClosingTimer, prefersReducedMotion]);

  // Dismiss tooltip when morph panel opens
  useEffect(() => {
    if (!showMorphPanelShell) return;
    const rafId = window.requestAnimationFrame(() => setDockTooltip(null));
    return () => window.cancelAnimationFrame(rafId);
  }, [showMorphPanelShell]);

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

  // Customizable Lock State & Shortcut (props override internal state when controlled)
  const [internalLocked, setIsLocked] = useState<boolean>(propLocked ?? false);
  const [internalShortcut, setLockShortcut] = useState<string>(propShortcut || "CapsLock");
  const isLocked = propLocked ?? internalLocked;
  const lockShortcut = propShortcut || internalShortcut;

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

  // Sync external position prop changes cleanly during render without cascading effects
  const [prevExternalPosition, setPrevExternalPosition] = useState<DockPosition>(externalPosition);
  if (externalPosition !== prevExternalPosition) {
    setPrevExternalPosition(externalPosition);
    if (externalPosition && externalPosition !== edge && !isDragging) {
      setEdge(externalPosition);
      if (externalPosition === "top" || externalPosition === "bottom") {
        setOrientation("horizontal");
      } else if (externalPosition === "left" || externalPosition === "right") {
        setOrientation("vertical");
      }
    }
  }

  // Separate interaction state refs so synthetic drag clicks NEVER leak onto subsequent clicks:
  // 1. isPointerDownRef: active pointer gesture started on move handle
  // 2. hasMovedPastThresholdRef: current pointer gesture crossed >= 5px drag threshold
  // 3. suppressNextClickRef: suppress ONLY the single synthetic click emitted by a finished drag
  const isPointerDownRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartDockPosRef = useRef({ x: 0, y: 0 });
  const latestDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedPastThresholdRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  const clearSuppressClickTimer = useCallback(() => {
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
  }, []);

  // Measured workspace host bounds (uses offsetParent so top/bottom/right/left stay exact)
  const [hostSize, setHostSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  const measureHostSize = useCallback(() => {
    const dockEl = dockRef.current;
    const hostEl =
      (dockEl?.offsetParent as HTMLElement | null) || containerRef?.current || null;
    if (hostEl && hostEl.clientWidth > 0 && hostEl.clientHeight > 0) {
      setHostSize((prev) =>
        prev.width === hostEl.clientWidth && prev.height === hostEl.clientHeight
          ? prev
          : { width: hostEl.clientWidth, height: hostEl.clientHeight }
      );
    } else if (typeof window !== "undefined") {
      setHostSize((prev) =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight }
      );
    }
  }, [containerRef]);

  useLayoutEffect(() => {
    measureHostSize();
  }, [measureHostSize]);

  // Restore saved dock position & coordinates from localStorage after mount without hydration mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rafId = window.requestAnimationFrame(() => {
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
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Window & Container Resize Observer
  useEffect(() => {
    const handleResize = () => measureHostSize();
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => measureHostSize());
      const hostEl =
        (dockRef.current?.offsetParent as HTMLElement | null) || containerRef?.current;
      if (hostEl) resizeObserver.observe(hostEl);
      if (containerRef?.current && containerRef.current !== hostEl) {
        resizeObserver.observe(containerRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [containerRef, measureHostSize]);

  // Close panel gracefully with duplicate-close protection
  const handleRequestClosePanel = useCallback(() => {
    if (isClosingPanelRef.current) return;
    if (!normalizedActiveTool && !displayTool) return;

    hideTooltip();

    if (onCloseToolPanel) {
      onCloseToolPanel();
    } else if (normalizedActiveTool) {
      onToggleTool?.(normalizedActiveTool);
    }
  }, [normalizedActiveTool, displayTool, hideTooltip, onCloseToolPanel, onToggleTool]);

  // Escape-to-close active tool panel & CapsLock shortcut to toggle Dock Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isPanelExpanded || normalizedActiveTool)) {
        if (!e.defaultPrevented) {
          e.preventDefault();
          e.stopPropagation();
          handleRequestClosePanel();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
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
  }, [lockShortcut, onDockLockChange, isPanelExpanded, normalizedActiveTool, handleRequestClosePanel]);

  // Check if a tool is currently active
  const isToolActive = (toolId: string) => {
    if (!isPanelExpanded || !normalizedActiveTool) return false;
    if (toolId === "media" && (normalizedActiveTool === "media" || normalizedActiveTool === "images")) {
      return true;
    }
    if (
      toolId === "canvas" &&
      (normalizedActiveTool === "canvas" || normalizedActiveTool === "background")
    ) {
      return true;
    }
    return normalizedActiveTool === toolId;
  };

  // Tool Click Handler (with clean mapping preservation)
  const handleToolClick = (
    toolId: string,
    triggerBtn?: HTMLButtonElement | null
  ) => {
    if (triggerBtn) {
      lastToolTriggerRef.current = triggerBtn;
    }
    hideTooltip();

    if (toolId === "media") {
      setLastSelectedTool("images");
      onToggleTool?.("images");
    } else if (toolId === "canvas") {
      setLastSelectedTool("background");
      onToggleTool?.("background");
    } else {
      setLastSelectedTool(toolId);
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

  const getHostBoundsRect = useCallback(() => {
    const dockEl = dockRef.current;
    const hostEl =
      (dockEl?.offsetParent as HTMLElement | null) || containerRef?.current || document.body;
    return hostEl.getBoundingClientRect();
  }, [containerRef]);

  const finishDragGesture = useCallback(
    (didDrag: boolean, pointerId?: number) => {
      isPointerDownRef.current = false;
      activePointerIdRef.current = null;
      hasMovedPastThresholdRef.current = false;

      if (pointerId !== undefined && dockRef.current) {
        try {
          if (dockRef.current.hasPointerCapture?.(pointerId)) {
            dockRef.current.releasePointerCapture(pointerId);
          }
        } catch {}
      }

      if (didDrag) {
        // Suppress ONLY the single synthetic click produced by releasing this drag
        clearSuppressClickTimer();
        suppressNextClickRef.current = true;
        suppressClickTimerRef.current = window.setTimeout(() => {
          suppressNextClickRef.current = false;
          suppressClickTimerRef.current = null;
        }, 80);

        const dockEl = dockRef.current;
        if (!dockEl) {
          setDragState({ isDragging: false, currentPos: null });
          return;
        }

        const containerRect = getHostBoundsRect();
        const dockDomRect = dockEl.getBoundingClientRect();
        const dockWidth = dockEl.offsetWidth || dockDomRect.width;
        const dockHeight = dockEl.offsetHeight || dockDomRect.height;

        // Prefer exact synchronous pointer-computed position so fast flick drags
        // never snap using a 1-frame-stale DOM rect before React commits.
        const relPos = latestDragPosRef.current;
        latestDragPosRef.current = null;
        const absLeft = relPos ? containerRect.left + relPos.x : dockDomRect.left;
        const absTop = relPos ? containerRect.top + relPos.y : dockDomRect.top;
        const dockRect = {
          left: absLeft,
          top: absTop,
          right: absLeft + dockWidth,
          bottom: absTop + dockHeight,
          width: dockWidth,
          height: dockHeight,
        };

        const distTop = Math.abs(dockRect.top - containerRect.top);
        const distBottom = Math.abs(containerRect.bottom - dockRect.bottom);
        const distLeft = Math.abs(dockRect.left - containerRect.left);
        const distRight = Math.abs(containerRect.right - dockRect.right);

        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        let newEdge: DockPosition = "float";
        let nextOrientation: DockOrientation = orientation;
        if (minDist <= snapThreshold) {
          if (minDist === distBottom) {
            newEdge = "bottom";
            nextOrientation = "horizontal";
          } else if (minDist === distTop) {
            newEdge = "top";
            nextOrientation = "horizontal";
          } else if (minDist === distLeft) {
            newEdge = "left";
            nextOrientation = "vertical";
          } else {
            newEdge = "right";
            nextOrientation = "vertical";
          }
        } else {
          newEdge = "float";
          // Floating preserves existing orientation!
        }

        const maxAvailableX = Math.max(1, containerRect.width - dockRect.width);
        const maxAvailableY = Math.max(1, containerRect.height - dockRect.height);

        const ratioX = Math.max(
          0,
          Math.min(1, (dockRect.left - containerRect.left) / maxAvailableX)
        );
        const ratioY = Math.max(
          0,
          Math.min(1, (dockRect.top - containerRect.top) / maxAvailableY)
        );

        setOrientation(nextOrientation);
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
          localStorage.setItem("pixel_studio_dock_orientation", nextOrientation);
        } catch {}
      } else {
        suppressNextClickRef.current = false;
        setDragState({ isDragging: false, currentPos: null });
      }
    },
    [clearSuppressClickTimer, getHostBoundsRect, orientation, snapThreshold, onPositionChange]
  );

  const handlePointerCancel = useCallback(
    (e?: React.PointerEvent<HTMLDivElement>) => {
      isPointerDownRef.current = false;
      activePointerIdRef.current = null;
      hasMovedPastThresholdRef.current = false;
      suppressNextClickRef.current = false;
      clearSuppressClickTimer();
      if (e && dockRef.current) {
        try {
          if (dockRef.current.hasPointerCapture?.(e.pointerId)) {
            dockRef.current.releasePointerCapture(e.pointerId);
          }
        } catch {}
      }
      setDragState({ isDragging: false, currentPos: null });
    },
    [clearSuppressClickTimer]
  );

  const processPointerMove = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (!isPointerDownRef.current || isLocked || showMorphPanelShell) {
        return;
      }
      if (activePointerIdRef.current !== null && pointerId !== activePointerIdRef.current) {
        return;
      }

      const dx = clientX - dragStartPointerRef.current.x;
      const dy = clientY - dragStartPointerRef.current.y;
      const dist = Math.hypot(dx, dy);

      if (!hasMovedPastThresholdRef.current && dist >= 5) {
        hasMovedPastThresholdRef.current = true;
        try {
          dockRef.current?.setPointerCapture?.(pointerId);
        } catch {}
      }

      if (hasMovedPastThresholdRef.current) {
        const containerRect = getHostBoundsRect();
        const dockEl = dockRef.current;
        const dockWidth = dockEl?.offsetWidth || (isVertical ? 44 : 264);
        const dockHeight = dockEl?.offsetHeight || (isVertical ? 264 : 44);

        const newX = Math.max(
          0,
          Math.min(containerRect.width - dockWidth, dragStartDockPosRef.current.x + dx)
        );
        const newY = Math.max(
          0,
          Math.min(containerRect.height - dockHeight, dragStartDockPosRef.current.y + dy)
        );

        latestDragPosRef.current = { x: newX, y: newY };
        setDragState({
          isDragging: true,
          currentPos: { x: newX, y: newY },
        });
      }
    },
    [getHostBoundsRect, isLocked, isVertical, showMorphPanelShell]
  );

  // Global window pointer move/up/cancel fallback + unmount cleanup so fast flicks & state never break
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      processPointerMove(e.clientX, e.clientY, e.pointerId);
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }
      finishDragGesture(hasMovedPastThresholdRef.current, e.pointerId);
    };

    const handleWindowPointerCancel = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }
      handlePointerCancel();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      clearSuppressClickTimer();
      clearClosingTimer();
      isPointerDownRef.current = false;
      activePointerIdRef.current = null;
      hasMovedPastThresholdRef.current = false;
      suppressNextClickRef.current = false;
    };
  }, [
    processPointerMove,
    finishDragGesture,
    handlePointerCancel,
    clearSuppressClickTimer,
    clearClosingTimer,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Always clear stale drag / suppression flags on any new pointer interaction
    // BEFORE checking move handle so normal clicks are never blocked.
    clearSuppressClickTimer();
    suppressNextClickRef.current = false;
    hasMovedPastThresholdRef.current = false;

    if (isLocked || showMorphPanelShell) return;

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
    const containerRect = getHostBoundsRect();

    dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
    dragStartDockPosRef.current = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
    };
    latestDragPosRef.current = null;
    activePointerIdRef.current = e.pointerId;
    isPointerDownRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || isLocked || showMorphPanelShell) {
      if (isDragging) {
        setDragState({ isDragging: false, currentPos: null });
      }
      return;
    }
    processPointerMove(e.clientX, e.clientY, e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
      return;
    }
    finishDragGesture(hasMovedPastThresholdRef.current, e.pointerId);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (suppressNextClickRef.current) {
      clearSuppressClickTimer();
      suppressNextClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // ========================================================
  // EDGE-ANCHORED DOCK & EXPANDED MORPH PANEL GEOMETRY
  // ========================================================

  const containerWidth = hostSize.width;
  const containerHeight = hostSize.height;

  // Preserved collapsed/expanded-tools bar dimensions (single source of truth)
  const collapsedWidth = isVertical ? 44 : Math.min(containerWidth - 16, 264);
  const collapsedHeight = isVertical ? Math.min(containerHeight - 16, 264) : 44;
  const expandedWidth = isVertical ? 44 : Math.min(containerWidth - 16, 352);
  const expandedHeight = isVertical ? Math.min(containerHeight - 16, 352) : 44;

  const barWidth = Math.min(containerWidth, isExpanded ? expandedWidth : collapsedWidth);
  const barHeight = Math.min(containerHeight, isExpanded ? expandedHeight : collapsedHeight);

  const clampAlongAxis = (ratioVal: number, maxSpan: number, margin = 8) => {
    if (maxSpan <= margin * 2) return Math.max(0, maxSpan / 2);
    return Math.max(margin, Math.min(maxSpan - margin, ratioVal * maxSpan));
  };

  // Anchor from collapsed coordinates so the bottom/trailing More toggle stays stationary during expansion
  const collapsedMaxX = Math.max(0, containerWidth - collapsedWidth);
  const collapsedMaxY = Math.max(0, containerHeight - collapsedHeight);
  const collapsedLeft = clampAlongAxis(ratio.x, collapsedMaxX, 8);
  const collapsedTop = clampAlongAxis(ratio.y, collapsedMaxY, 8);

  const barRatioLeft =
    isExpanded && !isVertical
      ? Math.max(8, collapsedLeft + collapsedWidth - barWidth)
      : collapsedLeft;
  const barRatioTop =
    isExpanded && isVertical
      ? Math.max(8, collapsedTop + collapsedHeight - barHeight)
      : collapsedTop;

  const getDockBarRect = () => {
    if (edge === "bottom") {
      return {
        left: barRatioLeft,
        top: Math.max(0, containerHeight - barHeight),
        width: barWidth,
        height: barHeight,
      };
    }
    if (edge === "top") {
      return {
        left: barRatioLeft,
        top: 0,
        width: barWidth,
        height: barHeight,
      };
    }
    if (edge === "left") {
      return {
        left: 0,
        top: barRatioTop,
        width: barWidth,
        height: barHeight,
      };
    }
    if (edge === "right") {
      return {
        left: Math.max(0, containerWidth - barWidth),
        top: barRatioTop,
        width: barWidth,
        height: barHeight,
      };
    }
    return {
      left: barRatioLeft,
      top: barRatioTop,
      width: barWidth,
      height: barHeight,
    };
  };

  const dockBarRect = getDockBarRect();

  const getExpandedPanelRect = () => {
    const safeMargin = containerWidth < 640 ? 8 : 12;
    const isHorizontalEdge = edge === "top" || edge === "bottom";
    const desiredW = isHorizontalEdge ? 356 : 336;
    const desiredH = isHorizontalEdge ? 460 : 540;

    const maxAvailW =
      edge === "left" || edge === "right"
        ? Math.max(200, containerWidth - safeMargin)
        : Math.max(200, containerWidth - safeMargin * 2);
    const maxAvailH =
      edge === "top" || edge === "bottom"
        ? Math.max(180, containerHeight - safeMargin)
        : Math.max(180, containerHeight - safeMargin * 2);

    const panelWidth = Math.min(desiredW, maxAvailW, containerWidth);
    const panelHeight = Math.min(desiredH, maxAvailH, containerHeight);

    const dockCenterX = dockBarRect.left + dockBarRect.width / 2;
    const dockCenterY = dockBarRect.top + dockBarRect.height / 2;

    const clampHorizontal = (rawLeft: number) => {
      const maxLeft = containerWidth - panelWidth - safeMargin;
      if (maxLeft <= safeMargin) {
        return Math.max(0, Math.round((containerWidth - panelWidth) / 2));
      }
      return Math.round(Math.max(safeMargin, Math.min(maxLeft, rawLeft)));
    };

    const clampVertical = (rawTop: number) => {
      const maxTop = containerHeight - panelHeight - safeMargin;
      if (maxTop <= safeMargin) {
        return Math.max(0, Math.round((containerHeight - panelHeight) / 2));
      }
      return Math.round(Math.max(safeMargin, Math.min(maxTop, rawTop)));
    };

    if (edge === "left") {
      return {
        left: 0,
        top: clampVertical(dockCenterY - panelHeight / 2),
        width: panelWidth,
        height: panelHeight,
      };
    }

    if (edge === "right") {
      return {
        left: Math.max(0, containerWidth - panelWidth),
        top: clampVertical(dockCenterY - panelHeight / 2),
        width: panelWidth,
        height: panelHeight,
      };
    }

    if (edge === "top") {
      return {
        left: clampHorizontal(dockCenterX - panelWidth / 2),
        top: 0,
        width: panelWidth,
        height: panelHeight,
      };
    }

    if (edge === "bottom") {
      return {
        left: clampHorizontal(dockCenterX - panelWidth / 2),
        top: Math.max(0, containerHeight - panelHeight),
        width: panelWidth,
        height: panelHeight,
      };
    }

    // Floating: expands evenly around the dock's existing center within safe bounds
    return {
      left: clampHorizontal(dockCenterX - panelWidth / 2),
      top: clampVertical(dockCenterY - panelHeight / 2),
      width: panelWidth,
      height: panelHeight,
    };
  };

  const expandedPanelRect = getExpandedPanelRect();

  const getShellCornerRadii = (forPanel: boolean) => {
    const r = forPanel ? 18 : 16;
    if (isDragging || edge === "float") {
      return {
        borderTopLeftRadius: r,
        borderTopRightRadius: r,
        borderBottomRightRadius: r,
        borderBottomLeftRadius: r,
      };
    }
    switch (edge) {
      case "bottom":
        return {
          borderTopLeftRadius: r,
          borderTopRightRadius: r,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        };
      case "top":
        return {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: r,
          borderBottomLeftRadius: r,
        };
      case "left":
        return {
          borderTopLeftRadius: 0,
          borderTopRightRadius: r,
          borderBottomRightRadius: r,
          borderBottomLeftRadius: 0,
        };
      case "right":
        return {
          borderTopLeftRadius: r,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: r,
        };
      default:
        return {
          borderTopLeftRadius: r,
          borderTopRightRadius: r,
          borderBottomRightRadius: r,
          borderBottomLeftRadius: r,
        };
    }
  };

  const getEdgeBorderClasses = () => {
    if (isDragging || edge === "float") {
      return "border border-white/15";
    }
    switch (edge) {
      case "bottom":
        return "border border-white/15 border-b-0";
      case "top":
        return "border border-white/15 border-t-0";
      case "left":
        return "border border-white/15 border-l-0";
      case "right":
        return "border border-white/15 border-r-0";
      default:
        return "border border-white/15";
    }
  };

  const getShadowClass = () => {
    if (isDragging) {
      return "shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/20";
    }
    if (showMorphPanelShell) {
      return "shadow-[0_24px_64px_rgba(0,0,0,0.88)]";
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

  const activeToolEntry =
    PRIMARY_DOCK_TOOLS.find(
      (t) =>
        t.id === displayTool ||
        (t.id === "media" && displayTool === "images")
    ) ||
    ADDITIONAL_DOCK_TOOLS.find(
      (t) =>
        t.id === displayTool ||
        (t.id === "canvas" && displayTool === "background")
    );
  const ActiveSectionIcon = activeToolEntry?.icon || Layers;
  const activeSectionTitle = getDooryToolTitle(displayTool);

  const targetShellGeometry =
    isDragging && dragCurrentPos
      ? {
          left: dragCurrentPos.x,
          top: dragCurrentPos.y,
          width: dockBarRect.width,
          height: dockBarRect.height,
          ...getShellCornerRadii(false),
        }
      : isPanelExpanded
      ? {
          left: expandedPanelRect.left,
          top: expandedPanelRect.top,
          width: expandedPanelRect.width,
          height: expandedPanelRect.height,
          ...getShellCornerRadii(true),
        }
      : {
          left: dockBarRect.left,
          top: dockBarRect.top,
          width: dockBarRect.width,
          height: dockBarRect.height,
          ...getShellCornerRadii(false),
        };

  const shellTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : isDragging
    ? { duration: 0 }
    : isPanelExpanded
    ? { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const }
    : isClosingPanel
    ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    : { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <motion.div
      ref={dockRef}
      initial={false}
      animate={targetShellGeometry}
      transition={shellTransition}
      style={{
        position: "absolute",
        right: "auto",
        bottom: "auto",
        zIndex: isDragging ? 50 : showMorphPanelShell ? 45 : 40,
        touchAction: showMorphPanelShell ? "auto" : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      className={`select-none font-mono pointer-events-auto ${
        isDragging ? "cursor-grabbing" : ""
      }`}
      data-testid="studio-floating-dock"
      data-dock-orientation={orientation}
      data-dock-edge={edge}
      data-dock-expanded={isExpanded}
      data-dock-panel-open={isPanelExpanded}
      data-active-tool={displayTool || ""}
      data-last-tool={lastSelectedTool || ""}
    >
      {/* Unified Morphing Dock / Tool Panel Shell */}
      <div
        className={`bg-[#0b0b0f]/98 backdrop-blur-2xl flex flex-col overflow-hidden relative w-full h-full ${getEdgeBorderClasses()} ${getShadowClass()}`}
        style={{
          borderRadius: "inherit",
        }}
      >
        {/* Subtle Edge Contact Line */}
        {!isDragging && edge === "bottom" && (
          <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-20" />
        )}
        {!isDragging && edge === "top" && (
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-20" />
        )}
        {!isDragging && edge === "left" && (
          <div className="absolute left-0 inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent pointer-events-none z-20" />
        )}
        {!isDragging && edge === "right" && (
          <div className="absolute right-0 inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent pointer-events-none z-20" />
        )}

        <AnimatePresence mode="wait" initial={false}>
          {showMorphPanelShell && displayTool ? (
            <motion.section
              key="dock-morphed-panel"
              id="dock-morphed-tool-panel"
              role="region"
              aria-label={activeSectionTitle}
              data-testid="doory-drawer-host"
              data-active-tool={displayTool}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={
                isClosingPanel
                  ? prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 4 }
                  : { opacity: 1, y: 0 }
              }
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : isClosingPanel
                  ? { duration: 0.14, ease: "easeIn" }
                  : { duration: 0.19, delay: 0.06, ease: "easeOut" }
              }
              className="flex flex-col w-full h-full min-h-0"
            >
              {/* Expanded Tool Panel Header */}
              <div className="h-11 px-4 border-b border-[#1e1e24] flex items-center justify-between shrink-0 bg-[#0a0a0d]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] shrink-0" aria-hidden="true" />
                  <ActiveSectionIcon size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate">
                    {activeSectionTitle}
                  </h3>
                </div>
                <button
                  ref={panelCloseBtnRef}
                  type="button"
                  onClick={handleRequestClosePanel}
                  disabled={isClosingPanel}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Close tool panel (Esc)"
                  aria-label="Close tool panel"
                  data-testid="doory-drawer-close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Integrated Existing Tool Panel Body */}
              <div className="flex-1 min-h-0 flex flex-col">
                {renderToolPanel ? renderToolPanel(displayTool) : null}
              </div>
            </motion.section>
          ) : (
            <motion.div
              key="dock-collapsed-bar"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: 0.14, ease: "easeOut" }
              }
              className={`flex ${
                isVertical ? "flex-col py-1.5 px-1" : "flex-row px-2 py-1"
              } items-center w-full h-full gap-1.5`}
              data-testid={isExpanded ? "dock-expanded-container" : "dock-collapsed-container"}
            >
              {/* Top / Leading Move Handle (Single visible control for movement & lock) */}
              <button
                type="button"
                data-dock-move-handle="true"
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
                    id: "dock-lock",
                    label: isLocked ? "Dock is Locked" : "Move Dock",
                    desc: isLocked
                      ? `Dock is locked in place. Click or press [${formatShortcutDisplay(lockShortcut)}] to unlock.`
                      : `Drag handle to move dock. Click or press [${formatShortcutDisplay(lockShortcut)}] to lock.`,
                    hotkey: formatShortcutDisplay(lockShortcut),
                  })
                }
                onMouseLeave={hideTooltip}
                className={`transition-colors flex items-center justify-center shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer ${
                  isLocked
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-neutral-500 hover:text-neutral-300 cursor-grab active:cursor-grabbing"
                } ${isVertical ? "w-8 h-4 my-0.5" : "w-4 h-8 mx-0.5"}`}
                title={isLocked ? "Dock Locked" : "Drag to move dock"}
                aria-label={isLocked ? "Unlock dock position" : "Drag handle or click to lock dock"}
                aria-pressed={isLocked}
              >
                {isLocked ? (
                  <Lock size={12} className="shrink-0" />
                ) : isVertical ? (
                  <GripHorizontal size={13} />
                ) : (
                  <GripVertical size={13} />
                )}
              </button>

              {/* 5 Primary Tool Icons */}
              {PRIMARY_DOCK_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const active = isToolActive(tool.id);

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={(e) => handleToolClick(tool.id, e.currentTarget)}
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
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150 relative cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      active
                        ? "bg-white/18 text-white border border-white/25 shadow-sm shadow-black/40"
                        : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                    aria-label={tool.label}
                    aria-expanded={active}
                    aria-controls="dock-morphed-tool-panel"
                  >
                    <Icon size={16} />
                    {active && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#d71920]" />
                    )}
                  </button>
                );
              })}

              {/* Additional Tools Revealed ABOVE Bottom Toggle (No Redundant Move/Lock Controls) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="dock-additional-tools"
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.01 }
                        : { duration: 0.17, ease: "easeOut" }
                    }
                    className={`flex items-center shrink-0 ${
                      isVertical ? "flex-col gap-1.5" : "flex-row gap-1.5"
                    }`}
                    data-testid="dock-additional-tools-group"
                  >
                    {/* Orientation-aligned Divider */}
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
                          onClick={(e) => handleToolClick(tool.id, e.currentTarget)}
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
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150 relative cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                            active
                              ? "bg-white/18 text-white border border-white/25 shadow-sm shadow-black/40"
                              : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                          }`}
                          aria-label={tool.label}
                          aria-expanded={active}
                          aria-controls="dock-morphed-tool-panel"
                        >
                          <Icon size={16} />
                          {active && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#d71920]" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Persistent Bottom / Trailing More Toggle (Anchored in place; switches PanelTop <-> Arrow) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hideTooltip();
                  setIsExpanded((prev) => !prev);
                }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    id: "dock-expand",
                    label: isExpanded ? "Collapse Tools" : "More Tools",
                    desc: isExpanded
                      ? "Hide additional canvas & layer tools"
                      : "Reveal Canvas & Layers tools above",
                  })
                }
                onMouseLeave={hideTooltip}
                onFocus={(e) =>
                  showTooltip(e, {
                    id: "dock-expand",
                    label: isExpanded ? "Collapse Tools" : "More Tools",
                    desc: isExpanded
                      ? "Hide additional canvas & layer tools"
                      : "Reveal Canvas & Layers tools above",
                  })
                }
                onBlur={hideTooltip}
                data-testid="dock-more-toggle"
                data-expanded={isExpanded}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isVertical ? "mt-auto" : "ml-auto"
                } ${
                  isExpanded
                    ? "text-white bg-white/12 hover:bg-white/20 border border-white/15"
                    : "text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
                aria-label={isExpanded ? "Collapse additional tools" : "More tools"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  isVertical ? (
                    <ChevronUp size={15} />
                  ) : (
                    <ChevronLeft size={15} />
                  )
                ) : (
                  <PanelTop size={16} />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Portaled Collision-Aware Floating Tooltip */}
      <DockPortalTooltip tooltip={showMorphPanelShell ? null : dockTooltip} dockEdge={edge} />
    </motion.div>
  );
};
