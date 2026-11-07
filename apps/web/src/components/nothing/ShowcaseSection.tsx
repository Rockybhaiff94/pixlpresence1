"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Disc, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";

interface StylePreset {
  id: string;
  name: string;
  category: string;
  tagline: string;
  accent: string;
  background: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  demoUsername: string;
  demoDisplayName: string;
  demoBio: string;
  demoActivity: string;
}

const presets: StylePreset[] = [
  {
    id: "nothing-monochrome",
    name: "01 // MONOCHROME",
    category: "INDUSTRIAL",
    tagline: "Pure black canvas with stark white contrast and dot-matrix labels.",
    accent: "#ffffff",
    background: "#050505",
    cardBg: "rgba(18, 18, 18, 0.9)",
    cardBorder: "1px solid #333333",
    textColor: "#ffffff",
    demoUsername: "carl_pei",
    demoDisplayName: "Carl Pei",
    demoBio: "CEO Nothing // Pure industrial design, stripped to raw essentials.",
    demoActivity: "Designing Glyph Matrix (v2.5)",
  },
  {
    id: "dark-matrix",
    name: "02 // DOT MATRIX",
    category: "TELEMETRY",
    tagline: "Dense dot grid background with monospaced data telemetry feeds.",
    accent: "#d71920",
    background: "#080808",
    cardBg: "rgba(14, 14, 14, 0.85)",
    cardBorder: "1px solid #282828",
    textColor: "#ededed",
    demoUsername: "glyph_engineer",
    demoDisplayName: "SYSTEM_CORE",
    demoBio: "Hardware Engineer // Firmware optimization and hardware diagnostics.",
    demoActivity: "Flashing Kernel 6.1.48",
  },
  {
    id: "editorial-white",
    name: "03 // INVERSE LIGHT",
    category: "EDITORIAL",
    tagline: "Stark off-white layout with high-contrast typography.",
    accent: "#000000",
    background: "#0d0d0d",
    cardBg: "rgba(240, 240, 240, 0.95)",
    cardBorder: "1px solid #ffffff",
    textColor: "#000000",
    demoUsername: "art_director",
    demoDisplayName: "Art Director",
    demoBio: "Minimalist publication designer. Monospace typography advocate.",
    demoActivity: "Curating Typography Catalog",
  },
  {
    id: "cyber-stealth",
    name: "04 // STEALTH GLYPH",
    category: "MINIMALIST",
    tagline: "Deep charcoal tones with subtle glassmorphism blur and white LEDs.",
    accent: "#888888",
    background: "#000000",
    cardBg: "rgba(20, 20, 20, 0.6)",
    cardBorder: "1px solid rgba(255, 255, 255, 0.15)",
    textColor: "#ffffff",
    demoUsername: "stealth_dev",
    demoDisplayName: "Void",
    demoBio: "Full-stack cryptography and distributed systems researcher.",
    demoActivity: "Writing Rust Crates",
  },
];

