"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  History,
  Bookmark,
  Share2,
  Trash2,
  Edit2,
  ArrowRight,
  MessageSquarePlus,
  Layers,
  Clock,
  Copy,
  Check,
  ExternalLink,
  X,
  Globe
} from "lucide-react";
import { ChatSessionItem } from "@/types/gallery";

export const ChatHistoryView: React.FC = () => {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "saved" | "shared">("all");

  // Modals
  const [renameTarget, setRenameTarget] = useState<ChatSessionItem | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [shareTarget, setShareTarget] = useState<ChatSessionItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatSessionItem | null>(null);
  const [deleteImagesAlso, setDeleteImagesAlso] = useState(false);

  const fetchChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (filterMode === "saved") params.append("saved_only", "true");
      if (filterMode === "shared") params.append("shared_only", "true");

      const res = await fetch(`http://localhost:8001/api/chats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (e) {
      console.error("Failed to fetch chat sessions:", e);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchChats();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchChats]);

  const handleContinue = (chatId: string) => {
    router.push(`/studio?chat=${encodeURIComponent(chatId)}`);
  };

  const handleToggleSave = async (chat: ChatSessionItem) => {
    const nextSaved = !chat.is_saved;
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, is_saved: nextSaved } : c)));
    try {
      await fetch(`http://localhost:8001/api/chats/${encodeURIComponent(chat.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_saved: nextSaved })
      });
    } catch {
      void fetchChats();
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameTitle.trim()) return;
    try {
      const res = await fetch(`http://localhost:8001/api/chats/${encodeURIComponent(renameTarget.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setChats((prev) =>
          prev.map((c) => (c.id === renameTarget.id ? { ...c, title: data.chat?.title || renameTitle.trim() } : c))
        );
        setRenameTarget(null);
      }
    } catch {}
  };

  const handleShareToggle = async (chat: ChatSessionItem, enable: boolean) => {
    try {
      const res = await fetch(`http://localhost:8001/api/chats/${encodeURIComponent(chat.id)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shared: enable })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...chat,
          is_shared: Boolean(data.is_shared),
          share_token: data.share_token || null
        };
        setChats((prev) => prev.map((c) => (c.id === chat.id ? updated : c)));
        setShareTarget(updated);
      }
    } catch {}
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `http://localhost:8001/api/chats/${encodeURIComponent(deleteTarget.id)}?delete_images=${deleteImagesAlso}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        if (typeof window !== "undefined") {
          const activeStored = localStorage.getItem("latentcraft_active_chat_id");
          if (activeStored === deleteTarget.id) {
            localStorage.removeItem("latentcraft_active_chat_id");
          }
        }
        setChats((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        setDeleteImagesAlso(false);
      }
    } catch {}
  };

  const getShareUrl = (token?: string | null) => {
    if (typeof window === "undefined" || !token) return "";
    return `${window.location.origin}/share/${token}`;
  };

  return (
    <div className="my-2 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5" style={{ color: "var(--brand-accent)" }} />
            Chat History &amp; Projects
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Resume any Studio session right where you left off, save favorites, or share read-only project links.
          </p>
        </div>

        <button
          onClick={() => router.push("/studio?new=1")}
          className="px-4 py-2.5 saas-btn-primary text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Studio Chat</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="saas-card p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chat sessions by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full saas-input pl-10 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-overlay)]">
          {(
            [
              { id: "all", label: "All Sessions" },
              { id: "saved", label: "Saved" },
              { id: "shared", label: "Shared" }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              style={
                filterMode === tab.id
                  ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                  : undefined
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterMode === tab.id
                  ? "font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="saas-card h-80 animate-pulse p-4 space-y-3">
              <div className="h-44 rounded-xl bg-[var(--surface-overlay)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--surface-overlay)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--surface-overlay)]" />
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="saas-card p-12 text-center space-y-4">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
          >
            <History className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[var(--foreground)]">No Chat Sessions Found</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {filterMode !== "all" || search
                ? "Try clearing your search or filter to see all Studio sessions."
                : "Generate your first architectural mockup in Studio to create a persistent project session."}
            </p>
          </div>
          <button
            onClick={() => router.push("/studio?new=1")}
            className="px-4 py-2.5 saas-btn-primary text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Open Studio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chats.map((chat) => (
            <div key={chat.id} className="saas-card overflow-hidden flex flex-col justify-between group">
              <div>
                {/* Preview Thumbnail */}
                <div
                  onClick={() => handleContinue(chat.id)}
                  className="relative aspect-[16/10] w-full bg-[var(--surface-overlay)] overflow-hidden cursor-pointer"
                >
                  {chat.preview_image_url ? (
                    <Image
                      src={chat.preview_image_url}
                      alt={chat.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)] text-xs">
                      No renders yet
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full apple-glass text-[10px] font-mono text-white flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {chat.message_count} {chat.message_count === 1 ? "render" : "renders"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {chat.is_saved && (
                        <span
                          style={{
                            background: "var(--brand-secondary-soft)",
                            color: "var(--brand-secondary)"
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md"
                        >
                          Saved
                        </span>
                      )}
                      {chat.is_shared && (
                        <span
                          style={{
                            background: "var(--brand-tertiary-soft)",
                            color: "var(--brand-tertiary)"
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md flex items-center gap-1"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          Shared
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata Body */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => handleContinue(chat.id)}
                      className="text-sm font-bold text-[var(--foreground)] line-clamp-1 cursor-pointer hover:underline"
                    >
                      {chat.title}
                    </h3>
                    <button
                      onClick={() => {
                        setRenameTarget(chat);
                        setRenameTitle(chat.title);
                      }}
                      title="Rename Project"
                      className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] flex-shrink-0 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--surface-overlay)] text-[var(--foreground)]">
                      {chat.sampler_name} • {chat.steps}s
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--surface-overlay)] text-[var(--foreground)]">
                      {chat.resolution}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--surface-overlay)] text-[var(--muted-foreground)]">
                      ID: {chat.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      Updated {chat.updated_at ? new Date(chat.updated_at).toLocaleString() : "recently"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleContinue(chat.id)}
                  className="flex-1 py-2 px-3 saas-btn-primary text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => void handleToggleSave(chat)}
                  title={chat.is_saved ? "Unsave Project" : "Save Project"}
                  style={
                    chat.is_saved
                      ? { background: "var(--brand-secondary-soft)", color: "var(--brand-secondary)" }
                      : undefined
                  }
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    chat.is_saved ? "" : "saas-btn-secondary"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${chat.is_saved ? "fill-current" : ""}`} />
                </button>

                <button
                  onClick={() => {
                    if (!chat.is_shared) {
                      void handleShareToggle(chat, true);
                    } else {
                      setShareTarget(chat);
                    }
                  }}
                  title="Share Project Link"
                  style={
                    chat.is_shared
                      ? { background: "var(--brand-tertiary-soft)", color: "var(--brand-tertiary)" }
                      : undefined
                  }
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    chat.is_shared ? "" : "saas-btn-secondary"
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setDeleteTarget(chat);
                    setDeleteImagesAlso(false);
                  }}
                  title="Delete Session"
                  className="p-2 rounded-xl bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full space-y-4">
            <h4 className="text-sm font-bold text-[var(--foreground)]">Rename Chat Project</h4>
            <input
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleRenameSubmit()}
              className="w-full saas-input px-3 py-2 text-xs"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="px-3.5 py-2 saas-btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRenameSubmit()}
                className="px-4 py-2 saas-btn-primary text-xs cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
                >
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Share Session</h4>
                  <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[230px]">
                    {shareTarget.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShareTarget(null)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareTarget.is_shared && shareTarget.share_token ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Anyone with this link can view the session prompts, parameters, and generated images.
                </p>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-overlay)]">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(shareTarget.share_token)}
                    className="flex-1 bg-transparent text-xs font-mono text-[var(--foreground)] outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(getShareUrl(shareTarget.share_token));
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 1800);
                    }}
                    className="px-3 py-1.5 saas-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{shareCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={getShareUrl(shareTarget.share_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium flex items-center gap-1 hover:underline"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Shared Page</span>
                  </a>
                  <button
                    onClick={() => void handleShareToggle(shareTarget, false)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-medium hover:bg-rose-500/25 cursor-pointer"
                  >
                    Disable Sharing
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Public link sharing is currently turned off for this session.
                </p>
                <button
                  onClick={() => void handleShareToggle(shareTarget, true)}
                  className="w-full py-2.5 saas-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Enable Share Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full space-y-4">
            <h4 className="text-sm font-bold text-rose-400">Delete Chat Session?</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Delete <strong className="text-[var(--foreground)]">{deleteTarget.title}</strong>? By default, your rendered images stay safe in Gallery.
            </p>
            <label className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteImagesAlso}
                onChange={(e) => setDeleteImagesAlso(e.target.checked)}
                style={{ accentColor: "var(--brand-accent)" }}
              />
              <span>Also delete rendered images from Gallery &amp; AWS S3</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 saas-btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteConfirm()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

