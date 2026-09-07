"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@openmonitor/api-client";
import { apiClient, getTokens, setTokens } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const tokens = getTokens();
    if (!tokens?.refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiClient.users.me();
      setUser(me);
    } catch {
      setTokens(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.auth.login({ email, password });
    setTokens(res.tokens);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await apiClient.auth.register({ email, username, password });
    setTokens(res.tokens);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      await apiClient.auth.logout(tokens.refreshToken).catch(() => undefined);
    }
    setTokens(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
