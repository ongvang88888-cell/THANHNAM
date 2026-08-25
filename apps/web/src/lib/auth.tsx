"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiPost, setApiTokens } from "./api";

export type User = {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  appId: string;
  emailVerifiedAt?: string | null;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  ready: boolean;
  setSession: (accessToken: string, user: User, refreshToken?: string | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const ACCESS_KEY = "edu_access";
const REFRESH_KEY = "edu_refresh";
const USER_KEY = "edu_user";

function persist(access: string | null, refresh: string | null, user: User | null) {
  if (typeof window === "undefined") return;
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  else localStorage.removeItem(REFRESH_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  setApiTokens(access, refresh);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(ACCESS_KEY);
    const r = localStorage.getItem(REFRESH_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t && u) {
      setToken(t);
      setRefreshToken(r);
      setUser(JSON.parse(u) as User);
      setApiTokens(t, r);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    function onRefresh(ev: Event) {
      const detail = (ev as CustomEvent).detail as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!detail?.accessToken) return;
      setToken(detail.accessToken);
      if (detail.refreshToken) setRefreshToken(detail.refreshToken);
      persist(detail.accessToken, detail.refreshToken ?? refreshToken, user);
    }
    window.addEventListener("edu-auth-refreshed", onRefresh);
    return () => window.removeEventListener("edu-auth-refreshed", onRefresh);
  }, [refreshToken, user]);

  const setSession = useCallback((accessToken: string, nextUser: User, nextRefresh?: string | null) => {
    setToken(accessToken);
    setUser(nextUser);
    if (nextRefresh !== undefined) setRefreshToken(nextRefresh);
    persist(accessToken, nextRefresh === undefined ? refreshToken : nextRefresh, nextUser);
  }, [refreshToken]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await apiPost("/auth/logout", { refreshToken }, token);
      }
    } catch {
      // still clear local session
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    persist(null, null, null);
  }, [refreshToken, token]);

  const value = useMemo(
    () => ({ token, refreshToken, user, ready, setSession, logout }),
    [token, refreshToken, user, ready, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}

export function hasRole(user: User | null, roles: string[]) {
  return Boolean(user?.roles.some((r) => roles.includes(r) || r === "super_admin"));
}
