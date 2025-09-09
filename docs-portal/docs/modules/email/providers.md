# Email Providers

Supported providers include SMTP, SendGrid, and AWS SES. Configure credentials for each tenant in
the admin portal. Example SMTP configuration:

```json
{
  "host": "smtp.mailtrap.io",
  "port": 587,
  "auth": { "user": "u", "pass": "p" }
}
```

Choose the provider that meets your deliverability and compliance requirements.
