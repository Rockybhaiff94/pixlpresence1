import React from "react";

export interface PlatformDef {
  id: string;
  name: string;
  brandColor: string;
  placeholder: string;
  prefix: string;
  category: "social" | "streaming" | "gaming" | "music" | "payment" | "dev" | "crypto" | "other";
}

/**
 * 45-Platform Catalog mapped 1:1 to guns.lol / Nothing OS reference design
 * Organized in 4 rows of 12, 12, 12, and 9 tiles, plus Custom URL.
 */
export const PLATFORMS: PlatformDef[] = [
  // --- ROW 1 (12 Platforms) ---
  { id: "snapchat", name: "Snapchat", brandColor: "#FFFC00", placeholder: "username", prefix: "https://snapchat.com/add/", category: "social" },
  { id: "youtube", name: "YouTube", brandColor: "#FF0000", placeholder: "@channel", prefix: "https://youtube.com/@", category: "streaming" },
  { id: "discord", name: "Discord", brandColor: "#5865F2", placeholder: "invite_code or username", prefix: "https://discord.gg/", category: "social" },
  { id: "spotify", name: "Spotify", brandColor: "#1DB954", placeholder: "user_or_playlist_url", prefix: "https://open.spotify.com/user/", category: "music" },
  { id: "instagram", name: "Instagram", brandColor: "#E4405F", placeholder: "username", prefix: "https://instagram.com/", category: "social" },
  { id: "x", name: "X", brandColor: "#FFFFFF", placeholder: "handle", prefix: "https://x.com/", category: "social" },
  { id: "tiktok", name: "TikTok", brandColor: "#EE1D52", placeholder: "@username", prefix: "https://tiktok.com/@", category: "social" },
  { id: "telegram", name: "Telegram", brandColor: "#229ED9", placeholder: "username", prefix: "https://t.me/", category: "social" },
  { id: "soundcloud", name: "SoundCloud", brandColor: "#FF5500", placeholder: "artist_name", prefix: "https://soundcloud.com/", category: "music" },
  { id: "paypal", name: "PayPal", brandColor: "#00457C", placeholder: "username", prefix: "https://paypal.me/", category: "payment" },
  { id: "github", name: "GitHub", brandColor: "#FFFFFF", placeholder: "username", prefix: "https://github.com/", category: "dev" },
  { id: "roblox", name: "Roblox", brandColor: "#E2231A", placeholder: "userId or username", prefix: "https://roblox.com/users/", category: "gaming" },

  // --- ROW 2 (12 Platforms) ---
  { id: "cashapp", name: "Cash App", brandColor: "#00D632", placeholder: "$cashtag", prefix: "https://cash.app/$", category: "payment" },
  { id: "venmo", name: "Venmo", brandColor: "#008CFF", placeholder: "username", prefix: "https://venmo.com/u/", category: "payment" },
  { id: "playstation", name: "PlayStation", brandColor: "#003791", placeholder: "psn_id", prefix: "https://psnprofiles.com/", category: "gaming" },
  { id: "xbox", name: "Xbox", brandColor: "#107C10", placeholder: "gamertag", prefix: "https://account.xbox.com/profile?gamertag=", category: "gaming" },
  { id: "applemusic", name: "Apple Music", brandColor: "#FA243C", placeholder: "profile_url", prefix: "https://music.apple.com/", category: "music" },
  { id: "gitlab", name: "GitLab", brandColor: "#FC6D26", placeholder: "username", prefix: "https://gitlab.com/", category: "dev" },
  { id: "twitch", name: "Twitch", brandColor: "#9146FF", placeholder: "channel", prefix: "https://twitch.tv/", category: "streaming" },
  { id: "reddit", name: "Reddit", brandColor: "#FF4500", placeholder: "u/username", prefix: "https://reddit.com/user/", category: "social" },
  { id: "vk", name: "VK", brandColor: "#0077FF", placeholder: "id or username", prefix: "https://vk.com/", category: "social" },
  { id: "tellonym", name: "Tellonym", brandColor: "#FF4500", placeholder: "username", prefix: "https://tellonym.me/", category: "social" },
  { id: "bluesky", name: "Bluesky", brandColor: "#1185FE", placeholder: "handle.bsky.social", prefix: "https://bsky.app/profile/", category: "social" },
  { id: "namemc", name: "NameMC", brandColor: "#1D1D1D", placeholder: "username", prefix: "https://namemc.com/profile/", category: "gaming" },

  // --- ROW 3 (12 Platforms) ---
  { id: "keybase", name: "Keybase", brandColor: "#33A0FF", placeholder: "username", prefix: "https://keybase.io/", category: "dev" },
  { id: "linkedin", name: "LinkedIn", brandColor: "#0A66C2", placeholder: "in/username", prefix: "https://linkedin.com/in/", category: "social" },
  { id: "steam", name: "Steam", brandColor: "#66C0F4", placeholder: "custom_url or id", prefix: "https://steamcommunity.com/id/", category: "gaming" },
  { id: "kick", name: "Kick", brandColor: "#53FC18", placeholder: "channel", prefix: "https://kick.com/", category: "streaming" },
  { id: "pinterest", name: "Pinterest", brandColor: "#BD081C", placeholder: "username", prefix: "https://pinterest.com/", category: "social" },
  { id: "lastfm", name: "Last.fm", brandColor: "#D51007", placeholder: "username", prefix: "https://last.fm/user/", category: "music" },
  { id: "statsfm", name: "stats.fm", brandColor: "#1DB954", placeholder: "username", prefix: "https://stats.fm/", category: "music" },
  { id: "payhip", name: "Payhip", brandColor: "#4A90E2", placeholder: "username", prefix: "https://payhip.com/", category: "payment" },
  { id: "buymeacoffee", name: "Buy Me a Coffee", brandColor: "#FFDD00", placeholder: "username", prefix: "https://buymeacoffee.com/", category: "payment" },
  { id: "kofi", name: "Ko-fi", brandColor: "#FF5E5B", placeholder: "username", prefix: "https://ko-fi.com/", category: "payment" },
  { id: "facebook", name: "Facebook", brandColor: "#1877F2", placeholder: "username", prefix: "https://facebook.com/", category: "social" },
  { id: "threads", name: "Threads", brandColor: "#FFFFFF", placeholder: "@username", prefix: "https://threads.net/@", category: "social" },

  // --- ROW 4 (9 Platforms) ---
  { id: "patreon", name: "Patreon", brandColor: "#FF424D", placeholder: "creator", prefix: "https://patreon.com/", category: "payment" },
  { id: "signal", name: "Signal", brandColor: "#3A76F0", placeholder: "phone_or_username", prefix: "https://signal.me/#p/", category: "social" },
  { id: "bitcoin", name: "Bitcoin", brandColor: "#F7931A", placeholder: "bitcoin_wallet_address", prefix: "bitcoin:", category: "crypto" },
  { id: "ethereum", name: "Ethereum", brandColor: "#627EEA", placeholder: "0x_wallet_address", prefix: "ethereum:", category: "crypto" },
  { id: "litecoin", name: "Litecoin", brandColor: "#345D9D", placeholder: "L_wallet_address", prefix: "litecoin:", category: "crypto" },
  { id: "solana", name: "Solana", brandColor: "#14F195", placeholder: "sol_wallet_address", prefix: "solana:", category: "crypto" },
  { id: "xrp", name: "XRP", brandColor: "#23292F", placeholder: "ripple_wallet_address", prefix: "ripple:", category: "crypto" },
  { id: "monero", name: "Monero", brandColor: "#FF6600", placeholder: "monero_wallet_address", prefix: "monero:", category: "crypto" },
  { id: "email", name: "Email", brandColor: "#E0E0E0", placeholder: "your@email.com", prefix: "mailto:", category: "other" },

  // --- Custom Universal Link ---
  { id: "globe", name: "Custom URL", brandColor: "#FFFFFF", placeholder: "https://yourwebsite.com", prefix: "https://", category: "other" },
];

