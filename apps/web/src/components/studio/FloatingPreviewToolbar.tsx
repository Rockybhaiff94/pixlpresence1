"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Grid,
  Crosshair,
  Box,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  Sliders,
  ChevronRight,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  SplitSquareVertical,
} from "lucide-react";
import { DeviceMode } from "./StudioTopBar";
import { WorkspaceTransparencyMode } from "@/types/studio";

export interface FloatingPreviewToolbarProps {
  zoom: number;
  setZoom: (updater: (prev: number) => number) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean | ((prev: boolean) => boolean)) => void;
  showGuides: boolean;
  setShowGuides: (val: boolean | ((prev: boolean) => boolean)) => void;
  showWireframe: boolean;
  setShowWireframe: (val: boolean | ((prev: boolean) => boolean)) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  onResetPosition: () => void;

  // Workspace Appearance & Transparency Controls
  transparencyMode?: WorkspaceTransparencyMode;
  setTransparencyMode?: (mode: WorkspaceTransparencyMode) => void;
  panelOpacity?: number;
  setPanelOpacity?: (opacity: number) => void;
  panelBlur?: number;
  setPanelBlur?: (blur: number) => void;
  panelBorderOpacity?: number;
  setPanelBorderOpacity?: (borderOpacity: number) => void;

  // Panel Visibility & Split Management
  isEditorVisible?: boolean;
  setIsEditorVisible?: (val: boolean | ((prev: boolean) => boolean)) => void;
  isPreviewVisible?: boolean;
  setIsPreviewVisible?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onResetPanelSplit?: () => void;
  isFullscreenPreview?: boolean;
  onToggleFullscreenPreview?: () => void;
}

