"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
  PanelLeftClose,
  X,
  Grid,
  Command,
  ArrowLeft,
  Lock,
  Unlock,
  Keyboard,
  RotateCcw,
  Maximize2,
  Copy,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Columns,
  Square,
  Check,
} from "lucide-react";
import {
  ProfileDesignConfig,
  DEFAULT_DESIGN_CONFIG,
  DEFAULT_GRID_SETTINGS,
  StudioTab,
  WorkspaceTransparencyMode,
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
  CanvasEmbed,
  CanvasElement,
} from "@/types/studio";
import { CURATED_FONTS } from "./fonts";
import { validateCss } from "./cssUtils";
import { StudioTemplateManager } from "./StudioTemplateManager";
import { StudioLayerManager } from "./StudioLayerManager";
import { StudioTemplatePreset } from "./templates";
import { BackgroundCustomizerModal } from "./BackgroundCustomizerModal";

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
  onAddEmbed?: () => void;
  onAddElement?: (type: any) => void;
  onOpenSocialSelector?: () => void;
  onOpenRpcCustomizer?: () => void;
  onDuplicateLayer?: (layerId: string) => void;
  onDeleteLayer?: (layerId: string) => void;
  selectedId?: string | null;
  onSelectElement?: (id: string) => void;
  onBack?: () => void;

  // Workspace Appearance & Transparency
  transparencyMode?: WorkspaceTransparencyMode;
  panelOpacity?: number;
  panelBlur?: number;
  panelBorderOpacity?: number;
  onCollapsePanel?: () => void;
  isFloatingContext?: boolean;
  onClose?: () => void;
  panelSize?: number;
  dockWidth?: number;
  isVertical?: boolean;
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
  onAddEmbed,
  onAddElement,
  onOpenSocialSelector,
  onOpenRpcCustomizer,
  onDuplicateLayer,
  onDeleteLayer,
  selectedId,
  onSelectElement,
  onBack,
  transparencyMode = "solid",
  panelOpacity = 85,
  panelBlur = 12,
  panelBorderOpacity = 30,
  onCollapsePanel,
  isFloatingContext = false,
  onClose,
  panelSize,
  dockWidth,
  isVertical = false,
}) => {
  const [cssValidation, setCssValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isRecordingLockShortcut, setIsRecordingLockShortcut] = useState(false);
  const [recordedShortcut, setRecordedShortcut] = useState("");

  // Outer container ref for stable, non-feedback measurement
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const [measuredOuterWidth, setMeasuredOuterWidth] = useState<number>(540);

  useEffect(() => {
    if (!outerContainerRef.current) return;
    const update = () => {
      if (outerContainerRef.current) {
        setMeasuredOuterWidth(outerContainerRef.current.clientWidth);
      }
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      let lastWidth = outerContainerRef.current.clientWidth;
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.round(entry.contentRect.width);
          // 4px deadband eliminates subpixel / fractional rounding jitter
          if (w > 0 && Math.abs(w - lastWidth) > 4) {
            lastWidth = w;
            setMeasuredOuterWidth(w);
          }
        }
      });
      ro.observe(outerContainerRef.current);
      return () => ro.disconnect();
    }
  }, []);

  const rawPanelSize = panelSize ?? config.advanced?.moreOptionsPanelSize ?? 100;
  const currentSizePct = Math.max(40, Math.min(100, rawPanelSize));

  // Determine effective percentage with a single, stable source of truth:
  // 1. If panelSize prop is passed from StudioFloatingDock, it is already computed
  //    accounting for user preferences, dock orientation, and screen constraints.
  // 2. Otherwise fall back to config settings and outer measured width.
  const effectivePct = useMemo(() => {
    if (panelSize !== undefined) {
      return Math.max(40, Math.min(100, panelSize));
    }
    const userPct = currentSizePct;
    const width = dockWidth || measuredOuterWidth;
    if (width && width < 535) {
      const base = isVertical ? 420 : 540;
      const constrainedMaxPct = Math.round((width / base) * 100);
      if (constrainedMaxPct < userPct) {
        return Math.max(40, Math.min(100, constrainedMaxPct));
      }
    }
    return Math.max(40, Math.min(100, userPct));
  }, [panelSize, currentSizePct, dockWidth, measuredOuterWidth, isVertical]);

  // Clean, mutually exclusive & hierarchical tiers:
  // 100% (>90): Full interface
  // 90%  (81–90): Slightly compact
  // 80%  (71–80): Moderately compact
  // 70%  (61–70): Stable reduced information
  // 60%  (46–60): Compact controls
  // 40%  (40–45): Minimum-size interface
  const is90OrBelow = effectivePct <= 90;
  const is80OrBelow = effectivePct <= 80;
  const is70OrBelow = effectivePct <= 70;
  const is60OrBelow = effectivePct <= 60;
  const is40OrBelow = effectivePct <= 45;
  const [shortcutConflictWarning, setShortcutConflictWarning] = useState<string | null>(null);

  const checkShortcutConflict = (shortcut: string): string | null => {
    const norm = shortcut.toLowerCase().trim();
    if (norm === "ctrl + z" || norm === "control + z" || norm === "cmd + z") {
      return "Conflicts with Undo action (Ctrl+Z)";
    }
    if (norm === "ctrl + y" || norm === "control + y" || norm === "ctrl + shift + z") {
      return "Conflicts with Redo action (Ctrl+Y)";
    }
    if (norm === "delete" || norm === "backspace") {
      return "Conflicts with Delete Canvas Element";
    }
    if (norm === "escape") {
      return "Conflicts with Deselect / Close (Escape)";
    }
    if (norm === "ctrl + c" || norm === "control + c") {
      return "Conflicts with Copy action";
    }
    if (norm === "ctrl + v" || norm === "control + v") {
      return "Conflicts with Paste action";
    }
    return null;
  };

  React.useEffect(() => {
    if (!isRecordingLockShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsRecordingLockShortcut(false);
        setRecordedShortcut("");
        setShortcutConflictWarning(null);
        return;
      }

      if (e.code === "CapsLock" || e.key === "CapsLock") {
        setRecordedShortcut("CapsLock");
        setShortcutConflictWarning(null);
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");

      const isModifierOnly = ["Control", "Shift", "Alt", "Meta"].includes(e.key);
      if (isModifierOnly) {
        setRecordedShortcut(parts.join(" + ") + (parts.length > 0 ? " + ..." : ""));
        return;
      }

      let keyName = e.key.toUpperCase();
      if (keyName === " ") keyName = "Space";
      parts.push(keyName);

      const captured = parts.join(" + ");
      setRecordedShortcut(captured);
      const conflict = checkShortcutConflict(captured);
      setShortcutConflictWarning(conflict);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isRecordingLockShortcut]);

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

  // Dynamic appearance styles based on transparency mode
  const getWorkspaceStyles = (): React.CSSProperties => {
    switch (transparencyMode) {
      case "transparent":
        return {
          backgroundColor: `rgba(9, 9, 11, ${panelOpacity / 100})`,
        };
      case "glass":
        return {
          backgroundColor: `rgba(12, 12, 16, ${(panelOpacity / 100) * 0.75})`,
          backdropFilter: `blur(${panelBlur}px)`,
          WebkitBackdropFilter: `blur(${panelBlur}px)`,
        };
      case "floating":
        return {
          backgroundColor: `rgba(14, 14, 20, ${(panelOpacity / 100) * 0.85})`,
          backdropFilter: `blur(${panelBlur}px)`,
          WebkitBackdropFilter: `blur(${panelBlur}px)`,
        };
      case "solid":
      default:
        return {
          backgroundColor: "#09090b",
        };
    }
  };

  const getHeaderStyles = (): React.CSSProperties => {
    switch (transparencyMode) {
      case "transparent":
        return {
          backgroundColor: `rgba(13, 13, 16, ${Math.min(1, (panelOpacity / 100) * 1.1)})`,
        };
      case "glass":
      case "floating":
        return {
          backgroundColor: `rgba(13, 13, 16, 0.65)`,
        };
      case "solid":
      default:
        return {
          backgroundColor: "#0d0d0f",
        };
    }
  };

  return (
    <div
      ref={outerContainerRef}
      style={getWorkspaceStyles()}
      className={`flex-1 flex flex-col min-h-0 text-xs font-mono text-[#ededed] select-none transition-colors duration-200 ${transparencyMode === "floating"
          ? "m-2 sm:m-3 rounded-2xl border shadow-2xl overflow-hidden"
          : ""
        }`}
    >
      {/* Top Navigation Row: Contextual Header in Floating Mode vs Sub-Tabs & Category Bar in Classic Mode */}
      {isFloatingContext ? (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101014] shrink-0">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-bold border border-white/10"
                title="Back to App Directory"
              >
                <ArrowLeft size={12} />
                <span>Directory</span>
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
              {currentView === "templates" ? (
                <LayoutTemplate size={14} />
              ) : currentView === "layers" ? (
                <Layers size={14} />
              ) : (
                React.createElement(
                  CATEGORIES.find((c) => c.id === activeCategory)?.icon || Layout,
                  { size: 14 }
                )
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                <span>STUDIO</span>
                <span>/</span>
                <span className="uppercase text-neutral-300">
                  {currentView === "templates"
                    ? "TEMPLATES"
                    : currentView === "layers"
                      ? "LAYERS"
                      : "MODULE"}
                </span>
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {currentView === "templates"
                  ? "Templates & Presets"
                  : currentView === "layers"
                    ? "Layers & Objects"
                    : CATEGORIES.find((c) => c.id === activeCategory)?.label || "Settings"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Settings Panel (Esc)"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={getHeaderStyles()}
          className="border-b border-[#202020] shrink-0 transition-colors duration-200"
        >
          {/* View Switcher: Categories vs Templates vs Layers */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1b1b1e]">
            <div className="flex items-center gap-1 bg-[#141416]/80 p-1 rounded-xl border border-[#242426]">
              <button
                onClick={() => setCurrentView("categories")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${currentView === "categories"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                <Sliders size={13} />
                <span>Categories</span>
              </button>

              <button
                onClick={() => setCurrentView("templates")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${currentView === "templates"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                <LayoutTemplate size={13} />
                <span>Templates</span>
              </button>

              <button
                onClick={() => setCurrentView("layers")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${currentView === "layers"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                <Layers size={13} />
                <span>Layers</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] text-neutral-500 hidden sm:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>REAL-TIME EDITING WORKSPACE</span>
              </div>

              {onCollapsePanel && (
                <button
                  onClick={onCollapsePanel}
                  className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer text-[10px]"
                  title="Collapse Editing Workspace (Focus Live Preview)"
                >
                  <PanelLeftClose size={12} />
                  <span>Collapse</span>
                </button>
              )}
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${isActive
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
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          is40OrBelow ? "p-2.5" : is80OrBelow ? "p-3 sm:p-4" : "p-4 sm:p-6"
        }`}
      >
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
            onAddEmbed={onAddEmbed}
            onAddElement={onAddElement}
            onOpenSocialSelector={onOpenSocialSelector}
            onDuplicateLayer={onDuplicateLayer}
            onDeleteLayer={onDeleteLayer}
            selectedId={selectedId}
            onSelectElement={onSelectElement}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setCurrentView("categories");
            }}
          />
        )}

        {/* CATEGORIES VIEW */}
        {currentView === "categories" && (
          <div className="max-w-3xl space-y-6">
            {/* 1. LAYOUT & STRUCTURE // EMBED BUILDER */}
            {activeCategory === "layout" && (() => {
              const canvasEmbeds = config.canvas?.embeds || [];
              const primaryEmbed = canvasEmbeds.find((em) => em.id === "embed_primary") || canvasEmbeds[0] || null;
              const activeEmbedId =
                selectedId && canvasEmbeds.some((em) => em.id === selectedId)
                  ? selectedId
                  : (primaryEmbed ? primaryEmbed.id : "embed_primary");
              const currentEmbed = canvasEmbeds.find((em) => em.id === activeEmbedId) || primaryEmbed;

              const selectedChildElement =
                selectedId && !canvasEmbeds.some((em) => em.id === selectedId)
                  ? config.canvas?.elements?.find((el) => el.id === selectedId) || null
                  : null;
              const parentEmbedOfChild =
                selectedChildElement?.parentEmbedId
                  ? canvasEmbeds.find((em) => em.id === selectedChildElement.parentEmbedId) || null
                  : null;

              const isPrimary = activeEmbedId === "embed_primary";
              const embedWidth = isPrimary ? config.layout.maxWidth : (currentEmbed?.transform.width || 580);
              const embedPadding = isPrimary ? config.layout.padding : (currentEmbed?.style.padding ?? 24);
              const embedRadius = isPrimary ? config.discordRpc.borderRadius : (currentEmbed?.style.borderRadius ?? 24);
              const embedGap = config.layout.gap ?? 22;
              const appsSpacing = config.layout.appsSpacing ?? 12;

              const childElementsOfCurrentEmbed = currentEmbed
                ? (config.canvas?.elements || []).filter((el) => el.parentEmbedId === currentEmbed.id)
                : [];

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layout size={16} className="text-white" />
                        LAYOUT & STRUCTURE // EMBED BUILDER
                      </h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-bold">
                        {canvasEmbeds.length} {canvasEmbeds.length === 1 ? "EMBED" : "EMBEDS"}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] pt-1">
                      Manage root container embeds, structural layout presets, dimensions, padding, and parent-child hierarchy.
                    </p>
                  </div>

                  {/* Context Banner: If a child element is currently selected */}
                  {selectedChildElement && (
                    <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-950/20 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-sky-300 font-semibold block truncate">
                          Selected Component: {selectedChildElement.name || selectedChildElement.type}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Inside {parentEmbedOfChild ? parentEmbedOfChild.title : "Primary Embed"}
                        </span>
                      </div>
                      {parentEmbedOfChild && (
                        <button
                          type="button"
                          onClick={() => onSelectElement?.(parentEmbedOfChild.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                        >
                          Select Container
                        </button>
                      )}
                    </div>
                  )}

                  {/* SECTION A: EMBED SELECTOR & MANAGEMENT TOOLBAR */}
                  <div className="p-4 rounded-xl border border-neutral-800 bg-[#101014] space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Layers size={12} className="text-cyan-400" />
                        Embed Containers
                      </label>
                      <button
                        type="button"
                        onClick={() => onAddEmbed?.()}
                        className="px-2.5 py-1 rounded-lg bg-white text-black font-bold text-[10px] flex items-center gap-1 hover:bg-neutral-200 cursor-pointer transition-colors"
                      >
                        <Plus size={12} /> Add Embed
                      </button>
                    </div>

                    {/* Embed Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {canvasEmbeds.map((em, idx) => {
                        const isCurrent = em.id === activeEmbedId;
                        const childCount = (config.canvas?.elements || []).filter((el) => el.parentEmbedId === em.id).length;
                        return (
                          <button
                            key={em.id}
                            type="button"
                            onClick={() => onSelectElement?.(em.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                              isCurrent
                                ? "bg-white text-black border-white shadow-md font-bold"
                                : "bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                            }`}
                          >
                            <span>{em.title || (em.id === "embed_primary" ? "Main Container" : `Embed #${idx + 1}`)}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                isCurrent ? "bg-black/20 text-black" : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {childCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Embed Configuration Strip */}
                    {currentEmbed && (
                      <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="text-[10px] text-neutral-500 font-mono uppercase">Title:</span>
                          <input
                            type="text"
                            value={currentEmbed.title || ""}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              updateConfig((prev) => {
                                if (!prev.canvas) return prev;
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id ? { ...em, title: newTitle } : em
                                );
                                const updatedLayers = prev.layers.map((l) =>
                                  l.id === currentEmbed.id ? { ...l, label: newTitle } : l
                                );
                                return {
                                  ...prev,
                                  layers: updatedLayers,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              });
                            }}
                            className="bg-black border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white font-mono flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Duplicate */}
                          <button
                            type="button"
                            title="Duplicate Embed and its elements"
                            onClick={() => {
                              const newEmbedId = `embed_${Date.now()}`;
                              const newTitle = `${currentEmbed.title || "Embed"} (Copy)`;
                              updateConfig((prev) => {
                                const currentCanvas = prev.canvas || { embeds: [], elements: [] };
                                const newEmbed: CanvasEmbed = {
                                  ...currentEmbed,
                                  id: newEmbedId,
                                  title: newTitle,
                                  transform: {
                                    ...currentEmbed.transform,
                                    y: currentEmbed.transform.y + (currentEmbed.transform.height || 300) + 24,
                                    zIndex: currentCanvas.embeds.length + 1,
                                  },
                                  childrenIds: [],
                                };

                                const sourceChildren = currentCanvas.elements.filter((el) => el.parentEmbedId === currentEmbed.id);
                                const newChildren: CanvasElement[] = sourceChildren.map((el, i) => {
                                  const newChildId = `${el.type}_${Date.now()}_${i}`;
                                  newEmbed.childrenIds.push(newChildId);
                                  return {
                                    ...el,
                                    id: newChildId,
                                    parentEmbedId: newEmbedId,
                                    name: `${el.name} (Copy)`,
                                  };
                                });

                                return {
                                  ...prev,
                                  layers: [
                                    ...prev.layers,
                                    {
                                      id: newEmbedId,
                                      type: "container",
                                      label: newTitle,
                                      visible: true,
                                      locked: false,
                                    },
                                  ],
                                  canvas: {
                                    ...currentCanvas,
                                    embeds: [...currentCanvas.embeds, newEmbed],
                                    elements: [...currentCanvas.elements, ...newChildren],
                                    selectedId: newEmbedId,
                                    selectedIds: [newEmbedId],
                                  },
                                };
                              });
                              onSelectElement?.(newEmbedId);
                            }}
                            className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:border-neutral-700 cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Visibility Toggle */}
                          <button
                            type="button"
                            title={currentEmbed.isVisible === false ? "Show Embed" : "Hide Embed"}
                            onClick={() => {
                              updateConfig((prev) => {
                                if (!prev.canvas) return prev;
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id ? { ...em, isVisible: em.isVisible === false ? true : false } : em
                                );
                                return {
                                  ...prev,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              });
                            }}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              currentEmbed.isVisible === false
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {currentEmbed.isVisible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          {/* Lock Toggle */}
                          <button
                            type="button"
                            title={currentEmbed.isLocked ? "Unlock Embed" : "Lock Embed"}
                            onClick={() => {
                              updateConfig((prev) => {
                                if (!prev.canvas) return prev;
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id ? { ...em, isLocked: !em.isLocked } : em
                                );
                                return {
                                  ...prev,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              });
                            }}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              currentEmbed.isLocked
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {currentEmbed.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>

                          {/* Delete (disabled for primary) */}
                          {!isPrimary && (
                            <button
                              type="button"
                              title="Delete Embed"
                              onClick={() => {
                                updateConfig((prev) => {
                                  if (!prev.canvas) return prev;
                                  return {
                                    ...prev,
                                    layers: prev.layers.filter((l) => l.id !== currentEmbed.id),
                                    canvas: {
                                      ...prev.canvas,
                                      embeds: prev.canvas.embeds.filter((em) => em.id !== currentEmbed.id),
                                      elements: prev.canvas.elements.filter((el) => el.parentEmbedId !== currentEmbed.id),
                                      selectedId: "embed_primary",
                                      selectedIds: ["embed_primary"],
                                    },
                                  };
                                });
                                onSelectElement?.("embed_primary");
                              }}
                              className="p-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/40 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION B: LAYOUT STRUCTURE PRESETS (Center, Left, Right, Split, Wide, Compact) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Structural Layout Presets
                      </label>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        Active: <strong className="text-white capitalize">{config.layout.preset || "centered"}</strong>
                      </span>
                    </div>

                    <div className={`grid gap-2.5 ${is70OrBelow ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                      {[
                        {
                          id: "centered" as LayoutPreset,
                          name: "Center",
                          desc: "Centered profile composition",
                          align: "center" as const,
                          defaultWidth: 580,
                        },
                        {
                          id: "left" as LayoutPreset,
                          name: "Left",
                          desc: "Clean left-aligned structure",
                          align: "left" as const,
                          defaultWidth: 580,
                        },
                        {
                          id: "right" as LayoutPreset,
                          name: "Right",
                          desc: "Right-aligned composition",
                          align: "right" as const,
                          defaultWidth: 580,
                        },
                        {
                          id: "split" as LayoutPreset,
                          name: "Minimal Card Split",
                          desc: "Balanced 2-column split (Bio vs Content)",
                          align: "center" as const,
                          defaultWidth: 760,
                        },
                        {
                          id: "wide" as LayoutPreset,
                          name: "Minimal Card Wide",
                          desc: "Expanded horizontal header & 2-col buttons",
                          align: "center" as const,
                          defaultWidth: 860,
                        },
                        {
                          id: "compact" as LayoutPreset,
                          name: "Minimal Card Compact",
                          desc: "Space-efficient Nothing OS HUD layout",
                          align: "center" as const,
                          defaultWidth: 480,
                        },
                      ].map((item) => {
                        const isActive = config.layout.preset === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              updateConfig((prev) => {
                                const newWidth =
                                  item.id === "split" && prev.layout.maxWidth < 720
                                    ? 760
                                    : item.id === "wide" && prev.layout.maxWidth < 820
                                    ? 860
                                    : item.id === "compact"
                                    ? 480
                                    : prev.layout.maxWidth;

                                const newPadding =
                                  item.id === "compact" ? 18 : prev.layout.padding;

                                const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                  em.id === "embed_primary"
                                    ? {
                                        ...em,
                                        transform: { ...em.transform, width: newWidth },
                                        style: { ...em.style, padding: newPadding },
                                      }
                                    : em
                                );

                                return {
                                  ...prev,
                                  layout: {
                                    ...prev.layout,
                                    preset: item.id,
                                    alignment: item.align,
                                    maxWidth: newWidth,
                                    padding: newPadding,
                                  },
                                  identity: { ...prev.identity, alignment: item.align },
                                  avatar: { ...prev.avatar, alignment: item.align },
                                  ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                };
                              });
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                              isActive
                                ? "border-white bg-white text-black shadow-lg"
                                : "border-neutral-800 bg-[#121214] text-neutral-300 hover:border-neutral-700 hover:bg-[#161619]"
                            }`}
                          >
                            <div className="flex items-center justify-between pb-1">
                              <span className="font-bold text-xs capitalize">{item.name}</span>
                              {isActive && <Check size={12} className="text-black shrink-0" />}
                            </div>
                            <p className={`text-[10px] leading-tight ${isActive ? "text-neutral-700 font-medium" : "text-neutral-500"}`}>
                              {item.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION C: CONTAINER DIMENSIONS & SPACING (EXPANDED LIMITS) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Dimensions & Spacing Limits ({isPrimary ? "Main Container" : currentEmbed?.title || "Embed"})
                      </label>
                      <span className="text-[9px] font-mono text-cyan-400">Expanded Ranges</span>
                    </div>

                    <div className={`grid gap-4 ${is70OrBelow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                      {/* 1. Container Max Width: 360px to 1600px */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[11px] font-semibold">Container Width</span>
                          <span className="text-white font-mono font-bold text-xs">{embedWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min={360}
                          max={1600}
                          step={10}
                          value={embedWidth}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateConfig((prev) => {
                              if (isPrimary) {
                                const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                  em.id === "embed_primary"
                                    ? { ...em, transform: { ...em.transform, width: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  layout: { ...prev.layout, maxWidth: val },
                                  ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                };
                              } else if (currentEmbed && prev.canvas) {
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id
                                    ? { ...em, transform: { ...em.transform, width: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              }
                              return prev;
                            });
                          }}
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[480, 580, 760, 860, 1100, 1400].map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => {
                                updateConfig((prev) => {
                                  if (isPrimary) {
                                    const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                      em.id === "embed_primary"
                                        ? { ...em, transform: { ...em.transform, width: w } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      layout: { ...prev.layout, maxWidth: w },
                                      ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                    };
                                  } else if (currentEmbed && prev.canvas) {
                                    const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                      em.id === currentEmbed.id
                                        ? { ...em, transform: { ...em.transform, width: w } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                    };
                                  }
                                  return prev;
                                });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                embedWidth === w
                                  ? "bg-white text-black border-white font-bold"
                                  : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Container Padding: 0px to 160px */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[11px] font-semibold">Container Padding</span>
                          <span className="text-white font-mono font-bold text-xs">{embedPadding}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={160}
                          step={2}
                          value={embedPadding}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateConfig((prev) => {
                              if (isPrimary) {
                                const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                  em.id === "embed_primary"
                                    ? { ...em, style: { ...em.style, padding: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  layout: { ...prev.layout, padding: val },
                                  ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                };
                              } else if (currentEmbed && prev.canvas) {
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id
                                    ? { ...em, style: { ...em.style, padding: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              }
                              return prev;
                            });
                          }}
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[0, 16, 28, 48, 72, 96].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                updateConfig((prev) => {
                                  if (isPrimary) {
                                    const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                      em.id === "embed_primary"
                                        ? { ...em, style: { ...em.style, padding: p } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      layout: { ...prev.layout, padding: p },
                                      ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                    };
                                  } else if (currentEmbed && prev.canvas) {
                                    const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                      em.id === currentEmbed.id
                                        ? { ...em, style: { ...em.style, padding: p } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                    };
                                  }
                                  return prev;
                                });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                embedPadding === p
                                  ? "bg-white text-black border-white font-bold"
                                  : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
                              }`}
                            >
                              {p}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Element Spacing Gap: 0px to 120px */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[11px] font-semibold">Element Spacing Gap</span>
                          <span className="text-white font-mono font-bold text-xs">{embedGap}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={120}
                          step={2}
                          value={embedGap}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              layout: { ...prev.layout, gap: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[8, 16, 24, 36, 48, 64].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() =>
                                updateConfig((prev) => ({
                                  ...prev,
                                  layout: { ...prev.layout, gap: g },
                                }))
                              }
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                embedGap === g
                                  ? "bg-white text-black border-white font-bold"
                                  : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
                              }`}
                            >
                              {g}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Apps & Socials Spacing: 0px to 80px */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[11px] font-semibold">Apps & Socials Spacing</span>
                          <span className="text-white font-mono font-bold text-xs">{appsSpacing}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={2}
                          value={appsSpacing}
                          onChange={(e) =>
                            updateConfig((prev) => ({
                              ...prev,
                              layout: { ...prev.layout, appsSpacing: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[6, 12, 18, 24, 32, 44].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                updateConfig((prev) => ({
                                  ...prev,
                                  layout: { ...prev.layout, appsSpacing: s },
                                }))
                              }
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                appsSpacing === s
                                  ? "bg-white text-black border-white font-bold"
                                  : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
                              }`}
                            >
                              {s}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5. Card Corner Radius: 0px to 80px */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[11px] font-semibold">Card Corner Radius</span>
                          <span className="text-white font-mono font-bold text-xs">{embedRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={2}
                          value={embedRadius}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateConfig((prev) => {
                              if (isPrimary) {
                                const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                  em.id === "embed_primary"
                                    ? { ...em, style: { ...em.style, borderRadius: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  discordRpc: { ...prev.discordRpc, borderRadius: val },
                                  ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                };
                              } else if (currentEmbed && prev.canvas) {
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id
                                    ? { ...em, style: { ...em.style, borderRadius: val } }
                                    : em
                                );
                                return {
                                  ...prev,
                                  canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                };
                              }
                              return prev;
                            });
                          }}
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[0, 12, 24, 36, 52, 72].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                updateConfig((prev) => {
                                  if (isPrimary) {
                                    const updatedEmbeds = prev.canvas?.embeds?.map((em) =>
                                      em.id === "embed_primary"
                                        ? { ...em, style: { ...em.style, borderRadius: r } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      discordRpc: { ...prev.discordRpc, borderRadius: r },
                                      ...(updatedEmbeds ? { canvas: { ...prev.canvas!, embeds: updatedEmbeds } } : {}),
                                    };
                                  } else if (currentEmbed && prev.canvas) {
                                    const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                      em.id === currentEmbed.id
                                        ? { ...em, style: { ...em.style, borderRadius: r } }
                                        : em
                                    );
                                    return {
                                      ...prev,
                                      canvas: { ...prev.canvas, embeds: updatedEmbeds },
                                    };
                                  }
                                  return prev;
                                });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                embedRadius === r
                                  ? "bg-white text-black border-white font-bold"
                                  : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
                              }`}
                            >
                              {r}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 6. Profile Horizontal Alignment */}
                      <div className="space-y-2 p-3.5 rounded-xl border border-neutral-800 bg-[#101012]">
                        <span className="text-neutral-400 text-[11px] font-semibold">Container Alignment</span>
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() =>
                                updateConfig((prev) => ({
                                  ...prev,
                                  layout: { ...prev.layout, alignment: align },
                                  identity: { ...prev.identity, alignment: align },
                                  avatar: { ...prev.avatar, alignment: align },
                                }))
                              }
                              className={`py-2 rounded-lg border text-center capitalize text-xs cursor-pointer transition-colors ${
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
                    </div>
                  </div>

                  {/* SECTION D: CONTAINER APPEARANCE & STYLING */}
                  {currentEmbed && (
                    <div className="p-4 rounded-xl border border-neutral-800 bg-[#101014] space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                          <Palette size={12} className="text-cyan-400" />
                          Container Appearance & Styling
                        </label>
                        <span className="text-[9px] font-mono text-neutral-500">
                          {currentEmbed.title || "Embed"}
                        </span>
                      </div>

                      <div className={`grid gap-4 ${is70OrBelow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {/* Background Color */}
                        <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                          <div className="flex justify-between items-center text-[11px] text-neutral-400">
                            <span>Background Fill</span>
                            <span className="text-white font-mono text-[10px]">
                              {currentEmbed.style.backgroundColor || "rgba(10, 10, 14, 0.85)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                currentEmbed.style.backgroundColor && currentEmbed.style.backgroundColor.startsWith("#")
                                  ? currentEmbed.style.backgroundColor
                                  : "#0a0a0e"
                              }
                              onChange={(e) => {
                                const newColor = e.target.value;
                                updateConfig((prev) => {
                                  if (!prev.canvas) return prev;
                                  const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                    em.id === currentEmbed.id
                                      ? { ...em, style: { ...em.style, backgroundColor: newColor } }
                                      : em
                                  );
                                  return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                                });
                              }}
                              className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <div className="flex flex-wrap gap-1">
                              {["rgba(10, 10, 14, 0.85)", "#050505", "#121216", "#18181b", "transparent"].map((bg) => (
                                <button
                                  key={bg}
                                  type="button"
                                  onClick={() => {
                                    updateConfig((prev) => {
                                      if (!prev.canvas) return prev;
                                      const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                        em.id === currentEmbed.id
                                          ? { ...em, style: { ...em.style, backgroundColor: bg } }
                                          : em
                                      );
                                      return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                                    });
                                  }}
                                  className="px-2 py-1 rounded text-[9px] font-mono border border-neutral-800 bg-black/60 text-neutral-300 hover:text-white"
                                >
                                  {bg === "transparent" ? "None" : bg.startsWith("rgba") ? "Glass" : bg}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Backdrop Blur */}
                        <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                          <div className="flex justify-between items-center text-[11px] text-neutral-400">
                            <span>Backdrop Blur</span>
                            <span className="text-white font-mono text-[10px]">
                              {currentEmbed.style.backdropBlur ?? 16}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={32}
                            step={2}
                            value={currentEmbed.style.backdropBlur ?? 16}
                            onChange={(e) => {
                              const b = Number(e.target.value);
                              updateConfig((prev) => {
                                if (!prev.canvas) return prev;
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id
                                    ? { ...em, style: { ...em.style, backdropBlur: b, blur: b } }
                                    : em
                                );
                                return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                              });
                            }}
                            className="w-full accent-white cursor-pointer"
                          />
                        </div>

                        {/* Border Width & Color */}
                        <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                          <div className="flex justify-between items-center text-[11px] text-neutral-400">
                            <span>Border Width & Color</span>
                            <span className="text-white font-mono text-[10px]">
                              {currentEmbed.style.borderWidth ?? 1}px
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={6}
                              step={1}
                              value={currentEmbed.style.borderWidth ?? 1}
                              onChange={(e) => {
                                const bw = Number(e.target.value);
                                updateConfig((prev) => {
                                  if (!prev.canvas) return prev;
                                  const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                    em.id === currentEmbed.id
                                      ? { ...em, style: { ...em.style, borderWidth: bw } }
                                      : em
                                  );
                                  return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                                });
                              }}
                              className="w-full accent-white cursor-pointer"
                            />
                            <input
                              type="color"
                              value={currentEmbed.style.borderColor || "#26262b"}
                              onChange={(e) => {
                                const bc = e.target.value;
                                updateConfig((prev) => {
                                  if (!prev.canvas) return prev;
                                  const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                    em.id === currentEmbed.id
                                      ? { ...em, style: { ...em.style, borderColor: bc } }
                                      : em
                                  );
                                  return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                                });
                              }}
                              className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
                            />
                          </div>
                        </div>

                        {/* Shadow Blur */}
                        <div className="space-y-2 p-3 rounded-xl border border-neutral-800 bg-[#101012]">
                          <div className="flex justify-between items-center text-[11px] text-neutral-400">
                            <span>Outer Shadow Blur</span>
                            <span className="text-white font-mono text-[10px]">
                              {currentEmbed.style.shadowBlur ?? 24}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={60}
                            step={2}
                            value={currentEmbed.style.shadowBlur ?? 24}
                            onChange={(e) => {
                              const sb = Number(e.target.value);
                              updateConfig((prev) => {
                                if (!prev.canvas) return prev;
                                const updatedEmbeds = prev.canvas.embeds.map((em) =>
                                  em.id === currentEmbed.id
                                    ? { ...em, style: { ...em.style, shadowBlur: sb } }
                                    : em
                                );
                                return { ...prev, canvas: { ...prev.canvas, embeds: updatedEmbeds } };
                              });
                            }}
                            className="w-full accent-white cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION E: EMBED CHILD COMPONENTS & QUICK INSERTER */}
                  {currentEmbed && (
                    <div className="p-4 rounded-xl border border-neutral-800 bg-[#101014] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                          Components Inside {currentEmbed.title || "This Embed"}
                        </label>
                        <span className="text-[9px] font-mono text-neutral-500">
                          {childElementsOfCurrentEmbed.length} Items
                        </span>
                      </div>

                      {/* Quick Add Component Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onAddElement?.("heading")}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add Text
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddElement?.("button")}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add Button
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddElement?.("socialIcon")}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add Social
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddElement?.("image")}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add Image
                        </button>
                      </div>

                      {/* Child Elements List */}
                      {childElementsOfCurrentEmbed.length > 0 ? (
                        <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {childElementsOfCurrentEmbed.map((el) => {
                            const isElementSelected = selectedId === el.id;
                            return (
                              <div
                                key={el.id}
                                onClick={() => onSelectElement?.(el.id)}
                                className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all ${
                                  isElementSelected
                                    ? "bg-sky-500/15 border-sky-500/50 text-sky-200"
                                    : "bg-black/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700 hover:text-white"
                                }`}
                              >
                                <span className="font-mono truncate">{el.name || el.type}</span>
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                                  <span className="capitalize">{el.type}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-neutral-500 text-xs italic py-2 text-center">
                          No child components in this embed yet. Use the buttons above to add one.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

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
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.identity.badgeStyle === style
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
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${config.identity.titleColor === c
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
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.avatar.shape === shape
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
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${config.avatar.alignment === align
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
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${config.avatar.objectFit === fit
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
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${config.avatar.glow ? "bg-white text-black" : "bg-neutral-800 text-neutral-400"
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["solid", "gradient", "mesh", "image", "video"] as BackgroundType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, type },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.background.type === type
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
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${config.background.color === c
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
                        className={`py-2 rounded-lg border text-center capitalize cursor-pointer transition-colors ${config.background.pattern === pat
                            ? "border-white bg-white text-black font-bold"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                          }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Background Controls */}
                {config.background.type === "video" && (
                  <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold">
                        Full-Viewport Video Background
                      </label>
                      <span className="text-[9px] text-emerald-400 font-mono">AUTOPLAY &bull; LOOP &bull; MUTED</span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={config.background.videoUrl || ""}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, videoUrl: e.target.value },
                          }))
                        }
                        placeholder="https://... direct MP4 or WebM video link"
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-xs focus:outline-none focus:border-white font-mono"
                      />
                      <input
                        type="url"
                        value={config.background.videoPoster || ""}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, videoPoster: e.target.value },
                          }))
                        }
                        placeholder="Poster image fallback URL (optional)"
                        className="w-full bg-black border border-neutral-800 rounded p-2 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      {(["cover", "contain", "fill"] as const).map((fit) => (
                        <button
                          key={fit}
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              background: { ...prev.background, fitMode: fit },
                            }))
                          }
                          className={`py-1.5 px-2 rounded-lg border text-center capitalize cursor-pointer transition-all ${
                            (config.background.fitMode || "cover") === fit
                              ? "bg-white text-black font-bold border-white"
                              : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image / GIF Background Controls */}
                {(config.background.type === "image" || config.background.type === "gif") && (
                  <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-[#101012]">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold">
                        Background Image / GIF
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsBgModalOpen(true)}
                        className="px-2.5 py-1 rounded-md bg-white text-black font-bold text-[10px] hover:bg-neutral-200 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ImageIcon size={12} />
                        CUSTOMIZE & CROP ↗
                      </button>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={config.background.imageUrl || ""}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            background: { ...prev.background, imageUrl: e.target.value },
                          }))
                        }
                        placeholder="https://... direct image or gif link"
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Quick Transformation Indicators */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] font-mono">
                      <div className="p-2 rounded bg-black/60 border border-neutral-800 text-neutral-400">
                        RATIO: <span className="text-white font-bold">{config.background.aspectRatio || "full"}</span>
                      </div>
                      <div className="p-2 rounded bg-black/60 border border-neutral-800 text-neutral-400">
                        FIT: <span className="text-white font-bold">{config.background.fitMode || "cover"}</span>
                      </div>
                      <div className="p-2 rounded bg-black/60 border border-neutral-800 text-neutral-400">
                        ZOOM: <span className="text-white font-bold">{config.background.zoom || 100}%</span>
                      </div>
                      <div className="p-2 rounded bg-black/60 border border-neutral-800 text-neutral-400">
                        ROT: <span className="text-white font-bold">{config.background.rotation || 0}°</span>
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

                {/* Level 2 Visual Customizer Banner (Phase 9 / Prompt 6) */}
                <div className="p-4 rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-purple-900/10 to-indigo-950/20 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Level 2 Visual Designer
                      </span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                      Premium
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Independently select, reposition, resize, and style artwork, status titles, game details, telemetry badges, and buttons inside the Discord Rich Presence card.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenRpcCustomizer}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Gamepad2 size={14} />
                    <span>Open Rich Presence Customizer</span>
                  </button>
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
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${config.discordRpc.showProfileRpc
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${config.discordRpc.showProfileRpc
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
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${config.discordRpc.enableDiscordRpc
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${config.discordRpc.enableDiscordRpc
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
                        className={`py-2 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.discordRpc.style === style
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
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${config.discordRpc.imageLayout === layout
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
                          className={`py-1.5 rounded text-xs capitalize cursor-pointer ${config.discordRpc.imageSize === size
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.discordRpc.showTelemetryBadge
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.discordRpc.showTimer
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
                        className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.buttons.variant === variant
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
                          className={`py-2 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.socials.style === style
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
                          className={`p-2.5 rounded-xl border text-center capitalize cursor-pointer transition-colors ${config.effects.particles === effect
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.effects.glassmorphism
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.effects.ambientGlow
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.effects.tiltEffect
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${config.effects.scanlines
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
              <div className={is40OrBelow ? "space-y-3" : is80OrBelow ? "space-y-4" : "space-y-6"}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings size={is40OrBelow ? 14 : 16} className="text-white shrink-0" />
                    <span className="truncate">
                      {is40OrBelow ? "ADVANCED SETTINGS" : "ADVANCED WORKSPACE SETTINGS"}
                    </span>
                  </h3>
                  {!is60OrBelow && (
                    <p className="text-neutral-400 text-[11px] pt-0.5 leading-snug">
                      {is80OrBelow
                        ? "Guides, platform scaling, modifiers, and grid."
                        : "Wireframe guides, platform badges, scaling engines, precision modifiers, and smart grid settings."}
                    </p>
                  )}
                </div>

                {/* EMBED RESPONSIVE SCALING SYSTEM */}
                <div className={`rounded-xl border border-neutral-800 bg-[#101012] ${
                  is40OrBelow ? "p-2.5 space-y-2" : is80OrBelow ? "p-3 space-y-2.5" : "p-4 space-y-3"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs flex items-center gap-1.5 truncate">
                        <Sliders size={14} className="text-sky-400 shrink-0" />
                        <span className="truncate">
                          {is40OrBelow ? "Embed Scaling" : is70OrBelow ? "Embed Scaling Mode" : "Embed Responsive Scaling Mode"}
                        </span>
                      </span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 pt-0.5 line-clamp-1">
                          {is80OrBelow
                            ? "Child elements reaction to embed resize."
                            : "Controls how child elements react when the parent embed is resized."}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-300 font-mono shrink-0">
                      {config.advanced?.embedScaling || "hybrid"}
                    </span>
                  </div>

                  <div className={`grid gap-2 ${
                    is70OrBelow ? "grid-cols-1" : "grid-cols-3"
                  }`}>
                    {(["hybrid", "proportional", "adaptive"] as const).map((mode) => {
                      const isSelected = (config.advanced?.embedScaling || "hybrid") === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            updateConfig((prev) => ({
                              ...prev,
                              advanced: {
                                ...DEFAULT_DESIGN_CONFIG.advanced,
                                ...(prev.advanced || {}),
                                embedScaling: mode,
                              },
                            }))
                          }
                          className={`rounded-lg border text-left transition-all cursor-pointer ${
                            is40OrBelow ? "p-2" : "p-2.5"
                          } ${
                            isSelected
                              ? "border-sky-500 bg-sky-950/40 text-white shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                              : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] capitalize flex items-center gap-1.5">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
                              <span>{mode}</span>
                              {mode === "hybrid" && is40OrBelow && (
                                <span className="text-[8px] text-sky-400 font-mono font-normal">(Rec)</span>
                              )}
                            </span>
                            {isSelected && !is70OrBelow && (
                              <span className="text-[8px] font-mono text-sky-400 uppercase">Active</span>
                            )}
                          </div>
                          {!is40OrBelow && (
                            <div className={`text-[9px] mt-1 line-clamp-2 ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                              {mode === "hybrid"
                                ? "Proportional then adaptive (Recommended)"
                                : mode === "proportional"
                                  ? "Scales all children uniformly"
                                  : "Clamps and wraps inside bounds"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ALT-DRAG PRECISION EDITING & CUSTOM KEYBIND */}
                <div className={`rounded-xl border border-neutral-800 bg-[#101012] ${
                  is40OrBelow ? "p-2.5 space-y-2" : is80OrBelow ? "p-3 space-y-2.5" : "p-4 space-y-3"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs flex items-center gap-1.5 truncate">
                        <Command size={14} className="text-amber-400 shrink-0" />
                        <span className="truncate">
                          {is40OrBelow ? "Precision Drag" : is70OrBelow ? "Precision Dragging" : "Precision Dragging & Fine Adjustment"}
                        </span>
                      </span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 pt-0.5 line-clamp-1">
                          {is80OrBelow ? "Modifier key for 0.2x micro-adjustments." : "Hold modifier key during drag or resize for 0.2x micro-adjustments."}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            precisionModifierEnabled: !(prev.advanced?.precisionModifierEnabled ?? true),
                          },
                        }))
                      }
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        (config.advanced?.precisionModifierEnabled ?? true)
                          ? "bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.25)]"
                          : "bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {(config.advanced?.precisionModifierEnabled ?? true)
                        ? (is40OrBelow ? "ON" : "ENABLED")
                        : (is40OrBelow ? "OFF" : "DISABLED")}
                    </button>
                  </div>

                  <div className={`grid gap-2.5 pt-1 ${
                    is70OrBelow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                  }`}>
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>Modifier Keybind</span>
                      </label>
                      <select
                        value={config.advanced?.precisionModifier || "Alt"}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            advanced: {
                              ...DEFAULT_DESIGN_CONFIG.advanced,
                              ...(prev.advanced || {}),
                              precisionModifier: e.target.value as any,
                            },
                          }))
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white cursor-pointer focus:border-amber-400 focus:outline-none"
                      >
                        <option value="Alt">{is60OrBelow ? "Alt (Default)" : "Alt Key (Default Recommended)"}</option>
                        <option value="Control">{is60OrBelow ? "Ctrl (Control)" : "Control Key (Ctrl)"}</option>
                        <option value="Shift">Shift Key</option>
                        <option value="Meta">{is60OrBelow ? "Cmd / Win" : "Meta Key (Cmd / Windows)"}</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          updateConfig((prev) => ({
                            ...prev,
                            advanced: {
                              ...DEFAULT_DESIGN_CONFIG.advanced,
                              ...(prev.advanced || {}),
                              precisionModifier: "Alt",
                              precisionModifierEnabled: true,
                            },
                          }))
                        }
                        className="w-full py-1.5 px-3 rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer hover:border-neutral-500"
                      >
                        <RotateCcw size={12} className="shrink-0 text-neutral-400" />
                        <span className="truncate">
                          {is40OrBelow ? "Reset (Alt)" : is70OrBelow ? "Reset to Default" : "Reset to Default (Alt)"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {(config.advanced?.precisionModifier === "Control" || config.advanced?.precisionModifier === "Meta") && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center gap-1.5">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="leading-tight">
                        {is40OrBelow
                          ? `May conflict with ${config.advanced?.precisionModifier} browser shortcuts.`
                          : `Note: Using ${config.advanced?.precisionModifier} may conflict with browser default tabs or shortcuts.`}
                      </span>
                    </div>
                  )}
                </div>

                {/* DOCK CONTROLS & POSITION LOCK (SECTIONS 2 & 3) */}
                <div className={`rounded-xl border border-neutral-800 bg-[#101012] ${
                  is40OrBelow ? "p-2.5 space-y-2.5" : is80OrBelow ? "p-3 space-y-3" : "p-4 space-y-4"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs flex items-center gap-1.5 truncate">
                        <Lock size={14} className="text-amber-400 shrink-0" />
                        <span className="truncate">
                          {is40OrBelow ? "Dock Lock" : is70OrBelow ? "Dock Position Lock" : "Dock Controls: Dock Position Lock"}
                        </span>
                      </span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 pt-0.5 line-clamp-1">
                          {is80OrBelow ? "Lock floating dock in position." : "Lock your floating dock in its current position to prevent accidental movement."}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextLock = !(config.advanced?.dockLocked ?? false);
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            dockLocked: nextLock,
                          },
                        }));
                        try {
                          localStorage.setItem("pixel_studio_dock_locked", String(nextLock));
                        } catch {}
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        (config.advanced?.dockLocked ?? false)
                          ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                          : "bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {(config.advanced?.dockLocked ?? false) ? (
                        <>
                          <Lock size={11} /> LOCKED
                        </>
                      ) : (
                        <>
                          <Unlock size={11} /> UNLOCKED
                        </>
                      )}
                    </button>
                  </div>

                  {/* Shortcut Configuration */}
                  <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                    <div className={`flex gap-2 ${
                      is70OrBelow ? "flex-col items-start" : "items-center justify-between"
                    }`}>
                      <span className="text-[11px] text-neutral-300 font-medium flex items-center gap-1.5 shrink-0">
                        <Keyboard size={13} className="text-neutral-400 shrink-0" />
                        <span>Dock Lock Shortcut</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="px-2 py-0.5 rounded bg-black border border-neutral-700 text-amber-300 font-mono text-[10px] font-bold tracking-wider">
                          {(config.advanced?.dockLockShortcut || "CapsLock").toUpperCase() === "CAPSLOCK"
                            ? "CAPS LOCK"
                            : config.advanced?.dockLockShortcut || "CAPS LOCK"}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecordingLockShortcut(true);
                            setRecordedShortcut("");
                            setShortcutConflictWarning(null);
                          }}
                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-medium cursor-pointer transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateConfig((prev) => ({
                              ...prev,
                              advanced: {
                                ...DEFAULT_DESIGN_CONFIG.advanced,
                                ...(prev.advanced || {}),
                                dockLockShortcut: "CapsLock",
                              },
                            }));
                            try {
                              localStorage.setItem("pixel_studio_dock_lock_shortcut", "CapsLock");
                            } catch {}
                          }}
                          className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                          title="Reset to Default (CAPS LOCK)"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Recording Mode UI */}
                    {isRecordingLockShortcut && (
                      <div className="p-3 rounded-lg bg-neutral-900 border border-amber-500/40 space-y-2">
                        <div className="text-[11px] text-neutral-200">
                          Press a key or key combination to assign your dock lock shortcut.
                        </div>
                        {recordedShortcut && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-400">Captured:</span>
                            <span className="px-2 py-0.5 rounded bg-black border border-amber-400 text-amber-300 font-mono text-xs font-bold">
                              {recordedShortcut.toUpperCase() === "CAPSLOCK" ? "CAPS LOCK" : recordedShortcut}
                            </span>
                          </div>
                        )}
                        {shortcutConflictWarning && (
                          <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-1.5">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{shortcutConflictWarning}</span>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRecordingLockShortcut(false);
                              setRecordedShortcut("");
                              setShortcutConflictWarning(null);
                            }}
                            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!recordedShortcut || !!shortcutConflictWarning || recordedShortcut.endsWith("...")}
                            onClick={() => {
                              if (recordedShortcut && !shortcutConflictWarning && !recordedShortcut.endsWith("...")) {
                                updateConfig((prev) => ({
                                  ...prev,
                                  advanced: {
                                    ...DEFAULT_DESIGN_CONFIG.advanced,
                                    ...(prev.advanced || {}),
                                    dockLockShortcut: recordedShortcut,
                                  },
                                }));
                                try {
                                  localStorage.setItem("pixel_studio_dock_lock_shortcut", recordedShortcut);
                                } catch {}
                                setIsRecordingLockShortcut(false);
                                setRecordedShortcut("");
                              }
                            }}
                            className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save Shortcut
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* MORE OPTIONS PANEL SIZE CUSTOMIZATION (40% to 100%) */}
                <div className={`rounded-xl border border-neutral-800 bg-[#101012] ${
                  is40OrBelow ? "p-2.5 space-y-2.5" : is80OrBelow ? "p-3 space-y-3" : "p-4 space-y-3"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs flex items-center gap-1.5 truncate">
                        <Maximize2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {is40OrBelow ? "Panel Size" : is70OrBelow ? "More Options Size" : "More Options Panel: Panel Size"}
                        </span>
                      </span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 pt-0.5 line-clamp-1">
                          Adjust More Options panel dimensions (40% to 100%).
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        {currentSizePct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateConfig((prev) => ({
                            ...prev,
                            advanced: {
                              ...DEFAULT_DESIGN_CONFIG.advanced,
                              ...(prev.advanced || {}),
                              moreOptionsPanelSize: 100,
                            },
                          }));
                          try {
                            localStorage.setItem("pixel_studio_more_options_size", "100");
                          } catch {}
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                        title="Reset to Default (100%)"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Range Slider 40% to 100% */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={1}
                      value={currentSizePct}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        const val = Math.max(40, Math.min(100, isNaN(raw) ? 100 : raw));
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            moreOptionsPanelSize: val,
                          },
                        }));
                        try {
                          localStorage.setItem("pixel_studio_more_options_size", String(val));
                        } catch {}
                      }}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                      <span>40% (Min)</span>
                      {!is40OrBelow && <span>60%</span>}
                      {!is60OrBelow && <span>70%</span>}
                      {!is40OrBelow && <span>80%</span>}
                      {!is60OrBelow && <span>90%</span>}
                      <span>100% (Full)</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons (40%, 60%, 70%, 80%, 90%, 100%) */}
                  <div className={`grid gap-1.5 pt-1 ${
                    is80OrBelow ? "grid-cols-3" : "grid-cols-6"
                  }`}>
                    {[
                      { label: "Min", fullLabel: "Minimum", pct: 40 },
                      { label: "Compact", fullLabel: "Compact", pct: 60 },
                      { label: "Medium", fullLabel: "Medium", pct: 70 },
                      { label: "Moderate", fullLabel: "Moderate", pct: 80 },
                      { label: "Slight", fullLabel: "Slight", pct: 90 },
                      { label: "Full", fullLabel: "Original", pct: 100 },
                    ].map((preset) => {
                      const isSelected = currentSizePct === preset.pct;
                      return (
                        <button
                          key={preset.pct}
                          type="button"
                          onClick={() => {
                            updateConfig((prev) => ({
                              ...prev,
                              advanced: {
                                ...DEFAULT_DESIGN_CONFIG.advanced,
                                ...(prev.advanced || {}),
                                moreOptionsPanelSize: preset.pct,
                              },
                            }));
                            try {
                              localStorage.setItem("pixel_studio_more_options_size", String(preset.pct));
                            } catch {}
                          }}
                          className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700"
                          }`}
                        >
                          <div className="text-[10px] font-mono">{preset.pct}%</div>
                          {!is40OrBelow && (
                            <div className="text-[8px] text-neutral-500 truncate">
                              {is60OrBelow ? preset.label : preset.fullLabel}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SMART GRID & ALIGNMENT SYSTEM */}
                <div className={`rounded-xl border border-neutral-800 bg-[#101012] ${
                  is40OrBelow ? "p-2.5 space-y-2.5" : is80OrBelow ? "p-3 space-y-3" : "p-4 space-y-4"
                }`}>
                  <div>
                    <span className="text-white font-semibold text-xs flex items-center gap-1.5">
                      <Grid size={14} className="text-cyan-400 shrink-0" />
                      <span className="truncate">Smart Grid & Alignment</span>
                    </span>
                    {!is60OrBelow && (
                      <p className="text-[10px] text-neutral-500 pt-0.5 line-clamp-1">
                        Snapping, dynamic guide lines, and visual spacing guides.
                      </p>
                    )}
                  </div>

                  <div className={`grid gap-2 ${is70OrBelow ? "grid-cols-1" : "grid-cols-2"}`}>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            gridSettings: {
                              ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                              showGrid: !(prev.advanced?.gridSettings?.showGrid ?? false),
                            },
                          },
                        }))
                      }
                      className={`rounded-lg border text-left transition-colors cursor-pointer ${
                        is40OrBelow ? "p-2" : "p-2.5"
                      } ${
                        config.advanced?.gridSettings?.showGrid
                          ? "border-cyan-500 bg-cyan-950/30 text-cyan-200"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-[11px] flex items-center justify-between">
                        <span>Show Visual Grid</span>
                        {config.advanced?.gridSettings?.showGrid && (
                          <span className="text-[8px] font-mono text-cyan-400">ON</span>
                        )}
                      </div>
                      {!is40OrBelow && (
                        <div className="text-[9px] text-neutral-500">
                          {config.advanced?.gridSettings?.showGrid ? "Overlay active" : "Hidden"}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            gridSettings: {
                              ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                              snapToGrid: !(prev.advanced?.gridSettings?.snapToGrid ?? true),
                            },
                          },
                        }))
                      }
                      className={`rounded-lg border text-left transition-colors cursor-pointer ${
                        is40OrBelow ? "p-2" : "p-2.5"
                      } ${
                        (config.advanced?.gridSettings?.snapToGrid ?? true)
                          ? "border-cyan-500 bg-cyan-950/30 text-cyan-200"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-[11px] flex items-center justify-between">
                        <span>Snap to Grid</span>
                        {(config.advanced?.gridSettings?.snapToGrid ?? true) && (
                          <span className="text-[8px] font-mono text-cyan-400">ON</span>
                        )}
                      </div>
                      {!is40OrBelow && (
                        <div className="text-[9px] text-neutral-500">
                          {(config.advanced?.gridSettings?.snapToGrid ?? true) ? "Active" : "Free position"}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            gridSettings: {
                              ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                              smartGuides: !(prev.advanced?.gridSettings?.smartGuides ?? true),
                            },
                          },
                        }))
                      }
                      className={`rounded-lg border text-left transition-colors cursor-pointer ${
                        is40OrBelow ? "p-2" : "p-2.5"
                      } ${
                        (config.advanced?.gridSettings?.smartGuides ?? true)
                          ? "border-cyan-500 bg-cyan-950/30 text-cyan-200"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-[11px] flex items-center justify-between">
                        <span>Smart Guides</span>
                        {(config.advanced?.gridSettings?.smartGuides ?? true) && (
                          <span className="text-[8px] font-mono text-cyan-400">ON</span>
                        )}
                      </div>
                      {!is40OrBelow && (
                        <div className="text-[9px] text-neutral-500">Center & edge lines</div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateConfig((prev) => ({
                          ...prev,
                          advanced: {
                            ...DEFAULT_DESIGN_CONFIG.advanced,
                            ...(prev.advanced || {}),
                            gridSettings: {
                              ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                              snapToElements: !(prev.advanced?.gridSettings?.snapToElements ?? true),
                            },
                          },
                        }))
                      }
                      className={`rounded-lg border text-left transition-colors cursor-pointer ${
                        is40OrBelow ? "p-2" : "p-2.5"
                      } ${
                        (config.advanced?.gridSettings?.snapToElements ?? true)
                          ? "border-cyan-500 bg-cyan-950/30 text-cyan-200"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-[11px] flex items-center justify-between">
                        <span>Snap to Elements</span>
                        {(config.advanced?.gridSettings?.snapToElements ?? true) && (
                          <span className="text-[8px] font-mono text-cyan-400">ON</span>
                        )}
                      </div>
                      {!is40OrBelow && (
                        <div className="text-[9px] text-neutral-500">Align with siblings</div>
                      )}
                    </button>
                  </div>

                  <div className={`grid gap-3 pt-2 ${is70OrBelow ? "grid-cols-1" : "grid-cols-2"}`}>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Grid Size</span>
                        <span className="font-mono text-cyan-300">
                          {config.advanced?.gridSettings?.gridSize ?? 16}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={32}
                        step={4}
                        value={config.advanced?.gridSettings?.gridSize ?? 16}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            advanced: {
                              ...DEFAULT_DESIGN_CONFIG.advanced,
                              ...(prev.advanced || {}),
                              gridSettings: {
                                ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                                gridSize: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Snap Sensitivity</span>
                        <span className="font-mono text-cyan-300">
                          {config.advanced?.gridSettings?.snapSensitivity ?? 6}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={16}
                        step={1}
                        value={config.advanced?.gridSettings?.snapSensitivity ?? 6}
                        onChange={(e) =>
                          updateConfig((prev) => ({
                            ...prev,
                            advanced: {
                              ...DEFAULT_DESIGN_CONFIG.advanced,
                              ...(prev.advanced || {}),
                              gridSettings: {
                                ...(prev.advanced?.gridSettings || DEFAULT_GRID_SETTINGS),
                                snapSensitivity: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <div className={`grid gap-3 ${is70OrBelow ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs truncate block">Wireframe Guides</span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 truncate">Show element bounds in editor</p>
                      )}
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shrink-0 ${config.advanced?.wireframeMode
                          ? "bg-white text-black"
                          : "bg-neutral-800 text-neutral-400"
                        }`}
                    >
                      {config.advanced?.wireframeMode ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-800 bg-[#101012] flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold text-xs truncate block">Watermark Pill</span>
                      {!is60OrBelow && (
                        <p className="text-[10px] text-neutral-500 truncate">Display &quot;Built with Pixel.gg&quot;</p>
                      )}
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
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors shrink-0 ${config.advanced?.watermark
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
    </div>
  );
};
