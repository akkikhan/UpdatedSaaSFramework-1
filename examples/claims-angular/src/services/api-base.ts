// Centralized API base URL resolution for the claims Angular demo.
// Fixes cases where localStorage override like ":5000" leads to malformed URLs.

function defaultBase(): string {
  try {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000`;
  } catch {
    return "http://localhost:5000";
  }
}

function normalizeBase(input: string): string {
  const fallback = defaultBase();
  const val = (input || "").trim();
  if (!val) return fallback;
  try {
    // If missing protocol, URL() throws. We'll fix common cases below.
    const url = new URL(val);
    const proto = url.protocol || "http:";
    const host = url.hostname || "localhost";
    const port = url.port ? `:${url.port}` : "";
    return `${proto}//${host}${port}`;
  } catch {
    // Common fixes:
    // 1) ":5000" -> use current host with that port
    if (val.startsWith(":")) {
      try {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}${val}`;
      } catch {
        return `http://localhost${val}`;
      }
    }
    // 2) "5000" -> treat as port
    if (/^\d+$/.test(val)) {
      try {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:${val}`;
      } catch {
        return `http://localhost:${val}`;
      }
    }
    // 3) "localhost:5000" or "127.0.0.1:5000" -> add http://
    if (!/^https?:\/\//i.test(val)) {
      return `http://${val}`;
    }
    return fallback;
  }
}

export function getApiBase(): string {
  let override = "";
  try {
    override = localStorage.getItem("claims_base") || "";
  } catch {}
  return normalizeBase(override);
}

export const BASE = getApiBase();

// Optional: allow runtime override via window for debugging
declare global {
  interface Window {
    setClaimsApiBase?: (val: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.setClaimsApiBase = (val: string) => {
    try {
      localStorage.setItem("claims_base", val);
      // No reload here; consumers should re-import BASE or call getApiBase()
    } catch {}
  };
}
