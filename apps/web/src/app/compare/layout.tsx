import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Compare Pixel.gg vs Alternatives",
  description:
    "Compare Pixel.gg against Guns.lol, Linktree, and legacy Discord RPC tools across performance, pricing, privacy, and Studio customization.",
  path: "/compare",
  keywords: ["pixel.gg vs guns.lol", "guns.lol alternative", "discord bio link comparison"],
});

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
