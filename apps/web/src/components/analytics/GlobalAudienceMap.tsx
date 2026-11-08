"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as d3Geo from "d3-geo";
import * as topojson from "topojson-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  ChevronRight,
  ArrowLeft,
  Activity,
  Layers,
  Info,
  Maximize2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  GeoLevel,
  CountryMetric,
  StateMetric,
  CityMetric,
  TrafficRoute,
  getCountryFlag,
  ISO_NUMERIC_TO_A2,
  COUNTRY_A2_TO_NAME,
} from "./mapData";

interface GlobalAudienceMapProps {
  countries: CountryMetric[];
  states?: StateMetric[];
  cities?: CityMetric[];
  routes?: TrafficRoute[];
  range: string;
  onRangeChange?: (newRange: string) => void;
  realtime?: {
    activeNow: number;
    lastEventAt: string;
    liveStatus?: string;
  };
}

export function GlobalAudienceMap({
  countries = [],
  states = [],
  cities = [],
  routes = [],
  range = "7d",
  onRangeChange,
  realtime,
}: GlobalAudienceMapProps) {
  // Navigation State
  const [level, setLevel] = useState<GeoLevel>("world");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Hover & Tooltip State
  const [hoveredFeature, setHoveredFeature] = useState<{
    type: "country" | "state" | "city";
    id: string;
    name: string;
    flag?: string;
    views: number;
    uniqueVisitors: number;
    percentage: number;
    x: number;
    y: number;
  } | null>(null);

  // Highlight synced with right panel hover
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // About Modal
  const [aboutOpen, setAboutOpen] = useState(false);

  // Geographic Data Cache
  const [worldGeo, setWorldGeo] = useState<any>(null);
  const [indiaGeo, setIndiaGeo] = useState<any>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  // Load Geographic Boundary Datasets
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setGeoLoading(true);
        const [worldRes, indiaRes] = await Promise.all([
          fetch("/geo/world-110m.json"),
          fetch("/geo/india-states.json"),
        ]);

        if (worldRes.ok && indiaRes.ok) {
          const worldJson = await worldRes.json();
          const indiaJson = await indiaRes.json();

          if (isMounted) {
            setWorldGeo(worldJson);
            setIndiaGeo(indiaJson);
          }
        }
      } catch (err) {
        console.error("[Map Data Load Error]:", err);
      } finally {
        if (isMounted) setGeoLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute World Features
  const worldFeatures = useMemo(() => {
    if (!worldGeo) return [];
    try {
      const featureColl = topojson.feature(
        worldGeo,
        worldGeo.objects.countries
      ) as any;
      return featureColl.features || [];
    } catch {
      return [];
    }
  }, [worldGeo]);

  // Compute India State Features
  const indiaFeatures = useMemo(() => {
    if (!indiaGeo) return [];
    return indiaGeo.features || [];
  }, [indiaGeo]);

  // Dynamic D3 Projection & Path Generator
  const { pathGenerator, projection } = useMemo(() => {
    if (level === "world") {
      const proj = d3Geo
        .geoNaturalEarth1()
        .scale(150)
        .translate([460, 260]);
      return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
    }

    if (level === "country" && (selectedCountry === "IN" || !selectedCountry)) {
      if (indiaFeatures.length > 0) {
        const proj = d3Geo
          .geoMercator()
          .fitSize([740, 480], { type: "FeatureCollection", features: indiaFeatures } as any);
        return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
      }
      const proj = d3Geo.geoMercator().center([82, 22]).scale(900).translate([400, 260]);
      return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
    }

    if (level === "state" && selectedState) {
      const stateFeature = indiaFeatures.find(
        (f: any) =>
          (f.properties?.NAME_1 || f.properties?.st_nm || "").toLowerCase() ===
          selectedState.toLowerCase()
      );
      if (stateFeature) {
        const proj = d3Geo
          .geoMercator()
          .fitSize([680, 440], stateFeature);
        return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
      }
    }

    // Default Fallback
    const proj = d3Geo.geoNaturalEarth1().scale(150).translate([460, 260]);
    return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
  }, [level, selectedCountry, selectedState, indiaFeatures]);

  // Metrics Lookups for Quick Access
  const countryMetricsMap = useMemo(() => {
    const map = new Map<string, CountryMetric>();
    countries.forEach((c) => {
      map.set(c.code.toUpperCase(), c);
      map.set(c.name.toLowerCase(), c);
    });
    return map;
  }, [countries]);

  const stateMetricsMap = useMemo(() => {
    const map = new Map<string, StateMetric>();
    states.forEach((s) => {
      map.set(s.name.toLowerCase(), s);
    });
    return map;
  }, [states]);

  const cityMetricsMap = useMemo(() => {
    const map = new Map<string, CityMetric>();
    cities.forEach((c) => {
      map.set(c.name.toLowerCase(), c);
    });
    return map;
  }, [cities]);

  // Total Views across the active tier
  const totalTierViews = useMemo(() => {
    if (level === "world") return countries.reduce((acc, c) => acc + c.views, 0) || 1;
    if (level === "country") return states.reduce((acc, s) => acc + s.views, 0) || 1;
    if (level === "state") return cities.reduce((acc, c) => acc + c.views, 0) || 1;
    return 1;
  }, [level, countries, states, cities]);

  // Drill Down Navigation Handlers
  const handleSelectCountry = (code: string) => {
    if (code.toUpperCase() === "IN") {
      setSelectedCountry("IN");
      setLevel("country");
      setSelectedState(null);
      setSelectedCity(null);
      setHoveredFeature(null);
    }
  };

  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName);
    setLevel("state");
    setSelectedCity(null);
    setHoveredFeature(null);
  };

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setLevel("city");
  };

  const handleResetToWorld = () => {
    setLevel("world");
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCity(null);
    setHoveredFeature(null);
  };

  const handleResetToCountry = () => {
    setLevel("country");
    setSelectedState(null);
    setSelectedCity(null);
    setHoveredFeature(null);
  };

  // Right Panel Dynamic Rankings Top 4
  const top4Items = useMemo(() => {
    const safeCountries = Array.isArray(countries) ? countries : [];
    const safeStates = Array.isArray(states) ? states : [];
    const safeCities = Array.isArray(cities) ? cities : [];

    if (level === "world") {
      return safeCountries.slice(0, 4).map((c) => ({
        id: c.code,
        title: c.name,
        flag: getCountryFlag(c.code),
        views: c.views,
        unique: c.uniqueVisitors,
        percentage: c.percentage,
        onClick: () => handleSelectCountry(c.code),
      }));
    }

    if (level === "country") {
      return safeStates.slice(0, 4).map((s) => ({
        id: s.name,
        title: s.name,
        flag: "📍",
        views: s.views,
        unique: s.uniqueVisitors,
        percentage: s.percentage,
        onClick: () => handleSelectState(s.name),
      }));
    }

    // State / City view
    return safeCities.slice(0, 4).map((c) => ({
      id: c.name,
      title: c.name,
      flag: "🏙️",
      views: c.views,
      unique: c.uniqueVisitors,
      percentage: c.percentage,
      onClick: () => handleSelectCity(c.name),
    }));
  }, [level, countries, states, cities]);

  // Animated Curved Routes for World View
  const projectedRoutes = useMemo(() => {
    if (level !== "world" || !projection || routes.length === 0) return [];

    return routes
      .map((r) => {
        const p1 = projection([r.origin.lng, r.origin.lat]);
        const p2 = projection([r.destination.lng, r.destination.lat]);
        if (!p1 || !p2) return null;

        // Quadratic control point curvature
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.hypot(dx, dy);
        if (dist < 10) return null;

        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2 - Math.min(60, dist * 0.25);

        const pathData = `M ${p1[0]} ${p1[1]} Q ${mx} ${my} ${p2[0]} ${p2[1]}`;
        return {
          id: r.id,
          pathData,
          start: p1,
          end: p2,
          volume: r.volume,
        };
      })
      .filter(Boolean) as {
      id: string;
      pathData: string;
      start: [number, number];
      end: [number, number];
      volume: number;
    }[];
  }, [level, projection, routes]);

  return (
    <div className="rounded-2xl bg-[#09090b] border border-[#1f1f23] p-5 sm:p-7 space-y-6 shadow-2xl relative font-mono text-left select-none overflow-hidden">
      {/* 1. Header with Breadcrumbs, Live Pulse, and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1c1c20]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
            <span className="uppercase tracking-widest">[ 04 // GLOBAL AUDIENCE INTELLIGENCE ]</span>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-semibold tracking-wide text-[10px]">
                LIVE TELEMETRY STREAM
              </span>
            </div>
          </div>

          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-white tracking-tight">
            <button
              onClick={handleResetToWorld}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                level === "world"
                  ? "text-white underline decoration-white/30 underline-offset-4"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4 text-neutral-400" />
              <span>World</span>
            </button>

            {selectedCountry && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                <button
                  onClick={handleResetToCountry}
                  className={`transition-colors cursor-pointer ${
                    level === "country"
                      ? "text-white underline decoration-white/30 underline-offset-4"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {COUNTRY_A2_TO_NAME[selectedCountry] || selectedCountry}
                </button>
              </>
            )}

            {selectedState && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                <button
                  onClick={() => handleSelectState(selectedState)}
                  className={`transition-colors cursor-pointer ${
                    level === "state"
                      ? "text-white underline decoration-white/30 underline-offset-4"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {selectedState}
                </button>
              </>
            )}

            {selectedCity && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-white">{selectedCity}</span>
              </>
            )}
          </div>
        </div>

        {/* Controls: Back Button, Time Range Selector, and About Button */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {level !== "world" && (
            <button
              onClick={level === "city" ? handleResetToCountry : level === "state" ? handleResetToCountry : handleResetToWorld}
              className="px-3 py-1.5 rounded-xl bg-[#141416] border border-[#26262b] text-neutral-300 hover:text-white hover:border-neutral-500 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-[#121214] p-1 rounded-xl border border-[#202024] text-xs font-mono">
            {[
              { id: "24h", label: "24h" },
              { id: "7d", label: "7d" },
              { id: "30d", label: "30d" },
              { id: "90d", label: "90d" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onRangeChange?.(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  range === f.id
                    ? "bg-white text-black font-bold shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* About Analytics Button */}
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            title="How Geographical Analytics Works"
            className="p-2 rounded-xl bg-[#141416] border border-[#242428] text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Vector Map Visualizer (Left) + Dynamic Top 4 Rankings (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Vector Map Surface (Occupies 8 of 12 cols) */}
        <div className="lg:col-span-8 bg-[#0d0d10] border border-[#1e1e23] rounded-2xl p-3 sm:p-5 relative min-h-[380px] sm:min-h-[460px] flex items-center justify-center overflow-hidden group">
          {geoLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-500 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-white" />
              <span>CALIBRATING GEOGRAPHICAL MESH...</span>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <svg
                viewBox="0 0 920 520"
                className="w-full h-auto max-h-[500px] overflow-visible select-none"
              >
                <defs>
                  {/* Subtle Grid Pattern */}
                  <pattern
                    id="geo-grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.03)"
                      strokeWidth="1"
                    />
                  </pattern>

                  {/* Drop Shadow for Elevated Hover */}
                  <filter id="elevate-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="6"
                      floodColor="#000000"
                      floodOpacity="0.8"
                    />
                  </filter>

                  {/* Marker Pulse Glow */}
                  <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background Grid Mesh */}
                <rect width="920" height="520" fill="url(#geo-grid)" />

                {/* Tier 1: World Map Country Polygons */}
                {level === "world" && (
                  <g className="world-countries">
                    {worldFeatures.map((feature: any, idx: number) => {
                      const numId = String(feature.id || "");
                      const isoCode = ISO_NUMERIC_TO_A2[numId] || "";
                      const countryData = countryMetricsMap.get(isoCode);
                      const isIndia = isoCode === "IN";
                      const isHovered = hoveredFeature?.id === isoCode;
                      const isHighlighted = highlightedId === isoCode;

                      const d = pathGenerator(feature);
                      if (!d) return null;

                      return (
                        <path
                          key={feature.id || idx}
                          d={d}
                          onClick={() => {
                            if (isIndia) handleSelectCountry("IN");
                          }}
                          onMouseEnter={(e) => {
                            if (!isoCode) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredFeature({
                              type: "country",
                              id: isoCode,
                              name: COUNTRY_A2_TO_NAME[isoCode] || `Country (${isoCode})`,
                              flag: getCountryFlag(isoCode),
                              views: countryData?.views || 0,
                              uniqueVisitors: countryData?.uniqueVisitors || 0,
                              percentage: countryData?.percentage || 0,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onMouseLeave={() => setHoveredFeature(null)}
                          className={`transition-all duration-200 ${
                            isIndia
                              ? "cursor-pointer"
                              : countryData
                              ? "cursor-default"
                              : "cursor-default"
                          }`}
                          style={{
                            fill: isHovered || isHighlighted
                              ? "#27272f"
                              : countryData
                              ? "#17171c"
                              : "#111114",
                            stroke: isHovered || isHighlighted
                              ? "#ffffff"
                              : countryData
                              ? "#383842"
                              : "#1e1e24",
                            strokeWidth: isHovered || isHighlighted ? 1.5 : 0.7,
                            filter: isHovered ? "url(#elevate-shadow)" : undefined,
                            transform: isHovered ? "translateY(-2px)" : "none",
                            transformOrigin: "center",
                          }}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Tier 2: India States & Union Territories */}
                {(level === "country" || level === "state" || level === "city") && (
                  <g className="india-states">
                    {indiaFeatures.map((feature: any, idx: number) => {
                      const stName = feature.properties?.NAME_1 || feature.properties?.st_nm || `State ${idx}`;
                      const stateData = stateMetricsMap.get(stName.toLowerCase());
                      const isHovered = hoveredFeature?.name.toLowerCase() === stName.toLowerCase();
                      const isHighlighted = highlightedId?.toLowerCase() === stName.toLowerCase();
                      const isSelected = selectedState?.toLowerCase() === stName.toLowerCase();

                      const d = pathGenerator(feature);
                      if (!d) return null;

                      return (
                        <path
                          key={stName || idx}
                          d={d}
                          onClick={() => handleSelectState(stName)}
                          onMouseEnter={(e) => {
                            setHoveredFeature({
                              type: "state",
                              id: stName,
                              name: stName,
                              views: stateData?.views || 0,
                              uniqueVisitors: stateData?.uniqueVisitors || 0,
                              percentage: stateData?.percentage || 0,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onMouseLeave={() => setHoveredFeature(null)}
                          className="cursor-pointer transition-all duration-200"
                          style={{
                            fill: isSelected
                              ? "#32323d"
                              : isHovered || isHighlighted
                              ? "#26262e"
                              : stateData
                              ? "#16161b"
                              : "#101013",
                            stroke: isSelected
                              ? "#ffffff"
                              : isHovered || isHighlighted
                              ? "#e4e4e7"
                              : stateData
                              ? "#3a3a45"
                              : "#222228",
                            strokeWidth: isSelected ? 2 : isHovered ? 1.5 : 0.8,
                            filter: isHovered || isSelected ? "url(#elevate-shadow)" : undefined,
                            transform: isHovered ? "translateY(-2px)" : "none",
                            transformOrigin: "center",
                          }}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Animated Great-Circle Traffic Routes */}
                {level === "world" && (
                  <g className="traffic-routes pointer-events-none">
                    {projectedRoutes.map((route) => (
                      <g key={route.id}>
                        {/* Static Subtle Track */}
                        <path
                          d={route.pathData}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.22)"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />

                        {/* Moving Glowing Dot */}
                        <circle r="3.5" fill="#ffffff" filter="url(#marker-glow)">
                          <animateMotion
                            path={route.pathData}
                            dur="4.5s"
                            repeatCount="indefinite"
                            rotate="auto"
                          />
                        </circle>
                      </g>
                    ))}
                  </g>
                )}

                {/* Centroid Circular Traffic Markers */}
                <g className="traffic-markers pointer-events-none">
                  {level === "world" &&
                    countries.map((c) => {
                      const pos = projection([c.lng, c.lat]);
                      if (!pos) return null;

                      // Scaled Radius: 4px to 18px
                      const radius = Math.min(
                        18,
                        Math.max(4, 4 + Math.sqrt(c.views / Math.max(1, totalTierViews)) * 24)
                      );

                      return (
                        <g key={c.code} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          {/* Ambient Pulsing Ring */}
                          <circle
                            r={radius + 4}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.25)"
                            strokeWidth="1"
                            opacity="0.6"
                          />
                          {/* Inner Core */}
                          <circle
                            r={radius}
                            fill="rgba(255, 255, 255, 0.85)"
                            filter="url(#marker-glow)"
                          />
                        </g>
                      );
                    })}

                  {/* India States Centroid Markers */}
                  {level === "country" &&
                    states.map((s) => {
                      const pos = projection([s.lng, s.lat]);
                      if (!pos) return null;

                      const radius = Math.min(
                        16,
                        Math.max(4, 4 + Math.sqrt(s.views / Math.max(1, totalTierViews)) * 20)
                      );

                      return (
                        <g key={s.name} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          <circle
                            r={radius + 3}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.3)"
                            strokeWidth="1"
                          />
                          <circle r={radius} fill="#ffffff" filter="url(#marker-glow)" />
                        </g>
                      );
                    })}

                  {/* City Tier Markers */}
                  {(level === "state" || level === "city") &&
                    cities.map((city) => {
                      const pos = projection([city.lng, city.lat]);
                      if (!pos) return null;

                      const radius = Math.min(
                        14,
                        Math.max(5, 5 + Math.sqrt(city.views / Math.max(1, totalTierViews)) * 16)
                      );
                      const isSelected = selectedCity?.toLowerCase() === city.name.toLowerCase();

                      return (
                        <g key={city.name} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          <circle
                            r={radius + 4}
                            fill="none"
                            stroke={isSelected ? "#10b981" : "rgba(255, 255, 255, 0.4)"}
                            strokeWidth="1.2"
                          />
                          <circle
                            r={radius}
                            fill={isSelected ? "#34d399" : "#ffffff"}
                            filter="url(#marker-glow)"
                          />
                          <text
                            y={-radius - 5}
                            textAnchor="middle"
                            className="fill-neutral-300 text-[10px] font-mono tracking-wider font-bold"
                          >
                            {city.name}
                          </text>
                        </g>
                      );
                    })}
                </g>
              </svg>

              {/* Geographical Level Indicator Pill */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#141418]/90 border border-[#26262c] text-[10px] text-neutral-400 font-mono flex items-center gap-2 backdrop-blur-md">
                <Layers className="w-3 h-3 text-neutral-400" />
                <span>
                  LEVEL: <strong className="text-white uppercase">{level}</strong>
                </span>
                <span>&bull;</span>
                <span className="text-neutral-500">
                  {level === "world"
                    ? "Click India to Zoom In"
                    : level === "country"
                    ? "Click State to Inspect Cities"
                    : "City Coordinates Active"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Tier Rankings Panel (Occupies 4 of 12 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0b0b0e] border border-[#1e1e23] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1f]">
            <div className="space-y-0.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
                {level === "world"
                  ? "GLOBAL TELEMETRY"
                  : level === "country"
                  ? "NATIONAL BREAKDOWN"
                  : "MUNICIPAL TELEMETRY"}
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                {level === "world"
                  ? "TOP 4 COUNTRIES BY VIEWS"
                  : level === "country"
                  ? "TOP 4 STATES BY VIEWS"
                  : "TOP 4 CITIES BY VIEWS"}
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16161a] border border-[#24242a] text-neutral-400 font-mono">
              Top 4
            </span>
          </div>

          {/* Top 4 Ranked Cards */}
          <div className="space-y-3 pt-1">
            {top4Items.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                No telemetry recorded for this tier yet.
              </div>
            ) : (
              top4Items.map((item, idx) => {
                const isHovered = highlightedId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    onMouseEnter={() => setHighlightedId(item.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group space-y-2 ${
                      isHovered
                        ? "bg-[#18181e] border-white/40 shadow-md translate-x-1"
                        : "bg-[#121215] border-[#222227] hover:border-[#383842] hover:bg-[#16161a]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-neutral-500 font-bold font-mono">
                          0{idx + 1}.
                        </span>
                        <span className="text-sm">{item.flag}</span>
                        <span className="text-white font-bold truncate group-hover:text-white transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-neutral-400 text-[11px] font-mono">
                          {item.views.toLocaleString()} views
                        </span>
                        <span className="text-white font-bold text-xs font-mono">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Subtle Linear Progress Bar */}
                    <div className="w-full h-1 bg-[#1a1a20] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-300 group-hover:bg-white transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Live Visitor Traffic Footprint Note */}
          <div className="pt-3 border-t border-[#18181c] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Aggregated Unique Visitors:</span>
            <span className="text-white font-bold">
              {countries.reduce((acc, c) => acc + c.uniqueVisitors, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredFeature && (
        <div
          className="fixed pointer-events-none z-50 px-3.5 py-2.5 rounded-xl bg-[#141418]/95 border border-[#2b2b32] text-xs text-left shadow-2xl backdrop-blur-md space-y-1 font-mono"
          style={{
            left: `${hoveredFeature.x + 16}px`,
            top: `${hoveredFeature.y - 45}px`,
          }}
        >
          <div className="flex items-center gap-2 font-bold text-white">
            {hoveredFeature.flag && <span>{hoveredFeature.flag}</span>}
            <span>{hoveredFeature.name}</span>
          </div>
          <div className="space-y-0.5 text-[11px] text-neutral-400">
            <div className="flex items-center justify-between gap-4">
              <span>Total Views:</span>
              <strong className="text-white">{hoveredFeature.views.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Unique Visitors:</span>
              <strong className="text-emerald-400">
                {hoveredFeature.uniqueVisitors.toLocaleString()}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Traffic Share:</span>
              <strong className="text-white">{hoveredFeature.percentage}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Educational "About Analytics" Drawer */}
      <AnimatePresence>
        {aboutOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-[#0e0e12] border border-[#222228] p-5 space-y-4 text-xs font-mono text-neutral-400 text-left overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-2 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold uppercase tracking-wider text-xs">
                  ABOUT GEOGRAPHICAL AUDIENCE INTELLIGENCE
                </span>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-[11px] leading-relaxed">
              <div className="space-y-1">
                <span className="text-white font-semibold block">1. Geolocation Estimation</span>
                <p>
                  Visitor locations are derived from anonymous proxy headers (Vercel/Cloudflare) and maintained GeoIP databases. Geolocation identifies approximate country and state centroids; no exact individual street coordinates are ever stored or queried.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-white font-semibold block">2. Privacy-Preserving Deduplication</span>
                <p>
                  Unique visitors are tracked via anonymous cryptographic session hashes (`SHA-256` salted). Raw IP addresses are never permanently retained in our database, ensuring full compliance with GDPR and global privacy standards.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-white font-semibold block">3. Traffic Sources & Routes</span>
                <p>
                  Curved geodesic vectors visualize active telemetry pathways between visitor regional nodes and server infrastructure. Routes represent validated aggregate traffic patterns across your chosen time filter.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

