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
  Crown,
  Share2,
  Upload,
  RefreshCw,
  Sun,
  Flame,
  Check,
} from "lucide-react";
import {
  CanvasElement,
  CanvasEmbed,
  CanvasTransform,
  CanvasElementStyle,
} from "@/types/studio";
import { EFFECT_PRESETS, EffectPresetDef } from "./effectPresets";

interface SelectedObjectMenuProps {
  item: CanvasEmbed | CanvasElement;
  isEmbed: boolean;
  isPremium?: boolean;
  themeAccentColor?: string;
  onUpdateTransform: (transform: Partial<CanvasTransform>) => void;
  onUpdateStyle: (style: Partial<CanvasElementStyle>) => void;
  onUpdateProps?: (props: Record<string, any>) => void;
  onUpdateVisibility?: (visible: boolean) => void;
  onClose: () => void;
}

type TabType = "appearance" | "effects" | "icons" | "presets" | "layout" | "content" | "visibility";

const COLOR_PRESETS = [
  { label: "Pure White", hex: "#ffffff" },
  { label: "Deep Black", hex: "#000000" },
  { label: "Sky Cyan", hex: "#38bdf8" },
  { label: "Neon Purple", hex: "#a855f7" },
  { label: "Emerald Green", hex: "#22c55e" },
  { label: "Amber Gold", hex: "#f59e0b" },
  { label: "Crimson Red", hex: "#ef4444" },
];

