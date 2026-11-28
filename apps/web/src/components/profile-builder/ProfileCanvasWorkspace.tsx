"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  GripVertical,
  Hand,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Scan,
  Trash2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { calculateSmartSnap } from "@/components/studio/smartAlignment";
import {
  BuilderCanvasSettings,
  BuilderComponentType,
  BuilderDeviceMode,
  BuilderGradientLayer,
  BuilderNode,
  ProfileBuilderDocument,
} from "./profileBuilderTypes";
import {
  angleFromNormalizedVector,
  getGradientDirectionPoints,
  normalizeGradientLayers,
} from "./gradientUtils";
import {
  LIBRARY_CATALOG_ORDER,
  PROFILE_BUILDER_REGISTRY,
  collectDescendantsCount,
  getAbsoluteNodeRect,
  isContainerType,
} from "./componentRegistry";
import {
  ProfileBuilderRenderer,
  ProfileLiveActivityData,
} from "./ProfileBuilderRenderer";
import { applyContainerResize, clampNodeToParent } from "./boundaryConstraints";
import { getBuilderComponentIcon } from "./AddElementPanel";
import { RPC_CHILD_COMPONENT_TYPES, isNodeRestrictedRpcForFree } from "./rpcTemplates";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ProfileCanvasWorkspaceProps {
  document: ProfileBuilderDocument;
  deviceMode: BuilderDeviceMode;
  selectedId: string | null;
  isPremiumOrAdmin?: boolean;
  isAdmin?: boolean;
  liveData?: ProfileLiveActivityData;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelect: (id: string | null) => void;
  onUpdateNode: (
    id: string,
    updates: Partial<BuilderNode>,
    options?: { skipHistory?: boolean }
  ) => void;
  onReplaceNodes?: (
    nextNodes: BuilderNode[],
    options?: { skipHistory?: boolean }
  ) => void;
  onCommitHistory: () => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onInsertChild: (
    parentId: string,
    type: BuilderComponentType,
    extra?: Partial<BuilderNode>
  ) => void;
  onDropComponent: (
    type: BuilderComponentType,
    targetParentId: string | null,
    x?: number,
    y?: number
  ) => void;
  onQuickAddGalleryImage: (galleryId: string) => void;
  onOpenLivePreview?: () => void;
  onUpdateCanvas?: (updates: Partial<BuilderCanvasSettings>) => void;
  activeGradientLayerId?: string | null;
  onSelectGradientLayer?: (layerId: string | null) => void;
  activeGradientTarget?: "background" | "text" | "image-overlay";
}

