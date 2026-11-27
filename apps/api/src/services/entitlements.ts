/**
 * entitlements.ts
 * Centralized, capability-based permission and premium feature architecture for Pixel.gg.
 * Configurable from server-side without hardcoding feature restrictions in frontend components.
 */

export interface UserCapabilities {
  maxEmbeds: number;
  maxCustomElements: number;
  allowCustomCss: boolean;
  allowAnimatedBorders: boolean;
  allowParticleEffects: boolean;
  allowVideoBackground: boolean;
  allowCustomFonts: boolean;
  allowHighResUploads: boolean;
  maxGifSizeBytes: number;
  maxImageSizeBytes: number;
  canRemoveBranding: boolean;
  allowRepositionLikeButton: boolean;
  allowAdvancedEffects: boolean;
  allowCustomIconDesigns: boolean;
  allowCustomRpcLayout: boolean;
  tier: "FREE" | "PREMIUM" | "NITRO" | "ADMIN";
}

export const FOUNDER_USER_ID = "cmw4fbemh0000a1sa2h3h5zzk";

export function getUserCapabilities(user: {
  id?: string;
  role?: string;
  premiumStatus?: boolean;
  nitroStatus?: number;
}): UserCapabilities {
  const isAdmin = user.role === "ADMIN" || user.id === FOUNDER_USER_ID;
  const isPremium = Boolean(user.premiumStatus);
  const isNitro = (user.nitroStatus || 0) > 0;

  if (isAdmin) {
    return {
      maxEmbeds: 50,
      maxCustomElements: 200,
      allowCustomCss: true,
      allowAnimatedBorders: true,
      allowParticleEffects: true,
      allowVideoBackground: true,
      allowCustomFonts: true,
      allowHighResUploads: true,
      maxGifSizeBytes: 10 * 1024 * 1024,
      maxImageSizeBytes: 25 * 1024 * 1024,
      canRemoveBranding: true,
      allowRepositionLikeButton: true,
      allowAdvancedEffects: true,
      allowCustomIconDesigns: true,
      allowCustomRpcLayout: true,
      tier: "ADMIN",
    };
  }

  if (isPremium || isNitro) {
    return {
      maxEmbeds: 20,
      maxCustomElements: 100,
      allowCustomCss: true,
      allowAnimatedBorders: true,
      allowParticleEffects: true,
      allowVideoBackground: true,
      allowCustomFonts: true,
      allowHighResUploads: true,
      maxGifSizeBytes: 10 * 1024 * 1024,
      maxImageSizeBytes: 15 * 1024 * 1024,
      canRemoveBranding: true,
      allowRepositionLikeButton: true,
      allowAdvancedEffects: true,
      allowCustomIconDesigns: true,
      allowCustomRpcLayout: true,
      tier: isNitro ? "NITRO" : "PREMIUM",
    };
  }

  // Standard Free Tier Capabilities
  return {
    maxEmbeds: 5,
    maxCustomElements: 30,
    allowCustomCss: true,
    allowAnimatedBorders: true,
    allowParticleEffects: true,
    allowVideoBackground: false,
    allowCustomFonts: true,
    allowHighResUploads: false,
    maxGifSizeBytes: 10 * 1024 * 1024, // 10 MB GIF background & asset limit
    maxImageSizeBytes: 10 * 1024 * 1024,
    canRemoveBranding: false,
    allowRepositionLikeButton: false,
    allowAdvancedEffects: false,
    allowCustomIconDesigns: false,
    allowCustomRpcLayout: false,
    tier: "FREE",
  };
}

export interface PermittedRpcTemplateRule {
  id: string;
  parentWidth?: number;
  parentHeight?: number;
  children?: Array<{ type: string; x: number; y: number; width: number; height: number }>;
}

