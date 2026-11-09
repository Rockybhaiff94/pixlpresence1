"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  LineChart,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
import { GlobalAudienceMap } from "@/components/analytics/GlobalAudienceMap";
import {
  CountryMetric,
  StateMetric,
  CityMetric,
  TrafficRoute,
} from "@/components/analytics/mapData";

interface AnalyticsData {
  range: string;
  days: number;
  lastUpdated: string;
  kpis: {
    totalClicks: { value: string; delta: string };
    clickRate: { value: string; delta: string };
    profileViews: { value: string; delta: string };
    uniqueVisitors?: { value: string; delta: string };
    avgDailyViews: { value: string; delta: string };
  };
  timeline: { date: string; views: number; clicks: number }[];
  devices: { name: string; percentage: number; count: number }[];
  socials: { platform: string; icon: string; url: string; clicks: number; percentage: number }[];
  buttons: { id: string; title: string; url: string; clicks: number; rate: string }[];
  referrers: { name: string; count: number; percentage: number }[];
  countries: CountryMetric[];
  states?: StateMetric[];
  cities?: CityMetric[];
  routes?: TrafficRoute[];
  realtime?: {
    activeNow: number;
    lastEventAt: string;
    liveStatus?: string;
  };
}

export default function AccountAnalyticsPage() {
  const [range, setRange] = useState<"24h" | "3d" | "7d" | "14d" | "30d" | "90d">("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"spline" | "bars">("spline");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

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

    // Subtle 30s background poll to refresh real-time pulse without layout jump
    const pollTimer = setInterval(() => {
      apiFetch(`/api/account/analytics?range=${range}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh) setData(fresh);
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(pollTimer);
  }, [range]);

  const ranges = [
    { id: "24h", label: "Last 24 hours" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "90d", label: "Last 90 days" },
  ] as const;

  const timeline = data?.timeline || [];
  const maxTimelineViews =
    timeline.length > 0 ? Math.max(...timeline.map((t) => t.views), 10) : 100;

  const kpis = data?.kpis || {
    totalClicks: { value: "0", delta: "0%" },
    clickRate: { value: "0.0%", delta: "0%" },
    profileViews: { value: "0", delta: "0%" },
    avgDailyViews: { value: "0", delta: "0%" },
  };
  const devices = data?.devices || [];
  const socials = data?.socials || [];
  const buttons = data?.buttons || [];
  const referrers = data?.referrers || [];
  const countries = data?.countries || [];

  // Compute SVG Spline Geometry for 21st.dev Smooth Area Chart
  const splineData = useMemo(() => {
    if (timeline.length === 0) return null;

    const width = 800;
    const height = 180;
    const padX = 20;
    const padY = 20;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const points = timeline.map((pt, i) => {
      const x = padX + (i / Math.max(1, timeline.length - 1)) * innerW;
      const yViews = padY + innerH - (pt.views / Math.max(1, maxTimelineViews)) * innerH;
      const yClicks = padY + innerH - (pt.clicks / Math.max(1, maxTimelineViews)) * innerH;
      return { x, yViews, yClicks, ...pt };
    });

    // Create SVG Cubic Bezier Path
    let viewsPath = `M ${points[0].x} ${points[0].yViews}`;
    let clicksPath = `M ${points[0].x} ${points[0].yClicks}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      viewsPath += ` C ${mx} ${p0.yViews}, ${mx} ${p1.yViews}, ${p1.x} ${p1.yViews}`;
      clicksPath += ` C ${mx} ${p0.yClicks}, ${mx} ${p1.yClicks}, ${p1.x} ${p1.yClicks}`;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaPath = `${viewsPath} L ${lastPt.x} ${height - padY} L ${firstPt.x} ${height - padY} Z`;

    return { points, viewsPath, clicksPath, areaPath, width, height, padY };
  }, [timeline, maxTimelineViews]);

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

        {/* Time Range Selector (Strictly Nothing OS Monochrome, NO Purple) */}
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
          <RefreshCw size={16} className="animate-spin mr-2 text-white" />
          <span>CALIBRATING TELEMETRY STREAM...</span>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Part C: 4 Summary KPI Cards (21st.dev Inspired with Glass Sheen & Delta Badges) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {/* 1. Total Link Clicks */}
            <div className="p-5 rounded-2xl bg-[#0b0b0e] border border-[#1e1e24] hover:border-neutral-700 transition-colors space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold">TOTAL LINK CLICKS</span>
                <div className="p-1.5 rounded-lg bg-[#141418] border border-[#222228] text-neutral-300">
                  <MousePointerClick size={13} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {kpis.totalClicks?.value || "0"}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp size={11} />
                  <span>{kpis.totalClicks?.delta || "0%"}</span>
                </span>
                <span className="text-[10px] text-neutral-500">vs prev cycle</span>
              </div>
            </div>

            {/* 2. Click Rate */}
            <div className="p-5 rounded-2xl bg-[#0b0b0e] border border-[#1e1e24] hover:border-neutral-700 transition-colors space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold">CLICK-THROUGH RATE</span>
                <div className="p-1.5 rounded-lg bg-[#141418] border border-[#222228] text-neutral-300">
                  <Percent size={13} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {kpis.clickRate?.value || "0.0%"}
              </div>
              <div className="text-[10px] text-neutral-400 tracking-wide uppercase">
                CLICKS PER ELIGIBLE VISIT
              </div>
            </div>

            {/* 3. Profile Views */}
            <div className="p-5 rounded-2xl bg-[#0b0b0e] border border-[#1e1e24] hover:border-neutral-700 transition-colors space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold">PROFILE VIEWS</span>
                <div className="p-1.5 rounded-lg bg-[#141418] border border-[#222228] text-neutral-300">
                  <Eye size={13} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {kpis.profileViews?.value || "0"}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp size={11} />
                  <span>{kpis.profileViews?.delta || "0%"}</span>
                </span>
                <span className="text-[10px] text-neutral-500">organic reach</span>
              </div>
            </div>

            {/* 4. Average Daily Views */}
            <div className="p-5 rounded-2xl bg-[#0b0b0e] border border-[#1e1e24] hover:border-neutral-700 transition-colors space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold">AVG DAILY VIEWS</span>
                <div className="p-1.5 rounded-lg bg-[#141418] border border-[#222228] text-neutral-300">
                  <Calendar size={13} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {kpis.avgDailyViews?.value || "0"}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wide">
                TRAFFIC RATE / {data?.days || 7} DAYS
              </div>
            </div>
          </div>

          {/* Part D: Responsive Profile Views Visualizer (21st.dev Inspired with Spline / Bar Switcher) */}
          <div className="p-6 rounded-2xl bg-[#09090c] border border-[#1e1e24] space-y-6 font-mono text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#18181c]">
              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                  [ TIME-SERIES VISUALIZER ]
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  PROFILE VIEWS & CLICKS TELEMETRY
                </h3>
              </div>

              {/* View Switcher & Legend */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-white" /> Views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-neutral-500" /> Clicks
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-xl border border-[#202026] text-xs">
                  <button
                    onClick={() => setChartMode("spline")}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                      chartMode === "spline"
                        ? "bg-white text-black font-bold shadow"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <LineChart size={12} />
                    <span>Area</span>
                  </button>
                  <button
                    onClick={() => setChartMode("bars")}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                      chartMode === "bars"
                        ? "bg-white text-black font-bold shadow"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <BarChart2 size={12} />
                    <span>Columns</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Responsive Chart Container */}
            <div className="w-full bg-[#0d0d10] border border-[#1e1e23] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              {chartMode === "spline" && splineData ? (
                <div className="relative w-full h-48 sm:h-56">
                  <svg
                    viewBox={`0 0 ${splineData.width} ${splineData.height}`}
                    className="w-full h-full overflow-visible select-none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="views-area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Background Grid Lines */}
                    {[0.25, 0.5, 0.75].map((factor) => (
                      <line
                        key={factor}
                        x1="20"
                        y1={splineData.padY + (splineData.height - splineData.padY * 2) * factor}
                        x2={splineData.width - 20}
                        y2={splineData.padY + (splineData.height - splineData.padY * 2) * factor}
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Gradient Area Fill */}
                    <path d={splineData.areaPath} fill="url(#views-area-gradient)" />

                    {/* Smooth Spline Stroke for Views */}
                    <path
                      d={splineData.viewsPath}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />

                    {/* Smooth Spline Stroke for Clicks */}
                    <path
                      d={splineData.clicksPath}
                      fill="none"
                      stroke="#71717a"
                      strokeWidth="1.8"
                      strokeDasharray="3 3"
                    />

                    {/* Data Points */}
                    {splineData.points.map((pt, idx) => {
                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <g key={pt.date}>
                          {isHovered && (
                            <line
                              x1={pt.x}
                              y1={splineData.padY}
                              x2={pt.x}
                              y2={splineData.height - splineData.padY}
                              stroke="rgba(255, 255, 255, 0.3)"
                              strokeDasharray="2 2"
                            />
                          )}

                          <circle
                            cx={pt.x}
                            cy={pt.yViews}
                            r={isHovered ? 5 : 3.5}
                            fill="#ffffff"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          />

                          <circle
                            cx={pt.x}
                            cy={pt.yClicks}
                            r={isHovered ? 4 : 2.5}
                            fill="#71717a"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Active Tooltip for Spline Point */}
                  {hoveredPointIndex !== null && splineData.points[hoveredPointIndex] && (
                    <div
                      className="absolute -top-1 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold shadow-2xl pointer-events-none transform -translate-x-1/2 z-20"
                      style={{
                        left: `${(hoveredPointIndex / Math.max(1, timeline.length - 1)) * 100}%`,
                      }}
                    >
                      <p>{splineData.points[hoveredPointIndex].date}</p>
                      <p className="text-black">
                        {splineData.points[hoveredPointIndex].views.toLocaleString()} views
                      </p>
                      <p className="text-neutral-600">
                        {splineData.points[hoveredPointIndex].clicks} clicks
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Bar Columns Visualizer */
                <div className="h-44 sm:h-52 flex items-end justify-between gap-1.5 pt-4">
                  {timeline.map((point) => {
                    const viewPct = Math.max(
                      10,
                      Math.round((point.views / maxTimelineViews) * 100)
                    );
                    const clickPct = Math.max(
                      6,
                      Math.round((point.clicks / maxTimelineViews) * 100)
                    );

                    return (
                      <div
                        key={point.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Floating tooltip */}
                        <div className="absolute -top-10 px-2.5 py-1.5 rounded bg-white text-black text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-2xl">
                          <p>{point.date}</p>
                          <p>{point.views.toLocaleString()} views</p>
                          <p className="text-neutral-600">{point.clicks} clicks</p>
                        </div>

                        <div className="w-full flex items-end justify-center gap-1 h-full">
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
              )}

              {/* X-Axis Dates */}
              <div className="flex justify-between border-t border-[#1c1c20] pt-2 text-[10px] text-neutral-500 font-mono">
                {timeline
                  .filter(
                    (_, idx) =>
                      timeline.length <= 10 || idx % Math.ceil(timeline.length / 7) === 0
                  )
                  .map((point) => (
                    <span key={point.date}>{point.date}</span>
                  ))}
              </div>
            </div>
          </div>

          {/* Grid: Visitor Devices (E) + Top Referrers (H) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
            {/* Part E: Visitor Devices (21st.dev Card) */}
            <div className="p-6 rounded-2xl bg-[#09090c] border border-[#1e1e24] space-y-4 text-left">
              <div className="space-y-0.5 pb-3 border-b border-[#18181c]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  VISITOR DEVICES
                </h3>
                <p className="text-[11px] text-neutral-500">Distribution across hardware categories</p>
              </div>

              <div className="space-y-3.5 pt-1">
                {devices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No visitor hardware data recorded yet.
                  </div>
                ) : (
                  devices.map((dev) => {
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
                            <div className="p-1 rounded bg-[#141418] border border-[#222228]">
                              <DevIcon size={12} className="text-neutral-400" />
                            </div>
                            <span>{dev.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-neutral-500 text-[11px]">
                              {dev.count.toLocaleString()}
                            </span>
                            <span className="text-white font-bold">{dev.percentage}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-[#16161c] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-neutral-300 to-white transition-all duration-300"
                            style={{ width: `${dev.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Part H: Top Referrers (21st.dev Card) */}
            <div className="p-6 rounded-2xl bg-[#09090c] border border-[#1e1e24] space-y-4 text-left">
              <div className="space-y-0.5 pb-3 border-b border-[#18181c]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  TOP TRAFFIC REFERRERS
                </h3>
                <p className="text-[11px] text-neutral-500">Sources generating inbound views</p>
              </div>

              <div className="space-y-3.5 pt-1">
                {referrers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No inbound referrers recorded yet.
                  </div>
                ) : (
                  referrers.map((ref) => (
                    <div key={ref.name} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-300">{ref.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-500 text-[11px]">
                            {ref.count.toLocaleString()}
                          </span>
                          <span className="text-white font-bold">{ref.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#16161c] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-400 transition-all duration-300"
                          style={{ width: `${ref.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Grid: Most Clicked Socials (F) + Most Clicked Buttons (G) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
            {/* Part F: Most Clicked Socials */}
            <div className="p-6 rounded-2xl bg-[#09090c] border border-[#1e1e24] space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#18181c]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    MOST CLICKED SOCIALS
                  </h3>
                  <p className="text-[11px] text-neutral-500">Outbound platform traffic</p>
                </div>
                <Link
                  href="/links"
                  className="text-[11px] text-neutral-400 hover:text-white underline"
                >
                  Manage Links
                </Link>
              </div>

              <div className="space-y-2">
                {socials.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No social link clicks recorded yet.
                  </div>
                ) : (
                  socials.map((soc) => (
                    <div
                      key={soc.platform}
                      className="p-3 rounded-xl bg-[#111115] border border-[#202026] hover:border-neutral-600 hover:translate-x-1 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-[10px] text-white">
                          {(soc.platform || "SO").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-white font-semibold truncate">{soc.platform}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{soc.url}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-white font-bold">
                          {soc.clicks.toLocaleString()} clicks
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181820] border border-[#2a2a34] text-neutral-300 font-semibold">
                          {soc.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Part G: Most Clicked Buttons */}
            <div className="p-6 rounded-2xl bg-[#09090c] border border-[#1e1e24] space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#18181c]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    MOST CLICKED BUTTONS
                  </h3>
                  <p className="text-[11px] text-neutral-500">Profile call-to-action interactions</p>
                </div>
                <Link
                  href="/customize"
                  className="text-[11px] text-neutral-400 hover:text-white underline"
                >
                  Edit Buttons
                </Link>
              </div>

              <div className="space-y-2">
                {buttons.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No button interaction metrics recorded yet.
                  </div>
                ) : (
                  buttons.map((btn) => (
                    <div
                      key={btn.id}
                      className="p-3 rounded-xl bg-[#111115] border border-[#202026] hover:border-neutral-600 hover:translate-x-1 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <p className="text-white font-semibold truncate">{btn.title}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{btn.url}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-white font-bold">
                          {btn.clicks.toLocaleString()} clicks
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181820] border border-[#2a2a34] text-neutral-300 font-semibold">
                          CTR: {btn.rate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Part I: Master Interactive Global Audience Analytics Map & Drill-Down */}
          <GlobalAudienceMap
            countries={countries}
            states={data.states || []}
            cities={data.cities || []}
            routes={data.routes || []}
            range={range}
            onRangeChange={(newRange) => setRange(newRange as any)}
            realtime={data.realtime}
          />
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-[#222222] rounded-2xl my-8 font-mono text-xs text-neutral-500 space-y-4">
          <Globe size={32} className="mx-auto text-neutral-600 mb-2" />
          <p className="text-white font-medium text-sm">TELEMETRY STREAM CONNECTING</p>
          <p className="text-neutral-400 max-w-md mx-auto">
            Unable to load real-time analytics data. Ensure your network connection is active or retry below.
          </p>
          <div className="pt-2">
            <button
              onClick={() => fetchAnalytics(range)}
              className="bg-white text-black hover:bg-neutral-200 font-bold text-xs font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={13} /> RETRY TELEMETRY STREAM
            </button>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
