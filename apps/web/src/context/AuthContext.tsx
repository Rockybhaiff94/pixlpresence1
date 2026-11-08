"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getCachedUser,
  setCachedUser,
  clearCachedUser,
  apiFetch,
  formatAvatarUrl,
} from "@/lib/api";

export type AuthStatus =
  | "INITIALIZING"
  | "AUTHENTICATED"
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "VERIFICATION_ERROR";

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  themeId: string | null;
  accentColor: string | null;
  musicUrl: string | null;
  views: number;
  status: string;
  customStatus: string | null;
  currentGame: string | null;
  visibility: string;
  links?: any[];
  buttons?: any[];
}

export interface UserIdentity {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  banner: string | null;
  email: string | null;
  role: string;
  badges: string;
  nitroStatus: number;
  premiumStatus: boolean;
  appToken: string | null;
  createdAt: string;
  discordId?: string | null;
  profile?: UserProfile | null;
  identities?: UserIdentity[];
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  status: AuthStatus;
  loading: boolean;
  token: string | null;
  isAuthenticated: boolean;
  setUserState: (user: AuthenticatedUser | null) => void;
  login: (token: string, userData?: AuthenticatedUser) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  status: "INITIALIZING",
  loading: true,
  token: null,
  isAuthenticated: false,
  setUserState: () => {},
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with null/INITIALIZING so server and initial client render match identically (prevents React error #418)
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
  const [loading, setLoading] = useState<boolean>(true);

  const isFetchingRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCurrentUser = useCallback(async (activeToken?: string | null) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const currentToken = activeToken !== undefined ? activeToken : getStoredToken();
      if (currentToken) {
        setToken(currentToken);
      }

      // Always query /api/auth/me: credentials: "include" sends session cookies (connect.sid)
      // and Authorization header is attached if a Bearer token exists.
      const res = await apiFetch("/api/auth/me");

      if (res.ok) {
        const data = await res.json();
        data.avatar = formatAvatarUrl(data.avatar, data.discordId);
        if (data.profile) {
          data.profile.avatarUrl = formatAvatarUrl(data.profile.avatarUrl || data.avatar, data.discordId);
        }

        setUser(data);
        setProfile(data.profile || null);
        setStatus("AUTHENTICATED");
        setCachedUser(data);

        if (data.appToken) {
          setStoredToken(data.appToken);
          setToken(data.appToken);
        }
      } else if (res.status === 401) {
        // Explicit 401 Unauthorized: Only wipe if we truly have no valid stored token
        const currentToken = getStoredToken();
        if (!currentToken) {
          console.warn("[AuthContext] Backend confirmed session unauthorized (401) and no token found.");
          clearStoredToken();
          clearCachedUser();
          setUser(null);
          setProfile(null);
          setToken(null);
          setStatus("UNAUTHENTICATED");
        } else {
          console.warn("[AuthContext] Received 401 but stored token exists; preserving cached session.");
          setStatus("AUTHENTICATED");
        }
      } else {
        // Server warming up (500, 502, 503) or transient infrastructure error:
        // NEVER log the user out! Retain the cached user if available.
        console.warn(`[AuthContext] Backend returned status ${res.status}. Retaining session in VERIFICATION_ERROR.`);
        setStatus((prev) => (prev === "AUTHENTICATED" ? "AUTHENTICATED" : "VERIFICATION_ERROR"));

        // Schedule quiet background retry
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          fetchCurrentUser();
        }, 3000);
      }
    } catch (err) {
      console.error("[AuthContext] Network or gateway connection error during session check:", err);
      // On network failure, retain authenticated state if cached user is present
      setStatus((prev) => (prev === "AUTHENTICATED" ? "AUTHENTICATED" : "VERIFICATION_ERROR"));
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const setUserState = useCallback((updatedUser: AuthenticatedUser | null) => {
    if (updatedUser) {
      const currentToken = getStoredToken();
      const cached = getCachedUser();
      const mergedUser: AuthenticatedUser = {
        ...cached,
        ...updatedUser,
        appToken: updatedUser.appToken || currentToken || cached?.appToken || null,
        discordId: updatedUser.discordId || cached?.discordId || null,
      };
      mergedUser.avatar = formatAvatarUrl(mergedUser.avatar, mergedUser.discordId);
      if (mergedUser.profile) {
        mergedUser.profile.avatarUrl = formatAvatarUrl(
          mergedUser.profile.avatarUrl || mergedUser.avatar,
          mergedUser.discordId
        );
      }
      setUser(mergedUser);
      setProfile(mergedUser.profile || null);
      setCachedUser(mergedUser);
      setStatus("AUTHENTICATED");
      setLoading(false);
      if (mergedUser.appToken) {
        setStoredToken(mergedUser.appToken);
        setToken(mergedUser.appToken);
      }
    } else {
      setUser(null);
      setProfile(null);
      clearCachedUser();
      clearStoredToken();
      setToken(null);
      setStatus("UNAUTHENTICATED");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Rehydrate immediately from persistent local cache on client mount (bypasses SSR null state)
    const cached = getCachedUser();
    const storedToken = getStoredToken();
    if (cached) {
      setUser(cached);
      if (cached.profile) setProfile(cached.profile);
      setStatus("AUTHENTICATED");
      setLoading(false);
    }
    if (storedToken) {
      setToken(storedToken);
    }

    // 2. Initial fetch on mount
    fetchCurrentUser(storedToken);

    // Multi-tab synchronization: when login/logout happens in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pixel_app_token") {
        if (e.newValue) {
          fetchCurrentUser(e.newValue);
        } else {
          setUser(null);
          setProfile(null);
          setToken(null);
          clearCachedUser();
          setStatus("UNAUTHENTICATED");
        }
      } else if (e.key === "pixel_cached_user") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setUser(parsed);
            setProfile(parsed.profile || null);
            setStatus("AUTHENTICATED");
          } catch (_) {}
        }
      }
    };

    // Tab focus revalidation: quietly check session when tab regains focus (throttled to 30s)
    let lastFocusCheck = Date.now();
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusCheck > 30000) {
        lastFocusCheck = now;
        fetchCurrentUser();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchCurrentUser]);

  const login = async (newToken: string, initialUser?: AuthenticatedUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    if (initialUser) {
      initialUser.avatar = formatAvatarUrl(initialUser.avatar, initialUser.discordId);
      if (initialUser.profile) {
        initialUser.profile.avatarUrl = formatAvatarUrl(
          initialUser.profile.avatarUrl || initialUser.avatar,
          initialUser.discordId
        );
      }
      setUser(initialUser);
      setProfile(initialUser.profile || null);
      setCachedUser(initialUser);
      setStatus("AUTHENTICATED");
      setLoading(false);
    } else {
      await fetchCurrentUser(newToken);
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (_) {}

    clearStoredToken();
    clearCachedUser();
    setUser(null);
    setProfile(null);
    setToken(null);
    setStatus("UNAUTHENTICATED");

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        status,
        loading,
        token,
        isAuthenticated: Boolean(user),
        setUserState,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