export const PLATFORM_IMAGE_MAP: Record<string, string> = {
  // Row 1
  snapchat: "/logos/transparent-png/snapchat.png",
  youtube: "/logos/transparent-png/youtube.png",
  discord: "/logos/transparent-png/discord.png",
  spotify: "/logos/transparent-png/spotify.png",
  instagram: "/logos/transparent-png/instagram.png",
  x: "/logos/transparent-png/x.png",
  twitter: "/logos/transparent-png/x.png",
  tiktok: "/logos/transparent-png/tiktok.png",
  telegram: "/logos/transparent-png/telegram.png",
  soundcloud: "/logos/transparent-png/soundcloud.png",
  paypal: "/logos/transparent-png/paypal.png",
  github: "/logos/transparent-png/github.png",
  roblox: "/logos/transparent-png/roblox.png",

  // Row 2
  cashapp: "/logos/transparent-png/cash-app.png",
  "cash-app": "/logos/transparent-png/cash-app.png",
  venmo: "/logos/transparent-png/venmo.png",
  playstation: "/logos/transparent-png/playstation.png",
  xbox: "/logos/transparent-png/xbox.png",
  applemusic: "/logos/transparent-png/apple-music.png",
  "apple-music": "/logos/transparent-png/apple-music.png",
  gitlab: "/logos/transparent-png/gitlab.png",
  twitch: "/logos/transparent-png/twitch.png",
  reddit: "/logos/transparent-png/reddit.png",
  vk: "/logos/transparent-png/vk.png",
  tellonym: "/logos/transparent-png/tellonym.png",
  bluesky: "/logos/transparent-png/bluesky.png",
  namemc: "/logos/transparent-png/unknown-dark-n-mark.png",
  "unknown-dark-n-mark": "/logos/transparent-png/unknown-dark-n-mark.png",

  // Row 3
  keybase: "/logos/transparent-png/keybase.png",
  linkedin: "/logos/transparent-png/linkedin.png",
  steam: "/logos/transparent-png/steam.png",
  kick: "/logos/transparent-png/kick.png",
  pinterest: "/logos/transparent-png/pinterest.png",
  lastfm: "/logos/transparent-png/lastfm.png",
  statsfm: "/logos/transparent-png/stats-fm.png",
  "stats-fm": "/logos/transparent-png/stats-fm.png",
  payhip: "/logos/transparent-png/payhip.png",
  buymeacoffee: "/logos/transparent-png/buy-me-a-coffee.png",
  "buy-me-a-coffee": "/logos/transparent-png/buy-me-a-coffee.png",
  kofi: "/logos/transparent-png/ko-fi.png",
  "ko-fi": "/logos/transparent-png/ko-fi.png",
  facebook: "/logos/transparent-png/facebook.png",
  threads: "/logos/transparent-png/threads.png",

  // Row 4
  patreon: "/logos/transparent-png/patreon.png",
  signal: "/logos/transparent-png/signal.png",
  bitcoin: "/logos/transparent-png/bitcoin.png",
  btc: "/logos/transparent-png/bitcoin.png",
  ethereum: "/logos/transparent-png/ethereum.png",
  eth: "/logos/transparent-png/ethereum.png",
  litecoin: "/logos/transparent-png/litecoin.png",
  ltc: "/logos/transparent-png/litecoin.png",
  solana: "/logos/transparent-png/solana.png",
  sol: "/logos/transparent-png/solana.png",
  xrp: "/logos/transparent-png/xrp.png",
  monero: "/logos/transparent-png/monero.png",
  xmr: "/logos/transparent-png/monero.png",
  email: "/logos/transparent-png/email.png",
  mail: "/logos/transparent-png/email.png",
};

