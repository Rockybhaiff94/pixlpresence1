"use client";

import React from "react";
import { AccountSidebar } from "./AccountSidebar";

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
}

export const AccountLayout: React.FC<AccountLayoutProps> = ({ children, user }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col lg:flex-row font-mono selection:bg-white selection:text-black">
      {/* Persistent Left Sidebar */}
      <AccountSidebar user={user} />

      {/* Main Content Pane */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-screen bg-[#070707] nt-dot-grid">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
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
