"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, AuthResponse } from "@/types/auth";

const API_BASE = "http://localhost:8001";

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Silent Refresh on initial load with in-flight lock
  useEffect(() => {
    let isCancelled = false;

    async function restoreSession() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // sends HttpOnly refresh_token cookie
        });

        if (res.ok && !isCancelled) {
          const data = await res.json();
          setAccessToken(data.access_token);
          
          // Fetch current user details
          const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
            credentials: "include",
          });
          if (meRes.ok && !isCancelled) {
            const meData: AuthUser = await meRes.json();
            setUser(meData);
          }
        }
      } catch (err) {
        console.warn("Silent token refresh failed or no active session:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Authentication failed" };
      }

      setUser(data.user);
      setAccessToken(data.access_token);
      setIsAuthModalOpen(false);
      console.log("user: logged in", data.user.email);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const register = async (email: string, password: string, role: string = "user") => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Registration failed" };
      }

      setUser(data.user);
      setAccessToken(data.access_token);
      setIsAuthModalOpen(false);
      console.log("user: logged in", data.user.email);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: "include",
        });
      }
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      console.log("user: logged out");
      setUser(null);
      setAccessToken(null);
    }
  };

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token = accessToken;
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      let res = await fetch(url, { ...options, headers, credentials: "include" });

      // If token expired, try silent refresh once
      if (res.status === 401) {
        try {
          const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            token = data.access_token;
            setAccessToken(token);
            headers.set("Authorization", `Bearer ${token}`);
            res = await fetch(url, { ...options, headers, credentials: "include" });
          } else {
            setUser(null);
            setAccessToken(null);
          }
        } catch {
          setUser(null);
          setAccessToken(null);
        }
      }

      return res;
    },
    [accessToken]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
