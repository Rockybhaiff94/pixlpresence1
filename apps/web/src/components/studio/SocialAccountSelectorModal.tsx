"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Link2,
  ExternalLink,
  Plus,
  Check,
  RefreshCw,
  AlertCircle,
  X as CloseIcon,
  Layers,
  ArrowRight,
  Globe,
  Share2,
} from "lucide-react";
import {
  PLATFORMS,
  PlatformDef,
  PlatformIcon,
} from "@/components/links/PlatformIcons";
import {
  LinkedAccountReference,
  extractSocialHandle,
  resolvePlatformDef,
  sanitizeSocialUrl,
} from "./socialsEngine";

interface SocialAccountSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkedAccounts: LinkedAccountReference[];
  existingElementLinkIds: string[];
  onAddAccountAsIcon: (account: LinkedAccountReference) => void;
  onAddAccountAsPill?: (account: LinkedAccountReference) => void;
  onAddAllAsSocialBar?: () => void;
  onRefreshAccounts: () => Promise<void>;
  onNavigateToLinksPage: () => void;
  refreshing?: boolean;
}

export const SocialAccountSelectorModal: React.FC<SocialAccountSelectorModalProps> = ({
  isOpen,
  onClose,
  linkedAccounts,
  existingElementLinkIds,
  onAddAccountAsIcon,
  onAddAccountAsPill,
  onAddAllAsSocialBar,
  onRefreshAccounts,
  onNavigateToLinksPage,
  refreshing = false,
}) => {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"linked" | "catalog">("linked");

  if (!isOpen) return null;

  const connectedIds = new Set(
    linkedAccounts.map((a) => (a.icon || a.label || "").toLowerCase())
  );

  const filteredAccounts = linkedAccounts.filter((acc) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      acc.label.toLowerCase().includes(q) ||
      (acc.icon || "").toLowerCase().includes(q) ||
      acc.url.toLowerCase().includes(q)
    );
  });

  const unlinkedPlatforms = PLATFORMS.filter(
    (p) => !connectedIds.has(p.id.toLowerCase()) && p.id !== "globe"
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0c0c0e] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800/80 flex items-center justify-between bg-[#121216]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10">
              <Share2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                  Linked Social Accounts
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {linkedAccounts.length} Connected
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Single Source of Truth: Select accounts from your connected profiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshAccounts}
              disabled={refreshing}
              title="Refresh connected accounts from database"
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        {/* Sub-bar with Navigation & Filter */}
        <div className="px-5 py-2.5 bg-[#0e0e12] border-b border-neutral-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("linked")}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeTab === "linked"
                  ? "bg-white text-black font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Connected ({linkedAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-3 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-white text-black font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Available Platforms ({unlinkedPlatforms.length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search accounts or platforms..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-48 sm:w-60 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "linked" ? (
            linkedAccounts.length === 0 ? (
              /* PHASE 4: EMPTY STATE WHEN NO ACCOUNTS LINKED */
              <div className="p-8 text-center rounded-2xl bg-neutral-950/60 border border-dashed border-neutral-800 space-y-4 my-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mx-auto">
                  <Link2 size={24} />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    No social media accounts linked yet.
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Link your social media profiles in your Pixel.gg account settings first.
                    Once connected, they will automatically appear here to add to your profile embed.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onNavigateToLinksPage}
                    className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Plus size={14} />
                    Add Social Media
                  </button>
                  <button
                    type="button"
                    onClick={onRefreshAccounts}
                    disabled={refreshing}
                    className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs hover:text-white hover:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              /* LIST OF CONNECTED ACCOUNTS */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Available Accounts ({filteredAccounts.length})</span>
                  {onAddAllAsSocialBar && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddAllAsSocialBar();
                        onClose();
                      }}
                      className="text-[11px] text-white hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Layers size={12} /> Add All in Unified Social Bar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredAccounts.map((account) => {
                    const platform = resolvePlatformDef(account.icon, account.label);
                    const handle = extractSocialHandle(account.url, platform.id, account.label);
                    const isAlreadyAdded = existingElementLinkIds.includes(account.id);

                    return (
                      <div
                        key={account.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isAlreadyAdded
                            ? "bg-neutral-900/40 border-neutral-800/80"
                            : "bg-neutral-900/90 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                              <PlatformIcon
                                id={platform.id}
                                color={account.color || platform.brandColor}
                                className="w-5 h-5"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs truncate">
                                  {account.label || platform.name}
                                </span>
                                {isAlreadyAdded && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                                    In Embed
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-400 block truncate">
                                {handle}
                              </span>
                            </div>
                          </div>

                          <a
                            href={sanitizeSocialUrl(account.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview destination URL"
                            className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/60">
                          <button
                            type="button"
                            onClick={() => {
                              onAddAccountAsIcon(account);
                              onClose();
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-white text-black font-bold text-[10px] hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} /> Add Icon
                          </button>
                          {onAddAccountAsPill && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddAccountAsPill(account);
                                onClose();
                              }}
                              className="py-1.5 px-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-[10px] hover:text-white hover:border-neutral-600 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              Add Pill
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* TAB: AVAILABLE PLATFORMS CATALOG (UNLINKED) */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                <span>
                  To display these platforms, connect them first in your account settings.
                </span>
                <button
                  type="button"
                  onClick={onNavigateToLinksPage}
                  className="px-2.5 py-1 rounded bg-white text-black font-bold text-[10px] hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Open Links Page
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {unlinkedPlatforms
                  .filter((p) =>
                    filterQuery
                      ? p.name.toLowerCase().includes(filterQuery.toLowerCase())
                      : true
                  )
                  .map((platform) => (
                    <div
                      key={platform.id}
                      onClick={onNavigateToLinksPage}
                      className="p-2.5 rounded-xl bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                          <PlatformIcon id={platform.id} className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                        </div>
                        <span className="text-xs text-neutral-300 font-bold truncate">
                          {platform.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 group-hover:text-white transition-colors">
                        Connect →
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-[#101014] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">Synced with Pixel.gg Account System</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToLinksPage}
            className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
          >
            Manage Accounts & Links <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

