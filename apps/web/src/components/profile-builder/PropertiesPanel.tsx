"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Unlock,
  UploadCloud,
} from "lucide-react";
import { uploadMediaAsset, validateUploadFile } from "@/lib/uploadAsset";
import { AVAILABLE_FONTS } from "@/components/editor/editorPresets";
import { PLATFORMS } from "@/components/links/PlatformIcons";
import {
  BuilderAnchorConfig,
  BuilderCanvasSettings,
  BuilderChildScaleMode,
  BuilderComponentConfig,
  BuilderComponentType,
  BuilderDeviceMode,
  BuilderLayoutMode,
  BuilderNode,
  BuilderStyle,
  ProfileBadgeItem,
} from "./profileBuilderTypes";
import {
  PROFILE_BUILDER_REGISTRY,
  createBuilderId,
  isContainerType,
  isValidUrlOrEmpty,
} from "./componentRegistry";
import {
  RPC_CHILD_COMPONENT_TYPES,
  RpcVisualTemplate,
  isNodeRestrictedRpcForFree,
  isRpcChildType,
} from "./rpcTemplates";

interface PropertiesPanelProps {
  canvas: BuilderCanvasSettings;
  nodes?: BuilderNode[];
  selectedNode: BuilderNode | null;
  deviceMode: BuilderDeviceMode;
  isFounder?: boolean;
  isPremiumOrAdmin?: boolean;
  isAdmin?: boolean;
  rpcTemplates?: RpcVisualTemplate[];
  onApplyRpcTemplate?: (embedId: string, template: RpcVisualTemplate) => void;
  onSaveRpcTemplate?: (payload: {
    embedId: string;
    name: string;
    category: string;
    description?: string;
    isGlobal?: boolean;
    isPremiumRequired?: boolean;
  }) => Promise<boolean>;
  onDeleteRpcTemplate?: (templateId: string) => Promise<void>;
  onInsertChild?: (
    parentId: string,
    type: BuilderComponentType,
    extra?: Partial<BuilderNode>
  ) => void;
  onRestrictedFeature?: (reason: string) => void;
  onUpdateCanvas: (updates: Partial<BuilderCanvasSettings>) => void;
  onUpdateNode: (
    id: string,
    updates: Partial<BuilderNode>,
    options?: { skipHistory?: boolean }
  ) => void;
  onOpenMediaPicker: (callback: (url: string) => void, title: string, initialUrl?: string, targetSlot?: string) => void;
  onAddGalleryImage?: (galleryId: string, url?: string) => void;
}

const SectionGroup: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#191921] pb-3 mb-3">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between text-[11px] font-bold text-neutral-200 hover:text-white py-1 cursor-pointer"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="mt-2 space-y-2.5">{children}</div>}
    </div>
  );
};

