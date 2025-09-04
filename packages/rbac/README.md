# @saas-framework/rbac

Enterprise Role-Based Access Control (RBAC) SDK with hierarchical roles, dynamic
policies, real-time permissions, and conditional access controls.

## Features

- **Hierarchical Roles**: Multi-level role inheritance and permissions
- **Dynamic Policies**: Runtime policy evaluation and conditional access
- **Real-time Updates**: WebSocket-based permission synchronization
- **Conditional Access**: Time, location, and device-based restrictions
- **Performance Optimization**: Intelligent caching and batch operations
- **Audit Logging**: Comprehensive access decision tracking
- **Multi-tenant**: Tenant-isolated RBAC configurations
- **Compliance**: SOC2, GDPR, and enterprise security standards

## Installation

```bash
npm install @saas-framework/rbac
```

## Quick Start

```typescript
import { SaaSRBAC } from "@saas-framework/rbac";

const rbac = new SaaSRBAC({
  apiKey: "your-api-key",
  baseUrl: "https://api.yoursaas.com",
  cacheEnabled: true,
  realTimeUpdates: true,
});

// Check user permission
const decision = await rbac.hasPermission("user-123", "users:read", {
  tenantId: "tenant-456",
});

if (decision.allowed) {
  console.log("Access granted");
} else {
  console.log("Access denied:", decision.reason);
}
```

## Permission Management

### Basic Permission Checks

```typescript
// Simple permission check
const canRead = await rbac.hasPermission("user-123", "users:read");

// Permission with context
const canEdit = await rbac.hasPermission("user-123", "users:edit", {
  resourceId: "user-456",
  tenantId: "tenant-789",
});

// Batch permission checks
const permissions = await rbac.batchCheckPermissions("user-123", [
  "users:read",
  "users:write",
  "admin:access",
]);
```

### Role Management

```typescript
// Assign role to user
await rbac.assignRole("user-123", "manager", {
  tenantId: "tenant-456",
  scope: "department:sales",
});

// Remove role
await rbac.removeRole("user-123", "manager");

// Get user roles
const roles = await rbac.getUserRoles("user-123");
```

### Dynamic Policies

```typescript
// Create conditional policy
await rbac.createPolicy({
  name: "time-restricted-access",
  conditions: {
    timeWindow: { start: "09:00", end: "17:00" },
    ipRange: ["192.168.1.0/24"],
    deviceTrust: "trusted",
  },
  permissions: ["sensitive:read"],
});

// Apply policy to role
await rbac.applyPolicy("manager", "time-restricted-access");
```

## Configuration

```typescript
const rbac = new SaaSRBAC({
  apiKey: "your-api-key",
  baseUrl: "https://api.yoursaas.com",

  // Caching
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes

  // Real-time updates
  realTimeUpdates: true,
  websocketUrl: "wss://ws.yoursaas.com",

  // Security
  encryptionKey: "your-encryption-key",
  auditLogging: true,

  // Performance
  batchSize: 100,
  rateLimitRPM: 1000,
});
```

## API Reference

### SaaSRBAC

#### Constructor Options

- `apiKey` (string, required): API authentication key
- `baseUrl` (string, required): Base URL for RBAC service
- `cacheEnabled` (boolean): Enable permission caching
- `cacheTTL` (number): Cache time-to-live in seconds
- `realTimeUpdates` (boolean): Enable WebSocket updates
- `websocketUrl` (string): WebSocket endpoint URL
- `encryptionKey` (string): Encryption key for sensitive data
- `auditLogging` (boolean): Enable audit logging
- `batchSize` (number): Batch operation size limit
- `rateLimitRPM` (number): Rate limit requests per minute

#### Methods

##### `hasPermission(userId, permission, context?)`

Check if user has specific permission.

**Parameters:**

- `userId` (string): User identifier
- `permission` (string): Permission to check
- `context` (object): Optional context data

**Returns:** `Promise<PermissionDecision>`

##### `batchCheckPermissions(userId, permissions, context?)`

Check multiple permissions at once.

**Parameters:**

- `userId` (string): User identifier
- `permissions` (string[]): Array of permissions
- `context` (object): Optional context data

**Returns:** `Promise<PermissionDecision[]>`

##### `assignRole(userId, role, context?)`

Assign role to user.

**Parameters:**

- `userId` (string): User identifier
- `role` (string): Role name
- `context` (object): Optional context data

**Returns:** `Promise<void>`

##### `removeRole(userId, role)`

Remove role from user.

**Parameters:**

- `userId` (string): User identifier
- `role` (string): Role name

**Returns:** `Promise<void>`

##### `getUserRoles(userId)`

Get all roles for user.

**Parameters:**

- `userId` (string): User identifier

**Returns:** `Promise<Role[]>`

##### `createPolicy(policy)`

Create new access policy.

**Parameters:**

- `policy` (PolicyDefinition): Policy configuration

**Returns:** `Promise<Policy>`

##### `applyPolicy(role, policyName)`

Apply policy to role.

**Parameters:**

- `role` (string): Role name
- `policyName` (string): Policy identifier

**Returns:** `Promise<void>`

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SaaSRBAC,
  PermissionDecision,
  Role,
  Policy,
  PolicyDefinition,
} from "@saas-framework/rbac";

interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
  expiresAt?: Date;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  hierarchy: number;
  inherited: Role[];
}
```

## Error Handling

```typescript
try {
  const decision = await rbac.hasPermission("user-123", "admin:access");
  if (decision.allowed) {
    // Access granted
  } else {
    // Access denied
    console.log("Reason:", decision.reason);
  }
} catch (error) {
  if (error.code === "RBAC_USER_NOT_FOUND") {
    // Handle user not found
  } else if (error.code === "RBAC_PERMISSION_INVALID") {
    // Handle invalid permission
  } else {
    // Handle other errors
    console.error("RBAC error:", error.message);
  }
}
```

## License

MIT © SaaS Framework
