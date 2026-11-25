"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  Edit2,
  Trash2,
  Copy,
  Check,
  FolderPlus,
  Layers,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Plus
} from "lucide-react";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { GenerationItem, GalleryResponse, CustomLibrary, LibrariesResponse } from "@/types/gallery";

export const DesignGallery: React.FC = () => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"all" | "libraries">("all");
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [libraries, setLibraries] = useState<CustomLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [samplerFilter, setSamplerFilter] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<GenerationItem | null>(null);
  const [renameItem, setRenameItem] = useState<GenerationItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addToLibItem, setAddToLibItem] = useState<GenerationItem | null>(null);
  const [showCreateLibModal, setShowCreateLibModal] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibDesc, setNewLibDesc] = useState("");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy
      });
      if (search.trim()) params.append("search", search.trim());
      if (modelFilter) params.append("model_name", modelFilter);
      if (samplerFilter) params.append("sampler_name", samplerFilter);
      if (onlyFavorites) params.append("is_favorite", "true");
      if (selectedLibraryId) params.append("library_id", selectedLibraryId);

      const res = await fetch(`http://localhost:8001/api/gallery?${params.toString()}`);
      if (res.ok) {
        const data: GalleryResponse = await res.json();
        setItems(
          data.items.map((it) => ({
            ...it,
            image_url: it.image_url ? it.image_url.replace(":8000/", ":8001/") : it.image_url
          }))
        );
        setTotalPages(data.pagination.total_pages);
        setTotalRecords(data.pagination.total_records);
      }
    } catch (e) {
      console.warn("Error fetching gallery:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, modelFilter, samplerFilter, onlyFavorites, selectedLibraryId, sortBy]);

  const fetchLibraries = async () => {
    try {
      const res = await fetch("http://localhost:8001/api/gallery/libraries/all");
      if (res.ok) {
        const data: LibrariesResponse = await res.json();
        setLibraries(
          data.libraries.map((l) => ({
            ...l,
            cover_image_url: l.cover_image_url ? l.cover_image_url.replace(":8000/", ":8001/") : l.cover_image_url
          }))
        );
      }
    } catch (e) {
      console.warn("Error fetching libraries:", e);
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fetchGallery();
    });
    return () => cancelAnimationFrame(id);
  }, [fetchGallery]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fetchLibraries();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const handleToggleFavorite = async (item: GenerationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8001/api/gallery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !item.is_favorite })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i))
        );
        if (selectedItem?.id === item.id) {
          setSelectedItem((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRename = async () => {
    if (!renameItem || !newTitle.trim()) return;
    try {
      const res = await fetch(`http://localhost:8001/api/gallery/${renameItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === renameItem.id ? { ...i, title: newTitle.trim() } : i))
        );
        if (selectedItem?.id === renameItem.id) {
          setSelectedItem((prev) => (prev ? { ...prev, title: newTitle.trim() } : null));
        }
        setRenameItem(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8001/api/gallery/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (selectedItem?.id === id) setSelectedItem(null);
        setDeleteConfirmId(null);
        await fetchGallery();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLibrary = async () => {
    if (!newLibName.trim()) return;
    try {
      const res = await fetch("http://localhost:8001/api/gallery/libraries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLibName.trim(), description: newLibDesc.trim() || null })
      });
      if (res.ok) {
        setNewLibName("");
        setNewLibDesc("");
        setShowCreateLibModal(false);
        fetchLibraries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToLibrary = async (libraryId: string) => {
    if (!addToLibItem) return;
    try {
      const res = await fetch(`http://localhost:8001/api/gallery/libraries/${libraryId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generation_id: addToLibItem.id })
      });
      if (res.ok) {
        setAddToLibItem(null);
        fetchLibraries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleSendToStudio = (item: GenerationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.chat_id) {
      router.push(`/studio?chat=${encodeURIComponent(item.chat_id)}`);
    } else {
      router.push(`/studio?gen=${encodeURIComponent(item.id)}`);
    }
  };

  return (
    <div className="my-2">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "var(--brand-accent)" }} />
            Architectural Gallery &amp; Collections
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Saved generations with complete sampling metadata and collections
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex liquid-glass p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab("all");
                setSelectedLibraryId(null);
              }}
              style={
                activeTab === "all"
                  ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                  : undefined
              }
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "all"
                  ? ""
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              All Generations ({totalRecords})
            </button>
            <button
              onClick={() => setActiveTab("libraries")}
              style={
                activeTab === "libraries"
                  ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                  : undefined
              }
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "libraries"
                  ? ""
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Collections ({libraries.length})
            </button>
          </div>

          <button
            onClick={() => setShowCreateLibModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 saas-btn-secondary text-xs rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            New Collection
          </button>
        </div>
      </div>

      {/* Liquid Glass Search & Filter Toolbar */}
      {activeTab === "all" && (
        <div className="my-4 p-3 rounded-2xl liquid-glass flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search mockups by keyword, style, or title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full saas-input pl-10 pr-4 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlassSelect
              ariaLabel="Filter by Model"
              value={modelFilter}
              onChange={(val) => {
                setModelFilter(val);
                setPage(1);
              }}
              className="min-w-[180px]"
              options={[
                { value: "", label: "All Models" },
                { value: "Stable Diffusion v1.5 (Fine-Tuned)", label: "Fine-Tuned (Bedroom LoRA)" },
                { value: "Stable Diffusion v1.5", label: "Base SD 1.5" }
              ]}
            />

            <GlassSelect
              ariaLabel="Filter by Sampler"
              value={samplerFilter}
              onChange={(val) => {
                setSamplerFilter(val);
                setPage(1);
              }}
              className="min-w-[155px]"
              options={[
                { value: "", label: "All Samplers" },
                { value: "DDIM", label: "DDIM (ODE)" },
                { value: "DDPM", label: "DDPM (Markov)" }
              ]}
            />

            <button
              onClick={() => {
                setOnlyFavorites((prev) => !prev);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                onlyFavorites
                  ? "bg-rose-500/20 text-rose-400"
                  : "saas-btn-secondary"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-rose-400 text-rose-400" : ""}`} />
              Favorites
            </button>

            <GlassSelect
              ariaLabel="Sort Creations"
              value={sortBy}
              onChange={setSortBy}
              className="min-w-[165px]"
              options={[
                { value: "created_at_desc", label: "Newest First" },
                { value: "created_at_asc", label: "Oldest First" },
                { value: "steps_desc", label: "Steps: High to Low" },
                { value: "latency_desc", label: "Slowest Compute" }
              ]}
            />
          </div>
        </div>
      )}

      {/* Selected Library Filter Banner */}
      {selectedLibraryId && (
        <div
          className="mb-4 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs"
          style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Filtered by Library:{" "}
            <strong>{libraries.find((l) => l.id === selectedLibraryId)?.name}</strong>
          </span>
          <button
            onClick={() => setSelectedLibraryId(null)}
            className="text-[var(--foreground)] text-xs underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* GALLERY GRID */}
      {activeTab === "all" && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="saas-card h-80 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="saas-card p-12 text-center my-8">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: "var(--brand-accent)" }} />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">No Generations Found</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
                No mockups match your search filters, or no images have been generated yet. Create one in Chat Studio!
              </p>
              <button
                onClick={() => router.push("/studio")}
                className="mt-4 px-4 py-2 saas-btn-primary text-xs rounded-xl"
              >
                Go to Chat Studio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" suppressHydrationWarning>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative apple-card overflow-hidden flex flex-col justify-between cursor-pointer hover:scale-[1.01]"
                  suppressHydrationWarning
                >
                  <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden" suppressHydrationWarning>
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      unoptimized
                      priority={idx < 3}
                      loading={idx < 3 ? "eager" : "lazy"}
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full apple-glass text-[10px] font-mono text-white font-medium">
                        {item.sampler_name} • {item.steps}s
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(item, e)}
                      aria-label="Toggle Favorite"
                      className="absolute top-3 right-3 p-2 rounded-full apple-glass hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition-colors ${
                          item.is_favorite
                            ? "fill-rose-500 text-rose-500"
                            : "text-white/85 hover:text-rose-400"
                        }`}
                      />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameItem(item);
                          setNewTitle(item.title);
                        }}
                        className="px-3 py-1.5 apple-glass text-white text-[11px] font-medium rounded-full flex items-center gap-1.5 hover:bg-white/20 active:scale-95 transition-all"
                      >
                        <Edit2 className="w-3 h-3" style={{ color: "var(--brand-accent)" }} />
                        Rename
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddToLibItem(item);
                          }}
                          title="Add to Collection"
                          aria-label="Add to Collection"
                          className="p-2 apple-glass text-white rounded-full hover:bg-white/20 active:scale-95 transition-all"
                        >
                          <FolderPlus className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                        </button>
                        <button
                          onClick={(e) => handleSendToStudio(item, e)}
                          title="Open in Studio"
                          aria-label="Open in Studio"
                          style={{ background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }}
                          className="p-2 rounded-full active:scale-95 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                          }}
                          title="Delete Mockup"
                          aria-label="Delete Mockup"
                          className="p-2 apple-glass text-rose-400 rounded-full hover:bg-rose-500/20 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 bg-[var(--card)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-[var(--foreground)] tracking-tight truncate max-w-[210px]">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          #{item.seed}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 mt-1.5 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-between text-[10px] font-mono text-[var(--muted-foreground)]">
                      <span className="font-medium truncate max-w-[140px]" style={{ color: "var(--brand-accent)" }}>
                        {item.model_name.replace("Stable Diffusion v1.5", "SD 1.5")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>{item.resolution}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.latency_sec.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <span className="text-[var(--muted-foreground)]">
                Showing Page <strong style={{ color: "var(--brand-accent)" }}>{page}</strong> of{" "}
                <strong className="text-[var(--foreground)]">{totalPages}</strong> ({totalRecords} total mockups)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 saas-btn-secondary disabled:opacity-40 rounded-lg text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-[var(--muted-foreground)]">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        style={
                          page === p
                            ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                            : undefined
                        }
                        className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center transition-all ${
                          page === p ? "font-bold" : "saas-btn-secondary"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 saas-btn-secondary disabled:opacity-40 rounded-lg text-xs flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MY LIBRARIES TAB */}
      {activeTab === "libraries" && (
        <div className="my-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {libraries.map((lib) => (
              <div
                key={lib.id}
                onClick={() => {
                  setSelectedLibraryId(lib.id);
                  setActiveTab("all");
                  setPage(1);
                }}
                className="group saas-card overflow-hidden cursor-pointer flex flex-col justify-between hover:scale-[1.01]"
              >
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                  {lib.cover_image_url ? (
                    <Image
                      src={lib.cover_image_url}
                      alt={lib.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                      <Layers className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-mono">Empty Collection</span>
                    </div>
                  )}
                  <div
                    className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full apple-glass text-[10px] font-mono"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    {lib.item_count} items
                  </div>
                </div>

                <div className="p-4 bg-[var(--card)]">
                  <h4 className="text-sm font-bold text-[var(--foreground)] tracking-tight">{lib.name}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                    {lib.description || "No description provided."}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono" style={{ color: "var(--brand-accent)" }}>
                    <span>Browse Collection &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col md:flex-row">
            <div className="relative md:w-1/2 aspect-square bg-black flex items-center justify-center p-2">
              <Image
                src={selectedItem.image_url}
                alt={selectedItem.title}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            <div className="p-6 md:w-1/2 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                      {selectedItem.title}
                    </h3>
                    <span className="text-xs font-mono" style={{ color: "var(--brand-accent)" }}>
                      {selectedItem.model_name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close Preview"
                    className="p-1.5 rounded-xl bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted-foreground)] uppercase">
                    <span>Generation Prompt</span>
                    <button
                      onClick={() => copyToClipboard(selectedItem.prompt, "modal_p")}
                      style={{ color: "var(--brand-accent)" }}
                      className="hover:underline flex items-center gap-1"
                    >
                      {copiedPromptId === "modal_p" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-[var(--surface-overlay)] rounded-2xl p-3 text-xs text-[var(--foreground)] leading-relaxed max-h-32 overflow-y-auto">
                    {selectedItem.prompt}
                  </div>
                </div>

                {selectedItem.negative_prompt && (
                  <div className="mt-3 space-y-1">
                    <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase block">
                      Negative Prompt
                    </span>
                    <div className="bg-[var(--surface-overlay)] rounded-2xl p-2.5 text-[11px] text-[var(--muted-foreground)] max-h-20 overflow-y-auto">
                      {selectedItem.negative_prompt}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono">
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Sampler</span>
                    <span className="font-semibold" style={{ color: "var(--brand-accent)" }}>
                      {selectedItem.sampler_name}
                    </span>
                  </div>
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Steps &amp; CFG</span>
                    <span className="text-[var(--foreground)] font-semibold">
                      {selectedItem.steps} steps @ {selectedItem.guidance_scale}
                    </span>
                  </div>
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Seed</span>
                    <span className="text-[var(--foreground)]">{selectedItem.seed}</span>
                  </div>
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Resolution</span>
                    <span className="text-[var(--foreground)]">{selectedItem.resolution}</span>
                  </div>
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Sampling Latency</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedItem.latency_sec.toFixed(2)}s
                    </span>
                  </div>
                  <div className="bg-[var(--surface-overlay)] p-2.5 rounded-xl">
                    <span className="text-[var(--muted-foreground)] block">Created</span>
                    <span className="text-[var(--foreground)]">
                      {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString() : "Saved"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => window.open(selectedItem.image_url, "_blank")}
                  className="px-3 py-2 saas-btn-secondary text-xs font-mono rounded-xl flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Full Resolution
                </button>

                <button
                  onClick={() => handleSendToStudio(selectedItem)}
                  className="px-4 py-2 saas-btn-primary text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load into Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">Rename Mockup</h4>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full saas-input p-2.5 text-xs mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameItem(null)}
                className="px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button onClick={handleSaveRename} className="px-4 py-1.5 saas-btn-primary text-xs rounded-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-sm w-full">
            <h4 className="text-sm font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Confirm Permanent Deletion
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              This will permanently delete this generation record and its stored image file. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO LIBRARY MODAL */}
      {addToLibItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-[var(--foreground)] mb-2 flex items-center gap-2">
              <FolderPlus className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
              Add to Collection / Library
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Select a custom library collection to store &ldquo;{addToLibItem.title}&rdquo;:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
              {libraries.map((lib) => (
                <button
                  key={lib.id}
                  onClick={() => handleAddToLibrary(lib.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)] text-xs text-[var(--foreground)] flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold">{lib.name}</span>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {lib.item_count} items
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setAddToLibItem(null)}
                className="px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW LIBRARY MODAL */}
      {showCreateLibModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-elevated rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
              Create Custom Library
            </h4>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist Master Bedrooms"
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  className="w-full saas-input p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[var(--muted-foreground)] block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-contrast ambient master suites generated with fine-tuned LoRA..."
                  value={newLibDesc}
                  onChange={(e) => setNewLibDesc(e.target.value)}
                  className="w-full saas-input p-2.5 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateLibModal(false)}
                className="px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button onClick={handleCreateLibrary} className="px-4 py-1.5 saas-btn-primary text-xs rounded-xl">
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
