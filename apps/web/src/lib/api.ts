export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  // Check URL search params first (if returning from OAuth redirect)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem("pixel_app_token", urlToken);
    document.cookie = `pixel_app_token=${urlToken}; path=/; max-age=2592000; SameSite=Lax`;
    // Clean up URL without reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return urlToken;
  }
  return localStorage.getItem("pixel_app_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("pixel_app_token", token);
  document.cookie = `pixel_app_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pixel_app_token");
  document.cookie = "pixel_app_token=; path=/; max-age=0";
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  return fetch(input, {
    ...init,
    headers,
  });
}
