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
  Sun,
  Moon,
  Compass,
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

  // Map Color Mode: "obsidian" (dark) or "contrast" (crisp white landmass, black borders)
  const [mapTheme, setMapTheme] = useState<"obsidian" | "contrast">("obsidian");

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

  // Compute India State Features (36 states and UTs, accurate northern boundary)
  const indiaFeatures = useMemo(() => {
    if (!indiaGeo) return [];
    return indiaGeo.features || [];
  }, [indiaGeo]);

  // Dynamic D3 Projection & Path Generator (Filling 85-90% of SVG canvas: 920 x 520)
  const { pathGenerator, projection } = useMemo(() => {
    if (level === "world") {
      if (worldFeatures.length > 0) {
        // Fit world features to 920x520 canvas with 15px padding for 88-92% fill
        const proj = d3Geo
          .geoNaturalEarth1()
          .fitExtent(
            [[15, 15], [905, 505]],
            { type: "FeatureCollection", features: worldFeatures } as any
          );
        return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
      }
      const proj = d3Geo.geoNaturalEarth1().scale(175).translate([460, 260]);
      return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
    }

    if (level === "country" && (selectedCountry === "IN" || !selectedCountry)) {
      if (indiaFeatures.length > 0) {
        // Fit full 36-state India to 920x520 canvas with crisp margins
        const proj = d3Geo
          .geoMercator()
          .fitExtent(
            [[30, 20], [890, 500]],
            { type: "FeatureCollection", features: indiaFeatures } as any
          );
        return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
      }
      const proj = d3Geo.geoMercator().center([82, 22]).scale(1050).translate([460, 260]);
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
          .fitExtent([[50, 30], [870, 490]], stateFeature);
        return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
      }
    }

    // Default Fallback
    const proj = d3Geo.geoNaturalEarth1().scale(175).translate([460, 260]);
    return { pathGenerator: d3Geo.geoPath().projection(proj), projection: proj };
  }, [level, selectedCountry, selectedState, worldFeatures, indiaFeatures]);

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

  // Key Global Hubs / Cities for World Map (real lat/lng)
  const globalHubCities = useMemo(() => {
    return [
      { name: "New York", country: "US", lat: 40.7128, lng: -74.006, views: 185 },
      { name: "London", country: "GB", lat: 51.5074, lng: -0.1278, views: 124 },
      { name: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821, views: 92 },
      { name: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503, views: 68 },
      { name: "Sydney", country: "AU", lat: -33.8688, lng: 151.2093, views: 42 },
      { name: "Mumbai", country: "IN", lat: 19.076, lng: 72.8777, views: 320 },
      { name: "Bengaluru", country: "IN", lat: 12.9716, lng: 77.5946, views: 145 },
      { name: "Delhi", country: "IN", lat: 28.6139, lng: 77.209, views: 180 },
    ];
  }, []);

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

  // Animated Curved Flight Routes for World View
  const projectedRoutes = useMemo(() => {
    if (level !== "world" || !projection || routes.length === 0) return [];

    return routes
      .map((r) => {
        const p1 = projection([r.origin.lng, r.origin.lat]);
        const p2 = projection([r.destination.lng, r.destination.lat]);
        if (!p1 || !p2) return null;

        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dist = Math.hypot(dx, dy);
        if (dist < 10) return null;

        // Quadratic control point curvature for elegant flight trajectory
        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2 - Math.min(65, dist * 0.28);

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

  // Find the active/hovered feature for elevated rendering on top of SVG DOM
  const activeHoverFeature = useMemo(() => {
    if (!hoveredFeature) return null;
    if (level === "world") {
      return worldFeatures.find((f: any) => {
        const numId = String(f.id || "");
        const iso = ISO_NUMERIC_TO_A2[numId];
        return iso === hoveredFeature.id;
      });
    }
    if (level === "country" || level === "state") {
      return indiaFeatures.find((f: any) => {
        const stName = f.properties?.NAME_1 || f.properties?.st_nm || "";
        return stName.toLowerCase() === hoveredFeature.name.toLowerCase();
      });
    }
    return null;
  }, [hoveredFeature, level, worldFeatures, indiaFeatures]);

  return (
    <div className="rounded-2xl bg-[#09090b] border border-[#1e1e24] p-5 sm:p-7 space-y-6 shadow-2xl relative font-mono text-left select-none overflow-hidden">
      {/* 1. Header with Breadcrumbs, Live Pulse, Theme Mode, and Filters */}
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

        {/* Controls: Back Button, Theme Switcher, Time Range Pills, Info */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {level !== "world" && (
            <button
              onClick={
                level === "city"
                  ? handleResetToCountry
                  : level === "state"
                  ? handleResetToCountry
                  : handleResetToWorld
              }
              className="px-3 py-1.5 rounded-xl bg-[#141416] border border-[#26262b] text-neutral-300 hover:text-white hover:border-neutral-500 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Map Theme Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#121214] p-1 rounded-xl border border-[#202024] text-xs">
            <button
              onClick={() => setMapTheme("obsidian")}
              title="Obsidian Dark Map"
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                mapTheme === "obsidian"
                  ? "bg-white text-black font-bold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              onClick={() => setMapTheme("contrast")}
              title="Crisp White Map / Black Borders"
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                mapTheme === "contrast"
                  ? "bg-white text-black font-bold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Contrast</span>
            </button>
          </div>

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
        <div
          className={`lg:col-span-8 rounded-2xl border p-3 sm:p-5 relative min-h-[400px] sm:min-h-[480px] flex items-center justify-center overflow-hidden group transition-colors duration-300 ${
            mapTheme === "contrast"
              ? "bg-[#0b0c10] border-[#22242a]"
              : "bg-[#0b0b0e] border-[#1e1e24]"
          }`}
        >
          {geoLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-500 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-white" />
              <span>CALIBRATING HIGH-PRECISION GEOGRAPHICAL MESH...</span>
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
                      stroke={
                        mapTheme === "contrast"
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(255, 255, 255, 0.025)"
                      }
                      strokeWidth="1"
                    />
                  </pattern>

                  {/* Drop Shadow for Elevated Hover */}
                  <filter id="elevate-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow
                      dx="0"
                      dy="6"
                      stdDeviation="8"
                      floodColor="#000000"
                      floodOpacity="0.9"
                    />
                  </filter>

                  {/* Marker Pulse Glow */}
                  <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
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

                      // Theme colors
                      let fill = "#111115";
                      let stroke = "#1e1e26";
                      let strokeWidth = 0.7;

                      if (mapTheme === "contrast") {
                        fill = countryData ? "#ffffff" : "#ececed";
                        stroke = "#111114";
                        strokeWidth = 0.8;
                        if (isHovered || isHighlighted) {
                          fill = "#f4f4f5";
                          stroke = "#000000";
                          strokeWidth = 1.6;
                        }
                      } else {
                        // Obsidian Theme
                        fill = isHovered || isHighlighted
                          ? "#262632"
                          : countryData
                          ? "#181820"
                          : "#101014";
                        stroke = isHovered || isHighlighted
                          ? "#ffffff"
                          : countryData
                          ? "#383845"
                          : "#1e1e24";
                        strokeWidth = isHovered || isHighlighted ? 1.5 : 0.7;
                      }

                      return (
                        <path
                          key={feature.id || idx}
                          d={d}
                          onClick={() => {
                            if (isIndia) handleSelectCountry("IN");
                          }}
                          onMouseEnter={(e) => {
                            if (!isoCode) return;
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
                          className={`transition-colors duration-150 ${
                            isIndia
                              ? "cursor-pointer"
                              : countryData
                              ? "cursor-default"
                              : "cursor-default"
                          }`}
                          style={{
                            fill,
                            stroke,
                            strokeWidth,
                          }}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Tier 2: India States & Union Territories (Complete 36 states, no northern clipping) */}
                {(level === "country" || level === "state" || level === "city") && (
                  <g className="india-states">
                    {indiaFeatures.map((feature: any, idx: number) => {
                      const stName =
                        feature.properties?.NAME_1 ||
                        feature.properties?.st_nm ||
                        `State ${idx}`;
                      const stateData = stateMetricsMap.get(stName.toLowerCase());
                      const isHovered =
                        hoveredFeature?.name.toLowerCase() === stName.toLowerCase();
                      const isHighlighted =
                        highlightedId?.toLowerCase() === stName.toLowerCase();
                      const isSelected =
                        selectedState?.toLowerCase() === stName.toLowerCase();

                      const d = pathGenerator(feature);
                      if (!d) return null;

                      let fill = "#101013";
                      let stroke = "#222228";
                      let strokeWidth = 0.8;

                      if (mapTheme === "contrast") {
                        fill = isSelected
                          ? "#e0e0e4"
                          : stateData
                          ? "#ffffff"
                          : "#ececed";
                        stroke = isSelected
                          ? "#000000"
                          : isHovered || isHighlighted
                          ? "#000000"
                          : "#18181c";
                        strokeWidth = isSelected ? 2 : isHovered ? 1.6 : 0.9;
                      } else {
                        // Obsidian Theme
                        fill = isSelected
                          ? "#2e2e38"
                          : isHovered || isHighlighted
                          ? "#262632"
                          : stateData
                          ? "#16161c"
                          : "#101014";
                        stroke = isSelected
                          ? "#ffffff"
                          : isHovered || isHighlighted
                          ? "#e4e4e7"
                          : stateData
                          ? "#3a3a46"
                          : "#202026";
                        strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 0.8;
                      }

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
                          className="cursor-pointer transition-colors duration-150"
                          style={{
                            fill,
                            stroke,
                            strokeWidth,
                          }}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Top Overlay Layer: Render hovered feature on top so its stroke is never clipped */}
                {activeHoverFeature && pathGenerator(activeHoverFeature) && (
                  <path
                    d={pathGenerator(activeHoverFeature)!}
                    className="pointer-events-none"
                    style={{
                      fill: mapTheme === "contrast" ? "#ffffff" : "#2d2d3a",
                      stroke: mapTheme === "contrast" ? "#000000" : "#ffffff",
                      strokeWidth: 2,
                      filter: "url(#elevate-shadow)",
                    }}
                  />
                )}

                {/* Animated Curved Geodesic Routes for World View */}
                {level === "world" && (
                  <g className="traffic-routes pointer-events-none">
                    {projectedRoutes.map((route) => (
                      <g key={route.id}>
                        {/* Static Subtle Track */}
                        <path
                          d={route.pathData}
                          fill="none"
                          stroke={
                            mapTheme === "contrast"
                              ? "rgba(10, 10, 15, 0.45)"
                              : "rgba(255, 255, 255, 0.28)"
                          }
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />

                        {/* Moving Glowing Tracer Dot */}
                        <circle
                          r="2.8"
                          fill={mapTheme === "contrast" ? "#09090b" : "#ffffff"}
                          filter="url(#marker-glow)"
                        >
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

                {/* Micro-Dot Pulsing Location Markers (Refined, small, precise) */}
                <g className="traffic-markers pointer-events-none">
                  {/* World View: Plot Global Hub Cities as refined micro-dots */}
                  {level === "world" &&
                    globalHubCities.map((city) => {
                      const pos = projection([city.lng, city.lat]);
                      if (!pos) return null;

                      const isIndiaCity = city.country === "IN";
                      const dotColor =
                        mapTheme === "contrast"
                          ? isIndiaCity
                            ? "#10b981"
                            : "#18181b"
                          : isIndiaCity
                          ? "#34d399"
                          : "#ffffff";

                      return (
                        <g key={city.name} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          {/* Pulsing Concentric Ripple */}
                          <circle
                            r="7"
                            fill="none"
                            stroke={dotColor}
                            strokeWidth="1"
                            opacity="0.4"
                          >
                            <animate
                              attributeName="r"
                              values="3;9"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.6;0"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          {/* Precise Micro Core */}
                          <circle r="3" fill={dotColor} filter="url(#marker-glow)" />
                        </g>
                      );
                    })}

                  {/* India Level: Centroid City Micro-Dots */}
                  {level === "country" &&
                    states.map((s) => {
                      const pos = projection([s.lng, s.lat]);
                      if (!pos) return null;

                      const dotColor = mapTheme === "contrast" ? "#18181b" : "#ffffff";

                      return (
                        <g key={s.name} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          <circle
                            r="7"
                            fill="none"
                            stroke={dotColor}
                            strokeWidth="1"
                            opacity="0.4"
                          >
                            <animate
                              attributeName="r"
                              values="3;9"
                              dur="2.8s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.5;0"
                              dur="2.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          <circle r="3.2" fill={dotColor} filter="url(#marker-glow)" />
                        </g>
                      );
                    })}

                  {/* State / City Level: Precise Municipal Nodes */}
                  {(level === "state" || level === "city") &&
                    cities.map((city) => {
                      const pos = projection([city.lng, city.lat]);
                      if (!pos) return null;

                      const isSelected =
                        selectedCity?.toLowerCase() === city.name.toLowerCase();

                      return (
                        <g key={city.name} transform={`translate(${pos[0]}, ${pos[1]})`}>
                          {/* Pulsing Ripple */}
                          <circle
                            r="8"
                            fill="none"
                            stroke={isSelected ? "#10b981" : "rgba(255, 255, 255, 0.4)"}
                            strokeWidth="1.2"
                          >
                            <animate
                              attributeName="r"
                              values="4;12"
                              dur="2.2s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.7;0"
                              dur="2.2s"
                              repeatCount="indefinite"
                            />
                          </circle>

                          <circle
                            r="3.5"
                            fill={isSelected ? "#34d399" : "#ffffff"}
                            filter="url(#marker-glow)"
                          />
                          <text
                            y={-9}
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

        {/* Right Column: Dynamic Tier Rankings Panel (Occupies 4 of 12 cols, 21st.dev inspired) */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0b0b0e] border border-[#1e1e24] p-5 space-y-4">
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

          {/* Top 4 Ranked Cards (21st.dev style) */}
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

      {/* Floating Hover Tooltip (Clamped to viewport) */}
      {hoveredFeature && (
        <div
          className="fixed pointer-events-none z-50 px-3.5 py-2.5 rounded-xl bg-[#141418]/95 border border-[#2b2b32] text-xs text-left shadow-2xl backdrop-blur-md space-y-1 font-mono"
          style={{
            left: `${Math.min(window.innerWidth - 220, hoveredFeature.x + 16)}px`,
            top: `${Math.max(20, hoveredFeature.y - 50)}px`,
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
