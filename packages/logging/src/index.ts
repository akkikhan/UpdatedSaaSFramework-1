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

    // Critical logs bypass batching and send immediately (v2 single-event ingest)
    await this.sendEvent(entry);

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
      // v2 API doesn't support batch endpoint; send sequentially
      for (const entry of logsToSend) {
        // Fire-and-forget but await to preserve order
        await this.sendEvent(entry);
      }
    }
  }

  /**
   * Search logs with filters
   */
  async searchLogs(query: LogQuery): Promise<LogSearchResult> {
    try {
      const params = new URLSearchParams();
      if (query.level)
        params.set(
          "level",
          Array.isArray(query.level) ? query.level.join(",") : String(query.level)
        );
      if (query.category) params.set("category", query.category);
      if (query.startDate) params.set("startDate", query.startDate.toISOString());
      if (query.endDate) params.set("endDate", query.endDate.toISOString());
      if (query.limit) params.set("limit", String(query.limit));
      if (query.offset) params.set("offset", String(query.offset));

      const response = await fetch(
        `${this.config.baseUrl}/api/v2/logging/events?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "X-API-Key": this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const rows = (await response.json()) as any[];
      const normalized: LogEntry[] = (rows || []).map(row => {
        const ts = row.timestamp || row.time || new Date().toISOString();
        const details = row.message || row.details || {};
        const lvlRaw = row.level || details.level || "";
        const lvlStr = typeof lvlRaw === "string" ? String(lvlRaw).split(":")[0] : "info";
        const cat =
          row.eventType ||
          details.category ||
          (typeof lvlRaw === "string" ? String(lvlRaw).split(":")[1] : "");
        const toEnum = (s: string): LogLevel => {
          const m: Record<string, LogLevel> = {
            debug: LogLevel.DEBUG,
            info: LogLevel.INFO,
            warning: LogLevel.WARN,
            warn: LogLevel.WARN,
            error: LogLevel.ERROR,
          } as any;
          return m[s?.toLowerCase?.()] || LogLevel.INFO;
        };
        return {
          id: row.id,
          timestamp: new Date(ts),
          level: toEnum(lvlStr),
          category: cat || "application",
          message: details.message || details || "",
          metadata: details.metadata || {},
          userId: row.userId,
        } as LogEntry;
      });
      return {
        logs: normalized,
        total: normalized.length,
        page: 1,
        limit: query.limit || normalized.length || 0,
        hasMore: false,
      };
    } catch (error) {
      console.error("Log search failed:", error);
      throw error;
    }
  }

  /**
   * Get logging statistics
   */
  async getLogStats(timeRangeOrPeriod?: TimeRange | string): Promise<LogStats> {
    try {
      // v2 uses GET /api/v2/logging/stats?period=24h
      const period = typeof timeRangeOrPeriod === "string" ? timeRangeOrPeriod : "24h";
      const response = await fetch(
        `${this.config.baseUrl}/api/v2/logging/stats?period=${encodeURIComponent(period)}`,
        {
          method: "GET",
          headers: {
            "X-API-Key": this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Stats failed: ${response.statusText}`);
      }

      return (await response.json()) as LogStats;
    } catch (error) {
      console.error("Log stats failed:", error);
      throw error;
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(alertRule: Omit<AlertRule, "id">): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/logging/alert-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
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
   * Get alert rules (v2)
   */
  async getAlertRules(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/logging/alert-rules`, {
        method: "GET",
        headers: {
          "X-API-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get alert rules: ${response.statusText}`);
      }

      return (await response.json()) as any[];
    } catch (error) {
      console.error("Get alert rules failed:", error);
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
   * Send a single log event via v2 API
   */
  private async sendEvent(entry: LogEntry): Promise<void> {
    try {
      // Normalize level names to server-supported set
      const levelMap: Record<string, string> = {
        [LogLevel.DEBUG]: "debug",
        [LogLevel.INFO]: "info",
        [LogLevel.WARN]: "warning",
        [LogLevel.ERROR]: "error",
        [LogLevel.CRITICAL]: "error",
      } as any;
      const level = levelMap[entry.level] || String(entry.level || "info");
      const body = {
        level,
        message: entry.message,
        category: entry.category || (entry.metadata?.category as string) || "application",
        metadata: {
          ...(entry.metadata || {}),
          ...(entry.level === LogLevel.CRITICAL ? { critical: true } : {}),
        },
        userId: entry.userId,
      } as any;

      const response = await fetch(`${this.config.baseUrl}/api/v2/logging/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error("Failed to send log event:", response.statusText);
        // Re-queue failed entry for retry
        this.batchQueue.unshift(entry);
      }
    } catch (error) {
      console.error("Error sending log event:", error);
      // Re-queue failed entry for retry
      this.batchQueue.unshift(entry);
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
