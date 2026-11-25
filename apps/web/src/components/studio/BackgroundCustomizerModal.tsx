"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  UploadCloud,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Image as ImageIcon,
  Move,
  Crop,
  Maximize2,
  Crosshair,
  Sparkles,
  Video,
  Music,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { uploadMediaAsset } from "@/lib/uploadAsset";
import {
  BackgroundAspectRatio,
  BackgroundFitMode,
  ProfileDesignConfig,
} from "@/types/studio";

interface BackgroundCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundConfig: ProfileDesignConfig["background"];
  onApply: (updated: Partial<ProfileDesignConfig["background"]>) => void;
}

const ASPECT_RATIOS: Array<{
  id: BackgroundAspectRatio;
  label: string;
  ratioText: string;
  calcRatio?: number;
}> = [
  { id: "full", label: "Full Viewport", ratioText: "100% Fit" },
  { id: "16:9", label: "16:9 Landscape", ratioText: "1.78:1", calcRatio: 16 / 9 },
  { id: "9:16", label: "9:16 Portrait", ratioText: "0.56:1", calcRatio: 9 / 16 },
  { id: "1:1", label: "1:1 Square", ratioText: "1.0:1", calcRatio: 1 },
  { id: "4:3", label: "4:3 Standard", ratioText: "1.33:1", calcRatio: 4 / 3 },
];

const FIT_MODES: Array<{ id: BackgroundFitMode; label: string; desc: string }> = [
  { id: "cover", label: "Cover (Fill)", desc: "Completely fills canvas without empty borders" },
  { id: "contain", label: "Contain (Fit)", desc: "Fits entire image, may letterbox" },
  { id: "fill", label: "Stretch", desc: "Forces exact bounds" },
];

