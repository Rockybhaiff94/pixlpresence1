export type ElementType = "shape" | "text" | "image" | "sticker";

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

export type EditorElement = ShapeElement | TextElement | ImageElement | StickerElement;

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
