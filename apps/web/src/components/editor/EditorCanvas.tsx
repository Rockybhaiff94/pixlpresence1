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

interface EditorCanvasProps {
  canvas: {
    width: number;
    height: number;
    background: CanvasBackground;
  };
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  isPanMode: boolean;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  canvas,
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  zoom,
  showGrid,
  snapToGrid,
  pan,
  setPan,
  isPanMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElemState, setInitialElemState] = useState<EditorElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Active snap guides
  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Handle pan
  const handleMouseDownContainer = (e: React.MouseEvent) => {
    if (isPanMode || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      return;
    }
    // Clicking empty space deselects
    if (e.target === containerRef.current || (e.target as HTMLElement).id === "canvas-artboard") {
      onSelect(null);
      setEditingTextId(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      if (!selectedElement || selectedElement.locked) return;

      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      if (isDragging && initialElemState) {
        let newX = initialElemState.x + deltaX;
        let newY = initialElemState.y + deltaY;

        // Snapping logic
        if (snapToGrid) {
          const gridSize = 16;
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        // Center canvas snapping
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const elemCenterX = newX + initialElemState.width / 2;
        const elemCenterY = newY + initialElemState.height / 2;

        if (Math.abs(elemCenterX - centerX) < 8) {
          newX = centerX - initialElemState.width / 2;
          setGuideX(centerX);
        } else {
          setGuideX(null);
        }

        if (Math.abs(elemCenterY - centerY) < 8) {
          newY = centerY - initialElemState.height / 2;
          setGuideY(centerY);
        } else {
          setGuideY(null);
        }

        onUpdateElement(selectedElement.id, {
          x: Math.round(newX),
          y: Math.round(newY),
        });
      } else if (activeHandle && initialElemState) {
        if (activeHandle === "rotate") {
          const elemCenterX = (initialElemState.x + initialElemState.width / 2) * zoom + pan.x;
          const elemCenterY = (initialElemState.y + initialElemState.height / 2) * zoom + pan.y;
          const rad = Math.atan2(e.clientY - elemCenterY, e.clientX - elemCenterX);
          let deg = Math.round((rad * 180) / Math.PI) + 90;
          if (deg < 0) deg += 360;
          if (deg >= 360) deg -= 360;
          if (snapToGrid && Math.abs(deg % 45) < 5) {
            deg = Math.round(deg / 45) * 45;
          }
          onUpdateElement(selectedElement.id, { rotation: deg });
        } else {
          // Resize handles
          let newX = initialElemState.x;
          let newY = initialElemState.y;
          let newW = initialElemState.width;
          let newH = initialElemState.height;

          if (activeHandle.includes("e")) newW = Math.max(10, initialElemState.width + deltaX);
          if (activeHandle.includes("s")) newH = Math.max(10, initialElemState.height + deltaY);
          if (activeHandle.includes("w")) {
            const potentialW = initialElemState.width - deltaX;
            if (potentialW >= 10) {
              newW = potentialW;
              newX = initialElemState.x + deltaX;
            }
          }
          if (activeHandle.includes("n")) {
            const potentialH = initialElemState.height - deltaY;
            if (potentialH >= 10) {
              newH = potentialH;
              newY = initialElemState.y + deltaY;
            }
          }

          onUpdateElement(selectedElement.id, {
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          });
        }
      }
    },
    [
      isPanning,
      panStart,
      setPan,
      selectedElement,
      dragStart,
      zoom,
      isDragging,
      initialElemState,
      snapToGrid,
      canvas.width,
      canvas.height,
      onUpdateElement,
      activeHandle,
      pan.x,
      pan.y,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
    setIsPanning(false);
    setGuideX(null);
    setGuideY(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Start dragging element
  const handleElementMouseDown = (e: React.MouseEvent, el: EditorElement) => {
    if (isPanMode || el.locked) return;
    e.stopPropagation();
    onSelect(el.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElemState({ ...el });
  };

  // Start handle transform
  const handleHandleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    if (!selectedElement || selectedElement.locked) return;
    e.stopPropagation();
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElemState({ ...selectedElement });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDownContainer}
      className={`relative w-full h-full overflow-hidden select-none bg-[#050505] flex items-center justify-center ${
        isPanMode || isPanning ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      style={{
        backgroundImage: showGrid
          ? "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)"
          : "none",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Canvas Viewport Transformer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isPanning || isDragging || activeHandle ? "none" : "transform 0.1s ease-out",
        }}
        className="relative"
      >
        {/* Artboard Surface */}
        <div
          id="canvas-artboard"
          className="relative shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-[#222222] transition-colors"
          style={{
            width: `${canvas.width}px`,
            height: `${canvas.height}px`,
            backgroundColor: canvas.background.color || "#080808",
            backgroundImage:
              canvas.background.type === "gradient" && canvas.background.gradientTo
                ? `linear-gradient(${canvas.background.gradientAngle || 90}deg, ${canvas.background.color}, ${canvas.background.gradientTo})`
                : undefined,
          }}
        >
          {/* Background Pattern Overlay */}
          {canvas.background.pattern === "dot-matrix" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, ${canvas.background.patternOpacity || 0.1}) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
          )}
          {canvas.background.pattern === "grid" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, ${canvas.background.patternOpacity || 0.08}) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, ${canvas.background.patternOpacity || 0.08}) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
          )}

          {/* Industrial Crosshair Accents */}
          <span className="absolute -top-3 -left-3 font-mono text-[#444444] text-xs pointer-events-none">+</span>
          <span className="absolute -top-3 -right-3 font-mono text-[#444444] text-xs pointer-events-none">+</span>
          <span className="absolute -bottom-3 -left-3 font-mono text-[#444444] text-xs pointer-events-none">+</span>
          <span className="absolute -bottom-3 -right-3 font-mono text-[#444444] text-xs pointer-events-none">+</span>

          {/* Render Elements */}
          {elements
            .filter((el) => el.visible)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => {
              const isSelected = el.id === selectedId;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  className={`absolute group ${el.locked ? "cursor-not-allowed" : "cursor-move"}`}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    opacity: el.opacity,
                    zIndex: el.zIndex,
                  }}
                >
                  {/* Element Body Renderers */}
                  {el.type === "shape" && <RenderShape shape={el as ShapeElement} />}
                  {el.type === "text" && (
                    <RenderText
                      textEl={el as TextElement}
                      isEditing={editingTextId === el.id}
                      onUpdate={(text) => onUpdateElement(el.id, { text })}
                      onFinishEdit={() => setEditingTextId(null)}
                      onStartEdit={() => setEditingTextId(el.id)}
                    />
                  )}
                  {el.type === "image" && <RenderImage img={el as ImageElement} />}
                  {el.type === "sticker" && <RenderSticker sticker={el as StickerElement} />}

                  {/* Hover outline if not selected */}
                  {!isSelected && (
                    <div className="absolute inset-0 border border-transparent group-hover:border-[#8b5cf6]/60 pointer-events-none transition-colors" />
                  )}
                </div>
              );
            })}

          {/* Interactive Bounding Box & Handles for Selected Element */}
          {selectedElement && (
            <div
              className="absolute pointer-events-none border border-white"
              style={{
                left: `${selectedElement.x}px`,
                top: `${selectedElement.y}px`,
                width: `${selectedElement.width}px`,
                height: `${selectedElement.height}px`,
                transform: selectedElement.rotation ? `rotate(${selectedElement.rotation}deg)` : undefined,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 0 12px rgba(255,255,255,0.2)",
                zIndex: 9999,
              }}
            >
              {/* Rotation Handle with stem */}
              {!selectedElement.locked && (
                <>
                  <div className="absolute left-1/2 -top-6 w-[1px] h-6 bg-white pointer-events-none -translate-x-1/2" />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "rotate")}
                    className="absolute left-1/2 -top-8 w-4 h-4 rounded-full bg-white border-2 border-black pointer-events-auto cursor-grab active:cursor-grabbing -translate-x-1/2 hover:scale-125 transition-transform"
                    title="Rotate element"
                  />
                </>
              )}

              {/* 8 Resize Handles */}
              {!selectedElement.locked && (
                <>
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "nw")}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-nwse-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "n")}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-black pointer-events-auto cursor-ns-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "ne")}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-nesw-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "e")}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-ew-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "se")}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-nwse-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "s")}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-black pointer-events-auto cursor-ns-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "sw")}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-nesw-resize"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, "w")}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border border-black pointer-events-auto cursor-ew-resize"
                  />
                </>
              )}

              {/* Dimension label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-neutral-400 bg-black/90 px-2 py-0.5 rounded border border-[#222222] whitespace-nowrap pointer-events-none">
                {selectedElement.width} × {selectedElement.height}
                {selectedElement.rotation ? ` • ${selectedElement.rotation}°` : ""}
              </div>
            </div>
          )}

          {/* Smart Alignment Guides */}
          {guideX !== null && (
            <div
              className="absolute top-0 bottom-0 w-[1px] bg-[#d71920] pointer-events-none"
              style={{ left: `${guideX}px`, boxShadow: "0 0 6px rgba(215,25,32,0.8)" }}
            />
          )}
          {guideY !== null && (
            <div
              className="absolute left-0 right-0 h-[1px] bg-[#d71920] pointer-events-none"
              style={{ top: `${guideY}px`, boxShadow: "0 0 6px rgba(215,25,32,0.8)" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Element Render Components --- */

const RenderShape: React.FC<{ shape: ShapeElement }> = ({ shape }) => {
  const { shapeKind, fill, stroke, strokeWidth, cornerRadius = 0, glow, shadow } = shape;

  const glowStyle =
    glow && glow.intensity > 0
      ? `0 0 ${glow.intensity}px ${glow.color}`
      : shadow && shadow.blur > 0
      ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur}px ${shadow.color}`
      : undefined;

  if (shapeKind === "circle") {
    return (
      <div
        className="w-full h-full rounded-full"
        style={{
          backgroundColor: fill,
          borderColor: stroke,
          borderWidth: `${strokeWidth}px`,
          borderStyle: strokeWidth > 0 ? "solid" : "none",
          boxShadow: glowStyle,
        }}
      />
    );
  }

  if (shapeKind === "rounded-rectangle" || shapeKind === "rectangle") {
    return (
      <div
        className="w-full h-full"
        style={{
          backgroundColor: fill,
          borderColor: stroke,
          borderWidth: `${strokeWidth}px`,
          borderStyle: strokeWidth > 0 ? "solid" : "none",
          borderRadius: shapeKind === "rounded-rectangle" ? `${cornerRadius}px` : "0px",
          boxShadow: glowStyle,
        }}
      />
    );
  }

  if (shapeKind === "triangle") {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          points="50,0 100,100 0,100"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ filter: glowStyle ? `drop-shadow(${glowStyle})` : undefined }}
        />
      </svg>
    );
  }

  if (shapeKind === "star") {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <polygon
          points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ filter: glowStyle ? `drop-shadow(${glowStyle})` : undefined }}
        />
      </svg>
    );
  }

  return (
    <div
      className="w-full h-full"
      style={{
        backgroundColor: fill,
        border: `${strokeWidth}px solid ${stroke}`,
      }}
    />
  );
};

