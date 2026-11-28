import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/premium",
          "/rpc",
          "/templates",
          "/compare",
          "/image-host",
          "/leaderboard",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/account/",
          "/admin/",
          "/customize/",
          "/editor",
          "/links",
          "/recovery",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
