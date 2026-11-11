"use client";

import React, { useState } from "react";
import {
  Palette,
  Sparkles,
  Eye,
  Layout,
  Sliders,
  X,
  Type,
  Image as ImageIcon,
  Square,
  Lock,
  Layers,
  Crown,
  Share2,
  Upload,
  RefreshCw,
  Sun,
  Flame,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  Link as LinkIcon,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowRight,
} from "lucide-react";
import {
  CanvasElement,
  CanvasEmbed,
  CanvasTransform,
  CanvasElementStyle,
  TextStyleGroups,
  TextStyleGroupId,
  TextStyleDefinition,
  DEFAULT_TEXT_STYLE_GROUPS,
} from "@/types/studio";
import { EFFECT_PRESETS, EffectPresetDef } from "./effectPresets";
import {
  CURATED_FONTS,
  FONT_WEIGHTS,
  TEXT_ALIGN_OPTIONS,
  isTextBasedElement,
  isDynamicRestrictedText,
  resolveStyleGroup,
  extractStyleDefinition,
} from "./typographyEngine";

interface SelectedObjectMenuProps {
  item: CanvasEmbed | CanvasElement;
  isEmbed: boolean;
  isPremium?: boolean;
  themeAccentColor?: string;
  textStyleGroups?: TextStyleGroups;
  onUpdateTransform: (transform: Partial<CanvasTransform>) => void;
  onUpdateStyle: (style: Partial<CanvasElementStyle>) => void;
  onUpdateProps?: (props: Record<string, any>) => void;
  onUpdateVisibility?: (visible: boolean) => void;
  onUpdateStyleGroup?: (groupId: TextStyleGroupId, def: TextStyleDefinition) => void;
  onResetElementTypography?: (elementId: string) => void;
  onApplyGroupToMatchingElements?: (groupId: TextStyleGroupId) => void;
  onClose: () => void;
}

type TabType =
  | "appearance"
  | "effects"
  | "icons"
  | "presets"
  | "layout"
  | "content"
  | "typography"
  | "visibility";

const COLOR_PRESETS = [
  { label: "Pure White", hex: "#ffffff" },
  { label: "Deep Black", hex: "#000000" },
  { label: "Sky Cyan", hex: "#38bdf8" },
  { label: "Neon Purple", hex: "#a855f7" },
  { label: "Emerald Green", hex: "#22c55e" },
  { label: "Amber Gold", hex: "#f59e0b" },
  { label: "Crimson Red", hex: "#ef4444" },
];

