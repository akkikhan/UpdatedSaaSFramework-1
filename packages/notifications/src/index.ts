import axios, { AxiosInstance } from 'axios';

export interface NotificationConfig {
  apiKey: string;
  baseUrl: string;
  tenantId?: string;
}

export interface EmailNotification {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }[];
}

export interface SMSNotification {
  to: string | string[];
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface PushNotification {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: { [key: string]: any };
  badge?: number;
  sound?: string;
  category?: string;
}

export interface WebhookNotification {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: { [key: string]: string };
  data: any;
  authentication?: {
    type: 'bearer' | 'basic' | 'hmac';
    token?: string;
    username?: string;
    password?: string;
    secret?: string;
  };
}

export interface NotificationTemplate {
  id?: string;
  name: string;
  description?: string;
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  emailTemplate?: {
    subject: string;
    html: string;
    text?: string;
  };
  smsTemplate?: {
    message: string;
  };
  pushTemplate?: {
    title: string;
    body: string;
  };
  webhookTemplate?: {
    url: string;
    data: any;
  };
  variables?: string[];
}

export interface BulkNotification {
  template: string;
  recipients: {
    channels: ('email' | 'sms' | 'push' | 'webhook')[];
    email?: string;
    phone?: string;
    deviceToken?: string;
    webhookUrl?: string;
    data: { [key: string]: any };
  }[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface NotificationStatus {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  channel: string;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  attempts: number;
  nextRetryAt?: Date;
}

export interface NotificationPreference {
  userId: string;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  webhook?: boolean;
  quietHours?: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string;   // "08:00"
    timezone: string;
  };
  frequency?: {
    maxEmailsPerHour?: number;
    maxSMSPerDay?: number;
    digestMode?: boolean;
  };
}

/**
 * SaaS Framework Notifications SDK
 * Multi-channel notification system with templates, preferences, and delivery tracking
 */
export class SaaSNotifications {
  private client: AxiosInstance;
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        ...(config.tenantId && { 'X-Tenant-ID': config.tenantId })
      },
    });
  }

  // ============ DIRECT NOTIFICATIONS ============

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/notifications/email', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email notification');
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification: SMSNotification): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/notifications/sms', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error('Failed to send SMS notification');
    }
  }

  /**
   * Send push notification
   */
  async sendPush(notification: PushNotification): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/notifications/push', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(notification: WebhookNotification): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/notifications/webhook', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      throw new Error('Failed to send webhook notification');
    }
  }

  /**
   * Send multi-channel notification
   */
  async sendMultiChannel(notification: {
    channels: ('email' | 'sms' | 'push' | 'webhook')[];
    recipients: string[];
    data: {
      email?: Omit<EmailNotification, 'to'>;
      sms?: Omit<SMSNotification, 'to'>;
      push?: Omit<PushNotification, 'deviceTokens'>;
      webhook?: Omit<WebhookNotification, 'url'>;
    };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<{ ids: string[] }> {
    try {
      const response = await this.client.post('/notifications/multi-channel', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send multi-channel notification:', error);
      throw new Error('Failed to send multi-channel notification');
    }
  }

  // ============ TEMPLATE MANAGEMENT ============

  /**
   * Create notification template
   */
  async createTemplate(template: NotificationTemplate): Promise<NotificationTemplate> {
    try {
      const response = await this.client.post('/notifications/templates', {
        ...template,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error('Failed to create notification template');
    }
  }

  /**
   * Update notification template
   */
  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const response = await this.client.put(`/notifications/templates/${templateId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update template:', error);
      throw new Error('Failed to update notification template');
    }
  }

  /**
   * Delete notification template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.client.delete(`/notifications/templates/${templateId}`);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw new Error('Failed to delete notification template');
    }
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    try {
      const response = await this.client.get('/notifications/templates');
      return response.data;
    } catch (error) {
      console.error('Failed to get templates:', error);
      throw new Error('Failed to get notification templates');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<NotificationTemplate> {
    try {
      const response = await this.client.get(`/notifications/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get template:', error);
      throw new Error('Failed to get notification template');
    }
  }

  /**
   * Send notification using template
   */
  async sendFromTemplate(request: {
    templateId: string;
    recipients: string[];
    channels?: ('email' | 'sms' | 'push' | 'webhook')[];
    data: { [key: string]: any };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    scheduledAt?: Date;
  }): Promise<{ ids: string[] }> {
    try {
      const response = await this.client.post('/notifications/send-template', {
        ...request,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send template notification:', error);
      throw new Error('Failed to send template notification');
    }
  }

  // ============ BULK NOTIFICATIONS ============

  /**
   * Send bulk notifications
   */
  async sendBulk(notification: BulkNotification): Promise<{ batchId: string; ids: string[] }> {
    try {
      const response = await this.client.post('/notifications/bulk', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send bulk notification:', error);
      throw new Error('Failed to send bulk notification');
    }
  }

  /**
   * Get bulk notification status
   */
  async getBulkStatus(batchId: string): Promise<{
    batchId: string;
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    completedAt?: Date;
  }> {
    try {
      const response = await this.client.get(`/notifications/bulk/${batchId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get bulk status:', error);
      throw new Error('Failed to get bulk notification status');
    }
  }

  // ============ DELIVERY TRACKING ============

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string): Promise<NotificationStatus> {
    try {
      const response = await this.client.get(`/notifications/${notificationId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get notification status:', error);
      throw new Error('Failed to get notification status');
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(options?: {
    startDate?: Date;
    endDate?: Date;
    channel?: string;
    template?: string;
  }): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    deliveryRate: number;
    failureRate: number;
    byChannel: { [channel: string]: { sent: number; delivered: number; failed: number } };
  }> {
    try {
      const response = await this.client.get('/notifications/stats', {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get delivery stats:', error);
      throw new Error('Failed to get delivery statistics');
    }
  }

  // ============ USER PREFERENCES ============

  /**
   * Set user notification preferences
   */
  async setUserPreferences(userId: string, preferences: Omit<NotificationPreference, 'userId'>): Promise<void> {
    try {
      await this.client.put(`/notifications/preferences/${userId}`, {
        ...preferences,
        tenantId: this.config.tenantId
      });
    } catch (error) {
      console.error('Failed to set preferences:', error);
      throw new Error('Failed to set user preferences');
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    try {
      const response = await this.client.get(`/notifications/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      throw new Error('Failed to get user preferences');
    }
  }

  /**
   * Check if user can receive notification
   */
  async canSendToUser(userId: string, channel: 'email' | 'sms' | 'push' | 'webhook'): Promise<boolean> {
    try {
      const response = await this.client.get(`/notifications/preferences/${userId}/can-send`, {
        params: { channel }
      });
      return response.data.canSend;
    } catch (error) {
      console.error('Failed to check send permission:', error);
      return false;
    }
  }

  // ============ SCHEDULED NOTIFICATIONS ============

  /**
   * Schedule notification for later delivery
   */
  async scheduleNotification(notification: {
    type: 'email' | 'sms' | 'push' | 'webhook' | 'template';
    data: any;
    scheduledAt: Date;
    timezone?: string;
  }): Promise<{ scheduleId: string }> {
    try {
      const response = await this.client.post('/notifications/schedule', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw new Error('Failed to schedule notification');
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(scheduleId: string): Promise<void> {
    try {
      await this.client.delete(`/notifications/schedule/${scheduleId}`);
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
      throw new Error('Failed to cancel scheduled notification');
    }
  }

  /**
   * Get scheduled notifications
   */
  async getScheduledNotifications(): Promise<any[]> {
    try {
      const response = await this.client.get('/notifications/schedule');
      return response.data;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      throw new Error('Failed to get scheduled notifications');
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Validate email template
   */
  async validateTemplate(template: NotificationTemplate): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await this.client.post('/notifications/templates/validate', template);
      return response.data;
    } catch (error) {
      console.error('Failed to validate template:', error);
      throw new Error('Failed to validate template');
    }
  }

  /**
   * Test notification delivery
   */
  async testNotification(notification: {
    type: 'email' | 'sms' | 'push' | 'webhook';
    recipient: string;
    data: any;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/notifications/test', {
        ...notification,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to test notification:', error);
      throw new Error('Failed to test notification');
    }
  }
}

export default SaaSNotifications;
