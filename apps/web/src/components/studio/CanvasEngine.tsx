"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RotateCw,
  Move,
  Maximize2,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CornerDownRight,
  Sparkles,
} from "lucide-react";
import {
  CanvasElement,
  CanvasEmbed,
  CanvasEngineState,
  CanvasTransform,
} from "@/types/studio";

interface CanvasEngineProps {
  canvasState: CanvasEngineState;
  onUpdateCanvas: (updater: (prev: CanvasEngineState) => CanvasEngineState) => void;
  zoom?: number;
  isInteractive?: boolean;
  onSelectElement?: (id: string | null) => void;
  children: React.ReactNode;
}

type HandleType = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w" | "rot";

interface DragOperation {
  mode: "move" | "resize" | "rotate";
  targetId: string;
  isEmbed: boolean;
  handle?: HandleType;
  startX: number;
  startY: number;
  initialTransform: CanvasTransform;
  childInitialTransforms?: Map<string, CanvasTransform>;
  centerX?: number;
  centerY?: number;
  initialAngle?: number;
}

export function CanvasEngine({
  canvasState,
  onUpdateCanvas,
  zoom = 100,
  isInteractive = true,
  onSelectElement,
  children,
}: CanvasEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOp, setDragOp] = useState<DragOperation | null>(null);
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }>({});

  const scale = zoom / 100;

  // Selected item lookup
  const selectedElement = canvasState.elements.find((el) => el.id === canvasState.selectedId);
  const selectedEmbed = canvasState.embeds.find((em) => em.id === canvasState.selectedId);
  const selectedItem = selectedElement || selectedEmbed;
  const isSelectedEmbed = Boolean(selectedEmbed);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!isInteractive || !canvasState.selectedId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      const nudgeStep = e.shiftKey ? 10 : 1;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-nudgeStep, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(nudgeStep, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -nudgeStep);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, nudgeStep);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onSelectElement?.(null);
        onUpdateCanvas((prev) => ({ ...prev, selectedId: null, selectedIds: [] }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInteractive, canvasState.selectedId, onSelectElement, onUpdateCanvas]);

  const nudgeSelected = (dx: number, dy: number) => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      // Check if moving an embed
      const embedIdx = prev.embeds.findIndex((em) => em.id === id);
      if (embedIdx !== -1) {
        const target = prev.embeds[embedIdx];
        if (target.isLocked) return prev;

        const updatedEmbed = {
          ...target,
          transform: {
            ...target.transform,
            x: target.transform.x + dx,
            y: target.transform.y + dy,
          },
        };

        // Move children as well
        const updatedElements = prev.elements.map((el) => {
          if (el.parentEmbedId === id) {
            return {
              ...el,
              transform: {
                ...el.transform,
                x: el.transform.x + dx,
                y: el.transform.y + dy,
              },
            };
          }
          return el;
        });

        const newEmbeds = [...prev.embeds];
        newEmbeds[embedIdx] = updatedEmbed;
        return { ...prev, embeds: newEmbeds, elements: updatedElements };
      }

      // Check if moving an element
      const elIdx = prev.elements.findIndex((el) => el.id === id);
      if (elIdx !== -1) {
        const target = prev.elements[elIdx];
        if (target.isLocked) return prev;

        const updatedElements = [...prev.elements];
        updatedElements[elIdx] = {
          ...target,
          transform: {
            ...target.transform,
            x: target.transform.x + dx,
            y: target.transform.y + dy,
          },
        };
        return { ...prev, elements: updatedElements };
      }

      return prev;
    });
  };

  const deleteSelected = () => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      return {
        ...prev,
        embeds: prev.embeds.filter((em) => em.id !== id),
        elements: prev.elements.filter((el) => el.id !== id && el.parentEmbedId !== id),
        selectedId: null,
        selectedIds: [],
      };
    });
    onSelectElement?.(null);
  };

  const duplicateSelected = () => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      const element = prev.elements.find((el) => el.id === id);
      if (element) {
        const newId = `${element.type}_${Date.now()}`;
        const newEl: CanvasElement = {
          ...element,
          id: newId,
          name: `${element.name} (Copy)`,
          transform: {
            ...element.transform,
            x: element.transform.x + 20,
            y: element.transform.y + 20,
            zIndex: prev.elements.length + 5,
          },
        };
        return {
          ...prev,
          elements: [...prev.elements, newEl],
          selectedId: newId,
          selectedIds: [newId],
        };
      }

      const embed = prev.embeds.find((em) => em.id === id);
      if (embed) {
        const newEmbedId = `embed_${Date.now()}`;
        const newChildren: CanvasElement[] = [];

        prev.elements
          .filter((el) => el.parentEmbedId === id)
          .forEach((child) => {
            const newChildId = `${child.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            newChildren.push({
              ...child,
              id: newChildId,
              parentEmbedId: newEmbedId,
              transform: {
                ...child.transform,
                x: child.transform.x + 30,
                y: child.transform.y + 30,
              },
            });
          });

        const newEmbed: CanvasEmbed = {
          ...embed,
          id: newEmbedId,
          title: `${embed.title} (Copy)`,
          transform: {
            ...embed.transform,
            x: embed.transform.x + 30,
            y: embed.transform.y + 30,
          },
          childrenIds: newChildren.map((c) => c.id),
        };

        return {
          ...prev,
          embeds: [...prev.embeds, newEmbed],
          elements: [...prev.elements, ...newChildren],
          selectedId: newEmbedId,
          selectedIds: [newEmbedId],
        };
      }

      return prev;
    });
  };

  // Pointer drag start for moving object
  const startMove = (e: React.PointerEvent, targetId: string, isEmbed: boolean) => {
    if (!isInteractive) return;
    e.stopPropagation();

    const item = isEmbed
      ? canvasState.embeds.find((em) => em.id === targetId)
      : canvasState.elements.find((el) => el.id === targetId);

    if (!item || item.isLocked) return;

    onSelectElement?.(targetId);
    onUpdateCanvas((prev) => ({ ...prev, selectedId: targetId, selectedIds: [targetId] }));

    const childTransforms = new Map<string, CanvasTransform>();
    if (isEmbed) {
      canvasState.elements
        .filter((el) => el.parentEmbedId === targetId)
        .forEach((child) => {
          childTransforms.set(child.id, { ...child.transform });
        });
    }

    setDragOp({
      mode: "move",
      targetId,
      isEmbed,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...item.transform },
      childInitialTransforms: childTransforms,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer drag start for resize handles
  const startResize = (e: React.PointerEvent, handle: HandleType) => {
    if (!isInteractive || !selectedItem || selectedItem.isLocked) return;
    e.stopPropagation();

    setDragOp({
      mode: "resize",
      targetId: selectedItem.id,
      isEmbed: isSelectedEmbed,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...selectedItem.transform },
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer drag start for rotation
  const startRotate = (e: React.PointerEvent) => {
    if (!isInteractive || !selectedItem || selectedItem.isLocked || !containerRef.current) return;
    e.stopPropagation();

    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;

    const currentRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const currentDeg = Math.round((currentRad * 180) / Math.PI);

    setDragOp({
      mode: "rotate",
      targetId: selectedItem.id,
      isEmbed: isSelectedEmbed,
      handle: "rot",
      startX: e.clientX,
      startY: e.clientY,
      centerX,
      centerY,
      initialTransform: { ...selectedItem.transform },
      initialAngle: currentDeg - (selectedItem.transform.rotation || 0),
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Global pointer move during drag / resize / rotate
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragOp) return;

    const deltaX = (e.clientX - dragOp.startX) / scale;
    const deltaY = (e.clientY - dragOp.startY) / scale;

    if (dragOp.mode === "move") {
      const newX = Math.round(dragOp.initialTransform.x + deltaX);
      const newY = Math.round(dragOp.initialTransform.y + deltaY);

      onUpdateCanvas((prev) => {
        if (dragOp.isEmbed) {
          const updatedEmbeds = prev.embeds.map((em) =>
            em.id === dragOp.targetId
              ? { ...em, transform: { ...em.transform, x: newX, y: newY } }
              : em
          );

          // Move attached children concurrently
          const updatedElements = prev.elements.map((el) => {
            if (el.parentEmbedId === dragOp.targetId && dragOp.childInitialTransforms?.has(el.id)) {
              const initChild = dragOp.childInitialTransforms.get(el.id)!;
              return {
                ...el,
                transform: {
                  ...el.transform,
                  x: Math.round(initChild.x + deltaX),
                  y: Math.round(initChild.y + deltaY),
                },
              };
            }
            return el;
          });

          return { ...prev, embeds: updatedEmbeds, elements: updatedElements };
        } else {
          const updatedElements = prev.elements.map((el) =>
            el.id === dragOp.targetId
              ? { ...el, transform: { ...el.transform, x: newX, y: newY } }
              : el
          );
          return { ...prev, elements: updatedElements };
        }
      });
    } else if (dragOp.mode === "resize" && dragOp.handle) {
      let nextW = dragOp.initialTransform.width;
      let nextH = dragOp.initialTransform.height;
      let nextX = dragOp.initialTransform.x;
      let nextY = dragOp.initialTransform.y;

      const handle = dragOp.handle;

      if (handle.includes("e")) nextW = Math.max(40, Math.round(dragOp.initialTransform.width + deltaX));
      if (handle.includes("s")) nextH = Math.max(24, Math.round(dragOp.initialTransform.height + deltaY));
      if (handle.includes("w")) {
        const potentialW = Math.max(40, Math.round(dragOp.initialTransform.width - deltaX));
        nextX = Math.round(dragOp.initialTransform.x + (dragOp.initialTransform.width - potentialW));
        nextW = potentialW;
      }
      if (handle.includes("n")) {
        const potentialH = Math.max(24, Math.round(dragOp.initialTransform.height - deltaY));
        nextY = Math.round(dragOp.initialTransform.y + (dragOp.initialTransform.height - potentialH));
        nextH = potentialH;
      }

      onUpdateCanvas((prev) => {
        if (dragOp.isEmbed) {
          return {
            ...prev,
            embeds: prev.embeds.map((em) =>
              em.id === dragOp.targetId
                ? {
                    ...em,
                    transform: {
                      ...em.transform,
                      x: nextX,
                      y: nextY,
                      width: nextW,
                      height: nextH,
                    },
                  }
                : em
            ),
          };
        } else {
          return {
            ...prev,
            elements: prev.elements.map((el) =>
              el.id === dragOp.targetId
                ? {
                    ...el,
                    transform: {
                      ...el.transform,
                      x: nextX,
                      y: nextY,
                      width: nextW,
                      height: nextH,
                    },
                  }
                : el
            ),
          };
        }
      });
    } else if (dragOp.mode === "rotate" && dragOp.centerX !== undefined && dragOp.centerY !== undefined) {
      const currentRad = Math.atan2(e.clientY - dragOp.centerY, e.clientX - dragOp.centerX);
      let deg = Math.round((currentRad * 180) / Math.PI) - (dragOp.initialAngle || 0);
      deg = (deg + 360) % 360;

      // Snap to 0, 90, 180, 270 if within 4 degrees
      if (Math.abs(deg) < 4 || Math.abs(deg - 360) < 4) deg = 0;
      else if (Math.abs(deg - 90) < 4) deg = 90;
      else if (Math.abs(deg - 180) < 4) deg = 180;
      else if (Math.abs(deg - 270) < 4) deg = 270;

      onUpdateCanvas((prev) => {
        if (dragOp.isEmbed) {
          return {
            ...prev,
            embeds: prev.embeds.map((em) =>
              em.id === dragOp.targetId
                ? { ...em, transform: { ...em.transform, rotation: deg } }
                : em
            ),
          };
        } else {
          return {
            ...prev,
            elements: prev.elements.map((el) =>
              el.id === dragOp.targetId
                ? { ...el, transform: { ...el.transform, rotation: deg } }
                : el
            ),
          };
        }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragOp) {
      setDragOp(null);
      setGuideLines({});
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        // Deselect if clicking on empty canvas
        if (e.target === e.currentTarget) {
          onSelectElement?.(null);
          onUpdateCanvas((prev) => ({ ...prev, selectedId: null, selectedIds: [] }));
        }
      }}
      className="relative w-full h-full flex flex-col items-center justify-start select-none"
    >
      {/* Underlying Profile / Embed Hierarchy */}
      {children}

      {/* Interactive Selection Bounding Box & 8 Resize Handles */}
      {isInteractive && selectedItem && (
        <div
          className="absolute pointer-events-none z-50 transition-all duration-75"
          style={{
            left: `${selectedItem.transform.x}px`,
            top: `${selectedItem.transform.y}px`,
            width: `${selectedItem.transform.width}px`,
            height: `${selectedItem.transform.height}px`,
            transform: `rotate(${selectedItem.transform.rotation || 0}deg)`,
            transformOrigin: "center center",
          }}
        >
          {/* Blue Figma-style selection bounding border */}
          <div className="absolute inset-0 border-2 border-sky-400 rounded-sm shadow-sm" />

          {/* Dimension Tag */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-sky-500 text-black text-[9px] font-bold font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
            {Math.round(selectedItem.transform.width)} × {Math.round(selectedItem.transform.height)}
            {selectedItem.transform.rotation ? ` (${selectedItem.transform.rotation}°)` : ""}
          </div>

          {/* Move Handle Bar on Top */}
          <div
            onPointerDown={(e) => startMove(e, selectedItem.id, isSelectedEmbed)}
            className="absolute -top-7 left-0 right-0 h-6 flex items-center justify-between px-2 bg-sky-950/90 border border-sky-500/80 rounded text-sky-200 text-[10px] font-mono cursor-move pointer-events-auto"
          >
            <span className="flex items-center gap-1 font-bold truncate">
              <Move size={11} />
              {isSelectedEmbed ? (selectedItem as CanvasEmbed).title : (selectedItem as CanvasElement).name}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSelected();
                }}
                title="Duplicate (Ctrl+D)"
                className="p-1 hover:text-white"
              >
                <Copy size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSelected();
                }}
                title="Delete"
                className="p-1 hover:text-rose-400"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {/* Rotation Handle with Guide Stem */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            <div
              onPointerDown={startRotate}
              title="Drag to Rotate"
              className="w-5 h-5 rounded-full bg-white border-2 border-sky-500 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing text-sky-600 hover:scale-110 transition-transform"
            >
              <RotateCw size={11} />
            </div>
            <div className="w-0.5 h-7 bg-sky-400" />
          </div>

          {/* 4 Corner Resize Handles */}
          <div
            onPointerDown={(e) => startResize(e, "nw")}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "ne")}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "se")}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "sw")}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />

          {/* 4 Edge Resize Handles */}
          <div
            onPointerDown={(e) => startResize(e, "n")}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "s")}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "w")}
            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "e")}
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
        </div>
      )}
    </div>
  );
}

