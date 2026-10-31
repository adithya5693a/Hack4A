export const SERVER_BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export const BACKEND_URL =
  typeof window !== "undefined"
    ? "" // Client browser always makes same-origin calls (/api/..., /health) to eliminate mixed-content and CORS on HTTPS Vercel
    : SERVER_BACKEND_URL;

export function getWsUrl(): string {
  if (typeof window === "undefined") {
    return "ws://127.0.0.1:8000/ws/security-stream";
  }

  // If local development, talk to local FastAPI WebSocket
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://127.0.0.1:8000/ws/security-stream";
  }

  // If public secure backend URL provided
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.startsWith("https://")) {
    try {
      const url = new URL(envUrl);
      return `wss://${url.host}/ws/security-stream`;
    } catch {
      // fallback
    }
  }

  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${window.location.host}/ws/security-stream`;
}
