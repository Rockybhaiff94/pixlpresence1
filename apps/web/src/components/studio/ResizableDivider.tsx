"use client";

import React, { useCallback, useEffect, useState } from "react";
import { GripVertical } from "lucide-react";

interface ResizableDividerProps {
  previewWidthPct: number;
  onResize: (newWidthPct: number) => void;
  onReset: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minPct?: number;
  maxPct?: number;
  className?: string;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  previewWidthPct,
  onResize,
  onReset,
  containerRef,
  minPct = 20,
  maxPct = 70,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      // Moving divider left increases right preview width
      onResize(Math.min(maxPct, Math.round(previewWidthPct + 2)));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      // Moving divider right decreases right preview width
      onResize(Math.max(minPct, Math.round(previewWidthPct - 2)));
    } else if (e.key === "Home") {
      e.preventDefault();
      onReset();
    }
  };

  const calculatePctFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return previewWidthPct;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return previewWidthPct;

      // Preview is on the right side of the container:
      // Distance from container's right edge to the cursor
      const rightDistance = rect.right - clientX;
      const rawPct = (rightDistance / rect.width) * 100;
      return Math.min(maxPct, Math.max(minPct, rawPct));
    },
    [containerRef, maxPct, minPct, previewWidthPct]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const newPct = calculatePctFromX(e.clientX);
    onResize(Number(newPct.toFixed(1)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  // Ensure cursor and user-select reset if component unmounts while dragging
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize preview panel (Arrow keys to resize, Home to reset, double click to restore)"
      aria-valuenow={Math.round(previewWidthPct)}
      aria-valuemin={minPct}
      aria-valuemax={maxPct}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        e.preventDefault();
        onReset();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative hidden lg:flex items-center justify-center w-3 -mx-1.5 z-30 cursor-col-resize touch-none select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${className}`}
      title="Drag to resize panel (Double-click to reset, Left/Right arrow keys)"
    >
      {/* Visual Divider Line */}
      <div
        className={`w-[2px] h-full transition-colors duration-150 ${
          isDragging
            ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
            : isHovered
            ? "bg-neutral-400"
            : "bg-[#252529]"
        }`}
      />

      {/* Center Drag Handle Grip Pill */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-12 rounded-full border transition-all duration-150 ${
          isDragging
            ? "bg-cyan-400 border-white text-black scale-110 shadow-lg"
            : isHovered
            ? "bg-neutral-800 border-neutral-500 text-white scale-105"
            : "bg-[#16161a] border-[#303036] text-neutral-500"
        }`}
      >
        <GripVertical size={11} strokeWidth={2.5} />
      </div>

      {/* Percentage Tooltip Indicator while dragging or hovered */}
      {(isDragging || isHovered) && (
        <div
          className={`absolute top-4 pointer-events-none px-2 py-0.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shadow-xl transition-opacity duration-150 ${
            isDragging
              ? "bg-cyan-500 text-black border border-cyan-300"
              : "bg-neutral-900 text-neutral-300 border border-neutral-700 opacity-90"
          }`}
        >
          {Math.round(previewWidthPct)}% Preview
        </div>
      )}
    </div>
  );
};

