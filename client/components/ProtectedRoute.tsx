"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Layers } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div suppressHydrationWarning className="min-h-screen flex flex-col items-center justify-center text-[var(--foreground)]">
        <div suppressHydrationWarning className="flex flex-col items-center gap-4 p-8 rounded-3xl liquid-glass-elevated">
          <div
            suppressHydrationWarning
            className="w-12 h-12 rounded-2xl flex items-center justify-center p-1"
            style={{ background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }}
          >
            <Layers className="w-6 h-6" />
          </div>
          <div suppressHydrationWarning className="flex items-center gap-2.5 text-xs font-mono text-[var(--muted-foreground)]">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-accent)" }} />
            <span>Validating Session &amp; Workspace Access...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
