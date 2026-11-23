"use client";

import {
  EditorElement,
  CanvasBackground,
  TextElement,
  ShapeElement,
  ImageElement,
  StickerElement,
} from "./editorTypes";

export interface AutoFixIssue {
  id: string;
  elementId?: string;
  elementName?: string;
  category: "bounds" | "dimension" | "typography" | "style" | "hierarchy" | "background";
  severity: "warning" | "error" | "info";
  description: string;
  appliedFix: string;
}

export interface CanvasState {
  width: number;
  height: number;
  background: CanvasBackground;
}

export interface AutoFixResult {
  hasIssues: boolean;
  issues: AutoFixIssue[];
  fixedElements: EditorElement[];
  fixedCanvas: CanvasState;
}

/**
 * Audit and identify layout, boundary, and configuration issues
 * without modifying user elements.
 */
export function inspectCanvasIssues(
  elements: EditorElement[],
  canvas: CanvasState
): AutoFixIssue[] {
  const issues: AutoFixIssue[] = [];

  // 1. Audit Canvas Background
  if (!canvas.background || !canvas.background.color || !canvas.background.color.trim()) {
    issues.push({
      id: "bg-color-missing",
      category: "background",
      severity: "warning",
      description: "Canvas background color is undefined or empty.",
      appliedFix: "Restore standard dark background (#08080a).",
    });
  }

  // 2. Audit Elements
  elements.forEach((el, index) => {
    const name = el.name || `Layer ${index + 1}`;

    // Dimensions Audit
    if (el.width <= 0 || isNaN(el.width) || el.height <= 0 || isNaN(el.height)) {
      issues.push({
        id: `dim-${el.id}`,
        elementId: el.id,
        elementName: name,
        category: "dimension",
        severity: "error",
        description: `Element "${name}" has zero or invalid dimensions (${el.width}×${el.height}).`,
        appliedFix: "Reset to minimum visible dimensions (32×32px).",
      });
    }

    // Out-of-bounds Audit
    const isOutOfBounds =
      el.x + el.width < 10 ||
      el.y + el.height < 10 ||
      el.x > canvas.width - 10 ||
      el.y > canvas.height - 10;

    if (isOutOfBounds) {
      issues.push({
        id: `bounds-${el.id}`,
        elementId: el.id,
        elementName: name,
        category: "bounds",
        severity: "warning",
        description: `Element "${name}" is located outside the active canvas boundary (x: ${Math.round(el.x)}, y: ${Math.round(el.y)}).`,
        appliedFix: "Snap and reposition element safely within canvas artboard.",
      });
    }

    // Invisibility / Opacity Audit
    if (el.opacity <= 0 || isNaN(el.opacity)) {
      issues.push({
        id: `opacity-${el.id}`,
        elementId: el.id,
        elementName: name,
        category: "style",
        severity: "warning",
        description: `Element "${name}" has 0% opacity, rendering it completely invisible and unclickable.`,
        appliedFix: "Restore visible opacity to 100%.",
      });
    }

    // Z-Index / Stacking Hierarchy Audit
    if (isNaN(el.zIndex) || el.zIndex < 0) {
      issues.push({
        id: `zindex-${el.id}`,
        elementId: el.id,
        elementName: name,
        category: "hierarchy",
        severity: "info",
        description: `Element "${name}" has an invalid z-index layer value (${el.zIndex}).`,
        appliedFix: `Re-sequence layer index to position ${index + 1}.`,
      });
    }

    // Typography Audit for Text Elements
    if (el.type === "text") {
      const textEl = el as TextElement;
      if (textEl.fontSize < 8 || isNaN(textEl.fontSize)) {
        issues.push({
          id: `font-size-small-${el.id}`,
          elementId: el.id,
          elementName: name,
          category: "typography",
          severity: "warning",
          description: `Text layer "${name}" font size is unreadable (${textEl.fontSize}px).`,
          appliedFix: "Increase to minimum legible font size (12px).",
        });
      } else if (textEl.fontSize > 180) {
        issues.push({
          id: `font-size-large-${el.id}`,
          elementId: el.id,
          elementName: name,
          category: "typography",
          severity: "info",
          description: `Text layer "${name}" font size exceeds layout threshold (${textEl.fontSize}px).`,
          appliedFix: "Clamp font size to maximum proportional limit (120px).",
        });
      }

      if (!textEl.text || textEl.text.trim() === "") {
        issues.push({
          id: `empty-text-${el.id}`,
          elementId: el.id,
          elementName: name,
          category: "typography",
          severity: "warning",
          description: `Text layer "${name}" contains empty text string.`,
          appliedFix: 'Populate with default placeholder text "Sample Text".',
        });
      }
    }

    // Identical Overlapping Position Check (Collision detection)
    elements.forEach((otherEl, otherIdx) => {
      if (otherIdx > index && el.x === otherEl.x && el.y === otherEl.y && el.width === otherEl.width) {
        issues.push({
          id: `overlap-${el.id}-${otherEl.id}`,
          elementId: otherEl.id,
          elementName: otherEl.name || `Layer ${otherIdx + 1}`,
          category: "hierarchy",
          severity: "info",
          description: `Layer "${otherEl.name}" exactly overlaps layer "${el.name}" at identical coordinates.`,
          appliedFix: "Apply a gentle 16px diagonal stagger offset to reveal both layers.",
        });
      }
    });
  });

  return issues;
}

