import { notFound, redirect } from "next/navigation";
import { ViewTracker } from "@/components/effects/ViewTracker";
import { ProfileClientView } from "@/components/nothing/ProfileClientView";
import { ServiceWarmingView } from "@/components/nothing/ServiceWarmingView";

export const dynamic = "force-dynamic";

function getApiUrl(): string {
  const raw = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, "");
}

interface PublicProfilePayload {
  user: {
    username: string;
    discordId?: string | null;
    avatar?: string | null;
  };
  profile: {
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    accentColor?: string | null;
    blur?: number;
    opacity?: number;
    roundedCorners?: number;
    views?: number;
    likesCount?: number;
    musicUrl?: string | null;
    customCss?: string | null;
    designConfig?: string | null;
    buttons?: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      url: string;
      openInNewTab?: boolean;
      gradient?: string | null;
      order: number;
    }>;
    links?: Array<{
      id: string;
      label: string;
      url: string;
      visibility: boolean;
      order: number;
    }>;
  };
  richPresence?: {
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
  } | null;
}

// Exemplar fallback profiles matching Guns.lol architecture
const exemplarProfiles: Record<string, PublicProfilePayload> = {
  hris: {
    user: { username: "hris", discordId: "1000000000000001", avatar: null },
    profile: {
      displayName: "hris",
      bio: "guns.lol & pixel.gg lead architect // building the future of minimalist digital identity.",
      avatarUrl: "",
      accentColor: "#ffffff",
      blur: 20,
      opacity: 85,
      roundedCorners: 24,
      views: 4182900,
      musicUrl: "https://assets.guns.lol/audio/ambient.mp3",
      buttons: [
        { id: "b1", title: "DISCORD COMMUNITY", subtitle: "Join the verified network", url: "https://discord.gg/pixelgg", openInNewTab: true, order: 1 },
        { id: "b2", title: "GITHUB REPOSITORY", subtitle: "Inspect source code", url: "https://github.com/Rockybhaiff94/pixlpresence1", openInNewTab: true, order: 2 },
      ],
      links: [
        { id: "l1", label: "Discord", url: "https://discord.gg/pixelgg", visibility: true, order: 1 },
        { id: "l2", label: "GitHub", url: "https://github.com", visibility: true, order: 2 },
        { id: "l3", label: "X / Twitter", url: "https://x.com", visibility: true, order: 3 },
      ],
    },
    richPresence: {
      appName: "Visual Studio Code",
      details: "Editing Nothing OS Digital Identity",
      state: "Workspace: Pixel.gg (01)",
    },
  },
  azre: {
    user: { username: "azre", discordId: "1000000000000002", avatar: null },
    profile: {
      displayName: "azre",
      bio: "industrial 3D visual artist // aesthetic direction // monochromatic design",
      avatarUrl: "",
      accentColor: "#ffffff",
      blur: 15,
      opacity: 90,
      roundedCorners: 24,
      views: 2984100,
      musicUrl: "https://assets.guns.lol/audio/ambient.mp3",
      buttons: [
        { id: "b1", title: "BEHANCE PORTFOLIO", subtitle: "3D & Motion projects", url: "https://behance.net", openInNewTab: true, order: 1 },
      ],
      links: [
        { id: "l1", label: "ArtStation", url: "https://artstation.com", visibility: true, order: 1 },
        { id: "l2", label: "Instagram", url: "https://instagram.com", visibility: true, order: 2 },
      ],
    },
    richPresence: {
      appName: "Blender 4.2",
      details: "Rendering Glyph Interfaces",
      state: "Cycles Engine",
    },
  },
  carl: {
    user: { username: "carl", discordId: "1000000000000003", avatar: null },
    profile: {
      displayName: "Carl Pei",
      bio: "CEO Nothing // Technology made exciting again // Hardware + Software harmony.",
      avatarUrl: "",
      accentColor: "#ffffff",
      blur: 25,
      opacity: 80,
      roundedCorners: 28,
      views: 1420900,
      musicUrl: "https://assets.guns.lol/audio/ambient.mp3",
      buttons: [
        { id: "b1", title: "NOTHING OFFICIAL", subtitle: "Explore Phone (2) & Ear", url: "https://nothing.tech", openInNewTab: true, order: 1 },
      ],
      links: [
        { id: "l1", label: "X / Twitter", url: "https://x.com/getpeid", visibility: true, order: 1 },
      ],
    },
    richPresence: {
      appName: "Nothing OS Phone (2)",
      details: "Glyph Interface Active",
      state: "Mono Matrix 2.5",
    },
  },
};

type ProfileResult =
  | { kind: "ok"; data: PublicProfilePayload }
  | { kind: "not_found" }
  | { kind: "warming" };

async function getProfile(rawUsername: string): Promise<ProfileResult> {
  const clean = decodeURIComponent(rawUsername).trim().replace(/^@+/, "");
  if (!clean) return { kind: "not_found" };

  const lower = clean.toLowerCase();
  if (exemplarProfiles[lower]) {
    return { kind: "ok", data: exemplarProfiles[lower] };
  }

  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/profile/u/${encodeURIComponent(clean)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.profile) return { kind: "ok", data };
    }

    if (res.status === 404) {
      return { kind: "not_found" };
    }

    // 500, 502, 503, 504 from Render spin-up: do not disguise as 404
    return { kind: "warming" };
  } catch {
    // Network timeout or cold start
    return { kind: "warming" };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const clean = decodeURIComponent(username).trim().replace(/^@+/, "");

  // Intercept reserved keywords if accessed via root path
  if (clean.toLowerCase() === "explore") {
    redirect("/#showcase");
  }
  if (clean.toLowerCase() === "rpc") {
    redirect("/account/rpc");
  }

  const result = await getProfile(clean);

  if (result.kind === "warming") {
    return <ServiceWarmingView username={clean} />;
  }

  if (result.kind === "not_found" || !result.data || !result.data.profile) {
    notFound();
  }

  const { user, profile, richPresence } = result.data;

  return (
    <>
      <ViewTracker username={clean} />
      <ProfileClientView
        username={user?.username || clean}
        discordId={user?.discordId || null}
        displayName={profile?.displayName || user?.username || clean}
        bio={profile?.bio || null}
        avatarUrl={profile?.avatarUrl || ""}
        bannerUrl={profile?.bannerUrl || null}
        accentColor={profile?.accentColor || "#ffffff"}
        blur={profile?.blur || 0}
        opacity={profile?.opacity || 90}
        roundedCorners={profile?.roundedCorners || 20}
        views={profile?.views || 0}
        likesCount={profile?.likesCount || 0}
        buttons={profile?.buttons || []}
        links={profile?.links || []}
        musicUrl={profile?.musicUrl || null}
        discordPresence={richPresence || null}
        customCss={profile?.customCss || null}
        designConfig={profile?.designConfig || null}
      />
    </>
  );
}
