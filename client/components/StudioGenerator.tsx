"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Wand2,
  RefreshCw,
  Sliders,
  BarChart2,
  Clock,
  Sparkles,
  Download,
  Copy,
  Heart,
  Maximize2,
  Check,
  X,
  Send,
  Dice5,
  Plus,
  Database,
  RotateCcw,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  History,
  Bookmark,
  Share2,
  MessageSquarePlus,
  ExternalLink
} from "lucide-react";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useAuth } from "@/context/AuthContext";
import { apiUrl, resolveMediaUrl } from "@/lib/api";
import { SystemInfo } from "@/types/benchmark";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface StudioGeneratorProps {
  system: SystemInfo;
}

interface BenchmarkGraphPoint {
  steps: number;
  ddim_latency?: number;
  ddpm_latency?: number;
  ddim_fid?: number;
  ddpm_fid?: number;
}

interface ChatGenerationMessage {
  localId: string;
  dbId?: string | null;
  title?: string;
  prompt: string;
  negativeTags: string[];
  modelName: string;
  samplerName: string;
  steps: number;
  guidanceScale: number;
  seed: number;
  resolution: string;
  imageUrl?: string;
  latencySec?: number;
  peakVramMb?: number;
  isFavorite?: boolean;
  savedToDb?: boolean;
  createdAt?: string;
  status: "generating" | "completed" | "error";
  errorMsg?: string;
}

const DEFAULT_NEGATIVE_TAGS = [
  "blurry",
  "grain",
  "noise",
  "low quality",
  "artifacts",
  "deformed",
  "distorted",
  "cartoon",
  "3d render",
  "text",
  "watermark"
];

const SUGGESTED_NEGATIVE_TAGS = [
  "overexposed",
  "oversaturated",
  "jpeg compression",
  "bad perspective",
  "unnatural light",
  "dollhouse",
  "bad proportions",
  "duplicate",
  "cropped",
  "out of frame"
];

const RESOLUTIONS = [
  { value: "512x512", label: "512 × 512", ratio: "1:1" },
  { value: "768x512", label: "768 × 512", ratio: "3:2" },
  { value: "512x768", label: "512 × 768", ratio: "2:3" },
  { value: "768x768", label: "768 × 768", ratio: "1:1 HD" }
];

const STARTER_PROMPTS = [
  "A photorealistic architectural interior photograph of a modern luxury master bedroom, king size platform bed, textured cream linen duvet, light oak herringbone floor, panoramic glass windows, soft morning sunlight, 8k resolution",
  "Minimalist Scandinavian bedroom suite, warm oak timber ceiling, soft indirect cove lighting, linen drapes, architectural digest photography",
  "Dark walnut wood cabin bedroom, warm bedside brass sconces, wool throw blanket, floor-to-ceiling forest view window at twilight"
];

