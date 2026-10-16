import type { NextConfig } from "next";

function normalizeApiUrl(raw?: string): string {
  if (!raw || typeof raw !== "string") return "http://localhost:3001";
  let trimmed = raw.trim();
  if (!trimmed) return "http://localhost:3001";
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, "");
}

const apiUrl = normalizeApiUrl(process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${apiUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
