import type { NextConfig } from "next";

const apiUrl = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001")
  .trim()
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/auth/discord",
        destination: `${apiUrl}/auth/discord`,
        permanent: false,
      },
      {
        source: "/auth/google",
        destination: `${apiUrl}/auth/google`,
        permanent: false,
      },
      {
        source: "/dashboard/customize",
        destination: "/customize",
        permanent: true,
      },
      {
        source: "/dashboard/socials",
        destination: "/links",
        permanent: true,
      },
      {
        source: "/dashboard/templates",
        destination: "/templates",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/health",
        destination: `${apiUrl}/health`,
      },
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
