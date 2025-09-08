# Logging Quickstart

```ts
import { SaaSLogging } from '@saas-framework/logging';

const logger = new SaaSLogging({ apiKey: process.env.SAAS_LOG_KEY!, baseUrl: process.env.SAAS_BASE_URL! });

await logger.info('User logged in', { userId: '123' });
await logger.error('Payment failed', { invoiceId: 'inv_42' });
```

Logs are batched and sent to the platform where they can be viewed in the admin portal or forwarded
to external sinks like Datadog or Splunk.
