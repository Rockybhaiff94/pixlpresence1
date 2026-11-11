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
  tier: "FREE" | "PREMIUM" | "NITRO" | "ADMIN";
}

export function getUserCapabilities(user: {
  role?: string;
  premiumStatus?: boolean;
  nitroStatus?: number;
}): UserCapabilities {
  const isAdmin = user.role === "ADMIN";
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
      maxGifSizeBytes: 8 * 1024 * 1024,
      maxImageSizeBytes: 15 * 1024 * 1024,
      canRemoveBranding: true,
      allowRepositionLikeButton: true,
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
    maxGifSizeBytes: 5 * 1024 * 1024, // Standard 5 MB GIF upload limit
    maxImageSizeBytes: 10 * 1024 * 1024,
    canRemoveBranding: false,
    allowRepositionLikeButton: false,
    tier: "FREE",
  };
}

/**
 * Validates a profile configuration against user capabilities on save.
 */
export function validateProfileCapabilities(
  designConfig: any,
  capabilities: UserCapabilities
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
  }

  return { valid: true };
}

