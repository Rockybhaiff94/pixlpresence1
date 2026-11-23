"use client";

import React from "react";
import {
  X,
  Save,
  Clock,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { AutoFixIssue } from "./autoFixEngine";

export interface AutoSaveSettings {
  autoSaveEnabled: boolean;
  saveDelaySec: number;
  recoveryProtectionEnabled: boolean;
  autoFixOnSave: boolean;
}

interface AutoSaveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoSaveSettings;
  onUpdateSettings: (settings: AutoSaveSettings) => void;
  elements?: any[];
  canvas?: any;
  onApplyFixes: () => void;
  detectedIssues?: AutoFixIssue[];
}

export const AutoSaveSettingsModal: React.FC<AutoSaveSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  elements = [],
  canvas,
  onApplyFixes,
  detectedIssues: passedIssues,
}) => {
  if (!isOpen) return null;

  const DELAY_OPTIONS = [1, 2, 3, 5, 10];
  const detectedIssues = passedIssues || [];
  const { autoSaveEnabled, saveDelaySec, recoveryProtectionEnabled, autoFixOnSave } = settings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0c0c10] border border-[#242430] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1c1c24] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d71920]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">
              STUDIO PREFERENCES // AUTO SAVE & FIX
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {/* Section 1: Auto Save Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121218] border border-[#20202c]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <Save size={14} className="text-emerald-400" />
                <span className="font-bold text-white text-xs">Auto Save Changes</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Automatically persists your design changes in the background after you stop editing.
              </p>
            </div>

            {/* Sliding Animated Switch */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, autoSaveEnabled: !autoSaveEnabled })
              }
              data-testid="toggle-autosave"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSaveEnabled ? "bg-[#22C55E]" : "bg-[#272732]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSaveEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section 2: Save Delay Selector */}
          {autoSaveEnabled && (
            <div className="space-y-2 p-3.5 rounded-xl bg-[#121218] border border-[#20202c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-neutral-400" />
                  <span className="font-bold text-white text-xs">Auto Save Delay</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {saveDelaySec}s Delay
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Time to wait after your last edit before triggering the background save countdown.
              </p>

              <div className="grid grid-cols-5 gap-1.5 pt-2">
                {DELAY_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, saveDelaySec: sec })
                    }
                    data-testid={`delay-option-${sec}s`}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                      saveDelaySec === sec
                        ? "bg-white text-black border-white shadow-md shadow-white/10"
                        : "bg-[#181820] text-neutral-400 hover:text-white border-[#272736] hover:bg-[#20202c]"
                    }`}
                  >
                    {sec}s {sec === 2 && <span className="text-[9px] block font-normal">Default</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Recovery Protection */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121218] border border-[#20202c]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-400" />
                <span className="font-bold text-white text-xs">Recovery Protection</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Maintains redundant local storage recovery checkpoints against browser crashes and offline loss.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  recoveryProtectionEnabled: !recoveryProtectionEnabled,
                })
              }
              data-testid="toggle-recovery"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                recoveryProtectionEnabled ? "bg-white" : "bg-[#272732]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  recoveryProtectionEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section 4: Auto Fix on Save Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121218] border border-[#20202c]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-purple-400" />
                <span className="font-bold text-white text-xs">Auto Fix on Save</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Automatically clamp out-of-bounds positions and repair zero dimensions whenever saving.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, autoFixOnSave: !autoFixOnSave })
              }
              data-testid="toggle-autofix-on-save"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoFixOnSave ? "bg-purple-500" : "bg-[#272732]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoFixOnSave ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section 4: Auto Fix Health & Diagnostics */}
          <div className="space-y-3 p-3.5 rounded-xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-amber-400" />
                <span className="font-bold text-white text-xs">Auto Fix Diagnostic Engine</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  detectedIssues.length === 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
                data-testid="autofix-status-badge"
              >
                {detectedIssues.length === 0 ? "All Healthy" : `${detectedIssues.length} Issues Detected`}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400">
              Scans elements for boundary overflow, zero dimensions, broken layer hierarchies, and unreadable fonts. Never deletes user assets or changes canvas dimensions.
            </p>

            {detectedIssues.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {detectedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-2 rounded-lg bg-[#181822] border border-[#292938] text-[11px] flex items-start gap-2"
                  >
                    <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-neutral-200 font-medium">{issue.description}</p>
                      <p className="text-[10px] text-neutral-500">Fix: {issue.appliedFix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onApplyFixes();
                onClose();
              }}
              data-testid="run-autofix-btn"
              className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99]"
            >
              <Wrench size={13} />
              <span>
                {detectedIssues.length > 0
                  ? `Run Auto Fix Now (${detectedIssues.length} Corrections)`
                  : "Run Auto Fix Now"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
