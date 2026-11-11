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
export type BackgroundAspectRatio = "full" | "16:9" | "9:16" | "1:1" | "4:3" | "custom";
export type BackgroundFitMode = "cover" | "contain" | "fill";
export type PatternType = "none" | "dots" | "grid" | "matrix" | "scanlines" | "noise";
export type ParticleEffect = "None" | "Snow" | "Stars" | "Fireflies" | "Rain" | "Matrix";
export type BadgeStyle = "pill" | "glyph" | "minimal" | "neon" | "hidden";
export type ButtonVariant = "solid-white" | "glass" | "neon" | "minimal" | "outline" | "gradient";
export type SocialIconStyle = "minimal" | "pill" | "glass" | "neon" | "circle";
export type RpcStyle = "card" | "glass" | "minimal" | "compact" | "neon";
export type RpcImageLayout = "left" | "right" | "stacked" | "hidden";
export type RpcImageSize = "small" | "medium" | "large";

export type CanvasElementType =
  | "embed"
  | "avatar"
  | "displayName"
  | "username"
  | "tagline"
  | "bio"
  | "title"
  | "subtitle"
  | "verificationBadge"
  | "customBadges"
  | "text"
  | "heading"
  | "description"
  | "authorText"
  | "footerText"
  | "timestamp"
  | "fieldName"
  | "fieldValue"
  | "customLabels"
  | "rpc"
  | "discordArtwork"
  | "discordActivity"
  | "discordGameTitle"
  | "discordActivityDesc"
  | "discordParty"
  | "discordTimestamps"
  | "image"
  | "thumbnail"
  | "mediaGallery"
  | "music"
  | "videoBackground"
  | "socials"
  | "socialIcon"
  | "linkedAccount"
  | "container"
  | "section"
  | "divider"
  | "column"
  | "row"
  | "button"
  | "actionRow"
  | "selectMenu"
  | "interactiveLink"
  | "shape"
  | "bottomIcon";

export interface CanvasTransform {
  x: number; // in px
  y: number;
  width: number; // in px
  height: number;
  rotation: number; // in deg (0-360)
  zIndex: number;
  isLocked?: boolean;
  lockType?: "none" | "position" | "size" | "full";
  aspectRatioLocked?: boolean;
}

export type EmbedScalingMode = "hybrid" | "proportional" | "adaptive";

export interface CanvasGridSettings {
  showGrid: boolean;
  gridSize: number; // 8, 10, 16, 20, 24, 32
  snapToGrid: boolean;
  smartGuides: boolean;
  snapSensitivity: number; // 2 to 16 px
  snapToElements: boolean;
}

export interface PrecisionKeySettings {
  modifierKey: "Alt" | "Control" | "Shift" | "Meta";
  enabled: boolean;
}

export const DEFAULT_GRID_SETTINGS: CanvasGridSettings = {
  showGrid: false,
  gridSize: 16,
  snapToGrid: true,
  smartGuides: true,
  snapSensitivity: 6,
  snapToElements: true,
};

export const DEFAULT_PRECISION_KEY_SETTINGS: PrecisionKeySettings = {
  modifierKey: "Alt",
  enabled: true,
};

export interface CanvasElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowDistance?: number;
  shadowEnabled?: boolean;
  lightingMode?: "none" | "ambient" | "directional" | "depth";
  blur?: number;
  backdropBlur?: number;
  gradientBorder?: string;
  animatedBorder?: boolean;
  glowEnabled?: boolean;
  glowColor?: string;
  glowIntensity?: number; // 0-100
  glowBlur?: number; // 0-60
  glowRadius?: number; // 0-40
  glowType?: "basic" | "animated" | "multi" | "gradient" | "pulsating";
  glowSpeed?: number; // in seconds
  padding?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: number;
  lineHeight?: number;
  wordSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  textStroke?: string;
  textOverflow?: "wrap" | "truncate" | "hidden" | "scroll";
  maxLines?: number;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;

  // Smart Typography Inheritance (Prompt 4)
  styleGroupId?: TextStyleGroupId;
  hasCustomTypographyOverride?: boolean;

  // Icon Customization (Free & Premium)
  iconColorMode?: "original" | "custom" | "theme";
  iconColor?: string;
  iconVariant?: "default" | "filled" | "outline" | "minimal" | "custom" | "glass" | "neon" | "pill" | "circle";
  customIconUrl?: string;

  // Gradients & Visual Presets (Premium)
  gradientEnabled?: boolean;
  gradientType?: "linear" | "radial" | "conic";
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; offset: number }>;
  gradientAnimated?: boolean;

  // Hover Effects & Animation Presets
  hoverEffect?: "none" | "opacity" | "glow" | "color" | "scale" | "lift" | "neon" | "pulse";
  hoverScale?: number;
  animationPreset?: "none" | "soft-neon" | "pulse-glow" | "ambient-glow" | "floating" | "smooth-highlight" | "gradient-flow" | "subtle-shine";
  effectPreset?: string;
}

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  name: string;
  parentEmbedId?: string | null;
  attachedToId?: string | null;
  transform: CanvasTransform;
  style?: CanvasElementStyle;
  props?: Record<string, any>;
  isLocked?: boolean;
  isVisible?: boolean;
  groupId?: string | null;
}

