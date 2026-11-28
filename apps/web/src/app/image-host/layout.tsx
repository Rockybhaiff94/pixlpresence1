import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Image Host",
  description:
    "Fast, minimalist image, GIF, and media asset hosting for Pixel.gg profiles and Discord Rich Presence icons.",
  path: "/image-host",
});

export default function ImageHostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
