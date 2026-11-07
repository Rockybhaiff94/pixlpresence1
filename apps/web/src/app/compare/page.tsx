"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, X, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

interface CompetitorData {
  id: string;
  name: string;
  badge: string;
  pricingModel: string;
  monthlyCost: string;
  yearlyCost: string;
  lifetimeCost: string;
  rpcIntegration: boolean;
  audioPlayer: boolean;
  monochromaticDesign: boolean;
  zeroCookieTracking: boolean;
  customCode: boolean;
  customSubdomains: boolean;
  description: string;
}

const competitors: CompetitorData[] = [
  {
    id: "linktree",
    name: "LINKTREE",
    badge: "MAINSTREAM BIO",
    pricingModel: "Recurring Monthly / Annual Subscription",
    monthlyCost: "$5 - $24 / mo",
    yearlyCost: "$60 - $288 / yr",
    lifetimeCost: "No Lifetime ($600+ over 5 yrs)",
    rpcIntegration: false,
    audioPlayer: false,
    monochromaticDesign: false,
    zeroCookieTracking: false,
    customCode: false,
    customSubdomains: true,
    description: "Generic link stack with heavy third-party trackers, aggressive paywalls on simple styling, and zero Discord Rich Presence integration.",
  },
  {
    id: "beacons",
    name: "BEACONS.AI",
    badge: "CREATOR COMMERCE",
    pricingModel: "Monthly SaaS Tier + 9% Transaction Fee",
    monthlyCost: "$10 - $30 / mo",
    yearlyCost: "$120 - $360 / yr",
    lifetimeCost: "No Lifetime ($1,000+ over 5 yrs)",
    rpcIntegration: false,
    audioPlayer: false,
    monochromaticDesign: false,
    zeroCookieTracking: false,
    customCode: false,
    customSubdomains: true,
    description: "Commerce-heavy platform focused on monetization funnels and newsletters. Lacks gamer aesthetic, audio playback engines, and Discord RPC.",
  },
  {
    id: "carrd",
    name: "CARRD",
    badge: "ONE-PAGE BUILDER",
    pricingModel: "Annual Pro Tier ($9 - $49 / yr)",
    monthlyCost: "$1 - $4 / mo",
    yearlyCost: "$19 / yr",
    lifetimeCost: "No Lifetime",
    rpcIntegration: false,
    audioPlayer: true,
    monochromaticDesign: true,
    zeroCookieTracking: false,
    customCode: true,
    customSubdomains: true,
    description: "Flexible responsive landing page builder. However, it lacks dedicated profile bio discovery, creator leaderboards, and Discord rich presence streaming.",
  },
  {
    id: "guns",
    name: "GUNS.LOL",
    badge: "BIO & FILE HOSTING",
    pricingModel: "One-Time Lifetime Plan (7.99€)",
    monthlyCost: "0€",
    yearlyCost: "0€",
    lifetimeCost: "7,99€",
    rpcIntegration: false,
    audioPlayer: true,
    monochromaticDesign: false,
    zeroCookieTracking: true,
    customCode: false,
    customSubdomains: true,
    description: "Popular aesthetic bio platform with cyber/glow themes, but lacks native Vencord Rich Presence support and relies on purple neon glassmorphism.",
  },
];

export default function ComparePage() {
  const [selectedComp, setSelectedComp] = useState<CompetitorData>(competitors[0]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="space-y-3 text-left border-b border-[#1c1c1c] pb-8">
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              [ BENCHMARK // COMPETITIVE MATRIX ]
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              HOW PIXEL.GG COMPARES.
            </h1>
            <p className="text-sm text-neutral-400 font-sans max-w-2xl leading-relaxed">
              Why settle for generic monthly SaaS subscriptions or bloatware? See how our Nothing-inspired architecture and native Discord Rich Presence outperform the alternatives.
            </p>
          </div>

          {/* Competitor Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {competitors.map((comp) => {
              const isSelected = selectedComp.id === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedComp(comp)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-black border-white shadow-xl"
                      : "bg-[#0c0c0c] text-neutral-400 border-[#222222] hover:text-white hover:border-[#383838]"
                  }`}
                >
                  <span className="text-[10px] block opacity-70 mb-1">{comp.badge}</span>
                  <span className="font-bold text-sm block">{comp.name}</span>
                </button>
              );
            })}
          </div>

          {/* Side-by-Side Detailed Card */}
          <div className="bg-[#0b0b0b] border border-[#222222] rounded-2xl p-6 sm:p-10 nt-crosshair">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Pixel.gg Side */}
              <div className="bg-[#121212] border-2 border-white rounded-xl p-6 space-y-6 text-white">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white text-black text-[10px] font-bold">
                    RECOMMENDED
                  </div>
                  <h3 className="text-2xl font-bold">PIXEL.GG</h3>
                  <p className="text-xs text-neutral-400 font-sans">
                    Nothing OS industrial minimalism + native Discord Rich Presence.
                  </p>
                </div>

                <div className="space-y-3 py-3 border-y border-[#262626] text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">PRICING:</span>
                    <span className="font-bold">7,99€ One-Time Lifetime</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">DISCORD RPC:</span>
                    <span className="font-bold flex items-center gap-1">
                      <Check size={14} className="text-white" /> Native Vencord Plugin
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">AUDIO PLAYER:</span>
                    <span className="font-bold flex items-center gap-1">
                      <Check size={14} className="text-white" /> Hardware Scrubbing
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">DESIGN SYSTEM:</span>
                    <span className="font-bold">Nothing OS Monochromatic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">TRACKING COOKIES:</span>
                    <span className="font-bold text-white">0% (Zero Cookies)</span>
                  </div>
                </div>

                <Button variant="solid-white" href="/register" className="w-full justify-center text-xs">
                  CLAIM YOUR HANDLE NOW
                </Button>
              </div>

              {/* Selected Competitor Side */}
              <div className="bg-[#0e0e0e] border border-[#222222] rounded-xl p-6 space-y-6 text-neutral-300">
                <div className="space-y-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-neutral-400">
                    {selectedComp.badge}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{selectedComp.name}</h3>
                  <p className="text-xs text-neutral-500 font-sans">{selectedComp.description}</p>
                </div>

                <div className="space-y-3 py-3 border-y border-[#1c1c1c] text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">PRICING:</span>
                    <span className="text-white">{selectedComp.monthlyCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">5-YEAR COST:</span>
                    <span className="text-[#d71920] font-bold">{selectedComp.lifetimeCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DISCORD RPC:</span>
                    <span className="flex items-center gap-1 text-neutral-500">
                      <X size={14} /> Not Supported
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">AUDIO PLAYER:</span>
                    <span>{selectedComp.audioPlayer ? "Basic Link" : "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">AESTHETIC:</span>
                    <span>Standard Template</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-[11px] text-neutral-400 font-sans leading-relaxed">
                  💡 By switching to Pixel.gg, you save an estimated{" "}
                  <strong className="text-white">€300 - €800</strong> over 3 years while gaining native Discord status streaming and superior industrial typography.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