export const ProfileCanvasWorkspace: React.FC<ProfileCanvasWorkspaceProps> = ({
  document: doc,
  deviceMode,
  selectedId,
  isPremiumOrAdmin = false,
  isAdmin = false,
  liveData,
  zoom,
  onZoomChange,
  onSelect,
  onUpdateNode,
  onReplaceNodes,
  onCommitHistory,
  onDuplicateNode,
  onDeleteNode,
  onInsertChild,
  onDropComponent,
  onQuickAddGalleryImage,
  onOpenLivePreview,
  onUpdateCanvas,
  activeGradientLayerId,
  onSelectGradientLayer,
  activeGradientTarget = "background",
}) => {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);

  const [workspaceSize, setWorkspaceSize] = useState({ width: 800, height: 600 });
  const [toolbarSize, setToolbarSize] = useState({ width: 0, height: 34 });
  const [gradientDrag, setGradientDrag] = useState<{
    mode: "start" | "end" | "move";
    field: "canvas" | "styleBg" | "text" | "imageOverlay";
    nodeId?: string;
    layerId: string;
    rect: { x: number; y: number; width: number; height: number };
    layers: BuilderGradientLayer[];
    origStartX: number;
    origStartY: number;
    origEndX: number;
    origEndY: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialNode, setInitialNode] = useState<BuilderNode | null>(null);
  const [initialNodes, setInitialNodes] = useState<BuilderNode[] | null>(null);
  const didMutateRef = useRef(false);
  const suppressNextDeselectRef = useRef(false);

  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(selectedId);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (isAddPopoverOpen) setIsAddPopoverOpen(false);
  }

  const measureWorkspace = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return;
    setWorkspaceSize((prev) =>
      prev.width === el.clientWidth && prev.height === el.clientHeight
        ? prev
        : { width: el.clientWidth, height: el.clientHeight }
    );
  }, []);

  useLayoutEffect(() => {
    measureWorkspace();
  }, [measureWorkspace]);

  useEffect(() => {
    const handleResize = () => measureWorkspace();
    window.addEventListener("resize", handleResize);
    let ro: ResizeObserver | null = null;
    if (workspaceRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measureWorkspace());
      ro.observe(workspaceRef.current);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      ro?.disconnect();
    };
  }, [measureWorkspace]);

  const effectiveCanvasWidth =
    deviceMode === "mobile"
      ? Math.min(390, doc.canvas.width)
      : deviceMode === "tablet"
        ? Math.min(768, doc.canvas.width)
        : doc.canvas.width;
  const effectiveCanvasHeight =
    deviceMode === "mobile"
      ? Math.max(doc.canvas.height, 740)
      : deviceMode === "tablet"
        ? Math.max(doc.canvas.height, 680)
        : doc.canvas.height;

  const handleFitToCanvas = useCallback(() => {
    const padX = 48;
    const padY = 48;
    const wRatio = (workspaceSize.width - padX) / Math.max(320, effectiveCanvasWidth);
    const hRatio = (workspaceSize.height - padY) / Math.max(320, effectiveCanvasHeight);
    const best = Math.max(0.2, Math.min(1.2, Number(Math.min(wRatio, hRatio).toFixed(2))));
    onZoomChange(best);
    setPan({ x: 0, y: 0 });
  }, [effectiveCanvasHeight, effectiveCanvasWidth, onZoomChange, workspaceSize]);

  // Initial viewport scaling & responsive device fit so full canvas remains centered without clipping
  const didInitialFitRef = useRef(false);
  const lastDeviceModeRef = useRef<BuilderDeviceMode>(deviceMode);
  useEffect(() => {
    const modeChanged = lastDeviceModeRef.current !== deviceMode;
    if ((!didInitialFitRef.current || modeChanged) && workspaceSize.width > 120 && workspaceSize.height > 120) {
      didInitialFitRef.current = true;
      lastDeviceModeRef.current = deviceMode;
      const raf = window.requestAnimationFrame(() => {
        const padX = 36;
        const padY = 36;
        const wRatio = (workspaceSize.width - padX) / Math.max(320, effectiveCanvasWidth);
        const hRatio = (workspaceSize.height - padY) / Math.max(320, effectiveCanvasHeight);
        const initialZoom = Math.max(0.32, Math.min(1.0, Number(Math.min(wRatio, hRatio).toFixed(2))));
        onZoomChange(initialZoom);
        setPan({ x: 0, y: 0 });
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [deviceMode, effectiveCanvasHeight, effectiveCanvasWidth, onZoomChange, workspaceSize.height, workspaceSize.width]);

  const selectedNode = doc.nodes.find((n) => n.id === selectedId) || null;

  const isAncestorLocked = useCallback(
    (node: BuilderNode): boolean => {
      let cur = node.parentId;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const p = doc.nodes.find((n) => n.id === cur);
        if (!p) break;
        if (p.locked) return true;
        cur = p.parentId;
      }
      return false;
    },
    [doc.nodes]
  );

  // Space-to-pan & keyboard shortcuts
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
      if (e.code === "Space") {
        setSpacePressed(true);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNode && !selectedNode.locked && !isAncestorLocked(selectedNode) && selectedNode.type !== "background") {
          e.preventDefault();
          onDeleteNode(selectedNode.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedNode && selectedNode.type !== "background") {
          e.preventDefault();
          onDuplicateNode(selectedNode.id);
        }
      } else if (
        selectedNode &&
        !selectedNode.locked &&
        !isAncestorLocked(selectedNode) &&
        selectedNode.type !== "background" &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        onUpdateNode(selectedNode.id, {
          x: selectedNode.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
          y: selectedNode.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePressed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isAncestorLocked, onDeleteNode, onDuplicateNode, onUpdateNode, selectedNode]);

  // Pointer Move Transaction
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (isPanning) {
        setPan({
          x: Math.round(panStart.x + (e.clientX - dragStart.x)),
          y: Math.round(panStart.y + (e.clientY - dragStart.y)),
        });
        return;
      }

      if (!selectedNode || !initialNode || selectedNode.locked || isAncestorLocked(selectedNode)) {
        return;
      }

      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      if (isDragging) {
        const candX = Math.round(initialNode.x + deltaX);
        const candY = Math.round(initialNode.y + deltaY);
        const parentNode = initialNode.parentId
          ? doc.nodes.find((n) => n.id === initialNode.parentId) || null
          : null;

        const bounds = parentNode
          ? { width: parentNode.width, height: parentNode.height }
          : { width: effectiveCanvasWidth, height: effectiveCanvasHeight };

        let finalX = candX;
        let finalY = candY;

        if (doc.preferences.snapEnabled || doc.preferences.smartGuides) {
          const siblingTransforms = doc.nodes
            .filter(
              (n) =>
                n.id !== initialNode.id &&
                n.visible &&
                n.type !== "background" &&
                (n.parentId || null) === (initialNode.parentId || null)
            )
            .map((s) => ({
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
              rotation: s.rotation || 0,
              zIndex: s.zIndex,
            }));

          const snap = calculateSmartSnap(
            {
              x: candX,
              y: candY,
              width: initialNode.width,
              height: initialNode.height,
              rotation: initialNode.rotation || 0,
              zIndex: initialNode.zIndex,
            },
            siblingTransforms,
            bounds,
            {
              showGrid: doc.preferences.showGrid,
              gridSize: doc.canvas.gridSize || 16,
              snapToGrid: doc.preferences.snapEnabled && doc.preferences.snapToGrid,
              smartGuides: doc.preferences.smartGuides,
              snapSensitivity: doc.canvas.snapSensitivity || 6,
              snapToElements: doc.preferences.snapEnabled && doc.preferences.snapToElements,
            }
          );

          if (doc.preferences.snapEnabled) {
            finalX = snap.x;
            finalY = snap.y;
          }

          const xg = doc.preferences.smartGuides ? snap.guides.find((g) => g.type === "x") : undefined;
          const yg = doc.preferences.smartGuides ? snap.guides.find((g) => g.type === "y") : undefined;
          const parentRect = parentNode ? getAbsoluteNodeRect(parentNode, doc.nodes) : { x: 0, y: 0 };
          setGuideX(xg ? parentRect.x + xg.position : null);
          setGuideY(yg ? parentRect.y + yg.position : null);
        }

        if (parentNode) {
          // Child nodes are strictly constrained within their parent's [0..width] x [0..height] bounds
          const maxX = Math.max(0, bounds.width - initialNode.width);
          const maxY = Math.max(0, bounds.height - initialNode.height);
          finalX = Math.max(0, Math.min(maxX, finalX));
          finalY = Math.max(0, Math.min(maxY, finalY));
        } else {
          // Root nodes can sit anywhere on canvas while remaining accessible
          finalX = Math.max(-initialNode.width + 24, Math.min(bounds.width - 24, finalX));
          finalY = Math.max(-initialNode.height + 24, Math.min(bounds.height - 24, finalY));
        }

        if (finalX !== selectedNode.x || finalY !== selectedNode.y) {
          didMutateRef.current = true;
          onUpdateNode(selectedNode.id, { x: finalX, y: finalY }, { skipHistory: true });
        }
      } else if (activeHandle) {
        const parentNode = initialNode.parentId
          ? doc.nodes.find((n) => n.id === initialNode.parentId) || null
          : null;
        const reg = PROFILE_BUILDER_REGISTRY[initialNode.type];
        const minW = reg?.minWidth ?? 24;
        const minH = reg?.minHeight ?? 16;

        const isCorner =
          activeHandle === "nw" ||
          activeHandle === "ne" ||
          activeHandle === "se" ||
          activeHandle === "sw";
        const isContainer = isContainerType(initialNode.type);

        let nextX = initialNode.x;
        let nextY = initialNode.y;
        let nextW = initialNode.width;
        let nextH = initialNode.height;

        if (
          isCorner &&
          (e.shiftKey || initialNode.aspectRatioLocked) &&
          initialNode.width > 0 &&
          initialNode.height > 0
        ) {
          const rawW = activeHandle.includes("e")
            ? initialNode.width + deltaX
            : initialNode.width - deltaX;
          const rawH = activeHandle.includes("s")
            ? initialNode.height + deltaY
            : initialNode.height - deltaY;

          const anchorRight = initialNode.x + initialNode.width;
          const anchorBottom = initialNode.y + initialNode.height;

          const minScale = Math.max(minW / initialNode.width, minH / initialNode.height);
          let maxScale = 12;
          if (parentNode) {
            const availW = activeHandle.includes("w")
              ? anchorRight
              : Math.max(minW, parentNode.width - initialNode.x);
            const availH = activeHandle.includes("n")
              ? anchorBottom
              : Math.max(minH, parentNode.height - initialNode.y);
            maxScale = Math.max(
              minScale,
              Math.min(availW / initialNode.width, availH / initialNode.height)
            );
          }

          const ratioW = rawW / initialNode.width;
          const ratioH = rawH / initialNode.height;
          const desiredScale =
            Math.abs(ratioW - 1) >= Math.abs(ratioH - 1) ? ratioW : ratioH;
          const clampedScale = Math.max(minScale, Math.min(maxScale, desiredScale));

          nextW = Math.max(minW, Math.round(initialNode.width * clampedScale));
          nextH = Math.max(minH, Math.round(initialNode.height * clampedScale));
          nextX = activeHandle.includes("w") ? anchorRight - nextW : initialNode.x;
          nextY = activeHandle.includes("n") ? anchorBottom - nextH : initialNode.y;
        } else {
          if (activeHandle.includes("e")) nextW = Math.max(minW, initialNode.width + deltaX);
          if (activeHandle.includes("s")) nextH = Math.max(minH, initialNode.height + deltaY);
          if (activeHandle.includes("w")) {
            const nw = Math.max(minW, initialNode.width - deltaX);
            nextX = initialNode.x + (initialNode.width - nw);
            nextW = nw;
          }
          if (activeHandle.includes("n")) {
            const nh = Math.max(minH, initialNode.height - deltaY);
            nextY = initialNode.y + (initialNode.height - nh);
            nextH = nh;
          }

          if (parentNode) {
            if (nextX < 0) {
              nextW = Math.max(minW, initialNode.x + initialNode.width);
              nextX = 0;
            }
            if (nextY < 0) {
              nextH = Math.max(minH, initialNode.y + initialNode.height);
              nextY = 0;
            }
            nextW = Math.min(nextW, Math.max(minW, parentNode.width - nextX));
            nextH = Math.min(nextH, Math.max(minH, parentNode.height - nextY));
          }
        }

        didMutateRef.current = true;
        if (isContainer && initialNodes && onReplaceNodes) {
          const resizedNodes = applyContainerResize(
            initialNodes,
            initialNode.id,
            {
              x: Math.round(nextX),
              y: Math.round(nextY),
              width: Math.round(nextW),
              height: Math.round(nextH),
            },
            {
              forceProportional: isCorner && e.shiftKey,
              lockCustomRpcChildren: !isPremiumOrAdmin,
            }
          );
          onReplaceNodes(resizedNodes, { skipHistory: true });
        } else {
          onUpdateNode(
            selectedNode.id,
            {
              x: Math.round(nextX),
              y: Math.round(nextY),
              width: Math.round(nextW),
              height: Math.round(nextH),
            },
            { skipHistory: true }
          );
        }
      }
    },
    [
      activeHandle,
      doc.canvas.gridSize,
      doc.canvas.snapSensitivity,
      doc.nodes,
      doc.preferences.showGrid,
      doc.preferences.smartGuides,
      doc.preferences.snapEnabled,
      doc.preferences.snapToElements,
      doc.preferences.snapToGrid,
      dragStart.x,
      dragStart.y,
      effectiveCanvasHeight,
      effectiveCanvasWidth,
      initialNode,
      initialNodes,
      isAncestorLocked,
      isDragging,
      isPanning,
      onReplaceNodes,
      onUpdateNode,
      panStart.x,
      panStart.y,
      selectedNode,
      zoom,
    ]
  );

  const handlePointerEnd = useCallback(() => {
    if (didMutateRef.current) {
      didMutateRef.current = false;
      suppressNextDeselectRef.current = true;
      setTimeout(() => {
        suppressNextDeselectRef.current = false;
      }, 150);

      // Level 1 auto-nesting when dragging a root Custom RPC directly inside Profile Parent Embed
      if (
        isDragging &&
        selectedNode &&
        selectedNode.parentId === null &&
        selectedNode.type === "custom-rpc" &&
        onReplaceNodes
      ) {
        const cx = selectedNode.x + selectedNode.width / 2;
        const cy = selectedNode.y + selectedNode.height / 2;
        const embedTargets = doc.nodes
          .filter(
            (n) =>
              n.id !== selectedNode.id &&
              n.visible &&
              (n.type === "embed" || n.type === "nested-embed" || n.type === "group-section")
          )
          .sort((a, b) => b.zIndex - a.zIndex);

        const matchedContainer = embedTargets.find((target) => {
          const abs = getAbsoluteNodeRect(target, doc.nodes);
          return cx >= abs.x && cx <= abs.x + abs.width && cy >= abs.y && cy <= abs.y + abs.height;
        });

        if (matchedContainer) {
          const targetAbs = getAbsoluteNodeRect(matchedContainer, doc.nodes);
          const localCandidate: BuilderNode = {
            ...selectedNode,
            parentId: matchedContainer.id,
            x: Math.round(selectedNode.x - targetAbs.x),
            y: Math.round(selectedNode.y - targetAbs.y),
          };
          const clamped = clampNodeToParent(localCandidate, matchedContainer);
          const sibMaxZ = doc.nodes
            .filter((n) => n.parentId === matchedContainer.id)
            .reduce((m, s) => Math.max(m, s.zIndex), 0);
          const reparentedNodes = doc.nodes.map((n) =>
            n.id === selectedNode.id
              ? { ...localCandidate, ...clamped, zIndex: sibMaxZ + 1 }
              : n
          );
          onReplaceNodes(reparentedNodes, { skipHistory: false });
          setIsDragging(false);
          setIsPanning(false);
          setActiveHandle(null);
          setInitialNode(null);
          setInitialNodes(null);
          setGuideX(null);
          setGuideY(null);
          return;
        }
      }

      onCommitHistory();
    }
    setIsDragging(false);
    setIsPanning(false);
    setActiveHandle(null);
    setInitialNode(null);
    setInitialNodes(null);
    setGuideX(null);
    setGuideY(null);
  }, [doc.nodes, isDragging, onCommitHistory, onReplaceNodes, selectedNode]);

  useEffect(() => {
    if (isDragging || activeHandle || isPanning) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };
    }
  }, [activeHandle, handlePointerEnd, handlePointerMove, isDragging, isPanning]);

  const handleToggleFullscreen = () => {
    if (typeof window === "undefined") return;
    if (!window.document.fullscreenElement) {
      workspaceRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      window.document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  // Measure floating toolbar actual content width for exact horizontal centering
  const selectedType = selectedNode?.type;
  const selectedLocked = selectedNode?.locked;
  useLayoutEffect(() => {
    const el = floatingToolbarRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w > 0 && h > 0) {
      setToolbarSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    }
  }, [selectedId, selectedType, selectedLocked, isAddPopoverOpen]);

  useEffect(() => {
    if (!gradientDrag) return;
    const clampNorm = (v: number) => Math.max(-0.5, Math.min(1.5, Math.round(v * 1000) / 1000));
    const applyLayers = (nextLayers: BuilderGradientLayer[], commitCanvas: boolean) => {
      if (gradientDrag.field === "canvas") {
        const bgNode = doc.nodes.find((n) => n.type === "background");
        if (bgNode) {
          onUpdateNode(
            bgNode.id,
            { config: { ...bgNode.config, bgGradients: nextLayers } },
            { skipHistory: true }
          );
        }
        if (commitCanvas) {
          onUpdateCanvas?.({ backgroundGradients: nextLayers });
        }
      } else if (gradientDrag.nodeId) {
        const targetNode = doc.nodes.find((n) => n.id === gradientDrag.nodeId);
        if (!targetNode) return;
        if (gradientDrag.field === "text") {
          onUpdateNode(
            targetNode.id,
            { config: { ...targetNode.config, textFillType: "gradient", textGradients: nextLayers } },
            { skipHistory: true }
          );
        } else if (gradientDrag.field === "imageOverlay") {
          onUpdateNode(
            targetNode.id,
            {
              config: {
                ...targetNode.config,
                imageOverlayEnabled: true,
                imageOverlayGradients: nextLayers,
              },
            },
            { skipHistory: true }
          );
        } else {
          onUpdateNode(
            targetNode.id,
            {
              style: {
                ...targetNode.style,
                backgroundType: "gradient",
                backgroundGradients: nextLayers,
              },
            },
            { skipHistory: true }
          );
        }
      }
    };

    const computeNextLayers = (clientX: number, clientY: number) => {
      const dx = (clientX - gradientDrag.pointerX) / zoom;
      const dy = (clientY - gradientDrag.pointerY) / zoom;
      const nxDelta = dx / Math.max(1, gradientDrag.rect.width);
      const nyDelta = dy / Math.max(1, gradientDrag.rect.height);

      return gradientDrag.layers.map((layer) => {
        if (layer.id !== gradientDrag.layerId) return layer;
        let startX = gradientDrag.origStartX;
        let startY = gradientDrag.origStartY;
        let endX = gradientDrag.origEndX;
        let endY = gradientDrag.origEndY;

        if (gradientDrag.mode === "start") {
          startX = clampNorm(gradientDrag.origStartX + nxDelta);
          startY = clampNorm(gradientDrag.origStartY + nyDelta);
        } else if (gradientDrag.mode === "end") {
          endX = clampNorm(gradientDrag.origEndX + nxDelta);
          endY = clampNorm(gradientDrag.origEndY + nyDelta);
        } else {
          startX = clampNorm(gradientDrag.origStartX + nxDelta);
          startY = clampNorm(gradientDrag.origStartY + nyDelta);
          endX = clampNorm(gradientDrag.origEndX + nxDelta);
          endY = clampNorm(gradientDrag.origEndY + nyDelta);
        }

        const angle = angleFromNormalizedVector(endX - startX, endY - startY, layer.angle);
        return { ...layer, startX, startY, endX, endY, angle };
      });
    };

    const onMove = (e: PointerEvent) => {
      const nextLayers = computeNextLayers(e.clientX, e.clientY);
      applyLayers(nextLayers, false);
    };

    const onUp = (e: PointerEvent) => {
      const finalLayers = computeNextLayers(e.clientX, e.clientY);
      applyLayers(finalLayers, true);
      if (gradientDrag.field !== "canvas") {
        onCommitHistory();
      }
      setGradientDrag(null);
      suppressNextDeselectRef.current = true;
      setTimeout(() => {
        suppressNextDeselectRef.current = false;
      }, 120);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [doc.nodes, gradientDrag, onCommitHistory, onUpdateCanvas, onUpdateNode, zoom]);

  // Dynamic Contextual Toolbar Geometry (centered above element, anchored cleanly to selected element)
  const computeToolbarGeom = () => {
    if (!selectedNode || !selectedNode.visible || selectedNode.type === "background") return null;
    const abs = getAbsoluteNodeRect(selectedNode, doc.nodes);
    const stageLeft = (workspaceSize.width - effectiveCanvasWidth * zoom) / 2 + pan.x;
    const stageTop = (workspaceSize.height - effectiveCanvasHeight * zoom) / 2 + pan.y;

    const eLeft = stageLeft + abs.x * zoom;
    const eTop = stageTop + abs.y * zoom;
    const eW = abs.width * zoom;
    const eH = abs.height * zoom;
    const isContainer = isContainerType(selectedNode.type);
    const tbW = toolbarSize.width > 40 ? toolbarSize.width : isContainer ? 344 : 244;
    const tbH = toolbarSize.height > 20 ? toolbarSize.height : 34;
    const gap = 12;
    const pad = 10;

    const clampX = (x: number) =>
      Math.round(Math.max(pad, Math.min(Math.max(pad, workspaceSize.width - tbW - pad), x)));
    const clampY = (y: number) =>
      Math.round(Math.max(pad, Math.min(Math.max(pad, workspaceSize.height - tbH - pad), y)));

    let baseLeft = eLeft + eW / 2 - tbW / 2;
    let baseTop = eTop - gap - tbH;
    let placement: "top" | "bottom" | "right" | "left" = "top";

    if (eTop - gap - tbH >= pad) {
      placement = "top";
      baseTop = eTop - gap - tbH;
    } else if (eTop + eH + gap + tbH <= workspaceSize.height - pad) {
      placement = "bottom";
      baseTop = eTop + eH + gap;
    } else if (eLeft + eW + gap + tbW <= workspaceSize.width - pad) {
      placement = "right";
      baseLeft = eLeft + eW + gap;
      baseTop = eTop + eH / 2 - tbH / 2;
    } else if (eLeft - gap - tbW >= pad) {
      placement = "left";
      baseLeft = eLeft - gap - tbW;
      baseTop = eTop + eH / 2 - tbH / 2;
    } else {
      placement = "bottom";
      baseTop = eTop + 8;
    }

    const left = clampX(baseLeft);
    const top = clampY(baseTop);

    const menuW = 224;
    const menuH = Math.min(310, Math.max(180, workspaceSize.height - pad * 2));
    const menuLeft = Math.round(
      Math.max(pad, Math.min(workspaceSize.width - menuW - pad, left + tbW / 2 - menuW / 2))
    );
    const spaceBelow = workspaceSize.height - (top + tbH + 8) - pad;
    const menuTop =
      spaceBelow >= menuH
        ? Math.round(top + tbH + 8)
        : Math.round(Math.max(pad, Math.min(workspaceSize.height - menuH - pad, top - menuH - 8)));

    return { left, top, tbW, tbH, placement, menuLeft, menuTop, menuW, menuH };
  };

  const toolbarGeom = computeToolbarGeom();

  // Compute live dynamic counts for Bottom Status Bar
  const topLevelCount = doc.nodes.filter((n) => n.parentId === null && n.visible).length;
  const primaryEmbed = doc.nodes.find((n) => n.type === "embed" && n.parentId === null) || null;
  const activeEmbed =
    (selectedNode?.type === "embed" ? selectedNode : primaryEmbed) || null;
  const activeEmbedChildCount = activeEmbed
    ? collectDescendantsCount(activeEmbed.id, doc.nodes)
    : 0;
  const nestedEmbedCount = doc.nodes.filter((n) => n.type === "nested-embed").length;

  const renderInteractiveChrome = (node: BuilderNode, innerRendered: React.ReactNode) => {
    const isSelected = selectedId === node.id;
    const containerLocked = isAncestorLocked(node);
    const isRpcChildFreeLocked =
      !isPremiumOrAdmin && isNodeRestrictedRpcForFree(node, doc.nodes, isPremiumOrAdmin);
    const isRpcParentResizeLocked =
      !isPremiumOrAdmin && (node.type === "custom-rpc" || node.type === "custom-rpc-embed");
    const locked = node.locked || containerLocked || isRpcChildFreeLocked;
    const isContainer = isContainerType(node.type);

    return (
      <div
        key={node.id}
        onPointerDown={(e) => {
          if (e.button !== 0 || isPanMode || spacePressed) return;
          e.stopPropagation();
          onSelect(node.id);
          if (locked) return;
          didMutateRef.current = false;
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          setInitialNode({ ...node });
        }}
        onDragOver={
          isContainer
            ? (e) => {
              if (e.dataTransfer.types.includes("application/x-pixel-builder-type")) {
                e.preventDefault();
                e.stopPropagation();
              }
            }
            : undefined
        }
        onDrop={
          isContainer
            ? (e) => {
              const droppedType = e.dataTransfer.getData(
                "application/x-pixel-builder-type"
              ) as BuilderComponentType;
              if (!droppedType) return;
              e.preventDefault();
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const localX = Math.max(8, Math.round((e.clientX - rect.left) / zoom - 60));
              const localY = Math.max(8, Math.round((e.clientY - rect.top) / zoom - 20));
              onDropComponent(droppedType, node.id, localX, localY);
            }
            : undefined
        }
        style={{
          position: "absolute",
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          zIndex: node.zIndex,
          opacity: node.style.opacity ?? 1,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          cursor: isPanMode || spacePressed ? "grab" : locked ? "default" : "move",
        }}
        className={`group/node ${doc.preferences.showComponentOutlines && !isSelected
          ? "hover:outline hover:outline-1 hover:outline-white/25"
          : ""
          }`}
        data-testid={`canvas-node-${node.id}`}
        data-node-type={node.type}
        data-parent-id={node.parentId || ""}
      >
        {innerRendered}

        {isSelected && (locked || isRpcParentResizeLocked) && (
          <div
            className="absolute -inset-0.5 border border-dashed border-amber-400/80 pointer-events-none z-50 rounded-sm"
            data-testid="builder-locked-outline"
          />
        )}

        {isSelected && !locked && !isRpcParentResizeLocked && (
          <div
            className={`absolute -inset-0.5 border pointer-events-none z-50 ${isContainer ? "border-[#d71920]" : "border-white"
              }`}
            data-testid={isContainer ? "builder-container-outline" : "builder-child-outline"}
          >
            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleId[]).map((handle) => {
              const handleScale = Math.max(1, Math.min(2.4, 1 / Math.max(0.25, zoom)));
              const posClass: Record<HandleId, string> = {
                nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
                n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
                e: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
                se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                w: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize",
              };

              return (
                <div
                  key={handle}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    didMutateRef.current = false;
                    setActiveHandle(handle);
                    setDragStart({ x: e.clientX, y: e.clientY });
                    setInitialNode({ ...node });
                    setInitialNodes(JSON.parse(JSON.stringify(doc.nodes)));
                  }}
                  style={{ transform: `scale(${handleScale})` }}
                  className={`absolute w-3 h-3 rounded-[2px] bg-white border border-black shadow pointer-events-auto ${posClass[handle]}`}
                  data-testid={`builder-handle-${handle}`}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectedDescendantCount = selectedNode
    ? collectDescendantsCount(selectedNode.id, doc.nodes)
    : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#060608] font-mono">
      {/* Main Viewport Canvas Area */}
      <div
        ref={workspaceRef}
        onPointerDown={(e) => {
          if (isPanMode || spacePressed || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setPanStart({ x: pan.x, y: pan.y });
          } else if (e.target === workspaceRef.current || e.target === stageWrapperRef.current) {
            if (suppressNextDeselectRef.current) {
              suppressNextDeselectRef.current = false;
              return;
            }
            onSelect(null);
            setIsAddPopoverOpen(false);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-pixel-builder-type")) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          const droppedType = e.dataTransfer.getData(
            "application/x-pixel-builder-type"
          ) as BuilderComponentType;
          if (!droppedType) return;
          e.preventDefault();
          onDropComponent(droppedType, primaryEmbed ? primaryEmbed.id : null);
        }}
        className={`flex-1 relative overflow-hidden flex items-center justify-center ${isPanMode || spacePressed ? "cursor-grab" : ""
          }`}
        data-testid="builder-workspace-viewport"
      >
        {/* Subtle dot grid behind canvas */}
        <div className="absolute inset-0 nt-dot-grid opacity-15 pointer-events-none" />

        {/* Zoom + Pan Transformed Artboard */}
        <div
          ref={stageWrapperRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          className="relative shrink-0 shadow-[0_0_60px_rgba(0,0,0,0.85)] border border-[#25252e] transition-transform duration-75"
        >
          <ProfileBuilderRenderer
            document={doc}
            deviceMode={deviceMode}
            isInteractive={true}
            liveData={liveData}
            selectedId={selectedId}
            onSelectNode={(id) => {
              if (id === null && suppressNextDeselectRef.current) {
                suppressNextDeselectRef.current = false;
                return;
              }
              onSelect(id);
              setIsAddPopoverOpen(false);
            }}
            onQuickAddGalleryImage={onQuickAddGalleryImage}
            renderInteractiveChrome={renderInteractiveChrome}
          >
            {/* Temporary Alignment Guides */}
            {guideX !== null && (
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-[#d71920] pointer-events-none z-50"
                style={{ left: `${guideX}px` }}
                data-testid="builder-snap-guide-x"
              />
            )}
            {guideY !== null && (
              <div
                className="absolute left-0 right-0 h-[1px] bg-[#d71920] pointer-events-none z-50"
                style={{ top: `${guideY}px` }}
                data-testid="builder-snap-guide-y"
              />
            )}

            {/* Editor-only Universal Gradient Direction Controller (simple line + 2 endpoints) */}
            {(() => {
              const bgNode = doc.nodes.find((n) => n.type === "background");
              let ctx: {
                field: "canvas" | "styleBg" | "text" | "imageOverlay";
                nodeId?: string;
                rect: { x: number; y: number; width: number; height: number };
                layers: BuilderGradientLayer[];
              } | null = null;

              if (!selectedNode || selectedNode.type === "background") {
                const effBgType = bgNode?.style.backgroundType ?? doc.canvas.backgroundType;
                if (effBgType === "gradient") {
                  ctx = {
                    field: "canvas",
                    rect: { x: 0, y: 0, width: effectiveCanvasWidth, height: effectiveCanvasHeight },
                    layers: normalizeGradientLayers(
                      bgNode?.config.bgGradients ?? doc.canvas.backgroundGradients,
                      {
                        colorA:
                          bgNode?.style.backgroundColor || doc.canvas.backgroundColor || "#09090b",
                        colorB:
                          bgNode?.style.backgroundGradientTo ||
                          doc.canvas.backgroundGradientTo ||
                          "#1a1a28",
                        angle:
                          bgNode?.style.backgroundGradientAngle ??
                          doc.canvas.backgroundGradientAngle ??
                          135,
                        opacity: 1,
                      }
                    ),
                  };
                }
              } else if (selectedNode.visible) {
                const hasTextGrad = selectedNode.config.textFillType === "gradient";
                const hasOverlayGrad = Boolean(selectedNode.config.imageOverlayEnabled);
                const hasStyleBgGrad = selectedNode.style.backgroundType === "gradient";
                const abs = getAbsoluteNodeRect(selectedNode, doc.nodes);

                if (
                  (activeGradientTarget === "text" || (!hasStyleBgGrad && !hasOverlayGrad)) &&
                  hasTextGrad
                ) {
                  ctx = {
                    field: "text",
                    nodeId: selectedNode.id,
                    rect: abs,
                    layers: normalizeGradientLayers(selectedNode.config.textGradients, {
                      colorA: selectedNode.config.color || "#ffffff",
                      colorB: "#93c5fd",
                      angle: 90,
                      opacity: 1,
                    }),
                  };
                } else if (
                  (activeGradientTarget === "image-overlay" || (!hasStyleBgGrad && !hasTextGrad)) &&
                  hasOverlayGrad
                ) {
                  ctx = {
                    field: "imageOverlay",
                    nodeId: selectedNode.id,
                    rect: abs,
                    layers: normalizeGradientLayers(selectedNode.config.imageOverlayGradients, {
                      colorA: "#000000",
                      colorB: "#ec4899",
                      angle: 180,
                      opacity: 0.45,
                    }),
                  };
                } else if (hasStyleBgGrad) {
                  ctx = {
                    field: "styleBg",
                    nodeId: selectedNode.id,
                    rect: abs,
                    layers: normalizeGradientLayers(selectedNode.style.backgroundGradients, {
                      colorA: selectedNode.style.backgroundColor || "#0b0b12",
                      colorB: selectedNode.style.backgroundGradientTo || "#1a1a28",
                      angle: selectedNode.style.backgroundGradientAngle ?? 135,
                      opacity: 1,
                    }),
                  };
                }
              }

              if (!ctx || ctx.layers.length === 0) return null;
              const selectedLayer =
                ctx.layers.find((l) => l.id === activeGradientLayerId) || ctx.layers[0];
              const startGradientDrag = (
                e: React.PointerEvent,
                mode: "start" | "end" | "move",
                layer: BuilderGradientLayer
              ) => {
                if (e.button !== 0 || layer.locked) return;
                e.stopPropagation();
                e.preventDefault();
                const pts = getGradientDirectionPoints(layer);
                setGradientDrag({
                  mode,
                  field: ctx!.field,
                  nodeId: ctx!.nodeId,
                  layerId: layer.id,
                  rect: ctx!.rect,
                  layers: ctx!.layers,
                  origStartX: pts.startX,
                  origStartY: pts.startY,
                  origEndX: pts.endX,
                  origEndY: pts.endY,
                  pointerX: e.clientX,
                  pointerY: e.clientY,
                });
              };

              return (
                <svg
                  className="absolute inset-0 pointer-events-none z-[60] overflow-visible"
                  width={effectiveCanvasWidth}
                  height={effectiveCanvasHeight}
                  viewBox={`0 0 ${effectiveCanvasWidth} ${effectiveCanvasHeight}`}
                  data-testid="gradient-canvas-controller"
                >
                  {ctx.layers.map((layer, idx) => {
                    if (layer.visible === false || layer.id === selectedLayer.id) return null;
                    const pts = getGradientDirectionPoints(layer);
                    const sx = ctx!.rect.x + pts.startX * ctx!.rect.width;
                    const sy = ctx!.rect.y + pts.startY * ctx!.rect.height;
                    const ex = ctx!.rect.x + pts.endX * ctx!.rect.width;
                    const ey = ctx!.rect.y + pts.endY * ctx!.rect.height;
                    return (
                      <line
                        key={layer.id}
                        x1={sx}
                        y1={sy}
                        x2={ex}
                        y2={ey}
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        style={{ pointerEvents: "all", cursor: "pointer" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onSelectGradientLayer?.(layer.id);
                        }}
                        data-testid={`gradient-inactive-line-${idx}`}
                      />
                    );
                  })}

                  {selectedLayer &&
                    selectedLayer.visible !== false &&
                    !selectedLayer.locked && (() => {
                      const pts = getGradientDirectionPoints(selectedLayer);
                      const sx = ctx!.rect.x + pts.startX * ctx!.rect.width;
                      const sy = ctx!.rect.y + pts.startY * ctx!.rect.height;
                      const ex = ctx!.rect.x + pts.endX * ctx!.rect.width;
                      const ey = ctx!.rect.y + pts.endY * ctx!.rect.height;
                      const startColor = selectedLayer.stops[0]?.color || "#ffffff";
                      const endColor =
                        selectedLayer.stops[selectedLayer.stops.length - 1]?.color || "#ffffff";
                      return (
                        <g>
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                            stroke="rgba(0,0,0,0.65)"
                            strokeWidth={3.5}
                            style={{ pointerEvents: "none" }}
                          />
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                            stroke="#ffffff"
                            strokeWidth={1.75}
                            style={{ pointerEvents: "none" }}
                          />
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                            stroke="transparent"
                            strokeWidth={14}
                            style={{ pointerEvents: "all", cursor: "move" }}
                            onPointerDown={(e) => startGradientDrag(e, "move", selectedLayer)}
                            data-testid="gradient-line-move"
                          />
                          <circle
                            cx={sx}
                            cy={sy}
                            r={6}
                            fill={startColor}
                            stroke="#ffffff"
                            strokeWidth={2}
                            style={{ pointerEvents: "all", cursor: "grab" }}
                            onPointerDown={(e) => startGradientDrag(e, "start", selectedLayer)}
                            data-testid="gradient-handle-start"
                          />
                          <circle
                            cx={ex}
                            cy={ey}
                            r={6}
                            fill={endColor}
                            stroke="#ffffff"
                            strokeWidth={2}
                            style={{ pointerEvents: "all", cursor: "grab" }}
                            onPointerDown={(e) => startGradientDrag(e, "end", selectedLayer)}
                            data-testid="gradient-handle-end"
                          />
                        </g>
                      );
                    })()}
                </svg>
              );
            })()}
          </ProfileBuilderRenderer>
        </div>

        {/* Secondary Contextual Floating Toolbar (Centered, Draggable, Clamped strictly inside workspace) */}
        {selectedNode && toolbarGeom && (
          <div
            ref={floatingToolbarRef}
            style={{
              position: "absolute",
              left: `${toolbarGeom.left}px`,
              top: `${toolbarGeom.top}px`,
              height: `${toolbarGeom.tbH}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="z-40 bg-[#0d0d12]/96 backdrop-blur-xl border border-white/15 rounded-xl px-1.5 shadow-2xl inline-flex items-center gap-1 text-[11px] whitespace-nowrap select-none w-max"
            data-testid="builder-floating-toolbar"
            data-placement={toolbarGeom.placement}
          >
            {/* Dedicated Six-Dot Drag Handle (Moves Selected Element While Anchoring Toolbar) */}
            <button
              type="button"
              onPointerDown={(e) => {
                if (e.button !== 0 || isPanMode || spacePressed) return;
                e.stopPropagation();
                e.preventDefault();
                if (!selectedNode || selectedNode.locked || isAncestorLocked(selectedNode)) return;
                if (
                  !isPremiumOrAdmin &&
                  isNodeRestrictedRpcForFree(selectedNode, doc.nodes, isPremiumOrAdmin)
                ) {
                  return;
                }
                didMutateRef.current = false;
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                setInitialNode({ ...selectedNode });
              }}
              title="Move selected element"
              aria-label="Move selected element"
              className={`p-1 pr-1.5 mr-0.5 border-r border-white/10 text-neutral-400 hover:text-white flex items-center justify-center shrink-0 ${
                selectedNode?.locked || isAncestorLocked(selectedNode)
                  ? "cursor-not-allowed opacity-40"
                  : isDragging
                    ? "cursor-grabbing text-white"
                    : "cursor-grab"
              }`}
              data-testid="ft-drag-handle"
            >
              <GripVertical size={12} />
            </button>

            {/* Right-Aligned Icon-Only Action Group: Duplicate | Lock | Add Element | Delete */}
            <div className="flex items-center gap-0.5">
              {(() => {
                const heartCount = doc.nodes.filter((n) => n.type === "heart-like").length;
                const rpcChildLocked =
                  !isPremiumOrAdmin &&
                  isNodeRestrictedRpcForFree(selectedNode, doc.nodes, isPremiumOrAdmin);
                const rpcParentAddLocked =
                  !isPremiumOrAdmin &&
                  (selectedNode.type === "custom-rpc" || selectedNode.type === "custom-rpc-embed");
                const duplicateBlocked =
                  rpcChildLocked ||
                  (!isAdmin && selectedNode.type === "view-counter") ||
                  (!isPremiumOrAdmin &&
                    (selectedNode.type === "claim-profile" ||
                      (selectedNode.type === "heart-like" && heartCount >= 5)));
                const deleteBlocked =
                  rpcChildLocked ||
                  (!isAdmin && selectedNode.type === "view-counter") ||
                  (!isPremiumOrAdmin &&
                    (selectedNode.type === "claim-profile" ||
                      (selectedNode.type === "heart-like" &&
                        (selectedNode.id === "node-default-heart-like" || heartCount <= 1))));

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => onDuplicateNode(selectedNode.id)}
                      title={
                        duplicateBlocked
                          ? "Premium required to duplicate beyond Free plan limit"
                          : "Duplicate"
                      }
                      aria-label="Duplicate"
                      aria-disabled={duplicateBlocked}
                      className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${duplicateBlocked
                        ? "text-neutral-600 cursor-not-allowed opacity-50"
                        : "text-neutral-200 hover:text-white hover:bg-white/10 cursor-pointer"
                        }`}
                      data-testid="ft-duplicate"
                    >
                      <Copy size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { locked: !selectedNode.locked })
                      }
                      title={selectedNode.locked ? "Unlock" : "Lock"}
                      aria-label={selectedNode.locked ? "Unlock" : "Lock"}
                      className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors ${selectedNode.locked
                        ? "text-amber-300 bg-amber-500/15"
                        : "text-neutral-200 hover:text-white hover:bg-white/10"
                        }`}
                      data-testid="ft-lock"
                    >
                      {selectedNode.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    {isContainerType(selectedNode.type) && !rpcParentAddLocked && (
                      <button
                        type="button"
                        onClick={() => setIsAddPopoverOpen((p) => !p)}
                        title="Add Element"
                        aria-label="Add Element"
                        className={`p-1 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors ${isAddPopoverOpen
                          ? "bg-white text-black"
                          : "text-white hover:bg-white/10"
                          }`}
                        data-testid="ft-add-element"
                      >
                        <span
                          className={`w-5 h-5 rounded-[5px] border flex items-center justify-center shrink-0 ${isAddPopoverOpen
                            ? "bg-black/10 border-black/25"
                            : "bg-white/10 border-white/20"
                            }`}
                        >
                          <Plus size={11} />
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteNode(selectedNode.id)}
                      title={
                        deleteBlocked
                          ? "Protected default element (Upgrade to Premium to delete)"
                          : selectedDescendantCount > 0
                            ? `Delete container & ${selectedDescendantCount} child item(s) (Undoable)`
                            : "Delete"
                      }
                      aria-label="Delete"
                      aria-disabled={deleteBlocked}
                      className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${deleteBlocked
                        ? "text-neutral-600 cursor-not-allowed opacity-50"
                        : "text-red-400 hover:text-red-300 hover:bg-red-500/15 cursor-pointer"
                        }`}
                      data-testid="ft-delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Quick Add Child Element Menu */}
        {selectedNode &&
          toolbarGeom &&
          isAddPopoverOpen &&
          isContainerType(selectedNode.type) && (
            <div
              style={{
                position: "absolute",
                left: `${toolbarGeom.menuLeft}px`,
                top: `${toolbarGeom.menuTop}px`,
                width: `${toolbarGeom.menuW}px`,
                maxHeight: `${toolbarGeom.menuH}px`,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="z-50 bg-[#0d0d12]/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl p-2 overflow-y-auto custom-scrollbar space-y-0.5"
              data-testid="ft-add-menu"
            >
              <div className="px-2 py-1 mb-1 border-b border-[#1f1f28] text-[10px] text-neutral-400 uppercase font-bold">
                Add to {selectedNode.name}
              </div>
              {(selectedNode.type === "custom-rpc" || selectedNode.type === "custom-rpc-embed") && (
                <div className="mb-1 pb-1 border-b border-[#1f1f28] space-y-0.5">
                  <div className="px-2 py-0.5 text-[9px] text-neutral-500 uppercase font-semibold">
                    Rich Presence Children
                  </div>
                  {RPC_CHILD_COMPONENT_TYPES.map((type) => {
                    const meta = PROFILE_BUILDER_REGISTRY[type];
                    const Icon = getBuilderComponentIcon(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onInsertChild(selectedNode.id, type);
                          setIsAddPopoverOpen(false);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-[11px] text-white cursor-pointer"
                        data-testid={`ft-add-opt-${type}`}
                      >
                        <Icon size={12} className="text-neutral-300 shrink-0" />
                        <span className="truncate">{meta.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      onInsertChild(selectedNode.id, "rpc-icon", {
                        name: "RPC Small Image",
                        width: 32,
                        height: 32,
                        style: {
                          opacity: 1,
                          backgroundType: "solid",
                          backgroundColor: "#17171f",
                          borderWidth: 1,
                          borderColor: "#2a2a35",
                          borderRadius: 9999,
                        },
                        responsive: {
                          hiddenOn: [],
                          widthMode: "fixed",
                          scaleMode: "proportional",
                        },
                        config: {
                          rpcFieldBinding: "smallImage",
                          rpcDataSource: "live",
                          useLiveRpc: true,
                          rpcShowSecondaryBadge: false,
                          fit: "cover",
                        },
                      });
                      setIsAddPopoverOpen(false);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-[11px] text-white cursor-pointer"
                    data-testid="ft-add-opt-small-image"
                  >
                    <Plus size={12} className="text-neutral-300 shrink-0" />
                    <span className="truncate">RPC Small Image</span>
                  </button>
                </div>
              )}
              {LIBRARY_CATALOG_ORDER.filter(
                (t) =>
                  t !== "background" &&
                  t !== "embed" &&
                  !(
                    (selectedNode.type === "custom-rpc" ||
                      selectedNode.type === "custom-rpc-embed") &&
                    (t === "custom-rpc" || t === "custom-rpc-embed")
                  )
              ).map(
                (type) => {
                  const meta = PROFILE_BUILDER_REGISTRY[type];
                  const Icon = getBuilderComponentIcon(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onInsertChild(selectedNode.id, type);
                        setIsAddPopoverOpen(false);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-[11px] text-neutral-200 cursor-pointer"
                      data-testid={`ft-add-opt-${type}`}
                    >
                      <Icon size={12} className="text-neutral-400 shrink-0" />
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                }
              )}
            </div>
          )}
      </div>

      {/* Bottom Status Bar & Zoom Controls */}
      <footer
        className="h-9 shrink-0 px-3 sm:px-4 bg-[#08080b] border-t border-[#1d1d24] flex items-center justify-between gap-2 text-[10px] text-neutral-400 select-none"
        data-testid="builder-bottom-bar"
      >
        <div className="flex items-center gap-2 truncate" data-testid="builder-status-metrics">
          <span className="w-2 h-2 rounded-full bg-[#d71920] shrink-0" />
          <span className="text-neutral-200 font-semibold">Canvas (Background)</span>
          <span className="text-neutral-600">{"//"}</span>
          <span>{topLevelCount} Layers</span>
          {activeEmbed && (
            <>
              <span className="text-neutral-700">|</span>
              <span className="text-neutral-200 font-semibold">{activeEmbed.name}</span>
              <span className="text-neutral-600">{"//"}</span>
              <span>{activeEmbedChildCount} Elements</span>
              <span className="text-neutral-600">{"//"}</span>
              <span>Nested: {nestedEmbedCount}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPanMode((p) => !p)}
            title="Pan canvas (or hold Space)"
            className={`p-1 rounded border cursor-pointer ${isPanMode
              ? "bg-white text-black border-white"
              : "bg-[#111116] border-[#23232c] text-neutral-300 hover:text-white"
              }`}
            data-testid="zoom-pan-toggle"
          >
            <Hand size={12} />
          </button>

          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.2, Number((zoom - 0.1).toFixed(2))))}
            title="Zoom Out"
            className="p-1 rounded bg-[#111116] border border-[#23232c] text-neutral-300 hover:text-white cursor-pointer"
            data-testid="zoom-out-btn"
          >
            <ZoomOut size={12} />
          </button>

          <span
            className="w-11 text-center text-white font-bold tabular-nums"
            data-testid="zoom-percent-display"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => onZoomChange(Math.min(2, Number((zoom + 0.1).toFixed(2))))}
            title="Zoom In"
            className="p-1 rounded bg-[#111116] border border-[#23232c] text-neutral-300 hover:text-white cursor-pointer"
            data-testid="zoom-in-btn"
          >
            <ZoomIn size={12} />
          </button>

          <button
            type="button"
            onClick={handleFitToCanvas}
            title="Fit to Canvas"
            className="px-1.5 py-1 rounded bg-[#111116] border border-[#23232c] text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
            data-testid="zoom-fit-btn"
          >
            <Scan size={11} />
            <span className="hidden sm:inline">Fit</span>
          </button>

          {onOpenLivePreview && (
            <button
              type="button"
              onClick={onOpenLivePreview}
              title="Open In-Editor Live Preview"
              className="px-2 py-1 rounded bg-[#15151d] hover:bg-[#1f1f2b] border border-[#2c2c38] text-neutral-100 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
              data-testid="builder-preview-btn"
            >
              <Eye size={11} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Toggle Workspace Fullscreen"
            className="p-1 rounded bg-[#111116] border border-[#23232c] text-neutral-300 hover:text-white cursor-pointer"
            data-testid="zoom-fullscreen-btn"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </footer>
    </div>
  );
};
