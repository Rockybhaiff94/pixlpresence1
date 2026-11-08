"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ProfileDesignConfig,
  DEFAULT_DESIGN_CONFIG,
  StudioTab,
  WorkspaceTransparencyMode,
} from "@/types/studio";
import { StudioTopBar, DeviceMode, StudioView } from "@/components/studio/StudioTopBar";
import { StudioLeftWorkspace } from "@/components/studio/StudioLeftWorkspace";
import { StudioRightPreviewCanvas } from "@/components/studio/StudioRightPreviewCanvas";
import { ResizableDivider } from "@/components/studio/ResizableDivider";
import { ParticlesCanvas } from "@/components/studio/ParticlesCanvas";
import { ClassicCustomizer } from "@/components/studio/ClassicCustomizer";
import { StudioTemplatePreset } from "@/components/studio/templates";
import {
  AlertCircle,
  CheckCircle2,
  PanelRightOpen,
  Eye,
  Sliders,
} from "lucide-react";

export default function CustomizePage() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Mode Selection: Studio Workspace vs Classic Customizer
  const [isClassicMode, setIsClassicMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("pixel_customizer_mode") === "classic";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleClassicMode = () => {
    setIsClassicMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pixel_customizer_mode", next ? "classic" : "studio");
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  // Studio UI Navigation State
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [currentView, setCurrentView] = useState<StudioView>("categories");
  const [activeCategory, setActiveCategory] = useState<StudioTab>("layout");

  // Advanced Panel System & Workspace Preferences
  const [previewWidthPct, setPreviewWidthPct] = useState<number>(40);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true);
  const [isEditorVisible, setIsEditorVisible] = useState<boolean>(true);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);
  const [transparencyMode, setTransparencyMode] = useState<WorkspaceTransparencyMode>("solid");
  const [panelOpacity, setPanelOpacity] = useState<number>(85);
  const [panelBlur, setPanelBlur] = useState<number>(12);
  const [panelBorderOpacity, setPanelBorderOpacity] = useState<number>(30);
  const [zoom, setZoom] = useState<number>(100);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Restore Workspace Preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("pixel_studio_workspace_prefs_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.previewWidthPct === "number") {
          setPreviewWidthPct(Math.min(70, Math.max(20, parsed.previewWidthPct)));
        }
        if (typeof parsed.isPreviewVisible === "boolean") {
          setIsPreviewVisible(parsed.isPreviewVisible);
        }
        if (typeof parsed.isEditorVisible === "boolean") {
          setIsEditorVisible(parsed.isEditorVisible);
        }
        if (parsed.transparencyMode) {
          setTransparencyMode(parsed.transparencyMode);
        }
        if (typeof parsed.panelOpacity === "number") {
          setPanelOpacity(parsed.panelOpacity);
        }
        if (typeof parsed.panelBlur === "number") {
          setPanelBlur(parsed.panelBlur);
        }
        if (typeof parsed.panelBorderOpacity === "number") {
          setPanelBorderOpacity(parsed.panelBorderOpacity);
        }
        if (typeof parsed.zoom === "number") {
          setZoom(parsed.zoom);
        }
        if (parsed.deviceMode) {
          setDeviceMode(parsed.deviceMode);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist Workspace Preferences to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prefs = {
        previewWidthPct,
        isPreviewVisible,
        isEditorVisible,
        transparencyMode,
        panelOpacity,
        panelBlur,
        panelBorderOpacity,
        deviceMode,
        zoom,
      };
      localStorage.setItem("pixel_studio_workspace_prefs_v1", JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [
    previewWidthPct,
    isPreviewVisible,
    isEditorVisible,
    transparencyMode,
    panelOpacity,
    panelBlur,
    panelBorderOpacity,
    deviceMode,
    zoom,
  ]);

  // Profile Identity & Classic Fields (Synchronized two-way)
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#ffffff");
  const [particles, setParticles] = useState("None");
  const [blur, setBlur] = useState(10);
  const [opacity, setOpacity] = useState(90);
  const [roundedCorners, setRoundedCorners] = useState(16);
  const [musicUrl, setMusicUrl] = useState("");

  // External Telemetry State
  const [buttons, setButtons] = useState<
    Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      url: string;
      openInNewTab?: boolean;
      gradient?: string | null;
    }>
  >([]);
  const [links, setLinks] = useState<
    Array<{
      id: string;
      label: string;
      url: string;
      visibility: boolean;
    }>
  >([]);
  const [discordPresence, setDiscordPresence] = useState<{
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null>(null);

  // Full Studio Design Config with Undo/Redo
  const [config, setConfig] = useState<ProfileDesignConfig>(DEFAULT_DESIGN_CONFIG);
  const [history, setHistory] = useState<ProfileDesignConfig[]>([DEFAULT_DESIGN_CONFIG]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  // Push new config into history stack
  const updateConfigWithHistory = useCallback(
    (updater: (prev: ProfileDesignConfig) => ProfileDesignConfig) => {
      isDirtyRef.current = true;
      setIsDirty(true);
      setConfig((prev) => {
        const next = updater(prev);
        setHistory((h) => [...h.slice(0, historyIdx + 1), next].slice(-30));
        setHistoryIdx((i) => Math.min(i + 1, 29));
        return next;
      });
    },
    [historyIdx]
  );

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setConfig(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setConfig(history[nextIdx]);
    }
  };

  const handleResetToDefault = () => {
    updateConfigWithHistory(() => DEFAULT_DESIGN_CONFIG);
    setMsg({ text: "Studio reset to Default Nothing OS layout.", type: "success" });
  };

  const handleApplyTemplate = (preset: StudioTemplatePreset) => {
    updateConfigWithHistory((prev) => ({
      ...prev,
      ...preset.config,
      layout: { ...prev.layout, ...(preset.config.layout || {}) },
      identity: { ...prev.identity, ...(preset.config.identity || {}) },
      avatar: { ...prev.avatar, ...(preset.config.avatar || {}) },
      background: { ...prev.background, ...(preset.config.background || {}) },
      typography: { ...prev.typography, ...(preset.config.typography || {}) },
      discordRpc: { ...prev.discordRpc, ...(preset.config.discordRpc || {}) },
      buttons: { ...prev.buttons, ...(preset.config.buttons || {}) },
      socials: { ...prev.socials, ...(preset.config.socials || {}) },
      effects: { ...prev.effects, ...(preset.config.effects || {}) },
      advanced: { ...prev.advanced, ...(preset.config.advanced || {}) },
    }));

    if (preset.accentColor) {
      setAccentColor(preset.accentColor);
    }
    setMsg({ text: `Applied "${preset.name}" template.`, type: "success" });
  };

  // Layers handlers
  const handleToggleLayerVisibility = (layerId: string) => {
    updateConfigWithHistory((prev) => {
      const isRpc = layerId === "rpc";
      const updatedLayers = prev.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      const isVisible = updatedLayers.find((l) => l.id === layerId)?.visible ?? true;

      return {
        ...prev,
        layers: updatedLayers,
        discordRpc: isRpc
          ? { ...prev.discordRpc, showProfileRpc: isVisible }
          : prev.discordRpc,
      };
    });
  };

  const handleToggleLayerLock = (layerId: string) => {
    updateConfigWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    }));
  };

  const handleMoveLayer = (layerId: string, direction: "up" | "down") => {
    updateConfigWithHistory((prev) => {
      const currentLayers = [...prev.layers];
      const idx = currentLayers.findIndex((l) => l.id === layerId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= currentLayers.length) return prev;

      const item = currentLayers.splice(idx, 1)[0];
      currentLayers.splice(targetIdx, 0, item);

      return {
        ...prev,
        layers: currentLayers,
        layout: {
          ...prev.layout,
          elementOrder: currentLayers.map((l) => l.id),
        },
      };
    });
  };

  // Load initial profile & presence
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [profileRes, rpcRes] = await Promise.all([
          apiFetch("/api/profile/me"),
          apiFetch("/api/rpc/me"),
        ]);

        if (!active) return;

        if (profileRes.ok) {
          const p = await profileRes.json();
          setDisplayName(p.displayName || "");
          setBio(p.bio || "");
          setAvatarUrl(p.avatarUrl || "");
          setBannerUrl(p.bannerUrl || "");
          setAccentColor(p.accentColor || "#ffffff");
          setParticles(p.particles || "None");
          setBlur(p.blur ?? 10);
          setOpacity(p.opacity ?? 90);
          setRoundedCorners(p.roundedCorners ?? 16);
          setMusicUrl(p.musicUrl || "");
          setButtons(p.buttons || []);
          setLinks(p.links || []);

          if (p.designConfig) {
            try {
              const parsed =
                typeof p.designConfig === "string"
                  ? JSON.parse(p.designConfig)
                  : p.designConfig;
              if (parsed && typeof parsed === "object") {
                const merged: ProfileDesignConfig = {
                  ...DEFAULT_DESIGN_CONFIG,
                  ...parsed,
                  layout: { ...DEFAULT_DESIGN_CONFIG.layout, ...(parsed.layout || {}) },
                  identity: { ...DEFAULT_DESIGN_CONFIG.identity, ...(parsed.identity || {}) },
                  avatar: { ...DEFAULT_DESIGN_CONFIG.avatar, ...(parsed.avatar || {}) },
                  background: { ...DEFAULT_DESIGN_CONFIG.background, ...(parsed.background || {}) },
                  typography: { ...DEFAULT_DESIGN_CONFIG.typography, ...(parsed.typography || {}) },
                  discordRpc: { ...DEFAULT_DESIGN_CONFIG.discordRpc, ...(parsed.discordRpc || {}) },
                  buttons: { ...DEFAULT_DESIGN_CONFIG.buttons, ...(parsed.buttons || {}) },
                  socials: { ...DEFAULT_DESIGN_CONFIG.socials, ...(parsed.socials || {}) },
                  effects: { ...DEFAULT_DESIGN_CONFIG.effects, ...(parsed.effects || {}) },
                  advanced: { ...DEFAULT_DESIGN_CONFIG.advanced, ...(parsed.advanced || {}) },
                  customCss: p.customCss || parsed.customCss || "",
                };
                setConfig(merged);
                setHistory([merged]);
              }
            } catch {
              // Ignore parse error
            }
          } else {
            // Initialize from classic settings
            const initial: ProfileDesignConfig = {
              ...DEFAULT_DESIGN_CONFIG,
              identity: {
                ...DEFAULT_DESIGN_CONFIG.identity,
                titleColor: p.accentColor || "#ffffff",
              },
              avatar: {
                ...DEFAULT_DESIGN_CONFIG.avatar,
                shape: (p.roundedCorners ?? 16) > 25 ? "circle" : "rounded",
                borderColor: p.accentColor || "#ffffff",
              },
              background: {
                ...DEFAULT_DESIGN_CONFIG.background,
                imageUrl: p.bannerUrl || undefined,
                type: p.bannerUrl ? "image" : "solid",
              },
              effects: {
                ...DEFAULT_DESIGN_CONFIG.effects,
                blur: p.blur ?? 10,
                opacity: p.opacity ?? 90,
                glowColor: p.accentColor || "#ffffff",
              },
              customCss: p.customCss || "",
            };
            setConfig(initial);
            setHistory([initial]);
          }
        }

        if (rpcRes.ok && active) {
          const rpc = await rpcRes.json();
          setDiscordPresence(rpc);
          if (rpc) {
            setConfig((prev) => ({
              ...prev,
              discordRpc: {
                ...prev.discordRpc,
                showProfileRpc: rpc.showProfileRpc !== false,
                enableDiscordRpc: rpc.enableDiscordRpc !== false,
              },
            }));
          }
        }
      } catch {
        // Fallback
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Save / Publish handlers synchronizing profile + independent RPC controls
  const executeSave = async (isPublish = false) => {
    try {
      if (isPublish) setPublishing(true);
      else setSaving(true);
      setMsg(null);

      const profilePayload = {
        displayName,
        bio,
        avatarUrl,
        bannerUrl,
        accentColor,
        particles,
        blur: Number(blur),
        opacity: Number(opacity),
        roundedCorners: Number(roundedCorners),
        musicUrl,
        customCss: config.customCss || "",
        designConfig: JSON.stringify(config),
      };

      const rpcPayload = {
        showProfileRpc: config.discordRpc.showProfileRpc,
        enableDiscordRpc: config.discordRpc.enableDiscordRpc,
      };

      // Concurrent update of both profile styling and independent RPC switches
      const [profileRes, rpcRes] = await Promise.all([
        apiFetch("/api/profile/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        }),
        apiFetch("/api/rpc/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rpcPayload),
        }),
      ]);

      if (!profileRes.ok || !rpcRes.ok) {
        throw new Error("Failed to save changes to server");
      }

      isDirtyRef.current = false;
      setIsDirty(false);
      setMsg({
        text: isPublish
          ? "Profile design successfully published and live across all devices."
          : "Draft saved successfully.",
        type: "success",
      });
      await refreshUser();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({ text: (err as Error)?.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleSaveDraft = () => executeSave(false);
  const handlePublish = () => executeSave(true);

  // Toggle fullscreen preview
  const handleToggleFullscreenPreview = () => {
    setIsFullscreenPreview((prev) => {
      const next = !prev;
      if (next) {
        setIsEditorVisible(false);
      } else {
        setIsEditorVisible(true);
      }
      return next;
    });
  };

  const handleResetPanelSplit = () => {
    setPreviewWidthPct(40);
    setIsEditorVisible(true);
    setIsPreviewVisible(true);
    setIsFullscreenPreview(false);
  };

  const isBothPanelsVisible = isEditorVisible && isPreviewVisible && !isFullscreenPreview;

  // Dynamic Background Passthrough for Transparent, Glass, and Floating modes
  const getPassthroughBackgroundStyle = (): React.CSSProperties => {
    if (transparencyMode === "solid") return {};
    const bg = config.background;
    const base: React.CSSProperties = {
      backgroundColor: bg.color || "#050505",
    };

    if (bg.type === "gradient" && bg.gradient?.stops?.length >= 2) {
      const stops = bg.gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(", ");
      base.backgroundImage =
        bg.gradient.type === "radial"
          ? `radial-gradient(circle at center, ${stops})`
          : `linear-gradient(${bg.gradient.angle || 135}deg, ${stops})`;
    } else if (bg.type === "mesh") {
      base.backgroundImage = `radial-gradient(at 10% 20%, ${config.identity.titleColor}15 0px, transparent 50%), radial-gradient(at 90% 80%, ${config.effects.glowColor}20 0px, transparent 50%)`;
    } else if (bg.type === "image" && bg.imageUrl) {
      base.backgroundImage = `url("${bg.imageUrl}")`;
      base.backgroundSize = bg.size || "cover";
      base.backgroundPosition = bg.position || "center";
      base.backgroundRepeat = bg.repeat || "no-repeat";
    }

    return base;
  };

  // Preview Data payload for WYSIWYG right preview
  const previewData = {
    username: user?.username || "yourname",
    displayName: displayName || user?.username || "Your Name",
    bio: bio || "Nothing OS Digital Identity Architecture // Pixel.gg",
    avatarUrl,
    bannerUrl,
    musicUrl,
    musicTitle: "Nothing Soundscape (01)",
    musicArtist: "Ambient Audio Engine",
    views: 4182900,
    buttons,
    links,
    discordPresence,
  };

  return (
    <AccountLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] -m-4 sm:-m-6 lg:-m-8 bg-[#09090b] rounded-2xl border border-[#202020] overflow-hidden select-none">
        {/* Top Area: Compact Horizontal Navigation Toolbar */}
        <StudioTopBar
          currentView={currentView}
          setCurrentView={setCurrentView}
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onReset={handleResetToDefault}
          onSave={handleSaveDraft}
          onPublish={handlePublish}
          saving={saving}
          publishing={publishing}
          isDirty={isDirty}
          username={user?.username}
          isClassicMode={isClassicMode}
          onToggleClassicMode={toggleClassicMode}
        />

        {/* Global Toast Notice */}
        {msg && (
          <div
            className={`px-4 py-2.5 text-xs font-mono flex items-center justify-between border-b shrink-0 transition-all ${
              msg.type === "success"
                ? "bg-[#0d2818] border-[#4ade80]/40 text-[#4ade80]"
                : "bg-[#2a0e0e] border-[#d71920]/40 text-[#ff6b6b]"
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{msg.text}</span>
            </div>
            <button
              onClick={() => setMsg(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Workspace Body: Classic Mode vs New Horizontal Visual Workspace */}
        {isClassicMode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#070709]">
            <ClassicCustomizer
              displayName={displayName}
              setDisplayName={setDisplayName}
              bio={bio}
              setBio={setBio}
              avatarUrl={avatarUrl}
              setAvatarUrl={setAvatarUrl}
              bannerUrl={bannerUrl}
              setBannerUrl={setBannerUrl}
              musicUrl={musicUrl}
              setMusicUrl={setMusicUrl}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              particles={particles}
              setParticles={setParticles}
              blur={blur}
              setBlur={setBlur}
              opacity={opacity}
              setOpacity={setOpacity}
              roundedCorners={roundedCorners}
              setRoundedCorners={setRoundedCorners}
              handleSave={(e) => {
                if (e) e.preventDefault();
                handlePublish();
              }}
              saving={saving || publishing}
              username={user?.username}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile Screen Segmented Tab Switcher (< 1024px) */}
            <div className="lg:hidden flex items-center justify-center p-2 bg-[#0c0c0e] border-b border-[#202020] shrink-0">
              <div className="flex items-center gap-1 bg-[#141416] p-1 rounded-xl border border-[#242426] text-xs font-mono">
                <button
                  onClick={() => setMobileView("edit")}
                  className={`px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                    mobileView === "edit"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Sliders size={13} />
                  <span>Edit Controls</span>
                </button>
                <button
                  onClick={() => setMobileView("preview")}
                  className={`px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                    mobileView === "preview"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Eye size={13} />
                  <span>Live Preview</span>
                </button>
              </div>
            </div>

            {/* Horizontal Visual Workspace with Dynamic Split & Passthrough Background */}
            <div
              ref={workspaceContainerRef}
              style={getPassthroughBackgroundStyle()}
              className="flex-1 flex flex-col lg:flex-row overflow-hidden relative"
            >
              {/* Passthrough Background Overlays (Active in Transparent / Glass / Floating modes) */}
              {transparencyMode !== "solid" && (
                <>
                  {config.background.pattern === "dots" && (
                    <div className="absolute inset-0 nt-dot-grid opacity-60 pointer-events-none z-0" />
                  )}
                  {config.background.pattern === "grid" && (
                    <div
                      className="absolute inset-0 pointer-events-none z-0 opacity-20"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                      }}
                    />
                  )}
                  {config.background.pattern === "scanlines" && (
                    <div
                      className="absolute inset-0 pointer-events-none z-0 opacity-15"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.06) 50%, transparent 50%)",
                        backgroundSize: "100% 4px",
                      }}
                    />
                  )}
                  {config.effects.particles !== "None" && (
                    <ParticlesCanvas
                      effect={config.effects.particles}
                      accentColor={config.effects.glowColor || "#ffffff"}
                    />
                  )}
                </>
              )}

              {/* LEFT AREA — EDITING WORKSPACE */}
              <div
                style={{
                  width: isBothPanelsVisible ? `${100 - previewWidthPct}%` : undefined,
                }}
                className={`h-full flex flex-col overflow-hidden relative z-10 transition-all duration-150 ${
                  mobileView === "edit" ? "flex" : "hidden lg:flex"
                } ${
                  !isEditorVisible || isFullscreenPreview
                    ? "hidden"
                    : isBothPanelsVisible
                    ? ""
                    : "w-full"
                }`}
              >
                <StudioLeftWorkspace
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  config={config}
                  updateConfig={updateConfigWithHistory}
                  displayName={displayName}
                  setDisplayName={setDisplayName}
                  bio={bio}
                  setBio={setBio}
                  avatarUrl={avatarUrl}
                  setAvatarUrl={setAvatarUrl}
                  bannerUrl={bannerUrl}
                  setBannerUrl={setBannerUrl}
                  musicUrl={musicUrl}
                  setMusicUrl={setMusicUrl}
                  onApplyTemplatePreset={handleApplyTemplate}
                  onToggleLayerVisibility={handleToggleLayerVisibility}
                  onToggleLayerLock={handleToggleLayerLock}
                  onMoveLayer={handleMoveLayer}
                  transparencyMode={transparencyMode}
                  panelOpacity={panelOpacity}
                  panelBlur={panelBlur}
                  panelBorderOpacity={panelBorderOpacity}
                  onCollapsePanel={() => setIsEditorVisible(false)}
                />

                {/* Floating Reopen Live Preview Button (when preview is collapsed) */}
                {!isPreviewVisible && !isFullscreenPreview && (
                  <button
                    onClick={() => setIsPreviewVisible(true)}
                    className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/95 backdrop-blur-md text-white font-mono text-xs shadow-2xl cursor-pointer hover:bg-neutral-800 hover:border-neutral-500 transition-all group"
                    title="Show Live Preview Canvas"
                  >
                    <PanelRightOpen
                      size={14}
                      className="text-cyan-400 group-hover:scale-110 transition-transform"
                    />
                    <span className="font-semibold">Show Preview</span>
                  </button>
                )}
              </div>

              {/* DRAGGABLE RESIZABLE DIVIDER (Desktop only) */}
              {isBothPanelsVisible && (
                <ResizableDivider
                  previewWidthPct={previewWidthPct}
                  onResize={(newPct) => setPreviewWidthPct(newPct)}
                  onReset={() => setPreviewWidthPct(40)}
                  containerRef={workspaceContainerRef}
                  minPct={20}
                  maxPct={70}
                />
              )}

              {/* RIGHT AREA — LIVE PROFILE PREVIEW */}
              <div
                style={{
                  width: isBothPanelsVisible ? `${previewWidthPct}%` : undefined,
                }}
                className={`h-full bg-[#050507] flex flex-col overflow-hidden relative z-10 transition-all duration-150 ${
                  mobileView === "preview" ? "flex" : "hidden lg:flex"
                } ${
                  !isPreviewVisible ? "hidden" : isBothPanelsVisible ? "" : "w-full"
                }`}
              >
                <StudioRightPreviewCanvas
                  deviceMode={deviceMode}
                  setDeviceMode={setDeviceMode}
                  config={config}
                  previewData={previewData}
                  activeCategory={activeCategory}
                  onSelectCategory={(cat) => {
                    setActiveCategory(cat);
                    setCurrentView("categories");
                    if (mobileView === "preview") {
                      setMobileView("edit");
                    }
                  }}
                  zoom={zoom}
                  setZoom={setZoom}
                  transparencyMode={transparencyMode}
                  setTransparencyMode={setTransparencyMode}
                  panelOpacity={panelOpacity}
                  setPanelOpacity={setPanelOpacity}
                  panelBlur={panelBlur}
                  setPanelBlur={setPanelBlur}
                  panelBorderOpacity={panelBorderOpacity}
                  setPanelBorderOpacity={setPanelBorderOpacity}
                  isEditorVisible={isEditorVisible}
                  setIsEditorVisible={setIsEditorVisible}
                  isPreviewVisible={isPreviewVisible}
                  setIsPreviewVisible={setIsPreviewVisible}
                  onResetPanelSplit={handleResetPanelSplit}
                  isFullscreenPreview={isFullscreenPreview}
                  onToggleFullscreenPreview={handleToggleFullscreenPreview}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
