"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Disc,
  Heart,
} from "lucide-react";
import { io } from "socket.io-client";
import { getApiBaseUrl, apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ProfileDesignConfig, DEFAULT_DESIGN_CONFIG } from "@/types/studio";
import { StudioProfilePreview } from "@/components/studio/StudioProfilePreview";
import { computeBaseBackgroundStyle } from "@/components/studio/cssUtils";
import { ProfileBuilderRenderer } from "@/components/profile-builder/ProfileBuilderRenderer";
import { ProfileBuilderDocument } from "@/components/profile-builder/profileBuilderTypes";
import { ensureFreeTierClaimProfileNode } from "@/components/profile-builder/componentRegistry";

interface ProfileButton {
  id: string;
  url: string;
  title: string;
  subtitle?: string | null;
  openInNewTab?: boolean;
  order: number;
  gradient?: string | null;
}

interface ProfileLink {
  id: string;
  url: string;
  label: string;
  visibility: boolean;
  order: number;
}

interface ProfileClientProps {
  username: string;
  discordId?: string | null;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  bannerUrl?: string | null;
  accentColor?: string | null;
  blur?: number;
  opacity?: number;
  roundedCorners?: number;
  views: number;
  likesCount?: number;
  buttons: ProfileButton[];
  links: ProfileLink[];
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  discordPresence?: any | null;
  customCss?: string | null;
  designConfig?: string | null;
  isPremium?: boolean;
}

