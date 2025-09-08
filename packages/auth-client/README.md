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

> **Base URL**: All server endpoints are prefixed with `/api/v2`. Use full URLs like `https://your-platform.com/api/v2/auth/verify` when calling the platform.

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
- `refreshToken(baseUrl?)`
  - Requests a new token from the platform using the current token.
- `getRbacProfile(baseUrl?)`
  - Returns `{ roles, permissions }` for the current user.
- `hasPermission(permission, profile?, baseUrl?)`
  - Returns `true/false` if the user has the given permission.

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
const res = await fetchWithAuth("/api/v2/tenant/me");
const me = await res.json();
```

### Angular HttpInterceptor example

```ts
// auth.interceptor.ts
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

// app.module.ts
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
];
```

### .NET (Minimal API) verification snippet

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