const DEFAULT_FREE_RPC_TEMPLATES: Record<string, PermittedRpcTemplateRule> = {
  "rpc-tpl-default": {
    id: "rpc-tpl-default",
    parentWidth: 380,
    parentHeight: 168,
    children: [
      { type: "rpc-status", x: 16, y: 12, width: 220, height: 20 },
      { type: "rpc-timestamp", x: 244, y: 12, width: 120, height: 20 },
      { type: "rpc-icon", x: 16, y: 40, width: 72, height: 72 },
      { type: "rpc-title", x: 100, y: 42, width: 264, height: 24 },
      { type: "rpc-details", x: 100, y: 68, width: 264, height: 20 },
      { type: "rpc-state", x: 100, y: 90, width: 264, height: 20 },
      { type: "rpc-achievement", x: 16, y: 124, width: 164, height: 28 },
      { type: "rpc-buttons", x: 188, y: 124, width: 176, height: 28 },
    ],
  },
  "rpc-tpl-minimal": {
    id: "rpc-tpl-minimal",
    parentWidth: 340,
    parentHeight: 110,
    children: [
      { type: "rpc-icon", x: 14, y: 18, width: 64, height: 64 },
      { type: "rpc-status", x: 90, y: 14, width: 136, height: 18 },
      { type: "rpc-timestamp", x: 230, y: 14, width: 96, height: 18 },
      { type: "rpc-title", x: 90, y: 34, width: 236, height: 22 },
      { type: "rpc-details", x: 90, y: 58, width: 236, height: 18 },
      { type: "rpc-state", x: 90, y: 78, width: 236, height: 18 },
    ],
  },
  "rpc-tpl-compact": {
    id: "rpc-tpl-compact",
    parentWidth: 328,
    parentHeight: 94,
    children: [
      { type: "rpc-status", x: 12, y: 8, width: 190, height: 16 },
      { type: "rpc-timestamp", x: 210, y: 8, width: 106, height: 16 },
      { type: "rpc-icon", x: 12, y: 30, width: 52, height: 52 },
      { type: "rpc-title", x: 74, y: 30, width: 242, height: 18 },
      { type: "rpc-details", x: 74, y: 49, width: 242, height: 16 },
      { type: "rpc-state", x: 74, y: 67, width: 242, height: 16 },
    ],
  },
};

