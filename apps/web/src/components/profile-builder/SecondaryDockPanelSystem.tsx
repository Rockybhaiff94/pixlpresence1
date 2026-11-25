"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  GripHorizontal,
  GripVertical,
  Layers,
  Lock,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { DockPortalTooltip, DockTooltipData } from "../studio/DockPortalTooltip";
import {
  clampAlongEdge,
  getAdaptiveDockBorderClasses,
  getAdaptiveDockCornerRadii,
  resolveDockPlacementInfo,
  snapRatiosToCornerIfNear,
} from "../studio/dockGeometry";
import {
  BuilderCanvasSettings,
  BuilderComponentType,
  BuilderDeviceMode,
  BuilderNode,
} from "./profileBuilderTypes";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AddElementsLibraryContent } from "./AddElementsModal";
import {
  DEFAULT_EDITOR_PANEL_STATE,
  EditorPanelState,
  SECONDARY_DOCK_STORAGE_KEY,
  SECONDARY_PANEL_STORAGE_KEY,
  SecondaryDockEdge,
  SecondaryDockSection,
  SecondaryDockState,
} from "./secondaryDockTypes";

interface SecondaryDockPanelSystemProps {
  hostRef: React.RefObject<HTMLDivElement | null>;
  canvas: BuilderCanvasSettings;
  nodes: BuilderNode[];
  selectedNode: BuilderNode | null;
  selectedId: string | null;
  deviceMode: BuilderDeviceMode;
  onSelect: (id: string | null) => void;
  onUpdateCanvas: (updates: Partial<BuilderCanvasSettings>) => void;
  onUpdateNode: (
    id: string,
    updates: Partial<BuilderNode>,
    options?: { skipHistory?: boolean }
  ) => void;
  onOpenMediaPicker: (callback: (url: string) => void, title: string, initialUrl?: string) => void;
  onAddGalleryImage: (galleryId: string, url?: string) => void;
  onRenameNode: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onReorderNode: (id: string, direction: "top" | "up" | "down" | "bottom") => void;
  onReparentNode: (nodeId: string, newParentId: string | null) => { ok: boolean; error?: string };
  onMoveLayerRelative: (
    draggedId: string,
    targetId: string,
    position: "before" | "after" | "inside"
  ) => { ok: boolean; error?: string };
  onInvalidDrop: (reason: string) => void;
  onAddIndependentElement: (type: BuilderComponentType) => void;
  dockState: SecondaryDockState;
  onDockStateChange: React.Dispatch<React.SetStateAction<SecondaryDockState>>;
  onOpenAddElementsModal: () => void;
}

const COMPACT_SHORT_AXIS = 44;
const COMPACT_LONG_AXIS = 166;
const MIN_SECTION_PX = 120;

const DOCK_ACTIONS: ReadonlyArray<{
  id: SecondaryDockSection;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
    {
      id: "properties",
      label: "Properties",
      desc: "Edit selected component settings & styles",
      icon: SlidersHorizontal,
    },
    {
      id: "layers",
      label: "Layers",
      desc: "Manage hierarchy, visibility & stacking order",
      icon: Layers,
    },
    {
      id: "add-elements",
      label: "Add Elements",
      desc: "Add independent components to Canvas root",
      icon: Plus,
    },
  ];

