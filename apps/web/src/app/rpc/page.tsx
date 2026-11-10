"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Tv,
  Play,
  Headphones,
  Eye,
  Trophy,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  Flame,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

export default function PixelsRpcPublicPage() {
  const [activeTab, setActiveTab] = useState<"streaming" | "playing" | "listening" | "watching" | "competing">("streaming");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const installCommand = "irm https://pixlpresence1-web.vercel.app/install.ps1 | iex";

  const handleCopyCommand = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(installCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2200);
    }
  };

  const PRESETS = {
    streaming: {
      typeLabel: "STREAMING ON TWITCH",
      badgeColor: "bg-purple-500",
      badgeBorder: "border-purple-500/30",
      badgeText: "text-purple-300",
      appName: "Pixel.gg",
      details: "Streaming creative coding & music",
      state: "Discover my personal page on PIXEL.GG.",
      largeText: "Live Streamer",
      smallText: "PIXEL.GG Verified",
      largeImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
      streamUrl: "https://twitch.tv/pixelgg",
    },
    playing: {
      typeLabel: "PLAYING A GAME",
      badgeColor: "bg-green-500",
      badgeBorder: "border-green-500/30",
      badgeText: "text-green-300",
      appName: "Cyberpunk 2077",
      details: "Night City Exploration",
      state: "Discover my personal page on PIXEL.GG.",
      largeText: "In-Game V",
      smallText: "PIXEL.GG Verified",
      largeImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
      streamUrl: null,
    },
    listening: {
      typeLabel: "LISTENING TO SPOTIFY",
      badgeColor: "bg-emerald-500",
      badgeBorder: "border-emerald-500/30",
      badgeText: "text-emerald-300",
      appName: "Synthwave After Dark",
      details: "Kavinsky - Nightcall",
      state: "Discover my personal page on PIXEL.GG.",
      largeText: "OutRun Album",
      smallText: "PIXEL.GG Audio",
      largeImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
      streamUrl: null,
    },
    watching: {
      typeLabel: "WATCHING YOUTUBE",
      badgeColor: "bg-red-500",
      badgeBorder: "border-red-500/30",
      badgeText: "text-red-300",
      appName: "YouTube Live",
      details: "Lo-Fi Beats to Relax / Study to",
      state: "Discover my personal page on PIXEL.GG.",
      largeText: "ChilledCow Broadcast",
      smallText: "PIXEL.GG Video",
      largeImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
      streamUrl: null,
    },
    competing: {
      typeLabel: "COMPETING IN",
      badgeColor: "bg-amber-500",
      badgeBorder: "border-amber-500/30",
      badgeText: "text-amber-300",
      appName: "Valorant Champions Tour",
      details: "Grand Finals - Map 3",
      state: "Discover my personal page on PIXEL.GG.",
      largeText: "Radiant Division",
      smallText: "PIXEL.GG Arena",
      largeImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
      streamUrl: null,
    },
  };

  const currentPreset = PRESETS[activeTab];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-20 overflow-hidden border-b border-[#1a1a1a]">
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-[#242424] text-[11px] text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="tracking-widest uppercase">PIXEL.GG / DISCORD RICH PRESENCE ENGINE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight font-sans">
                DISCORD PRESENCE. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-600">
                  REDEFINED & ELEVATED.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans max-w-2xl">
                Broadcast your verified personal page, customizable Rich Presence status, animated GIF artwork, and interactive Discord action buttons. Zero background battery drain. Zero standalone desktop bloat.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Link href="/register">
                  <Button className="px-6 py-3 bg-white text-black font-bold text-xs hover:bg-neutral-200 flex items-center gap-2">
                    <Sparkles size={14} /> GET PIXELSRPC FREE
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="px-6 py-3 text-xs flex items-center gap-2">
                    SIGN IN TO DASHBOARD <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>

              {/* One-Click PowerShell Installer Box */}
              <div className="w-full max-w-2xl mt-8 p-4 rounded-xl bg-[#0c0c0c] border border-[#222] text-left">
                <div className="flex items-center justify-between pb-2 border-b border-[#1c1c1c] text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <Terminal size={13} className="text-red-500" /> ONE-CLICK WINDOWS POWERSHELL INSTALLER
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">AUTOMATED VENCORD BUILD</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#050505] border border-[#1a1a1a]">
                  <code className="text-xs text-neutral-300 font-mono overflow-x-auto whitespace-nowrap">
                    {installCommand}
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    className="p-1.5 rounded-md bg-[#181818] hover:bg-[#252525] text-white transition-colors shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 mt-2">
                  Paste into Windows PowerShell. PixelsRPC will compile and install into Discord automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SIMULATOR SECTION */}
        <section className="py-20 border-b border-[#1a1a1a] bg-[#080808]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">LIVE DISCORD SIMULATOR</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                EXPERIENCE THE 5 ACTIVITY TYPES.
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                Toggle through supported Discord activity modes and see how your profile card renders live in Discord.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              {[
                { id: "streaming", label: "Streaming", icon: Tv, badge: "Type 1" },
                { id: "playing", label: "Playing", icon: Play, badge: "Type 0" },
                { id: "listening", label: "Listening", icon: Headphones, badge: "Type 2" },
                { id: "watching", label: "Watching", icon: Eye, badge: "Type 3" },
                { id: "competing", label: "Competing", icon: Trophy, badge: "Type 5" },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
                      isActive
                        ? "bg-white text-black border-white font-bold shadow-lg shadow-white/5"
                        : "bg-[#111] text-neutral-400 border-[#222] hover:border-neutral-600 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? "bg-black/10 text-black" : "bg-[#1c1c1c] text-neutral-500"}`}>
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Discord Profile Card Preview Container */}
            <div className="max-w-md mx-auto">
              <div className="rounded-2xl bg-[#1e1f22] border border-[#2b2d31] shadow-2xl overflow-hidden font-sans">
                {/* Dynamic Status Header */}
                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                  activeTab === "streaming" ? "bg-[#1c1328] border-purple-900/40 text-purple-300" : "bg-[#111214] border-[#2b2d31] text-[#949ba4]"
                }`}>
                  <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 font-mono">
                    <span className={`w-2 h-2 rounded-full ${currentPreset.badgeColor} animate-pulse`} />
                    {currentPreset.typeLabel}
                  </span>
                  <span className="text-[10px] text-[#80848e] font-mono">PIXEL.GG ENGINE</span>
                </div>

                {/* Profile Card Body */}
                <div className="p-4 space-y-4">
                  <div className="flex gap-4 items-start">
                    {/* Large Image with Small Icon Badge */}
                    <div className="relative shrink-0 w-20 h-20 rounded-2xl bg-[#2b2d31] overflow-hidden border border-[#35373c] shadow-md">
                      <img
                        src={currentPreset.largeImage}
                        alt="Activity Asset"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1e1f22] p-0.5 border-2 border-[#1e1f22]">
                        <img
                          src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png"
                          alt="Small icon"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-white font-bold text-sm tracking-wide leading-tight truncate">
                        {currentPreset.appName}
                      </h4>
                      <p className="text-xs text-[#dbdee1] leading-tight truncate">
                        {currentPreset.details}
                      </p>
                      <p className="text-xs text-[#949ba4] leading-tight truncate">
                        {currentPreset.state}
                      </p>
                      <p className="text-[11px] text-[#949ba4] pt-1 font-mono">
                        01:42:19 elapsed
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#2b2d31] space-y-2">
                    <button className="w-full py-2 px-3 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                      <Globe size={13} className="text-neutral-400" />
                      <span>View Profile</span>
                      <ExternalLink size={11} className="text-neutral-500 ml-auto" />
                    </button>
                    <button className="w-full py-2 px-3 rounded-lg bg-[#4e5058]/30 hover:bg-[#4e5058]/50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#4e5058]/30 shadow-sm">
                      <Sparkles size={13} className="text-purple-400" />
                      <span>Get PixelsRPC</span>
                      <ExternalLink size={11} className="text-neutral-500 ml-auto" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[#0c0c0c] border border-[#1f1f1f] text-center text-[11px] text-neutral-400 font-mono">
                Discord Rich Presence synced natively via Vencord FluxDispatcher.
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-20 border-b border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
              <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">CORE CAPABILITIES</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans">
                ENGINEERED FOR SUPREME PERFORMANCE.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: ImageIcon,
                  title: "Custom Image & Animated GIF Uploads",
                  desc: "Upload custom PNG, JPG, WEBP, and animated GIFs up to 5MB. Use our interactive editor to crop, zoom in/out, and reposition your artwork.",
                },
                {
                  icon: Tv,
                  title: "5 Native Discord Activity Types",
                  desc: "Full support for Streaming (with Twitch/YouTube live broadcast badge), Playing, Listening to Spotify, Watching, and Competing in Tournaments.",
                },
                {
                  icon: Globe,
                  title: "Dynamic Public Profile Linking",
                  desc: "Button 1 dynamically redirects friends and visitors to your verified Pixels.gg public profile page without login gates.",
                },
                {
                  icon: Zap,
                  title: "Zero Desktop Background Daemons",
                  desc: "Built directly into Discord via a lightweight Vencord userplugin. No bulky Electron apps, Python processes, or high CPU usage.",
                },
                {
                  icon: ShieldCheck,
                  title: "Roblox-Style Quick Device Linking",
                  desc: "Link your Discord client in seconds with a temporary 8-character cryptographic device code. Zero passwords or sensitive tokens exposed.",
                },
                {
                  icon: Flame,
                  title: "Live WebSocket Real-Time Dispatch",
                  desc: "Edits made on your web dashboard instantly update your Discord presence in real time via Socket.io without restarting Discord.",
                },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#1e1e1e] hover:border-neutral-700 transition-colors space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-white">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-white font-sans">{feat.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed font-sans">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-20 relative overflow-hidden bg-[#070707]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-sans">
              READY TO CUSTOMIZE YOUR PRESENCE?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl mx-auto leading-relaxed">
              Join thousands of creators, gamers, and developers broadcasting their custom profiles directly into Discord.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/register">
                <Button className="px-6 py-3 bg-white text-black font-bold text-xs hover:bg-neutral-200">
                  CREATE FREE ACCOUNT
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="px-6 py-3 text-xs">
                  SIGN IN
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