function safeNum(val: string, fallback: number, min = 0, max = 9999): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  canvas,
  nodes = [],
  selectedNode,
  isFounder = false,
  isPremiumOrAdmin = false,
  isAdmin = false,
  rpcTemplates = [],
  onApplyRpcTemplate,
  onSaveRpcTemplate,
  onDeleteRpcTemplate,
  onInsertChild,
  onRestrictedFeature,
  onUpdateCanvas,
  onUpdateNode,
  onOpenMediaPicker,
  onAddGalleryImage,
}) => {
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStage, setVideoStage] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSuccess, setVideoSuccess] = useState<string | null>(null);
  const [videoFileMeta, setVideoFileMeta] = useState<{ name: string; sizeBytes: number } | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const [containerVideoUploading, setContainerVideoUploading] = useState(false);
  const [containerVideoError, setContainerVideoError] = useState<string | null>(null);
  const containerVideoInputRef = useRef<HTMLInputElement>(null);

  const [tplCategoryFilter, setTplCategoryFilter] = useState<string>("all");
  const [newTplName, setNewTplName] = useState("");
  const [newTplCategory, setNewTplCategory] = useState("Gaming");
  const [newTplIsGlobal, setNewTplIsGlobal] = useState(false);
  const [newTplPremiumOnly, setNewTplPremiumOnly] = useState(true);
  const [savingTpl, setSavingTpl] = useState(false);

  // 1. CANVAS LEVEL PROPERTIES
  if (!selectedNode || selectedNode.type === "background") {
    const isBgNode = selectedNode?.type === "background";
    const bgType = isBgNode ? selectedNode.config.bgType || canvas.backgroundType : canvas.backgroundType;
    const bgColor = isBgNode ? selectedNode.config.bgColor || canvas.backgroundColor : canvas.backgroundColor;
    const bgGradientTo = isBgNode
      ? selectedNode.config.bgGradientTo || canvas.backgroundGradientTo
      : canvas.backgroundGradientTo;
    const bgImageUrl = isBgNode
      ? selectedNode.config.bgImageUrl ?? canvas.backgroundImage
      : canvas.backgroundImage;
    const bgVideoUrl = isBgNode
      ? selectedNode.config.bgVideoUrl ?? canvas.backgroundVideo
      : canvas.backgroundVideo;
    const bgOpacity = isBgNode
      ? selectedNode.style.opacity ?? canvas.backgroundOpacity
      : canvas.backgroundOpacity;

    const patchBg = (
      canvasPatch: Partial<BuilderCanvasSettings>,
      nodeCfgPatch?: Partial<BuilderComponentConfig>
    ) => {
      onUpdateCanvas(canvasPatch);
      if (isBgNode && selectedNode && nodeCfgPatch) {
        onUpdateNode(selectedNode.id, {
          config: { ...selectedNode.config, ...nodeCfgPatch },
        });
      }
    };

    return (
      <div
        className="p-3 overflow-y-auto h-full custom-scrollbar font-mono text-[11px] bg-[#09090d]"
        data-testid="properties-canvas-inspector"
      >
        <div className="px-2.5 py-2 mb-3 rounded-lg bg-[#111116] border border-[#23232c] flex items-center justify-between">
          <span className="font-bold text-white">Canvas ({canvas.width} × {canvas.height})</span>
          <span className="text-[9px] text-neutral-500 uppercase">Level A</span>
        </div>

        <SectionGroup title="Dimensions">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Width (px)</label>
              <input
                type="number"
                value={canvas.width}
                onChange={(e) =>
                  onUpdateCanvas({ width: safeNum(e.target.value, canvas.width, 320, 4096) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                data-testid="canvas-width-input"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Height (px)</label>
              <input
                type="number"
                value={canvas.height}
                onChange={(e) =>
                  onUpdateCanvas({ height: safeNum(e.target.value, canvas.height, 320, 4096) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                data-testid="canvas-height-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "1920×1080", w: 1920, h: 1080 },
              { label: "1440×900", w: 1440, h: 900 },
              { label: "1280×720", w: 1280, h: 720 },
              { label: "1080×1920", w: 1080, h: 1920 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onUpdateCanvas({ width: preset.w, height: preset.h })}
                className="px-2 py-1 rounded bg-[#121217] hover:bg-[#1a1a22] border border-[#24242d] text-[10px] text-neutral-300 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </SectionGroup>

        <SectionGroup title="Background">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-1">Type</label>
            <select
              value={bgType}
              onChange={(e) => {
                const nextType = e.target.value as BuilderCanvasSettings["backgroundType"];
                patchBg({ backgroundType: nextType }, { bgType: nextType });
              }}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1.5 text-white outline-none"
              data-testid="canvas-bg-type"
            >
              <option value="image">Image</option>
              <option value="gif">Animated GIF</option>
              <option value="solid">Solid Color</option>
              <option value="gradient">Gradient</option>
              <option value="video">Video (MP4/WebM)</option>
            </select>
          </div>

          {(bgType === "solid" || bgType === "gradient") && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor.startsWith("#") ? bgColor : "#060608"}
                onChange={(e) =>
                  patchBg({ backgroundColor: e.target.value }, { bgColor: e.target.value })
                }
                className="w-8 h-8 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) =>
                  patchBg({ backgroundColor: e.target.value }, { bgColor: e.target.value })
                }
                className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
          )}

          {bgType === "gradient" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgGradientTo.startsWith("#") ? bgGradientTo : "#16161d"}
                  onChange={(e) =>
                    patchBg(
                      { backgroundGradientTo: e.target.value },
                      { bgGradientTo: e.target.value }
                    )
                  }
                  className="w-8 h-8 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={bgGradientTo}
                  onChange={(e) =>
                    patchBg(
                      { backgroundGradientTo: e.target.value },
                      { bgGradientTo: e.target.value }
                    )
                  }
                  className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                />
              </div>
            </div>
          )}

          {(bgType === "image" || bgType === "gif") && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-12 h-9 rounded bg-[#14141a] border border-[#262630] overflow-hidden shrink-0 flex items-center justify-center relative">
                  {bgImageUrl ? (
                    <img
                      src={bgImageUrl}
                      alt={bgType === "gif" ? "Animated GIF BG" : "BG"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={14} className="text-neutral-600" />
                  )}
                  {bgType === "gif" && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-bold text-white">
                      GIF
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenMediaPicker(
                      (url) => patchBg({ backgroundImage: url }, { bgImageUrl: url }),
                      bgType === "gif"
                        ? "Upload Animated GIF Background (Max 10 MB)"
                        : "Replace Canvas Background Image",
                      bgImageUrl,
                      bgType === "gif" ? "background_gif" : "canvas_background"
                    )
                  }
                  className="px-2.5 py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white cursor-pointer"
                  data-testid="canvas-bg-replace"
                >
                  {bgType === "gif" ? (bgImageUrl ? "Replace GIF" : "Upload GIF (10MB)") : "Replace"}
                </button>
                <button
                  type="button"
                  onClick={() => patchBg({ backgroundImage: "" }, { bgImageUrl: "" })}
                  className="p-1.5 rounded bg-[#14141b] hover:bg-red-950/40 border border-[#2a2a34] text-neutral-400 hover:text-red-400 cursor-pointer"
                  title={bgType === "gif" ? "Remove GIF Background" : "Remove Background Image"}
                  data-testid="canvas-bg-remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Scale</label>
                  <select
                    value={canvas.backgroundSize}
                    onChange={(e) => {
                      const nextSize = e.target.value as BuilderCanvasSettings["backgroundSize"];
                      patchBg({ backgroundSize: nextSize }, { bgSize: nextSize });
                    }}
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Original</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Position</label>
                  <select
                    value={canvas.backgroundPosition}
                    onChange={(e) =>
                      patchBg(
                        { backgroundPosition: e.target.value },
                        { bgPosition: e.target.value }
                      )
                    }
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
                  >
                    <option value="center center">Center</option>
                    <option value="top center">Top</option>
                    <option value="bottom center">Bottom</option>
                    <option value="left center">Left</option>
                    <option value="right center">Right</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {bgType === "video" && (
            <div className="space-y-2.5">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/webm,.mp4,.webm"
                className="hidden"
                data-testid="canvas-bg-video-file-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setVideoError(null);
                  setVideoSuccess(null);
                  setVideoFileMeta({ name: file.name, sizeBytes: file.size });

                  const validationErr = validateUploadFile(file, "video", {
                    unlimitedSize: isFounder,
                  });
                  if (validationErr) {
                    setVideoError(validationErr);
                    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
                    return;
                  }

                  setVideoUploading(true);
                  setVideoProgress(15);
                  setVideoStage("Validating video...");
                  try {
                    const uploaded = await uploadMediaAsset({
                      file,
                      targetSlot: "background_video",
                      kind: "video",
                      unlimitedSize: isFounder,
                      onProgress: (pct, stage) => {
                        setVideoProgress(pct);
                        setVideoStage(stage);
                      },
                    });
                    patchBg({ backgroundVideo: uploaded.url }, { bgVideoUrl: uploaded.url });
                    setVideoProgress(100);
                    setVideoSuccess(
                      `Uploaded ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
                    );
                  } catch (err: unknown) {
                    setVideoError(
                      err instanceof Error
                        ? err.message
                        : "Video upload failed. Please try again."
                    );
                  } finally {
                    setVideoUploading(false);
                    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={videoUploading}
                  onClick={() => videoFileInputRef.current?.click()}
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  data-testid="canvas-bg-video-upload-btn"
                >
                  {videoUploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UploadCloud size={12} />
                  )}
                  <span>
                    {videoUploading
                      ? "Uploading..."
                      : bgVideoUrl
                        ? "Replace Video"
                        : isFounder
                          ? "Upload Video (Unlimited)"
                          : "Upload Video (25MB)"}
                  </span>
                </button>
                {bgVideoUrl && (
                  <button
                    type="button"
                    disabled={videoUploading}
                    onClick={() => {
                      patchBg({ backgroundVideo: "" }, { bgVideoUrl: "" });
                      setVideoFileMeta(null);
                      setVideoSuccess(null);
                      setVideoError(null);
                    }}
                    className="p-1.5 rounded bg-[#14141b] hover:bg-red-950/40 border border-[#2a2a34] text-neutral-400 hover:text-red-400 cursor-pointer disabled:opacity-50"
                    title="Remove Video Background"
                    data-testid="canvas-bg-video-remove-btn"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {(videoFileMeta || bgVideoUrl) && (
                <div className="px-2 py-1.5 rounded bg-[#101016] border border-[#22222c] flex items-center gap-2 text-[10px] text-neutral-300">
                  <Film size={12} className="text-neutral-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {videoFileMeta?.name || bgVideoUrl.split("/").pop() || "Background Video"}
                    </div>
                    {videoFileMeta && (
                      <div className="text-[9px] text-neutral-500">
                        {(videoFileMeta.sizeBytes / (1024 * 1024)).toFixed(2)} MB · MP4/WebM (audio preserved)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {videoUploading && (
                <div className="space-y-1" data-testid="canvas-bg-video-progress">
                  <div className="flex justify-between text-[9px] text-neutral-400">
                    <span>{videoStage || "Uploading..."}</span>
                    <span>{videoProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#1e1e26] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-200"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {videoSuccess && (
                <div
                  className="px-2 py-1.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[10px] flex items-center gap-1.5"
                  data-testid="canvas-bg-video-success"
                >
                  <Check size={11} className="shrink-0" />
                  <span className="truncate">{videoSuccess}</span>
                </div>
              )}

              {videoError && (
                <div
                  className="px-2 py-1.5 rounded bg-red-950/50 border border-red-800/60 text-red-200 text-[10px] flex items-start gap-1.5"
                  data-testid="canvas-bg-video-error"
                >
                  <AlertCircle size={11} className="shrink-0 text-red-400 mt-0.5" />
                  <span>{videoError}</span>
                </div>
              )}

              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-1">Video URL</label>
                <input
                  type="text"
                  value={bgVideoUrl}
                  onChange={(e) =>
                    patchBg({ backgroundVideo: e.target.value }, { bgVideoUrl: e.target.value })
                  }
                  placeholder="https://.../bg.mp4"
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                  data-testid="canvas-bg-video-url"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
              <span>OPACITY</span>
              <span>{Math.round(bgOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(bgOpacity * 100)}
              onChange={(e) => {
                const op = Number(e.target.value) / 100;
                onUpdateCanvas({ backgroundOpacity: op });
                if (isBgNode && selectedNode) {
                  onUpdateNode(selectedNode.id, {
                    style: { ...selectedNode.style, opacity: op },
                  });
                }
              }}
              className="w-full accent-white"
              data-testid="canvas-bg-opacity"
            />
          </div>
        </SectionGroup>

        <SectionGroup title="Effects" defaultOpen={false}>
          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
              <span>BLUR</span>
              <span>{canvas.backgroundBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              value={canvas.backgroundBlur}
              onChange={(e) => onUpdateCanvas({ backgroundBlur: Number(e.target.value) })}
              className="w-full accent-white"
            />
          </div>
          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
              <span>DIM OVERLAY</span>
              <span>{Math.round(canvas.overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              value={Math.round(canvas.overlayOpacity * 100)}
              onChange={(e) => onUpdateCanvas({ overlayOpacity: Number(e.target.value) / 100 })}
              className="w-full accent-white"
            />
          </div>
        </SectionGroup>
      </div>
    );
  }

  // HELPER UPDATERS FOR SELECTED NODE
  const patchStyle = (updates: Partial<BuilderNode["style"]>) => {
    onUpdateNode(selectedNode.id, { style: { ...selectedNode.style, ...updates } });
  };
  const patchConfig = (updates: Partial<BuilderNode["config"]>) => {
    onUpdateNode(selectedNode.id, { config: { ...selectedNode.config, ...updates } });
  };
  const patchResponsive = (updates: Partial<BuilderNode["responsive"]>) => {
    onUpdateNode(selectedNode.id, {
      responsive: { ...selectedNode.responsive, ...updates },
    });
  };

  const isContainer = isContainerType(selectedNode.type);
  const isRpcParent =
    selectedNode.type === "custom-rpc" || selectedNode.type === "custom-rpc-embed";
  const isRpcChild = isRpcChildType(selectedNode.type);
  const isFreeRpcChildLocked =
    !isPremiumOrAdmin && (isRpcChild || isNodeRestrictedRpcForFree(selectedNode, nodes, isPremiumOrAdmin));
  const isFreeRpcParentLocked = !isPremiumOrAdmin && isRpcParent;
  const isTextBased =
    selectedNode.type === "name-text" ||
    selectedNode.type === "subtitle" ||
    selectedNode.type === "description";
  const isMediaImage =
    selectedNode.type === "banner-image" ||
    selectedNode.type === "profile-image" ||
    selectedNode.type === "image";

  const transformDimensionLocked = selectedNode.locked || isFreeRpcChildLocked || isFreeRpcParentLocked;
  const transformPositionLocked = selectedNode.locked || isFreeRpcChildLocked;

  return (
    <div
      className="p-3 overflow-y-auto h-full custom-scrollbar font-mono text-[11px] bg-[#09090d]"
      data-testid="properties-node-inspector"
    >
      {/* Selected Object Pill */}
      <div className="px-2.5 py-2 mb-3 rounded-lg bg-[#111116] border border-[#23232c] flex items-center justify-between gap-2">
        <span className="font-bold text-white truncate">{selectedNode.name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 uppercase shrink-0">
          {selectedNode.type}
        </span>
      </div>

      {/* Transform (All Elements) */}
      <SectionGroup title="Transform">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">W (px)</label>
            <input
              type="number"
              disabled={transformDimensionLocked}
              value={Math.round(selectedNode.width)}
              onChange={(e) => {
                const nextW = safeNum(e.target.value, selectedNode.width, 20, 4096);
                if (selectedNode.aspectRatioLocked && selectedNode.width > 0) {
                  const nextH = Math.max(20, Math.round((nextW * selectedNode.height) / selectedNode.width));
                  onUpdateNode(selectedNode.id, { width: nextW, height: nextH });
                } else {
                  onUpdateNode(selectedNode.id, { width: nextW });
                }
              }}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              data-testid="prop-width-input"
            />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">H (px)</label>
            <input
              type="number"
              disabled={transformDimensionLocked}
              value={Math.round(selectedNode.height)}
              onChange={(e) => {
                const nextH = safeNum(e.target.value, selectedNode.height, 8, 4096);
                if (selectedNode.aspectRatioLocked && selectedNode.height > 0) {
                  const nextW = Math.max(20, Math.round((nextH * selectedNode.width) / selectedNode.height));
                  onUpdateNode(selectedNode.id, { width: nextW, height: nextH });
                } else {
                  onUpdateNode(selectedNode.id, { height: nextH });
                }
              }}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              data-testid="prop-height-input"
            />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">X (px)</label>
            <input
              type="number"
              disabled={transformPositionLocked}
              value={Math.round(selectedNode.x)}
              onChange={(e) =>
                onUpdateNode(selectedNode.id, { x: safeNum(e.target.value, selectedNode.x, -2000, 4096) })
              }
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              data-testid="prop-x-input"
            />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Y (px)</label>
            <input
              type="number"
              disabled={transformPositionLocked}
              value={Math.round(selectedNode.y)}
              onChange={(e) =>
                onUpdateNode(selectedNode.id, { y: safeNum(e.target.value, selectedNode.y, -2000, 4096) })
              }
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              data-testid="prop-y-input"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdateNode(selectedNode.id, { aspectRatioLocked: !selectedNode.aspectRatioLocked })
          }
          className={`w-full px-2.5 py-1.5 rounded-lg border text-[10px] flex items-center justify-between cursor-pointer ${
            selectedNode.aspectRatioLocked
              ? "bg-[#191922] border-white/30 text-white"
              : "bg-[#121217] border-[#24242d] text-neutral-400"
          }`}
          data-testid="prop-aspect-lock"
        >
          <span>Aspect Ratio Lock</span>
          {selectedNode.aspectRatioLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </SectionGroup>

      {/* Container Layout Properties (Containers ONLY) */}
      {isContainer && (
        <SectionGroup title="Layout">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Padding</label>
              <input
                type="number"
                value={selectedNode.style.padding ?? 0}
                onChange={(e) =>
                  patchStyle({ padding: safeNum(e.target.value, selectedNode.style.padding ?? 0, 0, 120) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                data-testid="prop-padding-input"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Gap</label>
              <input
                type="number"
                value={selectedNode.style.gap ?? 0}
                onChange={(e) =>
                  patchStyle({ gap: safeNum(e.target.value, selectedNode.style.gap ?? 0, 0, 120) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                data-testid="prop-gap-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Layout Mode</label>
              <select
                value={selectedNode.style.layoutMode || "absolute"}
                onChange={(e) => patchStyle({ layoutMode: e.target.value as BuilderLayoutMode })}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="absolute">Freeform (Abs)</option>
                <option value="flex-col">Flex Column</option>
                <option value="flex-row">Flex Row</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Overflow</label>
              <select
                value={selectedNode.style.overflow || "hidden"}
                onChange={(e) =>
                  patchStyle({ overflow: e.target.value as BuilderStyle["overflow"] })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="hidden">Clip (Hidden)</option>
                <option value="visible">Visible</option>
                <option value="auto">Scroll</option>
              </select>
            </div>
          </div>
        </SectionGroup>
      )}

      {/* Image Gallery Specific */}
      {selectedNode.type === "image-gallery" && (
        <SectionGroup title="Gallery Grid">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Columns</label>
              <input
                type="number"
                min={1}
                max={6}
                value={selectedNode.config.galleryColumns ?? 3}
                onChange={(e) =>
                  patchConfig({
                    galleryColumns: safeNum(e.target.value, 3, 1, 6),
                  })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Spacing</label>
              <input
                type="number"
                min={0}
                max={32}
                value={selectedNode.config.gallerySpacing ?? 8}
                onChange={(e) =>
                  patchConfig({
                    gallerySpacing: safeNum(e.target.value, 8, 0, 32),
                  })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
          </div>
          {onAddGalleryImage && (
            <button
              type="button"
              onClick={() =>
                onOpenMediaPicker(
                  (url) => onAddGalleryImage(selectedNode.id, url),
                  "Add Image to Gallery",
                  "",
                  "gallery"
                )
              }
              className="w-full py-1.5 rounded-lg bg-[#15151d] hover:bg-[#1e1e29] border border-[#2b2b36] text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              data-testid="prop-gallery-add-image"
            >
              <Plus size={12} />
              <span>Add Gallery Image</span>
            </button>
          )}
        </SectionGroup>
      )}

      {/* Media Image Components (Banner / Profile Image / Image) */}
      {isMediaImage && (
        <SectionGroup title="Image Asset">
          <div className="flex items-center gap-2">
            <div className="w-12 h-9 rounded bg-[#14141a] border border-[#262630] overflow-hidden shrink-0 flex items-center justify-center">
              {selectedNode.config.src ? (
                <img
                  src={selectedNode.config.src}
                  alt={selectedNode.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={14} className="text-neutral-600" />
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenMediaPicker(
                  (url) => patchConfig({ src: url }),
                  `Upload / Replace ${selectedNode.name}`,
                  selectedNode.config.src,
                  selectedNode.type === "profile-image"
                    ? "avatar"
                    : selectedNode.type === "banner-image"
                    ? "banner"
                    : "image"
                )
              }
              className="px-2.5 py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white cursor-pointer"
              data-testid="prop-image-replace"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => patchConfig({ src: "" })}
              className="p-1.5 rounded bg-[#14141b] border border-[#2a2a34] text-neutral-400 hover:text-red-400 cursor-pointer"
              title="Remove image"
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Fit</label>
              <select
                value={selectedNode.config.fit || "cover"}
                onChange={(e) =>
                  patchConfig({ fit: e.target.value as BuilderComponentConfig["fit"] })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Position</label>
              <select
                value={selectedNode.config.objectPosition || "center"}
                onChange={(e) => patchConfig({ objectPosition: e.target.value })}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          {selectedNode.type === "profile-image" && (
            <div className="space-y-2">
              <label className="text-[9px] text-neutral-500 uppercase block">Avatar Shape</label>
              <div className="grid grid-cols-3 gap-1">
                {(["circle", "rounded", "square"] as const).map((shp) => (
                  <button
                    key={shp}
                    type="button"
                    onClick={() => patchConfig({ avatarShape: shp })}
                    className={`py-1 rounded border text-[10px] capitalize cursor-pointer ${
                      (selectedNode.config.avatarShape || "rounded") === shp
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#121217] border-[#24242d] text-neutral-400"
                    }`}
                  >
                    {shp}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-neutral-400">Online Status Dot</span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedNode.config.showStatusDot)}
                  onChange={(e) => patchConfig({ showStatusDot: e.target.checked })}
                  className="accent-white cursor-pointer"
                />
              </div>
            </div>
          )}
        </SectionGroup>
      )}

      {/* Text Components (Name, Subtitle, Description ONLY) */}
      {isTextBased && (
        <SectionGroup title="Typography">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-1">Content</label>
            <textarea
              rows={selectedNode.type === "description" ? 3 : 2}
              value={selectedNode.config.text || ""}
              onChange={(e) => patchConfig({ text: e.target.value })}
              className="w-full bg-[#121217] border border-[#24242d] rounded p-2 text-white outline-none resize-none"
              data-testid="prop-text-content"
            />
          </div>

          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Font</label>
            <select
              value={selectedNode.config.fontFamily || "Space Grotesk, sans-serif"}
              onChange={(e) => patchConfig({ fontFamily: e.target.value })}
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.name} value={f.family}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Size</label>
              <input
                type="number"
                value={selectedNode.config.fontSize ?? 14}
                onChange={(e) =>
                  patchConfig({ fontSize: safeNum(e.target.value, 14, 8, 140) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Weight</label>
              <select
                value={selectedNode.config.fontWeight ?? 600}
                onChange={(e) => patchConfig({ fontWeight: Number(e.target.value) })}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value={400}>Regular</option>
                <option value={500}>Medium</option>
                <option value={600}>SemiBold</option>
                <option value={700}>Bold</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                selectedNode.config.color?.startsWith("#") ? selectedNode.config.color : "#ffffff"
              }
              onChange={(e) => patchConfig({ color: e.target.value })}
              className="w-7 h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={selectedNode.config.color || "#ffffff"}
              onChange={(e) => patchConfig({ color: e.target.value })}
              className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
            />
          </div>

          {selectedNode.type === "name-text" && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">Verified Tick</span>
              <input
                type="checkbox"
                checked={Boolean(selectedNode.config.showVerifiedBadge)}
                onChange={(e) => patchConfig({ showVerifiedBadge: e.target.checked })}
                className="accent-white cursor-pointer"
              />
            </div>
          )}

          {selectedNode.type === "subtitle" && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">Status Pill</span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedNode.config.statusPillActive)}
                  onChange={(e) => patchConfig({ statusPillActive: e.target.checked })}
                  className="accent-white cursor-pointer"
                />
              </div>
              {selectedNode.config.statusPillActive && (
                <input
                  type="text"
                  value={selectedNode.config.statusPillText || ""}
                  onChange={(e) => patchConfig({ statusPillText: e.target.value })}
                  placeholder="SYS.ACTIVE"
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                />
              )}
            </div>
          )}
        </SectionGroup>
      )}

      {/* Badges Group Editor */}
      {selectedNode.type === "badges-group" && (
        <SectionGroup title="Badges List">
          <div className="space-y-2">
            {(selectedNode.config.badges || []).map((badge, idx) => (
              <div
                key={badge.id}
                className="p-2 rounded-lg bg-[#121217] border border-[#24242d] space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={badge.label}
                    onChange={(e) => {
                      const next = [...(selectedNode.config.badges || [])];
                      next[idx] = { ...badge, label: e.target.value };
                      patchConfig({ badges: next });
                    }}
                    className="flex-1 bg-[#0b0b0f] border border-[#24242d] rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(selectedNode.config.badges || [])];
                      next[idx] = { ...badge, visible: !badge.visible };
                      patchConfig({ badges: next });
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 cursor-pointer"
                  >
                    {badge.visible ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (selectedNode.config.badges || []).filter((_, i) => i !== idx);
                      patchConfig({ badges: next });
                    }}
                    className="text-neutral-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <input
                  type="text"
                  value={badge.tooltip}
                  placeholder="Tooltip text..."
                  onChange={(e) => {
                    const next = [...(selectedNode.config.badges || [])];
                    next[idx] = { ...badge, tooltip: e.target.value };
                    patchConfig({ badges: next });
                  }}
                  className="w-full bg-[#0b0b0f] border border-[#24242d] rounded px-1.5 py-0.5 text-[10px] text-neutral-400 outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newBadge: ProfileBadgeItem = {
                  id: createBuilderId("bdg"),
                  label: "Verified",
                  icon: "verified",
                  color: "#e4e4e7",
                  backgroundColor: "#17171f",
                  borderColor: "#2e2e38",
                  borderRadius: 6,
                  tooltip: "Badge",
                  visible: true,
                };
                patchConfig({ badges: [...(selectedNode.config.badges || []), newBadge] });
              }}
              className="w-full py-1.5 rounded bg-[#14141b] border border-[#282832] text-white text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={11} />
              <span>Add Badge</span>
            </button>
          </div>
        </SectionGroup>
      )}

      {/* Music Display Editor */}
      {selectedNode.type === "music-display" && (
        <SectionGroup title="Music Activity">
          <div className="space-y-2">
            <input
              type="text"
              value={selectedNode.config.trackName || ""}
              onChange={(e) => patchConfig({ trackName: e.target.value })}
              placeholder="Track title"
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
            />
            <input
              type="text"
              value={selectedNode.config.artist || ""}
              onChange={(e) => patchConfig({ artist: e.target.value })}
              placeholder="Artist name"
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedNode.config.musicPlatform || "Spotify"}
                onChange={(e) =>
                  patchConfig({
                    musicPlatform: e.target.value as BuilderComponentConfig["musicPlatform"],
                  })
                }
                className="bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="Spotify">Spotify</option>
                <option value="Apple Music">Apple Music</option>
                <option value="SoundCloud">SoundCloud</option>
                <option value="Custom">Custom</option>
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={selectedNode.config.progressPercent ?? 50}
                onChange={(e) =>
                  patchConfig({ progressPercent: safeNum(e.target.value, 50, 0, 100) })
                }
                className="bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
          </div>
        </SectionGroup>
      )}

      {/* Unified Custom RPC Parent Container Controls */}
      {isRpcParent && (
        <SectionGroup title="Custom RPC">
          <div className="space-y-2.5">
            <div className="px-2 py-1.5 rounded bg-[#111118] border border-[#23232f] text-[9px] text-neutral-400 leading-relaxed">
              Website presentation container only. Visual themes and layout never alter your actual Discord Rich Presence.
            </div>

            {isFreeRpcParentLocked && (
              <div
                className="p-2 rounded-lg bg-amber-950/35 border border-amber-700/50 text-amber-200 text-[10px] space-y-1"
                data-testid="rpc-free-upgrade-banner"
              >
                <div className="font-bold flex items-center gap-1">
                  <Lock size={11} />
                  <span>Free Plan Mode</span>
                </div>
                <p className="text-[9px] text-amber-200/80 leading-relaxed">
                  You can display live activity and apply Free global templates. Upgrade to Premium to resize, customize backgrounds/videos, or arrange internal elements.
                </p>
              </div>
            )}

            <label className="flex items-center justify-between text-[10px] text-neutral-300 cursor-pointer">
              <span>Sync Live Discord Activity</span>
              <input
                type="checkbox"
                checked={selectedNode.config.useLiveRpc !== false}
                disabled={isFreeRpcParentLocked}
                onChange={(e) => patchConfig({ useLiveRpc: e.target.checked })}
                className="accent-white cursor-pointer disabled:opacity-40"
                data-testid="rpc-parent-live-toggle"
              />
            </label>

            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Offline Display Text</label>
              <input
                type="text"
                disabled={isFreeRpcParentLocked}
                value={selectedNode.config.rpcOfflineText ?? "Offline · No active session"}
                onChange={(e) => patchConfig({ rpcOfflineText: e.target.value })}
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Container Resize Behavior</label>
              <select
                disabled={isFreeRpcParentLocked}
                value={selectedNode.config.rpcContainerResizeMode || "responsive"}
                onChange={(e) =>
                  patchConfig({
                    rpcContainerResizeMode: e.target.value as BuilderComponentConfig["rpcContainerResizeMode"],
                  })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
                data-testid="rpc-container-resize-mode"
              >
                <option value="responsive">Smart Anchors (Respect Child Modes)</option>
                <option value="proportional">Proportional Corner Scale</option>
                <option value="fixed">Keep Children Fixed</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-[#1b1b24]">
              <div className="text-[9px] text-neutral-500 uppercase">Static / Fallback RPC Content</div>
              <input
                type="text"
                disabled={isFreeRpcParentLocked}
                value={selectedNode.config.appName || ""}
                onChange={(e) => patchConfig({ appName: e.target.value })}
                placeholder="Fallback Application Title"
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              />
              <input
                type="text"
                disabled={isFreeRpcParentLocked}
                value={selectedNode.config.details || ""}
                onChange={(e) => patchConfig({ details: e.target.value })}
                placeholder="Fallback Details"
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              />
              <input
                type="text"
                disabled={isFreeRpcParentLocked}
                value={selectedNode.config.state || ""}
                onChange={(e) => patchConfig({ state: e.target.value })}
                placeholder="Fallback State"
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
              />
            </div>

            {onInsertChild && (
              <div className="space-y-1">
                <div className="text-[9px] text-neutral-500 uppercase">Add RPC Child Element</div>
                <div className="grid grid-cols-2 gap-1">
                  {RPC_CHILD_COMPONENT_TYPES.map((childType) => (
                    <button
                      key={childType}
                      type="button"
                      onClick={() => {
                        if (!isPremiumOrAdmin) {
                          onRestrictedFeature?.("Adding custom Rich Presence children requires Premium.");
                          return;
                        }
                        onInsertChild(selectedNode.id, childType);
                      }}
                      className={`px-2 py-1 rounded border text-[9px] text-left truncate transition-colors ${
                        isPremiumOrAdmin
                          ? "bg-[#13131a] hover:bg-[#1c1c26] border-[#262632] text-neutral-200 cursor-pointer"
                          : "bg-[#101015] border-[#20202a] text-neutral-600 cursor-not-allowed"
                      }`}
                      data-testid={`rpc-quick-add-${childType}`}
                    >
                      + {PROFILE_BUILDER_REGISTRY[childType].label.replace(/^RPC\s+/, "")}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPremiumOrAdmin) {
                        onRestrictedFeature?.("Adding custom Rich Presence children requires Premium.");
                        return;
                      }
                      onInsertChild(selectedNode.id, "rpc-icon", {
                        name: "RPC Small Image",
                        width: 32,
                        height: 32,
                        style: {
                          opacity: 1,
                          backgroundType: "solid",
                          backgroundColor: "#17171f",
                          borderWidth: 1,
                          borderColor: "#2a2a35",
                          borderRadius: 9999,
                        },
                        responsive: {
                          hiddenOn: [],
                          widthMode: "fixed",
                          scaleMode: "proportional",
                        },
                        config: {
                          rpcFieldBinding: "smallImage",
                          rpcDataSource: "live",
                          useLiveRpc: true,
                          rpcShowSecondaryBadge: false,
                          fit: "cover",
                        },
                      });
                    }}
                    className={`px-2 py-1 rounded border text-[9px] text-left truncate transition-colors ${
                      isPremiumOrAdmin
                        ? "bg-[#13131a] hover:bg-[#1c1c26] border-[#262632] text-neutral-200 cursor-pointer"
                        : "bg-[#101015] border-[#20202a] text-neutral-600 cursor-not-allowed"
                    }`}
                    data-testid="rpc-quick-add-small-image"
                  >
                    + Small Image
                  </button>
                </div>
              </div>
            )}

            {/* RPC Visual Templates */}
            <div className="pt-2 border-t border-[#1b1b24] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-200">RPC Templates</span>
                <span className="text-[9px] text-neutral-500">{rpcTemplates.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["all", ...Array.from(new Set(rpcTemplates.map((t) => t.category)))].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTplCategoryFilter(cat)}
                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase cursor-pointer ${
                      tplCategoryFilter === cat
                        ? "bg-white text-black font-bold"
                        : "bg-[#121218] text-neutral-400 border border-[#24242f]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-0.5">
                {rpcTemplates
                  .filter((t) => tplCategoryFilter === "all" || t.category === tplCategoryFilter)
                  .map((tpl) => {
                    const lockedTpl = !isPremiumOrAdmin && tpl.isPremiumRequired;
                    const isActiveTpl = selectedNode.config.rpcTemplateId === tpl.id;
                    const canDeleteTpl =
                      onDeleteRpcTemplate &&
                      !tpl.id.startsWith("rpc-tpl-") &&
                      (isAdmin || !tpl.isGlobal);
                    return (
                      <div
                        key={tpl.id}
                        className={`p-2 rounded-lg border text-[10px] space-y-1 ${
                          isActiveTpl
                            ? "bg-[#171722] border-white/40"
                            : "bg-[#111116] border-[#22222c]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-white truncate">{tpl.name}</span>
                          <span
                            className={`text-[8px] px-1 py-0.5 rounded uppercase shrink-0 ${
                              tpl.isGlobal
                                ? tpl.isPremiumRequired
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-300"
                                : "bg-white/10 text-neutral-300"
                            }`}
                          >
                            {tpl.isPremiumRequired ? "Premium" : "Free"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] text-neutral-500 truncate">{tpl.category}</span>
                          <div className="flex items-center gap-1">
                            {canDeleteTpl && (
                              <button
                                type="button"
                                onClick={() => void onDeleteRpcTemplate(tpl.id)}
                                className="p-1 rounded text-neutral-500 hover:text-red-400 cursor-pointer"
                                title="Delete saved template"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onApplyRpcTemplate?.(selectedNode.id, tpl)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                lockedTpl
                                  ? "bg-amber-950/50 border border-amber-700/50 text-amber-200 cursor-pointer"
                                  : "bg-white hover:bg-neutral-200 text-black cursor-pointer"
                              }`}
                              data-testid={`rpc-apply-tpl-${tpl.id}`}
                            >
                              {lockedTpl ? "Locked" : "Apply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {onSaveRpcTemplate && isPremiumOrAdmin && (
                <div className="pt-2 border-t border-[#1b1b24] space-y-1.5">
                  <div className="text-[9px] text-neutral-400 uppercase font-semibold">
                    {isAdmin ? "Save / Publish Official Template" : "Save Custom RPC Template"}
                  </div>
                  <input
                    type="text"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    placeholder="Template name..."
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                    data-testid="rpc-save-tpl-name"
                  />
                  <input
                    type="text"
                    value={newTplCategory}
                    onChange={(e) => setNewTplCategory(e.target.value)}
                    placeholder="Category (e.g. VALORANT, Minecraft)"
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                    data-testid="rpc-save-tpl-category"
                  />
                  {isAdmin && (
                    <div className="space-y-1 pt-0.5">
                      <label className="flex items-center justify-between text-[9px] text-neutral-300 cursor-pointer">
                        <span>Publish Official Global Template</span>
                        <input
                          type="checkbox"
                          checked={newTplIsGlobal}
                          onChange={(e) => setNewTplIsGlobal(e.target.checked)}
                          className="accent-white cursor-pointer"
                          data-testid="rpc-save-tpl-global"
                        />
                      </label>
                      <label className="flex items-center justify-between text-[9px] text-neutral-300 cursor-pointer">
                        <span>Require Premium Tier</span>
                        <input
                          type="checkbox"
                          checked={newTplPremiumOnly}
                          onChange={(e) => setNewTplPremiumOnly(e.target.checked)}
                          className="accent-white cursor-pointer"
                          data-testid="rpc-save-tpl-premium"
                        />
                      </label>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={savingTpl || !newTplName.trim()}
                    onClick={async () => {
                      setSavingTpl(true);
                      const ok = await onSaveRpcTemplate({
                        embedId: selectedNode.id,
                        name: newTplName,
                        category: newTplCategory || "Custom",
                        isGlobal: isAdmin ? newTplIsGlobal : false,
                        isPremiumRequired: isAdmin ? newTplPremiumOnly : true,
                      });
                      setSavingTpl(false);
                      if (ok) setNewTplName("");
                    }}
                    className="w-full py-1.5 rounded bg-white hover:bg-neutral-200 text-black font-bold text-[10px] cursor-pointer disabled:opacity-40"
                    data-testid="rpc-save-template-btn"
                  >
                    {savingTpl
                      ? "Saving..."
                      : isAdmin && newTplIsGlobal
                        ? "Publish Official Template"
                        : "Save As Template"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </SectionGroup>
      )}

      {/* Rich Presence Child Element Inspector */}
      {isRpcChild && (
        <SectionGroup title="RPC Child Binding">
          {isFreeRpcChildLocked ? (
            <div
              className="p-2 rounded-lg bg-amber-950/35 border border-amber-700/50 text-amber-200 text-[10px] space-y-1"
              data-testid="rpc-child-locked-notice"
            >
              <div className="font-bold flex items-center gap-1">
                <Lock size={11} />
                <span>Premium Required</span>
              </div>
              <p className="text-[9px] text-amber-200/80 leading-relaxed">
                Free accounts cannot modify, resize, or reposition child elements inside Custom RPC Embed.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Data Source</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["live", "custom"] as const).map((srcMode) => (
                    <button
                      key={srcMode}
                      type="button"
                      onClick={() => patchConfig({ rpcDataSource: srcMode })}
                      className={`py-1 rounded border text-[10px] capitalize cursor-pointer ${
                        (selectedNode.config.rpcDataSource || "live") === srcMode
                          ? "bg-white text-black border-white font-bold"
                          : "bg-[#121217] border-[#24242d] text-neutral-400"
                      }`}
                    >
                      {srcMode === "live" ? "Live Discord" : "Website Custom"}
                    </button>
                  ))}
                </div>
              </div>

              {selectedNode.type === "rpc-icon" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Image Binding</label>
                    <select
                      value={selectedNode.config.rpcFieldBinding === "smallImage" ? "smallImage" : "largeImage"}
                      onChange={(e) =>
                        patchConfig({
                          rpcFieldBinding: e.target.value as "largeImage" | "smallImage",
                          ...(e.target.value === "smallImage" ? { rpcShowSecondaryBadge: false } : {}),
                        })
                      }
                      className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                      data-testid="rpc-icon-binding-select"
                    >
                      <option value="largeImage">Main Game Icon (largeImage)</option>
                      <option value="smallImage">Small Activity Image (smallImage)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenMediaPicker(
                        (url) =>
                          patchConfig(
                            selectedNode.config.rpcFieldBinding === "smallImage"
                              ? { appIcon: url, rpcDataSource: "custom" }
                              : { largeImage: url, rpcDataSource: "custom" }
                          ),
                        "Upload Custom Game Icon / GIF",
                        selectedNode.config.largeImage || "",
                        "rpc_icon"
                      )
                    }
                    className="w-full py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white text-[10px] font-semibold cursor-pointer"
                  >
                    Upload / Pick Thumbnail or GIF
                  </button>
                  {selectedNode.config.rpcFieldBinding !== "smallImage" && (
                    <label className="flex items-center justify-between text-[10px] text-neutral-300 cursor-pointer">
                      <span>Show Secondary Small Badge</span>
                      <input
                        type="checkbox"
                        checked={selectedNode.config.rpcShowSecondaryBadge !== false}
                        onChange={(e) => patchConfig({ rpcShowSecondaryBadge: e.target.checked })}
                        className="accent-white cursor-pointer"
                      />
                    </label>
                  )}
                </div>
              )}

              {selectedNode.type === "rpc-achievement" && (
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-[10px] text-neutral-300 cursor-pointer">
                    <span>Decorative User Badge</span>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedNode.config.rpcIsDecorative)}
                      onChange={(e) => patchConfig({ rpcIsDecorative: e.target.checked })}
                      className="accent-white cursor-pointer"
                      data-testid="rpc-decorative-toggle"
                    />
                  </label>
                  {selectedNode.config.rpcIsDecorative ? (
                    <input
                      type="text"
                      value={selectedNode.config.rpcCustomLabel || ""}
                      onChange={(e) => patchConfig({ rpcCustomLabel: e.target.value })}
                      placeholder="Decorative badge label..."
                      className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                      data-testid="rpc-decorative-label-input"
                    />
                  ) : (
                    <p className="text-[9px] text-neutral-500">
                      Only displays real synced streaks or stats when available.
                    </p>
                  )}
                </div>
              )}

              {(selectedNode.type === "rpc-title" ||
                selectedNode.type === "rpc-details" ||
                selectedNode.type === "rpc-state" ||
                selectedNode.type === "rpc-status" ||
                selectedNode.type === "rpc-timestamp") && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={
                      selectedNode.type === "rpc-title"
                        ? selectedNode.config.appName || ""
                        : selectedNode.type === "rpc-details"
                          ? selectedNode.config.details || ""
                          : selectedNode.type === "rpc-state"
                            ? selectedNode.config.state || ""
                            : selectedNode.type === "rpc-timestamp"
                              ? selectedNode.config.startTimestampText || ""
                              : selectedNode.config.rpcCustomLabel || ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (selectedNode.type === "rpc-title") patchConfig({ appName: v });
                      else if (selectedNode.type === "rpc-details") patchConfig({ details: v });
                      else if (selectedNode.type === "rpc-state") patchConfig({ state: v });
                      else if (selectedNode.type === "rpc-timestamp") patchConfig({ startTimestampText: v });
                      else patchConfig({ rpcCustomLabel: v });
                    }}
                    placeholder="Custom website fallback / override text"
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Font Size</label>
                      <input
                        type="number"
                        value={selectedNode.config.fontSize ?? 12}
                        onChange={(e) => patchConfig({ fontSize: safeNum(e.target.value, 12, 8, 64) })}
                        className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Color</label>
                      <input
                        type="color"
                        value={selectedNode.config.color?.startsWith("#") ? selectedNode.config.color : "#ffffff"}
                        onChange={(e) => patchConfig({ color: e.target.value })}
                        className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Align</label>
                      <select
                        value={selectedNode.config.textAlign || (selectedNode.type === "rpc-timestamp" ? "right" : "left")}
                        onChange={(e) =>
                          patchConfig({
                            textAlign: e.target.value as BuilderComponentConfig["textAlign"],
                          })
                        }
                        className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Overflow</label>
                      <select
                        value={selectedNode.config.overflowBehavior || "ellipsis"}
                        onChange={(e) =>
                          patchConfig({
                            overflowBehavior: e.target.value as BuilderComponentConfig["overflowBehavior"],
                          })
                        }
                        className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
                      >
                        <option value="ellipsis">Ellipsis</option>
                        <option value="wrap">Wrap Text</option>
                        <option value="clip">Clip</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Child Scaling & Responsive Pinning */}
              <div className="pt-2 border-t border-[#1b1b24] space-y-1.5">
                <label className="text-[9px] text-neutral-500 uppercase block">Parent Resize Behavior</label>
                <select
                  value={selectedNode.responsive?.scaleMode || "fixed"}
                  onChange={(e) =>
                    patchResponsive({
                      scaleMode: e.target.value as BuilderChildScaleMode,
                    })
                  }
                  className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                  data-testid="rpc-child-scale-mode"
                >
                  <option value="fixed">Fixed Size</option>
                  <option value="proportional">Proportional Scale</option>
                  <option value="anchor">Responsive Anchor</option>
                </select>
                {selectedNode.responsive?.scaleMode === "anchor" && (
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {(["left", "right", "top", "bottom"] as Array<keyof BuilderAnchorConfig>).map(
                      (edge) => {
                        const active = Boolean(selectedNode.responsive?.anchors?.[edge]);
                        return (
                          <button
                            key={edge}
                            type="button"
                            onClick={() =>
                              patchResponsive({
                                anchors: {
                                  ...(selectedNode.responsive?.anchors || {}),
                                  [edge]: !active,
                                },
                              })
                            }
                            className={`py-1 rounded border text-[9px] capitalize cursor-pointer ${
                              active
                                ? "bg-white text-black border-white font-bold"
                                : "bg-[#121217] border-[#24242d] text-neutral-400"
                            }`}
                          >
                            {edge}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {selectedNode.type === "rpc-buttons" && (
                <div className="space-y-2">
                  {(selectedNode.config.rpcButtons || []).map((btn, idx) => {
                    const valid = isValidUrlOrEmpty(btn.url);
                    return (
                      <div key={btn.id} className="p-2 rounded bg-[#121217] border border-[#24242d] space-y-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) => {
                              const next = [...(selectedNode.config.rpcButtons || [])];
                              next[idx] = { ...btn, label: e.target.value };
                              patchConfig({ rpcButtons: next });
                            }}
                            placeholder="Button label"
                            className="flex-1 bg-[#0b0b0f] border border-[#24242d] rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (selectedNode.config.rpcButtons || []).filter((_, i) => i !== idx);
                              patchConfig({ rpcButtons: next });
                            }}
                            className="text-neutral-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={btn.url}
                          onChange={(e) => {
                            const next = [...(selectedNode.config.rpcButtons || [])];
                            next[idx] = { ...btn, url: e.target.value };
                            patchConfig({ rpcButtons: next });
                          }}
                          placeholder="https://..."
                          className={`w-full bg-[#0b0b0f] border rounded px-1.5 py-0.5 text-[10px] text-white outline-none ${
                            valid ? "border-[#24242d]" : "border-red-500"
                          }`}
                        />
                      </div>
                    );
                  })}
                  {(selectedNode.config.rpcButtons || []).length < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchConfig({
                          rpcButtons: [
                            ...(selectedNode.config.rpcButtons || []),
                            { id: createBuilderId("rpc-btn"), label: "Open Link", url: "https://pixel.gg", variant: "primary" },
                          ],
                        })
                      }
                      className="w-full py-1 rounded bg-[#14141b] border border-[#282832] text-white text-[10px] cursor-pointer"
                    >
                      + Add RPC Button
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionGroup>
      )}

  {/* Social Media Group Editor */}
      {selectedNode.type === "social-group" && (
        <SectionGroup title="Social Links">
          <div className="space-y-2">
            {(selectedNode.config.socialItems || []).map((item, idx) => {
              const valid = isValidUrlOrEmpty(item.url);
              return (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-[#121217] border border-[#24242d] space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <select
                      value={item.platform}
                      onChange={(e) => {
                        const next = [...(selectedNode.config.socialItems || [])];
                        next[idx] = { ...item, platform: e.target.value };
                        patchConfig({ socialItems: next });
                      }}
                      className="flex-1 bg-[#0b0b0f] border border-[#24242d] rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (selectedNode.config.socialItems || []).filter(
                          (_, i) => i !== idx
                        );
                        patchConfig({ socialItems: next });
                      }}
                      className="text-neutral-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const next = [...(selectedNode.config.socialItems || [])];
                      next[idx] = { ...item, url: e.target.value };
                      patchConfig({ socialItems: next });
                    }}
                    placeholder="https://..."
                    className={`w-full bg-[#0b0b0f] border rounded px-1.5 py-0.5 text-[10px] text-white outline-none ${
                      valid ? "border-[#24242d]" : "border-red-500"
                    }`}
                  />
                  {!valid && (
                    <span className="text-[9px] text-red-400 block">Invalid or unsafe URL</span>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const items = selectedNode.config.socialItems || [];
                patchConfig({
                  socialItems: [
                    ...items,
                    {
                      id: createBuilderId("soc"),
                      platform: "globe",
                      url: "https://pixel.gg",
                      label: "Website",
                      visible: true,
                      style: "pill",
                    },
                  ],
                });
              }}
              className="w-full py-1.5 rounded bg-[#14141b] border border-[#282832] text-white text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={11} />
              <span>Add Social Link</span>
            </button>
          </div>
        </SectionGroup>
      )}

      {/* Separator Properties */}
      {selectedNode.type === "separator" && (
        <SectionGroup title="Separator">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Thickness</label>
              <input
                type="number"
                min={1}
                max={8}
                value={selectedNode.config.separatorThickness ?? 1}
                onChange={(e) =>
                  patchConfig({ separatorThickness: safeNum(e.target.value, 1, 1, 8) })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Style</label>
              <select
                value={selectedNode.config.separatorStyle || "solid"}
                onChange={(e) =>
                  patchConfig({
                    separatorStyle: e.target.value as BuilderComponentConfig["separatorStyle"],
                  })
                }
                className="w-full bg-[#121217] border border-[#24242d] rounded px-1.5 py-1 text-white outline-none"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </SectionGroup>
      )}

      {/* Heart / Global Like Configuration */}
      {selectedNode.type === "heart-like" && (
        <SectionGroup title="Heart / Global Like">
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Optional Label</label>
              <input
                type="text"
                value={selectedNode.config.heartLabel ?? "Like"}
                onChange={(e) => patchConfig({ heartLabel: e.target.value })}
                placeholder="Like"
                className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                data-testid="heart-label-input"
              />
            </div>
            <label className="flex items-center justify-between text-[11px] text-neutral-300 cursor-pointer">
              <span>Show Global Like Count</span>
              <input
                type="checkbox"
                checked={selectedNode.config.heartShowCount !== false}
                onChange={(e) => patchConfig({ heartShowCount: e.target.checked })}
                className="accent-white w-3.5 h-3.5 cursor-pointer"
                data-testid="heart-show-count-toggle"
              />
            </label>
            <div>
              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Heart Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedNode.config.heartAccentColor || "#f43f5e"}
                  onChange={(e) => patchConfig({ heartAccentColor: e.target.value })}
                  className="w-7 h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedNode.config.heartAccentColor || "#f43f5e"}
                  onChange={(e) => patchConfig({ heartAccentColor: e.target.value })}
                  className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              All Heart components on this profile share one global Like count and visitor state (max 5).
            </p>
          </div>
        </SectionGroup>
      )}

      {/* Background (Container / Surface) */}
      {(isContainer ||
        selectedNode.type === "music-display" ||
        selectedNode.type === "custom-rpc" ||
        selectedNode.type === "custom-component" ||
        selectedNode.type === "heart-like") && (
        <SectionGroup title="Background">
          {isContainer && (
            <div className="space-y-2 pb-1">
              <div className="grid grid-cols-4 gap-1">
                {(["solid", "gradient", "image", "video"] as const).map((bgMode) => {
                  const lockedBgMode =
                    !isPremiumOrAdmin && (isRpcParent || bgMode === "video");
                  return (
                    <button
                      key={bgMode}
                      type="button"
                      onClick={() => {
                        if (lockedBgMode) {
                          onRestrictedFeature?.(
                            "Custom container backgrounds, GIFs, gradients, and videos require Premium."
                          );
                          return;
                        }
                        patchStyle({ backgroundType: bgMode });
                      }}
                      className={`py-1 rounded border text-[9px] capitalize ${
                        (selectedNode.style.backgroundType || "solid") === bgMode
                          ? "bg-white text-black border-white font-bold"
                          : lockedBgMode
                            ? "bg-[#101014] border-[#202028] text-neutral-600 cursor-not-allowed"
                            : "bg-[#121217] border-[#24242d] text-neutral-400 cursor-pointer"
                      }`}
                      data-testid={`container-bg-mode-${bgMode}`}
                    >
                      {bgMode === "image" ? "Img/GIF" : bgMode}
                    </button>
                  );
                })}
              </div>

              {selectedNode.style.backgroundType === "gradient" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Gradient To</label>
                    <input
                      type="color"
                      disabled={isFreeRpcParentLocked}
                      value={selectedNode.style.backgroundGradientTo || "#1a1a28"}
                      onChange={(e) => patchStyle({ backgroundGradientTo: e.target.value })}
                      className="w-full h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Angle</label>
                    <input
                      type="number"
                      disabled={isFreeRpcParentLocked}
                      value={selectedNode.style.backgroundGradientAngle ?? 135}
                      onChange={(e) =>
                        patchStyle({ backgroundGradientAngle: safeNum(e.target.value, 135, 0, 360) })
                      }
                      className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedNode.style.backgroundType === "image" && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    disabled={isFreeRpcParentLocked}
                    onClick={() =>
                      onOpenMediaPicker(
                        (url) => patchStyle({ backgroundType: "image", backgroundImage: url }),
                        `Upload ${selectedNode.name} Image / GIF`,
                        selectedNode.style.backgroundImage || "",
                        isRpcParent ? "rpc_bg" : "container_bg"
                      )
                    }
                    className="w-full py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white text-[10px] font-semibold cursor-pointer disabled:opacity-40"
                    data-testid="container-bg-image-picker-btn"
                  >
                    Upload / Pick Image or GIF
                  </button>
                  <input
                    type="text"
                    disabled={isFreeRpcParentLocked}
                    value={selectedNode.style.backgroundImage || ""}
                    onChange={(e) => patchStyle({ backgroundImage: e.target.value })}
                    placeholder="https://.../bg.gif or .png"
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                  />
                </div>
              )}

              {selectedNode.style.backgroundType === "video" && (
                <div className="space-y-1.5">
                  <input
                    ref={containerVideoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!isPremiumOrAdmin) {
                        onRestrictedFeature?.("Container video backgrounds require Premium.");
                        return;
                      }
                      setContainerVideoError(null);
                      const validErr = validateUploadFile(file, "video", { unlimitedSize: isFounder });
                      if (validErr) {
                        setContainerVideoError(validErr);
                        return;
                      }
                      setContainerVideoUploading(true);
                      try {
                        const uploaded = await uploadMediaAsset({
                          file,
                          targetSlot: "container_background_video",
                          kind: "video",
                          unlimitedSize: isFounder,
                        });
                        patchStyle({ backgroundType: "video", backgroundVideo: uploaded.url });
                      } catch (err: unknown) {
                        setContainerVideoError(err instanceof Error ? err.message : "Video upload failed.");
                      } finally {
                        setContainerVideoUploading(false);
                        if (containerVideoInputRef.current) containerVideoInputRef.current.value = "";
                      }
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={containerVideoUploading || !isPremiumOrAdmin}
                      onClick={() => containerVideoInputRef.current?.click()}
                      className="flex-1 py-1.5 rounded bg-[#14141b] hover:bg-[#1e1e28] border border-[#2a2a34] text-white text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      data-testid="container-bg-video-upload-btn"
                    >
                      {containerVideoUploading ? <Loader2 size={11} className="animate-spin" /> : <Film size={11} />}
                      <span>{containerVideoUploading ? "Uploading..." : "Upload MP4/WebM"}</span>
                    </button>
                    {selectedNode.style.backgroundVideo && (
                      <button
                        type="button"
                        onClick={() => patchStyle({ backgroundVideo: "", backgroundType: "solid" })}
                        className="p-1.5 rounded bg-[#14141b] border border-[#2a2a34] text-neutral-400 hover:text-red-400 cursor-pointer"
                        title="Remove container video"
                        data-testid="container-bg-video-remove-btn"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={!isPremiumOrAdmin}
                    value={selectedNode.style.backgroundVideo || ""}
                    onChange={(e) => patchStyle({ backgroundVideo: e.target.value })}
                    placeholder="https://.../loop.mp4"
                    className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
                    data-testid="container-bg-video-url"
                  />
                  <label className="flex items-center justify-between text-[10px] text-neutral-300 cursor-pointer">
                    <span>Mute Container Video</span>
                    <input
                      type="checkbox"
                      checked={selectedNode.style.backgroundVideoMuted !== false}
                      onChange={(e) => patchStyle({ backgroundVideoMuted: e.target.checked })}
                      className="accent-white cursor-pointer"
                    />
                  </label>
                  {containerVideoError && (
                    <div className="text-[9px] text-red-400">{containerVideoError}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={isFreeRpcParentLocked}
              value={
                selectedNode.style.backgroundColor?.startsWith("#")
                  ? selectedNode.style.backgroundColor
                  : "#0b0b0e"
              }
              onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
              className="w-7 h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer disabled:opacity-40"
            />
            <input
              type="text"
              disabled={isFreeRpcParentLocked}
              value={selectedNode.style.backgroundColor || "#0b0b0e"}
              onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
              className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
            />
          </div>
          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
              <span>SURFACE OPACITY</span>
              <span>{Math.round((selectedNode.style.backgroundOpacity ?? 0.92) * 100)}%</span>
            </div>
            <input
              type="range"
              disabled={isFreeRpcParentLocked}
              min={0}
              max={100}
              value={Math.round((selectedNode.style.backgroundOpacity ?? 0.92) * 100)}
              onChange={(e) => patchStyle({ backgroundOpacity: Number(e.target.value) / 100 })}
              className="w-full accent-white disabled:opacity-40"
            />
          </div>
        </SectionGroup>
      )}

      {/* Border & Radius */}
      <SectionGroup title="Border & Radius" defaultOpen={isContainer || isMediaImage}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Radius</label>
            <input
              type="number"
              value={selectedNode.style.borderRadius ?? 0}
              onChange={(e) =>
                patchStyle({ borderRadius: safeNum(e.target.value, 0, 0, 200) })
              }
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
              data-testid="prop-radius-input"
            />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Border px</label>
            <input
              type="number"
              value={selectedNode.style.borderWidth ?? 0}
              onChange={(e) =>
                patchStyle({ borderWidth: safeNum(e.target.value, 0, 0, 16) })
              }
              className="w-full bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            disabled={isFreeRpcParentLocked || isFreeRpcChildLocked}
            value={
              selectedNode.style.borderColor?.startsWith("#")
                ? selectedNode.style.borderColor
                : "#272730"
            }
            onChange={(e) => patchStyle({ borderColor: e.target.value })}
            className="w-7 h-7 rounded border border-[#2e2e38] bg-transparent cursor-pointer disabled:opacity-40"
          />
          <input
            type="text"
            disabled={isFreeRpcParentLocked || isFreeRpcChildLocked}
            value={selectedNode.style.borderColor || "#272730"}
            onChange={(e) => patchStyle({ borderColor: e.target.value })}
            placeholder="#272730"
            className="flex-1 bg-[#121217] border border-[#24242d] rounded px-2 py-1 text-white outline-none disabled:opacity-40"
          />
        </div>
      </SectionGroup>

      {/* Effects */}
      <SectionGroup title="Effects" defaultOpen={false}>
        <div>
          <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
            <span>ELEMENT OPACITY</span>
            <span>{Math.round((selectedNode.style.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((selectedNode.style.opacity ?? 1) * 100)}
            onChange={(e) => patchStyle({ opacity: Number(e.target.value) / 100 })}
            className="w-full accent-white"
          />
        </div>
        {isContainer && (
          <div>
            <div className="flex justify-between text-[9px] text-neutral-500 mb-1">
              <span>BACKDROP BLUR</span>
              <span>{selectedNode.style.blur ?? 0}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={selectedNode.style.blur ?? 0}
              onChange={(e) => patchStyle({ blur: Number(e.target.value) })}
              className="w-full accent-white"
            />
          </div>
        )}
      </SectionGroup>

      {/* Advanced: Device Visibility */}
      <SectionGroup title="Advanced" defaultOpen={false}>
        <label className="text-[9px] text-neutral-500 uppercase block mb-1">
          Visible on Device Previews
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(["desktop", "tablet", "mobile"] as BuilderDeviceMode[]).map((dev) => {
            const hidden = selectedNode.responsive.hiddenOn?.includes(dev);
            return (
              <button
                key={dev}
                type="button"
                onClick={() => {
                  const curr = selectedNode.responsive.hiddenOn || [];
                  patchResponsive({
                    hiddenOn: hidden ? curr.filter((d) => d !== dev) : [...curr, dev],
                  });
                }}
                className={`py-1 rounded border text-[9px] capitalize cursor-pointer ${
                  !hidden
                    ? "bg-[#1a1a22] border-white/25 text-white"
                    : "bg-[#0d0d11] border-[#202028] text-neutral-600 line-through"
                }`}
              >
                {dev}
              </button>
            );
          })}
        </div>
      </SectionGroup>
    </div>
  );
};
