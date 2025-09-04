import {
  startAzure,
  handleSuccessFromUrl,
  loginWithPassword,
  fetchWithAuth,
  refreshToken,
  getRbacProfile,
} from "@saas-framework/auth/client";
import SaaSLogging, { LogLevel } from "@saas-framework/logging";
import { SaaSLogging, LogLevel } from "@saas-framework/logging";

const outEl = document.getElementById("out") as HTMLPreElement;
const orgEl = document.getElementById("orgId") as HTMLInputElement;
const emailEl = document.getElementById("email") as HTMLInputElement;
const passwordEl = document.getElementById("password") as HTMLInputElement;
const loggingKeyEl = document.getElementById("loggingKey") as HTMLInputElement;
const BASE = ((): string => {
  try {
    return localStorage.getItem("demo_base") || "http://localhost:5000";
  } catch {
    return "http://localhost:5000";
  }
})();

function log(obj: any) {
  outEl.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

// Load config from localStorage
orgEl.value = localStorage.getItem("demo_orgId") || "";
loggingKeyEl.value = localStorage.getItem("demo_logging_key") || "";

document.getElementById("btnSaveCfg")?.addEventListener("click", () => {
  localStorage.setItem("demo_orgId", orgEl.value.trim());
  log({ ok: true, savedOrgId: orgEl.value.trim() });
});

document.getElementById("btnSaveLogCfg")?.addEventListener("click", () => {
  localStorage.setItem("demo_logging_key", loggingKeyEl.value.trim());
  log({ ok: true, savedLoggingKey: masking(loggingKeyEl.value.trim()) });
});

function masking(key: string) {
  if (!key) return "";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// If landing from /auth-success with ?token=..., this stores the token
try {
  handleSuccessFromUrl();
} catch {}

document.getElementById("btnMicrosoft")?.addEventListener("click", async () => {
  const orgId = orgEl.value.trim();
  if (!orgId) return log("Enter Org ID first.");
  try {
    await startAzure(orgId, { baseUrl: BASE });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnLocal")?.addEventListener("click", async () => {
  const orgId = orgEl.value.trim();
  if (!orgId) return log("Enter Org ID first.");
  try {
    const r = await loginWithPassword({
      orgId,
      email: emailEl.value,
      password: passwordEl.value,
      baseUrl: BASE,
    });
    log({ login: "ok", user: r?.user, expiresAt: r?.expiresAt });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnVerify")?.addEventListener("click", async () => {
  try {
    const res = await fetchWithAuth(`${BASE}/api/v2/auth/verify`);
    log(await res.json());
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnRbac")?.addEventListener("click", async () => {
  try {
    const profile = await getRbacProfile(BASE);
    log(profile);
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnRefresh")?.addEventListener("click", async () => {
  try {
    const t = await refreshToken(BASE);
    log({ refreshed: Boolean(t) });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try {
    // client logout just clears token; platform logout endpoint is optional
    localStorage.removeItem("tenant_token");
    log("Logged out.");
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

// Logging: send a single test event using X-API-Key
document.getElementById("btnSendLog")?.addEventListener("click", async () => {
  try {
    const key = loggingKeyEl.value.trim();
    if (!key) return log({ error: "Enter Logging API Key" });
    const res = await fetch(`${BASE}/api/v2/logging/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({
        level: "info",
        message: "External demo test log",
        category: "demo",
        metadata: { source: "external-app", when: new Date().toISOString() },
      }),
    });
    const data = await res.json();
    log({ status: res.status, created: data });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

// Logging: fetch recent events via X-API-Key
document.getElementById("btnFetchLogs")?.addEventListener("click", async () => {
  try {
    const key = loggingKeyEl.value.trim();
    if (!key) return log({ error: "Enter Logging API Key" });
    const params = new URLSearchParams({ limit: "10" });
    const res = await fetch(`${BASE}/api/v2/logging/events?${params.toString()}`, {
      headers: { "X-API-Key": key },
    });
    const data = await res.json();
    log({ status: res.status, logs: data });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

// Logging SDK demo: create instance and send a log
document.getElementById("btnSdkLog")?.addEventListener("click", async () => {
  try {
    const key = loggingKeyEl.value.trim();
    if (!key) return log({ error: "Enter Logging API Key" });
    const logger = new SaaSLogging({ apiKey: key, baseUrl: BASE, tenantId: orgEl.value.trim() });
    await logger.info("SDK hello from external-app", { category: "demo", source: "sdk" });
    log({ sdk: "sent info()" });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnSdkFlush")?.addEventListener("click", async () => {
  try {
    const key = loggingKeyEl.value.trim();
    if (!key) return log({ error: "Enter Logging API Key" });
    const logger = new SaaSLogging({ apiKey: key, baseUrl: BASE, tenantId: orgEl.value.trim() });
    await logger.flush();
    log({ sdk: "flushed" });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});
const keyEl = document.getElementById("logKey") as HTMLInputElement;

let logger: SaaSLogging | null = null;
function getLogger(): SaaSLogging | null {
  const key = keyEl?.value?.trim();
  if (!key) {
    log("Enter Logging API Key first.");
    return null;
  }
  if (logger && (logger as any).__key === key && (logger as any).__base === BASE) return logger;
  logger = new SaaSLogging({ apiKey: key, baseUrl: BASE });
  (logger as any).__key = key;
  (logger as any).__base = BASE;
  return logger;
}

document.getElementById("btnLogEvent")?.addEventListener("click", async () => {
  try {
    const lg = getLogger();
    if (!lg) return;
    await lg.info("External demo test event", {
      category: "quickstart",
      ts: new Date().toISOString(),
    });
    await lg.flush();
    log({ ok: true, sent: true });
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});

document.getElementById("btnLogQuery")?.addEventListener("click", async () => {
  try {
    const lg = getLogger();
    if (!lg) return;
    const results = await lg.searchLogs({ category: "quickstart", limit: 5 });
    log(results);
  } catch (e: any) {
    log({ error: e?.message || String(e) });
  }
});
