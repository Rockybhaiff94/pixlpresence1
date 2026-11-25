"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Check,
  Upload,
  Trash2,
  Gamepad2,
  User,
  Image as ImageIcon,
  Type,
  FileText,
  Clock,
  Radio,
  ExternalLink,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { uploadMediaAsset } from "@/lib/uploadAsset";

export type ContextualModalTarget =
  | { type: "info"; title: string; data: { displayName?: string | null; username?: string | null; avatarUrl?: string | null; accentColor?: string } }
  | { type: "bio"; title: string; data: { bio?: string | null } }
  | { type: "text"; title: string; elementId: string; data: { text?: string; content?: string } }
  | { type: "image"; title: string; elementId: string; data: { url?: string; alt?: string } }
  | { type: "banner"; title: string; data: { bannerUrl?: string | null } }
  | {
      type: "rpc";
      title: string;
      data: {
        appName?: string | null;
        name?: string | null;
        details?: string | null;
        state?: string | null;
        largeImage?: string | null;
        smallImage?: string | null;
        partySize?: number | null;
        partyMax?: number | null;
        startTimestamp?: string | number | null;
        buttons?: Array<{ label: string; url: string; visible?: boolean }> | null;
        isStandalone?: boolean;
        showProfileRpc?: boolean;
      };
    };

interface ContextualEditModalProps {
  target: ContextualModalTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, updatedData: any) => void;
}

