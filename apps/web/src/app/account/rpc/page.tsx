"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Copy,
  Check,
  RefreshCw,
  Download,
  Sparkles,
  Eye,
  EyeOff,
  Plug,
  ShieldCheck,
  Code2,
  Clock,
  Users,
  Flame,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Tv,
  Headphones,
  Trophy,
  Play,
  RotateCcw,
  ExternalLink,
  User as UserIcon,
  Radio,
  UploadCloud,
  Move,
  Crop,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Link2,
  BarChart2,
  Tag,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch, getApiBaseUrl, getStoredToken, setStoredToken, getCachedUser } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { ImageCustomizerModal, CropData } from "@/components/rpc/ImageCustomizerModal";
import {
  formatRichPresenceField,
  CustomStreak,
  CustomStatistic,
  CustomStatusLabel,
} from "@/lib/rpcFormat";

function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "Recently";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 15) return "Just now";
  if (elapsed < 60) return `${elapsed}s ago`;
  const mins = Math.floor(elapsed / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parseTimestampMs(val: string | number | null | undefined): number | null {
  if (val === 0 || val === "0") return 0;
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const num = Number(val);
  if (!Number.isNaN(num) && /^\d+$/.test(String(val).trim())) return num;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? null : parsed;
}

function toLocalDateStr(val: string | number | null | undefined): string {
  const ms = parseTimestampMs(val);
  if (ms === null) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeStr(val: string | number | null | undefined): string {
  const ms = parseTimestampMs(val);
  if (ms === null) return "";
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function combineLocalDateTimeToIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr && !timeStr) return null;
  const baseDate = dateStr || toLocalDateStr(Date.now());
  const baseTime = timeStr || "00:00";
  const [y, m, d] = baseDate.split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = baseTime.split(":").map((n) => parseInt(n, 10));
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

interface RpcConfig {
  appId?: string;
  appName?: string;
  activityType?: "streaming" | "playing" | "listening" | "watching" | "competing";
  streamUrl?: string;
  state?: string;
  stateUrl?: string | null;
  stateEnabled?: boolean;
  details?: string;
  detailsUrl?: string | null;
  detailsEnabled?: boolean;
  useProfileAvatar?: boolean;
  largeImageEnabled?: boolean;
  largeImage?: string;
  largeImageText?: string;
  largeImageUrl?: string | null;
  largeImageCrop?: string | null;
  smallImageEnabled?: boolean;
  smallImage?: string;
  smallImageText?: string;
  smallImageUrl?: string | null;
  smallImageCrop?: string | null;
  timestampMode?: "none" | "now" | "time" | "custom";
  startTimestamp?: string | null;
  endTimestamp?: string | null;
  partySize?: number | null;
  partyMax?: number | null;
  button1Enabled?: boolean;
  button1Label?: string;
  button1Url?: string;
  button2Enabled?: boolean;
  button2Label?: string;
  button2Url?: string;
  buttonSize?: "small" | "medium" | "large";
  showProfileRpc?: boolean;
  enableDiscordRpc?: boolean;
  streaks?: CustomStreak[];
  statistics?: CustomStatistic[];
  statusLabels?: CustomStatusLabel[];
}

const DEFAULT_RPC: RpcConfig = {
  appId: "1523632136878559302",
  appName: "Pixel.gg",
  activityType: "streaming",
  streamUrl: "https://twitch.tv/pixelgg",
  state: "Discover my personal page on PIXEL.GG.",
  stateUrl: null,
  stateEnabled: true,
  details: "Welcome to my profile!",
  detailsUrl: null,
  detailsEnabled: true,
  useProfileAvatar: true,
  largeImageEnabled: true,
  largeImage: "",
  largeImageText: "PIXEL.GG Platform",
  largeImageUrl: null,
  largeImageCrop: null,
  smallImageEnabled: true,
  smallImage: "https://pixlpresence1-web.vercel.app/server-icon.png",
  smallImageText: "PIXEL.GG",
  smallImageUrl: null,
  smallImageCrop: null,
  button1Enabled: true,
  button1Label: "View Profile",
  button1Url: "https://pixel.gg",
  button2Enabled: true,
  button2Label: "Get PixelsRPC",
  button2Url: "https://pixel.gg/rpc",
  buttonSize: "medium",
  showProfileRpc: true,
  enableDiscordRpc: true,
  partySize: null,
  partyMax: null,
  timestampMode: "now",
  startTimestamp: null,
  endTimestamp: null,
  streaks: [],
  statistics: [],
  statusLabels: [],
};

const PRESETS: Record<string, Partial<RpcConfig>> = {
  pixel: {
    appId: "1523632136878559302",
    appName: "Pixel.gg",
    state: "Browsing Pixel.gg",
    details: "Customizing Rich Presence",
    largeImage: "https://pixlpresence1-web.vercel.app/server-icon.png",
    largeImageText: "Pixel.gg Platform",
    smallImage: "",
    smallImageText: "",
    button1Label: "View Profile",
    button1Url: "https://pixel.gg",
    button2Label: "Get PixelsRPC",
    button2Url: "https://pixel.gg",
    partySize: null,
    partyMax: null,
  },
  dev: {
    appId: "1523632136878559302",
    appName: "Visual Studio Code",
    state: "Building Next.js + Express Monorepo",
    details: "Workspace: discord-rpc-platform",
    largeImage: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg",
    largeImageText: "Editing apps/web/src/app/account/rpc/page.tsx",
    smallImage: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    smallImageText: "TypeScript 5.0",
    button1Label: "View Source",
    button1Url: "https://github.com/Rockybhaiff94/pixlpresence1",
    button2Label: "Visit Portfolio",
    button2Url: "https://pixel.gg",
    partySize: 1,
    partyMax: 1,
  },
  gaming: {
    appId: "1523632136878559302",
    appName: "Cyberpunk 2077",
    state: "Exploring Night City // Act II",
    details: "In Combat // Tier 5 Sandevistan Active",
    largeImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80",
    largeImageText: "Night City Legend",
    smallImage: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
    smallImageText: "Hardcore Difficulty",
    button1Label: "Steam Profile",
    button1Url: "https://steamcommunity.com",
    button2Label: "Pixel Bio",
    button2Url: "https://pixel.gg",
    partySize: 1,
    partyMax: 4,
  },
};

export default function AccountRpcStudioPage() {
  const { user: authUser, token: authContextToken, status: authStatus } = useAuth();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(885); // 14:45 initial
  const [largeImageFailed, setLargeImageFailed] = useState(false);
  const [smallImageFailed, setSmallImageFailed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    username?: string;
    avatar?: string;
    globalName?: string;
  } | null>(null);

  // Roblox-Style Quick Device Authorization Linking State Machine
  type LinkingState =
    | "idle"
    | "generating"
    | "waiting"
    | "verifying"
    | "linked"
    | "expired"
    | "failed"
    | "cancelled";

  const [linkingState, setLinkingState] = useState<LinkingState>("idle");
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    sessionId: string;
    code: string;
    codeId: string;
    expiresAt: string;
    expiresAtMs: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  type DeviceConnState =
    | "not_linked"
    | "authorizing"
    | "linking"
    | "connected"
    | "syncing"
    | "reconnecting"
    | "disconnected"
    | "offline"
    | "unauthorized"
    | "discord_unavailable"
    | "error";

  type DevicePubStatus =
    | "not_published"
    | "preparing"
    | "publishing"
    | "active"
    | "update_pending"
    | "failed"
    | "cleared";

  interface LinkedDeviceItem {
    id: string;
    deviceName?: string;
    consumedAt: string;
    lastUsedAt?: string;
    createdAt?: string;
    isOnline?: boolean;
    connectionState?: DeviceConnState;
    discordAvailable?: boolean;
    publishingStatus?: DevicePubStatus;
    pluginVersion?: string;
    lastAppliedRevision?: number;
    activeTitle?: string | null;
    lastError?: string | null;
  }

  const [linkedDevices, setLinkedDevices] = useState<LinkedDeviceItem[]>([]);
  const [unlinkingDeviceId, setUnlinkingDeviceId] = useState<string | null>(null);
  const [confirmedRevision, setConfirmedRevision] = useState<number | null>(null);
  const [copiedInstallCmd, setCopiedInstallCmd] = useState(false);

  // Monotonic session tracking & in-flight abort refs to completely eliminate UI flickering
  const activeSessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track user modifications so background requests never overwrite unsaved edits
  const isDirtyRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Synchronous initialization from localStorage prevents any UI flickering or preview switching
  const [rpc, setRpc] = useState<RpcConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("pixel_rpc_config");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return {
              ...DEFAULT_RPC,
              ...parsed,
            };
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return DEFAULT_RPC;
  });

  // FIX-04: Automatic Discord RPC Persistence & Live Synchronization Pipeline
  type RpcSyncStatus = "idle" | "saving" | "synced" | "error";
  const [syncStatus, setSyncStatus] = useState<RpcSyncStatus>("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const rpcVersionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRpcRef = useRef<RpcConfig>(DEFAULT_RPC);

  // Helper to execute debounced backend persistence and live socket synchronization
  const executeAutoSaveAndSync = useCallback(async (version: number) => {
    setSyncStatus("saving");
    try {
      const targetRpc = currentRpcRef.current;
      const payload: any = {
        ...targetRpc,
        partySize: targetRpc.partySize !== null && targetRpc.partySize !== undefined ? Number(targetRpc.partySize) : null,
        partyMax: targetRpc.partyMax !== null && targetRpc.partyMax !== undefined ? Number(targetRpc.partyMax) : null,
      };
      // Strip virtual and read-only fields so Prisma does not throw validation errors
      delete payload.revision;
      delete payload.id;
      delete payload.userId;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.username;
      delete payload.userAvatar;
      delete payload.enabled;

      let res = await apiFetch("/api/rpc/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Cold start / 502 / 504 retry once after 1.5s
      if (!res.ok && [502, 503, 504].includes(res.status)) {
        await new Promise((r) => setTimeout(r, 1500));
        if (version !== rpcVersionRef.current) return;
        res = await apiFetch("/api/rpc/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      // Guard against stale response if a newer edit occurred in flight
      if (version !== rpcVersionRef.current) return;

      if (res.ok) {
        isDirtyRef.current = false;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("pixel_rpc_config", JSON.stringify(payload));
          } catch { }
        }
        setSyncStatus("synced");
        setLastSyncedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      } else {
        setSyncStatus("error");
      }
    } catch (err) {
      if (version === rpcVersionRef.current) {
        setSyncStatus("error");
      }
    }
  }, []);

  // Helper to update RPC state and synchronously sync to localStorage + auto-save/sync
  const updateRpc = (updates: Partial<RpcConfig>) => {
    if (updates.largeImage !== undefined) setLargeImageFailed(false);
    if (updates.smallImage !== undefined) setSmallImageFailed(false);
    isDirtyRef.current = true;
    const version = ++rpcVersionRef.current;
    setRpc((prev) => {
      const next = { ...prev, ...updates };
      currentRpcRef.current = next;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pixel_rpc_config", JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });

    setSyncStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      executeAutoSaveAndSync(version);
    }, 600);
  };

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        executeAutoSaveAndSync(rpcVersionRef.current);
      }
    };
  }, [executeAutoSaveAndSync]);

  // Custom Streaks, Statistics & Status Labels tab state & progressive disclosure toggles
  const [customTab, setCustomTab] = useState<"streaks" | "statistics" | "labels">("streaks");
  const [showActivityUrls, setShowActivityUrls] = useState(false);
  const [showLargeAdvanced, setShowLargeAdvanced] = useState(false);
  const [showSmallAdvanced, setShowSmallAdvanced] = useState(false);
  const [expandedCustomItems, setExpandedCustomItems] = useState<Record<string, boolean>>({});
  const toggleCustomItemAdvanced = (id: string) =>
    setExpandedCustomItems((prev) => ({ ...prev, [id]: !prev[id] }));

  // Streak handlers
  const addStreak = (streak?: Partial<CustomStreak>) => {
    const newStreak: CustomStreak = {
      id: `streak_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: streak?.name || "Win Streak",
      value: streak?.value ?? 5,
      prefix: streak?.prefix ?? "🔥",
      suffix: streak?.suffix ?? "Wins",
      enabled: true,
      targetField: streak?.targetField || "details",
    };
    updateRpc({ streaks: [...(rpc.streaks || []), newStreak] });
  };

  const updateStreak = (id: string, updates: Partial<CustomStreak>) => {
    const next = (rpc.streaks || []).map((s) => (s.id === id ? { ...s, ...updates } : s));
    updateRpc({ streaks: next });
  };

  const removeStreak = (id: string) => {
    const next = (rpc.streaks || []).filter((s) => s.id !== id);
    updateRpc({ streaks: next });
  };

  const moveStreak = (index: number, direction: "up" | "down") => {
    const list = [...(rpc.streaks || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    updateRpc({ streaks: list });
  };

  // Statistics handlers
  const addStatistic = (stat?: Partial<CustomStatistic>) => {
    const newStat: CustomStatistic = {
      id: `stat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: stat?.label || "Rank",
      value: stat?.value ?? "Diamond",
      prefix: stat?.prefix ?? "🏆",
      suffix: stat?.suffix ?? "",
      enabled: true,
      targetField: stat?.targetField || "state",
    };
    updateRpc({ statistics: [...(rpc.statistics || []), newStat] });
  };

  const updateStatistic = (id: string, updates: Partial<CustomStatistic>) => {
    const next = (rpc.statistics || []).map((s) => (s.id === id ? { ...s, ...updates } : s));
    updateRpc({ statistics: next });
  };

  const removeStatistic = (id: string) => {
    const next = (rpc.statistics || []).filter((s) => s.id !== id);
    updateRpc({ statistics: next });
  };

  const moveStatistic = (index: number, direction: "up" | "down") => {
    const list = [...(rpc.statistics || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    updateRpc({ statistics: list });
  };

  // Status labels handlers
  const addStatusLabel = (item?: Partial<CustomStatusLabel>) => {
    const newLabel: CustomStatusLabel = {
      id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: item?.label || "MVP",
      emoji: item?.emoji ?? "👑",
      enabled: true,
      targetField: item?.targetField || "details",
    };
    updateRpc({ statusLabels: [...(rpc.statusLabels || []), newLabel] });
  };

  const updateStatusLabel = (id: string, updates: Partial<CustomStatusLabel>) => {
    const next = (rpc.statusLabels || []).map((l) => (l.id === id ? { ...l, ...updates } : l));
    updateRpc({ statusLabels: next });
  };

  const removeStatusLabel = (id: string) => {
    const next = (rpc.statusLabels || []).filter((l) => l.id !== id);
    updateRpc({ statusLabels: next });
  };

  // Image Customizer Modal State
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customizerSlot, setCustomizerSlot] = useState<"largeImage" | "smallImage">("largeImage");

  const parseCrop = (cropStr?: string | null): CropData | null => {
    if (!cropStr) return null;
    try {
      const parsed = JSON.parse(cropStr);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const openCustomizer = (slot: "largeImage" | "smallImage") => {
    setCustomizerSlot(slot);
    setCustomizerOpen(true);
  };

  const handleCustomizerApply = (url: string, crop: CropData) => {
    if (customizerSlot === "largeImage") {
      updateRpc({
        largeImage: url,
        largeImageCrop: JSON.stringify(crop),
        useProfileAvatar: false, // User explicitly set a custom large image
      });
    } else {
      updateRpc({
        smallImage: url,
        smallImageCrop: JSON.stringify(crop),
      });
    }
  };

  // Restore official personalized PIXEL.GG defaults
  const handleRestoreDefaults = () => {
    if (!confirm("Reset your Rich Presence to official PIXEL.GG default settings?")) return;
    const username = currentUser?.username || "user";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pixlpresence1-web.vercel.app";
    const userAvatar = currentUser?.avatar || "";

    const restored: RpcConfig = {
      ...DEFAULT_RPC,
      activityType: "streaming",
      streamUrl: `https://twitch.tv/${username}`,
      details: "Welcome to my profile!",
      state: "Discover my personal page on PIXEL.GG.",
      useProfileAvatar: true,
      largeImage: userAvatar || DEFAULT_RPC.largeImage,
      largeImageText: `@${username} on PIXEL.GG`,
      largeImageCrop: null,
      smallImage: "https://pixlpresence1-web.vercel.app/server-icon.png",
      smallImageText: "PIXEL.GG",
      smallImageCrop: null,
      button1Enabled: true,
      button1Label: "View Profile",
      button1Url: `${origin}/${username}`,
      button2Enabled: true,
      button2Label: "Get PixelsRPC",
      button2Url: `${origin}/rpc`,
    };

    updateRpc(restored);
  };

  // Real-time ticking elapsed timer for Discord preview
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} elapsed`;
    }
    return `${pad(minutes)}:${pad(seconds)} elapsed`;
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadData() {
      try {
        // Fetch token, RPC config, and user profile concurrently
        const [tokenRes, rpcRes, accountRes] = await Promise.all([
          apiFetch("/api/profile/me/token"),
          apiFetch("/api/rpc/me"),
          apiFetch("/api/account/overview"),
        ]);

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.token) {
            setToken(tokenData.token);
            setStoredToken(tokenData.token);
          }
        } else if (authUser?.appToken) {
          setToken(authUser.appToken);
          setStoredToken(authUser.appToken);
        }

        if (accountRes.ok) {
          const accountData = await accountRes.json();
          if (accountData?.user) {
            setCurrentUser(accountData.user);
          }
        } else if (authUser) {
          setCurrentUser(authUser as any);
        }

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && typeof rpcData === "object" && Object.keys(rpcData).length > 0) {
            setRpc((prev) => {
              if (isDirtyRef.current) return prev;

              const merged: RpcConfig = { ...prev };
              for (const [key, value] of Object.entries(rpcData)) {
                if (["id", "userId", "createdAt", "updatedAt", "revision", "username", "userAvatar"].includes(key)) continue;
                if (value !== undefined) {
                  (merged as Record<string, unknown>)[key] = value;
                }
              }
              currentRpcRef.current = merged;

              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("pixel_rpc_config", JSON.stringify(merged));
                } catch {
                  // ignore
                }
              }
              return merged;
            });
          }
        }
      } catch (err) {
        console.error("[RPC Studio] Error loading config:", err);
      }
      fetchLinkedDevices();
    }
    loadData();
  }, []);

  // Reset image error states when URLs change
  useEffect(() => {
    setLargeImageFailed(false);
  }, [rpc.largeImage, rpc.useProfileAvatar, currentUser?.avatar]);

  useEffect(() => {
    setSmallImageFailed(false);
  }, [rpc.smallImage]);

  const fetchLinkedDevices = async () => {
    try {
      const activeTok = getStoredToken() || token;
      const headers: Record<string, string> = {};
      if (activeTok) headers["Authorization"] = `Bearer ${activeTok}`;
      const res = await apiFetch("/api/rpc/device/list", { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) setLinkedDevices(list);
      }
    } catch {
      // ignore
    }
  };

  // Real-time bidirectional connection and synchronization socket
  useEffect(() => {
    const currentToken = getStoredToken() || token;
    if (!currentToken) return;

    let socket: Socket | null = null;
    try {
      const socketUrl = getApiBaseUrl();
      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      socket.on("connect", () => {
        socket?.emit("authenticate", currentToken, { clientType: "web" });
      });

      socket.on("device_linked", () => {
        fetchLinkedDevices();
      });

      socket.on("device_status_update", (updatedDevice: any) => {
        setLinkedDevices((prev) => {
          const index = prev.findIndex((d) => d.id === updatedDevice.deviceId || d.id === updatedDevice.id);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...updatedDevice };
            return copy;
          }
          return [...prev, updatedDevice];
        });
      });

      socket.on("device_revoked", (revoked: { deviceId: string; reason: string }) => {
        setLinkedDevices((prev) => prev.filter((d) => d.id !== revoked.deviceId));
      });

      socket.on("rpc_sync_confirmed", (ack: { revision: number; publishingStatus: string; activeTitle?: string }) => {
        setSyncStatus("synced");
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setConfirmedRevision(ack.revision);
      });
    } catch (err) {
      console.warn("[RPC Studio] Socket init notice:", err);
    }

    const interval = setInterval(() => {
      fetchLinkedDevices();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  // Helper to completely purge active timers and abort in-flight requests
  const clearSessionPointers = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Synchronize expiration timer accurately on tab focus / visibility change
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && currentSession && linkingState === "waiting") {
        const remaining = Math.max(0, Math.floor((currentSession.expiresAtMs - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearSessionPointers();
          setLinkingState("expired");
          setCurrentSession(null);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [currentSession, linkingState]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      clearSessionPointers();
    };
  }, []);

  const handleGenerateLinkingCode = async () => {
    // 1. Immediately invalidate previous session and kill timers / pending requests
    clearSessionPointers();
    const newSessionId = `rpc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeSessionIdRef.current = newSessionId;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Reset session view and enter single 'generating' state
    setCurrentSession(null);
    setTimeLeft(0);
    setLinkingError(null);
    setIsAuthError(false);
    setLinkingState("generating");

    try {
      // Ensure we have the user's active token from localStorage, cookie, auth context, cached user, or live profile
      let currentToken = getStoredToken() || authContextToken || authUser?.appToken || token;

      if (!currentToken) {
        const cached = getCachedUser();
        if (cached?.appToken || cached?.token) {
          currentToken = String(cached.appToken || cached.token).trim();
          setToken(currentToken);
          setStoredToken(currentToken);
        }
      }

      // Proactively discover active session token via same-origin relative endpoints if token is not cached
      if (!currentToken) {
        try {
          const authMeRes = await fetch("/api/auth/me", {
            credentials: "include",
            signal: controller.signal,
          });
          if (authMeRes.ok) {
            const authMeData = await authMeRes.json();
            if (authMeData?.appToken) {
              currentToken = authMeData.appToken;
              setToken(authMeData.appToken);
              setStoredToken(authMeData.appToken);
            }
          }
        } catch (_) { }
      }

      if (!currentToken) {
        try {
          const tRes = await fetch("/api/profile/me/token", {
            credentials: "include",
            signal: controller.signal,
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            if (tData?.token) {
              currentToken = tData.token;
              setToken(tData.token);
              setStoredToken(tData.token);
            }
          }
        } catch (_) { }
      }

      // If user is truly unauthenticated
      if (!currentToken && authStatus === "UNAUTHENTICATED") {
        setIsAuthError(true);
        throw new Error("Authentication required. Please sign in with Discord to generate a device linking code.");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
        headers["X-App-Token"] = currentToken;
      }

      const bodyPayload = JSON.stringify({ token: currentToken || undefined });

      // Dual-path authorization request: Same-origin relative URL first, then direct API base URL fallback
      let res: Response | null = null;
      let lastNetworkErr: any = null;

      try {
        res = await fetch("/api/rpc/device/authorize", {
          method: "POST",
          headers,
          credentials: "include",
          body: bodyPayload,
          signal: controller.signal,
        });
      } catch (proxyErr: any) {
        lastNetworkErr = proxyErr;
      }

      // If same-origin proxy failed or returned 502/503/504 (cold start), attempt direct API base URL
      if (!res || (!res.ok && [502, 503, 504].includes(res.status))) {
        try {
          const directApiUrl = `${getApiBaseUrl()}/api/rpc/device/authorize`;
          const directRes = await fetch(directApiUrl, {
            method: "POST",
            headers,
            credentials: "include",
            body: bodyPayload,
            signal: controller.signal,
          });
          if (directRes.ok || directRes.status === 401 || !res) {
            res = directRes;
          }
        } catch (directErr: any) {
          if (!res) lastNetworkErr = directErr;
        }
      }

      // If both fetch attempts threw network/CORS exceptions
      if (!res) {
        throw (lastNetworkErr || new Error("Failed to communicate with authorization server. Please check your network connection."));
      }

      // If unauthorized, attempt a fresh token retrieval and retry once before failing
      if (res.status === 401) {
        try {
          const freshTokenRes = await fetch("/api/profile/me/token", {
            credentials: "include",
            signal: controller.signal,
          });
          if (freshTokenRes.ok) {
            const freshData = await freshTokenRes.json();
            if (freshData?.token) {
              currentToken = freshData.token;
              setToken(freshData.token);
              setStoredToken(freshData.token);
              headers["Authorization"] = `Bearer ${currentToken}`;
              headers["X-App-Token"] = currentToken;
              const retryBody = JSON.stringify({ token: currentToken });
              try {
                res = await fetch("/api/rpc/device/authorize", {
                  method: "POST",
                  headers,
                  credentials: "include",
                  body: retryBody,
                  signal: controller.signal,
                });
              } catch (_) {
                res = await fetch(`${getApiBaseUrl()}/api/rpc/device/authorize`, {
                  method: "POST",
                  headers,
                  credentials: "include",
                  body: retryBody,
                  signal: controller.signal,
                });
              }
            }
          }
        } catch (_) { }
      }

      // Disregard if a newer session was triggered or component unmounted
      if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) {
        return;
      }

      if (!res.ok) {
        let errJson: any = null;
        try {
          errJson = await res.json();
        } catch (_) {
          try {
            const t = await res.text();
            if (t && t.length < 200) errJson = { error: t };
          } catch (_) { }
        }
        if (res.status === 401 || (errJson?.error && String(errJson.error).toLowerCase().includes("unauthorized"))) {
          setIsAuthError(true);
          throw new Error("Authentication required. Please sign in with Discord to generate a device linking code.");
        }
        throw new Error(errJson?.error || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) {
        return;
      }

      const expiresAtMs = new Date(data.expiresAt).getTime();
      const initialRemaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

      if (initialRemaining <= 0) {
        setLinkingState("expired");
        return;
      }

      const sessionData = {
        sessionId: newSessionId,
        code: data.code,
        codeId: data.codeId,
        expiresAt: data.expiresAt,
        expiresAtMs,
      };

      setCurrentSession(sessionData);
      setTimeLeft(initialRemaining);
      setLinkingState("waiting");

      // Start countdown timer tied strictly to newSessionId
      countdownTimerRef.current = setInterval(() => {
        if (activeSessionIdRef.current !== newSessionId) return;
        const currentRemaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        setTimeLeft(currentRemaining);
        if (currentRemaining <= 0) {
          clearSessionPointers();
          if (activeSessionIdRef.current === newSessionId) {
            setLinkingState("expired");
            setCurrentSession(null);
          }
        }
      }, 1000);

      // Start live status poller tied strictly to newSessionId
      pollingTimerRef.current = setInterval(async () => {
        if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) return;
        try {
          const pollHeaders: Record<string, string> = {};
          const activeTok = getStoredToken() || currentToken;
          if (activeTok) {
            pollHeaders["Authorization"] = `Bearer ${activeTok}`;
            pollHeaders["X-App-Token"] = activeTok;
          }
          const pollRes = await apiFetch(`/api/rpc/device/status?codeId=${data.codeId}`, {
            headers: pollHeaders,
            signal: controller.signal,
          });

          // Disregard if session was invalidated while polling was in-flight
          if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) return;

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (activeSessionIdRef.current !== newSessionId) return;

            if (pollData.status === "CONSUMED") {
              clearSessionPointers();
              setLinkingState("linked");
              setCurrentSession(null);
              fetchLinkedDevices();
            } else if (pollData.status === "EXPIRED" || pollData.status === "REVOKED") {
              clearSessionPointers();
              setLinkingState("expired");
              setCurrentSession(null);
            }
          }
        } catch (pollErr: any) {
          if (pollErr?.name === "AbortError" || activeSessionIdRef.current !== newSessionId) return;
          // Ignore transient polling network hiccups
        }
      }, 2000);

    } catch (err: any) {
      if (controller.signal.aborted || activeSessionIdRef.current !== newSessionId) {
        return;
      }
      console.error("[RPC Studio] Failed to generate device linking code:", err);

      let msg = "A network or server error occurred. Please check your connection and try again.";
      if (typeof err === "string" && err.trim().length > 0) {
        msg = err.trim();
      } else if (err?.message && typeof err.message === "string" && err.message.trim().length > 0) {
        msg = err.message.trim();
      } else if (err?.error && typeof err.error === "string" && err.error.trim().length > 0) {
        msg = err.error.trim();
      }

      const isAuth =
        isAuthError ||
        msg.includes("401") ||
        msg.toLowerCase().includes("auth") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("session") ||
        authStatus === "UNAUTHENTICATED";

      if (isAuth) {
        setIsAuthError(true);
      }
      setLinkingError(msg);
      setLinkingState("failed");
    }
  };

  const handleCancelLinking = async () => {
    clearSessionPointers();
    activeSessionIdRef.current = null;
    setCurrentSession(null);
    setTimeLeft(0);
    setLinkingState("cancelled");

    try {
      await apiFetch("/api/rpc/device/revoke", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setLinkingState("idle");
    }
  };

  const handleUnlinkDevice = async (deviceId: string) => {
    if (!confirm("Disconnect and unlink this Discord client from your Pixel.gg profile?")) return;
    setUnlinkingDeviceId(deviceId);

    // Optimistically update device list locally
    setLinkedDevices((prev) => prev.filter((d) => d.id !== deviceId));

    try {
      const activeTok = getStoredToken() || token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeTok) headers["Authorization"] = `Bearer ${activeTok}`;

      await apiFetch("/api/rpc/device/revoke", {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceId }),
      });
      fetchLinkedDevices();
    } catch (err) {
      console.error("Failed to unlink device", err);
      fetchLinkedDevices();
    } finally {
      setUnlinkingDeviceId(null);
    }
  };

  const installCommand = `irm ${typeof window !== "undefined" ? window.location.origin : "https://pixlpresence1-web.vercel.app"
    }/install.ps1 | iex`;

  const handleCopyInstallCmd = () => {
    navigator.clipboard.writeText(installCommand);
    setCopiedInstallCmd(true);
    setTimeout(() => setCopiedInstallCmd(false), 2000);
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (
      !confirm(
        "Regenerating your App Token will immediately revoke your old token and disconnect any running Vencord plugin sessions until you paste the new token. Proceed?"
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await apiFetch("/api/profile/me/token", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } catch (err) {
      console.error("[RPC Studio] Failed to regenerate token:", err);
    } finally {
      setRegenerating(false);
    }
  };



  const vencordConsoleSnippet = `// === PixelsRPC Vencord Quick-Start ===
(() => {
  const token = "${token || 'PASTE_YOUR_TOKEN_HERE'}";
  const apiUrl = "${typeof window !== 'undefined' ? window.location.origin : 'https://pixlpresence1-web.vercel.app'}";
  if (window.PixelsRPC) {
    window.PixelsRPC.start({ token, apiUrl });
  } else {
    console.info("[PixelsRPC] Recommended: Install the native PixelsRPC plugin into Vencord: src/userplugins/pixelsrpc");
  }
})();`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(vencordConsoleSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleDownloadPlugin = async () => {
    try {
      const res = await fetch("/PixelsRPC.vencord.js");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PixelsRPC.vencord.js";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download plugin file", e);
    }
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      updateRpc(preset);
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Top Header & Save Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest mb-1.5">
              <span>DISCORD RPC STUDIO</span>
              <span>{"//"}</span>
              <span className="text-[#d71920] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] animate-pulse" />
                AUTOSYNC ACTIVE
              </span>
              <span>{"//"}</span>
              <span className="text-neutral-400">VENCORD PROTOCOL</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Gamepad2 className="text-[#d71920]" size={24} />
              Discord Rich Presence Studio
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Broadcast custom rich activities, real-time buttons, and status directly into Discord via the{" "}
              <strong className="text-white font-medium">PixelsRPC Vencord Plugin</strong>.
            </p>
          </div>

          {/* FIX-04: Non-intrusive Live Synchronization Status Indicator (Manual Save/Sync controls removed) */}
          <div className="flex items-center gap-2">
            {syncStatus === "saving" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono">
                <RefreshCw className="animate-spin text-amber-400" size={13} />
                <span>Syncing with Discord...</span>
              </div>
            )}
            {syncStatus === "synced" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fade-in">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Presence Synced</span>
                {lastSyncedTime && (
                  <span className="text-[10px] text-neutral-400 font-sans">({lastSyncedTime})</span>
                )}
              </div>
            )}
            {syncStatus === "error" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-mono">
                <AlertCircle size={13} className="text-red-400" />
                <span>Sync Failed</span>
                <button
                  type="button"
                  onClick={() => executeAutoSaveAndSync(rpcVersionRef.current)}
                  className="underline text-[10px] text-white hover:text-neutral-300 cursor-pointer ml-1"
                >
                  Retry
                </button>
              </div>
            )}
            {syncStatus === "idle" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Auto-Sync Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase">CLUSTER</span>
            <span className="text-xs text-neutral-300 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> PROD-01
            </span>
          </div>
          <div className="p-3 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase">AUTOSYNC</span>
            <span className="text-xs text-green-400 font-bold">ACTIVE</span>
          </div>
          <div className="p-3 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase">DISCORD GATEWAY</span>
            <span className="text-xs text-neutral-300 font-bold">READY</span>
          </div>
          <Link
            href="/templates"
            className="p-3 bg-[#0c0c0c] hover:bg-[#141414] border border-[#1e1e1e] hover:border-[#333333] rounded-xl flex items-center justify-between transition-colors group"
          >
            <span className="text-[10px] text-neutral-500 uppercase group-hover:text-white">PRESETS</span>
            <span className="text-xs text-white font-bold flex items-center gap-1">
              <LayoutTemplate size={12} /> BROWSE
            </span>
          </Link>
        </div>

        {/* 1. ONE-CLICK POWERSHELL INSTALLER BANNER */}
        <div className="bg-[#09090c] border border-[#222228] rounded-2xl p-6 relative overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#141418] border border-[#272730] text-[10px] text-neutral-400 uppercase tracking-widest">
                <Code2 size={12} className="text-[#d71920]" /> One-Click PowerShell Installer
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Install PixelsRPC with Vencord via PowerShell CLI
              </h2>
              <p className="text-xs text-neutral-400 max-w-xl">
                Automatically detects Discord, builds Vencord with PixelsRPC included, and injects it in a single command. Zero manual compiling.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="solid-white"
                onClick={handleCopyInstallCmd}
                className="text-xs flex items-center gap-2 px-4 py-2"
              >
                {copiedInstallCmd ? <Check size={14} className="text-black" /> : <Copy size={14} className="text-black" />}
                {copiedInstallCmd ? "COMMAND COPIED!" : "COPY INSTALL COMMAND"}
              </Button>
            </div>
          </div>

          {/* Terminal Command Code Box */}
          <div className="flex items-center justify-between bg-[#040405] border border-[#1e1e24] rounded-xl px-4 py-3 text-xs font-mono text-neutral-300 overflow-x-auto">
            <span className="text-neutral-500 mr-2 select-none">&gt;</span>
            <span className="text-emerald-400 flex-1 truncate font-semibold">{installCommand}</span>
            <button
              onClick={handleCopyInstallCmd}
              className="text-neutral-500 hover:text-white transition-colors ml-4 text-[11px] uppercase tracking-wider"
            >
              {copiedInstallCmd ? "[COPIED]" : "[COPY]"}
            </button>
          </div>
        </div>

        {/* 2. ROBLOX-STYLE QUICK ACCOUNT LINKING (DEVICE CODE AUTHORIZATION) */}
        <div className="bg-[#0c0c0e] border border-[#222228] rounded-2xl p-6 relative overflow-hidden space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-[#1c1c22]">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#18181f] border border-[#2c2c36] text-[10px] text-neutral-300 uppercase tracking-widest font-mono">
                <img
                  src="/logos/pixel-icon.png"
                  alt="Pixel.gg"
                  className="w-3.5 h-3.5 object-contain"
                />
                <ShieldCheck size={12} className="text-emerald-400" /> Device Authorization
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Quick Discord Account Linking
              </h2>
              <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                Link your Discord Vencord plugin instantly without manually copying permanent secrets. Enter the temporary single-use code in Discord Settings → Plugins → PixelsRPC.
              </p>
            </div>

            {/* Quick Link Action Button based on strict single state */}
            <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
              {(linkingState === "idle" || linkingState === "cancelled") && (
                !getStoredToken() && !authContextToken && !authUser?.appToken && !token && authStatus === "UNAUTHENTICATED" ? (
                  <Button
                    onClick={() => {
                      window.location.href = "/auth/discord";
                    }}
                    variant="solid-white"
                    className="px-6 py-2.5 text-xs font-bold tracking-wider flex items-center gap-2"
                  >
                    <Plug size={14} />
                    SIGN IN TO LINK CLIENT
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateLinkingCode}
                    variant="solid-white"
                    className="px-6 py-2.5 text-xs font-bold tracking-wider flex items-center gap-2"
                  >
                    <Plug size={14} />
                    GENERATE LINKING CODE
                  </Button>
                )
              )}

              {linkingState === "generating" && (
                <Button
                  disabled
                  variant="solid-white"
                  className="px-6 py-2.5 text-xs font-bold tracking-wider flex items-center gap-2"
                >
                  <RefreshCw className="animate-spin" size={14} />
                  GENERATING CODE...
                </Button>
              )}

              {(linkingState === "waiting" || linkingState === "verifying") && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleCancelLinking}
                    variant="outline"
                    className="text-xs px-3 py-1.5 text-neutral-400 hover:text-red-400"
                  >
                    CANCEL LINKING
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 1. Live Linking Code Display Window */}
          {(linkingState === "waiting" || linkingState === "verifying") && currentSession && (
            <div className="p-6 rounded-xl bg-[#070709] border border-neutral-700 space-y-4 text-center max-w-md mx-auto animate-fade-in">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold block">
                ENTER THIS CODE IN DISCORD
              </span>

              {/* Huge Monospace Code Display */}
              <div className="py-2 px-4 rounded-xl bg-[#101015] border border-neutral-600 inline-block">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-widest text-white font-mono select-all">
                  {currentSession.code}
                </span>
              </div>

              {/* Expiration Timer & Telemetry Indicator */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono">
                <Clock size={13} className="text-amber-400 animate-pulse" />
                <span className="text-neutral-400">
                  Expires in:{" "}
                  <strong className="text-amber-300">
                    {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </strong>
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>
                  {linkingState === "verifying"
                    ? "Verifying code with Discord client..."
                    : "Waiting for Vencord plugin to submit code..."}
                </span>
              </div>
            </div>
          )}

          {/* 2. Linked Success Banner */}
          {linkingState === "linked" && (
            <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center max-w-md mx-auto space-y-2 animate-fade-in">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
              <p className="text-white font-bold text-sm">Discord Device Linked Successfully!</p>
              <p className="text-neutral-400 text-xs">
                Your Vencord plugin is authenticated. Rich Presence is now streaming directly into Discord.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setLinkingState("idle")}
                  className="text-xs px-4 py-1.5"
                >
                  DISMISS
                </Button>
              </div>
            </div>
          )}

          {/* 3. Expired Banner */}
          {linkingState === "expired" && (
            <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/40 text-center max-w-md mx-auto space-y-2 animate-fade-in">
              <p className="text-amber-300 font-bold text-xs uppercase tracking-wider">
                Linking Code Expired
              </p>
              <p className="text-neutral-400 text-[11px]">
                The previous code expired after 2 minutes for security. Generate a new code when ready.
              </p>
              <Button
                variant="solid-white"
                onClick={handleGenerateLinkingCode}
                className="text-xs px-4 py-1.5 mt-2"
              >
                GENERATE NEW CODE
              </Button>
            </div>
          )}

          {/* 4. Failed Banner */}
          {linkingState === "failed" && (
            <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/40 text-center max-w-md mx-auto space-y-2 animate-fade-in">
              <p className="text-red-300 font-bold text-xs uppercase tracking-wider">
                {isAuthError ? "Authentication Required" : "Failed to Generate Linking Code"}
              </p>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                {linkingError || "A network or server error occurred. Please check your connection and try again."}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {isAuthError ? (
                  <>
                    <Button
                      variant="solid-white"
                      onClick={() => {
                        window.location.href = "/auth/discord";
                      }}
                      className="text-xs px-4 py-1.5"
                    >
                      SIGN IN WITH DISCORD
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateLinkingCode}
                      className="text-xs px-3 py-1.5"
                    >
                      RETRY
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="solid-white"
                    onClick={handleGenerateLinkingCode}
                    className="text-xs px-4 py-1.5"
                  >
                    RETRY
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Integration Health & Synchronization Status Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-[#0a0a0d] border border-[#1c1c22]">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Integration</span>
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${linkedDevices.some((d) => d.isOnline)
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                    : linkedDevices.length > 0
                      ? "bg-amber-400"
                      : "bg-neutral-600"
                    }`}
                />
                <span
                  className={
                    linkedDevices.some((d) => d.isOnline)
                      ? "text-emerald-400"
                      : linkedDevices.length > 0
                        ? "text-amber-400"
                        : "text-neutral-400"
                  }
                >
                  {linkedDevices.some((d) => d.isOnline)
                    ? "Connected"
                    : linkedDevices.length > 0
                      ? "Standby"
                      : "Not Linked"}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Discord Client</span>
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${linkedDevices.some((d) => d.discordAvailable) ? "bg-emerald-400" : "bg-neutral-600"
                    }`}
                />
                <span
                  className={
                    linkedDevices.some((d) => d.discordAvailable) ? "text-emerald-400" : "text-neutral-400"
                  }
                >
                  {linkedDevices.some((d) => d.discordAvailable)
                    ? "Detected"
                    : linkedDevices.length > 0
                      ? "Not Running"
                      : "—"}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Rich Presence</span>
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${linkedDevices.some((d) => d.publishingStatus === "active")
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-neutral-600"
                    }`}
                />
                <span
                  className={
                    linkedDevices.some((d) => d.publishingStatus === "active")
                      ? "text-emerald-400"
                      : "text-neutral-400"
                  }
                >
                  {linkedDevices.some((d) => d.publishingStatus === "active")
                    ? "Streaming"
                    : linkedDevices.length > 0
                      ? "Idle"
                      : "—"}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">Sync Revision</span>
              <p className="text-xs font-mono font-semibold text-white">
                {confirmedRevision !== null
                  ? `Rev #${confirmedRevision}`
                  : linkedDevices[0]?.lastAppliedRevision
                    ? `Rev #${linkedDevices[0].lastAppliedRevision}`
                    : "Sync Ready"}
              </p>
            </div>
          </div>

          {/* Connected Devices List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-white">
                AUTHORIZED DEVICES ({linkedDevices.length})
              </span>
              <button
                onClick={fetchLinkedDevices}
                className="hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              >
                <RefreshCw size={11} /> Refresh
              </button>
            </div>

            {linkedDevices.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#08080a] border border-[#1a1a20] text-center text-xs text-neutral-500">
                No Discord clients currently linked. Use the code above to link your Vencord client.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${dev.isOnline
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            : "bg-neutral-500"
                            }`}
                        />
                        <p className="text-white font-semibold truncate text-xs">
                          {dev.deviceName || "Vencord Discord Client"}
                        </p>
                        {dev.pluginVersion && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#181820] text-neutral-400 border border-[#262630]">
                            v{dev.pluginVersion}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap">
                        <span>
                          {dev.isOnline ? "Online" : "Offline"} &bull; {formatRelativeTime(dev.lastUsedAt || dev.consumedAt)}
                        </span>
                        {dev.discordAvailable !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${dev.discordAvailable
                              ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30"
                              : "text-amber-400 bg-amber-950/40 border border-amber-500/30"
                              }`}
                          >
                            {dev.discordAvailable ? "Discord Active" : "Discord Inactive"}
                          </span>
                        )}
                        {dev.lastAppliedRevision && (
                          <span className="text-[9px] font-mono text-neutral-500">
                            Rev #{dev.lastAppliedRevision}
                          </span>
                        )}
                      </div>

                      {dev.activeTitle && (
                        <p className="text-[10px] text-neutral-500 truncate font-mono">
                          Presence: &ldquo;{dev.activeTitle}&rdquo;
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleUnlinkDevice(dev.id)}
                      disabled={unlinkingDeviceId === dev.id}
                      className="px-2.5 py-1 rounded bg-[#181820] hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-[#282830] hover:border-red-500/40 text-[11px] transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                    >
                      {unlinkingDeviceId === dev.id && <RefreshCw size={10} className="animate-spin" />}
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. ADVANCED / MANUAL APP TOKEN DRAWER */}
          <div className="pt-4 border-t border-[#1a1a20] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                ADVANCED // MANUAL APP TOKEN (LEGACY FALLBACK)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyToken}
                  className="text-[11px] py-1 px-3 flex items-center gap-1.5"
                >
                  {copiedToken ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copiedToken ? "COPIED" : "COPY TOKEN"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className="text-[11px] py-1 px-2.5 text-neutral-400 hover:text-white"
                >
                  <RefreshCw size={11} className={regenerating ? "animate-spin" : ""} />
                  {regenerating ? "..." : "RESET"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#060608] border border-[#1e1e24] rounded-xl px-3.5 py-2 text-xs text-neutral-400 font-mono">
              <span className="truncate">
                {token
                  ? showToken
                    ? token
                    : `${token.slice(0, 8)}••••••••••••••••••••••••••••••••`
                  : "Fetching token..."}
              </span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-neutral-500 hover:text-white transition-colors ml-3 text-[11px]"
              >
                {showToken ? "[HIDE]" : "[SHOW]"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="p-4 bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Flame size={14} className="text-[#d71920]" />
            <span className="font-semibold text-white">QUICK PRESETS:</span>
            <span>Populate fields with one click:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyPreset("pixel")}
              className="px-2.5 py-1 text-[11px] rounded bg-[#141414] hover:bg-white hover:text-black border border-[#242424] text-neutral-300 transition-colors"
            >
              Pixel.gg Default
            </button>
            <button
              onClick={() => applyPreset("dev")}
              className="px-2.5 py-1 text-[11px] rounded bg-[#141414] hover:bg-white hover:text-black border border-[#242424] text-neutral-300 transition-colors"
            >
              VS Code / Dev
            </button>
            <button
              onClick={() => applyPreset("gaming")}
              className="px-2.5 py-1 text-[11px] rounded bg-[#141414] hover:bg-white hover:text-black border border-[#242424] text-neutral-300 transition-colors"
            >
              Cyberpunk 2077
            </button>
          </div>
        </div>

        {/* Configuration Editor + Live Discord Preview Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Editor (7 cols) */}
          <div className="xl:col-span-7 space-y-6">
            {/* Independent Visibility Controls Matrix */}
            <div className="p-5 bg-[#0a0a0a] border border-[#262626] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[00]</span> INDEPENDENT VISIBILITY & PUBLISHING
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono uppercase">2 DEDICATED SWITCHES</span>
              </div>

              {/* Control A: Website Profile RPC */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black border border-[#222222]">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">Website Profile RPC</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${rpc.showProfileRpc !== false
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-neutral-800 text-neutral-400"
                        }`}
                    >
                      {rpc.showProfileRpc !== false ? "VISIBLE" : "HIDDEN"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Controls whether this Rich Presence card appears inside your public Pixel.gg profile page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateRpc({ showProfileRpc: rpc.showProfileRpc === false ? true : false })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${rpc.showProfileRpc !== false
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                >
                  {rpc.showProfileRpc !== false ? "ENABLED" : "DISABLED"}
                </button>
              </div>

              {/* Control B: Discord RPC (PixelsRPC) */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black border border-[#222222]">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">Discord RPC (PixelsRPC)</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${rpc.enableDiscordRpc !== false
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        : "bg-neutral-800 text-neutral-400"
                        }`}
                    >
                      {rpc.enableDiscordRpc !== false ? "PUBLISHING" : "STOPPED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Controls whether your configured activity is sent to Discord through PixelsRPC or desktop client.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateRpc({ enableDiscordRpc: rpc.enableDiscordRpc === false ? true : false })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${rpc.enableDiscordRpc !== false
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                >
                  {rpc.enableDiscordRpc !== false ? "ENABLED" : "DISABLED"}
                </button>
              </div>

              {/* Matrix Status Callout */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400">
                <span className="text-neutral-500 uppercase text-[10px] block font-bold mb-0.5">Integration State</span>
                <span className="text-white font-medium">
                  {rpc.showProfileRpc !== false && rpc.enableDiscordRpc !== false
                    ? "Visible on website profile & published to Discord"
                    : rpc.showProfileRpc !== false && rpc.enableDiscordRpc === false
                      ? "Visible only on website profile (Discord publishing stopped)"
                      : rpc.showProfileRpc === false && rpc.enableDiscordRpc !== false
                        ? "Published to Discord, hidden on public website profile"
                        : "Hidden in both destinations"}
                </span>
              </div>
            </div>

            {/* A. General Activity */}
            <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[01]</span> GENERAL ACTIVITY
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">CORE IDENTITY</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={rpc.appName || ""}
                    onChange={(e) => updateRpc({ appName: e.target.value })}
                    placeholder="Pixel.gg / Custom Game"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Application ID (Client ID)
                  </label>
                  <input
                    type="text"
                    value={rpc.appId || ""}
                    onChange={(e) => updateRpc({ appId: e.target.value })}
                    placeholder="1523632136878559302"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                  {rpc.appId && !/^\d{16,21}$/.test(rpc.appId.trim()) && (
                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                      <AlertCircle size={10} /> Must be a valid 16-21 digit Discord Application ID.
                    </p>
                  )}
                </div>
              </div>

              {/* Activity Type Selector */}
              <div className="space-y-2 pt-2 border-t border-[#181818]">
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase">
                  Activity Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "streaming", label: "Streaming", desc: "Type 1 (Live)", icon: Tv },
                    { id: "playing", label: "Playing", desc: "Type 0 (Game)", icon: Play },
                    { id: "listening", label: "Listening", desc: "Type 2 (Music)", icon: Headphones },
                    { id: "watching", label: "Watching", desc: "Type 3 (Media)", icon: Eye },
                    { id: "competing", label: "Competing", desc: "Type 5 (Arena)", icon: Trophy },
                  ].map((item) => {
                    const active = (rpc.activityType || "streaming") === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateRpc({ activityType: item.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${active
                          ? item.id === "streaming"
                            ? "bg-purple-950/30 border-purple-500 text-white shadow-lg shadow-purple-950/40"
                            : "bg-[#141419] border-white text-white shadow-lg"
                          : "bg-[#050505] border-[#222222] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                          }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon size={13} className={active ? (item.id === "streaming" ? "text-purple-400" : "text-white") : "text-neutral-500"} />
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* C. Streaming Settings (Conditional — only shown when Streaming is selected) */}
            {(rpc.activityType || "streaming") === "streaming" && (
              <div className="p-5 bg-[#0a0a0a] border border-purple-500/30 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-purple-400">[LIVE]</span> STREAMING SETTINGS
                  </h3>
                  <span className="text-[10px] text-purple-400 font-mono uppercase">TWITCH / YOUTUBE</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Stream Link
                  </label>
                  <input
                    type="url"
                    value={rpc.streamUrl || ""}
                    onChange={(e) => updateRpc({ streamUrl: e.target.value })}
                    placeholder={`https://twitch.tv/${currentUser?.username || "pixelgg"}`}
                    className="w-full bg-[#050505] border border-purple-500/40 focus:border-purple-400 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                  {rpc.streamUrl && !/^https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/i.test(rpc.streamUrl.trim()) && (
                    <p className="text-[10px] text-amber-300 mt-1 flex items-center gap-1 font-mono">
                      <AlertCircle size={10} /> Stream link should be a valid Twitch or YouTube stream URL.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* B. Activity Information */}
            <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[02]</span> ACTIVITY INFORMATION
                </h3>
                <button
                  type="button"
                  onClick={() => setShowActivityUrls((v) => !v)}
                  className="text-[10px] font-mono text-neutral-400 hover:text-white px-2 py-1 rounded bg-[#141418] border border-[#24242c] flex items-center gap-1 transition-colors"
                >
                  <Link2 size={11} />
                  {showActivityUrls ? "Hide Clickable URLs" : "Clickable URLs"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Details / Line 1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                      Details (Line 1) <span className="text-neutral-600 font-mono">({(rpc.details || "").length}/128)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => updateRpc({ detailsEnabled: rpc.detailsEnabled === false ? true : false })}
                      aria-label="Toggle Details Line"
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        rpc.detailsEnabled !== false ? "bg-white" : "bg-[#252530]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-black transition ${
                          rpc.detailsEnabled !== false ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={128}
                    value={rpc.details || ""}
                    onChange={(e) => updateRpc({ details: e.target.value })}
                    placeholder="Welcome to my profile!"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* State / Line 2 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                      State (Line 2) <span className="text-neutral-600 font-mono">({(rpc.state || "").length}/128)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => updateRpc({ stateEnabled: rpc.stateEnabled === false ? true : false })}
                      aria-label="Toggle State Line"
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        rpc.stateEnabled !== false ? "bg-white" : "bg-[#252530]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-black transition ${
                          rpc.stateEnabled !== false ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={128}
                    value={rpc.state || ""}
                    onChange={(e) => updateRpc({ state: e.target.value })}
                    placeholder="Discover my personal page on PIXEL.GG."
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {(showActivityUrls || rpc.detailsUrl || rpc.stateUrl) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#181818]">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Details Clickable URL</label>
                    <input
                      type="url"
                      value={rpc.detailsUrl || ""}
                      onChange={(e) => updateRpc({ detailsUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                    />
                    {rpc.detailsUrl && !/^https?:\/\/.+/i.test(rpc.detailsUrl.trim()) && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                        <AlertCircle size={10} /> Must start with http:// or https://
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">State Clickable URL</label>
                    <input
                      type="url"
                      value={rpc.stateUrl || ""}
                      onChange={(e) => updateRpc({ stateUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                    />
                    {rpc.stateUrl && !/^https?:\/\/.+/i.test(rpc.stateUrl.trim()) && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                        <AlertCircle size={10} /> Must start with http:// or https://
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* D. Party Settings */}
            <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#181818] pb-2.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[03]</span> PARTY SETTINGS
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">OPTIONAL</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Party Size
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rpc.partySize ?? ""}
                    onChange={(e) =>
                      updateRpc({
                        partySize: e.target.value === "" ? null : parseInt(e.target.value, 10),
                      })
                    }
                    placeholder="1"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Maximum Party Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rpc.partyMax ?? ""}
                    onChange={(e) =>
                      updateRpc({
                        partyMax: e.target.value === "" ? null : parseInt(e.target.value, 10),
                      })
                    }
                    placeholder="4"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              {typeof rpc.partySize === "number" && typeof rpc.partyMax === "number" && rpc.partySize > rpc.partyMax && (
                <p className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <AlertCircle size={10} /> Party size cannot exceed maximum party size.
                </p>
              )}
            </div>

            {/* Section 2: Visual Assets & Profile Picture Integration */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#d71920]">[04]</span> VISUAL ASSETS
                  </h3>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    PNG, JPG, WEBP & ANIMATED GIFS (UP TO 10MB)
                  </span>
                </div>
              </div>

              {/* Automatic Profile Picture Integration Box */}
              <div className="p-4 rounded-xl bg-[#08080a] border border-[#222228] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Use PIXEL.GG Profile Picture as Large Image
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                        AUTOMATIC
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Syncs directly with your authenticated PIXEL.GG avatar. Updates in Discord automatically.
                    </p>
                  </div>

                  {/* Animated Sliding Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      {rpc.useProfileAvatar !== false ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = rpc.useProfileAvatar === false ? true : false;
                        updateRpc({
                          useProfileAvatar: next,
                          largeImage: next ? (currentUser?.avatar || rpc.largeImage) : rpc.largeImage,
                        });
                      }}
                      data-testid="toggle-use-profile-avatar"
                      aria-label="Toggle Profile Avatar as Large Image"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rpc.useProfileAvatar !== false ? "bg-white" : "bg-[#252530]"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${rpc.useProfileAvatar !== false ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {rpc.useProfileAvatar !== false && (
                  <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a20]">
                    <div className="w-10 h-10 rounded-full bg-[#18181f] border border-[#33333f] overflow-hidden shrink-0">
                      {currentUser?.avatar || rpc.largeImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={currentUser?.avatar || rpc.largeImage || ""}
                          alt="Profile Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 font-mono">
                          {currentUser?.username?.[0]?.toUpperCase() || "P"}
                        </div>
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="text-white font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        Synced as @{currentUser?.username || "user"}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Compatible with Discord Rich Presence asset specifications.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Large Activity Image Upload & Customization */}
              <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-neutral-300" /> LARGE ACTIVITY IMAGE
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border transition-colors ${rpc.largeImageEnabled !== false
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                      >
                        {rpc.largeImageEnabled !== false ? "ON" : "OFF"}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      Custom artwork, avatar, or animated GIF
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Animated Sliding ON/OFF Toggle */}
                    <div className="flex items-center gap-2 bg-[#121216] px-2.5 py-1 rounded-lg border border-[#22222a]">
                      <span className="text-[10px] font-mono font-bold text-neutral-400">
                        {rpc.largeImageEnabled !== false ? "VISIBLE" : "HIDDEN"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateRpc({
                            largeImageEnabled: rpc.largeImageEnabled === false ? true : false,
                          })
                        }
                        data-testid="toggle-large-image"
                        aria-label="Toggle Large Activity Image"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rpc.largeImageEnabled !== false ? "bg-white" : "bg-[#252530]"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${rpc.largeImageEnabled !== false ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCustomizer("largeImage")}
                      className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                    >
                      <UploadCloud size={13} /> Upload & Crop
                    </Button>
                  </div>
                </div>

                {rpc.largeImage && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#050505] border border-[#1f1f1f]">
                    <div className="w-14 h-14 rounded-xl bg-[#141414] overflow-hidden border border-[#2b2d31] shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rpc.largeImage}
                        alt="Large Asset"
                        className="w-full h-full object-cover"
                        style={(() => {
                          const crop = parseCrop(rpc.largeImageCrop);
                          return crop
                            ? {
                              transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.25}px, ${crop.offsetY * 0.25}px)`,
                              transformOrigin: "center center",
                            }
                            : undefined;
                        })()}
                      />
                    </div>

                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <p className="text-white font-medium truncate">{rpc.largeImage}</p>
                      <div className="flex items-center gap-2">
                        {rpc.largeImage.toLowerCase().includes(".gif") && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-[9px] text-purple-300 font-bold">
                            ANIMATED GIF
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500">
                          Zoom: {Math.round((parseCrop(rpc.largeImageCrop)?.zoom || 1) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCustomizer("largeImage")}
                        className="px-2.5 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-xs text-white border border-[#282828] flex items-center gap-1"
                        title="Reopen Crop & Zoom Editor"
                      >
                        <Crop size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRpc({ largeImage: "", largeImageCrop: null, useProfileAvatar: true })}
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-xs text-red-300 border border-red-800/30"
                        title="Reset to Profile Avatar"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Tooltip Text
                    </label>
                    <input
                      type="text"
                      value={rpc.largeImageText || ""}
                      onChange={(e) => updateRpc({ largeImageText: e.target.value })}
                      placeholder="e.g. PIXEL.GG Pro"
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowLargeAdvanced((v) => !v)}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white px-3 py-2 rounded-lg bg-[#121216] border border-[#22222a] flex items-center gap-1.5 transition-colors"
                    >
                      <Link2 size={11} />
                      {showLargeAdvanced ? "Hide Advanced URLs" : "Advanced (URL / Asset Key)"}
                    </button>
                  </div>
                </div>

                {(showLargeAdvanced || Boolean(rpc.largeImageUrl)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#181818]">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 uppercase">
                        Image URL or Discord Asset Key
                      </label>
                      <input
                        type="text"
                        value={rpc.largeImage || ""}
                        onChange={(e) => updateRpc({ largeImage: e.target.value, useProfileAvatar: false })}
                        placeholder="https://... or asset_key"
                        className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 uppercase">
                        Clickable URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={rpc.largeImageUrl || ""}
                        onChange={(e) => updateRpc({ largeImageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                      {rpc.largeImageUrl && !/^https?:\/\/.+/i.test(rpc.largeImageUrl.trim()) && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                          <AlertCircle size={10} /> URL must start with http:// or https://
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Small Activity Icon Upload & Customization */}
              <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-neutral-300" /> SMALL ACTIVITY ICON (BADGE)
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border transition-colors ${rpc.smallImageEnabled !== false
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                      >
                        {rpc.smallImageEnabled !== false ? "ON" : "OFF"}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      Corner badge, mini branding, or animated status icon
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Animated Sliding ON/OFF Toggle */}
                    <div className="flex items-center gap-2 bg-[#121216] px-2.5 py-1 rounded-lg border border-[#22222a]">
                      <span className="text-[10px] font-mono font-bold text-neutral-400">
                        {rpc.smallImageEnabled !== false ? "VISIBLE" : "HIDDEN"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateRpc({
                            smallImageEnabled: rpc.smallImageEnabled === false ? true : false,
                          })
                        }
                        data-testid="toggle-small-image"
                        aria-label="Toggle Small Activity Icon"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rpc.smallImageEnabled !== false ? "bg-white" : "bg-[#252530]"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${rpc.smallImageEnabled !== false ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSmallImageFailed(false);
                        updateRpc({
                          smallImage:
                            "https://pixlpresence1-web.vercel.app/server-icon.png",
                          smallImageText: "PIXEL.GG",
                          smallImageCrop: null,
                          smallImageEnabled: true,
                        });
                      }}
                      className="text-[10px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-[#141414] border border-[#242424]"
                    >
                      Default Icon
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCustomizer("smallImage")}
                      className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                    >
                      <UploadCloud size={13} /> Upload & Crop
                    </Button>
                  </div>
                </div>

                {rpc.smallImage && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#050505] border border-[#1f1f1f]">
                    <div className="w-10 h-10 rounded-full bg-[#141414] overflow-hidden border border-[#2b2d31] shrink-0 relative flex items-center justify-center">
                      {smallImageFailed ? (
                        <div className="w-full h-full flex items-center justify-center bg-red-950/60 text-red-400" title="Image failed to load">
                          <AlertCircle size={16} />
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={rpc.smallImage}
                          alt="Small Icon Asset"
                          className="w-full h-full object-cover"
                          onError={() => setSmallImageFailed(true)}
                          style={(() => {
                            const crop = parseCrop(rpc.smallImageCrop);
                            return crop
                              ? {
                                  transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.25}px, ${crop.offsetY * 0.25}px)`,
                                  transformOrigin: "center center",
                                }
                              : undefined;
                          })()}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <p className="text-white font-medium truncate">{rpc.smallImage}</p>
                      <div className="flex items-center gap-2">
                        {smallImageFailed && (
                          <button
                            type="button"
                            onClick={() => {
                              setSmallImageFailed(false);
                              updateRpc({
                                smallImage:
                                  "https://pixlpresence1-web.vercel.app/server-icon.png",
                                smallImageText: "PIXEL.GG",
                                smallImageCrop: null,
                                smallImageEnabled: true,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-300 hover:text-white"
                          >
                            Restore Default Icon
                          </button>
                        )}
                        {rpc.smallImage.toLowerCase().includes(".gif") && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-[9px] text-purple-300 font-bold">
                            ANIMATED GIF
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500">
                          Zoom: {Math.round((parseCrop(rpc.smallImageCrop)?.zoom || 1) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCustomizer("smallImage")}
                        className="px-2.5 py-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-xs text-white border border-[#282828] flex items-center gap-1"
                        title="Reopen Crop & Zoom Editor"
                      >
                        <Crop size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRpc({ smallImage: "", smallImageCrop: null })}
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-xs text-red-300 border border-red-800/30"
                        title="Remove Icon"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Tooltip Text
                    </label>
                    <input
                      type="text"
                      value={rpc.smallImageText || ""}
                      onChange={(e) => updateRpc({ smallImageText: e.target.value })}
                      placeholder="PIXEL.GG"
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSmallAdvanced((v) => !v)}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white px-3 py-2 rounded-lg bg-[#121216] border border-[#22222a] flex items-center gap-1.5 transition-colors"
                    >
                      <Link2 size={11} />
                      {showSmallAdvanced ? "Hide Advanced URLs" : "Advanced (URL / Asset Key)"}
                    </button>
                  </div>
                </div>

                {(showSmallAdvanced || Boolean(rpc.smallImageUrl)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#181818]">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 uppercase">
                        Icon URL or Discord Asset Key
                      </label>
                      <input
                        type="text"
                        value={rpc.smallImage || ""}
                        onChange={(e) => updateRpc({ smallImage: e.target.value })}
                        placeholder="https://... or asset_key"
                        className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 uppercase">
                        Clickable URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={rpc.smallImageUrl || ""}
                        onChange={(e) => updateRpc({ smallImageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                      {rpc.smallImageUrl && !/^https?:\/\/.+/i.test(rpc.smallImageUrl.trim()) && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                          <AlertCircle size={10} /> URL must start with http:// or https://
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* G. Timestamp Section */}
            <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[05]</span> TIMESTAMP
                </h3>
                <span className="text-[10px] text-neutral-500 font-mono uppercase">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone || "LOCAL TIME"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "now", label: "Now", desc: "Elapsed from open" },
                  { id: "time", label: "Time", desc: "Local clock time" },
                  { id: "custom", label: "Custom", desc: "Start / End dates" },
                  { id: "none", label: "None", desc: "No timestamp" },
                ].map((opt) => {
                  const activeMode = rpc.timestampMode || (parseTimestampMs(rpc.startTimestamp) !== null ? "custom" : "now");
                  const active = activeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateRpc({ timestampMode: opt.id as any })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? "bg-[#141419] border-white text-white shadow-sm"
                          : "bg-[#050505] border-[#222222] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {(rpc.timestampMode === "custom" || (!rpc.timestampMode && parseTimestampMs(rpc.startTimestamp) !== null)) && (() => {
                const startMs = parseTimestampMs(rpc.startTimestamp);
                const endMs = parseTimestampMs(rpc.endTimestamp);
                const hasInvalidRange = startMs !== null && endMs !== null && endMs <= startMs;

                return (
                  <div className="p-4 rounded-xl bg-[#08080a] border border-[#1f1f28] space-y-4 animate-fade-in">
                    {/* Custom Start Date & Time */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-400 uppercase font-semibold">
                          Custom Start (Optional)
                        </label>
                        {startMs !== null && (
                          <button
                            type="button"
                            onClick={() => updateRpc({ startTimestamp: null })}
                            className="text-[10px] text-neutral-400 hover:text-red-400 font-mono transition-colors"
                          >
                            Clear Start
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="date"
                          value={toLocalDateStr(rpc.startTimestamp)}
                          onChange={(e) => {
                            const nextIso = combineLocalDateTimeToIso(
                              e.target.value,
                              toLocalTimeStr(rpc.startTimestamp) || "00:00"
                            );
                            updateRpc({ startTimestamp: nextIso });
                          }}
                          className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="time"
                          value={toLocalTimeStr(rpc.startTimestamp)}
                          onChange={(e) => {
                            const nextIso = combineLocalDateTimeToIso(
                              toLocalDateStr(rpc.startTimestamp) || toLocalDateStr(Date.now()),
                              e.target.value
                            );
                            updateRpc({ startTimestamp: nextIso });
                          }}
                          className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Custom End Date & Time */}
                    <div className="space-y-2 pt-2 border-t border-[#181820]">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-400 uppercase font-semibold">
                          Custom End / Countdown (Optional)
                        </label>
                        {endMs !== null && (
                          <button
                            type="button"
                            onClick={() => updateRpc({ endTimestamp: null })}
                            className="text-[10px] text-neutral-400 hover:text-red-400 font-mono transition-colors"
                          >
                            Clear End
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="date"
                          value={toLocalDateStr(rpc.endTimestamp)}
                          onChange={(e) => {
                            const nextIso = combineLocalDateTimeToIso(
                              e.target.value,
                              toLocalTimeStr(rpc.endTimestamp) || "23:59"
                            );
                            updateRpc({ endTimestamp: nextIso });
                          }}
                          className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="time"
                          value={toLocalTimeStr(rpc.endTimestamp)}
                          onChange={(e) => {
                            const nextIso = combineLocalDateTimeToIso(
                              toLocalDateStr(rpc.endTimestamp) || toLocalDateStr(Date.now()),
                              e.target.value
                            );
                            updateRpc({ endTimestamp: nextIso });
                          }}
                          className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Timestamp Display Info & Validation */}
                    <div className="pt-2 border-t border-[#181820] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
                      <span>
                        {startMs !== null && endMs !== null
                          ? "Showing countdown / duration range"
                          : startMs !== null
                            ? "Showing elapsed time from start"
                            : endMs !== null
                              ? "Showing countdown to end time"
                              : "Select a start or end date/time"}
                      </span>
                      {(startMs !== null || endMs !== null) && (
                        <span>
                          Unix: {startMs !== null ? `${startMs}` : "—"} / {endMs !== null ? `${endMs}` : "—"}
                        </span>
                      )}
                    </div>

                    {hasInvalidRange && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                        <AlertCircle size={10} /> End timestamp must be later than Start timestamp.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Section 6: Custom Streaks, Statistics & Status Labels */}
            <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#d71920]">[06]</span> CUSTOM STREAKS & STATS
                  </h3>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-1 bg-[#121216] border border-[#22222a] p-1 rounded-xl">
                  {[
                    { id: "streaks", label: "Streaks", count: rpc.streaks?.length || 0, icon: Flame },
                    { id: "statistics", label: "Statistics", count: rpc.statistics?.length || 0, icon: BarChart2 },
                    { id: "labels", label: "Status Badges", count: rpc.statusLabels?.length || 0, icon: Tag },
                  ].map((tab) => {
                    const active = customTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCustomTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? "bg-white text-black shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Icon size={12} />
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                              active ? "bg-black text-white" : "bg-neutral-800 text-neutral-300"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtab 1: Streaks */}
              {customTab === "streaks" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { name: "Win Streak", value: 7, prefix: "🔥", suffix: "Wins", targetField: "details" as const },
                        { name: "Daily Grind", value: 14, prefix: "⚡", suffix: "Days", targetField: "details" as const },
                        { name: "Match Streak", value: 25, prefix: "🏆", suffix: "W", targetField: "state" as const },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addStreak(preset)}
                          className="px-2.5 py-1 rounded-lg bg-[#111116] hover:bg-[#1a1a22] border border-[#22222a] text-[11px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <span>{preset.prefix}</span>
                          <span>{preset.value} {preset.name}</span>
                          <Plus size={10} className="text-neutral-500" />
                        </button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addStreak()}
                      className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                    >
                      <Plus size={13} /> Add Streak
                    </Button>
                  </div>

                  {/* Streaks List */}
                  {!rpc.streaks || rpc.streaks.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#070709] border border-[#1a1a22] text-center space-y-1.5">
                      <Flame size={22} className="mx-auto text-neutral-600" />
                      <p className="text-xs text-neutral-400 font-medium">No Custom Streaks</p>
                      <p className="text-[11px] text-neutral-600">Pick a preset above or add a streak.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rpc.streaks.map((streak, idx) => {
                        const isExpanded = Boolean(expandedCustomItems[streak.id]);
                        return (
                          <div
                            key={streak.id}
                            className={`p-3 rounded-xl border space-y-2.5 transition-colors ${
                              streak.enabled
                                ? "bg-[#08080a] border-[#252530]"
                                : "bg-[#060608] border-[#16161c] opacity-70"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                                <span className="text-xs font-bold text-white truncate">
                                  {streak.prefix ? `${streak.prefix} ` : ""}
                                  {streak.value}
                                  {streak.suffix ? ` ${streak.suffix}` : ""} {streak.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateStreak(streak.id, { enabled: !streak.enabled })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                    streak.enabled
                                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                                      : "bg-neutral-800/80 text-neutral-500 border-neutral-700"
                                  }`}
                                >
                                  {streak.enabled ? "ON" : "OFF"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleCustomItemAdvanced(streak.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 hover:text-white bg-[#121216] border border-[#22222a]"
                                >
                                  {isExpanded ? "Less" : "Options"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStreak(streak.id)}
                                  className="p-1 rounded hover:bg-red-950/40 text-neutral-500 hover:text-red-400"
                                  title="Delete Streak"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Primary Streak Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Name</label>
                                <input
                                  type="text"
                                  value={streak.name}
                                  onChange={(e) => updateStreak(streak.id, { name: e.target.value })}
                                  placeholder="Win Streak"
                                  className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Value</label>
                                <input
                                  type="number"
                                  value={streak.value}
                                  onChange={(e) => updateStreak(streak.id, { value: parseInt(e.target.value, 10) || 0 })}
                                  placeholder="5"
                                  className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Collapsible Advanced Options */}
                            {isExpanded && (
                              <div className="pt-2 border-t border-[#181820] space-y-2.5">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Prefix</label>
                                    <input
                                      type="text"
                                      value={streak.prefix || ""}
                                      onChange={(e) => updateStreak(streak.id, { prefix: e.target.value })}
                                      placeholder="🔥"
                                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Suffix</label>
                                    <input
                                      type="text"
                                      value={streak.suffix || ""}
                                      onChange={(e) => updateStreak(streak.id, { suffix: e.target.value })}
                                      placeholder="Wins"
                                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                                    />
                                  </div>
                                  <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Line</label>
                                    <select
                                      value={streak.targetField || "details"}
                                      onChange={(e) => updateStreak(streak.id, { targetField: e.target.value as any })}
                                      className="w-full bg-[#050505] border border-[#222222] text-xs text-white rounded-lg p-2 focus:outline-none"
                                    >
                                      <option value="details">Details (Top)</option>
                                      <option value="state">State (Bottom)</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveStreak(idx, "up")}
                                    className="px-2 py-1 rounded bg-[#121216] border border-[#22222a] text-[10px] text-neutral-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
                                  >
                                    <ArrowUp size={11} /> Up
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === (rpc.streaks?.length || 0) - 1}
                                    onClick={() => moveStreak(idx, "down")}
                                    className="px-2 py-1 rounded bg-[#121216] border border-[#22222a] text-[10px] text-neutral-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
                                  >
                                    <ArrowDown size={11} /> Down
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 2: Statistics */}
              {customTab === "statistics" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-neutral-400">
                      Display in-game ranking, leaderboard statistics, level, or scores appended to your Rich Presence.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addStatistic()}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                      >
                        <Plus size={13} /> Add Statistic
                      </Button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-mono">QUICK PRESETS:</span>
                    {[
                      { label: "Rank", value: "Diamond II", prefix: "🏆", suffix: "", targetField: "state" as const },
                      { label: "Kills", value: "1,450", prefix: "⚔️", suffix: "K", targetField: "state" as const },
                      { label: "Level", value: "85", prefix: "⭐", suffix: "", targetField: "details" as const },
                      { label: "Score", value: "9,800", prefix: "🎯", suffix: "pts", targetField: "state" as const },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addStatistic(preset)}
                        className="px-2.5 py-1 rounded-lg bg-[#111116] hover:bg-[#1a1a22] border border-[#22222a] text-[11px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span>{preset.prefix}</span>
                        <span>
                          {preset.label}: {preset.value}
                        </span>
                        <Plus size={10} className="text-neutral-500 ml-0.5" />
                      </button>
                    ))}
                  </div>

                  {/* Statistics List */}
                  {!rpc.statistics || rpc.statistics.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#070709] border border-[#1a1a22] text-center space-y-2">
                      <BarChart2 size={28} className="mx-auto text-neutral-600" />
                      <p className="text-xs text-neutral-400 font-medium">No Custom Statistics Configured</p>
                      <p className="text-[11px] text-neutral-600 max-w-sm mx-auto">
                        Add a stat like &quot;🏆 Rank: Diamond&quot; or &quot;⚔️ Kills: 1.5K&quot; to broadcast your milestones.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rpc.statistics.map((stat, idx) => (
                        <div
                          key={stat.id}
                          className="p-3.5 rounded-xl bg-[#08080a] border border-[#1f1f24] space-y-3 transition-colors hover:border-[#2a2a32]"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#181820] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                {stat.prefix && <span>{stat.prefix}</span>}
                                <span>{stat.label}:</span>
                                <span>{stat.value}</span>
                                {stat.suffix && <span>{stat.suffix}</span>}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Target Field Selector */}
                              <select
                                value={stat.targetField || "state"}
                                onChange={(e) => updateStatistic(stat.id, { targetField: e.target.value as any })}
                                className="bg-[#121216] border border-[#22222a] text-[11px] text-neutral-300 rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="state">Append to State (Bottom)</option>
                                <option value="details">Append to Details (Top)</option>
                              </select>

                              {/* Toggle */}
                              <button
                                type="button"
                                onClick={() => updateStatistic(stat.id, { enabled: !stat.enabled })}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                  stat.enabled
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                                }`}
                              >
                                {stat.enabled ? "ACTIVE" : "OFF"}
                              </button>

                              {/* Reorder Up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveStatistic(idx, "up")}
                                className="p-1 rounded hover:bg-[#1a1a20] text-neutral-400 hover:text-white disabled:opacity-20"
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>

                              {/* Reorder Down */}
                              <button
                                type="button"
                                disabled={idx === (rpc.statistics?.length || 0) - 1}
                                onClick={() => moveStatistic(idx, "down")}
                                className="p-1 rounded hover:bg-[#1a1a20] text-neutral-400 hover:text-white disabled:opacity-20"
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => removeStatistic(stat.id)}
                                className="p-1 rounded hover:bg-red-950/40 text-neutral-500 hover:text-red-400"
                                title="Delete Statistic"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Statistic Inputs */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Metric / Label</label>
                              <input
                                type="text"
                                value={stat.label}
                                onChange={(e) => updateStatistic(stat.id, { label: e.target.value })}
                                placeholder="Rank"
                                className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Current Value</label>
                              <input
                                type="text"
                                value={stat.value}
                                onChange={(e) => updateStatistic(stat.id, { value: e.target.value })}
                                placeholder="Diamond"
                                className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Prefix Emoji</label>
                              <input
                                type="text"
                                value={stat.prefix || ""}
                                onChange={(e) => updateStatistic(stat.id, { prefix: e.target.value })}
                                placeholder="🏆"
                                className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Suffix / Unit</label>
                              <input
                                type="text"
                                value={stat.suffix || ""}
                                onChange={(e) => updateStatistic(stat.id, { suffix: e.target.value })}
                                placeholder="pts"
                                className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 3: Status Labels / Badges */}
              {customTab === "labels" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-neutral-400">
                      Add highlighted status badges such as MVP, Competitive, or Custom Tags to your presence.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addStatusLabel()}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                      >
                        <Plus size={13} /> Add Status Badge
                      </Button>
                    </div>
                  </div>

                  {/* One-click toggle presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-mono">ONE-CLICK BADGES:</span>
                    {[
                      { emoji: "👑", label: "MVP", targetField: "details" as const },
                      { emoji: "⚔️", label: "Competitive", targetField: "details" as const },
                      { emoji: "🔥", label: "Trending", targetField: "details" as const },
                      { emoji: "💎", label: "Pro", targetField: "details" as const },
                      { emoji: "🟢", label: "Online", targetField: "state" as const },
                      { emoji: "🎮", label: "In Match", targetField: "state" as const },
                    ].map((badge, idx) => {
                      const existing = (rpc.statusLabels || []).find((l) => l.label.toLowerCase() === badge.label.toLowerCase());
                      const isActive = existing ? existing.enabled : false;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (existing) {
                              updateStatusLabel(existing.id, { enabled: !existing.enabled });
                            } else {
                              addStatusLabel({ emoji: badge.emoji, label: badge.label, targetField: badge.targetField });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                            isActive
                              ? "bg-purple-950/40 border-purple-500/50 text-purple-200 shadow-sm"
                              : "bg-[#111116] border-[#22222a] text-neutral-400 hover:text-white hover:border-neutral-700"
                          }`}
                        >
                          <span>{badge.emoji}</span>
                          <span>{badge.label}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-purple-400" : "bg-neutral-600"}`} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Labels List */}
                  {!rpc.statusLabels || rpc.statusLabels.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#070709] border border-[#1a1a22] text-center space-y-2">
                      <Tag size={28} className="mx-auto text-neutral-600" />
                      <p className="text-xs text-neutral-400 font-medium">No Status Badges Configured</p>
                      <p className="text-[11px] text-neutral-600 max-w-sm mx-auto">
                        Click any of the one-click badges above or add a custom badge to display on your activity.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rpc.statusLabels.map((lbl, idx) => (
                        <div
                          key={lbl.id}
                          className="p-3 rounded-xl bg-[#08080a] border border-[#1f1f24] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                              type="text"
                              value={lbl.emoji || ""}
                              onChange={(e) => updateStatusLabel(lbl.id, { emoji: e.target.value })}
                              placeholder="👑"
                              className="w-10 bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white text-center focus:outline-none shrink-0"
                            />
                            <input
                              type="text"
                              value={lbl.label}
                              onChange={(e) => updateStatusLabel(lbl.id, { label: e.target.value })}
                              placeholder="MVP"
                              className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Target Field */}
                            <select
                              value={lbl.targetField || "details"}
                              onChange={(e) => updateStatusLabel(lbl.id, { targetField: e.target.value as any })}
                              className="bg-[#121216] border border-[#22222a] text-[11px] text-neutral-300 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="details">Details (Top)</option>
                              <option value="state">State (Bottom)</option>
                            </select>

                            {/* Toggle */}
                            <button
                              type="button"
                              onClick={() => updateStatusLabel(lbl.id, { enabled: !lbl.enabled })}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                lbl.enabled
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-neutral-800 text-neutral-400 border-neutral-700"
                              }`}
                            >
                              {lbl.enabled ? "ACTIVE" : "OFF"}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => removeStatusLabel(lbl.id)}
                              className="p-1.5 rounded hover:bg-red-950/40 text-neutral-500 hover:text-red-400"
                              title="Delete Badge"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Profile Action Buttons with Resizing & Modern Animated Toggles */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#d71920]">[04]</span> RICH PRESENCE ACTION BUTTONS & SIZING
                  </h3>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    DISCORD PROFILE CTA LINKS (MAX 2) & PREVIEW SIZE CONTROLS
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Button Size Customization in Preview */}
                  <div className="flex items-center gap-1.5 bg-[#141418] border border-[#282832] rounded-lg p-1 text-[11px] font-mono">
                    <span className="text-neutral-500 px-1 text-[10px]">SIZE:</span>
                    {(["small", "medium", "large"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateRpc({ buttonSize: sz })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${(rpc.buttonSize || "medium") === sz
                          ? "bg-white text-black shadow-sm"
                          : "text-neutral-400 hover:text-white"
                          }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  {/* Restore Defaults Action */}
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1e1e24] border border-[#282832] text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} className="text-neutral-400" />
                    RESTORE DEFAULTS
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Button 1: View Profile */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      PRIMARY BUTTON [01] &bull; PROFILE CTA
                    </span>

                    {/* Animated Sliding ON/OFF Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-neutral-400">
                        {rpc.button1Enabled !== false ? "ON" : "OFF"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateRpc({ button1Enabled: rpc.button1Enabled === false ? true : false })
                        }
                        data-testid="toggle-button-1"
                        aria-label="Toggle Primary Button"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rpc.button1Enabled !== false ? "bg-white" : "bg-[#252530]"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${rpc.button1Enabled !== false ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Button Label</label>
                    <input
                      type="text"
                      value={rpc.button1Label || ""}
                      onChange={(e) => updateRpc({ button1Label: e.target.value })}
                      placeholder="View Profile"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Destination URL (Public Profile)</label>
                    <input
                      type="text"
                      value={rpc.button1Url || ""}
                      onChange={(e) => updateRpc({ button1Url: e.target.value })}
                      placeholder={`https://pixel.gg/${currentUser?.username || "username"}`}
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                    {rpc.button1Url && !/^https?:\/\/.+/i.test(rpc.button1Url.trim()) && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                        <AlertCircle size={10} /> URL must start with http:// or https://
                      </p>
                    )}
                  </div>
                </div>

                {/* Button 2: Get PixelsRPC */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      SECONDARY BUTTON [02] &bull; PROMOTIONAL CTA
                    </span>

                    {/* Animated Sliding ON/OFF Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-neutral-400">
                        {rpc.button2Enabled !== false ? "ON" : "OFF"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateRpc({ button2Enabled: rpc.button2Enabled === false ? true : false })
                        }
                        data-testid="toggle-button-2"
                        aria-label="Toggle Secondary Button"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rpc.button2Enabled !== false ? "bg-white" : "bg-[#252530]"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${rpc.button2Enabled !== false ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Button Label</label>
                    <input
                      type="text"
                      value={rpc.button2Label || ""}
                      onChange={(e) => updateRpc({ button2Label: e.target.value })}
                      placeholder="Get PixelsRPC"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Destination URL (Public PixelsRPC Homepage)</label>
                    <input
                      type="text"
                      value={rpc.button2Url || ""}
                      onChange={(e) => updateRpc({ button2Url: e.target.value })}
                      placeholder="https://pixel.gg/rpc"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                    {rpc.button2Url && !/^https?:\/\/.+/i.test(rpc.button2Url.trim()) && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                        <AlertCircle size={10} /> URL must start with http:// or https://
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Discord Profile Preview (5 cols, sticky) */}
          <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE DISCORD PROFILE PREVIEW
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">REAL-TIME RENDER</span>
            </div>

            {/* Native Discord Presence Box */}
            <div className="bg-[#1e1f22] rounded-2xl shadow-2xl overflow-hidden border border-[#2b2d31] font-sans text-neutral-200">
              {/* Card Header Bar dynamically matching Discord activity type */}
              <div
                className={`px-5 py-3 flex items-center justify-between border-b transition-colors ${(rpc.activityType || "streaming") === "streaming"
                  ? "bg-[#181124] border-purple-900/40 text-purple-300"
                  : "bg-[#111214] border-[#2b2d31] text-[#949ba4]"
                  }`}
              >
                <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  {(rpc.activityType || "streaming") === "streaming" && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                  {(rpc.activityType || "streaming") === "streaming"
                    ? `STREAMING ${rpc.appName || "TWITCH"}`
                    : rpc.activityType === "listening"
                      ? `LISTENING TO ${rpc.appName || "SPOTIFY"}`
                      : rpc.activityType === "watching"
                        ? `WATCHING ${rpc.appName || "YOUTUBE"}`
                        : rpc.activityType === "competing"
                          ? `COMPETING IN ${rpc.appName || "ARENA"}`
                          : `PLAYING ${rpc.appName || "A GAME"}`}
                </span>
                <span className="text-[10px] text-[#80848e] font-mono">via PixelsRPC</span>
              </div>

              {/* Main Activity Area */}
              <div className="p-5 flex gap-4">
                {/* Visual Asset Containers */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5 relative">
                    {/* Render resolved avatar if auto-sync is on, or custom large image with crop if enabled */}
                    {rpc.largeImageEnabled === false ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1f22] p-1 text-center border border-dashed border-neutral-700" title="Large Activity Image is disabled (OFF).">
                        <EyeOff size={18} className="text-neutral-500 mb-0.5" />
                        <span className="text-[8px] text-neutral-400 font-mono leading-tight">DISABLED</span>
                      </div>
                    ) : largeImageFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-950/40 p-1 text-center border border-red-500/40" title="Image failed to load. Check that the image URL is accessible.">
                        <AlertCircle size={20} className="text-red-400 mb-0.5" />
                        <span className="text-[8px] text-red-300 font-mono leading-tight">LOAD ERROR</span>
                      </div>
                    ) : (rpc.useProfileAvatar !== false ? (currentUser?.avatar || rpc.largeImage) : rpc.largeImage) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={(rpc.useProfileAvatar !== false ? (currentUser?.avatar || rpc.largeImage) : rpc.largeImage) || ""}
                        alt={rpc.largeImageText || "Profile asset"}
                        title={rpc.largeImageText}
                        className="w-full h-full object-cover"
                        style={(() => {
                          const crop = parseCrop(rpc.largeImageCrop);
                          return crop && rpc.useProfileAvatar === false
                            ? {
                              transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.25}px, ${crop.offsetY * 0.25}px)`,
                              transformOrigin: "center center",
                            }
                            : undefined;
                        })()}
                        onError={() => setLargeImageFailed(true)}
                      />
                    ) : (
                      <Gamepad2 className="text-[#80848e]" size={32} />
                    )}
                  </div>

                  {rpc.smallImage && rpc.smallImageEnabled !== false && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#1e1f22] p-[2px]">
                      <div className="w-full h-full rounded-full bg-[#2b2d31] overflow-hidden flex items-center justify-center relative">
                        {smallImageFailed ? (
                          <div className="w-full h-full flex items-center justify-center bg-red-950/60 text-red-400" title="Small icon failed to load.">
                            <AlertCircle size={14} />
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={rpc.smallImage}
                            alt={rpc.smallImageText || "Small asset"}
                            title={rpc.smallImageText}
                            className="w-full h-full object-cover"
                            style={(() => {
                              const crop = parseCrop(rpc.smallImageCrop);
                              return crop
                                ? {
                                  transform: `scale(${crop.zoom}) translate(${crop.offsetX * 0.25}px, ${crop.offsetY * 0.25}px)`,
                                  transformOrigin: "center center",
                                }
                                : undefined;
                            })()}
                            onError={() => setSmallImageFailed(true)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity Text Lines (Enhanced with Streaks, Statistics & Status Labels) */}
                {(() => {
                  const compiledDetails = formatRichPresenceField(
                    rpc.details,
                    rpc.detailsEnabled,
                    "details",
                    rpc.statusLabels,
                    rpc.streaks,
                    rpc.statistics
                  );

                  const compiledState = formatRichPresenceField(
                    rpc.state,
                    rpc.stateEnabled,
                    "state",
                    rpc.statusLabels,
                    rpc.streaks,
                    rpc.statistics
                  );

                  const tMode = String(rpc.timestampMode ?? (rpc.startTimestamp ? "custom" : "now")).toLowerCase();
                  let timestampStr: string | null = null;
                  if (tMode === "now" || tMode === "1") {
                    timestampStr = `${formatElapsed(elapsedSeconds)} elapsed`;
                  } else if (tMode === "time" || tMode === "2") {
                    const now = new Date();
                    timestampStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  } else if (tMode === "custom" || tMode === "3") {
                    if (rpc.startTimestamp) {
                      timestampStr = `${formatElapsed(elapsedSeconds)} elapsed`;
                    }
                  }

                  return (
                    <div className="flex-1 min-w-0 flex flex-col justify-center font-sans">
                      <h4 className="text-white font-bold text-[15px] truncate leading-tight">
                        {rpc.appName || "Pixel.gg"}
                      </h4>

                      {compiledDetails && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[#dbdee1] text-[13px] truncate font-medium">
                            {compiledDetails}
                          </p>
                          {rpc.detailsUrl && (
                            <a
                              href={rpc.detailsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-400 hover:text-white shrink-0"
                              title={`Details Link: ${rpc.detailsUrl}`}
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}

                      {(compiledState || (rpc.partySize && rpc.partyMax)) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[#949ba4] text-xs truncate">
                            {compiledState}
                            {rpc.partySize && rpc.partyMax && ` (${rpc.partySize} of ${rpc.partyMax})`}
                          </p>
                          {rpc.stateUrl && (
                            <a
                              href={rpc.stateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-400 hover:text-white shrink-0"
                              title={`State Link: ${rpc.stateUrl}`}
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}

                      {timestampStr && (
                        <p className="text-[#949ba4] text-[11px] truncate mt-1 flex items-center gap-1">
                          <Clock size={11} className="shrink-0" />
                          <span>{timestampStr}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Discord Action Buttons (Enforcing max 2 buttons, size customization, and independent toggle) */}
              {((rpc.button1Enabled !== false && rpc.button1Label) || (rpc.button2Enabled !== false && rpc.button2Label)) && (
                <div
                  className={`px-5 pb-5 ${rpc.buttonSize === "small"
                    ? "space-y-1.5"
                    : rpc.buttonSize === "large"
                      ? "space-y-3"
                      : "space-y-2"
                    }`}
                >
                  {rpc.button1Enabled !== false && rpc.button1Label && (
                    <a
                      href={rpc.button1Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full bg-[#2b2d31] hover:bg-[#35373c] text-white font-semibold text-center rounded-lg transition-all block border border-white/5 active:scale-[0.99] truncate ${rpc.buttonSize === "small"
                        ? "py-1.5 px-3 text-[11px]"
                        : rpc.buttonSize === "large"
                          ? "py-3.5 px-5 text-sm shadow-md"
                          : "py-2.5 px-4 text-xs"
                        }`}
                    >
                      {rpc.button1Label}
                    </a>
                  )}
                  {rpc.button2Enabled !== false && rpc.button2Label && (
                    <a
                      href={rpc.button2Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full bg-[#2b2d31] hover:bg-[#35373c] text-white font-semibold text-center rounded-lg transition-all block border border-white/5 active:scale-[0.99] truncate ${rpc.buttonSize === "small"
                        ? "py-1.5 px-3 text-[11px]"
                        : rpc.buttonSize === "large"
                          ? "py-3.5 px-5 text-sm shadow-md"
                          : "py-2.5 px-4 text-xs"
                        }`}
                    >
                      {rpc.button2Label}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Hint Box */}
            <div className="p-4 rounded-xl bg-[#0c0c0c] border border-[#1e1e1e] text-[11px] text-neutral-400 space-y-2 font-mono">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CheckCircle2 size={13} className="text-green-500" />
                <span>SOCKET.IO REAL-TIME DISPATCH</span>
              </div>
              <p className="leading-relaxed">
                When you modify any setting, changes <strong className="text-white">automatically save and synchronize</strong> over WebSocket. The Vencord plugin updates Discord instantly without restarting your client.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Image & Animated GIF Customizer Modal */}
      <ImageCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        targetSlot={customizerSlot}
        currentUrl={customizerSlot === "largeImage" ? rpc.largeImage : rpc.smallImage}
        currentCrop={parseCrop(customizerSlot === "largeImage" ? rpc.largeImageCrop : rpc.smallImageCrop)}
        onApply={handleCustomizerApply}
        onRemove={() => {
          if (customizerSlot === "largeImage") {
            updateRpc({ largeImage: "", largeImageCrop: null, useProfileAvatar: true });
          } else {
            updateRpc({ smallImage: "", smallImageCrop: null });
          }
        }}
      />
    </AccountLayout>
  );
}
