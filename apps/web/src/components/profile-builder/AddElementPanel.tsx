"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlignLeft,
  Award,
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  CreditCard,
  FileText,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Minus,
  Music,
  PaintBucket,
  Search,
  Share2,
  Type,
  User,
  X,
} from "lucide-react";
import { BuilderComponentType } from "./profileBuilderTypes";
import {
  LIBRARY_CATALOG_ORDER,
  PROFILE_BUILDER_REGISTRY,
  REGISTRY_CATEGORIES,
  RegistryCategoryId,
} from "./componentRegistry";

interface AddElementPanelProps {
  onAddComponent: (type: BuilderComponentType) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

export function getBuilderComponentIcon(
  type: BuilderComponentType
): React.ComponentType<{ size?: number; className?: string }> {
  switch (type) {
    case "profile-image":
      return User;
    case "name-text":
      return Type;
    case "subtitle":
      return FileText;
    case "description":
      return AlignLeft;
    case "badges-group":
      return Award;
    case "social-group":
      return Share2;
    case "music-display":
      return Music;
    case "custom-rpc":
      return Gamepad2;
    case "embed":
    case "nested-embed":
      return CreditCard;
    case "banner-image":
    case "image":
      return ImageIcon;
    case "image-gallery":
      return LayoutGrid;
    case "separator":
      return Minus;
    case "group-section":
      return Layers;
    case "background":
      return PaintBucket;
    case "custom-component":
    default:
      return Code2;
  }
}

export const AddElementPanel: React.FC<AddElementPanelProps> = ({
  onAddComponent,
  collapsed = false,
  onToggleCollapse,
  onClose,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<RegistryCategoryId, boolean>>({
    profile: true,
    layout: true,
    advanced: true,
  });

  if (collapsed) {
    return null;
  }

  const handleClose = onClose || onToggleCollapse;

  const query = search.trim().toLowerCase();

  const toggleCat = (id: RegistryCategoryId) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categorizedGroups = REGISTRY_CATEGORIES.map((category) => ({
    category,
    items: LIBRARY_CATALOG_ORDER.map((t) => PROFILE_BUILDER_REGISTRY[t]).filter((entry) => {
      if (entry.category !== category.id) return false;
      if (!query) return true;
      return (
        entry.label.toLowerCase().includes(query) ||
        entry.shortDesc.toLowerCase().includes(query) ||
        category.label.toLowerCase().includes(query)
      );
    }),
  }));

  const totalMatches = categorizedGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <motion.aside
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -24 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: prefersReducedMotion
          ? { duration: 0.01 }
          : { duration: 0.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const },
      }}
      exit={
        prefersReducedMotion
          ? { opacity: 0, transition: { duration: 0.01 } }
          : { opacity: 0, x: -24, transition: { duration: 0.12, ease: "easeIn" as const } }
      }
      className="w-56 shrink-0 bg-[#09090d] border-r border-[#1d1d24] flex flex-col h-full overflow-hidden font-mono select-none absolute inset-y-0 left-0 z-40 sm:static sm:z-auto shadow-2xl sm:shadow-none"
      data-testid="builder-add-element-panel"
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#191921] flex items-center justify-between">
        <span className="text-xs font-bold text-white tracking-tight">Elements</span>
        {handleClose && (
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Return to Expanded Dock"
            aria-label="Close Elements panel"
            data-testid="elements-panel-close"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-2.5 border-b border-[#16161d]">
        <div className="flex items-center gap-2 bg-[#111116] border border-[#24242d] focus-within:border-white/30 rounded-lg px-2.5 py-1.5">
          <Search size={12} className="text-neutral-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-transparent text-[11px] text-white placeholder:text-neutral-600 outline-none"
            data-testid="add-element-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-neutral-500 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Categories */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-3">
        {categorizedGroups.map(({ category, items }, groupIndex) => {
          if (query && items.length === 0) return null;

          const isOpen = query ? true : openCategories[category.id];

          return (
            <div
              key={category.id}
              className={`space-y-1.5 ${groupIndex > 0 ? "pt-2.5 border-t border-[#191921]" : ""
                }`}
              data-testid={`elements-category-${category.id}`}
            >
              <button
                type="button"
                onClick={() => toggleCat(category.id)}
                className="w-full flex items-center justify-between text-[11px] text-neutral-300 hover:text-white font-semibold py-0.5 cursor-pointer"
                data-testid={`category-toggle-${category.id}`}
              >
                <span>{category.label}</span>
                {isOpen ? (
                  <ChevronDown size={12} className="text-neutral-500" />
                ) : (
                  <ChevronRight size={12} className="text-neutral-500" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = getBuilderComponentIcon(item.type);
                    return (
                      <button
                        key={item.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-pixel-builder-type", item.type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onAddComponent(item.type)}
                        title={item.shortDesc}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#111116] hover:bg-[#191922] border border-[#22222b] hover:border-white/25 text-left flex items-center gap-2 text-[11px] text-neutral-200 hover:text-white transition-all cursor-pointer group"
                        data-testid={`library-add-${item.type}`}
                      >
                        <Icon
                          size={13}
                          className="text-neutral-400 group-hover:text-white shrink-0"
                        />
                        <span className="truncate flex-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalMatches === 0 && (
          <div
            className="py-8 px-3 text-center space-y-2 border border-dashed border-[#24242d] rounded-xl"
            data-testid="add-element-empty"
          >
            <Box size={18} className="mx-auto text-neutral-600" />
            <p className="text-[11px] text-neutral-400">
              No components match &ldquo;{search}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[10px] text-white underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
