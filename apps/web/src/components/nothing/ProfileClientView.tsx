"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Disc,
  Activity,
  Eye,
  Share2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileButton {
  id: string;
  url: string;
  title: string;
  subtitle?: string | null;
  openInNewTab?: boolean;
  order: number;
  gradient?: string | null;
}

interface ProfileLink {
  id: string;
  url: string;
  label: string;
  visibility: boolean;
  order: number;
}

interface ProfileClientProps {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  bannerUrl?: string | null;
  accentColor?: string | null;
  blur?: number;
  opacity?: number;
  roundedCorners?: number;
  views: number;
  buttons: ProfileButton[];
  links: ProfileLink[];
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  discordPresence?: {
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null;
}

export const ProfileClientView: React.FC<ProfileClientProps> = ({
  username,
  displayName,
  bio,
  avatarUrl,
  bannerUrl,
  accentColor = "#ffffff",
  blur = 0,
  opacity = 90,
  roundedCorners = 20,
  views,
  buttons = [],
  links = [],
  musicUrl,
  musicTitle = "Nothing Soundscape (01)",
  musicArtist = "Ambient Audio",
  discordPresence,
}) => {
  const [entered, setEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Progress & Loop handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
    };
  }, []);

  const handleEnterScreen = () => {
    setEntered(true);
    if (musicUrl && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Browser policy fallback
        });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPct = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = newPct * audioRef.current.duration;
    setProgress(newPct * 100);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-mono relative overflow-hidden flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Hidden Audio Element */}
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop
          preload="auto"
        />
      )}

      {/* Intro Barrier (Click to Enter) with AnimatePresence */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="intro-barrier"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={handleEnterScreen}
            className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center cursor-pointer nt-dot-grid p-6 text-center select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-4 max-w-sm"
            >
              <div className="w-12 h-12 rounded-full border border-neutral-700 bg-[#101010] flex items-center justify-center mx-auto text-white shadow-lg">
                <Disc size={20} className="animate-spin" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                  [ INITIALIZE DIGITAL IDENTITY ]
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  @{username}
                </h2>
              </div>

              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-xs text-neutral-400 font-sans tracking-wide"
              >
                [ CLICK ANYWHERE TO INITIALIZE AUDIO & PROFILE ]
              </motion.p>

              <div className="pt-4 text-[10px] text-neutral-600">
                AUDIO STREAM &bull; NOTHING OS ENGINE
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Profile Layout */}
      <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8 nt-dot-grid">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-xl bg-[#0c0c0c] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative nt-crosshair transition-all"
          style={{
            backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
            borderRadius: `${roundedCorners || 24}px`,
          }}
        >
          {/* Top Status & Controls Bar */}
          <div className="flex items-center justify-between text-[11px] pb-4 border-b border-[#1c1c1c] text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white font-semibold">PIXEL.GG // {username.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy profile link"
              >
                <Share2 size={13} />
                <span>{copied ? "COPIED" : "SHARE"}</span>
              </motion.button>

              <div className="flex items-center gap-1 text-neutral-500">
                <Eye size={13} />
                <span>{(views || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Profile Identity Card Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with Industrial Lens */}
            <div className="relative shrink-0">
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="w-24 h-24 rounded-2xl bg-[#141414] border-2 border-white/40 overflow-hidden flex items-center justify-center text-3xl font-bold text-white shadow-xl"
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt={displayName || username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(displayName || username).charAt(0).toUpperCase()}</span>
                )}
              </motion.div>
              {/* Online Glyph Status LED */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black flex items-center justify-center border border-[#333333]">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              </div>
            </div>

            {/* Name, Tag & Bio */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white truncate">
                  {displayName || username}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-bold">
                  VERIFIED ✓
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-mono">@{username}</p>
              {bio && (
                <p className="text-xs text-neutral-300 font-sans leading-relaxed pt-1">
                  {bio}
                </p>
              )}
            </div>
          </div>

          {/* Discord Rich Presence Hardware Tile */}
          {discordPresence && (discordPresence.appName || discordPresence.details) && (
            <motion.div
              whileHover={{ y: -2, borderColor: "#3a3a3a" }}
              transition={{ duration: 0.2 }}
              className="bg-[#111111] border border-[#242424] rounded-2xl p-4 text-left space-y-2.5 font-mono cursor-default"
            >
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <Activity size={12} className="text-white" /> DISCORD RICH PRESENCE
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE TELEMETRY
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden">
                  {discordPresence.largeImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={discordPresence.largeImage}
                      alt="Presence"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>RPC</span>
                  )}
                </div>

                <div className="min-w-0 text-xs truncate">
                  <p className="text-white font-semibold truncate">
                    {discordPresence.appName || "Pixel.gg Activity"}
                  </p>
                  {discordPresence.details && (
                    <p className="text-neutral-400 text-[11px] truncate">
                      {discordPresence.details}
                    </p>
                  )}
                  {discordPresence.state && (
                    <p className="text-neutral-500 text-[10px] truncate">
                      {discordPresence.state}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Interactive Audio Player Dock with Waveform Motion */}
          {musicUrl && (
            <div className="bg-[#101010] border border-[#242424] rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors shrink-0 cursor-pointer"
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                  </motion.button>
                  <div className="truncate">
                    <p className="text-white font-medium text-xs truncate flex items-center gap-1.5">
                      {musicTitle}
                      {/* Audio Visualizer Bars */}
                      {isPlaying && (
                        <span className="flex items-end gap-0.5 h-3">
                          <motion.span
                            animate={{ height: ["4px", "12px", "6px", "10px", "4px"] }}
                            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                            className="w-0.5 bg-white rounded-full inline-block"
                          />
                          <motion.span
                            animate={{ height: ["8px", "4px", "14px", "6px", "8px"] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                            className="w-0.5 bg-white rounded-full inline-block"
                          />
                          <motion.span
                            animate={{ height: ["6px", "14px", "4px", "12px", "6px"] }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="w-0.5 bg-white rounded-full inline-block"
                          />
                        </span>
                      )}
                    </p>
                    <p className="text-neutral-500 text-[10px] truncate">{musicArtist}</p>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                  <button onClick={toggleMute} className="hover:text-white transition-colors cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 accent-white h-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Progress Scrubbing Bar */}
              <div
                onClick={handleScrub}
                className="w-full h-1.5 bg-[#202020] rounded-full overflow-hidden cursor-pointer relative"
              >
                <div
                  className="h-full bg-white transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons Collection with Micro-interactions */}
          {buttons && buttons.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {buttons
                .sort((a, b) => a.order - b.order)
                .map((btn) => (
                  <motion.a
                    key={btn.id}
                    href={btn.url}
                    target={btn.openInNewTab ? "_blank" : "_self"}
                    rel="noreferrer"
                    whileHover={{ y: -2, scale: 1.008 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold flex items-center justify-between bg-white text-black border border-white group"
                    style={
                      btn.gradient
                        ? { background: btn.gradient, color: "#ffffff" }
                        : undefined
                    }
                  >
                    <div className="text-left truncate">
                      <p className="truncate">{btn.title}</p>
                      {btn.subtitle && (
                        <p className="text-[10px] opacity-70 font-sans font-normal truncate">
                          {btn.subtitle}
                        </p>
                      )}
                    </div>
                    <ExternalLink size={14} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </motion.a>
                ))}
            </div>
          )}

          {/* Social Links Row */}
          {links && links.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {links
                .filter((l) => l.visibility)
                .sort((a, b) => a.order - b.order)
                .map((link) => (
                  <motion.a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ y: -2, borderColor: "#555" }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="px-3.5 py-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#242424] text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink size={12} className="text-neutral-500" />
                  </motion.a>
                ))}
            </div>
          )}

          {/* Profile Branding Footer */}
          <div className="pt-4 border-t border-[#1c1c1c] text-center text-[10px] text-neutral-600 font-mono">
            POWERED BY{" "}
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors font-bold">
              PIXEL.GG (01)
            </Link>{" "}
            &bull; NOTHING OS ARCHITECTURE
          </div>
        </motion.div>
      </div>

      {/* Global Minimalist Footer Bar */}
      <div className="w-full py-3 px-6 border-t border-[#141414] text-[10px] text-neutral-600 flex items-center justify-between font-mono">
        <span>IDENTITY SPEC // NOT-BIO-PX1</span>
        <Link href="/register" className="text-neutral-400 hover:text-white transition-colors">
          CLAIM YOUR OWN PROFILE ↗
        </Link>
      </div>
    </div>
  );
};
