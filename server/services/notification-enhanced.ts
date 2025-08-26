import { db } from '../db';
import {
  tenantNotifications,
  userNotificationPreferences,
  notificationDeliveries,
  notificationTemplates,
  smsConfigs,
  pushConfigs,
  webhookConfigs,
  deviceTokens,
  tenantUsers,
  tenants
} from '../../shared/schema';
import type {
  InsertTenantNotification,
  TenantNotification,
  InsertNotificationDelivery,
  UserNotificationPreference,
  NotificationTemplate,
  SmsConfig,
  PushConfig,
  WebhookConfig,
  DeviceToken
} from '../../shared/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { emailService } from './email';
import axios from 'axios';
import crypto from 'crypto';
import Handlebars from 'handlebars';

// Import notification providers
const twilio = require('twilio');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const admin = require('firebase-admin');
const webpush = require('web-push');

export interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  webhook?: boolean;
  in_app?: boolean;
}

export interface NotificationOptions {
  channels?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  category?: string;
  templateId?: string;
  variables?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  tags?: string[];
  userId?: string; // Specific user or null for tenant-wide
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format
  end: string;   // HH:MM format
  timezone: string;
}

export class EnhancedNotificationService {
  private smsClients: Map<string, any> = new Map();
  private pushClients: Map<string, any> = new Map();

  constructor() {
    console.log('📧 Enhanced Notification Service initialized');
  }

