"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  EditorElement,
  CanvasBackground,
  ShapeElement,
  TextElement,
  ImageElement,
  StickerElement,
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
} from "lucide-react";

interface DooryCanvasWorkspaceProps {
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitScreen: () => void;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export const DooryCanvasWorkspace: React.FC<DooryCanvasWorkspaceProps> = ({
  canvas,
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  zoom,
  onZoomChange,
  onFitScreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElemState, setInitialElemState] = useState<EditorElement | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Snapping guides
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Handle pointer down on background/artboard
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === "canvas-artboard") {
      onSelect(null);
      setEditingTextId(null);
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;

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

  // Pointer movement handling for dragging and resizing
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!selectedElement || selectedElement.locked) return;

      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      if (isDragging && initialElemState) {
        let newX = Math.round(initialElemState.x + deltaX);
        let newY = Math.round(initialElemState.y + deltaY);

        // Snap guides
        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;
        const elemCenterX = newX + initialElemState.width / 2;
        const elemCenterY = newY + initialElemState.height / 2;

        let snapX: number | null = null;
        let snapY: number | null = null;

        if (Math.abs(elemCenterX - canvasCenterX) < 6) {
          newX = Math.round(canvasCenterX - initialElemState.width / 2);
          snapX = canvasCenterX;
        }
        if (Math.abs(elemCenterY - canvasCenterY) < 6) {
          newY = Math.round(canvasCenterY - initialElemState.height / 2);
          snapY = canvasCenterY;
        }

        setGuideX(snapX);
        setGuideY(snapY);

        onUpdateElement(selectedElement.id, { x: newX, y: newY });
      } else if (activeHandle && initialElemState) {
        if (activeHandle === "rotate") {
          const centerX = initialElemState.x + initialElemState.width / 2;
          const centerY = initialElemState.y + initialElemState.height / 2;
          const artboardRect = document.getElementById("canvas-artboard")?.getBoundingClientRect();
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
            onUpdateElement(selectedElement.id, { rotation: angleDeg % 360 });
          }
        } else {
          let { x, y, width, height } = initialElemState;
          if (activeHandle.includes("e")) width = Math.max(20, initialElemState.width + deltaX);
          if (activeHandle.includes("s")) height = Math.max(20, initialElemState.height + deltaY);
          if (activeHandle.includes("w")) {
            const newW = Math.max(20, initialElemState.width - deltaX);
            x = initialElemState.x + (initialElemState.width - newW);
            width = newW;
          }
          if (activeHandle.includes("n")) {
            const newH = Math.max(20, initialElemState.height - deltaY);
            y = initialElemState.y + (initialElemState.height - newH);
            height = newH;
          }

          onUpdateElement(selectedElement.id, {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
    },
    [isDragging, activeHandle, dragStart, initialElemState, selectedElement, zoom, canvas, onUpdateElement]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
    setGuideX(null);
    setGuideY(null);
  }, []);

  useEffect(() => {
    if (isDragging || activeHandle) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, activeHandle, handleMouseMove, handleMouseUp]);

  // Handle click on element
  const handleElementMouseDown = (e: React.MouseEvent, elem: EditorElement) => {
    e.stopPropagation();
    onSelect(elem.id);

    if (elem.locked) return;

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

  // Render single element
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
            onChange={(e) => onUpdateElement(elem.id, { text: e.target.value })}
            onBlur={() => setEditingTextId(null)}
            className="w-full h-full bg-transparent resize-none outline-none border border-white/40 p-1"
            style={{
              fontFamily: textElem.fontFamily,
              fontSize: `${textElem.fontSize}px`,
              fontWeight: textElem.fontWeight,
              fontStyle: textElem.fontStyle || "normal",
              color: textElem.color,
              textAlign: textElem.textAlign,
            }}
          />
        ) : (
          <div
            onDoubleClick={() => !elem.locked && setEditingTextId(elem.id)}
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
        } else if (shape.shapeKind === "rounded-rectangle") {
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
        } else if (shape.shapeKind === "circle" || shape.shapeKind === "ellipse") {
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
        } else if (shape.shapeKind === "triangle") {
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
        } else if (shape.shapeKind === "star") {
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
        } else if (shape.shapeKind === "line") {
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
        } else if (shape.shapeKind === "arrow") {
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
        return (
          <img
            src={img.src}
            alt={img.name}
            draggable={false}
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{ borderRadius: `${img.borderRadius || 0}px` }}
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

      default:
        return (
          <div className="w-full h-full border border-dashed border-white/20 flex items-center justify-center text-xs font-mono text-neutral-500">
            {elem.name}
          </div>
        );
    }
  };

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
          />
        )}
        {guideY !== null && (
          <div
            className="absolute left-0 right-0 h-[1px] bg-[#d71920] pointer-events-none z-50 shadow-[0_0_4px_#d71920]"
            style={{ top: `${guideY}px` }}
          />
        )}

        {/* Canvas Elements */}
        {elements.map((elem) => {
          const isSelected = selectedId === elem.id;

          return (
            <div
              key={elem.id}
              onMouseDown={(e) => handleElementMouseDown(e, elem)}
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
            >
              {renderElementContent(elem)}

              {/* Selection Box & Resize Handles */}
              {isSelected && !elem.locked && (
                <div className="absolute -inset-1 border border-white pointer-events-none z-50">
                  {/* Rotation Stem & Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
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
                        onMouseDown={(e) => {
                          e.stopPropagation();
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
        })}
      </div>

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
