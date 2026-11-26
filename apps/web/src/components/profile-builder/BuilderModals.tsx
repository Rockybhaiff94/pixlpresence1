"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  History,
  Image as ImageIcon,
  Loader2,
  Monitor,
  RefreshCw,
  RotateCcw,
  Sliders,
  Smartphone,
  Tablet,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { uploadMediaAsset } from "@/lib/uploadAsset";
import {
  BuilderCanvasSettings,
  BuilderDeviceMode,
  BuilderPreferences,
  ProfileBuilderDocument,
} from "./profileBuilderTypes";
import { sanitizeExternalUrl } from "./componentRegistry";
import { ProfileBuilderRenderer, ProfileLiveActivityData } from "./ProfileBuilderRenderer";

export interface ProfileHistoryItem {
  id: string;
  profileId: string;
  profileVersion: number;
  schemaVersion: string;
  saveSource: string;
  assetCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface ProfileHistorySnapshotData {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  designConfig?: Record<string, unknown> | null;
}

export interface ProfileHistorySnapshotDetail extends ProfileHistoryItem {
  data: ProfileHistorySnapshotData;
}

interface BuilderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: BuilderPreferences;
  canvas: BuilderCanvasSettings;
  onUpdatePreferences: (updates: Partial<BuilderPreferences>) => void;
  onUpdateCanvas: (updates: Partial<BuilderCanvasSettings>) => void;
  onPreviewHistorySnapshot?: (snapshot: ProfileHistorySnapshotDetail) => void;
  onRestoreHistorySnapshot?: (snapshot: ProfileHistorySnapshotDetail) => void;
}

function getRelativeDayGroup(isoDate: string): {
  group: "Today" | "Yesterday" | "Previous Days";
  relativeLabel: string;
  timeLabel: string;
} {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfItemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfItemDay) / (24 * 60 * 60 * 1000));
  const timeLabel = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) {
    return { group: "Today", relativeLabel: "Today", timeLabel };
  }
  if (diffDays === 1) {
    return { group: "Yesterday", relativeLabel: "Yesterday", timeLabel };
  }
  return {
    group: "Previous Days",
    relativeLabel: `${diffDays} days ago (${date.toLocaleDateString()})`,
    timeLabel,
  };
}

