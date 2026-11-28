import type { Metadata } from "next";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "https://pixel.gg";
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const SITE_NAME = "Pixel.gg";
export const DEFAULT_TITLE = "Pixel.gg — Digital Identity & Discord Rich Presence Platform";
export const DEFAULT_DESCRIPTION =
  "Build a minimalist digital identity bio page with live Discord Rich Presence (PixelsRPC), custom Studio layouts, audio players, and zero-cookie analytics.";

export const DEFAULT_KEYWORDS = [
  "pixel.gg",
  "discord rich presence",
  "pixelsrpc",
  "bio link",
  "digital identity",
  "discord profile",
  "vencord rpc",
  "link in bio",
  "guns.lol alternative",
  "custom discord status",
];

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  keywords?: string[];
  image?: string;
}

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  keywords,
  image = "/icon-512.png",
}: PageMetadataOptions): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: image, width: 512, height: 512, alt: `${SITE_NAME} — ${title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}
