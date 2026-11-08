"use client";

import React, { useState } from "react";
import {
  Layout,
  User,
  Image as ImageIcon,
  Type,
  Gamepad2,
  Sparkles,
  Code2,
  Settings,
  Sliders,
  AlertCircle,
  Link2,
  ExternalLink,
  Music,
  Shield,
  Palette,
  Layers,
  LayoutTemplate,
  FileCode,
} from "lucide-react";
import {
  ProfileDesignConfig,
  DEFAULT_DESIGN_CONFIG,
  StudioTab,
  LayoutPreset,
  BackgroundType,
  PatternType,
  ParticleEffect,
  BadgeStyle,
  ButtonVariant,
  SocialIconStyle,
  RpcStyle,
  RpcImageLayout,
  RpcImageSize,
} from "@/types/studio";
import { CURATED_FONTS } from "./fonts";
import { validateCss } from "./cssUtils";
import { StudioTemplateManager } from "./StudioTemplateManager";
import { StudioLayerManager } from "./StudioLayerManager";
import { StudioTemplatePreset } from "./templates";

export type StudioView = "categories" | "templates" | "layers";

interface StudioLeftWorkspaceProps {
  currentView: StudioView;
  setCurrentView: (view: StudioView) => void;
  activeCategory: StudioTab;
  setActiveCategory: (cat: StudioTab) => void;
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
  onApplyTemplatePreset: (preset: StudioTemplatePreset) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
}

