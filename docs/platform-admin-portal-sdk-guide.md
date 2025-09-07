# Platform Admin Portal SDK Integration Guide

The Platform Admin Portal SDK is available at:

- GitHub: https://github.com/saas-framework/platform-admin-portal-sdk
- NPM: `@saas-framework/platform-admin-sdk`

Install the SDKs used in this guide:

```bash
npm install @saas-framework/platform-admin-sdk \
            @saas-framework/auth-client \
            @saas-framework/rbac-sdk
```

This guide shows how to integrate the SDK and configure core modules—Authentication, RBAC, and Logging—so tenants can manage settings in the Platform Admin Portal and see them reflected instantly in their Tenant Portal.

## 1. Authentication Module

The authentication package (`@saas-framework/auth-client`) supports local JWT, Azure AD, Auth0, and SAML providers. Enable the Authentication module for a tenant and supply provider settings in the Platform Admin Portal. These settings appear under **Modules → Authentication** in the Tenant Portal where tenant admins can review or update them later.

### Local JWT

Use `loginWithPassword` for username/password sign‑in.

```ts
import { loginWithPassword, handleSuccessFromUrl } from '@saas-framework/auth-client';

// Local login
await loginWithPassword({ orgId, email, password });

// Capture token returned in redirect URLs
handleSuccessFromUrl();
```

### Azure AD Setup

If Azure AD is selected, follow the full setup instructions in [`INTEGRATION_GUIDE.md`](../INTEGRATION_GUIDE.md#azure-ad-setup-tenant-app-registration). In summary:

1. Create an Azure app registration with a redirect URI such as `https://your-platform.com/api/auth/azure/callback`.
2. Capture the tenant ID, client ID, and client secret.
3. In Platform Admin Portal, open the tenant’s module configuration and enter these values under **Authentication → Azure AD**.

### Auth0 Setup

1. Create an application in the Auth0 dashboard.
2. Note the domain, client ID, client secret and optional audience.
3. Set the callback URL to `https://your-platform.com/api/auth/auth0/callback`.
4. Enter these values under **Authentication → Auth0** in the Platform Admin Portal.

```ts
// Start Auth0 SSO
const res = await fetch(`/api/auth/auth0/${orgId}`);
const { authUrl } = await res.json();
window.location.href = authUrl;
```

### SAML Setup

1. Obtain the IdP entry point (login URL), issuer and X.509 certificate.
2. Configure a callback such as `https://your-platform.com/api/auth/saml/callback`.
3. Enter these values under **Authentication → SAML** in the Platform Admin Portal.

```ts
// Start SAML SSO
const res = await fetch(`/api/auth/saml/${orgId}`);
const { redirectUrl } = await res.json();
window.location.href = redirectUrl; // redirects to IdP
```

### Azure AD Usage Example

```ts
import { startAzure } from '@saas-framework/auth-client';

await startAzure(orgId); // redirects to Microsoft
```

## 2. RBAC Module

The RBAC SDK (`@saas-framework/rbac-sdk`) exposes role and permission management. After enabling RBAC in Platform Admin Portal, tenant admins can manage roles under **Modules → Roles** in their portal.

### Usage Example

```ts
import { SaaSFactoryRBAC } from '@saas-framework/rbac-sdk';

const rbac = new SaaSFactoryRBAC({
  baseUrl: 'https://api.your-platform.com',
  apiKey: process.env.RBAC_API_KEY!,
  tenantId: process.env.TENANT_ID!,
});

// Create a role and assign it to a user
const editor = await rbac.createRole({
  name: 'editor',
  permissions: ['documents.read', 'documents.write'],
});
await rbac.assignRole('<user-id>', editor.id);

// Check a permission
const ok = await rbac.hasPermission('<user-id>', 'documents', 'read');
```

See [`docs/rbac-quickstart.md`](./rbac-quickstart.md) for full REST examples.

## 3. Logging Module

Enable the Logging module to ingest and query structured events. The tenant portal exposes **Modules → Logging Settings** so admins can configure log levels, destinations, retention, and PII redaction.

### Usage Example

```ts
// Node.js fetch example
await fetch('https://api.your-platform.com/api/v2/logging/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.LOGGING_API_KEY!,
  },
  body: JSON.stringify({
    level: 'error',
    message: 'Payment failed',
    category: 'application',
    metadata: { orderId: '123' },
  }),
});
```

See [`docs/logging-quickstart.md`](./logging-quickstart.md) for ingest and query examples.

## 4. Applying Module Changes

When Platform Admin updates module settings through the SDK or portal, changes propagate immediately to the tenant’s configuration. Tenants can revisit their portal to adjust provider credentials, roles, or logging preferences at any time.

## 5. Support

For questions or issues, open a ticket on the [GitHub repository](https://github.com/saas-framework/platform-admin-portal-sdk/issues).

