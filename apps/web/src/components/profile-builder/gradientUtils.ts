import { BuilderGradientLayer, BuilderGradientStop } from "./profileBuilderTypes";
import { hexToRgbaSafe } from "./componentRegistry";

export function makeGradientUid(prefix = "grad"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

export function angleFromNormalizedVector(dx: number, dy: number, fallback = 135): number {
  if (Math.hypot(dx, dy) < 1e-4) return fallback;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360);
}

export function defaultDirectionPointsForAngle(angle: number): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} {
  const rad = ((angle || 0) * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);
  const half = 0.35;
  return {
    startX: Math.round((0.5 - ux * half) * 1000) / 1000,
    startY: Math.round((0.5 - uy * half) * 1000) / 1000,
    endX: Math.round((0.5 + ux * half) * 1000) / 1000,
    endY: Math.round((0.5 + uy * half) * 1000) / 1000,
  };
}

export function getGradientDirectionPoints(layer: BuilderGradientLayer): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} {
  if (
    typeof layer.startX === "number" &&
    typeof layer.startY === "number" &&
    typeof layer.endX === "number" &&
    typeof layer.endY === "number"
  ) {
    return {
      startX: layer.startX,
      startY: layer.startY,
      endX: layer.endX,
      endY: layer.endY,
    };
  }
  return defaultDirectionPointsForAngle(layer.angle ?? 135);
}

export function createDefaultGradientLayer(
  index: number,
  colorA = "#6366f1",
  colorB = "#ec4899",
  angle = 135,
  opacity = 1
): BuilderGradientLayer {
  const pts = defaultDirectionPointsForAngle(angle);
  return {
    id: makeGradientUid("grad"),
    name: `Gradient ${index + 1}`,
    type: "linear",
    stops: [
      { id: makeGradientUid("stop"), color: colorA, position: 0 },
      { id: makeGradientUid("stop"), color: colorB, position: 100 },
    ],
    midpoint: 50,
    opacity,
    angle,
    ...pts,
    visible: true,
    locked: false,
  };
}

export function normalizeGradientLayers(
  layers: BuilderGradientLayer[] | undefined,
  legacy?: {
    colorA?: string;
    colorB?: string;
    angle?: number;
    opacity?: number;
  }
): BuilderGradientLayer[] {
  if (Array.isArray(layers) && layers.length > 0) {
    return layers.map((layer, idx) => {
      const sortedStops =
        Array.isArray(layer.stops) && layer.stops.length >= 2
          ? [...layer.stops]
              .map((s) => ({
                id: s.id || makeGradientUid("stop"),
                color: s.color || "#ffffff",
                position: clampPct(typeof s.position === "number" ? s.position : 0),
              }))
              .sort((a, b) => a.position - b.position)
          : [
              { id: makeGradientUid("stop"), color: legacy?.colorA || "#6366f1", position: 0 },
              { id: makeGradientUid("stop"), color: legacy?.colorB || "#ec4899", position: 100 },
            ];
      const angle = typeof layer.angle === "number" && Number.isFinite(layer.angle) ? layer.angle : 135;
      const pts = getGradientDirectionPoints({ ...layer, angle, stops: sortedStops });
      return {
        ...layer,
        id: layer.id || makeGradientUid("grad"),
        name: layer.name || `Gradient ${idx + 1}`,
        type: "linear",
        stops: sortedStops,
        midpoint: typeof layer.midpoint === "number" ? Math.max(5, Math.min(95, layer.midpoint)) : 50,
        opacity: typeof layer.opacity === "number" ? Math.max(0, Math.min(1, layer.opacity)) : 1,
        angle,
        ...pts,
        visible: layer.visible !== false,
        locked: Boolean(layer.locked),
      };
    });
  }

  return [
    createDefaultGradientLayer(
      0,
      legacy?.colorA || "#6366f1",
      legacy?.colorB || "#ec4899",
      legacy?.angle ?? 135,
      legacy?.opacity ?? 1
    ),
  ];
}

function parseHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6 || clean.length === 8) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

function mixColors(colorA: string, colorB: string, t: number, opacity: number): string {
  const rgbA = parseHexToRgb(colorA);
  const rgbB = parseHexToRgb(colorB);
  if (!rgbA || !rgbB) return hexToRgbaSafe(t < 0.5 ? colorA : colorB, opacity);
  const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t);
  const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t);
  const b = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Expands stops with the layer's midpoint bias and projects endpoint vector (startX/Y -> endX/Y)
 * into CSS gradient percentage coordinates.
 */
function buildExpandedStops(layer: BuilderGradientLayer, baseOpacityMultiplier = 1): Array<{
  cssColor: string;
  pct: number;
  unitOffset: number;
}> {
  const stops: BuilderGradientStop[] =
    layer.stops && layer.stops.length >= 2
      ? [...layer.stops].sort((a, b) => a.position - b.position)
      : [
          { id: "a", color: "#6366f1", position: 0 },
          { id: "b", color: "#ec4899", position: 100 },
        ];

  const layerAlpha = Math.max(0, Math.min(1, (layer.opacity ?? 1) * baseOpacityMultiplier));
  const midpoint = Math.max(5, Math.min(95, layer.midpoint ?? 50));

  const expanded: Array<{ cssColor: string; unitOffset: number }> = [];
  for (let i = 0; i < stops.length; i++) {
    const cur = stops[i];
    const u = clampPct(cur.position) / 100;
    expanded.push({ cssColor: hexToRgbaSafe(cur.color, layerAlpha), unitOffset: u });

    if (i < stops.length - 1 && Math.abs(midpoint - 50) >= 0.5) {
      const next = stops[i + 1];
      const uNext = clampPct(next.position) / 100;
      if (uNext > u + 0.01) {
        const midU = u + (uNext - u) * (midpoint / 100);
        expanded.push({
          cssColor: mixColors(cur.color, next.color, 0.5, layerAlpha),
          unitOffset: midU,
        });
      }
    }
  }

  const pts = getGradientDirectionPoints(layer);
  const dx = pts.endX - pts.startX;
  const dy = pts.endY - pts.startY;
  const angle = Math.hypot(dx, dy) > 1e-4 ? angleFromNormalizedVector(dx, dy, layer.angle ?? 135) : layer.angle ?? 135;
  const rad = (angle * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);
  const cssLineLen = Math.max(0.001, Math.abs(ux) + Math.abs(uy));
  const tMin = -cssLineLen / 2;
  const t0 = (pts.startX - 0.5) * ux + (pts.startY - 0.5) * uy;
  const t1 = (pts.endX - 0.5) * ux + (pts.endY - 0.5) * uy;
  const p0 = ((t0 - tMin) / cssLineLen) * 100;
  const p1 = ((t1 - tMin) / cssLineLen) * 100;

  return expanded.map((item) => ({
    cssColor: item.cssColor,
    pct: Math.round((p0 + item.unitOffset * (p1 - p0)) * 100) / 100,
    unitOffset: item.unitOffset,
  }));
}

