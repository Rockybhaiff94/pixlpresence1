import { findBadgeMeta } from "./badgeCatalog";
import type { BuilderNode, BuilderStyle, ProfileBadgeItem } from "./profileBuilderTypes";

export type BadgeDisplayStyle = "icon-only" | "icon-square" | "icon-name";

export type BadgeAlignment = "start" | "center" | "end";
export type BadgeHoverEffect = "none" | "lift" | "scale" | "glow";
export type BadgeAnimation = "none" | "pulse" | "float";

export interface UnifiedBadgeConfig {
  id: string;
  name: string;
  iconUrl?: string;
  assetId?: string;
  source: "official" | "store" | "custom";
  isAnimated?: boolean;
  glyphIcon?: string;
  defaultColor?: string;

  displayStyle: BadgeDisplayStyle;

  icon: {
    enabled: boolean;
    size: number;
    width?: number;
    height?: number;
    opacity: number;
    horizontalPosition: number;
    verticalPosition: number;
    alignment: BadgeAlignment;
    spacing: number;
    colorMode: "original" | "preset" | "custom";
    color: string;
  };

  background: {
    enabled: boolean;
    type: "solid" | "gradient";
    color: string;
    gradientTo: string;
    gradientAngle: number;
    opacity: number;
    width?: number;
    height?: number;
    horizontalPosition: number;
    verticalPosition: number;
  };

  border: {
    enabled: boolean;
    color: string;
    width: number;
    radius: number;
    opacity: number;
  };

  text: {
    enabled: boolean;
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    align: "left" | "center" | "right";
    letterSpacing: number;
    horizontalPosition: number;
    verticalPosition: number;
  };

  layout: {
    padding: number;
    margin: number;
    gap: number;
    width?: number;
    height?: number;
    horizontalAlign: BadgeAlignment;
    verticalAlign: BadgeAlignment;
  };

  effects: {
    shadow: boolean;
    shadowBlur: number;
    shadowColor: string;
    glow: boolean;
    glowIntensity: number;
    glowColor: string;
    hoverEffect: BadgeHoverEffect;
    animation: BadgeAnimation;
    opacity: number;
  };
}

export function normalizeDisplayStyle(
  raw?: string | null,
  fallback: BadgeDisplayStyle = "icon-only"
): BadgeDisplayStyle {
  if (raw === "icon-only" || raw === "icon") return "icon-only";
  if (raw === "icon-square") return "icon-square";
  if (raw === "icon-name") return "icon-name";
  return fallback;
}

export function createDefaultUnifiedBadgeConfig(
  overrides?: Partial<UnifiedBadgeConfig>
): UnifiedBadgeConfig {
  const base: UnifiedBadgeConfig = {
    id: overrides?.id || "early_supporter",
    name: overrides?.name || "Early Supporter",
    iconUrl: overrides?.iconUrl,
    assetId: overrides?.assetId,
    source: overrides?.source || "official",
    isAnimated: overrides?.isAnimated,
    glyphIcon: overrides?.glyphIcon || "Star",
    defaultColor: overrides?.defaultColor || "#ffffff",
    displayStyle: overrides?.displayStyle || "icon-only",
    icon: {
      enabled: true,
      size: 20,
      opacity: 1,
      horizontalPosition: 0,
      verticalPosition: 0,
      alignment: "center",
      spacing: 0,
      colorMode: "original",
      color: overrides?.defaultColor || "#ffffff",
      ...overrides?.icon,
    },
    background: {
      enabled: true,
      type: "solid",
      color: "#111116",
      gradientTo: "#262634",
      gradientAngle: 135,
      opacity: 0.85,
      horizontalPosition: 0,
      verticalPosition: 0,
      ...overrides?.background,
    },
    border: {
      enabled: true,
      color: "#2a2a34",
      width: 1,
      radius: 10,
      opacity: 1,
      ...overrides?.border,
    },
    text: {
      enabled: true,
      color: "#ffffff",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "JetBrains Mono, monospace",
      align: "left",
      letterSpacing: 0,
      horizontalPosition: 0,
      verticalPosition: 0,
      ...overrides?.text,
    },
    layout: {
      padding: 6,
      margin: 0,
      gap: 6,
      horizontalAlign: "center",
      verticalAlign: "center",
      ...overrides?.layout,
    },
    effects: {
      shadow: false,
      shadowBlur: 12,
      shadowColor: "#000000",
      glow: false,
      glowIntensity: 12,
      glowColor: overrides?.defaultColor || "#ffffff",
      hoverEffect: "none",
      animation: "none",
      opacity: 1,
      ...overrides?.effects,
    },
  };
  return base;
}

function mergeUnified(
  defaults: UnifiedBadgeConfig,
  saved?: Partial<UnifiedBadgeConfig> | null
): UnifiedBadgeConfig {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    displayStyle: normalizeDisplayStyle(saved.displayStyle, defaults.displayStyle),
    icon: { ...defaults.icon, ...(saved.icon || {}) },
    background: { ...defaults.background, ...(saved.background || {}) },
    border: { ...defaults.border, ...(saved.border || {}) },
    text: { ...defaults.text, ...(saved.text || {}) },
    layout: { ...defaults.layout, ...(saved.layout || {}) },
    effects: { ...defaults.effects, ...(saved.effects || {}) },
  };
}

