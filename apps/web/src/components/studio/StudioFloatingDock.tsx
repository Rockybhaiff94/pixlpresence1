"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { StudioTab } from "@/types/studio";
import { StudioView } from "./StudioTopBar";

export type DockPosition = "bottom" | "top" | "left" | "right";

export interface ToolSelection {
  type: "category" | "view";
  id: StudioTab | StudioView;
  label: string;
}

interface StudioFloatingDockProps {
  position: DockPosition;
  onPositionChange: (pos: DockPosition) => void;
  activeCategory: StudioTab;
  currentView: StudioView;
  isSettingsOpen: boolean;
  onSelectTool: (tool: ToolSelection) => void;
  onCloseSettings: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
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
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 4 Primary Customization Tools in Collapsed Mode + 5th More Options
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

  // Secondary Tools available in More Options
  const MORE_CATEGORIES: Array<{
    type: "category";
    id: StudioTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    desc: string;
  }> = [
    { type: "category", id: "avatar", label: "Avatar & Media", icon: ImageIcon, desc: "Borders, shapes & frames" },
    { type: "category", id: "background", label: "Backgrounds", icon: Palette, desc: "Colors, images & gradients" },
    { type: "category", id: "buttons", label: "Buttons & Links", icon: Link2, desc: "Action buttons & socials" },
    { type: "category", id: "effects", label: "Effects & Motion", icon: Sparkles, desc: "Glow, blur & particles" },
    { type: "category", id: "css", label: "Custom CSS", icon: Code2, desc: "Direct CSS rule editor" },
    { type: "category", id: "advanced", label: "Advanced", icon: Settings, desc: "Fine-tune system settings" },
  ];

  const SYSTEM_VIEWS: Array<{
    type: "view";
    id: StudioView;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    desc: string;
  }> = [
    { type: "view", id: "templates", label: "Templates", icon: LayoutTemplate, desc: "Pre-made design presets" },
    { type: "view", id: "layers", label: "Layers", icon: Layers, desc: "Z-order & visibility hierarchy" },
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

    if (min === distBottom) {
      onPositionChange("bottom");
    } else if (min === distTop) {
      onPositionChange("top");
    } else if (min === distLeft) {
      onPositionChange("left");
    } else {
      onPositionChange("right");
    }
  };

  // Click on a primary dock tool
  const handlePrimaryClick = (toolId: StudioTab) => {
    setIsMoreOpen(false);
    if (isSettingsOpen && currentView === "categories" && activeCategory === toolId) {
      onCloseSettings();
    } else {
      onSelectTool({ type: "category", id: toolId, label: PRIMARY_TOOLS.find((t) => t.id === toolId)?.label || "" });
    }
  };

  // Click on More Options toggle
  const handleToggleMore = () => {
    setIsMoreOpen((prev) => !prev);
  };

  // Click on a secondary tool in More Options
  const handleMoreItemClick = (tool: ToolSelection) => {
    setIsMoreOpen(false);
    onSelectTool(tool);
  };

  // Edge positioning styles
  const getDockPositionClasses = () => {
    switch (position) {
      case "top":
        return "top-4 left-1/2 -translate-x-1/2 flex-row";
      case "bottom":
        return "bottom-6 left-1/2 -translate-x-1/2 flex-row";
      case "left":
        return "left-4 top-1/2 -translate-y-1/2 flex-col";
      case "right":
        return "right-4 top-1/2 -translate-y-1/2 flex-col";
    }
  };

  // More Options Dropdown / Popover positioning
  const getMoreOptionsPositionClasses = () => {
    switch (position) {
      case "bottom":
        return "bottom-full mb-3 left-1/2 -translate-x-1/2 origin-bottom";
      case "top":
        return "top-full mt-3 left-1/2 -translate-x-1/2 origin-top";
      case "left":
        return "left-full ml-3 top-1/2 -translate-y-1/2 origin-left";
      case "right":
        return "right-full mr-3 top-1/2 -translate-y-1/2 origin-right";
    }
  };