/**
 * Execute Auto Fix safely with strict non-destructive constraints:
 * 1. Never delete user content.
 * 2. Never remove existing layers.
 * 3. Never overwrite user assets.
 * 4. Never change canvas dimensions unexpectedly.
 * 5. Allow users to immediately undo with pushHistory.
 */
export function executeAutoFix(
  elements: EditorElement[],
  canvas: CanvasState
): AutoFixResult {
  const issues = inspectCanvasIssues(elements, canvas);

  // If no issues, return unchanged
  if (issues.length === 0) {
    return {
      hasIssues: false,
      issues: [],
      fixedElements: elements,
      fixedCanvas: canvas,
    };
  }

  // Clone canvas safely
  const fixedCanvas: CanvasState = {
    ...canvas,
    background: {
      ...canvas.background,
      color: canvas.background?.color?.trim() || "#08080a",
    },
  };

  // Safe non-destructive deep copy of elements
  const fixedElements: EditorElement[] = JSON.parse(JSON.stringify(elements));

  fixedElements.forEach((el, index) => {
    // 1. Repair dimensions (min 24px)
    if (isNaN(el.width) || el.width <= 0) el.width = 32;
    if (isNaN(el.height) || el.height <= 0) el.height = 32;

    // 2. Repair out-of-bounds positioning (clamp into canvas viewport)
    const margin = 12;
    const maxX = Math.max(margin, canvas.width - el.width - margin);
    const maxY = Math.max(margin, canvas.height - el.height - margin);

    if (el.x + el.width < margin) {
      el.x = margin;
    } else if (el.x > canvas.width - margin) {
      el.x = maxX;
    }

    if (el.y + el.height < margin) {
      el.y = margin;
    } else if (el.y > canvas.height - margin) {
      el.y = maxY;
    }

    // 3. Repair zero opacity
    if (isNaN(el.opacity) || el.opacity <= 0) {
      el.opacity = 1.0;
    }

    // 4. Normalize z-index sequentially
    if (isNaN(el.zIndex) || el.zIndex < 0) {
      el.zIndex = index + 1;
    }

    // 5. Repair Text specifics
    if (el.type === "text") {
      const textEl = el as TextElement;
      if (isNaN(textEl.fontSize) || textEl.fontSize < 8) {
        textEl.fontSize = 12;
      } else if (textEl.fontSize > 180) {
        textEl.fontSize = 120;
      }
      if (!textEl.text || textEl.text.trim() === "") {
        textEl.text = "Sample Text";
      }
    }

    // 6. Stagger exact duplicates
    for (let j = 0; j < index; j++) {
      const prev = fixedElements[j];
      if (prev.x === el.x && prev.y === el.y && prev.width === el.width) {
        el.x = Math.min(canvas.width - el.width, el.x + 16);
        el.y = Math.min(canvas.height - el.height, el.y + 16);
      }
    }
  });

  return {
    hasIssues: true,
    issues,
    fixedElements,
    fixedCanvas,
  };
}
