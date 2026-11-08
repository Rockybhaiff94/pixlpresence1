"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Edit2,
  RefreshCw,
  AlertCircle,
  Globe,
  Check,
  Eye,
  EyeOff,
  X as CloseIcon,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
import {
  PLATFORMS,
  PlatformDef,
  PlatformIcon,
  formatPlatformUrl,
} from "@/components/links/PlatformIcons";

interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
  color?: string | null;
  visibility: boolean;
  order: number;
}

export default function LinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal Form State
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef>(PLATFORMS[0]);
  const [inputHandle, setInputHandle] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [visibility, setVisibility] = useState(true);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const openPlatformModal = (platform: PlatformDef) => {
    setEditingLink(null);
    setSelectedPlatform(platform);
    setInputHandle("");
    setCustomLabel(platform.name);
    setVisibility(true);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (link: SocialLink) => {
    const matched =
      PLATFORMS.find((p) => p.id === link.icon?.toLowerCase()) ||
      PLATFORMS.find((p) => p.name.toLowerCase() === link.label.toLowerCase()) ||
      PLATFORMS[PLATFORMS.length - 1]; // Globe fallback

    setEditingLink(link);
    setSelectedPlatform(matched);
    setInputHandle(link.url);
    setCustomLabel(link.label);
    setVisibility(link.visibility);
    setError("");
    setModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputHandle.trim()) {
      setError("Please provide a handle, username, or valid URL.");
      return;
    }

    const formattedUrl = formatPlatformUrl(selectedPlatform, inputHandle);

    try {
      setActionLoading(true);
      setError("");

      if (editingLink) {
        // Edit existing link
        const res = await apiFetch(`/api/profile/me/links/${editingLink.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: customLabel.trim() || selectedPlatform.name,
            url: formattedUrl,
            icon: selectedPlatform.id,
            color: selectedPlatform.brandColor,
            visibility,
          }),
        });
        if (!res.ok) throw new Error("Failed to update link");
      } else {
        // Add new link
        const res = await apiFetch("/api/profile/me/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: customLabel.trim() || selectedPlatform.name,
            url: formattedUrl,
            icon: selectedPlatform.id,
            color: selectedPlatform.brandColor,
            visibility,
            order: links.length,
          }),
        });
        if (!res.ok) throw new Error("Failed to save social link");
      }

      await fetchLinks();
      setModalOpen(false);
      setInputHandle("");
    } catch (err: any) {
      setError(err.message || "Failed to save link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const res = await apiFetch(`/api/profile/me/links/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete link:", err);
    }
  };

  return (
    <AccountLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#181818] text-left font-mono">
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">
            [ 03 // DIGITAL IDENTITY & SOCIAL GRAPH ]
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            SOCIAL LINKS
          </h1>
          <p className="text-xs text-neutral-400 font-sans">
            Connect and showcase your verified social profiles, channels, gaming identities, and payment links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/customize" className="text-xs text-neutral-400 hover:text-white underline">
            Profile Appearance &rarr;
          </Link>
        </div>
      </div>

      {/* Main Guns.lol-Style Social Selection Panel */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0c0c0e] border border-[#1e1e22] space-y-6 shadow-2xl">
        <div className="space-y-1.5 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#17171a] border border-[#26262b] text-neutral-300">
              <Link2 className="w-5 h-5" />
            </span>
            <span>Link your social media profiles.</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 pl-1">
            Pick a social media to add to your profile.
          </p>
        </div>

        {/* 45-Platform Icon Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 sm:gap-3 pt-2">
          {PLATFORMS.filter((p) => p.id !== "globe").map((platform) => (
            <button
              key={platform.id}
              onClick={() => openPlatformModal(platform)}
              title={platform.name}
              className="w-full aspect-square rounded-2xl bg-[#141416] border border-[#222226] hover:border-neutral-400 hover:bg-[#1c1c20] transition-all duration-150 flex items-center justify-center p-2.5 sm:p-3 cursor-pointer group shadow-sm hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-white"
            >
              <PlatformIcon
                id={platform.id}
                className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform duration-150"
                color={platform.brandColor}
              />
            </button>
          ))}
        </div>

        {/* Prominent Horizontal "Add Custom URL" Button */}
        <button
          onClick={() => openPlatformModal(PLATFORMS.find((p) => p.id === "globe") || PLATFORMS[PLATFORMS.length - 1])}
          className="w-full sm:max-w-md p-3.5 rounded-2xl bg-[#141416] border border-[#222226] hover:border-neutral-400 hover:bg-[#1c1c20] transition-all flex items-center gap-3.5 text-left cursor-pointer group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1e1e22] border border-[#2c2c32] flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-white group-hover:border-neutral-400 transition-colors">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-white">Add Custom URL</div>
            <div className="text-xs text-neutral-400">Use your own URL and choose an icon to match.</div>
          </div>
        </button>
      </div>

      {/* Configured Social Links Section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0e0e10] border border-[#222225] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1c1c1f]">
          <div className="space-y-0.5 text-left font-mono">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ ACTIVE PROFILES ]
            </span>
            <h3 className="text-base font-bold text-white">CONFIGURED SOCIAL LINKS</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#18181b] border border-[#2a2a2f] text-neutral-300 font-mono">
            {links.length} Connected
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
            <RefreshCw size={20} className="animate-spin text-white" />
            <p className="text-xs font-mono">Loading connected profiles...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="py-12 text-center space-y-3 font-mono">
            <div className="w-12 h-12 rounded-2xl bg-[#151517] border border-[#242428] flex items-center justify-center mx-auto text-neutral-500">
              <Link2 size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">No social links configured</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto font-sans">
                Select any platform from the grid above to add your first profile or custom destination link.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const matchedPlatform = PLATFORMS.find(
                (p) => p.id === link.icon?.toLowerCase()
              );

              return (
                <div
                  key={link.id}
                  className="p-4 rounded-xl bg-[#141416] border border-[#222225] hover:border-[#333338] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#1c1c20] border border-[#2b2b30] flex items-center justify-center shrink-0 p-2.5">
                      <PlatformIcon
                        id={link.icon || "globe"}
                        className="w-5 h-5"
                        color={matchedPlatform?.brandColor || link.color || "#FFFFFF"}
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate font-sans">
                          {link.label}
                        </span>
                        {!link.visibility && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                            Hidden
                          </span>
                        )}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-400 hover:text-white truncate block max-w-md font-mono"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#1a1a1d] border border-[#2a2a2f] text-neutral-400 hover:text-white transition-colors"
                      title="Test URL"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => openEditModal(link)}
                      className="p-2 rounded-lg bg-[#1a1a1d] border border-[#2a2a2f] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit Link"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 rounded-lg bg-[#1a1a1d] border border-[#2a2a2f] text-neutral-400 hover:text-red-400 hover:border-red-900/50 transition-colors cursor-pointer"
                      title="Delete Link"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Platform Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121215] border border-[#26262b] rounded-2xl p-6 shadow-2xl space-y-5 text-left relative">
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <CloseIcon size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1c1c20] border border-[#2a2a30] flex items-center justify-center p-3">
                <PlatformIcon
                  id={selectedPlatform.id}
                  className="w-7 h-7"
                  color={selectedPlatform.brandColor}
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white font-sans">
                  {editingLink ? `Edit ${selectedPlatform.name}` : `Link your ${selectedPlatform.name}`}
                </h3>
                <p className="text-xs text-neutral-400">
                  {selectedPlatform.prefix !== "https://"
                    ? `Prefix: ${selectedPlatform.prefix}`
                    : "Direct custom website URL"}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 flex items-center gap-2 text-xs text-red-200">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveLink} className="space-y-4">
              {/* Input: Handle or URL */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-semibold text-neutral-300 block">
                  {selectedPlatform.id === "globe" ? "Website URL" : `${selectedPlatform.name} Username / Handle`}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputHandle}
                    onChange={(e) => setInputHandle(e.target.value)}
                    placeholder={selectedPlatform.placeholder}
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-[#2a2a30] rounded-xl text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                    autoFocus
                    required
                  />
                </div>
                {inputHandle && selectedPlatform.prefix !== "https://" && !inputHandle.startsWith("http") && (
                  <p className="text-[10px] text-neutral-400 font-sans">
                    Will resolve as:{" "}
                    <span className="text-white font-mono">
                      {formatPlatformUrl(selectedPlatform, inputHandle)}
                    </span>
                  </p>
                )}
              </div>

              {/* Input: Custom Label */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Display Label (Optional)
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={selectedPlatform.name}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-[#2a2a30] rounded-xl text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Visibility Switch */}
              <div className="flex items-center justify-between py-2 border-t border-[#1e1e23]">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white block">Visible on profile</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Show this link on your public profile showcase
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibility(!visibility)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    visibility ? "bg-white justify-end" : "bg-neutral-800 justify-start"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      visibility ? "bg-black" : "bg-neutral-400"
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1c1c20] hover:bg-[#25252b] text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
