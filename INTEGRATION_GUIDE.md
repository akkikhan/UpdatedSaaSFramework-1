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
