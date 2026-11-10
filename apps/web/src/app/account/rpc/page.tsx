"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
import { ImageCustomizerModal, CropData } from "@/components/rpc/ImageCustomizerModal";

interface RpcConfig {
  appId?: string;
  appName?: string;
  activityType?: "streaming" | "playing" | "listening" | "watching" | "competing";
  streamUrl?: string;
  state?: string;
  details?: string;
  useProfileAvatar?: boolean;
  largeImage?: string;
  largeImageText?: string;
  largeImageCrop?: string | null;
  smallImage?: string;
  smallImageText?: string;
  smallImageCrop?: string | null;
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
  showProfileRpc?: boolean;
  enableDiscordRpc?: boolean;
}

const DEFAULT_RPC: RpcConfig = {
  appId: "1523632136878559302",
  appName: "Pixel.gg",
  activityType: "streaming",
  streamUrl: "https://twitch.tv/pixelgg",
  state: "Discover my personal page on PIXEL.GG.",
  details: "Welcome to my profile!",
  useProfileAvatar: true,
  largeImage: "",
  largeImageText: "PIXEL.GG Platform",
  largeImageCrop: null,
  smallImage: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
  smallImageText: "PIXEL.GG",
  smallImageCrop: null,
  button1Enabled: true,
  button1Label: "View Profile",
  button1Url: "https://pixel.gg",
  button2Enabled: true,
  button2Label: "Get PixelsRPC",
  button2Url: "https://pixel.gg/rpc",
  showProfileRpc: true,
  enableDiscordRpc: true,
  partySize: null,
  partyMax: null,
  startTimestamp: null,
};

