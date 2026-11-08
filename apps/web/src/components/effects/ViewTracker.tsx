"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem("pixel_vid");
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
    const newId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    localStorage.setItem("pixel_vid", newId);
    document.cookie = `pixel_vid=${encodeURIComponent(newId)}; path=/; max-age=31536000; SameSite=Lax`;
    return newId;
  } catch (_) {
    return "";
  }
}

export function ViewTracker({ username }: { username: string }) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!username || hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    const visitorId = getOrCreateVisitorId();

    apiFetch(`/api/profile/u/${encodeURIComponent(username)}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(visitorId ? { "x-visitor-id": visitorId } : {}),
      },
      body: JSON.stringify({ visitorId }),
    }).catch((err) => {
      console.warn("[ViewTracker] Non-fatal view ping failed:", err);
    });
  }, [username]);

  return null;
}
