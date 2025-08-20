# @saas-factory/auth

Multi-tenant authentication SDK for SaaS Factory platform.

## Installation

```bash
npm install @saas-factory/auth
```

## Quick Start

```typescript
import SaaSFactoryAuth from '@saas-factory/auth';

// Initialize with your tenant configuration
const auth = new SaaSFactoryAuth({
  apiKey: 'your-auth-api-key',
  baseUrl: 'https://your-saas-platform.com',
  tenantId: 'your-tenant-id'
});

// Login user
try {
  const result = await auth.login({
    email: 'user@example.com',
    password: 'password'
  });
  
  console.log('User authenticated:', result.user);
  console.log('Access token:', result.token);
  
  // Store token for subsequent requests
  localStorage.setItem('auth_token', result.token);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Verify token
const user = await auth.verifyToken(token);
if (user) {
  console.log('Token is valid:', user);
} else {
  console.log('Token is invalid or expired');
}
```

## React Usage

```typescript
import { useAuth } from '@saas-factory/auth';

function LoginComponent() {
  const auth = useAuth({
    apiKey: 'your-auth-api-key',
    baseUrl: 'https://your-platform.com',
    tenantId: 'your-tenant-id'
  });

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await auth.login({ email, password });
      // Handle successful login
    } catch (error) {
      // Handle login error
    }
  };

  return (
    // Your login form
  );
}
```

## API Reference

### `SaaSFactoryAuth`

#### Constructor
- `config: AuthConfig` - Configuration object with apiKey, baseUrl, and tenantId

#### Methods

##### `login(credentials)`
Authenticates user with email and password.
- `credentials: { email: string, password: string }`
- Returns: `Promise<AuthResult>`

##### `verifyToken(token)`
Verifies JWT token and returns user information.
- `token: string`
- Returns: `Promise<User | null>`

##### `refreshToken(refreshToken)`
Refreshes access token using refresh token.
- `refreshToken: string`
- Returns: `Promise<string | null>`

##### `logout(token)`
Logs out user and invalidates token.
- `token: string`
- Returns: `Promise<boolean>`

#### Static Methods

##### `hashPassword(password)`
Hashes password for storage.
- `password: string`
- Returns: `Promise<string>`

##### `comparePassword(password, hash)`
Compares password with hash.
- `password: string`
- `hash: string`
- Returns: `Promise<boolean>`

##### `decodeToken(token)`
Decodes JWT token without verification.
- `token: string`
- Returns: `any`

## Types

```typescript
interface AuthConfig {
  apiKey: string;
  baseUrl: string;
  tenantId: string;
}

interface User {
  id: string;
  email: string;
  tenantId: string;
  roles?: string[];
  lastLogin?: Date;
}

interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}
```

## Error Handling

The SDK throws descriptive errors for various scenarios:

```typescript
try {
  await auth.login({ email, password });
} catch (error) {
  if (error.message === 'Authentication failed') {
    // Handle invalid credentials
  } else if (error.message === 'User account suspended') {
    // Handle suspended account
  }
}
```

## License

MIT