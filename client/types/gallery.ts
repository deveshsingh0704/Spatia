export interface GenerationItem {
  id: string;
  title: string;
  image_url: string;
  storage_key: string;
  prompt: string;
  negative_prompt?: string | null;
  seed: number;
  model_name: string;
  sampler_name: string;
  steps: number;
  guidance_scale: number;
  resolution: string;
  width: number;
  height: number;
  latency_sec: number;
  peak_vram_mb: number;
  is_favorite: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface GalleryResponse {
  items: GenerationItem[];
  pagination: PaginationMeta;
}

export interface CustomLibrary {
  id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  item_count: number;
}

export interface LibrariesResponse {
  libraries: CustomLibrary[];
}

