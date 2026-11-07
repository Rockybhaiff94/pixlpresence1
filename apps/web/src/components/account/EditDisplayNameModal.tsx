"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface EditDisplayNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string;
  onSuccess: (newDisplayName: string) => void;
}

export const EditDisplayNameModal: React.FC<EditDisplayNameModalProps> = ({
  isOpen,
  onClose,
  currentDisplayName,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setDisplayName(currentDisplayName);
    setError("");
    setSuccess(false);
  }, [currentDisplayName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim().slice(0, 32);

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/account/display-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update display name");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(clean);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to update display name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="w-full max-w-md bg-[#0c0c0c] border border-[#262626] rounded-2xl p-6 shadow-2xl relative nt-crosshair space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ ACCOUNT // PROFILE DISPLAY ]
            </span>
            <h3 className="text-base font-bold text-white">CHANGE DISPLAY NAME</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-500 hover:text-white hover:bg-[#181818] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#2a0e0e] border border-[#d71920]/40 text-[#ff6b6b] text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-[#0e2a14] border border-[#20d750]/40 text-[#4ade80] text-xs flex items-center gap-2">
            <Check size={14} className="shrink-0" />
            <span>Display name updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] text-neutral-400 font-semibold">
              DISPLAY NAME (MAX 32 CHARS)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Carl Pei"
              maxLength={32}
              className="w-full bg-[#121212] border border-[#2a2a2a] focus-within:border-white rounded-lg px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none transition-colors"
              disabled={loading || success}
              autoFocus
            />
            <p className="text-[10px] text-neutral-600">
              This name is shown prominently at the top of your public profile card.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#1a1a1a]">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading || success}
              className="text-xs py-2 px-3.5"
            >
              CANCEL
            </Button>
            <Button
              variant="solid-white"
              type="submit"
              loading={loading}
              disabled={loading || success}
              className="text-xs py-2 px-4"
            >
              SAVE CHANGES
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

