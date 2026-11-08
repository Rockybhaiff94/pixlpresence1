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
} from "lucide-react";
import { DeviceMode } from "./StudioTopBar";

interface FloatingPreviewToolbarProps {
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
    }, 350);
  };

  // Keyboard navigation
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
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/90 backdrop-blur-md text-neutral-300 shadow-xl cursor-pointer transition-all duration-200 hover:border-neutral-500 hover:text-white ${
          isOpen ? "ring-1 ring-white/30" : "opacity-85 hover:opacity-100"
        }`}
        title="Canvas Quick Tools"
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
        <ChevronRight
          size={11}
          className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </div>

      {/* Expanded Floating Toolbar */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 p-2 rounded-2xl border border-neutral-800 bg-[#0e0e11]/95 backdrop-blur-xl shadow-2xl flex flex-col gap-2 min-w-[210px] animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Zoom Section */}
          <div className="flex items-center justify-between px-1.5 py-1 border-b border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold">Zoom</span>
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
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
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

          {/* Device Switcher */}
          <div className="flex items-center justify-between px-1.5 py-1 border-b border-neutral-800">
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

          {/* Quick Overlays */}
          <div className="space-y-1">
            <button
              onClick={() => setShowGrid((v) => !v)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                showGrid
                  ? "bg-white/10 text-white font-semibold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Grid size={13} /> Toggle Grid
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
                <Crosshair size={13} /> Toggle Guides
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
                <Box size={13} /> Wireframe Outlines
              </span>
              <span className="text-[10px] text-neutral-500">{showWireframe ? "ON" : "OFF"}</span>
            </button>

            <button
              onClick={onResetPosition}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> Reset Canvas View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
