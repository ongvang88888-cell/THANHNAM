import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, onMobileAuthRefreshed, setMobileRefreshToken } from "./api";
import { storageDelete, storageGet, storageSet } from "./storage";

type User = { id: string; email: string };

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const ACCESS = "edu_access";
const REFRESH = "edu_refresh";
const USER = "edu_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, r, u] = await Promise.all([
        storageGet(ACCESS),
        storageGet(REFRESH),
        storageGet(USER),
      ]);
      if (t && u) {
        setToken(t);
        setRefreshToken(r);
        setMobileRefreshToken(r);
        setUser(JSON.parse(u) as User);
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  const persist = useCallback(async (access: string, refresh: string, next: User) => {
    setToken(access);
    setRefreshToken(refresh);
    setMobileRefreshToken(refresh);
    setUser(next);
    await Promise.all([
      storageSet(ACCESS, access),
      storageSet(REFRESH, refresh),
      storageSet(USER, JSON.stringify(next)),
    ]);
  }, []);

  useEffect(() => {
    onMobileAuthRefreshed((access, refresh) => {
      setToken(access);
      setRefreshToken(refresh);
      setMobileRefreshToken(refresh);
      void storageSet(ACCESS, access);
      void storageSet(REFRESH, refresh);
    });
    return () => onMobileAuthRefreshed(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res.accessToken, res.refreshToken ?? "", res.user);
  }, [persist]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await api.register(email, password, displayName);
    await persist(res.accessToken, res.refreshToken ?? "", res.user);
  }, [persist]);

  const signOut = useCallback(async () => {
    try {
      if (refreshToken) await api.logout(refreshToken);
    } catch {
      // local clear still
    }
    setToken(null);
    setRefreshToken(null);
    setMobileRefreshToken(null);
    setUser(null);
    await Promise.all([storageDelete(ACCESS), storageDelete(REFRESH), storageDelete(USER)]);
  }, [refreshToken]);

  const value = useMemo(
    () => ({ token, refreshToken, user, ready, signIn, register, signOut }),
    [token, refreshToken, user, ready, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
