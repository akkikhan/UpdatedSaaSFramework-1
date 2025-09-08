import { config } from "dotenv";
// SMTP and Microsoft Graph implementations are commented out in favor of Gmail
// import { ConfidentialClientApplication } from "@azure/msal-node";
// import { Client } from "@microsoft/microsoft-graph-client";
import * as nodemailer from "nodemailer";
import { storage } from "../storage";

config();

interface GmailConfig {
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: GmailConfig;

  constructor() {
    this.config = {
      user: process.env.GMAIL_USER || "",
      pass: process.env.GMAIL_APP_PASSWORD || "",
      fromEmail: process.env.FROM_EMAIL || process.env.GMAIL_USER || "",
      fromName: process.env.FROM_NAME || "SaaS Framework Platform",
    };

    if (!this.config.user || !this.config.pass) {
      console.warn(
        "⚠️  Gmail credentials not configured. Email functionality will be disabled."
      );
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    void this.transporter
      .verify()
      .then(() => {
        console.log(`📨 Gmail transporter initialized for ${this.config.user}`);
      })
      .catch(err => {
        console.warn("⚠️  Failed to verify Gmail transporter:", err);
      });
  }

  private async deliver(
    to: string | string[],
    subject: string,
    html: string
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];
    await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
      to: recipients.join(", "),
      subject,
      html,
    });
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
        errorMessage: error instanceof Error ? error.message : String(error),
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
    try {
      await this.transporter.verify();
      console.log("📨 Gmail connection test successful");
      return true;
    } catch (error) {
      console.error("Gmail connection test failed:", error);
      return false;
    }
  }

  async sendSimpleTestEmail(
    to: string,
    subject = "Test Email"
  ): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Gmail Email Service Test</h2>
            <p>This is a test email to verify that the Gmail configuration is working correctly.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </body>
        </html>
        `;
      await this.deliver(to, subject, html);
      console.log(`Test email sent successfully to ${to} via Gmail`);
      return true;
    } catch (error) {
      console.error("Failed to send test email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
