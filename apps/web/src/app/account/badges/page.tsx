"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Crown,
  Shield,
  Sparkles,
  Zap,
  Gift,
  Flame,
  Globe,
  Bug,
  Sun,
  Egg,
  Ghost,
  Trophy,
  Medal,
  Star,
  Lock,
  CheckCircle,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Uncommon";
  icon: string;
  owned: boolean;
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ total: 21, owned: 0 });

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/account/badges");
      if (res.ok) {
        const data = await res.json();
        setBadges(data.badges || []);
        setStats({ total: data.totalCount || 21, owned: data.ownedCount || 0 });
      }
    } catch (err) {
      console.error("[Badges] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case "Legendary":
        return "text-[#ff9800] border-[#ff9800]/40 bg-[#ff9800]/10";
      case "Epic":
        return "text-[#d71920] border-[#d71920]/40 bg-[#d71920]/10";
      case "Rare":
        return "text-[#60a5fa] border-[#60a5fa]/40 bg-[#60a5fa]/10";
      default:
        return "text-neutral-400 border-neutral-700 bg-neutral-900";
    }
  };

  const getBadgeIcon = (id: string) => {
    switch (id) {
      case "premium":
        return <Crown size={20} className="text-[#ff9800]" />;
      case "staff":
        return <Shield size={20} className="text-[#d71920]" />;
      case "verified":
        return <CheckCircle size={20} className="text-[#4ade80]" />;
      case "og":
        return <Flame size={20} className="text-[#f97316]" />;
      case "booster":
        return <Sparkles size={20} className="text-[#a855f7]" />;
      case "donor":
        return <Zap size={20} className="text-[#eab308]" />;
      case "bug_hunter":
        return <Bug size={20} className="text-[#ec4899]" />;
      case "winner":
        return <Trophy size={20} className="text-[#eab308]" />;
      default:
        return <Award size={20} className="text-white" />;
    }
  };

  const filteredBadges = filter === "ALL"
    ? badges
    : filter === "OWNED"
    ? badges.filter((b) => b.owned)
    : badges.filter((b) => b.category.toUpperCase() === filter);

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>ACCOUNT</span>
              <span>/</span>
              <span className="text-white">BADGES & TROPHIES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              DIGITAL REPUTATION.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Collectible recognition badges verified on the Ethereum and Discord ecosystem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-lg bg-[#111111] border border-[#242424] text-xs">
              <span className="text-neutral-500">COLLECTED: </span>
              <span className="text-white font-bold">{stats.owned}/{stats.total}</span>
            </div>
            <button
              onClick={fetchBadges}
              className="p-2 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#242424] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Badges"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "OWNED", "ENTITLEMENT", "STAFF", "SPECIAL", "TOURNAMENT", "SEASONAL"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
                filter === tab
                  ? "bg-white text-black font-bold"
                  : "bg-[#111111] text-neutral-400 hover:text-white border border-[#222222]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Badges Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-neutral-500 text-xs">
            <RefreshCw size={16} className="animate-spin mr-2" />
            <span>RETRIEVING BADGE REPERTORY...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  badge.owned
                    ? "bg-[#0d0d0d] border-[#2b2b2b] hover:border-neutral-500 shadow-lg"
                    : "bg-[#080808] border-[#181818] opacity-60 hover:opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center shrink-0">
                    {getBadgeIcon(badge.id)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${getRarityBadge(badge.rarity)}`}>
                      {badge.rarity}
                    </span>
                    {badge.owned ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#102a15] border border-[#4ade80]/40 text-[#4ade80] font-bold">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 flex items-center gap-1">
                        <Lock size={10} /> LOCKED
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 space-y-1">
                  <h3 className="text-white font-bold text-sm tracking-wide">{badge.name}</h3>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{badge.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#181818] flex items-center justify-between text-[10px] text-neutral-500">
                  <span>CATEGORY: {badge.category}</span>
                  {badge.owned && (
                    <span className="text-[#4ade80] font-medium flex items-center gap-1">
                      <CheckCircle size={11} /> Shown on public profile
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade Banner for Locked Badges */}
        <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#222222] flex flex-col md:flex-row items-center justify-between gap-6 nt-crosshair">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-[10px] text-[#ff9800] uppercase tracking-widest font-bold">
              [ COLLECTOR UPGRADE ]
            </span>
            <h3 className="text-base font-bold text-white">UNLOCK EXCLUSIVE SUPPORTER & PREMIUM BADGES</h3>
            <p className="text-xs text-neutral-400 max-w-xl">
              Lifetime Pixel.gg Premium members receive instant verified crown badges, custom badge slots, and gold priority display.
            </p>
          </div>

          <Link
            href="/premium"
            className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shrink-0"
          >
            VIEW PREMIUM BADGES →
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}
