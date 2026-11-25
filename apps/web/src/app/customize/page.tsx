"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { StudioFloatingDock, DockPosition } from "@/components/studio/StudioFloatingDock";
import { ProfileBuilderStudio } from "@/components/profile-builder/ProfileBuilderStudio";

export default function CustomizePage() {
  const { user } = useAuth();
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Initialize vertically anchored on the left edge, then hydrate saved dock position post-mount
  const [dockPosition, setDockPosition] = useState<DockPosition>("left");

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      try {
        const savedCoords = localStorage.getItem("pixel_studio_dock_coords");
        if (savedCoords) {
          const parsed = JSON.parse(savedCoords);
          if (
            parsed?.edge === "bottom" ||
            parsed?.edge === "top" ||
            parsed?.edge === "left" ||
            parsed?.edge === "right" ||
            parsed?.edge === "float"
          ) {
            setDockPosition(parsed.edge as DockPosition);
            return;
          }
        }
        const saved = localStorage.getItem("pixel_studio_dock_position");
        if (
          saved === "bottom" ||
          saved === "top" ||
          saved === "left" ||
          saved === "right" ||
          saved === "float"
        ) {
          setDockPosition(saved as DockPosition);
        }
      } catch {}
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col lg:flex-row font-mono select-none overflow-hidden h-screen">
      {/* 1. Existing Left Sidebar (Preserved exactly with navigation, active states, and styling) */}
      <AccountSidebar user={user} />

      {/* 2. Main Studio Workspace (Positioned alongside sidebar, full screen height) */}
      <main
        ref={workspaceContainerRef}
        className="flex-1 lg:ml-64 flex flex-col min-w-0 h-screen overflow-hidden bg-[#070709] relative"
      >
        {/* Advanced Profile Builder (Isolated from Protected Floating Dock) */}
        <ProfileBuilderStudio>
          {/* Existing Protected Floating Dock (Untouched) */}
          <StudioFloatingDock
            position={dockPosition}
            onPositionChange={setDockPosition}
            containerRef={workspaceContainerRef}
          />
        </ProfileBuilderStudio>
      </main>
    </div>
  );
}
