"use client";

import React from "react";
import { AccountSidebar } from "./AccountSidebar";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AccountLayoutProps {
  children: React.ReactNode;
  user?: {
    id: string;
    username: string;
    globalName?: string | null;
    avatar?: string | null;
    role?: string;
    premiumStatus?: boolean;
  };
  requireAuth?: boolean;
}

export const AccountLayout: React.FC<AccountLayoutProps> = ({
  children,
  user: propUser,
  requireAuth = true,
}) => {
  const { user: authUser, status: authStatus, loading: authLoading } = useAuth();
  const activeUser = propUser || authUser || undefined;

  // Only consider genuinely unauthenticated if auth confirmed 401, not loading, and no cached/prop user
  const isUnauthenticated =
    requireAuth &&
    authStatus === "UNAUTHENTICATED" &&
    !authLoading &&
    !activeUser;

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col lg:flex-row font-mono selection:bg-white selection:text-black">
      {/* Persistent Left Sidebar: always driven by the global active user */}
      <AccountSidebar user={activeUser} />

      {/* Main Content Pane */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-screen bg-[#070707] nt-dot-grid">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {authStatus === "INITIALIZING" && !activeUser ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <RefreshCw size={24} className="animate-spin text-white" />
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
                [ INITIALIZING ACCOUNT OS // VERIFYING SESSION ]
              </p>
            </div>
          ) : isUnauthenticated ? (
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
                  You must be signed in to access this account workspace. Please sign in with Discord or create an account.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                <Link
                  href="/login"
                  className="w-full py-3 px-5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/"
                  className="w-full py-3 px-5 rounded-xl bg-[#141414] border border-[#262626] text-neutral-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  <span>Return Home</span>
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Global Minimalist Workspace Footer */}
        <footer className="w-full px-6 py-3 border-t border-[#161616] bg-[#050505] flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-600 font-mono gap-2">
          <div className="flex items-center gap-3">
            <span>PIXEL.GG ACCOUNT OS</span>
            <span>&bull;</span>
            <span>SYSTEM: OPERATIONAL</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/carl" className="hover:text-white transition-colors">Live Demo</a>
          </div>
        </footer>
      </main>
    </div>
  );
};
