/**
 * Pixel.gg Studio: Social Media & Linked Accounts Engine
 * Single Source of Truth integration with existing Account Linking system (/links)
 */

import { CanvasElement, CanvasTransform } from "@/types/studio";
import { PLATFORMS, PlatformDef, formatPlatformUrl } from "@/components/links/PlatformIcons";

export interface LinkedAccountReference {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
  color?: string | null;
  visibility: boolean;
  order?: number;
}

/**
 * Sanitizes external redirect URLs to prevent XSS / malicious schemes.
 * Only allows https://, http://, and mailto:.
 */
export function sanitizeSocialUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "#";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }
  // If protocol-less domain like "github.com/user"
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return "#";
}

/**
 * Extracts a readable clean handle/username from a social profile URL.
 */
export function extractSocialHandle(
  url: string,
  platformId?: string | null,
  fallbackLabel?: string
): string {
  if (!url) return fallbackLabel || "User";
  const cleanUrl = url.trim().replace(/\/$/, "");

  // Match known platform URL patterns
  try {
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    const pathname = parsed.pathname;

    if (platformId === "youtube" || cleanUrl.includes("youtube.com")) {
      const match = pathname.match(/@([^/?#]+)/);
      if (match) return `@${match[1]}`;
    }

    if (
      platformId === "twitter" ||
      platformId === "x" ||
      cleanUrl.includes("twitter.com") ||
      cleanUrl.includes("x.com")
    ) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return `@${parts[0]}`;
    }

    if (platformId === "instagram" || cleanUrl.includes("instagram.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return `@${parts[0]}`;
    }

    if (platformId === "tiktok" || cleanUrl.includes("tiktok.com")) {
      const match = pathname.match(/@([^/?#]+)/);
      if (match) return `@${match[1]}`;
    }

    if (platformId === "github" || cleanUrl.includes("github.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }

    if (platformId === "twitch" || cleanUrl.includes("twitch.tv")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }

    if (platformId === "kick" || cleanUrl.includes("kick.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }

    if (platformId === "reddit" || cleanUrl.includes("reddit.com")) {
      const match = pathname.match(/user\/([^/?#]+)/);
      if (match) return `u/${match[1]}`;
    }

    // Default to last path segment or label
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      if (last.length <= 30 && !last.includes(".php") && !last.includes(".html")) {
        return last;
      }
    }
  } catch {
    // If invalid URL structure, fallback
  }

  return fallbackLabel || "Profile";
}

/**
 * Resolves platform definition from an account icon or label.
 */
export function resolvePlatformDef(iconOrId?: string | null, label?: string): PlatformDef {
  const query = (iconOrId || label || "").toLowerCase().trim();
  const matched =
    PLATFORMS.find((p) => p.id === query) ||
    PLATFORMS.find((p) => p.name.toLowerCase() === query) ||
    PLATFORMS.find((p) => p.id === "globe") ||
    PLATFORMS[PLATFORMS.length - 1];
  return matched;
}

/**
 * Checks if a canvas element is a social media component.
 */
export function isSocialElement(el: CanvasElement | null | undefined): boolean {
  if (!el) return false;
  return el.type === "socialIcon" || el.type === "socials" || el.type === "linkedAccount";
}

/**
 * Verifies if a canvas social element's bound link is still valid in the user's active linked accounts.
 */
export function isLinkedAccountActive(
  element: CanvasElement,
  activeLinks: LinkedAccountReference[]
): boolean {
  const linkId = element.props?.linkId;
  if (!linkId) return true; // generic social without specific ID bound
  return activeLinks.some((l) => l.id === linkId);
}

/**
 * Smart Arrangement: Arranges multiple social icon elements in a horizontal row,
 * distributing spacing evenly and centering within the parent embed.
 */
export function arrangeSocialElementsHorizontally(
  socialElements: CanvasElement[],
  parentWidth: number = 520,
  gap: number = 12
): CanvasElement[] {
  if (socialElements.length === 0) return socialElements;

  const totalWidth = socialElements.reduce((sum, el) => sum + (el.transform.width || 44), 0);
  const totalGaps = (socialElements.length - 1) * gap;
  const startX = Math.max(0, (parentWidth - (totalWidth + totalGaps)) / 2);

  let currentX = startX;
  const sharedY = socialElements[0].transform.y;

  return socialElements.map((el) => {
    const updated: CanvasElement = {
      ...el,
      transform: {
        ...el.transform,
        x: Math.round(currentX),
        y: Math.round(sharedY),
      },
    };
    currentX += (el.transform.width || 44) + gap;
    return updated;
  });
}

/**
 * Smart Arrangement: Arranges multiple social icon elements in a vertical column,
 * aligning them along their shared horizontal center line.
 */
export function arrangeSocialElementsVertically(
  socialElements: CanvasElement[],
  gap: number = 10
): CanvasElement[] {
  if (socialElements.length === 0) return socialElements;

  const sharedX = socialElements[0].transform.x;
  let currentY = socialElements[0].transform.y;

  return socialElements.map((el) => {
    const updated: CanvasElement = {
      ...el,
      transform: {
        ...el.transform,
        x: Math.round(sharedX),
        y: Math.round(currentY),
      },
    };
    currentY += (el.transform.height || 44) + gap;
    return updated;
  });
}

/**
 * Smart Arrangement: Centers a group of social elements horizontally within parent embed.
 */
export function centerSocialElements(
  socialElements: CanvasElement[],
  parentWidth: number = 520
): CanvasElement[] {
  if (socialElements.length === 0) return socialElements;

  // Find bounding box
  const minX = Math.min(...socialElements.map((el) => el.transform.x));
  const maxX = Math.max(...socialElements.map((el) => el.transform.x + el.transform.width));
  const boundingWidth = maxX - minX;

  const targetStartX = Math.max(0, (parentWidth - boundingWidth) / 2);
  const deltaX = targetStartX - minX;

  return socialElements.map((el) => ({
    ...el,
    transform: {
      ...el.transform,
      x: Math.round(el.transform.x + deltaX),
    },
  }));
}

