"use client";

import React, { useState } from "react";
import { ArrowDown, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import { BuilderCanvasSettings, BuilderComponentType, BuilderNode } from "./profileBuilderTypes";

interface DockBridgePanelProps {
  activeTool: string | null;
  canvas: BuilderCanvasSettings;
  nodes: BuilderNode[];
  dockAddedIds: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddComponentFromDock: (type: BuilderComponentType, extra?: Partial<BuilderNode>) => void;
  onApplyPresetTemplate: (templateIndex: number) => void;
  onUpdateCanvas: (updates: Partial<BuilderCanvasSettings>) => void;
  onUpdateNode: (id: string, updates: Partial<BuilderNode>) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorderNode: (id: string, direction: "up" | "down") => void;
  onDeleteNode: (id: string) => void;
}

const TOOL_TITLES: Record<string, string> = {
  templates: "TEMPLATES & LAYOUTS",
  text: "TYPOGRAPHY & TEXT",
  shapes: "SHAPES & GEOMETRIES",
  elements: "GRAPHICS & STICKERS",
  images: "IMAGES & MEDIA",
  media: "IMAGES & MEDIA",
  background: "CANVAS BACKGROUND",
  canvas: "CANVAS BACKGROUND",
  layers: "LAYERS & HIERARCHY",
};

export const DockBridgePanel: React.FC<DockBridgePanelProps> = ({
  activeTool,
  nodes,
  dockAddedIds,
  selectedId,
  onSelect,
  onAddComponentFromDock,
  onApplyPresetTemplate,
  onUpdateCanvas,
  onUpdateNode,
  onToggleVisibility,
  onToggleLock,
  onReorderNode,
  onDeleteNode,
}) => {
  const [imageUrl, setImageUrl] = useState("");
  if (!activeTool) return null;

  const title = TOOL_TITLES[activeTool] || "STUDIO TOOLS";
  const displayLayers =
    dockAddedIds.length > 0
      ? nodes.filter((n) => dockAddedIds.includes(n.id))
      : nodes.filter((n) => n.type !== "background");

  return (
    <div className="p-3 space-y-3 text-xs font-mono text-white" data-testid="doory-drawer-body">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-[#1d1d24] pb-1.5">
        {title}
      </div>

      {activeTool === "templates" && (
        <div className="space-y-2">
          {["Reference Discord Profile", "Minimal Centered Card"].map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => onApplyPresetTemplate(idx)}
              className="w-full px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] text-left cursor-pointer"
              data-testid={`template-${idx}`}
            >
              <div className="font-bold text-white">{label}</div>
              <div className="text-[10px] text-neutral-500">Load layout preset</div>
            </button>
          ))}
        </div>
      )}

      {activeTool === "text" && (
        <div className="grid grid-cols-1 gap-1.5">
          <button
            type="button"
            onClick={() => onAddComponentFromDock("name-text")}
            className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] text-left cursor-pointer"
            data-testid="text-preset-heading"
          >
            Add Heading
          </button>
          <button
            type="button"
            onClick={() => onAddComponentFromDock("subtitle")}
            className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] text-left cursor-pointer"
            data-testid="text-preset-subheading"
          >
            Add Subtitle
          </button>
          <button
            type="button"
            onClick={() => onAddComponentFromDock("description")}
            className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] text-left cursor-pointer"
            data-testid="text-preset-body"
          >
            Add Description
          </button>
        </div>
      )}

      {activeTool === "shapes" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onAddComponentFromDock("shape", {
                name: "Rectangle",
                config: { shapeKind: "rectangle", shapeFill: "#1b1b24", shapeStroke: "#ffffff", shapeStrokeWidth: 1 },
              })
            }
            className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] cursor-pointer"
            data-testid="shape-rect"
          >
            Rectangle
          </button>
          <button
            type="button"
            onClick={() =>
              onAddComponentFromDock("shape", {
                name: "Circle",
                config: { shapeKind: "circle", shapeFill: "#1b1b24", shapeStroke: "#ffffff", shapeStrokeWidth: 1 },
              })
            }
            className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] cursor-pointer"
            data-testid="shape-circle"
          >
            Circle
          </button>
        </div>
      )}

      {activeTool === "elements" && (
        <div className="grid grid-cols-2 gap-2">
          {["discord", "verified", "fire", "crown"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                onAddComponentFromDock("sticker", {
                  name: `${key.toUpperCase()} Icon`,
                  config: { stickerKey: key },
                })
              }
              className="px-3 py-2 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] capitalize cursor-pointer"
              data-testid={`sticker-${key}`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {(activeTool === "images" || activeTool === "media") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!imageUrl.trim()) return;
            onAddComponentFromDock("image", {
              name: "Media Image",
              config: { src: imageUrl.trim(), fit: "cover" },
            });
            setImageUrl("");
          }}
          className="space-y-2"
        >
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="w-full bg-[#121218] border border-[#262630] rounded-lg px-2.5 py-1.5 text-white outline-none"
            data-testid="image-url-input"
          />
          <button
            type="submit"
            className="w-full py-1.5 rounded-lg bg-white text-black font-bold cursor-pointer"
            data-testid="image-url-submit"
          >
            Insert Image
          </button>
        </form>
      )}

      {(activeTool === "background" || activeTool === "canvas") && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Obsidian", color: "#060608" },
              { label: "Navy", color: "#0d1626" },
              { label: "Crimson", color: "#2b0b0e" },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  onUpdateCanvas({ backgroundType: "solid", backgroundColor: c.color });
                  const bgNode = nodes.find((n) => n.type === "background");
                  if (bgNode) {
                    onUpdateNode(bgNode.id, {
                      config: { ...bgNode.config, bgType: "solid", bgColor: c.color },
                    });
                  }
                }}
                className="p-2 rounded-lg border border-[#262630] text-[10px] cursor-pointer"
                style={{ backgroundColor: c.color }}
                data-testid={`bg-color-${c.label}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["grid", "dot-matrix"] as const).map((pat) => (
              <button
                key={pat}
                type="button"
                onClick={() => onUpdateCanvas({ gridEnabled: pat === "grid" })}
                className="px-2 py-1.5 rounded-lg bg-[#121218] hover:bg-[#1a1a23] border border-[#262630] text-[10px] capitalize cursor-pointer"
                data-testid={`bg-pattern-${pat}`}
              >
                {pat}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === "layers" && (
        <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar" data-testid="layers-list">
          {displayLayers.map((node) => (
            <div
              key={node.id}
              onClick={() => onSelect(node.id)}
              className={`px-2 py-1.5 rounded border flex items-center justify-between cursor-pointer ${
                selectedId === node.id
                  ? "bg-[#1a1a24] border-white/30"
                  : "bg-[#111116] border-[#22222c]"
              }`}
              data-testid={`layer-item-${node.id}`}
            >
              <span className="truncate flex-1">{node.name}</span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderNode(node.id, "down");
                  }}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                  data-testid={`layer-down-${node.id}`}
                >
                  <ArrowDown size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(node.id);
                  }}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                  data-testid={`layer-vis-${node.id}`}
                >
                  {node.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(node.id);
                  }}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                  data-testid={`layer-lock-${node.id}`}
                >
                  {node.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  className="text-red-400 cursor-pointer"
                  data-testid={`layer-del-${node.id}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
