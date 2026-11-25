"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { ComponentDockViewState } from "../studio/StudioFloatingDock";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BuilderCanvasSettings,
  BuilderComponentType,
  BuilderDeviceMode,
  BuilderHistorySnapshot,
  BuilderNode,
  BuilderPreferences,
  BuilderSaveStatus,
  ProfileBuilderDocument,
} from "./profileBuilderTypes";
import {
  MAX_NESTING_DEPTH,
  cloneNodeTree,
  createDefaultReferenceDocument,
  createNodeFromRegistry,
  deleteNodeSubtree,
  getNestingDepth,
  isContainerType,
  validateProfileBuilderDocument,
  wouldCreateCycle,
} from "./componentRegistry";
import { exportProfileBuilderJson, exportProfileBuilderPng } from "./profileBuilderExport";
import { TopToolbar } from "./TopToolbar";
import { AddElementPanel } from "./AddElementPanel";
import { ProfileCanvasWorkspace } from "./ProfileCanvasWorkspace";
import { BuilderSettingsModal, MediaUploadModal } from "./BuilderModals";
import { DockBridgePanel } from "./DockBridgePanel";
import { ProfileLiveActivityData } from "./ProfileBuilderRenderer";
import { SecondaryDockPanelSystem } from "./SecondaryDockPanelSystem";
import { AddElementsModal } from "./AddElementsModal";
import {
  DEFAULT_SECONDARY_DOCK_STATE,
  SecondaryDockState,
} from "./secondaryDockTypes";

const DRAFT_STORAGE_KEY = "pixel_profile_builder_draft_v2";

interface ProfileBuilderStudioProps {
  children?: React.ReactNode; // Untouched StudioFloatingDock passed from customize page
}

