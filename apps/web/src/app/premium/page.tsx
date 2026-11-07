"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  Shield,
  Music,
  Globe,
  ImageIcon,
  LayoutTemplate,
  Award,
  ArrowRight,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { useAuth } from "@/context/AuthContext";

export default function PremiumPage() {
  const { user } = useAuth();
  const [checkoutModal, setCheckoutModal] = useState(false);

  const perks = [
    { title: "Custom Audio & Ambience", desc: "Embed custom background music and autoplay loops on your profile", icon: Music },
    { title: "Custom Root Domains", desc: "Connect your own .com or custom domain directly to your profile", icon: Globe },
    { title: "5 Account Alias Handles", desc: "Reserve up to 5 unique vanity usernames routing to your account", icon: Sparkles },
    { title: "Verified Gold Crown Badge", desc: "Exclusive glowing badge shown across all profile pages and directories", icon: Crown },
    { title: "High-Resolution Image Host", desc: "Upload uncompressed avatars, banners, and media assets", icon: ImageIcon },
    { title: "Unlimited Activity Templates", desc: "Save and switch between unlimited Discord Rich Presence templates", icon: LayoutTemplate },
  ];

  return (
    <AccountLayout>
      <div className="space-y-10 font-mono text-[#ededed] max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>MEMBERSHIP</span>
              <span>/</span>
              <span className="text-white">TIER ENTITLEMENTS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              PIXEL.GG PREMIUM.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              One-time lifetime tier. No subscriptions, no recurring fees.
            </p>
          </div>

          {user?.premiumStatus ? (
            <div className="px-4 py-2 rounded-xl bg-[#1c1808] border border-[#ff9800]/40 text-[#ff9800] text-xs font-bold flex items-center gap-2">
              <Crown size={15} />
              <span>PREMIUM ACTIVE</span>
            </div>
          ) : (
            <button
              onClick={() => setCheckoutModal(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Crown size={14} className="text-black" />
              <span>UPGRADE FOR 7.99€</span>
            </button>
          )}
        </div>

        {/* Pricing Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Standard Tier */}
          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#202020] space-y-6 nt-crosshair">
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                [ TIER 00 // BASIC ]
              </span>
              <h2 className="text-xl font-bold text-white">STANDARD IDENTITY</h2>
              <p className="text-xs text-neutral-400">Everything needed for personal digital identity</p>
            </div>

            <div className="text-3xl font-bold text-white">
              0€ <span className="text-xs font-normal text-neutral-500">/ forever</span>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center gap-2.5">
                <Check size={14} className="text-[#4ade80]" />
                <span>Single vanity username</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={14} className="text-[#4ade80]" />
                <span>Unlimited profile views</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={14} className="text-[#4ade80]" />
                <span>Discord Rich Presence companion</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={14} className="text-[#4ade80]" />
                <span>1 Alias handle slot</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#181818]">
              <span className="text-[11px] text-neutral-500">INCLUDED BY DEFAULT</span>
            </div>
          </div>

          {/* Premium Lifetime Tier */}
          <div className="p-6 rounded-2xl bg-[#0f0e0c] border border-[#ff9800]/40 relative space-y-6 shadow-2xl nt-crosshair">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded bg-[#ff9800]/10 border border-[#ff9800]/30 text-[#ff9800] text-[10px] font-bold">
              ONE-TIME LIFETIME
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#ff9800] uppercase tracking-wider font-bold">
                [ TIER 01 // PREMIUM ]
              </span>
              <h2 className="text-xl font-bold text-white">LIFETIME PRO</h2>
              <p className="text-xs text-neutral-400">Complete creative ownership and platform perks</p>
            </div>

            <div className="text-3xl font-bold text-white">
              7.99€ <span className="text-xs font-normal text-neutral-500">/ single payment</span>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-200">
              {perks.map((p) => (
                <div key={p.title} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[#ff9800] shrink-0" />
                  <span>{p.title}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#202020]">
              <button
                onClick={() => setCheckoutModal(true)}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                {user?.premiumStatus ? "MANAGE MEMBERSHIP" : "CLAIM LIFETIME PASS — 7.99€"}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#202020] space-y-6 nt-crosshair">
          <div className="space-y-1 pb-4 border-b border-[#181818]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              INCLUDED ADVANCED CAPABILITIES
            </h3>
            <p className="text-xs text-neutral-500">All features unlocked instantly with zero subscription cycles</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((p) => (
              <div key={p.title} className="p-4 rounded-xl bg-[#121212] border border-[#222222] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#ff9800]/10 border border-[#ff9800]/30 flex items-center justify-center text-[#ff9800]">
                  <p.icon size={16} />
                </div>
                <h4 className="text-white font-bold text-xs">{p.title}</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Modal */}
        {checkoutModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0e0e0e] border border-[#282828] rounded-2xl p-6 space-y-5 shadow-2xl nt-crosshair">
              <div className="space-y-1 text-center">
                <Crown size={28} className="text-[#ff9800] mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">UPGRADE TO PREMIUM</h3>
                <p className="text-xs text-neutral-400">
                  Instant activation for account: <span className="text-white font-bold">@{user?.username}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Item</span>
                  <span className="text-white font-semibold">Pixel.gg Premium Lifetime</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Price</span>
                  <span className="text-white font-bold text-sm">7.99 EUR</span>
                </div>
                <div className="flex justify-between border-t border-[#202020] pt-2 text-[10px] text-neutral-500">
                  <span>Billing Frequency</span>
                  <span>Non-recurring (Lifetime)</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href="https://discord.gg"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  <span>CHECKOUT VIA STRIPE / DISCORD</span>
                  <ArrowRight size={13} />
                </a>

                <button
                  type="button"
                  onClick={() => setCheckoutModal(false)}
                  className="w-full py-2 text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}

