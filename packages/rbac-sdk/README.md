# @saas-framework/rbac-sdk

Role-based access control SDK for the SaaS Framework platform.

> **Base URL**: All server requests should target your host with the `/api/v2` prefix, e.g. `https://your-saas-platform.com/api/v2`.

## Installation

```bash
npm install @saas-framework/rbac-sdk
```

## Quick Start

```typescript
import SaaSFrameworkRBAC from '@saas-framework/rbac-sdk';

// Initialize with your tenant configuration
const rbac = new SaaSFrameworkRBAC({
  apiKey: 'your-rbac-api-key',
  baseUrl: 'https://your-saas-platform.com',
  tenantId: 'your-tenant-id'
});

// Check user permissions
const canEdit = await rbac.hasPermission('user123', 'documents', 'edit');
if (canEdit) {
  // User can edit documents
} else {
  // User cannot edit documents
}

// Get user roles
const roles = await rbac.getUserRoles('user123');
console.log('User roles:', roles);
```

## Express.js Middleware

```typescript
import express from 'express';
import SaaSFrameworkRBAC from '@saas-framework/rbac-sdk';

const app = express();
const rbac = new SaaSFrameworkRBAC(config);

// Protect routes with permission checks
app.get('/admin/users', 
  rbac.requirePermission('users', 'read'),
  (req, res) => {
    // Only users with 'users:read' permission can access this
    res.json({ users: [] });
  }
);

app.post('/admin/users',
  rbac.requirePermission('users', 'create'),
  (req, res) => {
    // Only users with 'users:create' permission can access this
    res.json({ message: 'User created' });
  }
);
```

## React Usage

```typescript
import { useRBAC } from '@saas-framework/rbac-sdk';

function DocumentEditor({ userId }) {
  const rbac = useRBAC({
    apiKey: 'your-rbac-api-key',
    baseUrl: 'https://your-platform.com',
    tenantId: 'your-tenant-id'
  });

  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    rbac.hasPermission(userId, 'documents', 'edit')
      .then(setCanEdit);
  }, [userId]);

  if (!canEdit) {
    return <div>You don't have permission to edit documents.</div>;
  }

  return (
    <div>
      {/* Document editor interface */}
    </div>
  );
}
```

## Higher-Order Component

```typescript
import SaaSFrameworkRBAC from '@saas-framework/rbac-sdk';

const AdminPanel = SaaSFrameworkRBAC.withPermission('admin', 'access')(
  function AdminPanelComponent() {
    return <div>Admin Panel Content</div>;
  }
);

// Usage
<AdminPanel rbac={rbacInstance} userId="user123" />
```

## API Reference

### `SaaSFrameworkRBAC`

#### Constructor
- `config: RBACConfig` - Configuration object with apiKey, baseUrl, and tenantId

#### Methods

##### `hasPermission(userId, resource, action)`
Checks if user has permission for specific resource and action.
- `userId: string`
- `resource: string`
- `action: string`
- Returns: `Promise<boolean>`

##### `getUserRoles(userId)`
Gets all roles assigned to a user.
- `userId: string`
- Returns: `Promise<Role[]>`

##### `getRoles()`
Gets all available roles for the tenant.
- Returns: `Promise<Role[]>`

##### `createRole(roleData)`
Creates a new role.
- `roleData: { name: string, description?: string, permissions: string[] }`
- Returns: `Promise<Role>`

##### `assignRole(userId, roleId)`
Assigns a role to a user.
- `userId: string`
- `roleId: string`
- Returns: `Promise<boolean>`

##### `removeRole(userId, roleId)`
Removes a role from a user.
- `userId: string`
- `roleId: string`
- Returns: `Promise<boolean>`

##### `getPermissions()`
Gets all available permissions.
- Returns: `Promise<Permission[]>`

##### `requirePermission(resource, action)`
Express.js middleware to protect routes.
- `resource: string`
- `action: string`
- Returns: Express middleware function

#### Static Methods

##### `withPermission(resource, action, fallback?)`
React higher-order component for permission-based rendering.
- `resource: string`
- `action: string`
- `fallback?: React.ComponentType`
- Returns: HOC function

## Types

```typescript
interface RBACConfig {
  apiKey: string;
  baseUrl: string;
  tenantId: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  tenantId: string;
  createdAt: Date;
}

interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}
```

## Common Permission Patterns

```typescript
// Resource-based permissions
await rbac.hasPermission(userId, 'users', 'create');
await rbac.hasPermission(userId, 'documents', 'read');
await rbac.hasPermission(userId, 'settings', 'update');

// Admin permissions
await rbac.hasPermission(userId, 'admin', 'access');
await rbac.hasPermission(userId, 'billing', 'manage');

// Feature-specific permissions
await rbac.hasPermission(userId, 'reports', 'generate');
await rbac.hasPermission(userId, 'integrations', 'configure');
```

## Best Practices

1. **Use descriptive resource names**: `users`, `documents`, `settings`
2. **Use standard action names**: `create`, `read`, `update`, `delete`
3. **Cache permission checks** when possible to reduce API calls
4. **Handle permission failures gracefully** with appropriate user feedback
5. **Use middleware for route protection** in server-side applications

## License

MIT