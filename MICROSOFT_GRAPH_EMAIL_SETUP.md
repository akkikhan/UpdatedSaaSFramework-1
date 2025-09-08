# Microsoft Graph Email Service Configuration

## Overview

The email s## Testing

Run the test script to verify the configuration:

```bash
node validate-graph-email.cjs
```

## Troubleshooting

### 401 Authentication Error

If you see "Failed to send email via Microsoft Graph: GraphError (statusCode:
401)":

1. **Check Admin Consent:**
   - Go to Azure Portal > App registrations > Your app > API permissions
   - Ensure "Status" shows "Granted for [Organization]" (green checkmark)
   - If not, click "Grant admin consent for [Organization]"

2. **Verify Permissions:**
   - Required: `Mail.Send` (Application permission)
   - Optional: `User.Read.All` (if using specific user endpoint)

3. **Check Environment Variables:**
   ```bash
   # Verify these are set correctly:
   echo $AZURE_TENANT_ID
   echo $AZURE_CLIENT_ID
   echo $AZURE_CLIENT_SECRET
   echo $EMAIL_FROM
   ```

### 403 Forbidden Error

If you get 403 errors:

- Ensure the `EMAIL_FROM` address exists in your Azure AD tenant
- The email address must be a valid user or shared mailbox in your organization

### Connection Issues

- Verify your Azure AD tenant ID is correct
- Check that the client secret hasn't expired
- Ensure your app registration is in the same tenant as the user accountshas
  been successfully migrated from SMTP to Microsoft Graph API. This provides
  better integration with Azure AD and eliminates legacy authentication issues.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Microsoft Graph Configuration
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
EMAIL_FROM=noreply@yourdomain.com

# Optional Base URL for email templates
BASE_URL=https://localhost:5000
```

## Azure AD App Registration Setup

1. **Register Application in Azure AD:**
   - Go to Azure Portal > Azure Active Directory > App registrations
   - Click "New registration"
   - Name: "SaaS Framework Email Service"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Not needed for this app

2. **Configure API Permissions:**
   - Go to "API permissions" in your app registration
   - Click "Add a permission" > Microsoft Graph > Application permissions
   - Add these permissions:
     - `Mail.Send` - Send mail as any user
     - `User.Read.All` - Read all users' profiles (if using specific user
       endpoint)
   - Click "Grant admin consent for [Your Organization]"
   - ⚠️ **IMPORTANT:** Admin consent is required for application permissions

3. **Create Client Secret:**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Email Service Secret"
   - Copy the secret value (only shown once!)

4. **Get Configuration Values:**
   - **Tenant ID**: Overview tab > Directory (tenant) ID
   - **Client ID**: Overview tab > Application (client) ID
   - **Client Secret**: The value you copied in step 3

## Features

### Email Methods Available:

- `sendModuleStatusEmail()` - Sends module access updates to tenant admins
- `sendTenantOnboardingEmail()` - Sends welcome emails to new tenants
- `sendSimpleTestEmail()` - Sends test emails for verification
- `testConnection()` - Tests Microsoft Graph connectivity

### Graceful Fallback:

- If Microsoft Graph is not configured, emails are logged but not sent
- No errors thrown, system continues to function
- Email logs are stored in the database with status

### Template System:

- HTML email templates with tenant-specific data
- Module status change notifications
- Onboarding emails with portal URLs and credentials
- Professional styling with inline CSS

## Testing

Run the test script to verify the configuration:

```bash
node test-graph-email.js
```

## Migration Notes

### What Changed:

- ✅ Replaced `nodemailer` with `@microsoft/microsoft-graph-client`
- ✅ Replaced SMTP authentication with Azure AD app authentication
- ✅ Maintained all existing email template functionality
- ✅ Preserved email logging to database
- ✅ Added graceful fallback when Graph is not configured

### What Stayed the Same:

- ✅ All method signatures remain compatible
- ✅ Email templates and styling preserved
- ✅ Database logging functionality intact
- ✅ Error handling and logging maintained

### Backup:

The original SMTP implementation is preserved in:
`server/services/email-smtp-backup.ts`

## Security Benefits

- ✅ Modern OAuth 2.0 authentication instead of legacy SMTP AUTH
- ✅ Integrates with existing Azure AD infrastructure
- ✅ Supports MFA and conditional access policies
- ✅ Centralized permission management through Azure AD
- ✅ Audit trails through Azure AD logs
