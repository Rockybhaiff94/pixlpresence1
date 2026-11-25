"use client";

import React, { useRef, useState } from "react";
import {
  X,
  UploadCloud,
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Trophy,
  Crown,
  Heart,
  Terminal,
  CreditCard,
  UserCircle2,
  Type,
  FileText,
  AlignLeft,
  Gamepad2,
  Music,
  Share2,
} from "lucide-react";
import { DooryRailTool } from "./DooryToolRail";
import {
  EditorElement,
  ShapeKind,
  CanvasBackground,
  BackgroundPattern,
  EditorTemplate,
  EmbedComponentKind,
  ContainerElement,
  TextElement,
  ImageElement,
  RpcElement,
  MusicElement,
  SocialElement,
} from "./editorTypes";
import { STARTER_TEMPLATES, AVAILABLE_FONTS } from "./editorPresets";
import { EMBED_COMPONENT_CATALOG } from "./embedBuilderUtils";
import { PLATFORMS } from "@/components/links/PlatformIcons";

interface DooryDrawerHostProps {
  activeTool: DooryRailTool | null;
  onClose: () => void;
  embedded?: boolean;
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddShape: (kind: ShapeKind) => void;
  onAddText: (type: "heading" | "subheading" | "body" | "code" | "arc-up" | "arc-down") => void;
  onAddSticker: (key: string, color: string) => void;
  onAddImage: (src: string) => void;
  onApplyTemplate: (template: EditorTemplate) => void;
  onCreateEmbed?: () => void;
  onAddEmbedChild?: (parentId: string, kind: EmbedComponentKind) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElement: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
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
}

export function getDooryToolTitle(tool: DooryRailTool | string | null): string {
  switch (tool) {
    case "templates":
      return "Templates & Layouts";
    case "text":
      return "Typography & Text";
    case "shapes":
      return "Shapes & Geometries";
    case "elements":
      return "Graphics & Stickers";
    case "images":
    case "media":
      return "Images & Media";
    case "embed":
      return "Profile Embed Builder";
    case "background":
    case "canvas":
      return "Canvas Background";
    case "layers":
      return "Layers & Hierarchy";
    default:
      return "Tool Panel";
  }
}

function getEmbedCompIcon(kind: EmbedComponentKind) {
  switch (kind) {
    case "profile-image":
      return UserCircle2;
    case "name":
      return Type;
    case "subtitle":
      return FileText;
    case "description":
      return AlignLeft;
    case "rpc":
      return Gamepad2;
    case "music":
      return Music;
    case "social":
      return Share2;
    case "custom-text":
    default:
      return Type;
  }
}

