export interface SaaSLoggingConfig {
  apiKey: string;
  baseUrl: string;
  batchSize?: number;
  flushInterval?: number;
  enableConsole?: boolean;
  tenantId?: string;
}

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

export interface LogEntry {
  id?: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  category?: string;
  component?: string;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogQuery {
  tenantId?: string;
  level?: LogLevel | LogLevel[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  category?: string;
  component?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface LogSearchResult {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface LogStats {
  totalCount: number;
  levelBreakdown: Record<LogLevel, number>;
  topCategories: Array<{ category: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AlertRule {
  id?: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  isActive: boolean;
  tenantId?: string;
}

export interface AlertCondition {
  type: "count" | "level" | "keyword" | "pattern";
  threshold?: number;
  timeWindow?: number; // minutes
  level?: LogLevel;
  keyword?: string;
  pattern?: string;
  category?: string;
  component?: string;
}

export interface AlertAction {
  type: "email" | "webhook" | "sms";
  target: string;
  template?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  level: "low" | "medium" | "high" | "critical";
  triggeredAt: Date;
  triggeredBy: LogEntry[];
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AuditEvent {
  tenantId: string;
  userId?: string;
  adminUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  beforeState?: any;
  afterState?: any;
  outcome: "success" | "failure" | "partial";
  riskLevel: "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * SaaS Logging SDK - Enterprise logging, audit, and monitoring
 *
 * Features:
 * - Structured logging with metadata
 * - Batch processing for performance
 * - Real-time search and filtering
 * - Alert rules and notifications
 * - Compliance audit trails
 * - Performance analytics
 */
export class SaaSLogging {
  private config: SaaSLoggingConfig;
  private batchQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: SaaSLoggingConfig) {
    this.config = {
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      enableConsole: false,
      ...config,
    };

    this.startFlushTimer();
  }

  /**
   * Log a message with specified level
   */
  async log(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      tenantId: this.config.tenantId,
      metadata,
    };

    this.addToQueue(entry);
  }

  /**
   * Log an error with optional Error object
   */
  async error(message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
    const errorMetadata = {
      ...metadata,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };

    await this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /**
   * Log a warning
   */
  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an info message
   */
  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a debug message
   */
  async debug(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log a critical error (triggers immediate alerts)
   */
  async critical(message: string, metadata?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.CRITICAL,
      message,
      timestamp: new Date(),
      tenantId: this.config.tenantId,
      metadata,
    };

    // Critical logs bypass batching and send immediately
    await this.sendLogs([entry]);

    if (this.config.enableConsole) {
      console.error("CRITICAL:", message, metadata);
    }
  }

  /**
   * Log user activity for audit trails
   */
  async logUserActivity(
    userId: string,
    action: string,
    component: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `User activity: ${action}`, {
      ...metadata,
      userId,
      component,
      category: "user_activity",
      action,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: string,
    level: LogLevel = LogLevel.WARN,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(level, `Security event: ${event}`, {
      ...metadata,
      category: "security",
      action: event,
    });
  }

  /**
   * Log audit event with full compliance details
   */
  async logAuditEvent(event: AuditEvent): Promise<void> {
    await this.log(LogLevel.INFO, `Audit: ${event.action} on ${event.entityType}`, {
      category: "audit",
      audit: event,
    });

    // Also send to dedicated audit endpoint
    try {
      await fetch(`${this.config.baseUrl}/api/logging/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("Failed to send audit event:", error);
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, `Performance: ${operation} took ${duration}ms`, {
      ...metadata,
      category: "performance",
      operation,
      duration,
    });
  }

  /**
   * Add multiple log entries to batch queue
   */
  async logBatch(logs: LogEntry[]): Promise<void> {
    logs.forEach(log => this.addToQueue(log));
  }

  /**
   * Force send all pending logs immediately
   */
  async flush(): Promise<void> {
    if (this.batchQueue.length > 0) {
      const logsToSend = [...this.batchQueue];
      this.batchQueue = [];
      await this.sendLogs(logsToSend);
    }
  }

  /**
   * Search logs with filters
   */
  async searchLogs(query: LogQuery): Promise<LogSearchResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/logging/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Log search failed:", error);
      throw error;
    }
  }

  /**
   * Get logging statistics
   */
  async getLogStats(timeRange: TimeRange): Promise<LogStats> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/logging/stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(timeRange),
      });

      if (!response.ok) {
        throw new Error(`Stats failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Log stats failed:", error);
      throw error;
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlert(alertRule: Omit<AlertRule, "id">): Promise<Alert> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/logging/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(alertRule),
      });

      if (!response.ok) {
        throw new Error(`Alert creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Alert creation failed:", error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/logging/alerts/active`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get alerts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get alerts failed:", error);
      return [];
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  /**
   * Add log entry to batch queue
   */
  private addToQueue(entry: LogEntry): void {
    // Add to queue
    this.batchQueue.push(entry);

    // Console logging if enabled
    if (this.config.enableConsole) {
      console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.metadata);
    }

    // Check if we should flush immediately
    if (this.batchQueue.length >= (this.config.batchSize || 100)) {
      this.flush();
    }
  }

  /**
   * Send logs to the API
   */
  private async sendLogs(logs: LogEntry[]): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/logging/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        console.error("Failed to send logs:", response.statusText);
        // Re-queue failed logs for retry
        this.batchQueue.unshift(...logs);
      }
    } catch (error) {
      console.error("Error sending logs:", error);
      // Re-queue failed logs for retry
      this.batchQueue.unshift(...logs);
    }
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval || 5000);
  }
}

// Export default instance creator
export default SaaSLogging;
