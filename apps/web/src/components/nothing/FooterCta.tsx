"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./Button";

export const FooterCta: React.FC = () => {
  const [handle, setHandle] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean) {
      router.push(`/register?claim=${encodeURIComponent(clean)}`);
    } else {
      router.push("/register");
    }
  };

  return (
    <section className="w-full bg-[#050505] py-24 px-4 sm:px-6 nt-dot-grid border-b border-[#1a1a1a]">
      <div className="max-w-4xl mx-auto bg-[#0d0d0d] border-2 border-[#2b2b2b] rounded-3xl p-8 sm:p-14 text-center space-y-8 nt-crosshair shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#2e2e2e] text-xs font-mono text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          RESERVE YOUR PERMANENT IDENTITY
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-mono">
            CLAIM YOUR HANDLE TODAY.
          </h2>
          <p className="text-sm font-mono text-neutral-400 max-w-lg mx-auto">
            Join over 1,420,000 creators, developers, and designers on the premier Nothing-inspired digital identity platform.
          </p>
        </div>

        {user ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] text-center font-mono text-xs">
              <span className="text-neutral-500 block text-[10px] uppercase tracking-widest mb-1">Signed in as</span>
              <span className="text-white font-bold text-sm block">@{user.username}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="solid-white"
                href="/account"
                className="w-full sm:flex-1 justify-center text-xs py-2.5"
                icon={<ArrowRight size={13} />}
              >
                ACCOUNT STUDIO
              </Button>
              <Button
                variant="outline"
                href={`/${user.username}`}
                className="w-full sm:flex-1 justify-center text-xs py-2.5"
                icon={<ExternalLink size={13} />}
              >
                VIEW PROFILE
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex items-center bg-[#141414] border border-[#2d2d2d] hover:border-[#444444] focus-within:border-white rounded-xl p-1.5 transition-all">
              <span className="px-3.5 text-xs sm:text-sm font-mono text-neutral-500 select-none">
                pixel.gg/
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourname"
                className="bg-transparent flex-1 text-white font-mono text-sm placeholder:text-neutral-600 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black px-5 py-2.5 rounded-lg font-mono text-xs font-semibold tracking-tight flex items-center gap-1.5 transition-colors shrink-0"
              >
                CLAIM <ArrowRight size={13} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-mono text-neutral-500">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-neutral-400" /> Free permanent link
              </span>
              <span>&bull;</span>
              <span>Zero credit card required</span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