  /**
   * Create and send a notification across multiple channels
   */
  async createNotification(
    tenantId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      metadata?: any;
    },
    options: NotificationOptions = {}
  ): Promise<TenantNotification> {
    try {
      // Create notification record
      const notification: InsertTenantNotification = {
        tenantId,
        userId: options.userId || null,
        type: notificationData.type,
        category: options.category || 'general',
        priority: options.priority || 'medium',
        title: notificationData.title,
        message: notificationData.message,
        channels: options.channels || ['email', 'in_app'],
        metadata: notificationData.metadata || {},
        actionUrl: options.actionUrl || null,
        actionLabel: options.actionLabel || null,
        expiresAt: options.expiresAt || null,
        tags: options.tags || null
      };

      const [createdNotification] = await db
        .insert(tenantNotifications)
        .values(notification)
        .returning();

      // Send notification across specified channels
      await this.sendNotificationToChannels(createdNotification, options);

      return createdNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to all specified channels
   */
  private async sendNotificationToChannels(
    notification: TenantNotification,
    options: NotificationOptions
  ) {
    const channels = notification.channels;
    
    // Get recipients based on user preferences
    const recipients = await this.getNotificationRecipients(
      notification.tenantId,
      notification.userId,
      notification.category,
      channels
    );

    // Send to each channel
    for (const channel of channels) {
      const channelRecipients = recipients.filter(r => r.channels[channel]);
      
      if (channelRecipients.length === 0) continue;

      switch (channel) {
        case 'email':
          await this.sendEmailNotifications(notification, channelRecipients, options);
          break;
        case 'sms':
          await this.sendSMSNotifications(notification, channelRecipients, options);
          break;
        case 'push':
          await this.sendPushNotifications(notification, channelRecipients, options);
          break;
        case 'webhook':
          await this.sendWebhookNotifications(notification, options);
          break;
        case 'in_app':
          // In-app notifications are handled by the database record itself
          break;
      }
    }
  }

  /**
   * Get notification recipients based on preferences and quiet hours
   */
  private async getNotificationRecipients(
    tenantId: string,
    userId: string | null,
    category: string,
    channels: string[]
  ) {
    let query = db.select({
      userId: tenantUsers.id,
      email: tenantUsers.email,
      phone: tenantUsers.phone,
      channels: userNotificationPreferences.channels,
      quietHours: userNotificationPreferences.quietHours,
      frequency: userNotificationPreferences.frequency,
      isEnabled: userNotificationPreferences.isEnabled
    })
    .from(tenantUsers)
    .leftJoin(
      userNotificationPreferences,
      and(
        eq(userNotificationPreferences.userId, tenantUsers.id),
        eq(userNotificationPreferences.category, category)
      )
    )
    .where(eq(tenantUsers.tenantId, tenantId));

    // If specific user, filter to that user
    if (userId) {
      query = query.where(eq(tenantUsers.id, userId));
    }

    const users = await query;

    // Filter based on quiet hours and preferences
    return users.filter(user => {
      if (!user.isEnabled) return false;

      // Check quiet hours
      if (user.quietHours?.enabled) {
        const now = new Date();
        const timezone = user.quietHours.timezone || 'UTC';
        const currentTime = now.toLocaleTimeString('en-US', { 
          timeZone: timezone, 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const start = user.quietHours.start;
        const end = user.quietHours.end;

        if (this.isInQuietHours(currentTime, start, end)) {
          return false;
        }
      }

      return true;
    }).map(user => ({
      ...user,
      channels: user.channels || {
        email: true,
        sms: false,
        push: false,
        webhook: false,
        in_app: true
      }
    }));
  }

  /**
   * Send email notifications
   */
  private async sendEmailNotifications(
    notification: TenantNotification,
    recipients: any[],
    options: NotificationOptions
  ) {
    for (const recipient of recipients) {
      try {
        let subject = notification.title;
        let htmlContent = notification.message;

        // Use template if specified
        if (options.templateId) {
          const template = await this.getTemplate(notification.tenantId, options.templateId, 'email');
          if (template) {
            const compiled = Handlebars.compile(template.bodyTemplate);
            htmlContent = compiled({
              ...options.variables,
              notification,
              recipient,
              actionUrl: notification.actionUrl,
              actionLabel: notification.actionLabel
            });

            if (template.subject) {
              const subjectCompiled = Handlebars.compile(template.subject);
              subject = subjectCompiled({ ...options.variables, notification, recipient });
            }
          }
        }

        // Create delivery record
        const [delivery] = await db.insert(notificationDeliveries).values({
          notificationId: notification.id,
          channel: 'email',
          recipient: recipient.email,
          status: 'pending'
        }).returning();

        // Send email using existing email service
        await emailService.sendEmail(
          recipient.email,
          subject,
          htmlContent
        );

        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: 'sent',
            sentAt: new Date()
          })
          .where(eq(notificationDeliveries.id, delivery.id));

      } catch (error) {
        console.error(`Email delivery failed for ${recipient.email}:`, error);
        
        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: 'failed',
            errorMessage: error.message,
            attemptCount: sql`${notificationDeliveries.attemptCount} + 1`
          })
          .where(
            and(
              eq(notificationDeliveries.notificationId, notification.id),
              eq(notificationDeliveries.recipient, recipient.email),
              eq(notificationDeliveries.channel, 'email')
            )
          );
      }
    }
  }

  /**
   * Send SMS notifications
   */
  private async sendSMSNotifications(
    notification: TenantNotification,
    recipients: any[],
    options: NotificationOptions
  ) {
    // Get SMS configuration for tenant
    const smsConfig = await db.select()
      .from(smsConfigs)
      .where(and(
        eq(smsConfigs.tenantId, notification.tenantId),
        eq(smsConfigs.isActive, true)
      ))
      .limit(1);

    if (smsConfig.length === 0) {
      console.warn(`No SMS configuration found for tenant ${notification.tenantId}`);
      return;
    }

    const config = smsConfig[0];
    const client = await this.getSMSClient(config);

    for (const recipient of recipients) {
      if (!recipient.phone) continue;

      try {
        let message = notification.message;

        // Use template if specified
        if (options.templateId) {
          const template = await this.getTemplate(notification.tenantId, options.templateId, 'sms');
          if (template) {
            const compiled = Handlebars.compile(template.bodyTemplate);
            message = compiled({
              ...options.variables,
              notification,
              recipient,
              actionUrl: notification.actionUrl
            });
          }
        }

        // Create delivery record
        const [delivery] = await db.insert(notificationDeliveries).values({
          notificationId: notification.id,
          channel: 'sms',
          recipient: recipient.phone,
          status: 'pending'
        }).returning();

        let providerId: string | undefined;

        // Send SMS based on provider
        switch (config.provider) {
          case 'twilio':
            const twilioResult = await client.messages.create({
              body: message,
              from: config.config.phoneNumber,
              to: recipient.phone
            });
            providerId = twilioResult.sid;
            break;

          case 'aws_sns':
            const snsResult = await client.send(new PublishCommand({
              Message: message,
              PhoneNumber: recipient.phone
            }));
            providerId = snsResult.MessageId;
            break;

          default:
            throw new Error(`Unsupported SMS provider: ${config.provider}`);
        }

        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: 'sent',
            sentAt: new Date(),
            providerId
          })
          .where(eq(notificationDeliveries.id, delivery.id));

      } catch (error) {
        console.error(`SMS delivery failed for ${recipient.phone}:`, error);
        
        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: 'failed',
            errorMessage: error.message,
            attemptCount: sql`${notificationDeliveries.attemptCount} + 1`
          })
          .where(
            and(
              eq(notificationDeliveries.notificationId, notification.id),
              eq(notificationDeliveries.recipient, recipient.phone),
              eq(notificationDeliveries.channel, 'sms')
            )
          );
      }
    }
  }

  /**
   * Send push notifications
   */
  private async sendPushNotifications(
    notification: TenantNotification,
    recipients: any[],
    options: NotificationOptions
  ) {
    // Get push configuration for tenant
    const pushConfigs = await db.select()
      .from(pushConfigs)
      .where(and(
        eq(pushConfigs.tenantId, notification.tenantId),
        eq(pushConfigs.isActive, true)
      ));

    if (pushConfigs.length === 0) {
      console.warn(`No push configuration found for tenant ${notification.tenantId}`);
      return;
    }

    for (const recipient of recipients) {
      // Get device tokens for user
      const tokens = await db.select()
        .from(deviceTokens)
        .where(and(
          eq(deviceTokens.userId, recipient.userId),
          eq(deviceTokens.isActive, true)
        ));

      for (const deviceToken of tokens) {
        try {
          let title = notification.title;
          let body = notification.message;

          // Use template if specified
          if (options.templateId) {
            const template = await this.getTemplate(notification.tenantId, options.templateId, 'push');
            if (template) {
              const bodyCompiled = Handlebars.compile(template.bodyTemplate);
              body = bodyCompiled({
                ...options.variables,
                notification,
                recipient
              });

              if (template.subject) {
                const titleCompiled = Handlebars.compile(template.subject);
                title = titleCompiled({ ...options.variables, notification, recipient });
              }
            }
          }

          // Create delivery record
          const [delivery] = await db.insert(notificationDeliveries).values({
            notificationId: notification.id,
            channel: 'push',
            recipient: deviceToken.token,
            status: 'pending'
          }).returning();

          // Find appropriate push config for platform
          const config = pushConfigs.find(c => c.platform === deviceToken.platform);
          if (!config) continue;

          let providerId: string | undefined;

          // Send push notification based on platform
          switch (config.provider) {
            case 'firebase':
              const firebaseClient = await this.getFirebaseClient(config);
              const firebaseResult = await firebaseClient.messaging().send({
                token: deviceToken.token,
                notification: { title, body },
                data: {
                  notificationId: notification.id,
                  actionUrl: notification.actionUrl || '',
                  category: notification.category
                }
              });
              providerId = firebaseResult;
              break;

            case 'pusher':
              // Web push implementation
              const payload = JSON.stringify({
                title,
                body,
                data: {
                  notificationId: notification.id,
                  actionUrl: notification.actionUrl || '',
                  category: notification.category
                }
              });
              
              await webpush.sendNotification(
                JSON.parse(deviceToken.token), // subscription object
                payload,
                {
                  vapidDetails: {
                    subject: config.config.vapidSubject,
                    publicKey: config.config.vapidPublicKey,
                    privateKey: config.config.vapidPrivateKey
                  }
                }
              );
              break;

            default:
              throw new Error(`Unsupported push provider: ${config.provider}`);
          }

          // Update delivery status
          await db.update(notificationDeliveries)
            .set({ 
              status: 'sent',
              sentAt: new Date(),
              providerId
            })
            .where(eq(notificationDeliveries.id, delivery.id));

        } catch (error) {
          console.error(`Push delivery failed for device ${deviceToken.token}:`, error);
          
          // Update delivery status
          await db.update(notificationDeliveries)
            .set({ 
              status: 'failed',
              errorMessage: error.message,
              attemptCount: sql`${notificationDeliveries.attemptCount} + 1`
            })
            .where(
              and(
                eq(notificationDeliveries.notificationId, notification.id),
                eq(notificationDeliveries.recipient, deviceToken.token),
                eq(notificationDeliveries.channel, 'push')
              )
            );
        }
      }
    }
  }

  /**
   * Send webhook notifications
   */
  private async sendWebhookNotifications(
    notification: TenantNotification,
    options: NotificationOptions
  ) {
    // Get webhook configurations for tenant
    const webhooks = await db.select()
      .from(webhookConfigs)
      .where(and(
        eq(webhookConfigs.tenantId, notification.tenantId),
        eq(webhookConfigs.isActive, true)
      ));

    for (const webhook of webhooks) {
      // Check if this webhook should receive this notification type
      if (!webhook.events.includes(notification.type)) continue;

      try {
        // Create delivery record
        const [delivery] = await db.insert(notificationDeliveries).values({
          notificationId: notification.id,
          channel: 'webhook',
          recipient: webhook.url,
          status: 'pending'
        }).returning();

        // Prepare webhook payload
        const payload = {
          id: notification.id,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
          tenantId: notification.tenantId,
          userId: notification.userId,
          timestamp: notification.createdAt
        };

        const payloadString = JSON.stringify(payload);
        
        // Create HMAC signature if secret is configured
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'SaaS-Platform-Webhook/1.0',
          ...webhook.headers
        };

        if (webhook.secret) {
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(payloadString)
            .digest('hex');
          headers['X-Signature-256'] = `sha256=${signature}`;
        }

        // Send webhook
        const response = await axios.post(webhook.url, payload, {
          headers,
          timeout: webhook.timeout * 1000,
          validateStatus: () => true // Don't throw on HTTP errors
        });

        const isSuccess = response.status >= 200 && response.status < 300;

        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: isSuccess ? 'sent' : 'failed',
            sentAt: new Date(),
            errorMessage: isSuccess ? null : `HTTP ${response.status}: ${response.statusText}`,
            metadata: { 
              statusCode: response.status,
              headers: response.headers
            }
          })
          .where(eq(notificationDeliveries.id, delivery.id));

      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.url}:`, error);
        
        // Update delivery status
        await db.update(notificationDeliveries)
          .set({ 
            status: 'failed',
            errorMessage: error.message,
            attemptCount: sql`${notificationDeliveries.attemptCount} + 1`
          })
          .where(
            and(
              eq(notificationDeliveries.notificationId, notification.id),
              eq(notificationDeliveries.recipient, webhook.url),
              eq(notificationDeliveries.channel, 'webhook')
            )
          );
      }
    }
  }

  /**
   * Get notification template
   */
  private async getTemplate(
    tenantId: string,
    templateId: string,
    channel: string
  ): Promise<NotificationTemplate | null> {
    const templates = await db.select()
      .from(notificationTemplates)
      .where(and(
        eq(notificationTemplates.id, templateId),
        eq(notificationTemplates.channel, channel),
        eq(notificationTemplates.isActive, true)
      ))
      .limit(1);

    return templates[0] || null;
  }

  /**
   * Get SMS client for provider
   */
  private async getSMSClient(config: SmsConfig) {
    const key = `${config.tenantId}-${config.provider}`;
    
    if (this.smsClients.has(key)) {
      return this.smsClients.get(key);
    }

    let client;
    switch (config.provider) {
      case 'twilio':
        client = twilio(config.config.accountSid, config.config.authToken);
        break;
      case 'aws_sns':
        client = new SNSClient({
          region: config.config.region,
          credentials: {
            accessKeyId: config.config.accessKeyId,
            secretAccessKey: config.config.secretAccessKey
          }
        });
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }

    this.smsClients.set(key, client);
    return client;
  }

  /**
   * Get Firebase client for push notifications
   */
  private async getFirebaseClient(config: PushConfig) {
    const key = `${config.tenantId}-firebase`;
    
    if (this.pushClients.has(key)) {
      return this.pushClients.get(key);
    }

    const client = admin.initializeApp({
      credential: admin.credential.cert(config.config.serviceAccount),
      projectId: config.config.projectId
    }, key);

    this.pushClients.set(key, client);
    return client;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(currentTime: string, start: string, end: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const startMin = this.timeToMinutes(start);
    const endMin = this.timeToMinutes(end);

    if (startMin <= endMin) {
      // Same day: 22:00 to 08:00 next day
      return current >= startMin && current <= endMin;
    } else {
      // Crosses midnight: 22:00 to 08:00
      return current >= startMin || current <= endMin;
    }
  }

  /**
   * Convert HH:MM time to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string, tenantId: string) {
    const preferences = await db.select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId)
      ));

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    tenantId: string,
    category: string,
    preferences: {
      channels?: any;
      quietHours?: QuietHours;
      frequency?: string;
      isEnabled?: boolean;
    }
  ) {
    const existing = await db.select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.category, category)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing preferences
      const [updated] = await db.update(userNotificationPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(userNotificationPreferences.id, existing[0].id))
        .returning();

      return updated;
    } else {
      // Create new preferences
      const [created] = await db.insert(userNotificationPreferences)
        .values({
          userId,
          tenantId,
          category,
          ...preferences
        })
        .returning();

      return created;
    }
  }

  /**
   * Get notification delivery status
   */
  async getDeliveryStatus(notificationId: string) {
    const deliveries = await db.select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationId, notificationId))
      .orderBy(desc(notificationDeliveries.createdAt));

    return deliveries;
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(notificationId: string, channel?: string) {
    let query = db.select()
      .from(notificationDeliveries)
      .where(and(
        eq(notificationDeliveries.notificationId, notificationId),
        eq(notificationDeliveries.status, 'failed')
      ));

    if (channel) {
      query = query.where(eq(notificationDeliveries.channel, channel));
    }

    const failedDeliveries = await query;

    for (const delivery of failedDeliveries) {
      // Reset delivery status for retry
      await db.update(notificationDeliveries)
        .set({ 
          status: 'pending',
          errorMessage: null,
          attemptCount: sql`${notificationDeliveries.attemptCount} + 1`
        })
        .where(eq(notificationDeliveries.id, delivery.id));
    }

    // Get the original notification and resend
    const notification = await db.select()
      .from(tenantNotifications)
      .where(eq(tenantNotifications.id, notificationId))
      .limit(1);

    if (notification[0]) {
      await this.sendNotificationToChannels(notification[0], {});
    }
  }
}

export const enhancedNotificationService = new EnhancedNotificationService();
