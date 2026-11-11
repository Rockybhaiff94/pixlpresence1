"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoreHorizontal,
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
  Share2,
  ExternalLink,
  Layout,
} from "lucide-react";

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

  // Text-specific quick actions (Phase 6)
  isText?: boolean;
  onEditText?: () => void;
  onToggleBold?: () => void;
  isBold?: boolean;
  onToggleItalic?: () => void;
  isItalic?: boolean;
  onCycleAlign?: () => void;
  textAlign?: "left" | "center" | "right" | "justify";
  fontSize?: number;
  onChangeFontSize?: (delta: number) => void;

  // Social-specific quick actions (Phase 6 & 8)
  isSocial?: boolean;
  onOpenSocialSelector?: () => void;
  onTestLink?: () => void;
  onArrangeRow?: () => void;
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
  isText = false,
  onEditText,
  onToggleBold,
  isBold = false,
  onToggleItalic,
  isItalic = false,
  onCycleAlign,
  textAlign = "center",
  fontSize,
  onChangeFontSize,
  isSocial = false,
  onOpenSocialSelector,
  onTestLink,
  onArrangeRow,
}) => {
  const [showLockDropdown, setShowLockDropdown] = useState(false);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -top-10 left-0 right-0 h-8 flex items-center justify-between px-2 bg-neutral-900/95 border border-neutral-700/80 shadow-2xl rounded-lg backdrop-blur-md text-white z-50 pointer-events-auto select-none font-mono text-[11px]"
    >
      {/* Title & Badge */}
      <div className="flex items-center gap-1.5 min-w-0 pr-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isEmbed ? "bg-amber-400" : isText ? "bg-emerald-400" : "bg-sky-400"
          }`}
        />
        <span className="font-bold text-neutral-200 truncate max-w-[120px]">
          {title}
        </span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 uppercase shrink-0">
          {isEmbed ? "Embed" : isText ? "Text" : "Element"}
        </span>
      </div>

      {/* Center / Text Quick Actions */}
      {isText && (
        <div className="flex items-center gap-0.5 border-x border-neutral-800 px-1.5 mx-1">
          {/* Edit Text inline */}
          {onEditText && (
            <button
              type="button"
              onClick={onEditText}
              title="Edit Text Content (Double-click)"
              className="px-1.5 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1 text-[10px]"
            >
              <Type size={11} className="text-emerald-400" />
              <span>Edit</span>
            </button>
          )}

          {/* Toggle Bold */}
          {onToggleBold && (
            <button
              type="button"
              onClick={onToggleBold}
              title="Toggle Bold"
              className={`p-1 rounded transition-colors ${
                isBold ? "bg-neutral-700 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Bold size={11} />
            </button>
          )}

          {/* Toggle Italic */}
          {onToggleItalic && (
            <button
              type="button"
              onClick={onToggleItalic}
              title="Toggle Italic"
              className={`p-1 rounded transition-colors ${
                isItalic ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Italic size={11} />
            </button>
          )}

          {/* Cycle Align */}
          {onCycleAlign && (
            <button
              type="button"
              onClick={onCycleAlign}
              title={`Alignment: ${textAlign} (Click to cycle)`}
              className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
            >
              {textAlign === "left" && <AlignLeft size={11} />}
              {textAlign === "center" && <AlignCenter size={11} />}
              {textAlign === "right" && <AlignRight size={11} />}
              {textAlign === "justify" && <AlignJustify size={11} />}
            </button>
          )}

          {/* Font Size Stepper */}
          {fontSize !== undefined && onChangeFontSize && (
            <div className="flex items-center gap-0.5 ml-1 bg-neutral-950/80 border border-neutral-800 rounded px-1 py-0.5 text-[9px] text-neutral-300 font-mono">
              <button
                type="button"
                onClick={() => onChangeFontSize(-1)}
                className="hover:text-white text-neutral-400"
                title="Decrease font size"
              >
                <Minus size={9} />
              </button>
              <span className="w-5 text-center">{fontSize}</span>
              <button
                type="button"
                onClick={() => onChangeFontSize(1)}
                className="hover:text-white text-neutral-400"
                title="Increase font size"
              >
                <Plus size={9} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Center / Social Media Quick Actions */}
      {isSocial && (
        <div className="flex items-center gap-0.5 border-x border-neutral-800 px-1.5 mx-1">
          {onOpenSocialSelector && (
            <button
              type="button"
              onClick={onOpenSocialSelector}
              title="Switch Connected Account"
              className="px-1.5 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1 text-[10px]"
            >
              <Share2 size={11} className="text-sky-400" />
              <span>Accounts</span>
            </button>
          )}

          {onTestLink && (
            <button
              type="button"
              onClick={onTestLink}
              title="Test External Profile Link (Opens in new tab)"
              className="px-1.5 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1 text-[10px]"
            >
              <ExternalLink size={11} className="text-emerald-400" />
              <span>Test</span>
            </button>
          )}

          {onArrangeRow && (
            <button
              type="button"
              onClick={onArrangeRow}
              title="Arrange Related Social Icons in Horizontal Row"
              className="px-1.5 py-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center gap-1 text-[10px]"
            >
              <Layout size={11} />
              <span>Row</span>
            </button>
          )}
        </div>
      )}

      {/* Primary Actions: Lock, Duplicate, Delete, More Options */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Lock / Unlock */}
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

        {/* Copy / Duplicate */}
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate Element (Ctrl+D)"
          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <Copy size={12} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete Element (Del / Backspace)"
          className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 size={12} />
        </button>

        {/* More Options */}
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
