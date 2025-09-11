# Azure AD Authentication Fix Guide

## Issues Identified

1. **AADSTS7000215: Invalid client secret provided** - The Azure AD client
   secret is invalid or expired
2. **TokenExpiredError: jwt expired** - User's JWT session token has expired
3. **Platform admin authentication error** - General authentication failures

## Solution Steps

### Step 1: Verify Azure AD Application Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: `8265bd99-a6e6-4ce7-8f82-a3356c85896d`
4. Check the following:

#### Authentication Settings

- **Redirect URIs**: Ensure
  `http://localhost:5000/api/platform/auth/azure/callback` is listed
- **Supported account types**: Should be "Accounts in any organizational
  directory (Any Azure AD directory - Multitenant)"

#### API Permissions

- **Microsoft Graph**: User.Read, User.ReadBasic.All (with admin consent if
  required)

### Step 2: Generate New Client Secret

1. In your Azure AD app registration, go to **Certificates & secrets**
2. Under **Client secrets**, click **+ New client secret**
3. Set description: "SaaS Platform Secret - 2025"
4. Set expiration: **24 months** (recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** (not the Secret ID) immediately - it won't
   be shown again

### Step 3: Update Environment Configuration

Replace the current `AZURE_CLIENT_SECRET` in your `.env` file with the new
secret value:

```env
# Azure AD Configuration - Updated $(Get-Date -Format "yyyy-MM-dd")
AZURE_CLIENT_ID=8265bd99-a6e6-4ce7-8f82-a3356c85896d
AZURE_CLIENT_SECRET=YOUR_NEW_SECRET_VALUE_HERE
AZURE_TENANT_ID=a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e
AZURE_REDIRECT_URI=http://localhost:5000/api/platform/auth/azure/callback
```

### Step 4: Clear User Sessions

Since users have expired JWT tokens, they need to clear their browser storage:

1. **Browser Developer Tools** → **Application/Storage** tab
2. Clear **Local Storage** and **Session Storage** for `localhost:5000`
3. Clear **Cookies** for `localhost:5000`
4. Or use **Incognito/Private** browser window

### Step 5: Restart the Server

After updating the `.env` file:

```powershell
# Stop current server (Ctrl+C if running)
# Then restart
cd "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"
npm run dev
```

### Step 6: Test Authentication

1. Navigate to: `http://localhost:5000/admin/login`
2. Click **Login with Microsoft**
3. Use authorized email: `khan.aakib@outlook.com` or `akki@primussoft.com`
4. Should redirect to Azure AD login → back to your app successfully

## Verification Commands

Test the authentication flow:

```powershell
# Test the Azure AD login endpoint
curl -X GET "http://localhost:5000/api/platform/auth/azure/login" -v

# Check if server is loading environment variables correctly
# (Add debug logging to verify secret is loaded)
```

## Troubleshooting

### If still getting client secret errors:

1. Double-check you copied the **secret value**, not the **secret ID**
2. Ensure no extra spaces or characters in the `.env` file
3. Verify the Azure AD app hasn't been deleted or disabled

### If redirect URI errors:

1. Ensure exact match: `http://localhost:5000/api/platform/auth/azure/callback`
2. Check if port 5000 is correct (not 3000 or 5173)

### If permission errors:

1. Grant admin consent for Microsoft Graph permissions
2. Ensure user email is in `AUTHORIZED_ADMIN_EMAILS` list

## Security Notes

- Client secrets should be rotated every 12-24 months
- Never commit secrets to version control
- Use Azure Key Vault for production environments
- Consider using certificate-based authentication for production
