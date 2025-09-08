# Auth API

| Endpoint | Description |
| --- | --- |
| `POST /api/v2/auth/login` | Exchange credentials for a JWT |
| `POST /api/v2/auth/logout` | Revoke the active session |
| `GET /api/v2/auth/verify` | Validate and refresh an access token |

All requests require the tenant API key in the `x-api-key` header.
