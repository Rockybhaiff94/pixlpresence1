export type LayoutPreset =
  | "centered"
  | "left"
  | "right"
  | "minimal"
  | "card"
  | "split"
  | "wide"
  | "compact"
  | "glass"
  | "custom";

export type AvatarShape = "circle" | "square" | "rounded" | "squircle";
export type BackgroundType = "solid" | "gradient" | "mesh" | "image" | "gif" | "pattern";
export type PatternType = "none" | "dots" | "grid" | "matrix" | "scanlines" | "noise";
export type ParticleEffect = "None" | "Snow" | "Stars" | "Fireflies" | "Rain" | "Matrix";
export type BadgeStyle = "pill" | "glyph" | "minimal" | "neon" | "hidden";
export type ButtonVariant = "solid-white" | "glass" | "neon" | "minimal" | "outline" | "gradient";
export type SocialIconStyle = "minimal" | "pill" | "glass" | "neon" | "circle";
export type RpcStyle = "card" | "glass" | "minimal" | "compact" | "neon";
export type RpcImageLayout = "left" | "right" | "stacked" | "hidden";

export interface StudioLayer {
  id: string;
  type: "avatar" | "identity" | "rpc" | "music" | "buttons" | "socials" | "custom";
  label: string;
  visible: boolean;
  locked: boolean;
}

export interface ProfileDesignConfig {
  version: 2;
  mode: "studio" | "classic";
  layout: {
    preset: LayoutPreset;
    maxWidth: number; // in px: 480 to 900
    padding: number;
    gap: number;
    alignment: "left" | "center" | "right";
    elementOrder: string[];
  };
  identity: {
    titleFont: string;
    titleSize: number; // in px
    titleWeight: number; // 400 to 900
    titleColor: string;
    bioFont: string;
    bioColor: string;
    badgeStyle: BadgeStyle;
  };
  avatar: {
    shape: AvatarShape;
    size: number; // in px: 64 to 160
    borderWidth: number;
    borderColor: string;
    borderGradient?: string;
    glow: boolean;
    glowColor: string;
    shadow: boolean;
    hoverAnimation: "none" | "scale" | "rotate" | "pulse";
  };
  background: {
    type: BackgroundType;
    color: string;
    gradient: {
      type: "linear" | "radial";
      angle: number;
      stops: { color: string; offset: number }[];
    };
    imageUrl?: string;
    pattern: PatternType;
    blur: number;
    opacity: number;
    overlayColor: string;
    overlayOpacity: number;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    letterSpacing: number; // in px: -2 to 6
    lineHeight: number; // 1.1 to 2.0
    customFontUrl?: string;
    customFontName?: string;
  };
  discordRpc: {
    style: RpcStyle;
    imageLayout: RpcImageLayout;
    borderRadius: number;
    showTelemetryBadge: boolean;
    showTimer: boolean;
    customBorderColor?: string;
  };
  buttons: {
    variant: ButtonVariant;
    borderRadius: number;
    hoverEffect: "lift" | "glow" | "fill" | "slide";
    animation: "none" | "pulse" | "shimmer";
  };
  socials: {
    style: SocialIconStyle;
    iconSize: number;
    alignment: "center" | "left" | "right";
    spacing: number;
  };
  effects: {
    glassmorphism: boolean;
    blur: number;
    opacity: number;
    particles: ParticleEffect;
    scanlines: boolean;
    noise: boolean;
    tiltEffect: boolean;
    ambientGlow: boolean;
    glowColor: string;
  };
  customCss?: string;
  layers: StudioLayer[];
}

export const DEFAULT_DESIGN_CONFIG: ProfileDesignConfig = {
  version: 2,
  mode: "studio",
  layout: {
    preset: "centered",
    maxWidth: 580,
    padding: 32,
    gap: 24,
    alignment: "center",
    elementOrder: ["avatar", "identity", "rpc", "music", "buttons", "socials"],
  },
  identity: {
    titleFont: "Space Grotesk",
    titleSize: 26,
    titleWeight: 700,
    titleColor: "#ffffff",
    bioFont: "Inter",
    bioColor: "#a3a3a3",
    badgeStyle: "pill",
  },
  avatar: {
    shape: "rounded",
    size: 96,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    glow: false,
    glowColor: "#ffffff",
    shadow: true,
    hoverAnimation: "scale",
  },
  background: {
    type: "solid",
    color: "#050505",
    gradient: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#0c0c0c", offset: 0 },
        { color: "#050505", offset: 100 },
      ],
    },
    pattern: "dots",
    blur: 0,
    opacity: 100,
    overlayColor: "#000000",
    overlayOpacity: 0,
  },
  typography: {
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    letterSpacing: 0,
    lineHeight: 1.5,
  },
  discordRpc: {
    style: "card",
    imageLayout: "left",
    borderRadius: 16,
    showTelemetryBadge: true,
    showTimer: true,
    customBorderColor: "#242424",
  },
  buttons: {
    variant: "solid-white",
    borderRadius: 14,
    hoverEffect: "lift",
    animation: "none",
  },
  socials: {
    style: "minimal",
    iconSize: 14,
    alignment: "center",
    spacing: 8,
  },
  effects: {
    glassmorphism: true,
    blur: 16,
    opacity: 90,
    particles: "None",
    scanlines: false,
    noise: false,
    tiltEffect: true,
    ambientGlow: false,
    glowColor: "#ffffff",
  },
  customCss: "",
  layers: [
    { id: "avatar", type: "avatar", label: "Profile Avatar", visible: true, locked: false },
    { id: "identity", type: "identity", label: "Name & Bio", visible: true, locked: false },
    { id: "rpc", type: "rpc", label: "Discord Rich Presence", visible: true, locked: false },
    { id: "music", type: "music", label: "Ambient Audio Player", visible: true, locked: false },
    { id: "buttons", type: "buttons", label: "Action Buttons", visible: true, locked: false },
    { id: "socials", type: "socials", label: "Social Links", visible: true, locked: false },
  ],
};
