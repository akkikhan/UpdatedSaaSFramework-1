# RBAC Examples

```ts
import { SaaSRBAC } from '@saas-framework/rbac';

const rbac = new SaaSRBAC({ apiKey: process.env.SAAS_RBAC_KEY!, baseUrl: process.env.SAAS_BASE_URL! });

await rbac.assignRole('user-id', 'editor');
const allowed = await rbac.hasPermission('user-id', 'posts.write');
console.log('Editor can write posts?', allowed);
```
