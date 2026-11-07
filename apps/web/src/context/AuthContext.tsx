"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getStoredToken, setStoredToken, clearStoredToken, apiFetch } from "@/lib/api";

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
  profile?: UserProfile | null;
  identities?: UserIdentity[];
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  loading: boolean;
  token: string | null;
  login: (token: string, userData?: AuthenticatedUser) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  token: null,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (activeToken?: string | null) => {
    try {
      const currentToken = activeToken !== undefined ? activeToken : getStoredToken();
      if (!currentToken) {
        setUser(null);
        setProfile(null);
        setToken(null);
        setLoading(false);
        return;
      }

      setToken(currentToken);
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setProfile(data.profile || null);
      } else {
        // Token invalid or expired
        clearStoredToken();
        setUser(null);
        setProfile(null);
        setToken(null);
      }
    } catch (err) {
      console.error("[AuthContext] Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (newToken: string, initialUser?: AuthenticatedUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    if (initialUser) {
      setUser(initialUser);
      setProfile(initialUser.profile || null);
      setLoading(false);
    } else {
      await fetchCurrentUser(newToken);
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    setProfile(null);
    setToken(null);
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
        loading,
        token,
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
