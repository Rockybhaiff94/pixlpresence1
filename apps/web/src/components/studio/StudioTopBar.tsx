"use client";

import React from "react";
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Sliders,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface StudioTopBarProps {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  isDirty: boolean;
  username?: string;
  isClassicMode: boolean;
  onToggleClassicMode: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  deviceMode,
  setDeviceMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onSave,
  saving,
  isDirty,
  username,
  isClassicMode,
  onToggleClassicMode,
}) => {
  return (
    <header className="h-14 border-b border-[#202020] bg-[#09090b]/90 backdrop-blur-md px-4 flex items-center justify-between text-xs font-mono text-[#ededed] shrink-0 z-30 select-none">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-bold tracking-wider text-white text-[11px]">
            PIXEL.GG // STUDIO
          </span>
        </div>
        <span className="text-neutral-600 hidden sm:inline">|</span>
        <span className="text-neutral-400 text-[11px] hidden sm:inline uppercase">
          {isClassicMode ? "CLASSIC CUSTOMIZER" : "VISUAL PROFILE DESIGNER"}
        </span>
        {isDirty && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            UNSAVED EDITS
          </span>
        )}
      </div>

      {/* Center: Device Switcher & History (Visible in Studio Mode) */}
      {!isClassicMode && (
        <div className="flex items-center gap-2">
          {/* History Controls */}
          <div className="flex items-center bg-[#141416] border border-[#242426] rounded-lg p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
            >
              <Redo2 size={13} />
            </button>
            <button
              onClick={onReset}
              title="Reset to Default"
              className="p-1.5 rounded text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Device Frames */}
          <div className="hidden md:flex items-center bg-[#141416] border border-[#242426] rounded-lg p-0.5">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                deviceMode === "desktop" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
              title="Desktop View (100%)"
            >
              <Monitor size={13} />
              <span className="text-[10px]">Desktop</span>
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              className={`p-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                deviceMode === "tablet" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={13} />
              <span className="text-[10px]">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                deviceMode === "mobile" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
              title="Mobile View (380px)"
            >
              <Smartphone size={13} />
              <span className="text-[10px]">Mobile</span>
            </button>
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle between Classic Customizer and Studio Mode */}
        <button
          onClick={onToggleClassicMode}
          className="px-3 py-1.5 rounded-lg bg-[#141416] hover:bg-[#1a1a1d] border border-[#242426] text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title={isClassicMode ? "Switch to Advanced Visual Studio" : "Switch to Classic Customizer"}
        >
          <Sliders size={12} className="text-neutral-400" />
          <span className="hidden sm:inline">
            {isClassicMode ? "Studio Mode" : "Classic Mode"}
          </span>
        </button>

        {username && (
          <a
            href={`/${username}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#141416] hover:bg-[#1a1a1d] border border-[#242426] text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink size={12} className="text-neutral-400" />
            <span className="hidden sm:inline">Live Profile</span>
          </a>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-[11px] hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Save size={13} />
          <span>{saving ? "SAVING..." : "PUBLISH"}</span>
        </button>
      </div>
    </header>
  );
};
