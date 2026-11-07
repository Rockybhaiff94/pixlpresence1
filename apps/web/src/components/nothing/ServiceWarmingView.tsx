"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Radio, ArrowLeft, Home } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

interface ServiceWarmingViewProps {
  username: string;
}

export const ServiceWarmingView: React.FC<ServiceWarmingViewProps> = ({ username }) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-20 px-4 nt-dot-grid">
        <div className="w-full max-w-lg bg-[#0c0c0c] border border-[#242424] rounded-2xl p-10 text-center space-y-6 shadow-2xl nt-crosshair">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#2e2e2e] text-xs text-amber-400">
            <Radio size={13} className="animate-pulse" />
            <span>SYS.CONNECTING // CLUSTER_SPIN_UP</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              CONNECTING TO IDENTITY
            </h1>
            <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-sm mx-auto">
              Digital identity <span className="text-white font-mono font-bold">@{username}</span> is valid. The backend service cluster is currently initializing from standby.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] text-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span>INITIALIZING PROFILE DATA</span>
              <span className="font-bold text-white">{countdown}s</span>
            </div>
            <div className="w-full h-1.5 bg-[#222222] rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="solid-white"
              onClick={() => window.location.reload()}
              className="text-xs"
              icon={<RefreshCw size={13} className="animate-spin" />}
            >
              RECONNECT NOW ({countdown}s)
            </Button>
            <Button variant="outline" href="/" className="text-xs" icon={<Home size={13} />}>
              RETURN TO HOMEPAGE
            </Button>
          </div>

          <div className="pt-4 text-[10px] text-neutral-600 border-t border-[#1a1a1a]">
            STATUS: INITIALIZING NODES // CLUSTER: NOT-US-EAST
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

