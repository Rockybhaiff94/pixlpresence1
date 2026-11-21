"use client";

import React from "react";
import {
  EditorElement,
  CanvasBackground,
  ShapeElement,
  TextElement,
  ImageElement,
  StickerElement,
  ContainerElement,
  SocialElement,
  RpcElement,
  BackgroundPattern,
} from "./editorTypes";
import { AVAILABLE_FONTS } from "./editorPresets";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Sparkles,
  X,
  Layers,
  Settings2,
} from "lucide-react";

interface EditorPropertiesPanelProps {
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
  selectedElement: EditorElement | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onAlignElement: (
    id: string,
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => void;
  onReorderElement: (id: string, direction: "top" | "bottom" | "up" | "down") => void;
  onClose?: () => void;
}

export const EditorPropertiesPanel: React.FC<EditorPropertiesPanelProps> = ({
  canvas,
  onUpdateCanvas,
  selectedElement,
  onUpdateElement,
  onAlignElement,
  onReorderElement,
  onClose,
}) => {
  if (!selectedElement) {
    // Canvas / Artboard Properties
    return (
      <aside className="w-80 bg-[#0a0a0a] border-l border-[#222222] p-4 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none space-y-5">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
            <Settings2 size={13} className="text-neutral-400" />
            <span>[ CANVAS SETTINGS ]</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-500">ARTBOARD</span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
            DIMENSIONS (PX)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block mb-1">WIDTH</span>
              <input
                type="number"
                value={canvas.width}
                onChange={(e) => onUpdateCanvas({ width: Math.max(100, Number(e.target.value)) })}
                className="w-full bg-[#121212] border border-[#222222] focus:border-white text-xs font-mono text-white p-2 rounded-lg outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block mb-1">HEIGHT</span>
              <input
                type="number"
                value={canvas.height}
                onChange={(e) => onUpdateCanvas({ height: Math.max(100, Number(e.target.value)) })}
                className="w-full bg-[#121212] border border-[#222222] focus:border-white text-xs font-mono text-white p-2 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>

        {/* Background Color & Gradient */}
        <div className="space-y-3">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
            BACKGROUND STYLE
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateCanvas({ background: { type: "solid" } })}
              className={`py-1.5 px-3 rounded-lg text-xs font-mono transition-colors ${
                canvas.background.type === "solid"
                  ? "bg-white text-black font-bold"
                  : "bg-[#141414] text-neutral-400 border border-[#262626]"
              }`}
            >
              Solid
            </button>
            <button
              onClick={() =>
                onUpdateCanvas({
                  background: {
                    type: "gradient",
                    gradientTo: canvas.background.gradientTo || "#1a0b2e",
                    gradientAngle: canvas.background.gradientAngle || 135,
                  },
                })
              }
              className={`py-1.5 px-3 rounded-lg text-xs font-mono transition-colors ${
                canvas.background.type === "gradient"
                  ? "bg-white text-black font-bold"
                  : "bg-[#141414] text-neutral-400 border border-[#262626]"
              }`}
            >
              Gradient
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={canvas.background.color}
              onChange={(e) => onUpdateCanvas({ background: { color: e.target.value } })}
              className="w-8 h-8 rounded border border-[#333333] cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={canvas.background.color}
              onChange={(e) => onUpdateCanvas({ background: { color: e.target.value } })}
              className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
            />
          </div>

          {canvas.background.type === "gradient" && (
            <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
              <span className="text-[10px] font-mono text-neutral-500 block">GRADIENT END COLOR</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={canvas.background.gradientTo || "#000000"}
                  onChange={(e) => onUpdateCanvas({ background: { gradientTo: e.target.value } })}
                  className="w-8 h-8 rounded border border-[#333333] cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={canvas.background.gradientTo || "#000000"}
                  onChange={(e) => onUpdateCanvas({ background: { gradientTo: e.target.value } })}
                  className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pattern Overlay */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
            PATTERN OVERLAY
          </label>
          <select
            value={canvas.background.pattern}
            onChange={(e) =>
              onUpdateCanvas({ background: { pattern: e.target.value as BackgroundPattern } })
            }
            className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
          >
            <option value="none">None</option>
            <option value="dot-matrix">Dot Matrix (Nothing OS)</option>
            <option value="grid">Technical Grid</option>
          </select>
        </div>
      </aside>
    );
  }

  // Selected Element Contextual Properties
  const el = selectedElement;

  return (
    <aside className="w-80 bg-[#0a0a0a] border-l border-[#222222] p-4 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none space-y-5">
      {/* Element Header */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-3">
        <input
          type="text"
          value={el.name}
          onChange={(e) => onUpdateElement(el.id, { name: e.target.value })}
          className="bg-transparent border border-transparent hover:border-[#333333] focus:border-white text-xs font-mono font-bold text-white px-1.5 py-1 rounded outline-none w-44"
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-400 bg-[#161616] px-2 py-0.5 rounded border border-[#262626] uppercase">
            {el.type}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Position & Geometry */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
          POSITION & SIZE
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">X POS</span>
            <input
              type="number"
              value={el.x}
              onChange={(e) => onUpdateElement(el.id, { x: Number(e.target.value) })}
              className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">Y POS</span>
            <input
              type="number"
              value={el.y}
              onChange={(e) => onUpdateElement(el.id, { y: Number(e.target.value) })}
              className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">WIDTH</span>
            <input
              type="number"
              value={el.width}
              onChange={(e) => onUpdateElement(el.id, { width: Math.max(5, Number(e.target.value)) })}
              className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">HEIGHT</span>
            <input
              type="number"
              value={el.height}
              onChange={(e) => onUpdateElement(el.id, { height: Math.max(5, Number(e.target.value)) })}
              className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Rotation */}
        <div className="pt-1">
          <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1">
            <span>ROTATION</span>
            <span>{el.rotation}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={el.rotation}
            onChange={(e) => onUpdateElement(el.id, { rotation: Number(e.target.value) })}
            className="w-full accent-white"
          />
        </div>
      </div>

      {/* Alignment Shortcuts */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
          ALIGNMENT
        </label>
        <div className="grid grid-cols-6 gap-1 bg-[#121212] p-1 rounded-xl border border-[#222222]">
          <button
            onClick={() => onAlignElement(el.id, "left")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => onAlignElement(el.id, "center-h")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Center Horizontally"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => onAlignElement(el.id, "right")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>
          <button
            onClick={() => onAlignElement(el.id, "top")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Align Top"
          >
            <ArrowUpToLine size={14} />
          </button>
          <button
            onClick={() => onAlignElement(el.id, "center-v")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Center Vertically"
          >
            <AlignJustify size={14} />
          </button>
          <button
            onClick={() => onAlignElement(el.id, "bottom")}
            className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white flex items-center justify-center"
            title="Align Bottom"
          >
            <ArrowDownToLine size={14} />
          </button>
        </div>
      </div>

      {/* SHAPE SPECIFIC PROPERTIES */}
      {el.type === "shape" && (
        <ShapeProperties shape={el as ShapeElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* TEXT SPECIFIC PROPERTIES */}
      {el.type === "text" && (
        <TextProperties textEl={el as TextElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* IMAGE SPECIFIC PROPERTIES */}
      {el.type === "image" && (
        <ImageProperties img={el as ImageElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* STICKER SPECIFIC PROPERTIES */}
      {el.type === "sticker" && (
        <StickerProperties sticker={el as StickerElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* CONTAINER / EMBED SPECIFIC PROPERTIES */}
      {el.type === "container" && (
        <ContainerProperties container={el as ContainerElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* SOCIAL SPECIFIC PROPERTIES */}
      {el.type === "social" && (
        <SocialProperties social={el as SocialElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* RPC SPECIFIC PROPERTIES */}
      {el.type === "rpc" && (
        <RpcProperties rpc={el as RpcElement} onUpdate={(u) => onUpdateElement(el.id, u)} />
      )}

      {/* Opacity */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono text-neutral-400">
          <span>OPACITY</span>
          <span>{Math.round(el.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={el.opacity}
          onChange={(e) => onUpdateElement(el.id, { opacity: Number(e.target.value) })}
          className="w-full accent-white"
        />
      </div>

      {/* Glow Effect */}
      <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={13} className="text-purple-400" />
            <span>NEON GLOW</span>
          </span>
          <button
            onClick={() => {
              if (el.glow && el.glow.intensity > 0) {
                onUpdateElement(el.id, { glow: { color: "#ffffff", intensity: 0 } });
              } else {
                onUpdateElement(el.id, { glow: { color: "#8b5cf6", intensity: 20 } });
              }
            }}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              el.glow && el.glow.intensity > 0
                ? "bg-purple-950 text-purple-300 border-purple-800"
                : "bg-[#141414] text-neutral-500 border-[#262626]"
            }`}
          >
            {el.glow && el.glow.intensity > 0 ? "ENABLED" : "OFF"}
          </button>
        </div>

        {el.glow && el.glow.intensity > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={el.glow.color}
                onChange={(e) =>
                  onUpdateElement(el.id, {
                    glow: { ...el.glow!, color: e.target.value },
                  })
                }
                className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={el.glow.color}
                onChange={(e) =>
                  onUpdateElement(el.id, {
                    glow: { ...el.glow!, color: e.target.value },
                  })
                }
                className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>INTENSITY</span>
              <span>{el.glow.intensity}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={el.glow.intensity}
              onChange={(e) =>
                onUpdateElement(el.id, {
                  glow: { ...el.glow!, intensity: Number(e.target.value) },
                })
              }
              className="w-full accent-purple-400"
            />
          </div>
        )}
      </div>

      {/* Layer Order Controls */}
      <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
        <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">
          ARRANGE LAYER
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onReorderElement(el.id, "top")}
            className="py-1.5 px-2 bg-[#121212] border border-[#222222] hover:border-white rounded-lg text-xs font-mono text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ChevronUp size={14} />
            <span>To Front</span>
          </button>
          <button
            onClick={() => onReorderElement(el.id, "bottom")}
            className="py-1.5 px-2 bg-[#121212] border border-[#222222] hover:border-white rounded-lg text-xs font-mono text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ChevronDown size={14} />
            <span>To Back</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

/* --- Sub-Components for Contextual Inspector --- */

const ShapeProperties: React.FC<{
  shape: ShapeElement;
  onUpdate: (u: Partial<ShapeElement>) => void;
}> = ({ shape, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      {/* Fill Color */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">FILL COLOR</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shape.fill === "transparent" ? "#000000" : shape.fill}
            onChange={(e) => onUpdate({ fill: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={shape.fill}
            onChange={(e) => onUpdate({ fill: e.target.value })}
            className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
      </div>

      {/* Stroke Color & Width */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">BORDER STROKE</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shape.stroke === "transparent" ? "#ffffff" : shape.stroke}
            onChange={(e) => onUpdate({ stroke: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="number"
            min={0}
            max={20}
            value={shape.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            className="w-16 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
            placeholder="px"
          />
        </div>
      </div>

      {/* Corner Radius */}
      {(shape.shapeKind === "rounded-rectangle" || shape.shapeKind === "rectangle") && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-neutral-500">
            <span>CORNER RADIUS</span>
            <span>{shape.cornerRadius || 0}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={shape.cornerRadius || 0}
            onChange={(e) =>
              onUpdate({
                cornerRadius: Number(e.target.value),
                shapeKind: "rounded-rectangle",
              })
            }
            className="w-full accent-white"
          />
        </div>
      )}
    </div>
  );
};

const TextProperties: React.FC<{
  textEl: TextElement;
  onUpdate: (u: Partial<TextElement>) => void;
}> = ({ textEl, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      {/* Content */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">TEXT CONTENT</span>
        <textarea
          rows={2}
          value={textEl.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none resize-none"
        />
      </div>

      {/* Font Family */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">FONT FAMILY</span>
        <select
          value={textEl.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
        >
          {AVAILABLE_FONTS.map((font) => (
            <option key={font.name} value={font.family}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      {/* Size & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">SIZE (PX)</span>
          <input
            type="number"
            min={8}
            max={160}
            value={textEl.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
        <div>
          <span className="text-[10px] font-mono text-neutral-500 block mb-0.5">WEIGHT</span>
          <select
            value={textEl.fontWeight}
            onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })}
            className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          >
            <option value={300}>Light (300)</option>
            <option value={400}>Regular (400)</option>
            <option value={600}>Semi-bold (600)</option>
            <option value={700}>Bold (700)</option>
            <option value={800}>Extra Bold (800)</option>
          </select>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">COLOR</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={textEl.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={textEl.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
      </div>

      {/* Text Align & Transform */}
      <div className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-lg border border-[#222222]">
        <button
          onClick={() => onUpdate({ textAlign: "left" })}
          className={`p-1 rounded text-xs font-mono ${textEl.textAlign === "left" ? "bg-white text-black" : "text-neutral-400"}`}
        >
          Left
        </button>
        <button
          onClick={() => onUpdate({ textAlign: "center" })}
          className={`p-1 rounded text-xs font-mono ${textEl.textAlign === "center" ? "bg-white text-black" : "text-neutral-400"}`}
        >
          Center
        </button>
        <button
          onClick={() => onUpdate({ textAlign: "right" })}
          className={`p-1 rounded text-xs font-mono ${textEl.textAlign === "right" ? "bg-white text-black" : "text-neutral-400"}`}
        >
          Right
        </button>
      </div>
    </div>
  );
};

const ImageProperties: React.FC<{
  img: ImageElement;
  onUpdate: (u: Partial<ImageElement>) => void;
}> = ({ img, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      {/* Fit Mode */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">OBJECT FIT</span>
        <select
          value={img.fit}
          onChange={(e) => onUpdate({ fit: e.target.value as "cover" | "contain" | "fill" })}
          className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
        >
          <option value="cover">Cover (Fill space)</option>
          <option value="contain">Contain (Keep aspect)</option>
          <option value="fill">Stretch</option>
        </select>
      </div>

      {/* Border Radius */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>BORDER RADIUS</span>
          <span>{img.borderRadius || 0}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={img.borderRadius || 0}
          onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
          className="w-full accent-white"
        />
      </div>

      {/* Filters: Grayscale */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>GRAYSCALE</span>
          <span>{img.filters?.grayscale || 0}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={img.filters?.grayscale || 0}
          onChange={(e) =>
            onUpdate({
              filters: {
                brightness: img.filters?.brightness ?? 100,
                contrast: img.filters?.contrast ?? 100,
                blur: img.filters?.blur ?? 0,
                grayscale: Number(e.target.value),
              },
            })
          }
          className="w-full accent-white"
        />
      </div>

      {/* Filters: Brightness */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>BRIGHTNESS</span>
          <span>{img.filters?.brightness ?? 100}%</span>
        </div>
        <input
          type="range"
          min={40}
          max={160}
          value={img.filters?.brightness ?? 100}
          onChange={(e) =>
            onUpdate({
              filters: {
                brightness: Number(e.target.value),
                contrast: img.filters?.contrast ?? 100,
                blur: img.filters?.blur ?? 0,
                grayscale: img.filters?.grayscale ?? 0,
              },
            })
          }
          className="w-full accent-white"
        />
      </div>

      {/* Filters: Contrast */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>CONTRAST</span>
          <span>{img.filters?.contrast ?? 100}%</span>
        </div>
        <input
          type="range"
          min={40}
          max={160}
          value={img.filters?.contrast ?? 100}
          onChange={(e) =>
            onUpdate({
              filters: {
                brightness: img.filters?.brightness ?? 100,
                contrast: Number(e.target.value),
                blur: img.filters?.blur ?? 0,
                grayscale: img.filters?.grayscale ?? 0,
              },
            })
          }
          className="w-full accent-white"
        />
      </div>
    </div>
  );
};

const StickerProperties: React.FC<{
  sticker: StickerElement;
  onUpdate: (u: Partial<StickerElement>) => void;
}> = ({ sticker, onUpdate }) => {
  const STICKER_KEYS = [
    { key: "verified", label: "Verified Badge" },
    { key: "discord", label: "Discord" },
    { key: "fire", label: "Flame" },
    { key: "sparkle", label: "Sparkles" },
    { key: "shield", label: "Shield" },
    { key: "trophy", label: "Trophy" },
    { key: "crown", label: "Crown" },
    { key: "heart", label: "Heart" },
    { key: "star", label: "Star" },
    { key: "terminal", label: "Terminal" },
    { key: "code", label: "Code" },
  ];

  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      {/* Sticker Glyph Key */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">BADGE / ICON</span>
        <select
          value={sticker.key}
          onChange={(e) => onUpdate({ key: e.target.value })}
          className="w-full bg-[#121212] border border-[#222222] text-xs font-mono text-white p-2 rounded-lg outline-none"
        >
          {STICKER_KEYS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">GLYPH COLOR</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={sticker.color?.startsWith("#") ? sticker.color : "#38bdf8"}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={sticker.color || "#38bdf8"}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
      </div>

      {/* Background Color */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">BACKGROUND TINT</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={sticker.backgroundColor?.startsWith("#") ? sticker.backgroundColor : "#101014"}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={sticker.backgroundColor || "transparent"}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
      </div>
    </div>
  );
};

const ContainerProperties: React.FC<{
  container: ContainerElement;
  onUpdate: (u: Partial<ContainerElement>) => void;
}> = ({ container, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      {/* Container Background */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">CONTAINER BACKGROUND</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={container.backgroundColor?.startsWith("#") ? container.backgroundColor : "#0c0c0e"}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={container.backgroundColor || "#0c0c0e"}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="flex-1 bg-[#121212] border border-[#222222] text-xs font-mono text-white p-1.5 rounded-lg outline-none"
          />
        </div>
      </div>

      {/* Border Radius */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
          <span>CORNER RADIUS</span>
          <span>{container.borderRadius ?? 24}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={48}
          value={container.borderRadius ?? 24}
          onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
          className="w-full accent-white"
        />
      </div>

      {/* Glassmorphism */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-neutral-500">FROSTED GLASS</span>
        <button
          onClick={() => onUpdate({ glassmorphism: !container.glassmorphism })}
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            container.glassmorphism !== false
              ? "bg-sky-950 text-sky-300 border-sky-800"
              : "bg-[#141414] text-neutral-500 border-[#262626]"
          }`}
        >
          {container.glassmorphism !== false ? "ENABLED" : "OFF"}
        </button>
      </div>
    </div>
  );
};

const SocialProperties: React.FC<{
  social: SocialElement;
  onUpdate: (u: Partial<SocialElement>) => void;
}> = ({ social, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">ICON VARIANT</span>
        <div className="grid grid-cols-2 gap-2">
          {(["default", "pill", "minimal", "circle"] as const).map((variant) => (
            <button
              key={variant}
              onClick={() => onUpdate({ variant })}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono capitalize transition-colors ${
                social.variant === variant
                  ? "bg-white text-black font-bold"
                  : "bg-[#141414] text-neutral-400 border border-[#262626]"
              }`}
            >
              {variant}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const RpcProperties: React.FC<{
  rpc: RpcElement;
  onUpdate: (u: Partial<RpcElement>) => void;
}> = ({ rpc, onUpdate }) => {
  return (
    <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-neutral-500 block">CARD THEME</span>
        <div className="grid grid-cols-2 gap-2">
          {(["card", "glass", "minimal", "neon"] as const).map((style) => (
            <button
              key={style}
              onClick={() => onUpdate({ cardStyle: style })}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono capitalize transition-colors ${
                rpc.cardStyle === style
                  ? "bg-white text-black font-bold"
                  : "bg-[#141414] text-neutral-400 border border-[#262626]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
