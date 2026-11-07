"use client";

import React from "react";
import Link from "next/link";
import { ArrowUp, Terminal, Shield, Cpu } from "lucide-react";

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full bg-[#050505] border-t border-[#1a1a1a] text-neutral-400 font-mono text-xs">
      {/* Upper Technical Banner */}
      <div className="border-b border-[#141414] px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="text-white font-semibold tracking-wider">
              PIXEL.GG HARDWARE & SOFTWARE SPECIFICATION
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} className="text-neutral-400" /> API: READY
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={12} className="text-neutral-400" /> ENCRYPTION: TLS 1.3
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu size={12} className="text-neutral-400" /> RUNTIME: NEXT 16 / EDGE
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Directory */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Summary */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold text-xs">
              P
            </div>
            <span className="text-white text-sm font-bold tracking-wider">
              PIXEL.GG (01)
            </span>
          </div>
          <p className="text-neutral-500 text-xs leading-relaxed max-w-sm">
            Minimalist, monochromatic digital identity platform and native Discord Rich Presence engine inspired by Nothing OS industrial design.
          </p>
          <div className="pt-2 text-[10px] text-neutral-600 space-y-1">
            <p>DESIGN SPECIFICATION: NOT-PHONE-OS</p>
            <p>MODEL NUMBER: PX-2026-REV4</p>
            <p>SERIAL: 9482-1082-PX1</p>
          </div>
        </div>

        {/* Directory Column 1: Products */}
        <div className="space-y-3">
          <p className="text-white text-xs font-semibold tracking-widest uppercase">
            [ 01 // PLATFORM ]
          </p>
          <ul className="space-y-2 text-neutral-400">
            <li>
              <Link href="/register" className="hover:text-white transition-colors">
                Claim Handle
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Premium Plans
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="hover:text-white transition-colors">
                Ranked Creators
              </Link>
            </li>
            <li>
              <Link href="/dashboard/rpc" className="hover:text-white transition-colors">
                PixelsRPC Plugin
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Studio Editor
              </Link>
            </li>
          </ul>
        </div>

        {/* Directory Column 2: Comparisons */}
        <div className="space-y-3">
          <p className="text-white text-xs font-semibold tracking-widest uppercase">
            [ 02 // COMPARE ]
          </p>
          <ul className="space-y-2 text-neutral-400">
            <li>
              <Link href="/compare" className="hover:text-white transition-colors">
                Overview Matrix
              </Link>
            </li>
            <li>
              <Link href="/compare#linktree" className="hover:text-white transition-colors">
                vs Linktree
              </Link>
            </li>
            <li>
              <Link href="/compare#beacons" className="hover:text-white transition-colors">
                vs Beacons
              </Link>
            </li>
            <li>
              <Link href="/compare#carrd" className="hover:text-white transition-colors">
                vs Carrd
              </Link>
            </li>
            <li>
              <Link href="/compare#guns" className="hover:text-white transition-colors">
                vs Guns.lol
              </Link>
            </li>
          </ul>
        </div>

        {/* Directory Column 3: Legal & Support */}
        <div className="space-y-3">
          <p className="text-white text-xs font-semibold tracking-widest uppercase">
            [ 03 // LEGAL ]
          </p>
          <ul className="space-y-2 text-neutral-400">
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/recovery" className="hover:text-white transition-colors">
                Account Recovery
              </Link>
            </li>
            <li>
              <a
                href="https://discord.gg/pixelgg"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Community Discord ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#141414] px-6 py-6 text-[11px] text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} PIXEL.GG. ALL RIGHTS RESERVED. NOT AFFILIATED WITH NOTHING TECHNOLOGY LTD.</p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            BACK TO TOP <ArrowUp size={12} />
          </button>
        </div>
      </div>
    </footer>
  );
};

