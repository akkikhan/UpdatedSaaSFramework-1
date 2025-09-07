# Authentication Provider Configuration

This guide summarizes the required Azure AD steps and notes for other providers so the `@saas-framework/auth` package can be published and consumed consistently.

## Azure Active Directory
1. **Register an application**
   - Azure Portal → Azure Active Directory → *App registrations* → **New registration**
   - Choose *Single tenant* and record the **Application (client) ID** and **Directory (tenant) ID**.
2. **Redirect URI**
   - Add `https://<your-domain>/api/auth/azure/callback` (and optionally `http://localhost:5000/api/auth/azure/callback` for local testing).
3. **Client secret**
   - *Certificates & secrets* → **New client secret** and copy the **Secret Value**. This value is used as the `clientSecret` in the tenant portal.
4. **Permissions**
   - *API permissions* → Microsoft Graph → Delegated → `User.Read` → **Grant admin consent**.
5. **Save in tenant portal**
   - Enter Tenant ID, Client ID, and Secret Value, click **Verify Secret**, then **Request Update** and have a platform admin approve the change so the secret is persisted for SSO.

## Auth0
1. Create a **Regular Web Application** and record the **Domain**, **Client ID**, and **Client Secret**.
2. Add `https://<your-domain>/api/auth/auth0/callback` to *Allowed Callback URLs*.
3. Enter the values in the tenant portal and verify as with Azure.

## SAML
1. Use your identity provider’s metadata XML to configure a new SAML application.
2. Set the Assertion Consumer Service URL to `https://<your-domain>/api/auth/saml/callback`.
3. Provide the IdP entity ID and certificate in the tenant portal.

## Runtime requirements
- Node.js **18+** is recommended so `fetch` is available globally.
- For real-time RBAC updates, install the optional `ws` package to provide a WebSocket implementation in Node environments.