export const BuilderSettingsModal: React.FC<BuilderSettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  canvas,
  onUpdatePreferences,
  onUpdateCanvas,
  onPreviewHistorySnapshot,
  onRestoreHistorySnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "history">("general");
  const [historyItems, setHistoryItems] = useState<ProfileHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingSnapshotId, setLoadingSnapshotId] = useState<string | null>(null);
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<ProfileHistoryItem | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await apiFetch("/api/profile/me/history", { cache: "no-store" });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload?.error || `Failed to load history (${res.status})`);
      }
      const data = await res.json();
      setHistoryItems(Array.isArray(data?.snapshots) ? data.snapshots : []);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load profile history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== "history") return;
    const rafId = window.requestAnimationFrame(() => {
      void loadHistory();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [activeTab, isOpen, loadHistory]);

  const handleOpenSnapshotAction = async (
    item: ProfileHistoryItem,
    action: "preview" | "restore"
  ) => {
    setLoadingSnapshotId(item.id);
    setHistoryError(null);
    try {
      const res = await apiFetch(`/api/profile/me/history/${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload?.error || `Failed to load snapshot (${res.status})`);
      }
      const payload = await res.json();
      if (!payload?.snapshot) {
        throw new Error("Snapshot payload missing");
      }
      if (action === "preview") {
        onPreviewHistorySnapshot?.(payload.snapshot as ProfileHistorySnapshotDetail);
      } else {
        setConfirmRestoreItem(null);
        onRestoreHistorySnapshot?.(payload.snapshot as ProfileHistorySnapshotDetail);
        onClose();
      }
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : "Snapshot retrieval failed");
    } finally {
      setLoadingSnapshotId(null);
    }
  };

  if (!isOpen) return null;

  const groupedHistory = (["Today", "Yesterday", "Previous Days"] as const).map((groupName) => ({
    groupName,
    entries: historyItems.filter((item) => getRelativeDayGroup(item.createdAt).group === groupName),
  }));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      data-testid="builder-settings-modal"
    >
      <div className="w-full max-w-lg bg-[#0d0d11] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-3 border-b border-[#1d1d24] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Profile Builder Settings
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Canvas preferences and 7-day saved draft history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
            data-testid="settings-modal-close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="px-4 pt-2.5 border-b border-[#1d1d24] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-3 py-1.5 rounded-t-lg text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "general"
                ? "text-white border-white bg-white/[0.04]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
            data-testid="settings-tab-general"
          >
            <Sliders size={12} />
            <span>General</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-t-lg text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "history"
                ? "text-white border-white bg-white/[0.04]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
            data-testid="settings-tab-history"
          >
            <History size={12} />
            <span>Profile History</span>
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="p-4 space-y-4 text-xs overflow-y-auto custom-scrollbar">
          {/* Grid Visibility & Size */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Show Canvas Grid</span>
              <input
                type="checkbox"
                checked={preferences.showGrid}
                onChange={(e) => {
                  onUpdatePreferences({ showGrid: e.target.checked });
                  onUpdateCanvas({ gridEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-grid"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Grid Size (px)</span>
              <input
                type="number"
                min={4}
                max={64}
                value={canvas.gridSize}
                onChange={(e) =>
                  onUpdateCanvas({
                    gridSize: Math.max(4, Math.min(64, Number(e.target.value) || 16)),
                  })
                }
                className="w-20 bg-[#14141a] border border-[#282832] rounded px-2 py-1 text-white text-right outline-none"
              />
            </div>
          </div>

          {/* Snapping Controls */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Enable Snapping</span>
              <input
                type="checkbox"
                checked={preferences.snapEnabled}
                onChange={(e) => {
                  onUpdatePreferences({ snapEnabled: e.target.checked });
                  onUpdateCanvas({ snapEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-snap"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Snap to Grid Points</span>
              <input
                type="checkbox"
                disabled={!preferences.snapEnabled}
                checked={preferences.snapToGrid}
                onChange={(e) => onUpdatePreferences({ snapToGrid: e.target.checked })}
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Smart Alignment Guides</span>
              <input
                type="checkbox"
                checked={preferences.smartGuides}
                onChange={(e) => {
                  onUpdatePreferences({ smartGuides: e.target.checked });
                  onUpdateCanvas({ smartGuidesEnabled: e.target.checked });
                }}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-guides"
              />
            </div>
          </div>

          {/* Insertion & Display */}
          <div className="space-y-2 pb-3 border-b border-[#1b1b22]">
            <div className="space-y-1">
              <span className="text-neutral-400 text-[11px] block">Default Insertion Target</span>
              <select
                value={preferences.defaultInsertTarget}
                onChange={(e) =>
                  onUpdatePreferences({
                    defaultInsertTarget: e.target.value as BuilderPreferences["defaultInsertTarget"],
                  })
                }
                className="w-full bg-[#14141a] border border-[#282832] rounded-lg px-2.5 py-1.5 text-white outline-none"
              >
                <option value="selected-container">Selected Container (or Primary Embed)</option>
                <option value="primary-embed">Primary Profile Embed</option>
                <option value="canvas">Canvas Root (when allowed)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-neutral-300">Show Component Outlines on Hover</span>
              <input
                type="checkbox"
                checked={preferences.showComponentOutlines}
                onChange={(e) =>
                  onUpdatePreferences({ showComponentOutlines: e.target.checked })
                }
                className="accent-white w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Autosave */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1b1b22]">
            <span className="text-neutral-300">Auto-Save Local & Draft Sync</span>
            <input
              type="checkbox"
              checked={preferences.autoSaveEnabled}
              onChange={(e) => onUpdatePreferences({ autoSaveEnabled: e.target.checked })}
              className="accent-white w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Public Profile Entry Screen (guns.lol style) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-neutral-300 block">Public Entry Screen</span>
                <span className="text-[10px] text-neutral-500">
                  Show an interactive &ldquo;Click to Enter&rdquo; landing screen before revealing profile &amp; video
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(canvas.entryScreenEnabled)}
                onChange={(e) => onUpdateCanvas({ entryScreenEnabled: e.target.checked })}
                className="accent-white w-4 h-4 cursor-pointer"
                data-testid="setting-toggle-entry-screen"
              />
            </div>

            {canvas.entryScreenEnabled && (
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 block">Entry Prompt Text</label>
                <input
                  type="text"
                  value={canvas.entryScreenText ?? ""}
                  onChange={(e) => onUpdateCanvas({ entryScreenText: e.target.value })}
                  placeholder="[ CLICK ANYWHERE TO ENTER PROFILE ]"
                  className="w-full bg-[#14141a] border border-[#282832] rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none"
                  data-testid="setting-entry-screen-text"
                />
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="p-4 space-y-3 text-xs overflow-y-auto custom-scrollbar" data-testid="settings-history-panel">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121218] border border-[#23232e] text-[10px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-neutral-300 shrink-0" />
                <span>Saved snapshots are created only on Save Draft and expire after 7 days.</span>
              </span>
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={historyLoading}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                data-testid="history-refresh-btn"
              >
                <RefreshCw size={10} className={historyLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {historyError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-[11px] flex items-center gap-2">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span>{historyError}</span>
              </div>
            )}

            {historyLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-neutral-400 text-[11px]">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading saved draft history...</span>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-8 text-center space-y-1 text-neutral-500 text-[11px] border border-dashed border-[#23232d] rounded-xl">
                <p className="text-neutral-300 font-semibold">No saved history snapshots yet</p>
                <p className="text-[10px]">
                  Click Save Draft in the toolbar to record a restorable 7-day version snapshot.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedHistory
                  .filter((g) => g.entries.length > 0)
                  .map(({ groupName, entries }) => (
                    <div key={groupName} className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1">
                        {groupName}
                      </div>
                      <div className="space-y-1.5">
                        {entries.map((item) => {
                          const meta = getRelativeDayGroup(item.createdAt);
                          const isBusy = loadingSnapshotId === item.id;
                          const isConfirming = confirmRestoreItem?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-[#131318] border border-[#24242f] space-y-2"
                              data-testid={`history-entry-${item.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-white flex items-center gap-2">
                                    <span>{meta.timeLabel} — Draft saved</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-neutral-300">
                                      v{item.profileVersion}
                                    </span>
                                  </div>
                                  <div
                                    className="text-[10px] text-neutral-500 mt-0.5"
                                    title={new Date(item.createdAt).toISOString()}
                                  >
                                    {meta.relativeLabel} &bull; Expires{" "}
                                    {new Date(item.expiresAt).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleOpenSnapshotAction(item, "preview")}
                                    className="px-2 py-1 rounded-md bg-[#1a1a22] hover:bg-[#252530] border border-[#2c2c38] text-neutral-200 text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                                    data-testid={`history-preview-${item.id}`}
                                  >
                                    Preview
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setConfirmRestoreItem(item)}
                                    className="px-2 py-1 rounded-md bg-white hover:bg-neutral-200 text-black text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                    data-testid={`history-restore-${item.id}`}
                                  >
                                    Restore
                                  </button>
                                </div>
                              </div>

                              {isConfirming && (
                                <div className="p-2 rounded-lg bg-amber-950/35 border border-amber-700/50 flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-amber-200">
                                    Load v{item.profileVersion} into editor? Click Save Draft afterward to save it.
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRestoreItem(null)}
                                      className="px-2 py-0.5 rounded bg-black/40 text-neutral-300 hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleOpenSnapshotAction(item, "restore")}
                                      className="px-2 py-0.5 rounded bg-amber-300 text-black font-bold hover:bg-amber-200 cursor-pointer"
                                      data-testid={`history-confirm-restore-${item.id}`}
                                    >
                                      Confirm Restore
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-[#1d1d24] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold cursor-pointer hover:bg-neutral-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewEntryGate: React.FC<{
  enabled: boolean;
  promptText?: string;
  username: string;
  children: React.ReactNode;
}> = ({ enabled, promptText, username, children }) => {
  const [entered, setEntered] = useState(false);

  if (!enabled || entered) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {children}
      <div
        onClick={() => setEntered(true)}
        data-testid="preview-entry-screen"
        className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer p-6 text-center select-none"
      >
        <div className="space-y-3 max-w-xs">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
            [ INITIALIZE DIGITAL IDENTITY ]
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white">@{username}</h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEntered(true);
            }}
            data-testid="preview-enter-profile-btn"
            className="text-xs text-neutral-200 hover:text-white px-4 py-2 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/[0.12] transition-colors cursor-pointer"
          >
            {promptText?.trim() || "[ CLICK ANYWHERE TO ENTER PROFILE ]"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProfileBuilderDocument;
  deviceMode: BuilderDeviceMode;
  onDeviceModeChange: (mode: BuilderDeviceMode) => void;
  liveData: ProfileLiveActivityData;
  mode: "draft" | "history";
  historyMeta?: { id: string; createdAt: string; profileVersion: number } | null;
  onRestoreHistory?: () => void;
  publicUrl?: string | null;
  isPublished?: boolean;
}

export const ProfilePreviewModal: React.FC<ProfilePreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  deviceMode,
  onDeviceModeChange,
  liveData,
  mode,
  historyMeta,
  onRestoreHistory,
  publicUrl,
  isPublished,
}) => {
  if (!isOpen) return null;

  const frameMaxWidth =
    deviceMode === "mobile" ? "390px" : deviceMode === "tablet" ? "768px" : "100%";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col font-mono"
      data-testid="builder-preview-modal"
    >
      {/* Top Bar */}
      <div className="h-12 px-4 border-b border-[#22222c] bg-[#0a0a0e] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              mode === "history"
                ? "bg-amber-950/50 border-amber-700/60 text-amber-200"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            {mode === "history"
              ? `Snapshot v${historyMeta?.profileVersion ?? "?"} (${
                  historyMeta?.createdAt
                    ? new Date(historyMeta.createdAt).toLocaleString()
                    : ""
                })`
              : "Draft Preview (Live Editor State)"}
          </span>

          {liveData?.username && (
            <span className="hidden sm:inline text-[11px] text-neutral-400 truncate">
              pixel.gg/{liveData.username}
            </span>
          )}
        </div>

        {/* Breakpoint Switcher */}
        <div className="flex items-center gap-0.5 bg-[#121218] border border-[#24242f] rounded-lg p-0.5">
          {(
            [
              { id: "desktop", label: "Desktop", icon: Monitor },
              { id: "tablet", label: "Tablet", icon: Tablet },
              { id: "mobile", label: "Mobile", icon: Smartphone },
            ] as const
          ).map((dev) => {
            const Icon = dev.icon;
            const active = deviceMode === dev.id;
            return (
              <button
                key={dev.id}
                type="button"
                onClick={() => onDeviceModeChange(dev.id)}
                className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 cursor-pointer ${
                  active ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
                data-testid={`preview-device-${dev.id}`}
              >
                <Icon size={12} />
                <span className="hidden md:inline">{dev.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === "history" && onRestoreHistory && (
            <button
              type="button"
              onClick={onRestoreHistory}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-[11px] font-bold cursor-pointer"
              data-testid="preview-restore-snapshot-btn"
            >
              Restore This Version
            </button>
          )}

          {publicUrl && mode === "draft" && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-[#14141a] hover:bg-[#1e1e26] border border-[#2b2b36] text-neutral-200 text-[11px] flex items-center gap-1.5"
              data-testid="preview-open-public-link"
            >
              <span>{isPublished ? "Open Public Profile" : "Open Server Preview"}</span>
              <ExternalLink size={11} />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            data-testid="preview-modal-close"
          >
            <X size={13} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Shared ProfileBuilderRenderer Viewport */}
      <div className="flex-1 overflow-hidden p-3 sm:p-6 flex justify-center bg-[#060608]">
        <div
          className={`relative w-full h-full flex flex-col overflow-hidden ${
            deviceMode !== "desktop"
              ? "border border-[#2b2b36] rounded-2xl shadow-2xl"
              : "rounded-xl"
          }`}
          style={{ maxWidth: frameMaxWidth }}
          data-testid="preview-viewport-frame"
        >
          <PreviewEntryGate
            enabled={Boolean(document.canvas.entryScreenEnabled)}
            promptText={document.canvas.entryScreenText}
            username={liveData?.username || "profile"}
          >
            <ProfileBuilderRenderer
              document={document}
              deviceMode={deviceMode}
              isInteractive={false}
              liveData={liveData}
            />
          </PreviewEntryGate>
        </div>
      </div>
    </div>
  );
};

interface ResetConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      data-testid="builder-reset-modal"
    >
      <div className="w-full max-w-md bg-[#0d0d11] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1d1d24] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-amber-300" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Reset Design to Default?
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-2.5 text-[11px] text-neutral-300 leading-relaxed">
          <p>
            This will return your canvas layout, background, styling, and elements in the editor to the default Pixel.gg Studio template.
          </p>
          <p className="text-neutral-400 text-[10px]">
            Your authenticated identity, Discord link, custom username, uploaded assets, RPC configuration, and saved 7-day history snapshots will not be removed. You can use Undo or click Save Draft when ready.
          </p>
        </div>

        <div className="px-4 py-3 border-t border-[#1d1d24] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg bg-[#14141a] hover:bg-[#1d1d25] border border-[#2b2b36] text-neutral-200 text-xs font-semibold cursor-pointer"
            data-testid="reset-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold cursor-pointer"
            data-testid="reset-confirm-btn"
          >
            Reset Design
          </button>
        </div>
      </div>
    </div>
  );
};

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialUrl?: string;
  targetSlot?: string;
  onSelectMedia: (url: string) => void;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  title = "Select or Upload Media",
  initialUrl = "",
  targetSlot = "studio_asset",
  onSelectMedia,
}) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [recentAssets, setRecentAssets] = useState<Array<{ id: string; url: string; fileName: string; isAnimated?: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }
    let active = true;
    apiFetch("/api/rpc/assets")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status !== 401 && active) {
            setAssetsError("Saved asset library is temporarily unavailable.");
          }
          return null;
        }
        return res.json();
      })
      .then((data: { assets?: Array<{ id?: string; url?: string; processedUrl?: string; originalUrl?: string; fileName?: string; isAnimated?: boolean }> } | Array<{ id?: string; url?: string; processedUrl?: string; originalUrl?: string; fileName?: string; isAnimated?: boolean }> | null) => {
        if (!active || !data) return;
        const list = Array.isArray(data) ? data : Array.isArray(data.assets) ? data.assets : [];
        setRecentAssets(
          list
            .map((a) => ({
              id: a?.id || a?.url || a?.processedUrl || a?.originalUrl || "",
              url: a?.url || a?.processedUrl || a?.originalUrl || "",
              fileName: a?.fileName || "Uploaded asset",
              isAnimated: Boolean(a?.isAnimated),
            }))
            .filter((a) => Boolean(a.url))
            .slice(0, 12)
        );
      })
      .catch(() => {});
    return () => {
      active = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const processUploadFile = async (file: File) => {
    if (uploading) return;
    setError(null);
    setLastSelectedFile(file);
    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Validating file...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isVideoSlot =
        targetSlot === "background_video" || targetSlot === "container_background_video";
      const uploaded = await uploadMediaAsset({
        file,
        targetSlot,
        kind: isVideoSlot ? "video" : "image",
        signal: controller.signal,
        onProgress: (pct, stage) => {
          setUploadProgress(pct);
          setUploadStage(stage);
        },
      });

      setLastSelectedFile(null);
      onSelectMedia(uploaded.url);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Upload cancelled.") {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed. Check connection or image size.");
      }
    } finally {
      abortControllerRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processUploadFile(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUploadFile(file);
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/rpc/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecentAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    } catch {
      // Ignore transient delete errors
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeExternalUrl(urlInput);
    if (!clean) {
      setError("Enter a valid https://, http://, or relative asset URL.");
      return;
    }
    onSelectMedia(clean);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      data-testid="media-upload-modal"
    >
      <div className="w-full max-w-md bg-[#0d0d11] border border-[#282832] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1d1d24] flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
          <button
            type="button"
            onClick={() => {
              abortControllerRef.current?.abort();
              onClose();
            }}
            className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Upload via Pixel.gg Image Host */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFile}
            className={`flex flex-col items-center justify-center p-5 rounded-xl border border-dashed bg-[#121217] transition-colors ${
              uploading
                ? "border-white/30 cursor-wait opacity-90"
                : "border-[#30303b] hover:border-white/40 cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={
                targetSlot === "background_video" || targetSlot === "container_background_video"
                  ? "video/mp4,video/webm,.mp4,.webm"
                  : "image/png,image/jpeg,image/webp,image/gif"
              }
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              data-testid="media-file-input"
            />
            {uploading ? (
              <div className="w-full flex flex-col items-center space-y-2">
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="text-neutral-300">{uploadStage || "Uploading to Pixel.gg Storage..."}</span>
                <div className="w-full max-w-xs h-1 bg-[#1e1e26] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    abortControllerRef.current?.abort();
                  }}
                  className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer pt-0.5"
                >
                  Cancel upload
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={20} className="text-neutral-300 mb-2" />
                <span className="text-white font-semibold">
                  {targetSlot === "background_video"
                    ? "Upload MP4 or WebM Video"
                    : "Upload PNG, JPG, WEBP or GIF"}
                </span>
                <span className="text-[10px] text-neutral-500 mt-1">
                  {targetSlot === "background_video"
                    ? "Preserves original audio · Max 25 MB"
                    : "Preserves animated GIFs · Max 10 MB"}
                </span>
              </>
            )}
          </label>

          {error && (
            <div
              className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-[11px] flex items-center justify-between gap-2"
              data-testid="media-upload-error"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle size={13} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              {lastSelectedFile && !uploading && (
                <button
                  type="button"
                  onClick={() => void processUploadFile(lastSelectedFile)}
                  className="shrink-0 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  data-testid="media-upload-retry"
                >
                  <RefreshCw size={10} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Direct URL */}
          <form onSubmit={handleApplyUrl} className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 uppercase block">Or Direct Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[#14141a] border border-[#282832] rounded-lg px-2.5 py-1.5 text-white outline-none"
                data-testid="media-url-input"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 cursor-pointer flex items-center gap-1"
                data-testid="media-url-apply"
              >
                <Check size={12} />
                <span>Apply</span>
              </button>
            </div>
          </form>

          {/* Uploaded Assets Library */}
          {recentAssets.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#1b1b22]">
              <span className="text-[10px] text-neutral-400 uppercase block">
                Your Pixel.gg Hosted Assets
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto custom-scrollbar">
                {recentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-[#282832] hover:border-white bg-[#14141a]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMedia(asset.url);
                        onClose();
                      }}
                      className="w-full h-full cursor-pointer"
                      title={asset.fileName}
                    >
                      <img src={asset.url} alt={asset.fileName} className="w-full h-full object-cover" />
                    </button>
                    {asset.id && asset.id !== asset.url && (
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteAsset(asset.id, e)}
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/75 text-neutral-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentAssets.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-1">
              <ImageIcon size={12} />
              <span>{assetsError || "Uploaded assets appear here for reuse across embeds."}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
