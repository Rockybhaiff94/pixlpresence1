"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ProfileDesignConfig, DEFAULT_DESIGN_CONFIG } from "@/types/studio";
import { StudioTopBar, DeviceMode } from "@/components/studio/StudioTopBar";
import { StudioLeftPanel, StudioTab } from "@/components/studio/StudioLeftPanel";
import { StudioCenterCanvas } from "@/components/studio/StudioCenterCanvas";
import { StudioRightInspector } from "@/components/studio/StudioRightInspector";
import { ClassicCustomizer } from "@/components/studio/ClassicCustomizer";
import { StudioTemplatePreset } from "@/components/studio/templates";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function CustomizePage() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Mode Selection: Studio 3-Panel vs Classic Customizer
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
  const [activeTab, setActiveTab] = useState<StudioTab>("layout");
  const [activeElementId, setActiveElementId] = useState<string>("identity");

  // Classic Form State (Two-way synchronized)
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
        setHistory((h) => [...h.slice(0, historyIdx + 1), next].slice(-25));
        setHistoryIdx((i) => Math.min(i + 1, 24));
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
    }));

    if (preset.accentColor) {
      setAccentColor(preset.accentColor);
    }
    setMsg({ text: `Applied "${preset.name}" template.`, type: "success" });
  };

  // Layers handlers
  const handleToggleLayerVisibility = (layerId: string) => {
    updateConfigWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
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

  // Interactive selection from canvas element click
  const handleSelectElement = (elementId: string) => {
    setActiveElementId(elementId);
    if (elementId === "avatar") setActiveTab("identity");
    else if (elementId === "identity") setActiveTab("identity");
    else if (elementId === "rpc") setActiveTab("rpc");
    else if (elementId === "buttons") setActiveTab("buttons");
    else if (elementId === "socials") setActiveTab("buttons");
    else if (elementId === "background") setActiveTab("background");
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

  // Save handler synchronizing both classic & studio models
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);

      const payload = {
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

      const res = await apiFetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to publish profile design");

      isDirtyRef.current = false;
      setIsDirty(false);
      setMsg({ text: "Profile design published and live across all devices.", type: "success" });
      await refreshUser();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({ text: (err as Error)?.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Preview Data payload for WYSIWYG center canvas
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
        {/* Top Studio Bar */}
        <StudioTopBar
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onReset={handleResetToDefault}
          onSave={handleSave}
          saving={saving}
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

        {/* Body Container: Classic Mode vs 3-Panel Studio */}
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
              handleSave={handleSave}
              saving={saving}
              username={user?.username}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Panel 1: Left Categories, Templates & Layers */}
            <StudioLeftPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              config={config}
              onApplyTemplate={handleApplyTemplate}
              onToggleLayerVisibility={handleToggleLayerVisibility}
              onToggleLayerLock={handleToggleLayerLock}
              onMoveLayer={handleMoveLayer}
            />

            {/* Panel 2: Center Interactive Live Preview Canvas */}
            <StudioCenterCanvas
              deviceMode={deviceMode}
              config={config}
              previewData={previewData}
              activeElementId={activeElementId}
              onSelectElement={handleSelectElement}
            />

            {/* Panel 3: Right Properties Inspector */}
            <StudioRightInspector
              activeTab={activeTab}
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
            />
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
