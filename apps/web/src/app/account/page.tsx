"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Edit2,
  Copy,
  Check,
  Eye,
  Activity,
  ArrowRight,
  TrendingUp,
  Shield,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  ExternalLink,
  Crown,
  RefreshCw,
  Plus,
  AlertCircle,
  Link2,
} from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { EditUsernameModal } from "@/components/account/EditUsernameModal";
import { ManageAliasesModal } from "@/components/account/ManageAliasesModal";
import { EditDisplayNameModal } from "@/components/account/EditDisplayNameModal";
import { Button } from "@/components/nothing/Button";

interface AccountOverviewData {
  user: {
    id: string;
    username: string;
    email?: string | null;
    globalName?: string | null;
    avatar?: string | null;
    role?: string;
    premiumStatus?: boolean;
    badges?: any[];
    createdAt?: string;
  };
  profile: {
    id?: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    views: number;
    linksCount: number;
    buttonsCount: number;
  };
  aliases: {
    list: string[];
    used: number;
    max: number;
    remaining: number;
  };
  completion: {
    percentage: number;
    tasks: {
      id: string;
      title: string;
      completed: boolean;
      weight: number;
      actionText: string;
      actionHref: string;
    }[];
  };
  connections: {
    discord: {
      connected: boolean;
      id?: string;
      username?: string;
    };
    google: {
      connected: boolean;
      email?: string;
    };
  };
  analyticsPreview: {
    totalViews: number;
    viewsDeltaPct: string;
    dailyViews: { date: string; views: number }[];
    visitorDevices: { name: string; percentage: number; count: number }[];
  };
}

