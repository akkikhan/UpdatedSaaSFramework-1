# Logging API

| Endpoint | Description |
| --- | --- |
| `POST /api/v2/logging/events` | Submit a batch of log events |
| `GET /api/v2/logging/events` | Query stored events for the tenant |

Event payload example:

```json
{
  "level": "info",
  "message": "User logged in",
  "context": { "userId": "123" }
}
```
