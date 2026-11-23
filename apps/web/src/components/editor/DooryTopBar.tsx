"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Download,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  FileImage,
  FileCode,
  FileJson,
  Sliders,
  Wrench,
  CloudOff,
  CloudCheck,
} from "lucide-react";

export type DeviceMode = "desktop" | "tablet" | "mobile";
export type SaveDraftStatus =
  | "idle"
  | "saving"
  | "saved"
  | "unsaved"
  | "error"
  | "offline";

interface DooryTopBarProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPublish: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
  saveStatus: SaveDraftStatus;
  publishing: boolean;
  isDirty?: boolean;
  onOpenSettings?: () => void;
  issuesCount?: number;
  lastSavedTime?: string | null;
  onRunAutoFix?: () => void;
}

export const DooryTopBar: React.FC<DooryTopBarProps> = ({
  title,
  onUpdateTitle,
  deviceMode,
  setDeviceMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPublish,
  onExport,
  saveStatus,
  publishing,
  isDirty,
  onOpenSettings,
  issuesCount = 0,
  lastSavedTime,
  onRunAutoFix,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Status badge config
  const getStatusDisplay = () => {
    switch (saveStatus) {
      case "saving":
        return {
          icon: <Loader2 size={11} className="animate-spin text-[#4ADE80]" />,
          text: "Saving...",
          color: "text-[#4ADE80] border-[#22C55E]/40 bg-[#123D29]/40",
          dot: "bg-emerald-400 animate-pulse",
        };
      case "saved":
        return {
          icon: <Check size={11} className="text-[#4ADE80]" />,
          text: lastSavedTime ? `Saved ${lastSavedTime}` : "All changes saved",
          color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
          dot: "bg-emerald-400",
        };
      case "unsaved":
        return {
          icon: <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />,
          text: "Unsaved changes",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
          dot: "bg-amber-400",
        };
      case "offline":
        return {
          icon: <CloudOff size={11} className="text-amber-300" />,
          text: "Offline – Saved locally",
          color: "text-amber-300 border-amber-500/30 bg-amber-500/10",
          dot: "bg-amber-400",
        };
      case "error":
        return {
          icon: <AlertCircle size={11} className="text-rose-400" />,
          text: "Save Failed – Retry",
          color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
          dot: "bg-rose-400",
        };
      default:
        return {
          icon: <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />,
          text: "Ready",
          color: "text-neutral-400 border-neutral-700 bg-neutral-900/60",
          dot: "bg-neutral-500",
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <header
      className="h-14 border-b border-[#1e1e24] bg-[#09090c] px-4 flex items-center justify-between text-xs font-mono text-[#ededed] shrink-0 z-30 select-none"
      data-testid="doory-topbar"
    >
      {/* Left: Brand, Title & Auto Save Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-[#22222a]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-bold tracking-wider text-white text-[11px] hidden sm:inline">
            PIXEL.GG STUDIO
          </span>
        </div>

        {/* Project Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="bg-transparent border border-transparent hover:border-[#262632] focus:border-white focus:bg-[#121216] px-2 py-1 rounded text-xs font-mono font-bold text-white outline-none w-28 sm:w-44 transition-colors truncate"
          placeholder="Untitled Design"
          data-testid="project-title-input"
        />

        {/* Subtle Live Save Status Badge (Zero Layout Shift, Fixed Max Width) */}
        <div
          data-testid="autosave-status-badge"
          data-status={saveStatus}
          className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] border transition-colors ${statusInfo.color}`}
          title="Autosave status"
        >
          {statusInfo.icon}
          <span className="truncate max-w-[140px]">{statusInfo.text}</span>
        </div>
      </div>

      {/* Center: History Controls & Device Switcher */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#121216] border border-[#22222a] rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? "text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
                : "text-neutral-600 cursor-not-allowed opacity-40"
            }`}
            title="Undo (Ctrl+Z)"
            data-testid="topbar-undo"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? "text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
                : "text-neutral-600 cursor-not-allowed opacity-40"
            }`}
            title="Redo (Ctrl+Y)"
            data-testid="topbar-redo"
          >
            <Redo2 size={13} />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[#22222a] hidden sm:block" />

        {/* Device Mode Switcher */}
        <div className="hidden sm:flex items-center bg-[#121216] border border-[#22222a] rounded-lg p-0.5">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
              deviceMode === "desktop"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Desktop Mode (960×540)"
            data-testid="device-desktop"
          >
            <Monitor size={12} />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
              deviceMode === "tablet"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Tablet Mode (768×432)"
            data-testid="device-tablet"
          >
            <Tablet size={12} />
            <span className="hidden md:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
              deviceMode === "mobile"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Mobile Mode (390×600)"
            data-testid="device-mobile"
          >
            <Smartphone size={12} />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Right Actions: Export Dropdown, Save Draft (Inline Animated 3-State), Publish */}
      <div className="flex items-center gap-2">
        {/* Auto Fix / Studio Settings Modal Trigger */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            data-testid="autosave-settings-trigger"
            className="relative px-2.5 py-1 rounded-lg border border-[#2a2a34] bg-[#121216] hover:bg-[#1a1a22] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[11px]"
            title="Auto Save & Auto Fix Settings"
          >
            <Sliders size={12} className="text-neutral-400" />
            <span className="hidden xl:inline">Settings</span>
            {issuesCount > 0 && (
              <span
                data-testid="autofix-badge-count"
                className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
                title={`${issuesCount} layout issue(s) detected`}
              >
                {issuesCount}
              </span>
            )}
          </button>
        )}

        {/* Quick Auto Fix Button if issues detected */}
        {issuesCount > 0 && onRunAutoFix && (
          <button
            onClick={onRunAutoFix}
            data-testid="quick-autofix-trigger"
            className="px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] animate-pulse"
            title="Click to auto-repair canvas issues"
          >
            <Wrench size={11} />
            <span className="hidden md:inline">Auto Fix</span>
          </button>
        )}

        {/* Export Graphic Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="px-2.5 py-1 rounded-lg border border-[#2a2a34] bg-[#121216] hover:bg-[#1a1a22] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[11px]"
            title="Export Profile Graphic"
            data-testid="export-dropdown-button"
          >
            <Download size={12} className="text-sky-400" />
            <span className="hidden md:inline">Export</span>
            <ChevronDown size={11} className="text-neutral-500" />
          </button>

          {isExportOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 bg-[#101014] border border-[#262632] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1"
              onMouseLeave={() => setIsExportOpen(false)}
              data-testid="export-dropdown-menu"
            >
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport("png");
                }}
                className="w-full text-left px-2.5 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                data-testid="export-png-option"
              >
                <div className="flex items-center gap-2">
                  <FileImage size={14} className="text-emerald-400" />
                  <span>Download PNG</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500">2×</span>
              </button>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport("svg");
                }}
                className="w-full text-left px-2.5 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                data-testid="export-svg-option"
              >
                <div className="flex items-center gap-2">
                  <FileCode size={14} className="text-amber-400" />
                  <span>Export SVG</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500">Vector</span>
              </button>
              <button
                onClick={() => {
                  setIsExportOpen(false);
                  onExport("json");
                }}
                className="w-full text-left px-2.5 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                data-testid="export-json-option"
              >
                <div className="flex items-center gap-2">
                  <FileJson size={14} className="text-cyan-400" />
                  <span>Save JSON</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500">Backup</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            Save Draft Button with 3-State Inline Animation & Zero Layout Shift
            State 1: Normal ("Save Draft")
            State 2: Saving (Green glow border/pulse, "Saving...", spinner, disabled)
            State 3: Saved ("Saved", checkmark, green glow, auto-reverts after 2s)
            ========================================================================= */}
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
              : "border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white cursor-pointer"
          }`}
          title="Save draft configuration"
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 size={13} className="animate-spin text-[#4ADE80]" />
              <span>Saving...</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check size={13} className="text-[#4ADE80] animate-in zoom-in-75 duration-150" />
              <span>Saved</span>
            </>
          ) : saveStatus === "error" ? (
            <>
              <AlertCircle size={13} className="text-[#FCA5A5]" />
              <span>Failed</span>
            </>
          ) : (
            <>
              <Save size={13} />
              <span>Save Draft</span>
            </>
          )}
        </button>

        {/* Publish Live Button */}
        <button
          onClick={onPublish}
          disabled={publishing || saveStatus === "saving"}
          className="h-[30px] px-3.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-white/5 disabled:opacity-50"
          title="Publish profile live"
          data-testid="publish-button"
        >
          {publishing ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>Publish</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
