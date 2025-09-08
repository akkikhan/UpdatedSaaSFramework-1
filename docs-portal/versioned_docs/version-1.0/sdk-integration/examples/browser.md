# Browser Example

```ts
import { startAzure } from '@saas-framework/auth-client';

// Trigger the Azure AD login flow and handle the redirect
await startAzure('your-tenant-id');
```

After authentication, the SDK stores tokens in `localStorage` so subsequent API calls include the
appropriate headers automatically.
