# @saas-framework/auth-client

This tiny browser SDK makes it easy for tenant apps to use the platform’s
authentication APIs — always calling our endpoints (never Microsoft directly)
for a consistent, multi‑tenant flow.

- Azure AD SSO: start from your app → we return authUrl → you redirect →
  callback issues our tenant‑scoped JWT
- Local (JWT) login: simple email/password fallback (optional; controllable per
  tenant)
- One token model: Regardless of provider, your app receives the same platform
  JWT

## Install

```bash
npm i @saas-framework/auth-client
```

## API

- `startAzure(orgId: string)`
  - Requests the Azure AD authorization URL from the platform and redirects the
    browser.
- `handleSuccessFromUrl()`
  - Reads `?token=...` from the callback redirect and stores it (localStorage by
    default). Returns the token or `null`.
- `loginWithPassword({ orgId?, tenantId?, email, password })`
  - Calls platform JWT login and stores the token on success.
- `fetchWithAuth(input, init)`
  - Like `fetch`, but automatically attaches the `Authorization: Bearer <token>`
    header.
- `setTokenStorageKey(key)`, `getToken()`, `setToken(token)`, `logout()`

## Typical usage

```ts
import {
  startAzure,
  handleSuccessFromUrl,
  loginWithPassword,
  fetchWithAuth,
} from "@saas-framework/auth-client";

// 1) Azure AD SSO button (orgId from your config)
async function onMicrosoftSignIn(orgId: string) {
  await startAzure(orgId); // will redirect to Microsoft
}

// 2) On your /auth/success route (after redirect back)
handleSuccessFromUrl(); // parses ?token=... and stores it

// 3) Optional: Local (JWT) login
await loginWithPassword({
  orgId: "demo",
  email: "user@example.com",
  password: "••••••••",
});

// 4) Call your (or platform) APIs with the token attached
const res = await fetchWithAuth("/api/tenant/me");
const me = await res.json();
```

## Why use this SDK?

- Keeps your app talking to the platform (not Microsoft directly)
- Ensures a single, tenant‑scoped JWT format no matter which provider is used
- Reduces boilerplate across tenants and apps

## Notes

- Tenant admins configure providers (Azure AD, Auth0, SAML, local) in the Tenant
  Portal.
- Platform admins can onboard tenants and rotate secrets centrally.
- To enforce SSO only (disable password fallback), toggle it in the Tenant
  Portal (Auth Settings).

---

For more advanced flows (e.g., token exchange, group→role mapping UI), see the
main platform documentation.
