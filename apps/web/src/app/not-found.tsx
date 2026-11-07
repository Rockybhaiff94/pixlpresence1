import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-20 px-4 nt-dot-grid">
        <div className="w-full max-w-lg bg-[#0c0c0c] border border-[#242424] rounded-2xl p-10 text-center space-y-6 shadow-2xl nt-crosshair">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181818] border border-[#2e2e2e] text-xs text-[#d71920]">
            <AlertTriangle size={13} />
            <span>ERR_404 // OBJECT_NOT_FOUND</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tighter text-white">
              404
            </h1>
            <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-sm mx-auto">
              The requested digital identity or route does not exist on this network cluster.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="solid-white" href="/" className="text-xs" icon={<ArrowLeft size={13} />}>
              RETURN TO HOMEPAGE
            </Button>
            <Button variant="outline" href="/register" className="text-xs">
              CLAIM THIS HANDLE
            </Button>
          </div>

          <div className="pt-4 text-[10px] text-neutral-600 border-t border-[#1a1a1a]">
            SYSTEM DIAGNOSTIC: STATUS_CODE 404 // CLUSTER: NOT-US-EAST
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

