import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "PixelsRPC — Native Discord Rich Presence",
  description:
    "Configure live Discord Rich Presence with Playing, Streaming, Listening, and Watching modes via the lightweight PixelsRPC Vencord plugin.",
  path: "/rpc",
  keywords: [
    "discord rich presence",
    "pixelsrpc",
    "vencord rpc plugin",
    "custom discord status",
  ],
});

export default function RpcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
