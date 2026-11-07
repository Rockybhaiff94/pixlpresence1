"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Globe,
  Check,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
  visibility: boolean;
  order: number;
}

const POPULAR_PLATFORMS = [
  { label: "Discord", icon: "discord", placeholder: "https://discord.gg/yourserver" },
  { label: "GitHub", icon: "github", placeholder: "https://github.com/yourhandle" },
  { label: "X / Twitter", icon: "twitter", placeholder: "https://x.com/yourhandle" },
  { label: "Spotify", icon: "spotify", placeholder: "https://open.spotify.com/user/..." },
  { label: "YouTube", icon: "youtube", placeholder: "https://youtube.com/@yourchannel" },
  { label: "Twitch", icon: "twitch", placeholder: "https://twitch.tv/yourchannel" },
  { label: "Instagram", icon: "instagram", placeholder: "https://instagram.com/yourhandle" },
  { label: "Telegram", icon: "telegram", placeholder: "https://t.me/yourusername" },
  { label: "Steam", icon: "steam", placeholder: "https://steamcommunity.com/id/..." },
  { label: "Custom Website", icon: "globe", placeholder: "https://yourdomain.com" },
];

export default function LinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [selectedPlatform, setSelectedPlatform] = useState(POPULAR_PLATFORMS[0]);
  const [label, setLabel] = useState(POPULAR_PLATFORMS[0].label);
  const [url, setUrl] = useState("");

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

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      const res = await apiFetch("/api/profile/me/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || selectedPlatform.label,
          url: url.trim(),
          icon: selectedPlatform.icon,
          visibility: true,
          order: links.length,
        }),
      });

      if (!res.ok) throw new Error("Failed to save social link");
      await fetchLinks();
      setModalOpen(false);
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to add social link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      const res = await apiFetch(`/api/profile/me/links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLinks(links.filter((l) => l.id !== id));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>PROFILE</span>
              <span>/</span>
              <span className="text-white">SOCIAL CHANNELS & HUBS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              SOCIAL LINKS.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Connect external identities and interactive links shown on your public showcase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>ADD LINK</span>
            </button>
          </div>
        </div>

        {/* Links Grid / List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-neutral-500 text-xs">
            <RefreshCw size={16} className="animate-spin mr-2" />
            <span>LOADING SOCIAL DIRECTORY...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0a0a0a] border border-[#202020] text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center mx-auto text-neutral-400">
              <LinkIcon size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-bold text-sm">NO SOCIAL CHANNELS LINKED</h3>
              <p className="text-xs text-neutral-500">
                Add links to Discord, GitHub, Twitter, Spotify, or your custom website.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              ADD YOUR FIRST LINK
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="p-4 rounded-xl bg-[#0c0c0c] border border-[#222222] hover:border-neutral-700 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center shrink-0 text-white">
                    <Globe size={18} className="text-neutral-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-white font-semibold text-xs truncate">{link.label}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-neutral-500 hover:text-white truncate flex items-center gap-1"
                    >
                      <span>{link.url}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-[#201010] transition-colors cursor-pointer"
                    title="Delete link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Link Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0e0e0e] border border-[#282828] rounded-2xl p-6 space-y-5 shadow-2xl nt-crosshair">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                  [ LINK REGISTRY ]
                </span>
                <h3 className="text-lg font-bold text-white">ADD SOCIAL LINK</h3>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#2a0e0e] border border-[#d71920]/40 text-[#ff6b6b] text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddLink} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Select Platform
                  </label>
                  <select
                    value={selectedPlatform.label}
                    onChange={(e) => {
                      const p = POPULAR_PLATFORMS.find((plat) => plat.label === e.target.value);
                      if (p) {
                        setSelectedPlatform(p);
                        setLabel(p.label);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#262626] text-white text-xs focus:outline-none"
                  >
                    {POPULAR_PLATFORMS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Custom Display Label
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. My Portfolio or Personal Discord"
                    className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#262626] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Target URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={selectedPlatform.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#262626] text-white text-xs focus:outline-none focus:border-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#141414] border border-[#242424] text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    {actionLoading ? "SAVING..." : "ADD LINK"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
