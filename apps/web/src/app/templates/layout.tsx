import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Profile & Rich Presence Templates",
  description:
    "Browse curated digital identity and Discord Rich Presence templates for Pixel.gg Studio.",
  path: "/templates",
  keywords: ["pixel.gg templates", "discord rpc templates", "bio link themes"],
});

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
