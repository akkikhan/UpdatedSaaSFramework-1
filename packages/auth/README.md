# @saas-framework/auth

A comprehensive authentication SDK for multi-tenant SaaS applications built with the SaaS Framework.

## Features

- **JWT Token Management**: Secure token generation, validation, and refresh
- **Multi-tenant Support**: Isolated authentication per tenant
- **Express Middleware**: Drop-in authentication middleware for Express.js
- **TypeScript Support**: Full TypeScript definitions included
- **Flexible Configuration**: Easily configurable for different environments

## Installation

```bash
npm install @saas-framework/auth
```

## Quick Start

```typescript
import { SaaSAuth } from '@saas-framework/auth';

const auth = new SaaSAuth({
  apiKey: 'your-tenant-auth-api-key',
  baseUrl: 'https://your-saas-platform.com/api/v2/auth'
});

// Login user
const session = await auth.login('user@example.com', 'password');

// Verify token
const isValid = await auth.verifyToken(session.token);

// Get current user
const user = await auth.getCurrentUser(session.token);
```

## Express.js Integration

```typescript
import express from 'express';
import { SaaSAuth } from '@saas-framework/auth';

const app = express();
const auth = new SaaSAuth({ /* config */ });

// Protect routes with authentication middleware
app.use('/api/protected', auth.middleware());

app.get('/api/protected/profile', (req, res) => {
  // req.user is automatically populated by the middleware
  res.json({ user: req.user });
});
```

## API Reference

### Constructor

```typescript
new SaaSAuth(config: SaaSAuthConfig)
```

#### SaaSAuthConfig

- `apiKey` (string): Your tenant's authentication API key
- `baseUrl` (string): Base URL of your SaaS platform's auth endpoints

### Methods

#### `login(email: string, password: string): Promise<AuthSession>`

Authenticates a user with email and password.

**Returns:** `AuthSession` containing token, user info, and expiration

#### `verifyToken(token: string): Promise<boolean>`

Verifies if a JWT token is valid and not expired.

#### `getCurrentUser(token: string): Promise<User>`

Retrieves user information from a valid JWT token.

#### `refreshToken(refreshToken: string): Promise<{ token: string }>`

Refreshes an expired JWT token using a refresh token.

#### `logout(token: string): Promise<void>`

Logs out a user and invalidates their token.

#### `middleware(options?: { required?: boolean }): RequestHandler`

Express.js middleware for route authentication.

**Options:**
- `required` (boolean, default: true): Whether authentication is required

## Error Handling

All methods throw descriptive errors that can be caught and handled:

```typescript
try {
  const session = await auth.login(email, password);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

## TypeScript Types

The package includes full TypeScript definitions:

```typescript
interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    isActive: boolean;
  };
  expiresAt: Date;
}
```

## License

MIT

## Support

For issues and questions, please visit: [GitHub Issues](https://github.com/saas-framework/auth/issues)