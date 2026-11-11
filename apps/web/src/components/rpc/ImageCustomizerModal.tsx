"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Image as ImageIcon,
  Flame,
  Move,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

export interface CropData {
  cropX: number;
  cropY: number;
  cropWidth?: number;
  cropHeight?: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface ImageCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: "largeImage" | "smallImage";
  currentUrl?: string | null;
  currentCrop?: CropData | null;
  onApply: (url: string, cropData: CropData) => void;
  onRemove?: () => void;
}

export function ImageCustomizerModal({
  isOpen,
  onClose,
  targetSlot,
  currentUrl,
  currentCrop,
  onApply,
  onRemove,
}: ImageCustomizerModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [isAnimated, setIsAnimated] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transformation states
  const [zoom, setZoom] = useState<number>(currentCrop?.zoom || 1);
  const [offsetX, setOffsetX] = useState<number>(currentCrop?.offsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(currentCrop?.offsetY || 0);

  // Dragging states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Upload status
  const [uploading, setUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentUrl || null);
      setZoom(currentCrop?.zoom || 1);
      setOffsetX(currentCrop?.offsetX || 0);
      setOffsetY(currentCrop?.offsetY || 0);
      setErrorMessage(null);

      if (currentUrl?.toLowerCase().includes(".gif")) {
        setIsAnimated(true);
      } else {
        setIsAnimated(false);
      }
    }
  }, [isOpen, currentUrl, currentCrop]);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);

    // Validate MIME types
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Unsupported file format. Please upload a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    // GIF 10 MB limit check
    const isGif = file.type.toLowerCase() === "image/gif";
    const MAX_GIF_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_STATIC_BYTES = 10 * 1024 * 1024; // 10 MB

    if (isGif && file.size > MAX_GIF_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`Animated GIF exceeds the 10 MB maximum size limit (${sizeMb} MB). Please compress your GIF to under 10 MB.`);
      return;
    }

    if (!isGif && file.size > MAX_STATIC_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`Image exceeds the 10 MB maximum size limit (${sizeMb} MB).`);
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setIsAnimated(isGif);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleSaveAndApply = async () => {
    if (!imageSrc) {
      setErrorMessage("Please select or upload an image first.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    const cropData: CropData = {
      cropX: offsetX,
      cropY: offsetY,
      zoom,
      offsetX,
      offsetY,
    };

    // If already a remote URL (and not freshly loaded data URL), apply directly
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      onApply(imageSrc, cropData);
      setUploading(false);
      onClose();
      return;
    }

    try {
      const payload = {
        file: imageSrc,
        fileName: fileName || `custom_${targetSlot}.png`,
        targetSlot,
        cropData,
      };

      const res = await apiFetch("/api/rpc/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      onApply(data.url, cropData);
      onClose();
    } catch (err: any) {
      console.error("[ImageCustomizer] Upload error:", err);
      setErrorMessage(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isSmall = targetSlot === "smallImage";
  const slotTitle = isSmall ? "Small Activity Icon" : "Large Activity Image";
  const slotAspect = isSmall ? "w-24 h-24 rounded-full" : "w-48 h-48 rounded-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
      <div className="w-full max-w-2xl bg-[#0c0c0c] border border-[#242424] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-white">
              <ImageIcon size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                CUSTOMIZE {slotTitle}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Upload PNG, JPG, WEBP, or animated GIF (up to 10MB).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!imageSrc ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="p-10 rounded-2xl border-2 border-dashed border-[#242424] hover:border-neutral-500 bg-[#090909] flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-white shadow-inner">
                <UploadCloud size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  DRAG & DROP IMAGE OR CLICK TO BROWSE
                </p>
                <p className="text-[11px] text-neutral-500">
                  PNG, JPG, WEBP, or Animated GIFs up to 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Interactive Viewport Canvas */}
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="text-[11px] text-neutral-400 mb-2 flex items-center justify-between w-full max-w-[280px]">
                    <span className="flex items-center gap-1">
                      <Move size={12} className="text-neutral-500" /> DRAG TO REPOSITION
                    </span>
                    {isAnimated && (
                      <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-300 font-bold flex items-center gap-1">
                        <Flame size={10} className="text-purple-400" /> ANIMATED GIF
                      </span>
                    )}
                  </div>

                  <div
                    ref={viewportRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`relative overflow-hidden bg-[#060606] border-2 border-[#2b2d31] shadow-xl cursor-grab active:cursor-grabbing select-none ${slotAspect}`}
                  >
                    <img
                      src={imageSrc}
                      alt="Crop Viewport"
                      draggable={false}
                      className="absolute max-w-none pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                </div>

                {/* Live Discord RPC Card Preview */}
                <div className="shrink-0 w-full sm:w-56 p-4 rounded-xl bg-[#1e1f22] border border-[#2b2d31] space-y-3 shadow-md">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-[#2b2d31] pb-2">
                    <span className="font-bold text-white uppercase">DISCORD PREVIEW</span>
                    <span className="text-neutral-500 font-mono">1:1 SCALE</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-[#2b2d31] overflow-hidden border border-[#383a40] shrink-0">
                      <img
                        src={imageSrc}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        style={{
                          transform: `scale(${zoom}) translate(${offsetX * 0.25}px, ${offsetY * 0.25}px)`,
                          transformOrigin: "center center",
                        }}
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5 text-left">
                      <p className="text-white font-bold text-xs truncate">Pixel.gg</p>
                      <p className="text-[11px] text-[#dbdee1] truncate">Live Discord Activity</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zoom & Positioning Controls */}
              <div className="p-4 rounded-xl bg-[#111] border border-[#1e1e1e] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <ZoomIn size={13} className="text-neutral-300" /> ZOOM LEVEL:
                    <strong className="text-white">{Math.round(zoom * 100)}%</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                      className="p-1 rounded bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.min(4, +(z + 0.2).toFixed(2)))}
                      className="p-1 rounded bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] text-[10px] text-neutral-300 flex items-center gap-1"
                      title="Reset Position & Zoom"
                    >
                      <RotateCcw size={11} /> RESET
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                  <span>Offset: X: {Math.round(offsetX)}px, Y: {Math.round(offsetY)}px</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Replace Image File
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1c1c1c] bg-[#090909] flex flex-wrap items-center justify-between gap-3">
          {imageSrc && onRemove ? (
            <button
              onClick={() => {
                setImageSrc(null);
                onRemove();
                onClose();
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Remove Custom Image
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploading}
              className="text-xs px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndApply}
              disabled={!imageSrc || uploading}
              className="text-xs px-5 py-2 bg-white text-black font-bold hover:bg-neutral-200 flex items-center gap-1.5"
            >
              {uploading ? (
                <>UPLOADING...</>
              ) : (
                <>
                  <Check size={14} /> APPLY & SAVE
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