export const StudioLeftWorkspace: React.FC<StudioLeftWorkspaceProps> = ({
  currentView,
  setCurrentView,
  activeCategory,
  setActiveCategory,
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
  onApplyTemplatePreset,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onMoveLayer,
}) => {
  const [cssValidation, setCssValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  const CATEGORIES: Array<{
    id: StudioTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { id: "layout", label: "Layout & Structure", icon: Layout },
    { id: "identity", label: "Profile Identity", icon: User },
    { id: "avatar", label: "Avatar & Images", icon: ImageIcon },
    { id: "background", label: "Backgrounds", icon: Palette },
    { id: "typography", label: "Typography & Fonts", icon: Type },
    { id: "rpc", label: "Discord Rich Presence", icon: Gamepad2 },
    { id: "buttons", label: "Buttons & Socials", icon: Link2 },
    { id: "effects", label: "Effects & Animations", icon: Sparkles },
    { id: "css", label: "Custom CSS", icon: Code2 },
    { id: "advanced", label: "Advanced Settings", icon: Settings },
  ];

  const ACCENTS = [
    "#ffffff",
    "#d71920",
    "#ff9800",
    "#4ade80",
    "#38bdf8",
    "#818cf8",
    "#a855f7",
    "#ec4899",
    "#facc15",
    "#000000",
  ];

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
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-xs font-mono text-[#ededed] select-none">
      {/* Top Navigation Row: Sub-Tabs & Category Bar */}
      <div className="border-b border-[#202020] bg-[#0d0d0f] shrink-0">
        {/* View Switcher: Categories vs Templates vs Layers */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1b1b1e]">
          <div className="flex items-center gap-1 bg-[#141416] p-1 rounded-xl border border-[#242426]">
            <button
              onClick={() => setCurrentView("categories")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === "categories"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Sliders size={13} />
              <span>Categories</span>
            </button>

            <button
              onClick={() => setCurrentView("templates")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === "templates"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <LayoutTemplate size={13} />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setCurrentView("layers")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === "layers"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>Layers</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-500 hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>REAL-TIME EDITING WORKSPACE</span>
          </div>
        </div>

        {/* 10 Category Navigation Pills (Visible when in "categories" view) */}
        {currentView === "categories" && (
          <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent"
                  }`}
                >
                  <Icon size={13} className={isActive ? "text-white" : "text-neutral-500"} />
                  <span>
                    <span className="text-neutral-500 text-[10px] mr-1">{idx + 1}.</span>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {/* TEMPLATES VIEW */}
        {currentView === "templates" && (
          <StudioTemplateManager
            currentConfig={config}
            onApplyPreset={onApplyTemplatePreset}
            onApplyConfig={(newConfig) => updateConfig(() => newConfig)}
          />
        )}

        {/* LAYERS VIEW */}
        {currentView === "layers" && (
          <StudioLayerManager
            config={config}
            onToggleLayerVisibility={onToggleLayerVisibility}
            onToggleLayerLock={onToggleLayerLock}
            onMoveLayer={onMoveLayer}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setCurrentView("categories");
            }}
          />
        )}

        {/* CATEGORIES VIEW */}
        {currentView === "categories" && (
          <div className="max-w-3xl space-y-6">
            {/* 1. LAYOUT & STRUCTURE */}
            {activeCategory === "layout" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">LAYOUT & STRUCTURE</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Configure structural presets, card max-width, alignment, and container padding.
                  </p>
                </div>

                {/* Preset Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Layout Structure Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        "centered",
                        "left",
                        "right",
                        "minimal",
                        "card",
                        "split",
                        "wide",
                        "compact",
                      ] as LayoutPreset[]
                    ).map((preset) => (
                      <button
                        key={preset}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            layout: {
                              ...prev.layout,
                              preset,
                              alignment:
                                preset === "left" ? "left" : preset === "right" ? "right" : "center",
                            },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          config.layout.preset === preset
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-[#121214] text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div className="capitalize text-xs">{preset}</div>
                        <div className="text-[9px] opacity-70">
                          {preset === "split"
                            ? "Two-column grid"
                            : preset === "left"
                            ? "Left-aligned"
                            : preset === "wide"
                            ? "720px wide"
                            : "Centered profile"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile Alignment */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Profile Horizontal Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, alignment: align },
                            identity: { ...prev.identity, alignment: align },
                            avatar: { ...prev.avatar, alignment: align },
                          }))
                        }
                        className={`py-2 rounded-lg border text-center capitalize cursor-pointer transition-colors ${
                          config.layout.alignment === align
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width & Padding Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Container Max Width</span>
                      <span className="text-white font-bold">{config.layout.maxWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={460}
                      max={900}
                      step={10}
                      value={config.layout.maxWidth}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, maxWidth: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Card Padding</span>
                      <span className="text-white font-bold">{config.layout.padding}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={64}
                      step={4}
                      value={config.layout.padding}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, padding: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Element Spacing Gap</span>
                      <span className="text-white font-bold">{config.layout.gap}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={48}
                      step={4}
                      value={config.layout.gap}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, gap: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Card Corner Radius</span>
                      <span className="text-white font-bold">{config.discordRpc.borderRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={2}
                      value={config.discordRpc.borderRadius}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          discordRpc: { ...prev.discordRpc, borderRadius: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROFILE IDENTITY */}
            {activeCategory === "identity" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">PROFILE IDENTITY</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Configure your display name, bio typography, colors, and badge styling.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Public Display Name"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Biography
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell the world about yourself..."
                      rows={3}
                      className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-white text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Title Font & Sizing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Display Name Font</label>
                    <select
                      value={config.identity.titleFont}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, titleFont: e.target.value },
                        }))
                      }
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white text-xs focus:outline-none"
                    >
                      {CURATED_FONTS.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Title Font Size</span>
                      <span className="text-white font-bold">{config.identity.titleSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={44}
                      step={1}
                      value={config.identity.titleSize}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, titleSize: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Badge Style */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Profile Badge Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["pill", "glyph", "neon", "hidden"] as BadgeStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            identity: { ...prev.identity, badgeStyle: style },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                          config.identity.badgeStyle === style
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Display Name Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {ACCENTS.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            identity: { ...prev.identity, titleColor: c },
                          }))
                        }
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          config.identity.titleColor === c
                            ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                            : "border-neutral-700"
                        }`}
                      />
                    ))}
                    <input
                      type="text"
                      value={config.identity.titleColor}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, titleColor: e.target.value },
                        }))
                      }
                      className="bg-black border border-neutral-800 rounded px-2 py-1 text-xs text-white w-24 ml-2"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. AVATAR & IMAGES */}
            {activeCategory === "avatar" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">AVATAR & IMAGES</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Configure avatar shapes, image scaling, borders, outer glows, and hover effects.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Avatar Image URL
                    </label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://... (PNG/JPG/GIF)"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Banner Image URL
                    </label>
                    <input
                      type="text"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://... (Header Banner)"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white text-xs"
                    />
                  </div>
                </div>

                {/* Avatar Shape */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Avatar Geometric Shape
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["circle", "square", "rounded", "squircle"] as const).map((shape) => (
                      <button
                        key={shape}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            avatar: { ...prev.avatar, shape },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                          config.avatar.shape === shape
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment & Object Fit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Avatar Alignment</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              avatar: { ...prev.avatar, alignment: align },
                            }))
                          }
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${
                            config.avatar.alignment === align
                              ? "bg-white text-black font-bold"
                              : "bg-black text-neutral-400 hover:text-white"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Image Scaling / Fit</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["cover", "contain", "fill"] as const).map((fit) => (
                        <button
                          key={fit}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              avatar: { ...prev.avatar, objectFit: fit },
                            }))
                          }
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${
                            config.avatar.objectFit === fit
                              ? "bg-white text-black font-bold"
                              : "bg-black text-neutral-400 hover:text-white"
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sizing & Offset Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Avatar Dimensions</span>
                      <span className="text-white font-bold">{config.avatar.size}px</span>
                    </div>
                    <input
                      type="range"
                      min={64}
                      max={160}
                      step={4}
                      value={config.avatar.size}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          avatar: { ...prev.avatar, size: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Border Width</span>
                      <span className="text-white font-bold">{config.avatar.borderWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={config.avatar.borderWidth}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          avatar: { ...prev.avatar, borderWidth: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Vertical Offset</span>
                      <span className="text-white font-bold">{config.avatar.offsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={40}
                      step={2}
                      value={config.avatar.offsetY}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          avatar: { ...prev.avatar, offsetY: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Hover Animation</label>
                    <select
                      value={config.avatar.hoverAnimation}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          avatar: { ...prev.avatar, hoverAnimation: e.target.value as "none" | "scale" | "rotate" | "pulse" },
                        }))
                      }
                      className="w-full bg-black border border-neutral-800 rounded p-1.5 text-white text-xs"
                    >
                      <option value="none">None</option>
                      <option value="scale">Scale Up</option>
                      <option value="rotate">Subtle Rotate</option>
                      <option value="pulse">Pulse Glow</option>
                    </select>
                  </div>
                </div>

                {/* Outer Glow Toggle & Color */}
                <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">Avatar Outer Glow</span>
                    <p className="text-[10px] text-neutral-500">Adds an atmospheric neon bloom ring</p>
                  </div>
                  <button
                    onClick={() =>
                      updateConfig((prev) => ({
                        ...prev,
                        avatar: { ...prev.avatar, glow: !prev.avatar.glow },
                      }))
                    }
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                      config.avatar.glow ? "bg-white text-black" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {config.avatar.glow ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            )}

            {/* 4. BACKGROUNDS */}
            {activeCategory === "background" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">BACKGROUND ATMOSPHERE</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Solid color, dynamic CSS gradients, mesh patterns, dot matrices, and image overlays.
                  </p>
                </div>

                {/* Background Type */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Background Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["solid", "gradient", "mesh", "image"] as BackgroundType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, type },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                          config.background.type === type
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Color Picker */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Base Background Color
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {ACCENTS.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, color: c },
                          }))
                        }
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          config.background.color === c
                            ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                            : "border-neutral-700"
                        }`}
                      />
                    ))}
                    <input
                      type="text"
                      value={config.background.color}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          background: { ...prev.background, color: e.target.value },
                        }))
                      }
                      className="bg-black border border-neutral-800 rounded px-2 py-1 text-xs text-white w-24 ml-2"
                      placeholder="#050505"
                    />
                  </div>
                </div>

                {/* Pattern Overlays */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Atmospheric Pattern Overlay
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(["none", "dots", "grid", "scanlines", "matrix"] as PatternType[]).map((pat) => (
                      <button
                        key={pat}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, pattern: pat },
                          }))
                        }
                        className={`py-2 rounded-lg border text-center capitalize cursor-pointer transition-colors ${
                          config.background.pattern === pat
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image URL & Controls if type === image */}
                {config.background.type === "image" && (
                  <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 uppercase">
                        Background Image URL
                      </label>
                      <input
                        type="text"
                        value={config.background.imageUrl || ""}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, imageUrl: e.target.value },
                          }))
                        }
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div>
                        <label className="text-[10px] text-neutral-400">Position</label>
                        <select
                          value={config.background.position}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, position: e.target.value },
                            }))
                          }
                          className="w-full bg-black border border-neutral-700 rounded p-1.5 text-white text-xs"
                        >
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400">Repeat</label>
                        <select
                          value={config.background.repeat}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, repeat: e.target.value as "no-repeat" | "repeat" | "repeat-x" | "repeat-y" },
                            }))
                          }
                          className="w-full bg-black border border-neutral-700 rounded p-1.5 text-white text-xs"
                        >
                          <option value="no-repeat">No Repeat</option>
                          <option value="repeat">Repeat</option>
                          <option value="repeat-x">Repeat X</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400">Size</label>
                        <select
                          value={config.background.size}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, size: e.target.value as "cover" | "contain" | "auto" },
                            }))
                          }
                          className="w-full bg-black border border-neutral-700 rounded p-1.5 text-white text-xs"
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blur & Overlay Dimming */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Backdrop Blur</span>
                      <span className="text-white font-bold">{config.background.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={2}
                      value={config.background.blur}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          background: { ...prev.background, blur: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Overlay Dimming</span>
                      <span className="text-white font-bold">{config.background.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={config.background.opacity}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          background: {
                            ...prev.background,
                            opacity: Number(e.target.value),
                            overlayOpacity: Number(e.target.value) / 100,
                          },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. TYPOGRAPHY & FONTS */}
            {activeCategory === "typography" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">TYPOGRAPHY & FONTS</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Select from curated Google Fonts, letter spacing, and line height settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Heading Font Family</label>
                    <select
                      value={config.typography.headingFont}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, headingFont: e.target.value },
                          identity: { ...prev.identity, titleFont: e.target.value },
                        }))
                      }
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white text-xs focus:outline-none"
                    >
                      {CURATED_FONTS.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Body & Bio Font Family</label>
                    <select
                      value={config.typography.bodyFont}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, bodyFont: e.target.value },
                          identity: { ...prev.identity, bioFont: e.target.value },
                        }))
                      }
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white text-xs focus:outline-none"
                    >
                      {CURATED_FONTS.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Letter Spacing</span>
                      <span className="text-white font-bold">{config.typography.letterSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min={-2}
                      max={6}
                      step={0.5}
                      value={config.typography.letterSpacing}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            letterSpacing: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Line Height</span>
                      <span className="text-white font-bold">{config.typography.lineHeight}</span>
                    </div>
                    <input
                      type="range"
                      min={1.1}
                      max={2.0}
                      step={0.05}
                      value={config.typography.lineHeight}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, lineHeight: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. DISCORD RICH PRESENCE (CRITICAL INDEPENDENT CONTROLS) */}
            {activeCategory === "rpc" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Gamepad2 size={16} className="text-white" />
                    DISCORD RICH PRESENCE CONTROLS
                  </h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Configure independent website visibility vs Discord publishing, card styling, and telemetry.
                  </p>
                </div>

                {/* INDEPENDENT VISIBILITY CONTROLS MATRIX */}
                <div className="p-4 rounded-xl border border-neutral-700 bg-[#101015] space-y-4">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-300">
                    INDEPENDENT VISIBILITY & PUBLISHING SWITCHES
                  </div>

                  {/* Switch A: Website Profile RPC */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black border border-neutral-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">Website Profile RPC</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            config.discordRpc.showProfileRpc
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {config.discordRpc.showProfileRpc ? "VISIBLE" : "HIDDEN"}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Displays the Discord RPC card on your public Pixel.gg profile page.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        updateConfig((prev) => {
                          const nextState = !prev.discordRpc.showProfileRpc;
                          return {
                            ...prev,
                            discordRpc: { ...prev.discordRpc, showProfileRpc: nextState },
                            layers: prev.layers.map((l) =>
                              l.id === "rpc" ? { ...l, visible: nextState } : l
                            ),
                          };
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        config.discordRpc.showProfileRpc
                          ? "bg-white text-black hover:bg-neutral-200"
                          : "bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {config.discordRpc.showProfileRpc ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  {/* Switch B: Discord RPC (PixelsRPC publishing) */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black border border-neutral-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">Discord RPC (PixelsRPC)</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            config.discordRpc.enableDiscordRpc
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {config.discordRpc.enableDiscordRpc ? "PUBLISHING" : "STOPPED"}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Controls whether your configured activity is sent to Discord through PixelsRPC.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          discordRpc: {
                            ...prev.discordRpc,
                            enableDiscordRpc: !prev.discordRpc.enableDiscordRpc,
                          },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        config.discordRpc.enableDiscordRpc
                          ? "bg-white text-black hover:bg-neutral-200"
                          : "bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {config.discordRpc.enableDiscordRpc ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  {/* Matrix Callout */}
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
                    <span>
                      Active State:{" "}
                      <strong className="text-white">
                        {config.discordRpc.showProfileRpc && config.discordRpc.enableDiscordRpc
                          ? "Visible on website & published to Discord"
                          : config.discordRpc.showProfileRpc && !config.discordRpc.enableDiscordRpc
                          ? "Visible only on website"
                          : !config.discordRpc.showProfileRpc && config.discordRpc.enableDiscordRpc
                          ? "Published to Discord, hidden on website"
                          : "Hidden in both destinations"}
                      </strong>
                    </span>
                    <a
                      href="/account/rpc"
                      target="_blank"
                      className="text-white hover:underline flex items-center gap-1 font-semibold"
                    >
                      RPC Config <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Card Styles */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    RPC Card Visual Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["card", "glass", "minimal", "compact", "neon"] as RpcStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            discordRpc: { ...prev.discordRpc, style },
                          }))
                        }
                        className={`py-2 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                          config.discordRpc.style === style
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Layout & Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Image Alignment Layout</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(["left", "right", "stacked", "hidden"] as RpcImageLayout[]).map((layout) => (
                        <button
                          key={layout}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              discordRpc: { ...prev.discordRpc, imageLayout: layout },
                            }))
                          }
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${
                            config.discordRpc.imageLayout === layout
                              ? "bg-white text-black font-bold"
                              : "bg-black text-neutral-400 hover:text-white"
                          }`}
                        >
                          {layout}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <label className="text-neutral-400 text-[11px]">Activity Image Size</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["small", "medium", "large"] as RpcImageSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              discordRpc: { ...prev.discordRpc, imageSize: size },
                            }))
                          }
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${
                            config.discordRpc.imageSize === size
                              ? "bg-white text-black font-bold"
                              : "bg-black text-neutral-400 hover:text-white"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Telemetry & Elapsed Timer Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Live Telemetry Badge</span>
                      <p className="text-[10px] text-neutral-500">Pulsing green live beacon</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          discordRpc: {
                            ...prev.discordRpc,
                            showTelemetryBadge: !prev.discordRpc.showTelemetryBadge,
                          },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.discordRpc.showTelemetryBadge
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.discordRpc.showTelemetryBadge ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Elapsed Timer</span>
                      <p className="text-[10px] text-neutral-500">Real-time ticking duration</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          discordRpc: {
                            ...prev.discordRpc,
                            showTimer: !prev.discordRpc.showTimer,
                          },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.discordRpc.showTimer
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.discordRpc.showTimer ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. BUTTONS & SOCIALS */}
            {activeCategory === "buttons" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">BUTTONS & SOCIAL LINKS</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Customize button styles, hover animations, corner curves, and social pill icons.
                  </p>
                </div>

                {/* Button Style Variants */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Button Visual Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        "solid-white",
                        "glass",
                        "neon",
                        "minimal",
                        "outline",
                        "gradient",
                      ] as ButtonVariant[]
                    ).map((variant) => (
                      <button
                        key={variant}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            buttons: { ...prev.buttons, variant },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                          config.buttons.variant === variant
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        {variant.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Icons Style */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Social Icons Visual Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["minimal", "pill", "glass", "neon", "circle"] as SocialIconStyle[]).map(
                      (style) => (
                        <button
                          key={style}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              socials: { ...prev.socials, style },
                            }))
                          }
                          className={`py-2 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                            config.socials.style === style
                              ? "border-white bg-white text-black font-bold"
                              : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                          }`}
                        >
                          {style}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Sliders for Buttons & Socials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Button Corner Radius</span>
                      <span className="text-white font-bold">{config.buttons.borderRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={2}
                      value={config.buttons.borderRadius}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          buttons: { ...prev.buttons, borderRadius: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 text-[11px]">Social Icon Size</span>
                      <span className="text-white font-bold">{config.socials.iconSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={24}
                      step={2}
                      value={config.socials.iconSize}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          socials: { ...prev.socials, iconSize: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. EFFECTS & ANIMATIONS */}
            {activeCategory === "effects" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">EFFECTS & AMBIENT ANIMATIONS</h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Multi-effect particle canvas, glassmorphism, ambient edge glows, and background audio.
                  </p>
                </div>

                {/* Particle System Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Ambient Particle System
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(["None", "Snow", "Stars", "Fireflies", "Rain", "Matrix"] as ParticleEffect[]).map(
                      (effect) => (
                        <button
                          key={effect}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              effects: { ...prev.effects, particles: effect },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                            config.effects.particles === effect
                              ? "border-white bg-white text-black font-bold"
                              : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                          }`}
                        >
                          {effect}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Music Player Configuration */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-[#101012] space-y-3">
                  <div className="flex items-center gap-2">
                    <Music size={14} className="text-white" />
                    <span className="text-white font-bold text-xs">Profile Music Stream</span>
                  </div>
                  <input
                    type="text"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="https://... (Direct audio stream or MP3 URL)"
                    className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-xs"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Visitors click anywhere to start playback (browser autoplay compliance).
                  </p>
                </div>

                {/* Glassmorphism & Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Glassmorphic Frost</span>
                      <p className="text-[10px] text-neutral-500">Translucent frosted glass</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          effects: { ...prev.effects, glassmorphism: !prev.effects.glassmorphism },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.effects.glassmorphism
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.effects.glassmorphism ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Ambient Edge Glow</span>
                      <p className="text-[10px] text-neutral-500">Diffused border bloom</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          effects: { ...prev.effects, ambientGlow: !prev.effects.ambientGlow },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.effects.ambientGlow
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.effects.ambientGlow ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">3D Tilt on Hover</span>
                      <p className="text-[10px] text-neutral-500">Parallax cursor motion</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          effects: { ...prev.effects, tiltEffect: !prev.effects.tiltEffect },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.effects.tiltEffect
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.effects.tiltEffect ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Retro Scanlines</span>
                      <p className="text-[10px] text-neutral-500">CRT cathode ray lines</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          effects: { ...prev.effects, scanlines: !prev.effects.scanlines },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.effects.scanlines
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.effects.scanlines ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 9. CUSTOM CSS */}
            {activeCategory === "css" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Code2 size={16} className="text-white" />
                    SCOPED CUSTOM CSS
                  </h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Write scoped CSS rules. Target selectors like <code className="text-white">.profile-container</code>,{" "}
                    <code className="text-white">.profile-avatar</code>, <code className="text-white">.discord-rpc</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-emerald-400" />
                    <span className="text-xs text-white">Sandbox Isolation Active</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    Scope: .profile-page-root
                  </span>
                </div>

                {/* Quick Snippets */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    1-Click Starter Snippets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        insertSnippet(
                          `@keyframes rgbBorder {\n  0% { border-color: #ff0055; }\n  50% { border-color: #00ffcc; }\n  100% { border-color: #ff0055; }\n}\n.profile-container {\n  animation: rgbBorder 6s infinite ease-in-out;\n}`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white cursor-pointer text-[10px]"
                    >
                      + RGB Pulsing Border
                    </button>
                    <button
                      onClick={() =>
                        insertSnippet(
                          `@keyframes floatSlow {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}\n.profile-avatar {\n  animation: floatSlow 4s infinite ease-in-out;\n}`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white cursor-pointer text-[10px]"
                    >
                      + Floating Avatar
                    </button>
                    <button
                      onClick={() =>
                        insertSnippet(
                          `.discord-rpc {\n  box-shadow: 0 0 30px rgba(88, 101, 242, 0.35) !important;\n  border-color: #5865F2 !important;\n}`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white cursor-pointer text-[10px]"
                    >
                      + Discord Glow
                    </button>
                  </div>
                </div>

                {/* CSS Editor */}
                <div className="space-y-2">
                  <textarea
                    value={config.customCss || ""}
                    onChange={(e) => handleCssChange(e.target.value)}
                    placeholder="/* Custom CSS */&#10;.profile-container {&#10;  border-color: #ffffff;&#10;}"
                    rows={12}
                    className="w-full bg-[#050505] border border-neutral-800 rounded-xl p-4 text-emerald-400 font-mono text-xs focus:outline-none focus:border-white resize-y"
                    spellCheck={false}
                  />

                  {cssValidation.error && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-[11px] flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                      <span>{cssValidation.error}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 10. ADVANCED SETTINGS */}
            {activeCategory === "advanced" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings size={16} className="text-white" />
                    ADVANCED WORKSPACE SETTINGS
                  </h3>
                  <p className="text-neutral-400 text-[11px] pt-0.5">
                    Wireframe guides, platform badges, watermark toggles, and JSON import/export.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Wireframe Guides</span>
                      <p className="text-[10px] text-neutral-500">Show element bounds in editor</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            wireframeMode: !prev.advanced?.wireframeMode,
                          },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.advanced?.wireframeMode
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.advanced?.wireframeMode ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold">Watermark Pill</span>
                      <p className="text-[10px] text-neutral-500">Display &quot;Built with Pixel.gg&quot;</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            watermark: !prev.advanced?.watermark,
                          },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        config.advanced?.watermark
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {config.advanced?.watermark ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                {/* Raw Config Export / Import */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-[#101012] space-y-3">
                  <span className="text-white font-semibold text-xs flex items-center gap-2">
                    <FileCode size={14} /> Raw Design Configuration (JSON)
                  </span>
                  <textarea
                    readOnly
                    value={JSON.stringify(config, null, 2)}
                    rows={6}
                    className="w-full bg-black border border-neutral-800 rounded p-3 text-neutral-400 text-[10px] font-mono resize-none focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                        alert("Configuration copied to clipboard!");
                      }}
                      className="px-3 py-1 rounded bg-neutral-800 text-neutral-200 hover:text-white cursor-pointer text-[10px]"
                    >
                      Copy JSON to Clipboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
