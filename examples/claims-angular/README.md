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

- Enter Org ID and sign in with Microsoft or Local credentials.
- View claims; Adjuster can update, Approver can approve.
- Logs are sent and queried automatically using the tenant's logging key.

Config:

- Platform base URL uses `http://localhost:5000`.
- Ensure platform `.env` sets
  `CORS_ORIGINS=http://localhost:5173,http://localhost:5299`.
