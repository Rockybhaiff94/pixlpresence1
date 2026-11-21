"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Download,
  Hand,
  MousePointer,
  ArrowLeft,
  ChevronDown,
  FileCode,
  FileImage,
  FileJson,
  Sparkles,
} from "lucide-react";
import { CANVAS_PRESETS } from "./editorPresets";
import { EditorPreset } from "./editorTypes";

interface EditorToolbarProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  currentPresetId: string;
  onSelectPreset: (preset: EditorPreset) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onApplyToProfile?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  onUpdateTitle,
  currentPresetId,
  onSelectPreset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onFitScreen,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  isPanMode,
  onTogglePanMode,
  onExportPng,
  onExportSvg,
  onExportJson,
  onApplyToProfile,
}) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const activePreset = CANVAS_PRESETS.find((p) => p.id === currentPresetId) || CANVAS_PRESETS[0];

  return (
    <header className="h-14 bg-[#0a0a0a] border-b border-[#222222] px-4 flex items-center justify-between select-none relative z-50">
      {/* Left: Navigation, Title & Preset Selector */}
      <div className="flex items-center gap-3">
        <Link
          href="/customize"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#161616] transition-colors border border-transparent hover:border-[#262626]"
          title="Return to Profile Customization"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-mono font-medium hidden sm:inline">CUSTOMIZE</span>
        </Link>

        <div className="h-4 w-[1px] bg-[#222222]" />

        {/* Project Title Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="bg-transparent border border-transparent hover:border-[#2a2a2a] focus:border-white focus:bg-[#121212] px-2 py-1 rounded text-sm font-mono font-bold text-white outline-none w-36 sm:w-48 transition-colors"
            placeholder="Untitled Graphic"
          />
        </div>

        {/* Preset Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#222222] hover:border-[#333333] text-xs font-mono text-neutral-300 transition-colors"
          >
            <span>{activePreset.name}</span>
            <span className="text-neutral-500 text-[10px]">({activePreset.width}×{activePreset.height})</span>
            <ChevronDown size={14} className="text-neutral-500" />
          </button>

          {showPresetMenu && (
            <div
              className="absolute left-0 top-full mt-1.5 w-64 bg-[#0e0e0e] border border-[#262626] rounded-xl shadow-2xl p-1.5 z-50"
              onMouseLeave={() => setShowPresetMenu(false)}
            >
              <div className="text-[10px] font-mono text-neutral-500 uppercase px-2 py-1 tracking-wider">
                CANVAS PRESETS
              </div>
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset);
                    setShowPresetMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                    preset.id === currentPresetId
                      ? "bg-white text-black font-bold"
                      : "text-neutral-300 hover:bg-[#181818]"
                  }`}
                >
                  <span>{preset.name}</span>
                  <span className={preset.id === currentPresetId ? "text-neutral-700" : "text-neutral-500"}>
                    {preset.width}×{preset.height}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Undo, Redo, Zoom & Tool Modifiers */}
      <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-xl border border-[#222222]">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c1c] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c1c] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        <div className="h-4 w-[1px] bg-[#222222] mx-1" />

        {/* Pan mode toggle */}
        <button
          onClick={onTogglePanMode}
          className={`p-1.5 rounded-lg transition-colors ${
            isPanMode ? "bg-white text-black" : "text-neutral-400 hover:text-white hover:bg-[#1c1c1c]"
          }`}
          title={isPanMode ? "Select Tool (V)" : "Hand Tool / Pan (H or Space)"}
        >
          {isPanMode ? <Hand size={15} /> : <MousePointer size={15} />}
        </button>

        {/* Grid toggle */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded-lg transition-colors ${
            showGrid ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-[#1c1c1c]"
          }`}
          title="Toggle Grid (G)"
        >
          <Grid size={15} />
        </button>

        {/* Snap toggle */}
        <button
          onClick={onToggleSnap}
          className={`p-1.5 rounded-lg transition-colors ${
            snapToGrid ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-[#1c1c1c]"
          }`}
          title="Toggle Snapping"
        >
          <Magnet size={15} />
        </button>

        <div className="h-4 w-[1px] bg-[#222222] mx-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c1c] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <span className="font-mono text-xs text-neutral-300 w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c1c] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={onFitScreen}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c1c] transition-colors"
          title="Fit Canvas to Viewport"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Right: Engine Status & Export Menu */}
      <div className="flex items-center gap-3">
        {/* Hardware Status LED */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-neutral-500 uppercase tracking-widest bg-[#121212] px-2.5 py-1.5 rounded-lg border border-[#1f1f1f]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] shadow-[0_0_6px_rgba(215,25,32,0.8)]" />
          <span>ENGINE // ACTIVE</span>
        </div>

        {/* Export Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            <Download size={14} />
            <span>EXPORT</span>
            <ChevronDown size={12} />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 bg-[#0e0e0e] border border-[#262626] rounded-xl shadow-2xl p-1.5 z-50"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <div className="text-[10px] font-mono text-neutral-500 uppercase px-2 py-1 tracking-wider">
                EXPORT OPTIONS
              </div>
              <button
                onClick={() => {
                  onExportPng();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono text-neutral-200 hover:bg-[#181818] flex items-center gap-2 transition-colors"
              >
                <FileImage size={15} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Download PNG</span>
                  <span className="text-[10px] text-neutral-500">High-Res 2× Canvas</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onExportSvg();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono text-neutral-200 hover:bg-[#181818] flex items-center gap-2 transition-colors"
              >
                <FileCode size={15} className="text-amber-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Export SVG</span>
                  <span className="text-[10px] text-neutral-500">Scalable Vector</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onExportJson();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono text-neutral-200 hover:bg-[#181818] flex items-center gap-2 transition-colors"
              >
                <FileJson size={15} className="text-cyan-400" />
                <div className="flex flex-col">
                  <span className="font-bold">Save Project JSON</span>
                  <span className="text-[10px] text-neutral-500">Editable project file</span>
                </div>
              </button>

              {onApplyToProfile && (
                <>
                  <div className="my-1 border-t border-[#1f1f1f]" />
                  <button
                    onClick={() => {
                      onApplyToProfile();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono text-neutral-200 hover:bg-[#181818] flex items-center gap-2 transition-colors"
                  >
                    <Sparkles size={15} className="text-purple-400" />
                    <div className="flex flex-col">
                      <span className="font-bold text-purple-300">Set as Profile Banner</span>
                      <span className="text-[10px] text-neutral-500">Apply to Pixel Studio</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
