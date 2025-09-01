# @saas-framework/auth

Enterprise authentication and authorization SDK with Azure AD, Auth0, MFA, and
SAML support for SaaS applications.

## Features

- **Multi-Provider OAuth**: Azure AD, Auth0, Google, GitHub integration
- **Multi-Factor Authentication**: TOTP, SMS, email-based MFA
- **Password Security**: Advanced password policies and breach detection
- **Session Management**: Secure JWT tokens with refresh capabilities
- **SAML Support**: Enterprise SSO integration
- **Security Monitoring**: Real-time threat detection and logging
- **Multi-tenant**: Tenant-isolated authentication configurations
- **Compliance**: GDPR, SOC2, and enterprise security standards

## Installation

```bash
npm install @saas-framework/auth
```

## Quick Start

```typescript
import { SaaSAuth } from "@saas-framework/auth";

const auth = new SaaSAuth({
  apiKey: "your-api-key",
  baseUrl: "https://api.yoursaas.com",
  jwtSecret: "your-jwt-secret",
  azureAD: {
    clientId: "your-azure-client-id",
    clientSecret: "your-azure-client-secret",
    tenantId: "your-azure-tenant-id",
  },
});

// Login with email/password
const result = await auth.login({
  tenantId: "tenant-123",
  email: "user@example.com",
  password: "user-password",
});

if (result.success) {
  console.log("Access token:", result.accessToken);
  console.log("Refresh token:", result.refreshToken);
}
```

## Authentication Methods

### Email/Password Authentication

```typescript
// Register new user
const registration = await auth.register({
  tenantId: "tenant-123",
  email: "newuser@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
});

// Login
const login = await auth.login({
  tenantId: "tenant-123",
  email: "user@example.com",
  password: "SecurePass123!",
});
```

### Azure AD OAuth

```typescript
// Get Azure AD login URL
const authUrl = await auth.getAzureADAuthUrl({
  tenantId: "tenant-123",
  state: "custom-state-value",
});

// Handle OAuth callback
const result = await auth.handleAzureADCallback({
  tenantId: "tenant-123",
  code: "oauth-authorization-code",
  state: "custom-state-value",
});
```

## Multi-Factor Authentication

### Setup TOTP

```typescript
// Generate MFA setup for user
const mfaSetup = await auth.setupMFA({
  userId: "user-123",
  type: "totp",
  deviceName: "iPhone 12",
});

// Returns QR code URL and backup codes
console.log("QR Code:", mfaSetup.qrCodeUrl);
console.log("Backup codes:", mfaSetup.backupCodes);
```

### Verify MFA

```typescript
// Verify TOTP code
const verification = await auth.verifyMFA({
  userId: "user-123",
  code: "123456",
  type: "totp",
});
```

## Express Middleware

```typescript
import express from "express";

const app = express();

// Protect routes with authentication
app.use(
  "/api/protected",
  auth.middleware({
    requireMFA: false,
    allowRefreshToken: false,
  })
);
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
