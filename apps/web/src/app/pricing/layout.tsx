import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing — Free & Lifetime Premium",
  description:
    "Start free with custom bio links and PixelsRPC, or upgrade once to Lifetime Premium for Studio embeds, video backgrounds, and extra aliases.",
  path: "/pricing",
  keywords: ["pixel.gg pricing", "lifetime bio link premium", "discord rpc premium"],
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