const RenderText: React.FC<{
  textEl: TextElement;
  isEditing: boolean;
  onUpdate: (text: string) => void;
  onFinishEdit: () => void;
  onStartEdit: () => void;
}> = ({ textEl, isEditing, onUpdate, onFinishEdit, onStartEdit }) => {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle = "normal",
    color,
    textAlign,
    letterSpacing,
    lineHeight,
    textTransform = "none",
    underline,
    glow,
    shadow,
  } = textEl;

  const glowStyle =
    glow && glow.intensity > 0
      ? `0 0 ${glow.intensity}px ${glow.color}`
      : shadow && shadow.blur > 0
      ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur}px ${shadow.color}`
      : undefined;

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={onFinishEdit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onFinishEdit();
        }}
        className="w-full h-full bg-black/80 border border-white text-white resize-none outline-none p-1 rounded"
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
          fontWeight,
          fontStyle,
          textAlign,
          letterSpacing: `${letterSpacing}px`,
          lineHeight,
          textTransform,
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={onStartEdit}
      className="w-full h-full flex flex-col justify-start select-none overflow-hidden"
      style={{
        fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        fontStyle,
        color,
        textAlign,
        letterSpacing: `${letterSpacing}px`,
        lineHeight,
        textTransform,
        textDecoration: underline ? "underline" : "none",
        textShadow: glowStyle,
      }}
    >
      {text}
    </div>
  );
};

const RenderImage: React.FC<{ img: ImageElement }> = ({ img }) => {
  const { src, fit, borderRadius = 0, filters } = img;

  const filterStyle = filters
    ? `brightness(${filters.brightness || 100}%) contrast(${filters.contrast || 100}%) blur(${filters.blur || 0}px) grayscale(${filters.grayscale || 0}%)`
    : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Design element"
      className="w-full h-full pointer-events-none select-none"
      style={{
        objectFit: fit,
        borderRadius: `${borderRadius}px`,
        filter: filterStyle,
      }}
    />
  );
};

const RenderSticker: React.FC<{ sticker: StickerElement }> = ({ sticker }) => {
  const { key, color, backgroundColor = "#141414" } = sticker;

  return (
    <div
      className="w-full h-full rounded-xl flex items-center justify-center border border-[#262626] font-mono font-bold"
      style={{
        backgroundColor,
        color,
      }}
    >
      <span className="text-sm tracking-wider uppercase">{key}</span>
    </div>
  );
};
