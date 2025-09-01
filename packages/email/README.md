# @saas-framework/email

Enterprise email notification SDK with SMTP, templates, and critical alerts for
SaaS applications.

## Features

- **SMTP Integration**: Built-in support for Office365, Gmail, and custom SMTP
  servers
- **Template Engine**: HTML and text email templates with variable substitution
- **Critical Alerts**: Priority email system for urgent notifications
- **Batch Sending**: Efficient bulk email processing
- **Multi-tenant Support**: Tenant-isolated email configurations
- **Delivery Tracking**: Email status monitoring and analytics
- **Error Handling**: Robust retry mechanisms and fallback options

## Installation

```bash
npm install @saas-framework/email
```

## Quick Start

```typescript
import { SaaSEmail } from "@saas-framework/email";

const emailService = new SaaSEmail({
  apiKey: "your-api-key",
  baseUrl: "https://api.yoursaas.com",
  smtpConfig: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: "your-email@company.com",
      pass: "your-password",
    },
  },
});

// Send a simple email
await emailService.sendEmail({
  tenantId: "tenant-123",
  to: ["user@example.com"],
  subject: "Welcome to our platform!",
  html: "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
  text: "Welcome! Thanks for joining us.",
});
```

## Configuration

### Basic Configuration

```typescript
const config = {
  apiKey: string;          // API key for authentication
  baseUrl: string;         // Base URL for the SaaS API
  smtpConfig?: {           // Optional SMTP configuration
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    }
  };
  retryAttempts?: number;  // Default: 3
  retryDelay?: number;     // Default: 1000ms
};
```

### Environment Variables

You can also configure using environment variables:

```bash
SAAS_EMAIL_API_KEY=your-api-key
SAAS_EMAIL_BASE_URL=https://api.yoursaas.com
SAAS_EMAIL_SMTP_HOST=smtp.office365.com
SAAS_EMAIL_SMTP_PORT=587
SAAS_EMAIL_SMTP_USER=your-email@company.com
SAAS_EMAIL_SMTP_PASS=your-password
```

## Advanced Usage

### Using Templates

```typescript
// Register a template
await emailService.registerTemplate({
  tenantId: "tenant-123",
  name: "welcome-email",
  subject: "Welcome {{userName}}!",
  html: `
    <h1>Welcome {{userName}}!</h1>
    <p>Your account has been created successfully.</p>
    <p>Login URL: {{loginUrl}}</p>
  `,
  text: "Welcome {{userName}}! Login at: {{loginUrl}}",
});

// Send using template
await emailService.sendTemplate({
  tenantId: "tenant-123",
  templateName: "welcome-email",
  to: ["newuser@example.com"],
  variables: {
    userName: "John Doe",
    loginUrl: "https://app.yoursaas.com/login",
  },
});
```

### Critical Alerts

```typescript
// Send critical system alert
await emailService.sendCriticalAlert({
  tenantId: "tenant-123",
  alertType: "system_outage",
  severity: "critical",
  message: "Database connection lost",
  details: {
    timestamp: new Date(),
    affectedServices: ["api", "dashboard"],
    estimatedDowntime: "15 minutes",
  },
  recipients: ["admin@company.com", "devops@company.com"],
});
```

### Batch Processing

```typescript
// Send multiple emails efficiently
const emails = [
  {
    tenantId: "tenant-123",
    to: ["user1@example.com"],
    subject: "Monthly Report",
    templateName: "monthly-report",
    variables: { month: "January" },
  },
  {
    tenantId: "tenant-123",
    to: ["user2@example.com"],
    subject: "Monthly Report",
    templateName: "monthly-report",
    variables: { month: "January" },
  },
];

const results = await emailService.sendBatch(emails);
console.log(`Sent ${results.successful} emails, ${results.failed} failed`);
```

## API Reference

### SaaSEmail Class

#### Methods

##### `sendEmail(options: EmailOptions): Promise<EmailResult>`

Send a single email.

##### `sendTemplate(options: TemplateEmailOptions): Promise<EmailResult>`

Send an email using a registered template.

##### `sendCriticalAlert(options: CriticalAlertOptions): Promise<EmailResult>`

Send a critical system alert.

##### `sendBatch(emails: EmailOptions[]): Promise<BatchResult>`

Send multiple emails in batch.

##### `registerTemplate(template: EmailTemplate): Promise<void>`

Register a new email template.

##### `getEmailStatus(emailId: string): Promise<EmailStatus>`

Get the delivery status of an email.

## Error Handling

The SDK includes comprehensive error handling:

```typescript
try {
  await emailService.sendEmail(emailOptions);
} catch (error) {
  if (error.code === "SMTP_ERROR") {
    console.error("SMTP configuration issue:", error.message);
  } else if (error.code === "TEMPLATE_NOT_FOUND") {
    console.error("Email template not found:", error.templateName);
  } else if (error.code === "RATE_LIMITED") {
    console.error("Rate limit exceeded, retry after:", error.retryAfter);
  }
}
```

## Best Practices

1. **Template Management**: Use templates for consistent branding and easier
   maintenance
2. **Error Handling**: Always implement proper error handling and retry logic
3. **Rate Limiting**: Respect email provider rate limits
4. **Monitoring**: Track email delivery rates and failures
5. **Security**: Never hardcode credentials, use environment variables

## Support

For issues and questions:

- GitHub Issues:
  [Report bugs](https://github.com/your-org/saas-framework/issues)
- Documentation: [Full API docs](https://docs.yoursaas.com/email)
- Email: support@yoursaas.com

## License

MIT License - see [LICENSE](LICENSE) file for details.
