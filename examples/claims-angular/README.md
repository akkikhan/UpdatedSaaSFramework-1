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

Seamless SSO redirect:

- Azure App Registration must include only the backend callback:
  `http://localhost:5000/api/auth/azure/callback`.
- The backend reads `redirectBase` and `redirectTo` from start→state→callback
  and will redirect back to `http://localhost:5173/dashboard?token=...`.
- Backend enforces allowed origins. Add more via
  `ALLOWED_REDIRECT_BASES=http://localhost:5173,http://127.0.0.1:5173`.

Troubleshooting:

- If you land on a SPA callback (5173) instead of the backend, remove any SPA
  redirect URIs from the App Registration and ensure
  `AUTH_RESPECT_CONFIG_REDIRECT` is not set.
- To point the SPA to a different API host: open devtools and run
  `window.setClaimsApiBase('http://localhost:5000')`.
