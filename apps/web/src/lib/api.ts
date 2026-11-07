export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In production browser, prioritize live HTTPS API over localhost
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("https://")) {
        return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
      }
      return "https://pixlpresence1.onrender.com";
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").trim().replace(/\/+$/, "");
}

export function formatAvatarUrl(avatar: string | null | undefined, discordId?: string | null): string {
  if (!avatar || avatar.trim().length === 0) {
    if (discordId) {
      try {
        const idx = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
        return `https://cdn.discordapp.com/embed/avatars/${Math.abs(idx)}.png`;
      } catch (_) {}
    }
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  // Raw Discord 32-character avatar hash
  if (discordId) {
    const isAnimated = avatar.startsWith("a_");
    const ext = isAnimated ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=256`;
  }

  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check URL search params first (returning from OAuth redirect e.g. /account?token=xyz)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken && urlToken.trim().length > 0) {
      const cleanToken = urlToken.trim();
      setStoredToken(cleanToken);
      // Clean up URL parameter without triggering a page reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
      } catch (_) {}
      return cleanToken;
    }
  } catch (e) {
    console.warn("[getStoredToken] URL parse error:", e);
  }

  // 2. Check localStorage
  try {
    const local = localStorage.getItem("pixel_app_token");
    if (local && local.trim().length > 0) {
      return local.trim();
    }
  } catch (_) {}

  // 3. Check document.cookie fallback
  try {
    const match = document.cookie.match(/(?:^|;\s*)pixel_app_token=([^;]+)/);
    if (match && match[1]) {
      const cookieToken = decodeURIComponent(match[1]).trim();
      if (cookieToken) {
        try {
          localStorage.setItem("pixel_app_token", cookieToken);
        } catch (_) {}
        return cookieToken;
      }
    }
  } catch (_) {}

  return null;
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined" || !token) return;
  const clean = token.trim();
  try {
    localStorage.setItem("pixel_app_token", clean);
  } catch (_) {}
  try {
    const isSecure = window.location.protocol === "https:";
    document.cookie = `pixel_app_token=${encodeURIComponent(clean)}; path=/; max-age=2592000; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  } catch (_) {}
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("pixel_app_token");
  } catch (_) {}
  try {
    document.cookie = "pixel_app_token=; path=/; max-age=0; SameSite=Lax";
  } catch (_) {}
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let finalUrl = input;
  if (typeof input === "string" && input.startsWith("/api/")) {
    const baseUrl = getApiBaseUrl();
    finalUrl = `${baseUrl}${input}`;
  }

  return fetch(finalUrl, {
    ...init,
    headers,
    credentials: "include",
  });
}
