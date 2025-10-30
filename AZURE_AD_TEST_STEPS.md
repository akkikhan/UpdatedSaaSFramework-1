# Azure AD Login Test with Supabase - Step-by-Step Guide

## Pre-Test Verification ✅

**Current Database State:**

- Connected to: `db.keircyoaeycwpasinpyi.supabase.co`
- Current platform admins: 1 (admin@yourcompany.com)
- Server running on: `http://localhost:5000`
- Azure AD App ID: `ae77a572-bbf4-4b54-baef-d066c61a98b8`
- Authorized email: `akkhan2026@outlook.com`

## Manual Testing Steps

### Step 1: Navigate to Admin Login

1. Open your browser (preferably in incognito/private mode to avoid cached
   credentials)
2. Navigate to: **http://localhost:5000/admin/login**
3. You should see the platform admin login page

### Step 2: Initiate Azure AD Login

1. Click the **"Sign in with Microsoft"** button
2. You should be redirected to Microsoft login page
3. The URL should contain: `login.microsoftonline.com`

### Step 3: Complete Azure AD Authentication

1. Enter your Microsoft credentials:
   - Email: `akkhan2026@outlook.com`
   - Password: [Your Microsoft account password]
2. If prompted for MFA, complete the verification
3. If prompted for consent, accept the permissions requested

### Step 4: Verify Redirect and Login Success

1. After successful authentication, you should be redirected back to:
   **http://localhost:5000/admin/dashboard**
2. You should see the platform admin dashboard
3. Check that your name/email appears in the UI (top-right corner, typically)

### Step 5: Check for Errors

If login fails, check the URL for error parameters:

- `/admin/login?error=callback_processing_failed` - Server error processing
  callback
- `/admin/login?error=unauthorized_email` - Email not in authorized list
- `/admin/login?error=no_authorization_code` - Missing authorization code
- `/admin/login?error=invalid_state` - State validation failed

## Expected Server Console Output

During the login process, you should see logs like:

```
[PlatformAdmin][AzureAD] Login initiated with scopes: openid, profile, email
[PlatformAdmin][AzureAD] Callback hit
[Azure AD] Platform admin not found, creating new: akkhan2026@outlook.com
[Azure AD] Created new platform admin: akkhan2026@outlook.com
Platform Admin Azure AD login successful: akkhan2026@outlook.com
```

## Post-Test Verification

After completing the login, run the validation script to verify database
persistence:

```powershell
node validate-supabase.cjs
```

**Expected Output:**

```
✅ Platform Admins Table:
   - admin@yourcompany.com (super_admin) - Active: true
   - akkhan2026@outlook.com (super_admin) - Active: true
```

This confirms that:

1. The Azure AD user was successfully created in Supabase
2. The user has super_admin role
3. The account is active
4. Both admin accounts now exist in the database

## Troubleshooting

### Issue: "callback_processing_failed" error

**Solution:** Check server terminal for detailed error messages

### Issue: "unauthorized_email" error

**Solution:** Verify AUTHORIZED_ADMIN_EMAILS in .env contains:
`akkhan2026@outlook.com`

### Issue: Redirect to Azure AD fails

**Solution:**

1. Check Azure AD App Registration redirect URI matches:
   `http://localhost:5000/api/platform/auth/azure/callback`
2. Verify AZURE_CLIENT_ID and AZURE_TENANT_ID in .env are correct

### Issue: "Cannot read properties of undefined"

**Solution:** This typically indicates missing Azure AD response data - check
server logs for the actual API response

## Success Criteria

- ✅ Login redirects to Microsoft authentication page
- ✅ After authentication, redirects back to
  http://localhost:5000/admin/dashboard
- ✅ No error messages in URL or console
- ✅ Database validation shows 2 platform admins
- ✅ akkhan2026@outlook.com appears in platform_admins table
- ✅ Server logs show successful authentication

## Quick Verification Commands

Check server status:

```powershell
$proc = Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue; if ($proc) { Write-Host "Server is running ✅" -ForegroundColor Green } else { Write-Host "Server not running ❌" -ForegroundColor Red }
```

Check database state:

```powershell
node validate-supabase.cjs
```

View recent server logs (if needed):

```powershell
# Check the terminal where npm run dev is running
```

---

**Ready to test!** Follow the steps above and report back with the results.
