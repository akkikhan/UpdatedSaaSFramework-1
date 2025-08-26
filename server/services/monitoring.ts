import { db } from '../db';
import { performanceMetrics, alertRules, alertEvents, systemHealth } from '../../shared/schema';
import type { 
  InsertPerformanceMetric, 
  InsertAlertRule, 
  InsertAlertEvent, 
  InsertSystemHealth,
  AlertRule,
  AlertEvent 
} from '../../shared/schema';
import { emailService } from './email';
import { eq, and, gte, desc, avg, count } from 'drizzle-orm';

export class MonitoringService {
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastAlertTimes: Map<string, number> = new Map();

  /**
   * Initialize monitoring service with background jobs
   */
  async initialize() {
    console.log('🔍 Initializing monitoring service...');
    
    // Start alert checking every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlertRules().catch(console.error);
    }, 30000);

    // Start health checks every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(console.error);
    }, 60000);

    // Set up default alert rules
    await this.setupDefaultAlertRules();
    
    console.log('✅ Monitoring service initialized');
  }

  /**
   * Shutdown monitoring service
   */
  shutdown() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('🛑 Monitoring service shut down');
  }

  /**
   * Record performance metric
   */
  async recordMetric(metric: InsertPerformanceMetric) {
    try {
      await db.insert(performanceMetrics).values(metric);
      
      // Check if this metric should trigger any alerts
      await this.checkMetricAlerts(metric);
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Record API response time
   */
  async recordApiResponseTime(
    tenantId: string | null,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ) {
    await this.recordMetric({
      tenantId: tenantId,
      metricType: 'api_response_time',
      metricName: `${method} ${endpoint}`,
      value: responseTime.toString(),
      unit: 'ms',
      labels: {
        endpoint,
        method,
        status_code: statusCode,
        is_error: statusCode >= 400
      },
      aggregationWindow: '1m'
    });
  }

  /**
   * Record error rate
   */
  async recordErrorRate(tenantId: string | null, endpoint: string, errorCount: number, totalCount: number) {
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    
    await this.recordMetric({
      tenantId: tenantId,
      metricType: 'error_rate',
      metricName: endpoint,
      value: errorRate.toString(),
      unit: 'percentage',
      labels: {
        endpoint,
        error_count: errorCount,
        total_count: totalCount
      },
      aggregationWindow: '5m'
    });
  }

  /**
   * Create alert rule
   */
  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [created] = await db.insert(alertRules).values(rule).returning();
    return created;
  }

  /**
   * Get alert rules
   */
  async getAlertRules(tenantId?: string): Promise<AlertRule[]> {
    if (tenantId) {
      return await db.select().from(alertRules)
        .where(and(eq(alertRules.tenantId, tenantId), eq(alertRules.isEnabled, true)));
    } else {
      return await db.select().from(alertRules)
        .where(eq(alertRules.isEnabled, true));
    }
  }

  /**
   * Get alert events
   */
  async getAlertEvents(options: {
    tenantId?: string;
    severity?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AlertEvent[]> {
    let query = db.select().from(alertEvents).orderBy(desc(alertEvents.timestamp));

    if (options.tenantId) {
      query = query.where(eq(alertEvents.tenantId, options.tenantId));
    }

    return await query.limit(options.limit || 50).offset(options.offset || 0);
  }

  /**
   * Record system health status
   */
  async recordHealthCheck(health: InsertSystemHealth) {
    await db.insert(systemHealth).values(health);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(service?: string) {
    if (service) {
      return await db.select().from(systemHealth)
        .where(eq(systemHealth.service, service))
        .orderBy(desc(systemHealth.timestamp))
        .limit(1);
    } else {
      return await db.select().from(systemHealth)
        .orderBy(desc(systemHealth.timestamp))
        .limit(10);
    }
  }

  /**
   * Check metric against alert rules
   */
  private async checkMetricAlerts(metric: InsertPerformanceMetric) {
    const rules = await this.getAlertRules(metric.tenantId || undefined);
    
    for (const rule of rules) {
      if (rule.metricType === metric.metricType) {
        const metricValue = parseFloat(metric.value);
        const threshold = parseFloat(rule.threshold);
        
        let shouldAlert = false;
        switch (rule.condition) {
          case 'greater_than':
            shouldAlert = metricValue > threshold;
            break;
          case 'less_than':
            shouldAlert = metricValue < threshold;
            break;
          case 'equals':
            shouldAlert = metricValue === threshold;
            break;
          case 'not_equals':
            shouldAlert = metricValue !== threshold;
            break;
        }

        if (shouldAlert) {
          await this.triggerAlert(rule, metricValue);
        }
      }
    }
  }

  /**
   * Check all alert rules periodically
   */
  private async checkAlertRules() {
    try {
      const rules = await this.getAlertRules();
      
      for (const rule of rules) {
        // Check if we're in cooldown period
        const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
        const cooldownMs = (rule.cooldownPeriod || 300) * 1000;
        
        if (Date.now() - lastAlertTime < cooldownMs) {
          continue; // Still in cooldown
        }

        // Aggregate metrics for the time window
        const timeWindowMs = this.parseTimeWindow(rule.timeWindow);
        const cutoffTime = new Date(Date.now() - timeWindowMs);
        
        const result = await db.select({
          avg: avg(performanceMetrics.value),
          count: count(performanceMetrics.value)
        })
        .from(performanceMetrics)
        .where(and(
          eq(performanceMetrics.metricType, rule.metricType),
          gte(performanceMetrics.timestamp, cutoffTime),
          rule.tenantId ? eq(performanceMetrics.tenantId, rule.tenantId) : undefined
        ));

        if (result[0] && result[0].avg) {
          const avgValue = parseFloat(result[0].avg);
          const threshold = parseFloat(rule.threshold);
          
          let shouldAlert = false;
          switch (rule.condition) {
            case 'greater_than':
              shouldAlert = avgValue > threshold;
              break;
            case 'less_than':
              shouldAlert = avgValue < threshold;
              break;
          }

          if (shouldAlert) {
            await this.triggerAlert(rule, avgValue);
            this.lastAlertTimes.set(rule.id, Date.now());
          }
        }
      }
    } catch (error) {
      console.error('Error checking alert rules:', error);
    }
  }

  /**
   * Trigger alert and send notifications
   */
  private async triggerAlert(rule: AlertRule, metricValue: number) {
    const message = `Alert: ${rule.name} - ${rule.metricType} is ${metricValue}${rule.threshold ? ` (threshold: ${rule.threshold})` : ''}`;
    
    // Create alert event
    const [alertEvent] = await db.insert(alertEvents).values({
      alertRuleId: rule.id,
      tenantId: rule.tenantId,
      severity: rule.severity,
      message,
      metricValue: metricValue.toString(),
      threshold: rule.threshold,
      details: {
        rule_name: rule.name,
        metric_type: rule.metricType,
        condition: rule.condition
      },
      status: 'active'
    }).returning();

    // Send notifications
    await this.sendAlertNotifications(rule, alertEvent, message);
    
    console.error(`🚨 ALERT: ${message}`);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(rule: AlertRule, alertEvent: AlertEvent, message: string) {
    const notifications = rule.notifications as any || {};
    const notificationsSent: any = {};

    // Email notifications
    if (notifications.email && notifications.email.enabled) {
      try {
        const recipients = notifications.email.recipients || [];
        for (const recipient of recipients) {
          const success = await emailService.sendSimpleTestEmail(
            recipient,
            `🚨 Alert: ${rule.name}`,
            message
          );
          notificationsSent.email = notificationsSent.email || [];
          notificationsSent.email.push({ recipient, success, timestamp: new Date() });
        }
      } catch (error) {
        console.error('Failed to send email alert:', error);
      }
    }

    // Webhook notifications
    if (notifications.webhook && notifications.webhook.enabled) {
      try {
        const webhookUrl = notifications.webhook.url;
        const payload = {
          alert_id: alertEvent.id,
          rule_name: rule.name,
          severity: rule.severity,
          message,
          metric_value: alertEvent.metricValue,
          threshold: alertEvent.threshold,
          timestamp: alertEvent.timestamp
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(notifications.webhook.headers || {})
          },
          body: JSON.stringify(payload)
        });

        notificationsSent.webhook = {
          url: webhookUrl,
          success: response.ok,
          status_code: response.status,
          timestamp: new Date()
        };
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
        notificationsSent.webhook = {
          success: false,
          error: error.message,
          timestamp: new Date()
        };
      }
    }

    // Update alert event with notification status
    await db.update(alertEvents)
      .set({ notificationsSent })
      .where(eq(alertEvents.id, alertEvent.id));
  }

  /**
   * Perform health checks on system components
   */
  private async performHealthChecks() {
    const services = ['database', 'email', 'auth', 'rbac'];
    
    for (const service of services) {
      const startTime = Date.now();
      let status = 'healthy';
      let details: any = {};

      try {
        switch (service) {
          case 'database':
            await db.select().from(systemHealth).limit(1);
            break;
          case 'email':
            const emailHealthy = await emailService.testConnection();
            if (!emailHealthy) {
              status = 'degraded';
              details.error = 'SMTP connection failed';
            }
            break;
          case 'auth':
          case 'rbac':
            // These would check actual service endpoints in a microservice architecture
            break;
        }
      } catch (error) {
        status = 'down';
        details.error = error.message;
      }

      const responseTime = Date.now() - startTime;

      await this.recordHealthCheck({
        service,
        status,
        responseTime,
        details
      });
    }
  }

  /**
   * Set up default alert rules for the platform
   */
  private async setupDefaultAlertRules() {
    const defaultRules: InsertAlertRule[] = [
      {
        tenantId: null, // Platform-wide
        name: 'High API Response Time',
        description: 'Alert when API response time exceeds 2 seconds',
        metricType: 'api_response_time',
        condition: 'greater_than',
        threshold: '2000',
        timeWindow: '5m',
        severity: 'warning',
        notifications: {
          email: {
            enabled: true,
            recipients: ['admin@platform.com']
          }
        }
      },
      {
        tenantId: null,
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        metricType: 'error_rate',
        condition: 'greater_than',
        threshold: '5',
        timeWindow: '5m',
        severity: 'critical',
        notifications: {
          email: {
            enabled: true,
            recipients: ['admin@platform.com']
          }
        }
      }
    ];

    for (const rule of defaultRules) {
      try {
        // Check if rule already exists
        const existing = await db.select()
          .from(alertRules)
          .where(and(
            eq(alertRules.name, rule.name),
            eq(alertRules.tenantId, rule.tenantId)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(alertRules).values(rule);
          console.log(`✅ Created default alert rule: ${rule.name}`);
        }
      } catch (error) {
        console.error(`Failed to create default alert rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseTimeWindow(timeWindow: string): number {
    const value = parseInt(timeWindow.slice(0, -1));
    const unit = timeWindow.slice(-1);
    
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000; // Default 5 minutes
    }
  }

  /**
   * Get performance metrics with aggregation
   */
  async getPerformanceMetrics(options: {
    tenantId?: string;
    metricType?: string;
    startDate?: Date;
    endDate?: Date;
    aggregation?: 'avg' | 'max' | 'min' | 'count';
    limit?: number;
  } = {}) {
    // This would implement aggregation queries for dashboard display
    // For now, return raw metrics
    return await db.select()
      .from(performanceMetrics)
      .where(options.tenantId ? eq(performanceMetrics.tenantId, options.tenantId) : undefined)
      .orderBy(desc(performanceMetrics.timestamp))
      .limit(options.limit || 100);
  }

  /**
   * Export compliance report
   */
  async exportComplianceReport(options: {
    tenantId?: string;
    startDate: Date;
    endDate: Date;
    format?: 'json' | 'csv';
  }) {
    // Get all relevant data for compliance
    const metrics = await this.getPerformanceMetrics({
      tenantId: options.tenantId,
      startDate: options.startDate,
      endDate: options.endDate
    });

    const alerts = await this.getAlertEvents({
      tenantId: options.tenantId
    });

    const health = await this.getSystemHealth();

    return {
      period: {
        start: options.startDate,
        end: options.endDate
      },
      tenant_id: options.tenantId || 'platform-wide',
      metrics: {
        total_requests: metrics.length,
        avg_response_time: metrics
          .filter(m => m.metricType === 'api_response_time')
          .reduce((avg, m, _, arr) => avg + parseFloat(m.value) / arr.length, 0),
        error_count: metrics
          .filter(m => m.metricType === 'error_rate')
          .length
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        resolved: alerts.filter(a => a.status === 'resolved').length
      },
      system_health: health,
      generated_at: new Date()
    };
  }
}

export const monitoringService = new MonitoringService();
