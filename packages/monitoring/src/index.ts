import axios, { AxiosInstance } from 'axios';

export interface MonitoringConfig {
  apiKey: string;
  baseUrl: string;
  tenantId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp?: Date;
  tags?: { [key: string]: string };
  unit?: string;
}

export interface AlertRule {
  id?: string;
  name: string;
  condition: string;
  timeWindow?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
  enabled?: boolean;
  description?: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  triggeredAt: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  message?: string;
  lastChecked: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheck[];
  metrics: {
    uptime: string;
    activeUsers: number;
    responseTime: number;
    errorRate: number;
  };
}

/**
 * SaaS Framework Monitoring SDK
 * Provides comprehensive monitoring, alerting, and health check capabilities
 */
export class SaaSMonitoring {
  private client: AxiosInstance;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
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

  // ============ METRICS MANAGEMENT ============

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await this.client.post('/metrics', {
        ...metric,
        timestamp: metric.timestamp || new Date(),
        tenantId: this.config.tenantId
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
      throw new Error('Failed to record metric');
    }
  }

  /**
   * Record multiple metrics at once
   */
  async recordMetrics(metrics: PerformanceMetric[]): Promise<void> {
    try {
      await this.client.post('/metrics/bulk', {
        metrics: metrics.map(metric => ({
          ...metric,
          timestamp: metric.timestamp || new Date(),
          tenantId: this.config.tenantId
        }))
      });
    } catch (error) {
      console.error('Failed to record metrics:', error);
      throw new Error('Failed to record metrics');
    }
  }

  /**
   * Get metrics for a specific time range
   */
  async getMetrics(options: {
    startTime: Date;
    endTime: Date;
    metricNames?: string[];
    tags?: { [key: string]: string };
  }): Promise<PerformanceMetric[]> {
    try {
      const response = await this.client.get('/metrics', {
        params: {
          startTime: options.startTime.toISOString(),
          endTime: options.endTime.toISOString(),
          ...(options.metricNames && { metricNames: options.metricNames.join(',') }),
          ...(options.tags && { tags: JSON.stringify(options.tags) })
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw new Error('Failed to get metrics');
    }
  }

  /**
   * Get aggregated metrics (avg, sum, min, max)
   */
  async getAggregatedMetrics(options: {
    metricName: string;
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
    startTime: Date;
    endTime: Date;
    groupBy?: string;
  }): Promise<{ value: number; timestamp: Date; group?: string }[]> {
    try {
      const response = await this.client.get('/metrics/aggregate', {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get aggregated metrics:', error);
      throw new Error('Failed to get aggregated metrics');
    }
  }

  // ============ ALERT MANAGEMENT ============

  /**
   * Create a new alert rule
   */
  async createAlertRule(rule: AlertRule): Promise<AlertRule> {
    try {
      const response = await this.client.post('/alerts/rules', {
        ...rule,
        tenantId: this.config.tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create alert rule:', error);
      throw new Error('Failed to create alert rule');
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    try {
      const response = await this.client.put(`/alerts/rules/${ruleId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update alert rule:', error);
      throw new Error('Failed to update alert rule');
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    try {
      await this.client.delete(`/alerts/rules/${ruleId}`);
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      throw new Error('Failed to delete alert rule');
    }
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(): Promise<AlertRule[]> {
    try {
      const response = await this.client.get('/alerts/rules');
      return response.data;
    } catch (error) {
      console.error('Failed to get alert rules:', error);
      throw new Error('Failed to get alert rules');
    }
  }

  /**
   * Get alert events (triggered alerts)
   */
  async getAlertEvents(options?: {
    severity?: string;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<AlertEvent[]> {
    try {
      const response = await this.client.get('/alerts/events', {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get alert events:', error);
      throw new Error('Failed to get alert events');
    }
  }

  /**
   * Resolve an alert event
   */
  async resolveAlert(eventId: string, resolution?: string): Promise<void> {
    try {
      await this.client.patch(`/alerts/events/${eventId}/resolve`, {
        resolution
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw new Error('Failed to resolve alert');
    }
  }

  // ============ HEALTH CHECKS ============

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get system health:', error);
      throw new Error('Failed to get system health');
    }
  }

  /**
   * Get health status for specific services
   */
  async getServiceHealth(services?: string[]): Promise<HealthCheck[]> {
    try {
      const response = await this.client.get('/health/services', {
        params: services ? { services: services.join(',') } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get service health:', error);
      throw new Error('Failed to get service health');
    }
  }

  /**
   * Perform manual health check on a service
   */
  async performHealthCheck(serviceName: string): Promise<HealthCheck> {
    try {
      const response = await this.client.post(`/health/check/${serviceName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to perform health check:', error);
      throw new Error('Failed to perform health check');
    }
  }

  // ============ AUDIT TRAILS ============

  /**
   * Record an audit event
   */
  async recordAuditEvent(event: {
    action: string;
    resource: string;
    userId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.client.post('/audit', {
        ...event,
        timestamp: new Date(),
        tenantId: this.config.tenantId
      });
    } catch (error) {
      console.error('Failed to record audit event:', error);
      throw new Error('Failed to record audit event');
    }
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(options?: {
    userId?: string;
    action?: string;
    resource?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    try {
      const response = await this.client.get('/audit', {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw new Error('Failed to get audit trail');
    }
  }

  // ============ PERFORMANCE MONITORING ============

  /**
   * Start performance timer
   */
  startTimer(name: string, tags?: { [key: string]: string }): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags
      }).catch(console.error);
    };
  }

  /**
   * Monitor function execution time
   */
  async monitorFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: { [key: string]: string }
  ): Promise<T> {
    const endTimer = this.startTimer(name, tags);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      // Record error metric
      await this.recordMetric({
        name: `${name}_error`,
        value: 1,
        tags: { ...tags, error: 'true' }
      });
      throw error;
    }
  }

  /**
   * Monitor Express.js routes
   */
  expressMiddleware(metricName?: string) {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const originalEnd = res.end;
      
      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;
        const route = metricName || `${req.method}_${req.route?.path || req.path}`;
        
        this.recordMetric({
          name: `${route}_response_time`,
          value: duration,
          unit: 'ms',
          tags: {
            method: req.method,
            status: res.statusCode.toString(),
            route: req.route?.path || req.path
          }
        }).catch(console.error);
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  // ============ DASHBOARD DATA ============

  /**
   * Get dashboard data for monitoring UI
   */
  async getDashboardData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    systemHealth: SystemHealth;
    keyMetrics: { name: string; value: number; change: number }[];
    alertCounts: { severity: string; count: number }[];
    topErrors: { error: string; count: number }[];
  }> {
    try {
      const response = await this.client.get(`/dashboard`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw new Error('Failed to get dashboard data');
    }
  }
}

export default SaaSMonitoring;
