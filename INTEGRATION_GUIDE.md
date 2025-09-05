# Authentication Module Integration Guide (Azure AD + JWT)

This guide shows how to integrate the SaaS Framework Authentication module into
your external application (Angular + .NET examples). It covers both SSO via
Azure AD and local email/password login, and how to validate tokens on your
backend.

## Prerequisites

- Tenant onboarded with Auth module enabled (Azure AD + Local/JWT as needed)
- Your orgId (from onboarding email or Tenant Portal URL)
- Platform base URL (e.g., `https://your-platform.com` or
  `http://localhost:5000`)

## Frontend (Angular)

Install the SDK:

```bash
npm i @saas-framework/auth-client
```

Typical usage:

```ts
import {
  startAzure,
  handleSuccessFromUrl,
  loginWithPassword,
  fetchWithAuth,
  refreshToken,
} from "@saas-framework/auth-client";

// 1) Azure AD SSO (button click)
async function signInWithMicrosoft(orgId: string) {
  await startAzure(orgId); // redirects browser
}

// 2) On your /auth/success route
handleSuccessFromUrl(); // stores ?token=...

// 3) Optional: Local (JWT) login fallback
await loginWithPassword({ orgId, email, password });

// 4) Call APIs
const res = await fetchWithAuth("/api/tenant/me");
const me = await res.json();

// 5) Optional: Sliding refresh
await refreshToken();
```

Angular HttpInterceptor:

```ts
import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { getToken } from "@saas-framework/auth-client";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = getToken();
    if (token) {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}
```

## Backend (.NET Minimal API)

Option 1: Introspection (simple)

```csharp
app.Use(async (ctx, next) => {
  var auth = ctx.Request.Headers["Authorization"].ToString();
  if (auth.StartsWith("Bearer ")) {
    var token = auth.Substring(7);
    var client = new HttpClient();
    var req = new HttpRequestMessage(HttpMethod.Get, "https://your-platform.com/api/v2/auth/verify");
    req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    var res = await client.SendAsync(req);
    if (!res.IsSuccessStatusCode) { ctx.Response.StatusCode = 401; return; }
  }
  await next();
});
```

Option 2: Local verification (recommended for production)

1. Configure platform with RSA keys (RS256) and fetch JWKS from
   `/.well-known/jwks.json`.
2. Verify JWTs in your backend using your preferred JWT/JWKS library.

## RBAC (Roles & Permissions)

- Tokens include a `permissions` claim populated from assigned roles.
- To fetch the current user’s roles/permissions:

```http
GET /rbac/me
Authorization: Bearer <token>
```

## Auth Settings

- Tenant admins can switch default provider (Azure AD or Local) and enforce
  SSO-only in the Tenant Portal.
- Changes reflect immediately in all apps using the SDK.

## Server-to-Server APIs

- Some modules (e.g., logging/notifications) require API keys. Use the keys
  visible in the Tenant Portal’s API Keys tab and include as `x-api-key: <key>`.

## CORS

- Platform supports CORS configured via `CORS_ORIGINS` (comma-separated list).
  Ensure your app origin is allowed in production.

## Troubleshooting

- 401 from verify: token expired or invalid → refresh/sign-in again
- 403 TENANT_SUSPENDED: contact platform admin
- Azure SSO not ready: ensure Azure provider is configured in Tenant Portal and
  try “Test Azure SSO”.

## Azure AD Setup (Tenant App Registration)

Follow these steps to create a real Azure AD app and connect it to your tenant
in the platform.

### 1) Identify your Azure tenant

```bash
az login              # device-code or browser
az account show --query tenantId -o tsv   # copy this GUID
```

### 2) Create an app registration (single-tenant)

```bash
az ad app create \
  --display-name "SaaS Tenant - <your-org>" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris http://localhost:5000/api/auth/azure/callback

# Capture appId => clientId
az ad app credential reset \
  --id <appId> \
  --display-name "SaaS Secret" \
  --years 1
# Capture password => clientSecret
```

Using Azure Portal is fine too (App registrations → New registration).

### 3) Grant Microsoft Graph permission

Azure Portal → App registrations → your app → API permissions → Add a permission
→ Microsoft Graph → Delegated → User.Read → Grant admin consent.

### 4) Configure your tenant in the platform

As Platform Admin (via Admin Portal or API):

```http
POST /api/tenants/:tenantId/azure-ad/config
Content-Type: application/json

{
  "tenantId": "<azure-tenant-guid>",
  "clientId": "<appId-guid>",
  "clientSecret": "<app-secret>",
  "callbackUrl": "http://localhost:5000/api/auth/azure/callback"
}
```

Or use the helper script (device-code flow):

```powershell
scripts/azure-setup-tenant.ps1 -OrgId <orgId> -PlatformBase http://localhost:5000
```

### 5) Validate and test SSO

Tenant Portal → Modules → Authentication Providers → Azure AD:

- Click "Validate Azure Config" → should show "looks good"
- Click "Test Azure SSO" → complete Microsoft login → platform issues a tenant
  JWT

### Common Azure pitfalls and fixes

- AADSTS90002 Tenant '1' not found
  - Your `tenantId` is not a GUID. Run `az account show --query tenantId -o tsv`
    and paste the GUID.
- Incorrect redirect URI
  - Ensure the Azure app has `http://localhost:5000/api/auth/azure/callback`
    exactly (or your server URL in prod).
- Wrong "signInAudience"
  - For strict single-tenant flows set `AzureADMyOrg`. For multi-tenant use
    `AzureADMultipleOrgs` and optionally enforce `tid` in the callback on the
    platform.
- Missing consent
  - Grant admin consent for Microsoft Graph → User.Read.

## Publish Readiness & Findings

From our hands-on tests and fixes, the authentication module is ready for real
usage and publishing with the following capabilities and improvements:

- Single SDK usage:
  - `@saas-framework/auth` for frontend and backend. Browser helpers are
    exported from the `/client` subpath.
  - Verified with a separate external demo app (Vite) that signs in with Azure
    AD and local JWT.
- Tenant Portal UX:
  - Clean provider cards in an Accordion, rendered only when the provider is
    enabled or configured.
  - Azure/Auth0/SAML forms with masked secrets and Copy for Redirect/ACS URLs.
  - Tenant "Request Update" flow submits for admin approval; Admin can
    "Approve/Apply" from a dedicated panel.
  - Azure validator endpoint ensures GUIDs/redirect/MSAL readiness before
    testing.
- Admin flow:
  - Module Requests and Provider Requests panels to approve/dismiss, with
    provider approval automatically updating `enabledModules` and encrypted
    moduleConfigs.
- Token lifecycle:
  - Refresh token fixed; RS256 + JWKS supported for production; CORS allowlist
    supported.
- RBAC:
  - JWT includes permissions; `/rbac/me` endpoint returns roles and permissions
    for the current user.

Gaps we closed (findings):

- Enabled/Configured mismatch
  - Normalized `enabledModules` to include configured providers so the UI always
    matches real onboarding.
- Refresh 500 error
  - Fixed by stripping timing claims before signing.
- Overexposed forms
  - Accordion shows only relevant providers and disables forms when modules are
    off.

Optional improvements (nice-to-haves before/after publishing):

- Add "Last validated/tested" timestamps per provider with inline status (read
  from system logs).
- Enforce `tid`/email-domain checks in Azure callback for multi-tenant apps.
- Provide a small Angular wrapper (interceptor + guard) as a convenience
  subpath.
- Add provider metadata download/upload for SAML (SP/IdP metadata exchange) and
  a non-destructive test.
