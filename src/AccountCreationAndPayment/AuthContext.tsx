import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/apiBase";

export type UserOut = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
};

type AuthState = {
  user: UserOut | null;
  token: string | null;
  loading: boolean;
};

type AuthContextType = {
  user: UserOut | null;
  token: string | null;
  loading: boolean;
  login: (opts?: { token?: string; user?: UserOut }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token"),
    loading: true,
  });

  const setAuth = (token: string | null, user: UserOut | null, loading = false) => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");

    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");

    setState({ token, user, loading });
  };

  const refresh = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ user: null, token: null, loading: false });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        setAuth(null, null, false);
        return;
      }

      const userData: UserOut = await res.json();
      setAuth(token, userData, false);
    } catch (err) {
      console.error("Auth refresh failed:", err);
      setAuth(null, null, false);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (token && rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as UserOut;
        setState({ token, user: parsed, loading: true });
      } catch {
        setState({ token, user: null, loading: true });
      }
      refresh();
    } else {
      setState({ token: null, user: null, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (opts?: { token?: string; user?: UserOut }) => {
    if (opts?.token && opts?.user) {
      setAuth(opts.token, opts.user, false);
      return;
    }
    if (opts?.token) {
      localStorage.setItem("token", opts.token);
      await refresh();
      return;
    }
    if (opts?.user) {
      const token = localStorage.getItem("token");
      setAuth(token, opts.user, false);
      return;
    }
    await refresh();
  };

  const logout = async () => {
    try {
    } catch (e) {
      console.warn("Logout request failed", e);
    } finally {
      setAuth(null, null, false);
      navigate("/signin", { replace: true });
    }
  };

  const ctxValue: AuthContextType = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
};
