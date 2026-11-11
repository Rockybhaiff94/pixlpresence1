"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Gamepad2,
  Crown,
  Sparkles,
  Sliders,
  Type,
  Image as ImageIcon,
  RotateCcw,
  Check,
  X as CloseIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Move,
  Layers,
  Radio,
  Music,
  Tv,
  Swords,
  Activity,
  ExternalLink,
} from "lucide-react";
import {
  RpcCustomLayout,
  RpcLayoutElement,
  RpcPresetId,
  RpcInternalElementType,
} from "@/types/studio";
import { DiscordRpcData } from "./DiscordRpcCard";
import {
  DEFAULT_RPC_ELEMENTS,
  RPC_PRESETS,
  applyRpcPreset,
  createDefaultRpcLayout,
  resolveRpcElementText,
  isRpcElementDataAvailable,
} from "./rpcPresets";
import { CURATED_FONTS, FONT_WEIGHTS } from "./typographyEngine";

interface DiscordRpcCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  liveData?: DiscordRpcData | null;
  currentLayout?: RpcCustomLayout | null;
  onSaveLayout: (layout: RpcCustomLayout) => void;
  onOpenUpgradeModal?: () => void;
}

type DragMode = "move" | "resize";
type ResizeHandle = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

export const DiscordRpcCustomizerModal: React.FC<DiscordRpcCustomizerModalProps> = ({
  isOpen,
  onClose,
  isPremium,
  liveData,
  currentLayout,
  onSaveLayout,
  onOpenUpgradeModal,
}) => {
  const [layout, setLayout] = useState<RpcCustomLayout>(() => {
    return currentLayout && currentLayout.elements.length > 0
      ? currentLayout
      : createDefaultRpcLayout();
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>("rpc_el_title");
  const [activeTab, setActiveTab] = useState<"elements" | "typography" | "card" | "presets">("elements");
  const [dragState, setDragState] = useState<{
    mode: DragMode;
    elementId: string;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync state if currentLayout changes from props
  useEffect(() => {
    if (currentLayout && currentLayout.elements.length > 0) {
      setLayout(currentLayout);
    }
  }, [currentLayout]);

  if (!isOpen) return null;

  // FREE USER UPGRADE GATEWAY (Phase 3)
  if (!isPremium) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-[#0e0e12] border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-center space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <Crown size={28} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase tracking-wider">
              Premium Exclusive
            </span>
            <h3 className="text-base font-bold text-white tracking-wide">
              Discord Rich Presence Customizer
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              Upgrade to Pixel.gg Premium to freely move, resize, restyle, and customize every internal
              element of your live Discord activity card while keeping telemetry in sync.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-left space-y-2 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>Independent artwork, title & metadata repositioning</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>Curated typography, text glow & luminescent effects</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>5 starting presets (Artwork Focus, Minimal, Cyber Neon)</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>Custom display text overrides with live Discord sync</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpgradeModal?.();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg cursor-pointer"
            >
              Upgrade to Premium
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold text-xs hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback demo telemetry for studio if user is not actively playing a game
  const demoData: DiscordRpcData = liveData?.appName || liveData?.name
    ? liveData
    : {
        appName: "Cyberpunk 2077",
        details: "Night City • Phantom Liberty",
        state: "Exploring Dogtown (Level 50)",
        largeImage:
          "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
        largeImageText: "Cyberpunk 2077",
        smallImage:
          "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
        activityType: 0,
        partySize: 1,
        partyMax: 4,
        status: "online",
      };

  const selectedElement = layout.elements.find((el) => el.id === selectedElementId);

  // Update specific element
  const updateElement = (id: string, patch: Partial<RpcLayoutElement>) => {
    setLayout((prev) => ({
      ...prev,
      preset: "custom",
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  // Update element style
  const updateElementStyle = (id: string, stylePatch: Partial<RpcLayoutElement["style"]>) => {
    setLayout((prev) => ({
      ...prev,
      preset: "custom",
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, style: { ...(el.style || {}), ...stylePatch } } : el
      ),
    }));
  };

  // Update element props (e.g. presentation override)
  const updateElementProps = (id: string, propsPatch: Partial<RpcLayoutElement["props"]>) => {
    setLayout((prev) => ({
      ...prev,
      preset: "custom",
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, props: { ...(el.props || {}), ...propsPatch } } : el
      ),
    }));
  };

  // Drag and Resize Handlers
  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: DragMode,
    handle?: ResizeHandle
  ) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const target = layout.elements.find((el) => el.id === id);
    if (!target || target.locked) return;

    setDragState({
      mode,
      elementId: id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: target.x,
      initialY: target.y,
      initialW: target.width,
      initialH: target.height,
    });
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (dragState.mode === "move") {
      const newX = Math.max(0, Math.min(480, Math.round(dragState.initialX + dx)));
      const newY = Math.max(0, Math.min(360, Math.round(dragState.initialY + dy)));
      updateElement(dragState.elementId, { x: newX, y: newY });
    } else if (dragState.mode === "resize") {
      let newW = dragState.initialW;
      let newH = dragState.initialH;
      let newX = dragState.initialX;
      let newY = dragState.initialY;

      if (dragState.handle?.includes("e")) newW = Math.max(20, dragState.initialW + dx);
      if (dragState.handle?.includes("s")) newH = Math.max(14, dragState.initialH + dy);
      if (dragState.handle?.includes("w")) {
        newW = Math.max(20, dragState.initialW - dx);
        newX = dragState.initialX + dx;
      }
      if (dragState.handle?.includes("n")) {
        newH = Math.max(14, dragState.initialH - dy);
        newY = dragState.initialY + dy;
      }

      updateElement(dragState.elementId, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  // Center selected element within RPC card
  const handleCenterElement = () => {
    if (!selectedElement) return;
    const cardWidth = 520;
    const newX = Math.max(0, Math.round((cardWidth - selectedElement.width) / 2));
    updateElement(selectedElement.id, { x: newX });
  };

  // Align selected element to left
  const handleAlignLeft = () => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { x: 16 });
  };

  // Reset to Discord Standard preset
  const handleResetToStandard = () => {
    const standard = applyRpcPreset("classic", layout);
    setLayout(standard);
  };

  // Calculate dynamic card height to fit bottom-most element
  const maxBottom = Math.max(
    180,
    ...layout.elements.filter((el) => el.visible).map((el) => el.y + el.height + 24)
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#0c0c0f] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800/80 flex items-center justify-between bg-[#111115]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Gamepad2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Discord Rich Presence Customizer
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold flex items-center gap-1">
                  <Crown size={10} /> Premium Level 2
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Miniature Visual Designer • Independently customize internal elements while keeping Discord data synced
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveLayout(layout);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check size={13} />
              Save Layout
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        {/* Workspace Body: Left Preview Canvas + Right Inspector Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Mini-Canvas Preview Workspace */}
          <div className="flex-1 bg-[#08080a] p-6 flex flex-col items-center justify-center relative overflow-hidden select-none">
            <div className="text-[11px] text-neutral-500 mb-3 flex items-center gap-2">
              <span>Interactive Rich Presence Canvas</span>
              <span>•</span>
              <span className="text-neutral-400">Click elements to select, drag to reposition</span>
            </div>

            {/* The Rich Presence Card Mini-Canvas */}
            <div
              ref={canvasRef}
              style={{
                width: "520px",
                height: `${maxBottom}px`,
                backgroundColor: layout.cardStyle?.backgroundColor || "rgba(17, 17, 17, 0.9)",
                borderColor: layout.cardStyle?.borderColor || "#27272a",
                borderWidth: `${layout.cardStyle?.borderWidth ?? 1}px`,
                borderRadius: `${layout.cardStyle?.borderRadius ?? 16}px`,
                boxShadow: layout.cardStyle?.boxShadow || "0 8px 32px rgba(0,0,0,0.6)",
                backdropFilter: "blur(14px)",
              }}
              className="relative border transition-all overflow-hidden"
              onClick={() => setSelectedElementId(null)}
            >
              {layout.elements.map((el) => {
                if (!el.visible) return null;
                const isSelected = selectedElementId === el.id;
                const textVal = resolveRpcElementText(el, demoData);

                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }}
                    onPointerDown={(e) => handlePointerDown(e, el.id, "move")}
                    style={{
                      position: "absolute",
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      zIndex: el.zIndex || 2,
                      cursor: "move",
                    }}
                    className={`group ${
                      isSelected
                        ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-black/50 shadow-lg"
                        : "hover:ring-1 hover:ring-purple-500/40"
                    }`}
                  >
                    {/* Element Render based on Type */}
                    {el.type === "headerStatus" && (
                      <div
                        style={{
                          fontSize: `${el.style?.fontSize || 10}px`,
                          fontWeight: el.style?.fontWeight || 700,
                          color: el.style?.color || "#ffffff",
                          textAlign: el.style?.textAlign || "left",
                          fontFamily: el.style?.fontFamily || "Space Grotesk",
                        }}
                        className="w-full h-full flex items-center gap-1.5 uppercase tracking-wide truncate"
                      >
                        <Radio size={12} className="text-purple-400 animate-pulse shrink-0" />
                        <span className="truncate">{textVal}</span>
                      </div>
                    )}

                    {el.type === "telemetryBadge" && (
                      <div
                        style={{
                          fontSize: `${el.style?.fontSize || 9}px`,
                          fontWeight: el.style?.fontWeight || 600,
                          color: el.style?.color || "#d4d4d8",
                          backgroundColor: el.style?.backgroundColor || "#18181b",
                          borderRadius: `${el.style?.borderRadius || 6}px`,
                        }}
                        className="w-full h-full flex items-center justify-center gap-1 border border-neutral-700/60 uppercase"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE TELEMETRY</span>
                      </div>
                    )}

                    {el.type === "artworkLarge" && (
                      <div
                        style={{
                          borderRadius: `${el.style?.borderRadius || 14}px`,
                          borderColor: el.style?.borderColor || "#27272a",
                          borderWidth: `${el.style?.borderWidth ?? 1}px`,
                          boxShadow: el.style?.boxShadow || "0 4px 12px rgba(0,0,0,0.5)",
                        }}
                        className="w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-xs text-white"
                      >
                        {demoData.largeImage ? (
                          <img
                            src={demoData.largeImage}
                            alt="Large Artwork"
                            className={`w-full h-full ${
                              el.style?.imageFit === "contain" ? "object-contain" : "object-cover"
                            }`}
                          />
                        ) : (
                          <span>RPC</span>
                        )}
                      </div>
                    )}

                    {el.type === "artworkSmall" && (
                      <div
                        style={{
                          borderRadius: `${el.style?.borderRadius || 9999}px`,
                          borderColor: el.style?.borderColor || "#111111",
                          borderWidth: `${el.style?.borderWidth ?? 2}px`,
                        }}
                        className="w-full h-full bg-[#111111] overflow-hidden flex items-center justify-center shadow"
                      >
                        {demoData.smallImage ? (
                          <img
                            src={demoData.smallImage}
                            alt="Small Artwork"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-emerald-500 rounded-full" />
                        )}
                      </div>
                    )}

                    {(el.type === "gameTitle" ||
                      el.type === "activityDetails" ||
                      el.type === "activityState" ||
                      el.type === "partyInfo" ||
                      el.type === "timestamps") && (
                      <div
                        style={{
                          fontFamily: el.style?.fontFamily || "Inter",
                          fontSize: `${el.style?.fontSize || 12}px`,
                          fontWeight: el.style?.fontWeight || 400,
                          color: el.style?.color || "#ffffff",
                          textAlign: el.style?.textAlign || "left",
                          letterSpacing: el.style?.letterSpacing ? `${el.style.letterSpacing}px` : undefined,
                        }}
                        className="w-full h-full flex items-center truncate"
                      >
                        <span className="truncate">{textVal}</span>
                      </div>
                    )}

                    {el.type === "actionButtons" && (
                      <div className="w-full h-full flex gap-2 items-center">
                        <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-white font-mono flex items-center gap-1 shadow">
                          <span>View Profile</span>
                          <ExternalLink size={9} />
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-white font-mono flex items-center gap-1 shadow">
                          <span>Get PixelsRPC</span>
                          <ExternalLink size={9} />
                        </div>
                      </div>
                    )}

                    {/* Resize Handles (When Selected) */}
                    {isSelected && (
                      <>
                        <div
                          onPointerDown={(e) => handlePointerDown(e, el.id, "resize", "nw")}
                          className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-purple-400 border border-black cursor-nwse-resize z-50"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, el.id, "resize", "ne")}
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 border border-black cursor-nesw-resize z-50"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, el.id, "resize", "se")}
                          className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-purple-400 border border-black cursor-nwse-resize z-50"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, el.id, "resize", "sw")}
                          className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-400 border border-black cursor-nesw-resize z-50"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Contextual Inspector Panel */}
          <div className="w-80 border-l border-neutral-800 bg-[#0e0e12] flex flex-col overflow-hidden text-xs">
            {/* Tab navigation */}
            <div className="flex border-b border-neutral-800 bg-[#121216] p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("elements")}
                className={`flex-1 py-1 rounded text-center text-[10px] transition-colors cursor-pointer ${
                  activeTab === "elements"
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Elements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("typography")}
                className={`flex-1 py-1 rounded text-center text-[10px] transition-colors cursor-pointer ${
                  activeTab === "typography"
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Style
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex-1 py-1 rounded text-center text-[10px] transition-colors cursor-pointer ${
                  activeTab === "card"
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex-1 py-1 rounded text-center text-[10px] transition-colors cursor-pointer ${
                  activeTab === "presets"
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Presets
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: ELEMENTS & SELECTION */}
              {activeTab === "elements" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Internal RPC Elements
                    </span>
                    <div className="space-y-1">
                      {layout.elements.map((el) => {
                        const isSelected = selectedElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            onClick={() => setSelectedElementId(el.id)}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-purple-500/10 border-purple-500/40 text-white font-bold"
                                : "bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                            }`}
                          >
                            <span className="text-xs truncate">{el.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateElement(el.id, { visible: !el.visible });
                              }}
                              className="text-neutral-400 hover:text-white p-0.5"
                            >
                              {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Element Quick Align */}
                  {selectedElement && (
                    <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        Align Selected: {selectedElement.name}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={handleAlignLeft}
                          className="py-1 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold text-center transition-colors"
                        >
                          Align Left
                        </button>
                        <button
                          type="button"
                          onClick={handleCenterElement}
                          className="py-1 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold text-center transition-colors"
                        >
                          Center Align
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Presentation Override (Data Separation) */}
                  {selectedElement &&
                    (selectedElement.type === "gameTitle" ||
                      selectedElement.type === "activityDetails" ||
                      selectedElement.type === "activityState") && (
                      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">
                            Presentation Override
                          </span>
                          {selectedElement.props?.presentationOverride ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                              Override Active
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                              Live Sync
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-normal">
                          Custom display label. Original Discord activity data remains untouched.
                        </p>
                        <input
                          type="text"
                          placeholder="e.g. Playing GTA 6"
                          value={selectedElement.props?.presentationOverride || ""}
                          onChange={(e) =>
                            updateElementProps(selectedElement.id, {
                              presentationOverride: e.target.value,
                            })
                          }
                          className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                        {selectedElement.props?.presentationOverride && (
                          <button
                            type="button"
                            onClick={() =>
                              updateElementProps(selectedElement.id, {
                                presentationOverride: undefined,
                              })
                            }
                            className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            Reset to Live Discord Telemetry
                          </button>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* TAB 2: TYPOGRAPHY & ELEMENT STYLING */}
              {activeTab === "typography" && selectedElement && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Typography: {selectedElement.name}
                    </span>

                    {/* Font Family */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400">Font Family</label>
                      <select
                        value={selectedElement.style?.fontFamily || "Inter"}
                        onChange={(e) => updateElementStyle(selectedElement.id, { fontFamily: e.target.value })}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {CURATED_FONTS.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">Size (px)</label>
                        <input
                          type="number"
                          min={9}
                          max={36}
                          value={selectedElement.style?.fontSize || 12}
                          onChange={(e) =>
                            updateElementStyle(selectedElement.id, { fontSize: Number(e.target.value) })
                          }
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">Weight</label>
                        <select
                          value={selectedElement.style?.fontWeight || 400}
                          onChange={(e) =>
                            updateElementStyle(selectedElement.id, { fontWeight: Number(e.target.value) })
                          }
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                        >
                          {FONT_WEIGHTS.map((w) => (
                            <option key={w.value} value={w.value}>
                              {w.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-neutral-400">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.style?.color || "#ffffff"}
                          onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                          className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={selectedElement.style?.color || "#ffffff"}
                          onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                          className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Corner Radius & Artwork fit */}
                  {selectedElement.type === "artworkLarge" && (
                    <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        Artwork Appearance
                      </span>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">Border Radius (px)</label>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={selectedElement.style?.borderRadius || 14}
                          onChange={(e) =>
                            updateElementStyle(selectedElement.id, { borderRadius: Number(e.target.value) })
                          }
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: OUTER CARD APPEARANCE */}
              {activeTab === "card" && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Card Container Styling
                    </span>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400">Border Radius</label>
                      <input
                        type="number"
                        min={0}
                        max={32}
                        value={layout.cardStyle?.borderRadius ?? 16}
                        onChange={(e) =>
                          setLayout((prev) => ({
                            ...prev,
                            cardStyle: { ...prev.cardStyle, borderRadius: Number(e.target.value) },
                          }))
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400">Border Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layout.cardStyle?.borderColor || "#27272a"}
                          onChange={(e) =>
                            setLayout((prev) => ({
                              ...prev,
                              cardStyle: { ...prev.cardStyle, borderColor: e.target.value },
                            }))
                          }
                          className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={layout.cardStyle?.borderColor || "#27272a"}
                          onChange={(e) =>
                            setLayout((prev) => ({
                              ...prev,
                              cardStyle: { ...prev.cardStyle, borderColor: e.target.value },
                            }))
                          }
                          className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetToStandard}
                        className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw size={12} /> Reset to Discord Standard
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LAYOUT PRESETS */}
              {activeTab === "presets" && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    5 Professional Layout Presets
                  </span>
                  <div className="space-y-2">
                    {(Object.keys(RPC_PRESETS) as RpcPresetId[]).map((presetKey) => {
                      const p = RPC_PRESETS[presetKey];
                      const isCurrent = layout.preset === p.id;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            const updated = applyRpcPreset(p.id, layout);
                            setLayout(updated);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-purple-500/10 border-purple-500/50 shadow-md"
                              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{p.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1 leading-normal">
                            {p.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

