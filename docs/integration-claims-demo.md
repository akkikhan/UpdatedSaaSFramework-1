# Claims Management Demo Integration Guide (Auth + RBAC + Logging)

This guide walks a tenant admin through onboarding and integrating the platform
modules into an external Angular SPA and a .NET API. No email required. Only
real capabilities provided by the modules are used.

## Prerequisites

- Platform server running on `http://localhost:5000`
- Angular demo (will run on `http://localhost:5173`)
- .NET demo API (will run on `http://localhost:5299`)
- Azure AD app registration (values in `.env.azure-credentials`)

> **Base URL**: All platform API examples use `http://localhost:5000/api/v2`.

## 1) Configure CORS

In `.env`, set:

```
CORS_ORIGINS=http://localhost:5173,http://localhost:5299
```

Restart the platform server if it was running.

## 2) Onboard Tenant and Enable Modules

1. Open Platform Admin and create a tenant with modules `auth`, `rbac`,
   `logging` enabled.
2. Configure Azure AD for the tenant (Tenant Id, Client Id, Client Secret,
   Callback URL):
   - Callback: `http://localhost:5000/api/v2/auth/azure/callback`
3. The tenant’s logging API key is generated automatically; the demo apps pick it up from tenant configuration.

### Seed demo roles and users

Run the helper script to create three roles and users:

```
ORG_ID=<orgId> EMAIL=<admin@example.com> PASSWORD=<adminPass> node scripts/seed-claims-roles.mjs
```

Roles created:

- **Viewer** – `claims.read`
- **Adjuster** – `claims.read`, `claims.update`
- **Approver** – `claims.read`, `claims.update`, `claims.approve`

Users `viewer@example.com`, `adjuster@example.com`, `approver@example.com` are provisioned and assigned accordingly. Changing their roles in the Tenant Portal takes effect in the Claims app after refresh.

## 3) Angular App (claims-angular)

This SPA uses Azure AD sign-in, RBAC checks, and Logging v2.

Install dependencies and run:

```
cd examples/claims-angular
npm install
npx ng serve --port 5173 --open
```

Configuration:

- Platform base URL defaults to `http://localhost:5000`.
- Logging API key is fetched from tenant settings; no manual entry required.

Features:

- Sign-in with Microsoft (Azure AD) or local email/password.
- Claims list with conditional action buttons based on RBAC.
- Logs user actions to `/api/v2/logging/events` with `X-API-Key`.
- Simple logs viewer querying `/api/v2/logging/events`.

## 4) .NET Minimal API (claims-dotnet)

This API verifies the tenant JWT with the platform, checks permissions via RBAC,
and logs events via Logging v2.

Build and run:

```
cd examples/claims-dotnet
dotnet build
dotnet run --urls http://localhost:5299
```

Environment variables (optional):

```
SAAS_BASE_URL=http://localhost:5000
LOGGING_API_KEY=logging_...
```

Endpoints:

- `GET /claims` — returns sample claims.
- `POST /claims/{id}/approve` — verifies JWT, checks `claims.approve`, logs
  event.

## 5) End-to-End Flow

1. Start platform server (port 5000).
2. Run Angular app (5173) and .NET API (5299).
3. In Angular:
   - Enter Org ID and sign in via Microsoft.
   - View claims; RBAC hides actions for insufficient roles.
   - Enter Logging API key and send/query logs.
4. In .NET:
   - When approving a claim, server verifies JWT (`/api/v2/auth/verify`), checks
     RBAC (`/api/v2/rbac/check-permission`), logs event
     (`/api/v2/logging/events`).

## Notes / Limitations

- No platform data storage for claims; the claims dataset is local to the demo
  apps.
- Audit and advanced alerting not showcased unless the corresponding server
  endpoints are available.

## Troubleshooting

- CORS errors: confirm `CORS_ORIGINS` is set to
  `http://localhost:5173,http://localhost:5299` and restart the platform server.
- Azure AD errors: verify redirect URI and credentials in tenant configuration.
- Logging: ensure the tenant’s `loggingApiKey` is used and Logging module is
  enabled.
