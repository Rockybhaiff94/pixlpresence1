"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { StudioFloatingDock, DockPosition } from "@/components/studio/StudioFloatingDock";
import { DooryEditor } from "@/components/editor/DooryEditor";

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

      {/* 2. Main Studio Workspace (Positioned alongside sidebar, full screen height) */}
      <main
        ref={workspaceContainerRef}
        className="flex-1 lg:ml-64 flex flex-col min-w-0 h-screen overflow-hidden bg-[#070709] relative"
      >
        {/* Doory-Recreated Studio Editor with Zero Layout Shift & Preserved Floating Dock */}
        <DooryEditor>
          {/* 3. Floating Dock (Preserved with drag, edge-snapping, hover, and expansion foundation) */}
          <StudioFloatingDock
            position={dockPosition}
            onPositionChange={setDockPosition}
            containerRef={workspaceContainerRef}
          />
        </DooryEditor>
      </main>
    </div>
  );
}
