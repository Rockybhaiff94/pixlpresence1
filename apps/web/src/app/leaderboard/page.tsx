"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Trophy, TrendingUp, Eye, ArrowUpRight, Flame } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";

interface CreatorRank {
  rank: number;
  username: string;
  displayName: string;
  bio: string;
  viewsAllTime: number;
  viewsMonthly: number;
  verified: boolean;
  premium: boolean;
  founder?: boolean;
  activity?: string;
}

const creators: CreatorRank[] = [
  {
    rank: 1,
    username: "hris",
    displayName: "hris",
    bio: "guns.lol & pixel.gg lead engineer // digital identity architect",
    viewsAllTime: 4182900,
    viewsMonthly: 382400,
    verified: true,
    premium: true,
    founder: true,
    activity: "Developing Nothing OS UI",
  },
  {
    rank: 2,
    username: "azre",
    displayName: "azre",
    bio: "designer & aesthetic visual artist // 3d director",
    viewsAllTime: 2984100,
    viewsMonthly: 291200,
    verified: true,
    premium: true,
    activity: "Blender 4.2",
  },
  {
    rank: 3,
    username: "popaperc",
    displayName: "popaperc",
    bio: "music producer // audio engineer // sound design",
    viewsAllTime: 2190400,
    viewsMonthly: 184500,
    verified: true,
    premium: true,
    activity: "Ableton Live 12",
  },
  {
    rank: 4,
    username: "vue",
    displayName: "vue",
    bio: "minimalist photographer // industrial creative",
    viewsAllTime: 1840200,
    viewsMonthly: 152000,
    verified: true,
    premium: true,
    activity: "Lightroom Classic",
  },
  {
    rank: 5,
    username: "guns",
    displayName: "guns.lol",
    bio: "official guns.lol archival profile",
    viewsAllTime: 1650300,
    viewsMonthly: 124800,
    verified: true,
    premium: true,
    founder: true,
    activity: "Idle",
  },
  {
    rank: 6,
    username: "carl",
    displayName: "Carl Pei",
    bio: "technology entrepreneur // nothing technology",
    viewsAllTime: 1420900,
    viewsMonthly: 118400,
    verified: true,
    premium: true,
    activity: "Nothing OS Phone (2)",
  },
  {
    rank: 7,
    username: "stealth",
    displayName: "Stealth",
    bio: "cybersecurity researcher & cryptographic engineer",
    viewsAllTime: 1210800,
    viewsMonthly: 98400,
    verified: true,
    premium: false,
    activity: "Terminal / Zsh",
  },
  {
    rank: 8,
    username: "mono",
    displayName: "Monochrome",
    bio: "black & white publication art director",
    viewsAllTime: 984200,
    viewsMonthly: 84200,
    verified: true,
    premium: true,
    activity: "Figma",
  },
  {
    rank: 9,
    username: "void",
    displayName: "Void Runner",
    bio: "ambient electronica & darksynth tracks",
    viewsAllTime: 842000,
    viewsMonthly: 71200,
    verified: false,
    premium: true,
    activity: "FL Studio 21",
  },
  {
    rank: 10,
    username: "neon",
    displayName: "Neon Ghost",
    bio: "generative shader programmer & glsl artist",
    viewsAllTime: 719400,
    viewsMonthly: 64100,
    verified: false,
    premium: false,
    activity: "TouchDesigner",
  },
];

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<"ALL_TIME" | "THIS_MONTH">("ALL_TIME");
  const [query, setQuery] = useState("");

  const filtered = creators
    .filter(
      (c) =>
        c.username.toLowerCase().includes(query.toLowerCase()) ||
        c.displayName.toLowerCase().includes(query.toLowerCase()) ||
        c.bio.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) =>
      timeframe === "ALL_TIME"
        ? b.viewsAllTime - a.viewsAllTime
        : b.viewsMonthly - a.viewsMonthly
    );

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1c1c1c] pb-8">
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-widest">
                [ TELEMETRY // GLOBAL CREATOR RANKINGS ]
              </span>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                LEADERBOARD.
              </h1>
              <p className="text-sm text-neutral-400 font-sans max-w-lg">
                Real-time verified view rankings across the Pixel.gg network.
              </p>
            </div>

            {/* Timeframe Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-[#121212] border border-[#242424] p-1 rounded-lg self-start md:self-auto">
              <button
                onClick={() => setTimeframe("ALL_TIME")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === "ALL_TIME"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ALL TIME
              </button>
              <button
                onClick={() => setTimeframe("THIS_MONTH")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === "THIS_MONTH"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                THIS MONTH
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center bg-[#0d0d0d] border border-[#222222] focus-within:border-white rounded-xl px-4 py-2.5 transition-colors max-w-md">
            <Search size={16} className="text-neutral-500 mr-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creator by username, name, or bio..."
              className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-neutral-500 hover:text-white text-xs ml-2"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Leaderboard Table / Grid */}
          <div className="bg-[#0b0b0b] border border-[#202020] rounded-xl overflow-hidden nt-crosshair">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-6 py-3.5 bg-[#141414] border-b border-[#202020] text-xs font-semibold text-neutral-400">
              <div className="col-span-2 sm:col-span-1 text-center">RANK</div>
              <div className="col-span-6 sm:col-span-6">CREATOR</div>
              <div className="hidden sm:block sm:col-span-3">DISCORD RPC</div>
              <div className="col-span-4 sm:col-span-2 text-right">VIEWS</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#181818] text-xs">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 space-y-2">
                  <p className="text-sm font-semibold text-white">NO CREATORS FOUND</p>
                  <p className="text-xs">No profile matched your search query &ldquo;{query}&rdquo;.</p>
                </div>
              ) : (
                filtered.map((c, index) => {
                  const views = timeframe === "ALL_TIME" ? c.viewsAllTime : c.viewsMonthly;
                  const rankDisplay = c.rank < 10 ? `0${c.rank}` : String(c.rank);

                  return (
                    <Link
                      key={c.username}
                      href={`/${c.username}`}
                      className="grid grid-cols-12 px-6 py-4 items-center hover:bg-[#121212] transition-colors group"
                    >
                      {/* Rank */}
                      <div className="col-span-2 sm:col-span-1 text-center font-bold text-sm">
                        {c.rank === 1 ? (
                          <span className="text-white font-extrabold flex items-center justify-center gap-1">
                            <Trophy size={14} className="text-white" />
                          </span>
                        ) : c.rank === 2 || c.rank === 3 ? (
                          <span className="text-neutral-200">#{rankDisplay}</span>
                        ) : (
                          <span className="text-neutral-500">#{rankDisplay}</span>
                        )}
                      </div>

                      {/* Creator Info */}
                      <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white shrink-0">
                          {c.displayName.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover:underline truncate">
                              {c.displayName}
                            </span>
                            {c.verified && (
                              <span className="text-[10px] px-1 rounded bg-white text-black font-bold">
                                ✓
                              </span>
                            )}
                            {c.founder && (
                              <span className="text-[9px] px-1 rounded bg-[#d71920] text-white font-bold">
                                FOUNDER
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">
                            @{c.username} &bull; <span className="font-sans">{c.bio}</span>
                          </p>
                        </div>
                      </div>

                      {/* Discord Presence */}
                      <div className="hidden sm:block sm:col-span-3 text-[11px] text-neutral-400 truncate">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161616] border border-[#242424] truncate max-w-[220px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                          <span className="truncate">{c.activity || "Online"}</span>
                        </span>
                      </div>

                      {/* Views */}
                      <div className="col-span-4 sm:col-span-2 text-right font-bold text-white flex items-center justify-end gap-1.5">
                        <Eye size={13} className="text-neutral-500 hidden sm:inline" />
                        <span>{views.toLocaleString()}</span>
                        <ArrowUpRight size={13} className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

