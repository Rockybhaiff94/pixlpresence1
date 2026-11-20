"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type DockTooltipPlacement = "top" | "bottom" | "left" | "right";

export interface DockTooltipData {
  id: string;
  label: string;
  desc?: string;
  hotkey?: string;
  targetRect: DOMRect;
  preferredSide?: DockTooltipPlacement;
}

export interface TooltipPositionResult {
  x: number;
  y: number;
  side: DockTooltipPlacement;
  caretOffset: number;
}

/**
 * Calculates collision-free tooltip position relative to the target icon,
 * avoiding viewport borders and any open sidebars/drawers/overlays.
 */
export function calculateDockTooltipPosition(
  targetRect: { left: number; top: number; width: number; height: number; right?: number; bottom?: number },
  dockEdge: "bottom" | "top" | "left" | "right" | "float" = "bottom",
  preferredSide?: DockTooltipPlacement,
  tooltipWidth = 240,
  tooltipHeight = 44,
  viewport: { width: number; height: number } = {
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  },
  obstructingRects: Array<{ left: number; top: number; right: number; bottom: number }> = []
): TooltipPositionResult {
  const SPACING = 10;
  const PADDING = 12;
  const vw = viewport.width;
  const vh = viewport.height;

  const targetRight = targetRect.right ?? targetRect.left + targetRect.width;
  const targetBottom = targetRect.bottom ?? targetRect.top + targetRect.height;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  // 1. Establish candidate placement order
  let candidateSides: DockTooltipPlacement[];
  if (preferredSide) {
    const opposite: Record<DockTooltipPlacement, DockTooltipPlacement> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    const orthogonals: Record<DockTooltipPlacement, [DockTooltipPlacement, DockTooltipPlacement]> = {
      top: ["right", "left"],
      bottom: ["right", "left"],
      left: ["top", "bottom"],
      right: ["top", "bottom"],
    };
    candidateSides = [preferredSide, opposite[preferredSide], ...orthogonals[preferredSide]];
  } else {
    switch (dockEdge) {
      case "bottom":
        candidateSides = ["top", "right", "left", "bottom"];
        break;
      case "top":
        candidateSides = ["bottom", "right", "left", "top"];
        break;
      case "left":
        candidateSides = ["right", "top", "bottom", "left"];
        break;
      case "right":
        candidateSides = ["left", "top", "bottom", "right"];
        break;
      case "float":
      default: {
        const spaceTop = targetRect.top;
        const spaceBottom = vh - targetBottom;
        const spaceLeft = targetRect.left;
        const spaceRight = vw - targetRight;
        const spaces: { side: DockTooltipPlacement; space: number }[] = [
          { side: "top", space: spaceTop },
          { side: "bottom", space: spaceBottom },
          { side: "right", space: spaceRight },
          { side: "left", space: spaceLeft },
        ];
        spaces.sort((a, b) => b.space - a.space);
        candidateSides = spaces.map((s) => s.side);
        break;
      }
    }
  }

  // 2. Overlap test helpers
  const checkSidebarOverlap = (box: { left: number; right: number; top: number; bottom: number }) => {
    for (const s of obstructingRects) {
      const isOverlapping = !(
        box.right <= s.left + 2 ||
        box.left >= s.right - 2 ||
        box.bottom <= s.top + 2 ||
        box.top >= s.bottom - 2
      );
      if (isOverlapping) return true;
    }
    return false;
  };

  const checkViewportOverflow = (box: { left: number; right: number; top: number; bottom: number }) => {
    return (
      box.left < PADDING ||
      box.right > vw - PADDING ||
      box.top < PADDING ||
      box.bottom > vh - PADDING
    );
  };

  // 3. Evaluate candidate placements
  for (const side of candidateSides) {
    let rawX = 0;
    let rawY = 0;

    if (side === "top") {
      rawX = targetCenterX - tooltipWidth / 2;
      rawY = targetRect.top - tooltipHeight - SPACING;
    } else if (side === "bottom") {
      rawX = targetCenterX - tooltipWidth / 2;
      rawY = targetBottom + SPACING;
    } else if (side === "left") {
      rawX = targetRect.left - tooltipWidth - SPACING;
      rawY = targetCenterY - tooltipHeight / 2;
    } else if (side === "right") {
      rawX = targetRight + SPACING;
      rawY = targetCenterY - tooltipHeight / 2;
    }

    // Clamp horizontally for top/bottom; vertically for left/right
    let clampedX = rawX;
    let clampedY = rawY;
    if (side === "top" || side === "bottom") {
      clampedX = Math.max(PADDING, Math.min(vw - tooltipWidth - PADDING, rawX));
    } else {
      clampedY = Math.max(PADDING, Math.min(vh - tooltipHeight - PADDING, rawY));
    }

    const testBox = {
      left: clampedX,
      right: clampedX + tooltipWidth,
      top: clampedY,
      bottom: clampedY + tooltipHeight,
    };

    if (!checkViewportOverflow(testBox) && !checkSidebarOverlap(testBox)) {
      // Calculate responsive caret offset
      let caret = 0;
      if (side === "top" || side === "bottom") {
        caret = Math.max(14, Math.min(tooltipWidth - 14, targetCenterX - clampedX));
      } else {
        caret = Math.max(14, Math.min(tooltipHeight - 14, targetCenterY - clampedY));
      }
      return { x: clampedX, y: clampedY, side, caretOffset: caret };
    }
  }

  // 4. Fallback if tightly constrained: choose primary side and strictly clamp within viewport
  const fallbackSide = candidateSides[0];
  let finalX = targetCenterX - tooltipWidth / 2;
  let finalY = targetRect.top - tooltipHeight - SPACING;

  if (fallbackSide === "bottom") {
    finalY = targetBottom + SPACING;
  } else if (fallbackSide === "left") {
    finalX = targetRect.left - tooltipWidth - SPACING;
    finalY = targetCenterY - tooltipHeight / 2;
  } else if (fallbackSide === "right") {
    finalX = targetRight + SPACING;
    finalY = targetCenterY - tooltipHeight / 2;
  }

  finalX = Math.max(PADDING, Math.min(vw - tooltipWidth - PADDING, finalX));
  finalY = Math.max(PADDING, Math.min(vh - tooltipHeight - PADDING, finalY));

  let fallbackCaret = 0;
  if (fallbackSide === "top" || fallbackSide === "bottom") {
    fallbackCaret = Math.max(14, Math.min(tooltipWidth - 14, targetCenterX - finalX));
  } else {
    fallbackCaret = Math.max(14, Math.min(tooltipHeight - 14, targetCenterY - finalY));
  }

  return { x: finalX, y: finalY, side: fallbackSide, caretOffset: fallbackCaret };
}

