"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart2,
  MousePointerClick,
  Percent,
  Eye,
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Share2,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface AnalyticsData {
  range: string;
  days: number;
  lastUpdated: string;
  kpis: {
    totalClicks: { value: string; delta: string };
    clickRate: { value: string; delta: string };
    profileViews: { value: string; delta: string };
    avgDailyViews: { value: string; delta: string };
  };
  timeline: { date: string; views: number; clicks: number }[];
  devices: { name: string; percentage: number; count: number }[];
  socials: { platform: string; icon: string; url: string; clicks: number; percentage: number }[];
  buttons: { id: string; title: string; url: string; clicks: number; rate: string }[];
  referrers: { name: string; count: number; percentage: number }[];
  countries: { code: string; name: string; views: number; percentage: number }[];
}

export default function AccountAnalyticsPage() {
  const [range, setRange] = useState<"3d" | "7d" | "14d" | "30d">("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (selectedRange: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/account/analytics?range=${selectedRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const ranges = [
    { id: "3d", label: "Last 3 days" },
    { id: "7d", label: "Last 7 days" },
    { id: "14d", label: "Last 14 days" },
    { id: "30d", label: "Last 30 days" },
  ] as const;

  const maxTimelineViews = data ? Math.max(...data.timeline.map((t) => t.views), 10) : 100;

  return (
    <AccountLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#181818] text-left">
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">
            [ 02 // REAL-TIME METRICS & TELEMETRY ]
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            ACCOUNT ANALYTICS
          </h1>
          <p className="text-xs text-neutral-400 font-sans">
            Real-time telemetry and engagement metrics across your public profile showcase.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-[#101010] p-1 rounded-xl border border-[#222222] self-start sm:self-auto font-mono text-xs">
          {ranges.map((r) => {
            const isSelected = range === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-white text-black font-semibold shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[50vh] font-mono text-neutral-500 text-xs">
          <RefreshCw size={16} className="animate-spin mr-2" />
          <span>UPDATING TELEMETRY STREAM...</span>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Part C: 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {/* 1. Total Link Clicks */}
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] space-y-3 relative nt-crosshair">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span className="text-[10px] uppercase tracking-wider">TOTAL LINK CLICKS</span>
                <MousePointerClick size={14} className="text-neutral-400" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {data.kpis.totalClicks.value}
              </div>
              <div className="text-[10px] text-[#4ade80] flex items-center gap-1">
                <TrendingUp size={11} />
                <span>{data.kpis.totalClicks.delta}</span>
              </div>
            </div>

            {/* 2. Click Rate */}
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] space-y-3 relative nt-crosshair">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span className="text-[10px] uppercase tracking-wider">CLICK-THROUGH RATE</span>
                <Percent size={14} className="text-neutral-400" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {data.kpis.clickRate.value}
              </div>
              <div className="text-[10px] text-neutral-400">
                CLICKS PER ELIGIBLE VISIT
              </div>
            </div>

            {/* 3. Profile Views */}
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] space-y-3 relative nt-crosshair">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span className="text-[10px] uppercase tracking-wider">PROFILE VIEWS</span>
                <Eye size={14} className="text-neutral-400" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {data.kpis.profileViews.value}
              </div>
              <div className="text-[10px] text-[#4ade80] flex items-center gap-1">
                <TrendingUp size={11} />
                <span>{data.kpis.profileViews.delta}</span>
              </div>
            </div>

            {/* 4. Average Daily Views */}
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] space-y-3 relative nt-crosshair">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span className="text-[10px] uppercase tracking-wider">AVG DAILY VIEWS</span>
                <Calendar size={14} className="text-neutral-400" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {data.kpis.avgDailyViews.value}
              </div>
              <div className="text-[10px] text-neutral-400">
                VIEWS / {data.days} DAYS PERIOD
              </div>
            </div>
          </div>

          {/* Part D: Large Responsive Profile Views Graph */}
          <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-6 font-mono nt-crosshair">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#181818]">
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                  [ TIME-SERIES VISUALIZER ]
                </span>
                <h3 className="text-base font-bold text-white">PROFILE VIEWS & CLICKS</h3>
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-white" /> Views
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-neutral-600" /> Clicks
                </span>
              </div>
            </div>

            {/* Responsive Chart Container */}
            <div className="h-56 w-full bg-[#101010] border border-[#1f1f1f] rounded-xl p-4 flex flex-col justify-between">
              <div className="h-40 flex items-end justify-between gap-1.5 pt-4">
                {data.timeline.map((point) => {
                  const viewPct = Math.max(10, Math.round((point.views / maxTimelineViews) * 100));
                  const clickPct = Math.max(6, Math.round((point.clicks / maxTimelineViews) * 100));

                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Floating tooltip */}
                      <div className="absolute -top-10 px-2 py-1 rounded bg-white text-black text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-2xl">
                        <p>{point.views.toLocaleString()} views</p>
                        <p className="text-neutral-600">{point.clicks} clicks</p>
                      </div>

                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          className="w-1/2 bg-neutral-600 group-hover:bg-neutral-400 rounded-t transition-all"
                          style={{ height: `${clickPct}%` }}
                        />
                        <div
                          className="w-1/2 bg-neutral-300 group-hover:bg-white rounded-t transition-all"
                          style={{ height: `${viewPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Dates */}
              <div className="flex justify-between border-t border-[#1c1c1c] pt-2 text-[10px] text-neutral-500">
                {data.timeline
                  .filter((_, idx) => data.timeline.length <= 10 || idx % Math.ceil(data.timeline.length / 7) === 0)
                  .map((point) => (
                    <span key={point.date}>{point.date}</span>
                  ))}
              </div>
            </div>
          </div>

          {/* Grid: Visitor Devices (E) + Top Referrers (H) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
            {/* Part E: Visitor Devices */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="space-y-0.5 text-left pb-3 border-b border-[#181818]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  VISITOR DEVICES
                </h3>
                <p className="text-[11px] text-neutral-500">Distribution across hardware categories</p>
              </div>

              <div className="space-y-3.5 pt-1">
                {data.devices.map((dev) => {
                  const getIcon = () => {
                    if (dev.name === "Desktop") return Monitor;
                    if (dev.name === "Mobile") return Smartphone;
                    if (dev.name === "Tablet") return Tablet;
                    return Globe;
                  };
                  const DevIcon = getIcon();

                  return (
                    <div key={dev.name} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <DevIcon size={14} className="text-neutral-500" />
                          <span>{dev.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-500 text-[11px]">{dev.count.toLocaleString()}</span>
                          <span className="text-white font-bold">{dev.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#181818] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${dev.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Part H: Top Referrers */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="space-y-0.5 text-left pb-3 border-b border-[#181818]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  TOP TRAFFIC REFERRERS
                </h3>
                <p className="text-[11px] text-neutral-500">Sources generating inbound views</p>
              </div>

              <div className="space-y-3.5 pt-1">
                {data.referrers.map((ref) => (
                  <div key={ref.name} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">{ref.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500 text-[11px]">{ref.count.toLocaleString()}</span>
                        <span className="text-white font-bold">{ref.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#181818] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-400 transition-all duration-300"
                        style={{ width: `${ref.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid: Most Clicked Socials (F) + Most Clicked Buttons (G) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
            {/* Part F: Most Clicked Socials */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="flex items-center justify-between pb-3 border-b border-[#181818]">
                <div className="space-y-0.5 text-left">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    MOST CLICKED SOCIALS
                  </h3>
                  <p className="text-[11px] text-neutral-500">Outbound platform traffic</p>
                </div>
                <Link href="/links" className="text-[11px] text-neutral-400 hover:text-white underline">
                  Manage Links
                </Link>
              </div>

              <div className="space-y-2">
                {data.socials.map((soc) => (
                  <div
                    key={soc.platform}
                    className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-[10px] text-white">
                        {soc.platform.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-white font-semibold truncate">{soc.platform}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{soc.url}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-white font-bold">{soc.clicks.toLocaleString()} clicks</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {soc.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Part G: Most Clicked Buttons */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="flex items-center justify-between pb-3 border-b border-[#181818]">
                <div className="space-y-0.5 text-left">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    MOST CLICKED BUTTONS
                  </h3>
                  <p className="text-[11px] text-neutral-500">Profile call-to-action interactions</p>
                </div>
                <Link href="/customize" className="text-[11px] text-neutral-400 hover:text-white underline">
                  Edit Buttons
                </Link>
              </div>

              <div className="space-y-2">
                {data.buttons.map((btn) => (
                  <div
                    key={btn.id}
                    className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="text-white font-semibold truncate">{btn.title}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{btn.url}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-white font-bold">{btn.clicks.toLocaleString()} clicks</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                        CTR: {btn.rate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Part I: Top Countries Breakdown */}
          <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 font-mono nt-crosshair">
            <div className="space-y-0.5 text-left pb-3 border-b border-[#181818]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                TOP COUNTRIES BY VIEWS
              </h3>
              <p className="text-[11px] text-neutral-500">Geographic distribution of your audience</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {data.countries.map((c) => (
                <div
                  key={c.code}
                  className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400">{c.code}</span>
                    <span className="text-white font-bold text-xs">{c.percentage}%</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs truncate">{c.name}</p>
                    <p className="text-[11px] text-neutral-500">{c.views.toLocaleString()} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AccountLayout>
  );
}

