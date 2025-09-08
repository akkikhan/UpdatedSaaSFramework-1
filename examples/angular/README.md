# Angular Integration (Quick Start)

This example shows how to integrate the Authentication Module in an Angular app
using a single SDK package.

## 1) Install SDK

```bash
npm i @saas-framework/auth
```

## 2) Add HttpInterceptor

```ts
// src/app/auth.interceptor.ts
import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { getToken } from "@saas-framework/auth/client";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = getToken();
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return next.handle(req);
  }
}

// src/app/app.module.ts
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { AuthInterceptor } from "./auth.interceptor";

@NgModule({
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
})
export class AppModule {}
```

## 3) Sign-in with Azure AD (SSO)

```ts
import { startAzure, handleSuccessFromUrl } from "@saas-framework/auth/client";

// On your sign-in button
await startAzure(environment.orgId);

// On your /auth/success component route init
handleSuccessFromUrl(); // stores token and cleans URL
```

## 4) Optional: Local (JWT) Login

```ts
import { loginWithPassword } from "@saas-framework/auth/client";
await loginWithPassword({ orgId: environment.orgId, email, password });
```

## 5) Call APIs

```ts
import { fetchWithAuth } from "@saas-framework/auth/client";
const res = await fetchWithAuth("/api/tenant/me");
const me = await res.json();
```

## 6) RBAC (Permissions)

```ts
import { getRbacProfile, hasPermission } from "@saas-framework/auth/client";
const profile = await getRbacProfile();
const canManageUsers = await hasPermission("users.update", profile);
```
