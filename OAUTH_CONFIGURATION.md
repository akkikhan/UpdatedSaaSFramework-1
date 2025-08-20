# 🔐 OAuth Configuration Guide

## Azure Active Directory Setup

### 1. Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**

#### Application Settings:
- **Name**: Your SaaS Application Name
- **Supported account types**: Accounts in this organizational directory only
- **Redirect URI**: Web - `https://yourdomain.com/api/oauth/azure-ad/callback`

### 2. Configure Application

#### Authentication Tab:
```
Redirect URIs:
- https://yourdomain.com/api/oauth/azure-ad/callback
- http://localhost:5000/api/oauth/azure-ad/callback (for development)

Logout URL:
- https://yourdomain.com/logout

Implicit grant and hybrid flows:
- ✓ Access tokens (used for implicit flows)
- ✓ ID tokens (used for implicit and hybrid flows)
```

#### Certificates & Secrets:
1. Click **New client secret**
2. Description: "SaaS Framework Secret"
3. Expires: 24 months
4. **Copy the secret value immediately!**

#### API Permissions:
```
Microsoft Graph:
- User.Read (Delegated)
- OpenId permissions (Delegated)
- Profile (Delegated)
- Email (Delegated)
```

### 3. Update Tenant Configuration

In your tenant portal, configure Azure AD module:

```json
{
  "tenantId": "your-azure-tenant-id",
  "clientId": "your-application-client-id", 
  "clientSecret": "your-client-secret",
  "domain": "yourdomain.onmicrosoft.com"
}
```

## Auth0 Setup

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications**
3. Click **Create Application**

#### Application Settings:
- **Name**: Your SaaS Application
- **Type**: Regular Web Application

### 2. Configure Application

#### Settings Tab:
```
Domain: your-tenant.auth0.com
Client ID: [automatically generated]
Client Secret: [automatically generated]

Allowed Callback URLs:
https://yourdomain.com/api/oauth/auth0/callback,
http://localhost:5000/api/oauth/auth0/callback

Allowed Logout URLs:
https://yourdomain.com/logout,
http://localhost:5000/logout

Allowed Web Origins:
https://yourdomain.com,
http://localhost:5000

Allowed Origins (CORS):
https://yourdomain.com,
http://localhost:5000
```

#### Advanced Settings:
```
Grant Types:
- ✓ Authorization Code
- ✓ Refresh Token
- ✓ Client Credentials

Algorithm: RS256
```

### 3. Update Tenant Configuration

In your tenant portal, configure Auth0 module:

```json
{
  "domain": "your-tenant.auth0.com",
  "clientId": "your-auth0-client-id",
  "clientSecret": "your-auth0-client-secret"
}
```

## Testing OAuth Flows

### Development URLs

For testing with your local environment:

```bash
# Azure AD
http://localhost:5000/api/oauth/azure-ad/test

# Auth0  
http://localhost:5000/api/oauth/auth0/test
```

### Production URLs

```bash
# Azure AD
https://yourdomain.com/api/oauth/azure-ad/{orgId}

# Auth0
https://yourdomain.com/api/oauth/auth0/{orgId}
```

## Environment Variables

For production deployment, set these environment variables:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Optional: Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
```

## Security Best Practices

### 1. Redirect URI Validation
- Always use HTTPS in production
- Validate redirect URIs strictly
- Use state parameter for CSRF protection

### 2. Secret Management
- Store secrets in environment variables
- Use Azure Key Vault or AWS Secrets Manager
- Rotate secrets regularly

### 3. Token Security
- Use secure HTTP-only cookies
- Implement proper CORS policies
- Set appropriate token expiration times

### 4. Tenant Isolation
- Validate tenant access on each request
- Ensure users can only access their tenant data
- Implement proper role-based permissions

## Troubleshooting

### Common Issues

#### Azure AD: "AADSTS50011: Redirect URI mismatch"
- Verify redirect URI matches exactly in Azure AD app registration
- Check for trailing slashes or protocol mismatches

#### Auth0: "Callback URL mismatch"
- Ensure callback URL is listed in Auth0 application settings
- Verify domain and protocol match exactly

#### "Invalid state parameter"
- Check that state generation and parsing logic matches
- Ensure state hasn't expired or been tampered with

### Debug Mode

Enable debug logging in development:

```javascript
// Add to your OAuth service initialization
console.log('OAuth Config:', {
  domain: config.domain,
  clientId: config.clientId,
  redirectUri: config.redirectUri
});
```

## Integration with External Apps

### Express.js Integration

```javascript
app.get('/auth/azure', async (req, res) => {
  const tenantOrgId = req.query.tenant;
  res.redirect(`https://yourdomain.com/api/oauth/azure-ad/${tenantOrgId}`);
});

app.get('/auth/auth0', async (req, res) => {
  const tenantOrgId = req.query.tenant;
  res.redirect(`https://yourdomain.com/api/oauth/auth0/${tenantOrgId}`);
});
```

### Frontend Integration

```javascript
// React/Vue/Angular
const loginWithAzure = () => {
  window.location.href = `https://yourdomain.com/api/oauth/azure-ad/${tenantId}`;
};

const loginWithAuth0 = () => {
  window.location.href = `https://yourdomain.com/api/oauth/auth0/${tenantId}`;
};
```