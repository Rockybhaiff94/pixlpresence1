"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Plus, Trash2, Crown, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/nothing/Button";

interface ManageAliasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  aliases: string[];
  maxAliases: number;
  isPremium: boolean;
  onUpdate: (updatedAliases: string[]) => void;
}

export const ManageAliasesModal: React.FC<ManageAliasesModalProps> = ({
  isOpen,
  onClose,
  aliases = [],
  maxAliases = 1,
  isPremium = false,
  onUpdate,
}) => {
  const [newAlias, setNewAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAlias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    if (!clean || clean.length < 3 || clean.length > 24) {
      setError("Alias must be between 3 and 24 characters.");
      return;
    }

    if (aliases.includes(clean)) {
      setError("This alias is already registered on your account.");
      return;
    }

    if (aliases.length >= maxAliases) {
      setError(`Maximum alias limit reached (${aliases.length}/${maxAliases}).`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/account/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add alias");
      }

      setNewAlias("");
      setSuccess(`Alias pixel.gg/${clean} successfully reserved!`);
      onUpdate(data.aliases);
    } catch (err: any) {
      setError(err.message || "Failed to add alias.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlias = async (aliasToDelete: string) => {
    setDeleting(aliasToDelete);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/account/aliases/${encodeURIComponent(aliasToDelete)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove alias");
      }

      setSuccess(`Alias pixel.gg/${aliasToDelete} removed.`);
      onUpdate(data.aliases);
    } catch (err: any) {
      setError(err.message || "Failed to remove alias.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-[#262626] rounded-2xl p-6 shadow-2xl relative nt-crosshair space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ ACCOUNT // ALIAS ROUTING ]
            </span>
            <h3 className="text-base font-bold text-white">MANAGE PROFILE ALIASES</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-500 hover:text-white hover:bg-[#181818] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Capacity Indicator */}
        <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between text-xs">
          <span className="text-neutral-400">
            SLOTS USED: <span className="text-white font-bold">{aliases.length} / {maxAliases}</span>
          </span>
          {!isPremium ? (
            <Link
              href="/premium"
              className="text-[11px] text-[#ededed] hover:text-white flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <Crown size={12} /> UNLOCK 5 SLOTS
            </Link>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
              PREMIUM ACTIVATED
            </span>
          )}
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
            <span>{success}</span>
          </div>
        )}

        {/* Existing Aliases List */}
        <div className="space-y-2">
          <label className="text-[11px] text-neutral-400 font-semibold block text-left">
            REGISTERED ALIASES
          </label>
          {aliases.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {aliases.map((alias) => (
                <div
                  key={alias}
                  className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="text-white font-semibold">pixel.gg/{alias}</span>
                    <span className="text-[10px] text-neutral-500 font-normal">→ Redirects to primary</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAlias(alias)}
                    disabled={deleting === alias}
                    className="p-1 rounded text-neutral-500 hover:text-[#ff6b6b] transition-colors cursor-pointer"
                    title="Delete alias"
                  >
                    {deleting === alias ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#101010] border border-[#1f1f1f] text-center text-xs text-neutral-500">
              No aliases claimed yet. Add an alternative handle to forward visitors to your profile.
            </div>
          )}
        </div>

        {/* Add New Alias Form */}
        {aliases.length < maxAliases ? (
          <form onSubmit={handleAddAlias} className="space-y-3 pt-2 border-t border-[#1a1a1a]">
            <label className="text-[11px] text-neutral-400 font-semibold block text-left">
              CLAIM NEW ALIAS
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-[#121212] border border-[#2a2a2a] focus-within:border-white rounded-lg px-3 py-2 transition-colors text-xs">
                <span className="text-neutral-500 mr-1 select-none">pixel.gg/</span>
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) =>
                    setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="secondary_handle"
                  className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
                  disabled={loading}
                />
              </div>
              <Button
                variant="solid-white"
                type="submit"
                loading={loading}
                disabled={loading || !newAlias}
                className="text-xs py-2 px-3.5 shrink-0"
              >
                <Plus size={13} /> ADD
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-lg bg-[#161616] border border-[#2c2c2c] text-xs text-neutral-400 flex items-center justify-between">
            <span>Capacity filled ({aliases.length}/{maxAliases})</span>
            {!isPremium && (
              <Button variant="solid-white" href="/premium" className="text-[11px] py-1 px-3">
                UPGRADE TO PREMIUM
              </Button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[#1a1a1a] flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-xs py-1.5 px-4">
            CLOSE
          </Button>
        </div>
      </div>
    </div>
  );
};
