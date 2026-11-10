import type { NextConfig } from "next";

const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://pixelgg-api.onrender.com"
    : "http://localhost:3001";

const apiUrl = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  defaultApiUrl
)
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
        source: "/explore",
        destination: "/#showcase",
        permanent: false,
      },
      {
        source: "/dashboard/rpc",
        destination: "/account/rpc",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/account",
        permanent: true,
      },
      {
        source: "/dashboard/bio",
        destination: "/account",
        permanent: true,
      },
      {
        source: "/dashboard/buttons",
        destination: "/links",
        permanent: true,
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
        source: "/uploads/:path*",
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
