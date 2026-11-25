"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  EditorElement,
  CanvasBackground,
  ShapeElement,
  TextElement,
  ImageElement,
  StickerElement,
  ContainerElement,
  RpcElement,
  MusicElement,
  SocialElement,
  EmbedComponentKind,
} from "./editorTypes";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Trophy,
  Crown,
  Heart,
  Terminal,
  Sparkles,
  Copy,
  Lock,
  Unlock,
  Plus,
  Trash2,
  UserCircle2,
  Type,
  AlignLeft,
  Gamepad2,
  Music,
  Share2,
  FileText,
  Radio,
  Play,
  Pause,
  Disc3,
  Globe,
} from "lucide-react";
import { calculateSmartSnap } from "@/components/studio/smartAlignment";
import { resolvePlatformDef } from "@/components/studio/socialsEngine";
import { PLATFORM_IMAGE_MAP } from "@/components/links/PlatformIcons";
import {
  EMBED_COMPONENT_CATALOG,
  getElementAbsoluteRect,
  hexToRgba,
} from "./embedBuilderUtils";

interface DooryCanvasWorkspaceProps {
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (
    id: string,
    updates: Partial<EditorElement>,
    options?: { skipHistory?: boolean }
  ) => void;
  onCommitHistory?: () => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddEmbedChild?: (parentId: string, kind: EmbedComponentKind) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitScreen: () => void;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

function getMinimumSize(elem: EditorElement): { minW: number; minH: number } {
  if (elem.type === "container") return { minW: 180, minH: 140 };
  if (elem.type === "rpc") return { minW: 180, minH: 68 };
  if (elem.type === "music") return { minW: 160, minH: 52 };
  if (elem.type === "social") return { minW: 72, minH: 26 };
  if (elem.type === "text") return { minW: 40, minH: 20 };
  return { minW: 24, minH: 24 };
}

function getCatalogIcon(kind: EmbedComponentKind) {
  switch (kind) {
    case "profile-image":
      return UserCircle2;
    case "name":
      return Type;
    case "subtitle":
      return FileText;
    case "description":
      return AlignLeft;
    case "rpc":
      return Gamepad2;
    case "music":
      return Music;
    case "social":
      return Share2;
    case "custom-text":
    default:
      return Type;
  }
}

export const DooryCanvasWorkspace: React.FC<DooryCanvasWorkspaceProps> = ({
  canvas,
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  onCommitHistory,
  onDeleteElement,
  onDuplicateElement,
  onAddEmbedChild,
  zoom,
  onZoomChange,
  onFitScreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElemState, setInitialElemState] = useState<EditorElement | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(selectedId);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const didMutateDuringDragRef = useRef(false);

  // Close Add Element menu automatically when selection changes
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (isAddMenuOpen) {
      setIsAddMenuOpen(false);
    }
  }

  // Snapping guides (in canvas artboard coordinate space)
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

  // Workspace dimensions for smart floating toolbar clamping
  const [workspaceSize, setWorkspaceSize] = useState<{ width: number; height: number }>({
    width: 1100,
    height: 700,
  });

