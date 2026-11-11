import { CanvasTransform, CanvasGridSettings } from "@/types/studio";

export interface GuideLine {
  type: "x" | "y";
  position: number;
  label?: string;
  isCenter?: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: GuideLine[];
  snappedX: boolean;
  snappedY: boolean;
}

/**
 * Calculates smart guide snapping for an object moving or resizing against siblings and container bounds.
 */
export function calculateSmartSnap(
  current: CanvasTransform,
  siblings: CanvasTransform[],
  containerBounds?: { width: number; height: number },
  gridSettings?: CanvasGridSettings
): SnapResult {
  const settings = gridSettings || {
    showGrid: false,
    gridSize: 16,
    snapToGrid: true,
    smartGuides: true,
    snapSensitivity: 6,
    snapToElements: true,
  };

  let snappedX = current.x;
  let snappedY = current.y;
  let hasSnappedX = false;
  let hasSnappedY = false;
  const guides: GuideLine[] = [];

  const threshold = settings.snapSensitivity || 6;

  // 1. Smart element-to-element & element-to-container guides
  if (settings.smartGuides) {
    const currentLeft = current.x;
    const currentRight = current.x + current.width;
    const currentCenterX = current.x + current.width / 2;

    const currentTop = current.y;
    const currentBottom = current.y + current.height;
    const currentCenterY = current.y + current.height / 2;

    // Target positions to match against
    const targetXLines: { pos: number; label: string; isCenter: boolean }[] = [];
    const targetYLines: { pos: number; label: string; isCenter: boolean }[] = [];

    // Container center & edges
    if (containerBounds) {
      targetXLines.push({ pos: 0, label: "Left Edge", isCenter: false });
      targetXLines.push({ pos: containerBounds.width / 2, label: "Center", isCenter: true });
      targetXLines.push({ pos: containerBounds.width, label: "Right Edge", isCenter: false });

      targetYLines.push({ pos: 0, label: "Top Edge", isCenter: false });
      targetYLines.push({ pos: containerBounds.height / 2, label: "Center", isCenter: true });
      targetYLines.push({ pos: containerBounds.height, label: "Bottom Edge", isCenter: false });
    }

    // Sibling edges and centers
    if (settings.snapToElements) {
      for (const sib of siblings) {
        targetXLines.push({ pos: sib.x, label: "Left", isCenter: false });
        targetXLines.push({ pos: sib.x + sib.width / 2, label: "Center", isCenter: true });
        targetXLines.push({ pos: sib.x + sib.width, label: "Right", isCenter: false });

        targetYLines.push({ pos: sib.y, label: "Top", isCenter: false });
        targetYLines.push({ pos: sib.y + sib.height / 2, label: "Center", isCenter: true });
        targetYLines.push({ pos: sib.y + sib.height, label: "Bottom", isCenter: false });
      }
    }

    // Check X snap candidates: Center, Left, Right
    for (const target of targetXLines) {
      if (!hasSnappedX) {
        // Center alignment
        if (Math.abs(currentCenterX - target.pos) <= threshold) {
          snappedX = target.pos - current.width / 2;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
        // Left alignment
        else if (Math.abs(currentLeft - target.pos) <= threshold) {
          snappedX = target.pos;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
        // Right alignment
        else if (Math.abs(currentRight - target.pos) <= threshold) {
          snappedX = target.pos - current.width;
          hasSnappedX = true;
          guides.push({ type: "x", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
      }
    }

    // Check Y snap candidates: Center, Top, Bottom
    for (const target of targetYLines) {
      if (!hasSnappedY) {
        // Center alignment
        if (Math.abs(currentCenterY - target.pos) <= threshold) {
          snappedY = target.pos - current.height / 2;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
        // Top alignment
        else if (Math.abs(currentTop - target.pos) <= threshold) {
          snappedY = target.pos;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
        // Bottom alignment
        else if (Math.abs(currentBottom - target.pos) <= threshold) {
          snappedY = target.pos - current.height;
          hasSnappedY = true;
          guides.push({ type: "y", position: target.pos, label: target.label, isCenter: target.isCenter });
        }
      }
    }
  }

  // 2. Grid snap fallback if not snapped to an element
  if (settings.snapToGrid) {
    const gridSize = Math.max(4, settings.gridSize || 16);
    if (!hasSnappedX) {
      const remainderX = snappedX % gridSize;
      if (Math.abs(remainderX) <= threshold) {
        snappedX = Math.round(snappedX / gridSize) * gridSize;
        hasSnappedX = true;
      }
    }
    if (!hasSnappedY) {
      const remainderY = snappedY % gridSize;
      if (Math.abs(remainderY) <= threshold) {
        snappedY = Math.round(snappedY / gridSize) * gridSize;
        hasSnappedY = true;
      }
    }
  }

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY),
    guides,
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
  };
}

/**
 * Distributes elements horizontally with equal spacing between them.
 */
export function distributeEquallyHorizontal(transforms: CanvasTransform[]): CanvasTransform[] {
  if (transforms.length <= 2) return transforms;

  const sorted = [...transforms].sort((a, b) => a.x - b.x);
  const totalWidth = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x;
  const elementsWidth = sorted.reduce((sum, item) => sum + item.width, 0);
  const gapsCount = sorted.length - 1;
  const equalSpacing = Math.max(0, (totalWidth - elementsWidth) / gapsCount);

  let currentX = sorted[0].x;
  return sorted.map((item, idx) => {
    if (idx === 0) {
      currentX += item.width + equalSpacing;
      return item;
    }
    const updated = { ...item, x: Math.round(currentX) };
    currentX += item.width + equalSpacing;
    return updated;
  });
}

