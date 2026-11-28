import React from "react";
import {
  Award,
  BadgeCheck,
  Bug,
  CheckCircle,
  Crown,
  Egg,
  Flame,
  Ghost,
  Gift,
  Globe,
  HeartHandshake,
  Image,
  Medal,
  Milestone,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Zap,
} from "lucide-react";

export interface BadgeInventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Uncommon";
  icon: string;
  defaultColor?: string;
  owned: boolean;
  source?: "official" | "store";
}

export const PREDEFINED_BADGE_COLORS: Array<{ label: string; value: string }> = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111116" },
  { label: "Red", value: "#ef4444" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Emerald", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
];

export const CLIENT_BADGE_CATALOG: Omit<BadgeInventoryItem, "owned">[] = [
  { id: "staff", name: "Staff", description: "Official Pixel.gg staff member", category: "Staff", rarity: "Legendary", icon: "Shield", defaultColor: "#ef4444" },
  { id: "helper", name: "Helper", description: "Community support & helper", category: "Staff", rarity: "Rare", icon: "HeartHandshake", defaultColor: "#38bdf8" },
  { id: "premium", name: "Premium", description: "Pixel.gg Premium subscriber", category: "Entitlement", rarity: "Epic", icon: "Crown", defaultColor: "#f59e0b" },
  { id: "verified", name: "Verified", description: "Verified authentic digital identity", category: "Identity", rarity: "Rare", icon: "CheckCircle", defaultColor: "#ffffff" },
  { id: "donor", name: "Donor", description: "Financial backer & supporter", category: "Support", rarity: "Rare", icon: "Zap", defaultColor: "#eab308" },
  { id: "gifter", name: "Gifter", description: "Generously gifted memberships to others", category: "Support", rarity: "Rare", icon: "Gift", defaultColor: "#ec4899" },
  { id: "image_host", name: "Image Host", description: "Early access image & media hosting", category: "Feature", rarity: "Uncommon", icon: "Image", defaultColor: "#a855f7" },
  { id: "domain_legend", name: "Domain Legend", description: "Connected a custom root domain", category: "Feature", rarity: "Rare", icon: "Globe", defaultColor: "#22c55e" },
  { id: "og", name: "OG", description: "Platform member since inception", category: "Special", rarity: "Legendary", icon: "Flame", defaultColor: "#f97316" },
  { id: "booster", name: "Server Booster", description: "Active Discord server booster", category: "Discord", rarity: "Rare", icon: "Sparkles", defaultColor: "#c084fc" },
  { id: "hon_gg", name: "Hon.gg", description: "Affiliated developer partner", category: "Partner", rarity: "Epic", icon: "Award", defaultColor: "#6366f1" },
  { id: "bug_hunter", name: "Bug Hunter", description: "Reported security or platform flaws", category: "Special", rarity: "Epic", icon: "Bug", defaultColor: "#10b981" },
  { id: "summer_2026", name: "Summer 2026", description: "Participant in Summer 2026 event", category: "Seasonal", rarity: "Uncommon", icon: "Sun", defaultColor: "#facc15" },
  { id: "easter_2026", name: "Easter 2026", description: "Found all hidden Easter eggs", category: "Seasonal", rarity: "Uncommon", icon: "Egg", defaultColor: "#f472b6" },
  { id: "christmas_2025", name: "Christmas 2025", description: "Holiday 2025 celebration badge", category: "Seasonal", rarity: "Uncommon", icon: "Gift", defaultColor: "#ef4444" },
  { id: "halloween_2025", name: "Halloween 2025", description: "Nightmare event 2025 badge", category: "Seasonal", rarity: "Uncommon", icon: "Ghost", defaultColor: "#fb923c" },
  { id: "the_million", name: "The Million", description: "Among first 1,000,000 profile claims", category: "Milestone", rarity: "Rare", icon: "Milestone", defaultColor: "#60a5fa" },
  { id: "winner", name: "1st Place Winner", description: "Champion of community showcase", category: "Tournament", rarity: "Legendary", icon: "Trophy", defaultColor: "#fbbf24" },
  { id: "second_place", name: "2nd Place", description: "Runner-up in community showcase", category: "Tournament", rarity: "Epic", icon: "Medal", defaultColor: "#cbd5e1" },
  { id: "third_place", name: "3rd Place", description: "Podium finisher in community showcase", category: "Tournament", rarity: "Rare", icon: "Award", defaultColor: "#d97706" },
  { id: "early_supporter", name: "Early Supporter", description: "Registered in the early beta cohort", category: "Milestone", rarity: "Epic", icon: "Star", defaultColor: "#a78bfa" },
];

export function findBadgeMeta(badgeId?: string | null): Omit<BadgeInventoryItem, "owned"> | null {
  if (!badgeId) return null;
  return CLIENT_BADGE_CATALOG.find((b) => b.id === badgeId) || null;
}

export function renderBadgeGlyph(
  iconName: string | undefined,
  size = 16,
  color?: string,
  className = ""
): React.ReactNode {
  const props = {
    size,
    className,
    style: color ? { color } : undefined,
  };
  switch (iconName) {
    case "Shield":
      return <Shield {...props} />;
    case "HeartHandshake":
      return <HeartHandshake {...props} />;
    case "Crown":
      return <Crown {...props} />;
    case "CheckCircle":
      return <BadgeCheck {...props} />;
    case "Zap":
      return <Zap {...props} />;
    case "Gift":
      return <Gift {...props} />;
    case "Image":
      return <Image {...props} />;
    case "Globe":
      return <Globe {...props} />;
    case "Flame":
      return <Flame {...props} />;
    case "Sparkles":
      return <Sparkles {...props} />;
    case "Award":
      return <Award {...props} />;
    case "Bug":
      return <Bug {...props} />;
    case "Sun":
      return <Sun {...props} />;
    case "Egg":
      return <Egg {...props} />;
    case "Ghost":
      return <Ghost {...props} />;
    case "Milestone":
      return <Milestone {...props} />;
    case "Trophy":
      return <Trophy {...props} />;
    case "Medal":
      return <Medal {...props} />;
    case "Star":
      return <Star {...props} />;
    default:
      return <CheckCircle {...props} />;
  }
}
