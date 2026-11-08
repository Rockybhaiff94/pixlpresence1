"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Palette,
  MousePointerClick,
  Share2,
  Gamepad2,
  LayoutTemplate,
  ExternalLink,
  ArrowLeft,
  Menu,
  X,
  Shield,
  Activity,
  Lock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const { user, status, loading: authLoading } = useAuth();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "01 // OVERVIEW", subtitle: "Telemetry & Status" },
    { href: "/dashboard/bio", icon: User, label: "02 // IDENTITY", subtitle: "Handle, Bio & Avatar" },
    { href: "/dashboard/customize", icon: Palette, label: "03 // THEME & FX", subtitle: "Monochrome & Blur" },
    { href: "/dashboard/buttons", icon: MousePointerClick, label: "04 // BUTTONS", subtitle: "Action Buttons & Links" },
    { href: "/dashboard/socials", icon: Share2, label: "05 // SOCIALS", subtitle: "External Profiles" },
    { href: "/dashboard/rpc", icon: Gamepad2, label: "06 // DISCORD RPC", subtitle: "PixelsRPC Vencord" },
    { href: "/dashboard/templates", icon: LayoutTemplate, label: "07 // TEMPLATES", subtitle: "Industrial Presets" },
  ];

  return (
    <div className="flex h-screen bg-[#060606] text-[#ededed] font-mono overflow-hidden selection:bg-white selection:text-black">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-[#1a1a1a] bg-[#090909] flex-col hidden lg:flex select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#161616]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold text-xs">
              P
            </div>
            <div>
              <p className="font-bold text-sm text-white tracking-wider">PIXEL.GG STUDIO</p>
              <p className="text-[10px] text-neutral-500 font-normal">NOTHING OS // REV 2.4</p>
            </div>
          </Link>
        </div>

        {/* Live Status Chip */}
        <div className="px-6 py-3 border-b border-[#141414] bg-[#0c0c0c] text-[10px] text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] animate-pulse" />
            STUDIO CLUSTER: ONLINE
          </span>
          <span className="text-neutral-500">PROD-01</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all duration-150 ${
                  isActive
                    ? "bg-white text-black font-semibold shadow-md"
                    : "text-neutral-400 hover:text-white hover:bg-[#141414]"
                }`}
              >
                <item.icon size={16} className={isActive ? "text-black shrink-0" : "text-neutral-500 shrink-0"} />
                <div className="truncate">
                  <p className="truncate leading-tight">{item.label}</p>
                  <p className={`text-[10px] truncate ${isActive ? "text-neutral-700" : "text-neutral-600"}`}>
                    {item.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#161616] space-y-2 bg-[#090909]">
          <a
            href="/hris"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] text-white border border-[#242424] text-xs flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5 text-neutral-300">
              <ExternalLink size={13} />
              VIEW LIVE PROFILE
            </span>
            <span className="text-[10px] text-neutral-500">/hris</span>
          </a>

          <Link
            href="/"
            className="w-full py-2 px-3 text-neutral-500 hover:text-white text-xs flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>RETURN TO HOMEPAGE</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#1a1a1a] bg-[#080808]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 text-neutral-400 hover:text-white rounded border border-[#242424] bg-[#121212]"
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span className="text-xs text-neutral-400 hidden sm:inline">
              WORKSPACE: <strong className="text-white">DEFAULT PROFILE STUDIO</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="/pricing"
              className="px-2.5 py-1 rounded bg-[#161616] border border-[#292929] hover:border-white text-white transition-colors text-[11px]"
            >
              UPGRADE // 7,99€
            </a>
            <span className="text-neutral-500 text-[11px] hidden sm:inline">
              AUTOSYNC: <span className="text-white">ACTIVE</span>
            </span>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-[#0c0c0c] border-b border-[#222222] p-4 space-y-2 animate-in fade-in duration-150">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-neutral-300 hover:text-white hover:bg-[#161616]"
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-[#1c1c1c]">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-400"
              >
                <ArrowLeft size={14} /> Back to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Scrollable Children Canvas with Auth Protection */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#060606] nt-dot-grid">
          {status === "INITIALIZING" && !user ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <RefreshCw size={24} className="animate-spin text-white" />
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
                [ INITIALIZING STUDIO // VERIFYING IDENTITY ]
              </p>
            </div>
          ) : !user && !authLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[65vh] p-8 max-w-lg mx-auto text-center space-y-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500">
                <Lock size={26} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">
                  [ 401 // ACCESS RESTRICTED ]
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
                  AUTHENTICATION REQUIRED
                </h2>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  You must be signed in to configure your profile studio, theme, buttons, and Discord RPC.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs font-mono text-center hover:bg-neutral-200 transition-colors"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/register"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#141414] border border-[#262626] text-white font-bold text-xs font-mono text-center hover:bg-[#1a1a1a] transition-colors"
                >
                  CLAIM PROFILE
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
