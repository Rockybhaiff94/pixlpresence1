"use client";

import React, { useState } from "react";
import {
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
  onReorderNode: (id: string, direction: "up" | "down") => void;
  onReparentNode: (nodeId: string, newParentId: string | null) => { ok: boolean; error?: string };
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
  onReparentNode,
  onInvalidDrop,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | "canvas-root" | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDropOnTarget = (targetParentId: string | null) => {
    if (!draggingId) return;
    const dragged = nodes.find((n) => n.id === draggingId);
    setDraggingId(null);
    setDropTargetId(null);
    if (!dragged) return;
    if ((dragged.parentId || null) === targetParentId) return;

    if (targetParentId) {
      const targetNode = nodes.find((n) => n.id === targetParentId);
      if (!targetNode || !isContainerType(targetNode.type)) {
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
    if (!res.ok && res.error) {
      onInvalidDrop?.(res.error);
    }
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const siblings = nodes
      .filter((n) => (n.parentId || null) === parentId)
      .sort((a, b) => a.zIndex - b.zIndex);

    return siblings.map((node) => {
      const children = nodes.filter((n) => n.parentId === node.id);
      const canExpand = isContainerType(node.type) || children.length > 0;
      const isCollapsed = Boolean(collapsedIds[node.id]);
      const isSelected = selectedId === node.id;
      const isEditing = editingId === node.id;
      const isDropOver = dropTargetId === node.id;
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
              setDropTargetId(null);
            }}
            onDragOver={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              e.stopPropagation();
              setDropTargetId(node.id);
            }}
            onDrop={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              e.stopPropagation();
              handleDropOnTarget(isContainerType(node.type) ? node.id : node.parentId);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            className={`group flex items-center justify-between gap-1 pr-1.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer mb-0.5 ${
              isDropOver
                ? "border-[#d71920] bg-[#d71920]/15"
                : isSelected
                  ? "bg-[#1a1a23] border-white/35 text-white"
                  : "bg-[#101015] border-transparent hover:border-[#24242d] text-neutral-300 hover:text-white"
            } ${!node.visible ? "opacity-50" : ""}`}
            data-testid={`layer-row-${node.id}`}
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
            setDropTargetId("canvas-root");
          }}
          onDrop={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            handleDropOnTarget(null);
          }}
          onClick={() => onSelect(null)}
          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer text-[11px] ${
            dropTargetId === "canvas-root"
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
    </div>
  );
};
