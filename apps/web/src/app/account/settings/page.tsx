"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Key,
  Mail,
  User,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface ConnectionsState {
  discord: { connected: boolean; id: string | null; displayName: string | null };
  google: { connected: boolean; id: string | null; displayName: string | null };
  email: { connected: boolean; email: string | null; hasPassword: boolean };
}

export default function AccountSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [connections, setConnections] = useState<ConnectionsState>({
    discord: { connected: false, id: null, displayName: null },
    google: { connected: false, id: null, displayName: null },
    email: { connected: false, email: null, hasPassword: false },
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/auth/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleUnlink = async (provider: "discord" | "google") => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) return;
    try {
      setActionLoading(true);
      setMsg(null);
      const res = await apiFetch("/api/auth/connections/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect");
      setMsg({ text: data.message || `Disconnected ${provider} successfully.`, type: "success" });
      await fetchConnections();
      await refreshUser();
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to disconnect provider", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMsg({ text: "New password must be at least 8 characters.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }

    try {
      setActionLoading(true);
      setMsg(null);
      const res = await apiFetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setMsg({ text: "Password updated successfully.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMsg({ text: err.message || "Password update failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 font-mono text-[#ededed] max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#202020]">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
              <span>ACCOUNT</span>
              <span>/</span>
              <span className="text-white">PREFERENCES & SECURITY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              ACCOUNT SETTINGS.
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Configure login credentials, linked identities, and session credentials.
            </p>
          </div>

          <button
            onClick={fetchConnections}
            className="p-2 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#242424] text-neutral-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            title="Refresh Settings"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Global Notice */}
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

        {/* General Identity Details */}
        <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
          <div className="space-y-0.5 pb-3 border-b border-[#181818]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User size={14} className="text-neutral-400" />
              CANONICAL ACCOUNT IDENTITY
            </h2>
            <p className="text-[11px] text-neutral-500">
              Primary profile attributes recognized across the network
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Username</span>
              <p className="text-white font-bold">{user?.username || "—"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Display Name</span>
              <p className="text-white font-bold">{user?.globalName || user?.username || "—"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Primary Email</span>
              <p className="text-white font-bold">{user?.email || "No email attached"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Account Role</span>
              <p className="text-white font-bold">{user?.role || "USER"}</p>
            </div>
          </div>
        </div>

        {/* Account Connections / Linked Identities */}
        <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
          <div className="space-y-0.5 pb-3 border-b border-[#181818]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield size={14} className="text-neutral-400" />
              AUTHENTICATION IDENTITIES & LINKING
            </h2>
            <p className="text-[11px] text-neutral-500">
              Link multiple providers to access your single canonical account
            </p>
          </div>

          <div className="space-y-3">
            {/* Discord Identity */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">Discord</span>
                    {connections.discord.connected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#102a15] text-[#4ade80] font-bold">
                        CONNECTED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {connections.discord.connected
                      ? `ID: ${connections.discord.id} (${connections.discord.displayName})`
                      : "Not connected to a Discord account."}
                  </p>
                </div>
              </div>

              {connections.discord.connected ? (
                <button
                  onClick={() => handleUnlink("discord")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-red-500 hover:text-red-400 text-neutral-400 text-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/auth/discord"
                  className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#2a2a2a] text-white text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  Connect Discord →
                </a>
              )}
            </div>

            {/* Google Identity */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EA4335]/10 border border-[#EA4335]/30 flex items-center justify-center text-[#EA4335]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V13.4h6.887C18.2 16.035 15.65 18 12.24 18c-3.37 0-6.1-2.73-6.1-6.1s2.73-6.1 6.1-6.1c1.53 0 2.92.56 4 1.48l2.36-2.36C17.18 3.52 14.88 2.7 12.24 2.7 7.14 2.7 3 6.84 3 11.94s4.14 9.24 9.24 9.24c5.33 0 8.87-3.75 8.87-9.03 0-.6-.06-1.18-.17-1.86h-8.7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">Google Account</span>
                    {connections.google.connected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#102a15] text-[#4ade80] font-bold">
                        CONNECTED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {connections.google.connected
                      ? `ID: ${connections.google.id}`
                      : "Not connected to a Google identity."}
                  </p>
                </div>
              </div>

              {connections.google.connected ? (
                <button
                  onClick={() => handleUnlink("google")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-red-500 hover:text-red-400 text-neutral-400 text-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/auth/google"
                  className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#2a2a2a] text-white text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  Connect Google →
                </a>
              )}
            </div>

            {/* Email & Password */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">Email & Password Auth</span>
                    {connections.email.hasPassword && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#102a15] text-[#4ade80] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {connections.email.email
                      ? `Attached: ${connections.email.email}`
                      : "No dedicated email/password login method configured."}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-neutral-400">
                {connections.email.hasPassword ? "Password Protected" : "OAuth Only"}
              </span>
            </div>
          </div>
        </div>

        {/* Change / Set Password Form */}
        <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
          <div className="space-y-0.5 pb-3 border-b border-[#181818]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key size={14} className="text-neutral-400" />
              SECURITY & CREDENTIALS
            </h2>
            <p className="text-[11px] text-neutral-500">
              Update your account password for direct email/username login
            </p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-3.5 max-w-md">
            {connections.email.hasPassword && (
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#222222] text-white text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {actionLoading ? "SAVING..." : "UPDATE PASSWORD"}
            </button>
          </form>
        </div>

        {/* Session Management & Sign Out */}
        <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
          <div className="space-y-0.5 pb-3 border-b border-[#181818]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <LogOut size={14} className="text-neutral-400" />
              SESSION MANAGEMENT
            </h2>
            <p className="text-[11px] text-neutral-500">
              Control active credentials and logout securely
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-xs font-semibold">Terminate Active Session</p>
              <p className="text-[11px] text-neutral-500">
                Clears your local token and terminates the server authentication cookie.
              </p>
            </div>

            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg bg-[#2a1010] hover:bg-[#381515] border border-red-500/30 text-red-400 text-xs font-bold transition-colors cursor-pointer"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