export const PLATFORM_TILE_MAP: Record<string, string> = {
  snapchat: "/logos/tiles/snapchat.png",
  youtube: "/logos/tiles/youtube.png",
  discord: "/logos/tiles/discord.png",
  spotify: "/logos/tiles/spotify.png",
  instagram: "/logos/tiles/instagram.png",
  x: "/logos/tiles/x.png",
  twitter: "/logos/tiles/x.png",
  tiktok: "/logos/tiles/tiktok.png",
  telegram: "/logos/tiles/telegram.png",
  soundcloud: "/logos/tiles/soundcloud.png",
  paypal: "/logos/tiles/paypal.png",
  github: "/logos/tiles/github.png",
  roblox: "/logos/tiles/roblox.png",
  cashapp: "/logos/tiles/cashapp.png",
  "cash-app": "/logos/tiles/cashapp.png",
  venmo: "/logos/tiles/venmo.png",
  playstation: "/logos/tiles/playstation.png",
  xbox: "/logos/tiles/xbox.png",
  applemusic: "/logos/tiles/applemusic.png",
  "apple-music": "/logos/tiles/applemusic.png",
  gitlab: "/logos/tiles/gitlab.png",
  twitch: "/logos/tiles/twitch.png",
  reddit: "/logos/tiles/reddit.png",
  vk: "/logos/tiles/vk.png",
  tellonym: "/logos/tiles/tellonym.png",
  bluesky: "/logos/tiles/bluesky.png",
  namemc: "/logos/tiles/namemc.png",
  "unknown-dark-n-mark": "/logos/tiles/namemc.png",
  keybase: "/logos/tiles/keybase.png",
  linkedin: "/logos/tiles/linkedin.png",
  steam: "/logos/tiles/steam.png",
  kick: "/logos/tiles/kick.png",
  pinterest: "/logos/tiles/pinterest.png",
  lastfm: "/logos/tiles/lastfm.png",
  statsfm: "/logos/tiles/statsfm.png",
  "stats-fm": "/logos/tiles/statsfm.png",
  payhip: "/logos/tiles/payhip.png",
  buymeacoffee: "/logos/tiles/buymeacoffee.png",
  "buy-me-a-coffee": "/logos/tiles/buymeacoffee.png",
  kofi: "/logos/tiles/kofi.png",
  "ko-fi": "/logos/tiles/kofi.png",
  facebook: "/logos/tiles/facebook.png",
  threads: "/logos/tiles/threads.png",
  patreon: "/logos/tiles/patreon.png",
  signal: "/logos/tiles/signal.png",
  bitcoin: "/logos/tiles/bitcoin.png",
  btc: "/logos/tiles/bitcoin.png",
  ethereum: "/logos/tiles/ethereum.png",
  eth: "/logos/tiles/ethereum.png",
  litecoin: "/logos/tiles/litecoin.png",
  ltc: "/logos/tiles/litecoin.png",
  solana: "/logos/tiles/solana.png",
  sol: "/logos/tiles/solana.png",
  xrp: "/logos/tiles/xrp.png",
  monero: "/logos/tiles/monero.png",
  xmr: "/logos/tiles/monero.png",
  email: "/logos/tiles/email.png",
  mail: "/logos/tiles/email.png",
};

