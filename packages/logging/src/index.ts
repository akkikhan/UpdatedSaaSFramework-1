import axios, { AxiosInstance } from 'axios';

export interface LoggingConfig {
  apiKey: string;
  baseUrl: string;
  tenantId?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type EventType = 'authentication' | 'authorization' | 'data_access' | 'system_change' | 'security' | 'compliance' | 'user_action' | 'api_call';
export type ComplianceFramework = 'sox' | 'hipaa' | 'gdpr' | 'pci' | 'iso27001' | 'ccpa' | 'nist' | 'basel-iii' | 'ffiec';

export interface BaseLogEntry {
  level: LogLevel;
  message: string;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: { [key: string]: any };
  tags?: string[];
}

export interface AuditLogEntry extends BaseLogEntry {
  eventType: EventType;
  entityType: string;
  entityId: string;
  entityName?: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked' | 'pending';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFrameworks: ComplianceFramework[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  beforeState?: any;
  afterState?: any;
  changeReason?: string;
  adminUserId?: string;
  retentionUntil?: Date;
}

export interface SecurityLogEntry extends BaseLogEntry {
  threatType: 'malware' | 'phishing' | 'brute_force' | 'unauthorized_access' | 'data_breach' | 'anomaly' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  destination?: string;
  blocked: boolean;
  mitigationActions?: string[];
  evidenceData?: any;
  alertTriggered: boolean;
}

export interface PerformanceLogEntry extends BaseLogEntry {
  operation: string;
  duration: number; // milliseconds
  status: 'success' | 'error' | 'timeout';
  resourceUsage?: {
    memory?: number;
    cpu?: number;
    diskIO?: number;
    networkIO?: number;
  };
  errorDetails?: string;
}

export interface DataAccessLogEntry extends BaseLogEntry {
  accessType: 'read' | 'write' | 'delete' | 'export' | 'import';
  dataType: string;
  recordCount?: number;
  dataSize?: number; // bytes
  purpose: string;
  legalBasis?: string; // for GDPR
  consentId?: string;
  dataRetentionPeriod?: number; // days
}

export interface LogQuery {
  level?: LogLevel;
  eventType?: EventType;
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface LogSearchResult {
  logs: BaseLogEntry[];
  total: number;
  hasMore: boolean;
  aggregations?: {
    byLevel: { [key in LogLevel]: number };
    byEventType: { [key in EventType]: number };
    byUser: { userId: string; count: number }[];
  };
}

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  compliantEvents: number;
  violations: {
    rule: string;
    count: number;
    severity: 'minor' | 'major' | 'critical';
    examples: AuditLogEntry[];
  }[];
  recommendations: string[];
  generatedAt: Date;
  downloadUrl?: string;
}

/**
 * SaaS Framework Logging SDK
 * Comprehensive logging, audit trails, and compliance reporting
 */
export class SaaSLogging {
  private client: AxiosInstance;
  private config: LoggingConfig;
  private logBuffer: BaseLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(config: LoggingConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        ...(config.tenantId && { 'X-Tenant-ID': config.tenantId })
      },
    });

    // Start buffer flush timer
    this.startBufferFlush();
  }

  // ============ BASIC LOGGING ============

  /**
   * Log debug message
   */
  debug(message: string, metadata?: any): void {
    this.log({
      level: 'debug',
      message,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: any): void {
    this.log({
      level: 'info',
      message,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: any): void {
    this.log({
      level: 'warn',
      message,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: any): void {
    this.log({
      level: 'error',
      message,
      metadata: {
        ...metadata,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      },
      timestamp: new Date()
    });
  }

  /**
   * Log critical message
   */
  critical(message: string, metadata?: any): void {
    this.log({
      level: 'critical',
      message,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Generic log method
   */
  log(entry: BaseLogEntry): void {
    const logEntry: BaseLogEntry = {
      ...entry,
      tenantId: entry.tenantId || this.config.tenantId,
      timestamp: entry.timestamp || new Date()
    };

    this.addToBuffer(logEntry);
  }

  // ============ AUDIT LOGGING ============

  /**
   * Log audit event for compliance
   */
  async logAuditEvent(entry: Omit<AuditLogEntry, 'level' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      level: 'info',
      timestamp: new Date(),
      tenantId: entry.tenantId || this.config.tenantId
    };

    try {
      await this.client.post('/logs/audit', auditEntry);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Add to buffer as fallback
      this.addToBuffer(auditEntry);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(data: {
    action: 'login_success' | 'login_failed' | 'logout' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled';
    userId?: string;
    outcome: 'success' | 'failure' | 'blocked';
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: any;
  }): Promise<void> {
    await this.logAuditEvent({
      message: `Authentication event: ${data.action}`,
      eventType: 'authentication',
      entityType: 'user',
      entityId: data.userId || 'unknown',
      action: data.action,
      outcome: data.outcome,
      riskLevel: data.riskLevel || 'medium',
      complianceFrameworks: ['sox', 'iso27001'],
      dataClassification: 'internal',
      userId: data.userId,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata
    });
  }

  /**
   * Log authorization events
   */
  async logAuthzEvent(data: {
    action: 'permission_granted' | 'permission_denied' | 'role_assigned' | 'role_removed';
    userId: string;
    resource: string;
    permission?: string;
    roleId?: string;
    outcome: 'success' | 'failure';
    adminUserId?: string;
    metadata?: any;
  }): Promise<void> {
    await this.logAuditEvent({
      message: `Authorization event: ${data.action}`,
      eventType: 'authorization',
      entityType: 'permission',
      entityId: data.permission || data.roleId || data.resource,
      action: data.action,
      outcome: data.outcome,
      riskLevel: 'medium',
      complianceFrameworks: ['sox', 'iso27001'],
      dataClassification: 'internal',
      userId: data.userId,
      adminUserId: data.adminUserId,
      metadata: data.metadata
    });
  }

  /**
   * Log data access events for GDPR compliance
   */
  async logDataAccess(entry: Omit<DataAccessLogEntry, 'level' | 'timestamp' | 'eventType'>): Promise<void> {
    await this.logAuditEvent({
      message: `Data access: ${entry.accessType} ${entry.dataType}`,
      eventType: 'data_access',
      entityType: entry.dataType,
      entityId: entry.userId || 'system',
      action: entry.accessType,
      outcome: 'success',
      riskLevel: this.getDataAccessRiskLevel(entry.accessType, entry.dataType),
      complianceFrameworks: ['gdpr', 'ccpa', 'hipaa'],
      dataClassification: 'confidential',
      userId: entry.userId,
      metadata: {
        purpose: entry.purpose,
        legalBasis: entry.legalBasis,
        consentId: entry.consentId,
        recordCount: entry.recordCount,
        dataSize: entry.dataSize,
        retentionPeriod: entry.dataRetentionPeriod
      }
    });
  }

  // ============ SECURITY LOGGING ============

  /**
   * Log security events
   */
  async logSecurityEvent(entry: Omit<SecurityLogEntry, 'level' | 'timestamp'>): Promise<void> {
    const securityEntry: SecurityLogEntry = {
      ...entry,
      level: entry.severity === 'critical' ? 'critical' : 'error',
      timestamp: new Date(),
      tenantId: entry.tenantId || this.config.tenantId
    };

    try {
      await this.client.post('/logs/security', securityEntry);
    } catch (error) {
      console.error('Failed to log security event:', error);
      this.addToBuffer(securityEntry);
    }
  }

  /**
   * Log security threats
   */
  async logThreat(data: {
    threatType: SecurityLogEntry['threatType'];
    severity: SecurityLogEntry['severity'];
    source: string;
    destination?: string;
    blocked: boolean;
    description: string;
    evidenceData?: any;
    mitigationActions?: string[];
  }): Promise<void> {
    await this.logSecurityEvent({
      message: `Security threat detected: ${data.threatType}`,
      threatType: data.threatType,
      severity: data.severity,
      source: data.source,
      destination: data.destination,
      blocked: data.blocked,
      mitigationActions: data.mitigationActions,
      evidenceData: data.evidenceData,
      alertTriggered: data.severity === 'high' || data.severity === 'critical',
      metadata: { description: data.description }
    });
  }

  // ============ PERFORMANCE LOGGING ============

  /**
   * Log performance metrics
   */
  async logPerformance(entry: Omit<PerformanceLogEntry, 'level' | 'timestamp'>): Promise<void> {
    const perfEntry: PerformanceLogEntry = {
      ...entry,
      level: entry.status === 'error' ? 'error' : 'info',
      timestamp: new Date(),
      tenantId: entry.tenantId || this.config.tenantId
    };

    try {
      await this.client.post('/logs/performance', perfEntry);
    } catch (error) {
      console.error('Failed to log performance event:', error);
      this.addToBuffer(perfEntry);
    }
  }

  /**
   * Time operation and log performance
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now();
    let status: 'success' | 'error' | 'timeout' = 'success';
    let errorDetails: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      status = 'error';
      errorDetails = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      await this.logPerformance({
        message: `Operation ${operation} completed in ${duration}ms`,
        operation,
        duration,
        status,
        errorDetails,
        metadata
      });
    }
  }

  // ============ LOG RETRIEVAL ============

  /**
   * Search logs
   */
  async searchLogs(query: LogQuery): Promise<LogSearchResult> {
    try {
      const response = await this.client.get('/logs/search', {
        params: query
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search logs:', error);
      throw new Error('Failed to search logs');
    }
  }

  /**
   * Get logs by user
   */
  async getUserLogs(userId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    eventTypes?: EventType[];
    limit?: number;
  }): Promise<BaseLogEntry[]> {
    const result = await this.searchLogs({
      userId,
      startTime: options?.startTime,
      endTime: options?.endTime,
      eventType: options?.eventTypes?.[0], // API limitation - would need to be enhanced
      limit: options?.limit || 100
    });
    return result.logs;
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(entityType: string, entityId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    actions?: string[];
  }): Promise<AuditLogEntry[]> {
    try {
      const response = await this.client.get(`/logs/audit-trail/${entityType}/${entityId}`, {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw new Error('Failed to get audit trail');
    }
  }

  // ============ COMPLIANCE REPORTING ============

  /**
   * Generate compliance report
   */
  async generateComplianceReport(options: {
    framework: ComplianceFramework;
    startDate: Date;
    endDate: Date;
    includeViolations?: boolean;
    format?: 'json' | 'pdf' | 'csv';
  }): Promise<ComplianceReport> {
    try {
      const response = await this.client.post('/logs/compliance-report', options);
      return response.data;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Get compliance violations
   */
  async getComplianceViolations(framework: ComplianceFramework, options?: {
    startDate?: Date;
    endDate?: Date;
    severity?: 'minor' | 'major' | 'critical';
  }): Promise<AuditLogEntry[]> {
    try {
      const response = await this.client.get(`/logs/compliance-violations/${framework}`, {
        params: options
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get compliance violations:', error);
      throw new Error('Failed to get compliance violations');
    }
  }

  // ============ LOG RETENTION ============

  /**
   * Set log retention policy
   */
  async setRetentionPolicy(policy: {
    logLevel?: LogLevel;
    eventType?: EventType;
    retentionDays: number;
    complianceFramework?: ComplianceFramework;
  }): Promise<void> {
    try {
      await this.client.post('/logs/retention-policy', policy);
    } catch (error) {
      console.error('Failed to set retention policy:', error);
      throw new Error('Failed to set retention policy');
    }
  }

  /**
   * Archive old logs
   */
  async archiveLogs(options: {
    olderThan: Date;
    archiveLocation?: string;
    deleteAfterArchive?: boolean;
  }): Promise<{ archivedCount: number; archiveId: string }> {
    try {
      const response = await this.client.post('/logs/archive', options);
      return response.data;
    } catch (error) {
      console.error('Failed to archive logs:', error);
      throw new Error('Failed to archive logs');
    }
  }

  // ============ MIDDLEWARE & UTILITIES ============

  /**
   * Express middleware for automatic request logging
   */
  expressMiddleware(options?: {
    excludePaths?: string[];
    logLevel?: LogLevel;
    includeBody?: boolean;
    includeHeaders?: boolean;
  }) {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        this.log({
          level: options?.logLevel || level,
          message: `${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
          userId: req.user?.id,
          sessionId: req.session?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            ...(options?.includeHeaders && { headers: req.headers }),
            ...(options?.includeBody && { body: req.body })
          },
          tags: ['http', 'request']
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Create structured logger for specific component
   */
  createLogger(component: string, defaultMetadata?: any) {
    return {
      debug: (message: string, metadata?: any) => 
        this.debug(`[${component}] ${message}`, { ...defaultMetadata, ...metadata }),
      info: (message: string, metadata?: any) => 
        this.info(`[${component}] ${message}`, { ...defaultMetadata, ...metadata }),
      warn: (message: string, metadata?: any) => 
        this.warn(`[${component}] ${message}`, { ...defaultMetadata, ...metadata }),
      error: (message: string, error?: Error, metadata?: any) => 
        this.error(`[${component}] ${message}`, error, { ...defaultMetadata, ...metadata }),
      critical: (message: string, metadata?: any) => 
        this.critical(`[${component}] ${message}`, { ...defaultMetadata, ...metadata })
    };
  }

  // ============ PRIVATE METHODS ============

  private addToBuffer(entry: BaseLogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.client.post('/logs/batch', { logs });
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // Re-add logs to buffer if flush fails
      this.logBuffer.unshift(...logs);
    }
  }

  private startBufferFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch(console.error);
    }, this.flushInterval);
  }

  private getDataAccessRiskLevel(accessType: string, dataType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (accessType === 'delete' || accessType === 'export') return 'high';
    if (dataType.includes('pii') || dataType.includes('personal')) return 'medium';
    return 'low';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
  }
}

export default SaaSLogging;

