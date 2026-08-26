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
import { usePathname, useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost, getApiTokens, setApiTokens } from "./api";

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
    if (!t) return;
    void apiGet<User>("/auth/me", t)
      .then((me) => {
        const next: User = {
          id: me.id,
          email: me.email,
          displayName: me.displayName,
          roles: me.roles ?? [],
          appId: me.appId,
          emailVerifiedAt: me.emailVerifiedAt,
        };
        setUser(next);
        const pair = getApiTokens();
        persist(pair.accessToken ?? t, pair.refreshToken ?? r, next);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setToken(null);
          setRefreshToken(null);
          setUser(null);
          persist(null, null, null);
        }
      });
  }, []);

  useEffect(() => {
    function onRefresh(ev: Event) {
      const detail = (ev as CustomEvent).detail as {
        accessToken?: string;
        refreshToken?: string;
        user?: User;
      };
      if (!detail?.accessToken) return;
      setToken(detail.accessToken);
      if (detail.refreshToken) setRefreshToken(detail.refreshToken);
      if (detail.user) setUser(detail.user);
      persist(detail.accessToken, detail.refreshToken ?? refreshToken, detail.user ?? user);
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

/** Only same-origin relative paths. Reject protocol-relative and open redirects. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  return raw;
}

/** Wait for localStorage hydration before treating a missing token as logged-out. */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.token) {
      const next = safeNextPath(pathname);
      router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    }
  }, [auth.ready, auth.token, pathname, router]);

  return auth;
}

export function hasRole(user: User | null, roles: string[]) {
  return Boolean(user?.roles.some((r) => roles.includes(r) || r === "super_admin"));
}
