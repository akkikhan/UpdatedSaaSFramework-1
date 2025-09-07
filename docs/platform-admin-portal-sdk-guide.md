# Platform Admin Portal SDK – Full Integration Guide

This guide explains how to integrate the Platform Admin Portal SDK and its
related packages so that tenant configuration in the Platform Admin Portal is
reflected immediately in tenant applications. It covers installation,
prerequisites, and end‑to‑end examples for all core modules: Authentication,
RBAC, and Logging.

## Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Installation](#2-installation)
- [3. Configuring Tenants with the Admin SDK](#3-configuring-tenants-with-the-admin-sdk)
- [4. Authentication Module](#4-authentication-module)
  - [4.1 Local JWT](#41-local-jwt)
  - [4.2 Azure AD Setup](#42-azure-ad-setup)
  - [4.3 Auth0 Setup](#43-auth0-setup)
  - [4.4 SAML Setup](#44-saml-setup)
- [5. RBAC Module](#5-rbac-module)
- [6. Logging Module](#6-logging-module)
- [7. End‑to‑End Example](#7-end-to-end-example)
- [8. Support](#8-support)

## 1. Prerequisites

Before starting, ensure you have:

- **Node.js 18+ and npm**
- **Access to a running platform instance** and an Admin API key
- **Your tenant or organisation ID** (`orgId`)
- Provider credentials for any authentication provider you plan to enable (Azure
  AD, Auth0, or SAML)

## 2. Installation

Install the Platform Admin SDK and the module SDKs used in the examples:

```bash
npm install @saas-framework/platform-admin-sdk \
            @saas-framework/auth-client \
            @saas-framework/rbac-sdk
```

The Logging module uses plain HTTP requests, so no additional client package is
required.

## 3. Configuring Tenants with the Admin SDK

Use the Platform Admin SDK to enable modules or update tenant settings from
code. Authentication uses your Admin API key.

```ts
import { PlatformAdminSDK } from "@saas-framework/platform-admin-sdk";

const admin = new PlatformAdminSDK({
  baseUrl: "https://api.your-platform.com",
  apiKey: process.env.ADMIN_API_KEY!,
});

// Enable core modules for a tenant
await admin.updateTenant(orgId, {
  enabledModules: ["auth", "rbac", "logging"],
});
```

Changes made through the SDK or the Platform Admin Portal propagate instantly to
the tenant portal and external applications.

## 4. Authentication Module

The authentication client (`@saas-framework/auth-client`) supports local JWT,
Azure AD, Auth0, and SAML providers. After enabling the module for a tenant,
provider settings entered in Platform Admin Portal appear under **Modules →
Authentication** in the Tenant Portal.

### 4.1 Local JWT

Use `loginWithPassword` for username/password sign‑in. Tokens returned in
redirect URLs are handled with `handleSuccessFromUrl`.

```ts
import {
  loginWithPassword,
  handleSuccessFromUrl,
} from "@saas-framework/auth-client";

// Local login
await loginWithPassword({ orgId, email, password });

// Capture token returned in redirect URLs
handleSuccessFromUrl();
```

### 4.2 Azure AD Setup

1. Create an Azure app registration with a redirect URI such as
   `https://your-platform.com/api/auth/azure/callback`.
2. Capture the **tenant ID**, **client ID**, and **client secret**.
3. In Platform Admin Portal, open the tenant’s module configuration and enter
   these values under **Authentication → Azure AD**.

Usage example:

```ts
import { startAzure } from "@saas-framework/auth-client";

await startAzure(orgId); // Redirects to Microsoft for SSO
```

### 4.3 Auth0 Setup

1. Create an application in the Auth0 dashboard.
2. Note the **domain**, **client ID**, **client secret**, and optional
   **audience**.
3. Set the callback URL to `https://your-platform.com/api/auth/auth0/callback`.
4. Enter these values under **Authentication → Auth0** in the Platform Admin
   Portal.

```ts
// Start Auth0 SSO
const res = await fetch(`/api/auth/auth0/${orgId}`);
const { authUrl } = await res.json();
window.location.href = authUrl;
```

### 4.4 SAML Setup

1. Obtain the IdP **entry point** (login URL), **issuer**, and **X.509
   certificate**.
2. Configure a callback such as
   `https://your-platform.com/api/auth/saml/callback`.
3. Enter these values under **Authentication → SAML** in the Platform Admin
   Portal.

```ts
// Start SAML SSO
const res = await fetch(`/api/auth/saml/${orgId}`);
const { redirectUrl } = await res.json();
window.location.href = redirectUrl; // redirects to IdP
```

For deeper guidance on Azure AD and JWT flows, see
[`INTEGRATION_GUIDE.md`](../INTEGRATION_GUIDE.md).

## 5. RBAC Module

The RBAC SDK (`@saas-framework/rbac-sdk`) exposes role and permission
management. After enabling RBAC, tenant admins can manage roles under **Modules
→ Roles** in their Tenant Portal.

```ts
import { SaaSFactoryRBAC } from "@saas-framework/rbac-sdk";

const rbac = new SaaSFactoryRBAC({
  baseUrl: "https://api.your-platform.com",
  apiKey: process.env.RBAC_API_KEY!,
  tenantId: process.env.TENANT_ID!,
});

// Create a role and assign it to a user
const editor = await rbac.createRole({
  name: "editor",
  permissions: ["documents.read", "documents.write"],
});
await rbac.assignRole("<user-id>", editor.id);

// Check a permission
const ok = await rbac.hasPermission("<user-id>", "documents", "read");
```

See [`rbac-quickstart.md`](./rbac-quickstart.md) for REST examples and
additional features such as listing roles and revoking assignments.

## 6. Logging Module

Enable the Logging module to ingest and query structured events. In the Tenant
Portal, admins can configure log levels, destinations, retention and PII
redaction under **Modules → Logging Settings**. The SDK uses the tenant’s
logging API key.

```ts
// Node.js fetch example
await fetch("https://api.your-platform.com/api/v2/logging/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.LOGGING_API_KEY!,
  },
  body: JSON.stringify({
    level: "error",
    message: "Payment failed",
    category: "application",
    metadata: { orderId: "123" },
  }),
});
```

Ingestion and query examples are covered in
[`logging-quickstart.md`](./logging-quickstart.md).

## 7. End‑to‑End Example

For a complete sample application demonstrating Authentication, RBAC and Logging
together, see [`integration-claims-demo.md`](./integration-claims-demo.md).

## 8. Support

Questions or issues? Open a ticket on the
[GitHub repository](https://github.com/saas-framework/platform-admin-portal-sdk/issues).
