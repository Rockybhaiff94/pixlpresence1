"use client";

import React from "react";
import {
  X,
  Lock,
  Unlock,
  RotateCcw,
  Maximize2,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
} from "lucide-react";
import { CanvasEmbed, CanvasTransform } from "@/types/studio";

interface EmbedAdjustmentPanelProps {
  embed: CanvasEmbed;
  currentWidth: number;
  currentHeight: number;
  currentX: number;
  currentY: number;
  isLocked: boolean;
  aspectRatioLocked?: boolean;
  onUpdateTransform: (transform: Partial<CanvasTransform>) => void;
  onToggleLock: () => void;
  onToggleAspectLock?: () => void;
  onChangeZIndex: (delta: number) => void;
  onClose: () => void;
}

export const EmbedAdjustmentPanel: React.FC<EmbedAdjustmentPanelProps> = ({
  embed,
  currentWidth,
  currentHeight,
  currentX,
  currentY,
  isLocked,
  aspectRatioLocked = false,
  onUpdateTransform,
  onToggleLock,
  onToggleAspectLock,
  onChangeZIndex,
  onClose,
}) => {
  const currentAspect = (currentWidth / Math.max(1, currentHeight)).toFixed(2);

  const handleWidthChange = (val: number) => {
    if (Number.isNaN(val) || val < 100) return;
    const clampedW = Math.max(320, Math.min(1600, Math.round(val)));
    if (aspectRatioLocked) {
      const ratio = currentWidth / Math.max(1, currentHeight);
      const nextH = Math.max(160, Math.min(2000, Math.round(clampedW / ratio)));
      onUpdateTransform({ width: clampedW, height: nextH });
    } else {
      onUpdateTransform({ width: clampedW });
    }
  };

  const handleHeightChange = (val: number) => {
    if (Number.isNaN(val) || val < 50) return;
    const clampedH = Math.max(160, Math.min(2000, Math.round(val)));
    if (aspectRatioLocked) {
      const ratio = currentWidth / Math.max(1, currentHeight);
      const nextW = Math.max(320, Math.min(1600, Math.round(clampedH * ratio)));
      onUpdateTransform({ width: nextW, height: clampedH });
    } else {
      onUpdateTransform({ height: clampedH });
    }
  };

  const handleAlign = (alignment: "left" | "center" | "right") => {
    if (alignment === "center") {
      onUpdateTransform({ x: 0 });
    } else if (alignment === "left") {
      onUpdateTransform({ x: -120 });
    } else if (alignment === "right") {
      onUpdateTransform({ x: 120 });
    }
  };

  const handleResetPosition = () => {
    onUpdateTransform({ x: 0, y: 0 });
  };

  const handleResetDimensions = () => {
    onUpdateTransform({ width: 580, height: 540 });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="embed-adjustment-panel fixed z-[100] w-72 p-3.5 rounded-2xl bg-[#101014]/95 backdrop-blur-xl border border-neutral-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-xs text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: "76px",
        right: "24px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
          <Sliders size={13} className="text-amber-400" />
          <span>Embed Adjustments</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Dimensions (W & H) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Dimensions</span>
            <div className="flex items-center gap-1 font-mono text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              <span>{currentAspect}:1</span>
              {onToggleAspectLock && (
                <button
                  type="button"
                  onClick={onToggleAspectLock}
                  title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  className={`ml-1 cursor-pointer transition-colors ${
                    aspectRatioLocked ? "text-amber-400" : "text-neutral-500 hover:text-white"
                  }`}
                >
                  <Lock size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 bg-black/70 border border-neutral-800 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-neutral-500 font-mono">W</span>
              <input
                type="number"
                min={320}
                max={1600}
                step={10}
                value={Math.round(currentWidth)}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full bg-transparent text-white font-mono text-xs text-right focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 font-mono">px</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/70 border border-neutral-800 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-neutral-500 font-mono">H</span>
              <input
                type="number"
                min={160}
                max={2000}
                step={10}
                value={Math.round(currentHeight)}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full bg-transparent text-white font-mono text-xs text-right focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 font-mono">px</span>
            </div>
          </div>
        </div>

        {/* Position (X & Y) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Coordinates (Canvas Space)</span>
            <button
              type="button"
              onClick={handleResetPosition}
              className="text-[10px] text-neutral-500 hover:text-amber-400 transition-colors font-mono"
              title="Reset position to center (0, 0)"
            >
              Center (0,0)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 bg-black/70 border border-neutral-800 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-neutral-500 font-mono">X</span>
              <input
                type="number"
                step={5}
                value={Math.round(currentX)}
                onChange={(e) => onUpdateTransform({ x: Number(e.target.value) || 0 })}
                className="w-full bg-transparent text-white font-mono text-xs text-right focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 font-mono">px</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/70 border border-neutral-800 rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-neutral-500 font-mono">Y</span>
              <input
                type="number"
                step={5}
                value={Math.round(currentY)}
                onChange={(e) => onUpdateTransform({ y: Number(e.target.value) || 0 })}
                className="w-full bg-transparent text-white font-mono text-xs text-right focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 font-mono">px</span>
            </div>
          </div>
        </div>

        {/* Alignment Helpers */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-neutral-400">Alignment Presets</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleAlign("left")}
              className="py-1.5 px-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-colors flex items-center justify-center gap-1 text-[11px]"
            >
              <AlignLeft size={12} /> Left
            </button>
            <button
              type="button"
              onClick={() => handleAlign("center")}
              className="py-1.5 px-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-colors flex items-center justify-center gap-1 text-[11px]"
            >
              <AlignCenter size={12} /> Center
            </button>
            <button
              type="button"
              onClick={() => handleAlign("right")}
              className="py-1.5 px-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-colors flex items-center justify-center gap-1 text-[11px]"
            >
              <AlignRight size={12} /> Right
            </button>
          </div>
        </div>

        {/* Layer Ordering & Lock */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeZIndex(1)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-[10px]"
              title="Bring Forward"
            >
              <ArrowUp size={11} /> Layer +1
            </button>
            <button
              type="button"
              onClick={() => onChangeZIndex(-1)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors flex items-center gap-1 text-[10px]"
              title="Send Backward"
            >
              <ArrowDown size={11} /> Layer -1
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetDimensions}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
              title="Reset default dimensions (580x540)"
            >
              <RotateCcw size={12} />
            </button>
            <button
              type="button"
              onClick={onToggleLock}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLocked
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title={isLocked ? "Unlock embed" : "Lock embed"}
            >
              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
