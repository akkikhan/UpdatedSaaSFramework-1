# Server Setup

1. **Install the service** and its dependencies:
   ```bash
   npm install @saas-framework/auth-server
   ```
2. **Configure environment variables** such as `AUTH_SECRET`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`
   and `AZURE_CLIENT_SECRET`.
3. **Start the server**:
   ```bash
   npx auth-server start
   ```
The service exposes `/api/v2/auth` endpoints used by the client SDK.