export const ProfileClientView: React.FC<ProfileClientProps> = ({
  username,
  discordId,
  displayName,
  bio,
  avatarUrl,
  bannerUrl,
  accentColor = "#ffffff",
  blur = 0,
  opacity = 90,
  roundedCorners = 20,
  views,
  likesCount = 0,
  buttons = [],
  links = [],
  musicUrl,
  musicTitle = "Nothing Soundscape (01)",
  musicArtist = "Ambient Audio",
  discordPresence,
  customCss,
  designConfig,
  isPremium = false,
}) => {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [viewportDevice, setViewportDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const updateDevice = () => {
      const w = window.innerWidth;
      setViewportDevice(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    const rafId = window.requestAnimationFrame(updateDevice);
    window.addEventListener("resize", updateDevice);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDevice);
    };
  }, []);

  // Database-backed Like state
  const [likes, setLikes] = useState<number>(likesCount);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/profile/u/${encodeURIComponent(username)}/like`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          if (typeof data.likesCount === "number") setLikes(data.likesCount);
          if (typeof data.hasLiked === "boolean") setHasLiked(data.hasLiked);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [username]);

  const handleToggleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      const res = await apiFetch(`/api/profile/u/${encodeURIComponent(username)}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likesCount);
        setHasLiked(data.liked);
      }
    } catch (_) {
      // Ignore
    } finally {
      setIsLiking(false);
    }
  };

  // Live Discord Rich Presence state management with real-time websocket and anti-race ordering
  const [livePresence, setLivePresence] = useState<any>(discordPresence || null);
  const lastSequenceRef = useRef<number>(0);
  const lastUpdatedRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    const socketUrl = getApiBaseUrl();
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    const handlePresenceUpdate = (data: any) => {
      if (!isMounted || !data) return;

      // Prevent race conditions: Ignore outdated presence packets
      if (data.sequence !== undefined && data.sequence < lastSequenceRef.current) {
        return;
      }
      if (data.updatedAt !== undefined && data.updatedAt < lastUpdatedRef.current) {
        return;
      }

      lastSequenceRef.current = data.sequence || lastSequenceRef.current;
      lastUpdatedRef.current = data.updatedAt || Date.now();

      if (data.hasActivity && data.activity && data.status !== "offline") {
        setLivePresence((prev: any) => ({
          ...data.activity,
          streaks: data.activity.streaks ?? prev?.streaks ?? discordPresence?.streaks,
          statistics: data.activity.statistics ?? prev?.statistics ?? discordPresence?.statistics,
          statusLabels: data.activity.statusLabels ?? prev?.statusLabels ?? discordPresence?.statusLabels,
          status: data.status,
          hasActivity: true,
        }));
      } else {
        // User closed game, went offline, or is idle without activity
        setLivePresence({
          status: data.status || "offline",
          hasActivity: false,
          appName: null,
          details: null,
          state: null,
          largeImage: null,
          smallImage: null,
          timestamps: null,
          startTimestamp: null,
          endTimestamp: null,
          party: null,
          buttons: null,
          streaks: null,
          statistics: null,
        });
      }
    };

    socket.on("connect", () => {
      socket.emit("subscribe_profile", { username, discordId });
    });

    socket.on("presence_sync", handlePresenceUpdate);
    socket.on("presence_update", handlePresenceUpdate);
    socket.on("profile_like_updated", (payload: { likesCount?: number }) => {
      if (isMounted && typeof payload?.likesCount === "number") {
        setLikes(Math.max(0, payload.likesCount));
      }
    });
    socket.on("profile_updated", () => {
      if (isMounted) {
        router.refresh();
      }
    });

    // Fallback polling every 6 seconds when socket is not connected
    const pollInterval = setInterval(async () => {
      if (!socket.connected && isMounted) {
        try {
          const res = await apiFetch(`/api/profile/u/${encodeURIComponent(username)}/presence`, {
            cache: "no-store",
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.presence) {
              handlePresenceUpdate(json.presence);
            }
          }
        } catch (_) {}
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      socket.emit("unsubscribe_profile", { username, discordId });
      socket.disconnect();
    };
  }, [username, discordId, router]);

  // Compute Active Studio Configuration with Full Legacy Backward Compatibility
  const activeConfig: ProfileDesignConfig = React.useMemo(() => {
    let base = { ...DEFAULT_DESIGN_CONFIG };
    if (designConfig) {
      try {
        const parsed = typeof designConfig === "string" ? JSON.parse(designConfig) : designConfig;
        if (parsed && typeof parsed === "object") {
          base = {
            ...DEFAULT_DESIGN_CONFIG,
            ...parsed,
            layout: { ...DEFAULT_DESIGN_CONFIG.layout, ...(parsed.layout || {}) },
            identity: { ...DEFAULT_DESIGN_CONFIG.identity, ...(parsed.identity || {}) },
            avatar: { ...DEFAULT_DESIGN_CONFIG.avatar, ...(parsed.avatar || {}) },
            background: { ...DEFAULT_DESIGN_CONFIG.background, ...(parsed.background || {}) },
            typography: { ...DEFAULT_DESIGN_CONFIG.typography, ...(parsed.typography || {}) },
            discordRpc: { ...DEFAULT_DESIGN_CONFIG.discordRpc, ...(parsed.discordRpc || {}) },
            buttons: { ...DEFAULT_DESIGN_CONFIG.buttons, ...(parsed.buttons || {}) },
            socials: { ...DEFAULT_DESIGN_CONFIG.socials, ...(parsed.socials || {}) },
            effects: { ...DEFAULT_DESIGN_CONFIG.effects, ...(parsed.effects || {}) },
            advanced: { ...DEFAULT_DESIGN_CONFIG.advanced, ...(parsed.advanced || {}) },
            canvas: parsed.canvas || DEFAULT_DESIGN_CONFIG.canvas,
          };
        }
      } catch {
        // Fallback to default
      }
    } else {
      // Seamlessly map classic parameters into modern studio design tokens
      base = {
        ...DEFAULT_DESIGN_CONFIG,
        identity: {
          ...DEFAULT_DESIGN_CONFIG.identity,
          titleColor: accentColor || "#ffffff",
        },
        avatar: {
          ...DEFAULT_DESIGN_CONFIG.avatar,
          shape: (roundedCorners || 20) > 25 ? "circle" : "rounded",
          borderColor: accentColor || "#ffffff",
        },
        background: {
          ...DEFAULT_DESIGN_CONFIG.background,
          imageUrl: bannerUrl || undefined,
          type: bannerUrl ? "image" : "solid",
        },
        effects: {
          ...DEFAULT_DESIGN_CONFIG.effects,
          blur: blur ?? 10,
          opacity: opacity ?? 90,
          glowColor: accentColor || "#ffffff",
        },
        discordRpc: {
          ...DEFAULT_DESIGN_CONFIG.discordRpc,
          borderRadius: roundedCorners || 16,
        },
      };
    }

    if (customCss) {
      base.customCss = customCss;
    }
    return base;
  }, [designConfig, customCss, accentColor, bannerUrl, blur, opacity, roundedCorners]);

  const baseBgStyle = React.useMemo(() => {
    return computeBaseBackgroundStyle(
      activeConfig.background,
      activeConfig.identity?.titleColor,
      activeConfig.effects?.glowColor
    );
  }, [activeConfig.background, activeConfig.identity?.titleColor, activeConfig.effects?.glowColor]);

  const handleEnterScreen = () => {
    if (entered) return;
    setEntered(true);
    if (musicUrl && audioRef.current) {
      audioRef.current.volume = 0.8;
      audioRef.current
        .play()
        .catch(() => {
          // Browser audio autoplay policy
        });
    }
    // Start background video directly inside the user click gesture for reliable unmuted playback
    const bgVid = globalThis.document?.querySelector<HTMLVideoElement>(
      '[data-testid="public-bg-video"]'
    );
    if (bgVid) {
      bgVid.muted = false;
      bgVid.play().catch(() => {
        bgVid.muted = true;
        bgVid.play().catch(() => {});
      });
    }
  };

  const parsedProfileBuilderDoc: ProfileBuilderDocument | null = React.useMemo(() => {
    if (!designConfig) return null;
    try {
      const parsed = typeof designConfig === "string" ? JSON.parse(designConfig) : designConfig;
      if (parsed?.profileBuilder?.version === "2.0" && Array.isArray(parsed.profileBuilder.nodes)) {
        return parsed.profileBuilder as ProfileBuilderDocument;
      }
      if (
        parsed?.isPublished !== false &&
        parsed?.draftProfileBuilder?.version === "2.0" &&
        Array.isArray(parsed.draftProfileBuilder.nodes)
      ) {
        return parsed.draftProfileBuilder as ProfileBuilderDocument;
      }
    } catch {
      // ignore invalid legacy config
    }
    return null;
  }, [designConfig]);

  const effectiveProfileBuilderDoc = React.useMemo(
    () =>
      parsedProfileBuilderDoc
        ? ensureFreeTierClaimProfileNode(parsedProfileBuilderDoc, isPremium)
        : null,
    [parsedProfileBuilderDoc, isPremium]
  );

  const hasActiveEmbeds = Boolean(
    effectiveProfileBuilderDoc ||
    (activeConfig.canvas &&
      Array.isArray(activeConfig.canvas.embeds) &&
      activeConfig.canvas.embeds.length > 0)
  );

  const hasEntryScreen = Boolean(
    hasActiveEmbeds &&
      (effectiveProfileBuilderDoc ? effectiveProfileBuilderDoc.canvas?.entryScreenEnabled !== false : Boolean(musicUrl))
  );
  const entryPromptText =
    effectiveProfileBuilderDoc?.canvas?.entryScreenText?.trim() ||
    (musicUrl
      ? "[ CLICK ANYWHERE TO INITIALIZE AUDIO & PROFILE ]"
      : "[ CLICK ANYWHERE TO ENTER PROFILE ]");

  return (
    <div
      className="min-h-screen text-[#ededed] font-mono relative overflow-x-hidden flex flex-col justify-between selection:bg-white selection:text-black"
      style={hasActiveEmbeds ? baseBgStyle : { backgroundColor: "#070707" }}
    >
      {/* Hidden Audio Element */}
      {hasActiveEmbeds && musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop
          preload="auto"
        />
      )}

      {/* Intro Barrier (Click to Enter) with AnimatePresence - Guns.lol style Entry Screen */}
      <AnimatePresence>
        {hasEntryScreen && !entered && (
          <motion.div
            key="intro-barrier"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={handleEnterScreen}
            data-testid="public-entry-screen"
            className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center cursor-pointer nt-dot-grid p-6 text-center select-none overflow-hidden"
          >
            {/* Subtle Pixel.gg radial ambient vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255,255,255,0.045) 0%, rgba(5,5,5,0) 62%)",
              }}
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative z-10 space-y-5 max-w-md w-full px-4"
            >
              <div className="w-14 h-14 rounded-full border border-white/15 bg-[#0d0d11]/90 flex items-center justify-center mx-auto text-white shadow-[0_0_30px_rgba(255,255,255,0.06)] ring-1 ring-white/5">
                <Disc size={22} className="animate-spin text-neutral-200" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-neutral-500 uppercase tracking-[0.22em] block">
                  [ INITIALIZE DIGITAL IDENTITY ]
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
                  @{username}
                </h2>
              </div>

              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterScreen();
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                data-testid="public-enter-profile-btn"
                className="text-xs text-neutral-200 hover:text-white font-mono tracking-wider cursor-pointer px-5 py-2.5 rounded-full border border-white/15 hover:border-white/30 bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-md transition-all shadow-lg"
              >
                {entryPromptText}
              </motion.button>

              <div className="pt-3 text-[10px] tracking-[0.16em] text-neutral-600 uppercase">
                PIXLS.IN STUDIO &bull; PROFILE ENGINE
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Profile Layout — Rendered via Profile Builder V2, Legacy Studio Engine, or Clean Blank Slate */}
      <div className="w-full min-h-screen flex-1 flex flex-col items-center justify-between relative z-10">
        {effectiveProfileBuilderDoc ? (
          <div className="w-full h-screen min-h-screen overflow-hidden flex flex-col">
            <ProfileBuilderRenderer
              document={effectiveProfileBuilderDoc}
              deviceMode={viewportDevice}
              isInteractive={false}
              initialVideoMuted={hasEntryScreen && !entered}
              videoPlaybackEnabled={!hasEntryScreen || entered}
              likeState={{
                count: likes,
                liked: hasLiked,
                isLiking,
                onToggle: handleToggleLike,
              }}
              liveData={{
                discordId,
                username,
                displayName,
                bio,
                avatarUrl,
                bannerUrl,
                musicUrl,
                musicTitle,
                musicArtist,
                views,
                discordPresence: livePresence,
              }}
            />
          </div>
        ) : hasActiveEmbeds ? (
          <StudioProfilePreview
            config={activeConfig}
            data={{
              username,
              displayName,
              bio,
              avatarUrl,
              bannerUrl,
              musicUrl,
              musicTitle,
              musicArtist,
              views,
              likes,
              buttons,
              links,
              discordPresence: livePresence,
              isPremium,
            }}
            isInteractiveEditor={false}
            isPremium={isPremium}
            scopeId="profile-page-root"
            footerSlot={
              <div className="w-full max-w-5xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono pointer-events-auto">
                {/* Subtle Transparent Likes Pill */}
                <button
                  onClick={handleToggleLike}
                  disabled={isLiking}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-sm ${
                    hasLiked
                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                      : "bg-black/30 hover:bg-black/50 border border-white/10 hover:border-white/25 text-white/80 hover:text-white"
                  }`}
                  title={hasLiked ? "Unlike profile" : "Like profile"}
                >
                  <Heart
                    size={12}
                    className={`transition-transform group-hover:scale-110 ${
                      hasLiked ? "fill-rose-500 text-rose-500" : "text-white/70 group-hover:text-white"
                    }`}
                  />
                  <span className="font-semibold tracking-tight">{likes.toLocaleString()}</span>
                </button>

                {/* Minimal Claim Profile Text Link */}
                <Link
                  href="/register"
                  className="text-white/60 hover:text-white px-2.5 py-1 rounded-md backdrop-blur-sm bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/20 transition-all text-[11px] tracking-wide"
                >
                  CLAIM YOUR OWN PROFILE ↗
                </Link>
              </div>
            }
          />
        ) : (
          <div className="w-full min-h-screen flex-1 flex flex-col items-center justify-between p-6">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400 shadow-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              </div>
              <div className="space-y-1">
                <h1 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  @{username}
                </h1>
                <p className="text-xs text-neutral-500 font-mono">
                  Profile in clean blank state.
                </p>
              </div>
            </div>

            {/* Clean Blank Slate Minimal Footer */}
            <div className="w-full max-w-5xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono pointer-events-auto">
              <button
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-sm ${
                  hasLiked
                    ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                    : "bg-black/30 hover:bg-black/50 border border-white/10 hover:border-white/25 text-white/80 hover:text-white"
                }`}
                title={hasLiked ? "Unlike profile" : "Like profile"}
              >
                <Heart
                  size={12}
                  className={`transition-transform group-hover:scale-110 ${
                    hasLiked ? "fill-rose-500 text-rose-500" : "text-white/70 group-hover:text-white"
                  }`}
                />
                <span className="font-semibold tracking-tight">{likes.toLocaleString()}</span>
              </button>

              <Link
                href="/register"
                className="text-white/60 hover:text-white px-2.5 py-1 rounded-md backdrop-blur-sm bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/20 transition-all text-[11px] tracking-wide"
              >
                CLAIM YOUR OWN PROFILE ↗
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