export function formatPlatformUrl(platform: PlatformDef, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("bitcoin:") ||
    trimmed.startsWith("ethereum:") ||
    trimmed.startsWith("litecoin:") ||
    trimmed.startsWith("solana:") ||
    trimmed.startsWith("ripple:") ||
    trimmed.startsWith("monero:")
  ) {
    return trimmed;
  }
  let cleanInput = trimmed;
  if (platform.prefix.includes("@") && cleanInput.startsWith("@")) {
    cleanInput = cleanInput.slice(1);
  }
  if (platform.prefix.includes("$") && cleanInput.startsWith("$")) {
    cleanInput = cleanInput.slice(1);
  }
  return `${platform.prefix}${cleanInput}`;
}

export function PlatformIcon({
  id,
  className = "w-6 h-6",
  color,
  variant = "transparent",
  alt,
}: {
  id: string;
  className?: string;
  color?: string;
  variant?: "transparent" | "tile";
  alt?: string;
}) {
  const normId = (id || "globe").toLowerCase().trim();

  // If passed a direct image URL or path
  if (normId.startsWith("http://") || normId.startsWith("https://") || normId.startsWith("/")) {
    return (
      <img
        src={normId}
        alt={alt || "icon"}
        className={`${className} object-contain inline-block shrink-0 select-none pointer-events-none`}
        loading="eager"
      />
    );
  }

  // Check tile or transparent image map
  const imageSrc =
    variant === "tile"
      ? PLATFORM_TILE_MAP[normId] || PLATFORM_IMAGE_MAP[normId]
      : PLATFORM_IMAGE_MAP[normId];

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt || id}
        className={`${className} object-contain inline-block shrink-0 select-none pointer-events-none transition-transform`}
        loading="eager"
      />
    );
  }

  // Fallback inline vector rendering
  switch (normId) {
    case "snapchat":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FFFC00"}>
          <path d="M12.012 2c-3.77 0-6.072 2.766-6.072 5.568 0 1.25.44 2.455.97 3.398.118.21.05.474-.15.617-.464.332-1.397.662-2.128.847-.29.074-.46.368-.39.658.12.5.55 1.15 1.63 1.28.17.02.3.16.31.33.05.74.45 1.7 1.69 2.06.31.09.49.4.4.71-.24.81-1.09 2.54-3.3 2.87-.3.04-.51.31-.47.61.08.57.85.96 2.08.82.72-.08 1.48-.3 2.12-.5.33-.1.69.04.87.33.64 1.05 1.67 1.68 2.92 1.68 1.26 0 2.29-.63 2.93-1.68.18-.29.54-.43.87-.33.64.2 1.4.42 2.12.5 1.23.14 2-.25 2.08-.82.04-.3-.17-.57-.47-.61-2.21-.33-3.06-2.06-3.3-2.87-.09-.31.09-.62.4-.71 1.24-.36 1.64-1.32 1.69-2.06.01-.17.14-.31.31-.33 1.08-.13 1.51-.78 1.63-1.28.07-.29-.1-.584-.39-.658-.731-.185-1.664-.515-2.128-.847-.2-.143-.268-.407-.15-.617.53-.943.97-2.148.97-3.398C18.084 4.766 15.782 2 12.012 2z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FF0000"}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "discord":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#5865F2"}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );
    case "email":
    case "mail":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "#E0E0E0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color || "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
  }
}
