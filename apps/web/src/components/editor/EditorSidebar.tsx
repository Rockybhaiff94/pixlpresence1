"use client";

import React, { useState, useRef } from "react";
import {
  LayoutTemplate,
  Shapes,
  Type,
  Smile,
  UploadCloud,
  Layers,
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
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  EditorElement,
  ShapeKind,
  EditorTemplate,
} from "./editorTypes";
import { STARTER_TEMPLATES } from "./editorPresets";
import { uploadMediaAsset } from "@/lib/uploadAsset";

export type SidebarTab = "templates" | "elements" | "text" | "stickers" | "uploads" | "layers";

interface EditorSidebarProps {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddShape: (kind: ShapeKind) => void;
  onAddText: (type: "heading" | "subheading" | "body" | "code") => void;
  onAddSticker: (key: string, color: string) => void;
  onAddImage: (src: string) => void;
  onApplyTemplate: (template: EditorTemplate) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElement: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  elements,
  selectedId,
  onSelect,
  onAddShape,
  onAddText,
  onAddSticker,
  onAddImage,
  onApplyTemplate,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("elements");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: SidebarTab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: "templates", label: "Templates", icon: LayoutTemplate },
    { id: "elements", label: "Shapes", icon: Shapes },
    { id: "text", label: "Text", icon: Type },
    { id: "stickers", label: "Graphics", icon: Smile },
    { id: "uploads", label: "Uploads", icon: UploadCloud },
    { id: "layers", label: "Layers", icon: Layers },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingImage) return;
    setUploadError(null);
    setUploadingImage(true);
    try {
      const uploaded = await uploadMediaAsset({
        file,
        kind: "image",
        targetSlot: "image",
      });
      onAddImage(uploaded.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-[#222222] flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Tab Navigation Dock */}
      <div className="flex border-b border-[#222222] bg-[#070707] p-1.5 gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-1.5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                isActive
                  ? "bg-[#161616] text-white border border-[#2a2a2a] shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-[#101010]"
              }`}
            >
              <Icon size={16} />
              <span className="text-[10px] font-mono tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB: TEMPLATES */}
        {activeTab === "templates" && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              [ STARTER TEMPLATES ]
            </div>
            <div className="space-y-2.5">
              {STARTER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onApplyTemplate(tmpl)}
                  className="p-3 bg-[#111111] border border-[#222222] hover:border-white/50 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-white group-hover:text-purple-300 transition-colors">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase px-1.5 py-0.5 rounded bg-[#181818]">
                      {tmpl.category}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400">
                    {tmpl.canvas.width} × {tmpl.canvas.height} px
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SHAPES & ELEMENTS */}
        {activeTab === "elements" && (
          <div className="space-y-4">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              [ GEOMETRIC SHAPES ]
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddShape("rectangle")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <Square size={22} className="text-neutral-200" />
                <span>Rectangle</span>
              </button>

              <button
                onClick={() => onAddShape("rounded-rectangle")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <div className="w-5 h-5 rounded-md border-2 border-neutral-200" />
                <span>Rounded Card</span>
              </button>

              <button
                onClick={() => onAddShape("circle")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <Circle size={22} className="text-neutral-200" />
                <span>Circle</span>
              </button>

              <button
                onClick={() => onAddShape("triangle")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <Triangle size={22} className="text-neutral-200" />
                <span>Triangle</span>
              </button>

              <button
                onClick={() => onAddShape("star")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <Star size={22} className="text-amber-400" />
                <span>Star</span>
              </button>

              <button
                onClick={() => onAddShape("arrow")}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <ArrowRight size={22} className="text-neutral-200" />
                <span>Arrow</span>
              </button>

              <button
                onClick={() => onAddShape("line")}
                className="col-span-2 p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-xs font-mono text-neutral-300 transition-all"
              >
                <Minus size={22} className="text-neutral-200" />
                <span>Horizontal Divider Line</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: TEXT */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              [ TYPOGRAPHY ELEMENTS ]
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onAddText("heading")}
                className="w-full p-4 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 text-left transition-all group"
              >
                <span className="text-xl font-bold font-sans text-white group-hover:text-purple-300">
                  Add Page Heading
                </span>
                <span className="block text-[11px] font-mono text-neutral-500 mt-0.5">36px Display Bold</span>
              </button>

              <button
                onClick={() => onAddText("subheading")}
                className="w-full p-3.5 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 text-left transition-all group"
              >
                <span className="text-base font-semibold font-sans text-white group-hover:text-purple-300">
                  Add Subtitle / Section
                </span>
                <span className="block text-[11px] font-mono text-neutral-500 mt-0.5">20px Semi-bold</span>
              </button>

              <button
                onClick={() => onAddText("body")}
                className="w-full p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/60 text-left transition-all group"
              >
                <span className="text-xs font-normal text-neutral-300 group-hover:text-white">
                  Add regular body paragraph text block
                </span>
                <span className="block text-[10px] font-mono text-neutral-500 mt-0.5">14px Regular</span>
              </button>

              <button
                onClick={() => onAddText("code")}
                className="w-full p-3 rounded-xl bg-[#121212] border border-[#d71920]/40 hover:border-[#d71920] text-left transition-all group"
              >
                <span className="text-xs font-mono text-[#d71920] tracking-wider uppercase">
                  [ 01 // DEV_MONO_BADGE ]
                </span>
                <span className="block text-[10px] font-mono text-neutral-500 mt-0.5">
                  12px Monospace Technical
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: STICKERS & ICONS */}
        {activeTab === "stickers" && (
          <div className="space-y-4">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              [ BADGES & PLATFORMS ]
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "DISCORD", color: "#5865F2" },
                { key: "GITHUB", color: "#ffffff" },
                { key: "TWITCH", color: "#9146FF" },
                { key: "YOUTUBE", color: "#FF0000" },
                { key: "SPOTIFY", color: "#1DB954" },
                { key: "TWITTER", color: "#1DA1F2" },
                { key: "VERIFIED", color: "#38bdf8" },
                { key: "DEV", color: "#d71920" },
                { key: "VIP", color: "#eab308" },
              ].map((badge) => (
                <button
                  key={badge.key}
                  onClick={() => onAddSticker(badge.key, badge.color)}
                  className="p-3 rounded-xl bg-[#121212] border border-[#222222] hover:border-white/50 flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles size={16} style={{ color: badge.color }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: badge.color }}>
                    {badge.key}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: UPLOADS */}
        {activeTab === "uploads" && (
          <div className="space-y-4">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              [ IMAGE ASSETS ]
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploadingImage}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full py-8 border-2 border-dashed border-[#333333] hover:border-white rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-colors bg-[#0e0e0e] disabled:opacity-60 cursor-pointer"
            >
              <UploadCloud size={28} />
              <span className="text-xs font-mono font-bold">
                {uploadingImage ? "UPLOADING TO PIXEL.GG STORAGE..." : "CLICK TO UPLOAD IMAGE"}
              </span>
              <span className="text-[10px] font-mono text-neutral-500">PNG, JPG, WEBP, GIF up to 10MB</span>
            </button>
            {uploadError && (
              <p className="text-[11px] font-mono text-red-400">{uploadError}</p>
            )}
          </div>
        )}

        {/* TAB: LAYERS */}
        {activeTab === "layers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              <span>[ LAYER STACK ]</span>
              <span className="text-neutral-500">{elements.length} items</span>
            </div>

            {elements.length === 0 ? (
              <div className="text-center py-8 text-neutral-600 text-xs font-mono">
                No elements on canvas
              </div>
            ) : (
              <div className="space-y-1.5">
                {[...elements]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((el) => {
                    const isSelected = el.id === selectedId;

                    return (
                      <div
                        key={el.id}
                        onClick={() => onSelect(el.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#181818] border-white text-white"
                            : "bg-[#101010] border-[#202020] text-neutral-400 hover:bg-[#141414] hover:text-neutral-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-mono truncate">{el.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Visibility */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateElement(el.id, { visible: !el.visible });
                            }}
                            className="p-1 hover:text-white transition-colors"
                            title={el.visible ? "Hide element" : "Show element"}
                          >
                            {el.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-neutral-600" />}
                          </button>

                          {/* Lock */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateElement(el.id, { locked: !el.locked });
                            }}
                            className="p-1 hover:text-white transition-colors"
                            title={el.locked ? "Unlock element" : "Lock element"}
                          >
                            {el.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                          </button>

                          {/* Move Up */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderElement(el.id, "up");
                            }}
                            className="p-1 hover:text-white transition-colors"
                            title="Bring forward"
                          >
                            <ChevronUp size={13} />
                          </button>

                          {/* Move Down */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderElement(el.id, "down");
                            }}
                            className="p-1 hover:text-white transition-colors"
                            title="Send backward"
                          >
                            <ChevronDown size={13} />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateElement(el.id);
                            }}
                            className="p-1 hover:text-white transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteElement(el.id);
                            }}
                            className="p-1 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