export const DockPortalTooltip: React.FC<{
  tooltip: DockTooltipData | null;
  dockEdge?: "bottom" | "top" | "left" | "right" | "float";
}> = ({ tooltip, dockEdge = "bottom" }) => {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number }>({
    width: 240,
    height: 44,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update measured size whenever tooltip content changes
  useLayoutEffect(() => {
    if (!tooltip || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    if (
      Math.abs(rect.width - measuredSize.width) > 2 ||
      Math.abs(rect.height - measuredSize.height) > 2
    ) {
      setMeasuredSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    }
  }, [tooltip?.id, tooltip?.label, tooltip?.desc, tooltip?.hotkey]);

  if (!mounted || typeof document === "undefined" || !document.body) {
    return null;
  }

  // Find all open sidebars / panels on screen for collision avoidance
  const obstructingRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
  if (tooltip) {
    const selectors = [
      "aside",
      "[data-sidebar]",
      "[role='complementary']",
      "[data-panel]",
      ".sidebar",
      "[data-overlay-panel]",
      "[data-drawer]",
      "[role='dialog']",
      ".account-sidebar",
      ".analytics-sidebar",
      ".overlay-panel",
    ];
    try {
      const els = document.querySelectorAll<HTMLElement>(selectors.join(", "));
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (
          r.width > 30 &&
          r.height > 30 &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth
        ) {
          const style = window.getComputedStyle(el);
          if (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          ) {
            obstructingRects.push({
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
            });
          }
        }
      });
    } catch {}
  }

  const pos = tooltip
    ? calculateDockTooltipPosition(
        tooltip.targetRect,
        dockEdge,
        tooltip.preferredSide,
        measuredSize.width,
        measuredSize.height,
        { width: window.innerWidth, height: window.innerHeight },
        obstructingRects
      )
    : null;

  return createPortal(
    <AnimatePresence>
      {tooltip && pos && (
        <motion.div
          key={tooltip.id}
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.12 }}
          style={{
            position: "fixed",
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            zIndex: 99999,
          }}
          className="pointer-events-none select-none w-max max-w-[280px] sm:max-w-[340px] px-3 py-1.5 rounded-xl bg-[#0e0e13]/95 backdrop-blur-xl border border-white/15 text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)] ring-1 ring-white/10 flex flex-col gap-0.5"
        >
          {/* Subtle Directional Pointer Caret */}
          {pos.side === "top" && (
            <div
              style={{ left: `${pos.caretOffset}px` }}
              className="absolute -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0e0e13] border-r border-b border-white/15"
            />
          )}
          {pos.side === "bottom" && (
            <div
              style={{ left: `${pos.caretOffset}px` }}
              className="absolute -top-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0e0e13] border-l border-t border-white/15"
            />
          )}
          {pos.side === "left" && (
            <div
              style={{ top: `${pos.caretOffset}px` }}
              className="absolute -right-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#0e0e13] border-r border-t border-white/15"
            />
          )}
          {pos.side === "right" && (
            <div
              style={{ top: `${pos.caretOffset}px` }}
              className="absolute -left-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#0e0e13] border-l border-b border-white/15"
            />
          )}

          {/* Header Row: Label & Hotkey Badge */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-bold text-white text-[11px] font-mono tracking-wide">
              {tooltip.label}
            </span>
            {tooltip.hotkey && (
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono text-neutral-300 border border-white/10 shrink-0 font-semibold">
                {tooltip.hotkey}
              </span>
            )}
          </div>

          {/* Secondary Description */}
          {tooltip.desc && (
            <div className="text-[10px] text-neutral-400 font-mono leading-tight break-words max-w-[280px]">
              // {tooltip.desc}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