function validateRpcEmbedDocForFree(
  doc: any,
  permittedMap: Record<string, PermittedRpcTemplateRule>
): { valid: boolean; error?: string } {
  if (!doc || !Array.isArray(doc.nodes)) return { valid: true };
  const nodes: any[] = doc.nodes;

  const rpcEmbeds = nodes.filter(
    (n) => n && (n.type === "custom-rpc" || n.type === "custom-rpc-embed")
  );
  const rpcEmbedIds = new Set(rpcEmbeds.map((e) => e.id));

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;

    // Container video backgrounds anywhere are Premium/Admin only
    if (
      node.style &&
      (node.style.backgroundType === "video" ||
        (typeof node.style.backgroundVideo === "string" && node.style.backgroundVideo.trim()))
    ) {
      return {
        valid: false,
        error: "Video backgrounds inside containers require a Premium account.",
      };
    }

    // Loose rpc-* nodes outside a permitted custom-rpc are Premium only
    if (typeof node.type === "string" && node.type.startsWith("rpc-") && !rpcEmbedIds.has(node.parentId)) {
      return {
        valid: false,
        error: "Custom Rich Presence child elements require Premium.",
      };
    }
  }

  for (const embed of rpcEmbeds) {
    const children = nodes.filter((n) => n && n.parentId === embed.id);
    const hasCustomBg =
      (embed.style?.backgroundType &&
        embed.style.backgroundType !== "solid" &&
        embed.style.backgroundType !== "transparent") ||
      Boolean(embed.style?.backgroundImage) ||
      Boolean(embed.style?.backgroundVideo);

    if (hasCustomBg) {
      return {
        valid: false,
        error: "Custom Rich Presence container backgrounds, images, GIFs, and videos require Premium.",
      };
    }

    // Grandfather legacy pre-migration childless custom-rpc nodes that do not carry a templateId
    if (embed.type === "custom-rpc" && !embed.config?.rpcTemplateId && !embed.config?.rpcAllowEmpty && children.length === 0) {
      continue;
    }

    const tplId = typeof embed.config?.rpcTemplateId === "string" ? embed.config.rpcTemplateId : "rpc-tpl-default";
    const rule = permittedMap[tplId];
    if (!rule) {
      return {
        valid: false,
        error: "Custom or premium Rich Presence templates require a Premium subscription.",
      };
    }

    if (
      typeof rule.parentWidth === "number" &&
      typeof rule.parentHeight === "number" &&
      (Math.abs((embed.width || 0) - rule.parentWidth) > 2 || Math.abs((embed.height || 0) - rule.parentHeight) > 2)
    ) {
      return {
        valid: false,
        error: "Resizing or stretching the Custom RPC container requires Premium.",
      };
    }

    if (Array.isArray(rule.children)) {
      if (children.length !== rule.children.length) {
        return {
          valid: false,
          error: "Adding, removing, or duplicating Rich Presence child elements requires Premium.",
        };
      }
      for (const expected of rule.children) {
        const match = children.find(
          (c) =>
            c.type === expected.type &&
            Math.abs((c.x || 0) - expected.x) <= 2 &&
            Math.abs((c.y || 0) - expected.y) <= 2 &&
            Math.abs((c.width || 0) - expected.width) <= 2 &&
            Math.abs((c.height || 0) - expected.height) <= 2 &&
            c.config?.rpcDataSource !== "custom" &&
            !c.config?.rpcIsDecorative
        );
        if (!match) {
          return {
            valid: false,
            error: "Customizing, moving, or resizing child elements inside Custom RPC requires Premium.",
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Validates a profile configuration against user capabilities on save.
 */
export function validateProfileCapabilities(
  designConfig: any,
  capabilities: UserCapabilities,
  permittedGlobalRpcTemplates: PermittedRpcTemplateRule[] = []
): { valid: boolean; error?: string } {
  if (!designConfig || typeof designConfig !== "object") {
    return { valid: true };
  }

  // Validate number of embeds
  if (designConfig.canvas?.embeds && Array.isArray(designConfig.canvas.embeds)) {
    if (designConfig.canvas.embeds.length > capabilities.maxEmbeds) {
      return {
        valid: false,
        error: `Your account tier (${capabilities.tier}) allows up to ${capabilities.maxEmbeds} embeds. Upgrade to Premium for up to 20 embeds.`,
      };
    }
  }

  // Validate number of custom elements
  if (designConfig.canvas?.elements && Array.isArray(designConfig.canvas.elements)) {
    if (designConfig.canvas.elements.length > capabilities.maxCustomElements) {
      return {
        valid: false,
        error: `Your account tier (${capabilities.tier}) allows up to ${capabilities.maxCustomElements} canvas elements.`,
      };
    }

    // Validate Like button custom repositioning (Premium restriction)
    if (!capabilities.allowRepositionLikeButton) {
      const likeEl = designConfig.canvas.elements.find(
        (el: any) => el.type === "like" || el.id === "profile_like_btn"
      );
      if (likeEl && (likeEl.transform?.x !== 0 || likeEl.transform?.y !== 0)) {
        return {
          valid: false,
          error: "Custom positioning for the profile Like button is an exclusive Premium feature. Standard accounts display the Like button in the default profile action bar.",
        };
      }
    }

    // Validate Advanced Effects (Premium restriction)
    if (!capabilities.allowAdvancedEffects) {
      const hasAdvancedGlow = designConfig.canvas.elements.some(
        (el: any) => el.style?.glowType && el.style.glowType !== "basic"
      );
      const hasAdvancedAnimation = designConfig.canvas.elements.some(
        (el: any) => el.style?.animationPreset && el.style.animationPreset !== "none"
      );
      if (hasAdvancedGlow || hasAdvancedAnimation) {
        return {
          valid: false,
          error: "Animated glow and advanced animation presets are exclusive Premium features. Upgrade to Premium to save dynamic profile animations.",
        };
      }
    }

    // Validate Custom Icon Designs & Uploads (Premium restriction)
    if (!capabilities.allowCustomIconDesigns) {
      const hasCustomIcon = designConfig.canvas.elements.some(
        (el: any) => el.style?.customIconUrl || (el.style?.iconVariant && el.style.iconVariant !== "default")
      );
      if (hasCustomIcon) {
        return {
          valid: false,
          error: "Custom icon uploads and alternative icon styles are exclusive Premium features.",
        };
      }
    }
  }

  // Validate Discord RPC Custom Layout & V2 Custom Rich Presence Parent Embed (Premium restriction)
  if (!capabilities.allowCustomRpcLayout) {
    if (designConfig.discordRpc?.customLayout?.enabled) {
      return {
        valid: false,
        error: "Custom Discord Rich Presence card layouts and internal element positioning are exclusive Premium features. Standard accounts display the default Discord presentation.",
      };
    }

    const permittedMap: Record<string, PermittedRpcTemplateRule> = {
      ...DEFAULT_FREE_RPC_TEMPLATES,
    };
    for (const tpl of permittedGlobalRpcTemplates) {
      if (tpl && tpl.id) permittedMap[tpl.id] = tpl;
    }

    const draftCheck = validateRpcEmbedDocForFree(designConfig.draftProfileBuilder, permittedMap);
    if (!draftCheck.valid) return draftCheck;

    const pubCheck = validateRpcEmbedDocForFree(designConfig.profileBuilder, permittedMap);
    if (!pubCheck.valid) return pubCheck;
  }

  return { valid: true };
}

