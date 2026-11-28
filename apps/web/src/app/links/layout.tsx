import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Links & Buttons",
  robots: { index: false, follow: false },
};

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
