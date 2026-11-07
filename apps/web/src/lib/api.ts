export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "https://pixlpresence1.onrender.com";
    }
  }
  return "http://localhost:3001";
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
