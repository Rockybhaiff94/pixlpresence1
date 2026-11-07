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
  // Synchronous hydration from persistent cache prevents ANY login flicker across page navigation
  const [user, setUser] = useState<AuthenticatedUser | null>(() => getCachedUser());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = getCachedUser();
    return cached?.profile || null;
  });
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [status, setStatus] = useState<AuthStatus>(() => {
    return getCachedUser() ? "AUTHENTICATED" : "INITIALIZING";
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !getCachedUser();
  });

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
        // Explicit 401 Unauthorized: Session is definitely invalid/expired
        console.warn("[AuthContext] Backend confirmed session unauthorized (401).");
        clearStoredToken();
        clearCachedUser();
        setUser(null);
        setProfile(null);
        setToken(null);
        setStatus("UNAUTHENTICATED");
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
      updatedUser.avatar = formatAvatarUrl(updatedUser.avatar, updatedUser.discordId);
      if (updatedUser.profile) {
        updatedUser.profile.avatarUrl = formatAvatarUrl(
          updatedUser.profile.avatarUrl || updatedUser.avatar,
          updatedUser.discordId
        );
      }
      setUser((prev) => {
        if (
          prev &&
          prev.id === updatedUser.id &&
          prev.username === updatedUser.username &&
          prev.avatar === updatedUser.avatar &&
          prev.globalName === updatedUser.globalName
        ) {
          return prev;
        }
        return updatedUser;
      });
      setProfile((prev) => {
        if (!updatedUser.profile) return prev;
        return updatedUser.profile;
      });
      setCachedUser(updatedUser);
      setStatus("AUTHENTICATED");
      setLoading(false);
      if (updatedUser.appToken) {
        setStoredToken(updatedUser.appToken);
        setToken(updatedUser.appToken);
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
    // Initial fetch on mount
    fetchCurrentUser();

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

    // Tab focus revalidation: quietly check session when tab regains focus
    const handleFocus = () => {
      fetchCurrentUser();
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

  const logout = () => {
    clearStoredToken();
    clearCachedUser();
    setUser(null);
    setProfile(null);
    setToken(null);
    setStatus("UNAUTHENTICATED");
    apiFetch("/api/auth/logout").catch(() => {});
    if (typeof window !== "undefined") {
      window.location.href = "/login";
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
