"use client";

import React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { BuilderGradientLayer, BuilderGradientStop } from "./profileBuilderTypes";
import {
  compileSingleGradientCss,
  createDefaultGradientLayer,
  defaultDirectionPointsForAngle,
  makeGradientUid,
  normalizeGradientLayers,
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

  const commitLayers = (next: BuilderGradientLayer[], nextSelectedId?: string) => {
    onChangeLayers(next);
    if (nextSelectedId) {
      onSelectLayer(nextSelectedId);
    }
  };

  const patchActiveLayer = (patch: Partial<BuilderGradientLayer>) => {
    if (!activeLayer || isLocked) return;
    const next = normalized.map((l) => (l.id === activeLayer.id ? { ...l, ...patch } : l));
    commitLayers(next);
  };

  const handleAddGradientLayer = () => {
    if (disabled) return;
    const created = createDefaultGradientLayer(
      normalized.length,
      "#3b82f6",
      "#ec4899",
      (45 + normalized.length * 45) % 360,
      0.85
    );
    commitLayers([...normalized, created], created.id);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (disabled || normalized.length <= 1) return;
    const remaining = normalized.filter((l) => l.id !== layerId);
    commitLayers(
      remaining,
      selectedLayerId === layerId ? remaining[0]?.id : selectedLayerId || remaining[0]?.id
    );
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

  const handleUpdateStop = (stopId: string, patch: Partial<BuilderGradientStop>) => {
    if (!activeLayer || isLocked) return;
    const nextStops = activeLayer.stops
      .map((s) => (s.id === stopId ? { ...s, ...patch } : s))
      .sort((a, b) => a.position - b.position);
    patchActiveLayer({ stops: nextStops });
  };

  const handleAddStop = () => {
    if (!activeLayer || isLocked) return;
    const midPos = 50;
    const newStop: BuilderGradientStop = {
      id: makeGradientUid("stop"),
      color: "#a855f7",
      position: midPos,
    };
    const nextStops = [...activeLayer.stops, newStop].sort((a, b) => a.position - b.position);
    patchActiveLayer({ stops: nextStops });
  };

  const handleRemoveStop = (stopId: string) => {
    if (!activeLayer || isLocked || activeLayer.stops.length <= 2) return;
    patchActiveLayer({
      stops: activeLayer.stops.filter((s) => s.id !== stopId),
    });
  };

  const previewCss = activeLayer ? compileSingleGradientCss({ ...activeLayer, opacity: 1 }) : undefined;

  return (
    <div
      className="space-y-2.5 p-2 rounded-lg bg-[#0d0d13] border border-[#22222d]"
      data-testid={`gradient-editor-${scopeKey}`}
    >
      {/* Gradient Layers Header + Plus Button */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
          Gradient Layers ({normalized.length})
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddGradientLayer}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-semibold cursor-pointer disabled:opacity-40"
          title="Add Gradient Layer"
          data-testid={`gradient-add-layer-${scopeKey}`}
        >
          <Plus size={10} />
          <span>Add</span>
        </button>
      </div>

      {/* Gradient Layers List */}
      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-0.5">
        {normalized.map((layer, idx) => {
          const isSelected = activeLayer?.id === layer.id;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`px-2 py-1 rounded border flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-[#1a1a26] border-white/40 text-white"
                  : "bg-[#121218] border-[#23232f] text-neutral-400 hover:text-white"
              }`}
              data-testid={`gradient-layer-row-${scopeKey}-${idx}`}
              data-selected={isSelected ? "true" : "false"}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded border border-white/20 shrink-0"
                  style={{ backgroundImage: compileSingleGradientCss({ ...layer, opacity: 1 }) }}
                />
                <span className="text-[10px] font-semibold truncate">{layer.name}</span>
              </div>

              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => handleMoveLayer(idx, -1)}
                  className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                  data-testid={`gradient-layer-up-${scopeKey}-${idx}`}
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === normalized.length - 1}
                  onClick={() => handleMoveLayer(idx, 1)}
                  className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                  data-testid={`gradient-layer-down-${scopeKey}-${idx}`}
                >
                  <ArrowDown size={10} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = normalized.map((l) =>
                      l.id === layer.id ? { ...l, visible: !l.visible } : l
                    );
                    commitLayers(next);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  data-testid={`gradient-layer-vis-${scopeKey}-${idx}`}
                >
                  {layer.visible ? <Eye size={10} /> : <EyeOff size={10} className="text-neutral-600" />}
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
                  className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  data-testid={`gradient-layer-lock-${scopeKey}-${idx}`}
                >
                  {layer.locked ? (
                    <Lock size={10} className="text-amber-300" />
                  ) : (
                    <Unlock size={10} />
                  )}
                </button>
                {normalized.length > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDeleteLayer(layer.id)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 cursor-pointer"
                    title="Delete gradient layer"
                    data-testid={`gradient-layer-del-${scopeKey}-${idx}`}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Gradient Color & Direction Controls */}
      {activeLayer && (
        <div className="space-y-2 pt-1.5 border-t border-[#1e1e29]">
          <div
            className="w-full h-3.5 rounded border border-white/15"
            style={{ backgroundImage: previewCss }}
          />

          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-500 uppercase">Color Stops</span>
            <button
              type="button"
              disabled={isLocked}
              onClick={handleAddStop}
              className="text-[9px] text-neutral-300 hover:text-white underline cursor-pointer disabled:opacity-40"
              data-testid={`gradient-add-stop-${scopeKey}`}
            >
              + Add Stop
            </button>
          </div>

          <div className="space-y-1.5">
            {activeLayer.stops.map((stop, sIdx) => (
              <div
                key={stop.id}
                className="flex items-center gap-1.5"
                data-testid={`gradient-stop-row-${scopeKey}-${sIdx}`}
              >
                <input
                  type="color"
                  disabled={isLocked}
                  value={stop.color.startsWith("#") ? stop.color.slice(0, 7) : "#6366f1"}
                  onChange={(e) => handleUpdateStop(stop.id, { color: e.target.value })}
                  className="w-6 h-6 rounded border border-[#2e2e38] bg-transparent cursor-pointer shrink-0 disabled:opacity-40"
                  data-testid={`gradient-stop-color-${scopeKey}-${sIdx}`}
                />
                <input
                  type="range"
                  disabled={isLocked}
                  min={0}
                  max={100}
                  value={Math.round(stop.position)}
                  onChange={(e) =>
                    handleUpdateStop(stop.id, { position: Number(e.target.value) })
                  }
                  className="flex-1 accent-white disabled:opacity-40"
                  data-testid={`gradient-stop-pos-${scopeKey}-${sIdx}`}
                />
                <input
                  type="number"
                  disabled={isLocked}
                  min={0}
                  max={100}
                  value={Math.round(stop.position)}
                  onChange={(e) =>
                    handleUpdateStop(stop.id, {
                      position: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-11 bg-[#121217] border border-[#24242d] rounded px-1 py-0.5 text-[10px] text-white outline-none text-right disabled:opacity-40"
                />
                {activeLayer.stops.length > 2 && (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleRemoveStop(stop.id)}
                    className="p-0.5 text-neutral-500 hover:text-red-400 cursor-pointer disabled:opacity-40"
                    title="Remove stop"
                    data-testid={`gradient-stop-del-${scopeKey}-${sIdx}`}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Transition Midpoint Shift */}
          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
              <span>TRANSITION MIDPOINT</span>
              <span>{Math.round(activeLayer.midpoint ?? 50)}%</span>
            </div>
            <input
              type="range"
              disabled={isLocked}
              min={5}
              max={95}
              value={Math.round(activeLayer.midpoint ?? 50)}
              onChange={(e) => patchActiveLayer({ midpoint: Number(e.target.value) })}
              className="w-full accent-white disabled:opacity-40"
              data-testid={`gradient-midpoint-${scopeKey}`}
            />
          </div>

          {/* Angle & Opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                Angle (°)
              </label>
              <input
                type="number"
                disabled={isLocked}
                min={0}
                max={360}
                value={Math.round(activeLayer.angle ?? 135)}
                onChange={(e) => {
                  const angle = Math.max(0, Math.min(360, Number(e.target.value) || 0));
                  patchActiveLayer({
                    angle,
                    ...defaultDirectionPointsForAngle(angle),
                  });
                }}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
                data-testid={`gradient-angle-${scopeKey}`}
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">
                Opacity ({Math.round((activeLayer.opacity ?? 1) * 100)}%)
              </label>
              <input
                type="range"
                disabled={isLocked}
                min={0}
                max={100}
                value={Math.round((activeLayer.opacity ?? 1) * 100)}
                onChange={(e) => patchActiveLayer({ opacity: Number(e.target.value) / 100 })}
                className="w-full accent-white mt-1.5 disabled:opacity-40"
                data-testid={`gradient-opacity-${scopeKey}`}
              />
            </div>
          </div>

          <p className="text-[9px] text-neutral-500 leading-snug">
            Drag endpoints or the line on the canvas to reposition and rotate this gradient.
          </p>
        </div>
      )}
    </div>
  );
};
