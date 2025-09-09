# Gmail Configuration Guide

## Steps to Configure Gmail for Your SaaS Application

### 1. Enable 2-Factor Authentication on Your Gmail Account

1. Go to your Google Account settings: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "How you sign in to Google", click on "2-Step Verification"
4. Follow the steps to enable 2FA (required for App Passwords)

### 2. Generate Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. If you don't see "App passwords", your account might not have 2FA enabled
3. Click "Select app" → Choose "Mail" or "Other (custom name)"
4. Enter a name like "SaaS Platform" or "Development Server"
5. Click "Generate"
6. **Copy the 16-character password** (you won't see it again!)

### 3. Update Your .env File

Replace the placeholder values in your `.env` file:

```env
# Gmail Configuration (Active)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=your-actual-gmail@gmail.com
SMTP_USERNAME=your-actual-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_NAME=SaaS Factory Platform
ADMIN_EMAIL=your-actual-gmail@gmail.com
```

### 4. Example Configuration

```env
# Gmail Configuration (Active)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=mycompany@gmail.com
SMTP_USERNAME=mycompany@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_NAME=SaaS Factory Platform
ADMIN_EMAIL=mycompany@gmail.com
```

### 5. Important Notes

- ✅ **App Password is required** - Regular Gmail password won't work
- ✅ **Use the actual Gmail address** for both FROM_EMAIL and SMTP_USERNAME
- ✅ **App Password format**: 16 characters, may have spaces (include them)
- ✅ **Port 587 with STARTTLS** is recommended for Gmail
- ⚠️ **Never commit real credentials** to version control

### 6. Testing Email Functionality

After updating your `.env` file:

1. Restart your development server: `npm run dev`
2. Look for this log message:
   `📨 Gmail transporter initialized for your-email@gmail.com`
3. Test email functionality through your application

### 7. Troubleshooting

- **"Invalid login"**: Check if 2FA is enabled and App Password is correct
- **"Authentication failed"**: Verify the Gmail address and App Password
- **"Connection timeout"**: Check if Gmail SMTP is blocked by your
  network/firewall

### 8. Security Best Practices

- Use a dedicated Gmail account for your application
- Regularly rotate your App Passwords
- Monitor your Google Account activity for unusual access
- Keep your `.env` file in `.gitignore`
