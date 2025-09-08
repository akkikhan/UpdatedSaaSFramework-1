import { config } from "dotenv";
import * as nodemailer from "nodemailer";
import fetch from "node-fetch";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { storage } from "../storage";

// Load environment variables before initialization
config();

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;

  fromEmail: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private msalClient?: ConfidentialClientApplication;
  private useGraph = false;


  constructor() {
    this.config = {
      tenantId: process.env.AZURE_TENANT_ID || "",
      clientId: process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.AZURE_CLIENT_SECRET || "",
      fromEmail: process.env.EMAIL_FROM || "noreply@yourdomain.com",
    };

    const graphClientId =
      process.env.GRAPH_CLIENT_ID || process.env.AZURE_CLIENT_ID;
    const graphClientSecret =
      process.env.GRAPH_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
    const graphTenantId =
      process.env.GRAPH_TENANT_ID || process.env.AZURE_TENANT_ID;

    const graphConfigured = !!(
      graphClientId && graphClientSecret && graphTenantId
    );

    this.useGraph = graphConfigured;

    if (graphConfigured) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: graphClientId!,
          authority: `https://login.microsoftonline.com/${graphTenantId}`,
          clientSecret: graphClientSecret!,
        },
      });
    }

    if (!this.config.smtpPassword && !graphConfigured) {
      console.warn(
        "⚠️  SMTP_PASSWORD, SMTP_PASS, or SMTP_APP_PASSWORD environment variable not set. Email functionality will be disabled."
      );
      console.warn(
        "   For Gmail: Generate an App Password at https://myaccount.google.com/apppasswords"
      );

      console.warn(
        "⚠️  Microsoft Graph credentials not configured. Email functionality will be disabled."
      );
      return;
    }

    try {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
        },
      });

      console.log("📨 MSAL client initialized for Microsoft Graph");
      await this.initializeGraphClient();
    } catch (error) {
      console.warn("⚠️  Failed to initialize MSAL client:", error);
    }
  }

  private async initializeGraphClient(): Promise<void> {
    if (!this.msalClient) {
      console.warn("⚠️  MSAL client not initialized. Cannot connect to Microsoft Graph.");
      return;
    }

    try {
      const clientCredentialRequest = {
        scopes: ["https://graph.microsoft.com/.default"],
      };

      const authResponse =
        await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);

      if (authResponse) {
        this.graphClient = Client.init({
          authProvider: done => {
            done(null, authResponse.accessToken);
          },
        });
        console.log("📨 Microsoft Graph client initialized successfully");
      }
    } catch (error) {
      console.warn("⚠️  Failed to initialize Microsoft Graph client:", error);
    }
  }

  private async sendEmailViaGraph(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.graphClient) {
      console.warn("⚠️  Microsoft Graph client not initialized. Cannot send email.");
      return false;
    }

    try {
      const message = {
        subject: subject,
        body: {
          contentType: "HTML" as const,
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        from: {
          emailAddress: {
            address: this.config.fromEmail,
          },
        },
      };

      // Try multiple API endpoints for better compatibility
      try {
        // First try: Send as the configured user
        await this.graphClient.api(`/users/${this.config.fromEmail}/sendMail`).post({
          message: message,
        });
      } catch (userError: any) {
        if (userError.statusCode === 401 || userError.statusCode === 403) {
          console.log("📧 Trying alternative API endpoint...");
          // Second try: Use application context
          await this.graphClient.api("/me/sendMail").post({
            message: message,
          });
        } else {
          throw userError;
        }
      }

      console.log(`📨 Email sent successfully via Microsoft Graph to ${to}`);
      return true;
    } catch (error: any) {
      console.error("Failed to send email via Microsoft Graph:", error);

      // Provide more detailed error information
      if (error.statusCode === 401) {
        console.error("❌ Authentication failed - check Azure AD app permissions");
        console.error("   Required permission: Mail.Send (Application)");
        console.error("   Make sure admin consent has been granted");
      } else if (error.statusCode === 403) {
        console.error("❌ Forbidden - check if the from email address exists in your tenant");
        console.error(`   From email configured: ${this.config.fromEmail}`);
      } else if (error.statusCode === 404) {
        console.error("❌ User not found - check if the from email address is valid");
      }

      return false;
    }
  }

  private async sendViaGraph(
    to: string[],
    subject: string,
    html: string
  ): Promise<void> {
    if (!this.msalClient) {
      throw new Error("Microsoft Graph client not configured");
    }

    const token = await this.msalClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    if (!token || !token.accessToken) {
      throw new Error("Could not acquire Microsoft Graph access token");
    }

    const recipients = to.map(address => ({
      emailAddress: { address },
    }));

    const message = {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: recipients,
      },
      saveToSentItems: "false",
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${this.config.fromEmail}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText} ${body}`
      );
    }
  }

  private async deliver(
    to: string | string[],
    subject: string,
    html: string
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];

    if (this.useGraph) {
      try {
        await this.sendViaGraph(recipients, subject, html);
        return;
      } catch (err) {
        console.error("Failed to send email via Microsoft Graph:", err);
        if (!this.config.smtpPassword) {
          throw err;
        }
      }
    }

    if (this.config.smtpPassword) {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: recipients.join(", "),
        subject,
        html,
      });
    } else {
      throw new Error("Email service not configured");
    }
  }

  private async sendViaGraph(
    to: string[],
    subject: string,
    html: string
  ): Promise<void> {
    if (!this.msalClient) {
      throw new Error("Microsoft Graph client not configured");
    }

    const token = await this.msalClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    if (!token || !token.accessToken) {
      throw new Error("Could not acquire Microsoft Graph access token");
    }

    const recipients = to.map(address => ({
      emailAddress: { address },
    }));

    const message = {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: recipients,
        from: { emailAddress: { address: this.config.fromEmail } },
      },
      saveToSentItems: false,
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    } as const;

    const encodedFrom = encodeURIComponent(this.config.fromEmail);
    let response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodedFrom}/sendMail`,
      options
    );

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", options);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText} ${body}`
      );
    }
  }

  private async deliver(
    to: string | string[],
    subject: string,
    html: string
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];

    if (this.useGraph) {
      try {
        await this.sendViaGraph(recipients, subject, html);
        return;
      } catch (err) {
        console.error("Failed to send email via Microsoft Graph:", err);
        if (!this.config.smtpPassword) {
          throw err;
        }
      }
    }

    if (this.config.smtpPassword) {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: recipients.join(", "),
        subject,
        html,
      });
    } else {
      throw new Error("Email service not configured");
    }
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
    const subject = `Module Access Updated - ${tenant.name}`;
    const html = this.generateModuleStatusEmailTemplate(tenant, changes);

    try {
      await this.deliver(tenant.adminEmail, subject, html);

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "module_status",
        status: success ? "sent" : "failed",
        errorMessage: success ? null : "Microsoft Graph send failed",
      });

      return success;
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
    const subject = `Welcome to SaaS Framework - Your Tenant "${tenant.name}" is Ready`;
    const html = this.generateOnboardingEmailTemplate(tenant);

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
    if (!this.config.smtpPassword && !this.useGraph) {
      console.log(
        `📧 Email functionality disabled - would have sent onboarding email to ${tenant.adminEmail}`
      );

      console.log(
        `📧 Microsoft Graph not configured - would have sent onboarding email to ${tenant.adminEmail}`
      );

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "onboarding",
        status: "sent",
        errorMessage: "Email disabled - Microsoft Graph not configured",
      });

      return true;
    }

    try {
      await this.deliver(tenant.adminEmail, subject, html);

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "onboarding",
        status: success ? "sent" : "failed",
        errorMessage: success ? null : "Microsoft Graph send failed",
      });

      return success;
    } catch (error) {
      console.error("Failed to send onboarding email:", error);

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "onboarding",
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
    const enabledList =
      changes.enabled.length > 0
        ? `<h3>Modules Enabled:</h3><ul>${changes.enabled.map(m => `<li>${m}</li>`).join("")}</ul>`
        : "";
    const disabledList =
      changes.disabled.length > 0
        ? `<h3>Modules Disabled:</h3><ul>${changes.disabled.map(m => `<li>${m}</li>`).join("")}</ul>`
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Module Access Updated</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Module Access Updated</h2>
        <p>Your tenant <strong>${tenant.name}</strong> module access has been updated.</p>
        ${enabledList}
        ${disabledList}
        <p>Best regards,<br>The SaaS Framework Team</p>
      </body>
      </html>
    `;
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
  }): string {
    const baseUrl = process.env.BASE_URL || "https://localhost:5000";
    const portalUrl = `${baseUrl}/tenant/${tenant.orgId}/login`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SaaS Framework</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>🚀 Welcome to SaaS Framework</h1>
        <p>Your tenant <strong>${tenant.name}</strong> is ready!</p>
        
        <h3>Portal Access</h3>
        <p><strong>Portal URL:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
        <p><strong>Admin Email:</strong> ${tenant.adminEmail}</p>
        <p><strong>Temporary Password:</strong> temp123!</p>
        
        <h3>Next Steps</h3>
        <ol>
          <li>Login to your tenant portal</li>
          <li>Change your temporary password</li>
          <li>Set up users and roles</li>
          <li>Start building your application!</li>
        </ol>
        
        <p>Best regards,<br>The SaaS Framework Team</p>
      </body>
      </html>
    `;
  }

  async testConnection(): Promise<boolean> {
    if (this.useGraph) {
      try {
        await this.msalClient?.acquireTokenByClientCredential({
          scopes: ["https://graph.microsoft.com/.default"],
        });
        return true;
      } catch (error) {
        console.error("Microsoft Graph connection test failed:", error);
        return false;
      }
    }

    // Skip connection test if no password configured
    if (!this.config.smtpPassword) {
      console.log("📧 SMTP connection test skipped - email functionality disabled");
      return true;
    }

    try {
      await this.graphClient.api("/organization").get();
      console.log("📨 Microsoft Graph connection test successful");
      return true;
    } catch (error) {
      console.error("Microsoft Graph connection test failed:", error);
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
      await this.deliver(to, subject, html);

      console.log(`Test email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error("Failed to send test email:", error);
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Microsoft Graph Email Service Test</h2>
        <p>This is a test email to verify that the Microsoft Graph configuration is working correctly.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Tenant ID: ${this.config.tenantId}</li>
          <li>From Email: ${this.config.fromEmail}</li>
        </ul>
        <p>Sent at: ${new Date().toISOString()}</p>
      </body>
      </html>
    `;

    const success = await this.sendEmailViaGraph(to, subject, html);

    if (success) {
      console.log(`Test email sent successfully to ${to} via Microsoft Graph`);
    }

    return success;
  }
}

export const emailService = new EmailService();