export function BackgroundCustomizerModal({
  isOpen,
  onClose,
  backgroundConfig,
  onApply,
}: BackgroundCustomizerModalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"image" | "video" | "audio" | "appearance">(
    backgroundConfig.type === "video" ? "video" : "image"
  );

  // Section A & B: Image / GIF state
  const [imageUrl, setImageUrl] = useState<string>(backgroundConfig.imageUrl || "");
  const [aspectRatio, setAspectRatio] = useState<BackgroundAspectRatio>(
    backgroundConfig.aspectRatio || "full"
  );
  const [fitMode, setFitMode] = useState<BackgroundFitMode>(
    backgroundConfig.fitMode || "cover"
  );
  const [zoom, setZoom] = useState<number>(backgroundConfig.zoom || 100);
  const [rotation, setRotation] = useState<number>(backgroundConfig.rotation || 0);
  const [offsetX, setOffsetX] = useState<number>(backgroundConfig.offsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(backgroundConfig.offsetY || 0);
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>(
    backgroundConfig.focalPoint || { x: 50, y: 50 }
  );
  const [isAnimatedGif, setIsAnimatedGif] = useState<boolean>(
    Boolean(backgroundConfig.imageUrl?.toLowerCase().includes(".gif"))
  );

  // Section C: Video state
  const [videoUrl, setVideoUrl] = useState<string>(backgroundConfig.videoUrl || "");
  const [videoPoster, setVideoPoster] = useState<string>(backgroundConfig.videoPoster || "");
  const [videoAutoplay, setVideoAutoplay] = useState<boolean>(backgroundConfig.videoAutoplay !== false);
  const [videoLoop, setVideoLoop] = useState<boolean>(backgroundConfig.videoLoop !== false);
  const [videoVolume, setVideoVolume] = useState<number>(backgroundConfig.videoVolume ?? 100);
  const [videoMuted, setVideoMuted] = useState<boolean>(Boolean(backgroundConfig.videoMuted));

  // Section D: Background Audio / Music state
  const [audioSourceMode, setAudioSourceMode] = useState<"none" | "video" | "music" | "both">(
    backgroundConfig.audioSourceMode || "none"
  );
  const [audioUrl, setAudioUrl] = useState<string>(backgroundConfig.audioUrl || "");
  const [audioFileName, setAudioFileName] = useState<string>(backgroundConfig.audioFileName || "");
  const [audioVolume, setAudioVolume] = useState<number>(backgroundConfig.audioVolume ?? 80);
  const [audioLoop, setAudioLoop] = useState<boolean>(backgroundConfig.audioLoop !== false);
  const [audioTrimStart, setAudioTrimStart] = useState<number>(backgroundConfig.audioTrimStart || 0);
  const [audioTrimEnd, setAudioTrimEnd] = useState<number | undefined>(backgroundConfig.audioTrimEnd);
  const [masterVolume, setMasterVolume] = useState<number>(backgroundConfig.masterVolume ?? 100);
  const [muteAll, setMuteAll] = useState<boolean>(Boolean(backgroundConfig.muteAll));

  // Section E: Appearance
  const [blur, setBlur] = useState<number>(backgroundConfig.blur || 0);
  const [opacity, setOpacity] = useState<number>(backgroundConfig.opacity ?? 100);

  // Dragging and preview state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio preview playback in modal
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(backgroundConfig.imageUrl || "");
      setAspectRatio(backgroundConfig.aspectRatio || "full");
      setFitMode(backgroundConfig.fitMode || "cover");
      setZoom(backgroundConfig.zoom || 100);
      setRotation(backgroundConfig.rotation || 0);
      setOffsetX(backgroundConfig.offsetX || 0);
      setOffsetY(backgroundConfig.offsetY || 0);
      setFocalPoint(backgroundConfig.focalPoint || { x: 50, y: 50 });
      setIsAnimatedGif(Boolean(backgroundConfig.imageUrl?.toLowerCase().includes(".gif")));

      setVideoUrl(backgroundConfig.videoUrl || "");
      setVideoPoster(backgroundConfig.videoPoster || "");
      setVideoAutoplay(backgroundConfig.videoAutoplay !== false);
      setVideoLoop(backgroundConfig.videoLoop !== false);
      setVideoVolume(backgroundConfig.videoVolume ?? 100);
      setVideoMuted(Boolean(backgroundConfig.videoMuted));

      setAudioSourceMode(backgroundConfig.audioSourceMode || "none");
      setAudioUrl(backgroundConfig.audioUrl || "");
      setAudioFileName(backgroundConfig.audioFileName || "");
      setAudioVolume(backgroundConfig.audioVolume ?? 80);
      setAudioLoop(backgroundConfig.audioLoop !== false);
      setAudioTrimStart(backgroundConfig.audioTrimStart || 0);
      setAudioTrimEnd(backgroundConfig.audioTrimEnd);
      setMasterVolume(backgroundConfig.masterVolume ?? 100);
      setMuteAll(Boolean(backgroundConfig.muteAll));

      setBlur(backgroundConfig.blur || 0);
      setOpacity(backgroundConfig.opacity ?? 100);

      setActiveTab(backgroundConfig.type === "video" ? "video" : "image");
      setErrorMessage(null);
      setIsPlayingAudioPreview(false);
    }
  }, [isOpen, backgroundConfig]);

  // Audio preview toggle
  const toggleAudioPreview = () => {
    if (!audioUrl) return;
    if (isPlayingAudioPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingAudioPreview(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = audioTrimStart || 0;
        audioPreviewRef.current.volume = ((audioVolume / 100) * (masterVolume / 100));
        audioPreviewRef.current.play().catch(() => {});
        setIsPlayingAudioPreview(true);
      }
    }
  };

  if (!isOpen) return null;

  // Handle media file uploads (Image, GIF, Video, Audio) via centralized uploadMediaAsset
  const handleMediaUpload = async (file: File, kind: "image" | "video" | "audio") => {
    if (uploading) return;
    setErrorMessage(null);

    try {
      setUploading(true);
      const uploaded = await uploadMediaAsset({
        file,
        kind,
        targetSlot: `background_${kind}`,
      });

      if (kind === "image") {
        setImageUrl(uploaded.url);
        setIsAnimatedGif(Boolean(uploaded.isAnimated));
        setOffsetX(0);
        setOffsetY(0);
        setZoom(100);
        setRotation(0);
        setFocalPoint({ x: 50, y: 50 });
      } else if (kind === "video") {
        setVideoUrl(uploaded.url);
        if (audioSourceMode === "none") {
          setAudioSourceMode("video");
        }
      } else if (kind === "audio") {
        setAudioUrl(uploaded.url);
        setAudioFileName(file.name);
        if (audioSourceMode === "none") {
          setAudioSourceMode("music");
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload media.");
    } finally {
      setUploading(false);
    }
  };

  // Drag pan handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageUrl) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    setOffsetX(Math.round(nextX));
    setOffsetY(Math.round(nextY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Click on image preview to set Focal Point
  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pctX = Math.round(Math.min(100, Math.max(0, (clickX / rect.width) * 100)));
    const pctY = Math.round(Math.min(100, Math.max(0, (clickY / rect.height) * 100)));
    setFocalPoint({ x: pctX, y: pctY });
  };

  const handleSaveAndApply = () => {
    // Determine primary background type
    let resolvedType = backgroundConfig.type;
    if ((activeTab === "video" || (videoUrl && (audioSourceMode === "video" || audioSourceMode === "both"))) && videoUrl) {
      resolvedType = "video";
    } else if (activeTab === "image" && imageUrl) {
      resolvedType = isAnimatedGif ? "gif" : "image";
    }

    onApply({
      type: resolvedType,
      imageUrl,
      isAnimatedGif,
      aspectRatio,
      fitMode,
      zoom,
      rotation,
      offsetX,
      offsetY,
      focalPoint,
      videoUrl,
      videoPoster,
      videoAutoplay,
      videoLoop,
      videoVolume,
      videoMuted,
      audioSourceMode,
      audioUrl,
      audioFileName,
      audioVolume,
      audioLoop,
      audioTrimStart,
      audioTrimEnd,
      masterVolume,
      muteAll,
      blur,
      opacity,
      overlayOpacity: opacity / 100,
    });
    onClose();
  };

  const handleResetTransforms = () => {
    setZoom(100);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setFocalPoint({ x: 50, y: 50 });
    setFitMode("cover");
    setAspectRatio("full");
    setVideoVolume(100);
    setAudioVolume(80);
    setMasterVolume(100);
    setMuteAll(false);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0d0d11] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800/80 flex items-center justify-between bg-[#121217]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white">
              {activeTab === "video" ? (
                <Video size={18} />
              ) : activeTab === "audio" ? (
                <Music size={18} />
              ) : (
                <ImageIcon size={18} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                BACKGROUND MEDIA & AUDIO STUDIO
                {isAnimatedGif && activeTab === "image" && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Sparkles size={10} /> ANIMATED GIF
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Static images, animated GIFs, full-viewport video backgrounds, and multi-source audio tracks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#09090b] border-b border-neutral-800 text-xs">
          <button
            type="button"
            data-modal-tab="image"
            onClick={() => setActiveTab("image")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === "image"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ImageIcon size={13} />
            IMAGE / GIF
          </button>
          <button
            type="button"
            data-modal-tab="video"
            onClick={() => setActiveTab("video")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === "video"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Video size={13} />
            VIDEO
          </button>
          <button
            type="button"
            data-modal-tab="audio"
            onClick={() => setActiveTab("audio")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === "audio"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Music size={13} />
            AUDIO & SOUNDTRACK
            {audioSourceMode !== "none" && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
          <button
            type="button"
            data-modal-tab="appearance"
            onClick={() => setActiveTab("appearance")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === "appearance"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Sliders size={13} />
            BLUR & OPACITY
          </button>
        </div>

        {/* Modal Body: Content by Tab */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: IMAGE / GIF */}
          {activeTab === "image" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Canvas Preview */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-300">
                    <Crosshair size={13} className="text-emerald-400" /> CROP & TRANSFORM VIEWPORT
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    [DRAG TO PAN &bull; CLICK TO SET FOCAL POINT]
                  </span>
                </div>

                {/* Viewport Frame */}
                <div
                  ref={viewportRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onClick={handleFocalPointClick}
                  className={`relative w-full h-[320px] sm:h-[360px] bg-[#070709] border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center cursor-crosshair group ${
                    isDragging ? "cursor-grabbing" : ""
                  }`}
                >
                  <div className="absolute inset-0 nt-dot-grid opacity-30 pointer-events-none" />

                  {/* Aspect Ratio Framing Guides */}
                  {aspectRatio !== "full" && (
                    <div
                      className="absolute border border-dashed border-white/40 pointer-events-none z-20 transition-all duration-200"
                      style={{
                        width:
                          aspectRatio === "9:16"
                            ? "45%"
                            : aspectRatio === "1:1"
                            ? "70%"
                            : "90%",
                        height:
                          aspectRatio === "16:9"
                            ? "55%"
                            : aspectRatio === "4:3"
                            ? "70%"
                            : "85%",
                        borderRadius: "12px",
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
                      }}
                    >
                      <div className="absolute top-2 left-2 text-[9px] bg-black/80 px-2 py-0.5 rounded text-neutral-300 font-mono">
                        {aspectRatio.toUpperCase()} FRAME
                      </div>
                    </div>
                  )}

                  {/* Rendered Background Image */}
                  {imageUrl ? (
                    <div
                      className="relative w-full h-full pointer-events-none transition-transform duration-75"
                      style={{
                        transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
                        transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="Background Preview"
                        className="w-full h-full select-none"
                        style={{
                          objectFit: (fitMode === "stretch" || fitMode === "fill") ? "fill" : (fitMode as "cover" | "contain"),
                          objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-3 z-10 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                        <ImageIcon size={22} />
                      </div>
                      <p className="text-xs text-neutral-400">No background image selected.</p>
                    </div>
                  )}

                  {/* Focal Point Indicator Reticle */}
                  {imageUrl && (
                    <div
                      className="absolute w-5 h-5 rounded-full border-2 border-emerald-400 pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 shadow-lg flex items-center justify-center"
                      style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Viewport Info Bar */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 bg-[#121217] px-3 py-2 rounded-lg border border-neutral-800/60">
                  <div>
                    PAN: <span className="text-white">X: {offsetX}px, Y: {offsetY}px</span>
                  </div>
                  <div>
                    FOCAL: <span className="text-emerald-400">{focalPoint.x}%, {focalPoint.y}%</span>
                  </div>
                  <div>
                    ZOOM: <span className="text-white">{zoom}%</span> | ROT: <span className="text-white">{rotation}°</span>
                  </div>
                </div>
              </div>

              {/* Right Controls Panel */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Source Input */}
                <div className="space-y-2 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    IMAGE / GIF SOURCE
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setIsAnimatedGif(e.target.value.toLowerCase().includes(".gif"));
                      }}
                      placeholder="https://... direct image or gif link"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#18181f] border border-neutral-700/60 text-white text-xs focus:outline-none focus:border-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      <UploadCloud size={14} />
                      {uploading ? "..." : "Upload"}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(file, "image");
                    }}
                  />
                  <p className="text-[10px] text-neutral-500">
                    Supports PNG, JPG, WEBP, or animated GIF up to 10 MB.
                  </p>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    ASPECT RATIO
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          aspectRatio === ar.id
                            ? "bg-white text-black border-white font-bold"
                            : "bg-[#18181f] border-neutral-800 text-neutral-300 hover:border-neutral-600"
                        }`}
                      >
                        <div className="text-[11px]">{ar.label}</div>
                        <div className={`text-[9px] ${aspectRatio === ar.id ? "text-neutral-700" : "text-neutral-500"}`}>
                          {ar.ratioText}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fit Mode */}
                <div className="space-y-2 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    FIT & FILL MODE
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FIT_MODES.map((fm) => (
                      <button
                        key={fm.id}
                        type="button"
                        onClick={() => setFitMode(fm.id)}
                        className={`py-1.5 px-2 rounded-lg border text-center cursor-pointer text-xs transition-all ${
                          fitMode === fm.id
                            ? "bg-white text-black border-white font-bold"
                            : "bg-[#18181f] border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {fm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom & Rotation */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#121217] border border-neutral-800/80">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-neutral-400 font-bold">ZOOM</span>
                      <span className="text-white font-bold">{zoom}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={300}
                      step={5}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-[#121217] border border-neutral-800/80">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-neutral-400 font-bold">ROTATION</span>
                      <span className="text-white font-bold">{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO */}
          {activeTab === "video" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Video Preview */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-300">
                    <Video size={13} className="text-cyan-400" /> VIDEO PLAYBACK PREVIEW
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    [FULL-VIEWPORT COVERAGE]
                  </span>
                </div>

                <div className="relative w-full h-[320px] sm:h-[360px] bg-[#070709] border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      poster={videoPoster}
                      autoPlay={videoAutoplay}
                      loop={videoLoop}
                      muted={videoMuted || muteAll}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                        <Video size={22} />
                      </div>
                      <p className="text-xs text-neutral-400">No video URL provided.</p>
                      <p className="text-[10px] text-neutral-500">
                        Upload or paste a direct MP4 or WebM link to activate.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Video Controls */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Video Source */}
                <div className="space-y-2 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    VIDEO SOURCE (MP4 / WEBM)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://... direct MP4 or WebM video link"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#18181f] border border-neutral-700/60 text-white text-xs focus:outline-none focus:border-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      <UploadCloud size={14} />
                      Upload
                    </button>
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(file, "video");
                    }}
                  />
                  <input
                    type="url"
                    value={videoPoster}
                    onChange={(e) => setVideoPoster(e.target.value)}
                    placeholder="Poster image fallback URL (optional)"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#18181f] border border-neutral-700/60 text-white text-xs focus:outline-none focus:border-white font-mono mt-1"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Up to 25 MB. Optimized for high-definition desktop and mobile views.
                  </p>
                </div>

                {/* Video Playback Settings */}
                <div className="space-y-3 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    PLAYBACK & SOUND BEHAVIOR
                  </label>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Autoplay Video</span>
                    <button
                      type="button"
                      onClick={() => setVideoAutoplay((v) => !v)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                        videoAutoplay
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {videoAutoplay ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Loop Playback</span>
                    <button
                      type="button"
                      onClick={() => setVideoLoop((v) => !v)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                        videoLoop
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {videoLoop ? "LOOPING" : "ONCE"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">Video Soundtrack</span>
                    <button
                      type="button"
                      onClick={() => setVideoMuted((v) => !v)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                        !videoMuted
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {!videoMuted ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      {!videoMuted ? "SOUND ON" : "MUTED"}
                    </button>
                  </div>

                  {!videoMuted && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] text-neutral-400">VIDEO VOLUME</span>
                        <span className="text-white font-bold">{videoVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={videoVolume}
                        onChange={(e) => setVideoVolume(Number(e.target.value))}
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO & SOUNDTRACK */}
          {activeTab === "audio" && (
            <div className="space-y-6">
              {/* Audio Source Mode Selection */}
              <div className="space-y-2 p-4 rounded-xl bg-[#121217] border border-neutral-800/80">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                  AUDIO SOURCE MODE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "none", label: "Mute All", desc: "No background sound" },
                    { id: "video", label: "Mode A: Video Audio", desc: "Original sound from video" },
                    { id: "music", label: "Mode B: Uploaded Music", desc: "Independent audio track" },
                    { id: "both", label: "Mode C: Mix Both", desc: "Video + uploaded music" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAudioSourceMode(mode.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        audioSourceMode === mode.id
                          ? "bg-white text-black border-white font-bold shadow-md"
                          : "bg-[#18181f] border-neutral-800 text-neutral-300 hover:border-neutral-600"
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className={`text-[10px] mt-0.5 ${audioSourceMode === mode.id ? "text-neutral-700" : "text-neutral-500"}`}>
                        {mode.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Uploaded Music Track Controls (Mode B & Mode C) */}
              {(audioSourceMode === "music" || audioSourceMode === "both") && (
                <div className="p-4 rounded-xl bg-[#121217] border border-neutral-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Music size={13} className="text-emerald-400" /> INDEPENDENT AUDIO TRACK (MP3 / WAV / OGG)
                    </label>
                    {audioFileName && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {audioFileName}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://... direct audio link or upload file"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#18181f] border border-neutral-700/60 text-white text-xs focus:outline-none focus:border-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      <UploadCloud size={14} />
                      Upload Track
                    </button>
                  </div>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(file, "audio");
                    }}
                  />

                  {/* Audio Preview Player */}
                  {audioUrl && (
                    <div className="p-3 rounded-lg bg-black/60 border border-neutral-800 flex items-center justify-between gap-4">
                      <audio ref={audioPreviewRef} src={audioUrl} onEnded={() => setIsPlayingAudioPreview(false)} />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={toggleAudioPreview}
                          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center cursor-pointer transition-colors shadow-md shrink-0"
                        >
                          {isPlayingAudioPreview ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>
                        <div>
                          <span className="text-xs text-white font-bold block">Audio Preview Player</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {isPlayingAudioPreview ? "Playing..." : "Paused"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAudioLoop((l) => !l)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            audioLoop
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {audioLoop ? "LOOP ON" : "LOOP OFF"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudioUrl("");
                            setAudioFileName("");
                            setIsPlayingAudioPreview(false);
                            audioPreviewRef.current?.pause();
                          }}
                          className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-[10px] font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Volume & Trim Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold">MUSIC VOLUME</span>
                        <span className="text-white font-bold">{audioVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold">START TIME TRIM (SEC)</span>
                        <span className="text-white font-bold">{audioTrimStart}s</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={600}
                        step={1}
                        value={audioTrimStart}
                        onChange={(e) => setAudioTrimStart(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-1 rounded bg-[#18181f] border border-neutral-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Master Volume & Global Mute */}
              <div className="p-4 rounded-xl bg-[#121217] border border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                    MASTER SOUND ENGINE (PREVENTS CLIPPING)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMuteAll((m) => !m)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                      muteAll
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {muteAll ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    {muteAll ? "ALL MUTED" : "UNMUTED"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300">Master Gain</span>
                    <span className="text-white font-bold">{masterVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={masterVolume}
                    disabled={muteAll}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="w-full accent-white cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6 max-w-xl">
              {/* Blur Slider */}
              <div className="space-y-2 p-4 rounded-xl bg-[#121217] border border-neutral-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-300 font-bold">Backdrop Blur Filter</span>
                  <span className="text-white font-bold">{blur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500">
                  Adds cinematic atmospheric focus to canvas embeds and profile cards.
                </p>
              </div>

              {/* Opacity / Dimming Slider */}
              <div className="space-y-2 p-4 rounded-xl bg-[#121217] border border-neutral-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-300 font-bold">Overlay Dimming</span>
                  <span className="text-white font-bold">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500">
                  Controls dark tint intensity over media for optimal text legibility.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-[#121217]">
          <button
            type="button"
            onClick={handleResetTransforms}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Reset All Transforms
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="solid-white" onClick={handleSaveAndApply}>
              <Check size={14} className="mr-1.5" />
              Apply & Save Background
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
