# Email API

| Endpoint | Description |
| --- | --- |
| `POST /api/v2/email/send` | Send a templated email |
| `GET /api/v2/email/status/:id` | Retrieve delivery status |

Send request example:

```json
{
  "to": "user@example.com",
  "template": "welcome",
  "variables": { "name": "Alex" }
}
```
