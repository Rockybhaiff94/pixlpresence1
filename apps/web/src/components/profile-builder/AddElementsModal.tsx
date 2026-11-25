"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Box, Layers, Plus, Search, X } from "lucide-react";
import { BuilderComponentType } from "./profileBuilderTypes";
import {
  LIBRARY_CATALOG_ORDER,
  PROFILE_BUILDER_REGISTRY,
  REGISTRY_CATEGORIES,
  RegistryCategoryId,
} from "./componentRegistry";
import { getBuilderComponentIcon } from "./AddElementPanel";

interface AddElementsLibraryContentProps {
  onSelectComponent: (type: BuilderComponentType) => void;
  compact?: boolean;
  autoFocusSearch?: boolean;
  searchTestId?: string;
  itemTestIdPrefix?: string;
}

export const AddElementsLibraryContent: React.FC<AddElementsLibraryContentProps> = ({
  onSelectComponent,
  compact = false,
  autoFocusSearch = false,
  searchTestId = "add-elements-search",
  itemTestIdPrefix = "independent-add",
}) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<RegistryCategoryId | "all">("all");

  const query = search.trim().toLowerCase();

  const filteredGroups = REGISTRY_CATEGORIES.filter(
    (cat) => activeCategory === "all" || cat.id === activeCategory
  ).map((category) => ({
    category,
    items: LIBRARY_CATALOG_ORDER.map((type) => PROFILE_BUILDER_REGISTRY[type]).filter((entry) => {
      if (entry.category !== category.id) return false;
      if (!query) return true;
      return (
        entry.label.toLowerCase().includes(query) ||
        entry.shortDesc.toLowerCase().includes(query) ||
        category.label.toLowerCase().includes(query)
      );
    }),
  }));

  const totalMatches = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="flex flex-col min-h-0 flex-1 font-mono select-none">
      {/* Search + Category Filter */}
      <div className={`${compact ? "p-2.5 space-y-2" : "px-4 py-3 space-y-2.5"} border-b border-[#1b1b23]`}>
        <div className="flex items-center gap-2 bg-[#111116] border border-[#252530] focus-within:border-white/35 rounded-lg px-2.5 py-1.5">
          <Search size={13} className="text-neutral-500 shrink-0" />
          <input
            type="text"
            value={search}
            autoFocus={autoFocusSearch}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elements..."
            className="w-full bg-transparent text-[11px] text-white placeholder:text-neutral-500 outline-none"
            data-testid={searchTestId}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-neutral-500 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
              activeCategory === "all"
                ? "bg-[#858585] text-white border border-white"
                : "bg-transparent text-white/80 hover:text-white border border-[#22222c]"
            }`}
            data-testid={`${itemTestIdPrefix}-cat-all`}
          >
            All
          </button>
          {REGISTRY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-[#858585] text-white border border-white"
                  : "bg-transparent text-white/80 hover:text-white border border-[#22222c]"
              }`}
              data-testid={`${itemTestIdPrefix}-cat-${cat.id}`}
            >
              {cat.id === "layout" ? "Layout & Media" : cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Component Cards */}
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${compact ? "p-2.5 space-y-3" : "p-4 space-y-4"}`}>
        {filteredGroups.map(({ category, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                <span>{category.id === "layout" ? "Layout & Media" : category.label}</span>
                <span className="text-neutral-600">{items.length}</span>
              </div>

              <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                {items.map((item) => {
                  const Icon = getBuilderComponentIcon(item.type);
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => onSelectComponent(item.type)}
                      title={item.shortDesc}
                      className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl bg-[#111116] hover:bg-[#191922] border border-[#22222c] hover:border-white/30 text-left transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      data-testid={`${itemTestIdPrefix}-${item.type}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#181821] border border-[#282834] group-hover:border-white/50 flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
                        <Icon size={14} />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-100 leading-tight truncate w-full">
                        {item.label}
                      </span>
                      {!compact && (
                        <span className="text-[10px] text-neutral-500 leading-snug line-clamp-1 w-full">
                          {item.shortDesc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {totalMatches === 0 && (
          <div
            className="py-8 px-4 text-center space-y-2 border border-dashed border-[#24242d] rounded-xl"
            data-testid={`${itemTestIdPrefix}-empty`}
          >
            <Box size={18} className="mx-auto text-neutral-600" />
            <p className="text-[11px] text-neutral-400">
              No components match &ldquo;{search}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
              className="text-[10px] text-white underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface AddElementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndependentElement: (type: BuilderComponentType) => void;
}

export const AddElementsModal: React.FC<AddElementsModalProps> = ({
  isOpen,
  onClose,
  onAddIndependentElement,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="add-elements-central-overlay"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.2 }}
          className="absolute inset-0 z-45 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Add Independent Canvas Element"
          data-testid="add-elements-modal"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85%] bg-[#09090d] border border-[#262630] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1c1c24] flex items-center justify-between gap-3 bg-[#0c0c11] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#858585]/35 border border-white flex items-center justify-center text-white shrink-0">
                  <Plus size={14} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-white tracking-tight truncate">
                    Add Independent Canvas Element
                  </h2>
                  <p className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
                    <Layers size={10} className="text-neutral-500 shrink-0" />
                    Inserts directly on Canvas root (outside Main Profile Embed)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Close Add Elements window"
                data-testid="add-elements-modal-close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <AddElementsLibraryContent
              onSelectComponent={onAddIndependentElement}
              autoFocusSearch
              searchTestId="add-elements-modal-search"
              itemTestIdPrefix="modal-add"
            />

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-[#181820] bg-[#0b0b0f] flex items-center justify-between text-[10px] text-neutral-500 shrink-0">
              <span>Select any component to place it independently on Canvas</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-[#14141b] hover:bg-[#1e1e28] border border-[#282834] text-neutral-200 cursor-pointer"
                data-testid="add-elements-modal-cancel"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