export interface CanvasEmbed {
  id: string;
  title: string;
  transform: CanvasTransform;
  style: CanvasElementStyle;
  childrenIds: string[];
  isLocked?: boolean;
  isVisible?: boolean;
  clipContent?: boolean;
}

export type TextStyleGroupId =
  | "profileName"
  | "heading"
  | "subheading"
  | "body"
  | "footer"
  | "metadata";

export interface TextStyleDefinition {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  shadowBlur?: number;
  shadowColor?: string;
  opacity?: number;
}

export type TextStyleGroups = Record<TextStyleGroupId, TextStyleDefinition>;

export const DEFAULT_TEXT_STYLE_GROUPS: TextStyleGroups = {
  profileName: {
    fontFamily: "Space Grotesk",
    fontSize: 26,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: -0.5,
    lineHeight: 1.2,
    textAlign: "center",
    textTransform: "none",
  },
  heading: {
    fontFamily: "Space Grotesk",
    fontSize: 20,
    fontWeight: 600,
    color: "#ffffff",
    letterSpacing: -0.2,
    lineHeight: 1.3,
    textAlign: "center",
    textTransform: "none",
  },
  subheading: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: 500,
    color: "#a3a3a3",
    letterSpacing: 0.5,
    lineHeight: 1.4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  body: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: 400,
    color: "#d4d4d8",
    letterSpacing: 0,
    lineHeight: 1.6,
    textAlign: "left",
    textTransform: "none",
  },
  footer: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: 400,
    color: "#737373",
    letterSpacing: 0.2,
    lineHeight: 1.4,
    textAlign: "center",
    textTransform: "none",
  },
  metadata: {
    fontFamily: "JetBrains Mono",
    fontSize: 12,
    fontWeight: 500,
    color: "#a1a1aa",
    letterSpacing: 0.5,
    lineHeight: 1.3,
    textAlign: "left",
    textTransform: "none",
  },
};

export interface CanvasEngineState {
  embeds: CanvasEmbed[];
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  activeEmbedId?: string | null;
  scalingMode?: EmbedScalingMode;
  gridSettings?: CanvasGridSettings;
  precisionKey?: PrecisionKeySettings;
  textStyleGroups?: TextStyleGroups;
}

export type StudioTab =
  | "layout"
  | "identity"
  | "avatar"
  | "background"
  | "typography"
  | "rpc"
  | "buttons"
  | "effects"
  | "css"
  | "advanced";

export interface StudioLayer {
  id: string;
  type: "background" | "container" | "avatar" | "username" | "bio" | "rpc" | "music" | "socials" | "buttons" | "custom" | "badges" | "identity";
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
    bioSize?: number;
    badgeStyle: BadgeStyle;
    alignment?: "left" | "center" | "right";
  };
  avatar: {
    shape: AvatarShape;
    size: number; // in px: 64 to 160
    alignment?: "left" | "center" | "right";
    objectFit?: "cover" | "contain" | "fill";
    offsetY?: number;
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
    position?: string;
    repeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
    size?: "cover" | "contain" | "auto";
    aspectRatio?: BackgroundAspectRatio;
    customAspectRatio?: number;
    fitMode?: BackgroundFitMode;
    zoom?: number; // 50 to 300
    offsetX?: number; // pan in px or %
    offsetY?: number; // pan in px or %
    rotation?: number; // 0 to 360 deg
    focalPoint?: { x: number; y: number }; // 0-100%
    crop?: { x: number; y: number; width: number; height: number };
    isAnimatedGif?: boolean;
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
    imageSize?: RpcImageSize;
    borderRadius: number;
    showTelemetryBadge: boolean;
    showTimer: boolean;
    showProfileRpc?: boolean; // Independent control: visible on website profile
    enableDiscordRpc?: boolean; // Independent control: published to Discord via PixelsRPC
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
  advanced?: {
    soundEffects?: boolean;
    customCursor?: boolean;
    watermark?: boolean;
    wireframeMode?: boolean;
    embedScaling?: EmbedScalingMode;
    precisionModifier?: "Alt" | "Control" | "Shift" | "Meta";
    precisionModifierEnabled?: boolean;
    gridSettings?: CanvasGridSettings;
  };
  customCss?: string;
  layers: StudioLayer[];
  canvas?: CanvasEngineState;
}

