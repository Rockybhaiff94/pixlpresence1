"use client";

import React, { useState } from "react";
import { DeviceMode } from "./StudioTopBar";
import { ProfileDesignConfig, StudioTab, WorkspaceTransparencyMode } from "@/types/studio";
import { StudioProfilePreview, PreviewData } from "./StudioProfilePreview";
import { FloatingPreviewToolbar } from "./FloatingPreviewToolbar";
import { PanelLeftOpen } from "lucide-react";

interface StudioRightPreviewCanvasProps {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  config: ProfileDesignConfig;
  previewData: PreviewData;
  activeCategory: StudioTab;
  onSelectCategory: (cat: StudioTab) => void;

  // Workspace controls & preferences
  zoom?: number;
  setZoom?: React.Dispatch<React.SetStateAction<number>>;
  transparencyMode?: WorkspaceTransparencyMode;
  setTransparencyMode?: (mode: WorkspaceTransparencyMode) => void;
  panelOpacity?: number;
  setPanelOpacity?: (opacity: number) => void;
  panelBlur?: number;
  setPanelBlur?: (blur: number) => void;
  panelBorderOpacity?: number;
  setPanelBorderOpacity?: (borderOpacity: number) => void;
  isEditorVisible?: boolean;
  setIsEditorVisible?: (val: boolean | ((prev: boolean) => boolean)) => void;
  isPreviewVisible?: boolean;
  setIsPreviewVisible?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onResetPanelSplit?: () => void;
  isFullscreenPreview?: boolean;
  onToggleFullscreenPreview?: () => void;
}

export const StudioRightPreviewCanvas: React.FC<StudioRightPreviewCanvasProps> = ({
  deviceMode,
  setDeviceMode,
  config,
  previewData,
  activeCategory,
  onSelectCategory,
  zoom: externalZoom,
  setZoom: externalSetZoom,
  transparencyMode = "solid",
  setTransparencyMode,
  panelOpacity,
  setPanelOpacity,
  panelBlur,
  setPanelBlur,
  panelBorderOpacity,
  setPanelBorderOpacity,
  isEditorVisible = true,
  setIsEditorVisible,
  isPreviewVisible = true,
  setIsPreviewVisible,
  onResetPanelSplit,
  isFullscreenPreview = false,
  onToggleFullscreenPreview,
}) => {
  const [internalZoom, setInternalZoom] = useState(100);
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = (updater: ((prev: number) => number) | number) => {
    if (externalSetZoom) {
      if (typeof updater === "function") {
        externalSetZoom(updater as (prev: number) => number);
      } else {
        externalSetZoom(() => updater);
      }
    } else {
      if (typeof updater === "function") {
        setInternalZoom(updater);
      } else {
        setInternalZoom(updater);
      }
    }
  };

  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);

  // Map element IDs to category tabs
  const handleSelectElement = (elementId: string) => {
    switch (elementId) {
      case "avatar":
        onSelectCategory("avatar");
        break;
      case "identity":
        onSelectCategory("identity");
        break;
      case "rpc":
        onSelectCategory("rpc");
        break;
      case "buttons":
      case "socials":
        onSelectCategory("buttons");
        break;
      case "background":
        onSelectCategory("background");
        break;
      case "music":
        onSelectCategory("effects");
        break;
      default:
        onSelectCategory("layout");
        break;
    }
  };

  const handleResetPosition = () => {
    setZoom(100);
    setShowGrid(false);
    setShowGuides(false);
    setShowWireframe(false);
  };

  // Determine viewport frame constraints based on device mode
  const getDeviceFrameStyles = (): { outer: string; scaleFactor: number } => {
    switch (deviceMode) {
      case "mobile":
        return {
          outer: "w-[390px] h-[844px] rounded-[48px] border-[10px] border-[#18181b] shadow-2xl overflow-hidden relative",
          scaleFactor: 1,
        };
      case "tablet":
        return {
          outer: "w-[768px] h-[920px] rounded-[36px] border-[12px] border-[#18181b] shadow-2xl overflow-hidden relative",
          scaleFactor: 0.9,
        };
      case "desktop":
      default:
        return {
          outer: "w-full h-full min-h-[600px] rounded-none border-0 shadow-none overflow-y-auto relative",
          scaleFactor: 1,
        };
    }
  };

  const { outer: frameClass, scaleFactor } = getDeviceFrameStyles();
  const effectiveZoom = (zoom / 100) * scaleFactor;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start bg-[#050507] overflow-hidden select-none">
      {/* Reopen Editor Pill when editor is collapsed / focus mode */}
      {!isEditorVisible && setIsEditorVisible && (
        <button
          onClick={() => {
            setIsEditorVisible(true);
            if (isFullscreenPreview && onToggleFullscreenPreview) {
              onToggleFullscreenPreview();
            }
          }}
          className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/95 backdrop-blur-md text-white font-mono text-xs shadow-2xl cursor-pointer hover:bg-neutral-800 hover:border-neutral-500 transition-all group"
          title="Show Left Editing Workspace"
        >
          <PanelLeftOpen size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="font-semibold">Show Editor</span>
        </button>
      )}

      {/* Floating Side Toolbar */}
      <FloatingPreviewToolbar
        zoom={zoom}
        setZoom={setZoom}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        showWireframe={showWireframe}
        setShowWireframe={setShowWireframe}
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        onResetPosition={handleResetPosition}
        transparencyMode={transparencyMode}
        setTransparencyMode={setTransparencyMode}
        panelOpacity={panelOpacity}
        setPanelOpacity={setPanelOpacity}
        panelBlur={panelBlur}
        setPanelBlur={setPanelBlur}
        panelBorderOpacity={panelBorderOpacity}
        setPanelBorderOpacity={setPanelBorderOpacity}
        isEditorVisible={isEditorVisible}
        setIsEditorVisible={setIsEditorVisible}
        isPreviewVisible={isPreviewVisible}
        setIsPreviewVisible={setIsPreviewVisible}
        onResetPanelSplit={onResetPanelSplit}
        isFullscreenPreview={isFullscreenPreview}
        onToggleFullscreenPreview={onToggleFullscreenPreview}
      />

      {/* Grid Overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      )}

      {/* Guides Overlay */}
      {showGuides && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-full h-px bg-cyan-500/20 absolute top-1/2" />
          <div className="h-full w-px bg-cyan-500/20 absolute left-1/2" />
          <div className="w-[580px] h-full border-x border-cyan-500/15" />
        </div>
      )}

      {/* Canvas Viewport Frame */}
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-auto custom-scrollbar">
        <div
          className="transition-transform duration-200 origin-top flex items-center justify-center shrink-0"
          style={{
            transform: `scale(${effectiveZoom})`,
            transformOrigin: "center top",
          }}
        >
          <div className={frameClass}>
            {/* Mobile / Tablet Notch */}
            {deviceMode === "mobile" && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-[#18181b] rounded-b-xl z-30 pointer-events-none flex items-center justify-center">
                <div className="w-10 h-1 bg-black rounded-full" />
              </div>
            )}

            {/* Live Profile Engine */}
            <div className={`w-full h-full ${showWireframe ? "wireframe-debug" : ""}`}>
              <StudioProfilePreview
                config={config}
                data={previewData}
                isInteractiveEditor={true}
                activeElementId={activeCategory}
                onSelectElement={handleSelectElement}
                scopeId="studio-live-canvas"
              />
            </div>

            {/* Mobile Home Bar */}
            {deviceMode === "mobile" && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full z-30 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
