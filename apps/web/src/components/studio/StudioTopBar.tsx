"use client";

import React from "react";
import Link from "next/link";
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
  LayoutTemplate,
  Layers,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";

export type DeviceMode = "desktop" | "tablet" | "mobile";
export type StudioView = "categories" | "templates" | "layers";
export type SaveDraftStatus = "idle" | "saving" | "saved" | "error";

interface StudioTopBarProps {
  currentView: StudioView;
  setCurrentView: (view: StudioView) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSave: () => void;
  onPublish: () => void;
  onExport?: (format: "png" | "svg" | "json") => void;
  saveStatus?: SaveDraftStatus;
  saving: boolean;
  publishing: boolean;
  isDirty: boolean;
  username?: string;
  isClassicMode: boolean;
  onToggleClassicMode: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  currentView,
  setCurrentView,
  deviceMode,
  setDeviceMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onSave,
  onPublish,
  onExport,
  saveStatus = "idle",
  saving,
  publishing,
  isDirty,
  username,
  isClassicMode,
  onToggleClassicMode,
}) => {
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  return (
    <header className="h-14 border-b border-[#202020] bg-[#09090b]/95 backdrop-blur-md px-4 flex items-center justify-between text-xs font-mono text-[#ededed] shrink-0 z-30 select-none">
      {/* Left: Brand & Main Navigation (Categories / Templates / Layers) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-neutral-800">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-bold tracking-wider text-white text-[11px] hidden sm:inline">
            PIXEL.GG STUDIO
          </span>
        </div>

        {isDirty && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold hidden md:inline">
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
              title="Reset Settings to Default"
              className="p-1.5 rounded text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Device Frames */}
          <div className="hidden lg:flex items-center bg-[#141416] border border-[#242426] rounded-lg p-0.5">
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
              title="Mobile View (390px)"
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
          title={isClassicMode ? "Switch to Modern Studio" : "Switch to Classic Mode"}
          className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer text-[10px] hidden sm:inline"
        >
          {isClassicMode ? "⚡ Switch to Studio" : "Classic Mode"}
        </button>

        {/* Launch Pixel Design Studio */}
        <Link
          href="/editor"
          className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px]"
          title="Open Pixel Graphic & Banner Studio"
        >
          <Sparkles size={12} className="text-purple-400" />
          <span className="hidden md:inline">Design Studio</span>
        </Link>

        {/* Live Public Profile Link */}
        {username && (
          <a
            href={`/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
            title="View Live Public Profile"
          >
            <span className="hidden sm:inline">Live Profile</span>
            <ExternalLink size={12} />
          </a>
        )}

        {/* Export Graphic Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[10px]"
            title="Export Profile Graphic (PNG 2x, SVG, JSON)"
          >
            <Download size={12} className="text-sky-400" />
            <span className="hidden md:inline">Export</span>
          </button>
          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#101014] border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1">
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport?.("png");
                }}
                className="w-full text-left px-2.5 py-1.5 text-[11px] font-sans text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Export PNG</span>
                <span className="text-[9px] font-mono text-neutral-500">2x Retina</span>
              </button>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport?.("svg");
                }}
                className="w-full text-left px-2.5 py-1.5 text-[11px] font-sans text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Export SVG</span>
                <span className="text-[9px] font-mono text-neutral-500">Vector</span>
              </button>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport?.("json");
                }}
                className="w-full text-left px-2.5 py-1.5 text-[11px] font-sans text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Export JSON</span>
                <span className="text-[9px] font-mono text-neutral-500">Backup</span>
              </button>
            </div>
          )}
        </div>

        {/* Save Draft Button with 3-State Inline Animation & Zero Layout Shift */}
        <button
          onClick={onSave}
          disabled={saveStatus === "saving" || publishing}
          data-save-status={saveStatus}
          data-testid="save-draft-button"
          className={`w-[108px] h-[30px] rounded-lg text-[11px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 select-none ${
            saveStatus === "saving"
              ? "bg-[#123D29] border border-[#22C55E]/50 text-[#4ADE80] shadow-[0_0_12px_rgba(34,197,94,0.25)] cursor-wait"
              : saveStatus === "saved"
              ? "bg-[#123D29] border border-[#22C55E]/60 text-[#4ADE80] shadow-[0_0_10px_rgba(34,197,94,0.2)] cursor-default"
              : saveStatus === "error"
              ? "bg-[#2A0E0E] border border-[#EF4444]/60 text-[#FCA5A5] shadow-[0_0_10px_rgba(239,68,68,0.2)] cursor-pointer"
              : "border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
          } ${publishing ? "opacity-50 cursor-not-allowed" : ""}`}
          title={
            saveStatus === "saving"
              ? "Saving draft to server..."
              : saveStatus === "saved"
              ? "Draft saved successfully"
              : saveStatus === "error"
              ? "Failed to save draft. Click to retry."
              : "Save Draft"
          }
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 size={12} className="animate-spin text-[#22C55E] motion-reduce:animate-none shrink-0" />
              <span className="font-medium tracking-tight">Saving...</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check size={12} className="text-[#22C55E] stroke-[2.5] shrink-0" />
              <span className="font-medium tracking-tight">Saved</span>
            </>
          ) : saveStatus === "error" ? (
            <>
              <AlertCircle size={12} className="text-[#EF4444] shrink-0" />
              <span className="font-medium tracking-tight">Retry</span>
            </>
          ) : (
            <>
              <Save size={12} className="shrink-0" />
              <span className="tracking-tight">Save Draft</span>
            </>
          )}
        </button>

        {/* Publish Profile */}
        <button
          onClick={onPublish}
          disabled={saving || publishing}
          className="px-3.5 py-1 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] disabled:opacity-50 shadow-md"
        >
          <Sparkles size={12} />
          <span>{publishing ? "Publishing..." : "Publish"}</span>
        </button>
      </div>
    </header>
  );
};
