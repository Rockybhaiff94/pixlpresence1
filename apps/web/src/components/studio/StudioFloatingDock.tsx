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
}

export const StudioFloatingDock: React.FC<StudioFloatingDockProps> = ({
  position,
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

  const isVertical = position === "left" || position === "right";

  // Handle Drag & Snap to Nearest Screen Edge
  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    const container = containerRef?.current || document.body;
    const rect = container.getBoundingClientRect();
    const { x, y } = info.point;

    const distTop = Math.abs(y - rect.top);
    const distBottom = Math.abs(rect.bottom - y);
    const distLeft = Math.abs(x - rect.left);
    const distRight = Math.abs(rect.right - x);

    const min = Math.min(distTop, distBottom, distLeft, distRight);
    const threshold = 120; // 120px edge snap threshold

    let newPos: DockPosition = "bottom";
    if (min <= threshold) {
      if (min === distBottom) newPos = "bottom";
      else if (min === distTop) newPos = "top";
      else if (min === distLeft) newPos = "left";
      else newPos = "right";
    } else {
      newPos = "float";
    }

    onPositionChange(newPos);
    try {
      localStorage.setItem("pixel_studio_dock_position", newPos);
    } catch {}
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

  // Edge positioning classes (Dock Attachment & Inward Placement)
  const getDockPositionClasses = () => {
    switch (position) {
      case "bottom":
        return "bottom-0 left-1/2 -translate-x-1/2";
      case "top":
        return "top-0 left-1/2 -translate-x-1/2";
      case "left":
        return "left-0 top-1/2 -translate-y-1/2";
      case "right":
        return "right-0 top-1/2 -translate-y-1/2";
      case "float":
      default:
        return "bottom-6 left-1/2 -translate-x-1/2";
    }
  };

  // Adaptive Attached Corner Classes (Section 11)
  const getCornerClasses = () => {
    if (dockMode === "main") {
      switch (position) {
        case "bottom":
          return "rounded-t-full rounded-b-none border-b-0";
        case "top":
          return "rounded-b-full rounded-t-none border-t-0";
        case "left":
          return "rounded-r-full rounded-l-none border-l-0";
        case "right":
          return "rounded-l-full rounded-r-none border-r-0";
        case "float":
        default:
          return "rounded-full";
      }
    }

    // In Mode B & Mode C (Expanded Directory & Settings)
    switch (position) {
      case "bottom":
        return "rounded-t-2xl rounded-b-none border-b-0";
      case "top":
        return "rounded-b-2xl rounded-t-none border-t-0";
      case "left":
        return "rounded-r-2xl rounded-l-none border-l-0";
      case "right":
        return "rounded-l-2xl rounded-r-none border-r-0";
      case "float":
      default:
        return "rounded-2xl";
    }
  };

  return (
    <div
      ref={dockRef}
      className={`absolute z-40 ${getDockPositionClasses()} select-none font-mono pointer-events-auto`}
    >
      {/* ======================================================== */}
      {/* ONE UNIFIED DOCK CONTAINER (MODES A, B, C)               */}
      {/* ======================================================== */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={`bg-[#0a0a0d]/96 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all duration-300 ${getCornerClasses()} ${
          dockMode === "main"
            ? isVertical
              ? "w-auto py-2 px-1.5"
              : "h-auto px-2 py-1.5"
            : isVertical
            ? "w-[94vw] sm:w-[540px] md:w-[580px] max-w-[620px] max-h-[82vh]"
            : "w-[94vw] sm:w-[540px] md:w-[580px] max-w-[620px] max-h-[78vh]"
        }`}
      >
        {/* ====================================================== */}
        {/* MODE A: MAIN DOCK (ORIGINAL 5 ICONS)                   */}
        {/* ====================================================== */}
        {dockMode === "main" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            drag
            dragConstraints={containerRef || undefined}
            dragElastic={0.08}
            dragSnapToOrigin={true}
            onDragEnd={handleDragEnd}
            className={`flex ${
              isVertical ? "flex-col" : "flex-row"
            } items-center gap-1.5 cursor-grab active:cursor-grabbing`}
          >
            {/* Drag Handle Indicator */}
            <div
              className={`text-neutral-500 hover:text-neutral-300 transition-colors p-1 flex items-center justify-center shrink-0 ${
                isVertical ? "cursor-ns-resize" : "cursor-ew-resize"
              }`}
              title="Drag dock to snap to any screen edge"
            >
              {isVertical ? <GripVertical size={13} /> : <GripHorizontal size={13} />}
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
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                    aria-label={tool.label}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
                    )}
                  </button>

                  {/* Tooltip on Hover */}
                  <AnimatePresence>
                    {hoveredTool === tool.id && (
                      <motion.div
                        initial={{ opacity: 0, y: isVertical ? 0 : 4, x: isVertical ? 4 : 0 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-[10px] font-mono tracking-wider whitespace-nowrap shadow-xl ${
                          position === "bottom"
                            ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
                            : position === "top"
                            ? "top-full mt-2 left-1/2 -translate-x-1/2"
                            : position === "left"
                            ? "left-full ml-2 top-1/2 -translate-y-1/2"
                            : "right-full mr-2 top-1/2 -translate-y-1/2"
                        }`}
                      >
                        <span>{tool.label}</span>
                        {tool.hotkey && (
                          <span className="ml-1.5 px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 text-[9px]">
                            [{tool.hotkey}]
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Separator Line */}
            <div
              className={`${
                isVertical ? "w-6 h-[1px] my-0.5" : "w-[1px] h-6 mx-0.5"
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
                onMouseEnter={() => setHoveredTool("more")}
                onMouseLeave={() => setHoveredTool(null)}
                aria-label="More Options (Expand App Directory)"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <LayoutGrid size={18} />
              </button>

              <AnimatePresence>
                {hoveredTool === "more" && (
                  <motion.div
                    initial={{ opacity: 0, y: isVertical ? 0 : 4, x: isVertical ? 4 : 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-[10px] font-mono tracking-wider whitespace-nowrap shadow-xl ${
                      position === "bottom"
                        ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
                        : position === "top"
                        ? "top-full mt-2 left-1/2 -translate-x-1/2"
                        : position === "left"
                        ? "left-full ml-2 top-1/2 -translate-y-1/2"
                        : "right-full mr-2 top-1/2 -translate-y-1/2"
                    }`}
                  >
                    <span>More Options (App Directory)</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ====================================================== */}
        {/* MODE B: EXPANDED APP DIRECTORY (1:1 SQUARE ICON GRID) */}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101014] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  <LayoutGrid size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>APP DIRECTORY</span>
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

            {/* Scrollable Directory Categorized Icon Grids */}
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
                    Active: {position}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["bottom", "top", "left", "right", "float"] as DockPosition[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        onPositionChange(pos);
                        try {
                          localStorage.setItem("pixel_studio_dock_position", pos);
                        } catch {}
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                        position === pos
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
      </motion.div>
    </div>
  );
};
