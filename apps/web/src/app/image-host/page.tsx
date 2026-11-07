"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Shield,
  Crown,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { useAuth } from "@/context/AuthContext";

export default function ImageHostPage() {
  const { user } = useAuth();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState("");
  const [uploads, setUploads] = useState([
    {
      id: "img_1",
      name: "profile-banner-monochrome.png",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
      size: "1.4 MB",
      date: "Nov 5, 2026",
    },
    {
      id: "img_2",
      name: "avatar-industrial-core.jpg",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80",
      size: "340 KB",
      date: "Nov 3, 2026",
    },
  ]);

  const handleCopy = (url: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleAddExternal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;
    const newEntry = {
      id: `img_${Date.now()}`,
      name: directUrl.split("/").pop()?.split("?")[0] || "external-media-asset.png",
      url: directUrl.trim(),
      size: "External",
      date: "Just now",
    };
    setUploads([newEntry, ...uploads]);
    setDirectUrl("");
  };

  const handleDelete = (id: string) => {
    setUploads(uploads.filter((u) => u.id !== id));
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
              Zero-compression image hosting for profile avatars, custom banners, and audio artwork.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-[#111111] border border-[#242424] text-xs">
            <span className="text-neutral-500">QUOTA: </span>
            <span className="text-white font-bold">{uploads.length} / 50 ASSETS</span>
          </div>
        </div>

        {/* Upload Dropzone / URL Ingestion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-[#0a0a0a] border-2 border-dashed border-[#242424] hover:border-neutral-500 flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer nt-crosshair">
            <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-[#282828] flex items-center justify-center text-white">
              <UploadCloud size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-xs">DRAG & DROP IMAGE FILE</p>
              <p className="text-[11px] text-neutral-500">PNG, JPG, GIF, WEBP up to 10MB</p>
            </div>
            <span className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
              CLICK TO BROWSE FILES
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#202020] flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                REGISTER EXTERNAL IMAGE URL
              </h3>
              <p className="text-[11px] text-neutral-500">
                Index image links from Imgur, Discord CDN, or AWS S3 for profile usage
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
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded bg-[#181818] hover:bg-[#281515] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

