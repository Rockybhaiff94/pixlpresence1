"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Image as ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { uploadMediaAsset } from "@/lib/uploadAsset";
import { BuilderCanvasSettings, BuilderPreferences } from "./profileBuilderTypes";
import { sanitizeExternalUrl } from "./componentRegistry";

interface BuilderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: BuilderPreferences;
  canvas: BuilderCanvasSettings;
  onUpdatePreferences: (updates: Partial<BuilderPreferences>) => void;
  onUpdateCanvas: (updates: Partial<BuilderCanvasSettings>) => void;
}

export const BuilderSettingsModal: React.FC<BuilderSettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  canvas,
  onUpdatePreferences,
  onUpdateCanvas,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      data-testid="builder-settings-modal"
    >
      <div className="w-full max-w-md bg-[#0d0d11] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1d1d24] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Profile Builder Settings
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Canvas grid, snapping, insertion target, and display preferences
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
            data-testid="settings-modal-close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Grid Visibility & Size */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Show Canvas Grid</span>
              <input
                type="checkbox"
                checked={preferences.showGrid}
                onChange={(e) => {
                  onUpdatePreferences({ showGrid: e.target.checked });
                  onUpdateCanvas({ gridEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-grid"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Grid Size (px)</span>
              <input
                type="number"
                min={4}
                max={64}
                value={canvas.gridSize}
                onChange={(e) =>
                  onUpdateCanvas({
                    gridSize: Math.max(4, Math.min(64, Number(e.target.value) || 16)),
                  })
                }
                className="w-20 bg-[#14141a] border border-[#282832] rounded px-2 py-1 text-white text-right outline-none"
              />
            </div>
          </div>

          {/* Snapping Controls */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Enable Snapping</span>
              <input
                type="checkbox"
                checked={preferences.snapEnabled}
                onChange={(e) => {
                  onUpdatePreferences({ snapEnabled: e.target.checked });
                  onUpdateCanvas({ snapEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-snap"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Snap to Grid Points</span>
              <input
                type="checkbox"
                disabled={!preferences.snapEnabled}
                checked={preferences.snapToGrid}
                onChange={(e) => onUpdatePreferences({ snapToGrid: e.target.checked })}
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Smart Alignment Guides</span>
              <input
                type="checkbox"
                checked={preferences.smartGuides}
                onChange={(e) => {
                  onUpdatePreferences({ smartGuides: e.target.checked });
                  onUpdateCanvas({ smartGuidesEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-guides"
              />
            </div>
          </div>

          {/* Insertion & Display */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="space-y-1">
              <span className="text-neutral-400 text-[11px] block">Default Insertion Target</span>
              <select
                value={preferences.defaultInsertTarget}
                onChange={(e) =>
                  onUpdatePreferences({
                    defaultInsertTarget: e.target.value as BuilderPreferences["defaultInsertTarget"],
                  })
                }
                className="w-full bg-[#14141a] border border-[#282832] rounded-lg px-2.5 py-1.5 text-white outline-none"
              >
                <option value="selected-container">Selected Container (or Primary Embed)</option>
                <option value="primary-embed">Primary Profile Embed</option>
                <option value="canvas">Canvas Root (when allowed)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-neutral-300">Show Component Outlines on Hover</span>
              <input
                type="checkbox"
                checked={preferences.showComponentOutlines}
                onChange={(e) =>
                  onUpdatePreferences({ showComponentOutlines: e.target.checked })
                }
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Autosave */}
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Auto-Save Local & Draft Sync</span>
            <input
              type="checkbox"
              checked={preferences.autoSaveEnabled}
              onChange={(e) => onUpdatePreferences({ autoSaveEnabled: e.target.checked })}
              className="accent-white w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-[#1d1d24] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold cursor-pointer hover:bg-neutral-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialUrl?: string;
  targetSlot?: string;
  onSelectMedia: (url: string) => void;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  title = "Select or Upload Media",
  initialUrl = "",
  targetSlot = "studio_asset",
  onSelectMedia,
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [recentAssets, setRecentAssets] = useState<Array<{ id: string; url: string; fileName: string; isAnimated?: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }
    let active = true;
    apiFetch("/api/rpc/assets")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status !== 401 && active) {
            setAssetsError("Saved asset library is temporarily unavailable.");
          }
          return null;
        }
        return res.json();
      })
      .then((data: { assets?: Array<{ id?: string; url?: string; processedUrl?: string; originalUrl?: string; fileName?: string; isAnimated?: boolean }> } | Array<{ id?: string; url?: string; processedUrl?: string; originalUrl?: string; fileName?: string; isAnimated?: boolean }> | null) => {
        if (!active || !data) return;
        const list = Array.isArray(data) ? data : Array.isArray(data.assets) ? data.assets : [];
        setRecentAssets(
          list
            .map((a) => ({
              id: a?.id || a?.url || a?.processedUrl || a?.originalUrl || "",
              url: a?.url || a?.processedUrl || a?.originalUrl || "",
              fileName: a?.fileName || "Uploaded asset",
              isAnimated: Boolean(a?.isAnimated),
            }))
            .filter((a) => Boolean(a.url))
            .slice(0, 12)
        );
      })
      .catch(() => {});
    return () => {
      active = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const processUploadFile = async (file: File) => {
    if (uploading) return;
    setError(null);
    setLastSelectedFile(file);
    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Validating file...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const uploaded = await uploadMediaAsset({
        file,
        targetSlot,
        kind: "image",
        signal: controller.signal,
        onProgress: (pct, stage) => {
          setUploadProgress(pct);
          setUploadStage(stage);
        },
      });

      setLastSelectedFile(null);
      onSelectMedia(uploaded.url);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Upload cancelled.") {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed. Check connection or image size.");
      }
    } finally {
      abortControllerRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processUploadFile(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUploadFile(file);
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/rpc/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecentAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    } catch {
      // Ignore transient delete errors
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeExternalUrl(urlInput);
    if (!clean) {
      setError("Enter a valid https://, http://, or relative asset URL.");
      return;
    }
    onSelectMedia(clean);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      data-testid="media-upload-modal"
    >
      <div className="w-full max-w-md bg-[#0d0d11] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1d1d24] flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
          <button
            type="button"
            onClick={() => {
              abortControllerRef.current?.abort();
              onClose();
            }}
            className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Upload via Pixel.gg Image Host */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFile}
            className={`flex flex-col items-center justify-center p-5 rounded-xl border border-dashed bg-[#121217] transition-colors ${
              uploading
                ? "border-white/30 cursor-wait opacity-90"
                : "border-[#30303b] hover:border-white/40 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              data-testid="media-file-input"
            />
            {uploading ? (
              <div className="w-full flex flex-col items-center space-y-2">
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="text-neutral-300">{uploadStage || "Uploading to Pixel.gg Storage..."}</span>
                <div className="w-full max-w-xs h-1 bg-[#1e1e26] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    abortControllerRef.current?.abort();
                  }}
                  className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer pt-0.5"
                >
                  Cancel upload
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={20} className="text-neutral-300 mb-2" />
                <span className="text-white font-semibold">Upload PNG, JPG, WEBP or GIF</span>
                <span className="text-[10px] text-neutral-500 mt-1">
                  Preserves animated GIFs · Max 10 MB
                </span>
              </>
            )}
          </label>

          {error && (
            <div
              className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-[11px] flex items-center justify-between gap-2"
              data-testid="media-upload-error"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle size={13} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              {lastSelectedFile && !uploading && (
                <button
                  type="button"
                  onClick={() => void processUploadFile(lastSelectedFile)}
                  className="shrink-0 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  data-testid="media-upload-retry"
                >
                  <RefreshCw size={10} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Direct URL */}
          <form onSubmit={handleApplyUrl} className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 uppercase block">Or Direct Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[#14141a] border border-[#282832] rounded-lg px-2.5 py-1.5 text-white outline-none"
                data-testid="media-url-input"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 cursor-pointer flex items-center gap-1"
                data-testid="media-url-apply"
              >
                <Check size={12} />
                <span>Apply</span>
              </button>
            </div>
          </form>

          {/* Uploaded Assets Library */}
          {recentAssets.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#1b1b22]">
              <span className="text-[10px] text-neutral-400 uppercase block">
                Your Pixel.gg Hosted Assets
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto custom-scrollbar">
                {recentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-[#282832] hover:border-white bg-[#14141a]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMedia(asset.url);
                        onClose();
                      }}
                      className="w-full h-full cursor-pointer"
                      title={asset.fileName}
                    >
                      <img src={asset.url} alt={asset.fileName} className="w-full h-full object-cover" />
                    </button>
                    {asset.id && asset.id !== asset.url && (
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteAsset(asset.id, e)}
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/75 text-neutral-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentAssets.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-1">
              <ImageIcon size={12} />
              <span>{assetsError || "Uploaded assets appear here for reuse across embeds."}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
