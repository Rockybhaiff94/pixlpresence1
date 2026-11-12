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
} from "lucide-react";
import { StudioTab } from "@/types/studio";
import { StudioView } from "./StudioTopBar";

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
  activeCategory: StudioTab;
  currentView: StudioView;
  isSettingsOpen: boolean;
  onSelectTool: (tool: ToolSelection) => void;
  onCloseSettings: () => void;
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
      if (onDockModeChange) {
        onDockModeChange(mode);
      } else {
        setInternalMode(mode);
      }
      if (mode === "main") {
        onCloseSettings();
      }
    },
    [onDockModeChange, onCloseSettings]
  );

  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const directoryScrollRef = useRef<HTMLDivElement>(null);

  // Position & Edge Attachment State
  const [edge, setEdge] = useState<DockPosition>(externalPosition || "bottom");
  // Normalized position along the attached edge or in floating space (0.0 to 1.0)
  const [ratio, setRatio] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Customizable Lock State & Shortcut
  const [isLocked, setIsLocked] = useState<boolean>(propLocked ?? false);
  const [lockShortcut, setLockShortcut] = useState<string>(propShortcut || "CapsLock");

  // More Options Panel Size (40% to 100%, default 100%)
  const panelSize = Math.max(40, Math.min(100, propPanelSize ?? 100));
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

  // Dragging State Machine
  const [isDragging, setIsDragging] = useState(false);
  const isPointerDownRef = useRef(false);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartDockPosRef = useRef({ x: 0, y: 0 });
  const hasMovedPastThresholdRef = useRef(false);
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);

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

  // Sync with external isSettingsOpen: if settings opened from canvas, switch to settings mode
  useEffect(() => {
    if (isSettingsOpen && dockMode === "main") {
      setDockMode("settings");
    } else if (!isSettingsOpen && dockMode === "settings") {
      setDockMode("main");
    }
  }, [isSettingsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine orientation: Left and Right are vertical; Top, Bottom and Float are horizontal
  const isVertical = edge === "left" || edge === "right";

  // ========================================================
  // MODE A: PRIMARY 5 ICONS (EXACT ORDER & SPECS PRESERVED)
  // ========================================================
  const PRIMARY_TOOLS: Array<{
    id: StudioTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    hotkey?: string;
  }> = [
    { id: "layout", label: "Layout & Structure", icon: Layout, hotkey: "1" },
    { id: "identity", label: "Profile & Avatar", icon: User, hotkey: "2" },
    { id: "typography", label: "Typography & Fonts", icon: Type, hotkey: "3" },
    { id: "rpc", label: "Discord Rich Presence", icon: Gamepad2, hotkey: "4" },
  ];

  // ========================================================
  // MODE B: APP DIRECTORY CATEGORIES & 1:1 SQUARE ICONS
  // ========================================================
  interface AppDirectoryItem {
    id: string;
    label: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    type: "settings" | "view" | "action";
    tab?: StudioTab;
    view?: StudioView;
    action?: string;
  }

  interface AppDirectoryGroup {
    id: string;
    title: string;
    items: AppDirectoryItem[];
  }

  const APP_GROUPS: AppDirectoryGroup[] = [
    {
      id: "profile-layout",
      title: "Profile & Layout",
      items: [
        {
          id: "layout",
          label: "Layout & Structure",
          desc: "Canvas size, padding & gaps",
          icon: Layout,
          type: "settings",
          tab: "layout",
        },
        {
          id: "identity",
          label: "Profile Identity",
          desc: "Name, bio & verification",
          icon: User,
          type: "settings",
          tab: "identity",
        },
        {
          id: "add-embed",
          label: "Add Embed",
          desc: "Create modular container",
          icon: PlusSquare,
          type: "action",
          action: "addEmbed",
        },
        {
          id: "avatar",
          label: "Avatar & Media",
          desc: "Borders, shapes & frames",
          icon: ImageIcon,
          type: "settings",
          tab: "avatar",
        },
      ],
    },
    {
      id: "content-editing",
      title: "Content & Editing",
      items: [
        {
          id: "typography",
          label: "Typography & Fonts",
          desc: "Fonts, sizes & inheritance",
          icon: Type,
          type: "settings",
          tab: "typography",
        },
        {
          id: "add-text",
          label: "Add Text Element",
          desc: "Insert editable text to canvas",
          icon: FileText,
          type: "action",
          action: "addText",
        },
        {
          id: "background",
          label: "Backgrounds",
          desc: "Gradients, solid colors & patterns",
          icon: Palette,
          type: "settings",
          tab: "background",
        },
        {
          id: "buttons",
          label: "Buttons & Links",
          desc: "Action buttons & links",
          icon: Link2,
          type: "settings",
          tab: "buttons",
        },
        {
          id: "socials",
          label: "Social Media Accounts",
          desc: "Verified linked account badges",
          icon: Share2,
          type: "action",
          action: "openSocials",
        },
      ],
    },
    {
      id: "gaming-activity",
      title: "Gaming & Activity",
      items: [
        {
          id: "rpc",
          label: "Discord Rich Presence",
          desc: "Live gaming telemetry & presence",
          icon: Gamepad2,
          type: "settings",
          tab: "rpc",
        },
        {
          id: "rpc-customizer",
          label: "RPC Card Designer",
          desc: "Level 2 miniature canvas customizer",
          icon: Sparkles,
          type: "action",
          action: "openRpcCustomizer",
        },
      ],
    },
    {
      id: "customization-effects",
      title: "Customization & Effects",
      items: [
        {
          id: "effects",
          label: "Visual Effects & Motion",
          desc: "Glow, neon & particle presets",
          icon: Flame,
          type: "settings",
          tab: "effects",
        },
        {
          id: "css",
          label: "Custom CSS Rules",
          desc: "Direct CSS rule editor",
          icon: Code2,
          type: "settings",
          tab: "css",
        },
      ],
    },
    {
      id: "settings-utilities",
      title: "Settings & Utilities",
      items: [
        {
          id: "templates",
          label: "Design Templates",
          desc: "Pre-made design presets",
          icon: LayoutTemplate,
          type: "view",
          view: "templates",
        },
        {
          id: "layers",
          label: "Layers & Z-Order",
          desc: "Hierarchy & visibility locking",
          icon: Layers,
          type: "view",
          view: "layers",
        },
        {
          id: "advanced",
          label: "Advanced System",
          desc: "Precision & dock preferences",
          icon: Settings,
          type: "settings",
          tab: "advanced",
        },
      ],
    },
  ];

  // ========================================================
  // CORE POINTER DRAG & INTELLIGENT EDGE SNAPPING SYSTEM
  // ========================================================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button (left click)
    if (e.button !== 0) return;

    // If dock is locked, dragging is disabled entirely
    if (isLocked) return;

    // Don't drag if interacting with an input/textarea/select
    const target = e.target as HTMLElement;
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
    if (!isPointerDownRef.current || isLocked) return;

    const dx = e.clientX - dragStartPointerRef.current.x;
    const dy = e.clientY - dragStartPointerRef.current.y;
    const dist = Math.hypot(dx, dy);

    // 4–6px Drag Threshold to separate clicks from drags
    if (!hasMovedPastThresholdRef.current && dist >= 5) {
      hasMovedPastThresholdRef.current = true;
      setIsDragging(true);
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

      setDragCurrentPos({ x: newX, y: newY });
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
      setIsDragging(false);

      const container = containerRef?.current || document.body;
      const containerRect = container.getBoundingClientRect();
      const dockEl = dockRef.current;
      if (!dockEl) return;

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
      setDragCurrentPos(null);

      onPositionChange(newEdge);

      try {
        localStorage.setItem("pixel_studio_dock_position", newEdge);
        localStorage.setItem(
          "pixel_studio_dock_coords",
          JSON.stringify({ edge: newEdge, ratioX, ratioY })
        );
      } catch {}
    } else {
      // Click interaction: no drag
      setIsDragging(false);
      setDragCurrentPos(null);
    }
  };

  // Suppress clicks on child buttons if a drag just occurred
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedPastThresholdRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Click on a primary dock tool in Mode A
  const handlePrimaryClick = (toolId: StudioTab) => {
    if (dockMode === "settings" && currentView === "categories" && activeCategory === toolId) {
      // Toggle collapse back to Mode A
      setDockMode("main");
    } else {
      onSelectTool({
        type: "category",
        id: toolId,
        label: PRIMARY_TOOLS.find((t) => t.id === toolId)?.label || "",
      });
      setDockMode("settings");
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

  // Click on an item in the App Directory (Mode B)
  const handleDirectoryItemClick = (item: AppDirectoryItem) => {
    if (item.type === "settings" && item.tab) {
      onSelectTool({ type: "category", id: item.tab, label: item.label });
      setDockMode("settings");
    } else if (item.type === "view" && item.view) {
      onSelectTool({ type: "view", id: item.view, label: item.label });
      setDockMode("settings");
    } else if (item.type === "action") {
      if (item.action === "addEmbed") onAddEmbed?.();
      else if (item.action === "addText") onAddElement?.("text");
      else if (item.action === "openSocials") onOpenSocialSelector?.();
      else if (item.action === "openRpcCustomizer") onOpenRpcCustomizer?.();
    }
  };

  // ========================================================
  // POSITION-AWARE DOCK & MORE OPTIONS EXPANSION CALCULATIONS
  // ========================================================

  const computeDockStyle = (): React.CSSProperties => {
    const container = containerRef?.current;
    const containerWidth = container
      ? container.clientWidth
      : typeof window !== "undefined"
      ? window.innerWidth
      : 1200;
    const containerHeight = container
      ? container.clientHeight
      : typeof window !== "undefined"
      ? window.innerHeight
      : 800;

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

    // Base dimensions for Expanded Panels (Mode B Directory & Mode C Settings)
    const baseExpandedWidth = isVertical ? 420 : 540;
    const baseExpandedHeight = isVertical ? 760 : 560;

    // Apply User-Configured More Options Panel Size (40% to 100%)
    const effectiveExpandedWidth = Math.min(
      containerWidth - 24,
      Math.max(Math.round(baseExpandedWidth * 0.4), Math.round(baseExpandedWidth * panelScale))
    );
    const effectiveExpandedHeight = Math.min(
      containerHeight - 40,
      Math.max(Math.round(baseExpandedHeight * 0.4), Math.round(baseExpandedHeight * panelScale))
    );

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
            {/* Drag Handle or Subtle Lock Indicator (Sections 2 & 3) */}
            <div
              onClick={() => {
                const nextLock = !isLocked;
                setIsLocked(nextLock);
                try {
                  localStorage.setItem("pixel_studio_dock_locked", String(nextLock));
                } catch {}
                onDockLockChange?.(nextLock);
              }}
              className={`transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                isLocked
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-neutral-500 hover:text-neutral-300 cursor-grab active:cursor-grabbing"
              } ${isVertical ? "w-8 h-4 my-0.5" : "w-4 h-8 mx-0.5"}`}
              title={
                isLocked
                  ? `Dock is locked [${formatShortcutDisplay(lockShortcut)} to unlock]`
                  : `Drag dock to move or snap to any screen edge [${formatShortcutDisplay(
                      lockShortcut
                    )} to lock]`
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

            {/* 4 Primary Customization Tool Icons */}
            {PRIMARY_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive =
                isSettingsOpen &&
                currentView === "categories" &&
                activeCategory === tool.id;

              return (
                <div key={tool.id} className="relative group">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrimaryClick(tool.id);
                    }}
                    aria-label={tool.label}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.45)] scale-105"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon size={17} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white shadow" />
                    )}
                  </button>
                </div>
              );
            })}

            {/* Separator Line */}
            <div
              className={`${
                isVertical ? "w-5 h-[1px] my-0.5" : "w-[1px] h-5 mx-0.5"
              } bg-white/10 shrink-0`}
            />

            {/* 5th Icon: More Options (Dotted Grid Icon) */}
            <div className="relative group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMore();
                }}
                aria-label="More Options (Expand App Directory)"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <LayoutGrid size={17} />
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
                    <span>APP DIRECTORY</span>
                    {panelSize !== 100 && (
                      <span className="text-[8px] text-neutral-500 font-mono">
                        ({panelSize}%)
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    All Studio Applications
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDockMode("main")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-white/10"
                  title="Collapse to Main Dock"
                >
                  <X size={12} />
                  <span>Collapse</span>
                </button>
              </div>
            </div>

            {/* Scrollable Directory Categorized Icon Grids (Scaled by panelScale) */}
            <div
              ref={directoryScrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5"
            >
              {APP_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      {group.title}
                    </span>
                    <span className="text-[9px] text-neutral-600 font-mono">
                      {group.items.length} tools
                    </span>
                  </div>

                  {/* 1:1 Perfect Square Application Icons */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isHovered = hoveredTool === item.id;
                      const isSelected =
                        isSettingsOpen &&
                        ((item.type === "settings" && activeCategory === item.tab) ||
                          (item.type === "view" && currentView === item.view));

                      return (
                        <div key={item.id} className="relative flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleDirectoryItemClick(item)}
                            onMouseEnter={() => setHoveredTool(item.id)}
                            onMouseLeave={() => setHoveredTool(null)}
                            onFocus={() => setHoveredTool(item.id)}
                            onBlur={() => setHoveredTool(null)}
                            aria-label={item.label}
                            className={`w-full aspect-square rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer border ${
                              isSelected
                                ? "bg-white text-black font-bold border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105"
                                : "bg-[#141418]/80 hover:bg-[#1f1f26] text-neutral-300 hover:text-white border-white/10 hover:border-white/25 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            }`}
                          >
                            <Icon size={22} className="shrink-0" />
                          </button>

                          {/* Tooltip on Hover or Focus (Non-Permanent Label) */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="absolute -top-10 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-[10px] font-mono tracking-wider whitespace-nowrap shadow-2xl flex items-center gap-1.5"
                              >
                                <span className="font-bold">{item.label}</span>
                                <span className="text-[9px] text-neutral-400">
                                  // {item.desc}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Edge Placement Interactive Controls (Section 10 & 11) */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Move size={11} />
                    <span>Dock Screen Placement</span>
                  </span>
                  <span className="text-[9px] text-neutral-400 capitalize">
                    Active: {edge}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["bottom", "top", "left", "right", "float"] as DockPosition[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setEdge(pos);
                        onPositionChange(pos);
                        try {
                          localStorage.setItem("pixel_studio_dock_position", pos);
                          localStorage.setItem(
                            "pixel_studio_dock_coords",
                            JSON.stringify({ edge: pos, ratioX: ratio.x, ratioY: ratio.y })
                          );
                        } catch {}
                      }}
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
                  panelSize,
                  onBack: () => setDockMode("directory"),
                  onClose: () => setDockMode("main"),
                })
              ) : (
                <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                  Settings view ready
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