  const measureWorkspace = useCallback(() => {
    const el = containerRef.current;
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
    let observer: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measureWorkspace());
      observer.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [measureWorkspace]);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Handle pointer down on background/artboard
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === "canvas-artboard") {
      onSelect(null);
      setEditingTextId(null);
      setIsAddMenuOpen(false);
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
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

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          onDeleteElement(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) {
          e.preventDefault();
          onDuplicateElement(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        if (selectedElement) {
          e.preventDefault();
          onUpdateElement(selectedElement.id, { locked: !selectedElement.locked });
        }
      } else if (
        selectedElement &&
        !selectedElement.locked &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;

        onUpdateElement(selectedElement.id, {
          x: selectedElement.x + dx,
          y: selectedElement.y + dy,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedElement, editingTextId, onDeleteElement, onDuplicateElement, onUpdateElement]);

  // Pointer movement handling for dragging and resizing (supports mouse & touch/pointer)
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!selectedElement || selectedElement.locked) return;

      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      if (isDragging && initialElemState) {
        const candidateX = Math.round(initialElemState.x + deltaX);
        const candidateY = Math.round(initialElemState.y + deltaY);
        const parentEmbed = initialElemState.parentId
          ? (elements.find((el) => el.id === initialElemState.parentId) as
              | ContainerElement
              | undefined)
          : undefined;

        const siblingList = elements
          .filter(
            (el) =>
              el.id !== initialElemState.id &&
              el.visible &&
              (el.parentId || null) === (initialElemState.parentId || null)
          )
          .map((s) => ({
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            rotation: s.rotation,
            zIndex: s.zIndex,
          }));

        const bounds = parentEmbed
          ? { width: parentEmbed.width, height: parentEmbed.height }
          : { width: canvas.width, height: canvas.height };

        const snapResult = calculateSmartSnap(
          {
            x: candidateX,
            y: candidateY,
            width: initialElemState.width,
            height: initialElemState.height,
            rotation: initialElemState.rotation,
            zIndex: initialElemState.zIndex,
          },
          siblingList,
          bounds,
          {
            showGrid: false,
            gridSize: 8,
            snapToGrid: true,
            smartGuides: true,
            snapSensitivity: 6,
            snapToElements: true,
          }
        );

        let finalX = snapResult.x;
        let finalY = snapResult.y;

        // Soft boundary constraints when dragging children inside an embed
        if (parentEmbed) {
          finalX = Math.max(-16, Math.min(parentEmbed.width - Math.min(24, initialElemState.width) + 16, finalX));
          finalY = Math.max(-16, Math.min(parentEmbed.height - Math.min(20, initialElemState.height) + 16, finalY));
        }

        const xGuide = snapResult.guides.find((g) => g.type === "x");
        const yGuide = snapResult.guides.find((g) => g.type === "y");
        const offsetX = parentEmbed ? parentEmbed.x : 0;
        const offsetY = parentEmbed ? parentEmbed.y : 0;

        setGuideX(xGuide ? offsetX + xGuide.position : null);
        setGuideY(yGuide ? offsetY + yGuide.position : null);

        if (finalX !== selectedElement.x || finalY !== selectedElement.y) {
          didMutateDuringDragRef.current = true;
          onUpdateElement(selectedElement.id, { x: finalX, y: finalY }, { skipHistory: true });
        }
      } else if (activeHandle && initialElemState) {
        if (activeHandle === "rotate") {
          const absRect = getElementAbsoluteRect(initialElemState, elements);
          const centerX = absRect.x + absRect.width / 2;
          const centerY = absRect.y + absRect.height / 2;
          const artboardRect = artboardRef.current?.getBoundingClientRect();
          if (artboardRect) {
            const currentMouseArtboardX = (e.clientX - artboardRect.left) / zoom;
            const currentMouseArtboardY = (e.clientY - artboardRect.top) / zoom;
            const angleRad = Math.atan2(
              currentMouseArtboardY - centerY,
              currentMouseArtboardX - centerX
            );
            let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
            if (angleDeg < 0) angleDeg += 360;
            if (e.shiftKey) {
              angleDeg = Math.round(angleDeg / 15) * 15;
            }
            didMutateDuringDragRef.current = true;
            onUpdateElement(
              selectedElement.id,
              { rotation: angleDeg % 360 },
              { skipHistory: true }
            );
          }
        } else {
          const { minW, minH } = getMinimumSize(initialElemState);
          let { x, y, width, height } = initialElemState;

          if (activeHandle.includes("e")) {
            width = Math.max(minW, initialElemState.width + deltaX);
          }
          if (activeHandle.includes("s")) {
            height = Math.max(minH, initialElemState.height + deltaY);
          }
          if (activeHandle.includes("w")) {
            const newW = Math.max(minW, initialElemState.width - deltaX);
            x = initialElemState.x + (initialElemState.width - newW);
            width = newW;
          }
          if (activeHandle.includes("n")) {
            const newH = Math.max(minH, initialElemState.height - deltaY);
            y = initialElemState.y + (initialElemState.height - newH);
            height = newH;
          }

          // Proportional scaling with Shift OR on corner handles for Profile Images
          const isCorner =
            activeHandle === "nw" ||
            activeHandle === "ne" ||
            activeHandle === "se" ||
            activeHandle === "sw";
          const preserveAspect =
            isCorner &&
            (e.shiftKey || initialElemState.embedRole === "profile-image");

          if (preserveAspect && initialElemState.height > 0) {
            const aspect = initialElemState.width / initialElemState.height;
            const wDelta = Math.abs(width - initialElemState.width);
            const hDelta = Math.abs(height - initialElemState.height);
            if (wDelta >= hDelta) {
              const targetH = Math.max(minH, Math.round(width / aspect));
              if (activeHandle.includes("n")) {
                y = initialElemState.y + (initialElemState.height - targetH);
              }
              height = targetH;
            } else {
              const targetW = Math.max(minW, Math.round(height * aspect));
              if (activeHandle.includes("w")) {
                x = initialElemState.x + (initialElemState.width - targetW);
              }
              width = targetW;
            }
          }

          didMutateDuringDragRef.current = true;
          onUpdateElement(
            selectedElement.id,
            {
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(width),
              height: Math.round(height),
            },
            { skipHistory: true }
          );
        }
      }
    },
    [
      isDragging,
      activeHandle,
      dragStart,
      initialElemState,
      selectedElement,
      elements,
      zoom,
      canvas.width,
      canvas.height,
      onUpdateElement,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (didMutateDuringDragRef.current) {
      didMutateDuringDragRef.current = false;
      onCommitHistory?.();
    }
    setIsDragging(false);
    setActiveHandle(null);
    setGuideX(null);
    setGuideY(null);
  }, [onCommitHistory]);

  useEffect(() => {
    if (isDragging || activeHandle) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };
    }
  }, [isDragging, activeHandle, handlePointerMove, handlePointerUp]);

  // Handle pointer down on element (stops propagation so selecting a child never selects parent)
  const handleElementPointerDown = (e: React.PointerEvent, elem: EditorElement) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    onSelect(elem.id);

    if (elem.locked) return;

    didMutateDuringDragRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElemState({ ...elem });
  };

  // Render sticker glyph
  const renderStickerIcon = (key: string, color: string) => {
    switch (key) {
      case "discord":
        return <Bot size="100%" style={{ color }} />;
      case "fire":
        return <Flame size="100%" style={{ color }} />;
      case "verified":
        return <CheckCircle2 size="100%" style={{ color }} />;
      case "shield":
        return <ShieldCheck size="100%" style={{ color }} />;
      case "trophy":
        return <Trophy size="100%" style={{ color }} />;
      case "crown":
        return <Crown size="100%" style={{ color }} />;
      case "heart":
        return <Heart size="100%" style={{ color }} />;
      case "terminal":
        return <Terminal size="100%" style={{ color }} />;
      default:
        return <Sparkles size="100%" style={{ color }} />;
    }
  };

  // Render element interior
  const renderElementContent = (elem: EditorElement) => {
    if (!elem.visible) return null;

    switch (elem.type) {
      case "text": {
        const textElem = elem as TextElement;
        const isEditing = editingTextId === elem.id;

        return isEditing ? (
          <textarea
            autoFocus
            value={textElem.text}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateElement(elem.id, { text: e.target.value })}
            onBlur={() => setEditingTextId(null)}
            className="w-full h-full bg-transparent resize-none outline-none border border-white/40 rounded px-1 py-0.5 select-text"
            style={{
              fontFamily: textElem.fontFamily,
              fontSize: `${textElem.fontSize}px`,
              fontWeight: textElem.fontWeight,
              fontStyle: textElem.fontStyle || "normal",
              color: textElem.color,
              textAlign: textElem.textAlign,
              letterSpacing: `${textElem.letterSpacing || 0}px`,
              lineHeight: textElem.lineHeight || 1.2,
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!elem.locked) setEditingTextId(elem.id);
            }}
            className="w-full h-full select-none cursor-pointer overflow-hidden"
            style={{
              fontFamily: textElem.fontFamily,
              fontSize: `${textElem.fontSize}px`,
              fontWeight: textElem.fontWeight,
              fontStyle: textElem.fontStyle || "normal",
              color: textElem.color,
              textAlign: textElem.textAlign,
              textDecoration: textElem.underline ? "underline" : "none",
              letterSpacing: `${textElem.letterSpacing || 0}px`,
              lineHeight: textElem.lineHeight || 1.2,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {textElem.text}
          </div>
        );
      }

      case "shape": {
        const shape = elem as ShapeElement;
        const strokeW = shape.strokeWidth || 0;
        const strokeCol = shape.stroke || "transparent";
        const fillCol = shape.fill || "transparent";

        if (shape.shapeKind === "rectangle") {
          return (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: fillCol,
                borderColor: strokeCol,
                borderWidth: `${strokeW}px`,
                borderStyle: "solid",
                borderRadius: `${shape.cornerRadius || 0}px`,
              }}
            />
          );
        }
        if (shape.shapeKind === "rounded-rectangle") {
          return (
            <div
              className="w-full h-full rounded-2xl"
              style={{
                backgroundColor: fillCol,
                borderColor: strokeCol,
                borderWidth: `${strokeW}px`,
                borderStyle: "solid",
              }}
            />
          );
        }
        if (shape.shapeKind === "circle" || shape.shapeKind === "ellipse") {
          return (
            <div
              className="w-full h-full rounded-full"
              style={{
                backgroundColor: fillCol,
                borderColor: strokeCol,
                borderWidth: `${strokeW}px`,
                borderStyle: "solid",
              }}
            />
          );
        }
        if (shape.shapeKind === "triangle") {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points="50,5 95,95 5,95"
                fill={fillCol}
                stroke={strokeCol}
                strokeWidth={strokeW}
              />
            </svg>
          );
        }
        if (shape.shapeKind === "star") {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36"
                fill={fillCol}
                stroke={strokeCol}
                strokeWidth={strokeW}
              />
            </svg>
          );
        }
        if (shape.shapeKind === "line") {
          return (
            <div
              className="w-full h-0 border-t"
              style={{
                borderColor: strokeCol,
                borderTopWidth: `${Math.max(2, strokeW)}px`,
                marginTop: `${elem.height / 2}px`,
              }}
            />
          );
        }
        if (shape.shapeKind === "arrow") {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="5" y1="50" x2="90" y2="50" stroke={strokeCol} strokeWidth={Math.max(4, strokeW)} />
              <polyline points="75,30 95,50 75,70" fill="none" stroke={strokeCol} strokeWidth={Math.max(4, strokeW)} strokeLinecap="round" />
            </svg>
          );
        }
        return <div className="w-full h-full" style={{ backgroundColor: fillCol }} />;
      }

      case "image": {
        const img = elem as ImageElement;
        const filterStr = img.filters
          ? `brightness(${img.filters.brightness ?? 100}%) contrast(${img.filters.contrast ?? 100}%) blur(${img.filters.blur ?? 0}px) grayscale(${img.filters.grayscale ?? 0}%)`
          : undefined;
        return (
          <img
            src={img.src}
            alt={img.name}
            draggable={false}
            className="w-full h-full select-none pointer-events-none"
            style={{
              objectFit: img.fit || "cover",
              borderRadius: `${img.borderRadius ?? 0}px`,
              filter: filterStr,
            }}
          />
        );
      }

      case "sticker": {
        const stk = elem as StickerElement;
        return (
          <div className="w-full h-full flex items-center justify-center p-1">
            {renderStickerIcon(stk.key, stk.color)}
          </div>
        );
      }

      case "rpc": {
        const rpc = elem as RpcElement;
        const accent = rpc.accentColor || "#d71920";
        const bg =
          rpc.cardStyle === "glass"
            ? "rgba(22, 22, 28, 0.72)"
            : rpc.cardStyle === "minimal"
            ? "transparent"
            : rpc.backgroundColor || "#14141b";
        const border =
          rpc.cardStyle === "neon"
            ? `1px solid ${accent}`
            : rpc.cardStyle === "minimal"
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.1)";
        const typeLabel =
          rpc.activityType === "streaming"
            ? "Streaming"
            : rpc.activityType === "listening"
            ? "Listening to"
            : rpc.activityType === "watching"
            ? "Watching"
            : rpc.activityType === "competing"
            ? "Competing in"
            : "Playing";
        const showLarge = rpc.showLargeImage !== false;
        const showSmall = rpc.showSmallImage !== false && Boolean(rpc.smallImage);
        const showDetails = rpc.showDetails !== false;
        const showState = rpc.showState !== false;

        return (
          <div
            className="w-full h-full px-3 py-2 flex items-center gap-3 overflow-hidden select-none"
            style={{
              backgroundColor: bg,
              border,
              borderRadius: `${rpc.borderRadius ?? 12}px`,
              color: rpc.textColor || "#ffffff",
              backdropFilter: rpc.cardStyle === "glass" ? "blur(12px)" : undefined,
              boxShadow:
                rpc.cardStyle === "neon" ? `0 0 18px ${hexToRgba(accent, 0.3)}` : undefined,
            }}
          >
            {showLarge && (
              <div className="relative w-12 h-12 rounded-xl bg-[#1c1c26] border border-white/10 shrink-0 flex items-center justify-center overflow-visible">
                {rpc.largeImage ? (
                  <img
                    src={rpc.largeImage}
                    alt={rpc.appName || "RPC"}
                    draggable={false}
                    className="w-full h-full object-cover rounded-xl pointer-events-none"
                  />
                ) : (
                  <Gamepad2 size={20} style={{ color: accent }} />
                )}
                {showSmall && rpc.smallImage && (
                  <img
                    src={rpc.smallImage}
                    alt="Small asset"
                    draggable={false}
                    className="w-5 h-5 rounded-full border-2 border-[#14141b] object-cover absolute -bottom-1 -right-1 pointer-events-none"
                  />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-neutral-400">
                <Radio size={10} style={{ color: accent }} className="shrink-0" />
                <span className="truncate">{typeLabel}</span>
              </div>
              <div className="text-xs font-bold truncate" style={{ color: rpc.textColor || "#ffffff" }}>
                {rpc.appName || "Pixel.gg Studio"}
              </div>
              {showDetails && (
                <div className="text-[11px] text-neutral-300 truncate">
                  {rpc.details || "Customizing Rich Presence"}
                </div>
              )}
              {showState && rpc.state && (
                <div className="text-[10px] text-neutral-400 truncate">{rpc.state}</div>
              )}
            </div>
          </div>
        );
      }

      case "music": {
        const music = elem as MusicElement;
        const accent = music.accentColor || "#1db954";
        const progress = Math.max(0, Math.min(100, music.progressPercent ?? 62));

        return (
          <div
            className="w-full h-full px-3 py-2 flex items-center gap-2.5 overflow-hidden select-none border border-white/10"
            style={{
              backgroundColor: music.backgroundColor || "#14141b",
              borderRadius: `${music.borderRadius ?? 12}px`,
              color: music.textColor || "#ffffff",
            }}
          >
            {music.showArtwork !== false && (
              <div className="w-11 h-11 rounded-lg bg-[#1d1d27] border border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                {music.albumArt ? (
                  <img
                    src={music.albumArt}
                    alt={music.title}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <Disc3 size={20} style={{ color: accent }} />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate">
                  {music.title || "Untitled Track"}
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 flex items-center gap-1 shrink-0"
                  style={{ color: accent }}
                >
                  {music.isPlaying !== false ? <Play size={8} /> : <Pause size={8} />}
                  <span>{music.statusText || (music.isPlaying !== false ? "Playing" : "Paused")}</span>
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {music.artist || "Unknown Artist"}
              </div>
              {music.showProgress !== false && (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: accent }}
                    />
                  </div>
                  {(music.elapsedText || music.durationText) && (
                    <span className="text-[8px] font-mono text-neutral-500 shrink-0">
                      {music.elapsedText || "1:45"} / {music.durationText || "3:20"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "social": {
        const social = elem as SocialElement;
        const def = resolvePlatformDef(social.platformId, social.platformName);
        const imgSrc = PLATFORM_IMAGE_MAP[(social.platformId || def.id || "").toLowerCase()];
        const iconSize = social.iconSize ?? 16;
        const isCircle = social.variant === "circle";
        const isMinimal = social.variant === "minimal";
        const displayLabel = social.showPlatformName
          ? social.platformName || def.name
          : social.handle || def.name;

        return (
          <div
            className={`w-full h-full flex items-center gap-2 px-2.5 overflow-hidden select-none ${
              isCircle ? "justify-center rounded-full" : ""
            } ${isMinimal ? "" : "border border-white/12"}`}
            style={{
              backgroundColor: isMinimal ? "transparent" : social.backgroundColor || "#181820",
              borderRadius: isCircle ? "9999px" : `${social.borderRadius ?? 10}px`,
              color: social.textColor || "#f4f4f5",
            }}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={def.name}
                draggable={false}
                className="shrink-0 object-contain pointer-events-none"
                style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
              />
            ) : (
              <Globe
                size={iconSize}
                className="shrink-0"
                style={{ color: social.iconColor || def.brandColor || "#ffffff" }}
              />
            )}
            {!isCircle && social.showHandle !== false && (
              <span className="text-[11px] font-mono truncate">{displayLabel}</span>
            )}
          </div>
        );
      }

      case "container": {
        const container = elem as ContainerElement;
        const childElements = elements
          .filter((c) => c.parentId === container.id && c.visible)
          .sort((a, b) => a.zIndex - b.zIndex);

        return (
          <div
            className="relative w-full h-full"
            style={{
              backgroundColor: hexToRgba(
                container.backgroundColor || "#0e0e13",
                container.backgroundOpacity ?? 0.96
              ),
              borderColor: container.borderColor || "#282834",
              borderWidth: `${container.borderWidth ?? 1}px`,
              borderStyle: "solid",
              borderRadius: `${container.borderRadius ?? 20}px`,
              backdropFilter: container.glassmorphism !== false ? "blur(16px)" : undefined,
              boxShadow: container.shadow
                ? `${container.shadow.offsetX}px ${container.shadow.offsetY}px ${container.shadow.blur}px ${container.shadow.color}`
                : undefined,
            }}
            data-testid={`embed-container-body-${container.id}`}
          >
            {childElements.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-bold">
                  {container.name || "Profile Embed"}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 mt-1">
                  Select & click + Add Element to build your card
                </span>
              </div>
            )}

            {/* Render Nested Independent Child Components */}
            {childElements.map((child) => renderCanvasElementWrapper(child))}
          </div>
        );
      }

      default: {
        const fallback = elem as EditorElement;
        return (
          <div className="w-full h-full border border-dashed border-white/20 flex items-center justify-center text-xs font-mono text-neutral-500">
            {fallback.name}
          </div>
        );
      }
    }
  };

  // Shared wrapper for top-level elements, embeds, and nested embed child components
  const renderCanvasElementWrapper = (elem: EditorElement) => {
    const isSelected = selectedId === elem.id;
    const isParentEmbed = elem.type === "container";

    return (
      <div
        key={elem.id}
        onPointerDown={(e) => handleElementPointerDown(e, elem)}
        style={{
          position: "absolute",
          left: `${elem.x}px`,
          top: `${elem.y}px`,
          width: `${elem.width}px`,
          height: `${elem.height}px`,
          transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined,
          opacity: elem.opacity,
          zIndex: elem.zIndex,
          cursor: elem.locked ? "default" : "move",
        }}
        className="group/elem"
        data-testid={`canvas-elem-${elem.id}`}
        data-elem-type={elem.type}
        data-parent-id={elem.parentId || ""}
      >
        {renderElementContent(elem)}

        {/* Locked Selection Indicator (preserves selection & unlock via toolbar) */}
        {isSelected && elem.locked && (
          <div
            className="absolute -inset-1 border border-dashed border-amber-400/80 pointer-events-none z-50 rounded-sm"
            data-testid="locked-selection-outline"
          />
        )}

        {/* Editable Selection Box & Resize Handles */}
        {isSelected && !elem.locked && (
          <div
            className={`absolute -inset-1 border pointer-events-none z-50 ${
              isParentEmbed ? "border-[#d71920]/90" : "border-white"
            }`}
            data-testid={isParentEmbed ? "embed-selection-outline" : "child-selection-outline"}
          >
            {/* Rotation Stem & Handle */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                didMutateDuringDragRef.current = false;
                setActiveHandle("rotate");
                setDragStart({ x: e.clientX, y: e.clientY });
                setInitialElemState({ ...elem });
              }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border border-black shadow-md cursor-grab pointer-events-auto flex items-center justify-center hover:scale-125 transition-transform"
              title="Rotate element"
              data-testid="handle-rotate"
            >
              <div className="w-1 h-1 rounded-full bg-black" />
            </div>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-white pointer-events-none" />

            {/* 8 Resize Handles */}
            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleType[]).map((handle) => {
              const posStyles: Record<HandleType, string> = {
                nw: "-top-1 -left-1 cursor-nwse-resize",
                n: "-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize",
                ne: "-top-1 -right-1 cursor-nesw-resize",
                e: "top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize",
                se: "-bottom-1 -right-1 cursor-nwse-resize",
                s: "-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize",
                sw: "-bottom-1 -left-1 cursor-nesw-resize",
                w: "top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize",
                rotate: "",
              };

              return (
                <div
                  key={handle}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    didMutateDuringDragRef.current = false;
                    setActiveHandle(handle);
                    setDragStart({ x: e.clientX, y: e.clientY });
                    setInitialElemState({ ...elem });
                  }}
                  className={`absolute w-2.5 h-2.5 bg-white border border-black shadow pointer-events-auto ${posStyles[handle]}`}
                  data-testid={`handle-${handle}`}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Compute dynamic smart floating toolbar & Add Element menu coordinates inside workspace bounds
  const showFloatingToolbar =
    Boolean(selectedElement) &&
    selectedElement!.visible &&
    (selectedElement!.type === "container" || Boolean(selectedElement!.parentId));

  const computeFloatingToolbarGeometry = () => {
    if (!selectedElement) return null;
    const abs = getElementAbsoluteRect(selectedElement, elements);
    const artboardLeft = (workspaceSize.width - canvas.width * zoom) / 2;
    const artboardTop = (workspaceSize.height - canvas.height * zoom) / 2;

    const elemLeft = artboardLeft + abs.x * zoom;
    const elemTop = artboardTop + abs.y * zoom;
    const elemW = abs.width * zoom;
    const elemH = abs.height * zoom;
    const elemRight = elemLeft + elemW;
    const elemBottom = elemTop + elemH;

    const isParentEmbed = selectedElement.type === "container";
    const toolbarW = isParentEmbed ? 206 : 106;
    const toolbarH = 34;
    const gap = 12;
    const margin = 10;

    const clampX = (rawX: number) =>
      Math.round(
        Math.max(margin, Math.min(Math.max(margin, workspaceSize.width - toolbarW - margin), rawX))
      );
    const clampY = (rawY: number) =>
      Math.round(
        Math.max(margin, Math.min(Math.max(margin, workspaceSize.height - toolbarH - margin), rawY))
      );

    let left = clampX(elemLeft + elemW / 2 - toolbarW / 2);
    let top = clampY(elemTop - gap - toolbarH);
    let placement: "top" | "bottom" | "right" | "left" = "top";

    if (elemTop - gap - toolbarH >= margin) {
      placement = "top";
      top = Math.round(elemTop - gap - toolbarH);
      left = clampX(elemLeft + elemW / 2 - toolbarW / 2);
    } else if (elemBottom + gap + toolbarH <= workspaceSize.height - margin) {
      placement = "bottom";
      top = Math.round(elemBottom + gap);
      left = clampX(elemLeft + elemW / 2 - toolbarW / 2);
    } else if (elemRight + gap + toolbarW <= workspaceSize.width - margin) {
      placement = "right";
      left = Math.round(elemRight + gap);
      top = clampY(elemTop + elemH / 2 - toolbarH / 2);
    } else if (elemLeft - gap - toolbarW >= margin) {
      placement = "left";
      left = Math.round(elemLeft - gap - toolbarW);
      top = clampY(elemTop + elemH / 2 - toolbarH / 2);
    } else {
      placement = "bottom";
      top = clampY(elemTop + 8);
      left = clampX(elemLeft + elemW / 2 - toolbarW / 2);
    }

    // Clamp Add Element Menu (approx 236x312) safely inside workspace
    const menuW = Math.min(240, Math.max(190, workspaceSize.width - margin * 2));
    const menuH = Math.min(324, Math.max(200, workspaceSize.height - margin * 2));
    const menuLeft = Math.round(
      Math.max(margin, Math.min(workspaceSize.width - menuW - margin, left))
    );
    const spaceBelowToolbar = workspaceSize.height - (top + toolbarH + 8) - margin;
    const menuTop =
      spaceBelowToolbar >= menuH
        ? Math.round(top + toolbarH + 8)
        : Math.round(
            Math.max(
              margin,
              Math.min(workspaceSize.height - menuH - margin, top - menuH - 8)
            )
          );

    return {
      left,
      top,
      width: toolbarW,
      height: toolbarH,
      placement,
      menuLeft,
      menuTop,
      menuW,
      menuH,
    };
  };

  const floatingToolbarGeom = showFloatingToolbar ? computeFloatingToolbarGeometry() : null;
  const topLevelElements = elements.filter((el) => !el.parentId && el.visible);

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="flex-1 w-full h-full overflow-hidden bg-[#070709] relative flex items-center justify-center select-none"
      data-testid="doory-canvas-workspace"
    >
      {/* Background Dot Grid */}
      <div className="absolute inset-0 nt-dot-grid opacity-20 pointer-events-none" />

      {/* Artboard Container */}
      <div
        id="canvas-artboard"
        ref={artboardRef}
        style={{
          width: `${canvas.width}px`,
          height: `${canvas.height}px`,
          backgroundColor: canvas.background.color,
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
        className="relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#22222a] shrink-0 transition-transform duration-75"
        data-testid="canvas-artboard"
      >
        {/* Render Pattern Layer */}
        {canvas.background.pattern === "dot-matrix" && (
          <div
            className="absolute inset-0 nt-dot-grid pointer-events-none z-0"
            style={{ opacity: canvas.background.patternOpacity ?? 0.15 }}
          />
        )}
        {canvas.background.pattern === "grid" && (
          <div
            className="absolute inset-0 nt-grid-line pointer-events-none z-0"
            style={{ opacity: canvas.background.patternOpacity ?? 0.15 }}
          />
        )}

        {/* Snap Guidelines */}
        {guideX !== null && (
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-[#d71920] pointer-events-none z-50 shadow-[0_0_4px_#d71920]"
            style={{ left: `${guideX}px` }}
            data-testid="snap-guide-x"
          />
        )}
        {guideY !== null && (
          <div
            className="absolute left-0 right-0 h-[1px] bg-[#d71920] pointer-events-none z-50 shadow-[0_0_4px_#d71920]"
            style={{ top: `${guideY}px` }}
            data-testid="snap-guide-y"
          />
        )}

        {/* Top-Level Canvas Elements & Profile Embeds (Children render nested inside parents) */}
        {topLevelElements.map((elem) => renderCanvasElementWrapper(elem))}
      </div>

      {/* Dynamic Smart Contextual Floating Toolbar for Parent Embed & Embed Children */}
      {showFloatingToolbar && selectedElement && floatingToolbarGeom && (
        <div
          style={{
            position: "absolute",
            left: `${floatingToolbarGeom.left}px`,
            top: `${floatingToolbarGeom.top}px`,
            height: `${floatingToolbarGeom.height}px`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="z-40 bg-[#0d0d12]/96 backdrop-blur-xl border border-white/15 rounded-xl px-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] flex items-center gap-1 font-mono text-xs"
          data-testid="canvas-floating-toolbar"
          data-toolbar-placement={floatingToolbarGeom.placement}
          data-toolbar-target={selectedElement.type === "container" ? "embed" : "child"}
        >
          {/* Duplicate */}
          <button
            type="button"
            onClick={() => onDuplicateElement(selectedElement.id)}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Duplicate (Ctrl+D)"
            aria-label="Duplicate"
            data-testid="floating-toolbar-duplicate"
          >
            <Copy size={13} />
          </button>

          {/* Lock / Unlock */}
          <button
            type="button"
            onClick={() =>
              onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })
            }
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedElement.locked
                ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25"
                : "text-neutral-300 hover:text-white hover:bg-white/10"
            }`}
            title={selectedElement.locked ? "Unlock (Ctrl+L)" : "Lock (Ctrl+L)"}
            aria-label={selectedElement.locked ? "Unlock element" : "Lock element"}
            data-testid="floating-toolbar-lock"
          >
            {selectedElement.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>

          {/* Add Element — EXCLUSIVELY on Parent Embed */}
          {selectedElement.type === "container" && onAddEmbedChild && (
            <button
              type="button"
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                isAddMenuOpen
                  ? "bg-white text-black"
                  : "bg-[#d71920] hover:bg-[#e1252c] text-white"
              }`}
              title="Add component inside embed"
              aria-label="Add Element"
              aria-expanded={isAddMenuOpen}
              data-testid="floating-toolbar-add-element"
            >
              <Plus size={12} />
              <span>Add Element</span>
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={() => {
              setIsAddMenuOpen(false);
              onDeleteElement(selectedElement.id);
            }}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
            title="Delete (Del)"
            aria-label="Delete"
            data-testid="floating-toolbar-delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Add Element Menu (Parent Embed Only, Clamped to Workspace) */}
      {showFloatingToolbar &&
        selectedElement?.type === "container" &&
        isAddMenuOpen &&
        floatingToolbarGeom &&
        onAddEmbedChild && (
          <div
            style={{
              position: "absolute",
              left: `${floatingToolbarGeom.menuLeft}px`,
              top: `${floatingToolbarGeom.menuTop}px`,
              width: `${floatingToolbarGeom.menuW}px`,
              maxHeight: `${floatingToolbarGeom.menuH}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="z-50 bg-[#0d0d12]/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 overflow-y-auto custom-scrollbar font-mono"
            data-testid="embed-add-element-menu"
          >
            <div className="px-2 py-1 mb-1 border-b border-[#1e1e26] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Add Embed Component
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d71920]" />
            </div>
            <div className="space-y-0.5">
              {EMBED_COMPONENT_CATALOG.map((item) => {
                const Icon = getCatalogIcon(item.kind);
                return (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => {
                      onAddEmbedChild(selectedElement.id, item.kind);
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer group"
                    data-testid={`add-embed-comp-${item.kind}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#16161e] border border-white/10 flex items-center justify-center shrink-0 text-neutral-300 group-hover:text-white group-hover:border-white/25">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-white leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[9px] text-neutral-500 truncate">
                        {item.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Floating Bottom-Right Zoom Controls */}
      <div className="absolute bottom-5 right-5 flex items-center bg-[#101014]/90 backdrop-blur-md border border-[#22222a] rounded-xl px-2 py-1.5 gap-2 z-30 font-mono shadow-2xl text-xs">
        <button
          onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom Out"
          data-testid="zoom-out"
        >
          <ZoomOut size={13} />
        </button>
        <span className="text-[11px] font-bold text-white w-10 text-center" data-testid="zoom-display">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom In"
          data-testid="zoom-in"
        >
          <ZoomIn size={13} />
        </button>
        <div className="w-[1px] h-3 bg-white/20" />
        <button
          onClick={onFitScreen}
          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Fit to Screen"
          data-testid="zoom-fit"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Attribution Assurance Notice Badge */}
      <div className="absolute bottom-5 left-5 z-30 pointer-events-auto">
        <a
          href="https://github.com/shaongitbd/doory"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e0e12]/90 backdrop-blur-md border border-white/10 text-[10px] font-mono text-neutral-400 hover:text-white hover:border-white/30 transition-all shadow-xl group"
          title="Doory by Siam (Attribution Assurance License)"
          data-testid="doory-attribution-badge"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d71920]" />
          <span>Doory by Siam (Attribution Assurance License) // Pixel.gg</span>
          <ExternalLink size={10} className="text-neutral-500 group-hover:text-white transition-colors" />
        </a>
      </div>
    </div>
  );
};
