function normalizeUrl(url?: string) {
  if (!url) return url;
  return url.replace(/\/$/, "");
}

const fallbackOrigin = "http://localhost:3001";

export const API_BASE_URL = normalizeUrl(import.meta.env.VITE_API_BASE_URL) || fallbackOrigin;
export const SOCKET_URL = normalizeUrl(import.meta.env.VITE_SOCKET_URL) || API_BASE_URL;

export function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