export const SelectedObjectMenu: React.FC<SelectedObjectMenuProps> = ({
  item,
  isEmbed,
  isPremium = false,
  themeAccentColor = "#ffffff",
  onUpdateTransform,
  onUpdateStyle,
  onUpdateProps,
  onUpdateVisibility,
  onClose,
}) => {
  const isIconElement =
    !isEmbed &&
    ((item as CanvasElement).type === "socials" ||
      (item as CanvasElement).type === "socialIcon" ||
      (item as CanvasElement).type === "bottomIcon");

  const [activeTab, setActiveTab] = useState<TabType>(
    isIconElement ? "icons" : isEmbed ? "appearance" : "content"
  );
  const [showPremiumModal, setShowPremiumModal] = useState<string | null>(null);

  const transform = item.transform;
  const style = isEmbed
    ? (item as CanvasEmbed).style
    : (item as CanvasElement).style || {};
  const props = isEmbed ? {} : (item as CanvasElement).props || {};
  const isVisible = item.isVisible !== false;

  const handleApplyPreset = (preset: EffectPresetDef) => {
    if (preset.isPremium && !isPremium) {
      setShowPremiumModal(preset.name);
      return;
    }
    onUpdateStyle({
      ...preset.style,
      effectPreset: preset.id,
    });
  };

  const checkPremiumGuard = (featureName: string, action: () => void) => {
    if (!isPremium) {
      setShowPremiumModal(featureName);
      return;
    }
    action();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-0 right-[-330px] w-[320px] max-h-[500px] overflow-y-auto bg-[#101014]/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 z-50 pointer-events-auto text-neutral-200 text-xs font-mono select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <Sliders size={13} className="text-sky-400" />
          <span className="font-bold text-white text-[11px] truncate">
            {isEmbed ? (item as CanvasEmbed).title : (item as CanvasElement).name}
          </span>
          {isPremium && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40">
              <Crown size={8} /> PRO
            </span>
          )}
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
        {isIconElement && (
          <button
            type="button"
            onClick={() => setActiveTab("icons")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              activeTab === "icons" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Share2 size={10} /> Icons
          </button>
        )}
        {!isEmbed && !isIconElement && (
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
          onClick={() => setActiveTab("presets")}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            activeTab === "presets" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Sparkles size={10} /> Presets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            activeTab === "effects" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Flame size={10} /> Effects
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`px-2 py-1 rounded transition-colors ${
            activeTab === "appearance" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Styling
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
      </div>

      {/* TAB: ICONS (Social Media & App Icon Customization - Phase 3 & 6) */}
      {activeTab === "icons" && (
        <div className="space-y-3.5">
          {/* Color Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 flex items-center justify-between">
              <span>Icon Color Mode</span>
              <span className="text-[9px] text-sky-400 uppercase font-mono">
                {style.iconColorMode || "original"}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateStyle({ iconColorMode: "original", iconColor: undefined })}
                className={`p-1.5 rounded border text-center transition-all ${
                  (!style.iconColorMode || style.iconColorMode === "original")
                    ? "border-sky-500 bg-sky-950/40 text-white font-bold"
                    : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ iconColorMode: "custom", iconColor: style.iconColor || "#ffffff" })}
                className={`p-1.5 rounded border text-center transition-all ${
                  style.iconColorMode === "custom"
                    ? "border-sky-500 bg-sky-950/40 text-white font-bold"
                    : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                }`}
              >
                Solid Color
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ iconColorMode: "theme", iconColor: themeAccentColor })}
                className={`p-1.5 rounded border text-center transition-all ${
                  style.iconColorMode === "theme"
                    ? "border-sky-500 bg-sky-950/40 text-white font-bold"
                    : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                }`}
              >
                Theme Accent
              </button>
            </div>
          </div>

          {/* Solid Color Picker & Presets (Free) */}
          {style.iconColorMode === "custom" && (
            <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.iconColor?.startsWith("#") ? style.iconColor : "#ffffff"}
                  onChange={(e) => onUpdateStyle({ iconColor: e.target.value })}
                  className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={style.iconColor || "#ffffff"}
                  onChange={(e) => onUpdateStyle({ iconColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 bg-black border border-neutral-700 rounded px-2 py-1 text-xs text-white uppercase font-mono"
                />
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => onUpdateStyle({ iconColor: c.hex })}
                    className="w-5 h-5 rounded-full border border-neutral-700 hover:scale-110 transition-transform shadow"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Alternative Icon Styles (Premium - Phase 6A) */}
          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-300 font-bold flex items-center gap-1">
                <Crown size={11} className="text-amber-400" /> Alternative Icon Styles
              </span>
              <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40 uppercase">
                Premium
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {(["default", "filled", "outline", "minimal"] as const).map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() =>
                    checkPremiumGuard(`Alternative Icon Style (${variant})`, () =>
                      onUpdateStyle({ iconVariant: variant })
                    )
                  }
                  className={`p-1.5 rounded border text-left capitalize transition-all ${
                    (style.iconVariant || "default") === variant
                      ? "border-amber-400 bg-amber-500/10 text-amber-200 font-bold"
                      : "border-neutral-800 bg-black/40 text-neutral-400 hover:text-white"
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Icon Upload (Premium - Phase 6C) */}
          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-300 font-bold flex items-center gap-1">
                <Upload size={11} className="text-amber-400" /> Custom Icon Asset
              </span>
              <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40 uppercase">
                Premium
              </span>
            </div>
            <p className="text-[9px] text-neutral-500">
              Upload custom vector SVG, PNG, or WEBP icon artwork for this slot.
            </p>
            {style.customIconUrl ? (
              <div className="flex items-center justify-between bg-black/60 p-1.5 rounded border border-neutral-800">
                <img src={style.customIconUrl} alt="custom" className="w-6 h-6 object-contain" />
                <button
                  type="button"
                  onClick={() => onUpdateStyle({ customIconUrl: undefined })}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                onClick={(e) => {
                  if (!isPremium) {
                    e.preventDefault();
                    setShowPremiumModal("Custom Icon Upload");
                  }
                }}
                className="w-full py-2 px-3 rounded border border-dashed border-neutral-700 hover:border-amber-400 bg-black/40 text-neutral-400 hover:text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer text-[10px] transition-colors"
              >
                <Upload size={11} /> Upload Custom Icon
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  disabled={!isPremium}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        onUpdateStyle({ customIconUrl: ev.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRESETS (Phase 8: Free & Premium Presets) */}
      {activeTab === "presets" && (
        <div className="space-y-2">
          <p className="text-[10px] text-neutral-400 pb-1">
            Choose a visual preset to quickly enhance this element:
          </p>
          <div className="space-y-1.5">
            {EFFECT_PRESETS.map((preset) => {
              const isActive = style.effectPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isActive
                      ? "border-sky-500 bg-sky-950/40 text-white shadow-lg"
                      : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px]">{preset.name}</span>
                      {preset.isPremium && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40 uppercase font-mono">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-neutral-500 pt-0.5">{preset.description}</p>
                  </div>
                  {isActive && <Check size={14} className="text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: EFFECTS (Glow, Shadows, Lighting, Animations - Phase 4 & 5) */}
      {activeTab === "effects" && (
        <div className="space-y-3.5">
          {/* 1. GLOW SECTION */}
          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                <Flame size={12} className="text-sky-400" /> Outer Glow
              </span>
              <button
                type="button"
                onClick={() => onUpdateStyle({ glowEnabled: !style.glowEnabled })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  style.glowEnabled ? "bg-sky-500 text-black" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {style.glowEnabled ? "ENABLED" : "OFF"}
              </button>
            </div>

            {style.glowEnabled && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.glowColor?.startsWith("#") ? style.glowColor : "#38bdf8"}
                    onChange={(e) => onUpdateStyle({ glowColor: e.target.value })}
                    className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.glowColor || "#38bdf8"}
                    onChange={(e) => onUpdateStyle({ glowColor: e.target.value })}
                    className="flex-1 bg-black border border-neutral-700 rounded px-2 py-1 text-[10px] text-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-neutral-400">
                    <span>Intensity</span>
                    <span className="font-mono text-sky-300">{style.glowIntensity ?? 60}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={style.glowIntensity ?? 60}
                    onChange={(e) => onUpdateStyle({ glowIntensity: Number(e.target.value) })}
                    className="w-full accent-sky-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-neutral-400">
                    <span>Blur Radius</span>
                    <span className="font-mono text-sky-300">{style.glowBlur ?? 16}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={60}
                    value={style.glowBlur ?? 16}
                    onChange={(e) => onUpdateStyle({ glowBlur: Number(e.target.value) })}
                    className="w-full accent-sky-400"
                  />
                </div>

                {/* Premium Glow Types */}
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-400">Glow Style</span>
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40 uppercase">
                      Premium
                    </span>
                  </div>
                  <select
                    value={style.glowType || "basic"}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      if (val !== "basic") {
                        checkPremiumGuard("Advanced Animated Glow", () =>
                          onUpdateStyle({ glowType: val })
                        );
                      } else {
                        onUpdateStyle({ glowType: val });
                      }
                    }}
                    className="w-full bg-black border border-neutral-700 rounded px-2 py-1 text-[10px] text-white"
                  >
                    <option value="basic">Basic Solid Glow (Free)</option>
                    <option value="animated">Animated Breathing Glow ✨</option>
                    <option value="multi">Multi-Layer Glow Aura ✨</option>
                    <option value="gradient">Gradient Glow Flow ✨</option>
                    <option value="pulsating">Pulsating Neon ✨</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 2. SHADOW & LIGHTING SECTION */}
          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                <Sun size={12} className="text-amber-400" /> Shadows & Lighting
              </span>
              <button
                type="button"
                onClick={() => onUpdateStyle({ shadowEnabled: !style.shadowEnabled })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  style.shadowEnabled ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {style.shadowEnabled ? "ENABLED" : "OFF"}
              </button>
            </div>

            {style.shadowEnabled && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-neutral-400">
                      <span>Blur</span>
                      <span className="font-mono text-amber-300">{style.shadowBlur ?? 16}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={style.shadowBlur ?? 16}
                      onChange={(e) => onUpdateStyle({ shadowBlur: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-neutral-400">
                      <span>Distance</span>
                      <span className="font-mono text-amber-300">{style.shadowDistance ?? 8}px</span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={40}
                      value={style.shadowDistance ?? 8}
                      onChange={(e) => onUpdateStyle({ shadowDistance: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                {/* Premium Lighting Modes */}
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-400">Lighting Mode</span>
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40 uppercase">
                      Premium
                    </span>
                  </div>
                  <select
                    value={style.lightingMode || "none"}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      if (val !== "none") {
                        checkPremiumGuard("Advanced 3D Depth Lighting", () =>
                          onUpdateStyle({ lightingMode: val })
                        );
                      } else {
                        onUpdateStyle({ lightingMode: val });
                      }
                    }}
                    className="w-full bg-black border border-neutral-700 rounded px-2 py-1 text-[10px] text-white"
                  >
                    <option value="none">Standard Drop Shadow (Free)</option>
                    <option value="ambient">Ambient Directional Lighting ✨</option>
                    <option value="depth">3D Layered Depth Elevation ✨</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 3. HOVER EFFECTS & ANIMATION PRESETS */}
          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 space-y-2">
            <span className="font-bold text-[11px] text-white">Hover Transitions</span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {(["none", "scale", "opacity", "glow", "neon", "pulse"] as const).map((eff) => (
                <button
                  key={eff}
                  type="button"
                  onClick={() => {
                    if (eff === "neon" || eff === "pulse") {
                      checkPremiumGuard("Advanced Hover Animation", () =>
                        onUpdateStyle({ hoverEffect: eff })
                      );
                    } else {
                      onUpdateStyle({ hoverEffect: eff });
                    }
                  }}
                  className={`p-1.5 rounded border text-left capitalize transition-all ${
                    (style.hoverEffect || "none") === eff
                      ? "border-sky-500 bg-sky-950/40 text-white font-bold"
                      : "border-neutral-800 bg-black/40 text-neutral-400 hover:text-white"
                  }`}
                >
                  {eff} {(eff === "neon" || eff === "pulse") ? "✨" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STYLING & APPEARANCE */}
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

      {/* TAB: LAYOUT */}
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
        </div>
      )}

      {/* TAB: CONTENT (When applicable) */}
      {activeTab === "content" && !isEmbed && (
        <div className="space-y-3">
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

          {props.src !== undefined && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Image Source URL</label>
              <input
                type="text"
                value={props.src}
                onChange={(e) => onUpdateProps?.({ src: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>
      )}

      {/* PREMIUM LOCK OVERLAY MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#121216] p-5 shadow-2xl text-center space-y-3 font-sans"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Crown size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-wide">
                Unlock Premium Effects
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                {showPremiumModal} is an exclusive Pixel.gg Premium creative feature.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/50 border border-neutral-800 text-[11px] text-neutral-300 text-left space-y-1 font-mono">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Check size={12} /> Animated multi-layer neon & aurora glow
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <Check size={12} /> Alternative icon variants & custom icon uploads
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <Check size={12} /> 3D depth ambient lighting & gradient flows
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPremiumModal(null)}
                className="flex-1 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold"
              >
                Maybe Later
              </button>
              <a
                href="/premium"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold shadow-lg transition-transform hover:scale-102 flex items-center justify-center gap-1"
              >
                <Crown size={12} /> Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