const PRESETS: Record<string, Partial<RpcConfig>> = {
  pixel: {
    appId: "1523632136878559302",
    appName: "Pixel.gg",
    state: "Browsing Pixel.gg",
    details: "Customizing Rich Presence",
    largeImage: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
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
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(885); // 14:45 initial
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
  const [currentSession, setCurrentSession] = useState<{
    sessionId: string;
    code: string;
    codeId: string;
    expiresAt: string;
    expiresAtMs: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [linkedDevices, setLinkedDevices] = useState<
    { id: string; deviceName: string; consumedAt: string; lastUsedAt: string }[]
  >([]);
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

  // Helper to update RPC state and synchronously sync to localStorage
  const updateRpc = (updates: Partial<RpcConfig>) => {
    isDirtyRef.current = true;
    setRpc((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pixel_rpc_config", JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
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
      smallImage: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
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
          apiFetch("/api/account"),
        ]);

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.token) setToken(tokenData.token);
        }

        if (accountRes.ok) {
          const accountData = await accountRes.json();
          if (accountData?.user) {
            setCurrentUser(accountData.user);
          }
        }

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && typeof rpcData === "object" && Object.keys(rpcData).length > 0) {
            setRpc((prev) => {
              if (isDirtyRef.current) return prev;

              const merged: RpcConfig = { ...prev };
              for (const [key, value] of Object.entries(rpcData)) {
                if (["id", "userId", "createdAt", "updatedAt"].includes(key)) continue;
                if (value !== null && value !== undefined && value !== "") {
                  (merged as Record<string, unknown>)[key] = value;
                }
              }

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

  const fetchLinkedDevices = async () => {
    try {
      const res = await apiFetch("/api/rpc/device/list");
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) setLinkedDevices(list);
      }
    } catch {
      // ignore
    }
  };

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
    setLinkingState("generating");

    try {
      const res = await apiFetch("/api/rpc/device/authorize", {
        method: "POST",
        signal: controller.signal,
      });

      // Disregard if a newer session was triggered or component unmounted
      if (activeSessionIdRef.current !== newSessionId || controller.signal.aborted) {
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
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
          const pollRes = await apiFetch(`/api/rpc/device/status?codeId=${data.codeId}`, {
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
    if (!confirm("Unlink this device from your Rich Presence?")) return;
    try {
      await apiFetch("/api/rpc/device/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      fetchLinkedDevices();
    } catch (err) {
      console.error("Failed to unlink device", err);
    }
  };

  const installCommand = `irm ${
    typeof window !== "undefined" ? window.location.origin : "https://pixlpresence1-web.vercel.app"
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

  const handleSaveRpc = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const payload = {
        ...rpc,
        partySize: rpc.partySize ? Number(rpc.partySize) : null,
        partyMax: rpc.partyMax ? Number(rpc.partyMax) : null,
      };

      const res = await apiFetch("/api/rpc/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        isDirtyRef.current = false;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("pixel_rpc_config", JSON.stringify(payload));
          } catch {
            // ignore storage errors
          }
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      } else {
        alert("Failed to save RPC settings. Please check your network connection.");
      }
    } catch (err) {
      console.error("[RPC Studio] Save error:", err);
      alert("Error saving RPC configuration.");
    } finally {
      setSaving(false);
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

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-green-400 flex items-center gap-1 font-semibold animate-fade-in bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} /> PRESENCE SYNCHRONIZED
              </span>
            )}
            <Button
              onClick={handleSaveRpc}
              disabled={saving}
              variant="solid-white"
              className="px-6 py-2.5 text-xs tracking-wider flex items-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {saving ? "SYNCHRONIZING..." : "SAVE & SYNC"}
            </Button>
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
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#18181f] border border-[#2c2c36] text-[10px] text-neutral-400 uppercase tracking-widest">
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
                <Button
                  onClick={handleGenerateLinkingCode}
                  variant="solid-white"
                  className="px-6 py-2.5 text-xs font-bold tracking-wider flex items-center gap-2"
                >
                  <Plug size={14} />
                  GENERATE LINKING CODE
                </Button>
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
                Failed to Generate Linking Code
              </p>
              <p className="text-neutral-400 text-[11px]">
                A network or server error occurred. Please check your connection and try again.
              </p>
              <Button
                variant="solid-white"
                onClick={handleGenerateLinkingCode}
                className="text-xs px-4 py-1.5 mt-2"
              >
                RETRY
              </Button>
            </div>
          )}

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
                    className="p-3.5 rounded-xl bg-[#0e0e12] border border-[#222228] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="text-white font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {dev.deviceName || "Vencord Discord Client"}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Linked {new Date(dev.consumedAt).toLocaleDateString()} &bull; Active recently
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnlinkDevice(dev.id)}
                      className="px-2.5 py-1 rounded bg-[#181820] hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-[#282830] hover:border-red-500/40 text-[11px] transition-colors cursor-pointer"
                    >
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
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        rpc.showProfileRpc !== false
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    rpc.showProfileRpc !== false
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
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        rpc.enableDiscordRpc !== false
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    rpc.enableDiscordRpc !== false
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

            {/* Section 1: Application Identity & Activity Type Customization */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[01]</span> APPLICATION & ACTIVITY TYPE
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">DISCORD GATEWAY SPEC</span>
              </div>

              {/* Core App Information */}
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
                    Discord Client ID (App ID)
                  </label>
                  <input
                    type="text"
                    value={rpc.appId || ""}
                    onChange={(e) => updateRpc({ appId: e.target.value })}
                    placeholder="1523632136878559302"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Activity Type Selector */}
              <div className="space-y-2 pt-2 border-t border-[#181818]">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase">
                    Activity Type (Discord Status Badge)
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono">DEFAULT: STREAMING</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "streaming", label: "Streaming", desc: "Type 1 (Twitch / Live)", icon: Tv, badge: "PURPLE BADGE" },
                    { id: "playing", label: "Playing", desc: "Type 0 (Game / App)", icon: Play, badge: "GREEN BADGE" },
                    { id: "listening", label: "Listening", desc: "Type 2 (Music / Audio)", icon: Headphones, badge: "SPOTIFY STYLE" },
                    { id: "watching", label: "Watching", desc: "Type 3 (Video / Stream)", icon: Eye, badge: "MEDIA STYLE" },
                    { id: "competing", label: "Competing", desc: "Type 5 (Tournament)", icon: Trophy, badge: "ARENA STYLE" },
                  ].map((item) => {
                    const active = (rpc.activityType || "streaming") === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateRpc({ activityType: item.id as any })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? item.id === "streaming"
                              ? "bg-purple-950/30 border-purple-500 text-white shadow-lg shadow-purple-950/50"
                              : "bg-[#141419] border-white text-white shadow-lg"
                            : "bg-[#050505] border-[#222222] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} className={active ? (item.id === "streaming" ? "text-purple-400" : "text-white") : "text-neutral-500"} />
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Streaming Broadcast URL (Required for Type 1) */}
              {(rpc.activityType || "streaming") === "streaming" && (
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-purple-300 uppercase flex items-center gap-1.5">
                      <Tv size={12} className="text-purple-400" /> Streaming Broadcast URL
                    </label>
                    <span className="text-[10px] text-purple-400 font-mono">TWITCH / YOUTUBE URL</span>
                  </div>
                  <input
                    type="url"
                    value={rpc.streamUrl || ""}
                    onChange={(e) => updateRpc({ streamUrl: e.target.value })}
                    placeholder={`https://twitch.tv/${currentUser?.username || "pixelgg"}`}
                    className="w-full bg-[#050505] border border-purple-500/40 focus:border-purple-400 rounded-lg p-2.5 text-xs text-white placeholder-purple-300/40 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-neutral-400">
                    Discord Gateway requires a valid stream URL (e.g. Twitch or YouTube Live) to broadcast the purple Streaming indicator.
                  </p>
                </div>
              )}

              {/* Activity Details & State */}
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase">
                      Details Line (Top Line)
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">DEFAULT: Welcome to my profile!</span>
                  </div>
                  <input
                    type="text"
                    value={rpc.details || ""}
                    onChange={(e) => updateRpc({ details: e.target.value })}
                    placeholder="Welcome to my profile!"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase">
                      State Line (Bottom Line)
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">DEFAULT: Discover my personal page on PIXEL.GG.</span>
                  </div>
                  <input
                    type="text"
                    value={rpc.state || ""}
                    onChange={(e) => updateRpc({ state: e.target.value })}
                    placeholder="Discover my personal page on PIXEL.GG."
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Party configuration & Elapsed mode */}
              <div className="pt-2 border-t border-[#181818] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <Users size={12} className="text-neutral-500" />
                    Party Size (Current / Max)
                  </label>
                  <div className="flex items-center gap-2">
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
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors text-center"
                    />
                    <span className="text-neutral-500 text-xs">/</span>
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
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <Clock size={12} className="text-neutral-500" />
                    Timestamp Mode
                  </label>
                  <select
                    value={rpc.startTimestamp ? "custom" : "elapsed"}
                    onChange={(e) => {
                      if (e.target.value === "elapsed") {
                        updateRpc({ startTimestamp: null });
                      } else {
                        updateRpc({ startTimestamp: new Date().toISOString() });
                      }
                    }}
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="elapsed">Dynamic Elapsed Time (00:00 elapsed)</option>
                    <option value="custom">Fixed Session Timestamp</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Visual Assets & Profile Picture Integration */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#d71920]">[02]</span> VISUAL ASSETS & CUSTOM IMAGES
                  </h3>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    PFP AUTO-SYNC, CUSTOM UPLOADS & ANIMATED GIFS (UP TO 5MB)
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

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = rpc.useProfileAvatar === false ? true : false;
                      updateRpc({
                        useProfileAvatar: next,
                        largeImage: next ? (currentUser?.avatar || rpc.largeImage) : rpc.largeImage,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rpc.useProfileAvatar !== false ? "bg-white" : "bg-[#222222]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        rpc.useProfileAvatar !== false ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
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
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-neutral-300" /> LARGE ACTIVITY IMAGE
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Custom wallpaper, art, avatar, or animated GIF
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCustomizer("largeImage")}
                    className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                  >
                    <UploadCloud size={13} /> Upload & Crop Image / GIF
                  </Button>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Direct Image URL
                    </label>
                    <input
                      type="text"
                      value={rpc.largeImage || ""}
                      onChange={(e) => updateRpc({ largeImage: e.target.value, useProfileAvatar: false })}
                      placeholder="https://..."
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Large Image Tooltip Text
                    </label>
                    <input
                      type="text"
                      value={rpc.largeImageText || ""}
                      onChange={(e) => updateRpc({ largeImageText: e.target.value })}
                      placeholder="e.g. PIXEL.GG Pro"
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Small Activity Icon Upload & Customization */}
              <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-2.5">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-neutral-300" /> SMALL ACTIVITY ICON (BADGE)
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Corner icon badge, mini branding, or animated status
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateRpc({
                          smallImage:
                            "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
                          smallImageText: "PIXEL.GG",
                          smallImageCrop: null,
                        })
                      }
                      className="text-[10px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-[#141414] border border-[#242424]"
                    >
                      Default Pixels Icon
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCustomizer("smallImage")}
                      className="text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[#141414] hover:bg-[#202020] text-white border-[#2a2a2a]"
                    >
                      <UploadCloud size={13} /> Upload & Crop Icon / GIF
                    </Button>
                  </div>
                </div>

                {rpc.smallImage && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#050505] border border-[#1f1f1f]">
                    <div className="w-10 h-10 rounded-full bg-[#141414] overflow-hidden border border-[#2b2d31] shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rpc.smallImage}
                        alt="Small Icon Asset"
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
                      />
                    </div>

                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <p className="text-white font-medium truncate">{rpc.smallImage}</p>
                      <div className="flex items-center gap-2">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Small Image URL (Badge)
                    </label>
                    <input
                      type="text"
                      value={rpc.smallImage || ""}
                      onChange={(e) => updateRpc({ smallImage: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                      Small Image Tooltip Text
                    </label>
                    <input
                      type="text"
                      value={rpc.smallImageText || ""}
                      onChange={(e) => updateRpc({ smallImageText: e.target.value })}
                      placeholder="PIXEL.GG"
                      className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Profile Action Buttons with Restore Defaults */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#181818] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#d71920]">[03]</span> DEFAULT PROMOTIONAL BUTTONS
                  </h3>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    DISCORD PROFILE CTA LINKS (MAX 2)
                  </span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Button 1: View Profile */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      PRIMARY BUTTON [01] &bull; PROFILE CTA
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-neutral-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rpc.button1Enabled !== false}
                        onChange={(e) => updateRpc({ button1Enabled: e.target.checked })}
                        className="rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0"
                      />
                      <span>{rpc.button1Enabled !== false ? "ENABLED" : "DISABLED"}</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Label</label>
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
                  </div>
                </div>

                {/* Button 2: Get PixelsRPC */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      SECONDARY BUTTON [02] &bull; PROMOTIONAL CTA
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-neutral-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rpc.button2Enabled !== false}
                        onChange={(e) => updateRpc({ button2Enabled: e.target.checked })}
                        className="rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0"
                      />
                      <span>{rpc.button2Enabled !== false ? "ENABLED" : "DISABLED"}</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Label</label>
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
                className={`px-5 py-3 flex items-center justify-between border-b transition-colors ${
                  (rpc.activityType || "streaming") === "streaming"
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
                    {/* Render resolved avatar if auto-sync is on, or custom large image with crop */}
                    {(rpc.useProfileAvatar !== false ? (currentUser?.avatar || rpc.largeImage) : rpc.largeImage) ? (
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
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Gamepad2 className="text-[#80848e]" size={32} />
                    )}
                  </div>

                  {rpc.smallImage && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#1e1f22] p-[2px]">
                      <div className="w-full h-full rounded-full bg-[#2b2d31] overflow-hidden flex items-center justify-center relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity Text Lines */}
                <div className="flex-1 min-w-0 flex flex-col justify-center font-sans">
                  <h4 className="text-white font-bold text-[15px] truncate leading-tight">
                    {rpc.appName || "Pixel.gg"}
                  </h4>
                  {rpc.details && (
                    <p className="text-[#dbdee1] text-[13px] truncate font-medium mt-0.5">
                      {rpc.details}
                    </p>
                  )}
                  {rpc.state && (
                    <p className="text-[#949ba4] text-xs truncate mt-0.5">
                      {rpc.state}
                      {rpc.partySize && rpc.partyMax && ` (${rpc.partySize} of ${rpc.partyMax})`}
                    </p>
                  )}
                  <p className="text-[#949ba4] text-[11px] truncate mt-1 flex items-center gap-1">
                    <Clock size={11} className="shrink-0" />
                    <span>{formatElapsed(elapsedSeconds)}</span>
                  </p>
                </div>
              </div>

              {/* Discord Action Buttons (Enforcing max 2 buttons and independent toggle) */}
              {((rpc.button1Enabled !== false && rpc.button1Label) || (rpc.button2Enabled !== false && rpc.button2Label)) && (
                <div className="px-5 pb-5 space-y-2">
                  {rpc.button1Enabled !== false && rpc.button1Label && (
                    <a
                      href={rpc.button1Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold text-center rounded-lg transition-colors block border border-white/5 active:scale-[0.99]"
                    >
                      {rpc.button1Label}
                    </a>
                  )}
                  {rpc.button2Enabled !== false && rpc.button2Label && (
                    <a
                      href={rpc.button2Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold text-center rounded-lg transition-colors block border border-white/5 active:scale-[0.99]"
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
                When you click <strong className="text-white">SAVE & SYNC</strong>, the backend transmits the update over WebSocket. The Vencord plugin updates Discord instantly without restarting your client.
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
