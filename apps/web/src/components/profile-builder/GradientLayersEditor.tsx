"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  GripVertical,
  Info,
  Lock,
  Minus,
  MoreVertical,
  Palette,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { BuilderGradientLayer, BuilderGradientStop } from "./profileBuilderTypes";
import {
  clampPct,
  compileRampPreviewCss,
  compileSingleGradientCss,
  createDefaultGradientLayer,
  defaultDirectionPointsForAngle,
  makeGradientUid,
  normalizeGradientLayers,
  sampleGradientColorAt,
} from "./gradientUtils";

interface GradientLayersEditorProps {
  layers: BuilderGradientLayer[] | undefined;
  legacyFallback?: {
    colorA?: string;
    colorB?: string;
    angle?: number;
    opacity?: number;
  };
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onChangeLayers: (nextLayers: BuilderGradientLayer[]) => void;
  disabled?: boolean;
  scopeKey?: string;
}

const isValidCssColorInput = (val: string) => {
  const v = val.trim();
  return (
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)$/i.test(v)
  );
};

export const GradientLayersEditor: React.FC<GradientLayersEditorProps> = ({
  layers,
  legacyFallback,
  selectedLayerId,
  onSelectLayer,
  onChangeLayers,
  disabled = false,
  scopeKey = "bg",
}) => {
  const normalized = normalizeGradientLayers(layers, legacyFallback);
  const activeLayer =
    normalized.find((l) => l.id === selectedLayerId) || normalized[0];
  const isLocked = Boolean(disabled || activeLayer?.locked);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    activeLayer?.stops[0]?.id ?? null
  );
  const [hexDraft, setHexDraft] = useState<string>("");
  const [isEditingHex, setIsEditingHex] = useState(false);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const [dragLayerIdx, setDragLayerIdx] = useState<number | null>(null);
  const [openMenuLayerId, setOpenMenuLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const rampRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const normalizedRef = useRef(normalized);
  normalizedRef.current = normalized;

  const sortedStops = activeLayer
    ? [...activeLayer.stops].sort((a, b) => a.position - b.position)
    : [];
  const selectedStop =
    sortedStops.find((s) => s.id === selectedStopId) || sortedStops[0] || null;
  const selectedStopIndex = selectedStop
    ? sortedStops.findIndex((s) => s.id === selectedStop.id)
    : -1;
  const isBoundaryStop =
    sortedStops.length <= 2 ||
    selectedStopIndex === 0 ||
    selectedStopIndex === sortedStops.length - 1;

  // Keep selectedStopId valid when switching layers or profiles
  useEffect(() => {
    if (!activeLayer) return;
    if (!activeLayer.stops.some((s) => s.id === selectedStopId)) {
      setSelectedStopId(activeLayer.stops[0]?.id ?? null);
    }
  }, [activeLayer, selectedStopId]);

  useEffect(() => {
    if (!isEditingHex && selectedStop) {
      setHexDraft(selectedStop.color.toUpperCase());
    }
  }, [isEditingHex, selectedStop]);

  // Close layer menu on Escape or outside click
  useEffect(() => {
    if (!openMenuLayerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuLayerId(null);
    };
    const onDocClick = () => setOpenMenuLayerId(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDocClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDocClick);
    };
  }, [openMenuLayerId]);

  // Drag stop horizontally with window pointer tracking & cleanup
  useEffect(() => {
    if (!draggingStopId || !activeLayer || isLocked) return;

    const updateFromClientX = (clientX: number) => {
      const rampEl = rampRef.current;
      if (!rampEl) return;
      const rect = rampEl.getBoundingClientRect();
      if (rect.width <= 1) return;
      const pct = Math.round(clampPct(((clientX - rect.left) / rect.width) * 100));
      const latestLayers = normalizedRef.current;
      const targetLayer = latestLayers.find((l) => l.id === activeLayer.id);
      if (!targetLayer) return;
      const nextStops = targetLayer.stops
        .map((s) => (s.id === draggingStopId ? { ...s, position: pct } : s))
        .sort((a, b) => a.position - b.position);
      onChangeLayers(
        latestLayers.map((l) =>
          l.id === activeLayer.id ? { ...l, stops: nextStops } : l
        )
      );
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromClientX(e.clientX);
    };

    const onEnd = () => {
      setDraggingStopId(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [activeLayer, draggingStopId, isLocked, onChangeLayers]);

  const commitLayers = (next: BuilderGradientLayer[], nextSelectedId?: string) => {
    onChangeLayers(next);
    if (nextSelectedId) {
      onSelectLayer(nextSelectedId);
    }
  };

  const patchActiveLayer = (patch: Partial<BuilderGradientLayer>) => {
    if (!activeLayer || isLocked) return;
    const next = normalized.map((l) =>
      l.id === activeLayer.id ? { ...l, ...patch } : l
    );
    commitLayers(next);
  };

  const handleAddGradientLayer = () => {
    if (disabled) return;
    const created = createDefaultGradientLayer(
      normalized.length,
      "#6366f1",
      "#ec4899",
      (45 + normalized.length * 45) % 360,
      0.85
    );
    commitLayers([...normalized, created], created.id);
    setSelectedStopId(created.stops[0]?.id ?? null);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (disabled || normalized.length <= 1) return;
    const remaining = normalized.filter((l) => l.id !== layerId);
    commitLayers(
      remaining,
      selectedLayerId === layerId
        ? remaining[0]?.id
        : selectedLayerId || remaining[0]?.id
    );
  };

  const handleDuplicateLayer = (layer: BuilderGradientLayer) => {
    if (disabled) return;
    const copy: BuilderGradientLayer = {
      ...layer,
      id: makeGradientUid("grad"),
      name: `${layer.name} Copy`,
      stops: layer.stops.map((s) => ({ ...s, id: makeGradientUid("stop") })),
    };
    const idx = normalized.findIndex((l) => l.id === layer.id);
    const next = [...normalized];
    next.splice(idx + 1, 0, copy);
    commitLayers(next, copy.id);
  };

  const handleMoveLayer = (idx: number, dir: -1 | 1) => {
    if (disabled) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= normalized.length) return;
    const copy = [...normalized];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    commitLayers(copy);
  };

  const handleReorderLayer = (fromIdx: number, toIdx: number) => {
    if (disabled || fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const copy = [...normalized];
    const [moved] = copy.splice(fromIdx, 1);
    if (!moved) return;
    copy.splice(toIdx, 0, moved);
    commitLayers(copy);
  };

  const handleUpdateStop = (
    stopId: string,
    patch: Partial<BuilderGradientStop>
  ) => {
    if (!activeLayer || isLocked) return;
    const nextStops = activeLayer.stops
      .map((s) => (s.id === stopId ? { ...s, ...patch } : s))
      .sort((a, b) => a.position - b.position);
    patchActiveLayer({ stops: nextStops });
  };

  const createStopAtPosition = (pct: number, openPicker = false) => {
    if (!activeLayer || isLocked) return;
    const clamped = Math.round(clampPct(pct));
    const sampledColor = sampleGradientColorAt(activeLayer.stops, clamped);
    const newStop: BuilderGradientStop = {
      id: makeGradientUid("stop"),
      color: sampledColor,
      position: clamped,
    };
    const nextStops = [...activeLayer.stops, newStop].sort(
      (a, b) => a.position - b.position
    );
    patchActiveLayer({ stops: nextStops });
    setSelectedStopId(newStop.id);
    if (openPicker) {
      requestAnimationFrame(() => {
        colorPickerRef.current?.click();
      });
    }
  };

  const handleAddStop = () => {
    if (!activeLayer || isLocked) return;
    // Place midpoint between selected stop and its next neighbor, or 50%
    let targetPos = 50;
    if (selectedStop && selectedStopIndex >= 0) {
      if (selectedStopIndex < sortedStops.length - 1) {
        targetPos = Math.round(
          (selectedStop.position + sortedStops[selectedStopIndex + 1].position) / 2
        );
      } else if (selectedStopIndex > 0) {
        targetPos = Math.round(
          (sortedStops[selectedStopIndex - 1].position + selectedStop.position) / 2
        );
      }
    }
    createStopAtPosition(targetPos, true);
  };

  const handleDuplicateSelectedStop = () => {
    if (!activeLayer || !selectedStop || isLocked) return;
    const offsetPos =
      selectedStop.position <= 92
        ? Math.min(100, selectedStop.position + 6)
        : Math.max(0, selectedStop.position - 6);
    const copy: BuilderGradientStop = {
      id: makeGradientUid("stop"),
      color: selectedStop.color,
      position: Math.round(clampPct(offsetPos)),
    };
    const nextStops = [...activeLayer.stops, copy].sort(
      (a, b) => a.position - b.position
    );
    patchActiveLayer({ stops: nextStops });
    setSelectedStopId(copy.id);
  };

  const handleRemoveStop = (stopId: string) => {
    if (!activeLayer || isLocked || sortedStops.length <= 2) return;
    const idx = sortedStops.findIndex((s) => s.id === stopId);
    if (idx <= 0 || idx >= sortedStops.length - 1) return;
    const remaining = activeLayer.stops.filter((s) => s.id !== stopId);
    patchActiveLayer({ stops: remaining });
    if (selectedStopId === stopId) {
      const nextFocus = sortedStops[Math.max(0, idx - 1)] || remaining[0];
      setSelectedStopId(nextFocus?.id ?? null);
    }
  };

  const rampCss = activeLayer ? compileRampPreviewCss(activeLayer) : undefined;
  const swatchPickerHex =
    selectedStop && /^#[0-9a-fA-F]{6}/.test(selectedStop.color)
      ? selectedStop.color.slice(0, 7)
      : "#6366f1";

  return (
    <div
      className="space-y-2.5 p-2.5 rounded-lg bg-[#0d0d13] border border-[#22222d] select-none"
      onPointerDown={(e) => e.stopPropagation()}
      data-testid={`gradient-editor-${scopeKey}`}
    >
      {/* A. Gradient Layers */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
            Gradient Layers ({normalized.length})
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddGradientLayer}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#2a2a36] text-neutral-200 text-[9px] font-semibold cursor-pointer disabled:opacity-40"
            title="Add Gradient Layer"
            data-testid={`gradient-add-layer-${scopeKey}`}
          >
            <Plus size={10} />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
          {normalized.map((layer, idx) => {
            const isSelected = activeLayer?.id === layer.id;
            const isRenaming = renamingLayerId === layer.id;
            return (
              <div
                key={layer.id}
                draggable={!disabled && !isRenaming}
                onDragStart={(e) => {
                  setDragLayerIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragLayerIdx !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragLayerIdx !== null) {
                    handleReorderLayer(dragLayerIdx, idx);
                  }
                  setDragLayerIdx(null);
                }}
                onDragEnd={() => setDragLayerIdx(null)}
                onClick={() => onSelectLayer(layer.id)}
                className={`relative px-2 py-1.5 rounded-md border flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${isSelected
                    ? "bg-[#16161f] border-white/40 text-white"
                    : "bg-[#121217] border-[#24242d] text-neutral-400 hover:text-white hover:border-[#32323f]"
                  }`}
                data-testid={`gradient-layer-row-${scopeKey}-${idx}`}
                data-selected={isSelected ? "true" : "false"}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="text-neutral-600 hover:text-neutral-300 cursor-grab shrink-0"
                    title="Drag to reorder"
                  >
                    <GripVertical size={11} />
                  </span>
                  <span
                    className="w-4 h-4 rounded border border-white/20 shrink-0"
                    style={{
                      backgroundImage: compileSingleGradientCss({
                        ...layer,
                        opacity: 1,
                      }),
                    }}
                  />
                  {isRenaming ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        const trimmed = renameDraft.trim();
                        if (trimmed) {
                          commitLayers(
                            normalized.map((l) =>
                              l.id === layer.id ? { ...l, name: trimmed } : l
                            )
                          );
                        }
                        setRenamingLayerId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        } else if (e.key === "Escape") {
                          setRenamingLayerId(null);
                        }
                      }}
                      className="flex-1 min-w-0 bg-[#0d0d13] border border-white/30 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                    />
                  ) : (
                    <span
                      className="text-[10px] font-semibold truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (disabled) return;
                        setRenamingLayerId(layer.id);
                        setRenameDraft(layer.name);
                      }}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const next = normalized.map((l) =>
                        l.id === layer.id ? { ...l, visible: !l.visible } : l
                      );
                      commitLayers(next);
                    }}
                    className="p-1 rounded hover:bg-white/10 cursor-pointer"
                    title={layer.visible ? "Hide layer" : "Show layer"}
                    data-testid={`gradient-layer-vis-${scopeKey}-${idx}`}
                  >
                    {layer.visible ? (
                      <Eye size={11} />
                    ) : (
                      <EyeOff size={11} className="text-neutral-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const next = normalized.map((l) =>
                        l.id === layer.id ? { ...l, locked: !l.locked } : l
                      );
                      commitLayers(next);
                    }}
                    className="p-1 rounded hover:bg-white/10 cursor-pointer"
                    title={layer.locked ? "Unlock layer" : "Lock layer"}
                    data-testid={`gradient-layer-lock-${scopeKey}-${idx}`}
                  >
                    {layer.locked ? (
                      <Lock size={11} className="text-amber-300" />
                    ) : (
                      <Unlock size={11} />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      setOpenMenuLayerId((prev) =>
                        prev === layer.id ? null : layer.id
                      )
                    }
                    className="p-1 rounded hover:bg-white/10 cursor-pointer"
                    title="More layer options"
                    data-testid={`gradient-layer-more-${scopeKey}-${idx}`}
                  >
                    <MoreVertical size={11} />
                  </button>
                </div>

                {openMenuLayerId === layer.id && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-1 top-full mt-1 z-30 w-32 rounded-md bg-[#121217] border border-[#2a2a36] shadow-xl py-1 text-[10px] text-neutral-200"
                  >
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        handleMoveLayer(idx, -1);
                        setOpenMenuLayerId(null);
                      }}
                      className="w-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-35 text-left cursor-pointer"
                      data-testid={`gradient-layer-up-${scopeKey}-${idx}`}
                    >
                      <ArrowUp size={10} />
                      <span>Move Up</span>
                    </button>
                    <button
                      type="button"
                      disabled={idx === normalized.length - 1}
                      onClick={() => {
                        handleMoveLayer(idx, 1);
                        setOpenMenuLayerId(null);
                      }}
                      className="w-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-35 text-left cursor-pointer"
                      data-testid={`gradient-layer-down-${scopeKey}-${idx}`}
                    >
                      <ArrowDown size={10} />
                      <span>Move Down</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDuplicateLayer(layer);
                        setOpenMenuLayerId(null);
                      }}
                      className="w-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-white/10 text-left cursor-pointer"
                      data-testid={`gradient-layer-dup-${scopeKey}-${idx}`}
                    >
                      <Copy size={10} />
                      <span>Duplicate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingLayerId(layer.id);
                        setRenameDraft(layer.name);
                        setOpenMenuLayerId(null);
                      }}
                      className="w-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-white/10 text-left cursor-pointer"
                      data-testid={`gradient-layer-rename-${scopeKey}-${idx}`}
                    >
                      <Edit3 size={10} />
                      <span>Rename</span>
                    </button>
                    {normalized.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteLayer(layer.id);
                          setOpenMenuLayerId(null);
                        }}
                        className="w-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-red-500/15 text-red-400 text-left cursor-pointer"
                        data-testid={`gradient-layer-del-${scopeKey}-${idx}`}
                      >
                        <Trash2 size={10} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* B. Color Stops — Single Continuous Multi-Stop Ramp */}
      {activeLayer && (
        <div className="space-y-2.5 pt-2 border-t border-[#1e1e29]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
                Color Stops
              </span>
              <span
                className="text-neutral-500 hover:text-neutral-300 cursor-help"
                title="Click anywhere on the ramp to insert a stop, drag stops to reposition, or double-click a stop to pick a color."
              >
                <Info size={10} />
              </span>
            </div>
            <button
              type="button"
              disabled={isLocked}
              onClick={handleAddStop}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#2a2a36] text-neutral-200 text-[9px] font-semibold cursor-pointer disabled:opacity-40"
              data-testid={`gradient-add-stop-${scopeKey}`}
            >
              <Plus size={10} />
              <span>Add Stop</span>
            </button>
          </div>

          {/* Continuous Ramp + Draggable Pin Handles */}
          <div className="px-2">
            <div
              ref={rampRef}
              onClick={(e) => {
                if (isLocked) return;
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 1) return;
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                createStopAtPosition(pct, true);
              }}
              className={`relative h-7 rounded-md border border-white/20 shadow-inner ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"
                }`}
              style={{
                backgroundImage: `${rampCss}, repeating-conic-gradient(#1c1c24 0% 25%, #121217 0% 50%)`,
                backgroundSize: "100% 100%, 10px 10px",
              }}
              data-testid={`gradient-ramp-${scopeKey}`}
            />

            {/* Handles & Percentage Pills Track */}
            <div className="relative h-12 mt-1">
              {sortedStops.map((stop, sIdx) => {
                const isSelected = selectedStop?.id === stop.id;
                const pctLabel = Math.round(stop.position);
                return (
                  <div
                    key={stop.id}
                    style={{ left: `${stop.position}%` }}
                    className={`absolute top-0 -translate-x-1/2 flex flex-col items-center ${isSelected ? "z-20" : "z-10"
                      }`}
                  >
                    <button
                      type="button"
                      role="slider"
                      tabIndex={isLocked ? -1 : 0}
                      aria-label={`Color stop ${sIdx + 1} at ${pctLabel}%`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pctLabel}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedStopId(stop.id);
                        if (!isLocked) {
                          setDraggingStopId(stop.id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isLocked) return;
                        setSelectedStopId(stop.id);
                        colorPickerRef.current?.click();
                      }}
                      onKeyDown={(e) => {
                        if (isLocked) return;
                        const step = e.shiftKey ? 5 : 1;
                        if (e.key === "ArrowLeft") {
                          e.preventDefault();
                          handleUpdateStop(stop.id, {
                            position: Math.max(0, Math.round(stop.position - step)),
                          });
                        } else if (e.key === "ArrowRight") {
                          e.preventDefault();
                          handleUpdateStop(stop.id, {
                            position: Math.min(100, Math.round(stop.position + step)),
                          });
                        } else if (e.key === "Delete" || e.key === "Backspace") {
                          e.preventDefault();
                          handleRemoveStop(stop.id);
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          colorPickerRef.current?.click();
                        }
                      }}
                      className={`group flex flex-col items-center focus:outline-none ${isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                        }`}
                      data-testid={`gradient-stop-handle-${scopeKey}-${sIdx}`}
                      data-selected={isSelected ? "true" : "false"}
                    >
                      <span
                        className={`w-1 h-1.5 rounded-t-sm ${isSelected ? "bg-white" : "bg-neutral-500 group-hover:bg-neutral-300"
                          }`}
                      />
                      <span
                        className={`w-4 h-4 rounded border-2 transition-transform ${isSelected
                            ? "border-white ring-2 ring-white/35 scale-110 shadow-md"
                            : "border-neutral-300/80 group-hover:border-white"
                          }`}
                        style={{ backgroundColor: stop.color }}
                      />
                    </button>

                    <span
                      className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none border ${isSelected
                          ? "bg-[#1a1a24] border-white/50 text-white font-semibold"
                          : "bg-[#121217] border-[#24242d] text-neutral-400"
                        }`}
                      data-testid={`gradient-stop-pct-${scopeKey}-${sIdx}`}
                    >
                      {pctLabel}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* C. Selected Stop Controls */}
          {selectedStop && (
            <div
              className="p-2 rounded-md bg-[#121217] border border-[#24242d] flex flex-wrap items-center justify-between gap-2"
              data-testid={`gradient-selected-stop-panel-${scopeKey}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  ref={colorPickerRef}
                  type="color"
                  disabled={isLocked}
                  value={swatchPickerHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHexDraft(val.toUpperCase());
                    handleUpdateStop(selectedStop.id, { color: val });
                  }}
                  className="sr-only"
                  data-testid={`gradient-stop-color-${scopeKey}-${Math.max(0, selectedStopIndex)}`}
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => colorPickerRef.current?.click()}
                  className="w-7 h-7 rounded-md border border-white/25 shrink-0 cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: selectedStop.color }}
                  title="Pick stop color"
                  data-testid={`gradient-selected-stop-swatch-${scopeKey}`}
                />
                <div className="min-w-0">
                  <div className="text-[9px] text-neutral-400 font-medium leading-tight">
                    Selected Stop
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      disabled={isLocked}
                      value={hexDraft}
                      onFocus={() => setIsEditingHex(true)}
                      onBlur={() => {
                        setIsEditingHex(false);
                        setHexDraft(selectedStop.color.toUpperCase());
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setHexDraft(raw);
                        if (isValidCssColorInput(raw)) {
                          handleUpdateStop(selectedStop.id, { color: raw.trim() });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-20 bg-[#0d0d13] border border-[#24242d] focus:border-white/40 rounded px-1.5 py-0.5 text-[10px] font-mono text-white outline-none disabled:opacity-40"
                      aria-label="Selected stop hex color"
                      data-testid={`gradient-selected-stop-hex-${scopeKey}`}
                    />
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => colorPickerRef.current?.click()}
                      className="p-1 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#282834] text-neutral-300 hover:text-white cursor-pointer disabled:opacity-40"
                      title="Open color picker"
                      data-testid={`gradient-selected-stop-picker-btn-${scopeKey}`}
                    >
                      <Palette size={10} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <div>
                  <label className="text-[8px] text-neutral-500 uppercase block mb-0.5">
                    Position
                  </label>
                  <div className="flex items-center bg-[#0d0d13] border border-[#24242d] rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      disabled={isLocked}
                      min={0}
                      max={100}
                      value={Math.round(selectedStop.position)}
                      onChange={(e) =>
                        handleUpdateStop(selectedStop.id, {
                          position: Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-10 bg-transparent text-[10px] font-mono text-white outline-none text-right disabled:opacity-40"
                      data-testid={`gradient-selected-stop-pos-${scopeKey}`}
                    />
                    <span className="text-[9px] text-neutral-500 ml-0.5">%</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleDuplicateSelectedStop}
                  className="p-1.5 mt-3 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#282834] text-neutral-300 hover:text-white cursor-pointer disabled:opacity-40"
                  title="Duplicate selected stop"
                  data-testid={`gradient-selected-stop-dup-${scopeKey}`}
                >
                  <Copy size={11} />
                </button>
                <button
                  type="button"
                  disabled={isLocked || isBoundaryStop}
                  onClick={() => handleRemoveStop(selectedStop.id)}
                  className="p-1.5 mt-3 rounded bg-[#16161f] hover:bg-red-500/15 border border-[#282834] text-neutral-400 hover:text-red-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={
                    isBoundaryStop
                      ? "First and last stops cannot be deleted"
                      : "Delete selected stop"
                  }
                  data-testid={`gradient-selected-stop-del-${scopeKey}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )}

          {/* D. Transition Midpoint */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-neutral-400 mb-1">
              <div className="flex items-center gap-1">
                <span className="uppercase font-bold tracking-wider">
                  Transition Midpoint
                </span>
                <span
                  className="text-neutral-500 hover:text-neutral-300 cursor-help"
                  title="Shifts the color blend midpoint between adjacent stops without moving stop positions."
                >
                  <Info size={10} />
                </span>
              </div>
              <span
                className="px-1.5 py-0.5 rounded bg-[#121217] border border-[#24242d] font-mono text-white"
                data-testid={`gradient-midpoint-val-${scopeKey}`}
              >
                {Math.round(activeLayer.midpoint ?? 50)}%
              </span>
            </div>
            <input
              type="range"
              disabled={isLocked}
              min={5}
              max={95}
              value={Math.round(activeLayer.midpoint ?? 50)}
              onChange={(e) =>
                patchActiveLayer({ midpoint: Number(e.target.value) })
              }
              className="w-full accent-white disabled:opacity-40"
              data-testid={`gradient-midpoint-${scopeKey}`}
            />
          </div>

          {/* E. Angle & F. Opacity */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-[#1e1e29]">
            <div>
              <div className="flex items-center gap-1 text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1">
                <span>Angle (°)</span>
                <span
                  className="text-neutral-500 hover:text-neutral-300 cursor-help"
                  title="Direction angle from 0° to 360°."
                >
                  <Info size={10} />
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    const angle =
                      (((Math.round(activeLayer.angle ?? 135) - 15) % 360) + 360) %
                      360;
                    patchActiveLayer({
                      angle,
                      ...defaultDirectionPointsForAngle(angle),
                    });
                  }}
                  className="p-1 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#282834] text-neutral-300 cursor-pointer disabled:opacity-40"
                  title="Decrease angle by 15°"
                  data-testid={`gradient-angle-dec-${scopeKey}`}
                >
                  <Minus size={10} />
                </button>
                <input
                  type="number"
                  disabled={isLocked}
                  min={0}
                  max={360}
                  value={Math.round(activeLayer.angle ?? 135)}
                  onChange={(e) => {
                    const angle = Math.max(
                      0,
                      Math.min(360, Number(e.target.value) || 0)
                    );
                    patchActiveLayer({
                      angle,
                      ...defaultDirectionPointsForAngle(angle),
                    });
                  }}
                  className="w-full min-w-0 bg-[#121217] border border-[#24242d] rounded px-1.5 py-0.5 text-[10px] font-mono text-white text-center outline-none disabled:opacity-40"
                  data-testid={`gradient-angle-${scopeKey}`}
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    const angle =
                      (Math.round(activeLayer.angle ?? 135) + 15) % 360;
                    patchActiveLayer({
                      angle,
                      ...defaultDirectionPointsForAngle(angle),
                    });
                  }}
                  className="p-1 rounded bg-[#16161f] hover:bg-[#1e1e28] border border-[#282834] text-neutral-300 cursor-pointer disabled:opacity-40"
                  title="Increase angle by 15°"
                  data-testid={`gradient-angle-inc-${scopeKey}`}
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1">
                <span>Opacity</span>
                <span className="font-mono text-white">
                  {Math.round((activeLayer.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                disabled={isLocked}
                min={0}
                max={100}
                value={Math.round((activeLayer.opacity ?? 1) * 100)}
                onChange={(e) =>
                  patchActiveLayer({ opacity: Number(e.target.value) / 100 })
                }
                className="w-full accent-white mt-1.5 disabled:opacity-40"
                data-testid={`gradient-opacity-${scopeKey}`}
              />
            </div>
          </div>

          <div className="px-2 py-1.5 rounded bg-[#111118] border border-[#23232f] flex items-start gap-1.5 text-[9px] text-neutral-400 leading-snug">
            <Info size={11} className="shrink-0 mt-0.5 text-neutral-500" />
            <span>
              Drag endpoints on the canvas or any stop below to adjust, or click on the ramp to add a new color stop.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
