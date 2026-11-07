import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/effects/ViewTracker";
import { ProfileClientView } from "@/components/nothing/ProfileClientView";

function getApiUrl(): string {
  const raw = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, "");
}

// Exemplar fallback profiles matching Guns.lol architecture
const exemplarProfiles: Record<string, any> = {
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

async function getProfile(username: string) {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/profile/u/${username}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.profile) return data;
    }
  } catch {
    // Fall back to exemplar
  }

  const clean = username.toLowerCase();
  if (exemplarProfiles[clean]) {
    return exemplarProfiles[clean];
  }

  return null;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data || !data.profile) {
    notFound();
  }

  const { user, profile, richPresence } = data;

  return (
    <>
      <ViewTracker username={username} />
      <ProfileClientView
        username={user?.username || username}
        displayName={profile?.displayName || user?.username || username}
        bio={profile?.bio || null}
        avatarUrl={profile?.avatarUrl || ""}
        bannerUrl={profile?.bannerUrl || null}
        accentColor={profile?.accentColor || "#ffffff"}
        blur={profile?.blur || 0}
        opacity={profile?.opacity || 90}
        roundedCorners={profile?.roundedCorners || 20}
        views={profile?.views || 0}
        buttons={profile?.buttons || []}
        links={profile?.links || []}
        musicUrl={profile?.musicUrl || null}
        discordPresence={richPresence || null}
      />
    </>
  );
}
