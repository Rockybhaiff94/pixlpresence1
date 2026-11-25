"use client";

import React, { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Monitor,
  Trash2,
  Unlock,
} from "lucide-react";
import { BuilderCanvasSettings, BuilderNode } from "./profileBuilderTypes";
import {
  MAX_NESTING_DEPTH,
  getNestingDepth,
  isContainerType,
  wouldCreateCycle,
} from "./componentRegistry";
import { getBuilderComponentIcon } from "./AddElementPanel";

interface LayersPanelProps {
  canvas: BuilderCanvasSettings;
  nodes: BuilderNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRenameNode: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onReorderNode: (id: string, direction: "top" | "up" | "down" | "bottom") => void;
  onReparentNode: (nodeId: string, newParentId: string | null) => { ok: boolean; error?: string };
  onMoveLayerRelative?: (
    draggedId: string,
    targetId: string,
    position: "before" | "after" | "inside"
  ) => { ok: boolean; error?: string };
  onInvalidDrop?: (reason: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  canvas,
  nodes,
  selectedId,
  onSelect,
  onRenameNode,
  onToggleVisibility,
  onToggleLock,
  onDuplicateNode,
  onDeleteNode,
  onReorderNode,
  onReparentNode,
  onMoveLayerRelative,
  onInvalidDrop,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string | "canvas-root";
    position: "before" | "after" | "inside";
  } | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDropOnCanvasRoot = () => {
    if (!draggingId) return;
    const dragged = nodes.find((n) => n.id === draggingId);
    setDraggingId(null);
    setDropTarget(null);
    if (!dragged || dragged.type === "background") return;
    if (dragged.parentId === null) return;
    const res = onReparentNode(dragged.id, null);
    if (!res.ok && res.error) onInvalidDrop?.(res.error);
  };