export const ShowcaseSection: React.FC = () => {
  const [activePreset, setActivePreset] = useState<StylePreset>(presets[0]);

  return (
    <section id="showcase" className="w-full bg-[#050505] py-20 px-4 sm:px-6 border-b border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              [ 02 // PROFILE TEMPLATES & ARCHETYPES ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-mono">
              ENGINEERED PRESETS.
            </h2>
            <p className="text-sm text-neutral-400 font-mono max-w-lg">
              Explore dynamic archetypes designed with Nothing OS proportions and high-contrast monochromatic typography.
            </p>
          </div>
          <Button variant="outline" href="/dashboard/templates" className="self-start md:self-auto text-xs">
            VIEW ALL TEMPLATES
          </Button>
        </div>

        {/* Preset Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {presets.map((preset) => {
            const isSelected = activePreset.id === preset.id;
            return (
              <motion.button
                key={preset.id}
                onClick={() => setActivePreset(preset)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`p-4 rounded-xl text-left border font-mono transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#141414] border-white text-white shadow-lg"
                    : "bg-[#0a0a0a] border-[#202020] text-neutral-400 hover:text-white hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] text-neutral-500 uppercase">{preset.category}</span>
                  {isSelected && (
                    <motion.span
                      layoutId="activePresetIndicator"
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]"
                    />
                  )}
                </div>
                <p className="font-semibold text-sm mb-1">{preset.name}</p>
                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                  {preset.tagline}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Interactive Live Frame Preview */}
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-6 md:p-10 nt-dot-grid relative overflow-hidden flex flex-col lg:flex-row items-center justify-around gap-10">
          {/* Preset Technical Information */}
          <div className="space-y-6 max-w-md text-left font-mono">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161616] border border-[#2c2c2c] text-xs text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d71920]" />
              ACTIVE PRESET: {activePreset.name}
            </div>

            <h3 className="text-2xl font-bold text-white tracking-tight">
              {activePreset.tagline}
            </h3>

            <div className="space-y-2 text-xs text-neutral-400">
              <p className="flex items-center justify-between py-1 border-b border-[#1f1f1f]">
                <span>BACKGROUND</span>
                <span className="text-white">{activePreset.background}</span>
              </p>
              <p className="flex items-center justify-between py-1 border-b border-[#1f1f1f]">
                <span>ACCENT</span>
                <span className="text-white">{activePreset.accent}</span>
              </p>
              <p className="flex items-center justify-between py-1 border-b border-[#1f1f1f]">
                <span>CARD BORDER</span>
                <span className="text-white">{activePreset.cardBorder}</span>
              </p>
              <p className="flex items-center justify-between py-1 border-b border-[#1f1f1f]">
                <span>AUDIO SCRUBBING</span>
                <span className="text-white">ENABLED</span>
              </p>
            </div>

            <Button variant="solid-white" href={`/register?template=${activePreset.id}`} className="text-xs w-full sm:w-auto">
              APPLY THIS TEMPLATE
            </Button>
          </div>

          {/* Interactive Profile Device Simulation with AnimatePresence */}
          <div className="w-full max-w-[340px] flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePreset.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full rounded-[28px] p-6 shadow-2xl text-center space-y-4"
                style={{
                  backgroundColor: activePreset.cardBg,
                  border: activePreset.cardBorder,
                  color: activePreset.textColor,
                }}
              >
                <div className="w-16 h-16 rounded-full mx-auto bg-neutral-800 border-2 border-current flex items-center justify-center font-mono text-xl font-bold">
                  {activePreset.demoDisplayName.charAt(0)}
                </div>

                <div className="space-y-1">
                  <h4 className="font-mono font-bold text-lg flex items-center justify-center gap-1">
                    {activePreset.demoDisplayName}
                    <span className="text-xs font-semibold px-1 rounded bg-current text-black">✓</span>
                  </h4>
                  <p className="text-xs opacity-75 font-mono">@{activePreset.demoUsername}</p>
                </div>

                <p className="text-xs opacity-80 leading-relaxed font-sans max-w-xs mx-auto">
                  {activePreset.demoBio}
                </p>

                {/* Simulated Audio Widget */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 rounded-lg bg-black/30 border border-current/20 text-left font-mono text-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Disc size={16} className="animate-spin text-current" />
                    <div className="truncate text-[11px]">
                      <p className="font-medium truncate">Nothing Soundscape (01)</p>
                      <p className="opacity-60 truncate">Ambient Audio Engine</p>
                    </div>
                  </div>
                  <Play size={14} className="text-current shrink-0" />
                </motion.div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 px-3 rounded-md bg-white text-black font-mono text-xs font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>CONNECT DISCORD</span>
                    <span>↗</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 px-3 rounded-md bg-black/40 border border-current/30 text-current font-mono text-xs font-medium flex items-center justify-between cursor-pointer"
                  >
                    <span>GITHUB REPO</span>
                    <span>↗</span>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
