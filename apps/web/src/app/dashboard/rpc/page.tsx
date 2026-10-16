"use client";

import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, Download, Sparkles, Eye, EyeOff, Plug, ShieldCheck } from "lucide-react";

interface RpcConfig {
  appId?: string;
  appName?: string;
  state?: string;
  details?: string;
  largeImage?: string;
  largeImageText?: string;
  smallImage?: string;
  smallImageText?: string;
  button1Label?: string;
  button1Url?: string;
  button2Label?: string;
  button2Url?: string;
}

export default function RpcPage() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
  });

  useEffect(() => {
    // Fetch user token and existing RPC config
    async function loadData() {
      try {
        const tokenRes = await fetch("/api/profile/me/token");
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.token) setToken(tokenData.token);
        }

        const rpcRes = await fetch("/api/rpc/me");
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
        console.error("Failed to load RPC data:", err);
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
    if (!confirm("Regenerating your App Token will disconnect any existing active sessions in Vencord until you update the token in your plugin settings. Continue?")) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch("/api/profile/me/token", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveRpc = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/rpc/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rpc),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save RPC settings");
    } finally {
      setSaving(false);
    }
  };

  const vencordConsoleSnippet = `// === PixelsRPC Vencord Loader ===
(async () => {
  const token = "${token || 'PASTE_YOUR_TOKEN_HERE'}";
  const apiUrl = "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}";
  const script = document.createElement("script");
  script.src = apiUrl + "/PixelsRPC.vencord.js";
  script.onload = () => window.PixelsRPC?.start({ token, apiUrl });
  document.head.appendChild(script);
  console.log("[PixelsRPC] Loader initialized.");
})();`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(vencordConsoleSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleDownloadPlugin = () => {
    const blob = new Blob([vencordConsoleSnippet], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PixelsRPC.vencord.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discord Rich Presence</h1>
          <p className="text-zinc-400 mt-1">
            Configure your custom presence and sync it directly to Discord using the <span className="text-purple-400 font-medium">PixelsRPC Vencord plugin</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-sm text-green-400 flex items-center gap-1 font-medium animate-fade-in">
              <Check size={16} /> Presence Synced
            </span>
          )}
          <button
            onClick={handleSaveRpc}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-2"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {saving ? "Saving..." : "Save & Sync"}
          </button>
        </div>
      </div>

      {/* PixelsRPC Vencord Integration Card */}
      <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Plug size={13} /> Vencord Plugin Integration
            </div>
            <h2 className="text-xl font-bold text-white">Your PixelsRPC App Token</h2>
            <p className="text-sm text-zinc-400 max-w-xl">
              Use this private token inside your PixelsRPC Vencord plugin settings. Rich presence updates will be streamed directly into your local Discord client.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-sm text-zinc-300 min-w-[280px]">
              <span className="truncate flex-1">
                {token ? (showToken ? token : `${token.slice(0, 8)}••••••••••••••••••••`) : "Generating..."}
              </span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              onClick={handleCopyToken}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {copiedToken ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copiedToken ? "Copied!" : "Copy Token"}
            </button>

            <button
              onClick={handleRegenerateToken}
              disabled={regenerating}
              title="Regenerate token"
              className="bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white p-2.5 rounded-xl transition-colors flex items-center justify-center"
            >
              <RefreshCw size={16} className={regenerating ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Plugin Quick Setup Box */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-300">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
            <p>Install <strong className="text-white">Vencord</strong> into your Discord desktop app.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
            <p>Add the <strong className="text-white">PixelsRPC</strong> plugin to your Vencord userplugins or run the console script.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
            <p>Paste your <strong className="text-white">App Token</strong>. Your presence stays live automatically.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleCopySnippet}
            className="text-xs bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {copiedSnippet ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copiedSnippet ? "Snippet Copied!" : "Copy Quick-Load Console Snippet"}
          </button>
          <button
            onClick={handleDownloadPlugin}
            className="text-xs bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Download size={14} /> Download PixelsRPC.js
          </button>
          <span className="text-xs text-zinc-500 flex items-center gap-1 ml-auto">
            <ShieldCheck size={14} className="text-green-500" /> Web-First &bull; No standalone desktop app required
          </span>
        </div>
      </div>

      {/* Configuration Form & Live Preview Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Activity Identity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-white">Application Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Application Name</label>
                <input
                  type="text"
                  value={rpc.appName || ""}
                  onChange={(e) => setRpc({ ...rpc, appName: e.target.value })}
                  placeholder="Pixel.gg / Custom Game Name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Application ID (Discord Client ID)</label>
                <input
                  type="text"
                  value={rpc.appId || ""}
                  onChange={(e) => setRpc({ ...rpc, appId: e.target.value })}
                  placeholder="1523632136878559302"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Details (Top Line)</label>
                <input
                  type="text"
                  value={rpc.details || ""}
                  onChange={(e) => setRpc({ ...rpc, details: e.target.value })}
                  placeholder="e.g. In Competitive Match"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">State (Bottom Line)</label>
                <input
                  type="text"
                  value={rpc.state || ""}
                  onChange={(e) => setRpc({ ...rpc, state: e.target.value })}
                  placeholder="e.g. Score: 12 - 4"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-white">Assets & Badges</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Large Image URL</label>
                <input
                  type="text"
                  value={rpc.largeImage || ""}
                  onChange={(e) => setRpc({ ...rpc, largeImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Large Image Hover Text</label>
                <input
                  type="text"
                  value={rpc.largeImageText || ""}
                  onChange={(e) => setRpc({ ...rpc, largeImageText: e.target.value })}
                  placeholder="e.g. Level 100"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Small Image URL</label>
                <input
                  type="text"
                  value={rpc.smallImage || ""}
                  onChange={(e) => setRpc({ ...rpc, smallImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Small Image Hover Text</label>
                <input
                  type="text"
                  value={rpc.smallImageText || ""}
                  onChange={(e) => setRpc({ ...rpc, smallImageText: e.target.value })}
                  placeholder="e.g. Verified Badge"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Interactive Buttons */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-white">Profile Buttons (Up to 2)</h2>
            <div className="space-y-4">
              <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/60 space-y-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Button 1</span>
                <input
                  type="text"
                  value={rpc.button1Label || ""}
                  onChange={(e) => setRpc({ ...rpc, button1Label: e.target.value })}
                  placeholder="Button 1 Label (e.g. Visit Bio)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-600"
                />
                <input
                  type="text"
                  value={rpc.button1Url || ""}
                  onChange={(e) => setRpc({ ...rpc, button1Url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-600"
                />
              </div>

              <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/60 space-y-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Button 2</span>
                <input
                  type="text"
                  value={rpc.button2Label || ""}
                  onChange={(e) => setRpc({ ...rpc, button2Label: e.target.value })}
                  placeholder="Button 2 Label (e.g. Join Discord)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-600"
                />
                <input
                  type="text"
                  value={rpc.button2Url || ""}
                  onChange={(e) => setRpc({ ...rpc, button2Url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Discord Client Preview */}
        <div className="space-y-4 xl:sticky xl:top-8">
          <div className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            Live Discord Profile Preview
          </div>

          <div className="bg-[#1e1f22] rounded-2xl shadow-2xl overflow-hidden border border-[#111214]">
            {/* Header */}
            <div className="bg-[#111214] px-5 py-3.5 flex items-center justify-between border-b border-[#2b2d31]">
              <div className="text-[#949ba4] font-bold text-xs uppercase tracking-wider">
                PLAYING A GAME
              </div>
              <span className="text-[11px] text-zinc-500">via PixelsRPC</span>
            </div>

            {/* Content Body */}
            <div className="p-5 flex gap-4">
              {/* Asset Images */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[#2b2d31] overflow-hidden flex items-center justify-center border border-white/5">
                  {rpc.largeImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={rpc.largeImage}
                      alt="Large asset"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-zinc-600 font-bold text-xs">NO ASSET</div>
                  )}
                </div>

                {rpc.smallImage && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1e1f22] p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#2b2d31] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rpc.smallImage}
                        alt="Small asset"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Fields */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-white font-bold text-base truncate">
                  {rpc.appName || "Pixel.gg"}
                </h3>
                {rpc.details && (
                  <p className="text-[#dbdee1] text-sm truncate font-medium">
                    {rpc.details}
                  </p>
                )}
                {rpc.state && (
                  <p className="text-[#949ba4] text-xs truncate mt-0.5">
                    {rpc.state}
                  </p>
                )}
                <p className="text-[#949ba4] text-xs truncate mt-1">
                  01:23:45 elapsed
                </p>
              </div>
            </div>

            {/* Buttons */}
            {(rpc.button1Label || rpc.button2Label) && (
              <div className="px-5 pb-5 space-y-2">
                {rpc.button1Label && (
                  <a
                    href={rpc.button1Url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-sm font-semibold text-center rounded-lg transition-colors block border border-white/5"
                  >
                    {rpc.button1Label}
                  </a>
                )}
                {rpc.button2Label && (
                  <a
                    href={rpc.button2Url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-sm font-semibold text-center rounded-lg transition-colors block border border-white/5"
                  >
                    {rpc.button2Label}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
