"use client";

import React from "react";
import { DeviceMode } from "./StudioTopBar";
import { ProfileDesignConfig } from "@/types/studio";
import { StudioProfilePreview, PreviewData } from "./StudioProfilePreview";

interface StudioCenterCanvasProps {
  deviceMode: DeviceMode;
  config: ProfileDesignConfig;
  previewData: PreviewData;
  activeElementId: string;
  onSelectElement: (id: string) => void;
}

export const StudioCenterCanvas: React.FC<StudioCenterCanvasProps> = ({
  deviceMode,
  config,
  previewData,
  activeElementId,
  onSelectElement,
}) => {
  return (
    <main className="flex-1 h-full bg-[#050507] overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start p-4 md:p-8 custom-scrollbar relative">
      {/* Visual Canvas Canvas Backdrop Indicator */}
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 font-mono mb-3 max-w-5xl px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>CANVAS: {deviceMode.toUpperCase()} VIEW</span>
          <span className="text-neutral-600">{"//"}</span>
          <span className="text-neutral-400">Click any element to edit properties</span>
        </div>
        <div className="hidden sm:block text-neutral-500">
          SELECTED: <span className="text-white font-semibold uppercase">{activeElementId}</span>
        </div>
      </div>

      {/* Responsive Device Frame Container */}
      <div
        className={`w-full transition-all duration-300 flex items-center justify-center ${
          deviceMode === "mobile"
            ? "max-w-[390px] border-4 border-[#242426] rounded-[40px] shadow-2xl overflow-hidden my-auto p-1 bg-black"
            : deviceMode === "tablet"
            ? "max-w-[768px] border-4 border-[#242426] rounded-[28px] shadow-2xl overflow-hidden my-auto p-1 bg-black"
            : "max-w-4xl"
        }`}
      >
        <div className="w-full rounded-[24px] overflow-hidden">
          <StudioProfilePreview
            config={config}
            data={previewData}
            isInteractiveEditor={true}
            activeElementId={activeElementId}
            onSelectElement={onSelectElement}
            scopeId="studio-live-canvas"
          />
        </div>
      </div>
    </main>
  );
};
