"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, User, Mail, Lock, ShieldCheck, Check } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialClaim = searchParams.get("claim") || "";

  const [username, setUsername] = useState(initialClaim);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialClaim) {
      setUsername(initialClaim.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
    }
  }, [initialClaim]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }
    setError("");
    setLoading(true);

    // Forward to OAuth / account registration
    window.location.href = `/auth/discord?claim=${encodeURIComponent(username)}`;
  };

  return (
    <div className="w-full max-w-md bg-[#0d0d0d] border border-[#242424] rounded-2xl p-8 space-y-6 shadow-2xl nt-crosshair">
      <div className="space-y-1.5 text-center">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
          [ ONBOARDING // HANDLE RESERVATION ]
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
          CLAIM YOUR IDENTITY.
        </h1>
        <p className="text-xs text-neutral-400 font-sans">
          Permanent zero-cost bio profile and Discord Rich Presence.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#2a0e0e] border border-[#d71920]/40 text-[#ff6b6b] text-xs">
          {error}
        </div>
      )}

      {/* Live Handle Preview Badge */}
      <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] font-mono text-xs flex items-center justify-between">
        <span className="text-neutral-500">RESERVED URL:</span>
        <span className="text-white font-bold tracking-wide">
          pixel.gg/{username || "username"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {/* Username */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] text-neutral-400 font-semibold">HANDLE (USERNAME)</label>
          <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
            <span className="text-neutral-500 mr-1.5 select-none font-bold">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="desired_handle"
              className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] text-neutral-400 font-semibold">EMAIL ADDRESS</label>
          <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
            <Mail size={14} className="text-neutral-500 mr-2.5 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] text-neutral-400 font-semibold">PASSWORD</label>
          <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
            <Lock size={14} className="text-neutral-500 mr-2.5 shrink-0" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
              required
            />
          </div>
        </div>

        <Button
          variant="solid-white"
          type="submit"
          loading={loading}
          className="w-full justify-center text-xs py-3"
        >
          CREATE ACCOUNT <ArrowRight size={13} />
        </Button>
      </form>

      <div className="space-y-2 text-center text-xs text-neutral-500 border-t border-[#1a1a1a] pt-4 font-mono">
        <p>
          Already have a handle?{" "}
          <Link href="/login" className="text-white hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 nt-dot-grid">
        <Suspense fallback={<div className="text-neutral-500 font-mono text-xs">LOADING REGISTRATION ENGINE...</div>}>
          <RegisterContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

