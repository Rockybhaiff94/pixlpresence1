"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface EditUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onSuccess: (newUsername: string) => void;
}

export const EditUsernameModal: React.FC<EditUsernameModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  onSuccess,
}) => {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available?: boolean; reason?: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setUsername(currentUsername);
    setAvailability(null);
    setError("");
    setSuccess(false);
  }, [currentUsername, isOpen]);

  // Live availability check debounce
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean || clean === currentUsername) {
      setAvailability(null);
      return;
    }

    if (clean.length < 3) {
      setAvailability({ available: false, reason: "Minimum 3 characters required." });
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await apiFetch(`/api/account/check-username/${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch {
        // Ignore network check failure
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, currentUsername]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    if (clean === currentUsername) {
      onClose();
      return;
    }

    if (clean.length < 3 || clean.length > 24) {
      setError("Username must be between 3 and 24 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(clean);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "An error occurred while updating username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="w-full max-w-md bg-[#0c0c0c] border border-[#262626] rounded-2xl p-6 shadow-2xl relative nt-crosshair space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ ACCOUNT // IDENTITY SPEC ]
            </span>
            <h3 className="text-base font-bold text-white">CHANGE USERNAME</h3>
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
            <span>Username successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] text-neutral-400 font-semibold">
              DESIRED HANDLE
            </label>
            <div className="flex items-center bg-[#121212] border border-[#2a2a2a] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
              <span className="text-neutral-500 mr-1 select-none">pixel.gg/</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                }
                placeholder="new_handle"
                className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
                disabled={loading || success}
                autoFocus
              />
              {checking && <RefreshCw size={13} className="animate-spin text-neutral-500" />}
            </div>

            {/* Availability feedback */}
            {availability && (
              <p
                className={`text-[11px] flex items-center gap-1.5 pt-1 ${
                  availability.available ? "text-[#4ade80]" : "text-[#ff6b6b]"
                }`}
              >
                {availability.available ? (
                  <>
                    <Check size={12} /> Handle is available!
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} /> {availability.reason}
                  </>
                )}
              </p>
            )}
            <p className="text-[10px] text-neutral-600">
              Only lowercase letters, numbers, hyphens, and underscores are permitted (3-24 characters).
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
              disabled={
                loading ||
                success ||
                (availability && !availability.available) ||
                username === currentUsername
              }
              className="text-xs py-2 px-4"
            >
              CONFIRM CHANGE
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

