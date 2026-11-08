"use client";

import React, { useState } from "react";
import {
  Layout,
  User,
  Image as ImageIcon,
  Type,
  Gamepad2,
  Link2,
  Sparkles,
  Code2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
} from "lucide-react";
import { ProfileDesignConfig } from "@/types/studio";
import { TEMPLATE_PRESETS, StudioTemplatePreset } from "./templates";

export type StudioTab =
  | "layout"
  | "identity"
  | "background"
  | "typography"
  | "rpc"
  | "buttons"
  | "effects"
  | "css"
  | "templates"
  | "layers";

interface StudioLeftPanelProps {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  config: ProfileDesignConfig;
  onApplyTemplate: (preset: StudioTemplatePreset) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
}

export const StudioLeftPanel: React.FC<StudioLeftPanelProps> = ({
  activeTab,
  setActiveTab,
  config,
  onApplyTemplate,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onMoveLayer,
}) => {
  const [navSection, setNavSection] = useState<"categories" | "templates" | "layers">("categories");

  const CATEGORIES = [
    { id: "layout" as StudioTab, label: "Layout & Structure", icon: Layout, desc: "Presets, width, alignment & gaps" },
    { id: "identity" as StudioTab, label: "Profile Identity", icon: User, desc: "Name, bio, badges & title styling" },
    { id: "background" as StudioTab, label: "Backgrounds", icon: ImageIcon, desc: "Gradients, solid, patterns & blur" },
    { id: "typography" as StudioTab, label: "Typography & Fonts", icon: Type, desc: "Curated Google fonts & sizing" },
    { id: "rpc" as StudioTab, label: "Discord Rich Presence", icon: Gamepad2, desc: "RPC style, images & telemetry" },
    { id: "buttons" as StudioTab, label: "Buttons & Socials", icon: Link2, desc: "Gradients, variants & icon shapes" },
    { id: "effects" as StudioTab, label: "Effects & Shaders", icon: Sparkles, desc: "Glassmorphism, particles & glow" },
    { id: "css" as StudioTab, label: "Custom Code / CSS", icon: Code2, desc: "Scoped styling & CSS overrides" },
  ];

  return (
    <aside className="w-full sm:w-72 lg:w-80 h-full border-r border-[#202020] bg-[#0c0c0e] flex flex-col shrink-0 text-xs font-mono text-[#ededed] select-none">
      {/* Top Section Nav Tabs */}
      <div className="grid grid-cols-3 border-b border-[#202020] bg-[#101012] text-[10px] font-semibold text-neutral-400">
        <button
          onClick={() => {
            setNavSection("categories");
            if (activeTab === "templates" || activeTab === "layers") setActiveTab("layout");
          }}
          className={`py-2.5 text-center transition-colors cursor-pointer border-r border-[#202020] ${
            navSection === "categories" ? "bg-[#18181b] text-white font-bold" : "hover:text-white"
          }`}
        >
          CATEGORIES
        </button>
        <button
          onClick={() => {
            setNavSection("templates");
            setActiveTab("templates");
          }}
          className={`py-2.5 text-center transition-colors cursor-pointer border-r border-[#202020] ${
            navSection === "templates" ? "bg-[#18181b] text-white font-bold" : "hover:text-white"
          }`}
        >
          TEMPLATES
        </button>
        <button
          onClick={() => {
            setNavSection("layers");
            setActiveTab("layers");
          }}
          className={`py-2.5 text-center transition-colors cursor-pointer ${
            navSection === "layers" ? "bg-[#18181b] text-white font-bold" : "hover:text-white"
          }`}
        >
          LAYERS
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {/* 1. Categories Mode */}
        {navSection === "categories" && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-widest">
              DESIGN CONTROLS
            </div>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                    isActive
                      ? "bg-white text-black border-white shadow-md font-semibold"
                      : "bg-[#141416]/60 border-[#222224] text-neutral-300 hover:bg-[#1a1a1d] hover:border-[#333336]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-black text-white" : "bg-[#1c1c1f] text-neutral-400 group-hover:text-white"
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs">{cat.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          isActive ? "text-neutral-600 font-normal" : "text-neutral-500"
                        }`}
                      >
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={12}
                    className={`shrink-0 transition-transform ${
                      isActive ? "text-black translate-x-0.5" : "text-neutral-600 group-hover:text-neutral-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* 2. Templates Mode */}
        {navSection === "templates" && (
          <div className="space-y-2">
            <div className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-widest flex items-center justify-between">
              <span>STARTER PRESETS</span>
              <span className="text-white font-bold">{TEMPLATE_PRESETS.length}</span>
            </div>
            <div className="space-y-2">
              {TEMPLATE_PRESETS.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onApplyTemplate(tmpl)}
                  className="p-3 rounded-xl bg-[#141416] border border-[#222224] hover:border-white/50 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tmpl.accentColor }}
                      />
                      <span className="font-bold text-xs text-white group-hover:text-white">
                        {tmpl.name}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f1f23] text-neutral-400 uppercase">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    {tmpl.description}
                  </p>
                  <div className="pt-1 flex items-center justify-end text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    Apply Template ↗
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Layers Mode */}
        {navSection === "layers" && (
          <div className="space-y-2">
            <div className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-widest flex items-center justify-between">
              <span>PROFILE LAYERS</span>
              <span className="text-neutral-400 text-[10px]">Reorder & Visibility</span>
            </div>
            <div className="space-y-1.5">
              {config.layers?.map((layer, index) => (
                <div
                  key={layer.id}
                  className="p-2.5 rounded-xl bg-[#141416] border border-[#222224] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex flex-col gap-0.5 text-neutral-600">
                      <button
                        onClick={() => onMoveLayer(layer.id, "up")}
                        disabled={index === 0}
                        className="hover:text-white disabled:opacity-20 cursor-pointer text-[10px]"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMoveLayer(layer.id, "down")}
                        disabled={index === config.layers.length - 1}
                        className="hover:text-white disabled:opacity-20 cursor-pointer text-[10px]"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-white font-medium truncate">{layer.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleLayerLock(layer.id)}
                      className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title={layer.locked ? "Unlock element" : "Lock element"}
                    >
                      {layer.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                    </button>
                    <button
                      onClick={() => onToggleLayerVisibility(layer.id)}
                      className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title={layer.visible ? "Hide element" : "Show element"}
                    >
                      {layer.visible ? <Eye size={13} className="text-white" /> : <EyeOff size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
