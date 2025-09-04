let tokenKey = "tenantToken";

export function setTokenStorageKey(key: string) {
  tokenKey = key;
}

export function getToken(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(tokenKey) : null;
  } catch {
    return null;
  }
}

export function setToken(value: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(tokenKey, value);
  } catch {}
}

export function clearToken() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(tokenKey);
  } catch {}
}

/** Start Azure AD SSO by requesting authUrl from the platform API and redirecting the browser. */
export async function startAzure(
  orgId: string,
  options?: { baseUrl?: string; redirect?: boolean }
) {
  const base = options?.baseUrl || "";
  const url = `${base}/api/auth/azure/${encodeURIComponent(orgId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to start Azure SSO: ${res.status}`);
  const data = await res.json();
  if (!data?.authUrl) throw new Error("No authUrl received");
  window.location.href = data.authUrl; // redirect to Microsoft
}

/** Handle success redirect that contains ?token=... and optional &tenant=... */
export function handleSuccessFromUrl() {
  const qs = new URLSearchParams(window.location.search);
  const t = qs.get("token");
  if (t) {
    setToken(t);
    // clean url
    const path = window.location.pathname;
    window.history.replaceState({}, document.title, path);
    return t;
  }
  return null;
}

/** Login with local credentials (JWT). */
export async function loginWithPassword(params: {
  orgId?: string;
  tenantId?: string;
  email: string;
  password: string;
  baseUrl?: string;
}) {
  const base = params.baseUrl || "";
  const res = await fetch(`${base}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId: params.orgId,
      tenantId: params.tenantId,
      email: params.email,
      password: params.password,
    }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  if (data?.token) setToken(data.token);
  return data;
}

/** Wrapper for fetch that attaches Authorization header automatically. */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const t = getToken();
  const headers = new Headers(init.headers || {});
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(input, { ...init, headers });
}

export function logout() {
  clearToken();
}
