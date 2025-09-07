# Claims App Example Requirements

## Purpose
Demonstrates integration of authentication, RBAC, and logging modules through a Claims Management portal.

## Roles and Permissions
- **Viewer** – `claims.read`
- **Adjuster** – `claims.read`, `claims.update`
- **Approver** – `claims.read`, `claims.update`, `claims.approve`

## Users
- `viewer@example.com` – Viewer
- `adjuster@example.com` – Adjuster
- `approver@example.com` – Approver

Changing a user's role in the Tenant Portal updates their permissions in the Claims app after refresh.

## Logging
The Claims app retrieves the tenant's logging API key automatically. Actions performed through the app generate events that appear on the Logs page without manual key entry.

## Demo Flow
1. Seed roles and users with `scripts/seed-claims-roles.mjs`.
2. Log in to the Claims app as each demo user to observe role-specific functionality.
3. Modify a user role in the Tenant Portal and refresh the Claims app to see permissions change.
4. Open the Logs page to view events associated with the tenant.