export const ProfileBuilderStudio: React.FC<ProfileBuilderStudioProps> = ({ children }) => {
  const { user, profile, refreshUser } = useAuth();

  // Deterministic SSR initial state; persisted/remote doc hydrated post-mount cleanly
  const [doc, setDoc] = useState<ProfileBuilderDocument>(() => createDefaultReferenceDocument());
  const [selectedId, setSelectedId] = useState<string | null>("embed-profile-root");
  const [deviceMode, setDeviceMode] = useState<BuilderDeviceMode>("desktop");
  const [zoom, setZoom] = useState<number>(0.65);

  const [saveStatus, setSaveStatus] = useState<BuilderSaveStatus>("ready");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [dockNavState, setDockNavState] = useState<ComponentDockViewState>("normal");
  const [preservedDockRatio, setPreservedDockRatio] = useState<{ x: number; y: number } | null>(
    null
  );
  const studioBodyRef = useRef<HTMLDivElement>(null);
  const [secondaryDockState, setSecondaryDockState] = useState<SecondaryDockState>(
    DEFAULT_SECONDARY_DOCK_STATE
  );
  const [isAddElementsModalOpen, setIsAddElementsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mediaModalState, setMediaModalState] = useState<{
    open: boolean;
    title: string;
    initialUrl: string;
    onApply: (url: string) => void;
  } | null>(null);

  // Isolated state for existing protected Dock
  const [dockActiveTool, setDockActiveTool] = useState<string | null>(null);
  const [dockAddedIds, setDockAddedIds] = useState<string[]>([]);
  const [liveRpc, setLiveRpc] = useState<ProfileLiveActivityData["discordPresence"]>(null);

  // Undo / Redo transaction history
  const [history, setHistory] = useState<BuilderHistorySnapshot[]>(() => [
    {
      canvas: JSON.parse(JSON.stringify(doc.canvas)),
      nodes: JSON.parse(JSON.stringify(doc.nodes)),
      selectedId: "embed-profile-root",
    },
  ]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const isDirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Hydrate saved draft or published profile designConfig post-mount without hydration mismatch
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      try {
        const localRaw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw) as ProfileBuilderDocument;
          if (parsed && parsed.version === "2.0" && Array.isArray(parsed.nodes) && parsed.canvas) {
            setDoc(parsed);
            setHistory([
              {
                canvas: JSON.parse(JSON.stringify(parsed.canvas)),
                nodes: JSON.parse(JSON.stringify(parsed.nodes)),
                selectedId: null,
              },
            ]);
            setHistoryIdx(0);
            return;
          }
        }
        if (profile?.designConfig) {
          const rawCfg =
            typeof profile.designConfig === "string"
              ? JSON.parse(profile.designConfig)
              : profile.designConfig;
          if (rawCfg?.profileBuilder?.version === "2.0") {
            const loaded = rawCfg.profileBuilder as ProfileBuilderDocument;
            setDoc(loaded);
            setHistory([
              {
                canvas: JSON.parse(JSON.stringify(loaded.canvas)),
                nodes: JSON.parse(JSON.stringify(loaded.nodes)),
                selectedId: null,
              },
            ]);
            setHistoryIdx(0);
          }
        }
      } catch {
        // Ignore corrupted draft and keep safe starter document
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [profile]);

  // Fetch optional live Discord RPC status for preview without fabricating data
  useEffect(() => {
    if (!user?.username) return;
    let active = true;
    apiFetch(`/api/profile/u/${encodeURIComponent(user.username)}/presence`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.presence) {
          setLiveRpc(json.presence);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.username]);

  const liveData: ProfileLiveActivityData = useMemo(
    () => ({
      username: user?.username || null,
      displayName: profile?.displayName || user?.globalName || user?.username || null,
      bio: profile?.bio || null,
      avatarUrl: profile?.avatarUrl || null,
      bannerUrl: profile?.bannerUrl || null,
      musicUrl: profile?.musicUrl || null,
      discordPresence: liveRpc,
    }),
    [liveRpc, profile, user]
  );

  const commitSnapshot = useCallback(
    (nextCanvas: BuilderCanvasSettings, nextNodes: BuilderNode[], nextSelectedId: string | null) => {
      const snap: BuilderHistorySnapshot = {
        canvas: JSON.parse(JSON.stringify(nextCanvas)),
        nodes: JSON.parse(JSON.stringify(nextNodes)),
        selectedId: nextSelectedId,
      };
      setHistory((prev) => [...prev.slice(0, historyIdx + 1), snap].slice(-40));
      setHistoryIdx((prev) => Math.min(prev + 1, 39));
      isDirtyRef.current = true;
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [historyIdx]
  );

  const handleUndo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prevIdx = historyIdx - 1;
    const snap = history[prevIdx];
    setDoc((d) => ({
      ...d,
      canvas: JSON.parse(JSON.stringify(snap.canvas)),
      nodes: JSON.parse(JSON.stringify(snap.nodes)),
    }));
    setSelectedId(snap.selectedId);
    setHistoryIdx(prevIdx);
    setSaveStatus("unsaved");
    setIsDirty(true);
  }, [history, historyIdx]);

  const handleRedo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    const snap = history[nextIdx];
    setDoc((d) => ({
      ...d,
      canvas: JSON.parse(JSON.stringify(snap.canvas)),
      nodes: JSON.parse(JSON.stringify(snap.nodes)),
    }));
    setSelectedId(snap.selectedId);
    setHistoryIdx(nextIdx);
    setSaveStatus("unsaved");
    setIsDirty(true);
  }, [history, historyIdx]);

  // Global Undo/Redo keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo]);

  const handleUpdateCanvas = useCallback(
    (updates: Partial<BuilderCanvasSettings>) => {
      setDoc((prev) => {
        const nextCanvas = { ...prev.canvas, ...updates };
        commitSnapshot(nextCanvas, prev.nodes, selectedId);
        return {
          ...prev,
          canvas: nextCanvas,
          metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
        };
      });
    },
    [commitSnapshot, selectedId]
  );

  const handleUpdatePreferences = useCallback((updates: Partial<BuilderPreferences>) => {
    setDoc((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
    }));
  }, []);

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<BuilderNode>, options?: { skipHistory?: boolean }) => {
      setDoc((prev) => {
        const nextNodes = prev.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
        if (!options?.skipHistory) {
          commitSnapshot(prev.canvas, nextNodes, selectedId);
        }
        return {
          ...prev,
          nodes: nextNodes,
          metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
        };
      });
    },
    [commitSnapshot, selectedId]
  );

  const handleCommitHistory = useCallback(() => {
    commitSnapshot(doc.canvas, doc.nodes, selectedId);
  }, [commitSnapshot, doc.canvas, doc.nodes, selectedId]);

  const resolveInsertParent = useCallback(
    (type: BuilderComponentType, explicitParentId?: string | null): { parentId: string | null; error?: string } => {
      if (type === "embed" || type === "background") {
        return { parentId: null };
      }

      if (explicitParentId !== undefined) {
        if (explicitParentId === null) return { parentId: null };
        const explicitNode = doc.nodes.find((n) => n.id === explicitParentId);
        if (!explicitNode || !isContainerType(explicitNode.type)) {
          return { parentId: null, error: "Selected drop target is not a container." };
        }
        if (getNestingDepth(explicitParentId, doc.nodes) >= MAX_NESTING_DEPTH) {
          return {
            parentId: null,
            error: `Nesting depth limit (${MAX_NESTING_DEPTH}) reached.`,
          };
        }
        return { parentId: explicitParentId };
      }

      const selectedNode = selectedId ? doc.nodes.find((n) => n.id === selectedId) : null;
      if (selectedNode && isContainerType(selectedNode.type)) {
        if (getNestingDepth(selectedNode.id, doc.nodes) >= MAX_NESTING_DEPTH) {
          return {
            parentId: selectedNode.parentId,
            error: `Maximum nesting depth (${MAX_NESTING_DEPTH}) reached.`,
          };
        }
        return { parentId: selectedNode.id };
      }

      if (selectedNode?.parentId && doc.preferences.defaultInsertTarget !== "canvas") {
        return { parentId: selectedNode.parentId };
      }

      if (doc.preferences.defaultInsertTarget === "canvas" && type !== "nested-embed") {
        return { parentId: null };
      }

      const primaryEmbed = doc.nodes.find((n) => n.type === "embed" && n.parentId === null);
      if (primaryEmbed) return { parentId: primaryEmbed.id };

      if (type === "nested-embed") {
        return { parentId: null, error: "Create or select a parent Embed before inserting a Nested Embed." };
      }
      return { parentId: null };
    },
    [doc.nodes, doc.preferences.defaultInsertTarget, selectedId]
  );

  const insertComponent = useCallback(
    (
      type: BuilderComponentType,
      explicitParentId?: string | null,
      x?: number,
      y?: number,
      extra?: Partial<BuilderNode>
    ): string | null => {
      const target = resolveInsertParent(type, explicitParentId);
      if (target.error) {
        setErrorBanner(target.error);
        setTimeout(() => setErrorBanner(null), 4000);
        if (explicitParentId !== undefined) return null;
      }

      const created = createNodeFromRegistry(type, {
        parentId: target.parentId,
        nodes: doc.nodes,
        canvas: doc.canvas,
        x,
        y,
        seed: {
          displayName: liveData.displayName,
          username: liveData.username,
          bio: liveData.bio,
          avatarUrl: liveData.avatarUrl,
          bannerUrl: liveData.bannerUrl,
          appName: liveData.discordPresence?.appName,
          details: liveData.discordPresence?.details,
          state: liveData.discordPresence?.state,
        },
      });
      const finalNode: BuilderNode = extra ? { ...created, ...extra } : created;

      const nextNodes = [...doc.nodes, finalNode];
      setDoc((prev) => ({
        ...prev,
        nodes: nextNodes,
        metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
      }));
      setSelectedId(finalNode.id);
      commitSnapshot(doc.canvas, nextNodes, finalNode.id);
      return finalNode.id;
    },
    [commitSnapshot, doc.canvas, doc.nodes, liveData, resolveInsertParent]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const { nextNodes, clonedRootId } = cloneNodeTree(id, doc.nodes);
      if (!clonedRootId) return;
      setDoc((prev) => ({ ...prev, nodes: nextNodes }));
      setSelectedId(clonedRootId);
      commitSnapshot(doc.canvas, nextNodes, clonedRootId);
    },
    [commitSnapshot, doc.canvas, doc.nodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target || target.type === "background") return;
      if (target.locked) {
        showToast("Unlock component before deleting.");
        return;
      }
      const nextNodes = deleteNodeSubtree(id, doc.nodes);
      const nextSelected = selectedId === id || !nextNodes.some((n) => n.id === selectedId)
        ? null
        : selectedId;
      setDoc((prev) => ({ ...prev, nodes: nextNodes }));
      setSelectedId(nextSelected);
      commitSnapshot(doc.canvas, nextNodes, nextSelected);
      if (isContainerType(target.type)) {
        showToast(`Deleted "${target.name}" and its nested children (Ctrl+Z to undo).`);
      }
    },
    [commitSnapshot, doc.canvas, doc.nodes, selectedId, showToast]
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target) return;
      handleUpdateNode(id, { locked: !target.locked });
    },
    [doc.nodes, handleUpdateNode]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target) return;
      handleUpdateNode(id, { visible: !target.visible });
    },
    [doc.nodes, handleUpdateNode]
  );

  const handleAlignNode = useCallback(
    (id: string, alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
      const node = doc.nodes.find((n) => n.id === id);
      if (!node || node.locked) return;
      const parent = node.parentId ? doc.nodes.find((p) => p.id === node.parentId) : null;
      const scopeW = parent ? parent.width : doc.canvas.width;
      const scopeH = parent ? parent.height : doc.canvas.height;
      let nextX = node.x;
      let nextY = node.y;
      if (alignment === "left") nextX = 0;
      if (alignment === "center-h") nextX = Math.round((scopeW - node.width) / 2);
      if (alignment === "right") nextX = scopeW - node.width;
      if (alignment === "top") nextY = 0;
      if (alignment === "center-v") nextY = Math.round((scopeH - node.height) / 2);
      if (alignment === "bottom") nextY = scopeH - node.height;
      handleUpdateNode(id, { x: nextX, y: nextY });
    },
    [doc.canvas.height, doc.canvas.width, doc.nodes, handleUpdateNode]
  );

  const handleReorderNode = useCallback(
    (id: string, direction: "top" | "up" | "down" | "bottom") => {
      const target = doc.nodes.find((n) => n.id === id);
      if (!target || target.type === "background") return;
      const sibs = doc.nodes
        .filter((n) => (n.parentId || null) === (target.parentId || null) && n.type !== "background")
        .sort((a, b) => a.zIndex - b.zIndex);
      const idx = sibs.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const reordered = [...sibs];
      const [item] = reordered.splice(idx, 1);
      if (direction === "top") reordered.push(item);
      else if (direction === "bottom") reordered.unshift(item);
      else if (direction === "up") reordered.splice(Math.min(reordered.length, idx + 1), 0, item);
      else reordered.splice(Math.max(0, idx - 1), 0, item);

      const zMap = new Map<string, number>();
      reordered.forEach((n, i) => zMap.set(n.id, i + 1));
      const nextNodes = doc.nodes.map((n) => {
        if (n.type === "background") return { ...n, zIndex: 0 };
        return zMap.has(n.id) ? { ...n, zIndex: zMap.get(n.id)! } : n;
      });
      setDoc((prev) => ({ ...prev, nodes: nextNodes }));
      commitSnapshot(doc.canvas, nextNodes, selectedId);
    },
    [commitSnapshot, doc.canvas, doc.nodes, selectedId]
  );

  const handleMoveLayerRelative = useCallback(
    (
      draggedId: string,
      targetId: string,
      position: "before" | "after" | "inside"
    ): { ok: boolean; error?: string } => {
      const dragged = doc.nodes.find((n) => n.id === draggedId);
      const target = doc.nodes.find((n) => n.id === targetId);
      if (!dragged || !target || dragged.id === target.id) {
        return { ok: false };
      }
      if (dragged.type === "background" || target.type === "background") {
        return { ok: false, error: "Background layer cannot be reordered." };
      }

      const newParentId = position === "inside" ? target.id : target.parentId || null;

      if (newParentId) {
        const targetContainer = doc.nodes.find((n) => n.id === newParentId);
        if (!targetContainer || !isContainerType(targetContainer.type)) {
          return { ok: false, error: "Destination cannot contain child elements." };
        }
        if (wouldCreateCycle(dragged.id, newParentId, doc.nodes)) {
          return { ok: false, error: "Invalid circular drop: parent cannot move into descendant." };
        }
        if (getNestingDepth(newParentId, doc.nodes) + 1 > MAX_NESTING_DEPTH) {
          return { ok: false, error: `Exceeds max nesting depth (${MAX_NESTING_DEPTH}).` };
        }
      }

      const parentChanged = (dragged.parentId || null) !== newParentId;
      const updatedDragged: BuilderNode = parentChanged
        ? {
            ...dragged,
            parentId: newParentId,
            x: newParentId ? 20 : 120,
            y: newParentId ? 20 : 120,
          }
        : dragged;

      // Sort destination non-background siblings frontmost-first (descending zIndex) matching Layers tree UI
      const destSiblings = doc.nodes
        .filter(
          (n) =>
            n.id !== dragged.id &&
            n.type !== "background" &&
            (n.parentId || null) === newParentId
        )
        .sort((a, b) => b.zIndex - a.zIndex);

      if (position === "inside") {
        destSiblings.unshift(updatedDragged);
      } else {
        const targetIdx = destSiblings.findIndex((n) => n.id === target.id);
        if (targetIdx === -1) {
          destSiblings.unshift(updatedDragged);
        } else {
          const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
          destSiblings.splice(insertIdx, 0, updatedDragged);
        }
      }

      const zMap = new Map<string, number>();
      const total = destSiblings.length;
      destSiblings.forEach((n, idx) => zMap.set(n.id, total - idx));

      const nextNodes = doc.nodes.map((n) => {
        if (n.type === "background") return { ...n, zIndex: 0 };
        if (n.id === dragged.id) {
          return { ...updatedDragged, zIndex: zMap.get(n.id) ?? n.zIndex };
        }
        return zMap.has(n.id) ? { ...n, zIndex: zMap.get(n.id)! } : n;
      });

      setDoc((prev) => ({
        ...prev,
        nodes: nextNodes,
        metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
      }));
      commitSnapshot(doc.canvas, nextNodes, selectedId);
      return { ok: true };
    },
    [commitSnapshot, doc.canvas, doc.nodes, selectedId]
  );

  const handleAddIndependentElement = useCallback(
    (type: BuilderComponentType) => {
      const createdId = insertComponent(type, null);
      if (!createdId) return;
      setIsAddElementsModalOpen(false);
      setSecondaryDockState((prev) => ({
        ...prev,
        isPanelOpen: true,
        activeSection: "properties",
      }));
    },
    [insertComponent]
  );

  const handleReparentNode = useCallback(
    (nodeId: string, newParentId: string | null): { ok: boolean; error?: string } => {
      const node = doc.nodes.find((n) => n.id === nodeId);
      if (!node || node.type === "background") {
        return { ok: false, error: "This item cannot be reparented." };
      }
      if (newParentId) {
        const targetParent = doc.nodes.find((n) => n.id === newParentId);
        if (!targetParent || !isContainerType(targetParent.type)) {
          return { ok: false, error: "Destination cannot contain child elements." };
        }
        if (wouldCreateCycle(nodeId, newParentId, doc.nodes)) {
          return { ok: false, error: "Invalid circular drop: parent cannot move into descendant." };
        }
        if (getNestingDepth(newParentId, doc.nodes) + 1 > MAX_NESTING_DEPTH) {
          return { ok: false, error: `Exceeds max nesting depth (${MAX_NESTING_DEPTH}).` };
        }
      }
      const nextSibs = doc.nodes.filter((n) => (n.parentId || null) === newParentId).length;
      const nextNodes = doc.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              parentId: newParentId,
              x: newParentId ? 20 : 120,
              y: newParentId ? 20 : 120,
              zIndex: nextSibs + 1,
            }
          : n
      );
      setDoc((prev) => ({ ...prev, nodes: nextNodes }));
      commitSnapshot(doc.canvas, nextNodes, selectedId);
      return { ok: true };
    },
    [commitSnapshot, doc.canvas, doc.nodes, selectedId]
  );

  // Build backend-compatible designConfig payload wrapping V2 Profile Builder Document
  const buildDesignConfigPayload = (currentDoc: ProfileBuilderDocument) => {
    const embeds = currentDoc.nodes
      .filter((n) => n.type === "embed" || n.type === "nested-embed")
      .map((em) => ({
        id: em.id,
        name: em.name,
        isPrimary: em.parentId === null,
        transform: {
          x: em.x,
          y: em.y,
          width: em.width,
          height: em.height,
          rotation: em.rotation || 0,
          zIndex: em.zIndex,
        },
      }));

    return {
      layout: {
        maxWidth: embeds[0]?.transform.width || 720,
        padding: 24,
        gap: 16,
      },
      background: {
        type: currentDoc.canvas.backgroundType,
        color: currentDoc.canvas.backgroundColor,
        imageUrl: currentDoc.canvas.backgroundImage,
      },
      canvas: {
        embeds,
        elements: [],
      },
      profileBuilder: currentDoc,
    };
  };

  // Real Save Draft (local draft + remote /api/profile/me persistence)
  const performSaveDraft = useCallback(
    async (silent = false) => {
      setSaveStatus("saving");
      setErrorBanner(null);

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc));
      } catch {}

      try {
        const res = await apiFetch("/api/profile/me", {
          method: "PATCH",
          body: JSON.stringify({ designConfig: buildDesignConfigPayload(doc) }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Save failed (${res.status})`);
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(timeStr);
        setIsDirty(false);
        isDirtyRef.current = false;
        setSaveStatus("saved");
        if (!silent) showToast("Draft saved");
        setTimeout(() => {
          setSaveStatus((s) => (s === "saved" ? "ready" : s));
        }, 2200);
      } catch (err: unknown) {
        const offline = typeof window !== "undefined" && !navigator.onLine;
        setSaveStatus(offline ? "offline" : "error");
        if (!silent) {
          setErrorBanner(
            offline
              ? "Offline: saved draft locally only."
              : err instanceof Error
                ? err.message
                : "Failed to save draft to server."
          );
        }
      }
    },
    [doc, showToast]
  );

  // Debounced auto-save
  useEffect(() => {
    if (!doc.preferences.autoSaveEnabled || !isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      performSaveDraft(true);
    }, Math.max(1, doc.preferences.autoSaveDelaySec || 2) * 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [doc, isDirty, performSaveDraft]);

  // Real Validated Publish workflow
  const handlePublish = async () => {
    const validation = validateProfileBuilderDocument(doc);
    if (!validation.valid) {
      setSaveStatus("error");
      setErrorBanner(`Publish blocked: ${validation.errors[0]}`);
      return;
    }

    setSaveStatus("publishing");
    setErrorBanner(null);

    try {
      const publishedDoc: ProfileBuilderDocument = {
        ...doc,
        metadata: {
          ...doc.metadata,
          updatedAt: new Date().toISOString(),
          lastPublishedAt: new Date().toISOString(),
        },
      };
      const res = await apiFetch("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({ designConfig: buildDesignConfigPayload(publishedDoc) }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Server rejected publish (${res.status}).`);
      }

      setDoc(publishedDoc);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(publishedDoc));
      } catch {}
      setIsDirty(false);
      isDirtyRef.current = false;
      setSaveStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      await refreshUser?.();
      showToast("Published live to your public Pixel.gg profile!");
    } catch (err: unknown) {
      setSaveStatus("error");
      setErrorBanner(
        err instanceof Error ? err.message : "Publish failed. Your local changes are preserved."
      );
    }
  };

  const handleExport = async (kind: "png" | "design-json" | "template-json") => {
    const validation = validateProfileBuilderDocument(doc);
    if (!validation.valid) {
      setErrorBanner(`Export blocked: ${validation.errors[0]}`);
      return;
    }
    try {
      if (kind === "png") {
        await exportProfileBuilderPng(doc, 1);
        showToast("Exported profile image (PNG)");
      } else if (kind === "design-json") {
        exportProfileBuilderJson(doc, "design");
        showToast("Exported profile design (JSON)");
      } else {
        exportProfileBuilderJson(doc, "template");
        showToast("Exported reusable profile template");
      }
    } catch {
      setErrorBanner("Export failed. Cross-origin assets may block raster PNG export.");
    }
  };

  const selectedNode = doc.nodes.find((n) => n.id === selectedId) || null;
  const activeEmbedNode =
    (selectedNode?.type === "embed" ? selectedNode : doc.nodes.find((n) => n.type === "embed")) ||
    null;

  // Protected StudioFloatingDock callback bridge
  const handleDockToggleTool = useCallback((tool: string) => {
    setDockActiveTool((prev) => (prev === tool ? null : tool));
  }, []);

  const handleDockCloseTool = useCallback(() => {
    setDockActiveTool(null);
  }, []);

  const renderDockToolPanel = useCallback(
    (activeTool: string | null) => (
      <DockBridgePanel
        activeTool={activeTool}
        canvas={doc.canvas}
        nodes={doc.nodes}
        dockAddedIds={dockAddedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAddComponentFromDock={(type, extra) => {
          const newId = insertComponent(type, undefined, undefined, undefined, extra);
          if (newId) setDockAddedIds((prev) => [...prev, newId]);
        }}
        onApplyPresetTemplate={() => {
          const resetDoc = createDefaultReferenceDocument({
            displayName: liveData.displayName,
            username: liveData.username,
            bio: liveData.bio,
            avatarUrl: liveData.avatarUrl,
            bannerUrl: liveData.bannerUrl,
          });
          setDoc(resetDoc);
          setDockAddedIds([]);
          setSelectedId("embed-profile-root");
          commitSnapshot(resetDoc.canvas, resetDoc.nodes, "embed-profile-root");
        }}
        onUpdateCanvas={handleUpdateCanvas}
        onUpdateNode={(id, updates) => handleUpdateNode(id, updates)}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onReorderNode={(id, dir) => handleReorderNode(id, dir)}
        onDeleteNode={handleDeleteNode}
      />
    ),
    [
      commitSnapshot,
      doc.canvas,
      doc.nodes,
      dockAddedIds,
      handleDeleteNode,
      handleReorderNode,
      handleToggleLock,
      handleToggleVisibility,
      handleUpdateCanvas,
      handleUpdateNode,
      insertComponent,
      liveData,
      selectedId,
    ]
  );

  return (
    <div
      className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#050507] text-[#ededed] font-mono"
      data-testid="profile-builder-studio"
    >
      {/* Top Toolbar */}
      <TopToolbar
        title={doc.title}
        onUpdateTitle={(title) => setDoc((p) => ({ ...p, title }))}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        errorMessage={errorBanner}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExport={handleExport}
        onSaveDraft={() => performSaveDraft(false)}
        onPublish={handlePublish}
        canvas={doc.canvas}
        selectedNode={selectedNode}
        activeEmbedNode={activeEmbedNode}
        onSelectCanvas={() => setSelectedId(null)}
        onAlignNode={handleAlignNode}
        onReorderNode={handleReorderNode}
        onToggleLockNode={handleToggleLock}
        onDuplicateNode={handleDuplicateNode}
        onDeleteNode={handleDeleteNode}
      />

      {/* Actionable Validation / Save Error Banner */}
      {errorBanner && (
        <div
          className="px-4 py-2 bg-red-950/70 border-b border-red-800/70 text-red-200 text-[11px] flex items-center justify-between gap-2 shrink-0"
          data-testid="builder-error-banner"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <span>{errorBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-300 hover:text-white cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main 3-Column Studio Body */}
      <div ref={studioBodyRef} className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Main Dock State 3: Full Elements Panel (Mutually exclusive with Main Component Dock) */}
        <AnimatePresence mode="wait" initial={false}>
          {dockNavState === "elements-panel" && (
            <AddElementPanel
              key="builder-elements-panel"
              onAddComponent={(type) => insertComponent(type)}
              onClose={() => setDockNavState("expanded-dock")}
            />
          )}
        </AnimatePresence>

        {/* Center: Main Canvas Workspace */}
        <div className="flex-1 relative flex flex-col min-w-0 h-full overflow-hidden">
          <ProfileCanvasWorkspace
            document={doc}
            deviceMode={deviceMode}
            selectedId={selectedId}
            liveData={liveData}
            zoom={zoom}
            onZoomChange={setZoom}
            onSelect={setSelectedId}
            onUpdateNode={handleUpdateNode}
            onCommitHistory={handleCommitHistory}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onInsertChild={(parentId, type) => insertComponent(type, parentId)}
            onDropComponent={(type, targetParentId, x, y) =>
              insertComponent(type, targetParentId, x, y)
            }
            onQuickAddGalleryImage={(galleryId) => {
              setMediaModalState({
                open: true,
                title: "Add Image to Gallery",
                initialUrl: "",
                onApply: (url) =>
                  insertComponent("image", galleryId, undefined, undefined, {
                    config: { src: url, fit: "cover" },
                  }),
              });
            }}
          />
        </div>

        {/* Secondary Dock & Unified Editor Panel (Properties, Layers, Add Elements) */}
        <SecondaryDockPanelSystem
          hostRef={studioBodyRef}
          canvas={doc.canvas}
          nodes={doc.nodes}
          selectedNode={selectedNode}
          selectedId={selectedId}
          deviceMode={deviceMode}
          onSelect={setSelectedId}
          onUpdateCanvas={handleUpdateCanvas}
          onUpdateNode={handleUpdateNode}
          onOpenMediaPicker={(cb, title, init) =>
            setMediaModalState({
              open: true,
              title,
              initialUrl: init || "",
              onApply: cb,
            })
          }
          onAddGalleryImage={(galleryId, url) =>
            insertComponent("image", galleryId, undefined, undefined, {
              config: { src: url || "", fit: "cover" },
            })
          }
          onRenameNode={(id, name) => handleUpdateNode(id, { name })}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onReorderNode={(id, dir) => handleReorderNode(id, dir)}
          onReparentNode={handleReparentNode}
          onMoveLayerRelative={handleMoveLayerRelative}
          onInvalidDrop={(reason) => {
            setErrorBanner(reason);
            setTimeout(() => setErrorBanner(null), 3500);
          }}
          onAddIndependentElement={handleAddIndependentElement}
          dockState={secondaryDockState}
          onDockStateChange={setSecondaryDockState}
          onOpenAddElementsModal={() => setIsAddElementsModalOpen(true)}
        />

        {/* Central Component-Selection Window for Independent Top-Level Canvas Elements */}
        <AddElementsModal
          isOpen={isAddElementsModalOpen}
          onClose={() => setIsAddElementsModalOpen(false)}
          onAddIndependentElement={handleAddIndependentElement}
        />
      </div>

      {/* Settings & Media Upload Modals */}
      <BuilderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={doc.preferences}
        canvas={doc.canvas}
        onUpdatePreferences={handleUpdatePreferences}
        onUpdateCanvas={handleUpdateCanvas}
      />

      {mediaModalState && (
        <MediaUploadModal
          isOpen={mediaModalState.open}
          onClose={() => setMediaModalState(null)}
          title={mediaModalState.title}
          initialUrl={mediaModalState.initialUrl}
          onSelectMedia={mediaModalState.onApply}
        />
      )}

      {/* Non-intrusive Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-12 right-6 z-50 px-3.5 py-2 rounded-xl bg-[#111116] border border-[#2d2d37] text-white text-[11px] shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3-State Component Dock (State 1: Normal | State 2: Expanded Dock; hidden in State 3) */}
      <AnimatePresence mode="wait" initial={false}>
        {dockNavState !== "elements-panel" &&
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                {
                  componentDockMode: true,
                  dockViewState: dockNavState,
                  onDockViewStateChange: setDockNavState,
                  onAddComponent: (type: BuilderComponentType) => insertComponent(type),
                  selectedComponentType: selectedNode?.type ?? null,
                  savedRatio: preservedDockRatio,
                  onRatioChange: setPreservedDockRatio,
                  activeTool: dockActiveTool,
                  onToggleTool: handleDockToggleTool,
                  onCloseToolPanel: handleDockCloseTool,
                  renderToolPanel: renderDockToolPanel,
                }
              );
            }
            return child;
          })}
      </AnimatePresence>
    </div>
  );
};
