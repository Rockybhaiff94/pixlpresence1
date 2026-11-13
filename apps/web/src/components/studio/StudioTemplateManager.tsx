"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  Plus,
  Copy,
  Trash2,
  Check,
  LayoutTemplate,
} from "lucide-react";
import { ProfileDesignConfig } from "@/types/studio";
import { TEMPLATE_PRESETS, StudioTemplatePreset } from "./templates";

function createUniqueId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`;
}

function getTimestamp(): number {
  return Date.now();
}

interface StudioTemplateManagerProps {
  currentConfig: ProfileDesignConfig;
  onApplyPreset: (preset: StudioTemplatePreset) => void;
  onApplyConfig: (config: ProfileDesignConfig) => void;
  isCompact?: boolean;
}

interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  config: ProfileDesignConfig;
  createdAt: number;
}

const STORAGE_KEY = "pixel_studio_custom_templates_v2";

export const StudioTemplateManager: React.FC<StudioTemplateManagerProps> = ({
  currentConfig,
  onApplyPreset,
  onApplyConfig,
  isCompact = false,
}) => {
  // Load custom templates synchronously from storage to avoid render cascade
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore parse error
      }
    }
    return [];
  });

  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const persistCustomTemplates = (templates: CustomTemplate[]) => {
    setCustomTemplates(templates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // ignore storage error
    }
  };

  const handleSaveCurrentAsTemplate = () => {
    const trimmed = newTemplateName.trim();
    if (!trimmed) return;

    const newTemplate: CustomTemplate = {
      id: createUniqueId("custom"),
      name: trimmed,
      description: "User crafted custom design",
      tags: ["Custom", "User"],
      config: JSON.parse(JSON.stringify(currentConfig)),
      createdAt: getTimestamp(),
    };

    const next = [newTemplate, ...customTemplates];
    persistCustomTemplates(next);
    setNewTemplateName("");
    setIsSavingCustom(false);
    flashMessage(`Saved custom template "${trimmed}"!`);
  };

  const handleDuplicateTemplate = (tpl: CustomTemplate | StudioTemplatePreset) => {
    const name = `${tpl.name} (Copy)`;
    const tags = "category" in tpl ? [tpl.category, "Duplicate"] : [...(tpl.tags || []), "Duplicate"];
    const newTemplate: CustomTemplate = {
      id: createUniqueId("custom_copy"),
      name,
      description: tpl.description || "Duplicated preset",
      tags,
      config: JSON.parse(JSON.stringify(tpl.config)),
      createdAt: getTimestamp(),
    };
    persistCustomTemplates([newTemplate, ...customTemplates]);
    flashMessage(`Duplicated template as "${name}"`);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const next = customTemplates.filter((t) => t.id !== id);
    persistCustomTemplates(next);
    flashMessage("Template removed.");
  };

  const handleExportTemplate = (tpl: CustomTemplate | StudioTemplatePreset) => {
    const payload = JSON.stringify(
      {
        name: tpl.name,
        description: tpl.description,
        version: 2,
        exportedAt: new Date().toISOString(),
        config: tpl.config,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashMessage(`Exported ${tpl.name}.json`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || !parsed.config) {
          throw new Error("Invalid template JSON structure");
        }

        const imported: CustomTemplate = {
          id: createUniqueId("custom_import"),
          name: parsed.name || file.name.replace(/\.json$/i, ""),
          description: parsed.description || "Imported template file",
          tags: ["Imported"],
          config: parsed.config,
          createdAt: getTimestamp(),
        };

        persistCustomTemplates([imported, ...customTemplates]);
        onApplyConfig(parsed.config);
        flashMessage(`Imported and applied "${imported.name}"!`);
      } catch (err: unknown) {
        flashMessage(`Import failed: ${(err as Error)?.message || "Invalid JSON"}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const flashMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6 text-xs font-mono text-[#ededed]">
      {/* Top Banner / Actions */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-[#101014] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <LayoutTemplate size={16} className="text-white" />
            DESIGN TEMPLATES & STARTER PRESETS
          </h2>
          <p className="text-[11px] text-neutral-400 pt-0.5">
            1-click instant styling. Applying a template preserves your username, bio, and Discord accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            <Upload size={13} /> Import JSON
          </button>

          <button
            onClick={() => setIsSavingCustom((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 transition-colors cursor-pointer text-[11px]"
          >
            <Plus size={13} /> Save Current Design
          </button>
        </div>
      </div>

      {/* Save Template Prompt Modal / Drawer */}
      {isSavingCustom && (
        <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-900/90 space-y-3 animate-in fade-in">
          <label className="text-[10px] text-neutral-300 uppercase tracking-wider font-bold">
            Enter Template Name
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. My Obsidian Dark V2"
              className="flex-1 bg-black border border-neutral-700 rounded-lg px-3 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-white text-xs"
            />
            <button
              onClick={handleSaveCurrentAsTemplate}
              disabled={!newTemplateName.trim()}
              className="px-4 py-1.5 rounded-lg bg-white text-black font-bold disabled:opacity-30 hover:bg-neutral-200 cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => setIsSavingCustom(false)}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white flex items-center gap-2 text-[11px]">
          <Check size={14} className="text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* User Custom Templates */}
      {customTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            Your Custom Templates ({customTemplates.length})
          </h3>
          <div className={`grid gap-3 ${isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {customTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 rounded-xl border border-neutral-800 bg-[#0c0c0e] hover:border-neutral-600 transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{tpl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      CUSTOM
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 pt-1">{tpl.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicateTemplate(tpl)}
                      title="Duplicate Template"
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => handleExportTemplate(tpl)}
                      title="Export as JSON"
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomTemplate(tpl.id)}
                      title="Delete Custom Template"
                      className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onApplyConfig(tpl.config);
                      flashMessage(`Applied "${tpl.name}"!`);
                    }}
                    className="px-3 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-neutral-200 cursor-pointer"
                  >
                    Apply Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Starter Presets */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
          Curated Starter Presets ({TEMPLATE_PRESETS.length})
        </h3>
        <div className={`grid gap-3 ${isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
          {TEMPLATE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-3.5 rounded-xl border border-neutral-800 bg-[#0c0c0e] hover:border-neutral-600 transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{preset.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase">
                      {preset.category}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 pt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDuplicateTemplate(preset)}
                    title="Duplicate as Custom Template"
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => handleExportTemplate(preset)}
                    title="Export Template JSON"
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    <Download size={12} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    onApplyPreset(preset);
                    flashMessage(`Applied preset "${preset.name}"!`);
                  }}
                  className="px-3 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-neutral-200 cursor-pointer"
                >
                  Apply Preset
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
