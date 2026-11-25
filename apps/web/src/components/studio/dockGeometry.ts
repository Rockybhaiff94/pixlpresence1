export type DockEdgeOrFloat = "left" | "right" | "top" | "bottom" | "float";

export type DockCornerAttachment =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "none";

export interface DockRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DockContainerSize {
  width: number;
  height: number;
}

export interface AdaptiveDockPlacementInfo {
  corner: DockCornerAttachment;
  flushLeft: boolean;
  flushRight: boolean;
  flushTop: boolean;
  flushBottom: boolean;
}

export const CORNER_SNAP_THRESHOLD = 48;
const EDGE_EPSILON = 2;

export function clampAlongEdge(ratio: number, maxSpan: number): number {
  if (maxSpan <= 0) return 0;
  return Math.max(0, Math.min(maxSpan, ratio * maxSpan));
}

export function resolveDockPlacementInfo(
  rect: DockRectLike,
  containerSize: DockContainerSize,
  edge: DockEdgeOrFloat,
  isDragging: boolean
): AdaptiveDockPlacementInfo {
  if (isDragging || edge === "float") {
    return {
      corner: "none",
      flushLeft: false,
      flushRight: false,
      flushTop: false,
      flushBottom: false,
    };
  }

  const flushLeft = rect.left <= EDGE_EPSILON;
  const flushRight = containerSize.width - (rect.left + rect.width) <= EDGE_EPSILON;
  const flushTop = rect.top <= EDGE_EPSILON;
  const flushBottom = containerSize.height - (rect.top + rect.height) <= EDGE_EPSILON;

  let corner: DockCornerAttachment = "none";
  if (flushTop && flushLeft) corner = "top-left";
  else if (flushTop && flushRight) corner = "top-right";
  else if (flushBottom && flushLeft) corner = "bottom-left";
  else if (flushBottom && flushRight) corner = "bottom-right";

  return {
    corner,
    flushLeft,
    flushRight,
    flushTop,
    flushBottom,
  };
}

export function getAdaptiveDockCornerRadii(
  info: AdaptiveDockPlacementInfo,
  radius: number
): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
} {
  // Corner attachments: only the outer corner meeting two viewport edges is square; exposed corners stay rounded
  switch (info.corner) {
    case "top-left":
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: radius,
        borderBottomRightRadius: radius,
        borderBottomLeftRadius: radius,
      };
    case "top-right":
      return {
        borderTopLeftRadius: radius,
        borderTopRightRadius: 0,
        borderBottomRightRadius: radius,
        borderBottomLeftRadius: radius,
      };
    case "bottom-left":
      return {
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        borderBottomRightRadius: radius,
        borderBottomLeftRadius: 0,
      };
    case "bottom-right":
      return {
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: radius,
      };
    default:
      break;
  }

  // Single-edge attachments: flush edge corners are square, exposed workspace corners stay rounded
  if (info.flushTop) {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomRightRadius: radius,
      borderBottomLeftRadius: radius,
    };
  }
  if (info.flushBottom) {
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomRightRadius: 0,
      borderBottomLeftRadius: 0,
    };
  }
  if (info.flushLeft) {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
      borderBottomLeftRadius: 0,
    };
  }
  if (info.flushRight) {
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomLeftRadius: radius,
    };
  }

  return {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    borderBottomRightRadius: radius,
    borderBottomLeftRadius: radius,
  };
}

export function getAdaptiveDockBorderClasses(
  info: AdaptiveDockPlacementInfo,
  isDragging: boolean
): string {
  if (isDragging || info.corner !== "none") {
    return "border border-white/15";
  }
  if (info.flushBottom) return "border border-white/15 border-b-0";
  if (info.flushTop) return "border border-white/15 border-t-0";
  if (info.flushLeft) return "border border-white/15 border-l-0";
  if (info.flushRight) return "border border-white/15 border-r-0";
  return "border border-white/15";
}

export function snapRatiosToCornerIfNear(
  curLeft: number,
  curTop: number,
  boxW: number,
  boxH: number,
  containerW: number,
  containerH: number,
  attachedEdge: "left" | "right" | "top" | "bottom" | "float"
): { ratioX: number; ratioY: number } {
  const maxAvailX = Math.max(0, containerW - boxW);
  const maxAvailY = Math.max(0, containerH - boxH);

  let ratioX = maxAvailX > 0 ? Math.max(0, Math.min(1, curLeft / maxAvailX)) : 0.5;
  let ratioY = maxAvailY > 0 ? Math.max(0, Math.min(1, curTop / maxAvailY)) : 0.5;

  if (attachedEdge === "top") ratioY = 0;
  else if (attachedEdge === "bottom") ratioY = 1;
  else if (attachedEdge === "left") ratioX = 0;
  else if (attachedEdge === "right") ratioX = 1;

  if (attachedEdge === "top" || attachedEdge === "bottom") {
    if (curLeft <= CORNER_SNAP_THRESHOLD) {
      ratioX = 0;
    } else if (maxAvailX - curLeft <= CORNER_SNAP_THRESHOLD) {
      ratioX = 1;
    } else if (maxAvailX > CORNER_SNAP_THRESHOLD * 2) {
      // Keep non-corner releases comfortably inside the center band so corner state doesn't trigger accidentally
      const minBand = (EDGE_EPSILON + 4) / maxAvailX;
      ratioX = Math.max(minBand, Math.min(1 - minBand, ratioX));
    }
  } else if (attachedEdge === "left" || attachedEdge === "right") {
    if (curTop <= CORNER_SNAP_THRESHOLD) {
      ratioY = 0;
    } else if (maxAvailY - curTop <= CORNER_SNAP_THRESHOLD) {
      ratioY = 1;
    } else if (maxAvailY > CORNER_SNAP_THRESHOLD * 2) {
      const minBand = (EDGE_EPSILON + 4) / maxAvailY;
      ratioY = Math.max(minBand, Math.min(1 - minBand, ratioY));
    }
  }

  return { ratioX, ratioY };
}
