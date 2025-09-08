# RBAC Quickstart (External Integrators)

- Base URL: `/api/v2/rbac`
- Auth required: Bearer tenant user JWT in `Authorization` header and
  `X-Tenant-ID` set. RBAC requests must be authenticated.
- API key: The tenant RBAC API key is used for service-to-service automation;
  still include `X-Tenant-ID`.

Headers

- `Authorization: Bearer <user_jwt_or_service_key>`
- `X-Tenant-ID: <tenant_id>`
- `Content-Type: application/json`

Check a permission

```
POST /api/v2/rbac/check-permission
{
  "userId": "<user-id>",
  "resource": "documents",
  "action": "read"
}
→ { "hasPermission": true }
```

List roles

```
GET /api/v2/rbac/roles
```

Create a role

```
POST /api/v2/rbac/roles
{ "name": "editor", "permissions": ["documents.read", "documents.write"] }
```

Assign a role to user

```
POST /api/v2/rbac/users/<userId>/roles
{ "roleId": "<role-id>" }
```

List a user’s roles

```
GET /api/v2/rbac/users/<userId>/roles
```

Get available permissions (union of role permissions)

```
GET /api/v2/rbac/permissions
```

TypeScript SDK usage

```
import { SaaSFactoryRBAC } from '@saas-framework/rbac-sdk';

const rbac = new SaaSFactoryRBAC({
  apiKey: process.env.RBAC_API_KEY!,
  baseUrl: process.env.API_BASE_URL!,
  tenantId: process.env.TENANT_ID!,
});

const ok = await rbac.hasPermission('<user-id>', 'documents', 'read');
```

Notes

- RBAC requires the Authentication module to be enabled for your tenant.
- Always enforce permissions on server routes. Use the SDK on the client only
  for UI hints.
