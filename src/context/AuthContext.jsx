import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken, setToken, setUnauthorizedHandler } from "../services/api.js";
import * as auth from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    auth
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setToken(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const accept = useCallback((res) => {
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (email, password) => accept(await auth.login(email, password)),
      register: async (payload) => accept(await auth.register(payload)),
      logout: signOut,
    }),
    [user, loading, accept, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const homeFor = (role) => (role === "customer" ? "/chat" : role === "agent" ? "/agent" : "/dashboard");
