"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { StudioFloatingDock, DockPosition } from "@/components/studio/StudioFloatingDock";

export default function CustomizePage() {
  const { user } = useAuth();
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Preserved dock positioning with localStorage persistence
  const [dockPosition, setDockPosition] = useState<DockPosition>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pixel_studio_dock_position");
        if (
          saved === "bottom" ||
          saved === "top" ||
          saved === "left" ||
          saved === "right" ||
          saved === "float"
        ) {
          return saved as DockPosition;
        }
      } catch {}
    }
    return "bottom";
  });

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col lg:flex-row font-mono select-none overflow-hidden h-screen">
      {/* 1. Existing Left Sidebar (Preserved exactly with navigation, active states, and styling) */}
      <AccountSidebar user={user} />

      {/* 2. Main Studio Workspace (Positioned alongside sidebar, full screen height, empty canvas foundation) */}
      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 h-screen overflow-hidden bg-[#070707] relative">
        {/* Workspace Canvas Surface (Clean, empty blank slate without old tools, embeds, banners, or widgets) */}
        <div
          ref={workspaceContainerRef}
          className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full h-full bg-[#070707]"
        >
          {/* Subtle Blank Canvas Foundation Grid */}
          <div className="absolute inset-0 nt-dot-grid opacity-30 pointer-events-none z-0" />

          {/* Canvas Workspace Center State */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 relative z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 shadow-2xl">
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Studio Canvas // Blank Slate
              </h2>
              <p className="text-xs text-neutral-500 font-mono leading-relaxed">
                Customization system reset complete. Canvas surface and floating dock foundation ready for individual tool integration.
              </p>
            </div>
          </div>

          {/* 3. Floating Dock (Preserved with drag, edge-snapping, hover, and expansion foundation) */}
          <StudioFloatingDock
            position={dockPosition}
            onPositionChange={setDockPosition}
            containerRef={workspaceContainerRef}
          />
        </div>
      </main>
    </div>
  );
}
