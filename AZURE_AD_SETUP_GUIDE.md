# Azure AD OAuth Integration Guide

This guide walks through setting up Azure AD OAuth integration with your SaaS
platform.

## 🔧 Azure AD Configuration

### Step 1: Register Application in Azure AD

1. **Go to Azure Portal**: [https://portal.azure.com](https://portal.azure.com)
2. **Navigate to**: Azure Active Directory → App registrations → New
   registration
3. **Configure Application**:
   - **Name**: `SaaS Platform - [Environment]` (e.g., "SaaS Platform -
     Development")
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: `http://localhost:3000/api/auth/azure/callback` (for
     development)

### Step 2: Configure Application Settings

After registration, configure the following:

#### Authentication Settings

- **Redirect URIs**:
  - Development: `http://localhost:3000/api/auth/azure/callback`
  - Production: `https://yourdomain.com/api/auth/azure/callback`
- **Logout URL**: `http://localhost:3000/auth/logout`
- **Implicit grant**: ✅ ID tokens

#### API Permissions

Add the following Microsoft Graph permissions:

- **User.Read** (Delegated) - ✅ Admin consent granted
- **User.ReadBasic.All** (Delegated) - ✅ Admin consent granted
- **GroupMember.Read.All** (Delegated) - Optional, for role mapping

#### Certificates & Secrets

- Create a **Client Secret**
- **Copy the secret value** (you won't see it again!)
- Set expiration to 24 months

### Step 3: Gather Configuration Values

From your Azure AD app registration, collect:

```
Tenant (Directory) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client Secret: your-secret-value-here
```

## 🔑 Environment Configuration

### Development Environment

Add to your `.env` file:

```bash
# Azure AD Configuration (for testing)
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/azure/callback

# Base URL for callbacks
BASE_URL=http://localhost:3000

# Client URL for redirects
CLIENT_URL=http://localhost:3000
```

### Production Environment

```bash
# Azure AD Configuration
AZURE_TENANT_ID=your-production-tenant-id
AZURE_CLIENT_ID=your-production-client-id
AZURE_CLIENT_SECRET=your-production-client-secret
AZURE_REDIRECT_URI=https://yourdomain.com/api/auth/azure/callback

# Base URL for callbacks
BASE_URL=https://yourdomain.com

# Client URL for redirects
CLIENT_URL=https://yourdomain.com
```

## 🚀 Platform Admin Setup

### Step 1: Configure Azure AD for a Tenant

Use the Platform Admin API to configure Azure AD for any tenant:

```bash
POST /api/tenants/{tenantId}/azure-ad/config
Authorization: Bearer {platform-admin-token}
Content-Type: application/json

{
  "tenantId": "your-azure-tenant-id",
  "clientId": "your-azure-client-id",
  "clientSecret": "your-azure-client-secret",
  "callbackUrl": "http://localhost:3000/api/auth/azure/callback"
}
```

### Step 2: Test Configuration

Test the Azure AD setup:

```bash
POST /api/tenants/{tenantId}/azure-ad/test
Authorization: Bearer {platform-admin-token}
```

### Step 3: Get Configuration

View current Azure AD settings:

```bash
GET /api/tenants/{tenantId}/azure-ad/config
Authorization: Bearer {platform-admin-token}
```

## 👥 User Authentication Flow

### Step 1: Initiate OAuth Flow

Frontend redirects user to:

```
GET /api/auth/azure/{orgId}
```

Response:

```json
{
  "authUrl": "https://login.microsoftonline.com/..."
}
```

### Step 2: User Consents in Azure AD

User is redirected to Microsoft login page and grants consent.

### Step 3: Handle Callback

Azure AD redirects back to:

```
GET /api/auth/azure/callback?code=...&state=...
```

### Step 4: Success Redirect

User is redirected to:

```
http://localhost:3000/auth/success?token=jwt-token&tenant=orgId
```

## 🧪 Testing Guide

### Unit Tests

Run Azure AD service tests:

```bash
npm run test server/__tests__/services/azure-ad.test.ts
```

### Integration Tests

Run OAuth flow tests:

```bash
npm run test tests/integration/azure-ad-oauth.test.ts
```

### Manual Testing

1. **Start the development server**:

   ```bash
   npm run dev
   ```

2. **Create a test tenant** with Platform Admin:

   ```bash
   curl -X POST http://localhost:3000/api/tenants \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer {platform-admin-token}" \\
     -d '{
       "orgId": "test-azure",
       "name": "Azure Test Organization",
       "adminEmail": "admin@test.com"
     }'
   ```

3. **Configure Azure AD** for the tenant (use Platform Admin UI or API)

4. **Test OAuth flow**:
   - Navigate to: `http://localhost:3000/api/auth/azure/test-azure`
   - Complete Azure AD login
   - Verify successful redirect with JWT token

## 🔍 Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI"

- **Cause**: Redirect URI doesn't match Azure AD app registration
- **Solution**: Update Azure AD app registration or environment variable

#### 2. "Invalid client secret"

- **Cause**: Client secret expired or incorrect
- **Solution**: Generate new client secret in Azure AD

#### 3. "Insufficient privileges"

- **Cause**: Missing API permissions or admin consent
- **Solution**: Grant admin consent for required permissions

#### 4. "User provisioning failed"

- **Cause**: Database connection or missing tenant configuration
- **Solution**: Check logs and verify tenant exists

### Debug Information

Enable debug logging:

```bash
NODE_ENV=development VERBOSE_TESTS=true npm run dev
```

Check logs for:

- `[Azure AD]` prefixed messages
- MSAL library debug information
- Microsoft Graph API responses
- User provisioning details

### API Testing with Postman

Import the included Postman collection for testing all Azure AD endpoints:

1. Platform Admin Authentication
2. Tenant Configuration
3. OAuth Flow Testing
4. Token Management

## 📊 Monitoring & Analytics

The platform automatically logs:

- **Successful logins**: `azure_ad_login_success`
- **Failed logins**: `azure_ad_login_failed`
- **Configuration changes**: `azure_ad_configured`
- **Token refreshes**: `azure_ad_token_refresh`

View logs via:

```bash
GET /api/logs/system?action=azure_ad_login_success
```

## 🔒 Security Considerations

1. **Client Secrets**: Store securely, rotate regularly
2. **Token Storage**: Use secure HTTP-only cookies in production
3. **State Validation**: Always validate state parameter to prevent CSRF
4. **HTTPS**: Required in production for secure token exchange
5. **User Consent**: Review permissions regularly, use minimal required scopes

## 📝 Role Mapping

Configure automatic role assignment based on Azure AD groups:

```json
{
  "auth": {
    "providers": [
      {
        "type": "azure-ad",
        "userMapping": {
          "roleField": "groups",
          "roleMappings": {
            "SaaS Admins": ["admin"],
            "SaaS Managers": ["manager"],
            "SaaS Users": ["user"]
          }
        }
      }
    ]
  }
}
```

## 🎯 Production Checklist

- [ ] Azure AD app registered with production URLs
- [ ] Client secret configured and secured
- [ ] API permissions granted with admin consent
- [ ] HTTPS enabled for all callbacks
- [ ] Environment variables configured
- [ ] Monitoring and logging enabled
- [ ] Backup authentication method configured
- [ ] User role mappings tested
- [ ] Error handling validated
- [ ] Performance benchmarks met

---

## 📞 Support

For additional help:

- Check server logs for detailed error messages
- Review Azure AD audit logs in Azure Portal
- Test configuration using provided API endpoints
- Contact development team with error details and tenant configuration
