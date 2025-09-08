# RBAC Module — Multi‑Tenant Design and Rollout

## 1) Purpose and Principles

- Tenant‑scoped, reusable RBAC module for any app in the platform.
- IDP‑agnostic: works with any authentication provider; requires a trusted user
  identity and tenant context.
- Server‑enforced: UI hints are optional; backend is authoritative.
- Simple mental model: roles grant permissions (resource.action). Optional
  advanced controls (SoD, approvals, reviews).
- Safe defaults, secure by default, auditable, API‑first with SDKs.

## 2) Dependency Model (Auth vs RBAC)

- Authentication is not strictly required to provision RBAC, but it is required
  to enforce RBAC for real users.
  - Provisioning only: you can create roles/permissions/templates without auth.
  - Enforcement: you must supply a trusted `userId` and `tenantId` (from your
    auth system) to check permissions.
- Integration boundary:
  - Caller provides: `Authorization: Bearer <rbac_api_key>`,
    `X-Tenant-ID: <tenantId>`, and the subject `userId`.
  - RBAC is identity‑provider agnostic; it does not issue identities or
    sessions.
  - Best practice: deploy RBAC with an authentication module (ours or yours).
    Using RBAC fully “independently” is only valid if you already have a stable,
    trusted identity layer.

Do’s

- Always pass tenant context and enforce tenant data isolation.
- Enforce permissions on server routes; use UI as hints only.
- Keep permission names stable (`resource.action`), version policy changes via
  migration.
- Audit everything that changes access (role/permission/assignment).

Don’ts

- Don’t hardcode RBAC decisions only in the UI.
- Don’t use user‑specific roles; use reusable roles and assignments.
- Don’t couple permission names to volatile business data.

## 3) What We Offer (RTO: assumptions and SLA)

Assuming “RTO” = Recovery Time Objective. If you mean something else, please
clarify.

- Availability: Multi‑AZ, optional multi‑region deployment for RBAC API.
- RTO: 15 minutes for region‑level failover (enterprise tier); 60 minutes
  standard.
- RPO: 5 minutes (enterprise) via streaming replication; 15 minutes standard.
- Degraded mode: SDKs cache last‑known user permissions (TTL configurable) to
  read‑only continue if PDP is temporarily unavailable.
- Audit logs: retained 1 year (standard), configurable up to 7 years.

Deliverables

- RBAC REST API (`/api/v2/rbac/*`) and TypeScript SDK (see `packages/rbac-sdk`).
- Default permission registry and role templates per industry
  (standard/enterprise variants).
- Admin UI pages for roles, permissions, assignments, access reviews, and audit
  logs.
- Webhooks for access events; optional SCIM/HRIS import connectors.

## 4) Onboarding Flow (Platform Admin → Tenant)

Step 1: Module selection

- Auth (recommended) and RBAC selected together by default; RBAC can be selected
  alone for tenants with their own IDP.

Step 2: RBAC config in onboarding form (server‑enforced, minimal for day 1)

- Mandatory
  - `permissionTemplate`: `standard | enterprise` (baseline permissions per
    business type)
  - `businessType`: e.g.,
    `general | healthcare | finance | education | public-sector`
  - `initialTenantAdmin`: email and name; will be granted `tenant.admin` role
- Optional (can be configured later)
  - `enableRoleInheritance`: boolean (default: false for finance, true for
    general/healthcare)
  - `requireApprovalForHighRisk`: boolean (default: true for enterprise
    template)
  - `enableAccessReview`: boolean (default: true enterprise; false standard)
  - `accessReviewFrequency`: `monthly | quarterly | semiannual | annual`
  - `roleExpirationEnabled`: boolean; `defaultRoleExpiry`: e.g., `90d`, `6m`
  - `enableSODControl`: boolean and initial rule set (enterprise only)

Step 3: Provisioning

- Create tenant RBAC namespace, seed permission registry, create default roles
  (Viewer, Editor, Admin, Approver, Auditor, etc.).
- Generate `rbacApiKey` (per tenant), store hashed; return last 4 only in UI
  after first reveal.
- Assign `tenant.admin` to initial admin user (requires matching user upon auth
  connect).

Step 4: Onboarding email (to initial admin)

- Subject: “Your RBAC module is ready for <TenantName>”
- Body (essentials)
  - Admin Console: `${baseUrl}/tenants/<tenantId>/rbac`
  - API Base: `${baseUrl}/api/v2/rbac`
  - RBAC API Key: displayed once; instructions to rotate in console
  - Quickstart links: SDK usage, endpoints, and examples
  - Next steps checklist: connect identity provider, import users, review
    default roles, set approvals/access reviews

## 5) Tenant Portal — Post‑Onboarding Capabilities

Core

- Roles: create/update/delete, clone from templates, enable inheritance (if
  enabled).
- Permissions: browse registry, attach/detach to roles, custom permission
  namespaces per tenant (optional).
