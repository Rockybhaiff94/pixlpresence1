"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Sliders,
  Music,
  Image as ImageIcon,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Save,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function CustomizePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Profile Customization Form State
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#ffffff");
  const [particles, setParticles] = useState("None");
  const [blur, setBlur] = useState(10);
  const [opacity, setOpacity] = useState(90);
  const [roundedCorners, setRoundedCorners] = useState(16);
  const [musicUrl, setMusicUrl] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/profile/me");
      if (res.ok) {
        const p = await res.json();
        setDisplayName(p.displayName || "");
        setBio(p.bio || "");
        setAvatarUrl(p.avatarUrl || "");
        setBannerUrl(p.bannerUrl || "");
        setAccentColor(p.accentColor || "#ffffff");
        setParticles(p.particles || "None");
        setBlur(p.blur ?? 10);
        setOpacity(p.opacity ?? 90);
        setRoundedCorners(p.roundedCorners ?? 16);
        setMusicUrl(p.musicUrl || "");
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);
      const res = await apiFetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          avatarUrl,
          bannerUrl,
          accentColor,
          particles,
          blur: Number(blur),
          opacity: Number(opacity),
          roundedCorners: Number(roundedCorners),
          musicUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      setMsg({ text: "Profile customization saved and synchronized.", type: "success" });
      await refreshUser();
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const ACCENTS = ["#ffffff", "#d71920", "#ff9800", "#4ade80", "#60a5fa", "#a855f7", "#ec4899", "#737373"];

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>PROFILE</span>
              <span>/</span>
              <span className="text-white">APPEARANCE & CUSTOMIZATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              CUSTOMIZE PROFILE.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Fine-tune visual materials, typography, audio ambience, and monochromatic tokens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user?.username && (
              <a
                href={`/${user.username}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#242424] text-xs text-white flex items-center gap-1.5 transition-colors"
              >
                <span>Live View</span>
                <ExternalLink size={12} className="text-neutral-500" />
              </a>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={13} />
              <span>{saving ? "SAVING..." : "SAVE CHANGES"}</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {msg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              msg.type === "success"
                ? "bg-[#0d2818] border-[#4ade80]/40 text-[#4ade80]"
                : "bg-[#2a0e0e] border-[#d71920]/40 text-[#ff6b6b]"
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Form */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* General Information */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="space-y-0.5 pb-3 border-b border-[#181818]">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette size={14} className="text-neutral-400" />
                  IDENTITY & COPY
                </h2>
                <p className="text-[11px] text-neutral-500">Public profile title and bio text</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Public Display Name"
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Bio / Description
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description, role, or message..."
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Media Assets */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="space-y-0.5 pb-3 border-b border-[#181818]">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon size={14} className="text-neutral-400" />
                  MEDIA & ASSETS
                </h2>
                <p className="text-[11px] text-neutral-500">Avatar and banner asset URLs</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... (Direct image link)"
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Banner Background URL
                  </label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://... (Optional banner image)"
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={12} /> Background Audio URL (MP3/SoundCloud)
                  </label>
                  <input
                    type="url"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="https://... (Direct audio stream URL)"
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Styling & Sliders */}
            <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
              <div className="space-y-0.5 pb-3 border-b border-[#181818]">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={14} className="text-neutral-400" />
                  VISUAL MATERIAL & SHADER
                </h2>
                <p className="text-[11px] text-neutral-500">Blur, glass opacity, and accent colors</p>
              </div>

              <div className="space-y-4">
                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccentColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          accentColor === c ? "border-white scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="px-2 py-1 rounded bg-[#141414] border border-[#262626] text-[11px] text-white w-20 text-center"
                    />
                  </div>
                </div>

                {/* Particles */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Background Particle Effect
                  </label>
                  <select
                    value={particles}
                    onChange={(e) => setParticles(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none"
                  >
                    <option value="None">None (Pure Black)</option>
                    <option value="Snow">Snow Flakes</option>
                    <option value="Stars">Starlight Shimmer</option>
                    <option value="Fireflies">Ember Fireflies</option>
                  </select>
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                      Card Blur (Glassmorphism)
                    </span>
                    <span className="text-white font-bold text-xs">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                      Card Opacity
                    </span>
                    <span className="text-white font-bold text-xs">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                {/* Corner Radius */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                      Corner Radius
                    </span>
                    <span className="text-white font-bold text-xs">{roundedCorners}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={roundedCorners}
                    onChange={(e) => setRoundedCorners(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Live Mobile Profile Preview Card */}
          <div className="lg:col-span-5 sticky top-8 space-y-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
              [ REALTIME INTERACTIVE PREVIEW ]
            </span>

            <div className="p-6 rounded-3xl bg-[#080808] border border-[#202020] min-h-[520px] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
              {/* Particle / Background preview indicator */}
              <div
                className="w-full max-w-xs p-6 border text-center transition-all duration-200"
                style={{
                  backgroundColor: `rgba(18, 18, 18, ${opacity / 100})`,
                  backdropFilter: `blur(${blur}px)`,
                  borderRadius: `${roundedCorners}px`,
                  borderColor: accentColor === "#ffffff" ? "#262626" : `${accentColor}40`,
                }}
              >
                {/* Avatar Preview */}
                <div
                  className="w-20 h-20 mx-auto rounded-full border-2 overflow-hidden bg-neutral-800 flex items-center justify-center text-xl font-bold text-white shadow-xl mb-4"
                  style={{ borderColor: accentColor }}
                >
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(displayName || user?.username || "P").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Display Name & Username */}
                <h3
                  className="text-base font-bold tracking-tight truncate"
                  style={{ color: accentColor }}
                >
                  {displayName || user?.globalName || user?.username || "Your Display Name"}
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  @{user?.username || "username"}
                </p>

                {/* Bio */}
                <p className="text-xs text-neutral-300 mt-3 leading-relaxed break-words font-sans">
                  {bio || "Your profile bio will render here in clean, high-legibility typography."}
                </p>

                {/* Dummy Action Buttons to preview accent */}
                <div className="mt-6 space-y-2">
                  <div
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    <span>Discord Community</span>
                  </div>
                  <div className="w-full py-2 px-3 rounded-lg bg-[#141414] border border-[#242424] text-xs font-semibold text-neutral-300">
                    <span>Portfolio Website</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

