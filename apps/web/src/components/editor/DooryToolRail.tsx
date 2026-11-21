"use client";

import React from "react";
import {
  LayoutTemplate,
  Type,
  Shapes,
  Smile,
  UploadCloud,
  PaintBucket,
  Layers,
} from "lucide-react";

export type DooryRailTool =
  | "templates"
  | "text"
  | "shapes"
  | "elements"
  | "images"
  | "media"
  | "background"
  | "canvas"
  | "layers";

interface DooryToolRailProps {
  activeTool: DooryRailTool | null;
  onToggleTool: (tool: DooryRailTool) => void;
}

const RAIL_TOOLS: {
  id: DooryRailTool;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  shortcut?: string;
}[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "shapes", label: "Shapes", icon: Shapes, shortcut: "R" },
  { id: "elements", label: "Elements", icon: Smile },
  { id: "images", label: "Images", icon: UploadCloud, shortcut: "I" },
  { id: "background", label: "Canvas", icon: PaintBucket },
  { id: "layers", label: "Layers", icon: Layers, shortcut: "L" },
];

export const DooryToolRail: React.FC<DooryToolRailProps> = ({
  activeTool,
  onToggleTool,
}) => {
  return (
    <aside
      className="w-16 bg-[#0a0a0c] border-r border-[#1e1e24] flex flex-col items-center py-3 select-none z-20 shrink-0"
      aria-label="Doory Tool Rail"
      data-testid="doory-tool-rail"
    >
      <div className="flex flex-col gap-1.5 w-full px-2">
        {RAIL_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToggleTool(tool.id)}
              className={`group relative flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-[#18181c] text-white border border-[#2e2e38] shadow-md shadow-black/40"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-[#121216] border border-transparent"
              }`}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
              data-testid={`doory-rail-${tool.id}`}
              data-active={isActive}
            >
              <Icon
                size={18}
                className={`transition-transform duration-150 ${
                  isActive ? "scale-110 text-white" : "group-hover:scale-105"
                }`}
              />
              <span
                className={`text-[9px] font-mono tracking-wider mt-1 transition-colors ${
                  isActive ? "text-neutral-100 font-bold" : "text-neutral-500 group-hover:text-neutral-300"
                }`}
              >
                {tool.label}
              </span>

              {/* Active Indicator Dot - Nothing OS Red Accent */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-[#d71920]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
