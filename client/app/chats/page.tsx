"use client";

import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ChatHistoryView } from "@/components/ChatHistoryView";

export default function ChatsHistoryPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen text-[var(--foreground)] flex font-sans">
        <LeftSidebar activeTab="chats" />
        <main className="flex-1 pl-20 sm:pl-[88px] w-full min-h-screen">
          <div className="max-w-[1440px] mx-auto px-6 py-6">
            <ChatHistoryView />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

