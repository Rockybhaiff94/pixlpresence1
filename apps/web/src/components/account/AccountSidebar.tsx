"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  BarChart2,
  Award,
  Settings,
  Palette,
  Link as LinkIcon,
  Crown,
  Image as ImageIcon,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Share2,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Check,
  Copy,
} from "lucide-react";

interface AccountSidebarProps {
  user?: {
    id: string;
    username: string;
    globalName?: string | null;
    avatar?: string | null;
    role?: string;
    premiumStatus?: boolean;
  };
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [accountExpanded, setAccountExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const currentUser = user || {
    id: "cmw4fbemh0000a1sa2h3h5zzk",
    username: "ashish.yt",
    globalName: "Ashish",
    avatar: null,
    role: "USER",
    premiumStatus: false,
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const accountSubItems = [
    { label: "Overview", href: "/account", icon: User },
    { label: "Analytics", href: "/account/analytics", icon: BarChart2 },
    { label: "Badges", href: "/account/badges", icon: Award },
    { label: "Settings", href: "/account/settings", icon: Settings },
  ];

  const mainNavItems = [
    { label: "Customize", href: "/customize", icon: Palette },
    { label: "Links", href: "/links", icon: LinkIcon },
    { label: "Premium", href: "/premium", icon: Crown },
    { label: "Image Host", href: "/image-host", icon: ImageIcon },
    { label: "Templates", href: "/templates", icon: LayoutTemplate },
  ];

  const allSearchable = [
    ...accountSubItems,
    ...mainNavItems,
    { label: "Public Profile", href: `/${currentUser.username}`, icon: ExternalLink },
    { label: "Appearance Theme", href: "/customize", icon: Palette },
    { label: "Social Platform Icons", href: "/links", icon: LinkIcon },
    { label: "Account Aliases", href: "/account", icon: User },
  ];

  const filteredItems = searchQuery.trim()
    ? allSearchable.filter((i) =>
        i.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleShareProfile = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/${currentUser.username}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isAccountActive = accountSubItems.some((item) => pathname === item.href);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="lg:hidden w-full bg-[#0a0a0a] border-b border-[#222222] px-4 py-3 flex items-center justify-between sticky top-0 z-40 font-mono">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold text-xs">
            P
          </div>
          <span className="text-white font-bold text-sm tracking-wide">
            PIXEL.GG <span className="text-neutral-500 text-xs">(01)</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg border border-[#2a2a2a] bg-[#141414] text-neutral-300 hover:text-white"
          aria-label="Toggle navigation drawer"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#080808] border-r border-[#1c1c1c] flex flex-col justify-between font-mono text-xs transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Section */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Logo & Platform Code */}
          <div className="flex items-center justify-between pb-3 border-b border-[#181818]">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold text-xs group-hover:bg-neutral-200 transition-colors">
                P
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-xs tracking-wider">
                  PIXEL.GG
                </span>
                <span className="text-[10px] text-neutral-500">
                  STUDIO OS // 2.5
                </span>
              </div>
            </Link>
            <span className="w-2 h-2 rounded-full bg-[#d71920]" title="Operational System" />
          </div>

          {/* Global Feature Search */}
          <div className="relative">
            <div className="flex items-center bg-[#101010] border border-[#222222] focus-within:border-white rounded-lg px-2.5 py-1.5 transition-colors">
              <Search size={13} className="text-neutral-500 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-500 hover:text-white text-[10px] ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick search suggestions popup */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-[#2a2a2a] rounded-lg shadow-2xl p-1.5 z-50 space-y-1">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setSearchQuery("")}
                      className="px-2.5 py-1.5 rounded hover:bg-[#1c1c1c] text-neutral-300 hover:text-white flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <item.icon size={12} className="text-neutral-500" />
                    </Link>
                  ))
                ) : (
                  <p className="p-2 text-[11px] text-neutral-500 text-center">
                    No features found.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {/* Expandable Account Group */}
            <div>
              <button
                onClick={() => setAccountExpanded(!accountExpanded)}
                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isAccountActive
                    ? "bg-[#141414] text-white font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-[#101010]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User size={14} className={isAccountActive ? "text-white" : "text-neutral-500"} />
                  <span>Account</span>
                </div>
                {accountExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {accountExpanded && (
                <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-[#1a1a1a] ml-4 mt-0.5">
                  {accountSubItems.map((sub) => {
                    const isActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                          isActive
                            ? "bg-white text-black font-semibold"
                            : "text-neutral-400 hover:text-white hover:bg-[#121212]"
                        }`}
                      >
                        <span>{sub.label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Top-Level Links */}
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                    isActive
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-[#101010]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={14} className={isActive ? "text-black" : "text-neutral-500"} />
                    <span>{item.label}</span>
                  </div>
                  {item.label === "Premium" && !currentUser.premiumStatus && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                      7.99€
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#181818] space-y-2 bg-[#060606]">
          {/* Quick Shortcuts */}
          <div className="space-y-0.5">
            <Link
              href={`/${currentUser.username}`}
              target="_blank"
              className="w-full px-2.5 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-[#121212] flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <ExternalLink size={13} className="text-neutral-500" />
                <span>My Page</span>
              </div>
              <span className="text-[10px] text-neutral-600">pixel.gg/{currentUser.username}</span>
            </Link>

            <button
              onClick={handleShareProfile}
              className="w-full px-2.5 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-[#121212] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Share2 size={13} className="text-neutral-500" />
                <span>Share Your Profile</span>
              </div>
              {copiedLink ? (
                <span className="text-[10px] text-white font-bold flex items-center gap-1">
                  <Check size={10} /> Copied
                </span>
              ) : (
                <Copy size={11} className="text-neutral-600" />
              )}
            </button>

            <Link
              href="/terms"
              className="w-full px-2.5 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-[#121212] flex items-center gap-2 transition-colors"
            >
              <HelpCircle size={13} className="text-neutral-500" />
              <span>Help Center & Terms</span>
            </Link>
          </div>

          {/* User Account Info Bar & Dropdown */}
          <div className="relative pt-2 border-t border-[#141414]">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="w-full p-2 rounded-xl bg-[#101010] hover:bg-[#161616] border border-[#222222] flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  {currentUser.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span>{currentUser.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="truncate">
                  <p className="text-white font-semibold text-xs truncate">
                    {currentUser.globalName || currentUser.username}
                  </p>
                  <p className="text-neutral-500 text-[10px] truncate">
                    UID: {currentUser.id.slice(0, 10)}...
                  </p>
                </div>
              </div>
              <ChevronDown size={14} className="text-neutral-500 shrink-0" />
            </button>

            {/* Account Menu Dropdown */}
            {userDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-[#121212] border border-[#262626] rounded-xl shadow-2xl p-1.5 space-y-1 z-50">
                <div className="px-3 py-2 border-b border-[#1c1c1c] text-[10px] text-neutral-500">
                  SIGNED IN AS <br />
                  <span className="text-white font-bold text-xs">@{currentUser.username}</span>
                </div>
                <Link
                  href="/account/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="w-full px-3 py-1.5 rounded text-neutral-300 hover:text-white hover:bg-[#1a1a1a] flex items-center gap-2"
                >
                  <Settings size={13} />
                  <span>Account Settings</span>
                </Link>
                <a
                  href="/auth/logout"
                  className="w-full px-3 py-1.5 rounded text-[#ff6b6b] hover:bg-[#2a1010] flex items-center gap-2"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
