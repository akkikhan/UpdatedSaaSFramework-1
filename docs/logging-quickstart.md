# Logging Quickstart

Enable the Logging module in Platform Admin, then use the tenant's
`loggingApiKey` to ingest and query events.

## Ingest an event

curl example:

```
curl -X POST \
  -H "X-API-Key: logging_..." \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/v2/logging/events \
  -d '{
    "level": "error",
    "message": "Payment failed",
    "category": "application",
    "metadata": {"orderId": "123"}
  }'
```

## Query events

```
curl -H "X-API-Key: logging_..." \
  "http://localhost:5000/api/v2/logging/events?level=error&category=application&limit=20"
```

## Tenant-managed settings

In the Tenant Portal → Modules → Logging Settings, configure:

- Levels: error, warning, info, debug
- Destinations: free-form list (e.g., `opensearch,splunk`)
- Retention Days: e.g., 30
- PII Redaction: on/off

These settings are stored under `tenant.moduleConfigs.logging` and can also be
edited by Platform Admin in Module Management.
