import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Recovery",
  robots: { index: false, follow: false },
};

export default function RecoveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
