"use client";

import React from "react";
import { Lock } from "lucide-react";
import {
  BadgeInventoryItem,
  PREDEFINED_BADGE_COLORS,
  findBadgeMeta,
  renderBadgeGlyph,
} from "./badgeCatalog";
import { UnifiedBadge } from "./UnifiedBadgeRenderer";
import type {
  BadgeAlignment,
  BadgeAnimation,
  BadgeDisplayStyle,
  BadgeHoverEffect,
  UnifiedBadgeConfig,
} from "./unifiedBadge";

interface UnifiedBadgeEditorProps {
  config: UnifiedBadgeConfig;
  onChange: (next: UnifiedBadgeConfig) => void;
  badgeInventory?: BadgeInventoryItem[];
  isPremiumOrAdmin?: boolean;
  onRestrictedFeature?: (message: string) => void;
  onOpenBadgePicker?: (options: {
    title: string;
    mode?: "name-badge" | "decoration-badge";
    selectedBadgeId?: string | null;
    onSelect: (badge: BadgeInventoryItem) => void;
  }) => void;
  pickerTitle?: string;
  testIdPrefix?: string;
}

const safeNum = (val: string, fallback: number, min: number, max: number) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const FONT_OPTIONS = [
  { label: "JetBrains Mono", value: "JetBrains Mono, monospace" },
  { label: "Space Grotesk", value: "Space Grotesk, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

export const UnifiedBadgeEditor: React.FC<UnifiedBadgeEditorProps> = ({
  config,
  onChange,
  badgeInventory = [],
  isPremiumOrAdmin = true,
  onRestrictedFeature,
  onOpenBadgePicker,
  pickerTitle = "Select Badge",
  testIdPrefix = "unified-badge",
}) => {
  const meta =
    badgeInventory.find((b) => b.id === config.id) || findBadgeMeta(config.id);

  const patchRoot = (patch: Partial<UnifiedBadgeConfig>) =>
    onChange({ ...config, ...patch });

  const patchIcon = (patch: Partial<UnifiedBadgeConfig["icon"]>) =>
    onChange({ ...config, icon: { ...config.icon, ...patch } });

  const patchBg = (patch: Partial<UnifiedBadgeConfig["background"]>) =>
    onChange({ ...config, background: { ...config.background, ...patch } });

  const patchBorder = (patch: Partial<UnifiedBadgeConfig["border"]>) =>
    onChange({ ...config, border: { ...config.border, ...patch } });

  const patchText = (patch: Partial<UnifiedBadgeConfig["text"]>) =>
    onChange({ ...config, text: { ...config.text, ...patch } });

  const patchLayout = (patch: Partial<UnifiedBadgeConfig["layout"]>) =>
    onChange({ ...config, layout: { ...config.layout, ...patch } });

  const patchEffects = (patch: Partial<UnifiedBadgeConfig["effects"]>) =>
    onChange({ ...config, effects: { ...config.effects, ...patch } });

  const styleOptions: Array<{ id: BadgeDisplayStyle; label: string }> = [
    { id: "icon-only", label: "Icon Only" },
    { id: "icon-square", label: "Icon + Square" },
    { id: "icon-name", label: "Icon + Name" },
  ];

  const isIconOnly = config.displayStyle === "icon-only";
  const isIconSquare = config.displayStyle === "icon-square";
  const isIconName = config.displayStyle === "icon-name";

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-editor`}>
      {/* Selected Badge & Live Preview */}
      <div className="p-2 rounded-lg bg-[#121217] border border-[#24242d] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-[#0d0d13] border border-[#24242d] flex items-center justify-center shrink-0 overflow-hidden">
              {config.iconUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={config.iconUrl}
                  alt={config.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                renderBadgeGlyph(
                  config.glyphIcon || meta?.icon || "Award",
                  14,
                  config.defaultColor || meta?.defaultColor || "#ffffff"
                )
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white truncate">
                {config.name || meta?.name || "Badge"}
              </div>
              <div className="text-[9px] text-neutral-500 truncate">
                {config.source === "custom"
                  ? "Custom Uploaded"
                  : meta?.category || "Official"}
              </div>
            </div>
          </div>
          {onOpenBadgePicker && (
            <button
              type="button"
              onClick={() =>
                onOpenBadgePicker({
                  title: pickerTitle,
                  mode: "decoration-badge",
                  selectedBadgeId: config.id,
                  onSelect: (badge) => {
                    onChange({
                      ...config,
                      id: badge.id,
                      name: badge.name,
                      source: badge.source || "official",
                      iconUrl: badge.imageUrl || undefined,
                      assetId: badge.assetId || undefined,
                      isAnimated: badge.isAnimated,
                      glyphIcon: badge.icon || config.glyphIcon,
                      defaultColor: badge.defaultColor || "#ffffff",
                      icon: {
                        ...config.icon,
                        color:
                          config.icon.colorMode === "original"
                            ? badge.defaultColor || "#ffffff"
                            : config.icon.color,
                      },
                    });
                  },
                })
              }
              className="px-2 py-1 rounded bg-[#191924] hover:bg-[#222230] border border-[#2e2e3c] text-[9px] font-semibold text-white cursor-pointer shrink-0"
              data-testid={`${testIdPrefix}-picker-btn`}
            >
              Change / Upload
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#0a0a0f] border border-[#1d1d26]">
          <span className="text-[9px] text-neutral-500 uppercase">Preview</span>
          <UnifiedBadge config={config} dataTestId={`${testIdPrefix}-live-preview`} />
        </div>
      </div>

      {/* Badge Display Style Selector */}
      <div>
        <label className="text-[9px] text-neutral-500 uppercase block mb-1">
          Badge Display Style
        </label>
        <div className="grid grid-cols-3 gap-1">
          {styleOptions.map((opt) => {
            const active = config.displayStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => patchRoot({ displayStyle: opt.id })}
                className={`py-1 px-1 rounded border text-[9px] cursor-pointer transition-colors ${
                  active
                    ? "bg-white text-black border-white font-bold"
                    : "bg-[#121217] border-[#24242d] text-neutral-400 hover:text-white"
                }`}
                data-testid={`${testIdPrefix}-style-${opt.id}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* A. Icon Customization */}
      <div className="pt-2 border-t border-[#1e1e26] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-300">Icon</span>
          <input
            type="checkbox"
            checked={config.icon.enabled}
            onChange={(e) => patchIcon({ enabled: e.target.checked })}
            className="accent-white cursor-pointer"
            data-testid={`${testIdPrefix}-icon-enabled`}
          />
        </div>

        {config.icon.enabled && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                  Icon Size (px)
                </label>
                <input
                  type="number"
                  value={config.icon.size}
                  onChange={(e) => {
                    const s = safeNum(e.target.value, 20, 8, 96);
                    patchIcon({ size: s, width: undefined, height: undefined });
                  }}
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                  data-testid={`${testIdPrefix}-icon-size`}
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                  Icon Opacity (%)
                </label>
                <input
                  type="number"
                  value={Math.round((config.icon.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    patchIcon({ opacity: safeNum(e.target.value, 100, 0, 100) / 100 })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                  Offset X (px)
                </label>
                <input
                  type="number"
                  value={config.icon.horizontalPosition ?? 0}
                  onChange={(e) =>
                    patchIcon({ horizontalPosition: safeNum(e.target.value, 0, -24, 24) })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                  Offset Y (px)
                </label>
                <input
                  type="number"
                  value={config.icon.verticalPosition ?? 0}
                  onChange={(e) =>
                    patchIcon({ verticalPosition: safeNum(e.target.value, 0, -24, 24) })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-1">
                Icon Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["start", "center", "end"] as BadgeAlignment[]).map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => patchIcon({ alignment: al })}
                    className={`py-0.5 rounded border text-[9px] capitalize cursor-pointer ${
                      config.icon.alignment === al
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#121217] border-[#24242d] text-neutral-400"
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>
            </div>

            {!config.iconUrl && (
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-1">
                  Icon Color
                </label>
                <div className="grid grid-cols-2 gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => patchIcon({ colorMode: "original" })}
                    className={`py-1 rounded border text-[9px] cursor-pointer ${
                      config.icon.colorMode === "original"
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#121217] border-[#24242d] text-neutral-400"
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPremiumOrAdmin) {
                        onRestrictedFeature?.("Custom badge colors require Premium.");
                        return;
                      }
                      patchIcon({ colorMode: "custom" });
                    }}
                    className={`py-1 rounded border text-[9px] flex items-center justify-center gap-1 ${
                      config.icon.colorMode === "custom"
                        ? "bg-white text-black border-white font-bold cursor-pointer"
                        : !isPremiumOrAdmin
                          ? "bg-[#101014] border-[#202028] text-neutral-600 cursor-not-allowed"
                          : "bg-[#121217] border-[#24242d] text-neutral-400 cursor-pointer"
                    }`}
                  >
                    {!isPremiumOrAdmin && <Lock size={9} />}
                    <span>Custom</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PREDEFINED_BADGE_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        patchIcon({ colorMode: "preset", color: preset.value })
                      }
                      title={preset.label}
                      className={`w-5 h-5 rounded border cursor-pointer ${
                        config.icon.colorMode === "preset" &&
                        config.icon.color.toLowerCase() === preset.value.toLowerCase()
                          ? "border-white ring-2 ring-white/40"
                          : "border-[#2e2e3a]"
                      }`}
                      style={{ backgroundColor: preset.value }}
                    />
                  ))}
                  {config.icon.colorMode === "custom" && isPremiumOrAdmin && (
                    <input
                      type="color"
                      value={config.icon.color.startsWith("#") ? config.icon.color : "#ffffff"}
                      onChange={(e) =>
                        patchIcon({ colorMode: "custom", color: e.target.value })
                      }
                      className="w-6 h-6 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* D. Text Customization (Only in Icon + Name) */}
      {isIconName && (
        <div className="pt-2 border-t border-[#1e1e26] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-300">Badge Name & Text</span>
            <input
              type="checkbox"
              checked={config.text.enabled}
              onChange={(e) => patchText({ enabled: e.target.checked })}
              className="accent-white cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
              Badge Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => patchRoot({ name: e.target.value })}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
              data-testid={`${testIdPrefix}-name-input`}
            />
          </div>

          {config.text.enabled && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Color
                  </label>
                  <input
                    type="color"
                    value={config.text.color.startsWith("#") ? config.text.color : "#ffffff"}
                    onChange={(e) => patchText({ color: e.target.value })}
                    className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                    data-testid={`${testIdPrefix}-text-color`}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Size (px)
                  </label>
                  <input
                    type="number"
                    value={config.text.fontSize}
                    onChange={(e) =>
                      patchText({ fontSize: safeNum(e.target.value, 12, 8, 32) })
                    }
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                    data-testid={`${testIdPrefix}-text-size`}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Weight
                  </label>
                  <select
                    value={config.text.fontWeight}
                    onChange={(e) => patchText({ fontWeight: Number(e.target.value) })}
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[10px] text-white outline-none"
                  >
                    <option value={400}>400</option>
                    <option value={500}>500</option>
                    <option value={600}>600</option>
                    <option value={700}>700</option>
                    <option value={800}>800</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Font Family
                  </label>
                  <select
                    value={config.text.fontFamily}
                    onChange={(e) => patchText({ fontFamily: e.target.value })}
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[10px] text-white outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Tracking (px)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={config.text.letterSpacing}
                    onChange={(e) =>
                      patchText({ letterSpacing: safeNum(e.target.value, 0, -2, 8) })
                    }
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* B. Background Customization (Hidden in Icon Only, preserved in state) */}
      {(isIconSquare || isIconName) && (
        <div className="pt-2 border-t border-[#1e1e26] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-300">Background</span>
            <input
              type="checkbox"
              checked={config.background.enabled}
              onChange={(e) => patchBg({ enabled: e.target.checked })}
              className="accent-white cursor-pointer"
              data-testid={`${testIdPrefix}-bg-enabled`}
            />
          </div>

          {config.background.enabled && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                {(["solid", "gradient"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patchBg({ type: t })}
                    className={`py-1 rounded border text-[9px] capitalize cursor-pointer ${
                      config.background.type === t
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#121217] border-[#24242d] text-neutral-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Color
                  </label>
                  <input
                    type="color"
                    value={
                      config.background.color.startsWith("#")
                        ? config.background.color
                        : "#111116"
                    }
                    onChange={(e) => patchBg({ color: e.target.value })}
                    className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                    data-testid={`${testIdPrefix}-bg-color`}
                  />
                </div>
                {config.background.type === "gradient" && (
                  <div>
                    <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                      To
                    </label>
                    <input
                      type="color"
                      value={
                        config.background.gradientTo.startsWith("#")
                          ? config.background.gradientTo
                          : "#262634"
                      }
                      onChange={(e) => patchBg({ gradientTo: e.target.value })}
                      className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                    Opacity %
                  </label>
                  <input
                    type="number"
                    value={Math.round((config.background.opacity ?? 0.85) * 100)}
                    onChange={(e) =>
                      patchBg({ opacity: safeNum(e.target.value, 85, 0, 100) / 100 })
                    }
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-[11px] text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C. Border Customization (Hidden in Icon Only, preserved in state) */}
      {(isIconSquare || isIconName) && (
        <div className="pt-2 border-t border-[#1e1e26] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-300">Border</span>
            <input
              type="checkbox"
              checked={config.border.enabled}
              onChange={(e) => patchBorder({ enabled: e.target.checked })}
              className="accent-white cursor-pointer"
              data-testid={`${testIdPrefix}-border-enabled`}
            />
          </div>

          {config.border.enabled && (
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Color</label>
                <input
                  type="color"
                  value={config.border.color.startsWith("#") ? config.border.color : "#2a2a34"}
                  onChange={(e) => patchBorder({ color: e.target.value })}
                  className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                  data-testid={`${testIdPrefix}-border-color`}
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Width</label>
                <input
                  type="number"
                  value={config.border.width}
                  onChange={(e) =>
                    patchBorder({ width: safeNum(e.target.value, 1, 0, 12) })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Radius</label>
                <input
                  type="number"
                  value={config.border.radius}
                  onChange={(e) =>
                    patchBorder({ radius: safeNum(e.target.value, 10, 0, 999) })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
                  data-testid={`${testIdPrefix}-border-radius`}
                />
              </div>
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Opacity</label>
                <input
                  type="number"
                  value={Math.round((config.border.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    patchBorder({ opacity: safeNum(e.target.value, 100, 0, 100) / 100 })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* E. Layout Customization */}
      <div className="pt-2 border-t border-[#1e1e26] space-y-2">
        <span className="text-[10px] font-semibold text-neutral-300 block">Layout & Spacing</span>
        <div className="grid grid-cols-3 gap-1.5">
          {!isIconOnly && (
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Padding</label>
              <input
                type="number"
                value={config.layout.padding}
                onChange={(e) =>
                  patchLayout({ padding: safeNum(e.target.value, 6, 0, 32) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
              />
            </div>
          )}
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Margin</label>
            <input
              type="number"
              value={config.layout.margin}
              onChange={(e) =>
                patchLayout({ margin: safeNum(e.target.value, 0, 0, 24) })
              }
              className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
            />
          </div>
          {isIconName && (
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Gap</label>
              <input
                type="number"
                value={config.layout.gap}
                onChange={(e) =>
                  patchLayout({ gap: safeNum(e.target.value, 6, 0, 24) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
                data-testid={`${testIdPrefix}-layout-gap`}
              />
            </div>
          )}
          {isIconSquare && (
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                Square Size
              </label>
              <input
                type="number"
                placeholder="Auto"
                value={config.layout.width ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? undefined : safeNum(v, 36, 16, 160);
                  patchLayout({ width: num, height: num });
                }}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[11px] text-white outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* F. Effects & Animation */}
      <div className="pt-2 border-t border-[#1e1e26] space-y-2">
        <span className="text-[10px] font-semibold text-neutral-300 block">Effects</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center justify-between text-[10px] text-neutral-300 bg-[#121217] border border-[#24242d] rounded px-2 py-1 cursor-pointer">
            <span>Glow</span>
            <input
              type="checkbox"
              checked={config.effects.glow}
              onChange={(e) => patchEffects({ glow: e.target.checked })}
              className="accent-white cursor-pointer"
              data-testid={`${testIdPrefix}-glow-toggle`}
            />
          </label>
          <label className="flex items-center justify-between text-[10px] text-neutral-300 bg-[#121217] border border-[#24242d] rounded px-2 py-1 cursor-pointer">
            <span>Shadow</span>
            <input
              type="checkbox"
              checked={config.effects.shadow}
              onChange={(e) => patchEffects({ shadow: e.target.checked })}
              className="accent-white cursor-pointer"
            />
          </label>
        </div>

        {config.effects.glow && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                Glow Color
              </label>
              <input
                type="color"
                value={
                  config.effects.glowColor.startsWith("#")
                    ? config.effects.glowColor
                    : "#ffffff"
                }
                onChange={(e) => patchEffects({ glowColor: e.target.value })}
                className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                Glow ({config.effects.glowIntensity}px)
              </label>
              <input
                type="range"
                min={2}
                max={32}
                value={config.effects.glowIntensity}
                onChange={(e) => patchEffects({ glowIntensity: Number(e.target.value) })}
                className="w-full accent-white mt-1.5"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Hover</label>
            <select
              value={config.effects.hoverEffect}
              onChange={(e) => patchEffects({ hoverEffect: e.target.value as BadgeHoverEffect })}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[10px] text-white outline-none"
            >
              <option value="none">None</option>
              <option value="lift">Lift</option>
              <option value="scale">Scale</option>
              <option value="glow">Brighten</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Animation</label>
            <select
              value={config.effects.animation}
              onChange={(e) => patchEffects({ animation: e.target.value as BadgeAnimation })}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-[10px] text-white outline-none"
            >
              <option value="none">None</option>
              <option value="pulse">Pulse</option>
              <option value="float">Float</option>
            </select>
          </div>
        </div>
      </div>

      {isIconOnly && (
        <p className="text-[9px] text-neutral-500 leading-relaxed">
          Icon Only renders only the icon with no square, background, or border. Saved square/name settings are preserved if you switch back.
        </p>
      )}
    </div>
  );
};
