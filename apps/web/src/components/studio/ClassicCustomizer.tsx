"use client";

import React from "react";
import { Palette, ImageIcon, Sliders, Music, Save, ExternalLink } from "lucide-react";

interface ClassicCustomizerProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
  bannerUrl: string;
  setBannerUrl: (val: string) => void;
  musicUrl: string;
  setMusicUrl: (val: string) => void;
  accentColor: string;
  setAccentColor: (val: string) => void;
  particles: string;
  setParticles: (val: string) => void;
  blur: number;
  setBlur: (val: number) => void;
  opacity: number;
  setOpacity: (val: number) => void;
  roundedCorners: number;
  setRoundedCorners: (val: number) => void;
  handleSave: (e?: React.FormEvent) => void;
  saving: boolean;
  username?: string;
}

export const ClassicCustomizer: React.FC<ClassicCustomizerProps> = ({
  displayName,
  setDisplayName,
  bio,
  setBio,
  avatarUrl,
  setAvatarUrl,
  bannerUrl,
  setBannerUrl,
  musicUrl,
  setMusicUrl,
  accentColor,
  setAccentColor,
  particles,
  setParticles,
  blur,
  setBlur,
  opacity,
  setOpacity,
  roundedCorners,
  setRoundedCorners,
  handleSave,
  saving,
  username,
}) => {
  const ACCENTS = ["#ffffff", "#d71920", "#ff9800", "#4ade80", "#60a5fa", "#a855f7", "#ec4899", "#737373"];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-[#ededed] p-4 sm:p-6 select-none">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-[#0e0e11] border border-[#202024] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
            <span>PROFILE</span>
            <span>/</span>
            <span className="text-white">CLASSIC CUSTOMIZATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            CLASSIC PROFILE SETTINGS.
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Standard visual parameters, material shaders, and monochromatic tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <a
              href={`/${username}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-[#141416] hover:bg-[#1a1a1d] border border-[#242426] text-xs text-white flex items-center gap-1.5 transition-colors"
            >
              <span>Live View</span>
              <ExternalLink size={12} className="text-neutral-500" />
            </a>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save size={13} />
            <span>{saving ? "SAVING..." : "SAVE CHANGES"}</span>
          </button>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Identity & Copy */}
        <div className="p-6 rounded-2xl bg-[#0b0b0d] border border-[#202024] space-y-4">
          <div className="space-y-0.5 pb-3 border-b border-[#18181b]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette size={14} className="text-neutral-400" />
              IDENTITY & COPY
            </h3>
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
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none focus:border-white"
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
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>
          </div>
        </div>

        {/* Media Assets */}
        <div className="p-6 rounded-2xl bg-[#0b0b0d] border border-[#202024] space-y-4">
          <div className="space-y-0.5 pb-3 border-b border-[#18181b]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={14} className="text-neutral-400" />
              MEDIA & ASSETS
            </h3>
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
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none focus:border-white"
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
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Music size={12} /> Background Audio URL
              </label>
              <input
                type="url"
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
                placeholder="https://... (Direct audio stream URL)"
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none focus:border-white"
              />
            </div>
          </div>
        </div>

        {/* Visual Material & Shaders (Span 2) */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#0b0b0d] border border-[#202024] space-y-4">
          <div className="space-y-0.5 pb-3 border-b border-[#18181b]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders size={14} className="text-neutral-400" />
              VISUAL MATERIAL & SHADER
            </h3>
            <p className="text-[11px] text-neutral-500">Blur, glass opacity, and accent colors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  />
                ))}
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="px-2 py-1 rounded bg-[#141417] border border-[#26262a] text-[11px] text-white w-20 text-center"
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
                className="w-full px-3 py-2 rounded-lg bg-[#121215] border border-[#222226] text-white text-xs focus:outline-none"
              >
                <option value="None">None (Pure Black)</option>
                <option value="Snow">Snow Flakes</option>
                <option value="Stars">Twinkling Stars</option>
                <option value="Fireflies">Fireflies</option>
                <option value="Rain">Digital Rain</option>
                <option value="Matrix">Matrix Stream</option>
              </select>
            </div>

            {/* Blur */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Card Blur Filter</span>
                <span className="text-white font-bold">{blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-[#1f1f23] rounded-lg"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Card Opacity</span>
                <span className="text-white font-bold">{opacity}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-[#1f1f23] rounded-lg"
              />
            </div>

            {/* Rounded Corners */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Card Corner Radius</span>
                <span className="text-white font-bold">{roundedCorners}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={roundedCorners}
                onChange={(e) => setRoundedCorners(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-[#1f1f23] rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