export function compileRampPreviewCss(layer: BuilderGradientLayer): string {
  const stops: BuilderGradientStop[] =
    layer.stops && layer.stops.length >= 2
      ? [...layer.stops].sort((a, b) => a.position - b.position)
      : [
          { id: "a", color: "#6366f1", position: 0 },
          { id: "b", color: "#ec4899", position: 100 },
        ];
  const midpoint = Math.max(5, Math.min(95, layer.midpoint ?? 50));
  const parts: string[] = [];
  for (let i = 0; i < stops.length; i++) {
    const cur = stops[i];
    const p = clampPct(cur.position);
    parts.push(`${cur.color} ${p}%`);
    if (i < stops.length - 1 && Math.abs(midpoint - 50) >= 0.5) {
      const next = stops[i + 1];
      const pNext = clampPct(next.position);
      if (pNext > p + 1) {
        const midPct = Math.round((p + (pNext - p) * (midpoint / 100)) * 10) / 10;
        parts.push(`${mixColors(cur.color, next.color, 0.5, 1)} ${midPct}%`);
      }
    }
  }
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function sampleGradientColorAt(
  stops: BuilderGradientStop[],
  position: number
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return "#ffffff";
  const target = clampPct(position);
  if (target <= sorted[0].position) return sorted[0].color;
  if (target >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (target >= a.position && target <= b.position) {
      const span = b.position - a.position;
      const t = span <= 0.001 ? 0 : (target - a.position) / span;
      const rgbA = parseHexToRgb(a.color);
      const rgbB = parseHexToRgb(b.color);
      if (!rgbA || !rgbB) return t < 0.5 ? a.color : b.color;
      const toHex = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(rgbA[0] + (rgbB[0] - rgbA[0]) * t)}${toHex(
        rgbA[1] + (rgbB[1] - rgbA[1]) * t
      )}${toHex(rgbA[2] + (rgbB[2] - rgbA[2]) * t)}`;
    }
  }
  return sorted[0].color;
}

export function compileSingleGradientCss(
  layer: BuilderGradientLayer,
  opacityMultiplier = 1
): string {
  const pts = getGradientDirectionPoints(layer);
  const dx = pts.endX - pts.startX;
  const dy = pts.endY - pts.startY;
  const angle = Math.hypot(dx, dy) > 1e-4 ? angleFromNormalizedVector(dx, dy, layer.angle ?? 135) : layer.angle ?? 135;
  const expanded = buildExpandedStops(layer, opacityMultiplier);
  const stopList = expanded.map((s) => `${s.cssColor} ${s.pct}%`).join(", ");
  return `linear-gradient(${angle}deg, ${stopList})`;
}

export function compileGradientLayersCss(
  layers: BuilderGradientLayer[] | undefined,
  legacy?: {
    colorA?: string;
    colorB?: string;
    angle?: number;
    opacity?: number;
  },
  opacityMultiplier = 1
): string | undefined {
  const normalized = normalizeGradientLayers(layers, legacy);
  const visible = normalized.filter((l) => l.visible !== false);
  if (visible.length === 0) return undefined;
  // CSS multiple background-images stack first-listed on top, so reverse order if layer[last] is top layer
  return [...visible]
    .reverse()
    .map((layer) => compileSingleGradientCss(layer, opacityMultiplier))
    .join(", ");
}

export function compileTextGradientStyle(
  layers: BuilderGradientLayer[] | undefined,
  fallbackColor = "#ffffff"
): Record<string, string | undefined> | null {
  if (!layers || layers.length === 0) return null;
  const css = compileGradientLayersCss(layers, { colorA: fallbackColor, colorB: "#a855f7", angle: 90, opacity: 1 });
  if (!css) return null;
  return {
    backgroundImage: css,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
}

export function drawGradientLayersOnCanvas(
  ctx: CanvasRenderingContext2D,
  layers: BuilderGradientLayer[] | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  legacy?: {
    colorA?: string;
    colorB?: string;
    angle?: number;
    opacity?: number;
  },
  opacityMultiplier = 1
): void {
  const normalized = normalizeGradientLayers(layers, legacy);
  const visible = normalized.filter((l) => l.visible !== false);
  for (const layer of visible) {
    const pts = getGradientDirectionPoints(layer);
    const x0 = x + pts.startX * width;
    const y0 = y + pts.startY * height;
    const x1 = x + pts.endX * width;
    const y1 = y + pts.endY * height;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const expanded = buildExpandedStops(layer, opacityMultiplier);
    for (const s of expanded) {
      grad.addColorStop(Math.max(0, Math.min(1, s.unitOffset)), s.cssColor);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);
  }
}
