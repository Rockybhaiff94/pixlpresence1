"use client";

import { useEffect } from 'react';

export function ViewTracker({ username }: { username: string }) {
  useEffect(() => {
    // Only track once per page load
    fetch(`/api/profile/u/${username}/view`, { method: 'POST' }).catch(console.error);
  }, [username]);

  return null;
}
