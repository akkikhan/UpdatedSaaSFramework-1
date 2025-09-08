import { Client } from "@microsoft/microsoft-graph-client";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { storage } from "../storage.js";

interface GraphEmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromEmail: string;
}

class EmailService {
  private config: GraphEmailConfig;
  private msalClient: ConfidentialClientApplication | null = null;
  private graphClient: Client | null = null;

  constructor() {
    this.config = {
      tenantId: process.env.AZURE_TENANT_ID || "",
      clientId: process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.AZURE_CLIENT_SECRET || "",
      fromEmail: process.env.EMAIL_FROM || "noreply@yourdomain.com",
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
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
      const success = await this.sendEmailViaGraph(tenant.adminEmail, subject, html);

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

    if (!this.graphClient) {
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
      const success = await this.sendEmailViaGraph(tenant.adminEmail, subject, html);

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
    if (!this.graphClient) {
      console.log("📧 Microsoft Graph connection test skipped - email functionality disabled");
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
    if (!this.graphClient) {
      console.log("📧 Microsoft Graph not configured - cannot send test email");
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