- Assignments: add/remove roles for users; bulk CSV/SCIM import.
- Policy testing: simulate user permissions, “why allowed/denied” inspector.
- Audit: role/permission changes, assignments, approvals; export.

Governance (enterprise)

- Access reviews (campaigns): scope by system/role/group; reviewers; due dates;
  reminders; evidence.
- High‑risk approval workflows: configurable approvers, SLAs; emergency access
  with time‑bound roles.
- SoD controls: define mutually exclusive roles/permissions; violations
  dashboard.
- Role lifecycle: expiration and recertification policies.

Security/Ops

- API key management and rotation; per‑tenant rate limits; IP allowlists
  (optional).
- Webhooks for access changes and review outcomes.

## 6) API Surface (high‑level)

- `POST /api/v2/rbac/check-permission` → `{ userId, resource, action }` →
  `{ hasPermission }`
- `GET /api/v2/rbac/permissions` → list permission registry for tenant
- Roles
  - `GET /api/v2/rbac/roles`
  - `POST /api/v2/rbac/roles` → `{ name, description?, permissions[] }`
  - `PATCH /api/v2/rbac/roles/:roleId`
  - `DELETE /api/v2/rbac/roles/:roleId`
- Assignments
  - `GET /api/v2/rbac/users/:userId/roles`
  - `POST /api/v2/rbac/users/:userId/roles` → `{ roleId }`
  - `DELETE /api/v2/rbac/users/:userId/roles/:roleId`

Headers

- `Authorization: Bearer <rbacApiKey>` (tenant-scoped service key)
- `X-Tenant-ID: <tenantId>`

Notes

- Auth system supplies `userId` and injects it into backend context; the RBAC
  API uses it to resolve permissions.
- SDK already aligns with these endpoints (see `packages/rbac-sdk`).

## 7) Data Model (tenant scoped)

- `tenants(id, org_id, name, ...)`
- `permissions(id, tenant_id, name, resource, action, description?)`
- `roles(id, tenant_id, name, description?, inheritable?)`
- `role_permissions(role_id, permission_id)`
- `user_roles(user_id, role_id, assigned_by, assigned_at, expires_at?)`
- `access_reviews(id, tenant_id, status, scope, due_at, ...)` (enterprise)
- `approvals(id, tenant_id, requestor_id, approver_id, status, ...)` (high‑risk
  workflows)
- `sod_rules(id, tenant_id, rule_name, blocked_role_a, blocked_role_b, ...)`
  (enterprise)
- `audit_logs(id, tenant_id, actor_id, action, entity_type, entity_id, before, after, at)`

Postgres best practice

- Add `tenant_id` to all RBAC tables; use RLS with
  `current_setting('app.tenant_id')` set per request.
- Create partial indexes per tenant where needed.

## 8) Enforcement Patterns

Backend (PEP)

- Middleware: verify tenant key, set tenant context, resolve `userId` from auth,
  call PDP (`check-permission`).
- Cache results per user/role hash with TTL; invalidate on role/permission
  change.

Frontend (hints)

- Show/hide controls with SDK `hasPermission` but never rely on it for security.

Service‑to‑service

- Use RBAC API key; optional mTLS for internal calls.

## 9) Independence vs Coupling — Guidance

- Independent use is supported if you already have a trustworthy auth/identity
  layer that provides stable `userId` per tenant.
- Recommended practice is to deploy RBAC with authentication to avoid gaps
  between identity and authorization.
- If you decouple, define a strict contract: how `userId` is minted, mapped to
  tenant, lifecycle (deprovisioning), and SLAs.

## 10) Migration/Rollout Plan

Phase 1: Baseline

- Ship standard template, roles, server enforcement, audit logs, SDK, admin UI
  for roles/assignments.

Phase 2: Governance

- Add access reviews, approvals, SoD, role lifecycle.

Phase 3: Integrations

- SCIM/HRIS connectors, webhooks, BI exports, multi‑region failover.

Operational

- Seed default permissions/roles per business type during onboarding.
- Provide idempotent migrations for permission set evolution.
- Provide export/import for tenants to move between templates.

## 11) Onboarding Form — Field Reference (RBAC)

- Required
  - `permissionTemplate`: enum
  - `businessType`: enum
  - `initialTenantAdmin.email`, `.name`
- Optional (recommended defaults provided)
  - `enableRoleInheritance`, `requireApprovalForHighRisk`, `enableAccessReview`,
    `accessReviewFrequency`
  - `roleExpirationEnabled`, `defaultRoleExpiry`, `enableSODControl`

## 12) Onboarding Email — Example Contents

- Welcome, link to Admin Console and API docs
- RBAC API key (one‑time reveal) and rotation steps
- Default roles created and what they allow
- Checklist to connect identity provider and import users
- Support and incident response (RTO/RPO summary)
