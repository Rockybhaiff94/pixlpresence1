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
  MAX_HEART_COMPONENTS,
  MAX_NESTING_DEPTH,
  cloneNodeTree,
  countHeartNodes,
  createDefaultReferenceDocument,
  createNodeFromRegistry,
  deleteNodeSubtree,
  ensureFreeTierClaimProfileNode,
  getNestingDepth,
  hydrateDocumentIdentity,
  isContainerType,
  validateProfileBuilderDocument,
  wouldCreateCycle,
} from "./componentRegistry";
import { exportProfileBuilderJson, exportProfileBuilderPng } from "./profileBuilderExport";
import { TopToolbar } from "./TopToolbar";
import { AddElementPanel } from "./AddElementPanel";
import { ProfileCanvasWorkspace } from "./ProfileCanvasWorkspace";
import {
  BuilderSettingsModal,
  MediaUploadModal,
  ProfileHistorySnapshotDetail,
  ProfilePreviewModal,
  ResetConfirmModal,
} from "./BuilderModals";
import { DockBridgePanel } from "./DockBridgePanel";
import { ProfileLiveActivityData } from "./ProfileBuilderRenderer";
import {
  clampNodeToParent,
  constrainDescendantsToParent,
} from "./boundaryConstraints";
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
  const { user, profile, status: authStatus, refreshUser } = useAuth();

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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isPublishedState, setIsPublishedState] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [previewModalState, setPreviewModalState] = useState<{
    open: boolean;
    mode: "draft" | "history";
    snapshotDoc?: ProfileBuilderDocument;
    historyMeta?: { id: string; createdAt: string; profileVersion: number } | null;
    historyDetail?: ProfileHistorySnapshotDetail | null;
  }>({ open: false, mode: "draft" });

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
    targetSlot?: string;
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
  const hasHydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const knownProfileVersionRef = useRef<number | undefined>(undefined);
  const isPublishedRef = useRef(false);

  const identitySeed = useMemo(
    () => ({
      displayName: profile?.displayName || user?.globalName || user?.username || null,
      username: user?.username || null,
      bio: profile?.bio || null,
      avatarUrl: profile?.avatarUrl || user?.avatar || null,
      bannerUrl: profile?.bannerUrl || user?.banner || null,
    }),
    [profile, user]
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Hydrate saved draft or published profile designConfig + authenticated identity post-mount
  useEffect(() => {
    if (authStatus === "INITIALIZING") return;
    if (isDirtyRef.current && hasHydratedRef.current) return;

    const raf = window.requestAnimationFrame(() => {
      try {
        const storageKey = user?.id ? `${DRAFT_STORAGE_KEY}_${user.id}` : DRAFT_STORAGE_KEY;
        const localRaw =
          localStorage.getItem(storageKey) ||
          (!user?.id ? localStorage.getItem(DRAFT_STORAGE_KEY) : null);
        const localParsed = localRaw ? (JSON.parse(localRaw) as ProfileBuilderDocument) : null;
        const validLocal =
          localParsed && localParsed.version === "2.0" && Array.isArray(localParsed.nodes) && localParsed.canvas
            ? localParsed
            : null;

        let remoteDoc: ProfileBuilderDocument | null = null;
        let remotePublished = false;
        if (profile?.designConfig) {
          const rawCfg =
            typeof profile.designConfig === "string"
              ? JSON.parse(profile.designConfig)
              : profile.designConfig;
          remotePublished = rawCfg?.isPublished !== false && Boolean(rawCfg?.profileBuilder);
          const candidate = rawCfg?.draftProfileBuilder || rawCfg?.profileBuilder;
          if (candidate?.version === "2.0" && Array.isArray(candidate.nodes) && candidate.canvas) {
            remoteDoc = candidate as ProfileBuilderDocument;
          }
        }

        const profileVersion = (profile as { profileVersion?: unknown } | null)?.profileVersion;
        if (typeof profileVersion === "number") {
          knownProfileVersionRef.current = profileVersion;
        }
        if (remotePublished || remoteDoc?.metadata?.lastPublishedAt) {
          isPublishedRef.current = true;
          setIsPublishedState(true);
        }

        // Choose whichever document is newer between local draft and remote profile
        let chosen: ProfileBuilderDocument | null = null;
        if (validLocal && remoteDoc) {
          const localTime = Date.parse(validLocal.metadata?.updatedAt || "") || 0;
          const remoteTime = Date.parse(remoteDoc.metadata?.updatedAt || "") || 0;
          chosen = remoteTime >= localTime ? remoteDoc : validLocal;
          if (remoteDoc.metadata?.lastPublishedAt && !chosen.metadata?.lastPublishedAt) {
            chosen = {
              ...chosen,
              metadata: { ...chosen.metadata, lastPublishedAt: remoteDoc.metadata.lastPublishedAt },
            };
          }
        } else {
          chosen = remoteDoc || validLocal;
        }

        const isUserPremium = Boolean(
          user?.premiumStatus || (user?.nitroStatus ?? 0) > 0 || user?.role === "ADMIN"
        );
        const base = createDefaultReferenceDocument(identitySeed);
        const normalizedBase: ProfileBuilderDocument = chosen
          ? hydrateDocumentIdentity(
            {
              ...base,
              ...chosen,
              canvas: { ...base.canvas, ...(chosen.canvas || {}) },
              preferences: { ...base.preferences, ...(chosen.preferences || {}) },
              metadata: { ...base.metadata, ...(chosen.metadata || {}) },
            },
            identitySeed
          )
          : base;
        const normalized = ensureFreeTierClaimProfileNode(normalizedBase, isUserPremium);

        hasHydratedRef.current = true;
        setHasHydrated(true);
        setDoc(normalized);
        setHistory([
          {
            canvas: JSON.parse(JSON.stringify(normalized.canvas)),
            nodes: JSON.parse(JSON.stringify(normalized.nodes)),
            selectedId: "embed-profile-root",
          },
        ]);
        setHistoryIdx(0);
      } catch {
        // Ignore corrupted draft and keep safe starter document
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [authStatus, identitySeed, profile, user?.id]);

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
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [user?.username]);

  const liveData: ProfileLiveActivityData = useMemo(
    () => ({
      discordId: user?.discordId || null,
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
        const hasBgUpdate =
          updates.backgroundType !== undefined ||
          updates.backgroundColor !== undefined ||
          updates.backgroundGradientTo !== undefined ||
          updates.backgroundGradientAngle !== undefined ||
          updates.backgroundImage !== undefined ||
          updates.backgroundVideo !== undefined ||
          updates.backgroundPosition !== undefined ||
          updates.backgroundSize !== undefined ||
          updates.backgroundOpacity !== undefined ||
          updates.backgroundBlur !== undefined ||
          updates.overlayOpacity !== undefined;

        const nextNodes = hasBgUpdate
          ? prev.nodes.map((n) => {
            if (n.type !== "background") return n;
            return {
              ...n,
              config: {
                ...n.config,
                ...(updates.backgroundType !== undefined ? { bgType: updates.backgroundType } : {}),
                ...(updates.backgroundColor !== undefined ? { bgColor: updates.backgroundColor } : {}),
                ...(updates.backgroundGradientTo !== undefined ? { bgGradientTo: updates.backgroundGradientTo } : {}),
                ...(updates.backgroundGradientAngle !== undefined ? { bgGradientAngle: updates.backgroundGradientAngle } : {}),
                ...(updates.backgroundImage !== undefined ? { bgImageUrl: updates.backgroundImage } : {}),
                ...(updates.backgroundVideo !== undefined ? { bgVideoUrl: updates.backgroundVideo } : {}),
                ...(updates.backgroundPosition !== undefined ? { bgPosition: updates.backgroundPosition } : {}),
                ...(updates.backgroundSize !== undefined ? { bgSize: updates.backgroundSize } : {}),
                ...(updates.overlayOpacity !== undefined ? { bgOverlayOpacity: updates.overlayOpacity } : {}),
              },
              style: {
                ...n.style,
                ...(updates.backgroundOpacity !== undefined ? { opacity: updates.backgroundOpacity } : {}),
                ...(updates.backgroundBlur !== undefined ? { blur: updates.backgroundBlur } : {}),
              },
            };
          })
          : prev.nodes;

        commitSnapshot(nextCanvas, nextNodes, selectedId);
        return {
          ...prev,
          canvas: nextCanvas,
          nodes: nextNodes,
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
        const target = prev.nodes.find((n) => n.id === id);
        if (!target) return prev;

        let merged: BuilderNode = { ...target, ...updates };
        if (merged.parentId) {
          const parent = prev.nodes.find((n) => n.id === merged.parentId);
          if (parent) {
            const clamped = clampNodeToParent(merged, parent);
            merged = { ...merged, ...clamped };
          }
        }

        let nextNodes = prev.nodes.map((n) => (n.id === id ? merged : n));
        if (
          isContainerType(merged.type) &&
          (updates.width !== undefined || updates.height !== undefined)
        ) {
          nextNodes = constrainDescendantsToParent(id, nextNodes);
        }

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

  const handleReplaceNodes = useCallback(
    (nextNodes: BuilderNode[], options?: { skipHistory?: boolean }) => {
      setDoc((prev) => {
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
      if (type === "heart-like" && countHeartNodes(doc.nodes) >= MAX_HEART_COMPONENTS) {
        const msg = "You can add a maximum of 5 Heart components to your profile.";
        setErrorBanner(msg);
        showToast(msg);
        setTimeout(() => setErrorBanner(null), 4000);
        return null;
      }

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
      if (countHeartNodes(nextNodes) > MAX_HEART_COMPONENTS) {
        const msg = "You can add a maximum of 5 Heart components to your profile.";
        setErrorBanner(msg);
        showToast(msg);
        setTimeout(() => setErrorBanner(null), 4000);
        return;
      }
      setDoc((prev) => ({ ...prev, nodes: nextNodes }));
      setSelectedId(clonedRootId);
      commitSnapshot(doc.canvas, nextNodes, clonedRootId);
    },
    [commitSnapshot, doc.canvas, doc.nodes, showToast]
  );

  const isPremium = Boolean(
    user?.premiumStatus || (user?.nitroStatus ?? 0) > 0 || user?.role === "ADMIN"
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
      if (
        !isPremium &&
        doc.nodes.some((n) => n.type === "claim-profile") &&
        !nextNodes.some((n) => n.type === "claim-profile")
      ) {
        const msg =
          "Removing the Claim Your Profile button requires Premium. Upgrade to Premium to remove promotional branding.";
        setErrorBanner(msg);
        showToast(msg);
        setTimeout(() => setErrorBanner(null), 4500);
        return;
      }
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
    [commitSnapshot, doc.canvas, doc.nodes, isPremium, selectedId, showToast]
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
      if (!isPremium && target.type === "claim-profile" && target.visible) {
        const msg = "Hiding the Claim Your Profile button requires Premium.";
        setErrorBanner(msg);
        showToast(msg);
        setTimeout(() => setErrorBanner(null), 4500);
        return;
      }
      handleUpdateNode(id, { visible: !target.visible });
    },
    [doc.nodes, handleUpdateNode, isPremium, showToast]
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
  const buildDesignConfigPayload = (currentDoc: ProfileBuilderDocument, isPublished: boolean) => {
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
      isPublished,
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
      draftProfileBuilder: currentDoc,
      ...(isPublished ? { profileBuilder: currentDoc } : {}),
    };
  };

  // Extract authoritative Profile fields from Builder document so Profile table & public renderer stay in sync
  const extractProfileFieldsFromDoc = (currentDoc: ProfileBuilderDocument) => {
    const nameNode = currentDoc.nodes.find((n) => n.type === "name-text");
    const bioNode = currentDoc.nodes.find((n) => n.type === "description");
    const avatarNode = currentDoc.nodes.find((n) => n.type === "profile-image");
    const bannerNode = currentDoc.nodes.find((n) => n.type === "banner-image");

    const fields: Record<string, string> = {};
    if (nameNode?.config?.text !== undefined) fields.displayName = String(nameNode.config.text).slice(0, 64);
    if (bioNode?.config?.text !== undefined) fields.bio = String(bioNode.config.text).slice(0, 500);
    if (avatarNode?.config?.src !== undefined) fields.avatarUrl = String(avatarNode.config.src);
    if (bannerNode?.config?.src !== undefined) fields.bannerUrl = String(bannerNode.config.src);
    return fields;
  };

  // Real Save Draft & Auto-Publish-When-Published (local draft + remote /api/profile/me persistence)
  const performSaveDraft = useCallback(
    async (silent = false) => {
      const seq = ++saveSeqRef.current;
      setSaveStatus("saving");
      setErrorBanner(null);

      try {
        const storageKey = user?.id ? `${DRAFT_STORAGE_KEY}_${user.id}` : DRAFT_STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(doc));
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc));
      } catch { }

      try {
        const currentlyPublished = Boolean(isPublishedRef.current || doc.metadata?.lastPublishedAt);
        const profileFields = extractProfileFieldsFromDoc(doc);
        const clientRequestId =
          !silent && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : undefined;
        const res = await apiFetch("/api/profile/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...profileFields,
            saveMode: silent ? "autosave" : "manual_save_draft",
            ...(clientRequestId ? { clientRequestId } : {}),
            designConfig: buildDesignConfigPayload(doc, currentlyPublished),
            ...(knownProfileVersionRef.current !== undefined
              ? { expectedVersion: knownProfileVersionRef.current }
              : {}),
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409 && typeof payload?.currentVersion === "number") {
            knownProfileVersionRef.current = payload.currentVersion;
          }
          throw new Error(payload?.error || `Save failed (${res.status})`);
        }

        if (typeof payload?.profileVersion === "number") {
          knownProfileVersionRef.current = payload.profileVersion;
        }

        // Do not overwrite newer unsaved edits if user kept typing while request was in flight
        if (seq !== saveSeqRef.current) {
          return;
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(timeStr);
        setIsDirty(false);
        isDirtyRef.current = false;
        setSaveStatus("saved");
        if (!silent) {
          showToast(currentlyPublished ? "Saved & updated live public profile" : "Draft saved");
        }
        setTimeout(() => {
          setSaveStatus((s) => (s === "saved" ? "ready" : s));
        }, 2200);
      } catch (err: unknown) {
        if (seq !== saveSeqRef.current) return;
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
    [doc, showToast, user?.id]
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

    const seq = ++saveSeqRef.current;
    setSaveStatus("publishing");
    setErrorBanner(null);

    try {
      const nowIso = new Date().toISOString();
      const publishedDoc: ProfileBuilderDocument = {
        ...doc,
        metadata: {
          ...doc.metadata,
          updatedAt: nowIso,
          lastPublishedAt: nowIso,
        },
      };
      const profileFields = extractProfileFieldsFromDoc(publishedDoc);
      const res = await apiFetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileFields,
          saveMode: "publish",
          designConfig: buildDesignConfigPayload(publishedDoc, true),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Server rejected publish (${res.status}).`);
      }

      if (typeof payload?.profileVersion === "number") {
        knownProfileVersionRef.current = payload.profileVersion;
      }

      isPublishedRef.current = true;
      setIsPublishedState(true);
      setDoc(publishedDoc);
      try {
        const storageKey = user?.id ? `${DRAFT_STORAGE_KEY}_${user.id}` : DRAFT_STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(publishedDoc));
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(publishedDoc));
      } catch { }

      if (seq === saveSeqRef.current) {
        setIsDirty(false);
        isDirtyRef.current = false;
        setSaveStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
      await refreshUser?.();
      showToast("Published live to your public Pixel.gg profile!");
    } catch (err: unknown) {
      setSaveStatus("error");
      setErrorBanner(
        err instanceof Error ? err.message : "Publish failed. Your local changes are preserved."
      );
    }
  };

  const extractDocFromHistorySnapshot = useCallback(
    (snap: ProfileHistorySnapshotDetail): ProfileBuilderDocument => {
      const snapCfg = (snap.data?.designConfig || {}) as Record<string, unknown>;
      const rawCandidate =
        (snapCfg.draftProfileBuilder as ProfileBuilderDocument | undefined) ||
        (snapCfg.profileBuilder as ProfileBuilderDocument | undefined);
      const snapSeed = {
        displayName: snap.data?.displayName || identitySeed.displayName,
        username: identitySeed.username,
        bio: snap.data?.bio || identitySeed.bio,
        avatarUrl: snap.data?.avatarUrl || identitySeed.avatarUrl,
        bannerUrl: snap.data?.bannerUrl || identitySeed.bannerUrl,
      };
      const base = createDefaultReferenceDocument(snapSeed);
      if (rawCandidate && rawCandidate.version === "2.0" && Array.isArray(rawCandidate.nodes)) {
        return hydrateDocumentIdentity(
          {
            ...base,
            ...rawCandidate,
            canvas: { ...base.canvas, ...(rawCandidate.canvas || {}) },
            preferences: { ...base.preferences, ...(rawCandidate.preferences || {}) },
            metadata: { ...base.metadata, ...(rawCandidate.metadata || {}) },
          },
          snapSeed
        );
      }
      return base;
    },
    [identitySeed]
  );

  // Redirect directly to the live public profile page (or owner preview query when not yet published)
  const handleViewPublicProfile = () => {
    if (!user?.username) {
      setErrorBanner("Sign in to view your Pixel.gg public page.");
      return;
    }
    const published = Boolean(isPublishedRef.current || doc.metadata?.lastPublishedAt);
    const targetUrl = `/${encodeURIComponent(user.username)}${published ? "" : "?preview=1"}`;
    window.location.assign(targetUrl);
  };

  const handleConfirmResetToDefault = () => {
    const resetDoc = createDefaultReferenceDocument({
      displayName: user?.globalName || user?.username || identitySeed.displayName,
      username: user?.username || identitySeed.username,
      bio: null,
      avatarUrl: user?.avatar || identitySeed.avatarUrl,
      bannerUrl: user?.banner || identitySeed.bannerUrl,
    });
    // Preserve lastPublishedAt marker if the profile was previously published
    if (doc.metadata?.lastPublishedAt) {
      resetDoc.metadata.lastPublishedAt = doc.metadata.lastPublishedAt;
    }
    setDoc(resetDoc);
    setDockAddedIds([]);
    setSelectedId("embed-profile-root");
    commitSnapshot(resetDoc.canvas, resetDoc.nodes, "embed-profile-root");
    setIsResetModalOpen(false);
    showToast("Reset design to default. Click Save Draft when ready to save.");
  };

  const handlePreviewHistorySnapshot = (snap: ProfileHistorySnapshotDetail) => {
    const snapshotDoc = extractDocFromHistorySnapshot(snap);
    setPreviewModalState({
      open: true,
      mode: "history",
      snapshotDoc,
      historyMeta: {
        id: snap.id,
        createdAt: snap.createdAt,
        profileVersion: snap.profileVersion,
      },
      historyDetail: snap,
    });
  };

  const handleRestoreHistorySnapshot = (snap: ProfileHistorySnapshotDetail) => {
    const restoredDoc = extractDocFromHistorySnapshot(snap);
    // Preserve publication timestamp marker so Save Draft keeps live status intact
    if (isPublishedRef.current && doc.metadata?.lastPublishedAt) {
      restoredDoc.metadata = {
        ...restoredDoc.metadata,
        lastPublishedAt: doc.metadata.lastPublishedAt,
      };
    }
    restoredDoc.metadata = {
      ...restoredDoc.metadata,
      updatedAt: new Date().toISOString(),
    };
    setDoc(restoredDoc);
    setSelectedId("embed-profile-root");
    commitSnapshot(restoredDoc.canvas, restoredDoc.nodes, "embed-profile-root");
    setPreviewModalState({ open: false, mode: "draft" });
    showToast(`Restored draft v${snap.profileVersion} into editor. Click Save Draft to persist.`);
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
        onResetToDefault={() => setIsResetModalOpen(true)}
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExport={handleExport}
        onViewPublicProfile={handleViewPublicProfile}
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
            onReplaceNodes={handleReplaceNodes}
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
                targetSlot: "gallery",
                onApply: (url) =>
                  insertComponent("image", galleryId, undefined, undefined, {
                    config: { src: url, fit: "cover" },
                  }),
              });
            }}
            onOpenLivePreview={() => setPreviewModalState({ open: true, mode: "draft" })}
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
          isFounder={user?.id === "cmw4fbemh0000a1sa2h3h5zzk"}
          onSelect={setSelectedId}
          onUpdateCanvas={handleUpdateCanvas}
          onUpdateNode={handleUpdateNode}
          onOpenMediaPicker={(cb, title, init, targetSlot) =>
            setMediaModalState({
              open: true,
              title,
              initialUrl: init || "",
              targetSlot,
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

      {/* Settings, Reset, Live Preview & Media Upload Modals */}
      <BuilderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={doc.preferences}
        canvas={doc.canvas}
        onUpdatePreferences={handleUpdatePreferences}
        onUpdateCanvas={handleUpdateCanvas}
        onPreviewHistorySnapshot={handlePreviewHistorySnapshot}
        onRestoreHistorySnapshot={handleRestoreHistorySnapshot}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmResetToDefault}
      />

      <ProfilePreviewModal
        isOpen={previewModalState.open}
        onClose={() => setPreviewModalState((p) => ({ ...p, open: false }))}
        document={
          previewModalState.mode === "history" && previewModalState.snapshotDoc
            ? previewModalState.snapshotDoc
            : doc
        }
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        liveData={liveData}
        mode={previewModalState.mode}
        historyMeta={previewModalState.historyMeta}
        onRestoreHistory={
          previewModalState.historyDetail
            ? () => handleRestoreHistorySnapshot(previewModalState.historyDetail!)
            : undefined
        }
        publicUrl={
          user?.username
            ? `/${encodeURIComponent(user.username)}${isPublishedState || doc.metadata?.lastPublishedAt ? "" : "?preview=1"
            }`
            : null
        }
        isPublished={Boolean(isPublishedState || doc.metadata?.lastPublishedAt)}
      />

      {authStatus === "INITIALIZING" && !hasHydrated && (
        <div
          className="fixed inset-0 z-40 bg-[#050507]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-xs text-neutral-300"
          data-testid="studio-auth-loading"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span>Loading your Pixel.gg Studio profile...</span>
        </div>
      )}

      {mediaModalState && (
        <MediaUploadModal
          isOpen={mediaModalState.open}
          onClose={() => setMediaModalState(null)}
          title={mediaModalState.title}
          initialUrl={mediaModalState.initialUrl}
          targetSlot={mediaModalState.targetSlot}
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
