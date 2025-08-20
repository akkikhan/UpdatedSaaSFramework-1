# @saas-framework/rbac

A powerful Role-Based Access Control (RBAC) SDK for multi-tenant SaaS applications built with the SaaS Framework.

## Features

- **Role Management**: Create and manage user roles
- **Permission System**: Granular permission control
- **Express Middleware**: Easy integration with Express.js routes
- **Multi-tenant Support**: Isolated RBAC per tenant
- **TypeScript Support**: Full TypeScript definitions included
- **Flexible Authorization**: Support for AND/OR permission logic

## Installation

```bash
npm install @saas-framework/rbac
```

## Quick Start

```typescript
import { SaaSRBAC } from '@saas-framework/rbac';

const rbac = new SaaSRBAC({
  apiKey: 'your-tenant-rbac-api-key',
  baseUrl: 'https://your-saas-platform.com/api/v2/rbac'
});

// Check user permission
const canEdit = await rbac.hasPermission('user123', 'posts.edit');

// Get user roles
const roles = await rbac.getUserRoles('user123');

// Get user permissions
const permissions = await rbac.getUserPermissions('user123');
```

## Express.js Integration

### Permission-Based Protection

```typescript
import express from 'express';
import { SaaSRBAC } from '@saas-framework/rbac';

const app = express();
const rbac = new SaaSRBAC({ /* config */ });

// Require specific permission
app.get('/api/posts', 
  rbac.middleware(['posts.read']),
  (req, res) => {
    res.json({ posts: [] });
  }
);

// Require multiple permissions (OR logic)
app.post('/api/posts',
  rbac.middleware(['posts.create', 'posts.admin']),
  (req, res) => {
    // User needs either posts.create OR posts.admin
  }
);

// Require all permissions (AND logic)
app.delete('/api/posts/:id',
  rbac.middleware(['posts.delete', 'posts.admin'], { requireAll: true }),
  (req, res) => {
    // User needs BOTH posts.delete AND posts.admin
  }
);
```

### Role-Based Protection

```typescript
// Require specific role
app.get('/api/admin',
  rbac.roleMiddleware(['admin']),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);
```

## API Reference

### Constructor

```typescript
new SaaSRBAC(config: SaaSRBACConfig)
```

#### SaaSRBACConfig

- `apiKey` (string): Your tenant's RBAC API key
- `baseUrl` (string): Base URL of your SaaS platform's RBAC endpoints

### Permission Methods

#### `hasPermission(userId: string, permission: string): Promise<boolean>`

Checks if a user has a specific permission.

#### `hasPermissions(userId: string, permissions: string[]): Promise<{ [key: string]: boolean }>`

Checks multiple permissions for a user.

#### `getUserPermissions(userId: string): Promise<string[]>`

Gets all effective permissions for a user.

### Role Methods

#### `getUserRoles(userId: string): Promise<Role[]>`

Gets all roles assigned to a user.

#### `getRoles(): Promise<Role[]>`

Gets all available roles in the tenant.

#### `assignRole(userId: string, roleId: string): Promise<void>`

Assigns a role to a user.

#### `removeRole(userId: string, roleId: string): Promise<void>`

Removes a role from a user.

### System Methods

#### `getPermissions(): Promise<Permission[]>`

Gets all available permissions in the tenant.

### Middleware Methods

#### `middleware(permissions: string[], options?: MiddlewareOptions): RequestHandler`

Express middleware for permission-based route protection.

**Options:**
- `requireAll` (boolean, default: false): Whether user must have ALL permissions (AND) vs ANY permission (OR)

#### `roleMiddleware(roles: string[]): RequestHandler`

Express middleware for role-based route protection.

## Data Types

```typescript
interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

interface Permission {
  id: string;
  tenantId: string;
  key: string;
  description: string;
  category: string;
  isSystem: boolean;
}
```

## Usage Examples

### Complex Permission Checking

```typescript
// Check multiple permissions
const results = await rbac.hasPermissions('user123', [
  'posts.create',
  'posts.edit',
  'posts.delete'
]);

console.log(results);
// { 'posts.create': true, 'posts.edit': true, 'posts.delete': false }
```

### Role Management

```typescript
// Assign admin role to user
await rbac.assignRole('user123', 'admin-role-id');

// Remove role from user
await rbac.removeRole('user123', 'editor-role-id');
```

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  await rbac.assignRole(userId, roleId);
} catch (error) {
  console.error('Role assignment failed:', error.message);
}
```

## Integration with Authentication

Use this package alongside `@saas-framework/auth`:

```typescript
import { SaaSAuth } from '@saas-framework/auth';
import { SaaSRBAC } from '@saas-framework/rbac';

const auth = new SaaSAuth({ /* config */ });
const rbac = new SaaSRBAC({ /* config */ });

app.use('/api/protected', 
  auth.middleware(),           // Authenticate first
  rbac.middleware(['admin'])   // Then authorize
);
```

## License

MIT

## Support

For issues and questions, please visit: [GitHub Issues](https://github.com/saas-framework/rbac/issues)