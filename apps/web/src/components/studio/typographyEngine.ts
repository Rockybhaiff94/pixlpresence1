import {
  CanvasElementType,
  CanvasElementStyle,
  TextStyleDefinition,
  TextStyleGroupId,
  TextStyleGroups,
  DEFAULT_TEXT_STYLE_GROUPS,
} from "@/types/studio";

export interface FontOption {
  id: string;
  name: string;
  category: "sans" | "serif" | "mono" | "display";
  sample: string;
}

export const CURATED_FONTS: FontOption[] = [
  { id: "Space Grotesk", name: "Space Grotesk", category: "display", sample: "Aa Bb 123" },
  { id: "Inter", name: "Inter", category: "sans", sample: "Aa Bb 123" },
  { id: "JetBrains Mono", name: "JetBrains Mono", category: "mono", sample: "const x = 42;" },
  { id: "Roboto", name: "Roboto", category: "sans", sample: "Aa Bb 123" },
  { id: "Poppins", name: "Poppins", category: "sans", sample: "Aa Bb 123" },
  { id: "Outfit", name: "Outfit", category: "sans", sample: "Aa Bb 123" },
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", category: "sans", sample: "Aa Bb 123" },
  { id: "Cinzel", name: "Cinzel", category: "serif", sample: "ROMAN STYLE" },
  { id: "Playfair Display", name: "Playfair Display", category: "serif", sample: "Elegant Editorial" },
  { id: "Montserrat", name: "Montserrat", category: "sans", sample: "Aa Bb 123" },
  { id: "Fira Code", name: "Fira Code", category: "mono", sample: "=> != ===" },
  { id: "system-ui", name: "System Sans", category: "sans", sample: "Default OS Font" },
];

export const FONT_WEIGHTS = [
  { value: 100, label: "Thin" },
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
  { value: 900, label: "Black" },
];

export const TEXT_ALIGN_OPTIONS: Array<{ value: "left" | "center" | "right" | "justify"; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
];

/**
 * Resolves which typography style group an element type belongs to.
 */
export function resolveStyleGroup(type: CanvasElementType): TextStyleGroupId {
  switch (type) {
    case "displayName":
    case "username":
      return "profileName";

    case "title":
    case "heading":
      return "heading";

    case "subtitle":
    case "tagline":
      return "subheading";

    case "bio":
    case "description":
    case "text":
      return "body";

    case "footerText":
    case "timestamp":
    case "authorText":
      return "footer";

    case "fieldName":
    case "fieldValue":
    case "customLabels":
    case "customBadges":
    case "verificationBadge":
      return "metadata";

    default:
      return "body";
  }
}

/**
 * Checks whether an element is a text-based element supporting typography.
 */
export function isTextBasedElement(type: CanvasElementType): boolean {
  return [
    "displayName",
    "username",
    "title",
    "heading",
    "subtitle",
    "tagline",
    "bio",
    "description",
    "text",
    "authorText",
    "footerText",
    "timestamp",
    "fieldName",
    "fieldValue",
    "customLabels",
    "customBadges",
    "verificationBadge",
  ].includes(type);
}

/**
 * Checks if an element is dynamic Discord Rich Presence metadata whose content
 * must be sourced strictly from Discord and not overridden by the generic text editor.
 */
export function isDynamicRestrictedText(type: CanvasElementType): boolean {
  return [
    "rpc",
    "discordGameTitle",
    "discordActivity",
    "discordActivityDesc",
    "discordParty",
    "discordTimestamps",
    "discordArtwork",
  ].includes(type);
}

/**
 * Resolves inherited style for a newly added or reset text element from the active style groups.
 */
export function getInheritedTextStyle(
  type: CanvasElementType,
  groups?: TextStyleGroups
): CanvasElementStyle {
  const groupId = resolveStyleGroup(type);
  const activeGroups = groups || DEFAULT_TEXT_STYLE_GROUPS;
  const def = activeGroups[groupId] || DEFAULT_TEXT_STYLE_GROUPS[groupId] || DEFAULT_TEXT_STYLE_GROUPS.body;

  return {
    fontFamily: def.fontFamily,
    fontSize: def.fontSize,
    fontWeight: def.fontWeight,
    color: def.color,
    letterSpacing: def.letterSpacing,
    lineHeight: def.lineHeight,
    textAlign: def.textAlign,
    textTransform: def.textTransform,
    textDecoration: def.textDecoration,
    shadowBlur: def.shadowBlur,
    shadowColor: def.shadowColor,
    opacity: def.opacity,
    styleGroupId: groupId,
    hasCustomTypographyOverride: false,
  };
}

/**
 * Creates a complete definition for updating a style group from an element's current style.
 */
export function extractStyleDefinition(style?: CanvasElementStyle): TextStyleDefinition {
  return {
    fontFamily: style?.fontFamily || "Inter",
    fontSize: style?.fontSize || 14,
    fontWeight: style?.fontWeight || 400,
    color: style?.color || "#ffffff",
    letterSpacing: style?.letterSpacing,
    lineHeight: style?.lineHeight,
    textAlign: style?.textAlign || "left",
    textTransform: style?.textTransform || "none",
    textDecoration: style?.textDecoration || "none",
    shadowBlur: style?.shadowBlur,
    shadowColor: style?.shadowColor,
    opacity: style?.opacity,
  };
}
