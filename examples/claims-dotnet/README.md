# Claims Demo (.NET Minimal API)

- Base URL: http://localhost:5299
- Uses platform at SAAS_BASE_URL (default http://localhost:5000)
- Logs via LOGGING_API_KEY (tenant logging key)

Run:

```
dotnet build
dotnet run --urls http://localhost:5299
```

Endpoints:

- GET /claims — requires tenant JWT (Authorization: Bearer ...)
- POST /claims/{id}/approve — verifies JWT, checks RBAC `claims.approve`, logs
  event

Env:

```
SAAS_BASE_URL=http://localhost:5000
LOGGING_API_KEY=logging_...
```
