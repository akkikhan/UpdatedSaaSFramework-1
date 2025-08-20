# Email Service Troubleshooting Guide

## Current Status: Authentication Failed

The email service is experiencing authentication failures (Error 535) which means the email credentials are incorrect or need special configuration.

## Quick Solutions by Email Provider

### Gmail Users
1. **Enable 2-Factor Authentication** on your Google account
2. **Create an App Password**:
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification" 
   - Scroll down to "App passwords"
   - Generate a new app password for "Mail"
   - Use this 16-character password (not your regular Gmail password)

### Outlook/Hotmail/Live.com Users  
1. **Enable App Passwords**:
   - Go to https://account.microsoft.com/security
   - Sign in and go to "Security dashboard"
   - Click "Advanced security options"
   - Turn on "App passwords"
   - Generate an app password for this application

### Office 365 Business Users
1. Use your full email address as username
2. Use your regular password OR an app password if 2FA is enabled
3. Make sure "SMTP AUTH" is enabled in your Office 365 admin settings

### Yahoo Mail Users
1. **Generate App Password**:
   - Go to Yahoo Account Security page
   - Turn on 2-factor authentication
   - Generate an app password for "Mail"

## Testing Your Email Configuration

### Method 1: Use the Test API
```bash
curl -X POST http://localhost:5000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### Method 2: Check Health Status
```bash
curl http://localhost:5000/api/health
```

## Current Auto-Detected Settings

The system automatically detects SMTP settings based on your email domain:

| Provider | SMTP Host | Port | Security |
|----------|-----------|------|----------|
| Gmail | smtp.gmail.com | 587 | STARTTLS |
| Outlook | smtp-mail.outlook.com | 587 | STARTTLS |
| Office365 | smtp.office365.com | 587 | STARTTLS |
| Yahoo | smtp.mail.yahoo.com | 587 | STARTTLS |

## Manual Configuration

If auto-detection doesn't work, you can override settings by adding these environment variables:

```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Common Error Messages

### "Authentication unsuccessful" (535)
- **Cause**: Wrong username/password or 2FA enabled without app password
- **Solution**: Generate and use an app password

### "Connection timeout" 
- **Cause**: Wrong SMTP host or port
- **Solution**: Verify provider-specific settings

### "TLS/SSL errors"
- **Cause**: Security protocol mismatch  
- **Solution**: Try different ports (587, 465, 25)

## Next Steps

1. **Update your credentials** with an app password if using Gmail/Outlook
2. **Test the connection** using the API endpoint
3. **Check the server logs** for detailed error messages
4. **Try the tenant onboarding** once email is working

## For Development/Testing

If you want to bypass email for now, you can:

1. **Check the email logs** to see what would have been sent:
   - Visit `/logs` in the admin portal
   - Look at the "Email Logs" section

2. **Use a testing service** like Mailtrap or Ethereal Email for development

## Need Help?

If none of these solutions work:
1. Check the server console for detailed SMTP debugging info
2. Verify your email provider allows SMTP access
3. Consider using a dedicated email service like SendGrid or AWS SES for production