export default function AccountOverviewPage() {
  const [data, setData] = useState<AccountOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedUid, setCopiedUid] = useState(false);

  // Modals state
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [displayNameModalOpen, setDisplayNameModalOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/account/overview");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // Fallback exemplar state if unauthenticated in dev
        setData({
          user: {
            id: "cmw4fbemh0000a1sa2h3h5zzk",
            username: "carl_pei",
            email: "carl@nothing.tech",
            globalName: "Carl Pei",
            avatar: null,
            role: "USER",
            premiumStatus: true,
            badges: ["Verified", "Founder"],
          },
          profile: {
            displayName: "Carl Pei",
            bio: "CEO Nothing // Pure industrial design, stripped to raw essentials.",
            avatarUrl: "",
            views: 142890,
            linksCount: 4,
            buttonsCount: 3,
          },
          aliases: {
            list: ["carl", "pei"],
            used: 2,
            max: 5,
            remaining: 3,
          },
          completion: {
            percentage: 80,
            tasks: [
              { id: "avatar", title: "Upload an Avatar", completed: true, weight: 20, actionText: "Done", actionHref: "#" },
              { id: "description", title: "Add a Description", completed: true, weight: 20, actionText: "Done", actionHref: "#" },
              { id: "discord", title: "Link Discord Account", completed: true, weight: 20, actionText: "Done", actionHref: "#" },
              { id: "socials", title: "Add Socials", completed: true, weight: 20, actionText: "Done", actionHref: "#" },
              { id: "views", title: "Reach 10 Profile Views", completed: true, weight: 20, actionText: "142,890/10", actionHref: "#" },
            ],
          },
          connections: {
            discord: { connected: true, id: "704548873145942076", username: "carl_pei#0001" },
            google: { connected: false },
          },
          analyticsPreview: {
            totalViews: 142890,
            viewsDeltaPct: "+18.4%",
            dailyViews: [
              { date: "Nov 1", views: 1820 },
              { date: "Nov 2", views: 2410 },
              { date: "Nov 3", views: 1950 },
              { date: "Nov 4", views: 3200 },
              { date: "Nov 5", views: 2890 },
              { date: "Nov 6", views: 3410 },
              { date: "Nov 7", views: 4120 },
            ],
            visitorDevices: [
              { name: "Desktop", percentage: 64, count: 91450 },
              { name: "Mobile", percentage: 31, count: 44295 },
              { name: "Tablet", percentage: 4, count: 5715 },
              { name: "Other", percentage: 1, count: 1430 },
            ],
          },
        });
      }
    } catch {
      setError("Failed to load account information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCopyUid = (uid: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  if (loading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center min-h-[60vh] font-mono text-neutral-500 text-xs">
          <RefreshCw size={16} className="animate-spin mr-2" />
          <span>LOADING ACCOUNT OVERVIEW...</span>
        </div>
      </AccountLayout>
    );
  }

  const { user, profile, aliases, completion, connections, analyticsPreview } = data!;

  // Max views for 7-day chart scaling
  const maxView = Math.max(...analyticsPreview.dailyViews.map((v) => v.views), 10);

  return (
    <AccountLayout user={user}>
      {/* Modals */}
      <EditUsernameModal
        isOpen={usernameModalOpen}
        onClose={() => setUsernameModalOpen(false)}
        currentUsername={user.username}
        onSuccess={(newU) => {
          setData((prev) =>
            prev ? { ...prev, user: { ...prev.user, username: newU } } : prev
          );
        }}
      />

      <ManageAliasesModal
        isOpen={aliasModalOpen}
        onClose={() => setAliasModalOpen(false)}
        aliases={aliases.list}
        maxAliases={aliases.max}
        isPremium={Boolean(user.premiumStatus)}
        onUpdate={(updatedList) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  aliases: {
                    ...prev.aliases,
                    list: updatedList,
                    used: updatedList.length,
                    remaining: Math.max(0, prev.aliases.max - updatedList.length),
                  },
                }
              : prev
          );
        }}
      />

      <EditDisplayNameModal
        isOpen={displayNameModalOpen}
        onClose={() => setDisplayNameModalOpen(false)}
        currentDisplayName={profile.displayName}
        onSuccess={(newDN) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  profile: { ...prev.profile, displayName: newDN },
                  user: { ...prev.user, globalName: newDN },
                }
              : prev
          );
        }}
      />

      {/* Page Header */}
      <div className="space-y-1 text-left pb-2 border-b border-[#181818]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ 01 // DASHBOARD OVERVIEW ]
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              ACCOUNT OVERVIEW
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              href={`/${user.username}`}
              external
              className="text-xs py-1.5 px-3 font-mono"
              icon={<ExternalLink size={12} />}
            >
              VIEW PUBLIC
            </Button>
            <Button
              variant="solid-white"
              href="/customize"
              className="text-xs py-1.5 px-3 font-mono"
            >
              STUDIO
            </Button>
          </div>
        </div>
      </div>

      {/* Part A: 4 Top Account Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Username Card */}
        <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#222222] space-y-3 relative nt-crosshair">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="uppercase tracking-wider text-[10px]">USERNAME</span>
            <button
              onClick={() => setUsernameModalOpen(true)}
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer"
            >
              <Edit2 size={11} /> EDIT
            </button>
          </div>
          <div className="text-xl font-bold text-white truncate font-mono">
            @{user.username}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>CLAIMED & ACTIVE</span>
          </div>
        </div>

        {/* 2. Alias Card */}
        <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#222222] space-y-3 relative nt-crosshair">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="uppercase tracking-wider text-[10px]">ALIAS SLOTS</span>
            <button
              onClick={() => setAliasModalOpen(true)}
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer"
            >
              <Edit2 size={11} /> MANAGE
            </button>
          </div>
          <div className="text-xl font-bold text-white truncate font-mono">
            {aliases.used} / {aliases.max} USED
          </div>
          <div className="text-[10px] text-neutral-500 truncate">
            {aliases.remaining > 0
              ? `${aliases.remaining} SLOTS AVAILABLE`
              : user.premiumStatus
              ? "ALL SLOTS CLAIMED"
              : "UPGRADE FOR 5 SLOTS"}
          </div>
        </div>

        {/* 3. UID Card */}
        <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#222222] space-y-3 relative nt-crosshair">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="uppercase tracking-wider text-[10px]">UID (ACCOUNT ID)</span>
            <button
              onClick={() => handleCopyUid(user.id)}
              className="hover:text-white transition-colors flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer"
              title="Copy UID"
            >
              {copiedUid ? <Check size={11} className="text-[#4ade80]" /> : <Copy size={11} />}
              <span>{copiedUid ? "COPIED" : "COPY"}</span>
            </button>
          </div>
          <div className="text-sm font-bold text-white truncate font-mono tracking-wider pt-1">
            {user.id}
          </div>
          <div className="text-[10px] text-neutral-500">
            AUTHENTICATED UNIQUE IDENTIFIER
          </div>
        </div>

        {/* 4. Profile Views Card */}
        <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#222222] space-y-3 relative nt-crosshair">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="uppercase tracking-wider text-[10px]">PROFILE VIEWS</span>
            <Eye size={13} className="text-neutral-500" />
          </div>
          <div className="text-xl font-bold text-white truncate font-mono">
            {profile.views.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#4ade80]">
            <TrendingUp size={11} />
            <span>{analyticsPreview.viewsDeltaPct} vs last 7 days</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Profile Completion (B) + Manage Your Account (C) + Connections (D) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Profile Completion Progress Panel */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-6 nt-crosshair">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#181818]">
            <div className="space-y-0.5 text-left">
              <h2 className="text-base font-bold text-white font-mono">
                PROFILE COMPLETION
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                Complete these recommended steps to maximize visitor engagement and reach.
              </p>
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {completion.percentage}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#181818] rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {/* Actionable Checklist */}
          <div className="space-y-2.5">
            {completion.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-[#121212] border border-[#222222] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      task.completed
                        ? "bg-white text-black"
                        : "bg-neutral-800 text-neutral-500 border border-neutral-700"
                    }`}
                  >
                    {task.completed ? "✓" : ""}
                  </div>
                  <span className={task.completed ? "text-neutral-300 line-through opacity-70" : "text-white font-medium"}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-neutral-500">+{task.weight}%</span>
                  {!task.completed ? (
                    <Button
                      variant="solid-white"
                      href={task.actionHref}
                      className="text-[11px] py-1 px-3"
                    >
                      {task.actionText} →
                    </Button>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      COMPLETED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Manage Your Account (C) & Connections (D) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Manage Account Panel */}
          <div className="p-5 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
            <div className="space-y-0.5 text-left pb-2 border-b border-[#181818]">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                MANAGE YOUR ACCOUNT
              </h3>
              <p className="text-[11px] text-neutral-500">Fast action triggers</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setUsernameModalOpen(true)}
                className="w-full p-2.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#242424] text-left text-xs font-mono flex items-center justify-between text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <span>Change Username</span>
                <Edit2 size={12} className="text-neutral-500" />
              </button>

              <button
                onClick={() => setDisplayNameModalOpen(true)}
                className="w-full p-2.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#242424] text-left text-xs font-mono flex items-center justify-between text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <span>Change Display Name</span>
                <Edit2 size={12} className="text-neutral-500" />
              </button>

              <button
                onClick={() => setAliasModalOpen(true)}
                className="w-full p-2.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#242424] text-left text-xs font-mono flex items-center justify-between text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <span>Manage Aliases ({aliases.used}/{aliases.max})</span>
                <Plus size={13} className="text-neutral-500" />
              </button>

              <Link
                href="/account/settings"
                className="w-full p-2.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#242424] text-left text-xs font-mono flex items-center justify-between text-neutral-200 hover:text-white transition-colors"
              >
                <span>Account Settings</span>
                <ArrowRight size={13} className="text-neutral-500" />
              </Link>
            </div>
          </div>

          {/* Part D: Connections Panel */}
          <div className="p-5 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-4 nt-crosshair">
            <div className="space-y-0.5 text-left pb-2 border-b border-[#181818]">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                CONNECTED IDENTITIES
              </h3>
              <p className="text-[11px] text-neutral-500">OAuth logins & account links</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Discord Connection */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5865F2]" />
                    <span className="font-semibold text-white">Discord</span>
                  </div>
                  {connections.discord.connected ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-[#4ade80]">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500">NOT CONNECTED</span>
                  )}
                </div>
                {connections.discord.connected ? (
                  <p className="text-[11px] text-neutral-400 truncate">
                    ID: {connections.discord.id}
                  </p>
                ) : (
                  <a
                    href="/auth/discord"
                    className="text-[11px] text-white underline underline-offset-2 flex items-center gap-1"
                  >
                    Connect Discord Account →
                  </a>
                )}
              </div>

              {/* Google Connection */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                    <span className="font-semibold text-white">Google</span>
                  </div>
                  {connections.google.connected ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-[#4ade80]">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500">NOT CONNECTED</span>
                  )}
                </div>
                {connections.google.connected ? (
                  <p className="text-[11px] text-neutral-400 truncate">
                    {connections.google.email}
                  </p>
                ) : (
                  <a
                    href="/auth/google"
                    className="text-[11px] text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    Link Google Account →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Part E: Account Analytics Preview */}
      <div className="p-6 rounded-2xl bg-[#0b0b0b] border border-[#202020] space-y-6 nt-crosshair">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#181818]">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">
              [ TELEMETRY PREVIEW // 7-DAY SNAPSHOT ]
            </span>
            <h2 className="text-base font-bold text-white font-mono">
              PROFILE ACTIVITY PREVIEW
            </h2>
          </div>
          <Button
            variant="outline"
            href="/account/analytics"
            className="text-xs py-1.5 px-3.5 self-start sm:self-auto font-mono"
            icon={<ArrowRight size={12} />}
          >
            VIEW MORE DETAILED ANALYTICS
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Profile Views 7-Day Chart (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-semibold">VIEWS OVER TIME</span>
              <span className="text-neutral-500 text-[11px]">Last 7 Days</span>
            </div>

            {/* Responsive SVG Line / Bar Chart */}
            <div className="h-44 w-full bg-[#101010] border border-[#1f1f1f] rounded-xl p-4 flex flex-col justify-between">
              <div className="h-28 flex items-end justify-between gap-2 pt-2">
                {analyticsPreview.dailyViews.map((day) => {
                  const heightPct = Math.max(12, Math.round((day.views / maxView) * 100));
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-white text-black font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                        {day.views.toLocaleString()} views
                      </div>

                      <div
                        className="w-full bg-neutral-700 group-hover:bg-white rounded-t transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Date Labels */}
              <div className="flex justify-between border-t border-[#1c1c1c] pt-2 text-[10px] font-mono text-neutral-500">
                {analyticsPreview.dailyViews.map((day) => (
                  <span key={day.date} className="truncate">
                    {day.date}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Visitor Devices Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-semibold">VISITOR DEVICES</span>
              <span className="text-neutral-500 text-[11px]">Proportional Traffic</span>
            </div>

            <div className="space-y-3">
              {analyticsPreview.visitorDevices.map((dev) => {
                const getIcon = () => {
                  if (dev.name === "Desktop") return Monitor;
                  if (dev.name === "Mobile") return Smartphone;
                  if (dev.name === "Tablet") return Tablet;
                  return Globe;
                };
                const DevIcon = getIcon();

                return (
                  <div key={dev.name} className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-300">
                        <DevIcon size={13} className="text-neutral-500" />
                        <span>{dev.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 text-[11px]">{dev.count.toLocaleString()}</span>
                        <span className="text-white font-bold">{dev.percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-[#181818] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: `${dev.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

