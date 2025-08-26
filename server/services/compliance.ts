import { db } from '../db';
import { complianceAuditLogs, securityEvents } from '../../shared/schema';
import type { InsertComplianceAuditLog, InsertSecurityEvent } from '../../shared/schema';

export class ComplianceService {
  
  /**
   * Log RBAC-related compliance events
   */
  async logRBACEvent(data: {
    tenantId: string;
    userId?: string;
    adminUserId?: string;
    action: string; // role_assigned, role_removed, permission_granted, permission_revoked
    entityType: 'user' | 'role' | 'permission';
    entityId: string;
    entityName?: string;
    beforeState?: any;
    afterState?: any;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }) {
    const auditLog: InsertComplianceAuditLog = {
      tenantId: data.tenantId,
      userId: data.userId || null,
      adminUserId: data.adminUserId || null,
      eventType: 'rbac_change',
      eventCategory: this.getEventCategory(data.action),
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName || null,
      action: data.action,
      outcome: 'success',
      riskLevel: data.riskLevel || 'medium', // RBAC changes are typically medium risk
      complianceFrameworks: ['sox', 'iso27001'], // RBAC is relevant for these frameworks
      dataClassification: 'internal',
      details: {
        action: data.action,
        entityType: data.entityType,
        changes: data.afterState ? Object.keys(data.afterState) : []
      },
      beforeState: data.beforeState || null,
      afterState: data.afterState || null,
      sessionId: data.sessionId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      retentionUntil: this.calculateRetentionDate('rbac', 7) // 7 years for SOX compliance
    };

    await db.insert(complianceAuditLogs).values(auditLog);
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(data: {
    tenantId: string;
    userId?: string;
    action: string; // login_success, login_failed, logout, password_reset, mfa_enabled
    outcome: 'success' | 'failure' | 'blocked';
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    geolocation?: any;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }) {
    const auditLog: InsertComplianceAuditLog = {
      tenantId: data.tenantId,
      userId: data.userId || null,
      adminUserId: null,
      eventType: 'auth_event',
      eventCategory: this.getEventCategory(data.action),
      entityType: 'session',
      entityId: data.sessionId || 'unknown',
      entityName: null,
      action: data.action,
      outcome: data.outcome,
      riskLevel: data.riskLevel || (data.outcome === 'failure' ? 'medium' : 'low'),
      complianceFrameworks: ['gdpr', 'sox'],
      dataClassification: 'confidential',
      details: {
        action: data.action,
        outcome: data.outcome,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      },
      sessionId: data.sessionId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      geolocation: data.geolocation || null,
      retentionUntil: this.calculateRetentionDate('auth', 3) // 3 years for auth logs
    };

    await db.insert(complianceAuditLogs).values(auditLog);

    // Also create security event if it's a failed login
    if (data.outcome === 'failure' && data.action.includes('login')) {
      await this.logSecurityEvent({
        tenantId: data.tenantId,
        eventType: 'authentication_failure',
        severity: 'warning',
        source: 'api',
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: {
          action: data.action,
          sessionId: data.sessionId
        }
      });
    }
  }

  /**
   * Log data access events for GDPR compliance
   */
  async logDataAccessEvent(data: {
    tenantId: string;
    userId?: string;
    adminUserId?: string;
    action: string; // data_exported, data_deleted, data_updated, pii_accessed
    entityType: string;
    entityId: string;
    entityName?: string;
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const auditLog: InsertComplianceAuditLog = {
      tenantId: data.tenantId,
      userId: data.userId || null,
      adminUserId: data.adminUserId || null,
      eventType: 'data_access',
      eventCategory: this.getEventCategory(data.action),
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName || null,
      action: data.action,
      outcome: 'success',
      riskLevel: this.getRiskLevelForDataAccess(data.action, data.dataClassification),
      complianceFrameworks: this.getComplianceFrameworks(data.dataClassification),
      dataClassification: data.dataClassification,
      details: {
        action: data.action,
        entityType: data.entityType,
        dataClassification: data.dataClassification
      },
      sessionId: data.sessionId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      retentionUntil: this.calculateRetentionDate('data_access', 6) // 6 years for GDPR
    };

    await db.insert(complianceAuditLogs).values(auditLog);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(data: InsertSecurityEvent) {
    await db.insert(securityEvents).values(data);
  }

  /**
   * Get compliance reports for auditors
   */
  async getComplianceReport(options: {
    tenantId?: string;
    framework?: string; // gdpr, sox, hipaa, pci, iso27001
    startDate: Date;
    endDate: Date;
    eventTypes?: string[];
    riskLevels?: string[];
    limit?: number;
  }) {
    // Implementation would return formatted compliance data
    // This is a placeholder for the actual reporting logic
    return {
      summary: {
        totalEvents: 0,
        highRiskEvents: 0,
        complianceViolations: 0,
        dataAccessEvents: 0,
        rbacChanges: 0
      },
      events: [],
      recommendations: []
    };
  }

  // Helper methods
  private getEventCategory(action: string): string {
    if (action.includes('create') || action.includes('assign')) return 'create';
    if (action.includes('read') || action.includes('access') || action.includes('view')) return 'read';
    if (action.includes('update') || action.includes('modify')) return 'update';
    if (action.includes('delete') || action.includes('remove')) return 'delete';
    if (action.includes('login')) return 'access';
    if (action.includes('logout')) return 'access';
    return 'access';
  }

  private getRiskLevelForDataAccess(action: string, classification: string): 'low' | 'medium' | 'high' | 'critical' {
    if (classification === 'restricted') return 'critical';
    if (classification === 'confidential') return 'high';
    if (action.includes('export') || action.includes('delete')) return 'high';
    if (classification === 'internal') return 'medium';
    return 'low';
  }

  private getComplianceFrameworks(dataClassification: string): string[] {
    const frameworks = ['gdpr']; // GDPR applies to all personal data
    
    if (dataClassification === 'restricted' || dataClassification === 'confidential') {
      frameworks.push('sox', 'iso27001');
    }
    
    return frameworks;
  }

  private calculateRetentionDate(eventType: string, years: number): Date {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + years);
    return retentionDate;
  }
}

export const complianceService = new ComplianceService();