"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Download,
  Maximize2,
  X,
  ArrowRight,
  Clock,
  Globe,
  AlertCircle
} from "lucide-react";
import { ChatSessionItem, GenerationItem } from "@/types/gallery";

export default function SharedChatPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token;

  const [chat, setChat] = useState<ChatSessionItem | null>(null);
  const [messages, setMessages] = useState<GenerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:8001/api/chats/shared/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (!cancelled) setErrorMsg("This shared chat session is unavailable or sharing has been turned off.");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setChat(data.chat || null);
          setMessages(data.messages || []);
        }
      } catch {
        if (!cancelled) setErrorMsg("Could not reach LatentCraft backend.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleContinueOwn = () => {
    if (chat?.id) {
      router.push(`/studio?chat=${encodeURIComponent(chat.id)}`);
    } else {
      router.push("/studio");
    }
  };

  return (
    <div className="min-h-screen text-[var(--foreground)] font-sans py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Compact Floating Glass Brand Header */}
        <header className="rounded-2xl liquid-glass px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/studio" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-heading text-[var(--foreground)]">LatentCraft</div>
              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                <Globe className="w-3 h-3" style={{ color: "var(--brand-secondary)" }} />
                Shared Project Session
              </div>
            </div>
          </Link>

          {chat && (
            <button
              onClick={handleContinueOwn}
              className="px-3.5 py-2 saas-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </header>

        {isLoading ? (
          <div className="saas-card p-10 text-center text-xs text-[var(--muted-foreground)]">
            Loading shared project...
          </div>
        ) : errorMsg || !chat ? (
          <div className="saas-card p-10 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h2 className="text-base font-bold text-[var(--foreground)]">Shared Session Unavailable</h2>
            <p className="text-xs text-[var(--muted-foreground)]">{errorMsg}</p>
            <Link href="/studio" className="inline-block px-4 py-2 saas-btn-primary text-xs mt-2">
              Go to Studio
            </Link>
          </div>
        ) : (
          <>
            {/* Session Summary */}
            <div className="saas-card p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-[var(--foreground)]">{chat.title}</h1>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {messages.length} {messages.length === 1 ? "render" : "renders"} • Updated{" "}
                    {chat.updated_at ? new Date(chat.updated_at).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  <span
                    style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
                    className="px-2.5 py-1 rounded-full font-semibold"
                  >
                    {chat.model_name.replace("Stable Diffusion v1.5", "SD 1.5")}
                  </span>
                  <span
                    style={{ background: "var(--brand-secondary-soft)", color: "var(--brand-secondary)" }}
                    className="px-2.5 py-1 rounded-full font-semibold"
                  >
                    {chat.sampler_name} • {chat.steps} steps
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--surface-overlay)] text-[var(--foreground)]">
                    {chat.resolution}
                  </span>
                </div>
              </div>
            </div>

            {/* Chronological Conversation */}
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  <div className="flex justify-end">
                    <div
                      className="max-w-2xl rounded-2xl rounded-tr-sm px-4 py-3 space-y-1.5"
                      style={{
                        background: "var(--brand-accent)",
                        color: "var(--brand-accent-fg)"
                      }}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed font-medium">{msg.prompt}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-85 font-mono pt-1">
                        <span>{msg.resolution}</span>
                        <span>•</span>
                        <span>{msg.sampler_name}</span>
                        <span>•</span>
                        <span>{msg.steps} steps</span>
                        <span>•</span>
                        <span>CFG {msg.guidance_scale}</span>
                        <span>•</span>
                        <span>Seed {msg.seed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-3xl w-full saas-card rounded-tl-sm p-4 space-y-3">
                      {msg.image_url && (
                        <div
                          onClick={() => setFullscreenUrl(msg.image_url)}
                          className="relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden bg-black/35 cursor-zoom-in group"
                        >
                          <Image
                            src={msg.image_url}
                            alt={msg.title || msg.prompt}
                            fill
                            unoptimized
                            className="object-contain group-hover:scale-[1.01] transition-transform duration-300"
                          />
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl apple-glass text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--foreground)]">{msg.title}</span>
                        <a
                          href={`http://localhost:8001/api/gallery/${msg.id}/download`}
                          className="px-3 py-1.5 saas-btn-secondary text-xs inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {fullscreenUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <button
            onClick={() => setFullscreenUrl(null)}
            aria-label="Close Fullscreen"
            className="absolute top-6 right-6 p-2.5 rounded-full apple-glass text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-5xl w-full h-[82vh] rounded-3xl overflow-hidden">
            <Image src={fullscreenUrl} alt="Shared render" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}

