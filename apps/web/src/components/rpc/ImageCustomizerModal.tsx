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
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  Flame,
  Move,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

function countGifFramesFromBytes(bytes: Uint8Array): number {
  if (!bytes || bytes.length < 14) return 0;
  // Check GIF87a / GIF89a header
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x38) return 0;
  let pos = 13;
  const packed = bytes[10];
  if ((packed & 0x80) !== 0) {
    pos += 3 * (1 << ((packed & 0x07) + 1));
  }
  let frames = 0;
  const skipSubBlocks = () => {
    while (pos < bytes.length) {
      const len = bytes[pos++];
      if (len === 0) break;
      pos += len;
    }
  };
  while (pos < bytes.length) {
    const b = bytes[pos++];
    if (b === 0x3b) break;
    if (b === 0x21) {
      if (pos >= bytes.length) break;
      pos++; // extension label
      skipSubBlocks();
    } else if (b === 0x2c) {
      frames++;
      if (pos + 9 > bytes.length) break;
      const imgPacked = bytes[pos + 8];
      pos += 9;
      if ((imgPacked & 0x80) !== 0) {
        pos += 3 * (1 << ((imgPacked & 0x07) + 1));
      }
      if (pos >= bytes.length) break;
      pos++; // LZW min code size
      skipSubBlocks();
    } else {
      break;
    }
  }
  return frames;
}

