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
  CanvasEngineState,
  createDefaultCanvasState,
  CanvasEmbed,
  CanvasElement,
  CanvasElementType,
  RpcCustomLayout,
} from "@/types/studio";
import { getInheritedTextStyle, isTextBasedElement } from "@/components/studio/typographyEngine";
import { SocialAccountSelectorModal } from "@/components/studio/SocialAccountSelectorModal";
import { DiscordRpcCustomizerModal } from "@/components/studio/DiscordRpcCustomizerModal";
import {
  LinkedAccountReference,
  extractSocialHandle,
  resolvePlatformDef,
  sanitizeSocialUrl,
  isSocialElement,
} from "@/components/studio/socialsEngine";
import { StudioTopBar, DeviceMode, StudioView } from "@/components/studio/StudioTopBar";
import { StudioLeftWorkspace } from "@/components/studio/StudioLeftWorkspace";
import { StudioRightPreviewCanvas } from "@/components/studio/StudioRightPreviewCanvas";
import { ResizableDivider } from "@/components/studio/ResizableDivider";
import { ParticlesCanvas } from "@/components/studio/ParticlesCanvas";
import { ClassicCustomizer } from "@/components/studio/ClassicCustomizer";
import { StudioTemplatePreset } from "@/components/studio/templates";
import { StudioFloatingDock, DockPosition, ToolSelection } from "@/components/studio/StudioFloatingDock";
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

  // Adaptive Floating Dock & Contextual Settings Panel State
  const [dockPosition, setDockPosition] = useState<DockPosition>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pixel_studio_dock_position");
        if (saved === "bottom" || saved === "top" || saved === "left" || saved === "right" || saved === "float") {
          return saved as DockPosition;
        }
      } catch {}
    }
    return "bottom";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const handleSelectTool = (tool: ToolSelection) => {
    if (tool.type === "category") {
      setActiveCategory(tool.id as StudioTab);
      setCurrentView("categories");
    } else {
      setCurrentView(tool.id as StudioView);
    }
    setIsSettingsOpen(true);
  };

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
  const [links, setLinks] = useState<LinkedAccountReference[]>([]);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [isRpcModalOpen, setIsRpcModalOpen] = useState(false);
  const [refreshingAccounts, setRefreshingAccounts] = useState(false);
  const [discordPresence, setDiscordPresence] = useState<{
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null>(null);
  const [viewsCount, setViewsCount] = useState<number>(0);
  const [likesCount, setLikesCount] = useState<number>(0);

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
      const idx = prev.layers.findIndex((l) => l.id === layerId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.layers.length) return prev;

      const newLayers = [...prev.layers];
      const temp = newLayers[idx];
      newLayers[idx] = newLayers[targetIdx];
      newLayers[targetIdx] = temp;

      return {
        ...prev,
        layers: newLayers,
      };
    });
  };

  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  const handleUpdateCanvas = useCallback(
    (updater: (prev: CanvasEngineState) => CanvasEngineState) => {
      updateConfigWithHistory((prev) => {
        const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
        const updatedCanvas = updater(currentCanvas);
        return {
          ...prev,
          canvas: updatedCanvas,
        };
      });
    },
    [updateConfigWithHistory]
  );

  const handleAddEmbed = () => {
    updateConfigWithHistory((prev) => {
      const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
      const newEmbedId = `embed_${Date.now()}`;
      const newEmbed: CanvasEmbed = {
        id: newEmbedId,
        title: `Custom Embed #${currentCanvas.embeds.length + 1}`,
        transform: {
          x: 0,
          y: currentCanvas.embeds.length * 160,
          width: prev.layout.maxWidth || 580,
          height: 180,
          rotation: 0,
          zIndex: currentCanvas.embeds.length + 1,
        },
        style: {
          backgroundColor: "rgba(14, 14, 18, 0.85)",
          borderColor: "#26262b",
          borderWidth: 1,
          borderRadius: 20,
          opacity: 90,
          shadowBlur: 20,
          shadowColor: "rgba(0,0,0,0.5)",
          blur: 12,
          backdropBlur: 12,
          padding: 24,
        },
        childrenIds: [],
        isVisible: true,
        isLocked: false,
      };

      const updatedLayers = [
        ...prev.layers,
        {
          id: newEmbedId,
          type: "container" as const,
          label: newEmbed.title,
          visible: true,
          locked: false,
        },
      ];

      setSelectedCanvasId(newEmbedId);
      return {
        ...prev,
        layers: updatedLayers,
        canvas: {
          ...currentCanvas,
          embeds: [...currentCanvas.embeds, newEmbed],
          selectedId: newEmbedId,
          selectedIds: [newEmbedId],
        },
      };
    });
    setMsg({ text: "Added new customizable embed.", type: "success" });
  };

  const refreshProfileLinks = useCallback(async () => {
    try {
      setRefreshingAccounts(true);
      const res = await apiFetch("/api/profile/me");
      if (res.ok) {
        const p = await res.json();
        setLinks(p.links || []);
      }
    } catch {
      // ignore
    } finally {
      setRefreshingAccounts(false);
    }
  }, []);

  // Auto-refresh linked accounts when window regains focus (e.g. returning from /links)
  useEffect(() => {
    const handleFocus = () => {
      refreshProfileLinks();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshProfileLinks]);

  const handleNavigateToLinks = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("pixel_studio_draft_state", JSON.stringify(config));
      }
    } catch {
      // ignore
    }
    if (isDirty) {
      executeSave(false);
    }
    window.open("/links", "_blank");
  };

  const handleAddSocialIcon = (account: LinkedAccountReference) => {
    const platform = resolvePlatformDef(account.icon, account.label);
    const handle = extractSocialHandle(account.url, platform.id, account.label);

    updateConfigWithHistory((prev) => {
      const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
      const newId = `social_${account.id}_${Date.now()}`;
      const targetEmbed = currentCanvas.embeds[0];

      // Calculate safe position inside target embed
      const existingSocials = currentCanvas.elements.filter((el) => isSocialElement(el));
      const startX =
        existingSocials.length > 0
          ? (existingSocials[existingSocials.length - 1].transform.x + 56) % 360
          : 20;

      const newEl: CanvasElement = {
        id: newId,
        type: "socialIcon",
        name: `${account.label || platform.name} Icon`,
        parentEmbedId: targetEmbed ? targetEmbed.id : null,
        transform: {
          x: startX,
          y: 40,
          width: 44,
          height: 44,
          rotation: 0,
          zIndex: currentCanvas.elements.length + 2,
        },
        props: {
          linkId: account.id,
          platform: account.icon || platform.id,
          label: account.label,
          url: account.url,
          handle,
        },
        style: {
          borderRadius: 12,
          iconVariant: "default",
          iconColorMode: "original",
          iconColor: account.color || platform.brandColor,
        },
        isVisible: true,
        isLocked: false,
      };

      setSelectedCanvasId(newId);
      return {
        ...prev,
        canvas: {
          ...currentCanvas,
          elements: [...currentCanvas.elements, newEl],
          selectedId: newId,
          selectedIds: [newId],
        },
      };
    });
    setMsg({ text: `Added ${account.label} icon to embed.`, type: "success" });
  };

  const handleAddSocialPill = (account: LinkedAccountReference) => {
    const platform = resolvePlatformDef(account.icon, account.label);
    const handle = extractSocialHandle(account.url, platform.id, account.label);

    updateConfigWithHistory((prev) => {
      const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
      const newId = `linked_${account.id}_${Date.now()}`;
      const targetEmbed = currentCanvas.embeds[0];

      const newEl: CanvasElement = {
        id: newId,
        type: "linkedAccount",
        name: `${account.label || platform.name} Pill`,
        parentEmbedId: targetEmbed ? targetEmbed.id : null,
        transform: {
          x: 20,
          y: 60,
          width: 220,
          height: 38,
          rotation: 0,
          zIndex: currentCanvas.elements.length + 2,
        },
        props: {
          linkId: account.id,
          platform: account.icon || platform.id,
          label: account.label,
          url: account.url,
          handle,
        },
        style: {
          borderRadius: 14,
          iconVariant: "default",
          iconColorMode: "original",
          iconColor: account.color || platform.brandColor,
        },
        isVisible: true,
        isLocked: false,
      };

      setSelectedCanvasId(newId);
      return {
        ...prev,
        canvas: {
          ...currentCanvas,
          elements: [...currentCanvas.elements, newEl],
          selectedId: newId,
          selectedIds: [newId],
        },
      };
    });
    setMsg({ text: `Added ${account.label} pill to embed.`, type: "success" });
  };

  const handleAddAllSocialBar = () => {
    updateConfigWithHistory((prev) => {
      const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
      const newId = `socials_${Date.now()}`;
      const targetEmbed = currentCanvas.embeds[0];

      // Replace existing generic socials bar if any
      const filteredElements = currentCanvas.elements.filter((el) => el.type !== "socials");

      const newEl: CanvasElement = {
        id: newId,
        type: "socials",
        name: "Social Media Group",
        parentEmbedId: targetEmbed ? targetEmbed.id : null,
        transform: {
          x: 0,
          y: 80,
          width: (prev.layout.maxWidth || 580) - 60,
          height: 48,
          rotation: 0,
          zIndex: currentCanvas.elements.length + 2,
        },
        props: {
          selectedLinkIds: links.map((l) => l.id),
        },
        style: {
          borderRadius: 16,
          iconVariant: "default",
          iconColorMode: "original",
        },
        isVisible: true,
        isLocked: false,
      };

      setSelectedCanvasId(newId);
      return {
        ...prev,
        canvas: {
          ...currentCanvas,
          elements: [...filteredElements, newEl],
          selectedId: newId,
          selectedIds: [newId],
        },
      };
    });
    setMsg({ text: "Added unified social bar with all connected accounts.", type: "success" });
  };

  const handleAddElement = (type: CanvasElementType) => {
    if (type === "socialIcon" || type === "socials" || type === "linkedAccount") {
      setIsSocialModalOpen(true);
      return;
    }

    updateConfigWithHistory((prev) => {
      const currentCanvas = prev.canvas || createDefaultCanvasState(prev);
      const newId = `${type}_${Date.now()}`;
      const targetEmbed = currentCanvas.embeds[0];

      let initialStyle: Record<string, any> = {
        color: "#ffffff",
        fontSize: 14,
        borderRadius: 12,
      };

      let initialProps: Record<string, any> = {};

      if (isTextBasedElement(type)) {
        initialStyle = getInheritedTextStyle(type, currentCanvas.textStyleGroups);
        if (type === "displayName") initialProps = { text: displayName || "Display Name" };
        else if (type === "heading" || type === "title") initialProps = { text: "Heading Title" };
        else if (type === "subtitle" || type === "tagline") initialProps = { text: "Digital Identity // Nothing OS" };
        else if (type === "bio" || type === "description") initialProps = { text: bio || "Biography description text..." };
        else if (type === "footerText") initialProps = { text: "© Pixel.gg Studio • All Rights Reserved" };
        else if (type === "timestamp") initialProps = { text: "Updated today" };
        else if (type === "authorText") initialProps = { text: "Author Name" };
        else if (type === "fieldName") initialProps = { text: "FIELD NAME" };
        else if (type === "fieldValue") initialProps = { text: "Custom value information" };
        else initialProps = { content: "New editable text component" };
      } else if (type === "image") {
        initialProps = { imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500" };
      }

      const newEl: CanvasElement = {
        id: newId,
        type,
        name: `Custom ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        parentEmbedId: targetEmbed ? targetEmbed.id : null,
        transform: {
          x: 0,
          y: 0,
          width: (prev.layout.maxWidth || 580) - 60,
          height: type === "divider" ? 2 : isTextBasedElement(type) ? 36 : 120,
          rotation: 0,
          zIndex: currentCanvas.elements.length + 2,
        },
        props: initialProps,
        style: initialStyle,
        isVisible: true,
        isLocked: false,
      };

      setSelectedCanvasId(newId);
      return {
        ...prev,
        canvas: {
          ...currentCanvas,
          elements: [...currentCanvas.elements, newEl],
          selectedId: newId,
          selectedIds: [newId],
        },
      };
    });
    setMsg({ text: `Added new ${type} component to canvas.`, type: "success" });
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
          setViewsCount(p.views ?? 0);
          setLikesCount(p.likesCount ?? 0);

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
                  canvas: parsed.canvas || DEFAULT_DESIGN_CONFIG.canvas,
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
    views: viewsCount,
    likes: likesCount,
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
          setCurrentView={(v) => {
            setCurrentView(v);
            setIsSettingsOpen(true);
          }}
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
          <div
            ref={workspaceContainerRef}
            style={getPassthroughBackgroundStyle()}
            className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full h-full"
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

            {/* FULL-SCREEN LIVE PROFILE PREVIEW WORKSPACE */}
            <div className="w-full h-full flex-1 flex flex-col overflow-hidden relative z-10">
              <StudioRightPreviewCanvas
                deviceMode={deviceMode}
                setDeviceMode={setDeviceMode}
                config={config}
                previewData={previewData}
                activeCategory={activeCategory}
                onSelectCategory={(cat) => {
                  setActiveCategory(cat);
                  setCurrentView("categories");
                  setIsSettingsOpen(true);
                }}
                onUpdateCanvas={handleUpdateCanvas}
                selectedCanvasId={selectedCanvasId}
                onSelectCanvasId={(id) => setSelectedCanvasId(id)}
                onOpenSocialSelector={() => setIsSocialModalOpen(true)}
                onOpenRpcCustomizer={() => setIsRpcModalOpen(true)}
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
                isEditorVisible={isSettingsOpen}
                setIsEditorVisible={setIsSettingsOpen}
                isPremium={Boolean(user?.premiumStatus)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                isPreviewVisible={true}
                setIsPreviewVisible={() => {}}
                onResetPanelSplit={handleResetPanelSplit}
                isFullscreenPreview={isFullscreenPreview}
                onToggleFullscreenPreview={handleToggleFullscreenPreview}
              />
            </div>

            {/* UNIFIED ADAPTIVE FLOATING DOCK & APP DIRECTORY (MODES A, B, C) */}
            <StudioFloatingDock
              position={dockPosition}
              onPositionChange={(newPos) => {
                setDockPosition(newPos);
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem("pixel_studio_dock_position", newPos);
                  } catch {}
                }
              }}
              activeCategory={activeCategory}
              currentView={currentView}
              isSettingsOpen={isSettingsOpen}
              onSelectTool={handleSelectTool}
              onCloseSettings={() => setIsSettingsOpen(false)}
              containerRef={workspaceContainerRef}
              themeAccentColor={config.identity?.titleColor || "#ffffff"}
              onAddEmbed={handleAddEmbed}
              onAddElement={handleAddElement}
              onOpenSocialSelector={() => setIsSocialModalOpen(true)}
              onOpenRpcCustomizer={() => setIsRpcModalOpen(true)}
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
                onAddEmbed={handleAddEmbed}
                onAddElement={handleAddElement}
                onOpenSocialSelector={() => setIsSocialModalOpen(true)}
                onOpenRpcCustomizer={() => setIsRpcModalOpen(true)}
                selectedId={selectedCanvasId}
                onSelectElement={(id) => setSelectedCanvasId(id)}
                transparencyMode={transparencyMode}
                panelOpacity={panelOpacity}
                panelBlur={panelBlur}
                panelBorderOpacity={panelBorderOpacity}
                isFloatingContext={true}
                onClose={() => setIsSettingsOpen(false)}
              />
            </StudioFloatingDock>
          </div>
        )}
      </div>

      {/* Social Media Linked Account Selection Modal */}
      <SocialAccountSelectorModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        linkedAccounts={links}
        existingElementLinkIds={
          (config.canvas?.elements || [])
            .map((el) => el.props?.linkId)
            .filter(Boolean) as string[]
        }
        onAddAccountAsIcon={handleAddSocialIcon}
        onAddAccountAsPill={handleAddSocialPill}
        onAddAllAsSocialBar={handleAddAllSocialBar}
        onRefreshAccounts={refreshProfileLinks}
        onNavigateToLinksPage={handleNavigateToLinks}
        refreshing={refreshingAccounts}
      />

      {/* Discord Rich Presence Customizer Modal (Premium Level 2) */}
      <DiscordRpcCustomizerModal
        isOpen={isRpcModalOpen}
        onClose={() => setIsRpcModalOpen(false)}
        currentLayout={config.discordRpc?.customLayout}
        liveData={discordPresence}
        isPremium={Boolean(user?.premiumStatus || (user as any)?.role === "ADMIN")}
        onSaveLayout={(newLayout: RpcCustomLayout) => {
          setConfig((prev) => ({
            ...prev,
            discordRpc: {
              ...prev.discordRpc,
              customLayout: newLayout,
            },
          }));
          setMsg({ text: "Discord Rich Presence custom layout updated!", type: "success" });
        }}
        onOpenUpgradeModal={() => {
          window.location.href = "/pricing";
        }}
      />
    </AccountLayout>
  );
}
