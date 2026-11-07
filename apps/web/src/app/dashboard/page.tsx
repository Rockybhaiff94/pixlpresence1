"use client";

import React from "react";
import Link from "next/link";
import {
  Eye,
  MousePointerClick,
  Users,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Palette,
  Share2,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/nothing/Button";

export default function DashboardOverviewPage() {
  const telemetry = [
    {
      metric: "142,890",
      label: "TOTAL PROFILE VIEWS",
      delta: "+18.4% THIS MONTH",
      icon: Eye,
    },
    {
      metric: "28,410",
      label: "BUTTON / LINK CLICKS",
      delta: "+9.2% THIS MONTH",
      icon: MousePointerClick,
    },
    {
      metric: "1,240",
      label: "PROFILE SHARES",
      delta: "+4.1% THIS MONTH",
      icon: Users,
    },
    {
      metric: "99.98%",
      label: "RPC SYNC UPTIME",
      delta: "PROTOCOL: ACTIVE",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8 font-mono">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1c1c1c] pb-6">
        <div className="space-y-1.5">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
            [ STUDIO // TELEMETRY OVERVIEW ]
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            PROFILE COMMAND CENTER.
          </h1>
          <p className="text-xs text-neutral-400 font-sans">
            Real-time telemetry and management deck for your digital identity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" href="/hris" external className="text-xs" icon={<ArrowUpRight size={13} />}>
            PREVIEW LIVE BIO
          </Button>
          <Button variant="solid-white" href="/dashboard/customize" className="text-xs">
            EDIT APPEARANCE
          </Button>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetry.map((t) => (
          <div
            key={t.label}
            className="bg-[#0c0c0c] border border-[#222222] rounded-xl p-5 space-y-3 nt-crosshair"
          >
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] uppercase font-bold">{t.label}</span>
              <t.icon size={15} className="text-neutral-400" />
            </div>

            <div className="text-3xl font-bold text-white tracking-tight">{t.metric}</div>

            <div className="text-[10px] text-neutral-400 font-semibold">{t.delta}</div>
          </div>
        ))}
      </div>

      {/* Quick Launchpad & Discord RPC Hardware Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discord RPC Status Card */}
        <div className="lg:col-span-2 bg-[#0c0c0c] border border-[#222222] rounded-2xl p-6 space-y-5 nt-crosshair">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
            <div className="flex items-center gap-2">
              <Gamepad2 size={16} className="text-white" />
              <h3 className="font-bold text-sm text-white">PIXELSRPC HARDWARE STATUS</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white text-black font-bold">
              CONNECTED
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center font-bold text-lg text-white shrink-0">
              VS
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Visual Studio Code</p>
              <p className="text-xs text-neutral-400 truncate">Editing Nothing OS Digital Identity</p>
              <p className="text-[10px] text-neutral-500 font-sans">
                Streaming live activity directly to your local Discord client via native Vencord IPC.
              </p>
            </div>
            <Button variant="outline" href="/dashboard/rpc" className="text-xs shrink-0 self-center sm:self-start">
              CONFIGURE RPC
            </Button>
          </div>
        </div>

        {/* Quick Launch Shortcuts */}
        <div className="bg-[#0c0c0c] border border-[#222222] rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white border-b border-[#1a1a1a] pb-3">
            QUICK ACCESS
          </h3>

          <div className="space-y-2">
            <Link
              href="/dashboard/bio"
              className="flex items-center justify-between p-3 rounded-lg bg-[#121212] hover:bg-[#181818] border border-[#202020] text-xs transition-colors"
            >
              <span className="text-neutral-300">Edit Handle & Bio</span>
              <ArrowUpRight size={13} className="text-neutral-500" />
            </Link>
            <Link
              href="/dashboard/customize"
              className="flex items-center justify-between p-3 rounded-lg bg-[#121212] hover:bg-[#181818] border border-[#202020] text-xs transition-colors"
            >
              <span className="text-neutral-300">Customize Theme & FX</span>
              <ArrowUpRight size={13} className="text-neutral-500" />
            </Link>
            <Link
              href="/dashboard/socials"
              className="flex items-center justify-between p-3 rounded-lg bg-[#121212] hover:bg-[#181818] border border-[#202020] text-xs transition-colors"
            >
              <span className="text-neutral-300">Manage Social Links</span>
              <ArrowUpRight size={13} className="text-neutral-500" />
            </Link>
            <Link
              href="/dashboard/templates"
              className="flex items-center justify-between p-3 rounded-lg bg-[#121212] hover:bg-[#181818] border border-[#202020] text-xs transition-colors"
            >
              <span className="text-neutral-300">Apply Style Templates</span>
              <ArrowUpRight size={13} className="text-neutral-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