function parseNegativePromptToTags(neg?: string | null): string[] {
  if (!neg || !neg.trim()) return [];
  return Array.from(
    new Set(
      neg
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

const ACTIVE_CHAT_STORAGE_KEY = "latentcraft_active_chat_id";

export const StudioGenerator: React.FC<StudioGeneratorProps> = () => {
  const { user, accessToken, fetchWithAuth } = useAuth();
  const activeChatStorageKey = user ? `latentcraft_active_chat_id_${user.id}` : null;
  const [activeSubTab, setActiveSubTab] = useState<"generate" | "benchmark">("generate");
  const [isTweaksOpen, setIsTweaksOpen] = useState(true);

  // Persistent Chat Session State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState<string>("New Studio Chat");
  const [isChatSaved, setIsChatSaved] = useState(false);
  const [isChatShared, setIsChatShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isRestoringChat, setIsRestoringChat] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Left-side Custom Tweak Controls
  const [model, setModel] = useState("Stable Diffusion v1.5 (Fine-Tuned)");
  const [sampler, setSampler] = useState("DDIM");
  const [steps, setSteps] = useState(20);
  const [guidance, setGuidance] = useState(7.5);
  const [seed, setSeed] = useState(42);
  const [resolution, setResolution] = useState("512x512");

  // Interactive Negative Prompt Tags
  const [negativeTags, setNegativeTags] = useState<string[]>(DEFAULT_NEGATIVE_TAGS);
  const [newNegTag, setNewNegTag] = useState("");

  // Chat Input, Thread & Recent History Picker (on empty screen)
  const [promptInput, setPromptInput] = useState(STARTER_PROMPTS[0]);
  const [chatMessages, setChatMessages] = useState<ChatGenerationMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<ChatGenerationMessage[]>([]);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live SSE Progress
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStepProgress, setCurrentStepProgress] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0.0);
  const [etaTime, setEtaTime] = useState<number>(0.0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Lightbox & Copy Feedback
  const [fullscreenImage, setFullscreenImage] = useState<ChatGenerationMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Benchmark States
  const [benchSamplers, setBenchSamplers] = useState<string[]>(["DDIM", "DDPM"]);
  const [benchSteps, setBenchSteps] = useState<number[]>([10, 20, 30, 50]);
  const [benchSeed, setBenchSeed] = useState<number>(42);
  const [benchGuidance, setBenchGuidance] = useState<number>(7.5);
  const [customStepInput, setCustomStepInput] = useState<string>("");
  const [benchResults, setBenchResults] = useState<Array<{ sampler: string; steps: number; latency: number; fid: number; image_url?: string | null }>>([]);
  const [benchPreviewImage, setBenchPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchLiveMsg, setBenchLiveMsg] = useState<string>("");
  const [benchGraphData, setBenchGraphData] = useState<BenchmarkGraphPoint[]>([
    { steps: 10, ddim_latency: 0.58, ddpm_latency: 2.15, ddim_fid: 11.4, ddpm_fid: 16.0 },
    { steps: 20, ddim_latency: 1.25, ddpm_latency: 3.92, ddim_fid: 7.9, ddpm_fid: 13.4 },
    { steps: 30, ddim_latency: 1.84, ddpm_latency: 5.67, ddim_fid: 5.8, ddpm_fid: 11.2 },
    { steps: 50, ddim_latency: 2.84, ddpm_latency: 9.4, ddim_fid: 4.82, ddpm_fid: 9.4 }
  ]);

  const mapBackendGenerationToMessage = (it: {
    id: string;
    title?: string;
    prompt: string;
    negative_prompt?: string | null;
    model_name?: string;
    sampler_name?: string;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
    resolution?: string;
    image_url?: string;
    latency_sec?: number;
    peak_vram_mb?: number;
    is_favorite?: boolean;
    created_at?: string;
  }): ChatGenerationMessage => ({
    localId: `db_${it.id}`,
    dbId: it.id,
    title: it.title,
    prompt: it.prompt,
    negativeTags: parseNegativePromptToTags(it.negative_prompt),
    modelName: it.model_name || "Stable Diffusion v1.5 (Fine-Tuned)",
    samplerName: it.sampler_name || "DDIM",
    steps: it.steps || 20,
    guidanceScale: it.guidance_scale || 7.5,
    seed: it.seed ?? 42,
    resolution: it.resolution || "512x512",
    imageUrl: resolveMediaUrl(it.image_url),
    latencySec: it.latency_sec,
    peakVramMb: it.peak_vram_mb,
    isFavorite: Boolean(it.is_favorite),
    savedToDb: true,
    createdAt: it.created_at,
    status: "completed"
  });

  // Fetch persisted generations for the Recent History Picker
  const fetchHistoryStrip = async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/gallery?page=1&page_size=24&sort_by=created_at_desc"));
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (Array.isArray(items)) {
          setHistoryItems(items.map(mapBackendGenerationToMessage));
        }
      }
    } catch (e) {
      console.warn("Could not load generation history strip:", e);
    }
  };

  const loadChatSessionById = async (chatId: string) => {
    setIsRestoringChat(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/chats/${encodeURIComponent(chatId)}`));
      if (!res.ok) {
        if (res.status === 404 && typeof window !== "undefined") {
          if (activeChatStorageKey) localStorage.removeItem(activeChatStorageKey);
          window.history.replaceState(null, "", "/studio");
        }
        return;
      }
      const data = await res.json();
      if (data.chat) {
        setActiveChatId(data.chat.id);
        setActiveChatTitle(data.chat.title || "Untitled Studio Project");
        setIsChatSaved(Boolean(data.chat.is_saved));
        setIsChatShared(Boolean(data.chat.is_shared));
        setShareToken(data.chat.share_token || null);
        if (data.chat.model_name) setModel(data.chat.model_name);
        if (data.chat.sampler_name) setSampler(data.chat.sampler_name);
        if (data.chat.steps) setSteps(data.chat.steps);
        if (data.chat.guidance_scale) setGuidance(data.chat.guidance_scale);
        if (data.chat.seed !== undefined && data.chat.seed !== null) setSeed(data.chat.seed);
        if (data.chat.resolution) setResolution(data.chat.resolution);
        if (Array.isArray(data.chat.negative_tags) && data.chat.negative_tags.length > 0) {
          setNegativeTags(data.chat.negative_tags);
        }
        if (typeof window !== "undefined") {
          if (activeChatStorageKey) localStorage.setItem(activeChatStorageKey, data.chat.id);
          window.history.replaceState(null, "", `/studio?chat=${encodeURIComponent(data.chat.id)}`);
        }
      }
      const msgs = Array.isArray(data.messages) ? data.messages.map(mapBackendGenerationToMessage) : [];
      setChatMessages(msgs);
      if (msgs.length > 0) {
        setPromptInput(msgs[msgs.length - 1].prompt);
      }
    } catch (e) {
      console.warn("Could not restore chat session:", e);
    } finally {
      setIsRestoringChat(false);
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fetchHistoryStrip();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenHistoryInChat = (item: ChatGenerationMessage) => {
    setShowHistoryPicker(false);
    setChatMessages((prev) => {
      if (prev.some((m) => m.localId === item.localId)) {
        return prev;
      }
      return [...prev, item];
    });
    requestAnimationFrame(() => {
      document.getElementById(`msg_${item.localId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  // Restore active chat session across tab switches/reloads, or load ?chat=<id> / ?gen=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rafId = requestAnimationFrame(() => {
      const sp = new URLSearchParams(window.location.search);
      const isNew = sp.get("new") === "1";
      const urlChatId = sp.get("chat");
      const urlGenId = sp.get("gen");
      const urlBenchId = sp.get("bench");

      if (urlBenchId) {
        setActiveSubTab("benchmark");
        void (async () => {
          try {
            const res = await fetchWithAuth(apiUrl(`/api/benchmark/batch/${encodeURIComponent(urlBenchId)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.graph_data) setBenchGraphData(data.graph_data);
              if (Array.isArray(data.results)) setBenchResults(data.results);
              if (data.prompt) setPromptInput(data.prompt);
              if (data.seed !== undefined) setBenchSeed(data.seed);
              if (Array.isArray(data.samplers) && data.samplers.length > 0) setBenchSamplers(data.samplers);
              if (Array.isArray(data.steps_list) && data.steps_list.length > 0) setBenchSteps(data.steps_list);
              setBenchLiveMsg(`Loaded benchmark run ${data.batch_id}`);
            }
          } catch (e) {
            console.warn("Could not load benchmark run:", e);
          }
        })();
        return;
      }

      if (isNew) {
        if (activeChatStorageKey) localStorage.removeItem(activeChatStorageKey);
        window.history.replaceState(null, "", "/studio");
        return;
      }

      if (urlChatId) {
        void loadChatSessionById(urlChatId);
        return;
      }

      if (urlGenId) {
        void (async () => {
          try {
            const res = await fetchWithAuth(apiUrl(`/api/gallery/${encodeURIComponent(urlGenId)}`));
            if (res.ok) {
              const it = await res.json();
              if (it.chat_id) {
                await loadChatSessionById(it.chat_id);
                return;
              }
              const msg = mapBackendGenerationToMessage(it);
              setPromptInput(msg.prompt);
              setModel(msg.modelName);
              setSampler(msg.samplerName);
              setSteps(msg.steps);
              setGuidance(msg.guidanceScale);
              setSeed(msg.seed);
              setResolution(msg.resolution);
              if (msg.negativeTags.length > 0) setNegativeTags(msg.negativeTags);
              setChatMessages([msg]);
            }
          } catch (e) {
            console.warn("Could not load generation into Studio:", e);
          }
        })();
        return;
      }

      const storedChatId = activeChatStorageKey ? localStorage.getItem(activeChatStorageKey) : null;
      if (storedChatId) {
        void loadChatSessionById(storedChatId);
      }
    });
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  // Negative tag management
  const addNegativeTag = (rawInput: string) => {
    const candidates = rawInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.length === 0) return;
    setNegativeTags((prev) => {
      const existing = new Set(prev.map((t) => t.toLowerCase()));
      const next = [...prev];
      for (const c of candidates) {
        if (!existing.has(c)) {
          existing.add(c);
          next.push(c);
        }
      }
      return next;
    });
    setNewNegTag("");
  };

  const removeNegativeTag = (tagToRemove: string) => {
    setNegativeTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Trigger Generation inside Chat Thread
  const handleGenerate = async (override?: {
    prompt?: string;
    seed?: number;
  }) => {
    const activePrompt = (override?.prompt ?? promptInput).trim();
    if (!activePrompt || isGenerating) return;

    const activeSeed = override?.seed ?? seed;
    const negPromptStr = negativeTags.join(", ");
    const localId = `chat_${Date.now()}`;
    const jobId = `job_${Date.now()}`;

    const pendingMsg: ChatGenerationMessage = {
      localId,
      prompt: activePrompt,
      negativeTags: [...negativeTags],
      modelName: model,
      samplerName: sampler,
      steps,
      guidanceScale: guidance,
      seed: activeSeed,
      resolution,
      status: "generating"
    };

    setChatMessages((prev) => [...prev, pendingMsg]);
    setIsGenerating(true);
    setProgressPercent(0);
    setCurrentStepProgress(0);
    setElapsedTime(0.0);
    setEtaTime(0.0);

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Number(((performance.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(apiUrl(`/api/generate/stream/${jobId}`));
      eventSource.onmessage = (event) => {
        try {
          const p = JSON.parse(event.data);
          if (p.percent !== undefined) setProgressPercent(p.percent);
          if (p.step !== undefined) setCurrentStepProgress(p.step);
          if (p.eta_sec !== undefined) setEtaTime(p.eta_sec);
        } catch {}
      };
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch {}

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await fetchWithAuth(apiUrl(`/api/generate?job_id=${jobId}`), {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: activePrompt,
          negative_prompt: negPromptStr,
          model_name: model,
          sampler_name: sampler,
          steps,
          guidance_scale: guidance,
          seed: activeSeed,
          resolution,
          chat_id: activeChatId
        })
      });

      const totalElapsed = Number(((performance.now() - startTime) / 1000).toFixed(2));

      if (res.ok) {
        const data = await res.json();
        const fixedUrl = resolveMediaUrl(data.image_url);
        if (data.chat_id) {
          setActiveChatId(data.chat_id);
          if (data.chat_title) setActiveChatTitle(data.chat_title);
          if (data.is_saved !== undefined) setIsChatSaved(Boolean(data.is_saved));
          if (data.is_shared !== undefined) setIsChatShared(Boolean(data.is_shared));
          if (data.share_token !== undefined) setShareToken(data.share_token || null);
          if (typeof window !== "undefined") {
            if (activeChatStorageKey) localStorage.setItem(activeChatStorageKey, data.chat_id);
            window.history.replaceState(null, "", `/studio?chat=${encodeURIComponent(data.chat_id)}`);
          }
        }
        setChatMessages((prev) =>
          prev.map((m) =>
            m.localId === localId
              ? {
                  ...m,
                  dbId: data.id || null,
                  title: data.title,
                  imageUrl: fixedUrl,
                  latencySec: data.latency_sec || totalElapsed,
                  peakVramMb: data.peak_vram_mb,
                  resolution: data.resolution || resolution,
                  savedToDb: Boolean(data.saved_to_db ?? data.id),
                  createdAt: data.created_at || new Date().toISOString(),
                  status: "completed"
                }
              : m
          )
        );
        void fetchHistoryStrip();
      } else {
        const err = await res.json().catch(() => ({}));
        setChatMessages((prev) =>
          prev.map((m) =>
            m.localId === localId
              ? { ...m, status: "error", errorMsg: err.detail || "Generation failed" }
              : m
          )
        );
      }
    } catch {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.localId === localId
            ? { ...m, status: "error", errorMsg: "Could not reach generation server." }
            : m
        )
      );
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      if (eventSource) eventSource.close();
      setIsGenerating(false);
      setProgressPercent(100);
    }
  };

  const handleToggleFavorite = async (msg: ChatGenerationMessage) => {
    const nextFav = !msg.isFavorite;
    setChatMessages((prev) =>
      prev.map((m) => (m.localId === msg.localId ? { ...m, isFavorite: nextFav } : m))
    );
    if (msg.dbId) {
      try {
        await fetchWithAuth(apiUrl(`/api/gallery/${msg.dbId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_favorite: nextFav })
        });
      } catch {}
    }
  };

  const handleReuseSettings = (msg: ChatGenerationMessage) => {
    setPromptInput(msg.prompt);
    setModel(msg.modelName);
    setSampler(msg.samplerName);
    setSteps(msg.steps);
    setGuidance(msg.guidanceScale);
    setSeed(msg.seed);
    setResolution(msg.resolution || "512x512");
    if (msg.negativeTags.length > 0) {
      setNegativeTags(msg.negativeTags);
    }
  };

  const handleDownload = (msg: ChatGenerationMessage) => {
    if (!msg.imageUrl && !msg.dbId) return;
    const a = document.createElement("a");
    a.href = msg.dbId
      ? apiUrl(`/api/gallery/${msg.dbId}/download`)
      : (msg.imageUrl as string);
    a.download = `latentcraft_seed${msg.seed}_${msg.resolution}_${msg.dbId || msg.localId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setActiveChatTitle("New Studio Chat");
    setIsChatSaved(false);
    setIsChatShared(false);
    setShareToken(null);
    setChatMessages([]);
    setShowHistoryPicker(false);
    if (typeof window !== "undefined") {
      if (activeChatStorageKey) localStorage.removeItem(activeChatStorageKey);
      window.history.replaceState(null, "", "/studio");
    }
  };

  const handleToggleSaveChat = async () => {
    if (!activeChatId) return;
    const nextSaved = !isChatSaved;
    setIsChatSaved(nextSaved);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/chats/${encodeURIComponent(activeChatId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_saved: nextSaved,
          model_name: model,
          sampler_name: sampler,
          steps,
          guidance_scale: guidance,
          seed,
          resolution,
          negative_tags: negativeTags
        })
      });
      if (!res.ok) setIsChatSaved(!nextSaved);
    } catch {
      setIsChatSaved(!nextSaved);
    }
  };

  const handleToggleShareChat = async (enable: boolean) => {
    if (!activeChatId) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/chats/${encodeURIComponent(activeChatId)}/share`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shared: enable })
      });
      if (res.ok) {
        const data = await res.json();
        setIsChatShared(Boolean(data.is_shared));
        setShareToken(data.share_token || null);
      }
    } catch {}
  };

  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/share/${shareToken}`
      : "";

  const handleCopyPrompt = (msg: ChatGenerationMessage) => {
    navigator.clipboard?.writeText(msg.prompt);
    setCopiedId(msg.localId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Token estimation
  const words = promptInput.trim() ? promptInput.trim().split(/\s+|[,.-]+/).filter(Boolean).length : 0;
  const estimatedTokens = Math.round(words * 1.25);

  // Benchmark Matrix toggles & execution
  const toggleSampler = (s: string) => {
    if (benchSamplers.includes(s)) {
      if (benchSamplers.length > 1) setBenchSamplers(benchSamplers.filter((x) => x !== s));
    } else {
      setBenchSamplers([...benchSamplers, s]);
    }
  };

  const toggleStep = (stepVal: number) => {
    if (benchSteps.includes(stepVal)) {
      if (benchSteps.length > 1) setBenchSteps(benchSteps.filter((s) => s !== stepVal).sort((a, b) => a - b));
    } else {
      setBenchSteps([...benchSteps, stepVal].sort((a, b) => a - b));
    }
  };

  const handleRunCustomBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchLiveMsg(`Running matrix across [${benchSamplers.join(", ")}]...`);
    const jobId = `bench_${Date.now()}`;
    const startTime = performance.now();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(apiUrl(`/api/generate/stream/${jobId}`));
      eventSource.onmessage = (event) => {
        try {
          const p = JSON.parse(event.data);
          if (p.message) setBenchLiveMsg(p.message);
        } catch {}
      };
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch {}

    try {
      const res = await fetchWithAuth(apiUrl(`/api/benchmark/run-custom?job_id=${jobId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samplers: benchSamplers,
          steps_list: benchSteps,
          model_name: model,
          prompt: promptInput,
          negative_prompt: negativeTags.join(", "),
          seed: benchSeed,
          guidance_scale: benchGuidance
        })
      });
      const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      if (res.ok) {
        const data = await res.json();
        if (data.graph_data?.length > 0) setBenchGraphData(data.graph_data);
        if (Array.isArray(data.results)) setBenchResults(data.results);
        if (data.batch_id && typeof window !== "undefined") {
          window.history.replaceState(null, "", `/studio?bench=${encodeURIComponent(data.batch_id)}`);
        }
        setBenchLiveMsg(`Benchmark ${data.batch_id || jobId} saved (${totalElapsed}s)`);
      }
    } catch {
      setBenchLiveMsg("Benchmark sweep failed.");
    } finally {
      if (eventSource) eventSource.close();
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-24px)] overflow-hidden">
      {/* Compact Workspace View Switcher (No Top Navbar) */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0 mb-2.5">
        <div className="flex items-center gap-2">
          {activeSubTab === "generate" && !isTweaksOpen && (
            <button
              onClick={() => setIsTweaksOpen(true)}
              title="Show Parameters"
              className="px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-overlay)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
              <span>Controls</span>
            </button>
          )}

          {/* Segmented Studio / Sampler Matrix Toggle Pill */}
          <div className="inline-flex items-center p-1 rounded-full liquid-glass">
            <button
              onClick={() => setActiveSubTab("generate")}
              style={
                activeSubTab === "generate"
                  ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "generate"
                  ? "font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>
            <button
              onClick={() => setActiveSubTab("benchmark")}
              style={
                activeSubTab === "benchmark"
                  ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "benchmark"
                  ? "font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Sampler Matrix</span>
            </button>
          </div>
        </div>

        {activeSubTab === "generate" && (
          <div className="flex items-center gap-2 min-w-0">
            {activeChatId && (
              <>
                <span
                  title={activeChatTitle}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-[var(--foreground)] max-w-[240px] truncate"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--brand-secondary)" }}
                  />
                  <span className="truncate">{activeChatTitle}</span>
                </span>

                <button
                  onClick={handleToggleSaveChat}
                  title={isChatSaved ? "Saved Project (Click to Unsave)" : "Save Project"}
                  style={
                    isChatSaved
                      ? { background: "var(--brand-secondary-soft)", color: "var(--brand-secondary)" }
                      : undefined
                  }
                  className={`px-3 py-1.5 rounded-full liquid-glass text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isChatSaved
                      ? "font-semibold"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isChatSaved ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">{isChatSaved ? "Saved" : "Save"}</span>
                </button>

                <button
                  onClick={() => {
                    if (!isChatShared) void handleToggleShareChat(true);
                    setShareModalOpen(true);
                  }}
                  title="Share Chat Session"
                  style={
                    isChatShared
                      ? { background: "var(--brand-tertiary-soft)", color: "var(--brand-tertiary)" }
                      : undefined
                  }
                  className="px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isChatShared ? "Shared" : "Share"}</span>
                </button>
              </>
            )}

            {(chatMessages.length > 0 || activeChatId) && (
              <button
                onClick={handleNewChat}
                title="Start New Chat Session"
                className="px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-overlay)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== VIEW 1: MODERN CHAT GENERATION APPLICATION ===== */}
      {activeSubTab === "generate" && (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* LEFT SIDE: Borderless Tonal Parameters Inspector */}
          {isTweaksOpen && (
            <aside className="w-80 xl:w-[340px] flex-shrink-0 saas-card p-5 overflow-y-auto flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{
                      background: "var(--brand-accent-soft)",
                      color: "var(--brand-accent)"
                    }}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
                    Parameters
                  </span>
                </div>
                <button
                  onClick={() => setIsTweaksOpen(false)}
                  title="Collapse Parameters"
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Model Backbone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Model
                </label>
                <GlassSelect
                  ariaLabel="Model Backbone"
                  value={model}
                  onChange={setModel}
                  options={[
                    {
                      value: "Stable Diffusion v1.5 (Fine-Tuned)",
                      label: "SD 1.5 Fine-Tuned (Bedroom LoRA)"
                    },
                    {
                      value: "Stable Diffusion v1.5",
                      label: "Stable Diffusion v1.5 (Base)"
                    }
                  ]}
                />
              </div>

              {/* Sampler */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Sampler
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--surface-overlay)]">
                  {["DDIM", "DDPM"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSampler(s)}
                      style={
                        sampler === s
                          ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                          : undefined
                      }
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        sampler === s
                          ? "font-semibold"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Dropdown (with 768x768) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Resolution
                </label>
                <GlassSelect
                  ariaLabel="Output Resolution"
                  value={resolution}
                  onChange={setResolution}
                  buttonClassName="font-mono"
                  options={RESOLUTIONS.map((resOpt) => ({
                    value: resOpt.value,
                    label: `${resOpt.label} (${resOpt.ratio})`
                  }))}
                />
              </div>

              {/* Inference Steps Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--foreground)]">Steps</span>
                  <span
                    className="px-2 py-0.5 rounded-md font-mono text-xs font-semibold"
                    style={{
                      background: "var(--brand-secondary-soft)",
                      color: "var(--brand-secondary)"
                    }}
                  >
                    {steps}
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  style={{ accentColor: "var(--brand-accent)" }}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[var(--muted-foreground)] font-mono">
                  <span>5 (Draft)</span>
                  <span>50</span>
                  <span>100 (HQ)</span>
                </div>
              </div>

              {/* Guidance Scale (CFG) Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--foreground)]">Guidance Scale (CFG)</span>
                  <span
                    className="px-2 py-0.5 rounded-md font-mono text-xs font-semibold"
                    style={{
                      background: "var(--brand-secondary-soft)",
                      color: "var(--brand-secondary)"
                    }}
                  >
                    {guidance.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  value={guidance}
                  onChange={(e) => setGuidance(Number(e.target.value))}
                  style={{ accentColor: "var(--brand-accent)" }}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[var(--muted-foreground)] font-mono">
                  <span>1.0 (Free)</span>
                  <span>7.5</span>
                  <span>15.0 (Strict)</span>
                </div>
              </div>

              {/* Seed */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Seed
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="flex-1 saas-input px-3 py-2 text-xs font-mono"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                    title="Randomize Seed"
                    className="px-3 py-2 saas-btn-secondary rounded-xl flex items-center justify-center"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Negative Prompt Tags */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" style={{ color: "var(--brand-tertiary)" }} />
                    Negative Tags
                  </label>
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <button
                      onClick={() => setNegativeTags(DEFAULT_NEGATIVE_TAGS)}
                      style={{ color: "var(--brand-tertiary)" }}
                      className="hover:underline font-medium"
                    >
                      Reset
                    </button>
                    {negativeTags.length > 0 && (
                      <button
                        onClick={() => setNegativeTags([])}
                        className="text-rose-400 hover:underline font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Add New Tag Input */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNegTag}
                    onChange={(e) => setNewNegTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addNegativeTag(newNegTag);
                      }
                    }}
                    placeholder="Add negative tag..."
                    className="flex-1 saas-input px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => addNegativeTag(newNegTag)}
                    disabled={!newNegTag.trim()}
                    title="Add Tag"
                    className="px-2.5 py-1.5 saas-btn-secondary rounded-xl disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Active Tags List (Borderless Tonal Pills) */}
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto py-1">
                  {negativeTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "var(--brand-tertiary-soft)",
                        color: "var(--brand-tertiary)"
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => removeNegativeTag(tag)}
                        className="opacity-75 hover:opacity-100 transition-opacity"
                        title={`Remove "${tag}"`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {negativeTags.length === 0 && (
                    <span className="text-xs text-[var(--muted-foreground)] italic">
                      No negative tags active
                    </span>
                  )}
                </div>

                {/* Quick-Add Suggestions */}
                {(() => {
                  const available = SUGGESTED_NEGATIVE_TAGS.filter(
                    (s) => !negativeTags.some((t) => t.toLowerCase() === s.toLowerCase())
                  );
                  if (available.length === 0) return null;
                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-[var(--muted-foreground)] block">
                        Quick add:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {available.slice(0, 6).map((s) => (
                          <button
                            key={s}
                            onClick={() => addNegativeTag(s)}
                            className="px-2 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </aside>
          )}

          {/* RIGHT / MAIN CHAT GENERATION WORKSPACE */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 saas-card overflow-hidden relative">
            {/* Scrollable Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-6">
              {isRestoringChat && chatMessages.length === 0 && (
                <div className="min-h-full flex items-center justify-center text-xs text-[var(--muted-foreground)] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--brand-accent)" }} />
                  <span>Restoring your Studio session...</span>
                </div>
              )}
              {!isRestoringChat && chatMessages.length === 0 && (
                <div className="min-h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6 py-8">
                 
                  <div className="space-y-2 max-w-xl">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                      LatentCraft Chat Studio
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      Tweak model, steps, CFG scale, resolution (up to 768×768), and negative tags on the left, then describe your scene below or load a previously generated image from history.
                    </p>
                  </div>

                  {/* Action Toggle: Load from Recently Generated Images */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setShowHistoryPicker((prev) => !prev)}
                      style={
                        showHistoryPicker
                          ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                          : undefined
                      }
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                        showHistoryPicker ? "" : "saas-btn-secondary"
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>
                        {showHistoryPicker
                          ? "Hide Recently Generated Images"
                          : `Load from Recently Generated Images (${historyItems.length})`}
                      </span>
                    </button>
                  </div>

                  {/* Expandable Recent History Picker */}
                  {showHistoryPicker ? (
                    <div className="w-full space-y-3 text-left p-4 rounded-2xl bg-[var(--surface-overlay)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                          Recently Generated Images — Choose to Load in Chat
                        </span>
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">
                          {historyItems.length} saved
                        </span>
                      </div>

                      {historyItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                          No previously generated images found yet. Generate your first image below!
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1">
                          {historyItems.map((item) => (
                            <button
                              key={item.localId}
                              onClick={() => handleOpenHistoryInChat(item)}
                              className="group rounded-2xl overflow-hidden bg-[var(--card)] hover:scale-[1.02] transition-all text-left flex flex-col shadow-sm"
                            >
                              <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                                {item.imageUrl && (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.title || "Generated image"}
                                    fill
                                    unoptimized
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                )}
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full apple-glass text-[10px] font-mono text-white">
                                  {item.samplerName} • {item.steps}s
                                </div>
                              </div>
                              <div className="p-2.5 space-y-0.5">
                                <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                                  {item.title || "Untitled Mockup"}
                                </div>
                                <div className="text-[11px] text-[var(--muted-foreground)] line-clamp-1">
                                  {item.prompt}
                                </div>
                                <div className="text-[10px] font-mono" style={{ color: "var(--brand-accent)" }}>
                                  {item.resolution} • Seed #{item.seed}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-xl space-y-2 text-left">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                        Try a prompt
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {STARTER_PROMPTS.map((sp, i) => (
                          <button
                            key={i}
                            onClick={() => setPromptInput(sp)}
                            className="p-3.5 rounded-2xl bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)] text-xs text-[var(--foreground)] text-left transition-all line-clamp-2"
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {chatMessages.map((msg) => (
                <div key={msg.localId} id={`msg_${msg.localId}`} className="space-y-4">
                  {/* USER PROMPT BUBBLE */}
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
                        <span>{msg.samplerName}</span>
                        <span>•</span>
                        <span>{msg.steps} steps</span>
                        <span>•</span>
                        <span>CFG {msg.guidanceScale}</span>
                        <span>•</span>
                        <span>Seed {msg.seed}</span>
                      </div>
                    </div>
                  </div>

                  {/* ASSISTANT RESPONSE CARD */}
                  <div className="flex justify-start">
                    <div className="max-w-3xl w-full rounded-2xl rounded-tl-sm bg-[var(--surface-overlay)] p-4 space-y-3.5">
                      {msg.status === "generating" && (
                        <div className="space-y-3 py-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold flex items-center gap-2" style={{ color: "var(--brand-accent)" }}>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Synthesizing image... {progressPercent}%
                            </span>
                            <span className="font-mono text-xs text-[var(--muted-foreground)]">
                              Step {currentStepProgress} / {msg.steps}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                            <div
                              className="h-full transition-all duration-200 rounded-full"
                              style={{
                                width: `${progressPercent}%`,
                                background: "linear-gradient(90deg, var(--brand-accent), var(--brand-secondary))"
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] font-mono">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" style={{ color: "var(--brand-secondary)" }} />
                              Elapsed: {elapsedTime}s
                            </span>
                            <span>
                              {etaTime > 0 ? `Est. Remaining: ${etaTime}s` : "Processing latent tensor..."}
                            </span>
                          </div>
                        </div>
                      )}

                      {msg.status === "error" && (
                        <div className="p-3 rounded-xl bg-rose-500/15 text-xs text-rose-400">
                          {msg.errorMsg || "Generation failed."}
                        </div>
                      )}

                      {msg.status === "completed" && msg.imageUrl && (
                        <>
                          {/* Image Viewport */}
                          <div
                            onClick={() => setFullscreenImage(msg)}
                            className="relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden bg-black/35 cursor-zoom-in group"
                          >
                            <Image
                              src={msg.imageUrl}
                              alt={msg.title || msg.prompt}
                              fill
                              unoptimized
                              className="object-contain group-hover:scale-[1.01] transition-transform duration-300"
                            />
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl apple-glass text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Saved Metadata Block */}
                          <div className="p-3.5 rounded-2xl bg-[var(--card)] space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    background: "var(--brand-secondary-soft)",
                                    color: "var(--brand-secondary)"
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                                >
                                  <Database className="w-3 h-3" />
                                  {msg.savedToDb ? "Metadata Saved (DB + PNG)" : "Metadata Embedded (PNG)"}
                                </span>
                                {msg.dbId && (
                                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                                    ID: {msg.dbId.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                              {msg.title && (
                                <span className="text-xs font-semibold text-[var(--foreground)] truncate max-w-xs">
                                  {msg.title}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                              <div className="p-2.5 rounded-xl bg-[var(--surface-overlay)]">
                                <span className="text-[10px] uppercase text-[var(--muted-foreground)] block">
                                  Model
                                </span>
                                <span className="text-[var(--foreground)] font-medium truncate block">
                                  {msg.modelName.replace("Stable Diffusion v1.5", "SD 1.5")}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-[var(--surface-overlay)]">
                                <span className="text-[10px] uppercase text-[var(--muted-foreground)] block">
                                  Sampler &amp; Steps
                                </span>
                                <span className="text-[var(--foreground)] font-medium">
                                  {msg.samplerName} • {msg.steps}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-[var(--surface-overlay)]">
                                <span className="text-[10px] uppercase text-[var(--muted-foreground)] block">
                                  CFG / Seed
                                </span>
                                <span className="text-[var(--foreground)] font-medium">
                                  {msg.guidanceScale} / #{msg.seed}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-[var(--surface-overlay)]">
                                <span className="text-[10px] uppercase text-[var(--muted-foreground)] block">
                                  Size &amp; Time
                                </span>
                                <span className="font-semibold" style={{ color: "var(--brand-secondary)" }}>
                                  {msg.resolution} • {msg.latencySec ? `${msg.latencySec.toFixed(2)}s` : "—"}
                                </span>
                              </div>
                            </div>

                            {msg.negativeTags.length > 0 && (
                              <div className="text-[11px] text-[var(--muted-foreground)] flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="font-semibold uppercase mr-1">Negative:</span>
                                {msg.negativeTags.slice(0, 6).map((t) => (
                                  <span
                                    key={t}
                                    style={{
                                      background: "var(--brand-tertiary-soft)",
                                      color: "var(--brand-tertiary)"
                                    }}
                                    className="px-2 py-0.5 rounded-full font-medium"
                                  >
                                    {t}
                                  </span>
                                ))}
                                {msg.negativeTags.length > 6 && (
                                  <span>+{msg.negativeTags.length - 6} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              onClick={() => handleDownload(msg)}
                              className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => handleToggleFavorite(msg)}
                              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                                msg.isFavorite
                                  ? "bg-rose-500/15 text-rose-400 font-medium"
                                  : "saas-btn-secondary"
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${msg.isFavorite ? "fill-rose-500" : ""}`} />
                              <span>{msg.isFavorite ? "Favorited" : "Favorite"}</span>
                            </button>

                            <button
                              onClick={() => handleCopyPrompt(msg)}
                              className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5"
                            >
                              {copiedId === msg.localId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Prompt</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleReuseSettings(msg)}
                              className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Use Settings</span>
                            </button>

                            <button
                              onClick={() => {
                                handleReuseSettings(msg);
                                const nextSeed = Math.floor(Math.random() * 100000);
                                setSeed(nextSeed);
                                handleGenerate({ prompt: msg.prompt, seed: nextSeed });
                              }}
                              disabled={isGenerating}
                              className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Floating Apple Liquid Glass Chat Composer */}
            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-2xl liquid-glass-elevated">
              <div className="flex items-stretch gap-2.5">
                <div className="flex-1 relative flex">
                  <textarea
                    rows={2}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    placeholder="Describe the architectural or creative scene to generate... (Press Enter to send)"
                    className="w-full h-[64px] saas-input px-4 py-2.5 pr-32 text-xs sm:text-sm resize-none leading-relaxed rounded-xl"
                  />
                  <span
                    className={`absolute right-3 bottom-2 text-[10px] font-mono pointer-events-none ${
                      estimatedTokens > 75
                        ? "text-rose-400 font-semibold"
                        : estimatedTokens > 60
                        ? "text-amber-400"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    ~{estimatedTokens} / 77 tokens
                  </span>
                </div>

                <button
                  onClick={() => handleGenerate()}
                  disabled={isGenerating || !promptInput.trim()}
                  className="h-[64px] px-5 saas-btn-primary rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-mono">{progressPercent}%</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Fullscreen Lightbox */}
          {fullscreenImage && fullscreenImage.imageUrl && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
              <button
                onClick={() => setFullscreenImage(null)}
                aria-label="Close Fullscreen"
                className="absolute top-6 right-6 p-2.5 rounded-full apple-glass text-white hover:scale-105 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative max-w-5xl w-full h-[82vh] rounded-3xl overflow-hidden">
                <Image
                  src={fullscreenImage.imageUrl}
                  alt={fullscreenImage.prompt}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Share Session Modal */}
          {shareModalOpen && activeChatId && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl liquid-glass-elevated p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
                    >
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--foreground)]">Share Project Session</h3>
                      <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[240px]">
                        {activeChatTitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShareModalOpen(false)}
                    className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isChatShared && shareUrl ? (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      Anyone with this link can view the full prompt conversation, parameters, and generated AWS S3 images.
                    </p>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-overlay)]">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-transparent text-xs font-mono text-[var(--foreground)] outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(shareUrl);
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 1800);
                        }}
                        className="px-3 py-1.5 saas-btn-primary text-xs flex items-center gap-1.5"
                      >
                        {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{shareCopied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium flex items-center gap-1 hover:underline"
                        style={{ color: "var(--brand-accent)" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Shared View</span>
                      </a>
                      <button
                        onClick={() => void handleToggleShareChat(false)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-medium hover:bg-rose-500/25 transition-colors cursor-pointer"
                      >
                        Disable Sharing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Sharing is currently disabled for this session.
                    </p>
                    <button
                      onClick={() => void handleToggleShareChat(true)}
                      className="w-full py-2.5 saas-btn-primary text-xs font-semibold cursor-pointer"
                    >
                      Enable Public Share Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {benchPreviewImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
              onClick={() => setBenchPreviewImage(null)}
            >
              <div
                className="saas-card max-w-xl w-full p-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--foreground)]">
                    {benchPreviewImage.title}
                  </span>
                  <button
                    onClick={() => setBenchPreviewImage(null)}
                    className="p-1.5 rounded-lg saas-btn-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden bg-black/30">
                  <img
                    src={benchPreviewImage.url}
                    alt={benchPreviewImage.title}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== VIEW 2: SAMPLER BENCHMARK MATRIX ===== */}
      {activeSubTab === "benchmark" && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-1">
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--brand-accent-soft)",
                    color: "var(--brand-accent)"
                  }}
                >
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                    Sampler Matrix Sweep
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Compare latency &amp; FID across step counts
                  </p>
                </div>
              </div>
              <button
                onClick={handleRunCustomBenchmark}
                disabled={isBenchmarking}
                className="px-4 py-2 saas-btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isBenchmarking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="text-xs">{isBenchmarking ? "Running..." : "Execute Sweep"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[var(--muted-foreground)] uppercase block mb-1.5 font-semibold">
                  Samplers
                </label>
                <div className="flex gap-2">
                  {["DDIM", "DDPM"].map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSampler(s)}
                      style={
                        benchSamplers.includes(s)
                          ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                          : undefined
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        benchSamplers.includes(s)
                          ? "font-semibold"
                          : "bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted-foreground)] uppercase block mb-1.5 font-semibold">
                  Step Checkpoints
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from(new Set([10, 20, 30, 50, 75, 100, ...benchSteps]))
                    .sort((a, b) => a - b)
                    .map((v) => (
                      <button
                        key={v}
                        onClick={() => toggleStep(v)}
                        style={
                          benchSteps.includes(v)
                            ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                            : undefined
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          benchSteps.includes(v)
                            ? "font-semibold"
                            : "bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customStepInput}
                      onChange={(e) => setCustomStepInput(e.target.value)}
                      placeholder="Custom..."
                      className="w-20 px-2.5 py-1.5 rounded-xl bg-[var(--surface-overlay)] text-xs text-[var(--foreground)] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(customStepInput, 10);
                        if (!isNaN(val) && val >= 1 && val <= 1000 && !benchSteps.includes(val)) {
                          setBenchSteps([...benchSteps, val].sort((a, b) => a - b));
                          setCustomStepInput("");
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl saas-btn-secondary text-xs font-medium cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
              <div className="md:col-span-6">
                <label className="text-[11px] text-[var(--muted-foreground)] uppercase block mb-1.5 font-semibold">
                  Sweep Prompt
                </label>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Enter prompt for sampler matrix..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-overlay)] text-xs text-[var(--foreground)] outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-[var(--muted-foreground)] uppercase font-semibold">
                    Guidance Scale
                  </label>
                  <span className="text-xs font-mono text-[var(--foreground)]">{benchGuidance.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={benchGuidance}
                  onChange={(e) => setBenchGuidance(parseFloat(e.target.value))}
                  className="w-full accent-[var(--brand-accent)] cursor-pointer mt-1.5"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-[11px] text-[var(--muted-foreground)] uppercase block mb-1.5 font-semibold">
                  RNG Seed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={benchSeed}
                    onChange={(e) => setBenchSeed(Number(e.target.value) || 0)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--surface-overlay)] text-xs text-[var(--foreground)] font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setBenchSeed(Math.floor(Math.random() * 1000000))}
                    className="p-2 rounded-xl saas-btn-secondary flex items-center justify-center cursor-pointer"
                    title="Randomize RNG Seed"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {benchLiveMsg && (
              <div
                className="px-3.5 py-2.5 rounded-xl text-xs"
                style={{
                  background: "var(--brand-accent-soft)",
                  color: "var(--brand-accent)"
                }}
              >
                {benchLiveMsg}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="saas-card p-5 space-y-3">
              <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                Sampling Latency (s)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchGraphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.16)" vertical={false} />
                    <XAxis dataKey="steps" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} unit="s" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "var(--foreground)",
                        boxShadow: "var(--glass-shadow)"
                      }}
                    />
                    <Line type="monotone" dataKey="ddim_latency" name="DDIM" stroke="var(--brand-accent)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="ddpm_latency" name="DDPM" stroke="var(--brand-secondary)" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="saas-card p-5 space-y-3">
              <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                FID Quality (lower = better)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchGraphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.16)" vertical={false} />
                    <XAxis dataKey="steps" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "var(--foreground)",
                        boxShadow: "var(--glass-shadow)"
                      }}
                    />
                    <Line type="monotone" dataKey="ddim_fid" name="DDIM FID" stroke="var(--brand-accent)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="ddpm_fid" name="DDPM FID" stroke="var(--brand-secondary)" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {benchResults.some((r) => r.image_url) && (
            <div className="saas-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  All Generated Images ({benchResults.filter((r) => r.image_url).length})
                </h4>
                <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                  Seed: {benchSeed}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {benchResults
                  .filter((r) => r.image_url)
                  .map((r, idx) => (
                    <div
                      key={`${r.sampler}-${r.steps}-${idx}`}
                      className="rounded-xl overflow-hidden bg-[var(--surface-overlay)] flex flex-col"
                    >
                      <div
                        className="relative aspect-square w-full bg-black/20 cursor-pointer group"
                        onClick={() =>
                          setBenchPreviewImage({
                            url: resolveMediaUrl(r.image_url!) || "",
                            title: `${r.sampler} • ${r.steps} steps (Seed ${benchSeed})`,
                          })
                        }
                      >
                        <img
                          src={resolveMediaUrl(r.image_url!)}
                          alt={`${r.sampler} ${r.steps} steps`}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      </div>
                      <div className="p-3 flex items-center justify-between text-[11px] font-mono">
                        <span className="font-semibold text-[var(--foreground)]">
                          {r.sampler} • {r.steps}s
                        </span>
                        <span className="text-emerald-400">{r.latency}s</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {benchPreviewImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
              onClick={() => setBenchPreviewImage(null)}
            >
              <div
                className="saas-card max-w-xl w-full p-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[var(--foreground)]">
                    {benchPreviewImage.title}
                  </span>
                  <button
                    onClick={() => setBenchPreviewImage(null)}
                    className="p-1.5 rounded-lg saas-btn-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden bg-black/30">
                  <img
                    src={benchPreviewImage.url}
                    alt={benchPreviewImage.title}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
