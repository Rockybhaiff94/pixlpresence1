export type BuilderDeviceMode = "desktop" | "tablet" | "mobile";

export type BuilderSaveStatus =
  | "ready"
  | "saving"
  | "saved"
  | "unsaved"
  | "publishing"
  | "error"
  | "offline";

export type BuilderComponentType =
  | "embed"
  | "nested-embed"
  | "banner-image"
  | "profile-image"
  | "name-text"
  | "subtitle"
  | "badges-group"
  | "description"
  | "separator"
  | "music-display"
  | "custom-rpc"
  | "social-group"
  | "image-gallery"
  | "image"
  | "group-section"
  | "background"
  | "custom-component"
  | "shape"
  | "sticker";

export type BuilderLayoutMode = "absolute" | "flex-col" | "flex-row" | "grid";

export interface BuilderStyle {
  backgroundType?: "solid" | "gradient" | "image" | "transparent";
  backgroundColor?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
  backgroundOpacity?: number; // 0-1
  opacity?: number; // 0-1
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderRadius?: number;
  blur?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  padding?: number;
  gap?: number;
  layoutMode?: BuilderLayoutMode;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between";
  overflow?: "visible" | "hidden" | "auto";
}

export interface BuilderResponsiveRule {
  hiddenOn?: BuilderDeviceMode[];
  widthMode?: "fixed" | "percent" | "auto";
  percentWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  mobileStack?: boolean;
  galleryColumns?: {
    desktop?: number;
    tablet?: number;
    mobile?: number;
  };
  fontSizeOverride?: {
    tablet?: number;
    mobile?: number;
  };
  paddingOverride?: {
    tablet?: number;
    mobile?: number;
  };
}

export interface ProfileBadgeItem {
  id: string;
  label: string;
  icon: "creator" | "premium" | "dev" | "verified" | "shield" | "crown" | "flame" | "sparkles";
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  tooltip: string;
  visible: boolean;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
  label?: string;
  tooltip?: string;
  visible: boolean;
  style?: "pill" | "circle" | "minimal";
  iconColor?: string;
}

export interface BuilderComponentConfig {
  // Banner / Profile Image / Image
  src?: string;
  fit?: "cover" | "contain" | "fill";
  objectPosition?: string;
  avatarShape?: "circle" | "rounded" | "square";
  showStatusDot?: boolean;
  statusColor?: string;

  // Text-based components (Name, Subtitle, Description)
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  showVerifiedBadge?: boolean;
  statusPillText?: string;
  statusPillActive?: boolean;
  maxWidth?: number;
  overflowBehavior?: "wrap" | "ellipsis" | "clip";

  // Badges Group
  badges?: ProfileBadgeItem[];

  // Music Display
  musicPlatform?: "Spotify" | "Apple Music" | "SoundCloud" | "Custom";
  trackName?: string;
  artist?: string;
  artworkUrl?: string;
  progressPercent?: number;
  elapsedText?: string;
  durationText?: string;
  isPlaying?: boolean;
  useLiveActivity?: boolean;
  musicEmptyText?: string;

  // Custom RPC
  appIcon?: string;
  appName?: string;
  details?: string;
  state?: string;
  statusIndicator?: "online" | "idle" | "dnd" | "offline";
  largeImage?: string;
  startTimestampText?: string;
  useLiveRpc?: boolean;
  rpcEmptyText?: string;
  accentColor?: string;

  // Social Media Group
  socialItems?: SocialLinkItem[];

  // Image Gallery
  galleryColumns?: number;
  gallerySpacing?: number;
  galleryImageFit?: "cover" | "contain";
  galleryImageRadius?: number;
  galleryMaxImages?: number;

  // Separator
  separatorThickness?: number;
  separatorColor?: string;
  separatorStyle?: "solid" | "dashed" | "dotted";

  // Background layer node
  bgType?: "image" | "gif" | "video" | "solid" | "gradient";
  bgColor?: string;
  bgGradientTo?: string;
  bgGradientAngle?: number;
  bgImageUrl?: string;
  bgVideoUrl?: string;
  bgPosition?: string;
  bgSize?: "cover" | "contain" | "auto";
  bgOverlayOpacity?: number;

  // Custom Component / Shape / Sticker
  customTitle?: string;
  customSubtitle?: string;
  customBadge?: string;
  shapeKind?: "rectangle" | "rounded-rectangle" | "circle" | "triangle" | "star" | "line" | "arrow";
  shapeFill?: string;
  shapeStroke?: string;
  shapeStrokeWidth?: number;
  stickerKey?: string;
}

export interface BuilderNode {
  id: string;
  type: BuilderComponentType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  aspectRatioLocked?: boolean;
  style: BuilderStyle;
  responsive: BuilderResponsiveRule;
  config: BuilderComponentConfig;
}

export interface BuilderCanvasSettings {
  width: number;
  height: number;
  backgroundType: "solid" | "gradient" | "image" | "gif" | "video";
  backgroundColor: string;
  backgroundGradientTo: string;
  backgroundGradientAngle: number;
  backgroundImage: string;
  backgroundVideo: string;
  backgroundPosition: string;
  backgroundSize: "cover" | "contain" | "auto";
  backgroundOpacity: number; // 0-1
  backgroundBlur: number; // 0-30
  overlayColor: string;
  overlayOpacity: number; // 0-1
  gridEnabled: boolean;
  gridSize: number;
  snapEnabled: boolean;
  snapSensitivity: number;
  smartGuidesEnabled: boolean;
}

export interface BuilderPreferences {
  showGrid: boolean;
  snapEnabled: boolean;
  snapToGrid: boolean;
  snapToElements: boolean;
  smartGuides: boolean;
  defaultInsertTarget: "selected-container" | "primary-embed" | "canvas";
  showComponentOutlines: boolean;
  autoSaveEnabled: boolean;
  autoSaveDelaySec: number;
}

export interface ProfileBuilderDocument {
  version: "2.0";
  id: string;
  title: string;
  canvas: BuilderCanvasSettings;
  nodes: BuilderNode[];
  preferences: BuilderPreferences;
  metadata: {
    updatedAt: string;
    lastPublishedAt?: string;
  };
}

export interface BuilderHistorySnapshot {
  canvas: BuilderCanvasSettings;
  nodes: BuilderNode[];
  selectedId: string | null;
}
