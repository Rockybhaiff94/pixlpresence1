"use client";

import React from "react";
import {
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoreHorizontal,
  Move,
  Maximize2,
  Layers,
} from "lucide-react";
import { CanvasTransform } from "@/types/studio";

interface SelectionToolbarProps {
  title: string;
  isEmbed: boolean;
  isLocked: boolean;
  lockType?: "none" | "position" | "size" | "full";
  onToggleLock: () => void;
  onSetLockType?: (type: "none" | "position" | "size" | "full") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleMoreMenu: () => void;
  isMoreMenuOpen: boolean;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  title,
  isEmbed,
  isLocked,
  lockType = "none",
  onToggleLock,
  onSetLockType,
  onDuplicate,
  onDelete,
  onToggleMoreMenu,
  isMoreMenuOpen,
}) => {
  const [showLockDropdown, setShowLockDropdown] = React.useState(false);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -top-10 left-0 right-0 h-8 flex items-center justify-between px-2 bg-neutral-900/95 border border-neutral-700/80 shadow-2xl rounded-lg backdrop-blur-md text-white z-50 pointer-events-auto select-none font-mono text-[11px]"
    >
      {/* Title & Badge */}
      <div className="flex items-center gap-1.5 min-w-0 pr-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isEmbed ? "bg-amber-400" : "bg-sky-400"
          }`}
        />
        <span className="font-bold text-neutral-200 truncate max-w-[140px]">
          {title}
        </span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 uppercase">
          {isEmbed ? "Embed" : "Element"}
        </span>
      </div>

      {/* 4 Primary Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* 1. Lock / Unlock */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (onSetLockType) {
                setShowLockDropdown((prev) => !prev);
              } else {
                onToggleLock();
              }
            }}
            title={isLocked ? `Locked (${lockType}) - Click to Change` : "Lock Element"}
            className={`p-1.5 rounded transition-colors ${
              isLocked
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>

          {showLockDropdown && onSetLockType && (
            <div className="absolute top-8 left-0 w-32 bg-[#121214] border border-neutral-700 rounded-lg shadow-xl p-1 z-50 space-y-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  onSetLockType("none");
                  setShowLockDropdown(false);
                }}
                className={`w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                  lockType === "none" ? "text-sky-400 font-bold" : "text-neutral-300"
                }`}
              >
                Unlocked
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetLockType("position");
                  setShowLockDropdown(false);
                }}
                className={`w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                  lockType === "position" ? "text-amber-400 font-bold" : "text-neutral-300"
                }`}
              >
                Lock Position
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetLockType("size");
                  setShowLockDropdown(false);
                }}
                className={`w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                  lockType === "size" ? "text-amber-400 font-bold" : "text-neutral-300"
                }`}
              >
                Lock Size
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetLockType("full");
                  setShowLockDropdown(false);
                }}
                className={`w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                  lockType === "full" ? "text-amber-400 font-bold" : "text-neutral-300"
                }`}
              >
                Full Lock
              </button>
            </div>
          )}
        </div>

        {/* 2. Copy / Duplicate */}
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate Element (Ctrl+D)"
          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <Copy size={12} />
        </button>

        {/* 3. Delete */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete Element (Del / Backspace)"
          className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 size={12} />
        </button>

        {/* 4. More Options */}
        <button
          type="button"
          onClick={onToggleMoreMenu}
          title="Object Settings & More Options (...)"
          className={`p-1.5 rounded transition-colors ${
            isMoreMenuOpen
              ? "bg-sky-500 text-black font-bold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>
    </div>
  );
};
