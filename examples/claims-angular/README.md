# Claims Angular Demo

Angular SPA that integrates platform modules: Azure AD Auth, RBAC, and Logging
v2.

Run:

```
cd examples/claims-angular
npm install
npx ng serve --port 5173 --open
```

Usage:

- Enter Org ID and (optional) Logging API Key on the page.
- Sign in with Microsoft or Local.
- View claims; Approve button requires `claims.approve` permission.
- Send/Query logs uses `X-API-Key` to `/api/v2/logging/*`.

Config:

- Platform base URL uses `http://localhost:5000`.
- Ensure platform `.env` sets
  `CORS_ORIGINS=http://localhost:5173,http://localhost:5299`.
