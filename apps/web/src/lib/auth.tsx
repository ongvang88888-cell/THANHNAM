"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type User = {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  appId: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("edu_access");
    const u = localStorage.getItem("edu_user");
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u) as User);
    }
  }, []);

  const setSession = (t: string, u: User) => {
    localStorage.setItem("edu_access", t);
    localStorage.setItem("edu_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("edu_access");
    localStorage.removeItem("edu_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
