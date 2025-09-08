# Configuration

Configuration is identical across modules. Each client accepts an API key and a base URL pointing
to the platform gateway. Environment variables keep secrets out of source control:

```ts
import { SaaSAuth } from '@saas-framework/auth-client';

const auth = new SaaSAuth({
  apiKey: process.env.SAAS_AUTH_KEY!,
  baseUrl: process.env.SAAS_BASE_URL || 'https://api.example.com/api/v2'
});
```

Add the variables to your `.env` file or hosting provider's secret store before deploying.
