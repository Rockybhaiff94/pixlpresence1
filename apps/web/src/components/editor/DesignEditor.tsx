"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  EditorElement,
  CanvasBackground,
  ShapeKind,
  EditorPreset,
  EditorTemplate,
  EditorHistoryState,
} from "./editorTypes";
import { CANVAS_PRESETS, STARTER_TEMPLATES } from "./editorPresets";
import { EditorToolbar } from "./EditorToolbar";
import { EditorSidebar } from "./EditorSidebar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorPropertiesPanel } from "./EditorPropertiesPanel";
import { exportToPng, exportToSvg, exportToJson } from "./canvasExport";

export const DesignEditor: React.FC = () => {
  const [title, setTitle] = useState("Discord Header Concept");
  const [currentPresetId, setCurrentPresetId] = useState<string>("discord-banner");

  const [canvas, setCanvas] = useState<{
    width: number;
    height: number;
    background: CanvasBackground;
  }>({
    width: 960,
    height: 540,
    background: {
      type: "solid",
      color: "#080808",
      pattern: "dot-matrix",
      patternOpacity: 0.12,
    },
  });

  const [elements, setElements] = useState<EditorElement[]>(() => {
    return STARTER_TEMPLATES[0].elements;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Viewport / Navigation
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<EditorHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Status Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Record history snapshot
  const pushHistory = useCallback(
    (newElements: EditorElement[], newCanvas: typeof canvas) => {
      if (isHistoryActionRef.current) return;

      const snapshot: EditorHistoryState = {
        elements: JSON.parse(JSON.stringify(newElements)),
        selectedId,
        canvas: JSON.parse(JSON.stringify(newCanvas)),
      };

      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, snapshot].slice(-30); // keep max 30 snapshots
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
    },
    [historyIndex, selectedId]
  );

  // Initialize first history entry
  useEffect(() => {
    if (history.length === 0) {
      const initialSnapshot: EditorHistoryState = {
        elements: JSON.parse(JSON.stringify(elements)),
        selectedId: null,
        canvas: JSON.parse(JSON.stringify(canvas)),
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
  }, []);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryActionRef.current = true;
      const targetIndex = historyIndex - 1;
      const state = history[targetIndex];
      setElements(JSON.parse(JSON.stringify(state.elements)));
      setCanvas(JSON.parse(JSON.stringify(state.canvas)));
      setSelectedId(state.selectedId);
      setHistoryIndex(targetIndex);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetIndex = historyIndex + 1;
      const state = history[targetIndex];
      setElements(JSON.parse(JSON.stringify(state.elements)));
      setCanvas(JSON.parse(JSON.stringify(state.canvas)));
      setSelectedId(state.selectedId);
      setHistoryIndex(targetIndex);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  // Canvas updates
  const handleUpdateCanvas = (updates: {
    width?: number;
    height?: number;
    background?: Partial<CanvasBackground>;
  }) => {
    setCanvas((prev) => {
      const next = {
        width: updates.width ?? prev.width,
        height: updates.height ?? prev.height,
        background: { ...prev.background, ...updates.background },
      };
      pushHistory(elements, next);
      return next;
    });
  };

  // Element updates
  const handleUpdateElement = (id: string, updates: Partial<EditorElement>) => {
    setElements((prev) => {
      const next = prev.map((el) => (el.id === id ? ({ ...el, ...updates } as EditorElement) : el));
      return next;
    });
  };

  // Record history after drag / resize mouse up
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      pushHistory(elements, canvas);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [elements, canvas, pushHistory]);

  // Add Shape
  const handleAddShape = (kind: ShapeKind) => {
    const newEl: EditorElement = {
      id: `shape-${Date.now()}`,
      name: `${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
      type: "shape",
      shapeKind: kind,
      x: Math.round(canvas.width / 2 - 100),
      y: Math.round(canvas.height / 2 - 75),
      width: 200,
      height: 150,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
      fill: "#141414",
      stroke: "#ffffff",
      strokeWidth: 1.5,
      cornerRadius: kind === "rounded-rectangle" ? 16 : 0,
    };
    const nextElements = [...elements, newEl];
    setElements(nextElements);
    setSelectedId(newEl.id);
    pushHistory(nextElements, canvas);
    showToast(`Added ${kind}`);
  };

  // Add Text
  const handleAddText = (type: "heading" | "subheading" | "body" | "code") => {
    let text = "Heading Text";
    let fontSize = 36;
    let fontWeight = 700;
    let fontFamily = "'Inter', sans-serif";
    let color = "#ffffff";
    let letterSpacing = 0;
    let width = 360;
    let height = 50;

    if (type === "subheading") {
      text = "Section Subheading";
      fontSize = 20;
      fontWeight = 600;
      width = 300;
      height = 35;
    } else if (type === "body") {
      text = "Click to edit this body paragraph description.";
      fontSize = 14;
      fontWeight = 400;
      color = "#a3a3a3";
      width = 400;
      height = 50;
    } else if (type === "code") {
      text = "[ 01 // DEV_SYSTEM_ACTIVE ]";
      fontSize = 13;
      fontWeight = 600;
      fontFamily = "'JetBrains Mono', monospace";
      color = "#d71920";
      letterSpacing = 2;
      width = 280;
      height = 30;
    }

    const newEl: EditorElement = {
      id: `text-${Date.now()}`,
      name: `Text (${type})`,
      type: "text",
      text,
      fontFamily,
      fontSize,
      fontWeight,
      color,
      textAlign: "left",
      letterSpacing,
      lineHeight: 1.2,
      x: Math.round(canvas.width / 2 - width / 2),
      y: Math.round(canvas.height / 2 - height / 2),
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };
    const nextElements = [...elements, newEl];
    setElements(nextElements);
    setSelectedId(newEl.id);
    pushHistory(nextElements, canvas);
    showToast(`Added text`);
  };

  // Add Sticker / Badge
  const handleAddSticker = (key: string, color: string) => {
    const newEl: EditorElement = {
      id: `sticker-${Date.now()}`,
      name: `Badge (${key})`,
      type: "sticker",
      stickerType: "badge",
      key,
      color,
      backgroundColor: "#111111",
      x: Math.round(canvas.width / 2 - 50),
      y: Math.round(canvas.height / 2 - 25),
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };
    const nextElements = [...elements, newEl];
    setElements(nextElements);
    setSelectedId(newEl.id);
    pushHistory(nextElements, canvas);
    showToast(`Added ${key} badge`);
  };

  // Add Image
  const handleAddImage = (src: string) => {
    const newEl: EditorElement = {
      id: `image-${Date.now()}`,
      name: "Uploaded Image",
      type: "image",
      src,
      fit: "cover",
      borderRadius: 12,
      x: Math.round(canvas.width / 2 - 150),
      y: Math.round(canvas.height / 2 - 100),
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };
    const nextElements = [...elements, newEl];
    setElements(nextElements);
    setSelectedId(newEl.id);
    pushHistory(nextElements, canvas);
    showToast("Added image");
  };

  // Apply Template
  const handleApplyTemplate = (template: EditorTemplate) => {
    setCanvas(JSON.parse(JSON.stringify(template.canvas)));
    setElements(JSON.parse(JSON.stringify(template.elements)));
    setCurrentPresetId(template.presetId);
    setSelectedId(null);
    pushHistory(template.elements, template.canvas);
    showToast(`Applied ${template.name}`);
  };

  // Preset Selection
  const handleSelectPreset = (preset: EditorPreset) => {
    setCurrentPresetId(preset.id);
    handleUpdateCanvas({
      width: preset.width,
      height: preset.height,
    });
    showToast(`Resized to ${preset.name}`);
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    const next = elements.filter((el) => el.id !== id);
    setElements(next);
    if (selectedId === id) setSelectedId(null);
    pushHistory(next, canvas);
    showToast("Element deleted");
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const clone: EditorElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `${el.type}-${Date.now()}`,
      name: `${el.name} (Copy)`,
      x: el.x + 20,
      y: el.y + 20,
      zIndex: elements.length + 1,
    };
    const next = [...elements, clone];
    setElements(next);
    setSelectedId(clone.id);
    pushHistory(next, canvas);
    showToast("Element duplicated");
  };

  // Reorder Element
  const handleReorderElement = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((e) => e.id === id);
    if (index === -1) return;

    if (direction === "up" && index < sorted.length - 1) {
      const temp = sorted[index].zIndex;
      sorted[index].zIndex = sorted[index + 1].zIndex;
      sorted[index + 1].zIndex = temp;
    } else if (direction === "down" && index > 0) {
      const temp = sorted[index].zIndex;
      sorted[index].zIndex = sorted[index - 1].zIndex;
      sorted[index - 1].zIndex = temp;
    } else if (direction === "top") {
      const maxZ = Math.max(...sorted.map((e) => e.zIndex), 0);
      el.zIndex = maxZ + 1;
    } else if (direction === "bottom") {
      const minZ = Math.min(...sorted.map((e) => e.zIndex), 1);
      el.zIndex = Math.max(0, minZ - 1);
    }

    setElements([...sorted]);
    pushHistory(sorted, canvas);
  };

  // Align Element
  const handleAlignElement = (
    id: string,
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    let updates: Partial<EditorElement> = {};
    if (alignment === "left") updates.x = 0;
    else if (alignment === "center-h") updates.x = Math.round((canvas.width - el.width) / 2);
    else if (alignment === "right") updates.x = canvas.width - el.width;
    else if (alignment === "top") updates.y = 0;
    else if (alignment === "center-v") updates.y = Math.round((canvas.height - el.height) / 2);
    else if (alignment === "bottom") updates.y = canvas.height - el.height;

    handleUpdateElement(id, updates);
    pushHistory(
      elements.map((e) => (e.id === id ? ({ ...e, ...updates } as EditorElement) : e)),
      canvas
    );
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        handleDuplicateElement(selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        handleDeleteElement(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (e.key.toLowerCase() === "h") {
        setIsPanMode((prev) => !prev);
      } else if (e.key.toLowerCase() === "g") {
        setShowGrid((prev) => !prev);
      } else if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const el = elements.find((e) => e.id === selectedId);
        if (!el) return;

        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;

        handleUpdateElement(selectedId, {
          x: el.x + dx,
          y: el.y + dy,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements, canvas, historyIndex, history]);

  // Fit to Screen calculation
  const handleFitScreen = () => {
    const availableWidth = window.innerWidth - 640;
    const availableHeight = window.innerHeight - 140;
    const scaleX = availableWidth / canvas.width;
    const scaleY = availableHeight / canvas.height;
    const fitScale = Math.min(scaleX, scaleY, 1.2);
    setZoom(Math.max(0.2, Number(fitScale.toFixed(2))));
    setPan({ x: 0, y: 0 });
  };

  // Export handlers
  const handleExportPng = async () => {
    try {
      await exportToPng({
        width: canvas.width,
        height: canvas.height,
        background: canvas.background,
        elements,
        pixelRatio: 2,
        filename: `${title.toLowerCase().replace(/\s+/g, "-")}.png`,
      });
      showToast("PNG downloaded (2× High Res)");
    } catch (err) {
      showToast("Export failed");
    }
  };

  const handleExportSvg = () => {
    try {
      exportToSvg({
        width: canvas.width,
        height: canvas.height,
        background: canvas.background,
        elements,
        filename: `${title.toLowerCase().replace(/\s+/g, "-")}.svg`,
      });
      showToast("SVG exported");
    } catch (err) {
      showToast("Export failed");
    }
  };

  const handleExportJson = () => {
    try {
      exportToJson({
        width: canvas.width,
        height: canvas.height,
        background: canvas.background,
        elements,
        filename: `${title.toLowerCase().replace(/\s+/g, "-")}.json`,
      });
      showToast("Project JSON saved");
    } catch (err) {
      showToast("Export failed");
    }
  };

  const handleApplyToProfile = async () => {
    try {
      const dataUrl = await exportToPng({
        width: canvas.width,
        height: canvas.height,
        background: canvas.background,
        elements,
        pixelRatio: 1.5,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("pixel_custom_banner_override", dataUrl);
      }
      showToast("Applied banner to Profile Studio!");
    } catch (err) {
      showToast("Failed to apply banner");
    }
  };

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050505] text-[#ededed] font-sans selection:bg-white selection:text-black">
      {/* Top Navigation & Toolbar */}
      <EditorToolbar
        title={title}
        onUpdateTitle={setTitle}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitScreen={handleFitScreen}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        isPanMode={isPanMode}
        onTogglePanMode={() => setIsPanMode(!isPanMode)}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportJson={handleExportJson}
        onApplyToProfile={handleApplyToProfile}
      />

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Tool Dock & Libraries */}
        <EditorSidebar
          elements={elements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddShape={handleAddShape}
          onAddText={handleAddText}
          onAddSticker={handleAddSticker}
          onAddImage={handleAddImage}
          onApplyTemplate={handleApplyTemplate}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
        />

        {/* Center: Infinite Canvas Viewport */}
        <main className="flex-1 h-full overflow-hidden relative">
          <EditorCanvas
            canvas={canvas}
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateElement={handleUpdateElement}
            zoom={zoom}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            pan={pan}
            setPan={setPan}
            isPanMode={isPanMode}
          />
        </main>

        {/* Right: Contextual Properties Inspector */}
        <EditorPropertiesPanel
          canvas={canvas}
          onUpdateCanvas={handleUpdateCanvas}
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onAlignElement={handleAlignElement}
          onReorderElement={handleReorderElement}
        />
      </div>

      {/* Floating Status Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#333333] text-white px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#d71920]" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
