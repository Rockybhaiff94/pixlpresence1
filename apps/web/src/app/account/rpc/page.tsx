"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface RpcConfig {
  appId?: string;
  appName?: string;
  state?: string;
  details?: string;
  largeImage?: string;
  largeImageText?: string;
  smallImage?: string;
  smallImageText?: string;
  startTimestamp?: string | null;
  endTimestamp?: string | null;
  partySize?: number | null;
  partyMax?: number | null;
  button1Label?: string;
  button1Url?: string;
  button2Label?: string;
  button2Url?: string;
}

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

  const [rpc, setRpc] = useState<RpcConfig>({
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
    startTimestamp: null,
  });

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
    async function loadData() {
      try {
        // Load secure app token
        const tokenRes = await apiFetch("/api/profile/me/token");
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.token) setToken(tokenData.token);
        }

        // Load existing RichPresence settings
        const rpcRes = await apiFetch("/api/rpc/me");
        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && Object.keys(rpcData).length > 0) {
            setRpc((prev) => ({
              ...prev,
              ...rpcData,
              appId: rpcData.appId || prev.appId,
              appName: rpcData.appName || prev.appName,
            }));
          }
        }
      } catch (err) {
        console.error("[RPC Studio] Failed to load config:", err);
      }
    }
    loadData();
  }, []);

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
      setRpc((prev) => ({
        ...prev,
        ...preset,
      }));
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

        {/* Vencord Plugin Integration Card */}
        <div className="bg-[#0c0c0c] border border-[#222222] rounded-2xl p-6 relative overflow-hidden space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#181818] border border-[#2c2c2c] text-[10px] text-neutral-400 uppercase tracking-widest">
                <Plug size={12} className="text-[#d71920]" /> Vencord Plugin Token
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Private PixelsRPC Application Token
              </h2>
              <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                Provide this private credential to your local PixelsRPC Vencord plugin. Presence updates stream securely into Discord without a third-party desktop app.
              </p>
            </div>

            {/* Token Action Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex items-center bg-[#050505] border border-[#262626] rounded-xl px-3.5 py-2 text-xs text-neutral-300 min-w-[260px]">
                <span className="truncate flex-1 font-mono tracking-wider">
                  {token
                    ? showToken
                      ? token
                      : `${token.slice(0, 8)}••••••••••••••••••••••••••••••••`
                    : "Fetching token..."}
                </span>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="ml-2 text-neutral-500 hover:text-white transition-colors"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <Button
                variant="outline"
                onClick={handleCopyToken}
                className="text-xs flex items-center justify-center gap-1.5"
              >
                {copiedToken ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copiedToken ? "COPIED" : "COPY TOKEN"}
              </Button>

              <Button
                variant="outline"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                title="Regenerate token (Revokes old sessions)"
                className="text-xs flex items-center justify-center gap-1"
              >
                <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
                {regenerating ? "..." : "RESET"}
              </Button>
            </div>
          </div>

          {/* 3-Step Installation Guide */}
          <div className="pt-5 border-t border-[#1a1a1a] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-1.5">
              <span className="text-[10px] text-[#d71920] font-bold tracking-widest">[STEP 01]</span>
              <p className="font-semibold text-white">Install Vencord</p>
              <p className="text-neutral-500 text-[11px] leading-relaxed">
                Ensure <strong className="text-neutral-300">Vencord</strong> is installed on your Discord desktop client.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-1.5">
              <span className="text-[10px] text-[#d71920] font-bold tracking-widest">[STEP 02]</span>
              <p className="font-semibold text-white">Add PixelsRPC</p>
              <p className="text-neutral-500 text-[11px] leading-relaxed">
                Copy the console snippet or download <code className="text-neutral-300">PixelsRPC.vencord.js</code> into userplugins.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-1.5">
              <span className="text-[10px] text-[#d71920] font-bold tracking-widest">[STEP 03]</span>
              <p className="font-semibold text-white">Sync Rich Presence</p>
              <p className="text-neutral-500 text-[11px] leading-relaxed">
                Paste your private App Token. Any edits made here will stream automatically.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCopySnippet}
              className="text-[11px] flex items-center gap-1.5"
            >
              {copiedSnippet ? <Check size={13} className="text-green-400" /> : <Code2 size={13} />}
              {copiedSnippet ? "SNIPPET COPIED!" : "COPY VENCORD CONSOLE SNIPPET"}
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadPlugin}
              className="text-[11px] flex items-center gap-1.5"
            >
              <Download size={13} />
              DOWNLOAD PIXELSRPC.JS
            </Button>

            <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 sm:ml-auto">
              <ShieldCheck size={13} className="text-green-500" /> Web-First &bull; Zero external executable binaries required
            </span>
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
            {/* Section 1: Application Identity */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[01]</span> APPLICATION IDENTITY
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">CORE DISCORD ATTRIBUTES</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={rpc.appName || ""}
                    onChange={(e) => setRpc({ ...rpc, appName: e.target.value })}
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
                    onChange={(e) => setRpc({ ...rpc, appId: e.target.value })}
                    placeholder="1523632136878559302"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Details Line (Top Line)
                  </label>
                  <input
                    type="text"
                    value={rpc.details || ""}
                    onChange={(e) => setRpc({ ...rpc, details: e.target.value })}
                    placeholder="e.g. In Competitive Match"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    State Line (Bottom Line)
                  </label>
                  <input
                    type="text"
                    value={rpc.state || ""}
                    onChange={(e) => setRpc({ ...rpc, state: e.target.value })}
                    placeholder="e.g. Score: 12 - 4 (Ranked)"
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
                        setRpc({
                          ...rpc,
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
                        setRpc({
                          ...rpc,
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
                        setRpc({ ...rpc, startTimestamp: null });
                      } else {
                        setRpc({ ...rpc, startTimestamp: new Date().toISOString() });
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

            {/* Section 2: Visual Assets & Badges */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[02]</span> VISUAL ASSETS & BADGES
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">IMAGES & TOOLTIPS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Large Image URL
                  </label>
                  <input
                    type="text"
                    value={rpc.largeImage || ""}
                    onChange={(e) => setRpc({ ...rpc, largeImage: e.target.value })}
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
                    onChange={(e) => setRpc({ ...rpc, largeImageText: e.target.value })}
                    placeholder="e.g. Level 100 Boss"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                    Small Image URL (Badge)
                  </label>
                  <input
                    type="text"
                    value={rpc.smallImage || ""}
                    onChange={(e) => setRpc({ ...rpc, smallImage: e.target.value })}
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
                    onChange={(e) => setRpc({ ...rpc, smallImageText: e.target.value })}
                    placeholder="e.g. Verified Pro"
                    className="w-full bg-[#050505] border border-[#222222] focus:border-white rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Profile Action Buttons */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#181818] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-[#d71920]">[03]</span> INTERACTIVE PROFILE BUTTONS
                </h3>
                <span className="text-[10px] text-neutral-500 uppercase">DISCORD CTA LINKS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Button 1 */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      PRIMARY BUTTON [01]
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Label</label>
                    <input
                      type="text"
                      value={rpc.button1Label || ""}
                      onChange={(e) => setRpc({ ...rpc, button1Label: e.target.value })}
                      placeholder="e.g. View Profile"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Destination URL</label>
                    <input
                      type="text"
                      value={rpc.button1Url || ""}
                      onChange={(e) => setRpc({ ...rpc, button1Url: e.target.value })}
                      placeholder="https://pixel.gg/username"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {/* Button 2 */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#1a1a1a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      SECONDARY BUTTON [02]
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Label</label>
                    <input
                      type="text"
                      value={rpc.button2Label || ""}
                      onChange={(e) => setRpc({ ...rpc, button2Label: e.target.value })}
                      placeholder="e.g. Join Discord"
                      className="w-full bg-[#050505] border border-[#222222] rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1 uppercase">Destination URL</label>
                    <input
                      type="text"
                      value={rpc.button2Url || ""}
                      onChange={(e) => setRpc({ ...rpc, button2Url: e.target.value })}
                      placeholder="https://discord.gg/..."
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
              {/* Card Header Bar */}
              <div className="bg-[#111214] px-5 py-3 flex items-center justify-between border-b border-[#2b2d31]">
                <span className="text-[#949ba4] font-bold text-[11px] uppercase tracking-wider">
                  PLAYING A GAME
                </span>
                <span className="text-[10px] text-[#80848e] font-mono">via PixelsRPC</span>
              </div>

              {/* Main Activity Area */}
              <div className="p-5 flex gap-4">
                {/* Visual Asset Containers */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
                    {rpc.largeImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={rpc.largeImage}
                        alt={rpc.largeImageText || "Large asset"}
                        title={rpc.largeImageText}
                        className="w-full h-full object-cover"
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
                      <div className="w-full h-full rounded-full bg-[#2b2d31] overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rpc.smallImage}
                          alt={rpc.smallImageText || "Small asset"}
                          title={rpc.smallImageText}
                          className="w-full h-full object-cover"
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

              {/* Discord Action Buttons */}
              {(rpc.button1Label || rpc.button2Label) && (
                <div className="px-5 pb-5 space-y-2">
                  {rpc.button1Label && (
                    <a
                      href={rpc.button1Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold text-center rounded-lg transition-colors block border border-white/5 active:scale-[0.99]"
                    >
                      {rpc.button1Label}
                    </a>
                  )}
                  {rpc.button2Label && (
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
    </AccountLayout>
  );
}

