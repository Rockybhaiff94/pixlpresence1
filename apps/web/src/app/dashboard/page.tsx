"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/api";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Automatically capture ?token= from URL and store in localStorage/cookies
    getStoredToken();
    router.replace("/account");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] font-mono text-xs text-neutral-500">
      REDIRECTING TO ACCOUNT OVERVIEW...
    </div>
  );
}
