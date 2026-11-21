"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  EditorElement,
  CanvasBackground,
  ShapeKind,
  EditorTemplate,
  EditorHistoryState,
  ShapeElement,
  TextElement,
  ImageElement,
  StickerElement,
} from "./editorTypes";
import { DooryToolRail, DooryRailTool } from "./DooryToolRail";
import { DooryDrawerHost } from "./DooryDrawerHost";
import { DooryContextualToolbar } from "./DooryContextualToolbar";
import { DooryCanvasWorkspace } from "./DooryCanvasWorkspace";
import { DooryTopBar, DeviceMode, SaveDraftStatus } from "./DooryTopBar";
import { EditorPropertiesPanel } from "./EditorPropertiesPanel";
import { exportToPng, exportToSvg, exportToJson } from "./canvasExport";

interface DooryEditorProps {
  initialElements?: EditorElement[];
  onElementsChange?: (elements: EditorElement[]) => void;
  children?: React.ReactNode; // e.g. StudioFloatingDock passed inside workspace
}

export const DooryEditor: React.FC<DooryEditorProps> = ({
  initialElements = [],
  onElementsChange,
  children,
}) => {
  // Title & Device Mode
  const [title, setTitle] = useState("Discord Profile Concept");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  // Active Tool Drawer
  const [activeTool, setActiveTool] = useState<DooryRailTool | null>(null);

  // Inspector visibility
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Canvas State
  const [canvas, setCanvas] = useState<{
    width: number;
    height: number;
    background: CanvasBackground;
  }>({
    width: 960,
    height: 540,
    background: {
      type: "solid",
      color: "#08080a",
      pattern: "dot-matrix",
      patternOpacity: 0.15,
    },
  });

  // Adjust canvas dimensions when device mode changes
  useEffect(() => {
    if (deviceMode === "desktop") {
      setCanvas((prev) => ({ ...prev, width: 960, height: 540 }));
    } else if (deviceMode === "tablet") {
      setCanvas((prev) => ({ ...prev, width: 768, height: 432 }));
    } else if (deviceMode === "mobile") {
      setCanvas((prev) => ({ ...prev, width: 390, height: 600 }));
    }
  }, [deviceMode]);

  // Elements State
  const [elements, setElements] = useState<EditorElement[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pixel_studio_elements_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialElements;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.85);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<EditorHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Save Draft & Publish State
  const [saveStatus, setSaveStatus] = useState<SaveDraftStatus>("idle");
  const [publishing, setPublishing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Push history snapshot
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
        return [...sliced, snapshot].slice(-30);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
      setIsDirty(true);
      onElementsChange?.(newElements);
    },
    [historyIndex, selectedId, onElementsChange]
  );

  // Initialize history
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
      const target = historyIndex - 1;
      const snapshot = history[target];
      setElements(JSON.parse(JSON.stringify(snapshot.elements)));
      setSelectedId(snapshot.selectedId);
      setCanvas(JSON.parse(JSON.stringify(snapshot.canvas)));
      setHistoryIndex(target);
      onElementsChange?.(snapshot.elements);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const target = historyIndex + 1;
      const snapshot = history[target];
      setElements(JSON.parse(JSON.stringify(snapshot.elements)));
      setSelectedId(snapshot.selectedId);
      setCanvas(JSON.parse(JSON.stringify(snapshot.canvas)));
      setHistoryIndex(target);
      onElementsChange?.(snapshot.elements);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  };

  // Tool Drawer toggle
  const handleToggleTool = (tool: DooryRailTool) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  };

  // Add Shape
  const handleAddShape = (kind: ShapeKind) => {
    const newId = `shape-${Date.now()}`;
    const newShape: ShapeElement = {
      id: newId,
      name: `${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
      type: "shape",
      shapeKind: kind,
      x: Math.round(canvas.width / 2 - 60),
      y: Math.round(canvas.height / 2 - 60),
      width: kind === "line" ? 180 : 120,
      height: kind === "line" ? 20 : 120,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
      fill: kind === "line" || kind === "arrow" ? "transparent" : "#222228",
      stroke: "#ffffff",
      strokeWidth: 2,
      cornerRadius: kind === "rectangle" ? 8 : 0,
    };

    const nextElements = [...elements, newShape];
    setElements(nextElements);
    setSelectedId(newId);
    pushHistory(nextElements, canvas);
  };

  // Add Text
  const handleAddText = (type: "heading" | "subheading" | "body" | "code" | "arc-up" | "arc-down") => {
    const newId = `text-${Date.now()}`;
    const fontSizes = {
      heading: 32,
      subheading: 20,
      body: 14,
      code: 13,
      "arc-up": 22,
      "arc-down": 22,
    };

    const defaultTexts = {
      heading: "HEADLINE TITLE",
      subheading: "Subheading description",
      body: "Sample body text for profile card.",
      code: "const presence = new PixelRPC();",
      "arc-up": "CURVED HEADING UP",
      "arc-down": "CURVED HEADING DOWN",
    };

    const newText: TextElement = {
      id: newId,
      name: `${type.toUpperCase()} Text`,
      type: "text",
      text: defaultTexts[type],
      fontFamily: type === "code" ? "JetBrains Mono" : "Space Grotesk",
      fontSize: fontSizes[type],
      fontWeight: type === "heading" ? 700 : type === "subheading" ? 600 : 400,
      color: type === "code" ? "#34d399" : "#ffffff",
      textAlign: "center",
      letterSpacing: type === "heading" ? 1 : 0,
      lineHeight: 1.2,
      x: Math.round(canvas.width / 2 - 140),
      y: Math.round(canvas.height / 2 - fontSizes[type]),
      width: 280,
      height: fontSizes[type] * 2,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };

    const nextElements = [...elements, newText];
    setElements(nextElements);
    setSelectedId(newId);
    pushHistory(nextElements, canvas);
  };

  // Add Sticker / Badge
  const handleAddSticker = (key: string, color: string) => {
    const newId = `sticker-${Date.now()}`;
    const newSticker: StickerElement = {
      id: newId,
      name: `${key.toUpperCase()} Badge`,
      type: "sticker",
      stickerType: "badge",
      key,
      color,
      x: Math.round(canvas.width / 2 - 32),
      y: Math.round(canvas.height / 2 - 32),
      width: 64,
      height: 64,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };

    const nextElements = [...elements, newSticker];
    setElements(nextElements);
    setSelectedId(newId);
    pushHistory(nextElements, canvas);
  };

  // Add Image
  const handleAddImage = (src: string) => {
    const newId = `image-${Date.now()}`;
    const newImage: ImageElement = {
      id: newId,
      name: "Graphic Image",
      type: "image",
      src,
      fit: "cover",
      borderRadius: 8,
      x: Math.round(canvas.width / 2 - 120),
      y: Math.round(canvas.height / 2 - 90),
      width: 240,
      height: 180,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      locked: false,
      visible: true,
    };

    const nextElements = [...elements, newImage];
    setElements(nextElements);
    setSelectedId(newId);
    pushHistory(nextElements, canvas);
  };

  // Apply Template
  const handleApplyTemplate = (tmpl: EditorTemplate) => {
    setCanvas(JSON.parse(JSON.stringify(tmpl.canvas)));
    setElements(JSON.parse(JSON.stringify(tmpl.elements)));
    setSelectedId(null);
    pushHistory(tmpl.elements, tmpl.canvas);
    showToast(`Applied "${tmpl.name}" template`);
  };

  // Update Element
  const handleUpdateElement = (id: string, updates: Partial<EditorElement>) => {
    const nextElements = elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...updates } as EditorElement;
      }
      return el;
    });
    setElements(nextElements);
    pushHistory(nextElements, canvas);
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    const nextElements = elements.filter((el) => el.id !== id);
    setElements(nextElements);
    if (selectedId === id) setSelectedId(null);
    pushHistory(nextElements, canvas);
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const orig = elements.find((el) => el.id === id);
    if (!orig) return;

    const copyId = `${orig.type}-${Date.now()}`;
    const copy: EditorElement = {
      ...JSON.parse(JSON.stringify(orig)),
      id: copyId,
      name: `${orig.name} (Copy)`,
      x: orig.x + 20,
      y: orig.y + 20,
      zIndex: elements.length + 1,
    };

    const nextElements = [...elements, copy];
    setElements(nextElements);
    setSelectedId(copyId);
    pushHistory(nextElements, canvas);
  };

  // Reorder Element (Z-Order)
  const handleReorderElement = (
    id: string,
    direction: "up" | "down" | "top" | "bottom"
  ) => {
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const newElems = [...elements];
    const [target] = newElems.splice(index, 1);

    if (direction === "top") {
      newElems.push(target);
    } else if (direction === "bottom") {
      newElems.unshift(target);
    } else if (direction === "up") {
      newElems.splice(Math.min(newElems.length, index + 1), 0, target);
    } else if (direction === "down") {
      newElems.splice(Math.max(0, index - 1), 0, target);
    }

    const reindexed = newElems.map((el, i) => ({ ...el, zIndex: i + 1 }));
    setElements(reindexed);
    pushHistory(reindexed, canvas);
  };

  // Align Element
  const handleAlignElement = (
    id: string,
    alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom"
  ) => {
    const elem = elements.find((el) => el.id === id);
    if (!elem) return;

    let newX = elem.x;
    let newY = elem.y;

    if (alignment === "left") newX = 0;
    if (alignment === "center-h") newX = Math.round((canvas.width - elem.width) / 2);
    if (alignment === "right") newX = canvas.width - elem.width;
    if (alignment === "top") newY = 0;
    if (alignment === "center-v") newY = Math.round((canvas.height - elem.height) / 2);
    if (alignment === "bottom") newY = canvas.height - elem.height;

    handleUpdateElement(id, { x: newX, y: newY });
  };

  // Update Canvas
  const handleUpdateCanvas = (updates: {
    width?: number;
    height?: number;
    background?: Partial<CanvasBackground>;
  }) => {
    setCanvas((prev) => {
      const next = {
        width: updates.width ?? prev.width,
        height: updates.height ?? prev.height,
        background: { ...prev.background, ...(updates.background || {}) },
      };
      pushHistory(elements, next);
      return next;
    });
  };

  // Fit to screen
  const handleFitScreen = () => {
    setZoom(0.85);
  };

  // Export handlers
  const handleExport = async (format: "png" | "svg" | "json") => {
    try {
      const filenameBase = title.toLowerCase().replace(/\s+/g, "-") || "pixel-design";
      if (format === "png") {
        await exportToPng({
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          elements,
          filename: `${filenameBase}.png`,
        });
        showToast("Exported high-res PNG");
      } else if (format === "svg") {
        exportToSvg({
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          elements,
          filename: `${filenameBase}.svg`,
        });
        showToast("Exported SVG vector");
      } else if (format === "json") {
        exportToJson({
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          elements,
          filename: `${filenameBase}.json`,
        });
        showToast("Saved JSON project");
      }
    } catch {
      showToast("Export failed");
    }
  };

  // Save Draft (Inline 3-State Animation, Zero Layout Shift)
  const handleSaveDraft = () => {
    if (saveStatus === "saving") return;

    setSaveStatus("saving");

    setTimeout(() => {
      try {
        localStorage.setItem("pixel_studio_elements_draft", JSON.stringify(elements));
        localStorage.setItem("pixel_studio_canvas_draft", JSON.stringify(canvas));
        setSaveStatus("saved");
        setIsDirty(false);

        // Auto revert to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2500);
      }
    }, 600);
  };

  // Publish live
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const dataUrl = await exportToPng({
        width: canvas.width,
        height: canvas.height,
        background: canvas.background,
        elements,
      });
      if (dataUrl) {
        localStorage.setItem("pixel_custom_banner_override", dataUrl);
      }
      showToast("Published to live profile!");
    } catch {
      showToast("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  return (
    <div
      className="flex-1 flex flex-col h-full w-full bg-[#070709] overflow-hidden select-none relative"
      data-testid="doory-editor"
    >
      {/* 1. Top Bar with inline 3-state animated Save Draft button */}
      <DooryTopBar
        title={title}
        onUpdateTitle={setTitle}
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSaveDraft}
        onPublish={handlePublish}
        onExport={handleExport}
        saveStatus={saveStatus}
        publishing={publishing}
        isDirty={isDirty}
      />

      {/* 2. Main Studio Row: ToolRail + DrawerHost + (ContextualToolbar + CanvasWorkspace) + PropertiesPanel */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Doory Tool Rail */}
        <DooryToolRail
          activeTool={activeTool}
          onToggleTool={handleToggleTool}
        />

        {/* Expandable Tool Drawer Host */}
        <DooryDrawerHost
          activeTool={activeTool}
          onClose={() => setActiveTool(null)}
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
          canvas={canvas}
          onUpdateCanvas={handleUpdateCanvas}
        />

        {/* Canvas & Contextual Toolbar Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Dynamic Contextual Toolbar: Morphs with selection, fixed height, 0 layout shift */}
          <DooryContextualToolbar
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onAlignElement={handleAlignElement}
            onReorderElement={handleReorderElement}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
            canvas={canvas}
            onUpdateCanvas={handleUpdateCanvas}
            onFitScreen={handleFitScreen}
          />

          {/* Interactive Workspace Canvas */}
          <div className="flex-1 relative w-full h-full overflow-hidden">
            <DooryCanvasWorkspace
              canvas={canvas}
              elements={elements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              zoom={zoom}
              onZoomChange={setZoom}
              onFitScreen={handleFitScreen}
            />

            {/* Preserved Floating Dock Overlay inside workspace */}
            {children}
          </div>
        </div>

        {/* Right Collapsible Contextual Properties Inspector */}
        {isInspectorOpen && (
          <EditorPropertiesPanel
            canvas={canvas}
            onUpdateCanvas={handleUpdateCanvas}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onAlignElement={handleAlignElement}
            onReorderElement={handleReorderElement}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>

      {/* Floating Status Notification Toast (Fixed at bottom right, NO layout shift!) */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-[#111114] border border-[#2e2e38] text-white px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
