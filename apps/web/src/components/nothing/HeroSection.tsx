"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Terminal, Activity, ShieldCheck, Disc3, ExternalLink } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export const HeroSection: React.FC = () => {
  const [handle, setHandle] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (cleanHandle) {
      router.push(`/register?claim=${encodeURIComponent(cleanHandle)}`);
    } else {
      router.push("/register");
    }
  };

  return (
    <section className="relative w-full pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden nt-dot-grid border-b border-[#1a1a1a]">
      {/* Background Decorative Technical Crosshairs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-8 left-8 text-neutral-700 font-mono text-xs select-none pointer-events-none hidden md:block"
      >
        + SYS.01 // LAT 37.7749° N
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute top-8 right-8 text-neutral-700 font-mono text-xs select-none pointer-events-none hidden md:block"
      >
        + SPEC.NOTHING_OS // VER 2.4
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Editorial Headline & Handle Claim */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7 space-y-6 text-left"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#2a2a2a] text-xs font-mono text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] animate-pulse" />
            <span>NOTHING-INSPIRED DIGITAL IDENTITY (01)</span>
          </motion.div>

          {/* Heading */}
          <motion.div variants={itemVariants} className="space-y-1">
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.05]">
              PURIFIED <br />
              <span className="font-mono font-light text-neutral-400">DIGITAL</span> IDENTITY.
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="text-base sm:text-lg text-neutral-400 font-sans max-w-xl leading-relaxed">
            A radical departure from bloated link-in-bio widgets. Built with monochromatic discipline, dot-matrix typography, and native Discord Rich Presence streaming.
          </motion.p>

          {/* Claim Handle Bar or Authenticated Profile Shortcut */}
          {user ? (
            <motion.div variants={itemVariants} className="pt-2 max-w-md space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#262626]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono text-neutral-400">ACTIVE PROFILE:</span>
                  <span className="text-xs font-mono font-bold text-white">pixel.gg/{user.username}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="solid-white"
                  href="/account"
                  className="text-xs px-5 py-2.5 rounded-lg flex-1 justify-center"
                  icon={<ArrowRight size={13} />}
                >
                  OPEN STUDIO
                </Button>
                <Button
                  variant="outline"
                  href={`/${user.username}`}
                  className="text-xs px-5 py-2.5 rounded-lg flex-1 justify-center"
                  icon={<ExternalLink size={13} />}
                >
                  VIEW PROFILE
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form variants={itemVariants} onSubmit={handleClaim} className="pt-2 max-w-md">
              <div className="flex items-center bg-[#101010] border border-[#282828] hover:border-[#404040] focus-within:border-white rounded-lg p-1.5 transition-all shadow-xl">
                <span className="px-3 text-xs sm:text-sm font-mono text-neutral-500 select-none">
                  pixel.gg/
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="username"
                  className="bg-transparent flex-1 text-white font-mono text-sm placeholder:text-neutral-600 focus:outline-none min-w-0"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black px-4 py-2 rounded-md font-mono text-xs font-medium tracking-tight flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  CLAIM <ArrowRight size={13} />
                </motion.button>
              </div>
              <p className="mt-2 text-[11px] font-mono text-neutral-500 flex items-center gap-2">
                <ShieldCheck size={12} className="text-neutral-400" /> Free permanent URL &bull; Instant activation
              </p>
            </motion.form>
          )}

          {/* Fast Navigation Shortcuts */}
          <motion.div variants={itemVariants} className="pt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/leaderboard")}
              className="font-mono text-xs px-3 py-1.5"
            >
              EXPLORE DIRECTORY ↗
            </Button>
            <Button
              variant="surface"
              onClick={() => router.push("/pricing")}
              className="font-mono text-xs px-3 py-1.5 text-neutral-400 hover:text-white"
            >
              TIERS & COMPARISON
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/carl")}
              className="font-mono text-xs px-3 py-1.5 text-neutral-500 hover:text-white"
            >
              VIEW LIVE DEMO →
            </Button>
          </motion.div>
        </motion.div>

        {/* Right Column: Industrial Phone Frame Showcase with Motion */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            whileHover={{ y: -6, transition: { duration: 0.3, ease: "easeOut" } }}
            className="relative w-full max-w-[340px] sm:max-w-[360px] bg-[#0c0c0c] border-2 border-[#2b2b2b] rounded-[36px] p-4 shadow-2xl shadow-black/80 nt-crosshair"
          >
            {/* Phone Screen Bezel */}
            <div className="relative bg-[#050505] border border-[#1f1f1f] rounded-[28px] p-5 overflow-hidden text-center space-y-5">
              {/* Phone Camera Notch & Status Header */}
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pb-2 border-b border-[#141414]">
                <span>12:04</span>
                <div className="w-12 h-3.5 bg-black rounded-full border border-[#222222]" />
                <span>100% ⚡</span>
              </div>

              {/* Profile Avatar with Industrial Lens */}
              <div className="relative mx-auto w-20 h-20 rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent border border-white/20">
                <div className="w-full h-full rounded-full bg-[#141414] flex items-center justify-center font-mono font-bold text-2xl text-white border border-[#262626]">
                  Ø
                </div>
                {/* Live Status LED */}
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-black flex items-center justify-center border border-[#333333]">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]"
                  />
                </div>
              </div>

              {/* Name & Bio */}
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-mono tracking-tight text-white flex items-center justify-center gap-1.5">
                  CARL_PEI
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-black font-semibold">
                    ✓
                  </span>
                </h3>
                <p className="text-xs font-mono text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Design lead // creating pure hardware & software harmony.
                </p>
              </div>

              {/* Discord Presence Hardware Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-3 text-left space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Activity size={10} className="text-white" /> DISCORD RPC
                  </span>
                  <span className="text-neutral-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE SYNC
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xs text-white">
                    NOT
                  </div>
                  <div className="text-xs font-mono truncate">
                    <p className="text-white font-medium truncate">Playing Nothing OS (2.5)</p>
                    <p className="text-neutral-500 text-[11px] truncate">Designing Glyphs</p>
                  </div>
                </div>
              </motion.div>

              {/* Profile Action Buttons */}
              <div className="space-y-2">
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="w-full py-2.5 px-3 rounded-lg bg-white text-black font-mono text-xs font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span>DISCORD COMMUNITY</span>
                  <span>↗</span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-white border border-[#262626] font-mono text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>GITHUB REPO</span>
                  <span>↗</span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-white border border-[#262626] font-mono text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>SPOTIFY PLAYLIST</span>
                  <span>↗</span>
                </motion.div>
              </div>

              {/* Bottom Metric */}
              <div className="pt-2 text-[10px] font-mono text-neutral-600 flex items-center justify-between">
                <span>[ DEMO SPECIMEN ]</span>
                <span>PIXEL.GG (01)</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