export type WorkspaceTransparencyMode = "solid" | "transparent" | "glass" | "floating";

export interface StudioWorkspacePrefs {
  previewWidthPct: number; // 20 to 70 percentage
  isPreviewVisible: boolean;
  isEditorVisible: boolean;
  transparencyMode: WorkspaceTransparencyMode;
  panelOpacity: number; // 20 to 100
  panelBlur: number; // 0 to 32 (in px)
  panelBorderOpacity: number; // 10 to 100
  deviceMode: "desktop" | "tablet" | "mobile";
  zoom: number; // 50 to 150
}

export const DEFAULT_WORKSPACE_PREFS: StudioWorkspacePrefs = {
  previewWidthPct: 40,
  isPreviewVisible: true,
  isEditorVisible: true,
  transparencyMode: "solid",
  panelOpacity: 85,
  panelBlur: 12,
  panelBorderOpacity: 30,
  deviceMode: "desktop",
  zoom: 100,
};

export function createDefaultCanvasState(cfg?: Partial<ProfileDesignConfig>): CanvasEngineState {
  const primaryEmbedId = "embed_primary";
  const maxWidth = cfg?.layout?.maxWidth || 580;

  const embeds: CanvasEmbed[] = [
    {
      id: primaryEmbedId,
      title: "Primary Profile Embed",
      transform: {
        x: 0,
        y: 0,
        width: maxWidth,
        height: 640,
        rotation: 0,
        zIndex: 1,
      },
      style: {
        backgroundColor: "rgba(10, 10, 14, 0.85)",
        borderColor: "#26262b",
        borderWidth: 1,
        borderRadius: 24,
        opacity: 90,
        shadowBlur: 30,
        shadowColor: "rgba(0,0,0,0.6)",
        blur: 16,
        backdropBlur: 16,
        padding: 28,
      },
      childrenIds: ["avatar_1", "username_1", "tagline_1", "bio_1", "rpc_1", "buttons_1", "socials_1"],
      isLocked: false,
      isVisible: true,
      clipContent: false,
    },
  ];

  const elements: CanvasElement[] = [
    {
      id: "avatar_1",
      type: "avatar",
      name: "User Avatar",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 0, width: cfg?.avatar?.size || 96, height: cfg?.avatar?.size || 96, rotation: 0, zIndex: 2 },
      isLocked: false,
      isVisible: true,
    },
    {
      id: "username_1",
      type: "username",
      name: "Username Display",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 110, width: maxWidth - 60, height: 36, rotation: 0, zIndex: 2 },
      style: {
        color: cfg?.identity?.titleColor || "#ffffff",
        fontSize: cfg?.identity?.titleSize || 26,
        fontWeight: cfg?.identity?.titleWeight || 700,
        fontFamily: cfg?.identity?.titleFont || "Space Grotesk",
        textAlign: "center",
        styleGroupId: "profileName",
        hasCustomTypographyOverride: false,
      },
      isLocked: false,
      isVisible: true,
    },
    {
      id: "tagline_1",
      type: "tagline",
      name: "Custom Tagline",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 152, width: maxWidth - 60, height: 24, rotation: 0, zIndex: 2 },
      style: {
        color: "#a3a3a3",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "Inter",
        textAlign: "center",
        styleGroupId: "subheading",
        hasCustomTypographyOverride: false,
      },
      props: { text: "Digital Identity // Nothing OS" },
      isLocked: false,
      isVisible: true,
    },
    {
      id: "bio_1",
      type: "bio",
      name: "User Biography",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 185, width: maxWidth - 60, height: 48, rotation: 0, zIndex: 2 },
      style: {
        color: cfg?.identity?.bioColor || "#a3a3a3",
        fontSize: cfg?.identity?.bioSize || 14,
        fontFamily: cfg?.identity?.bioFont || "Inter",
        textAlign: "center",
        styleGroupId: "body",
        hasCustomTypographyOverride: false,
      },
      isLocked: false,
      isVisible: true,
    },
    {
      id: "rpc_1",
      type: "rpc",
      name: "Discord Rich Presence",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 250, width: maxWidth - 60, height: 110, rotation: 0, zIndex: 3 },
      isLocked: false,
      isVisible: cfg?.discordRpc?.showProfileRpc !== false,
    },
    {
      id: "buttons_1",
      type: "button",
      name: "Profile Action Buttons",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 380, width: maxWidth - 60, height: 120, rotation: 0, zIndex: 3 },
      isLocked: false,
      isVisible: true,
    },
    {
      id: "socials_1",
      type: "socials",
      name: "Social Links Bar",
      parentEmbedId: primaryEmbedId,
      transform: { x: 0, y: 520, width: maxWidth - 60, height: 44, rotation: 0, zIndex: 3 },
      isLocked: false,
      isVisible: true,
    },
  ];

  return {
    embeds,
    elements,
    selectedId: null,
    selectedIds: [],
    textStyleGroups: { ...DEFAULT_TEXT_STYLE_GROUPS },
  };
}

