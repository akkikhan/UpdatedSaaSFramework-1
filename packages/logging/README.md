# @saas-framework/logging

Enterprise logging SDK with structured logging, audit trails, search
capabilities, and alert management for SaaS applications.

## Features

- **Structured Logging**: JSON-based logging with consistent formats
- **Multiple Log Levels**: Debug, info, warn, error, and critical levels
- **Batch Processing**: Efficient bulk log processing for performance
- **Real-time Search**: Advanced search and filtering capabilities
- **Alert Rules**: Automated alerting based on log patterns
- **Audit Events**: Comprehensive audit trail for compliance
- **Performance Analytics**: Log-based performance monitoring
- **Multi-tenant**: Tenant-isolated logging configurations

## Installation

```bash
npm install @saas-framework/logging
```

## Quick Start

```typescript
import { SaaSLogging } from "@saas-framework/logging";

const logger = new SaaSLogging({
  // Use your tenant's Logging API key
  apiKey: "logging_...",
  // Your platform API base URL
  baseUrl: "http://localhost:5000",
  tenantId: "tenant-123",
  batchSize: 100,
  flushInterval: 5000,
});

// Simple logging (v2 routes, X-API-Key)
await logger.info("User logged in successfully", {
  userId: "user-123",
  ipAddress: "192.168.1.1",
  userAgent: "Chrome/91.0",
});
```

## Configuration

```typescript
const config = {
  apiKey: string;           // Logging API key (sent as X-API-Key)
  baseUrl: string;          // Base URL for the SaaS API
  tenantId: string;         // Tenant identifier
  batchSize?: number;       // Batch size for bulk operations (default: 100)
  flushInterval?: number;   // Auto-flush interval in ms (default: 5000)
  enableConsole?: boolean;  // Echo logs to console (default: false)
};
```

## Logging Methods

### Basic Logging

```typescript
// Different log levels
await logger.debug("Debug information", { userId: "user-123" });
await logger.info("Information message", { action: "login" });
await logger.warn("Warning message", { resource: "database" });
await logger.error("Error occurred", { error: "Connection failed" });
await logger.critical("Critical system issue", { service: "payment" });
```

### Structured Logging

```typescript
await logger.info("Payment processed successfully", {
  category: "payment",
  userId: "user-123",
  transactionId: "txn-456",
  amount: 99.99,
  currency: "USD",
  paymentMethod: "credit_card",
  provider: "stripe",
});
```

### Batch Logging

```typescript
const logEntries = [
  {
    level: "info",
    message: "User action 1",
    userId: "user-123",
    timestamp: new Date(),
  },
  {
    level: "info",
    message: "User action 2",
    userId: "user-123",
    timestamp: new Date(),
  },
];

await logger.logBatch(logEntries);
```

## Audit Events

### Recording Audit Events

```typescript
await logger.logSecurityEvent("admin_login", undefined, {
  userId: "user-123",
  ipAddress: "192.168.1.1",
});
```

### Compliance Audit Trail

```typescript
await logger.auditDataAccess({
  userId: "user-123",
  dataType: "customer_pii",
  action: "read",
  recordIds: ["customer-456"],
  justification: "Customer support request #789",
  metadata: {
    supportTicketId: "ticket-789",
  },
});
```

## Search and Filtering

### Basic Search

```typescript
const results = await logger.searchLogs({
  category: "payment",
  level: ["error", "critical"],
  limit: 100,
});
console.log(`Found ${results.total} log entries`);
```

### Advanced Filtering

```typescript
const results = await logger.searchLogs({
  category: "payment",
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(),
  limit: 100,
});
```

### Stats (v2)

```typescript
const stats = await logger.getLogStats("24h"); // or "7d", "30d"
console.log(stats);
```

## Alert Management

### Creating Alert Rules

```typescript
await logger.createAlertRule({
  name: "High Error Rate",
  description: "Alert when error rate exceeds threshold",
  condition: {
    type: "threshold",
    metric: "error_count",
    operator: "greater_than",
    value: 10,
    timeWindow: "5m",
  },
  actions: [
    {
      type: "email",
      recipients: ["devops@company.com"],
      template: "error_alert",
    },
    {
      type: "webhook",
      url: "https://hooks.slack.com/services/...",
      payload: {
        channel: "#alerts",
        text: "High error rate detected",
      },
    },
  ],
});
```

### Managing Alerts

```typescript
// Get active alerts
const alerts = await logger.getActiveAlerts();

// Acknowledge alert
await logger.acknowledgeAlert({
  alertId: "alert-123",
  acknowledgedBy: "user-456",
  notes: "Investigating the issue",
});

// Resolve alert
await logger.resolveAlert({
  alertId: "alert-123",
  resolvedBy: "user-456",
  resolution: "Fixed database connection issue",
});
```

## Roadmap

- Real-time streaming via WebSocket/SSE for error and alert events
- Performance metrics aggregation endpoints and client helpers
- Managed alert channels and templates

## Error Handling

```typescript
try {
  await logger.log(logData);
} catch (error) {
  if (error.code === "RATE_LIMITED") {
    console.error("Logging rate limit exceeded");
  } else if (error.code === "INVALID_TENANT") {
    console.error("Invalid tenant configuration");
  }
}
```

## Best Practices

1. **Use Appropriate Log Levels**: Choose the right level for each message
2. **Include Context**: Add relevant metadata for better debugging
3. **Batch When Possible**: Use batch operations for high-volume logging
4. **Monitor Performance**: Track application performance through logs
5. **Set Up Alerts**: Configure alerts for critical issues
6. **Regular Cleanup**: Archive old logs to manage storage costs

## License

MIT License - see [LICENSE](LICENSE) file for details.
