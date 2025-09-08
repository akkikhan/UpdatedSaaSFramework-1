# Policy Model

Policies are JSON documents that describe roles and their allowed actions. A minimal example:

```json
{
  "roles": {
    "admin": ["*"] ,
    "editor": ["posts.read", "posts.write"]
  }
}
```

Policies are stored per tenant and can be updated through the RBAC API or admin portal.
