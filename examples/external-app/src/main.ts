import {
  startAzure,
  handleSuccessFromUrl,
  loginWithPassword,
  fetchWithAuth,
  refreshToken,
  getRbacProfile,
} from "@saas-framework/auth/client";

const outEl = document.getElementById("out") as HTMLPreElement;
const orgEl = document.getElementById("orgId") as HTMLInputElement;
const emailEl = document.getElementById("email") as HTMLInputElement;
const passwordEl = document.getElementById("password") as HTMLInputElement;
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

document.getElementById("btnSaveCfg")?.addEventListener("click", () => {
  localStorage.setItem("demo_orgId", orgEl.value.trim());
  log({ ok: true, savedOrgId: orgEl.value.trim() });
});

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
