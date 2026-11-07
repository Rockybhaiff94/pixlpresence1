"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] font-mono text-xs text-neutral-500">
      REDIRECTING TO ACCOUNT OVERVIEW...
    </div>
  );
}