export const SecondaryDockPanelSystem: React.FC<SecondaryDockPanelSystemProps> = ({
  hostRef,
  canvas,
  nodes,
  selectedNode,
  selectedId,
  deviceMode,
  onSelect,
  onUpdateCanvas,
  onUpdateNode,
  onOpenMediaPicker,
  onAddGalleryImage,
  onRenameNode,
  onToggleVisibility,
  onToggleLock,
  onDuplicateNode,
  onDeleteNode,
  onReorderNode,
  onReparentNode,
  onMoveLayerRelative,
  onInvalidDrop,
  onAddIndependentElement,
  dockState,
  onDockStateChange,
  onOpenAddElementsModal,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const [panelState, setPanelState] = useState<EditorPanelState>(DEFAULT_EDITOR_PANEL_STATE);
  const [hostSize, setHostSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 760,
  });
  const [tooltip, setTooltip] = useState<DockTooltipData | null>(null);

  const compactDockRef = useRef<HTMLDivElement>(null);
  const panelBodyRef = useRef<HTMLDivElement>(null);
  const propsScrollRef = useRef<HTMLDivElement>(null);
  const layersScrollRef = useRef<HTMLDivElement>(null);
  const propsScrollTopRef = useRef<number>(0);
  const layersScrollTopRef = useRef<number>(0);

  // Dragging state for compact Secondary Dock
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    pos: { x: number; y: number } | null;
  }>({ isDragging: false, pos: null });
  const isPointerDownRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartPointerRef = useRef({ x: 0, y: 0 });
  const dragStartBoxPosRef = useRef({ x: 0, y: 0 });
  const latestDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedPastThresholdRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  // Divider dragging state
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const showTooltip = useCallback(
    (e: React.SyntheticEvent<HTMLElement>, data: Omit<DockTooltipData, "targetRect">) => {
      if (dragState.isDragging) return;
      const targetRect = e.currentTarget.getBoundingClientRect();
      setTooltip({ ...data, targetRect });
    },
    [dragState.isDragging]
  );

  // Measure studio workspace host bounds cleanly
  const measureHost = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) {
      setHostSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    }
  }, [hostRef]);

  useLayoutEffect(() => {
    measureHost();
  }, [measureHost]);

  useEffect(() => {
    const handleResize = () => measureHost();
    window.addEventListener("resize", handleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && hostRef.current) {
      observer = new ResizeObserver(() => measureHost());
      observer.observe(hostRef.current);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [hostRef, measureHost]);

  // Guard persistence until post-mount hydration finishes so default SSR state never overwrites localStorage
  const hasHydratedPrefsRef = useRef(false);

  // Hydrate persisted Secondary Dock & Panel state cleanly post-mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raf = window.requestAnimationFrame(() => {
      try {
        const rawDock = localStorage.getItem(SECONDARY_DOCK_STORAGE_KEY);
        if (rawDock) {
          const parsed = JSON.parse(rawDock) as Partial<SecondaryDockState>;
          onDockStateChange((prev) => ({
            ...prev,
            attachedEdge:
              parsed.attachedEdge === "left" ||
                parsed.attachedEdge === "right" ||
                parsed.attachedEdge === "top" ||
                parsed.attachedEdge === "bottom"
                ? parsed.attachedEdge
                : prev.attachedEdge,
            position:
              parsed.position &&
                typeof parsed.position.ratioX === "number" &&
                typeof parsed.position.ratioY === "number"
                ? {
                  ratioX: Math.max(0, Math.min(1, parsed.position.ratioX)),
                  ratioY: Math.max(0, Math.min(1, parsed.position.ratioY)),
                }
                : prev.position,
            isLocked: typeof parsed.isLocked === "boolean" ? parsed.isLocked : prev.isLocked,
            activeSection:
              parsed.activeSection === "properties" ||
                parsed.activeSection === "layers" ||
                parsed.activeSection === "add-elements"
                ? parsed.activeSection
                : prev.activeSection,
            isPanelOpen: false,
          }));
        }

        const rawPanel = localStorage.getItem(SECONDARY_PANEL_STORAGE_KEY);
        if (rawPanel) {
          const parsedPanel = JSON.parse(rawPanel) as Partial<EditorPanelState>;
          setPanelState((prev) => ({
            ...prev,
            propertiesExpanded:
              typeof parsedPanel.propertiesExpanded === "boolean"
                ? parsedPanel.propertiesExpanded
                : prev.propertiesExpanded,
            layersExpanded:
              typeof parsedPanel.layersExpanded === "boolean"
                ? parsedPanel.layersExpanded
                : prev.layersExpanded,
            dividerRatio:
              typeof parsedPanel.dividerRatio === "number"
                ? Math.max(0.2, Math.min(0.8, parsedPanel.dividerRatio))
                : prev.dividerRatio,
          }));
        }
      } catch {
        // Ignore corrupted preference storage safely
      } finally {
        hasHydratedPrefsRef.current = true;
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [onDockStateChange]);

  // Persist dock UI state separately from public profile document
  useEffect(() => {
    if (!hasHydratedPrefsRef.current) return;
    try {
      localStorage.setItem(
        SECONDARY_DOCK_STORAGE_KEY,
        JSON.stringify({
          attachedEdge: dockState.attachedEdge,
          position: dockState.position,
          isLocked: dockState.isLocked,
          activeSection: dockState.activeSection,
        })
      );
    } catch { }
  }, [
    dockState.attachedEdge,
    dockState.position,
    dockState.isLocked,
    dockState.activeSection,
  ]);

  useEffect(() => {
    if (!hasHydratedPrefsRef.current) return;
    try {
      localStorage.setItem(
        SECONDARY_PANEL_STORAGE_KEY,
        JSON.stringify({
          propertiesExpanded: panelState.propertiesExpanded,
          layersExpanded: panelState.layersExpanded,
          dividerRatio: panelState.dividerRatio,
        })
      );
    } catch { }
  }, [panelState.propertiesExpanded, panelState.layersExpanded, panelState.dividerRatio]);

  // Preserve independent scroll offsets across re-renders / section toggles
  useLayoutEffect(() => {
    const propsInner = propsScrollRef.current?.firstElementChild as HTMLElement | null;
    if (propsInner && propsScrollTopRef.current > 0) {
      propsInner.scrollTop = propsScrollTopRef.current;
    }
    const layersInner = layersScrollRef.current?.querySelector(
      ".overflow-y-auto"
    ) as HTMLElement | null;
    if (layersInner && layersScrollTopRef.current > 0) {
      layersInner.scrollTop = layersScrollTopRef.current;
    }
  }, [
    dockState.isPanelOpen,
    dockState.activeSection,
    panelState.propertiesExpanded,
    panelState.layersExpanded,
    selectedId,
  ]);

  // Alt+L keyboard lock toggle (isolated from Main Dock's CapsLock shortcut)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        onDockStateChange((prev) => ({ ...prev, isLocked: !prev.isLocked }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDockStateChange]);

  // Compute Compact Dock dimensions & snapped coordinates (flush edge/corner attachment with zero gaps)
  const isVertical = dockState.attachedEdge === "left" || dockState.attachedEdge === "right";
  const dockWidth = isVertical
    ? COMPACT_SHORT_AXIS
    : Math.min(Math.max(120, hostSize.width), COMPACT_LONG_AXIS);
  const dockHeight = isVertical
    ? Math.min(Math.max(120, hostSize.height), COMPACT_LONG_AXIS)
    : COMPACT_SHORT_AXIS;

  const getCompactRect = () => {
    const maxX = Math.max(0, hostSize.width - dockWidth);
    const maxY = Math.max(0, hostSize.height - dockHeight);
    const axisLeft = clampAlongEdge(dockState.position.ratioX, maxX);
    const axisTop = clampAlongEdge(dockState.position.ratioY, maxY);

    switch (dockState.attachedEdge) {
      case "left":
        return { left: 0, top: axisTop, width: dockWidth, height: dockHeight };
      case "right":
        return { left: maxX, top: axisTop, width: dockWidth, height: dockHeight };
      case "top":
        return { left: axisLeft, top: 0, width: dockWidth, height: dockHeight };
      case "bottom":
        return { left: axisLeft, top: maxY, width: dockWidth, height: dockHeight };
    }
  };

  const compactRect = getCompactRect();

// Compact Dock Drag & Edge-Snap Handlers
const clearSuppressTimer = useCallback(() => {
  if (suppressTimerRef.current !== null) {
    window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = null;
  }
}, []);

const finishDockDrag = useCallback(
  (didDrag: boolean, pointerId?: number) => {
    isPointerDownRef.current = false;
    activePointerIdRef.current = null;
    hasMovedPastThresholdRef.current = false;

    if (pointerId !== undefined && compactDockRef.current) {
      try {
        if (compactDockRef.current.hasPointerCapture?.(pointerId)) {
          compactDockRef.current.releasePointerCapture(pointerId);
        }
      } catch { }
    }

    if (didDrag && hostRef.current) {
      clearSuppressTimer();
      suppressNextClickRef.current = true;
      suppressTimerRef.current = window.setTimeout(() => {
        suppressNextClickRef.current = false;
        suppressTimerRef.current = null;
      }, 80);

      const hostRect = hostRef.current.getBoundingClientRect();
      const boxW = compactDockRef.current?.offsetWidth || dockWidth;
      const boxH = compactDockRef.current?.offsetHeight || dockHeight;
      const rel = latestDragPosRef.current;
      latestDragPosRef.current = null;

      const curLeft = rel ? rel.x : compactRect.left;
      const curTop = rel ? rel.y : compactRect.top;

      // Distances to all 4 host edges (center-weighted for intuitive snap)
      const distLeft = Math.abs(curLeft);
      const distRight = Math.abs(hostRect.width - (curLeft + boxW));
      const distTop = Math.abs(curTop);
      const distBottom = Math.abs(hostRect.height - (curTop + boxH));
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      let nextEdge: SecondaryDockEdge = dockState.attachedEdge;
      if (minDist === distLeft) nextEdge = "left";
      else if (minDist === distRight) nextEdge = "right";
      else if (minDist === distTop) nextEdge = "top";
      else nextEdge = "bottom";

      const { ratioX: nextRatioX, ratioY: nextRatioY } = snapRatiosToCornerIfNear(
        curLeft,
        curTop,
        boxW,
        boxH,
        hostRect.width,
        hostRect.height,
        nextEdge
      );

      setDragState({ isDragging: false, pos: null });
      onDockStateChange((prev) => ({
        ...prev,
        attachedEdge: nextEdge,
        position: { ratioX: nextRatioX, ratioY: nextRatioY },
      }));
    } else {
      latestDragPosRef.current = null;
      setDragState({ isDragging: false, pos: null });
    }
  },
  [
    clearSuppressTimer,
    compactRect.left,
    compactRect.top,
    dockHeight,
    dockState.attachedEdge,
    dockWidth,
    hostRef,
    onDockStateChange,
  ]
);

const processDockPointerMove = useCallback(
  (clientX: number, clientY: number, pointerId: number) => {
    if (!isPointerDownRef.current || dockState.isLocked || dockState.isPanelOpen) return;
    if (activePointerIdRef.current !== null && pointerId !== activePointerIdRef.current) return;
    if (!hostRef.current) return;

    const dx = clientX - dragStartPointerRef.current.x;
    const dy = clientY - dragStartPointerRef.current.y;
    if (!hasMovedPastThresholdRef.current && Math.hypot(dx, dy) < 5) {
      return;
    }

    if (!hasMovedPastThresholdRef.current) {
      hasMovedPastThresholdRef.current = true;
      hideTooltip();
      try {
        compactDockRef.current?.setPointerCapture?.(pointerId);
      } catch { }
    }

    const hostRect = hostRef.current.getBoundingClientRect();
    const boxW = compactDockRef.current?.offsetWidth || dockWidth;
    const boxH = compactDockRef.current?.offsetHeight || dockHeight;
    const clampedX = Math.max(0, Math.min(hostRect.width - boxW, dragStartBoxPosRef.current.x + dx));
    const clampedY = Math.max(0, Math.min(hostRect.height - boxH, dragStartBoxPosRef.current.y + dy));

    const nextPos = { x: clampedX, y: clampedY };
    latestDragPosRef.current = nextPos;
    setDragState({ isDragging: true, pos: nextPos });
  },
  [dockHeight, dockState.isLocked, dockState.isPanelOpen, dockWidth, hideTooltip, hostRef]
);

useEffect(() => {
  const onMove = (e: PointerEvent) => processDockPointerMove(e.clientX, e.clientY, e.pointerId);
  const onUp = (e: PointerEvent) => {
    if (!isPointerDownRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    finishDockDrag(hasMovedPastThresholdRef.current, e.pointerId);
  };
  const onCancel = (e: PointerEvent) => {
    if (!isPointerDownRef.current) return;
    finishDockDrag(false, e.pointerId);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  };
}, [finishDockDrag, processDockPointerMove]);

useEffect(() => {
  return () => clearSuppressTimer();
}, [clearSuppressTimer]);

const handleDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  clearSuppressTimer();
  suppressNextClickRef.current = false;
  hasMovedPastThresholdRef.current = false;

  if (dockState.isLocked || dockState.isPanelOpen) return;
  const target = e.target as HTMLElement;
  if (!target.closest('[data-secondary-dock-move-handle="true"]')) return;
  if (!compactDockRef.current || !hostRef.current) return;

  const dockRect = compactDockRef.current.getBoundingClientRect();
  const hostRect = hostRef.current.getBoundingClientRect();

  dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
  dragStartBoxPosRef.current = {
    x: dockRect.left - hostRect.left,
    y: dockRect.top - hostRect.top,
  };
  latestDragPosRef.current = null;
  activePointerIdRef.current = e.pointerId;
  isPointerDownRef.current = true;
};

// Draggable Divider pointer handling (Properties vs Layers)
useEffect(() => {
  if (!isDraggingDivider) return;

  const handleMove = (e: PointerEvent) => {
    if (!panelBodyRef.current) return;
    const bodyRect = panelBodyRef.current.getBoundingClientRect();
    // Account for ~64px total across two collapsed section headers + 8px divider
    const usableHeight = Math.max(MIN_SECTION_PX * 2, bodyRect.height - 72);
    const rawOffset = e.clientY - bodyRect.top - 32;
    const minBound = Math.min(MIN_SECTION_PX, usableHeight * 0.35);
    const maxBound = usableHeight - minBound;
    const clamped = Math.max(minBound, Math.min(maxBound, rawOffset));
    const nextRatio = Math.max(0.18, Math.min(0.82, clamped / usableHeight));
    setPanelState((prev) => ({ ...prev, dividerRatio: nextRatio }));
  };

  const handleUp = () => {
    setIsDraggingDivider(false);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
  window.addEventListener("pointercancel", handleUp);
  return () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);
  };
}, [isDraggingDivider]);

const handleOpenSectionFromDock = (section: SecondaryDockSection) => {
  hideTooltip();
  onDockStateChange((prev) => ({
    ...prev,
    isPanelOpen: true,
    activeSection: section,
  }));
  if (section === "properties") {
    setPanelState((prev) => ({ ...prev, propertiesExpanded: true }));
  } else if (section === "layers") {
    setPanelState((prev) => ({ ...prev, layersExpanded: true }));
  } else if (section === "add-elements") {
    onOpenAddElementsModal();
  }
};

const handleSelectTabInPanel = (section: SecondaryDockSection) => {
  onDockStateChange((prev) => ({ ...prev, activeSection: section }));
  if (section === "properties") {
    setPanelState((prev) => ({ ...prev, propertiesExpanded: true }));
  } else if (section === "layers") {
    setPanelState((prev) => ({ ...prev, layersExpanded: true }));
  } else if (section === "add-elements") {
    onOpenAddElementsModal();
  }
};

const handleClosePanel = () => {
  hideTooltip();
  onDockStateChange((prev) => ({ ...prev, isPanelOpen: false }));
};

const compactPlacement = resolveDockPlacementInfo(
  compactRect,
  hostSize,
  dockState.attachedEdge,
  dragState.isDragging
);

const getCornerRadii = () => getAdaptiveDockCornerRadii(compactPlacement, 14);

const getBorderClasses = () =>
  getAdaptiveDockBorderClasses(compactPlacement, dragState.isDragging);

const panelPositionClasses = (() => {
  switch (dockState.attachedEdge) {
    case "left":
      return "absolute inset-y-0 left-0 lg:static lg:order-first w-[min(18rem,100%)] sm:w-80 shrink-0 h-full border-r border-[#1f1f27] z-[35]";
    case "right":
      return "absolute inset-y-0 right-0 lg:static lg:order-last w-[min(18rem,100%)] sm:w-80 shrink-0 h-full border-l border-[#1f1f27] z-[35]";
    case "top":
      return "absolute top-0 inset-x-3 sm:inset-x-6 mx-auto max-w-2xl h-[68%] max-h-[480px] min-h-[260px] rounded-b-xl border border-t-0 border-[#252530] z-[35]";
    case "bottom":
      return "absolute bottom-0 inset-x-3 sm:inset-x-6 mx-auto max-w-2xl h-[68%] max-h-[480px] min-h-[260px] rounded-t-xl border border-b-0 border-[#252530] z-[35]";
  }
})();

const panelMotionInitial = (() => {
  if (prefersReducedMotion) return { opacity: 1 };
  switch (dockState.attachedEdge) {
    case "left":
      return { opacity: 0, x: -28 };
    case "right":
      return { opacity: 0, x: 28 };
    case "top":
      return { opacity: 0, y: -24 };
    case "bottom":
      return { opacity: 0, y: 24 };
  }
})();

const panelMotionExit = (() => {
  if (prefersReducedMotion) return { opacity: 0, transition: { duration: 0.01 } };
  const exitTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
  switch (dockState.attachedEdge) {
    case "left":
      return { opacity: 0, x: -24, transition: exitTransition };
    case "right":
      return { opacity: 0, x: 24, transition: exitTransition };
    case "top":
      return { opacity: 0, y: -20, transition: exitTransition };
    case "bottom":
      return { opacity: 0, y: 20, transition: exitTransition };
  }
})();

const dockTargetGeometry =
  dragState.isDragging && dragState.pos
    ? {
      left: dragState.pos.x,
      top: dragState.pos.y,
      width: dockWidth,
      height: dockHeight,
      opacity: 1,
      ...getCornerRadii(),
    }
    : {
      left: compactRect.left,
      top: compactRect.top,
      width: dockWidth,
      height: dockHeight,
      opacity: 1,
      ...getCornerRadii(),
    };

const selectedLabel = selectedNode
  ? selectedNode.type.toUpperCase()
  : "CANVAS";

const splitBothOpen = panelState.propertiesExpanded && panelState.layersExpanded;
const propsPercent = Math.round(panelState.dividerRatio * 1000) / 10;

return (
  <>
    {/* STATE A: Compact 3-Option Secondary Dock */}
    <AnimatePresence mode="wait" initial={false}>
      {!dockState.isPanelOpen && (
        <motion.div
          key="secondary-compact-dock"
          ref={compactDockRef}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={dockTargetGeometry}
          exit={
            prefersReducedMotion
              ? { opacity: 0, transition: { duration: 0.01 } }
              : { opacity: 0, transition: { duration: 0.12 } }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : dragState.isDragging
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
          }
      style={{
        position: "absolute",
        right: "auto",
        bottom: "auto",
        zIndex: dragState.isDragging ? 52 : 42,
        touchAction: "none",
      }}
      onPointerDownCapture={() => {
        clearSuppressTimer();
        suppressNextClickRef.current = false;
      }}
      onPointerDown={handleDockPointerDown}
      onClickCapture={(e) => {
        if (suppressNextClickRef.current) {
          clearSuppressTimer();
          suppressNextClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      className={`select-none font-mono pointer-events-auto ${dragState.isDragging ? "cursor-grabbing" : ""
        }`}
      data-testid="secondary-floating-dock"
      data-dock-edge={dockState.attachedEdge}
      data-dock-corner={compactPlacement.corner}
      data-dock-orientation={isVertical ? "vertical" : "horizontal"}
      data-dock-locked={dockState.isLocked}
          >
      <div
        className={`bg-[#09090d]/95 backdrop-blur-xl flex ${isVertical ? "flex-col py-1.5 px-1" : "flex-row px-1.5 py-1"
          } items-center justify-center w-full h-full gap-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.75)] ${getBorderClasses()}`}
        style={{ borderRadius: "inherit" }}
      >
        {/* Move & Lock Handle */}
        <button
          type="button"
          data-secondary-dock-move-handle="true"
          onClick={() => {
            hideTooltip();
            onDockStateChange((prev) => ({ ...prev, isLocked: !prev.isLocked }));
          }}
          onMouseEnter={(e) =>
            showTooltip(e, {
              id: "secondary-dock-lock",
              label: dockState.isLocked ? "Secondary Dock Locked" : "Move Secondary Dock",
              desc: dockState.isLocked
                ? "Click or press [Alt+L] to unlock movement."
                : "Drag to snap to any edge. Click or press [Alt+L] to lock.",
              hotkey: "Alt+L",
            })
          }
          onMouseLeave={hideTooltip}
          className={`flex items-center justify-center shrink-0 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer ${dockState.isLocked
            ? "text-amber-400 hover:text-amber-300"
            : "text-neutral-500 hover:text-neutral-200 cursor-grab active:cursor-grabbing"
            } ${isVertical ? "w-8 h-4" : "w-4 h-8"}`}
          aria-label={dockState.isLocked ? "Unlock secondary dock" : "Move or lock secondary dock"}
          aria-pressed={dockState.isLocked}
          data-testid="secondary-dock-handle"
        >
          {dockState.isLocked ? (
            <Lock size={12} />
          ) : isVertical ? (
            <GripHorizontal size={13} />
          ) : (
            <GripVertical size={13} />
          )}
        </button>

        {/* Exactly 3 Options: Properties | Layers | Add Elements */}
        {DOCK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isActive = dockState.activeSection === action.id;
          return (
            <button
              key={action.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSectionFromDock(action.id);
              }}
              onMouseEnter={(e) =>
                showTooltip(e, {
                  id: `secondary-dock-${action.id}`,
                  label: action.label,
                  desc: action.desc,
                })
              }
              onMouseLeave={hideTooltip}
              onFocus={(e) =>
                showTooltip(e, {
                  id: `secondary-dock-${action.id}`,
                  label: action.label,
                  desc: action.desc,
                })
              }
              onBlur={hideTooltip}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 relative shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                isActive
                  ? "bg-[#858585] text-[#FFFFFF] border border-[#FFFFFF]"
                  : "bg-transparent text-[#FFFFFF] hover:bg-white/10 border border-transparent"
              }`}
              aria-label={action.label}
                    aria-pressed={isActive}
                    aria-expanded={false}
                    data-active={isActive}
                    data-testid={`secondary-dock-btn-${action.id}`}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATE B: Unified Side Panel */}
      <AnimatePresence mode="wait" initial={false}>
        {dockState.isPanelOpen && (
          <motion.aside
            key={`secondary-unified-panel-${dockState.attachedEdge}`}
            initial={panelMotionInitial}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              transition: prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            }}
            exit={panelMotionExit}
            className={`${panelPositionClasses} bg-[#09090d] flex flex-col overflow-hidden font-mono shadow-2xl ${
              isDraggingDivider ? "select-none" : ""
            }`}
            aria-label="Secondary Editor Panel"
            data-testid="secondary-unified-panel"
            data-panel-edge={dockState.attachedEdge}
            data-active-section={dockState.activeSection}
          >
            {/* Panel Header with 3 Unified Tabs + Close X */}
            <div className="px-2 pt-2 pb-1.5 border-b border-[#191922] bg-[#0b0b0f] shrink-0 space-y-1.5">
              <div className="flex items-center gap-1 min-w-0">
                <div
                  role="tablist"
                  aria-label="Secondary panel sections"
                  className="flex-1 min-w-0 grid grid-cols-3 gap-1 bg-[#121218] p-1 rounded-lg border border-[#1f1f29]"
                >
                  {DOCK_ACTIONS.map((tab) => {
                    const isActive = dockState.activeSection === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        onClick={() => handleSelectTabInPanel(tab.id)}
                        className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition-colors duration-200 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                          isActive
                            ? "bg-[#858585] text-[#FFFFFF] border border-[#FFFFFF] shadow-sm"
                            : "bg-transparent text-[#FFFFFF]/80 hover:text-[#FFFFFF] hover:bg-white/10 border border-transparent"
                        }`}
        aria-selected={isActive}
        data-active={isActive}
        data-testid={`unified-tab-${tab.id}`}
                      >
        {tab.label}
      </button>
      );
                  })}
    </div>

    <button
      type="button"
      onClick={handleClosePanel}
      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      title="Close panel & restore dock"
      aria-label="Close Secondary Panel"
      data-testid="unified-panel-close"
    >
      <X size={14} />
    </button>
  </div >

    {/* Compact Technical Status Bar */ }
    < div className = "px-1 flex items-center justify-between text-[10px]" >
                <span className="text-neutral-400 truncate">
                  {dockState.activeSection === "add-elements"
                    ? "Independent Canvas Elements"
                    : selectedNode
                      ? selectedNode.name
                      : `Canvas (${canvas.width} × ${canvas.height})`}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#14141b] border border-[#24242f] text-[9px] text-neutral-300 uppercase tracking-wider shrink-0">
                  {dockState.activeSection === "add-elements" ? "ROOT" : selectedLabel}
                </span>
              </div >
            </div >

  {/* Panel Body */ }
{
  dockState.activeSection === "add-elements" ? (
    <div className="flex-1 min-h-0 flex flex-col" data-testid="unified-add-elements-view">
      <div className="px-3 py-2 border-b border-[#17171f] bg-[#0b0b10] flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-neutral-400">
          Adds outside Main Embed
        </span>
        <button
          type="button"
          onClick={onOpenAddElementsModal}
          className="px-2 py-1 rounded bg-[#15151d] hover:bg-[#1e1e29] border border-[#2a2a36] text-[10px] text-white cursor-pointer"
          data-testid="open-add-elements-window-btn"
        >
          Center Window
        </button>
      </div>
      <AddElementsLibraryContent
        compact
        onSelectComponent={onAddIndependentElement}
        searchTestId="unified-add-elements-search"
        itemTestIdPrefix="panel-add"
      />
    </div>
  ) : (
    <div
      ref={panelBodyRef}
      className="flex-1 min-h-0 flex flex-col overflow-hidden"
      data-testid="unified-split-body"
    >
      {/* Section 1: Expandable Properties */}
      <div
        className={`flex flex-col min-h-0 ${panelState.propertiesExpanded
          ? splitBothOpen
            ? ""
            : "flex-1"
          : "shrink-0"
          }`}
        style={
          panelState.propertiesExpanded && splitBothOpen
            ? { flex: `0 0 ${propsPercent}%`, minHeight: `${MIN_SECTION_PX}px` }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() =>
            setPanelState((prev) => ({
              ...prev,
              propertiesExpanded: !prev.propertiesExpanded,
            }))
          }
          className={`w-full px-3 py-1.5 border-b border-[#181820] flex items-center justify-between text-[11px] font-bold shrink-0 cursor-pointer transition-colors ${dockState.activeSection === "properties"
            ? "bg-[#111117] text-white"
            : "bg-[#0c0c11] text-neutral-300 hover:text-white"
            }`}
          aria-expanded={panelState.propertiesExpanded}
          data-testid="section-toggle-properties"
        >
          <span className="flex items-center gap-1.5">
            {panelState.propertiesExpanded ? (
              <ChevronDown size={12} className="text-neutral-400" />
            ) : (
              <ChevronRight size={12} className="text-neutral-400" />
            )}
            <SlidersHorizontal size={12} className="text-white" />
            <span>Properties</span>
          </span>
          <span className="text-[9px] text-neutral-500 uppercase">{selectedLabel}</span>
        </button>

        {panelState.propertiesExpanded && (
          <div
            ref={propsScrollRef}
            onScrollCapture={(e) => {
              const target = e.target as HTMLElement | null;
              if (target) propsScrollTopRef.current = target.scrollTop;
            }}
            className="flex-1 min-h-0 overflow-hidden"
            data-testid="unified-section-properties"
          >
            <PropertiesPanel
              canvas={canvas}
              selectedNode={selectedNode}
              deviceMode={deviceMode}
              onUpdateCanvas={onUpdateCanvas}
              onUpdateNode={onUpdateNode}
              onOpenMediaPicker={onOpenMediaPicker}
              onAddGalleryImage={onAddGalleryImage}
            />
          </div>
        )}
      </div>

      {/* Draggable Horizontal Divider between Properties and Layers */}
      {splitBothOpen && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize Properties and Layers sections"
          aria-valuenow={Math.round(panelState.dividerRatio * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingDivider(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setPanelState((prev) => ({
                ...prev,
                dividerRatio: Math.max(0.2, prev.dividerRatio - 0.05),
              }));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setPanelState((prev) => ({
                ...prev,
                dividerRatio: Math.min(0.8, prev.dividerRatio + 0.05),
              }));
            }
          }}
          className={`h-2 shrink-0 border-y border-[#1e1e28] flex items-center justify-center cursor-row-resize group transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 ${
            isDraggingDivider ? "bg-[#1a1a24]" : "bg-[#0d0d13] hover:bg-[#16161f]"
          }`}
          data-testid="secondary-panel-divider"
        >
          <div
            className={`w-9 h-0.5 rounded-full transition-colors ${
              isDraggingDivider
                ? "bg-white"
                : "bg-white/25 group-hover:bg-white/80"
            }`}
          />
    </div>
  )
}

{/* Section 2: Expandable Layers */ }
<div
  className={`flex flex-col min-h-0 ${panelState.layersExpanded ? "flex-1" : "shrink-0"
    }`}
  style={
    panelState.layersExpanded && splitBothOpen
      ? { minHeight: `${MIN_SECTION_PX}px` }
      : undefined
  }
>
  <button
    type="button"
    onClick={() =>
      setPanelState((prev) => ({
        ...prev,
        layersExpanded: !prev.layersExpanded,
      }))
    }
    className={`w-full px-3 py-1.5 border-b border-[#181820] flex items-center justify-between text-[11px] font-bold shrink-0 cursor-pointer transition-colors ${dockState.activeSection === "layers"
      ? "bg-[#111117] text-white"
      : "bg-[#0c0c11] text-neutral-300 hover:text-white"
      }`}
    aria-expanded={panelState.layersExpanded}
    data-testid="section-toggle-layers"
  >
    <span className="flex items-center gap-1.5">
      {panelState.layersExpanded ? (
        <ChevronDown size={12} className="text-neutral-400" />
      ) : (
        <ChevronRight size={12} className="text-neutral-400" />
      )}
      <Layers size={12} className="text-white" />
      <span>Layers</span>
    </span>
    <span className="text-[9px] text-neutral-500">{nodes.length}</span>
  </button>

  {panelState.layersExpanded && (
    <div
      ref={layersScrollRef}
      onScrollCapture={(e) => {
        const target = e.target as HTMLElement | null;
        if (target) layersScrollTopRef.current = target.scrollTop;
      }}
      className="flex-1 min-h-0 overflow-hidden"
      data-testid="unified-section-layers"
    >
      <LayersPanel
        canvas={canvas}
        nodes={nodes}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelect(id);
          onDockStateChange((prev) => ({
            ...prev,
            activeSection: "properties",
          }));
          setPanelState((prev) => ({ ...prev, propertiesExpanded: true }));
        }}
        onRenameNode={onRenameNode}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onDuplicateNode={onDuplicateNode}
        onDeleteNode={onDeleteNode}
        onReorderNode={onReorderNode}
        onReparentNode={onReparentNode}
        onMoveLayerRelative={onMoveLayerRelative}
        onInvalidDrop={onInvalidDrop}
      />
    </div>
  )}
</div>
              </div >
            )}
          </motion.aside >
        )}
      </AnimatePresence >

  {/* Collision-Aware Portaled Tooltip for Compact Dock */ }
  < DockPortalTooltip
tooltip = { dockState.isPanelOpen ? null : tooltip }
dockEdge = { dockState.attachedEdge }
  />
    </>
  );
};
