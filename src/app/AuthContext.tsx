import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../services/api";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const authContextKey = "__bolsaPracticasAuthContext__";
const globalContexts = globalThis as typeof globalThis & {
  [authContextKey]?: ReturnType<typeof createContext<AuthValue | null>>;
};

// Keep the same context identity when Vite replaces this module during development.
// Route components retained by React Router can otherwise reference the previous instance.
const AuthContext = globalContexts[authContextKey] ?? createContext<AuthValue | null>(null);
globalContexts[authContextKey] = AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getSession().then(setUser).finally(() => setLoading(false));
  }, []);
  const logout = async () => {
    await api.logout();
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return value;
}
