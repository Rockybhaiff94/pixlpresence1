"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, Shield, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    // Warm up the Render backend in the background so OAuth is instant
    fetch("/health").catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Forward to internal session login
      window.location.href = `/api/auth/login?email=${encodeURIComponent(email)}`;
    } catch {
      setError("Sign-in failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 nt-dot-grid">
        <div className="w-full max-w-md bg-[#0d0d0d] border border-[#242424] rounded-2xl p-8 space-y-6 shadow-2xl nt-crosshair">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
              [ AUTH // ACCESS CONTROL ]
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SIGN IN TO PIXEL.GG
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              Enter credentials or authenticate with OAuth.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#2a0e0e] border border-[#d71920]/40 text-[#ff6b6b] text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-2.5">
            <a
              href="/auth/discord"
              className="w-full py-2.5 px-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-white border border-[#2a2a2a] text-xs flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
              </svg>
              <span>CONTINUE WITH DISCORD</span>
            </a>

            <a
              href="/auth/google"
              className="w-full py-2.5 px-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-white border border-[#2a2a2a] text-xs flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V13.4h6.887C18.2 16.035 15.65 18 12.24 18c-3.37 0-6.1-2.73-6.1-6.1s2.73-6.1 6.1-6.1c1.53 0 2.92.56 4 1.48l2.36-2.36C17.18 3.52 14.88 2.7 12.24 2.7 7.14 2.7 3 6.84 3 11.94s4.14 9.24 9.24 9.24c5.33 0 8.87-3.75 8.87-9.03 0-.6-.06-1.18-.17-1.86h-8.7z" />
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </a>
          </div>

          <div className="flex items-center gap-3 text-neutral-600 text-[10px]">
            <div className="flex-1 h-px bg-[#202020]" />
            <span>OR AUTHENTICATE WITH EMAIL</span>
            <div className="flex-1 h-px bg-[#202020]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] text-neutral-400 font-semibold">EMAIL ADDRESS</label>
              <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
                <Mail size={14} className="text-neutral-500 mr-2.5 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-neutral-400 font-semibold">PASSWORD</label>
                <Link href="/recovery" className="text-neutral-500 hover:text-white transition-colors">
                  FORGOT?
                </Link>
              </div>
              <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
                <Lock size={14} className="text-neutral-500 mr-2.5 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="solid-white"
              type="submit"
              loading={loading}
              className="w-full justify-center text-xs py-2.5"
            >
              AUTHENTICATE <ArrowRight size={13} />
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center pt-2 text-xs text-neutral-500 border-t border-[#1a1a1a]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white hover:underline font-bold">
              Claim a handle
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