  return (
    <div
      ref={dockRef}
      className={`absolute z-40 ${getDockPositionClasses()} flex items-center select-none font-mono`}
    >
      {/* ======================================================== */}
      {/* STAGE ONE: MORE OPTIONS EXPANSION POPOVER                 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isMoreOpen && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.94,
              y: position === "bottom" ? 12 : position === "top" ? -12 : 0,
              x: position === "left" ? -12 : position === "right" ? 12 : 0,
            }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{
              opacity: 0,
              scale: 0.94,
              y: position === "bottom" ? 8 : position === "top" ? -8 : 0,
              x: position === "left" ? -8 : position === "right" ? 8 : 0,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={`absolute ${getMoreOptionsPositionClasses()} ${
              isVertical ? "w-64 max-h-[80vh]" : "w-[440px] sm:w-[500px] max-w-[92vw]"
            } bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col z-50`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="font-bold text-white tracking-wider text-[11px]">
                  ALL CUSTOMIZATION TOOLS
                </span>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Menu"
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable Tool Grid */}
            <div
              className={`overflow-y-auto custom-scrollbar pr-0.5 space-y-3 ${
                isVertical ? "max-h-[60vh]" : "max-h-[50vh]"
              }`}
            >
              {/* Category Grid */}
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold block mb-1.5 px-1">
                  Customization Modules
                </span>
                <div
                  className={`grid gap-1.5 ${
                    isVertical ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
                  }`}
                >
                  {MORE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected =
                      isSettingsOpen &&
                      currentView === "categories" &&
                      activeCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() =>
                          handleMoreItemClick({
                            type: "category",
                            id: cat.id,
                            label: cat.label,
                          })
                        }
                        className={`p-2 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer border ${
                          isSelected
                            ? "bg-white text-black border-white shadow-md font-semibold"
                            : "bg-[#141418]/70 hover:bg-[#1a1a20] text-neutral-300 hover:text-white border-white/5 hover:border-white/15"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-black text-white"
                              : "bg-[#1a1a22] text-neutral-400"
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold truncate">
                            {cat.label}
                          </div>
                          <div
                            className={`text-[9px] truncate ${
                              isSelected ? "text-neutral-700" : "text-neutral-500"
                            }`}
                          >
                            {cat.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System & Architecture Modules */}
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold block mb-1.5 px-1">
                  Workspace Architecture
                </span>
                <div
                  className={`grid gap-1.5 ${
                    isVertical ? "grid-cols-1" : "grid-cols-2"
                  }`}
                >
                  {SYSTEM_VIEWS.map((sys) => {
                    const Icon = sys.icon;
                    const isSelected = isSettingsOpen && currentView === sys.id;

                    return (
                      <button
                        key={sys.id}
                        onClick={() =>
                          handleMoreItemClick({
                            type: "view",
                            id: sys.id,
                            label: sys.label,
                          })
                        }
                        className={`p-2 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer border ${
                          isSelected
                            ? "bg-white text-black border-white shadow-md font-semibold"
                            : "bg-[#141418]/70 hover:bg-[#1a1a20] text-neutral-300 hover:text-white border-white/5 hover:border-white/15"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-black text-white"
                              : "bg-[#1a1a22] text-neutral-400"
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold truncate">
                            {sys.label}
                          </div>
                          <div
                            className={`text-[9px] truncate ${
                              isSelected ? "text-neutral-700" : "text-neutral-500"
                            }`}
                          >
                            {sys.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Edge Position Switcher */}
              <div className="pt-1 border-t border-white/10">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Move size={11} />
                    <span>Dock Screen Placement</span>
                  </span>
                  <span className="text-[9px] text-neutral-500 capitalize">
                    {position} edge
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(["bottom", "top", "left", "right"] as DockPosition[]).map(
                    (pos) => (
                      <button
                        key={pos}
                        onClick={() => {
                          onPositionChange(pos);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          position === pos
                            ? "bg-white text-black border-white shadow"
                            : "bg-[#141418] hover:bg-[#1c1c22] text-neutral-400 hover:text-white border-white/5"
                        }`}
                      >
                        {pos === "top" && <ArrowUp size={11} />}
                        {pos === "bottom" && <ArrowDown size={11} />}
                        {pos === "left" && <ArrowLeft size={11} />}
                        {pos === "right" && <ArrowRight size={11} />}
                        <span>{pos}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* FLOATING PILL DOCK CONTAINER                             */}
      {/* ======================================================== */}
      <motion.div
        drag
        dragConstraints={containerRef || undefined}
        dragElastic={0.08}
        dragSnapToOrigin={true}
        onDragEnd={handleDragEnd}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`flex ${
          isVertical ? "flex-col" : "flex-row"
        } items-center gap-1.5 p-1.5 rounded-full bg-[#0a0a0d]/92 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.75)] cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,0.9)]`}
      >
        {/* Drag Handle Indicator */}
        <div
          className={`text-neutral-500 hover:text-neutral-300 transition-colors p-1 flex items-center justify-center ${
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
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMore();
            }}
            onMouseEnter={() => setHoveredTool("more")}
            onMouseLeave={() => setHoveredTool(null)}
            aria-label="More Customization Options"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isMoreOpen
                ? "bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105"
                : isSettingsOpen &&
                  (currentView !== "categories" ||
                    !PRIMARY_TOOLS.some((t) => t.id === activeCategory))
                ? "bg-neutral-800 text-white border border-white/20"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <LayoutGrid size={18} />
          </button>

          {/* More Options Tooltip */}
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
                <span>More Options (All Tools)</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

