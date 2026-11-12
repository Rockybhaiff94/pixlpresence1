"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, Gift, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { FaqSection } from "@/components/nothing/FaqSection";
import { FooterCta } from "@/components/nothing/FooterCta";
import { Button } from "@/components/nothing/Button";
import { useAuth } from "@/context/AuthContext";
import { openPaddleCheckout } from "@/lib/paddle";

interface FeatureRow {
  name: string;
  category: string;
  free: boolean;
  premium: boolean;
  description: string;
}

const matrix: FeatureRow[] = [
  {
    name: "Permanent Subdomain",
    category: "IDENTITY",
    free: true,
    premium: true,
    description: "Your own pixel.gg/yourname link forever.",
  },
  {
    name: "Basic Customization",
    category: "IDENTITY",
    free: true,
    premium: true,
    description: "Avatar, biography, display name, and standard theme.",
  },
  {
    name: "Social Links & Buttons",
    category: "IDENTITY",
    free: true,
    premium: true,
    description: "Link up to 10 social profiles and custom URLs.",
  },
  {
    name: "PixelsRPC Vencord Plugin",
    category: "DISCORD",
    free: true,
    premium: true,
    description: "Stream your profile status to Discord client locally.",
  },
  {
    name: "Edge View Analytics",
    category: "TELEMETRY",
    free: true,
    premium: true,
    description: "Real-time view tracking without third-party cookies.",
  },
  {
    name: "Exclusive Verified Badge",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Monochromatic verified checkmark displayed on profile.",
  },
  {
    name: "Nothing OS Industrial Themes",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Unlock all dot-matrix, stealth, and editorial archetypes.",
  },
  {
    name: "Custom Dot-Matrix & Mono Fonts",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Choose between technical fonts or upload custom web fonts.",
  },
  {
    name: "Interactive Audio Player",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Hardware disc player with progress scrubbing and volume slider.",
  },
  {
    name: "Typewriter Bio Animation",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Animate your bio description with customizable cadence.",
  },
  {
    name: "Dynamic Matrix Particle FX",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Subtle background telemetry particles and grid visualizers.",
  },
  {
    name: "Multiple Handle Aliases",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Claim additional redirect handles forwarding to your primary bio.",
  },
  {
    name: "Custom SEO Metadata & Rich Embeds",
    category: "PREMIUM",
    free: false,
    premium: true,
    description: "Customize OpenGraph title, description, and preview image card.",
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [filterCat, setFilterCat] = useState<string>("ALL");

  const handleCheckout = (type: "PREMIUM" | "BADGE") => {
    if (type === "PREMIUM") {
      openPaddleCheckout({
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM || "pri_01m77937g210r680cc5ctrjt06",
        userId: user?.id,
        userEmail: user?.email,
      });
    } else {
      openPaddleCheckout({
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_BADGE || "pri_01m77938ah2vr0fd44jngajdzm",
        userId: user?.id,
        userEmail: user?.email,
      });
    }
  };

  const categories = ["ALL", "IDENTITY", "DISCORD", "PREMIUM", "TELEMETRY"];
  const filteredRows =
    filterCat === "ALL" ? matrix : matrix.filter((r) => r.category === filterCat);

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="py-20 px-4 sm:px-6 border-b border-[#1a1a1a] nt-dot-grid">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#2a2a2a] text-xs text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d71920]" />
              SPEC: NOT-PRICING-2026 // SINGLE PAYMENT
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
              UNCOMPLICATED PRICING.
            </h1>
            <p className="text-sm text-neutral-400 max-w-xl mx-auto font-sans leading-relaxed">
              No sneaky recurring bills. No tiered subscriber lock-in. Pay once and retain complete creative freedom for lifetime.
            </p>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="py-16 px-4 sm:px-6 border-b border-[#1a1a1a]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div className="bg-[#0b0b0b] border border-[#222222] rounded-2xl p-7 flex flex-col justify-between space-y-6 nt-crosshair">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">FREE</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-neutral-400">STARTER</span>
                </div>
                <div className="flex items-baseline gap-1 py-2 border-y border-[#1c1c1c]">
                  <span className="text-4xl font-extrabold text-white">0€</span>
                  <span className="text-xs text-neutral-500 font-semibold">/ LIFETIME</span>
                </div>
                <p className="text-xs text-neutral-400 font-sans">
                  Essential tools for creators and gamers looking for a clean, fast link-in-bio.
                </p>
                <ul className="space-y-2 text-xs font-sans text-neutral-300 pt-2">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Permanent pixel.gg handle
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Up to 10 social media links
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Discord RPC plugin access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Real-time view analytics
                  </li>
                </ul>
              </div>

              <Button variant="outline" href="/register?ref=pricing_page" className="w-full justify-center text-xs py-3">
                GET STARTED FREE
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="bg-[#121212] border-2 border-white rounded-2xl p-7 flex flex-col justify-between space-y-6 relative shadow-2xl nt-crosshair">
              <div className="absolute -top-3.5 right-6 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-bold tracking-wider uppercase">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">PREMIUM</h3>
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex items-baseline gap-1 py-2 border-y border-[#262626]">
                  <span className="text-4xl font-extrabold text-white">7,99€</span>
                  <span className="text-xs text-neutral-500 font-semibold">/ LIFETIME</span>
                </div>
                <p className="text-xs text-neutral-300 font-sans">
                  The definitive plan for complete industrial design customization and audio streaming.
                </p>
                <ul className="space-y-2 text-xs font-sans text-neutral-200 pt-2">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Verified identity badge (✓)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> All Nothing OS industrial themes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Audio player with progress scrubbing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Custom fonts & Typewriter FX
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> SEO OpenGraph card previews
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Multiple username redirect aliases
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  variant="solid-white"
                  onClick={() => handleCheckout("PREMIUM")}
                  className="w-full justify-center text-xs py-3 cursor-pointer"
                >
                  PURCHASE LIFETIME
                </Button>
                <div className="text-center text-[10px] text-neutral-500">
                  ONE-TIME PAYMENT &bull; NEVER EXPIRES
                </div>
              </div>
            </div>

            {/* Custom Badge Tier */}
            <div className="bg-[#0b0b0b] border border-[#222222] rounded-2xl p-7 flex flex-col justify-between space-y-6 nt-crosshair">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">CUSTOM BADGE</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-white">ADDON</span>
                </div>
                <div className="flex items-baseline gap-1 py-2 border-y border-[#1c1c1c]">
                  <span className="text-4xl font-extrabold text-white">8,99€</span>
                  <span className="text-xs text-neutral-500 font-semibold">/ LIFETIME</span>
                </div>
                <p className="text-xs text-neutral-400 font-sans">
                  Create your own custom verified badge with a custom icon, hover text, and title.
                </p>
                <ul className="space-y-2 text-xs font-sans text-neutral-300 pt-2">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Custom icon & name
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Editable any time in Studio
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Compatible with all profile tiers
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-white" /> Giftable to another creator
                  </li>
                </ul>
              </div>

              <Button
                variant="surface"
                onClick={() => handleCheckout("BADGE")}
                className="w-full justify-center text-xs py-3 cursor-pointer"
              >
                PURCHASE BADGE
              </Button>
            </div>
          </div>
        </section>

        {/* Detailed Feature Comparison Matrix */}
        <section className="py-20 px-4 sm:px-6 border-b border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-widest">
                  [ COMPARISON MATRIX ]
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  FULL FEATURE SPECIFICATION
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 bg-[#121212] p-1 rounded-lg border border-[#222222]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                      filterCat === cat
                        ? "bg-white text-black font-semibold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-[#0b0b0b] border border-[#202020] rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 px-6 py-3.5 bg-[#141414] border-b border-[#222222] text-xs font-semibold text-neutral-400">
                <div className="col-span-8 sm:col-span-6">CAPABILITY</div>
                <div className="col-span-2 sm:col-span-3 text-center">FREE (0€)</div>
                <div className="col-span-2 sm:col-span-3 text-center text-white">PREMIUM (7,99€)</div>
              </div>

              <div className="divide-y divide-[#181818] text-xs">
                {filteredRows.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-12 px-6 py-4 items-center hover:bg-[#111111] transition-colors"
                  >
                    <div className="col-span-8 sm:col-span-6 space-y-0.5">
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-[11px] text-neutral-500 font-sans leading-tight">
                        {row.description}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-3 flex justify-center">
                      {row.free ? (
                        <Check size={16} className="text-white" />
                      ) : (
                        <X size={15} className="text-neutral-600" />
                      )}
                    </div>

                    <div className="col-span-2 sm:col-span-3 flex justify-center">
                      {row.premium ? (
                        <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      ) : (
                        <X size={15} className="text-neutral-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FaqSection />
        <FooterCta />
      </main>

      <Footer />
    </div>
  );
}

