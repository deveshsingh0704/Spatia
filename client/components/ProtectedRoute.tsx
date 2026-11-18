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
      <div suppressHydrationWarning className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-100">
        <div suppressHydrationWarning className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#0d1424] border border-[#1e2a40] shadow-2xl">
          <div suppressHydrationWarning className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-300 flex items-center justify-center p-1 shadow-lg shadow-sky-500/25">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div suppressHydrationWarning className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
            <span>Validating Session &amp; Cluster Access...</span>
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
