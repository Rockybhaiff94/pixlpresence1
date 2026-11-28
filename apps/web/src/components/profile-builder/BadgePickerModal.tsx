"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, Crown, Lock, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BadgeInventoryItem, renderBadgeGlyph } from "./badgeCatalog";

export type BadgePickerMode = "name-badge" | "decoration-badge";
export type BadgePickerCategory = "official" | "store" | "custom";

interface BadgePickerModalProps {
  isOpen: boolean;
  title?: string;
  mode?: BadgePickerMode;
  badges: BadgeInventoryItem[];
  storeBadges?: BadgeInventoryItem[];
  customBadges?: BadgeInventoryItem[];
  canUploadCustomBadges?: boolean;
  placedBadgeIds?: string[];
  loading?: boolean;
  selectedBadgeId?: string | null;
  onSelectBadge: (badge: BadgeInventoryItem) => void;
  onCustomBadgeUploaded?: (badge: BadgeInventoryItem) => void;
  onClose: () => void;
}

export const BadgePickerModal: React.FC<BadgePickerModalProps> = ({
  isOpen,
  title = "Add Badge",
  mode = "name-badge",
  badges,
  storeBadges = [],
  customBadges = [],
  canUploadCustomBadges = false,
  placedBadgeIds = [],
  loading = false,
  selectedBadgeId,
  onSelectBadge,
  onCustomBadgeUploaded,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<BadgePickerCategory>("official");
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"owned" | "all">("owned");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const placedSet = useMemo(() => new Set(placedBadgeIds), [placedBadgeIds]);

  const activeList = useMemo(() => {
    if (activeCategory === "store") return storeBadges;
    if (activeCategory === "custom") return customBadges;
    return badges;
  }, [activeCategory, badges, storeBadges, customBadges]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeList.filter((b) => {
      if (activeCategory === "official" && filterMode === "owned" && !b.owned) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }, [activeList, activeCategory, filterMode, query]);

  if (!isOpen) return null;

  const ownedCount = badges.filter((b) => b.owned).length;
  const isDecorationMode = mode === "decoration-badge";

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds the 10 MB upload limit.");
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !canUploadCustomBadges || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("fileName", pendingFile.name);
      formData.append("targetSlot", "custom_badge");

      const res = await apiFetch("/api/rpc/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setUploadError(data?.error || "Failed to upload custom badge.");
        return;
      }

      const newBadge: BadgeInventoryItem = {
        id: `custom:${data.assetId}`,
        assetId: data.assetId,
        name: pendingFile.name.replace(/\.[^.]+$/, "") || "Custom Badge",
        description: data.isAnimated ? "Animated GIF custom badge" : "Custom uploaded badge",
        category: "Custom",
        rarity: "Epic",
        icon: "Image",
        defaultColor: "#ffffff",
        source: "custom",
        imageUrl: data.url,
        isAnimated: Boolean(data.isAnimated),
        owned: true,
      };
      onCustomBadgeUploaded?.(newBadge);
      setPendingFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSelectBadge(newBadge);
      if (!isDecorationMode) {
        onClose();
      }
    } catch {
      setUploadError("Network error while uploading custom badge.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      onClick={onClose}
      data-testid="badge-picker-modal"
      data-picker-mode={mode}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[#0e0e14] border border-[#262632] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1e1e28] flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#181822] border border-[#2a2a36] text-neutral-300 uppercase">
                {isDecorationMode ? "Multi-Select Decorations" : "Single Name Badge"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {isDecorationMode
                ? "Add unlocked badges or custom artwork as independent profile elements."
                : `${ownedCount} unlocked of ${badges.length} Pixel.gg badges · Replaces current name badge`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#16161f] hover:bg-[#1e1e28] border border-[#282834] text-neutral-400 hover:text-white cursor-pointer"
            aria-label="Close badge picker"
            data-testid="badge-picker-close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Top Category Navigation */}
        <div className="px-4 pt-2.5 pb-2 border-b border-[#1b1b24] grid grid-cols-3 gap-1.5 bg-[#0b0b10]">
          <button
            type="button"
            onClick={() => setActiveCategory("official")}
            data-testid="badge-picker-tab-official"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
              activeCategory === "official"
                ? "bg-white text-black border-white"
                : "bg-[#121217] border-[#24242d] text-neutral-400 hover:text-white"
            }`}
          >
            Pixel.gg Badges
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("store")}
            data-testid="badge-picker-tab-store"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
              activeCategory === "store"
                ? "bg-white text-black border-white"
                : "bg-[#121217] border-[#24242d] text-neutral-400 hover:text-white"
            }`}
          >
            Store / Purchased
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("custom")}
            data-testid="badge-picker-tab-custom"
            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeCategory === "custom"
                ? "bg-white text-black border-white"
                : "bg-[#121217] border-[#24242d] text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles size={10} />
            <span>Custom Badges</span>
          </button>
        </div>

        {/* Search & Filter (shown for Official & Store, or when Custom has items) */}
        {(activeCategory !== "custom" || customBadges.length > 0) && (
          <div className="px-4 py-2.5 border-b border-[#1b1b24] flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeCategory === "custom"
                    ? "Search custom badges..."
                    : activeCategory === "store"
                    ? "Search purchased badges..."
                    : "Search unlocked badges..."
                }
                className="w-full bg-[#121217] border border-[#24242d] focus:border-white/40 rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-white outline-none"
                data-testid="badge-picker-search"
              />
            </div>
            {activeCategory === "official" && (
              <div className="flex items-center bg-[#121217] border border-[#24242d] rounded-lg p-0.5">
                {(["owned", "all"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFilterMode(m)}
                    className={`px-2 py-1 rounded-md text-[10px] capitalize cursor-pointer ${
                      filterMode === m
                        ? "bg-white text-black font-bold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    data-testid={`badge-picker-filter-${m}`}
                  >
                    {m === "owned" ? "Unlocked" : "All"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {/* Custom Upload Area */}
          {activeCategory === "custom" && (
            <div className="space-y-2.5">
              {!isDecorationMode ? (
                <div className="p-4 rounded-lg bg-[#121217] border border-[#24242d] text-center space-y-1.5">
                  <p className="text-[11px] font-bold text-white">Decoration Badges Only</p>
                  <p className="text-[10px] text-neutral-400">
                    Custom uploaded images and GIFs can be added as decorative profile badges, not as your single Name Badge.
                  </p>
                </div>
              ) : !canUploadCustomBadges ? (
                <div
                  className="p-4 rounded-lg bg-[#121217] border border-amber-500/30 text-center space-y-2"
                  data-testid="custom-badge-locked-card"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <Crown size={16} />
                  </div>
                  <div className="text-[11px] font-bold text-white">
                    Custom Badge Uploads Require Premium
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    Upgrade to Pixel.gg Premium to upload custom PNG, WebP, or animated GIF badges and place them anywhere on your profile.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#121217] border border-[#24242d] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-white">Upload Custom Badge</div>
                      <div className="text-[9px] text-neutral-400">
                        PNG, JPG, WebP, or animated GIF (max 10 MB)
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFilePicked}
                      className="hidden"
                      data-testid="custom-badge-file-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-[#191924] hover:bg-[#222230] border border-[#2e2e3c] text-[10px] font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      data-testid="custom-badge-choose-btn"
                    >
                      <Upload size={11} />
                      <span>Choose Image / GIF</span>
                    </button>
                  </div>

                  {previewUrl && (
                    <div className="p-2.5 rounded-lg bg-[#0b0b10] border border-[#24242d] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Custom badge preview"
                          className="w-10 h-10 rounded-lg object-contain bg-[#14141c] border border-[#282834] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-white truncate">
                            {pendingFile?.name}
                          </div>
                          <div className="text-[9px] text-neutral-400">
                            {pendingFile ? `${Math.round(pendingFile.size / 1024)} KB` : ""}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleConfirmUpload}
                        disabled={uploading}
                        className="px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shrink-0"
                        data-testid="custom-badge-upload-confirm"
                      >
                        {uploading ? "Uploading..." : "Upload & Add"}
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[10px] text-rose-400" data-testid="custom-badge-upload-error">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Badge List / Empty States */}
          {activeCategory === "store" && storeBadges.length === 0 ? (
            <div
              className="py-10 px-4 text-center space-y-1.5 rounded-lg bg-[#121217] border border-[#24242d]"
              data-testid="store-badges-empty"
            >
              <div className="text-[11px] font-bold text-white">No Store Badges Owned Yet</div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Badges purchased from the upcoming Pixel.gg Badge Store will appear here automatically.
              </p>
            </div>
          ) : activeCategory === "custom" && !isDecorationMode ? null : loading ? (
            <div className="py-10 text-center text-[11px] text-neutral-500">
              Loading badge inventory...
            </div>
          ) : filtered.length === 0 ? (
            activeCategory === "custom" ? (
              <div className="py-6 text-center text-[10px] text-neutral-500">
                No custom uploaded badges yet.
              </div>
            ) : (
              <div className="py-10 text-center text-[11px] text-neutral-500">
                {filterMode === "owned"
                  ? "No unlocked badges match your search."
                  : "No badges found."}
              </div>
            )
          ) : (
            filtered.map((badge) => {
              const isSelected = selectedBadgeId === badge.id;
              const isAlreadyPlaced = isDecorationMode && placedSet.has(badge.id);
              const isDisabled = !badge.owned || (activeCategory === "custom" && !isDecorationMode);
              return (
                <button
                  key={badge.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onSelectBadge(badge);
                    if (!isDecorationMode) {
                      onClose();
                    }
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-2.5 transition-colors ${
                    isDisabled
                      ? "bg-[#0c0c10] border-[#1c1c24] opacity-45 cursor-not-allowed"
                      : isSelected || isAlreadyPlaced
                        ? "bg-[#191924] border-white/50 text-white cursor-pointer"
                        : "bg-[#121217] hover:bg-[#171720] border-[#24242d] text-white cursor-pointer"
                  }`}
                  data-testid={`badge-picker-item-${badge.id}`}
                  data-owned={badge.owned ? "true" : "false"}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0d0d13] border border-[#24242d] flex items-center justify-center shrink-0 overflow-hidden">
                      {badge.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={badge.imageUrl}
                          alt={badge.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        renderBadgeGlyph(badge.icon, 16, badge.defaultColor || "#ffffff")
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold truncate">{badge.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#181822] border border-[#2a2a36] text-neutral-400 uppercase shrink-0">
                          {badge.source === "custom" ? (badge.isAnimated ? "GIF" : "Custom") : badge.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isDisabled ? (
                      <span className="inline-flex items-center gap-1 text-[9px] text-neutral-500">
                        <Lock size={11} />
                        Locked
                      </span>
                    ) : isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                        <Check size={12} />
                        Selected
                      </span>
                    ) : isAlreadyPlaced ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-400">
                        <Check size={12} />
                        Added
                      </span>
                    ) : isDecorationMode ? (
                      <span className="inline-flex items-center gap-1 text-[9px] text-neutral-300">
                        <Plus size={11} />
                        Add
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400">Select</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
