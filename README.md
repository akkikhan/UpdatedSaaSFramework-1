# Updated SaaS Framework

Multi-tenant SaaS accelerator that combines a hardened Express API, React/Vite tenant portals, and reusable SDK packages to help teams launch regulated, Azure-friendly applications fast.

## Key Capabilities

- **Tenant lifecycle**: Guided onboarding wizard, module marketplace, Azure-first SSO setup, and automated module provisioning.
- **Identity & RBAC**: Local JWT auth, Azure AD SSO, role templates, inheritance, and fine-grained permission APIs.
- **Communications**: Email templates, notifications pipeline, and logging of deliverability metrics with SendGrid/SMTP adapters.
- **Compliance & audit**: System, security, and compliance logs with export-ready data for SOC2/ISO workflows.
- **SDK ecosystem**: Auth/RBAC/email/logging client packages for third parties to integrate platform services.

## Repository Layout

| Path | Purpose |
| ---- | ------- |
| `client/` | React + Vite front end for platform admin and tenant portals. |
| `server/` | Express API, middleware, services, and Drizzle storage layer. |
| `shared/` | Shared schemas, tenant module definitions, and validation utilities. |
| `packages/` | Publishable SDKs (`auth`, `rbac`, `email`, `logging`, `auth-client`). |
| `examples/` | Angular claims demo showcasing cross-app integration. |
| `scripts/` | Provisioning, migration, and troubleshooting helpers. |
| `docs/` | Deep-dive guides (Azure setup, tenant config, implementation reports). |
| `migrations/` | SQL migrations for Postgres (and variants). |
| `tests/` | Placeholder for automated suites (Jest, Playwright). |

See `PROJECT_STRUCTURE.md` and `docs/COMPLETE_SOLUTION_SUMMARY.md` for the exhaustive file map and module breakdown.

## Architecture Overview
A high-level system diagram is available in  `docs/ARCHITECTURE_OVERVIEW.md` and `docs/COMPLETE_SOLUTION_SUMMARY.md`. 

- **API**: Express + TypeScript (`server/index.ts`) with Drizzle ORM, rate limiting, and modular route registration (`server/routes.ts`).
- **Front end**: Vite-powered React UI with TanStack Query, Zod forms, and Shadcn UI components (`client/src`).
- **Identity**: JWT (HS256/RS256) tokens (`server/services/auth.ts`, `packages/auth-client`), Azure AD SSO (`server/services/azure-ad.ts`), and tenant-scoped session helpers.
- **RBAC**: Role templates, permission inheritance, and tenant-specific role assignments (`server/routes.ts` RBAC v2 endpoints, `client/src/pages/tenant-dashboard.tsx`).
- **Notifications**: Email service abstraction with provider adapters and template store (`server/services/email.ts`).
- **Compliance**: Logging services for system and audit events (`server/services/compliance.ts`, `server/storage.ts`).
- **SDKs**: Client libraries that wrap platform endpoints for external apps (`packages/auth-client/src/index.ts`).

A high-level system diagram is available in `docs/COMPLETE_SOLUTION_SUMMARY.md`.

## Getting Started

1. **Clone & install**
   ```bash
   npm install
   ```
2. **Environment**
   - Review  `docs/DEPLOYMENT_TARGETS.md` for deployment topology and rollout checklists. 
   - Copy `.env.example` for local development (Postgres + SMTP, Azure sandbox values).
   - Copy `.env.template` for production-ready secrets checklist.
   - Required vars include `DATABASE_URL`, `JWT_SECRET`, `AZURE_*`, email provider credentials, `CORS_ORIGINS`, and return URL prefixes.
   - Review `docs/ENVIRONMENT_MATRIX.md` for environment-by-environment guidance.
3. **Database**
   ```bash
   npm run db:push
   ```
4. **Development server**
   ```bash
   npm run dev
   ```
   API and client run on the same port (default `5000`). Vite is mounted in development for hot reloads.
5. **Seed platform admin**
   ```bash
   npm run setup:platform-admin
   ```
6. **Tenant onboarding**
   - Visit `/admin` (platform admin) to create tenants via the onboarding wizard.
   - Tenants access `/tenant/:orgId` dashboards to manage users, roles, modules, and API keys.

## Scripts & Tooling

- **Azure alignment**: `scripts/configure-azure-app.ps1`, `debug-tenant-auth.mjs`, `generate-admin-consent-url.mjs`.
- **Tenant automation**: `create-demo-users.mjs`, `create-tenant-users.mjs`, `setup-complete-demo.mjs`.
- **Diagnostics**: `debug-tenant-auth.mjs`, `troubleshoot-azure-access.mjs`, `server/diagnostic-server.js`.
- **Testing**: Jest/Playwright configs ready; add suites under `tests/` and `server/__tests__`.

## Example Applications

- `examples/claims-angular`: Angular SPA showcasing cross-app SSO, RBAC enforcement, and logging APIs. Run `examples/claims-angular/start-claims-demo.ps1` or follow the README inside the folder.

## Roadmap Highlights

- Harden per-tenant rate limiting, secret rotation, and compliance exports.
- Expand notification channels (SMS, Slack, push) and observability metrics.
- Automate SDK publishing with semantic versioning and changelog tooling.
- Build GTM collateral: solution briefs, ROI calculators, live demos, and integration marketplace.

Track progress in `IMPLEMENTATION_CHECKLIST.md` and cross-reference strategy docs (`REALITY_CHECK_IMPLEMENTATION_GAP.md`, `SENIOR_MANAGEMENT_MILESTONES_REPORT.md`).

## Support & Contributions

- Update documentation alongside code changes (see `/docs` for reference).
- Follow linting/formatting scripts (`npm run lint`, `npm run format`).
- Submit issues or enhancements describing tenant flows, module configs, and compliance requirements.





