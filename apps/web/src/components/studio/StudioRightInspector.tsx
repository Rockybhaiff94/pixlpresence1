"use client";

import React, { useState } from "react";
import {
  Sliders,
  AlertCircle,
  Check,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import {
  ProfileDesignConfig,
  LayoutPreset,
  BackgroundType,
  BackgroundAspectRatio,
  BackgroundFitMode,
  PatternType,
  ParticleEffect,
  BadgeStyle,
  ButtonVariant,
  SocialIconStyle,
  RpcStyle,
  RpcImageLayout,
} from "@/types/studio";
import { StudioTab } from "./StudioLeftPanel";
import { CURATED_FONTS } from "./fonts";
import { validateCss } from "./cssUtils";
import { BackgroundCustomizerModal } from "./BackgroundCustomizerModal";

interface StudioRightInspectorProps {
  activeTab: StudioTab;
  config: ProfileDesignConfig;
  updateConfig: (updater: (prev: ProfileDesignConfig) => ProfileDesignConfig) => void;
  displayName: string;
  setDisplayName: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
  bannerUrl: string;
  setBannerUrl: (val: string) => void;
  musicUrl: string;
  setMusicUrl: (val: string) => void;
}

export const StudioRightInspector: React.FC<StudioRightInspectorProps> = ({
  activeTab,
  config,
  updateConfig,
  displayName,
  setDisplayName,
  bio,
  setBio,
  avatarUrl,
  setAvatarUrl,
  bannerUrl,
  setBannerUrl,
  musicUrl,
  setMusicUrl,
}) => {
  const [cssValidation, setCssValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  const ACCENTS = ["#ffffff", "#d71920", "#ff9800", "#4ade80", "#38bdf8", "#818cf8", "#a855f7", "#ec4899", "#facc15"];

  const handleCssChange = (val: string) => {
    updateConfig((prev) => ({ ...prev, customCss: val }));
    const result = validateCss(val);
    setCssValidation(result);
  };

  const insertSnippet = (snippet: string) => {
    const current = config.customCss || "";
    handleCssChange(`${current}\n${snippet}`.trim());
  };

  return (
    <aside className="w-full sm:w-80 lg:w-96 h-full border-l border-[#202020] bg-[#0c0c0e] flex flex-col shrink-0 text-xs font-mono text-[#ededed] select-none">
      {/* Inspector Header */}
      <div className="h-11 px-4 border-b border-[#202020] bg-[#101012] flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders size={13} className="text-neutral-400" />
          {activeTab.toUpperCase()} PROPERTIES
        </span>
        <span className="text-[10px] text-neutral-500">REAL-TIME SYNC</span>
      </div>

      {/* Inspector Controls Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* 1. LAYOUT & STRUCTURE */}
        {activeTab === "layout" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Layout Structure Preset
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    "centered",
                    "left",
                    "right",
                    "minimal",
                    "card",
                    "split",
                    "wide",
                    "glass",
                  ] as LayoutPreset[]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        layout: {
                          ...p.layout,
                          preset,
                          alignment: preset === "left" ? "left" : preset === "right" ? "right" : "center",
                          maxWidth: preset === "wide" ? 720 : preset === "split" ? 760 : preset === "minimal" ? 520 : 580,
                        },
                      }))
                    }
                    className={`py-2 px-2.5 rounded-lg border text-[11px] capitalize text-center transition-all cursor-pointer ${
                      config.layout.preset === preset
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Card Max Width</span>
                <span className="text-white font-bold">{config.layout.maxWidth}px</span>
              </div>
              <input
                type="range"
                min="460"
                max="820"
                step="10"
                value={config.layout.maxWidth}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    layout: { ...p.layout, maxWidth: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Internal Padding</span>
                <span className="text-white font-bold">{config.layout.padding}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={config.layout.padding}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    layout: { ...p.layout, padding: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Elements Spacing (Gap)</span>
                <span className="text-white font-bold">{config.layout.gap}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="36"
                step="2"
                value={config.layout.gap}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    layout: { ...p.layout, gap: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1c1c1f]">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Content Alignment
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        layout: { ...p.layout, alignment: align },
                      }))
                    }
                    className={`py-1.5 text-[11px] rounded-lg border capitalize cursor-pointer ${
                      config.layout.alignment === align
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. PROFILE IDENTITY */}
        {activeTab === "identity" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... (direct image link)"
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Public Display Name"
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Biography / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Description or slogan..."
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Title Font Size</span>
                <span className="text-white font-bold">{config.identity.titleSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="40"
                step="1"
                value={config.identity.titleSize}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    identity: { ...p.identity, titleSize: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Badge Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["pill", "glyph", "neon", "minimal", "hidden"] as BadgeStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        identity: { ...p.identity, badgeStyle: style },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.identity.badgeStyle === style
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1c1c1f]">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Title Text Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        identity: { ...p.identity, titleColor: c },
                      }))
                    }
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      config.identity.titleColor === c ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="text"
                  value={config.identity.titleColor}
                  onChange={(e) =>
                    updateConfig((p) => ({
                      ...p,
                      identity: { ...p.identity, titleColor: e.target.value },
                    }))
                  }
                  className="px-2 py-1 rounded bg-[#161619] border border-[#26262a] text-[10px] text-white w-20 text-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. BACKGROUNDS */}
        {activeTab === "background" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Background Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["solid", "gradient", "mesh", "image", "gif"] as BackgroundType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        background: { ...p.background, type: t },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.background.type === t
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {config.background.type === "solid" && (
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Solid Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.background.color}
                    onChange={(e) =>
                      updateConfig((p) => ({
                        ...p,
                        background: { ...p.background, color: e.target.value },
                      }))
                    }
                    className="w-8 h-8 rounded border border-[#333] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.background.color}
                    onChange={(e) =>
                      updateConfig((p) => ({
                        ...p,
                        background: { ...p.background, color: e.target.value },
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#141416] border border-[#242426] text-xs text-white w-28"
                  />
                </div>
              </div>
            )}

            {(config.background.type === "image" || config.background.type === "gif") && (
              <div className="space-y-2.5 p-3 rounded-xl bg-[#141416] border border-[#242426]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                    Background Image / GIF
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBgModalOpen(true)}
                    className="px-2 py-1 rounded bg-white text-black font-bold text-[10px] hover:bg-neutral-200 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <ImageIcon size={11} />
                    CUSTOMIZE & CROP ↗
                  </button>
                </div>
                <input
                  type="url"
                  value={config.background.imageUrl || bannerUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setBannerUrl(url);
                    updateConfig((p) => ({
                      ...p,
                      background: { ...p.background, imageUrl: url },
                    }));
                  }}
                  placeholder="https://... (direct image link)"
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0e10] border border-[#242426] text-white text-xs focus:outline-none focus:border-white"
                />

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono text-neutral-400">
                  <div className="p-1.5 rounded bg-black/40 border border-[#242426]">
                    RATIO: <span className="text-white font-bold">{config.background.aspectRatio || "full"}</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/40 border border-[#242426]">
                    FIT: <span className="text-white font-bold">{config.background.fitMode || "cover"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#1c1c1f]">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Texture & Pattern Overlay
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["none", "dots", "grid", "scanlines"] as PatternType[]).map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        background: { ...p.background, pattern: pat },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.background.pattern === pat
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {pat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Background Audio Stream URL (MP3/SoundCloud)
              </label>
              <input
                type="url"
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
                placeholder="https://... (direct audio link)"
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Background Blur</span>
                <span className="text-white font-bold">{config.background.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={config.background.blur}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    background: { ...p.background, blur: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* 4. TYPOGRAPHY & FONTS */}
        {activeTab === "typography" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Primary Heading Font
              </label>
              <select
                value={config.typography.headingFont}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    typography: { ...p.typography, headingFont: e.target.value },
                    identity: { ...p.identity, titleFont: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none"
              >
                {CURATED_FONTS.map((font) => (
                  <option key={font.name} value={font.name}>
                    {font.name} ({font.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Body / Content Font
              </label>
              <select
                value={config.typography.bodyFont}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    typography: { ...p.typography, bodyFont: e.target.value },
                    identity: { ...p.identity, bioFont: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#242426] text-white text-xs focus:outline-none"
              >
                {CURATED_FONTS.map((font) => (
                  <option key={font.name} value={font.name}>
                    {font.name} ({font.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Letter Spacing</span>
                <span className="text-white font-bold">{config.typography.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-1"
                max="5"
                step="0.5"
                value={config.typography.letterSpacing}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    typography: { ...p.typography, letterSpacing: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* 5. DISCORD RICH PRESENCE */}
        {activeTab === "rpc" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                RPC Card Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["card", "glass", "minimal", "neon"] as RpcStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        discordRpc: { ...p.discordRpc, style },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.discordRpc.style === style
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Activity Image Placement
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["left", "right", "stacked", "hidden"] as RpcImageLayout[]).map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        discordRpc: { ...p.discordRpc, imageLayout: layout },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.discordRpc.imageLayout === layout
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">RPC Corner Radius</span>
                <span className="text-white font-bold">{config.discordRpc.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="28"
                step="2"
                value={config.discordRpc.borderRadius}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    discordRpc: { ...p.discordRpc, borderRadius: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141416] border border-[#242426]">
              <span className="text-[11px] text-white">Live Telemetry Badge</span>
              <input
                type="checkbox"
                checked={config.discordRpc.showTelemetryBadge}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    discordRpc: { ...p.discordRpc, showTelemetryBadge: e.target.checked },
                  }))
                }
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 6. BUTTONS & SOCIALS */}
        {activeTab === "buttons" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Action Button Variant
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    "solid-white",
                    "glass",
                    "neon",
                    "minimal",
                    "outline",
                    "gradient",
                  ] as ButtonVariant[]
                ).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        buttons: { ...p.buttons, variant: v },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.buttons.variant === v
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Button Corner Radius</span>
                <span className="text-white font-bold">{config.buttons.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="32"
                step="2"
                value={config.buttons.borderRadius}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    buttons: { ...p.buttons, borderRadius: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#1c1c1f]">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Social Links Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["minimal", "pill", "glass", "neon", "circle"] as SocialIconStyle[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      updateConfig((p) => ({
                        ...p,
                        socials: { ...p.socials, style: s },
                      }))
                    }
                    className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                      config.socials.style === s
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. EFFECTS & SHADERS */}
        {activeTab === "effects" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Particle Ambience
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["None", "Snow", "Stars", "Fireflies", "Rain", "Matrix"] as ParticleEffect[]).map(
                  (eff) => (
                    <button
                      key={eff}
                      type="button"
                      onClick={() =>
                        updateConfig((p) => ({
                          ...p,
                          effects: { ...p.effects, particles: eff },
                        }))
                      }
                      className={`py-1.5 text-[10px] rounded-lg border capitalize cursor-pointer ${
                        config.effects.particles === eff
                          ? "bg-white text-black font-bold border-white"
                          : "bg-[#141416] border-[#242426] text-neutral-400 hover:text-white"
                      }`}
                    >
                      {eff}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#1c1c1f]">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Card Glass Blur</span>
                <span className="text-white font-bold">{config.effects.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                step="2"
                value={config.effects.blur}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    effects: { ...p.effects, blur: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-400">Glass Opacity</span>
                <span className="text-white font-bold">{config.effects.opacity}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={config.effects.opacity}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    effects: { ...p.effects, opacity: Number(e.target.value) },
                  }))
                }
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202024] rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141416] border border-[#242426]">
              <span className="text-[11px] text-white">Ambient Glow Aura</span>
              <input
                type="checkbox"
                checked={config.effects.ambientGlow}
                onChange={(e) =>
                  updateConfig((p) => ({
                    ...p,
                    effects: { ...p.effects, ambientGlow: e.target.checked },
                  }))
                }
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 8. CUSTOM CODE / CSS */}
        {activeTab === "css" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#121215] border border-[#202024] text-[11px] text-neutral-400 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Info size={12} className="text-neutral-400" /> Scoped CSS Selectors
              </p>
              <p className="text-[10px] text-neutral-400">
                Rules are automatically isolated to your profile. Use:
              </p>
              <code className="text-[10px] text-white block bg-black/60 p-1.5 rounded font-mono">
                .profile-container, .profile-avatar, .profile-username, .discord-rpc, .profile-button
              </code>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Custom CSS Editor
                </label>
                {cssValidation.valid ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check size={11} /> Valid CSS
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1 truncate max-w-[160px]">
                    <AlertCircle size={11} /> {cssValidation.error}
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={config.customCss || ""}
                onChange={(e) => handleCssChange(e.target.value)}
                placeholder={`.profile-container {\n  border-radius: 24px;\n  box-shadow: 0 0 30px rgba(255,255,255,0.1);\n}\n.profile-avatar:hover {\n  transform: rotate(5deg) scale(1.05);\n}`}
                className="w-full px-3 py-2.5 rounded-xl bg-[#08080a] border border-[#242426] text-white text-[11px] font-mono leading-relaxed focus:outline-none focus:border-white custom-scrollbar resize-y"
              />
            </div>

            {/* Snippet Quick Inserts */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                QUICK SNIPPETS
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      `.profile-container {\n  box-shadow: 0 0 40px rgba(56, 189, 248, 0.3);\n  border: 1px solid #38bdf8;\n}`
                    )
                  }
                  className="p-2 rounded-lg bg-[#141416] border border-[#242426] hover:border-white text-[10px] text-left text-neutral-300 cursor-pointer"
                >
                  + Neon Cyan Aura
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      `.profile-username {\n  background: linear-gradient(90deg, #fff, #a855f7);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}`
                    )
                  }
                  className="p-2 rounded-lg bg-[#141416] border border-[#242426] hover:border-white text-[10px] text-left text-neutral-300 cursor-pointer"
                >
                  + Gradient Username
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      `@keyframes floatSlow {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-6px); }\n}\n.profile-container {\n  animation: floatSlow 4s ease-in-out infinite;\n}`
                    )
                  }
                  className="p-2 rounded-lg bg-[#141416] border border-[#242426] hover:border-white text-[10px] text-left text-neutral-300 cursor-pointer"
                >
                  + Floating Float Anim
                </button>
                <button
                  type="button"
                  onClick={() => handleCssChange("")}
                  className="p-2 rounded-lg bg-[#141416] border border-[#242426] hover:border-rose-500 text-[10px] text-left text-rose-400 cursor-pointer"
                >
                  ✕ Clear All CSS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Background Customizer & Crop Modal */}
      <BackgroundCustomizerModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        backgroundConfig={config.background}
        onApply={(updated) => {
          updateConfig((prev) => ({
            ...prev,
            background: {
              ...prev.background,
              ...updated,
            },
          }));
        }}
      />
    </aside>
  );
};