export interface CropData {
  cropX: number;
  cropY: number;
  cropWidth?: number;
  cropHeight?: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export type UploadVerificationState =
  | "idle"
  | "uploading"
  | "upload_success"
  | "verifying"
  | "verification_delayed"
  | "verified"
  | "verification_unavailable"
  | "failed";

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
  const [savedAssetUrl, setSavedAssetUrl] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [isAnimated, setIsAnimated] = useState<boolean>(false);
  const [inputFrameCount, setInputFrameCount] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transformation states
  const [zoom, setZoom] = useState<number>(currentCrop?.zoom || 1);
  const [offsetX, setOffsetX] = useState<number>(currentCrop?.offsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(currentCrop?.offsetY || 0);

  // Dragging states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Verification & Upload State Machine
  const [verificationState, setVerificationState] = useState<UploadVerificationState>("idle");
  const [verificationAttempt, setVerificationAttempt] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef<number>(0);
  const isOpenRef = useRef<boolean>(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      requestSeqRef.current++;
    }
  }, [isOpen]);

  const MAX_VERIFICATION_ATTEMPTS = 3;
  const ATTEMPT_TIMEOUTS = [8000, 10000, 12000]; // Progressive timeouts: 8s, 10s, 12s
  const RETRY_DELAYS = [1000, 2000, 3000]; // Exponential backoff delays: 1s, 2s, 3s

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentUrl || null);
      setSavedAssetUrl(currentUrl || null);
      setZoom(currentCrop?.zoom || 1);
      setOffsetX(currentCrop?.offsetX || 0);
      setOffsetY(currentCrop?.offsetY || 0);
      setErrorMessage(null);
      setVerificationState("idle");
      setVerificationAttempt(1);

      if (currentUrl?.toLowerCase().includes(".gif")) {
        setIsAnimated(true);
      } else {
        setIsAnimated(false);
      }
    }
  }, [isOpen, currentUrl, currentCrop]);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    const seq = ++requestSeqRef.current;
    setErrorMessage(null);
    setVerificationState("idle");
    setSavedAssetUrl(null);
    setVerificationAttempt(1);

    // Validate MIME types
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Unsupported file format. Please upload a PNG, JPG, WEBP, or GIF image.");
      setVerificationState("failed");
      return;
    }

    // GIF 10 MB limit check
    const isGif = file.type.toLowerCase() === "image/gif";
    const MAX_GIF_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_STATIC_BYTES = 10 * 1024 * 1024; // 10 MB

    if (isGif && file.size > MAX_GIF_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`Animated GIF exceeds the 10 MB maximum size limit (${sizeMb} MB). Please compress your GIF to under 10 MB.`);
      setVerificationState("failed");
      return;
    }

    if (!isGif && file.size > MAX_STATIC_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`Image exceeds the 10 MB maximum size limit (${sizeMb} MB).`);
      setVerificationState("failed");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setIsAnimated(isGif);
    setInputFrameCount(1);

    if (isGif) {
      file.arrayBuffer().then((buf) => {
        if (seq !== requestSeqRef.current || !isOpenRef.current) return;
        const frames = countGifFramesFromBytes(new Uint8Array(buf));
        if (frames > 0) {
          setInputFrameCount(frames);
          setIsAnimated(frames > 1);
        }
      }).catch(() => {});
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (seq !== requestSeqRef.current || !isOpenRef.current) return;
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

  /**
   * Helper to verify if an image can be decoded and rendered by the browser
   */
  const testImageDecodable = (imgUrl: string, timeoutMs: number): Promise<{ ok: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          img.src = "";
          resolve({
            ok: false,
            reason: `Image decode timed out after ${Math.round(timeoutMs / 1000)}s.`,
          });
        }
      }, timeoutMs);

      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            resolve({ ok: true });
          } else {
            resolve({ ok: false, reason: "Image loaded with 0x0 dimensions." });
          }
        }
      };

      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            ok: false,
            reason: "The browser could not decode or load the image resource.",
          });
        }
      };

      img.src = imgUrl;
    });
  };

  /**
   * Single verification attempt combining HTTP status, Content-Type, and decodability
   */
  const verifySingleAttempt = async (
    rawUrl: string,
    timeoutMs: number,
    isGif: boolean
  ): Promise<{ ok: boolean; reason?: string }> => {
    if (!rawUrl || typeof rawUrl !== "string") {
      return { ok: false, reason: "No URL provided." };
    }

    // Cache buster to bypass stale CDN or browser cache
    const cacheBuster = `_t=${Date.now()}`;
    const verifyUrl = rawUrl.includes("?") ? `${rawUrl}&${cacheBuster}` : `${rawUrl}?${cacheBuster}`;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const fetchTimer = setTimeout(() => {
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      // 1. Check HTTP response and Content-Type via fetch
      const res = await fetch(verifyUrl, {
        method: "GET",
        signal: controller?.signal,
        redirect: "follow",
        cache: "no-store",
      });
      clearTimeout(fetchTimer);

      if (!res.ok) {
        return {
          ok: false,
          reason: `Server responded with HTTP ${res.status} (${res.statusText || "Error"})`,
        };
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (
        contentType &&
        !contentType.startsWith("image/") &&
        !contentType.includes("octet-stream")
      ) {
        return {
          ok: false,
          reason: `Invalid content type: expected image, received "${contentType}".`,
        };
      }

      if (isGif && contentType && !contentType.includes("gif") && !contentType.includes("octet-stream")) {
        return {
          ok: false,
          reason: `GIF animation lost: expected image/gif from storage, received "${contentType}".`,
        };
      }

      if (isGif && inputFrameCount > 1) {
        try {
          const buf = await res.arrayBuffer();
          const servedFrames = countGifFramesFromBytes(new Uint8Array(buf));
          if (servedFrames <= 1) {
            return {
              ok: false,
              reason: `Animated GIF lost frames during processing/delivery (input: ${inputFrameCount} frames, served: ${servedFrames} frame).`,
            };
          }
        } catch {
          // Ignore stream body read error if image decodable test runs next
        }
      }

      // 2. Empirically verify image decoding in the browser
      return await testImageDecodable(verifyUrl, timeoutMs);
    } catch (err: any) {
      clearTimeout(fetchTimer);
      if (err.name === "AbortError") {
        return {
          ok: false,
          reason: `Image request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        };
      }
      // If fetch fails due to CORS or network sandbox, fallback to direct Image decoding
      return await testImageDecodable(verifyUrl, timeoutMs);
    }
  };

  /**
   * Verifies image URL with exponential backoff and up to 3 retries
   */
  const verifyImageWithRetries = async (
    url: string,
    isGif: boolean,
    seq: number
  ): Promise<{ ok: boolean; reason?: string; cancelled?: boolean }> => {
    let lastReason = "Image verification failed.";

    for (let attempt = 1; attempt <= MAX_VERIFICATION_ATTEMPTS; attempt++) {
      if (seq !== requestSeqRef.current || !isOpenRef.current) {
        return { ok: false, cancelled: true };
      }
      setVerificationAttempt(attempt);
      if (attempt > 1) {
        setVerificationState("verification_delayed");
      } else {
        setVerificationState("verifying");
      }

      const timeoutMs = ATTEMPT_TIMEOUTS[attempt - 1] || 10000;
      const result = await verifySingleAttempt(url, timeoutMs, isGif);
      if (seq !== requestSeqRef.current || !isOpenRef.current) {
        return { ok: false, cancelled: true };
      }

      if (result.ok) {
        setVerificationState("verified");
        return { ok: true };
      }

      lastReason = result.reason || lastReason;

      // Exponential backoff wait before next attempt
      if (attempt < MAX_VERIFICATION_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1] || 1500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { ok: false, reason: lastReason };
  };

  const handleSaveAndApply = async () => {
    if (!imageSrc) {
      setErrorMessage("Please select or upload an image first.");
      setVerificationState("failed");
      return;
    }

    const seq = ++requestSeqRef.current;
    setErrorMessage(null);

    const cropData: CropData = {
      cropX: offsetX,
      cropY: offsetY,
      zoom,
      offsetX,
      offsetY,
    };

    // If imageSrc is already an external HTTP/HTTPS URL
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      const check = await verifyImageWithRetries(imageSrc, isAnimated, seq);
      if (check.cancelled || seq !== requestSeqRef.current || !isOpenRef.current) return;
      if (check.ok) {
        onApply(imageSrc, cropData);
        onClose();
        return;
      }

      // If external URL verification failed after 3 attempts, allow non-blocking apply anyway
      setVerificationState("verification_unavailable");
      setSavedAssetUrl(imageSrc);
      return;
    }

    // New uploaded file (data URL)
    setVerificationState("uploading");

    let canonicalUrl: string | null = null;
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

      if (seq !== requestSeqRef.current || !isOpenRef.current) return;

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (seq !== requestSeqRef.current || !isOpenRef.current) return;
      if (!data?.url) {
        throw new Error("Server succeeded but did not return a valid asset URL.");
      }

      canonicalUrl = data.url;
      if (isAnimated && inputFrameCount > 1 && (data.mimeType !== "image/gif" || (typeof data.frameCount === "number" && data.frameCount <= 1))) {
        setErrorMessage(
          `Warning: Upload saved, but animation metadata indicates ${data.frameCount ?? 1} frame(s) (${data.mimeType || "unknown"}).`
        );
      }
      setSavedAssetUrl(canonicalUrl);
      setImageSrc(canonicalUrl);
      setVerificationState("upload_success");
    } catch (err: any) {
      if (seq !== requestSeqRef.current || !isOpenRef.current) return;
      console.error("[ImageCustomizer] Upload error:", err);
      setVerificationState("failed");
      setErrorMessage(err.message || "Failed to upload image. Please try again.");
      return;
    }

    if (!canonicalUrl) {
      setVerificationState("failed");
      setErrorMessage("No asset URL returned from upload server.");
      return;
    }

    // Upload succeeded! Now verify accessibility & decodability
    const check = await verifyImageWithRetries(canonicalUrl, isAnimated, seq);
    if (check.cancelled || seq !== requestSeqRef.current || !isOpenRef.current) return;
    if (check.ok) {
      setVerificationState("verified");
      // Brief timeout so user sees green verification confirmation
      setTimeout(() => {
        if (seq !== requestSeqRef.current || !isOpenRef.current) return;
        onApply(canonicalUrl!, cropData);
        onClose();
      }, 350);
      return;
    }

    // Verification was delayed or temporarily unavailable, BUT asset was successfully uploaded and preserved!
    setVerificationState("verification_unavailable");
  };

  const handleApplyAnyway = () => {
    const finalUrl = savedAssetUrl || imageSrc;
    if (!finalUrl) return;

    const cropData: CropData = {
      cropX: offsetX,
      cropY: offsetY,
      zoom,
      offsetX,
      offsetY,
    };

    onApply(finalUrl, cropData);
    onClose();
  };

  const handleRetryVerification = async () => {
    const urlToVerify = savedAssetUrl || imageSrc;
    if (!urlToVerify) return;

    const seq = ++requestSeqRef.current;
    setErrorMessage(null);
    const check = await verifyImageWithRetries(urlToVerify, isAnimated, seq);
    if (check.cancelled || seq !== requestSeqRef.current || !isOpenRef.current) return;
    if (check.ok) {
      const cropData: CropData = {
        cropX: offsetX,
        cropY: offsetY,
        zoom,
        offsetX,
        offsetY,
      };
      setTimeout(() => {
        if (seq !== requestSeqRef.current || !isOpenRef.current) return;
        onApply(urlToVerify, cropData);
        onClose();
      }, 350);
    } else {
      setVerificationState("verification_unavailable");
    }
  };

  const isSmall = targetSlot === "smallImage";
  const slotTitle = isSmall ? "Small Activity Icon" : "Large Activity Image";
  const slotAspect = isSmall ? "w-24 h-24 rounded-full" : "w-48 h-48 rounded-2xl";

  const isBusy =
    verificationState === "uploading" ||
    verificationState === "verifying" ||
    verificationState === "verification_delayed";

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
            disabled={isBusy}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status & Verification Banners */}
          {verificationState === "failed" && errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-300">Upload or Verification Error</p>
                <p className="text-red-200/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {verificationState === "uploading" && (
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-2.5 text-xs text-blue-200 animate-pulse">
              <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
              <span>Uploading and processing image with high fidelity...</span>
            </div>
          )}

          {verificationState === "verifying" && (
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-2.5 text-xs text-blue-200 animate-pulse">
              <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
              <span>
                Image uploaded successfully. Verifying accessibility (attempt {verificationAttempt} of {MAX_VERIFICATION_ATTEMPTS})...
              </span>
            </div>
          )}

          {verificationState === "verification_delayed" && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center gap-2.5 text-xs text-amber-200 animate-pulse">
              <Loader2 size={16} className="text-amber-400 animate-spin shrink-0" />
              <span>
                Image uploaded. Verification is taking longer than expected. Retrying automatically (attempt {verificationAttempt} of {MAX_VERIFICATION_ATTEMPTS})...
              </span>
            </div>
          )}

          {verificationState === "verified" && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Image verified successfully! Applying changes...</span>
            </div>
          )}

          {verificationState === "verification_unavailable" && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">Image Preserved</p>
                  <p className="text-amber-200/90 text-[11px] leading-relaxed">
                    Unable to verify image accessibility immediately due to server/CDN delay. Your uploaded image is safely saved and can be applied now.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetryVerification}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#201a10] hover:bg-[#2c2214] border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5 transition-colors self-end sm:self-center"
              >
                <RefreshCw size={12} /> Retry Check
              </button>
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
                setSavedAssetUrl(null);
                setVerificationState("idle");
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
              disabled={isBusy}
              className="text-xs px-4 py-2"
            >
              Cancel
            </Button>

            {verificationState === "verification_unavailable" ? (
              <Button
                onClick={handleApplyAnyway}
                className="text-xs px-5 py-2 bg-amber-500 text-black font-bold hover:bg-amber-400 flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Check size={14} /> APPLY & SAVE ANYWAY
              </Button>
            ) : (
              <Button
                onClick={handleSaveAndApply}
                disabled={!imageSrc || isBusy}
                className="text-xs px-5 py-2 bg-white text-black font-bold hover:bg-neutral-200 flex items-center gap-1.5 disabled:opacity-60 transition-all"
              >
                {verificationState === "uploading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> UPLOADING...
                  </>
                ) : verificationState === "verifying" || verificationState === "verification_delayed" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> VERIFYING ({verificationAttempt}/{MAX_VERIFICATION_ATTEMPTS})...
                  </>
                ) : verificationState === "verified" ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600" /> VERIFIED
                  </>
                ) : (
                  <>
                    <Check size={14} /> APPLY & SAVE
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
