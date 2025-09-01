import * as nodemailer from "nodemailer";

export interface SaaSEmailConfig {
  apiKey: string;
  baseUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  priority?: "high" | "normal" | "low";
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: "notification" | "alert" | "marketing" | "system";
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface EmailStatus {
  messageId: string;
  status: "sent" | "delivered" | "failed" | "bounced";
  timestamp: Date;
  error?: string;
}

export interface CriticalAlert {
  type: "security" | "system" | "business" | "performance";
  level: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, any>;
  recipients: string[];
}

/**
 * SaaS Email SDK - Enterprise email notifications and alerts
 *
 * Features:
 * - SMTP integration with major providers
 * - Template system with variable substitution
 * - Critical alert notifications
 * - Email tracking and status monitoring
 * - Multi-tenant email isolation
 */
export class SaaSEmail {
  private config: SaaSEmailConfig;
  private transporter?: nodemailer.Transporter;

  constructor(config: SaaSEmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter based on configuration
   */
  private initializeTransporter(): void {
    if (this.config.smtpHost && this.config.smtpUsername && this.config.smtpPassword) {
      // Direct SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.config.smtpUsername,
          pass: this.config.smtpPassword,
        },
      });
    }
  }

  /**
   * Send a basic email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (this.transporter) {
        // Direct SMTP send
        const mailOptions = {
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments,
          priority: options.priority || "normal",
          replyTo: options.replyTo,
        };

        const result = await this.transporter.sendMail(mailOptions);

        return {
          success: true,
          messageId: result.messageId,
          timestamp: new Date(),
        };
      } else {
        // API-based send
        const response = await fetch(`${this.config.baseUrl}/api/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          throw new Error(`Email API error: ${response.statusText}`);
        }

        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send email using a template
   */
  async sendTemplate(
    templateId: string,
    data: Record<string, any>,
    recipients: string[]
  ): Promise<EmailResult> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/email/templates/${templateId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            data,
            recipients,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Template email error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send critical alert notification
   */
  async sendCriticalAlert(alert: CriticalAlert): Promise<EmailResult> {
    const subject = `🚨 ${alert.level.toUpperCase()}: ${alert.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${this.getAlertColor(alert.level)}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Critical Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${alert.title}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
          <p><strong>Alert Type:</strong> ${alert.type}</p>
          <p><strong>Severity Level:</strong> ${alert.level}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid ${this.getAlertColor(alert.level)};">
            ${alert.message}
          </div>
          ${
            alert.metadata
              ? `
            <p><strong>Additional Details:</strong></p>
            <pre style="background: white; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(alert.metadata, null, 2)}
            </pre>
          `
              : ""
          }
        </div>
      </div>
    `;

    return this.sendEmail({
      to: alert.recipients,
      subject,
      html,
      priority: alert.level === "critical" ? "high" : "normal",
    });
  }

  /**
   * Get email status by message ID
   */
  async getEmailStatus(messageId: string): Promise<EmailStatus | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/email/status/${messageId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Status check error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error checking email status:", error);
      return null;
    }
  }

  /**
   * Get available email templates
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/email/templates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Templates fetch error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  }

  /**
   * Create a new email template
   */
  async createEmailTemplate(template: Omit<EmailTemplate, "id">): Promise<EmailTemplate> {
    const response = await fetch(`${this.config.baseUrl}/api/email/templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      throw new Error(`Template creation error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update an existing email template
   */
  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await fetch(`${this.config.baseUrl}/api/email/templates/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Template update error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<{ success: boolean; message: string }> {
    if (this.transporter) {
      try {
        await this.transporter.verify();
        return { success: true, message: "SMTP configuration valid" };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "SMTP verification failed",
        };
      }
    } else {
      try {
        const response = await fetch(`${this.config.baseUrl}/api/email/test`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        });

        if (response.ok) {
          return { success: true, message: "API configuration valid" };
        } else {
          return { success: false, message: "API configuration invalid" };
        }
      } catch (error) {
        return {
          success: false,
          message: "Unable to connect to email API",
        };
      }
    }
  }

  /**
   * Get alert color based on level
   */
  private getAlertColor(level: string): string {
    switch (level) {
      case "critical":
        return "#dc3545"; // Red
      case "high":
        return "#fd7e14"; // Orange
      case "medium":
        return "#ffc107"; // Yellow
      case "low":
        return "#6c757d"; // Gray
      default:
        return "#17a2b8"; // Blue
    }
  }
}

// Export default instance creator
export default SaaSEmail;
