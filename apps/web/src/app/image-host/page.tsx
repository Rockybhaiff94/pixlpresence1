"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { apiFetch } from "@/lib/api";
import { uploadMediaAsset } from "@/lib/uploadAsset";

interface VaultAsset {
  id: string;
  name: string;
  url: string;
  size: string;
  date: string;
  isPersisted: boolean;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "External";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ImageHostPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploads, setUploads] = useState<VaultAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/rpc/assets")
      .then(async (res) => {
        if (!active) return null;
        if (res.status === 401) {
          setErrorMsg("Sign in to view and upload hosted assets.");
          return null;
        }
        if (!res.ok) {
          setErrorMsg("Asset library is temporarily unavailable. Please refresh shortly.");
          return null;
        }
        return res.json();
      })
      .then((data: Array<Record<string, unknown>> | null) => {
        if (!active || !Array.isArray(data)) return;
        setUploads(
          data
            .map((a) => ({
              id: String(a.id || ""),
              name: String(a.fileName || "Uploaded asset"),
              url: String(a.url || a.processedUrl || a.originalUrl || ""),
              size: formatBytes(Number(a.fileSize || 0)),
              date:
                typeof a.createdAt === "string"
                  ? new Date(a.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recently",
              isPersisted: true,
            }))
            .filter((item: VaultAsset) => Boolean(item.url))
        );
      })
      .catch(() => {
        if (active) setErrorMsg("Unable to load your hosted assets.");
      })
      .finally(() => {
        if (active) setLoadingAssets(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUploadFile = async (file: File) => {
    if (uploading) return;
    setErrorMsg(null);
    setUploading(true);
    try {
      const uploaded = await uploadMediaAsset({
        file,
        kind: "image",
        targetSlot: "image_host",
      });

      const newEntry: VaultAsset = {
        id: uploaded.assetId || `img_${Date.now()}`,
        name: uploaded.fileName || file.name,
        url: uploaded.url,
        size: formatBytes(uploaded.fileSize),
        date: "Just now",
        isPersisted: Boolean(uploaded.assetId),
      };
      setUploads((prev) => [newEntry, ...prev]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = (url: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleAddExternal = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directUrl.trim();
    if (!clean) return;
    if (!clean.startsWith("https://") && !clean.startsWith("http://")) {
      setErrorMsg("Enter a valid https:// or http:// image URL.");
      return;
    }
    setErrorMsg(null);
    const newEntry: VaultAsset = {
      id: `ext_${Date.now()}`,
      name: clean.split("/").pop()?.split("?")[0] || "external-media-asset.png",
      url: clean,
      size: "External",
      date: "Just now",
      isPersisted: false,
    };
    setUploads((prev) => [newEntry, ...prev]);
    setDirectUrl("");
  };

  const handleDelete = async (item: VaultAsset) => {
    if (item.isPersisted) {
      try {
        const res = await apiFetch(`/api/rpc/assets/${encodeURIComponent(item.id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setErrorMsg("Failed to remove asset from storage.");
          return;
        }
      } catch {
        setErrorMsg("Network error while deleting asset.");
        return;
      }
    }
    setUploads((prev) => prev.filter((u) => u.id !== item.id));
  };

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>STORAGE</span>
              <span>/</span>
              <span className="text-white">IMAGE & MEDIA HOST</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              IMAGE HOST.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Persistent image hosting for profile avatars, banners, Studio embeds, and RPC artwork.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-[#111111] border border-[#242424] text-xs">
            <span className="text-neutral-500">QUOTA: </span>
            <span className="text-white font-bold">{uploads.length} / 50 ASSETS</span>
          </div>
        </div>

        {errorMsg && (
          <div
            className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center gap-2"
            data-testid="image-host-error"
          >
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Dropzone / URL Ingestion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void handleUploadFile(f);
            }}
            className={`p-8 rounded-2xl bg-[#0a0a0a] border-2 border-dashed flex flex-col items-center justify-center text-center space-y-3 transition-colors nt-crosshair ${
              uploading
                ? "border-white/40 cursor-wait opacity-80"
                : "border-[#242424] hover:border-neutral-500 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUploadFile(f);
              }}
              className="hidden"
              data-testid="image-host-file-input"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-[#282828] flex items-center justify-center text-white">
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-xs">
                {uploading ? "UPLOADING TO PIXEL.GG STORAGE..." : "DRAG & DROP IMAGE FILE"}
              </p>
              <p className="text-[11px] text-neutral-500">PNG, JPG, GIF, WEBP up to 10MB</p>
            </div>
            <span className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
              {uploading ? "PLEASE WAIT" : "CLICK TO BROWSE FILES"}
            </span>
          </label>

          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#202020] flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                REGISTER EXTERNAL IMAGE URL
              </h3>
              <p className="text-[11px] text-neutral-500">
                Reference external image links from Imgur, Discord CDN, or AWS S3
              </p>
            </div>

            <form onSubmit={handleAddExternal} className="space-y-3">
              <input
                type="url"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://... (Direct image URL)"
                className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                ATTACH TO MEDIA VAULT
              </button>
            </form>
          </div>
        </div>

        {/* Media Vault Gallery */}
        <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
          <div className="space-y-0.5 pb-3 border-b border-[#181818]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              INDEXED ASSETS ({uploads.length})
            </h3>
            <p className="text-[11px] text-neutral-500">Click any asset to copy its direct hotlink</p>
          </div>

          {loadingAssets ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading hosted assets...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No uploaded assets yet. Upload a PNG, JPG, WEBP, or animated GIF above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {uploads.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#121212] border border-[#222222] space-y-3 overflow-hidden group"
                >
                  <div className="w-full h-36 rounded-lg bg-black overflow-hidden relative border border-[#1a1a1a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-white font-semibold text-xs truncate">{item.name}</p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>{item.size}</span>
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#1a1a1a]">
                    <button
                      onClick={() => handleCopy(item.url)}
                      className="flex-1 py-1.5 px-2 rounded bg-[#181818] hover:bg-[#202020] text-[11px] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedUrl === item.url ? (
                        <>
                          <Check size={11} className="text-[#4ade80]" />
                          <span className="text-[#4ade80]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded bg-[#181818] hover:bg-[#202020] text-neutral-400 hover:text-white transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>

                    <button
                      onClick={() => void handleDelete(item)}
                      className="p-1.5 rounded bg-[#181818] hover:bg-[#281515] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