/**
 * Creates an empty modular embed canvas state for building from scratch.
 * Starts with an empty embed container with zero elements.
 */
export function createEmptyCanvasState(cfg?: Partial<ProfileDesignConfig>): CanvasEngineState {
  const primaryEmbedId = "embed_primary";
  const maxWidth = cfg?.layout?.maxWidth || 580;

  return {
    embeds: [
      {
        id: primaryEmbedId,
        title: "Modular Profile Embed",
        transform: {
          x: 0,
          y: 0,
          width: maxWidth,
          height: 320,
          rotation: 0,
          zIndex: 1,
        },
        style: {
          backgroundColor: "rgba(14, 14, 18, 0.85)",
          borderColor: "#26262b",
          borderWidth: 1,
          borderRadius: 24,
          opacity: 90,
          shadowBlur: 20,
          shadowColor: "rgba(0,0,0,0.5)",
          blur: 12,
          backdropBlur: 12,
          padding: 28,
        },
        childrenIds: [],
        isVisible: true,
        isLocked: false,
      },
    ],
    elements: [],
    selectedId: null,
    selectedIds: [],
    textStyleGroups: { ...DEFAULT_TEXT_STYLE_GROUPS },
  };
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
    bioSize: 14,
    badgeStyle: "pill",
    alignment: "center",
  },
  avatar: {
    shape: "rounded",
    size: 96,
    alignment: "center",
    objectFit: "cover",
    offsetY: 0,
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
    position: "center",
    repeat: "no-repeat",
    size: "cover",
    aspectRatio: "full",
    fitMode: "cover",
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    focalPoint: { x: 50, y: 50 },
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
    imageSize: "medium",
    borderRadius: 16,
    showTelemetryBadge: true,
    showTimer: true,
    showProfileRpc: true,
    enableDiscordRpc: true,
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
  advanced: {
    soundEffects: false,
    customCursor: false,
    watermark: true,
    wireframeMode: false,
    embedScaling: "hybrid",
    precisionModifier: "Alt",
    precisionModifierEnabled: true,
    gridSettings: DEFAULT_GRID_SETTINGS,
  },
  customCss: "",
  layers: [
    { id: "background", type: "background", label: "Background", visible: true, locked: false },
    { id: "container", type: "container", label: "Main Container", visible: true, locked: false },
    { id: "avatar", type: "avatar", label: "Profile Avatar", visible: true, locked: false },
    { id: "username", type: "username", label: "Username & Display Name", visible: true, locked: false },
    { id: "bio", type: "bio", label: "Biography", visible: true, locked: false },
    { id: "rpc", type: "rpc", label: "Discord Rich Presence", visible: true, locked: false },
    { id: "music", type: "music", label: "Music Player", visible: true, locked: false },
    { id: "socials", type: "socials", label: "Social Icons", visible: true, locked: false },
    { id: "buttons", type: "buttons", label: "Action Buttons", visible: true, locked: false },
    { id: "badges", type: "badges", label: "Custom Elements / Badges", visible: true, locked: false },
  ],
};

export type DiscordRpcConfig = ProfileDesignConfig["discordRpc"];


