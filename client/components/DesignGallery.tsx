"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Heart,
  Edit2,
  Trash2,
  Copy,
  Check,
  FolderPlus,
  Layers,
  Sparkles,
  Clock,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Plus
} from "lucide-react";
import { GenerationItem, GalleryResponse, CustomLibrary, LibrariesResponse } from "@/types/gallery";

export const DesignGallery: React.FC = () => {
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<"all" | "libraries">("all");
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [libraries, setLibraries] = useState<CustomLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // 3 cols x 3 rows
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [samplerFilter, setSamplerFilter] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState<GenerationItem | null>(null);
  const [renameItem, setRenameItem] = useState<GenerationItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addToLibItem, setAddToLibItem] = useState<GenerationItem | null>(null);
  const [showCreateLibModal, setShowCreateLibModal] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibDesc, setNewLibDesc] = useState("");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Fetch Gallery Items
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
        setItems(data.items);
        setTotalPages(data.pagination.total_pages);
        setTotalRecords(data.pagination.total_records);
      }
    } catch (e) {
      console.warn("Error fetching gallery:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, modelFilter, samplerFilter, onlyFavorites, selectedLibraryId, sortBy]);

  // Fetch Libraries
  const fetchLibraries = async () => {
    try {
      const res = await fetch("http://localhost:8001/api/gallery/libraries/all");
      if (res.ok) {
        const data: LibrariesResponse = await res.json();
        setLibraries(data.libraries);
      }
    } catch (e) {
      console.warn("Error fetching libraries:", e);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  useEffect(() => {
    fetchLibraries();
  }, []);

  // Handlers
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
        // Refetch gallery so the next item fills the slot and pagination remains exact
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
    // Route to studio with pre-loaded params
    router.push(
      `/studio?prompt=${encodeURIComponent(item.prompt)}&model=${encodeURIComponent(
        item.model_name
      )}&sampler=${encodeURIComponent(item.sampler_name)}&steps=${item.steps}&guidance=${
        item.guidance_scale
      }&seed=${item.seed}`
    );
  };

  return (
    <div className="my-4">
      {/* Top Header & View Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            Architectural Gallery & Custom Libraries
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Database-indexed diffusion mockups with PostgreSQL persistence & flexible cloud storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#0f172a] border border-[#1e293b] p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab("all");
                setSelectedLibraryId(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-sky-500 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Generations ({totalRecords})
            </button>
            <button
              onClick={() => setActiveTab("libraries")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "libraries"
                  ? "bg-sky-500 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              My Libraries ({libraries.length})
            </button>
          </div>

          <button
            onClick={() => setShowCreateLibModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-sky-500/20 hover:text-sky-300 border border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-200 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Collection
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {activeTab === "all" && (
        <div className="my-4 p-3.5 bg-[#0f172a]/90 border border-[#1e293b] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by prompt keywords or mockup title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#131b2e] border border-[#23324d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#131b2e] border border-[#23324d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Models</option>
              <option value="Stable Diffusion v1.5 (Fine-Tuned)">Fine-Tuned (Bedroom LoRA)</option>
              <option value="Stable Diffusion v1.5">Base SD 1.5</option>
            </select>

            {/* Sampler Filter */}
            <select
              value={samplerFilter}
              onChange={(e) => {
                setSamplerFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#131b2e] border border-[#23324d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Samplers</option>
              <option value="DDIM">DDIM (ODE)</option>
              <option value="DDPM">DDPM (Markov)</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => {
                setOnlyFavorites((prev) => !prev);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                onlyFavorites
                  ? "bg-rose-500/20 border-rose-500/60 text-rose-300"
                  : "bg-[#131b2e] border-[#23324d] text-slate-400 hover:text-white"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-rose-400 text-rose-400" : ""}`} />
              Favorites
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#131b2e] border border-[#23324d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="steps_desc">Steps: High to Low</option>
              <option value="latency_desc">Slowest Compute</option>
            </select>
          </div>
        </div>
      )}

      {/* Selected Library Filter Banner */}
      {selectedLibraryId && (
        <div className="mb-4 px-4 py-2 bg-sky-950/40 border border-sky-800/60 rounded-lg flex items-center justify-between text-xs">
          <span className="text-sky-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Filtered by Library:{" "}
            <strong>{libraries.find((l) => l.id === selectedLibraryId)?.name}</strong>
          </span>
          <button
            onClick={() => setSelectedLibraryId(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Clear filter (show all)
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3-COLUMN RESPONSIVE GALLERY GRID                               */}
      {/* ============================================================== */}
      {activeTab === "all" && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-[#0e1626] border border-[#1e293b] rounded-xl h-80 animate-pulse"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-[#0f172a]/60 border border-dashed border-[#1e293b] rounded-2xl p-12 text-center my-8">
              <Sparkles className="w-10 h-10 text-sky-400/50 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No Generations Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No mockups match your search filters, or no images have been generated yet. Create
                one in the Studio!
              </p>
              <button
                onClick={() => router.push("/studio")}
                className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs rounded-lg transition-colors"
              >
                Go to Studio Generator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" suppressHydrationWarning>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative bg-[#0f1728]/95 border border-[#1e293b] hover:border-sky-500/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-sky-950/30 flex flex-col justify-between cursor-pointer"
                  suppressHydrationWarning
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-square w-full bg-black/60 overflow-hidden" suppressHydrationWarning>
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      unoptimized
                      priority={idx < 3}
                      loading={idx < 3 ? "eager" : "lazy"}
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-mono text-sky-400 font-semibold">
                        {item.sampler_name} • {item.steps}s
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(item, e)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-slate-700 hover:border-rose-400 transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          item.is_favorite
                            ? "fill-rose-500 text-rose-500"
                            : "text-slate-300 hover:text-rose-400"
                        }`}
                      />
                    </button>

                    {/* Quick Hover Action Bar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameItem(item);
                          setNewTitle(item.title);
                        }}
                        className="px-2 py-1 bg-black/80 hover:bg-slate-800 text-slate-200 text-[10px] font-mono rounded border border-slate-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-sky-400" />
                        Rename
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddToLibItem(item);
                          }}
                          title="Add to Collection"
                          className="p-1.5 bg-black/80 hover:bg-slate-800 text-slate-200 rounded border border-slate-700"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                        <button
                          onClick={(e) => handleSendToStudio(item, e)}
                          title="Open in Studio"
                          className="p-1.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                          }}
                          title="Delete Mockup"
                          className="p-1.5 bg-black/80 hover:bg-rose-900/80 text-rose-400 rounded border border-slate-700 hover:border-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Content Footer */}
                  <div className="p-3.5 bg-[#0b1220] border-t border-[#1a2538] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white tracking-tight truncate max-w-[200px]">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          Seed: {item.seed}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#182335] flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="text-sky-300 truncate max-w-[150px]">
                        {item.model_name.replace("Stable Diffusion v1.5", "SD 1.5")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {item.latency_sec.toFixed(1)}s
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-500" />
                          {(item.peak_vram_mb / 1024).toFixed(1)}GB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 pt-4 border-t border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <span className="text-slate-400">
                Showing Page <strong className="text-sky-400">{page}</strong> of{" "}
                <strong className="text-slate-200">{totalPages}</strong> ({totalRecords} total
                mockups)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-[#131b2e] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#131b2e] border border-slate-700 rounded-md text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-slate-500">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-md font-mono text-xs flex items-center justify-center transition-all ${
                          page === p
                            ? "bg-sky-500 text-black font-bold"
                            : "bg-[#131b2e] border border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-[#131b2e] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#131b2e] border border-slate-700 rounded-md text-slate-300 flex items-center gap-1 transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MY LIBRARIES TAB                                               */}
      {/* ============================================================== */}
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
                className="group bg-[#0f1728] border border-[#1e293b] hover:border-sky-500/60 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-950/20 flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full bg-black/60 overflow-hidden">
                  {lib.cover_image_url ? (
                    <Image
                      src={lib.cover_image_url}
                      alt={lib.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <Layers className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-mono">Empty Collection</span>
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-slate-700 text-[10px] font-mono text-sky-400">
                    {lib.item_count} items
                  </div>
                </div>

                <div className="p-4 bg-[#0b1220] border-t border-[#1a2538]">
                  <h4 className="text-sm font-bold text-white tracking-tight">{lib.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {lib.description || "No description provided."}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-sky-400">
                    <span>Browse Collection &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DETAIL MODAL / LIGHTBOX                                        */}
      {/* ============================================================== */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl">
            {/* Image side */}
            <div className="relative md:w-1/2 aspect-square bg-black flex items-center justify-center p-2">
              <Image
                src={selectedItem.image_url}
                alt={selectedItem.title}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            {/* Info side */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#1e293b]">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {selectedItem.title}
                    </h3>
                    <span className="text-xs font-mono text-sky-400">
                      {selectedItem.model_name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Prompt block */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase">
                    <span>Generation Prompt</span>
                    <button
                      onClick={() => copyToClipboard(selectedItem.prompt, "modal_p")}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      {copiedPromptId === "modal_p" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#131b2e] border border-[#23324d] rounded-lg p-2.5 text-xs text-slate-200 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedItem.prompt}
                  </div>
                </div>

                {/* Technical Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono">
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Sampler</span>
                    <span className="text-sky-300 font-semibold">{selectedItem.sampler_name}</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Steps & CFG</span>
                    <span className="text-slate-200 font-semibold">
                      {selectedItem.steps} steps @ {selectedItem.guidance_scale}
                    </span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Seed</span>
                    <span className="text-slate-200">{selectedItem.seed}</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Resolution</span>
                    <span className="text-slate-200">{selectedItem.resolution}</span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Sampling Latency</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedItem.latency_sec.toFixed(2)}s
                    </span>
                  </div>
                  <div className="bg-[#101726] p-2 rounded border border-[#1e293b]">
                    <span className="text-slate-500 block">Peak VRAM</span>
                    <span className="text-slate-200">
                      {(selectedItem.peak_vram_mb / 1024).toFixed(2)} GB
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-[#1e293b] flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    window.open(selectedItem.image_url, "_blank");
                  }}
                  className="px-3 py-2 bg-[#131b2e] hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-lg border border-slate-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Full Resolution
                </button>

                <button
                  onClick={() => handleSendToStudio(selectedItem)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load into Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RENAME MODAL                                                   */}
      {/* ============================================================== */}
      {renameItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-white mb-2">Rename Mockup</h4>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#23324d] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameItem(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-rose-900/60 rounded-xl p-5 max-w-sm w-full">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Confirm Permanent Deletion
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              This will permanently delete this generation record from PostgreSQL and wipe the image
              file from storage. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD TO LIBRARY MODAL                                           */}
      {/* ============================================================== */}
      {addToLibItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-sky-400" />
              Add to Collection / Library
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Select a custom library collection to store &ldquo;{addToLibItem.title}&rdquo;:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
              {libraries.map((lib) => (
                <button
                  key={lib.id}
                  onClick={() => handleAddToLibrary(lib.id)}
                  className="w-full text-left p-2.5 rounded-lg bg-[#131b2e] hover:bg-sky-500/20 hover:border-sky-500 border border-[#23324d] text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold">{lib.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {lib.item_count} items
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setAddToLibItem(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATE NEW LIBRARY MODAL                                       */}
      {/* ============================================================== */}
      {showCreateLibModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-5 max-w-md w-full">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              Create Custom Library
            </h4>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist Master Bedrooms"
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  className="w-full bg-[#131b2e] border border-[#23324d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-contrast ambient master suites generated with fine-tuned LoRA..."
                  value={newLibDesc}
                  onChange={(e) => setNewLibDesc(e.target.value)}
                  className="w-full bg-[#131b2e] border border-[#23324d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateLibModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLibrary}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs rounded-lg"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
