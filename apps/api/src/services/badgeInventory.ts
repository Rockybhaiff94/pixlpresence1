import { canUploadCustomBadges } from "./entitlements";

export interface OfficialBadgeDef {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Uncommon";
  icon: string;
  defaultColor: string;
  source?: "official" | "store" | "custom";
  imageUrl?: string;
  assetId?: string;
  isAnimated?: boolean;
}

export const OFFICIAL_BADGES: OfficialBadgeDef[] = [
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

export const PREDEFINED_BADGE_COLORS = new Set([
  "#ffffff",
  "#111116",
  "#ef4444",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
]);

export function getUserOwnedBadgeIds(user: {
  badges?: string | null;
  premiumStatus?: boolean;
  role?: string;
}): string[] {
  let ownedBadgeIds: string[] = [];
  try {
    const parsed = JSON.parse(user.badges || "[]");
    if (Array.isArray(parsed)) {
      ownedBadgeIds = parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    }
  } catch {
    ownedBadgeIds = [];
  }

  if (user.premiumStatus && !ownedBadgeIds.includes("premium")) {
    ownedBadgeIds.push("premium");
  }
  if (user.role === "ADMIN" && !ownedBadgeIds.includes("verified")) {
    ownedBadgeIds.push("verified");
  }

  return Array.from(new Set(ownedBadgeIds));
}

export interface CustomBadgeAssetRecord {
  id: string;
  fileName?: string | null;
  originalUrl: string;
  processedUrl?: string | null;
  isAnimated?: boolean;
}

export function resolveUserBadgeInventory(
  user: {
    id?: string;
    badges?: string | null;
    premiumStatus?: boolean;
    nitroStatus?: number;
    role?: string;
  },
  customAssets: CustomBadgeAssetRecord[] = []
) {
  const ownedIds = getUserOwnedBadgeIds(user);
  const ownedSet = new Set(ownedIds);
  const customEntitled = canUploadCustomBadges(user);

  const badges = OFFICIAL_BADGES.map((b) => ({
    ...b,
    source: b.source || ("official" as const),
    owned: ownedSet.has(b.id),
  }));

  // Store / Purchased badges: future integration point; never fabricate fake store items
  const storeBadges: Array<OfficialBadgeDef & { owned: boolean }> = [];

  const customBadges = customAssets.map((asset) => ({
    id: `custom:${asset.id}`,
    assetId: asset.id,
    name: asset.fileName ? asset.fileName.replace(/\.[^.]+$/, "") : "Custom Badge",
    description: asset.isAnimated ? "Animated GIF custom badge" : "Custom uploaded badge",
    category: "Custom",
    rarity: "Epic" as const,
    icon: "Image",
    defaultColor: "#ffffff",
    source: "custom" as const,
    imageUrl: asset.processedUrl || asset.originalUrl,
    isAnimated: Boolean(asset.isAnimated),
    owned: customEntitled,
  }));

  return {
    badges,
    storeBadges,
    customBadges,
    canUploadCustomBadges: customEntitled,
    ownedBadgeIds: ownedIds,
    totalCount: badges.length,
    ownedCount: badges.filter((b) => b.owned).length,
  };
}

export function validateBadgeOwnershipInDoc(
  doc: any,
  ownedBadgeIds: string[],
  isAdmin: boolean,
  ownedCustomAssets: CustomBadgeAssetRecord[] = [],
  canUseCustomBadges: boolean = false
): { valid: boolean; error?: string } {
  if (isAdmin || !doc || !Array.isArray(doc.nodes)) {
    return { valid: true };
  }

  const ownedSet = new Set(ownedBadgeIds);
  const customAssetIds = new Set(ownedCustomAssets.map((a) => a.id));
  const customAssetUrls = new Set(
    ownedCustomAssets.flatMap((a) => [a.processedUrl, a.originalUrl].filter((u): u is string => Boolean(u)))
  );

  for (const node of doc.nodes) {
    if (!node || typeof node !== "object") continue;
    const cfg = node.config || {};

    if (node.type === "name-text" && (typeof cfg.nameBadgeId === "string" || cfg.nameBadgeConfig)) {
      const badgeId = typeof cfg.nameBadgeId === "string" ? cfg.nameBadgeId.trim() : "";
      const nameCfg = cfg.nameBadgeConfig || {};
      const customUrl =
        (typeof cfg.nameBadgeCustomImageUrl === "string" && cfg.nameBadgeCustomImageUrl.trim()) ||
        (typeof nameCfg.iconUrl === "string" && nameCfg.iconUrl.trim()) ||
        "";
      const isCustom =
        cfg.nameBadgeSource === "custom" ||
        nameCfg.source === "custom" ||
        badgeId.startsWith("custom:") ||
        Boolean(customUrl);

      if (isCustom) {
        if (!canUseCustomBadges) {
          return {
            valid: false,
            error: "Custom uploaded badges require Pixel.gg Premium or an authorized staff role.",
          };
        }
        const rawAssetId =
          (typeof cfg.nameBadgeCustomAssetId === "string" && cfg.nameBadgeCustomAssetId.trim()) ||
          (typeof nameCfg.assetId === "string" && nameCfg.assetId.trim()) ||
          (badgeId.startsWith("custom:") ? badgeId.slice("custom:".length) : "");
        const ownsAsset =
          (rawAssetId && customAssetIds.has(rawAssetId)) ||
          (customUrl && customAssetUrls.has(customUrl));
        if (!ownsAsset) {
          return {
            valid: false,
            error: "You can only use custom badge assets that you uploaded.",
          };
        }
      } else if (badgeId && !ownedSet.has(badgeId)) {
        return {
          valid: false,
          error: "You can only assign badges that you own to your profile name.",
        };
      }
    }

    if (node.type === "profile-badge") {
      const badgeId = typeof cfg.badgeId === "string" ? cfg.badgeId.trim() : "";
      const isCustom =
        cfg.badgeSource === "custom" ||
        badgeId.startsWith("custom:") ||
        Boolean(cfg.badgeCustomImageUrl);

      if (isCustom) {
        if (!canUseCustomBadges) {
          return {
            valid: false,
            error: "Custom uploaded badges require Pixel.gg Premium or an authorized staff role.",
          };
        }
        const rawAssetId =
          typeof cfg.badgeCustomAssetId === "string" && cfg.badgeCustomAssetId.trim()
            ? cfg.badgeCustomAssetId.trim()
            : badgeId.startsWith("custom:")
            ? badgeId.slice("custom:".length)
            : "";
        const rawUrl = typeof cfg.badgeCustomImageUrl === "string" ? cfg.badgeCustomImageUrl.trim() : "";
        const ownsAsset =
          (rawAssetId && customAssetIds.has(rawAssetId)) ||
          (rawUrl && customAssetUrls.has(rawUrl));
        if (!ownsAsset) {
          return {
            valid: false,
            error: "You can only use custom badge assets that you uploaded.",
          };
        }
      } else if (badgeId && !ownedSet.has(badgeId)) {
        return {
          valid: false,
          error: "You can only display badges that you own on your profile.",
        };
      }
    }
  }

  return { valid: true };
}
