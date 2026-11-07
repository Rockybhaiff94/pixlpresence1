import React from "react";

export interface PlatformDef {
  id: string;
  name: string;
  brandColor: string;
  placeholder: string;
  prefix: string;
  category: "social" | "streaming" | "gaming" | "music" | "payment" | "dev" | "crypto" | "other";
}

export const PLATFORMS: PlatformDef[] = [
  // Row 1
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

  // Row 2
  { id: "cashapp", name: "Cash App", brandColor: "#00D632", placeholder: "$cashtag", prefix: "https://cash.app/$", category: "payment" },
  { id: "vimeo", name: "Vimeo", brandColor: "#1AB7EA", placeholder: "channel", prefix: "https://vimeo.com/", category: "streaming" },
  { id: "playstation", name: "PlayStation", brandColor: "#003791", placeholder: "psn_id", prefix: "https://psnprofiles.com/", category: "gaming" },
  { id: "xbox", name: "Xbox", brandColor: "#107C10", placeholder: "gamertag", prefix: "https://account.xbox.com/profile?gamertag=", category: "gaming" },
  { id: "applemusic", name: "Apple Music", brandColor: "#FA243C", placeholder: "profile_url", prefix: "https://music.apple.com/", category: "music" },
  { id: "gitlab", name: "GitLab", brandColor: "#FC6D26", placeholder: "username", prefix: "https://gitlab.com/", category: "dev" },
  { id: "twitch", name: "Twitch", brandColor: "#9146FF", placeholder: "channel", prefix: "https://twitch.tv/", category: "streaming" },
  { id: "reddit", name: "Reddit", brandColor: "#FF4500", placeholder: "u/username", prefix: "https://reddit.com/user/", category: "social" },
  { id: "vk", name: "VK", brandColor: "#0077FF", placeholder: "id or username", prefix: "https://vk.com/", category: "social" },
  { id: "bluesky", name: "Bluesky", brandColor: "#1185FE", placeholder: "handle.bsky.social", prefix: "https://bsky.app/profile/", category: "social" },
  { id: "notion", name: "Notion", brandColor: "#FFFFFF", placeholder: "page_url", prefix: "https://notion.so/", category: "other" },
  { id: "linkedin", name: "LinkedIn", brandColor: "#0A66C2", placeholder: "in/username", prefix: "https://linkedin.com/in/", category: "social" },

  // Row 3
  { id: "steam", name: "Steam", brandColor: "#66C0F4", placeholder: "custom_url or id", prefix: "https://steamcommunity.com/id/", category: "gaming" },
  { id: "kick", name: "Kick", brandColor: "#53FC18", placeholder: "channel", prefix: "https://kick.com/", category: "streaming" },
  { id: "pinterest", name: "Pinterest", brandColor: "#BD081C", placeholder: "username", prefix: "https://pinterest.com/", category: "social" },
  { id: "cs", name: "Counter-Strike", brandColor: "#DE9B35", placeholder: "steam_id", prefix: "https://steamcommunity.com/id/", category: "gaming" },
  { id: "facebook", name: "Facebook", brandColor: "#1877F2", placeholder: "username", prefix: "https://facebook.com/", category: "social" },
  { id: "threads", name: "Threads", brandColor: "#FFFFFF", placeholder: "@username", prefix: "https://threads.net/@", category: "social" },
  { id: "patreon", name: "Patreon", brandColor: "#FF424D", placeholder: "creator", prefix: "https://patreon.com/", category: "payment" },
  { id: "signal", name: "Signal", brandColor: "#3A76F0", placeholder: "phone_or_username", prefix: "https://signal.me/#p/", category: "social" },
  { id: "whatsapp", name: "WhatsApp", brandColor: "#25D366", placeholder: "phone_with_country_code", prefix: "https://wa.me/", category: "social" },
  { id: "medium", name: "Medium", brandColor: "#FFFFFF", placeholder: "@username", prefix: "https://medium.com/@", category: "social" },
  { id: "mastodon", name: "Mastodon", brandColor: "#6364FF", placeholder: "@user@instance", prefix: "https://mastodon.social/@", category: "social" },
  { id: "behance", name: "Behance", brandColor: "#1769FF", placeholder: "username", prefix: "https://behance.net/", category: "other" },

  // Row 4
  { id: "dribbble", name: "Dribbble", brandColor: "#EA4C89", placeholder: "username", prefix: "https://dribbble.com/", category: "other" },
  { id: "figma", name: "Figma", brandColor: "#F24E1E", placeholder: "@username", prefix: "https://figma.com/@", category: "other" },
  { id: "btc", name: "Bitcoin", brandColor: "#F7931A", placeholder: "bitcoin_wallet_address", prefix: "bitcoin:", category: "crypto" },
  { id: "eth", name: "Ethereum", brandColor: "#627EEA", placeholder: "0x_wallet_address", prefix: "ethereum:", category: "crypto" },
  { id: "ltc", name: "Litecoin", brandColor: "#345D9D", placeholder: "L_wallet_address", prefix: "litecoin:", category: "crypto" },
  { id: "sol", name: "Solana", brandColor: "#14F195", placeholder: "sol_wallet_address", prefix: "solana:", category: "crypto" },
  { id: "xmr", name: "Monero", brandColor: "#FF6600", placeholder: "monero_wallet_address", prefix: "monero:", category: "crypto" },
  { id: "email", name: "Email", brandColor: "#E0E0E0", placeholder: "your@email.com", prefix: "mailto:", category: "other" },
  { id: "globe", name: "Custom URL", brandColor: "#FFFFFF", placeholder: "https://yourwebsite.com", prefix: "https://", category: "other" },
];

