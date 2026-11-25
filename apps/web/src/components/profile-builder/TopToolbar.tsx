"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileImage,
  FileJson,
  Loader2,
  Lock,
  Monitor,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";
import {
  BuilderCanvasSettings,
  BuilderDeviceMode,
  BuilderNode,
  BuilderSaveStatus,
} from "./profileBuilderTypes";

interface TopToolbarProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  saveStatus: BuilderSaveStatus;
  lastSavedTime: string | null;
  errorMessage?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetToDefault?: () => void;
  deviceMode: BuilderDeviceMode;
  onDeviceModeChange: (mode: BuilderDeviceMode) => void;
  onOpenSettings: () => void;
  onExport: (kind: "png" | "design-json" | "template-json") => void;
  onPreviewProfile?: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  canvas: BuilderCanvasSettings;
  selectedNode: BuilderNode | null;
  activeEmbedNode: BuilderNode | null;
  onSelectCanvas: () => void;
  onAlignNode: (
    id: string,
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void;
  onReorderNode: (id: string, direction: "top" | "up" | "down" | "bottom") => void;
  onToggleLockNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  title,
  onUpdateTitle,
  saveStatus,
  lastSavedTime,
  errorMessage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetToDefault,
  deviceMode,
  onDeviceModeChange,
  onOpenSettings,
  onExport,
  onPreviewProfile,
  onSaveDraft,
  onPublish,
  canvas,
  selectedNode,
  activeEmbedNode,
  onSelectCanvas,
  onAlignNode,
  onReorderNode,
  onToggleLockNode,
  onDuplicateNode,
  onDeleteNode,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const getStatusBadge = () => {
    switch (saveStatus) {
      case "saving":
        return {
          icon: <Loader2 size={11} className="animate-spin text-emerald-400" />,
          label: "Saving...",
          cls: "text-emerald-300 bg-emerald-950/50 border-emerald-700/50",
        };
      case "publishing":
        return {
          icon: <Loader2 size={11} className="animate-spin text-white" />,
          label: "Publishing...",
          cls: "text-white bg-[#18181f] border-white/25",
        };
      case "saved":
        return {
          icon: <Check size={11} className="text-emerald-400" />,
          label: lastSavedTime ? `Saved ${lastSavedTime}` : "Saved",
          cls: "text-emerald-300 bg-emerald-950/40 border-emerald-800/50",
        };
      case "unsaved":
        return {
          icon: <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />,
          label: "Unsaved Changes",
          cls: "text-amber-300 bg-amber-950/40 border-amber-800/50",
        };
      case "offline":
        return {
          icon: <CloudOff size={11} className="text-amber-300" />,
          label: "Offline Draft",
          cls: "text-amber-300 bg-amber-950/40 border-amber-800/50",
        };
      case "error":
        return {
          icon: <AlertCircle size={11} className="text-red-400" />,
          label: errorMessage ? `Error` : "Error",
          cls: "text-red-300 bg-red-950/50 border-red-800/60",
        };
      default:
        return {
          icon: <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />,
          label: "Ready",
          cls: "text-neutral-300 bg-[#121216] border-[#26262e]",
        };
    }
  };

  const badge = getStatusBadge();
  const metricNode = selectedNode && selectedNode.type !== "background" ? selectedNode : activeEmbedNode;

  return (
    <header
      className="w-full shrink-0 bg-[#08080b] border-b border-[#1f1f26] font-mono select-none z-30"
      data-testid="builder-top-toolbar"
    >
      {/* Row 1: Primary Studio Controls */}
      <div className="h-12 px-3 sm:px-4 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Left: Brand, Title & Status */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d71920]" />
            <span>PIXEL.GG STUDIO</span>
            <span className="text-neutral-600">|</span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            aria-label="Profile Builder Title"
            className="bg-transparent border border-transparent hover:border-[#26262f] focus:border-white/30 rounded px-1.5 py-0.5 text-xs font-bold text-white outline-none w-40 sm:w-48 truncate"
            data-testid="builder-title-input"
          />

          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] shrink-0 ${badge.cls}`}
            title={errorMessage || badge.label}
            data-testid="builder-status-pill"
          >
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>

        {/* Center: Undo/Redo & Device Previews */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-[#101015] border border-[#22222b] rounded-lg p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              data-testid="builder-undo-btn"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              data-testid="builder-redo-btn"
            >
              <Redo2 size={13} />
            </button>
          </div>

          {onResetToDefault && (
            <button
              type="button"
              onClick={onResetToDefault}
              title="Reset profile design to default template"
              className="px-2 py-1.5 rounded-lg bg-[#101015] hover:bg-[#191922] border border-[#22222b] text-neutral-300 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
              data-testid="builder-reset-btn"
            >
              <RotateCcw size={12} />
              <span className="hidden lg:inline">Reset to Default</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 bg-[#101015] border border-[#22222b] rounded-lg p-0.5">
            {(
              [
                { id: "desktop", label: "Desktop", icon: Monitor },
                { id: "tablet", label: "Tablet", icon: Tablet },
                { id: "mobile", label: "Mobile", icon: Smartphone },
              ] as const
            ).map((dev) => {
              const Icon = dev.icon;
              const active = deviceMode === dev.id;
              return (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => onDeviceModeChange(dev.id)}
                  className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                    active
                      ? "bg-white text-black font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`builder-device-${dev.id}`}
                >
                  <Icon size={12} />
                  <span className="hidden md:inline">{dev.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Settings, Export, Save Draft, Publish */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1.5 rounded-lg bg-[#111116] hover:bg-[#191921] border border-[#24242d] text-neutral-300 hover:text-white text-[11px] flex items-center gap-1.5 cursor-pointer"
            data-testid="builder-settings-btn"
          >
            <Settings size={12} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setExportOpen((p) => !p);
                setAlignOpen(false);
                setOrderOpen(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111116] hover:bg-[#191921] border border-[#24242d] text-neutral-300 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
              data-testid="builder-export-btn"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={11} />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 mt-1.5 w-52 bg-[#0e0e13] border border-[#282832] rounded-xl shadow-2xl p-1.5 z-50"
                data-testid="builder-export-menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    onExport("png");
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-[11px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  data-testid="builder-export-png"
                >
                  <FileImage size={13} className="text-neutral-400" />
                  <span>Export Profile Image (PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    onExport("design-json");
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-[11px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  data-testid="builder-export-json"
                >
                  <FileJson size={13} className="text-neutral-400" />
                  <span>Export Design Data (JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    onExport("template-json");
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-[11px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  data-testid="builder-export-template"
                >
                  <FileCode2 size={13} className="text-neutral-400" />
                  <span>Export Reusable Template</span>
                </button>
              </div>
            )}
          </div>

          {onPreviewProfile && (
            <button
              type="button"
              onClick={onPreviewProfile}
              className="px-2.5 py-1.5 rounded-lg bg-[#111116] hover:bg-[#191921] border border-[#24242d] text-neutral-200 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              data-testid="builder-preview-btn"
              title="Preview Profile"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">Preview Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saveStatus === "saving" || saveStatus === "publishing"}
            className="px-2.5 py-1.5 rounded-lg bg-[#14141a] hover:bg-[#1c1c24] border border-[#2d2d37] text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            data-testid="builder-save-draft-btn"
          >
            <Save size={12} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={saveStatus === "publishing"}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            data-testid="builder-publish-btn"
          >
            {saveStatus === "publishing" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>Publish</span>
          </button>
        </div>
      </div>

      {/* Row 2: Canvas & Active Object Telemetry + Alignment/Order Actions */}
      <div className="h-9 px-3 sm:px-4 border-t border-[#181820] bg-[#0a0a0e] flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={onSelectCanvas}
            className={`px-2 py-0.5 rounded border text-[10px] tracking-wide cursor-pointer transition-colors ${
              !selectedNode
                ? "bg-[#191922] border-white/30 text-white"
                : "bg-[#111116] border-[#23232c] text-neutral-400 hover:text-white"
            }`}
            title="Select Canvas (Background Level)"
            data-testid="subbar-select-canvas"
          >
            CANVAS: {canvas.width} × {canvas.height}
          </button>

          {metricNode && (
            <div className="flex items-center gap-2 text-[10px] text-neutral-400">
              <span className="px-1.5 py-0.5 rounded bg-[#121218] border border-[#25252f] text-neutral-200">
                {metricNode.type === "embed"
                  ? "EMBED"
                  : metricNode.type === "nested-embed"
                    ? "NESTED EMBED"
                    : metricNode.name.toUpperCase()}
                : {Math.round(metricNode.width)} × {Math.round(metricNode.height)}
              </span>
              <span>X: {Math.round(metricNode.x)}</span>
              <span>Y: {Math.round(metricNode.y)}</span>
              <span>R: {metricNode.style.borderRadius ?? 0}</span>
              <span>P: {metricNode.style.padding ?? 0}</span>
            </div>
          )}
        </div>

        {selectedNode && selectedNode.type !== "background" && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Align dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAlignOpen((p) => !p);
                  setOrderOpen(false);
                  setExportOpen(false);
                }}
                className="px-2 py-0.5 rounded bg-[#121218] hover:bg-[#1a1a22] border border-[#24242d] text-[10px] text-neutral-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Align</span>
                <ChevronDown size={10} />
              </button>
              {alignOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-[#0e0e13] border border-[#282832] rounded-lg shadow-2xl p-1 z-50">
                  {(
                    [
                      { id: "left", label: "Align Left", icon: AlignLeft },
                      { id: "center-h", label: "Center Horiz", icon: AlignCenter },
                      { id: "right", label: "Align Right", icon: AlignRight },
                      { id: "top", label: "Align Top", icon: ArrowUpToLine },
                      { id: "center-v", label: "Center Vert", icon: AlignCenter },
                      { id: "bottom", label: "Align Bottom", icon: ArrowDownToLine },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAlignOpen(false);
                          onAlignNode(selectedNode.id, item.id);
                        }}
                        className="w-full px-2 py-1.5 rounded text-left text-[10px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <Icon size={11} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOrderOpen((p) => !p);
                  setAlignOpen(false);
                  setExportOpen(false);
                }}
                className="px-2 py-0.5 rounded bg-[#121218] hover:bg-[#1a1a22] border border-[#24242d] text-[10px] text-neutral-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Order</span>
                <ChevronDown size={10} />
              </button>
              {orderOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-[#0e0e13] border border-[#282832] rounded-lg shadow-2xl p-1 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderOpen(false);
                      onReorderNode(selectedNode.id, "top");
                    }}
                    className="w-full px-2 py-1.5 rounded text-left text-[10px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowUpToLine size={11} />
                    <span>Bring to Front</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderOpen(false);
                      onReorderNode(selectedNode.id, "up");
                    }}
                    className="w-full px-2 py-1.5 rounded text-left text-[10px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <ChevronUp size={11} />
                    <span>Bring Forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderOpen(false);
                      onReorderNode(selectedNode.id, "down");
                    }}
                    className="w-full px-2 py-1.5 rounded text-left text-[10px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <ChevronDown size={11} />
                    <span>Send Backward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderOpen(false);
                      onReorderNode(selectedNode.id, "bottom");
                    }}
                    className="w-full px-2 py-1.5 rounded text-left text-[10px] text-neutral-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowDownToLine size={11} />
                    <span>Send to Back</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggleLockNode(selectedNode.id)}
              title={selectedNode.locked ? "Unlock" : "Lock"}
              className={`p-1 rounded border cursor-pointer ${
                selectedNode.locked
                  ? "bg-amber-950/50 border-amber-700/60 text-amber-300"
                  : "bg-[#121218] border-[#24242d] text-neutral-300 hover:text-white"
              }`}
              data-testid="subbar-lock-btn"
            >
              {selectedNode.locked ? <Lock size={11} /> : <Unlock size={11} />}
            </button>

            <button
              type="button"
              onClick={() => onDuplicateNode(selectedNode.id)}
              title="Duplicate"
              className="p-1 rounded bg-[#121218] border border-[#24242d] text-neutral-300 hover:text-white cursor-pointer"
              data-testid="subbar-duplicate-btn"
            >
              <Copy size={11} />
            </button>

            <button
              type="button"
              onClick={() => onDeleteNode(selectedNode.id)}
              title="Delete"
              className="p-1 rounded bg-[#121218] border border-[#24242d] text-neutral-300 hover:text-red-400 cursor-pointer"
              data-testid="subbar-delete-btn"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