  const handleDropOnLayer = (
    targetNode: BuilderNode,
    position: "before" | "after" | "inside"
  ) => {
    if (!draggingId) return;
    const dragged = nodes.find((n) => n.id === draggingId);
    setDraggingId(null);
    setDropTarget(null);
    if (!dragged || dragged.id === targetNode.id) return;

    if (targetNode.type === "background") {
      onInvalidDrop?.("Cannot reorder above/inside fixed background layer.");
      return;
    }

    if (onMoveLayerRelative) {
      const res = onMoveLayerRelative(dragged.id, targetNode.id, position);
      if (!res.ok && res.error) onInvalidDrop?.(res.error);
      return;
    }

    // Legacy fallback if onMoveLayerRelative isn't wired
    const targetParentId = position === "inside" ? targetNode.id : targetNode.parentId;
    if ((dragged.parentId || null) === targetParentId) return;
    if (targetParentId) {
      const targetContainer = nodes.find((n) => n.id === targetParentId);
      if (!targetContainer || !isContainerType(targetContainer.type)) {
        onInvalidDrop?.("Target component cannot contain child elements.");
        return;
      }
      if (wouldCreateCycle(dragged.id, targetParentId, nodes)) {
        onInvalidDrop?.("Cannot move a container inside itself or one of its descendants.");
        return;
      }
      if (getNestingDepth(targetParentId, nodes) + 1 > MAX_NESTING_DEPTH) {
        onInvalidDrop?.(`Maximum nesting depth (${MAX_NESTING_DEPTH}) reached.`);
        return;
      }
    }
    const res = onReparentNode(dragged.id, targetParentId);
    if (!res.ok && res.error) onInvalidDrop?.(res.error);
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    // Render frontmost layers at the top (highest zIndex first) and Background at bottom
    const siblings = nodes
      .filter((n) => (n.parentId || null) === parentId)
      .sort((a, b) => {
        if (a.type === "background" && b.type !== "background") return 1;
        if (b.type === "background" && a.type !== "background") return -1;
        return b.zIndex - a.zIndex;
      });

    return siblings.map((node) => {
      const children = nodes.filter((n) => n.parentId === node.id);
      const canExpand = isContainerType(node.type) || children.length > 0;
      const isCollapsed = Boolean(collapsedIds[node.id]);
      const isSelected = selectedId === node.id;
      const isEditing = editingId === node.id;
      const activeDrop = dropTarget?.id === node.id ? dropTarget.position : null;
      const Icon = getBuilderComponentIcon(node.type);

      return (
        <div key={node.id} className="select-none">
          <div
            draggable={!node.locked && node.type !== "background"}
            onDragStart={(e) => {
              e.stopPropagation();
              setDraggingId(node.id);
              e.dataTransfer.setData("text/plain", node.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTarget(null);
            }}
            onDragOver={(e) => {
              if (!draggingId || draggingId === node.id || node.type === "background") return;
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
              const position: "before" | "after" | "inside" = isContainerType(node.type)
                ? relY < 0.28
                  ? "before"
                  : relY > 0.72
                    ? "after"
                    : "inside"
                : relY < 0.5
                  ? "before"
                  : "after";
              setDropTarget({ id: node.id, position });
            }}
            onDrop={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
              const position: "before" | "after" | "inside" = isContainerType(node.type)
                ? relY < 0.28
                  ? "before"
                  : relY > 0.72
                    ? "after"
                    : "inside"
                : relY < 0.5
                  ? "before"
                  : "after";
              handleDropOnLayer(node, position);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            className={`group flex items-center justify-between gap-1 pr-1.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer mb-0.5 ${
              activeDrop === "inside"
                ? "border-[#d71920] bg-[#d71920]/15"
                : activeDrop === "before"
                  ? "border-transparent border-t-2 border-t-[#d71920] bg-[#16161f]"
                  : activeDrop === "after"
                    ? "border-transparent border-b-2 border-b-[#d71920] bg-[#16161f]"
                    : isSelected
                      ? "bg-[#1a1a23] border-[#d71920]/70 text-white"
                      : "bg-[#101015] border-transparent hover:border-[#24242d] text-neutral-300 hover:text-white"
            } ${!node.visible ? "opacity-50" : ""}`}
            data-testid={`layer-row-${node.id}`}
            data-z-index={node.zIndex}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {canExpand ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="p-0.5 rounded text-neutral-500 hover:text-white cursor-pointer shrink-0"
                  aria-label={isCollapsed ? "Expand container" : "Collapse container"}
                  data-testid={`layer-collapse-${node.id}`}
                >
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                </button>
              ) : (
                <span className="w-3 shrink-0" />
              )}

              <Icon
                size={12}
                className={`shrink-0 ${
                  node.type === "embed" || node.type === "nested-embed"
                    ? "text-[#d71920]"
                    : "text-neutral-400"
                }`}
              />

              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={draftName}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    if (draftName.trim()) onRenameNode(node.id, draftName.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (draftName.trim()) onRenameNode(node.id, draftName.trim());
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  className="bg-[#08080b] border border-white/40 rounded px-1 py-0.5 text-[11px] text-white outline-none min-w-0 flex-1 select-text"
                  data-testid={`layer-rename-input-${node.id}`}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(node.id);
                    setDraftName(node.name);
                  }}
                  title="Double-click to rename"
                  className="truncate flex-1"
                  data-testid={`layer-name-${node.id}`}
                >
                  {node.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(node.id);
                }}
                title={node.visible ? "Hide layer" : "Show layer"}
                className="p-0.5 rounded text-neutral-400 hover:text-white cursor-pointer"
                data-testid={`layer-vis-${node.id}`}
              >
                {node.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(node.id);
                }}
                title={node.locked ? "Unlock layer" : "Lock layer"}
                className={`p-0.5 rounded cursor-pointer ${
                  node.locked ? "text-amber-400" : "text-neutral-400 hover:text-white"
                }`}
                data-testid={`layer-lock-${node.id}`}
              >
                {node.locked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>

              {node.type !== "background" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateNode(node.id);
                    }}
                    title="Duplicate layer"
                    className="p-0.5 rounded text-neutral-400 hover:text-white cursor-pointer hidden xl:inline-flex"
                    data-testid={`layer-dup-${node.id}`}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    title="Delete layer"
                    className="p-0.5 rounded text-neutral-400 hover:text-red-400 cursor-pointer"
                    data-testid={`layer-del-${node.id}`}
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          </div>

          {canExpand && !isCollapsed && children.length > 0 && (
            <div data-testid={`layer-children-${node.id}`}>{renderTree(node.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden font-mono text-xs bg-[#09090d]"
      data-testid="builder-layers-panel"
    >
      {/* Root Canvas Entry (also valid drop target for root level) */}
      <div className="p-2 border-b border-[#181820]">
        <div
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            setDropTarget({ id: "canvas-root", position: "inside" });
          }}
          onDrop={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            handleDropOnCanvasRoot();
          }}
          onClick={() => onSelect(null)}
          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer text-[11px] ${
            dropTarget?.id === "canvas-root"
              ? "border-[#d71920] bg-[#d71920]/15 text-white"
              : selectedId === null
                ? "bg-[#191922] border-white/30 text-white font-semibold"
                : "bg-[#111116] border-[#22222b] text-neutral-300 hover:text-white"
          }`}
          data-testid="layer-root-canvas"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Monitor size={12} className="text-neutral-400 shrink-0" />
            <span className="truncate">
              Canvas ({canvas.width} × {canvas.height})
            </span>
          </span>
        </div>
      </div>

      {/* Hierarchical Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
        {renderTree(null, 0)}
      </div>

      {/* Selected Layer Stacking Controls */}
      {(() => {
        const selectedLayer = selectedId ? nodes.find((n) => n.id === selectedId) : null;
        if (!selectedLayer || selectedLayer.type === "background") return null;
        return (
          <div
            className="px-2 py-1.5 border-t border-[#181820] bg-[#0b0b10] flex items-center justify-between gap-1 shrink-0"
            data-testid="layers-order-controls"
          >
            <span className="text-[9px] text-neutral-500 uppercase tracking-wider truncate">
              Order
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onReorderNode(selectedLayer.id, "top")}
                title="Bring to Front (Top)"
                className="p-1 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#24242e] text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Move layer to top"
                data-testid="layers-move-top"
              >
                <ArrowUpToLine size={11} />
              </button>
              <button
                type="button"
                onClick={() => onReorderNode(selectedLayer.id, "up")}
                title="Move Forward (Up)"
                className="p-1 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#24242e] text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Move layer up"
                data-testid="layers-move-up"
              >
                <ArrowUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => onReorderNode(selectedLayer.id, "down")}
                title="Send Backward (Down)"
                className="p-1 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#24242e] text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Move layer down"
                data-testid="layers-move-down"
              >
                <ArrowDown size={11} />
              </button>
              <button
                type="button"
                onClick={() => onReorderNode(selectedLayer.id, "bottom")}
                title="Send to Back (Bottom)"
                className="p-1 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#24242e] text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Move layer to bottom"
                data-testid="layers-move-bottom"
              >
                <ArrowDownToLine size={11} />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