export function formatPlatformUrl(platform: PlatformDef, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:") || trimmed.startsWith("bitcoin:") || trimmed.startsWith("ethereum:")) {
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

export function PlatformIcon({ id, className = "w-5 h-5", color }: { id: string; className?: string; color?: string }) {
  const normId = id?.toLowerCase() || "globe";

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
    case "spotify":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#1DB954"}>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306a.75.75 0 0 1-1.03.248c-2.825-1.727-6.381-2.118-10.569-1.162a.75.75 0 1 1-.334-1.462c4.582-1.047 8.514-.604 11.685 1.334.343.21.453.655.248 1.042zm1.467-3.26a.938.938 0 0 1-1.288.31c-3.233-1.987-8.163-2.562-11.988-1.4a.938.938 0 1 1-.544-1.794c4.372-1.328 9.8-0.686 13.51 1.596a.937.937 0 0 1 .31 1.288zm.126-3.411c-3.878-2.303-10.28-2.515-13.987-1.39a1.125 1.125 0 0 1-.652-2.154c4.254-1.291 11.31-1.043 15.776 1.609a1.125 1.125 0 1 1-1.137 1.935z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#E4405F"}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "x":
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FFFFFF"}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#EE1D52"}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case "telegram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#229ED9"}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case "soundcloud":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FF5500"}>
          <path d="M1.175 12.225c-.05.15-.075.325-.075.525 0 .225.025.4.075.55.05.125.1.25.175.325l.425.325.275-.25c.05-.15.075-.325.075-.525s-.025-.4-.075-.55c-.05-.125-.1-.25-.175-.325l-.425-.325-.275.25zm1.175-1.175c-.05.2-.075.45-.075.725s.025.525.075.725c.05.2.125.35.225.475l.475.275.325-.275c.05-.2.075-.45.075-.725s-.025-.525-.075-.725c-.05-.2-.125-.35-.225-.475l-.475-.275-.325.275zm1.3 2.875l.375-.3c.075-.225.1-.5.1-.8 0-.325-.025-.6-.1-.825-.075-.225-.175-.375-.3-.475l-.525-.275-.35.275c-.075.225-.1.5-.1.825 0 .3.025.575.1.8.075.225.175.375.3.475l.5.3zm1.325.175l.425-.325c.1-.25.15-.55.15-.925 0-.375-.05-.675-.15-.925-.1-.225-.2-.4-.35-.5l-.575-.225-.375.225c-.1.25-.15.55-.15.925 0 .375.05.675.15.925.1.225.225.4.375.5l.55.325zm1.35.15l.475-.35c.125-.275.175-.625.175-1.05s-.05-.775-.175-1.05c-.125-.275-.25-.475-.425-.575l-.65-.175-.4.175c-.125.275-.175.625-.175 1.05s.05.775.175 1.05c.125.275.25.475.425.575l.575.35zm11.7-5.95c-1.325 0-2.45.625-3.15 1.6-.4-.125-.825-.2-1.275-.2-1.95 0-3.575 1.35-4 3.175-.25-.05-.5-.075-.75-.075-.35 0-.7.05-1.025.15v6.525c.325.075.675.125 1.025.125 2.45 0 4.45-1.975 4.475-4.425.6.9 1.625 1.5 2.8 1.5 1.85 0 3.35-1.5 3.35-3.35s-1.5-3.35-3.35-3.35z" />
        </svg>
      );
    case "paypal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#00457C"}>
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.666h6.76c3.23 0 5.677 1.334 6.096 4.343.342 2.455-.838 4.298-2.73 5.405-1.115.653-2.585.992-4.148.992H8.97l-1.06 6.81a.642.642 0 0 1-.834.733z" />
        </svg>
      );
    case "github":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FFFFFF"}>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      );
    case "roblox":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#E2231A"}>
          <path d="M5.38 0L0 18.62l18.62 5.38L24 5.38 5.38 0zm7.88 13.78l-3.26-.94.94-3.26 3.26.94-.94 3.26z" />
        </svg>
      );
    case "cashapp":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#00D632"}>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.018 7.375l-1.025.992c-.365-.333-.873-.553-1.488-.553-.945 0-1.558.55-1.558 1.34 0 .848.745 1.173 1.655 1.488l.68.238c1.33.468 2.378 1.168 2.378 2.658 0 1.688-1.398 2.628-2.935 2.763v1.398h-1.45V16.3c-.975-.078-1.785-.453-2.315-.992l1.045-1.055c.42.395.992.655 1.705.655 1.048 0 1.678-.568 1.678-1.42 0-.895-.815-1.258-1.803-1.615l-.645-.228c-1.23-.435-2.265-1.125-2.265-2.585 0-1.545 1.255-2.518 2.73-2.658V5.002h1.45V6.4c.79.068 1.5.378 1.91.973z" />
        </svg>
      );
    case "twitch":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#9146FF"}>
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
        </svg>
      );
    case "reddit":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#FF4500"}>
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.56 12 8 12.56 8 13.25c0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm-5.465 3.99a.577.577 0 0 0-.41.978c.957.94 2.502 1.032 2.715 1.032.213 0 1.758-.092 2.715-1.032a.577.577 0 0 0-.82-.816c-.573.563-1.442.698-1.895.698-.453 0-1.322-.135-1.895-.698a.57.57 0 0 0-.41-.162z" />
        </svg>
      );
    case "steam":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#66C0F4"}>
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.008l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
        </svg>
      );
    case "kick":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#53FC18"}>
          <path d="M1.333 0v24h6.666v-6.667h2.667l5.334 6.667h6.667l-7.334-9.333 6.667-8H14.666L8 9.333V0H1.333z" />
        </svg>
      );
    case "btc":
    case "bitcoin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#F7931A"}>
          <path d="M23.638 14.904c-1.602 6.43-8.09 10.34-14.52 8.736C2.686 22.04-1.223 15.55.38 9.12 1.984 2.69 8.47-1.22 14.9.385c6.43 1.604 10.34 8.09 8.738 14.52zM15.82 10.7c.36-.63.29-1.57-.3-2.03-.48-.38-1.26-.45-2.26-.45V6.5h-1.2v1.65h-1.02V6.5h-1.2v1.67H7.7v1.27s.8.02.78 0c.44 0 .58.26.58.46v4.6c0 .2-.1.48-.56.48.02 0-.8.01-.8.01v1.36h2.15v1.65h1.2v-1.63h1.02v1.63h1.2v-1.67c1.99-.11 3.42-.66 3.63-2.61.17-1.57-.6-2.45-1.56-2.82zm-2.84-.96c.72 0 1.48.07 1.48.87 0 .76-.66.86-1.42.86h-1.74v-1.73h1.68zm.33 4.26c-.84 0-1.76.08-1.76-.94v-1.66h2c.87 0 1.62.13 1.62 1.05 0 .93-.72 1.55-1.86 1.55z" />
        </svg>
      );
    case "eth":
    case "ethereum":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#627EEA"}>
          <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
        </svg>
      );
    case "sol":
    case "solana":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color || "#14F195"}>
          <path d="M3.7 18.25a.8.8 0 0 1 .56-.23h15.98c.36 0 .55.43.3.68l-3.38 3.38a.8.8 0 0 1-.56.24H.62c-.36 0-.55-.44-.3-.69l3.38-3.38zm16.6-8.5a.8.8 0 0 1-.56.23H3.76a.43.43 0 0 1-.3-.68l3.38-3.38a.8.8 0 0 1 .56-.24h15.98c.36 0 .55.44.3.69l-3.38 3.38zM3.7 1.75A.8.8 0 0 1 4.26 1.5h15.98c.36 0 .55.43.3.68l-3.38 3.38a.8.8 0 0 1-.56.24H.62c-.36 0-.55-.44-.3-.69L3.7 1.75z" />
        </svg>
      );
    case "email":
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

