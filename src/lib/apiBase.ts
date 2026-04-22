const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

function resolveApiBase(): string {
  const envBase =
    (import.meta as any).env?.VITE_API_BASE ||
    (import.meta as any).env?.VITE_API_BASE_URL;

  if (typeof envBase === "string" && envBase.trim()) {
    return trimTrailingSlash(envBase.trim());
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const { hostname, port, protocol } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }

  if (port === "5173") {
    return `${protocol}//${hostname}:8000`;
  }

  return trimTrailingSlash(window.location.origin);
}

export const API_BASE = resolveApiBase();