export const DooryDrawerHost: React.FC<DooryDrawerHostProps> = ({
  activeTool,
  onClose,
  embedded = false,
  elements,
  selectedId,
  onSelect,
  onAddShape,
  onAddText,
  onAddSticker,
  onAddImage,
  onApplyTemplate,
  onCreateEmbed,
  onAddEmbedChild,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  canvas,
  onUpdateCanvas,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embedAvatarFileRef = useRef<HTMLInputElement>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [editingLayerNameId, setEditingLayerNameId] = useState<string | null>(null);
  const [editingNameDraft, setEditingNameDraft] = useState("");
  const [collapsedEmbedLayers, setCollapsedEmbedLayers] = useState<Record<string, boolean>>({});

  if (!activeTool) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAddImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmbedAvatarUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetElementId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateElement(targetElementId, { src: reader.result });
      }
    };
    reader.readAsDataURL(file);
    if (embedAvatarFileRef.current) embedAvatarFileRef.current.value = "";
  };

  const handleAddImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    onAddImage(imageUrlInput.trim());
    setImageUrlInput("");
  };

  const toolTitle = getDooryToolTitle(activeTool);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;
  const embedContainers = elements.filter(
    (el): el is ContainerElement => el.type === "container" && !el.parentId
  );
  const targetEmbedForAdd =
    selectedElement?.type === "container"
      ? (selectedElement as ContainerElement)
      : selectedElement?.parentId
      ? (elements.find((e) => e.id === selectedElement.parentId) as ContainerElement | undefined)
      : embedContainers[0];

  const renderLayerRow = (elem: EditorElement, isChild = false, hasChildren = false, isGroupExpanded = true) => {
    const isSelected = selectedId === elem.id;
    const isEditing = editingLayerNameId === elem.id;

    return (
      <div
        key={elem.id}
        onClick={() => onSelect(elem.id)}
        className={`group p-2 rounded-xl border flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
          isChild ? "ml-4 border-l-2 border-l-[#d71920]/40" : ""
        } ${
          isSelected
            ? "bg-[#1a1a24] border-white/40 shadow-sm"
            : "bg-[#121216] border-[#1e1e24] hover:border-[#2e2e38]"
        }`}
        data-testid={`layer-item-${elem.id}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsedEmbedLayers((prev) => ({
                  ...prev,
                  [elem.id]: !prev[elem.id],
                }));
              }}
              className="p-0.5 rounded text-neutral-400 hover:text-white hover:bg-white/10 shrink-0"
              aria-label={isGroupExpanded ? "Collapse embed layers" : "Expand embed layers"}
              data-testid={`layers-toggle-${elem.id}`}
            >
              {isGroupExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                elem.type === "container" ? "bg-[#d71920]" : "bg-emerald-400"
              }`}
            />
          )}

          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editingNameDraft}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditingNameDraft(e.target.value)}
              onBlur={() => {
                if (editingNameDraft.trim()) {
                  onUpdateElement(elem.id, { name: editingNameDraft.trim() });
                }
                setEditingLayerNameId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editingNameDraft.trim()) {
                    onUpdateElement(elem.id, { name: editingNameDraft.trim() });
                  }
                  setEditingLayerNameId(null);
                } else if (e.key === "Escape") {
                  setEditingLayerNameId(null);
                }
              }}
              className="bg-[#09090d] border border-white/40 rounded px-1 py-0.5 text-xs font-mono text-white outline-none min-w-0 flex-1 select-text"
              data-testid={`layer-rename-input-${elem.id}`}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingLayerNameId(elem.id);
                setEditingNameDraft(elem.name);
              }}
              title="Double-click to rename"
              className="text-xs font-mono text-white truncate font-medium"
            >
              {elem.name}
            </span>
          )}

          <span className="text-[9px] font-mono text-neutral-500 uppercase px-1 rounded bg-white/5 shrink-0">
            {elem.type === "container" ? "embed" : elem.type}
          </span>
        </div>

        {/* Quick Layer Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReorderElement(elem.id, "up");
            }}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
            title="Move Up"
            data-testid={`layer-up-${elem.id}`}
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReorderElement(elem.id, "down");
            }}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
            title="Move Down"
            data-testid={`layer-down-${elem.id}`}
          >
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateElement(elem.id);
            }}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
            title="Duplicate"
            data-testid={`layer-dup-${elem.id}`}
          >
            <Copy size={11} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(elem.id, { visible: !elem.visible });
            }}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
            title={elem.visible ? "Hide layer" : "Show layer"}
            data-testid={`layer-vis-${elem.id}`}
          >
            {elem.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-neutral-600" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(elem.id, { locked: !elem.locked });
            }}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
            title={elem.locked ? "Unlock" : "Lock"}
            data-testid={`layer-lock-${elem.id}`}
          >
            {elem.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteElement(elem.id);
            }}
            className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
            title="Delete"
            data-testid={`layer-del-${elem.id}`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  const bodyContent = (
    <div
      className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 custom-scrollbar"
      data-testid="doory-drawer-body"
    >
      {/* ===================== PROFILE EMBED BUILDER ===================== */}
      {activeTool === "embed" && (
        <div className="space-y-5">
          {/* Create New Embed */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              PROFILE EMBED CONTAINER
            </div>
            <button
              type="button"
              onClick={() => onCreateEmbed?.()}
              className="w-full py-2.5 px-3 rounded-xl bg-[#d71920] hover:bg-[#e5242b] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              data-testid="embed-create-btn"
            >
              <Plus size={14} />
              <span>Create Profile Embed</span>
            </button>

            {embedContainers.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
                  ACTIVE EMBEDS ON CANVAS ({embedContainers.length})
                </div>
                {embedContainers.map((emb) => {
                  const childCount = elements.filter((e) => e.parentId === emb.id).length;
                  const isActiveEmbed =
                    selectedId === emb.id || selectedElement?.parentId === emb.id;
                  return (
                    <button
                      key={emb.id}
                      type="button"
                      onClick={() => onSelect(emb.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActiveEmbed
                          ? "bg-[#1a1a24] border-white/40 text-white"
                          : "bg-[#141418] border-[#22222a] text-neutral-300 hover:border-neutral-500"
                      }`}
                      data-testid={`select-embed-${emb.id}`}
                    >
                      <span className="flex items-center gap-2 text-xs font-mono font-bold truncate">
                        <CreditCard size={13} className="text-[#d71920] shrink-0" />
                        <span className="truncate">{emb.name}</span>
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 shrink-0">
                        {childCount} items
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Child Component Quick Palette */}
          {onAddEmbedChild && (
            <div className="space-y-2.5 pt-3 border-t border-[#1e1e26]">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                <span>ADD EMBED COMPONENT</span>
                {targetEmbedForAdd && (
                  <span className="text-[9px] text-neutral-500 truncate max-w-[120px]">
                    {targetEmbedForAdd.name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EMBED_COMPONENT_CATALOG.map((item) => {
                  const Icon = getEmbedCompIcon(item.kind);
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() =>
                        onAddEmbedChild(targetEmbedForAdd?.id || "", item.kind)
                      }
                      className="p-2 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all flex items-center gap-2 text-left cursor-pointer"
                      data-testid={`drawer-add-comp-${item.kind}`}
                    >
                      <Icon size={13} className="text-neutral-300 shrink-0" />
                      <span className="text-[10px] font-mono text-white truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contextual Settings for Selected Parent Embed or Child Element */}
          {selectedElement?.type === "container" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-parent-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                EMBED STYLING &amp; DIMENSIONS
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">WIDTH</span>
                  <input
                    type="number"
                    min={180}
                    max={1200}
                    value={selectedElement.width}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        width: Math.max(180, Number(e.target.value) || 180),
                      })
                    }
                    className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                    data-testid="embed-width-input"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">HEIGHT</span>
                  <input
                    type="number"
                    min={140}
                    max={1000}
                    value={selectedElement.height}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        height: Math.max(140, Number(e.target.value) || 140),
                      })
                    }
                    className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                    data-testid="embed-height-input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-neutral-500 block">BACKGROUND</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(selectedElement as ContainerElement).backgroundColor || "#0e0e13"}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={(selectedElement as ContainerElement).backgroundColor || "#0e0e13"}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })
                    }
                    className="flex-1 bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                  <span>BG OPACITY</span>
                  <span>
                    {Math.round(
                      ((selectedElement as ContainerElement).backgroundOpacity ?? 0.96) * 100
                    )}
                    %
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.02}
                  value={(selectedElement as ContainerElement).backgroundOpacity ?? 0.96}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, {
                      backgroundOpacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">
                    BORDER COLOR
                  </span>
                  <input
                    type="color"
                    value={(selectedElement as ContainerElement).borderColor || "#282834"}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { borderColor: e.target.value })
                    }
                    className="w-full h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">
                    BORDER WIDTH
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={(selectedElement as ContainerElement).borderWidth ?? 1}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        borderWidth: Math.max(0, Math.min(8, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">
                    RADIUS ({(selectedElement as ContainerElement).borderRadius ?? 20}px)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    value={(selectedElement as ContainerElement).borderRadius ?? 20}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { borderRadius: Number(e.target.value) })
                    }
                    className="w-full accent-white"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-1">
                    PADDING ({(selectedElement as ContainerElement).padding ?? 20}px)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={(selectedElement as ContainerElement).padding ?? 20}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { padding: Number(e.target.value) })
                    }
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selected Child: Image / Profile Image */}
          {selectedElement?.type === "image" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-image-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                IMAGE SETTINGS ({selectedElement.name})
              </div>
              <input
                type="file"
                ref={embedAvatarFileRef}
                onChange={(e) => handleEmbedAvatarUpload(e, selectedElement.id)}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => embedAvatarFileRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-[#141418] border border-[#262632] hover:border-white text-xs font-mono text-white flex items-center justify-center gap-2 cursor-pointer"
                data-testid="embed-image-upload"
              >
                <UploadCloud size={14} />
                <span>Upload Image File</span>
              </button>
              <div>
                <span className="text-[9px] font-mono text-neutral-500 block mb-1">IMAGE URL</span>
                <input
                  type="url"
                  value={(selectedElement as ImageElement).src}
                  onChange={(e) => onUpdateElement(selectedElement.id, { src: e.target.value })}
                  className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateElement(selectedElement.id, { borderRadius: 9999 })}
                  className="py-1 rounded-lg bg-[#141418] border border-[#262632] hover:border-white text-[10px] font-mono text-white cursor-pointer"
                >
                  Circle
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement(selectedElement.id, { borderRadius: 14 })}
                  className="py-1 rounded-lg bg-[#141418] border border-[#262632] hover:border-white text-[10px] font-mono text-white cursor-pointer"
                >
                  Rounded
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement(selectedElement.id, { borderRadius: 0 })}
                  className="py-1 rounded-lg bg-[#141418] border border-[#262632] hover:border-white text-[10px] font-mono text-white cursor-pointer"
                >
                  Square
                </button>
              </div>
              <select
                value={(selectedElement as ImageElement).fit}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    fit: e.target.value as "cover" | "contain" | "fill",
                  })
                }
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Stretch</option>
              </select>
            </div>
          )}

          {/* Selected Child: Text (Name, Subtitle, Description, Custom Text) */}
          {selectedElement?.type === "text" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-text-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                TEXT SETTINGS ({selectedElement.name})
              </div>
              <textarea
                rows={3}
                value={(selectedElement as TextElement).text}
                onChange={(e) => onUpdateElement(selectedElement.id, { text: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-white select-text"
                data-testid="embed-text-content-input"
              />
              <select
                value={(selectedElement as TextElement).fontFamily}
                onChange={(e) => onUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.name} value={f.family}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-0.5">SIZE</span>
                  <input
                    type="number"
                    min={8}
                    max={140}
                    value={(selectedElement as TextElement).fontSize}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        fontSize: Math.max(8, Number(e.target.value) || 12),
                      })
                    }
                    className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1 text-xs font-mono text-white select-text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-0.5">WEIGHT</span>
                  <select
                    value={(selectedElement as TextElement).fontWeight}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { fontWeight: Number(e.target.value) })
                    }
                    className="w-full bg-[#141418] border border-[#262632] rounded-lg px-1.5 py-1 text-xs font-mono text-white"
                  >
                    <option value={400}>400</option>
                    <option value={500}>500</option>
                    <option value={600}>600</option>
                    <option value={700}>700</option>
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 block mb-0.5">COLOR</span>
                  <input
                    type="color"
                    value={(selectedElement as TextElement).color}
                    onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                    className="w-full h-7 rounded border border-[#333333] cursor-pointer bg-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-[#141418] p-1 rounded-lg border border-[#262632]">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateElement(selectedElement.id, { textAlign: align })}
                    className={`py-1 rounded text-[10px] font-mono capitalize cursor-pointer ${
                      (selectedElement as TextElement).textAlign === align
                        ? "bg-white text-black font-bold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Child: Custom RPC Display */}
          {selectedElement?.type === "rpc" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-rpc-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                CUSTOM RPC DISPLAY
              </div>
              <select
                value={(selectedElement as RpcElement).activityType || "playing"}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, {
                    activityType: e.target.value as RpcElement["activityType"],
                  })
                }
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
              >
                <option value="playing">Playing</option>
                <option value="streaming">Streaming</option>
                <option value="listening">Listening</option>
                <option value="watching">Watching</option>
                <option value="competing">Competing</option>
              </select>
              <input
                type="text"
                placeholder="Application / Activity Name"
                value={(selectedElement as RpcElement).appName || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { appName: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="text"
                placeholder="Details line"
                value={(selectedElement as RpcElement).details || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { details: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="text"
                placeholder="State line"
                value={(selectedElement as RpcElement).state || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { state: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="url"
                placeholder="Large image URL"
                value={(selectedElement as RpcElement).largeImage || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { largeImage: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {(["card", "glass", "minimal", "neon"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onUpdateElement(selectedElement.id, { cardStyle: style })}
                    className={`py-1 rounded-lg text-[10px] font-mono capitalize border cursor-pointer ${
                      (selectedElement as RpcElement).cardStyle === style
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#141418] text-neutral-400 border-[#262632]"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Child: Music Display */}
          {selectedElement?.type === "music" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-music-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                MUSIC DISPLAY SETTINGS
              </div>
              <input
                type="text"
                placeholder="Song title"
                value={(selectedElement as MusicElement).title}
                onChange={(e) => onUpdateElement(selectedElement.id, { title: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="text"
                placeholder="Artist name"
                value={(selectedElement as MusicElement).artist}
                onChange={(e) => onUpdateElement(selectedElement.id, { artist: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="url"
                placeholder="Album artwork URL"
                value={(selectedElement as MusicElement).albumArt || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { albumArt: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-400">STATUS</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      isPlaying: !(selectedElement as MusicElement).isPlaying,
                      statusText: !(selectedElement as MusicElement).isPlaying
                        ? "Playing"
                        : "Paused",
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#141418] border border-[#262632] text-[10px] font-mono text-white cursor-pointer"
                >
                  {(selectedElement as MusicElement).isPlaying !== false ? "Playing" : "Paused"}
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                  <span>PROGRESS</span>
                  <span>{(selectedElement as MusicElement).progressPercent ?? 62}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={(selectedElement as MusicElement).progressPercent ?? 62}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { progressPercent: Number(e.target.value) })
                  }
                  className="w-full accent-white"
                />
              </div>
            </div>
          )}

          {/* Selected Child: Social Media Display */}
          {selectedElement?.type === "social" && (
            <div className="space-y-3 pt-3 border-t border-[#1e1e26]" data-testid="embed-social-settings">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                SOCIAL MEDIA COMPONENT
              </div>
              <select
                value={(selectedElement as SocialElement).platformId || "discord"}
                onChange={(e) => {
                  const found = PLATFORMS.find((p) => p.id === e.target.value);
                  onUpdateElement(selectedElement.id, {
                    platformId: e.target.value,
                    platformName: found?.name || e.target.value,
                  });
                }}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="@username or handle"
                value={(selectedElement as SocialElement).handle || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { handle: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <input
                type="url"
                placeholder="https://... profile URL"
                value={(selectedElement as SocialElement).url || ""}
                onChange={(e) => onUpdateElement(selectedElement.id, { url: e.target.value })}
                className="w-full bg-[#141418] border border-[#262632] rounded-lg px-2 py-1.5 text-xs font-mono text-white select-text"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {(["pill", "default", "minimal", "circle"] as const).map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => onUpdateElement(selectedElement.id, { variant })}
                    className={`py-1 rounded-lg text-[10px] font-mono capitalize border cursor-pointer ${
                      (selectedElement as SocialElement).variant === variant
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#141418] text-neutral-400 border-[#262632]"
                    }`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TEMPLATES DRAWER ===================== */}
      {activeTool === "templates" && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            STARTER PRESETS
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {STARTER_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => onApplyTemplate(tmpl)}
                className="w-full text-left p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all group flex flex-col gap-1.5 cursor-pointer shadow-sm"
                data-testid={`template-${tmpl.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {tmpl.name}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
                    {tmpl.category}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500">
                  {tmpl.elements.length} elements • {tmpl.canvas.width}×{tmpl.canvas.height}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TEXT DRAWER ===================== */}
      {activeTool === "text" && (
        <div className="space-y-5">
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              ADD TEXT PRESETS
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onAddText("heading")}
                className="w-full text-left p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex items-center justify-between group"
                data-testid="text-preset-heading"
              >
                <span className="font-sans text-lg font-bold text-white tracking-tight">
                  Add Heading
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
                  32px
                </span>
              </button>

              <button
                onClick={() => onAddText("subheading")}
                className="w-full text-left p-2.5 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex items-center justify-between group"
                data-testid="text-preset-subheading"
              >
                <span className="font-sans text-sm font-semibold text-neutral-200">
                  Add Subheading
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
                  20px
                </span>
              </button>

              <button
                onClick={() => onAddText("body")}
                className="w-full text-left p-2.5 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex items-center justify-between group"
                data-testid="text-preset-body"
              >
                <span className="font-sans text-xs text-neutral-300">
                  Add regular body text
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
                  14px
                </span>
              </button>

              <button
                onClick={() => onAddText("code")}
                className="w-full text-left p-2.5 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex items-center justify-between group"
                data-testid="text-preset-code"
              >
                <span className="font-mono text-xs text-emerald-400">
                  Add monospace &gt;_
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
                  13px
                </span>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              CURVED TEXT ARCS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddText("arc-up")}
                className="p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex flex-col items-center gap-1.5"
                data-testid="text-arc-up"
              >
                <svg width="36" height="18" viewBox="0 0 36 18" fill="none" className="text-neutral-300">
                  <path d="M2 16 Q18 0 34 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-mono text-neutral-300">Arc Up</span>
              </button>

              <button
                onClick={() => onAddText("arc-down")}
                className="p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer flex flex-col items-center gap-1.5"
                data-testid="text-arc-down"
              >
                <svg width="36" height="18" viewBox="0 0 36 18" fill="none" className="text-neutral-300">
                  <path d="M2 2 Q18 18 34 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-mono text-neutral-300">Arc Down</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SHAPES DRAWER ===================== */}
      {activeTool === "shapes" && (
        <div className="space-y-5">
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              BASIC GEOMETRY
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAddShape("rectangle")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-rect"
              >
                <Square size={20} className="text-neutral-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Square</span>
              </button>

              <button
                onClick={() => onAddShape("rounded-rectangle")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-rounded"
              >
                <div className="w-5 h-5 rounded-md border-2 border-neutral-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Rounded</span>
              </button>

              <button
                onClick={() => onAddShape("circle")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-circle"
              >
                <Circle size={20} className="text-neutral-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Circle</span>
              </button>

              <button
                onClick={() => onAddShape("triangle")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-triangle"
              >
                <Triangle size={20} className="text-neutral-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Triangle</span>
              </button>

              <button
                onClick={() => onAddShape("star")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-star"
              >
                <Star size={20} className="text-neutral-300 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Star</span>
              </button>

              <button
                onClick={() => onAddShape("polygon")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                data-testid="shape-polygon"
              >
                <div className="w-5 h-5 border-2 border-neutral-300 rotate-45 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono text-neutral-400 mt-1.5">Diamond</span>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              LINES &amp; DIVIDERS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddShape("line")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer"
                data-testid="shape-line"
              >
                <Minus size={18} className="text-neutral-300" />
                <span className="text-[10px] font-mono text-neutral-300">Straight Line</span>
              </button>

              <button
                onClick={() => onAddShape("arrow")}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer"
                data-testid="shape-arrow"
              >
                <ArrowRight size={18} className="text-neutral-300" />
                <span className="text-[10px] font-mono text-neutral-300">Arrow</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ELEMENTS / STICKERS DRAWER ===================== */}
      {activeTool === "elements" && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            VECTOR BADGES &amp; ICONS
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "discord", label: "Discord", icon: Bot, color: "#5865F2" },
              { key: "fire", label: "Streak", icon: Flame, color: "#F97316" },
              { key: "verified", label: "Verified", icon: CheckCircle2, color: "#10B981" },
              { key: "shield", label: "Shield", icon: ShieldCheck, color: "#3B82F6" },
              { key: "trophy", label: "Trophy", icon: Trophy, color: "#EAB308" },
              { key: "crown", label: "Crown", icon: Crown, color: "#EC4899" },
              { key: "heart", label: "Heart", icon: Heart, color: "#EF4444" },
              { key: "sparkles", label: "Sparkle", icon: Sparkles, color: "#A855F7" },
              { key: "terminal", label: "Terminal", icon: Terminal, color: "#06B6D4" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => onAddSticker(item.key, item.color)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-neutral-500 hover:bg-[#1a1a20] transition-all cursor-pointer group"
                  data-testid={`sticker-${item.key}`}
                >
                  <Icon size={22} style={{ color: item.color }} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-mono text-neutral-400 mt-1.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== IMAGES / MEDIA DRAWER ===================== */}
      {(activeTool === "images" || activeTool === "media") && (
        <div className="space-y-5">
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              LOCAL UPLOAD
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
              data-testid="image-file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-[#262632] hover:border-neutral-400 rounded-xl bg-[#141418] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
              data-testid="image-upload-button"
            >
              <UploadCloud size={24} className="text-neutral-400 group-hover:text-white transition-colors" />
              <div className="text-center">
                <span className="text-xs font-mono font-bold text-white block">
                  Choose Image File
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  PNG, JPG, WebP or SVG up to 10MB
                </span>
              </div>
            </button>
          </div>

          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              IMAGE VIA URL
            </div>
            <form onSubmit={handleAddImageUrl} className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://... image link"
                className="flex-1 bg-[#141418] border border-[#262632] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-white select-text"
                data-testid="image-url-input"
              />
              <button
                type="submit"
                disabled={!imageUrlInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black font-mono text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                data-testid="image-url-submit"
              >
                Add
              </button>
            </form>
          </div>

          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              SAMPLE GRAPHICS
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Abstract Dark", src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80" },
                { name: "Cyber Gradient", src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80" },
                { name: "Neon Lines", src: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80" },
                { name: "Minimal Grid", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80" },
              ].map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => onAddImage(sample.src)}
                  className="relative rounded-lg overflow-hidden border border-[#262632] hover:border-white group cursor-pointer aspect-video"
                  data-testid={`sample-img-${sample.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sample.src} alt={sample.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-end p-1.5">
                    <span className="text-[9px] font-mono text-white font-bold truncate">{sample.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== BACKGROUND / CANVAS DRAWER ===================== */}
      {(activeTool === "background" || activeTool === "canvas") && (
        <div className="space-y-5">
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              SOLID COLOR
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { color: "#070707", label: "Obsidian" },
                { color: "#111114", label: "Onyx" },
                { color: "#1a1a24", label: "Navy" },
                { color: "#14241e", label: "Forest" },
                { color: "#2d1215", label: "Crimson" },
                { color: "#22142e", label: "Violet" },
                { color: "#1c2430", label: "Midnight" },
                { color: "#f5f5f5", label: "Light" },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() =>
                    onUpdateCanvas({
                      background: { ...canvas.background, type: "solid", color: c.color },
                    })
                  }
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                  data-testid={`bg-color-${c.label}`}
                >
                  <div
                    className="w-10 h-10 rounded-lg border border-white/20 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-[9px] font-mono text-neutral-400">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              NOTHING OS PATTERNS
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["none", "dot-matrix", "grid", "crosshair", "scanlines"] as BackgroundPattern[]).map((pat) => (
                <button
                  key={pat}
                  onClick={() =>
                    onUpdateCanvas({
                      background: { ...canvas.background, pattern: pat },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    canvas.background.pattern === pat
                      ? "bg-[#1e1e26] border-white text-white"
                      : "bg-[#141418] border-[#22222a] text-neutral-400 hover:text-white"
                  }`}
                  data-testid={`bg-pattern-${pat}`}
                >
                  <span className="text-xs font-mono capitalize">{pat}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
              <span>PATTERN OPACITY</span>
              <span className="text-white">
                {Math.round((canvas.background.patternOpacity ?? 0.12) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.02"
              value={canvas.background.patternOpacity ?? 0.12}
              onChange={(e) =>
                onUpdateCanvas({
                  background: {
                    ...canvas.background,
                    patternOpacity: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-white cursor-pointer"
              data-testid="bg-opacity-slider"
            />
          </div>
        </div>
      )}

      {/* ===================== HIERARCHICAL LAYERS DRAWER ===================== */}
      {activeTool === "layers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            <span>CANVAS LAYERS ({elements.length})</span>
            <span className="text-[9px] text-neutral-500">DBL-CLICK TO RENAME</span>
          </div>

          {elements.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-neutral-500 border border-dashed border-[#22222a] rounded-xl">
              No elements on canvas
            </div>
          ) : (
            <div className="space-y-1.5" data-testid="layers-list">
              {[...elements]
                .filter((el) => !el.parentId)
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((topElem) => {
                  const children = elements
                    .filter((c) => c.parentId === topElem.id)
                    .sort((a, b) => b.zIndex - a.zIndex);
                  const hasChildren = children.length > 0;
                  const isExpanded = !collapsedEmbedLayers[topElem.id];

                  return (
                    <div key={topElem.id} className="space-y-1">
                      {renderLayerRow(topElem, false, hasChildren, isExpanded)}
                      {hasChildren && isExpanded && (
                        <div className="space-y-1" data-testid={`layer-children-${topElem.id}`}>
                          {children.map((child) => renderLayerRow(child, true, false, true))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <aside
      className="w-80 bg-[#0e0e12] border-r border-[#1e1e24] flex flex-col h-full select-none z-10 shrink-0 shadow-2xl animate-in slide-in-from-left duration-200"
      data-testid="doory-drawer-host"
      data-active-tool={activeTool}
    >
      {/* Drawer Header */}
      <div className="h-11 px-4 border-b border-[#1e1e24] flex items-center justify-between shrink-0 bg-[#0a0a0c]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d71920]" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {toolTitle}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close drawer (Esc)"
          data-testid="doory-drawer-close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Drawer Content Body */}
      {bodyContent}
    </aside>
  );
};
