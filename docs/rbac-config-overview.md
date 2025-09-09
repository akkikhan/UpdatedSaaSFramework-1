# RBAC Configuration Overview

The platform admin portal exposes a configuration page for managing reusable RBAC assets. These assets drive the tenant onboarding form and initial tenant experience.

## Permission Templates
- **Purpose**: Define a named set of permissions and default roles that can be applied to multiple tenants.
- **Add Button**: Administrators can append permissions or role names. Values entered in the input are added either by pressing **Add** or hitting **Enter**; duplicates are ignored. Added entries show up as removable badges, but changes remain local until backend persistence is available.
- **Template Preview**: The eye icon on each template card displays a read‑only dialog summarising permissions, roles and associated business types before saving or applying.

## Business Types
- Categorise tenants by industry or risk profile. Business types supply default permissions and compliance requirements that templates and roles can reference.

## Default Roles
- **Purpose**: Seed roles automatically during tenant creation.
- **Custom Permissions**: Roles can include permissions outside the predefined registry via the same Add control used in templates. Enter a value and press **Add** or **Enter** to append it; additions are currently stored only in the client until a server endpoint is introduced.
- **Roles**: Optional role names can be attached and removed individually using the badge controls.

## Tenant Onboarding Synchronisation
Both the Platform Admin RBAC page and the Tenant Onboarding wizard consume the same `/api/rbac-config/*` endpoints. Templates, business types and default roles defined by admins are immediately available in the onboarding form, keeping the two flows in sync.
The onboarding wizard also provides Add controls for default roles and custom permissions so tenant-specific overrides can be entered directly during setup.

## Readiness
The configuration UI, add buttons and template preview are wired up and consistent across both portals. However, they operate solely on in‑memory data today; dedicated RBAC endpoints must be deployed before templates and roles can be saved permanently or rolled out to tenants.

## Tenant Impact
Selected templates, business types and default roles are stored with the tenant configuration. When a tenant portal is provisioned these settings create the initial role and permission structure, so any custom permissions or roles added here are reflected for tenant users on first login.

