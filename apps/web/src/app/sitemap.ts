import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/rpc", changeFrequency: "weekly", priority: 0.9 },
    { path: "/templates", changeFrequency: "daily", priority: 0.9 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.85 },
    { path: "/premium", changeFrequency: "weekly", priority: 0.8 },
    { path: "/compare", changeFrequency: "monthly", priority: 0.8 },
    { path: "/image-host", changeFrequency: "weekly", priority: 0.75 },
    { path: "/leaderboard", changeFrequency: "daily", priority: 0.75 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ];

  const exemplarProfiles = ["hris", "azre", "carl"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...exemplarProfiles.map((username) => ({
      url: `${siteUrl}/${username}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
}
