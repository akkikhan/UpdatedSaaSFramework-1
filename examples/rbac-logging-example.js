import { SaaSRBAC } from '@saas-framework/rbac';
import { SaaSLogging, LogLevel } from '@saas-framework/logging';

// Demonstrates using RBAC checks with logging
async function demo() {
  const baseUrl = 'https://api.example.com';
  const apiKey = 'test-api-key';

  const rbac = new SaaSRBAC({ baseUrl, apiKey });
  const logger = new SaaSLogging({ baseUrl, apiKey });

  const userId = 'user-123';
  const permission = 'module:action';

  const decision = await rbac.hasPermission(userId, permission);
  await logger.log(
    LogLevel.INFO,
    `Checked permission ${permission} for ${userId}`,
    { allowed: decision.allowed }
  );

  console.log('Permission allowed?', decision.allowed);
}

demo().catch(err => {
  console.error('Example failed', err);
});