export const ContextualEditModal: React.FC<ContextualEditModalProps> = ({
  target,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !target) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#121216] border border-neutral-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-5 text-neutral-200 text-xs flex flex-col max-h-[90vh] overflow-hidden"
      >
        {target.type === "rpc" && (
          <RpcModalContent target={target} onClose={onClose} onSave={onSave} />
        )}
        {target.type === "info" && (
          <InfoModalContent target={target} onClose={onClose} onSave={onSave} />
        )}
        {target.type === "bio" && (
          <BioModalContent target={target} onClose={onClose} onSave={onSave} />
        )}
        {target.type === "text" && (
          <TextModalContent target={target} onClose={onClose} onSave={onSave} />
        )}
        {(target.type === "image" || target.type === "banner") && (
          <ImageModalContent target={target} onClose={onClose} onSave={onSave} />
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 1. RICH PRESENCE (RPC) DEDICATED MODAL
// =========================================================================
function RpcModalContent({
  target,
  onClose,
  onSave,
}: {
  target: Extract<ContextualModalTarget, { type: "rpc" }>;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, data: any) => void;
}) {
  const [isStandalone, setIsStandalone] = useState<boolean>(target.data.isStandalone ?? false);
  const [appName, setAppName] = useState<string>(target.data.appName || target.data.name || "Visual Studio Code");
  const [details, setDetails] = useState<string>(target.data.details || "Developing Nothing OS");
  const [stateText, setStateText] = useState<string>(target.data.state || "Pixel.gg Studio");
  const [largeImage, setLargeImage] = useState<string>(target.data.largeImage || "");
  const [smallImage, setSmallImage] = useState<string>(target.data.smallImage || "");
  const [partySize, setPartySize] = useState<number>(target.data.partySize || 1);
  const [partyMax, setPartyMax] = useState<number>(target.data.partyMax || 5);
  const [buttons, setButtons] = useState<Array<{ label: string; url: string; visible?: boolean }>>(
    target.data.buttons || [
      { label: "Join Project", url: "https://pixel.gg", visible: true },
    ]
  );
  const [uploadingLarge, setUploadingLarge] = useState<boolean>(false);
  const [uploadingSmall, setUploadingSmall] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const largeFileInputRef = useRef<HTMLInputElement>(null);
  const smallFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImage = async (file: File, slot: "large" | "small") => {
    setUploadError(null);
    try {
      if (slot === "large") setUploadingLarge(true);
      else setUploadingSmall(true);

      // Uses POST /api/rpc/upload via shared authenticated uploadMediaAsset helper
      const uploaded = await uploadMediaAsset({
        file,
        kind: "image",
        targetSlot: slot === "large" ? "largeImage" : "smallImage",
      });

      if (slot === "large") setLargeImage(uploaded.url);
      else setSmallImage(uploaded.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload RPC image. Please try again.");
    } finally {
      if (slot === "large") setUploadingLarge(false);
      else setUploadingSmall(false);
      if (slot === "large" && largeFileInputRef.current) largeFileInputRef.current.value = "";
      if (slot === "small" && smallFileInputRef.current) smallFileInputRef.current.value = "";
    }
  };

  const handleSaveAll = () => {
    onSave(target, {
      ...target.data,
      isStandalone,
      appName,
      name: appName,
      details,
      state: stateText,
      largeImage,
      smallImage,
      partySize: Number(partySize) || 1,
      partyMax: Number(partyMax) || 5,
      buttons,
    });
    onClose();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Gamepad2 size={16} className="text-rose-400" />
          <span className="font-bold text-white text-sm">Customize Discord Rich Presence (RPC)</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
        {/* Mode Selector */}
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <span className="text-[11px] font-semibold text-neutral-300">RPC Operating Mode</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsStandalone(false)}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors ${
                !isStandalone
                  ? "bg-amber-400/10 border-amber-400 text-white"
                  : "bg-black/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Radio size={12} className={!isStandalone ? "text-amber-400" : "text-neutral-500"} />
                Linked to Discord
              </span>
              <span className="text-[10px] text-neutral-500">Live sync with Discord client</span>
            </button>

            <button
              type="button"
              onClick={() => setIsStandalone(true)}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-colors ${
                isStandalone
                  ? "bg-amber-400/10 border-amber-400 text-white"
                  : "bg-black/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sparkles size={12} className={isStandalone ? "text-amber-400" : "text-neutral-500"} />
                Standalone Mode
              </span>
              <span className="text-[10px] text-neutral-500">Full custom images & texts</span>
            </button>
          </div>
        </div>

        {/* Image Management (Large and Small) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Large Image */}
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold text-neutral-300">Large RPC Image</span>
            <div className="flex items-center gap-2.5">
              <div className="w-14 h-14 rounded-xl bg-black border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                {largeImage ? (
                  <img src={largeImage} alt="Large RPC" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-neutral-600" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="file"
                  ref={largeFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadImage(f, "large");
                  }}
                />
                <button
                  type="button"
                  onClick={() => largeFileInputRef.current?.click()}
                  disabled={uploadingLarge}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-[10px] flex items-center gap-1"
                >
                  <Upload size={10} /> {uploadingLarge ? "Uploading..." : "Upload / Replace"}
                </button>
                {largeImage && (
                  <button
                    type="button"
                    onClick={() => setLargeImage("")}
                    className="text-[10px] text-rose-400 hover:underline block"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Small Image */}
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold text-neutral-300">Small Badge Image</span>
            <div className="flex items-center gap-2.5">
              <div className="w-14 h-14 rounded-full bg-black border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                {smallImage ? (
                  <img src={smallImage} alt="Small RPC" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-neutral-600" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="file"
                  ref={smallFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadImage(f, "small");
                  }}
                />
                <button
                  type="button"
                  onClick={() => smallFileInputRef.current?.click()}
                  disabled={uploadingSmall}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-[10px] flex items-center gap-1"
                >
                  <Upload size={10} /> {uploadingSmall ? "Uploading..." : "Upload / Replace"}
                </button>
                {smallImage && (
                  <button
                    type="button"
                    onClick={() => setSmallImage("")}
                    className="text-[10px] text-rose-400 hover:underline block"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          {uploadError && (
            <div className="p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-[11px]">
              {uploadError}
            </div>
          )}
        </div>

        {/* Text Fields */}
        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] text-neutral-400 mb-1 block">Game / App Name</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 mb-1 block">Activity Details (Line 1)</label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 mb-1 block">Activity State (Line 2)</label>
            <input
              type="text"
              value={stateText}
              onChange={(e) => setStateText(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-neutral-400 mb-1 block">Party / Players Current</label>
              <input
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 mb-1 block">Party / Players Max</label>
              <input
                type="number"
                min={1}
                value={partyMax}
                onChange={(e) => setPartyMax(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Buttons Configuration */}
        <div className="space-y-2 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-300">RPC Action Buttons</span>
            {buttons.length < 2 && (
              <button
                type="button"
                onClick={() => setButtons([...buttons, { label: "New Button", url: "https://pixel.gg", visible: true }])}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus size={10} /> Add Button
              </button>
            )}
          </div>

          {buttons.map((btn, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-black/60 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-neutral-400">Button #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...buttons];
                      next[idx].visible = next[idx].visible === false ? true : false;
                      setButtons(next);
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-white"
                    title={btn.visible !== false ? "Hide button publicly" : "Show button publicly"}
                  >
                    {btn.visible !== false ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setButtons(buttons.filter((_, i) => i !== idx))}
                    className="p-1 rounded text-neutral-400 hover:text-rose-400"
                    title="Remove button"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Button Label"
                  value={btn.label}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[idx].label = e.target.value;
                    setButtons(next);
                  }}
                  className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-white text-[11px]"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={btn.url}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[idx].url = e.target.value;
                    setButtons(next);
                  }}
                  className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-white text-[11px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold flex items-center gap-1.5"
        >
          <Check size={13} /> Save & Apply
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 2. NAME, ICON & PROFILE INFO MODAL
// =========================================================================
function InfoModalContent({
  target,
  onClose,
  onSave,
}: {
  target: Extract<ContextualModalTarget, { type: "info" }>;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, data: any) => void;
}) {
  const [displayName, setDisplayName] = useState(target.data.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(target.data.avatarUrl || "");
  const [accentColor, setAccentColor] = useState(target.data.accentColor || "#ffffff");

  return (
    <div className="space-y-4">
      <div className="flex items-between justify-between pb-2 border-b border-neutral-800">
        <span className="font-bold text-white text-sm">Edit Name & Profile Icon</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={15} /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-neutral-400 mb-1 block">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-[11px] text-neutral-400 mb-1 block">Avatar / Profile Icon URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-[11px] text-neutral-400 mb-1 block">Theme Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
            />
            <span className="font-mono text-xs text-neutral-300">{accentColor}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">Cancel</button>
        <button
          onClick={() => {
            onSave(target, { displayName, avatarUrl, accentColor });
            onClose();
          }}
          className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1"
        >
          <Check size={13} /> Apply Changes
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 3. BIO MODAL
// =========================================================================
function BioModalContent({
  target,
  onClose,
  onSave,
}: {
  target: Extract<ContextualModalTarget, { type: "bio" }>;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, data: any) => void;
}) {
  const [bio, setBio] = useState(target.data.bio || "");

  return (
    <div className="space-y-4">
      <div className="flex items-between justify-between pb-2 border-b border-neutral-800">
        <span className="font-bold text-white text-sm">Edit Biography</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={15} /></button>
      </div>

      <div>
        <label className="text-[11px] text-neutral-400 mb-1 block">Biography Text (Supports Markdown)</label>
        <textarea
          rows={5}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400 resize-none font-mono"
        />
      </div>

      <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">Cancel</button>
        <button
          onClick={() => {
            onSave(target, { bio });
            onClose();
          }}
          className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1"
        >
          <Check size={13} /> Apply Bio
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 4. TEXT BLOCK MODAL
// =========================================================================
function TextModalContent({
  target,
  onClose,
  onSave,
}: {
  target: Extract<ContextualModalTarget, { type: "text" }>;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, data: any) => void;
}) {
  const [text, setText] = useState(target.data.text || target.data.content || "");

  return (
    <div className="space-y-4">
      <div className="flex items-between justify-between pb-2 border-b border-neutral-800">
        <span className="font-bold text-white text-sm">Edit Text Content</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={15} /></button>
      </div>

      <div>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400 resize-none font-mono"
        />
      </div>

      <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">Cancel</button>
        <button
          onClick={() => {
            onSave(target, { text, content: text });
            onClose();
          }}
          className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1"
        >
          <Check size={13} /> Update Text
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 5. IMAGE / BANNER MODAL
// =========================================================================
function ImageModalContent({
  target,
  onClose,
  onSave,
}: {
  target: Extract<ContextualModalTarget, { type: "image" | "banner" }>;
  onClose: () => void;
  onSave: (target: ContextualModalTarget, data: any) => void;
}) {
  const initialUrl = target.type === "banner" ? (target.data as any).bannerUrl || "" : (target.data as any).url || "";
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploadError(null);
    try {
      setUploading(true);
      const uploaded = await uploadMediaAsset({
        file,
        kind: "image",
        targetSlot: target.type === "banner" ? "banner" : "image",
      });
      setUrl(uploaded.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-between justify-between pb-2 border-b border-neutral-800">
        <span className="font-bold text-white text-sm">
          {target.type === "banner" ? "Edit Banner Image" : "Edit Image Graphic"}
        </span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={15} /></button>
      </div>

      <div className="space-y-3">
        {url && (
          <div className="w-full h-32 rounded-xl bg-black border border-neutral-800 overflow-hidden">
            <img src={url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <label className="text-[11px] text-neutral-400 mb-1 block">Image URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-semibold flex items-center gap-1.5 text-xs"
          >
            <Upload size={12} /> {uploading ? "Uploading..." : "Upload from Device"}
          </button>
          {uploadError && (
            <div className="mt-2 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-[11px]">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">Cancel</button>
        <button
          onClick={() => {
            if (target.type === "banner") onSave(target, { bannerUrl: url });
            else onSave(target, { url });
            onClose();
          }}
          className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1"
        >
          <Check size={13} /> Apply Image
        </button>
      </div>
    </div>
  );
}
