# Node Example

```ts
import { SaaSRBAC } from '@saas-framework/rbac';

const rbac = new SaaSRBAC({
  apiKey: process.env.SAAS_RBAC_KEY!,
  baseUrl: process.env.SAAS_BASE_URL!
});

const allowed = await rbac.hasPermission('user-id', 'posts:create');
console.log('Permission granted?', allowed);
```
