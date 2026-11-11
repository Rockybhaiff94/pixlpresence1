"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
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

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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
      setErrorMessage(null);
    }
  }, [isOpen, backgroundConfig]);

  if (!isOpen) return null;

  // Handle local file upload (GIF <= 5MB, Static <= 10MB)
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Unsupported format. Please upload PNG, JPG, WEBP, or animated GIF.");
      return;
    }

    const isGif = file.type.toLowerCase() === "image/gif";
    const MAX_GIF_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_STATIC_BYTES = 10 * 1024 * 1024; // 10 MB

    if (isGif && file.size > MAX_GIF_BYTES) {
      setErrorMessage(`GIF exceeds the 10 MB maximum size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }
    if (!isGif && file.size > MAX_STATIC_BYTES) {
      setErrorMessage(`Image exceeds the 10 MB maximum size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await apiFetch("/api/rpc/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64Data,
            fileName: file.name,
            targetSlot: "background",
          }),
        });

        const data = await res.json();
        if (res.ok && data.url) {
          setImageUrl(data.url);
          setIsAnimatedGif(Boolean(data.isAnimated));
          setOffsetX(0);
          setOffsetY(0);
          setZoom(100);
          setRotation(0);
          setFocalPoint({ x: 50, y: 50 });
        } else {
          setErrorMessage(data.error || "Failed to upload image.");
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read image file.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload file.");
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
    } catch {
      // ignore
    }
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
    onApply({
      imageUrl,
      type: imageUrl ? (isAnimatedGif ? "gif" : "image") : backgroundConfig.type,
      aspectRatio,
      fitMode,
      zoom,
      rotation,
      offsetX,
      offsetY,
      focalPoint,
      isAnimatedGif,
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0d0d11] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800/80 flex items-center justify-between bg-[#121217]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                CUSTOMIZE PROFILE BACKGROUND
                {isAnimatedGif && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Sparkles size={10} /> ANIMATED GIF
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Aspect ratio framing, focal point anchoring, pan, zoom & rotation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Split into Interactive Viewport and Controls Panel */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
          {/* Left Canvas Preview (7 cols) */}
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
              className={`relative w-full h-[340px] sm:h-[400px] bg-[#070709] border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center cursor-crosshair group ${
                isDragging ? "cursor-grabbing" : ""
              }`}
            >
              {/* Texture backdrop */}
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
                      objectFit: fitMode,
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

            {/* Quick Viewport Info Bar */}
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

          {/* Right Controls Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* File Upload / Image Source */}
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
                  placeholder="https://... direct image link"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#18181f] border border-neutral-700/60 text-white text-xs focus:outline-none focus:border-white"
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
                  if (file) handleFileUpload(file);
                }}
              />
              <p className="text-[10px] text-neutral-500">
                Supports PNG, JPG, WEBP, or animated GIF up to 10 MB.
              </p>
            </div>

            {/* Aspect Ratio Framing */}
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

            {/* Zoom Slider */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-neutral-400 uppercase font-bold">ZOOM</span>
                <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(50, z - 10))}
                    className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center hover:bg-neutral-700"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{zoom}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(300, z + 10))}
                    className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center hover:bg-neutral-700"
                  >
                    +
                  </button>
                </div>
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

            {/* Rotation Slider & Quick 90 deg Rotate */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-[#121217] border border-neutral-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-neutral-400 uppercase font-bold">ROTATION</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                    title="Rotate -90°"
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <span className="text-white font-bold w-10 text-center">{rotation}°</span>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title="Rotate +90°"
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
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
}
