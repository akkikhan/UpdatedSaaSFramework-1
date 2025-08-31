import { db } from "../db";
import { tenantNotifications, tenants } from "../../shared/schema";
import type { InsertTenantNotification } from "../../shared/schema";
import { emailService } from "./email";
import { eq } from "drizzle-orm";

export class NotificationService {
  async createNotification(notification: InsertTenantNotification) {
    try {
      const [createdNotification] = await db
        .insert(tenantNotifications)
        .values(notification)
        .returning();

      // Get tenant details for email notification
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, notification.tenantId))
        .limit(1);

      if (tenant[0]) {
        // Send email notification to tenant admin
        await this.sendEmailNotification(tenant[0], notification);
      }

      return createdNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async getNotificationsForTenant(tenantId: string, limit = 10) {
    try {
      return await db
        .select()
        .from(tenantNotifications)
        .where(eq(tenantNotifications.tenantId, tenantId))
        .orderBy(tenantNotifications.createdAt)
        .limit(limit);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const [updated] = await db
        .update(tenantNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(tenantNotifications.id, notificationId))
        .returning();

      return updated;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  private async sendEmailNotification(tenant: any, notification: InsertTenantNotification) {
    try {
      const subject = `Platform Update: ${notification.title}`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .notification { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Platform Notification</h2>
              <p>Updates for ${tenant.name}</p>
            </div>
            <div class="content">
              <div class="notification">
                <h3>${notification.title}</h3>
                <p>${notification.message}</p>
                ${notification.metadata ? `<p><strong>Details:</strong> ${JSON.stringify(notification.metadata, null, 2)}</p>` : ""}
              </div>
              <div class="footer">
                <p>This notification was sent automatically from your SaaS platform.</p>
                <p>Organization ID: ${tenant.orgId}</p>
                <p>If you have questions, please contact platform support.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send via the module status email method which exists
      await emailService.sendModuleStatusEmail(
        {
          id: tenant.id,
          name: tenant.name,
          adminEmail: tenant.adminEmail,
        },
        {
          enabled:
            notification.type === "module_enabled"
              ? [notification.metadata?.module || "unknown"]
              : [],
          disabled:
            notification.type === "module_disabled"
              ? [notification.metadata?.module || "unknown"]
              : [],
        }
      );
    } catch (error) {
      console.error("Error sending email notification:", error);
      // Don't throw here - notification should still be created even if email fails
    }
  }

  // Helper methods for specific notification types
  async notifyModuleStatusChange(
    tenantId: string,
    moduleName: string,
    enabled: boolean,
    adminAction = true
  ) {
    const action = enabled ? "enabled" : "disabled";
    const title = `${moduleName.toUpperCase()} Module ${enabled ? "Enabled" : "Disabled"}`;
    const message = adminAction
      ? `The ${moduleName} authentication module has been ${action} by the platform administrator. This change is effective immediately.`
      : `The ${moduleName} authentication module has been ${action} for your organization.`;

    return this.createNotification({
      tenantId,
      type: enabled ? "module_enabled" : "module_disabled",
      title,
      message,
      metadata: { module: moduleName, enabled, adminAction },
      isRead: false,
    });
  }

  async notifyTenantStatusChange(tenantId: string, newStatus: string, reason?: string) {
    const title = `Tenant Status Changed: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
    const message = `Your tenant status has been updated to "${newStatus}". ${reason ? `Reason: ${reason}` : ""}`;

    return this.createNotification({
      tenantId,
      type: "status_changed",
      title,
      message,
      metadata: { newStatus, reason },
      isRead: false,
    });
  }

  async notifyConfigurationUpdate(tenantId: string, configType: string, changes: any) {
    const title = `Configuration Updated: ${configType}`;
    const message = `Your ${configType} configuration has been updated by the platform administrator.`;

    return this.createNotification({
      tenantId,
      type: "config_updated",
      title,
      message,
      metadata: { configType, changes },
      isRead: false,
    });
  }
}

export const notificationService = new NotificationService();
