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
  Sparkles,
} from "lucide-react";
import {
  CanvasElement,
  CanvasEmbed,
  CanvasEngineState,
  CanvasTransform,
  CanvasGridSettings,
  EmbedScalingMode,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_TEXT_STYLE_GROUPS,
  TextStyleGroupId,
  TextStyleDefinition,
  CanvasElementStyle,
} from "@/types/studio";
import { calculateSmartSnap, GuideLine } from "./smartAlignment";
import { scaleEmbedChildren } from "./embedScaling";
import { SelectionToolbar } from "./SelectionToolbar";
import { SelectedObjectMenu } from "./SelectedObjectMenu";
import { isTextBasedElement, resolveStyleGroup } from "./typographyEngine";
import {
  isSocialElement,
  arrangeSocialElementsHorizontally,
  arrangeSocialElementsVertically,
  centerSocialElements,
  sanitizeSocialUrl,
} from "./socialsEngine";

interface CanvasEngineProps {
  canvasState: CanvasEngineState;
  onUpdateCanvas: (updater: (prev: CanvasEngineState) => CanvasEngineState) => void;
  zoom?: number;
  isInteractive?: boolean;
  onSelectElement?: (id: string | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  modifierKey?: "Alt" | "Control" | "Shift" | "Meta";
  scalingMode?: EmbedScalingMode;
  gridSettings?: CanvasGridSettings;
  isPremium?: boolean;
  themeAccentColor?: string;
  activeLinks?: Array<{ id: string; label: string; url: string; icon?: string | null; color?: string | null; visibility: boolean }>;
  onOpenSocialSelector?: () => void;
  onOpenRpcCustomizer?: () => void;
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
  onUndo,
  onRedo,
  modifierKey = "Alt",
  scalingMode = "hybrid",
  gridSettings = DEFAULT_GRID_SETTINGS,
  isPremium = false,
  themeAccentColor = "#ffffff",
  activeLinks = [],
  onOpenSocialSelector,
  onOpenRpcCustomizer,
  children,
}: CanvasEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOp, setDragOp] = useState<DragOperation | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  const scale = zoom / 100;

  // Selected item lookup
  const selectedElement = canvasState.elements.find((el) => el.id === canvasState.selectedId);
  const selectedEmbed = canvasState.embeds.find((em) => em.id === canvasState.selectedId);
  const selectedItem = selectedElement || selectedEmbed;
  const isSelectedEmbed = Boolean(selectedEmbed);
  const isSelectedText = Boolean(!isSelectedEmbed && selectedElement && isTextBasedElement(selectedElement.type));
  const isSelectedSocial = Boolean(!isSelectedEmbed && selectedElement && isSocialElement(selectedElement));
  const isSelectedRpc = Boolean(!isSelectedEmbed && selectedElement && selectedElement.type === "rpc");
  const selectedElStyle = !isSelectedEmbed ? selectedElement?.style : undefined;

  const handleArrangeSocialsHorizontally = () => {
    onUpdateCanvas((prev) => {
      const socialEls = prev.elements.filter((el) => isSocialElement(el));
      const targetEmbed = prev.embeds[0];
      const parentWidth = targetEmbed ? targetEmbed.transform.width : 520;
      const rearranged = arrangeSocialElementsHorizontally(socialEls, parentWidth, 12);
      const rearrangedMap = new Map(rearranged.map((el) => [el.id, el]));
      return {
        ...prev,
        elements: prev.elements.map((el) => rearrangedMap.get(el.id) || el),
      };
    });
  };

  const handleArrangeSocialsVertically = () => {
    onUpdateCanvas((prev) => {
      const socialEls = prev.elements.filter((el) => isSocialElement(el));
      const rearranged = arrangeSocialElementsVertically(socialEls, 10);
      const rearrangedMap = new Map(rearranged.map((el) => [el.id, el]));
      return {
        ...prev,
        elements: prev.elements.map((el) => rearrangedMap.get(el.id) || el),
      };
    });
  };

  const handleCenterSocials = () => {
    onUpdateCanvas((prev) => {
      const socialEls = prev.elements.filter((el) => isSocialElement(el));
      const targetEmbed = prev.embeds[0];
      const parentWidth = targetEmbed ? targetEmbed.transform.width : 520;
      const centered = centerSocialElements(socialEls, parentWidth);
      const centeredMap = new Map(centered.map((el) => [el.id, el]));
      return {
        ...prev,
        elements: prev.elements.map((el) => centeredMap.get(el.id) || el),
      };
    });
  };

  const handleTestLink = () => {
    if (!selectedElement) return;
    const linkId = selectedElement.props?.linkId;
    const boundLink = linkId ? activeLinks.find((l) => l.id === linkId) : null;
    const rawUrl = boundLink?.url || selectedElement.props?.url;
    if (rawUrl) {
      window.open(sanitizeSocialUrl(rawUrl), "_blank");
    }
  };

  // Close more menu and finish inline editing when selection changes
  useEffect(() => {
    setIsMoreMenuOpen(false);
    setInlineEditingId(null);
  }, [canvasState.selectedId]);

  const updateSelectedElementStyle = (patch: Partial<CanvasElementStyle>) => {
    if (!selectedItem || isSelectedEmbed) return;
    onUpdateCanvas((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedItem.id
          ? { ...el, style: { ...(el.style || {}), ...patch } }
          : el
      ),
    }));
  };

  const handleUpdateElementProps = (id: string, newProps: Record<string, any>) => {
    onUpdateCanvas((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, props: { ...(el.props || {}), ...newProps } } : el
      ),
    }));
  };

  // Track modifier keys and keyboard shortcuts
  useEffect(() => {
    if (!isInteractive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check modifier key
      if (
        (modifierKey === "Alt" && e.altKey) ||
        (modifierKey === "Control" && e.ctrlKey) ||
        (modifierKey === "Shift" && e.shiftKey) ||
        (modifierKey === "Meta" && e.metaKey)
      ) {
        setIsAltPressed(true);
      }

      // Check undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Ignore input/textarea for element shortcuts
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (!canvasState.selectedId) return;

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
        if (inlineEditingId) {
          setInlineEditingId(null);
          return;
        }
        if (isMoreMenuOpen) {
          setIsMoreMenuOpen(false);
        } else {
          onSelectElement?.(null);
          onUpdateCanvas((prev) => ({ ...prev, selectedId: null, selectedIds: [] }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        (modifierKey === "Alt" && !e.altKey) ||
        (modifierKey === "Control" && !e.ctrlKey) ||
        (modifierKey === "Shift" && !e.shiftKey) ||
        (modifierKey === "Meta" && !e.metaKey)
      ) {
        setIsAltPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isInteractive, canvasState.selectedId, modifierKey, isMoreMenuOpen, onSelectElement, onUpdateCanvas, onUndo, onRedo]);

  // Nudge selected item by dx, dy
  const nudgeSelected = (dx: number, dy: number) => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      // Embed nudge
      const embedIdx = prev.embeds.findIndex((em) => em.id === id);
      if (embedIdx !== -1) {
        const target = prev.embeds[embedIdx];
        if (target.isLocked || target.transform.lockType === "position" || target.transform.lockType === "full") {
          return prev;
        }

        const updatedEmbed = {
          ...target,
          transform: {
            ...target.transform,
            x: target.transform.x + dx,
            y: target.transform.y + dy,
          },
        };

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

      // Element nudge
      const elIdx = prev.elements.findIndex((el) => el.id === id);
      if (elIdx !== -1) {
        const target = prev.elements[elIdx];
        if (target.isLocked || target.transform.lockType === "position" || target.transform.lockType === "full") {
          return prev;
        }

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

  // Delete selected item
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
    setIsMoreMenuOpen(false);
    onSelectElement?.(null);
  };

  // Duplicate selected item
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

  // Toggle Lock
  const toggleLockSelected = () => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      return {
        ...prev,
        embeds: prev.embeds.map((em) =>
          em.id === id ? { ...em, isLocked: !em.isLocked } : em
        ),
        elements: prev.elements.map((el) =>
          el.id === id ? { ...el, isLocked: !el.isLocked } : el
        ),
      };
    });
  };

  // Set Lock Type
  const setLockTypeSelected = (lockType: "none" | "position" | "size" | "full") => {
    onUpdateCanvas((prev) => {
      const id = prev.selectedId;
      if (!id) return prev;

      const isLocked = lockType !== "none";

      return {
        ...prev,
        embeds: prev.embeds.map((em) =>
          em.id === id
            ? {
                ...em,
                isLocked,
                transform: { ...em.transform, lockType, isLocked },
              }
            : em
        ),
        elements: prev.elements.map((el) =>
          el.id === id
            ? {
                ...el,
                isLocked,
                transform: { ...el.transform, lockType, isLocked },
              }
            : el
        ),
      };
    });
  };

  // Pointer drag start for moving object
  const startMove = (e: React.PointerEvent, targetId: string, isEmbed: boolean) => {
    if (!isInteractive) return;
    e.stopPropagation();

    const item = isEmbed
      ? canvasState.embeds.find((em) => em.id === targetId)
      : canvasState.elements.find((el) => el.id === targetId);

    if (
      !item ||
      item.isLocked ||
      item.transform.lockType === "position" ||
      item.transform.lockType === "full"
    ) {
      return;
    }

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
    if (
      !isInteractive ||
      !selectedItem ||
      selectedItem.isLocked ||
      selectedItem.transform.lockType === "size" ||
      selectedItem.transform.lockType === "full"
    ) {
      return;
    }
    e.stopPropagation();

    const childTransforms = new Map<string, CanvasTransform>();
    if (isSelectedEmbed) {
      canvasState.elements
        .filter((el) => el.parentEmbedId === selectedItem.id)
        .forEach((child) => {
          childTransforms.set(child.id, { ...child.transform });
        });
    }

    setDragOp({
      mode: "resize",
      targetId: selectedItem.id,
      isEmbed: isSelectedEmbed,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...selectedItem.transform },
      childInitialTransforms: childTransforms,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer drag start for rotation
  const startRotate = (e: React.PointerEvent) => {
    if (
      !isInteractive ||
      !selectedItem ||
      selectedItem.isLocked ||
      selectedItem.transform.lockType === "full" ||
      !containerRef.current
    ) {
      return;
    }
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

    // Check precision modifier (Alt key) - reduces speed by 80% for micro-movements
    const isPrecision =
      (modifierKey === "Alt" && e.altKey) ||
      (modifierKey === "Control" && e.ctrlKey) ||
      (modifierKey === "Shift" && e.shiftKey) ||
      (modifierKey === "Meta" && e.metaKey);

    const precisionFactor = isPrecision ? 0.2 : 1.0;
    const deltaX = ((e.clientX - dragOp.startX) / scale) * precisionFactor;
    const deltaY = ((e.clientY - dragOp.startY) / scale) * precisionFactor;

    if (dragOp.mode === "move") {
      let rawX = dragOp.initialTransform.x + deltaX;
      let rawY = dragOp.initialTransform.y + deltaY;

      // Collect sibling transforms for smart snap
      const siblings: CanvasTransform[] = dragOp.isEmbed
        ? canvasState.embeds.filter((em) => em.id !== dragOp.targetId).map((em) => em.transform)
        : canvasState.elements.filter((el) => el.id !== dragOp.targetId).map((el) => el.transform);

      // Smart Snapping & Guides
      const snap = calculateSmartSnap(
        { ...dragOp.initialTransform, x: rawX, y: rawY },
        siblings,
        undefined,
        gridSettings
      );

      const finalX = isPrecision ? Math.round(rawX) : snap.x;
      const finalY = isPrecision ? Math.round(rawY) : snap.y;
      setActiveGuides(isPrecision ? [] : snap.guides);

      onUpdateCanvas((prev) => {
        if (dragOp.isEmbed) {
          const updatedEmbeds = prev.embeds.map((em) =>
            em.id === dragOp.targetId
              ? { ...em, transform: { ...em.transform, x: finalX, y: finalY } }
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
                  x: Math.round(initChild.x + (finalX - dragOp.initialTransform.x)),
                  y: Math.round(initChild.y + (finalY - dragOp.initialTransform.y)),
                },
              };
            }
            return el;
          });

          return { ...prev, embeds: updatedEmbeds, elements: updatedElements };
        } else {
          const updatedElements = prev.elements.map((el) =>
            el.id === dragOp.targetId
              ? { ...el, transform: { ...el.transform, x: finalX, y: finalY } }
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
      const lockAspect = e.shiftKey || dragOp.initialTransform.aspectRatioLocked;
      const initialAspect = dragOp.initialTransform.width / Math.max(1, dragOp.initialTransform.height);

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

      // Maintain aspect ratio if shift key is held or aspect ratio lock is enabled
      if (lockAspect && (handle === "nw" || handle === "ne" || handle === "se" || handle === "sw")) {
        nextH = Math.max(24, Math.round(nextW / initialAspect));
      }

      onUpdateCanvas((prev) => {
        if (dragOp.isEmbed) {
          const nextTransform: CanvasTransform = {
            ...dragOp.initialTransform,
            x: nextX,
            y: nextY,
            width: nextW,
            height: nextH,
          };

          // Scale children according to configured scalingMode (hybrid, proportional, adaptive)
          const currentChildren = prev.elements.filter((el) => el.parentEmbedId === dragOp.targetId);
          const scaledChildren = scaleEmbedChildren(
            currentChildren,
            dragOp.initialTransform,
            nextTransform,
            scalingMode
          );

          const updatedElements = prev.elements.map((el) => {
            const scaled = scaledChildren.find((sc) => sc.id === el.id);
            return scaled || el;
          });

          return {
            ...prev,
            embeds: prev.embeds.map((em) =>
              em.id === dragOp.targetId ? { ...em, transform: nextTransform } : em
            ),
            elements: updatedElements,
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
      setActiveGuides([]);
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
        // Deselect if clicking on empty preview canvas
        if (e.target === e.currentTarget) {
          setIsMoreMenuOpen(false);
          onSelectElement?.(null);
          onUpdateCanvas((prev) => ({ ...prev, selectedId: null, selectedIds: [] }));
        }
      }}
      className="relative w-full h-full flex flex-col items-center justify-start select-none"
    >
      {/* Visual Alignment Grid Overlay if Enabled */}
      {isInteractive && gridSettings?.showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
            backgroundSize: `${gridSettings.gridSize}px ${gridSettings.gridSize}px`,
          }}
        />
      )}

      {/* Dynamic Smart Guide Lines (Horizontal & Vertical) */}
      {isInteractive &&
        activeGuides.map((guide, idx) =>
          guide.type === "x" ? (
            <div
              key={`guide_x_${idx}`}
              className="absolute top-0 bottom-0 w-[1px] bg-cyan-400 z-50 pointer-events-none shadow-[0_0_8px_#22d3ee]"
              style={{ left: `${guide.position}px` }}
            >
              {guide.label && (
                <span className="absolute top-2 left-1 bg-cyan-950/90 text-cyan-200 text-[8px] font-mono px-1 py-0.5 rounded border border-cyan-500/60 whitespace-nowrap">
                  {guide.label}
                </span>
              )}
            </div>
          ) : (
            <div
              key={`guide_y_${idx}`}
              className="absolute left-0 right-0 h-[1px] bg-cyan-400 z-50 pointer-events-none shadow-[0_0_8px_#22d3ee]"
              style={{ top: `${guide.position}px` }}
            >
              {guide.label && (
                <span className="absolute left-2 -top-4 bg-cyan-950/90 text-cyan-200 text-[8px] font-mono px-1 py-0.5 rounded border border-cyan-500/60 whitespace-nowrap">
                  {guide.label}
                </span>
              )}
            </div>
          )
        )}

      {/* Underlying Profile / Embed Hierarchy */}
      {React.isValidElement(children)
        ? React.cloneElement(children as any, {
            inlineEditingId,
            onSetInlineEditingId: setInlineEditingId,
            onUpdateElementProps: handleUpdateElementProps,
          })
        : children}

      {/* Interactive Selection Bounding Box, 8 Handles & Floating Toolbar */}
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
          {/* Subtle Selection Outline with Soft Glow */}
          <div
            className={`absolute inset-0 rounded-sm border-2 ${
              isSelectedEmbed ? "border-amber-400" : "border-sky-400"
            }`}
            style={{
              boxShadow: isSelectedEmbed
                ? "0 0 16px rgba(251, 191, 36, 0.45), inset 0 0 8px rgba(251, 191, 36, 0.15)"
                : "0 0 16px rgba(56, 189, 248, 0.45), inset 0 0 8px rgba(56, 189, 248, 0.15)",
            }}
          />

          {/* Contextual Floating Selection Toolbar */}
          <SelectionToolbar
            title={isSelectedEmbed ? (selectedItem as CanvasEmbed).title : (selectedItem as CanvasElement).name}
            isEmbed={isSelectedEmbed}
            isLocked={Boolean(selectedItem.isLocked || selectedItem.transform.lockType !== "none")}
            lockType={selectedItem.transform.lockType || (selectedItem.isLocked ? "full" : "none")}
            onToggleLock={toggleLockSelected}
            onSetLockType={setLockTypeSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onToggleMoreMenu={() => setIsMoreMenuOpen((prev) => !prev)}
            isMoreMenuOpen={isMoreMenuOpen}
            isText={isSelectedText}
            onEditText={() => setInlineEditingId(selectedItem.id)}
            onToggleBold={() => {
              const currentWeight = selectedElStyle?.fontWeight || 400;
              const newWeight = currentWeight >= 700 ? 400 : 700;
              updateSelectedElementStyle({ fontWeight: newWeight, hasCustomTypographyOverride: true });
            }}
            isBold={Boolean(selectedElStyle?.fontWeight && selectedElStyle.fontWeight >= 700)}
            onToggleItalic={() => {
              const isItalic = selectedElStyle?.italic === true;
              updateSelectedElementStyle({ italic: !isItalic, hasCustomTypographyOverride: true });
            }}
            isItalic={Boolean(selectedElStyle?.italic)}
            onCycleAlign={() => {
              const current = selectedElStyle?.textAlign || "left";
              const order: Array<"left" | "center" | "right" | "justify"> = ["left", "center", "right", "justify"];
              const next = order[(order.indexOf(current) + 1) % order.length];
              updateSelectedElementStyle({ textAlign: next, hasCustomTypographyOverride: true });
            }}
            textAlign={selectedElStyle?.textAlign || "left"}
            fontSize={selectedElStyle?.fontSize || 14}
            onChangeFontSize={(delta) => {
              const current = selectedElStyle?.fontSize || 14;
              const next = Math.max(8, Math.min(96, current + delta));
              updateSelectedElementStyle({ fontSize: next, hasCustomTypographyOverride: true });
            }}
            isSocial={isSelectedSocial}
            onOpenSocialSelector={onOpenSocialSelector}
            onTestLink={handleTestLink}
            onArrangeRow={handleArrangeSocialsHorizontally}
            isRpc={isSelectedRpc}
            onOpenRpcCustomizer={onOpenRpcCustomizer}
          />

          {/* Inline Three-Dot More Options Menu (PHASE 7) */}
          {isMoreMenuOpen && (
            <SelectedObjectMenu
              item={selectedItem}
              isEmbed={isSelectedEmbed}
              isPremium={isPremium}
              themeAccentColor={themeAccentColor}
              textStyleGroups={canvasState.textStyleGroups || DEFAULT_TEXT_STYLE_GROUPS}
              allElements={canvasState.elements}
              activeLinks={activeLinks}
              onOpenSocialSelector={onOpenSocialSelector}
              onArrangeSocialsHorizontally={handleArrangeSocialsHorizontally}
              onArrangeSocialsVertically={handleArrangeSocialsVertically}
              onCenterSocials={handleCenterSocials}
              onOpenRpcCustomizer={onOpenRpcCustomizer}
              onUpdateTransform={(t) => {
                onUpdateCanvas((prev) => {
                  const id = selectedItem.id;
                  if (isSelectedEmbed) {
                    return {
                      ...prev,
                      embeds: prev.embeds.map((em) =>
                        em.id === id ? { ...em, transform: { ...em.transform, ...t } } : em
                      ),
                    };
                  } else {
                    return {
                      ...prev,
                      elements: prev.elements.map((el) =>
                        el.id === id ? { ...el, transform: { ...el.transform, ...t } } : el
                      ),
                    };
                  }
                });
              }}
              onUpdateStyle={(s) => {
                onUpdateCanvas((prev) => {
                  const id = selectedItem.id;
                  if (isSelectedEmbed) {
                    return {
                      ...prev,
                      embeds: prev.embeds.map((em) =>
                        em.id === id ? { ...em, style: { ...em.style, ...s } } : em
                      ),
                    };
                  } else {
                    return {
                      ...prev,
                      elements: prev.elements.map((el) =>
                        el.id === id ? { ...el, style: { ...(el.style || {}), ...s } } : el
                      ),
                    };
                  }
                });
              }}
              onUpdateProps={(p) => {
                if (!isSelectedEmbed) {
                  onUpdateCanvas((prev) => ({
                    ...prev,
                    elements: prev.elements.map((el) =>
                      el.id === selectedItem.id
                        ? { ...el, props: { ...(el.props || {}), ...p } }
                        : el
                    ),
                  }));
                }
              }}
              onUpdateVisibility={(vis) => {
                onUpdateCanvas((prev) => {
                  const id = selectedItem.id;
                  if (isSelectedEmbed) {
                    return {
                      ...prev,
                      embeds: prev.embeds.map((em) => (em.id === id ? { ...em, isVisible: vis } : em)),
                    };
                  } else {
                    return {
                      ...prev,
                      elements: prev.elements.map((el) => (el.id === id ? { ...el, isVisible: vis } : el)),
                    };
                  }
                });
              }}
              onUpdateStyleGroup={(groupId, def) => {
                onUpdateCanvas((prev) => {
                  const updatedGroups = {
                    ...(prev.textStyleGroups || DEFAULT_TEXT_STYLE_GROUPS),
                    [groupId]: def,
                  };
                  // Also update non-overridden elements belonging to this group
                  const updatedElements = prev.elements.map((el) => {
                    const gId = el.style?.styleGroupId || resolveStyleGroup(el.type);
                    if (gId === groupId && !el.style?.hasCustomTypographyOverride) {
                      return {
                        ...el,
                        style: {
                          ...(el.style || {}),
                          fontFamily: def.fontFamily,
                          fontSize: def.fontSize,
                          fontWeight: def.fontWeight,
                          color: def.color,
                          letterSpacing: def.letterSpacing,
                          lineHeight: def.lineHeight,
                          textAlign: def.textAlign,
                          textTransform: def.textTransform,
                          textDecoration: def.textDecoration,
                        },
                      };
                    }
                    return el;
                  });

                  return {
                    ...prev,
                    textStyleGroups: updatedGroups,
                    elements: updatedElements,
                  };
                });
              }}
              onResetElementTypography={(elementId) => {
                onUpdateCanvas((prev) => {
                  const el = prev.elements.find((e) => e.id === elementId);
                  if (!el) return prev;
                  const gId = el.style?.styleGroupId || resolveStyleGroup(el.type);
                  const groups = prev.textStyleGroups || DEFAULT_TEXT_STYLE_GROUPS;
                  const def = groups[gId] || DEFAULT_TEXT_STYLE_GROUPS[gId] || DEFAULT_TEXT_STYLE_GROUPS.body;

                  return {
                    ...prev,
                    elements: prev.elements.map((e) =>
                      e.id === elementId
                        ? {
                            ...e,
                            style: {
                              ...(e.style || {}),
                              fontFamily: def.fontFamily,
                              fontSize: def.fontSize,
                              fontWeight: def.fontWeight,
                              color: def.color,
                              letterSpacing: def.letterSpacing,
                              lineHeight: def.lineHeight,
                              textAlign: def.textAlign,
                              textTransform: def.textTransform,
                              textDecoration: def.textDecoration,
                              hasCustomTypographyOverride: false,
                            },
                          }
                        : e
                    ),
                  };
                });
              }}
              onApplyGroupToMatchingElements={(groupId) => {
                onUpdateCanvas((prev) => {
                  const activeEl = prev.elements.find((e) => e.id === selectedItem.id);
                  if (!activeEl || !activeEl.style) return prev;

                  return {
                    ...prev,
                    elements: prev.elements.map((e) => {
                      const gId = e.style?.styleGroupId || resolveStyleGroup(e.type);
                      if (gId === groupId) {
                        return {
                          ...e,
                          style: {
                            ...(e.style || {}),
                            fontFamily: activeEl.style!.fontFamily,
                            fontSize: activeEl.style!.fontSize,
                            fontWeight: activeEl.style!.fontWeight,
                            color: activeEl.style!.color,
                            letterSpacing: activeEl.style!.letterSpacing,
                            lineHeight: activeEl.style!.lineHeight,
                            textAlign: activeEl.style!.textAlign,
                            textTransform: activeEl.style!.textTransform,
                            textDecoration: activeEl.style!.textDecoration,
                          },
                        };
                      }
                      return e;
                    }),
                  };
                });
              }}
              onClose={() => setIsMoreMenuOpen(false)}
            />
          )}

          {/* Dimension Tag */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 text-sky-300 text-[9px] font-bold font-mono px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1">
            <span>
              {Math.round(selectedItem.transform.width)} × {Math.round(selectedItem.transform.height)}
            </span>
            {selectedItem.transform.rotation ? (
              <span className="text-neutral-400">({selectedItem.transform.rotation}°)</span>
            ) : null}
            {isAltPressed && (
              <span className="bg-sky-500/20 text-sky-400 px-1 rounded text-[8px]">
                FINE ({modifierKey})
              </span>
            )}
          </div>

          {/* Move Drag Surface (Title bar) */}
          <div
            onPointerDown={(e) => startMove(e, selectedItem.id, isSelectedEmbed)}
            title="Click & Drag to Move"
            className="absolute inset-0 cursor-move pointer-events-auto opacity-0"
          />

          {/* Rotation Handle with Stem */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            <div
              onPointerDown={startRotate}
              title="Drag to Rotate (0-360°)"
              className="w-5 h-5 rounded-full bg-white border-2 border-sky-500 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing text-sky-600 hover:scale-110 transition-transform"
            >
              <RotateCw size={11} />
            </div>
            <div className="w-0.5 h-6 bg-sky-400" />
          </div>

          {/* 4 Corner Resize Handles */}
          <div
            onPointerDown={(e) => startResize(e, "nw")}
            title="Resize (NW)"
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "ne")}
            title="Resize (NE)"
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "se")}
            title="Resize (SE)"
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "sw")}
            title="Resize (SW)"
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />

          {/* 4 Edge Resize Handles */}
          <div
            onPointerDown={(e) => startResize(e, "n")}
            title="Resize Height (North)"
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "s")}
            title="Resize Height (South)"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "w")}
            title="Resize Width (West)"
            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => startResize(e, "e")}
            title="Resize Width (East)"
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 transition-transform"
          />
        </div>
      )}
    </div>
  );
}
