# Gmail Setup Guide for Email Service

## Steps to Configure Gmail for the SaaS Framework

### 1. Enable 2-Factor Authentication

- Go to [Google Account Security](https://myaccount.google.com/security)
- Enable "2-Step Verification" if not already enabled

### 2. Generate App Password

- Go to [App Passwords](https://myaccount.google.com/apppasswords)
- Select "Mail" as the app
- Select "Other (custom name)" as the device
- Enter "SaaS Framework" as the name
- Click "Generate"
- Copy the 16-character password (something like: `abcd efgh ijkl mnop`)

### 3. Update .env File

Replace `your_gmail_app_password_here` in your `.env` file with the generated
app password:

```env
GMAIL_USER=akki@primussoft.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### 4. Restart the Server

After updating the `.env` file, restart your development server:

```bash
npm run dev
```

### 5. Test Email

Once configured, you can test email functionality through the admin dashboard
at: http://localhost:5000/admin

## Security Notes

- Never commit the actual App Password to version control
- The App Password is specific to this application
- You can revoke it anytime from your Google Account settings

## Troubleshooting

- Make sure 2FA is enabled on your Google account
- Ensure you're using the App Password, not your regular Gmail password
- Check that `GMAIL_USER` matches your actual Gmail address
- Verify the App Password has no spaces when pasted into .env