export const SelectedObjectMenu: React.FC<SelectedObjectMenuProps> = ({
  item,
  isEmbed,
  isPremium = false,
  themeAccentColor = "#ffffff",
  textStyleGroups,
  onUpdateTransform,
  onUpdateStyle,
  onUpdateProps,
  onUpdateVisibility,
  onUpdateStyleGroup,
  onResetElementTypography,
  onApplyGroupToMatchingElements,
  onClose,
}) => {
  const elementType = !isEmbed ? (item as CanvasElement).type : null;
  const isText = Boolean(elementType && isTextBasedElement(elementType));
  const isDynamicRpc = Boolean(elementType && isDynamicRestrictedText(elementType));
  const isIconElement =
    !isEmbed &&
    (elementType === "socials" ||
      elementType === "socialIcon" ||
      elementType === "bottomIcon");

  const [activeTab, setActiveTab] = useState<TabType>(
    isIconElement ? "icons" : isText ? "typography" : isEmbed ? "appearance" : "content"
  );
  const [showPremiumModal, setShowPremiumModal] = useState<string | null>(null);

  const transform = item.transform;
  const style = isEmbed
    ? (item as CanvasEmbed).style
    : (item as CanvasElement).style || {};
  const props = isEmbed ? {} : (item as CanvasElement).props || {};
  const isVisible = item.isVisible !== false;

  // Resolve style group & inheritance state
  const styleGroupId: TextStyleGroupId = elementType
    ? style.styleGroupId || resolveStyleGroup(elementType)
    : "body";
  const hasOverride = style.hasCustomTypographyOverride === true;
  const activeGroups = textStyleGroups || DEFAULT_TEXT_STYLE_GROUPS;
  const groupDef = activeGroups[styleGroupId] || DEFAULT_TEXT_STYLE_GROUPS[styleGroupId];

  const handleApplyPreset = (preset: EffectPresetDef) => {
    if (preset.isPremium && !isPremium) {
      setShowPremiumModal(preset.name);
      return;
    }
    onUpdateStyle({
      ...preset.style,
      effectPreset: preset.id,
    });
  };

  const handleUpdateTypography = (changes: Partial<CanvasElementStyle>) => {
    onUpdateStyle({
      ...changes,
      styleGroupId,
      hasCustomTypographyOverride: true,
    });
  };

  const handleSaveAsDefault = () => {
    if (onUpdateStyleGroup) {
      const def = extractStyleDefinition(style);
      onUpdateStyleGroup(styleGroupId, def);
    }
  };

  const handleResetToDefault = () => {
    if (onResetElementTypography && !isEmbed) {
      onResetElementTypography(item.id);
    } else {
      onUpdateStyle({
        fontFamily: groupDef.fontFamily,
        fontSize: groupDef.fontSize,
        fontWeight: groupDef.fontWeight,
        color: groupDef.color,
        letterSpacing: groupDef.letterSpacing,
        lineHeight: groupDef.lineHeight,
        textAlign: groupDef.textAlign,
        textTransform: groupDef.textTransform,
        textDecoration: groupDef.textDecoration,
        hasCustomTypographyOverride: false,
      });
    }
  };

  const handleApplyToAllMatching = () => {
    if (onApplyGroupToMatchingElements) {
      onApplyGroupToMatchingElements(styleGroupId);
    }
  };

  // Helper to append formatting token into text content
  const handleInsertMarkdown = (prefix: string, suffix: string = prefix) => {
    const current = (props.text ?? props.content ?? "") as string;
    const updated = `${current} ${prefix}text${suffix}`.trim();
    if (onUpdateProps) {
      onUpdateProps(props.text !== undefined ? { text: updated } : { content: updated });
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-0 right-[-340px] w-[330px] max-h-[520px] overflow-y-auto bg-[#101014]/95 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 z-50 pointer-events-auto text-neutral-200 text-xs font-mono select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <Sliders size={13} className="text-sky-400" />
          <span className="font-bold text-white text-[11px] truncate">
            {isEmbed ? (item as CanvasEmbed).title : (item as CanvasElement).name}
          </span>
          {isPremium && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40">
              <Crown size={8} /> PRO
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-neutral-800/60 mb-3 no-scrollbar text-[10px]">
        {isText && (
          <button
            type="button"
            onClick={() => setActiveTab("typography")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${
              activeTab === "typography" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Type size={10} /> Typography
          </button>
        )}

        {isIconElement && (
          <button
            type="button"
            onClick={() => setActiveTab("icons")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${
              activeTab === "icons" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Share2 size={10} /> Icons
          </button>
        )}

        {!isEmbed && !isIconElement && (
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`px-2 py-1 rounded transition-colors shrink-0 ${
              activeTab === "content" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Content
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("presets")}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${
            activeTab === "presets" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Sparkles size={10} /> Presets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${
            activeTab === "effects" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Flame size={10} /> Effects
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`px-2 py-1 rounded transition-colors shrink-0 ${
            activeTab === "appearance" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Styling
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`px-2 py-1 rounded transition-colors shrink-0 ${
            activeTab === "layout" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
          }`}
        >
          Layout
        </button>
      </div>

      {/* TAB: TYPOGRAPHY (Phase 4 & Phase 5 Smart Inheritance) */}
      {activeTab === "typography" && isText && (
        <div className="space-y-3.5">
          {/* Smart Inheritance Status Banner */}
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 uppercase font-semibold">Style Group</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold uppercase">
                {styleGroupId}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Inheritance State:</span>
              <span
                className={`px-1.5 py-0.5 rounded font-bold ${
                  hasOverride
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {hasOverride ? "Independent Override" : "Inheriting Group Default"}
              </span>
            </div>

            {/* Smart Inheritance Actions */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={handleSaveAsDefault}
                title="Establish this element's typography as the new default for this group"
                className="flex-1 py-1 rounded bg-[#18181e] hover:bg-neutral-800 border border-neutral-700/80 text-[9px] text-neutral-300 hover:text-white text-center transition-colors"
              >
                Save as Group Default
              </button>
              {hasOverride && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  title="Remove independent override and revert to group default"
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[9px] text-amber-300 transition-colors"
                >
                  Reset to Default
                </button>
              )}
            </div>

            {onApplyGroupToMatchingElements && (
              <button
                type="button"
                onClick={handleApplyToAllMatching}
                className="w-full py-1 rounded bg-neutral-950 border border-neutral-800 text-[9px] text-neutral-400 hover:text-sky-300 flex items-center justify-center gap-1 transition-colors"
              >
                <span>Apply this style to all {styleGroupId} elements</span>
                <ArrowRight size={10} />
              </button>
            )}
          </div>

          {/* 1. Font Family */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 uppercase font-semibold">Font Family</label>
            <select
              value={style.fontFamily || "Inter"}
              onChange={(e) => handleUpdateTypography({ fontFamily: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {CURATED_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name} ({font.category})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Font Size & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Size ({style.fontSize || 14}px)</label>
              <input
                type="range"
                min={8}
                max={72}
                value={style.fontSize || 14}
                onChange={(e) => handleUpdateTypography({ fontSize: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Weight</label>
              <select
                value={style.fontWeight || 400}
                onChange={(e) => handleUpdateTypography({ fontWeight: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.value} - {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Text Color & Palette */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-neutral-400">Text Color</label>
              <button
                type="button"
                onClick={() => handleUpdateTypography({ color: themeAccentColor })}
                className="text-[9px] text-sky-400 hover:text-sky-300"
              >
                Use Accent ({themeAccentColor})
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.color || "#ffffff"}
                onChange={(e) => handleUpdateTypography({ color: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={style.color || "#ffffff"}
                onChange={(e) => handleUpdateTypography({ color: e.target.value })}
                placeholder="#ffffff"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-sky-500"
              />
            </div>
            {/* Quick Palette */}
            <div className="flex items-center gap-1.5 pt-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleUpdateTypography({ color: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  className="w-5 h-5 rounded-full border border-neutral-700/80 hover:scale-110 transition-transform"
                />
              ))}
            </div>
          </div>

          {/* 4. Text Alignment */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Alignment</label>
            <div className="grid grid-cols-4 gap-1">
              {TEXT_ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleUpdateTypography({ textAlign: opt.value })}
                  className={`py-1 rounded text-center transition-colors ${
                    (style.textAlign || "left") === opt.value
                      ? "bg-white text-black font-bold"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Letter Spacing & Line Height */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Spacing ({style.letterSpacing || 0}px)</label>
              <input
                type="range"
                min={-2}
                max={8}
                step={0.5}
                value={style.letterSpacing || 0}
                onChange={(e) => handleUpdateTypography({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Line Height ({style.lineHeight || 1.4})</label>
              <input
                type="range"
                min={0.8}
                max={2.4}
                step={0.1}
                value={style.lineHeight || 1.4}
                onChange={(e) => handleUpdateTypography({ lineHeight: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </div>
          </div>

          {/* 6. Text Transform & Decoration */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Transform</label>
              <select
                value={style.textTransform || "none"}
                onChange={(e) => handleUpdateTypography({ textTransform: e.target.value as any })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              >
                <option value="none">Normal</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Decoration</label>
              <select
                value={style.textDecoration || "none"}
                onChange={(e) => handleUpdateTypography({ textDecoration: e.target.value as any })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              >
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strikethrough</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CONTENT (With Discord Markdown Helpers) */}
      {activeTab === "content" && !isEmbed && (
        <div className="space-y-3">
          {isDynamicRpc ? (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 text-neutral-300 space-y-1.5 text-[11px]">
              <p className="font-bold text-purple-300">Dynamic Discord Rich Presence</p>
              <p className="text-[10px] text-neutral-400">
                This text component is dynamically synchronized with your live Discord activity.
                To customize Rich Presence overlays, please open the dedicated PixelsRPC Customizer.
              </p>
            </div>
          ) : (
            <>
              {(props.text !== undefined || props.content !== undefined || isText) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-neutral-400">Text Content & Markdown</label>
                    <span className="text-[9px] text-neutral-500">Supports Discord Markdown</span>
                  </div>

                  {/* Markdown Quick-Insert Buttons */}
                  <div className="flex items-center gap-1 flex-wrap p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("**")}
                      title="Bold (**text**)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold"
                    >
                      <Bold size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("*")}
                      title="Italic (*text*)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] italic"
                    >
                      <Italic size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("__")}
                      title="Underline (__text__)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] underline"
                    >
                      <Underline size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("~~")}
                      title="Strikethrough (~~text~~)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] line-through"
                    >
                      <Strikethrough size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("`")}
                      title="Inline Code (`code`)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] font-mono text-sky-400"
                    >
                      <Code size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("> ")}
                      title="Quote (> quote)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px]"
                    >
                      <Quote size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("||")}
                      title="Spoiler (||text||)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-amber-400"
                    >
                      <EyeOff size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("[", "](https://)")}
                      title="Link [label](url)"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-sky-400"
                    >
                      <LinkIcon size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown("{color:accent}", "{/color}")}
                      title="Color Tag {color:#hex}text{/color}"
                      className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[9px] text-emerald-400 font-bold"
                    >
                      Color
                    </button>
                  </div>

                  <textarea
                    value={props.text ?? props.content ?? ""}
                    onChange={(e) =>
                      onUpdateProps?.({
                        ...(props.text !== undefined ? { text: e.target.value } : { content: e.target.value }),
                      })
                    }
                    rows={4}
                    placeholder="Enter formatted text here (supports **bold**, *italic*, `code`, ||spoiler||, links)..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none font-sans"
                  />
                  <p className="text-[9px] text-neutral-500">
                    💡 Tip: You can also double-click this text directly on the canvas to edit inline.
                  </p>
                </div>
              )}

              {props.src !== undefined && (
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400">Image Source URL</label>
                  <input
                    type="text"
                    value={props.src}
                    onChange={(e) => onUpdateProps?.({ src: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: ICONS (Social Media & App Icon Customization) */}
      {activeTab === "icons" && (
        <div className="space-y-4">
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Icon Color Mode</span>
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => onUpdateStyle({ iconColorMode: "original", iconColor: undefined })}
                className={`py-1 rounded text-center transition-colors ${
                  (style.iconColorMode || "original") === "original"
                    ? "bg-white text-black font-bold"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateStyle({
                    iconColorMode: "custom",
                    iconColor: style.iconColor || "#ffffff",
                  })
                }
                className={`py-1 rounded text-center transition-colors ${
                  style.iconColorMode === "custom"
                    ? "bg-white text-black font-bold"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Solid Color
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ iconColorMode: "theme" })}
                className={`py-1 rounded text-center transition-colors ${
                  style.iconColorMode === "theme"
                    ? "bg-white text-black font-bold"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Theme
              </button>
            </div>
          </div>

          {style.iconColorMode === "custom" && (
            <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
              <label className="text-[10px] text-neutral-400">Custom Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.iconColor || "#ffffff"}
                  onChange={(e) => onUpdateStyle({ iconColor: e.target.value })}
                  className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={style.iconColor || "#ffffff"}
                  onChange={(e) => onUpdateStyle({ iconColor: e.target.value })}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PRESETS */}
      {activeTab === "presets" && (
        <div className="space-y-2">
          <p className="text-[10px] text-neutral-400">1-Click Visual Styling Presets:</p>
          <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto">
            {EFFECT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  style.effectPreset === preset.id
                    ? "bg-sky-500/20 border-sky-500/80 text-white"
                    : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                }`}
              >
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">{preset.name}</span>
                    {preset.isPremium && (
                      <span className="inline-flex items-center gap-0.5 px-1 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40">
                        <Crown size={8} /> PRO
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate">{preset.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB: EFFECTS */}
      {activeTab === "effects" && (
        <div className="space-y-4">
          {/* Outer Glow */}
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-neutral-300">Outer Glow</span>
              <input
                type="checkbox"
                checked={style.glowEnabled || false}
                onChange={(e) => onUpdateStyle({ glowEnabled: e.target.checked })}
                className="accent-sky-400 rounded cursor-pointer"
              />
            </div>
            {style.glowEnabled && (
              <div className="space-y-2 pt-1 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.glowColor || "#38bdf8"}
                    onChange={(e) => onUpdateStyle({ glowColor: e.target.value })}
                    className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={style.glowBlur || 20}
                    onChange={(e) => onUpdateStyle({ glowBlur: Number(e.target.value) })}
                    className="flex-1 accent-sky-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shadow & Lighting */}
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-neutral-300">Shadow & Lighting</span>
              <input
                type="checkbox"
                checked={style.shadowEnabled || false}
                onChange={(e) => onUpdateStyle({ shadowEnabled: e.target.checked })}
                className="accent-sky-400 rounded cursor-pointer"
              />
            </div>
            {style.shadowEnabled && (
              <div className="space-y-2 pt-1 border-t border-neutral-800">
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={style.shadowBlur || 20}
                  onChange={(e) => onUpdateStyle({ shadowBlur: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: APPEARANCE (Borders, Background, Opacity) */}
      {activeTab === "appearance" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Background Color</label>
            <input
              type="text"
              value={style.backgroundColor || ""}
              onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
              placeholder="rgba(10, 10, 14, 0.85)"
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Border Radius ({style.borderRadius || 0}px)</label>
            <input
              type="range"
              min={0}
              max={48}
              value={style.borderRadius || 0}
              onChange={(e) => onUpdateStyle({ borderRadius: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400">Opacity ({style.opacity ?? 100}%)</label>
            <input
              type="range"
              min={10}
              max={100}
              value={style.opacity ?? 100}
              onChange={(e) => onUpdateStyle({ opacity: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      )}

      {/* TAB: LAYOUT */}
      {activeTab === "layout" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">X Position</label>
              <input
                type="number"
                value={Math.round(transform.x)}
                onChange={(e) => onUpdateTransform({ x: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Y Position</label>
              <input
                type="number"
                value={Math.round(transform.y)}
                onChange={(e) => onUpdateTransform({ y: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Width</label>
              <input
                type="number"
                value={Math.round(transform.width)}
                onChange={(e) => onUpdateTransform({ width: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400">Height</label>
              <input
                type="number"
                value={Math.round(transform.height)}
                onChange={(e) => onUpdateTransform({ height: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM LOCK OVERLAY MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#121216] p-5 shadow-2xl text-center space-y-3 font-sans"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Crown size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-wide">
                Unlock Premium Feature
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                {showPremiumModal} is an exclusive Pixel.gg Premium creative feature.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPremiumModal(null)}
                className="flex-1 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold"
              >
                Maybe Later
              </button>
              <a
                href="/premium"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold transition-all"
              >
                Upgrade to Pro
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
