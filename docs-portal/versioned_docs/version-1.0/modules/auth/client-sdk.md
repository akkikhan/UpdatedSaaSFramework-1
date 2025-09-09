# Client SDK

Install the client package and initiate the login flow from your application:

```ts
import { startAzure, getAccessToken } from '@saas-framework/auth-client';

await startAzure('your-tenant-id');
const token = await getAccessToken();
```

The SDK refreshes tokens automatically and stores them in `localStorage` by default.
