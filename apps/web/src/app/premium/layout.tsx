import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Premium — Unlock Pixel.gg Studio",
  description:
    "One-time Lifetime Premium unlock for Pixel.gg Studio custom RPC layouts, video/GIF backgrounds, verified badges, and priority features.",
  path: "/premium",
});

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
