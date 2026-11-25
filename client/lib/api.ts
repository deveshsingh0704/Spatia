/**
 * Centralized backend API URL helpers for local development and cloud deployments.
 * Set NEXT_PUBLIC_API_URL in Vercel / production environment (e.g. https://api.latentcraft.com).
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
).replace(/\/+$/, "");

/** Builds a full backend API URL from a relative path (e.g. "/api/generate"). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Rewrites legacy local backend URLs (e.g. port 8000 or localhost:8001) to the configured
 * API_BASE_URL while leaving AWS S3 / CloudFront / HTTPS CDN URLs untouched.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://localhost:8000/")) {
    return `${API_BASE_URL}/${url.slice("http://localhost:8000/".length)}`;
  }
  if (url.startsWith("http://localhost:8001/")) {
    return `${API_BASE_URL}/${url.slice("http://localhost:8001/".length)}`;
  }
  if (url.startsWith("http://127.0.0.1:8001/")) {
    return `${API_BASE_URL}/${url.slice("http://127.0.0.1:8001/".length)}`;
  }
  return url;
}

