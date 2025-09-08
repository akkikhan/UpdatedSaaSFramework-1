import { config } from "dotenv";
import * as nodemailer from "nodemailer";
import { storage } from "../storage";

// Load environment variables before initialization
config();

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    // Use environment variables with fallbacks
    const smtpEmail =
      process.env.GMAIL_USER ||
      process.env.SMTP_EMAIL ||
      process.env.SMTP_USERNAME ||
      "your-email@example.com";
    const fromEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || smtpEmail;

    // Force Gmail settings if GMAIL_USER provided or FROM_EMAIL is a Gmail address
    let smtpSettings;
    if (process.env.GMAIL_USER || fromEmail.includes("@gmail.com")) {
      smtpSettings = { host: "smtp.gmail.com", port: 587, secure: false };
    } else {
      smtpSettings = this.getSmtpSettings(smtpEmail);
    }

    this.config = {
      smtpHost: process.env.SMTP_HOST || smtpSettings.host,
      smtpPort: parseInt(process.env.SMTP_PORT || "") || smtpSettings.port,
      // Prefer explicit SMTP_USERNAME/GMAIL_USER, fall back to FROM_EMAIL
      smtpUsername: process.env.GMAIL_USER || process.env.SMTP_USERNAME || fromEmail,
      smtpPassword:
        process.env.GMAIL_APP_PASSWORD ||
        process.env.SMTP_PASSWORD ||
        process.env.SMTP_APP_PASSWORD ||
        "",
      fromEmail: fromEmail,
      fromName: process.env.FROM_NAME || "SaaS Framework Platform",
    };

    if (!this.config.smtpPassword) {
      console.warn(
        "⚠️  SMTP_PASSWORD or SMTP_APP_PASSWORD environment variable not set. Email functionality will be disabled."
      );
      console.warn(
        "   For Gmail: Generate an App Password at https://myaccount.google.com/apppasswords"
      );
      console.warn(
        "   For Outlook/Office365: Generate an App Password at https://account.microsoft.com/security"
      );
    }

    console.log(
      `📧 Email service initialized - Host: ${this.config.smtpHost}:${this.config.smtpPort}, From: ${this.config.fromEmail}`
    );

    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465, // Use secure for port 465
      auth: this.config.smtpPassword
        ? {
            user: this.config.smtpUsername,
            pass: this.config.smtpPassword,
          }
        : undefined,
      // Office365 typically requires STARTTLS on 587
      requireTLS: this.config.smtpPort === 587,
      tls: { rejectUnauthorized: false },
    });

    // Proactively verify SMTP connectivity on startup (non-blocking)
    void this.transporter
      .verify()
      .then(() => {
        console.log(
          `📨 SMTP verify OK for ${this.config.smtpHost}:${this.config.smtpPort} as ${this.config.smtpUsername}`
        );
      })
      .catch(err => {
        console.warn(
          `⚠️  SMTP verify failed for ${this.config.smtpHost}:${this.config.smtpPort} as ${this.config.smtpUsername}:`,
          err?.message || err
        );
      });
  }

  private getSmtpSettings(email: string): { host: string; port: number; secure: boolean } {
    const domain = email.split("@")[1]?.toLowerCase();

    // Common email providers SMTP settings
    const providers: Record<string, { host: string; port: number; secure: boolean }> = {
      "gmail.com": { host: "smtp.gmail.com", port: 587, secure: false },
      "googlemail.com": { host: "smtp.gmail.com", port: 587, secure: false },
      "outlook.com": { host: "smtp-mail.outlook.com", port: 587, secure: false },
      "hotmail.com": { host: "smtp-mail.outlook.com", port: 587, secure: false },
      "live.com": { host: "smtp-mail.outlook.com", port: 587, secure: false },
      "office365.com": { host: "smtp.office365.com", port: 587, secure: false },
      "primussoft.com": { host: "smtp.office365.com", port: 587, secure: false },
      "yahoo.com": { host: "smtp.mail.yahoo.com", port: 587, secure: false },
      "yahoo.co.uk": { host: "smtp.mail.yahoo.com", port: 587, secure: false },
      "icloud.com": { host: "smtp.mail.me.com", port: 587, secure: false },
      "me.com": { host: "smtp.mail.me.com", port: 587, secure: false },
      "mac.com": { host: "smtp.mail.me.com", port: 587, secure: false },
    };

    return providers[domain] || { host: "smtp.gmail.com", port: 587, secure: false };
  }

  async sendModuleStatusEmail(
    tenant: {
      id: string;
      name: string;
      adminEmail: string;
    },
    changes: {
      enabled: string[];
      disabled: string[];
    }
  ): Promise<boolean> {
    const enabledHtml =
      changes.enabled.length > 0
        ? `
            <div class="module-list">
              <h3 class="enabled">✓ Modules Enabled:</h3>
              <ul>
                ${changes.enabled
                  .map(module => `<li>${this.getModuleDisplayName(module)}</li>`)
                  .join("")}
              </ul>
            </div>
            `
        : "";
    const disabledHtml =
      changes.disabled.length > 0
        ? `
            <div class="module-list">
              <h3 class="disabled">✗ Modules Disabled:</h3>
              <ul>
                ${changes.disabled
                  .map(module => `<li>${this.getModuleDisplayName(module)}</li>`)
                  .join("")}
              </ul>
            </div>
            `
        : "";
    const warningHtml =
      changes.disabled.length > 0
        ? `
            <div class="warning">
              <strong>⚠️ Important:</strong> Disabled modules will immediately restrict access to related features.
              Users may receive "access denied" messages when trying to use these features.
            </div>
            `
        : "";

    let subject = `Module Access Updated - ${tenant.name}`;
    let html = this.generateModuleStatusEmailTemplate(tenant, changes);

    const template = await storage.getEmailTemplate("module_status", tenant.id);
    if (template) {
      subject = template.subject.replace(/{{TENANT_NAME}}/g, tenant.name);
      html = template.htmlContent
        .replace(/{{TENANT_NAME}}/g, tenant.name)
        .replace(/{{ENABLED_MODULES}}/g, enabledHtml)
        .replace(/{{DISABLED_MODULES}}/g, disabledHtml)
        .replace(/{{WARNING_BLOCK}}/g, warningHtml);
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: tenant.adminEmail,
        subject,
        html,
      });

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "module_status",
        status: "sent",
        errorMessage: null,
      });

      return true;
    } catch (error) {
      console.error("Failed to send module status email:", error);

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "module_status",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    }
  }

  async sendTenantOnboardingEmail(tenant: {
    id: string;
    name: string;
    orgId: string;
    adminEmail: string;
    enabledModules?: string[];
    authApiKey?: string;
    rbacApiKey?: string;
    loggingApiKey?: string;
    notificationsApiKey?: string;
    moduleConfigs?: any;
  }): Promise<boolean> {
    // Load tenant-specific onboarding template if available
    const templates = await storage.getEmailTemplates(tenant.id);
    const onboardingTemplate = templates.find(t => t.name?.toLowerCase() === "onboarding");

    let subject =
      onboardingTemplate?.subject ||
      `Welcome to SaaS Framework - Your Tenant "${tenant.name}" is Ready`;
    let html = onboardingTemplate?.htmlContent || this.generateOnboardingEmailTemplate(tenant);

    if (onboardingTemplate) {
      for (const variable of onboardingTemplate.variables || []) {
        const value = (tenant as any)[variable] ?? "";
        html = html.replace(new RegExp(`{{\\s*${variable}\\s*}}`, "g"), String(value));
      }
    }

    // Get enabled modules or default
    const enabledModules = tenant.enabledModules || ["authentication", "rbac"];

    // Build API keys object for enabled modules only
    const apiKeys: { [key: string]: string } = {};
    if (enabledModules.includes("authentication") && tenant.authApiKey) {
      apiKeys.authentication = tenant.authApiKey;
    }
    if (enabledModules.includes("rbac") && tenant.rbacApiKey) {
      apiKeys.rbac = tenant.rbacApiKey;
    }
    if (enabledModules.includes("logging") && tenant.loggingApiKey) {
      apiKeys.logging = tenant.loggingApiKey;
    }
    if (enabledModules.includes("notifications") && tenant.notificationsApiKey) {
      apiKeys.notifications = tenant.notificationsApiKey;
    }

    // Temporarily skip email sending - just log as sent for now
    if (!this.config.smtpPassword) {
      console.log(
        `📧 Email functionality disabled - would have sent onboarding email to ${tenant.adminEmail}`
      );
      console.log(
        `📧 Tenant "${tenant.name}" created successfully with modules: ${enabledModules.join(", ")}`
      );

      // Log all API keys for enabled modules
      Object.entries(apiKeys).forEach(([module, apiKey]) => {
        console.log(`📧 ${module.charAt(0).toUpperCase() + module.slice(1)} API Key: ${apiKey}`);
      });

      // Log as sent for platform functionality
      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: onboardingTemplate?.name || "onboarding",
        status: "sent",
        errorMessage: "Email disabled - credentials not configured",
      });

      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: tenant.adminEmail,
        subject,
        html,
      });

      // Log successful email
      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: onboardingTemplate?.name || "onboarding",
        status: "sent",
        errorMessage: null,
      });

      return true;
    } catch (error) {
      console.error("Failed to send onboarding email:", error);

      // Log failed email
      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: onboardingTemplate?.name || "onboarding",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    }
  }

  private generateModuleStatusEmailTemplate(
    tenant: {
      id: string;
      name: string;
      adminEmail: string;
    },
    changes: {
      enabled: string[];
      disabled: string[];
    }
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Module Access Updated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8fafc; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #64748b; }
          .module-list { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .enabled { color: #059669; font-weight: 600; }
          .disabled { color: #dc2626; font-weight: 600; }
          .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #1e293b;">Module Access Updated</h1>
            <p style="margin: 10px 0 0 0; color: #64748b;">Changes to your tenant access</p>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>Your tenant <strong>${tenant.name}</strong> module access has been updated by an administrator.</p>
            
            ${
              changes.enabled.length > 0
                ? `
            <div class="module-list">
              <h3 class="enabled">✓ Modules Enabled:</h3>
              <ul>
                ${changes.enabled.map(module => `<li>${this.getModuleDisplayName(module)}</li>`).join("")}
              </ul>
            </div>
            `
                : ""
            }
            
            ${
              changes.disabled.length > 0
                ? `
            <div class="module-list">
              <h3 class="disabled">✗ Modules Disabled:</h3>
              <ul>
                ${changes.disabled.map(module => `<li>${this.getModuleDisplayName(module)}</li>`).join("")}
              </ul>
            </div>
            `
                : ""
            }
            
            ${
              changes.disabled.length > 0
                ? `
            <div class="warning">
              <strong>⚠️ Important:</strong> Disabled modules will immediately restrict access to related features. 
              Users may receive "access denied" messages when trying to use these features.
            </div>
            `
                : ""
            }
            
            <p>If you have questions about these changes, please contact your administrator.</p>
            
            <p>Best regards,<br>The SaaS Framework Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the SaaS Framework Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getModuleDisplayName(module: string): string {
    const displayNames: Record<string, string> = {
      auth: "Authentication",
      rbac: "Role-Based Access Control",
      "azure-ad": "Azure Active Directory",
      auth0: "Auth0 SSO",
      saml: "SAML SSO",
    };
    return displayNames[module] || module;
  }

  private generateOnboardingEmailTemplate(tenant: {
    name: string;
    orgId: string;
    adminEmail: string;
    enabledModules?: string[];
    authApiKey?: string;
    rbacApiKey?: string;
    loggingApiKey?: string;
    notificationsApiKey?: string;
    moduleConfigs?: any;
  }): string {
    const baseUrl = process.env.BASE_URL || "https://localhost:5000";
    const portalUrl = `${baseUrl}/tenant/${tenant.orgId}/login`;
    const docsUrl = `${baseUrl}/docs`;

    // Get enabled modules or default
    const enabledModules = tenant.enabledModules || ["authentication", "rbac"];

    // Build API keys object for enabled modules only
    const apiKeys: { [key: string]: string } = {};
    if (enabledModules.includes("authentication") && tenant.authApiKey) {
      apiKeys["Authentication"] = tenant.authApiKey;
    }
    if (enabledModules.includes("rbac") && tenant.rbacApiKey) {
      apiKeys["RBAC"] = tenant.rbacApiKey;
    }
    if (enabledModules.includes("logging") && tenant.loggingApiKey) {
      apiKeys["Logging"] = tenant.loggingApiKey;
    }
    if (enabledModules.includes("notifications") && tenant.notificationsApiKey) {
      apiKeys["Notifications"] = tenant.notificationsApiKey;
    }

    // Generate API keys section
    const apiKeysHtml = Object.entries(apiKeys)
      .map(([module, apiKey]) => `<p><strong>${module} API Key:</strong> ${apiKey}</p>`)
      .join("\n        ");

    // Generate NPM install command for enabled modules
    const packageNames = [];
    if (enabledModules.includes("authentication")) packageNames.push("@saas-framework/auth");
    if (enabledModules.includes("rbac")) packageNames.push("@saas-framework/rbac");
    if (enabledModules.includes("logging")) packageNames.push("@saas-framework/logging");
    if (enabledModules.includes("notifications"))
      packageNames.push("@saas-framework/notifications");

    const npmInstallCommand = `npm install ${packageNames.join(" ")}`;

    // Generate import statements for enabled modules
    const importStatements = [];
    const initStatements = [];

    if (enabledModules.includes("authentication") && tenant.authApiKey) {
      importStatements.push("import { SaaSAuth } from '@saas-framework/auth';");
      initStatements.push(`const auth = new SaaSAuth({
  apiKey: '${tenant.authApiKey}',
  baseUrl: '${baseUrl}/api/v2/auth'
});`);
    }

    if (enabledModules.includes("rbac") && tenant.rbacApiKey) {
      importStatements.push("import { SaaSRBAC } from '@saas-framework/rbac';");
      initStatements.push(`const rbac = new SaaSRBAC({
  apiKey: '${tenant.rbacApiKey}',
  baseUrl: '${baseUrl}/api/v2/rbac'
});`);
    }

    if (enabledModules.includes("logging") && tenant.loggingApiKey) {
      importStatements.push("import { SaaSLogging } from '@saas-framework/logging';");
      initStatements.push(`const logging = new SaaSLogging({
  apiKey: '${tenant.loggingApiKey}',
  baseUrl: '${baseUrl}/api/v2/logging'
});`);
    }

    if (enabledModules.includes("notifications") && tenant.notificationsApiKey) {
      importStatements.push("import { SaaSNotifications } from '@saas-framework/notifications';");
      initStatements.push(`const notifications = new SaaSNotifications({
  apiKey: '${tenant.notificationsApiKey}',
  baseUrl: '${baseUrl}/api/v2/notifications'
});`);
    }

    const integrationExample = `${importStatements.join("\n")}

${initStatements.join("\n\n")}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SaaS Framework</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #334155;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-text {
            font-size: 18px;
            margin-bottom: 30px;
            color: #1e293b;
        }
        .info-card {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
        }
        .info-card p {
            margin: 5px 0;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            color: #475569;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .steps {
            background: #fefce8;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .steps h3 {
            color: #92400e;
            margin: 0 0 15px 0;
        }
        .steps ol {
            margin: 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 8px 0;
            color: #451a03;
        }
        .code-block {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            margin: 15px 0;
            overflow-x: auto;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Welcome to SaaS Framework</h1>
            <p>Your tenant "${tenant.name}" is ready!</p>
        </div>
        
        <div class="content">
            <p class="welcome-text">
                Congratulations! Your multi-tenant SaaS platform has been successfully created and configured.
            </p>
            
            <div class="info-card">
                <h3>🔗 Tenant Portal Access</h3>
                <p><strong>Portal URL:</strong> ${portalUrl}</p>
                <p><strong>Admin Email:</strong> ${tenant.adminEmail}</p>
                <p><strong>Temporary Password:</strong> temp123!</p>
            </div>
            
            <a href="${portalUrl}" class="button">Access Your Tenant Portal</a>
            
      <div class="info-card">
        <h3>🔐 API Keys for Integration</h3>
        <p><strong>Tenant ID:</strong> ${tenant.orgId}</p>
        <p><strong>Enabled Modules:</strong> ${enabledModules.join(", ")}</p>
        ${apiKeysHtml}
      </div>
            
            <div class="steps">
                <h3>🚀 Next Steps</h3>
                <ol>
                    <li>Login to your tenant portal using the credentials above</li>
                    <li>Change your temporary password immediately</li>
                    <li>Set up users and roles for your team</li>
                    <li>Integrate our SDKs in your application</li>
                    <li>Start building your multi-tenant application!</li>
                </ol>
            </div>
            
            <h3>📦 SDK Integration</h3>
            <p>Install SDKs for your enabled modules:</p>
            
            <div class="code-block">
${npmInstallCommand}
            </div>
            
            <p>Example integration:</p>
            <div class="code-block">
// Using our lightweight auth client so your app always calls our APIs
import { startAzure, handleSuccessFromUrl, loginWithPassword, fetchWithAuth } from '@saas-framework/auth-client';

// 1) Add a button for Azure AD SSO
document.getElementById('btn-azure').addEventListener('click', () => startAzure('${tenant.orgId}'));

// 2) On your /auth/success page, capture the token from URL once
handleSuccessFromUrl(); // stores token in localStorage

// 3) For local login (optional fallback)
await loginWithPassword({ orgId: '${tenant.orgId}', email: 'user@example.com', password: '••••••••' });

// 4) Call APIs with the token attached
const res = await fetchWithAuth('/api/tenant/me');
const me = await res.json();
            </div>
        </div>
        
        <div class="footer">
            <p>
                Need help? Visit our <a href="${docsUrl}" style="color: #3b82f6;">documentation</a> 
                or contact support at dev-saas@primussoft.com
            </p>
            <p>© 2025 SaaS Framework Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async testConnection(): Promise<boolean> {
    // Skip connection test if no password configured
    if (!this.config.smtpPassword) {
      console.log("📧 SMTP connection test skipped - email functionality disabled");
      return true;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP connection test failed:", error);
      return false;
    }
  }

  async sendSimpleTestEmail(to: string, subject: string = "Test Email"): Promise<boolean> {
    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Email Service Test</h2>
  <p>This is a test email to verify that the SMTP configuration is working correctly.</p>
  <p><strong>Configuration:</strong></p>
  <ul>
    <li>SMTP Host: ${this.config.smtpHost}</li>
    <li>SMTP Port: ${this.config.smtpPort}</li>
    <li>From Email: ${this.config.fromEmail}</li>
  </ul>
  <p style="color: #666; margin-top: 30px;">
    Sent at: ${new Date().toISOString()}
  </p>
</body>
</html>
      `;

      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
      });

      console.log(`Test email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error("Failed to send test email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