export const FloatingPreviewToolbar: React.FC<FloatingPreviewToolbarProps> = ({
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  showGuides,
  setShowGuides,
  showWireframe,
  setShowWireframe,
  deviceMode,
  setDeviceMode,
  onResetPosition,
  transparencyMode = "solid",
  setTransparencyMode,
  panelOpacity = 85,
  setPanelOpacity,
  panelBlur = 12,
  setPanelBlur,
  panelBorderOpacity = 30,
  setPanelBorderOpacity,
  isEditorVisible = true,
  setIsEditorVisible,
  isPreviewVisible = true,
  setIsPreviewVisible,
  onResetPanelSplit,
  isFullscreenPreview = false,
  onToggleFullscreenPreview,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"viewport" | "panels" | "appearance">("viewport");
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear pending collapse on unmount
  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Graceful collapse delay so moving between controls never prematurely closes
    collapseTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 380);
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleZoomIn = () => setZoom((z) => Math.min(150, z + 10));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 10));
  const handleResetZoom = () => setZoom(() => 100);

  return (
    <div
      className="absolute top-4 right-4 z-40 select-none font-mono text-xs"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger pill */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/90 backdrop-blur-md text-neutral-300 shadow-2xl cursor-pointer transition-all duration-200 hover:border-neutral-500 hover:text-white ${
          isOpen ? "ring-2 ring-white/30 border-white/40" : "opacity-90 hover:opacity-100"
        }`}
        title="Canvas & Panel Controls"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <Sliders size={13} className="text-white" />
        <span className="text-[10px] uppercase font-bold tracking-wider">
          {Math.round(zoom)}%
        </span>
        {transparencyMode !== "solid" && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title={`Mode: ${transparencyMode}`} />
        )}
        <ChevronRight
          size={11}
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </div>

      {/* Expanded Floating Toolbar Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 p-3 rounded-2xl border border-neutral-800 bg-[#0e0e11]/95 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 min-w-[260px] max-w-[300px] animate-in fade-in slide-in-from-top-2 duration-200 text-neutral-200"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Sub-tabs header */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-[10px] font-mono">
            <button
              onClick={() => setActiveTab("viewport")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === "viewport" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Viewport
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === "appearance" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Glass/Theme
            </button>
            <button
              onClick={() => setActiveTab("panels")}
              className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                activeTab === "panels" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Panels
            </button>
          </div>

          {/* TAB 1: VIEWPORT CONTROLS */}
          {activeTab === "viewport" && (
            <div className="space-y-2">
              {/* Zoom Controls */}
              <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Scale</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    title="Zoom Out (-10%)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    title="Fit to Screen (100%)"
                  >
                    {Math.round(zoom)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 150}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    title="Zoom In (+10%)"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              {/* Device Mode Switcher */}
              <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Device</span>
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      deviceMode === "desktop" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                    title="Desktop View"
                  >
                    <Monitor size={12} />
                  </button>
                  <button
                    onClick={() => setDeviceMode("tablet")}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      deviceMode === "tablet" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                    title="Tablet View (768px)"
                  >
                    <Tablet size={12} />
                  </button>
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      deviceMode === "mobile" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                    title="Mobile View (390px)"
                  >
                    <Smartphone size={12} />
                  </button>
                </div>
              </div>

              {/* Overlays */}
              <div className="space-y-1 pt-1">
                <button
                  onClick={() => setShowGrid((v) => !v)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    showGrid
                      ? "bg-white/10 text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Grid size={13} /> Grid Pattern
                  </span>
                  <span className="text-[10px] text-neutral-500">{showGrid ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={() => setShowGuides((v) => !v)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    showGuides
                      ? "bg-white/10 text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Crosshair size={13} /> Alignment Guides
                  </span>
                  <span className="text-[10px] text-neutral-500">{showGuides ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={() => setShowWireframe((v) => !v)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    showWireframe
                      ? "bg-white/10 text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Box size={13} /> Wireframe Debug
                  </span>
                  <span className="text-[10px] text-neutral-500">{showWireframe ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={onResetPosition}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} /> Reset Viewport
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & TRANSPARENCY MODES */}
          {activeTab === "appearance" && setTransparencyMode && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold mb-1.5 block">
                  Workspace Appearance
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "solid", label: "Solid", desc: "Opaque dark" },
                      { id: "transparent", label: "Transparent", desc: "See bg" },
                      { id: "glass", label: "Glass Blur", desc: "Frosted" },
                      { id: "floating", label: "Floating", desc: "Cards" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setTransparencyMode(m.id)}
                      className={`flex flex-col items-start p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                        transparencyMode === m.id
                          ? "bg-cyan-500/15 border-cyan-400 text-white shadow-sm"
                          : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                      }`}
                    >
                      <span className="text-[11px] font-bold">{m.label}</span>
                      <span className="text-[9px] text-neutral-500">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              {transparencyMode !== "solid" && setPanelOpacity && (
                <div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Panel Opacity</span>
                    <span className="font-mono text-white font-bold">{panelOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={panelOpacity}
                    onChange={(e) => setPanelOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>
              )}

              {/* Blur Intensity Slider */}
              {(transparencyMode === "glass" || transparencyMode === "floating") && setPanelBlur && (
                <div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Backdrop Blur</span>
                    <span className="font-mono text-white font-bold">{panelBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    step={2}
                    value={panelBlur}
                    onChange={(e) => setPanelBlur(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>
              )}

              {/* Border Opacity Slider */}
              {transparencyMode !== "solid" && setPanelBorderOpacity && (
                <div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Border Opacity</span>
                    <span className="font-mono text-white font-bold">{panelBorderOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={panelBorderOpacity}
                    onChange={(e) => setPanelBorderOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANELS & WORKSPACE LAYOUT */}
          {activeTab === "panels" && (
            <div className="space-y-1.5">
              {/* Fullscreen Preview Toggle */}
              {onToggleFullscreenPreview && (
                <button
                  onClick={onToggleFullscreenPreview}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold">
                    {isFullscreenPreview ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    {isFullscreenPreview ? "Exit Focus Mode" : "Focus / Fullscreen Preview"}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                    {isFullscreenPreview ? "ACTIVE" : "EXPAND"}
                  </span>
                </button>
              )}

              {/* Toggle Editor Panel */}
              {setIsEditorVisible && (
                <button
                  onClick={() => setIsEditorVisible((v) => !v)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isEditorVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    Left Editor Workspace
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {isEditorVisible ? "VISIBLE" : "HIDDEN"}
                  </span>
                </button>
              )}

              {/* Toggle Preview Panel */}
              {setIsPreviewVisible && (
                <button
                  onClick={() => setIsPreviewVisible((v) => !v)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isPreviewVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    Right Preview Canvas
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {isPreviewVisible ? "VISIBLE" : "HIDDEN"}
                  </span>
                </button>
              )}

              {/* Reset Panel Split */}
              {onResetPanelSplit && (
                <button
                  onClick={onResetPanelSplit}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <SplitSquareVertical size={13} /> Reset Panel Split (60/40)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
