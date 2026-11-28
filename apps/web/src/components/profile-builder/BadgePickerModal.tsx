"use client";

import React, { useMemo, useState } from "react";
import { Check, Lock, Search, X } from "lucide-react";
import { BadgeInventoryItem, renderBadgeGlyph } from "./badgeCatalog";

interface BadgePickerModalProps {
  isOpen: boolean;
  title?: string;
  badges: BadgeInventoryItem[];
  loading?: boolean;
  selectedBadgeId?: string | null;
  onSelectBadge: (badge: BadgeInventoryItem) => void;
  onClose: () => void;
}

export const BadgePickerModal: React.FC<BadgePickerModalProps> = ({
  isOpen,
  title = "Select Unlocked Badge",
  badges,
  loading = false,
  selectedBadgeId,
  onSelectBadge,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"owned" | "all">("owned");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return badges.filter((b) => {
      if (filterMode === "owned" && !b.owned) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }, [badges, filterMode, query]);

  if (!isOpen) return null;

  const ownedCount = badges.filter((b) => b.owned).length;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      onClick={onClose}
      data-testid="badge-picker-modal"
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#0e0e14] border border-[#262632] shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1e1e28] flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {ownedCount} unlocked of {badges.length} badges
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

        {/* Search & Filter */}
        <div className="px-4 py-2.5 border-b border-[#1b1b24] flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search unlocked badges..."
              className="w-full bg-[#121217] border border-[#24242d] focus:border-white/40 rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-white outline-none"
              data-testid="badge-picker-search"
            />
          </div>
          <div className="flex items-center bg-[#121217] border border-[#24242d] rounded-lg p-0.5">
            {(["owned", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-2 py-1 rounded-md text-[10px] capitalize cursor-pointer ${
                  filterMode === mode
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
                data-testid={`badge-picker-filter-${mode}`}
              >
                {mode === "owned" ? "Unlocked" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {loading ? (
            <div className="py-10 text-center text-[11px] text-neutral-500">
              Loading badge inventory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-neutral-500">
              {filterMode === "owned"
                ? "No unlocked badges match your search."
                : "No badges found."}
            </div>
          ) : (
            filtered.map((badge) => {
              const isSelected = selectedBadgeId === badge.id;
              return (
                <button
                  key={badge.id}
                  type="button"
                  disabled={!badge.owned}
                  onClick={() => {
                    if (!badge.owned) return;
                    onSelectBadge(badge);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-2.5 transition-colors ${
                    !badge.owned
                      ? "bg-[#0c0c10] border-[#1c1c24] opacity-45 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#191924] border-white/50 text-white cursor-pointer"
                        : "bg-[#121217] hover:bg-[#171720] border-[#24242d] text-white cursor-pointer"
                  }`}
                  data-testid={`badge-picker-item-${badge.id}`}
                  data-owned={badge.owned ? "true" : "false"}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0d0d13] border border-[#24242d] flex items-center justify-center shrink-0">
                      {renderBadgeGlyph(badge.icon, 16, badge.defaultColor || "#ffffff")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold truncate">{badge.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#181822] border border-[#2a2a36] text-neutral-400 uppercase shrink-0">
                          {badge.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {!badge.owned ? (
                      <span className="inline-flex items-center gap-1 text-[9px] text-neutral-500">
                        <Lock size={11} />
                        Locked
                      </span>
                    ) : isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                        <Check size={12} />
                        Selected
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
