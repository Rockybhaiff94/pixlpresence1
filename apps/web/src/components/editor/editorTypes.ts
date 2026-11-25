export type ElementType =
  | "shape"
  | "text"
  | "image"
  | "sticker"
  | "container"
  | "social"
  | "rpc"
  | "music";

export type EmbedComponentKind =
  | "profile-image"
  | "name"
  | "subtitle"
  | "description"
  | "rpc"
  | "music"
  | "social"
  | "custom-text";

export type ShapeKind =
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "star"
  | "polygon"
  | "line"
  | "arrow"
  | "badge";

export interface BaseElement {
  id: string;
  name: string;
  type: ElementType;
  parentId?: string | null; // Optional parent Embed container ID; x/y are local to parent when set
  embedRole?: EmbedComponentKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees 0-360
  opacity: number; // 0 to 1
  zIndex: number;
  locked: boolean;
  visible: boolean;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  glow?: {
    color: string;
    intensity: number;
  };
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeKind: ShapeKind;
  fill: string; // hex or gradient
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
  points?: number; // for star/polygon
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  letterSpacing: number; // in px
  lineHeight: number; // multiplier e.g. 1.2
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  underline?: boolean;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  fit: "cover" | "contain" | "fill";
  borderRadius?: number;
  filters?: {
    brightness: number; // 0-200%
    contrast: number; // 0-200%
    blur: number; // 0-20px
    grayscale: number; // 0-100%
  };
}

export interface StickerElement extends BaseElement {
  type: "sticker";
  stickerType: "icon" | "emoji" | "badge";
  key: string; // e.g. "discord", "github", "verified", "fire"
  color: string;
  backgroundColor?: string;
}

export interface ContainerElement extends BaseElement {
  type: "container";
  isProfileEmbed?: boolean;
  backgroundColor: string;
  backgroundOpacity?: number; // 0 to 1
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  gap?: number;
  glassmorphism?: boolean;
}

export interface SocialElement extends BaseElement {
  type: "social";
  platformId?: string;
  platformName?: string;
  handle?: string;
  url?: string;
  showHandle?: boolean;
  showPlatformName?: boolean;
  iconSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  variant?: "default" | "pill" | "minimal" | "circle";
  iconColorMode?: "original" | "custom" | "monochrome";
  iconColor?: string;
}

export interface RpcElement extends BaseElement {
  type: "rpc";
  cardStyle?: "card" | "glass" | "minimal" | "compact" | "neon";
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  activityType?: "playing" | "streaming" | "listening" | "watching" | "competing";
  appName?: string;
  details?: string;
  state?: string;
  largeImage?: string;
  smallImage?: string;
  useLiveRpc?: boolean;
  showLargeImage?: boolean;
  showSmallImage?: boolean;
  showDetails?: boolean;
  showState?: boolean;
}

export interface MusicElement extends BaseElement {
  type: "music";
  title: string;
  artist: string;
  albumArt?: string;
  statusText?: string;
  isPlaying?: boolean;
  progressPercent?: number;
  elapsedText?: string;
  durationText?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  showProgress?: boolean;
  showArtwork?: boolean;
}

export type EditorElement =
  | ShapeElement
  | TextElement
  | ImageElement
  | StickerElement
  | ContainerElement
  | SocialElement
  | RpcElement
  | MusicElement;

export interface CanvasDimensions {
  width: number;
  height: number;
}

export type BackgroundPattern = "none" | "dot-matrix" | "grid" | "crosshair" | "scanlines";

export interface CanvasBackground {
  type: "solid" | "gradient";
  color: string;
  gradientTo?: string;
  gradientAngle?: number;
  pattern: BackgroundPattern;
  patternOpacity?: number;
}

export interface EditorPreset {
  id: string;
  name: string;
  category: "banner" | "avatar" | "card" | "social";
  width: number;
  height: number;
  description: string;
  iconName?: string;
}

export interface EditorTemplate {
  id: string;
  name: string;
  category: string;
  presetId: string;
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
  elements: EditorElement[];
}

export interface EditorHistoryState {
  elements: EditorElement[];
  selectedId: string | null;
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
}
