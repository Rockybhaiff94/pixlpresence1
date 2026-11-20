"use client";

import React from "react";
import {
  X,
  User,
  Image as ImageIcon,
  Type,
  FileText,
  BadgeCheck,
  Gamepad2,
  Music,
  Share2,
  Square,
  Sparkles,
  Minus,
  Layers,
  Flame,
} from "lucide-react";
import { CanvasElementType } from "@/types/studio";

export interface ContentTypeItem {
  id: string;
  type: CanvasElementType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: "identity" | "media" | "text" | "interactive";
}

const CONTENT_TYPES: ContentTypeItem[] = [
  {
    id: "avatar",
    type: "avatar",
    title: "Avatar / Profile Picture",
    subtitle: "Custom shape, glow, and border",
    icon: <User size={15} className="text-amber-400" />,
    category: "identity",
  },
  {
    id: "username",
    type: "username",
    title: "Username & Display Name",
    subtitle: "Bold typography and nameplate",
    icon: <Type size={15} className="text-cyan-400" />,
    category: "identity",
  },
  {
    id: "bio",
    type: "bio",
    title: "Bio & Description",
    subtitle: "Multi-line biography with Markdown",
    icon: <FileText size={15} className="text-emerald-400" />,
    category: "text",
  },
  {
    id: "tagline",
    type: "tagline",
    title: "Tagline / Subtitle",
    subtitle: "Compact one-line status or motto",
    icon: <Sparkles size={15} className="text-yellow-400" />,
    category: "text",
  },
  {
    id: "text",
    type: "text",
    title: "Custom Text Block",
    subtitle: "Formatted rich text and headings",
    icon: <Type size={15} className="text-sky-400" />,
    category: "text",
  },
  {
    id: "banner",
    type: "banner",
    title: "Banner Image",
    subtitle: "Full-width header graphic or artwork",
    icon: <ImageIcon size={15} className="text-indigo-400" />,
    category: "media",
  },
  {
    id: "image",
    type: "image",
    title: "Additional Image / Graphic",
    subtitle: "Standalone sticker, artwork, or badge",
    icon: <ImageIcon size={15} className="text-purple-400" />,
    category: "media",
  },
  {
    id: "rpc",
    type: "rpc",
    title: "Discord Rich Presence (RPC)",
    subtitle: "Live activity, game status & telemetry",
    icon: <Gamepad2 size={15} className="text-rose-400" />,
    category: "interactive",
  },
  {
    id: "button",
    type: "button",
    title: "Action Button",
    subtitle: "Website, repository, or portfolio link",
    icon: <Square size={15} className="text-teal-400" />,
    category: "interactive",
  },
  {
    id: "socials",
    type: "socials",
    title: "Social Links Bar",
    subtitle: "Discord, GitHub, Twitter, YouTube & more",
    icon: <Share2 size={15} className="text-blue-400" />,
    category: "interactive",
  },
  {
    id: "music",
    type: "music",
    title: "Music Player",
    subtitle: "Audio preview and soundtrack widget",
    icon: <Music size={15} className="text-pink-400" />,
    category: "interactive",
  },
  {
    id: "verificationBadge",
    type: "verificationBadge",
    title: "Verified Badge",
    subtitle: "Official verified network emblem",
    icon: <BadgeCheck size={15} className="text-sky-400" />,
    category: "identity",
  },
  {
    id: "divider",
    type: "divider",
    title: "Horizontal Divider",
    subtitle: "Minimalist separation line",
    icon: <Minus size={15} className="text-neutral-400" />,
    category: "interactive",
  },
];

interface ContentInsertionMenuProps {
  embedId: string;
  onSelectContentType: (type: CanvasElementType) => void;
  onClose: () => void;
  position?: { top?: number | string; left?: number | string };
}

export const ContentInsertionMenu: React.FC<ContentInsertionMenuProps> = ({
  embedId,
  onSelectContentType,
  onClose,
  position,
}) => {
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredItems = CONTENT_TYPES.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="content-insertion-menu fixed z-[100] w-80 p-3.5 rounded-2xl bg-[#101014]/98 backdrop-blur-xl border border-neutral-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-xs text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: position?.top ?? "76px",
        left: position?.left ?? "calc(50% - 160px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
          <Layers size={14} className="text-amber-400" />
          <span>Add to Embed</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Close menu"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-2.5">
        <input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-400/60"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1 text-[10px]">
        {[
          { id: "all", label: "All" },
          { id: "identity", label: "Identity" },
          { id: "text", label: "Text" },
          { id: "media", label: "Media" },
          { id: "interactive", label: "Interactive" },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCategory(cat.id)}
            className={`px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
              filterCategory === cat.id
                ? "bg-amber-400 text-black font-bold"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item List */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectContentType(item.type);
              onClose();
            }}
            className="w-full p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-400/50 hover:bg-neutral-800/80 transition-all flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-black/70 border border-neutral-800 group-hover:border-neutral-700 shrink-0">
              {item.icon}
            </div>
            <div className="truncate flex-1">
              <p className="font-semibold text-white group-hover:text-amber-300 text-xs truncate">
                {item.title}
              </p>
              <p className="text-[10px] text-neutral-400 truncate">{item.subtitle}</p>
            </div>
          </button>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-6 text-center text-neutral-500 font-mono text-xs">
            No matching components found
          </div>
        )}
      </div>
    </div>
  );
};
