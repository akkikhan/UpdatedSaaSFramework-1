import { config } from "dotenv";
// SMTP functionality is disabled; using Microsoft Graph instead
// import * as nodemailer from "nodemailer";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { storage } from "../storage";

config();

interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromEmail: string;
}

export class EmailService {
  private msalClient?: ConfidentialClientApplication;
  private graphClient?: Client;
  private config: GraphConfig;

  constructor() {
    this.config = {
      tenantId: process.env.GRAPH_TENANT_ID || process.env.AZURE_TENANT_ID || "",
      clientId: process.env.GRAPH_CLIENT_ID || process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.GRAPH_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET || "",
      fromEmail: process.env.EMAIL_FROM || "noreply@yourdomain.com",
    };

    if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
      console.warn(
        "⚠️  Microsoft Graph credentials not configured. Email functionality will be disabled."
      );
      return;
    }

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
        clientSecret: this.config.clientSecret,
      },
    });

    console.log("📨 MSAL client initialized for Microsoft Graph");
    this.initializeGraphClient().catch(err => {
      console.warn("⚠️  Failed to initialize Microsoft Graph client:", err);
    });
  }

  private async initializeGraphClient(): Promise<void> {
    if (!this.msalClient) {
      return;
    }

    try {
      const authResponse = await this.msalClient.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
      });

      if (authResponse?.accessToken) {
        this.graphClient = Client.init({
          authProvider: done => done(null, authResponse.accessToken),
        });
        console.log("📨 Microsoft Graph client initialized successfully");
      }
    } catch (error) {
      console.warn("⚠️  Failed to initialize Microsoft Graph client:", error);
    }
  }

  private async sendViaGraph(to: string[], subject: string, html: string): Promise<void> {
    if (!this.graphClient) {
      throw new Error("Microsoft Graph client not initialized");
    }

    const message = {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: to.map(address => ({ emailAddress: { address } })),
      from: { emailAddress: { address: this.config.fromEmail } },
    };

    try {
      await this.graphClient
        .api(`/users/${this.config.fromEmail}/sendMail`)
        .post({ message });
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
        await this.graphClient.api("/me/sendMail").post({ message });
      } else {
        throw error;
      }
    }
  }

  private async deliver(to: string | string[], subject: string, html: string): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];
    await this.sendViaGraph(recipients, subject, html);
  }

  async sendModuleStatusEmail(
    tenant: { id: string; name: string; adminEmail: string },
    changes: { enabled: string[]; disabled: string[] }
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
    const subject = `Welcome to SaaS Framework - Your Tenant "${tenant.name}" is Ready`;
    const html = this.generateOnboardingEmailTemplate(tenant);

    try {
      await this.deliver(tenant.adminEmail, subject, html);

      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: "onboarding",
        status: "sent",
        errorMessage: null,
      });

      return true;
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
    tenant: { id: string; name: string; adminEmail: string },
    changes: { enabled: string[]; disabled: string[] }
  ): string {
    const enabledList =
      changes.enabled.length > 0
        ? `<h3>Modules Enabled:</h3><ul>${changes.enabled
            .map(m => `<li>${m}</li>`)
            .join("")}</ul>`
        : "";
    const disabledList =
      changes.disabled.length > 0
        ? `<h3>Modules Disabled:</h3><ul>${changes.disabled
            .map(m => `<li>${m}</li>`)
            .join("")}</ul>`
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
    if (!this.msalClient) {
      console.log("📧 Microsoft Graph not configured - skipping connection test");
      return false;
    }

    try {
      await this.msalClient.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
      });
      console.log("📨 Microsoft Graph connection test successful");
      return true;
    } catch (error) {
      console.error("Microsoft Graph connection test failed:", error);
      return false;
    }
  }

  async sendSimpleTestEmail(to: string, subject = "Test Email"): Promise<boolean> {
    try {
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
          <p>Sent at: ${new Date().toISOString()}</p>
        </body>
      </html>
      `;

      await this.deliver(to, subject, html);
      console.log(`Test email sent successfully to ${to} via Microsoft Graph`);
      return true;
    } catch (error) {
      console.error("Failed to send test email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
