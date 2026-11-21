"use client";

import React, { useState } from "react";
import {
  EditorElement,
  ShapeElement,
  TextElement,
  ImageElement,
  CanvasBackground,
} from "./editorTypes";
import { AVAILABLE_FONTS } from "./editorPresets";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  FlipHorizontal,
  FlipVertical,
  Minus,
  Plus,
  PaintBucket,
  Maximize2,
  Sliders,
} from "lucide-react";

interface DooryContextualToolbarProps {
  selectedElement: EditorElement | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onAlignElement: (
    id: string,
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void;
  onReorderElement: (id: string, direction: "top" | "bottom" | "up" | "down") => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
  onUpdateCanvas: (updates: {
    width?: number;
    height?: number;
    background?: Partial<CanvasBackground>;
  }) => void;
  onFitScreen?: () => void;
}

export const DooryContextualToolbar: React.FC<DooryContextualToolbarProps> = ({
  selectedElement,
  onUpdateElement,
  onAlignElement,
  onReorderElement,
  onDuplicateElement,
  onDeleteElement,
  canvas,
  onUpdateCanvas,
  onFitScreen,
}) => {
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showZOrderMenu, setShowZOrderMenu] = useState(false);

  return (
    <div
      className="h-11 bg-[#09090b] border-b border-[#1e1e24] px-4 flex items-center justify-between text-xs font-mono text-neutral-300 select-none z-20 shrink-0"
      data-testid="doory-contextual-toolbar"
      data-selection-type={selectedElement ? selectedElement.type : "page"}
    >
      {/* Left Contextual Group: Morphs dynamically based on selection */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
        {/* ================= 1. PAGE / CANVAS CONTROLS (Nothing selected) ================= */}
        {!selectedElement && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
              CANVAS:
            </span>

            {/* Canvas Dimensions Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#141418] border border-[#22222a] text-[11px] text-neutral-300">
              <span>{canvas.width}</span>
              <span className="text-neutral-500">×</span>
              <span>{canvas.height} px</span>
            </div>

            {/* Canvas Background Color Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-400">BG:</span>
              <label
                className="w-5 h-5 rounded border border-white/20 cursor-pointer overflow-hidden inline-block shrink-0 shadow-sm"
                style={{ backgroundColor: canvas.background.color }}
                title="Change canvas background color"
              >
                <input
                  type="color"
                  value={canvas.background.color}
                  onChange={(e) =>
                    onUpdateCanvas({
                      background: { ...canvas.background, color: e.target.value },
                    })
                  }
                  className="opacity-0 w-full h-full cursor-pointer"
                  data-testid="canvas-bg-color-picker"
                />
              </label>
              <span className="text-[10px] text-neutral-400 uppercase">
                {canvas.background.color}
              </span>
            </div>

            {/* Pattern Badge */}
            <div className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400 uppercase">
              Pattern: {canvas.background.pattern}
            </div>

            {onFitScreen && (
              <button
                onClick={onFitScreen}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#141418] hover:bg-[#1a1a20] border border-[#22222a] text-neutral-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                title="Fit artboard to screen"
                data-testid="canvas-fit-button"
              >
                <Maximize2 size={12} />
                <span>Fit</span>
              </button>
            )}
          </div>
        )}

        {/* ================= 2. TEXT CONTROLS (Text Element Selected) ================= */}
        {selectedElement && selectedElement.type === "text" && (
          <div className="flex items-center gap-2">
            {/* Font Family Picker */}
            <select
              value={(selectedElement as TextElement).fontFamily || "Space Grotesk"}
              onChange={(e) =>
                onUpdateElement(selectedElement.id, { fontFamily: e.target.value })
              }
              className="bg-[#141418] border border-[#262632] rounded-md px-2 py-1 text-xs text-white outline-none cursor-pointer hover:border-neutral-500"
              data-testid="text-font-family"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.name} value={f.name} className="bg-[#141418] text-white">
                  {f.name}
                </option>
              ))}
            </select>

            <div className="h-4 w-[1px] bg-[#22222a]" />

            {/* Font Size Stepper */}
            <div className="flex items-center bg-[#141418] border border-[#262632] rounded-md overflow-hidden">
              <button
                onClick={() => {
                  const curr = (selectedElement as TextElement).fontSize || 16;
                  onUpdateElement(selectedElement.id, { fontSize: Math.max(8, curr - 2) });
                }}
                className="px-1.5 py-1 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Decrease font size"
                data-testid="text-size-dec"
              >
                <Minus size={11} />
              </button>
              <input
                type="number"
                value={(selectedElement as TextElement).fontSize || 16}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    fontSize: Math.max(8, parseInt(e.target.value) || 16),
                  })
                }
                className="w-10 bg-transparent text-center text-xs text-white outline-none font-bold"
                data-testid="text-size-input"
              />
              <button
                onClick={() => {
                  const curr = (selectedElement as TextElement).fontSize || 16;
                  onUpdateElement(selectedElement.id, { fontSize: Math.min(160, curr + 2) });
                }}
                className="px-1.5 py-1 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Increase font size"
                data-testid="text-size-inc"
              >
                <Plus size={11} />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#22222a]" />

            {/* Text Color Picker */}
            <label
              className="w-5 h-5 rounded border border-white/20 cursor-pointer overflow-hidden inline-block shrink-0 shadow-sm"
              style={{ backgroundColor: (selectedElement as TextElement).color || "#ffffff" }}
              title="Change text color"
            >
              <input
                type="color"
                value={(selectedElement as TextElement).color || "#ffffff"}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, { color: e.target.value })
                }
                className="opacity-0 w-full h-full cursor-pointer"
                data-testid="text-color-picker"
              />
            </label>

            {/* Bold Toggle */}
            <button
              onClick={() => {
                const curr = (selectedElement as TextElement).fontWeight || 400;
                onUpdateElement(selectedElement.id, { fontWeight: curr >= 700 ? 400 : 700 });
              }}
              className={`p-1 rounded ${
                ((selectedElement as TextElement).fontWeight || 400) >= 700
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="Bold"
              data-testid="text-bold-toggle"
            >
              <Bold size={13} />
            </button>

            {/* Italic Toggle */}
            <button
              onClick={() => {
                const curr = (selectedElement as TextElement).fontStyle || "normal";
                onUpdateElement(selectedElement.id, {
                  fontStyle: curr === "italic" ? "normal" : "italic",
                });
              }}
              className={`p-1 rounded ${
                (selectedElement as TextElement).fontStyle === "italic"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="Italic"
              data-testid="text-italic-toggle"
            >
              <Italic size={13} />
            </button>

            {/* Underline Toggle */}
            <button
              onClick={() => {
                const curr = (selectedElement as TextElement).underline || false;
                onUpdateElement(selectedElement.id, { underline: !curr });
              }}
              className={`p-1 rounded ${
                (selectedElement as TextElement).underline
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title="Underline"
              data-testid="text-underline-toggle"
            >
              <Underline size={13} />
            </button>

            <div className="h-4 w-[1px] bg-[#22222a]" />

            {/* Text Alignment */}
            <div className="flex items-center bg-[#141418] border border-[#262632] rounded-md p-0.5">
              {(["left", "center", "right"] as const).map((align) => {
                const Icon =
                  align === "left"
                    ? AlignLeft
                    : align === "center"
                    ? AlignCenter
                    : AlignRight;
                const isSelected =
                  ((selectedElement as TextElement).textAlign || "left") === align;
                return (
                  <button
                    key={align}
                    onClick={() =>
                      onUpdateElement(selectedElement.id, { textAlign: align })
                    }
                    className={`p-1 rounded ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    title={`Align ${align}`}
                    data-testid={`text-align-${align}`}
                  >
                    <Icon size={12} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 3. SHAPE CONTROLS (Shape Element Selected) ================= */}
        {selectedElement && selectedElement.type === "shape" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400 uppercase">
              {(selectedElement as ShapeElement).shapeKind}:
            </span>

            {/* Fill Color */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400">Fill:</span>
              <label
                className="w-5 h-5 rounded border border-white/20 cursor-pointer overflow-hidden inline-block shrink-0 shadow-sm"
                style={{ backgroundColor: (selectedElement as ShapeElement).fill || "#222226" }}
                title="Fill Color"
              >
                <input
                  type="color"
                  value={(selectedElement as ShapeElement).fill || "#222226"}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { fill: e.target.value })
                  }
                  className="opacity-0 w-full h-full cursor-pointer"
                  data-testid="shape-fill-color"
                />
              </label>
            </div>

            {/* Stroke Color */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400">Stroke:</span>
              <label
                className="w-5 h-5 rounded border border-white/20 cursor-pointer overflow-hidden inline-block shrink-0 shadow-sm"
                style={{ backgroundColor: (selectedElement as ShapeElement).stroke || "#ffffff" }}
                title="Stroke Color"
              >
                <input
                  type="color"
                  value={(selectedElement as ShapeElement).stroke || "#ffffff"}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { stroke: e.target.value })
                  }
                  className="opacity-0 w-full h-full cursor-pointer"
                  data-testid="shape-stroke-color"
                />
              </label>
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400">Width:</span>
              <div className="flex items-center bg-[#141418] border border-[#262632] rounded-md overflow-hidden">
                <button
                  onClick={() => {
                    const curr = (selectedElement as ShapeElement).strokeWidth || 0;
                    onUpdateElement(selectedElement.id, { strokeWidth: Math.max(0, curr - 1) });
                  }}
                  className="px-1 py-0.5 text-neutral-400 hover:text-white"
                  data-testid="shape-stroke-dec"
                >
                  <Minus size={10} />
                </button>
                <span className="w-6 text-center text-xs font-bold text-white">
                  {(selectedElement as ShapeElement).strokeWidth || 0}
                </span>
                <button
                  onClick={() => {
                    const curr = (selectedElement as ShapeElement).strokeWidth || 0;
                    onUpdateElement(selectedElement.id, { strokeWidth: Math.min(24, curr + 1) });
                  }}
                  className="px-1 py-0.5 text-neutral-400 hover:text-white"
                  data-testid="shape-stroke-inc"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>

            {/* Corner Radius (for rectangle) */}
            {(selectedElement as ShapeElement).shapeKind === "rectangle" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400">Radius:</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={(selectedElement as ShapeElement).cornerRadius || 0}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, {
                      cornerRadius: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-10 bg-[#141418] border border-[#262632] rounded px-1 py-0.5 text-center text-xs text-white outline-none"
                  data-testid="shape-corner-radius"
                />
              </div>
            )}
          </div>
        )}

        {/* ================= 4. IMAGE CONTROLS (Image Element Selected) ================= */}
        {selectedElement && selectedElement.type === "image" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400 uppercase">Image:</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400">Radius:</span>
              <input
                type="number"
                min="0"
                max="60"
                value={(selectedElement as ImageElement).borderRadius || 0}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    borderRadius: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="w-10 bg-[#141418] border border-[#262632] rounded px-1 py-0.5 text-center text-xs text-white outline-none"
                data-testid="image-border-radius"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Action Group: Alignments, Z-Order, Lock, Duplicate, Delete */}
      {selectedElement && (
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#22222a]">
          {/* Alignment Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAlignMenu(!showAlignMenu)}
              className="px-2 py-1 rounded-md bg-[#141418] border border-[#22222a] hover:bg-[#1a1a20] text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              title="Align Element on Canvas"
              data-testid="align-menu-button"
            >
              <span>Align</span>
              <ChevronDown size={11} />
            </button>

            {showAlignMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-40 bg-[#101014] border border-[#262632] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5"
                onMouseLeave={() => setShowAlignMenu(false)}
                data-testid="align-menu-dropdown"
              >
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "center-h");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-center-h"
                >
                  Center Horizontally
                </button>
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "center-v");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-center-v"
                >
                  Center Vertically
                </button>
                <div className="my-0.5 border-t border-[#22222a]" />
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "left");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-left"
                >
                  Align Left
                </button>
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "right");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-right"
                >
                  Align Right
                </button>
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "top");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-top"
                >
                  Align Top
                </button>
                <button
                  onClick={() => {
                    onAlignElement(selectedElement.id, "bottom");
                    setShowAlignMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="align-bottom"
                >
                  Align Bottom
                </button>
              </div>
            )}
          </div>

          {/* Z-Order Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowZOrderMenu(!showZOrderMenu)}
              className="px-2 py-1 rounded-md bg-[#141418] border border-[#22222a] hover:bg-[#1a1a20] text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              title="Change Layer Order"
              data-testid="zorder-menu-button"
            >
              <span>Order</span>
              <ChevronDown size={11} />
            </button>

            {showZOrderMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-36 bg-[#101014] border border-[#262632] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5"
                onMouseLeave={() => setShowZOrderMenu(false)}
                data-testid="zorder-menu-dropdown"
              >
                <button
                  onClick={() => {
                    onReorderElement(selectedElement.id, "top");
                    setShowZOrderMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="zorder-top"
                >
                  Bring to Front
                </button>
                <button
                  onClick={() => {
                    onReorderElement(selectedElement.id, "up");
                    setShowZOrderMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="zorder-up"
                >
                  Bring Forward
                </button>
                <button
                  onClick={() => {
                    onReorderElement(selectedElement.id, "down");
                    setShowZOrderMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="zorder-down"
                >
                  Send Backward
                </button>
                <button
                  onClick={() => {
                    onReorderElement(selectedElement.id, "bottom");
                    setShowZOrderMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded-md"
                  data-testid="zorder-bottom"
                >
                  Send to Back
                </button>
              </div>
            )}
          </div>

          {/* Lock / Unlock */}
          <button
            onClick={() =>
              onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })
            }
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              selectedElement.locked
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-[#141418] text-neutral-400 border-[#22222a] hover:text-white hover:bg-[#1a1a20]"
            }`}
            title={selectedElement.locked ? "Unlock element (Ctrl+L)" : "Lock element (Ctrl+L)"}
            data-testid="action-lock"
          >
            {selectedElement.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>

          {/* Duplicate */}
          <button
            onClick={() => onDuplicateElement(selectedElement.id)}
            className="p-1.5 rounded-md bg-[#141418] text-neutral-400 border border-[#22222a] hover:text-white hover:bg-[#1a1a20] transition-colors cursor-pointer"
            title="Duplicate element (Ctrl+D)"
            data-testid="action-duplicate"
          >
            <Copy size={12} />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            className="p-1.5 rounded-md bg-[#141418] text-neutral-400 border border-[#22222a] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete element (Del)"
            data-testid="action-delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
