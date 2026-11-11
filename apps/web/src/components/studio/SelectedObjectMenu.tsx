"use client";

import React, { useState } from "react";
import {
  Palette,
  Sparkles,
  Eye,
  Layout,
  Sliders,
  X,
  Type,
  Image as ImageIcon,
  Square,
  Lock,
  Layers,
} from "lucide-react";
import {
  CanvasElement,
  CanvasEmbed,
  CanvasTransform,
  CanvasElementStyle,
} from "@/types/studio";

interface SelectedObjectMenuProps {
  item: CanvasEmbed | CanvasElement;
  isEmbed: boolean;
  onUpdateTransform: (transform: Partial<CanvasTransform>) => void;
  onUpdateStyle: (style: Partial<CanvasElementStyle>) => void;
  onUpdateProps?: (props: Record<string, any>) => void;
  onUpdateVisibility?: (visible: boolean) => void;
  onClose: () => void;
}

type TabType = "appearance" | "effects" | "visibility" | "layout" | "content" | "advanced";

export const SelectedObjectMenu: React.FC<SelectedObjectMenuProps> = ({
  item,
  isEmbed,
  onUpdateTransform,
  onUpdateStyle,
  onUpdateProps,
  onUpdateVisibility,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(isEmbed ? "appearance" : "content");

  const transform = item.transform;
  const style = isEmbed
    ? (item as CanvasEmbed).style
    : (item as CanvasElement).style || {};
  const props = isEmbed ? {} : (item as CanvasElement).props || {};
  const isVisible = item.isVisible !== false;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-0 right-[-310px] w-[300px] max-h-[460px] overflow-y-auto bg-[#101014]/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 z-50 pointer-events-auto text-neutral-200 text-xs font-mono select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <Sliders size={13} className="text-sky-400" />
          <span className="font-bold text-white text-[11px] truncate">
            {isEmbed ? (item as CanvasEmbed).title : (item as CanvasElement).name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-neutral-800/60 mb-3 no-scrollbar text-[10px]">
        {!isEmbed && (
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === "content" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Content
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`px-2 py-1 rounded transition-colors ${
            activeTab === "appearance" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Appearance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={`px-2 py-1 rounded transition-colors ${
            activeTab === "effects" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Effects
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`px-2 py-1 rounded transition-colors ${
            activeTab === "layout" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Layout
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("visibility")}
          className={`px-2 py-1 rounded transition-colors ${
            activeTab === "visibility" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Visibility
        </button>
      </div>

      {/* Tab 1: Content (For Children) */}
      {activeTab === "content" && !isEmbed && (
        <div className="space-y-3">
          {/* Text input if element has text / content */}
          {(props.text !== undefined || props.content !== undefined) && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Text Content</label>
              <textarea
                value={props.text ?? props.content ?? ""}
                onChange={(e) =>
                  onUpdateProps?.({
                    ...(props.text !== undefined ? { text: e.target.value } : { content: e.target.value }),
                  })
                }
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none font-sans"
              />
            </div>
          )}

          {/* Image URL if image element */}
          {props.src !== undefined && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Image URL</label>
              <input
                type="text"
                value={props.src}
                onChange={(e) => onUpdateProps?.({ src: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Button URL & Subtitle */}
          {props.url !== undefined && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Target Link URL</label>
              <input
                type="text"
                value={props.url}
                onChange={(e) => onUpdateProps?.({ url: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Typography options if text element */}
          {style.fontSize !== undefined && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400">Font Size ({style.fontSize}px)</label>
                <input
                  type="range"
                  min={10}
                  max={48}
                  value={style.fontSize}
                  onChange={(e) => onUpdateStyle({ fontSize: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400">Font Weight</label>
                <select
                  value={style.fontWeight || 400}
                  onChange={(e) => onUpdateStyle({ fontWeight: Number(e.target.value) })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-xs text-white"
                >
                  <option value={400}>Regular (400)</option>
                  <option value={600}>Semi-Bold (600)</option>
                  <option value={700}>Bold (700)</option>
                  <option value={900}>Black (900)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Appearance */}
      {activeTab === "appearance" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.backgroundColor?.startsWith("#") ? style.backgroundColor : "#0e0e12"}
                onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={style.backgroundColor || ""}
                onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                placeholder="rgba(14, 14, 18, 0.85)"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Border Radius ({style.borderRadius ?? 16}px)</label>
              <input
                type="range"
                min={0}
                max={48}
                value={style.borderRadius ?? 16}
                onChange={(e) => onUpdateStyle({ borderRadius: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Border Width ({style.borderWidth ?? 1}px)</label>
              <input
                type="range"
                min={0}
                max={8}
                value={style.borderWidth ?? 1}
                onChange={(e) => onUpdateStyle({ borderWidth: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Border Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.borderColor?.startsWith("#") ? style.borderColor : "#26262b"}
                onChange={(e) => onUpdateStyle({ borderColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={style.borderColor || ""}
                onChange={(e) => onUpdateStyle({ borderColor: e.target.value })}
                placeholder="#26262b"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Backdrop Blur ({style.backdropBlur ?? 12}px)</label>
            <input
              type="range"
              min={0}
              max={32}
              value={style.backdropBlur ?? 12}
              onChange={(e) => onUpdateStyle({ backdropBlur: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Effects */}
      {activeTab === "effects" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Shadow / Glow Blur ({style.shadowBlur ?? 20}px)</label>
            <input
              type="range"
              min={0}
              max={60}
              value={style.shadowBlur ?? 20}
              onChange={(e) => onUpdateStyle({ shadowBlur: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Glow / Shadow Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.shadowColor?.startsWith("#") ? style.shadowColor : "#38bdf8"}
                onChange={(e) => onUpdateStyle({ shadowColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={style.shadowColor || ""}
                onChange={(e) => onUpdateStyle({ shadowColor: e.target.value })}
                placeholder="rgba(56, 189, 248, 0.4)"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Opacity ({style.opacity ?? 100}%)</label>
            <input
              type="range"
              min={10}
              max={100}
              value={style.opacity ?? 100}
              onChange={(e) => onUpdateStyle({ opacity: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Layout & Transform */}
      {activeTab === "layout" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Width (px)</label>
              <input
                type="number"
                value={Math.round(transform.width)}
                onChange={(e) => onUpdateTransform({ width: Math.max(20, Number(e.target.value)) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Height (px)</label>
              <input
                type="number"
                value={Math.round(transform.height)}
                onChange={(e) => onUpdateTransform({ height: Math.max(16, Number(e.target.value)) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">X Position (px)</label>
              <input
                type="number"
                value={Math.round(transform.x)}
                onChange={(e) => onUpdateTransform({ x: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Y Position (px)</label>
              <input
                type="number"
                value={Math.round(transform.y)}
                onChange={(e) => onUpdateTransform({ y: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Rotation ({transform.rotation || 0}°)</label>
            <input
              type="range"
              min={0}
              max={360}
              value={transform.rotation || 0}
              onChange={(e) => onUpdateTransform({ rotation: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-neutral-400">Lock Aspect Ratio</span>
            <input
              type="checkbox"
              checked={Boolean(transform.aspectRatioLocked)}
              onChange={(e) => onUpdateTransform({ aspectRatioLocked: e.target.checked })}
              className="accent-sky-500 rounded"
            />
          </div>
        </div>
      )}

      {/* Tab 5: Visibility */}
      {activeTab === "visibility" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800">
            <span className="text-white text-[11px]">Object Visible</span>
            <button
              type="button"
              onClick={() => onUpdateVisibility?.(!isVisible)}
              className={`px-3 py-1 rounded text-[10px] font-bold ${
                isVisible ? "bg-sky-500 text-black" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {isVisible ? "VISIBLE" : "HIDDEN"}
            </button>
          </div>

          <div className="p-2 rounded bg-neutral-900/60 border border-neutral-800 space-y-1">
            <span className="text-[10px] text-neutral-400">Outline-Only Preview</span>
            <p className="text-[9px] text-neutral-500">
              Renders boundaries without solid fill for precise wireframe alignment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