export function normalizeProfileBadgeNodeConfig(node: BuilderNode): UnifiedBadgeConfig {
  const cfg = node.config || {};
  const style: BuilderStyle = node.style || {};
  const badgeId = cfg.badgeId || "early_supporter";
  const meta = findBadgeMeta(badgeId);
  const minDim = Math.max(20, Math.min(node.width || 44, node.height || 44));
  const legacyDisplayStyle = normalizeDisplayStyle(cfg.badgeDisplayMode, "icon-only");
  const defaultIconSize =
    legacyDisplayStyle === "icon-name"
      ? Math.max(12, Math.min(24, Math.round(minDim * 0.48)))
      : Math.max(14, Math.min(48, Math.round(minDim * 0.56)));

  const colorMode = cfg.badgeColorMode || "original";
  const effectiveColor =
    colorMode === "original" ? meta?.defaultColor || "#ffffff" : cfg.badgeColor || "#ffffff";

  const defaults = createDefaultUnifiedBadgeConfig({
    id: badgeId,
    name: cfg.badgeCustomName || meta?.name || "Profile Badge",
    iconUrl: cfg.badgeCustomImageUrl,
    assetId: cfg.badgeCustomAssetId,
    source: cfg.badgeSource || "official",
    isAnimated: cfg.badgeIsAnimated,
    glyphIcon: meta?.icon || "Award",
    defaultColor: meta?.defaultColor || "#ffffff",
    displayStyle: legacyDisplayStyle,
    icon: {
      enabled: true,
      size: defaultIconSize,
      opacity: 1,
      horizontalPosition: 0,
      verticalPosition: 0,
      alignment: "center",
      spacing: 0,
      colorMode,
      color: cfg.badgeColor || effectiveColor,
    },
    background: {
      enabled: style.backgroundType !== "transparent" && (style.backgroundOpacity ?? 0.85) > 0,
      type: style.backgroundType === "gradient" ? "gradient" : "solid",
      color: style.backgroundColor || "#111116",
      gradientTo: style.backgroundGradientTo || "#262634",
      gradientAngle: style.backgroundGradientAngle ?? 135,
      opacity: style.backgroundOpacity ?? 0.85,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    border: {
      enabled: (style.borderWidth ?? 1) > 0 && style.borderStyle !== "none",
      color: style.borderColor || "#2a2a34",
      width: style.borderWidth ?? 1,
      radius: style.borderRadius ?? 10,
      opacity: 1,
    },
    text: {
      enabled: true,
      color: effectiveColor,
      fontSize: cfg.fontSize ?? 12,
      fontWeight: cfg.fontWeight ?? 600,
      fontFamily: cfg.fontFamily || "JetBrains Mono, monospace",
      align: "left",
      letterSpacing: 0,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    layout: {
      padding: style.padding ?? 8,
      margin: 0,
      gap: style.gap ?? 6,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
    effects: {
      shadow: (style.shadowBlur ?? 0) > 0,
      shadowBlur: style.shadowBlur ?? 12,
      shadowColor: style.shadowColor || "#000000",
      glow: Boolean(cfg.badgeGlowEnabled),
      glowIntensity: cfg.badgeGlowIntensity ?? 12,
      glowColor: cfg.badgeGlowColor || effectiveColor,
      hoverEffect: "none",
      animation: "none",
      opacity: style.opacity ?? 1,
    },
  });

  const merged = mergeUnified(defaults, cfg.unifiedBadge);
  if (cfg.badgeCustomImageUrl && !merged.iconUrl) {
    merged.iconUrl = cfg.badgeCustomImageUrl;
  }
  if (cfg.badgeId && merged.id !== cfg.badgeId && !cfg.unifiedBadge) {
    merged.id = cfg.badgeId;
  }
  return merged;
}

export function normalizeNameBadgeConfig(node: BuilderNode): UnifiedBadgeConfig | null {
  const cfg = node.config || {};
  const enabled =
    cfg.nameBadgeEnabled !== undefined ? cfg.nameBadgeEnabled : Boolean(cfg.showVerifiedBadge);
  const badgeId =
    cfg.nameBadgeId !== undefined ? cfg.nameBadgeId : cfg.showVerifiedBadge ? "verified" : null;
  if (!enabled || (!badgeId && !cfg.nameBadgeConfig?.iconUrl && !cfg.nameBadgeCustomImageUrl)) {
    return null;
  }

  const effectiveId = badgeId || cfg.nameBadgeConfig?.id || "verified";
  const meta = findBadgeMeta(effectiveId);
  const fontSize = cfg.fontSize || 22;
  const defaultIconSize = Math.max(13, Math.round(fontSize * 0.72));

  const defaults = createDefaultUnifiedBadgeConfig({
    id: effectiveId,
    name: cfg.nameBadgeCustomName || meta?.name || "Badge",
    iconUrl: cfg.nameBadgeCustomImageUrl,
    assetId: cfg.nameBadgeCustomAssetId,
    source: cfg.nameBadgeSource || "official",
    glyphIcon: meta?.icon || "CheckCircle",
    defaultColor: meta?.defaultColor || "#ffffff",
    displayStyle: "icon-only",
    icon: {
      enabled: true,
      size: defaultIconSize,
      opacity: 1,
      horizontalPosition: 0,
      verticalPosition: 0,
      alignment: "center",
      spacing: 0,
      colorMode: "original",
      color: meta?.defaultColor || "#ffffff",
    },
    background: {
      enabled: true,
      type: "solid",
      color: "#111116",
      gradientTo: "#262634",
      gradientAngle: 135,
      opacity: 0.85,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    border: {
      enabled: true,
      color: "#2a2a34",
      width: 1,
      radius: 8,
      opacity: 1,
    },
    text: {
      enabled: true,
      color: meta?.defaultColor || "#ffffff",
      fontSize: Math.max(10, Math.round(fontSize * 0.5)),
      fontWeight: 600,
      fontFamily: "JetBrains Mono, monospace",
      align: "left",
      letterSpacing: 0,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    layout: {
      padding: 4,
      margin: 0,
      gap: 4,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
  });

  return mergeUnified(defaults, cfg.nameBadgeConfig);
}

const LEGACY_ICON_TO_CATALOG: Record<string, string> = {
  creator: "Sparkles",
  premium: "Crown",
  dev: "Zap",
  verified: "CheckCircle",
  shield: "Shield",
  crown: "Crown",
  flame: "Flame",
  sparkles: "Sparkles",
};

export function normalizeLegacyBadgeItemConfig(item: ProfileBadgeItem): UnifiedBadgeConfig {
  const meta = findBadgeMeta(item.id);
  const defaults = createDefaultUnifiedBadgeConfig({
    id: item.id,
    name: item.label || meta?.name || "Badge",
    source: "official",
    glyphIcon: meta?.icon || LEGACY_ICON_TO_CATALOG[item.icon] || "Award",
    defaultColor: item.color || meta?.defaultColor || "#ffffff",
    displayStyle: "icon-name",
    icon: {
      enabled: true,
      size: 12,
      opacity: 1,
      horizontalPosition: 0,
      verticalPosition: 0,
      alignment: "center",
      spacing: 0,
      colorMode: "custom",
      color: item.color || "#ffffff",
    },
    background: {
      enabled: true,
      type: "solid",
      color: item.backgroundColor || "#18181f",
      gradientTo: "#262634",
      gradientAngle: 135,
      opacity: 1,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    border: {
      enabled: true,
      color: item.borderColor || "#2a2a35",
      width: 1,
      radius: item.borderRadius ?? 6,
      opacity: 1,
    },
    text: {
      enabled: true,
      color: item.color || "#ffffff",
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "JetBrains Mono, monospace",
      align: "left",
      letterSpacing: 0,
      horizontalPosition: 0,
      verticalPosition: 0,
    },
    layout: {
      padding: 4,
      margin: 0,
      gap: 4,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
  });

  return mergeUnified(defaults, item.unifiedConfig);
}

export function unifiedConfigToProfileBadgeNodePatch(
  unified: UnifiedBadgeConfig,
  currentNode: BuilderNode
): Partial<BuilderNode> {
  const legacyMode =
    unified.displayStyle === "icon-only"
      ? "icon"
      : unified.displayStyle === "icon-name"
        ? "icon-name"
        : "icon-square";

  return {
    name: unified.name || currentNode.name,
    style: {
      ...currentNode.style,
      backgroundType: unified.background.type,
      backgroundColor: unified.background.color,
      backgroundGradientTo: unified.background.gradientTo,
      backgroundGradientAngle: unified.background.gradientAngle,
      backgroundOpacity: unified.background.opacity,
      borderColor: unified.border.color,
      borderWidth: unified.border.width,
      borderStyle: unified.border.enabled ? "solid" : "none",
      borderRadius: unified.border.radius,
      padding: unified.layout.padding,
      gap: unified.layout.gap,
      opacity: unified.effects.opacity,
    },
    config: {
      ...currentNode.config,
      badgeId: unified.id,
      badgeSource: unified.source,
      badgeCustomImageUrl: unified.iconUrl,
      badgeCustomAssetId: unified.assetId,
      badgeCustomName: unified.name,
      badgeIsAnimated: unified.isAnimated,
      badgeDisplayMode: legacyMode,
      badgeColorMode: unified.icon.colorMode,
      badgeColor: unified.icon.color,
      badgeGlowEnabled: unified.effects.glow,
      badgeGlowIntensity: unified.effects.glowIntensity,
      badgeGlowColor: unified.effects.glowColor,
      fontSize: unified.text.fontSize,
      fontWeight: unified.text.fontWeight,
      fontFamily: unified.text.fontFamily,
      unifiedBadge: unified,
    },
  };
}
