"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "EXPLORE", href: "/#showcase" },
    { label: "PRICING", href: "/pricing" },
    { label: "LEADERBOARD", href: "/leaderboard" },
    { label: "COMPARE", href: "/compare" },
    { label: "RPC PLUGIN", href: "/dashboard/rpc" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#080808]/90 backdrop-blur-md border-b border-[#1f1f1f]">
      {/* Top Technical Metadata Bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-1 border-b border-[#141414] text-[10px] font-mono text-neutral-500 tracking-wider">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d71920] animate-pulse" />
            SYS.ONLINE // PIXEL_OS 2.4
          </span>
          <span>LAT 37.7749° N</span>
          <span>LONG 122.4194° W</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-neutral-400">STATUS: PROD_READY</span>
          <span className="text-neutral-500">REF: NOT-01-HW</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-mono font-bold text-xs tracking-tighter group-hover:bg-neutral-200 transition-colors"
          >
            P
          </motion.div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold tracking-wider text-white flex items-center gap-1.5">
              PIXEL.GG
              <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 font-normal">
                (01)
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#121212] px-2 py-1.5 rounded-full border border-[#222222]">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative px-3.5 py-1 rounded-full text-xs font-mono tracking-wider transition-colors duration-150 ${
                  isActive
                    ? "text-black font-medium"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-white rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-mono text-neutral-300 hover:text-white transition-colors"
          >
            SIGN IN
          </Link>
          <Button
            variant="solid-white"
            href="/register"
            className="text-xs px-4 py-2 rounded-full"
            icon={<ArrowUpRight size={13} />}
          >
            CLAIM PROFILE
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-neutral-400 hover:text-white rounded border border-[#242424] bg-[#121212] cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </motion.button>
      </div>

      {/* Mobile Dropdown Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="lg:hidden bg-[#0a0a0a] border-b border-[#222222] px-4 py-6 space-y-4 overflow-hidden"
          >
            <div className="flex flex-col space-y-2">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded font-mono text-sm text-neutral-300 hover:text-white hover:bg-[#161616] flex items-center justify-between"
                >
                  {item.label}
                  <ArrowUpRight size={14} className="text-neutral-500" />
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-[#1a1a1a] flex flex-col gap-2.5">
              <Button
                variant="outline"
                href="/login"
                className="w-full justify-center text-xs"
                onClick={() => setMobileMenuOpen(false)}
              >
                SIGN IN
              </Button>
              <Button
                variant="solid-white"
                href="/register"
                className="w-full justify-center text-xs"
                onClick={() => setMobileMenuOpen(false)}
              >
                CLAIM PROFILE
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
