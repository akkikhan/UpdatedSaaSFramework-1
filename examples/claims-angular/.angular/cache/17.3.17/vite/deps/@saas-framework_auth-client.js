import {
  __async,
  __spreadProps,
  __spreadValues
} from "./chunk-WDMUDEB6.js";

// ../../packages/auth-client/dist/index.js
var tokenKey = "tenant_token";
function setTokenStorageKey(key) {
  tokenKey = key;
}
function getToken() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(tokenKey) : null;
  } catch {
    return null;
  }
}
function setToken(value) {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(tokenKey, value);
  } catch {
  }
}
function clearToken() {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.removeItem(tokenKey);
  } catch {
  }
}
function startAzure(orgId, options) {
  return __async(this, null, function* () {
    const base = (options === null || options === void 0 ? void 0 : options.baseUrl) || "";
    const params = [];
    if (options === null || options === void 0 ? void 0 : options.returnUrl) {
      params.push(`returnUrl=${encodeURIComponent(options.returnUrl)}`);
    } else if ((options === null || options === void 0 ? void 0 : options.redirectBase) && (options === null || options === void 0 ? void 0 : options.redirectTo)) {
      const fullReturnUrl = `${options.redirectBase}${options.redirectTo}`;
      params.push(`returnUrl=${encodeURIComponent(fullReturnUrl)}`);
    }
    const url = `${base}/api/auth/azure/${encodeURIComponent(orgId)}${params.length ? `?${params.join("&")}` : ""}`;
    const res = yield fetch(url);
    if (!res.ok)
      throw new Error(`Failed to start Azure SSO: ${res.status}`);
    const data = yield res.json();
    if (!(data === null || data === void 0 ? void 0 : data.authUrl))
      throw new Error("No authUrl received");
    window.location.href = data.authUrl;
  });
}
function handleSuccessFromUrl() {
  const qs = new URLSearchParams(window.location.search);
  const t = qs.get("token");
  if (t) {
    setToken(t);
    const path = window.location.pathname;
    window.history.replaceState({}, document.title, path);
    return t;
  }
  return null;
}
function loginWithPassword(params) {
  return __async(this, null, function* () {
    const base = params.baseUrl || "";
    const res = yield fetch(`${base}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: params.orgId,
        tenantId: params.tenantId,
        email: params.email,
        password: params.password
      })
    });
    if (!res.ok)
      throw new Error(`Login failed: ${res.status}`);
    const data = yield res.json();
    if (data === null || data === void 0 ? void 0 : data.token)
      setToken(data.token);
    return data;
  });
}
function fetchWithAuth(_0) {
  return __async(this, arguments, function* (input, init = {}) {
    const t = getToken();
    const headers = new Headers(init.headers || {});
    if (t)
      headers.set("Authorization", `Bearer ${t}`);
    return fetch(input, __spreadProps(__spreadValues({}, init), { headers }));
  });
}
function logout() {
  clearToken();
}
function refreshToken(baseUrl) {
  return __async(this, null, function* () {
    const base = baseUrl || "";
    const t = getToken();
    if (!t)
      return null;
    const res = yield fetch(`${base}/api/v2/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` }
    });
    if (!res.ok)
      return null;
    const data = yield res.json();
    if (data === null || data === void 0 ? void 0 : data.token)
      setToken(data.token);
    return (data === null || data === void 0 ? void 0 : data.token) || null;
  });
}
function getRbacProfile(baseUrl) {
  return __async(this, null, function* () {
    const base = baseUrl || "";
    const res = yield fetchWithAuth(`${base}/rbac/me`);
    if (!res.ok)
      return null;
    return res.json();
  });
}
function hasPermission(permission, profile, baseUrl) {
  return __async(this, null, function* () {
    const p = profile || (yield getRbacProfile(baseUrl));
    if (!p)
      return false;
    return Array.isArray(p.permissions) && p.permissions.includes(permission);
  });
}
export {
  clearToken,
  fetchWithAuth,
  getRbacProfile,
  getToken,
  handleSuccessFromUrl,
  hasPermission,
  loginWithPassword,
  logout,
  refreshToken,
  setToken,
  setTokenStorageKey,
  startAzure
};
//# sourceMappingURL=@saas-framework_auth-client.js.map
