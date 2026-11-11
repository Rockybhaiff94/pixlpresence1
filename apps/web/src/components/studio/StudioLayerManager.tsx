"use client";

import React from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Layers,
  Copy,
  Trash2,
  Sliders,
  Plus,
  Type,
  Image as ImageIcon,
  Minus,
  Box,
} from "lucide-react";
import { ProfileDesignConfig, StudioLayer, StudioTab } from "@/types/studio";

interface StudioLayerManagerProps {
  config: ProfileDesignConfig;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
  onSelectCategory: (tab: StudioTab) => void;
  onDuplicateLayer?: (layerId: string) => void;
  onDeleteLayer?: (layerId: string) => void;
  onAddEmbed?: () => void;
  onAddElement?: (type: any) => void;
  selectedId?: string | null;
  onSelectElement?: (id: string) => void;
}

export const StudioLayerManager: React.FC<StudioLayerManagerProps> = ({
  config,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onMoveLayer,
  onSelectCategory,
  onDuplicateLayer,
  onDeleteLayer,
  onAddEmbed,
  onAddElement,
  selectedId,
  onSelectElement,
}) => {
  const layers = config.layers || [];

  const getLayerCategory = (layer: StudioLayer): StudioTab => {
    switch (layer.type) {
      case "avatar":
        return "avatar";
      case "identity":
      case "username":
      case "bio":
        return "identity";
      case "rpc":
        return "rpc";
      case "music":
        return "effects";
      case "buttons":
      case "socials":
        return "buttons";
      case "background":
        return "background";
      case "container":
        return "layout";
      default:
        return "layout";
    }
  };

  return (
    <div className="space-y-6 text-xs font-mono text-[#ededed]">
      {/* Header & Add Object Bar */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-[#101014] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-white" />
              LAYER HIERARCHY & OBJECT TREE
            </h2>
            <p className="text-[11px] text-neutral-400 pt-0.5">
              Add multiple embeds, components, manage stacking, locks, and visibility.
            </p>
          </div>
        </div>

        {/* Action Buttons to Add Objects to Canvas */}
        <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap gap-2">
          {onAddEmbed && (
            <button
              type="button"
              onClick={onAddEmbed}
              className="px-2.5 py-1.5 rounded-lg bg-white text-black font-bold text-[10px] hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={13} />
              Add Embed
            </button>
          )}
          {onAddElement && (
            <>
              <button
                type="button"
                onClick={() => onAddElement("text")}
                className="px-2.5 py-1.5 rounded-lg bg-[#18181c] border border-neutral-700/80 text-white font-bold text-[10px] hover:border-neutral-500 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Type size={13} />
                Add Text
              </button>
              <button
                type="button"
                onClick={() => onAddElement("image")}
                className="px-2.5 py-1.5 rounded-lg bg-[#18181c] border border-neutral-700/80 text-white font-bold text-[10px] hover:border-neutral-500 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ImageIcon size={13} />
                Add Image
              </button>
              <button
                type="button"
                onClick={() => onAddElement("divider")}
                className="px-2.5 py-1.5 rounded-lg bg-[#18181c] border border-neutral-700/80 text-white font-bold text-[10px] hover:border-neutral-500 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Minus size={13} />
                Add Divider
              </button>
            </>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="space-y-2">
        {layers.map((layer, index) => {
          const category = getLayerCategory(layer);
          const isFirst = index === 0;
          const isLast = index === layers.length - 1;
          const isSelected = selectedId === layer.id;

          return (
            <div
              key={layer.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? "border-sky-400 bg-sky-950/20 shadow-md ring-1 ring-sky-400/50"
                  : layer.visible
                  ? "border-neutral-800 bg-[#0c0c0e] hover:border-neutral-600"
                  : "border-neutral-900 bg-[#070708] opacity-60"
              }`}
            >
              {/* Left: Drag Index & Label */}
              <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => onSelectCategory(category)}
                title={`Click to edit ${layer.label} properties`}
              >
                <span className="text-[10px] text-neutral-500 font-bold w-4 text-center">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs truncate">{layer.label}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase">
                      {layer.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Category: <span className="text-neutral-300 capitalize">{category}</span>
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Edit Properties Shortcut */}
                <button
                  onClick={() => onSelectCategory(category)}
                  title="Configure properties"
                  className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Sliders size={11} /> Edit
                </button>

                {/* Move Up/Down */}
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                  <button
                    onClick={() => onMoveLayer(layer.id, "up")}
                    disabled={isFirst || layer.locked}
                    title="Move Layer Up"
                    className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => onMoveLayer(layer.id, "down")}
                    disabled={isLast || layer.locked}
                    title="Move Layer Down"
                    className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                {/* Lock Toggle */}
                <button
                  onClick={() => onToggleLayerLock(layer.id)}
                  title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    layer.locked
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={() => onToggleLayerVisibility(layer.id)}
                  title={layer.visible ? "Hide Layer" : "Show Layer"}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    layer.visible
                      ? "text-neutral-300 hover:text-white hover:bg-neutral-800"
                      : "text-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                {/* Duplicate (optional) */}
                {onDuplicateLayer && (
                  <button
                    onClick={() => onDuplicateLayer(layer.id)}
                    title="Duplicate Layer"
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                )}

                {/* Delete (custom layers) */}
                {onDeleteLayer && (
                  <button
                    onClick={() => onDeleteLayer(layer.id)}
                    title="Delete Layer"
                    className="p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
