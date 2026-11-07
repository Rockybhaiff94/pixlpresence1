"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Gamepad2,
  Code2,
  Music,
  AlertCircle,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  config: string;
  isGlobal: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/rpc/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleApply = async (id: string) => {
    try {
      setActionLoading(id);
      setMsg(null);
      const res = await apiFetch(`/api/rpc/templates/${id}/apply`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply template");
      setMsg({ text: "Presence template applied to active Discord session.", type: "success" });
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to apply template", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await apiFetch(`/api/rpc/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch {
      // Ignore
    }
  };

  const parseConfig = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const filteredTemplates = filter === "ALL"
    ? templates
    : filter === "COMMUNITY"
    ? templates.filter((t) => t.isGlobal)
    : templates.filter((t) => t.category.toUpperCase() === filter);

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>RICH PRESENCE</span>
              <span>/</span>
              <span className="text-white">ACTIVITY TEMPLATES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              PRESENCE TEMPLATES.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Curated and custom Discord Rich Presence activity states ready to deploy in one click.
            </p>
          </div>

          <button
            onClick={fetchTemplates}
            className="p-2 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#242424] text-neutral-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            title="Refresh templates"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Status Message */}
        {msg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              msg.type === "success"
                ? "bg-[#0d2818] border-[#4ade80]/40 text-[#4ade80]"
                : "bg-[#2a0e0e] border-[#d71920]/40 text-[#ff6b6b]"
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "COMMUNITY", "GAMING", "CODING", "MUSIC"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
                filter === tab
                  ? "bg-white text-black font-bold"
                  : "bg-[#111111] text-neutral-400 hover:text-white border border-[#222222]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-neutral-500 text-xs">
            <RefreshCw size={16} className="animate-spin mr-2" />
            <span>RETRIEVING TEMPLATE REPOSITORY...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0a0a0a] border border-[#202020] text-center space-y-3">
            <LayoutTemplate size={24} className="mx-auto text-neutral-500" />
            <p className="text-white font-bold text-xs">NO TEMPLATES FOUND IN THIS CATEGORY</p>
            <p className="text-xs text-neutral-500">
              Select &quot;ALL&quot; or save your current presence state from the dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => {
              const cfg = parseConfig(t.config);
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] hover:border-neutral-600 flex flex-col justify-between space-y-4 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center text-white">
                          <LayoutTemplate size={16} />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-xs truncate">{t.name}</h3>
                          <span className="text-[10px] text-neutral-500 uppercase">{t.category}</span>
                        </div>
                      </div>

                      {t.isGlobal ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold">
                          COMMUNITY
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Discord Activity Simulation */}
                    <div className="p-3 rounded-xl bg-[#121212] border border-[#1e1e1e] space-y-1 text-xs">
                      <p className="text-white font-semibold truncate text-[11px]">
                        {cfg.appName || "Custom Activity"}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {cfg.details || "In-game / Focused"}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {cfg.state || "Active on Pixel.gg"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApply(t.id)}
                    disabled={actionLoading === t.id}
                    className="w-full py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={12} />
                    <span>{actionLoading === t.id ? "APPLYING..." : "APPLY PRESENCE"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
