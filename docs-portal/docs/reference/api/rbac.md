# RBAC API

| Endpoint | Description |
| --- | --- |
| `GET /api/v2/rbac/roles` | List roles for the tenant |
| `POST /api/v2/rbac/roles` | Create or update a role |
| `POST /api/v2/rbac/check-permission` | Check if a user has a permission |

Example permission check:

```http
POST /api/v2/rbac/check-permission
{ "userId": "u1", "permission": "posts.read" }
```
