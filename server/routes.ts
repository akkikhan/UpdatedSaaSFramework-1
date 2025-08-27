import {
  deviceTokens,
  insertBusinessTypeSchema,
  insertDefaultRoleSchema,
  insertPermissionTemplateSchema,
  insertTenantSchema,
  insertTenantUserSchema
} from '@shared/schema';
import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { z } from 'zod';
import { db } from './db';
import { authMiddleware, tenantMiddleware } from './middleware/auth';
import { authService } from './services/auth';
import { AzureADService } from './services/azure-ad';
import { complianceService } from './services/compliance';
import { emailService } from './services/email';
import { notificationService } from './services/notification';
import { storage } from './storage';

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes

  // Health check
  app.get('/api/health', async (req, res) => {
    const emailConnected = await emailService.testConnection();
    res.json({
      status: 'operational',
      services: {
        database: true,
        email: emailConnected ? 'operational' : 'configuration_needed'
      },
      timestamp: new Date().toISOString()
    });
  });

  // Test email route for debugging
  app.post('/api/test-email', async (req, res) => {
    try {
      const { to, subject = 'Test Email' } = req.body;

      if (!to) {
        return res.status(400).json({ message: "Recipient email 'to' is required" });
      }

      // Test SMTP connection first
      const connectionTest = await emailService.testConnection();
      if (!connectionTest) {
        return res.status(500).json({
          success: false,
          message: 'SMTP connection failed. Check email configuration and credentials.'
        });
      }

      // Send a simple test email without database logging
      const emailSent = await emailService.sendSimpleTestEmail(to, subject);

      if (emailSent) {
        res.json({
          success: true,
          message: `Test email sent successfully to ${to}`
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send test email. Check server logs for details.'
        });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({
        success: false,
        message: 'Email test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Tenant management routes (admin only for now)

  // Get all tenants
  app.get('/api/tenants', async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

  // Get tenant statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getTenantStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  // Get recent tenants
  app.get('/api/tenants/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentTenants = await storage.getRecentTenants(limit);
      res.json(recentTenants);
    } catch (error) {
      console.error('Error fetching recent tenants:', error);
      res.status(500).json({ message: 'Failed to fetch recent tenants' });
    }
  });

  // Get tenant by orgId
  app.get('/api/tenants/by-org-id/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      res.json(tenant);
    } catch (error) {
      console.error('Error fetching tenant by orgId:', error);
      res.status(500).json({ message: 'Failed to fetch tenant' });
    }
  });

  // Update tenant status
  app.patch('/api/tenants/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await storage.updateTenantStatus(id, status);

      // Log the activity
      await storage.logSystemActivity({
        tenantId: id,
        action: 'tenant_status_updated',
        entityType: 'tenant',
        entityId: id,
        details: { newStatus: status },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      console.log(`Tenant ${id} status updated to: ${status}`);

      res.json({
        message: 'Tenant status updated successfully',
        status: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating tenant status:', error);
      res.status(500).json({ message: 'Failed to update tenant status' });
    }
  });

  // Test endpoint to suspend the test tenant (for demonstration)
  app.post('/api/test/suspend-tenant', async (req, res) => {
    try {
      const testTenant = await storage.getTenantByOrgId('test');
      if (!testTenant) {
        return res.status(404).json({ message: 'Test tenant not found' });
      }

      await storage.updateTenantStatus(testTenant.id, 'suspended');

      res.json({
        message:
          'Test tenant suspended successfully. Active users will be logged out on next verification.',
        tenantId: testTenant.id,
        orgId: testTenant.orgId
      });
    } catch (error) {
      console.error('Error suspending test tenant:', error);
      res.status(500).json({ message: 'Failed to suspend test tenant' });
    }
  });

  // Test endpoint to reactivate the test tenant
  app.post('/api/test/reactivate-tenant', async (req, res) => {
    try {
      const testTenant = await storage.getTenantByOrgId('test');
      if (!testTenant) {
        return res.status(404).json({ message: 'Test tenant not found' });
      }

      await storage.updateTenantStatus(testTenant.id, 'active');

      res.json({
        message: 'Test tenant reactivated successfully',
        tenantId: testTenant.id,
        orgId: testTenant.orgId
      });
    } catch (error) {
      console.error('Error reactivating test tenant:', error);
      res.status(500).json({ message: 'Failed to reactivate test tenant' });
    }
  });

  // Compliance and audit endpoints
  app.get('/api/compliance/audit-logs', async (req, res) => {
    try {
      const {
        tenantId,
        eventType,
        framework,
        startDate,
        endDate,
        limit = '50',
        offset = '0'
      } = req.query;

      const options = {
        tenantId: tenantId as string,
        eventType: eventType as string,
        framework: framework as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const logs = await storage.getComplianceAuditLogs(options);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching compliance audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch compliance audit logs' });
    }
  });

  app.get('/api/compliance/security-events', async (req, res) => {
    try {
      const { tenantId, severity, eventType, limit = '50', offset = '0' } = req.query;

      const options = {
        tenantId: tenantId as string,
        severity: severity as string,
        eventType: eventType as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const events = await storage.getSecurityEvents(options);
      res.json(events);
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ message: 'Failed to fetch security events' });
    }
  });

  app.get('/api/compliance/summary', async (req, res) => {
    try {
      const { tenantId, framework, days = '30' } = req.query;
      const daysBack = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get recent compliance events
      const auditLogs = await storage.getComplianceAuditLogs({
        tenantId: tenantId as string,
        framework: framework as string,
        startDate,
        limit: 1000
      });

      const securityEvents = await storage.getSecurityEvents({
        tenantId: tenantId as string,
        limit: 1000
      });

      // Calculate summary statistics
      const summary = {
        timeframe: `${daysBack} days`,
        totalAuditEvents: auditLogs.length,
        rbacChanges: auditLogs.filter(log => log.eventType === 'rbac_change').length,
        dataAccessEvents: auditLogs.filter(log => log.eventType === 'data_access').length,
        authEvents: auditLogs.filter(log => log.eventType === 'auth_event').length,
        highRiskEvents: auditLogs.filter(
          log => log.riskLevel === 'high' || log.riskLevel === 'critical'
        ).length,
        securityEvents: securityEvents.length,
        criticalSecurityEvents: securityEvents.filter(event => event.severity === 'critical')
          .length,
        complianceFrameworks: Array.from(
          new Set(auditLogs.flatMap(log => log.complianceFrameworks || []))
        ),
        riskDistribution: {
          low: auditLogs.filter(log => log.riskLevel === 'low').length,
          medium: auditLogs.filter(log => log.riskLevel === 'medium').length,
          high: auditLogs.filter(log => log.riskLevel === 'high').length,
          critical: auditLogs.filter(log => log.riskLevel === 'critical').length
        }
      };

      res.json(summary);
    } catch (error) {
      console.error('Error generating compliance summary:', error);
      res.status(500).json({ message: 'Failed to generate compliance summary' });
    }
  });

  // Module Management Routes

  // Update tenant modules
  app.patch('/api/tenants/:id/modules', async (req, res) => {
    try {
      const { id } = req.params;
      const { enabledModules, moduleConfigs } = req.body;

      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      const currentModules = (tenant.enabledModules as string[]) || ['auth', 'rbac'];
      const newModules = enabledModules || currentModules;

      // Determine changes
      const enabled = newModules.filter((m: string) => !currentModules.includes(m));
      const disabled = currentModules.filter((m: string) => !newModules.includes(m));

      // Update tenant modules
      await storage.updateTenantModules(id, newModules, moduleConfigs || {});

      // Log the activity
      await storage.logSystemActivity({
        tenantId: id,
        action: 'modules_updated',
        entityType: 'tenant',
        entityId: id,
        details: { enabled, disabled, previousModules: currentModules, newModules },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log compliance audit events for RBAC changes
      if (enabled.length > 0 || disabled.length > 0) {
        for (const module of enabled) {
          await complianceService.logRBACEvent({
            tenantId: id,
            action: 'module_enabled',
            entityType: 'permission',
            entityId: module,
            entityName: `${module.toUpperCase()} Module`,
            beforeState: { moduleEnabled: false },
            afterState: { moduleEnabled: true },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            riskLevel: module === 'rbac' ? 'high' : 'medium' // RBAC module changes are high risk
          });
        }

        for (const module of disabled) {
          await complianceService.logRBACEvent({
            tenantId: id,
            action: 'module_disabled',
            entityType: 'permission',
            entityId: module,
            entityName: `${module.toUpperCase()} Module`,
            beforeState: { moduleEnabled: true },
            afterState: { moduleEnabled: false },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            riskLevel: module === 'rbac' ? 'critical' : 'high' // Disabling modules is higher risk
          });
        }
      }

      // Send notifications for module changes
      if (enabled.length > 0 || disabled.length > 0) {
        // Send email notification
        await emailService.sendModuleStatusEmail(
          {
            id: tenant.id,
            name: tenant.name,
            adminEmail: tenant.adminEmail
          },
          { enabled, disabled }
        );

        // Create in-app notifications
        for (const module of enabled) {
          await notificationService.notifyModuleStatusChange(id, module, true, true);
        }
        for (const module of disabled) {
          await notificationService.notifyModuleStatusChange(id, module, false, true);
        }
      }

      res.json({
        message: 'Modules updated successfully',
        changes: { enabled, disabled }
      });
    } catch (error) {
      console.error('Error updating tenant modules:', error);
      res.status(500).json({ message: 'Failed to update modules' });
    }
  });

  // Get system logs
  app.get('/api/logs/system', async (req, res) => {
    try {
      const { tenantId, action, limit = 50, offset = 0 } = req.query;

      const logs = await storage.getSystemLogs({
        tenantId: tenantId as string,
        action: action as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(logs);
    } catch (error) {
      console.error('Error fetching system logs:', error);
      res.status(500).json({ message: 'Failed to fetch logs' });
    }
  });

  // Get email logs
  app.get('/api/logs/email', async (req, res) => {
    try {
      const { tenantId, status, limit = 50, offset = 0 } = req.query;

      const logs = await storage.getEmailLogs({
        tenantId: tenantId as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(logs);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      res.status(500).json({ message: 'Failed to fetch email logs' });
    }
  });

  // Monitoring and Alerting Routes

  // Get performance metrics
  app.get('/api/monitoring/metrics', async (req, res) => {
    try {
      const { tenantId, metricType, startDate, endDate, limit = 100 } = req.query;

      const { monitoringService } = await import('./services/monitoring');
      const metrics = await monitoringService.getPerformanceMetrics({
        tenantId: tenantId as string,
        metricType: metricType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string)
      });

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  // Get alert rules
  app.get('/api/monitoring/alert-rules', async (req, res) => {
    try {
      const { tenantId } = req.query;

      const { monitoringService } = await import('./services/monitoring');
      const rules = await monitoringService.getAlertRules(tenantId as string);

      res.json(rules);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      res.status(500).json({ message: 'Failed to fetch alert rules' });
    }
  });

  // Create alert rule
  app.post('/api/monitoring/alert-rules', async (req, res) => {
    try {
      const { monitoringService } = await import('./services/monitoring');
      const rule = await monitoringService.createAlertRule(req.body);

      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating alert rule:', error);
      res.status(500).json({ message: 'Failed to create alert rule' });
    }
  });

  // Get alert events
  app.get('/api/monitoring/alerts', async (req, res) => {
    try {
      const { tenantId, severity, status, limit = 50, offset = 0 } = req.query;

      const { monitoringService } = await import('./services/monitoring');
      const alerts = await monitoringService.getAlertEvents({
        tenantId: tenantId as string,
        severity: severity as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alert events:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Get system health
  app.get('/api/monitoring/health', async (req, res) => {
    try {
      const { service } = req.query;

      const { monitoringService } = await import('./services/monitoring');
      const health = await monitoringService.getSystemHealth(service as string);

      res.json(health);
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({ message: 'Failed to fetch system health' });
    }
  });

  // Export compliance report
  app.get('/api/monitoring/compliance-report', async (req, res) => {
    try {
      const { tenantId, startDate, endDate, format = 'json' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }

      const { monitoringService } = await import('./services/monitoring');
      const report = await monitoringService.exportComplianceReport({
        tenantId: tenantId as string,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        format: format as 'json' | 'csv'
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.csv');
        // Convert JSON to CSV (simplified)
        res.send(JSON.stringify(report));
      } else {
        res.json(report);
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ message: 'Failed to generate compliance report' });
    }
  });

  // Create new tenant
  app.post('/api/tenants', async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);

      // Check if orgId is already taken
      const existingTenant = await storage.getTenantByOrgId(tenantData.orgId);
      if (existingTenant) {
        return res.status(400).json({ message: 'Organization ID already exists' });
      }

      // Create tenant
      const tenant = await storage.createTenant(tenantData);

      // Trigger configuration sync for new tenant
      const { configSyncService } = await import('./services/config-sync');
      await configSyncService.triggerConfigChange({
        type: 'module',
        action: 'enable',
        scope: 'platform',
        targetId: tenant.id,
        config: {
          tenantId: tenant.id,
          enabledModules: tenant.enabledModules,
          moduleConfigs: tenant.moduleConfigs
        },
        triggeredBy: 'platform-admin'
      });

      // Send onboarding email automatically
      const shouldSendEmail = req.body.sendEmail !== false;
      if (shouldSendEmail) {
        const emailSent = await emailService.sendTenantOnboardingEmail({
          id: tenant.id,
          name: tenant.name,
          orgId: tenant.orgId,
          adminEmail: tenant.adminEmail,
          authApiKey: tenant.authApiKey,
          rbacApiKey: tenant.rbacApiKey
        });

        if (!emailSent) {
          console.warn(`Failed to send onboarding email to ${tenant.adminEmail}`);
        } else {
          console.log(`Onboarding email sent successfully to ${tenant.adminEmail}`);
        }
      }

      console.log(`Tenant created successfully: ${tenant.name} (${tenant.orgId})`);
      console.log(`Admin email: ${tenant.adminEmail}`);

      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }

      console.error('Error creating tenant:', error);
      res.status(500).json({ message: 'Failed to create tenant' });
    }
  });

  // Update tenant status
  app.patch('/api/tenants/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!['pending', 'active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await storage.updateTenantStatus(id, status);

      // Send notification to tenant
      await notificationService.notifyTenantStatusChange(id, status, reason);

      res.json({ message: 'Tenant status updated successfully' });
    } catch (error) {
      console.error('Error updating tenant status:', error);
      res.status(500).json({ message: 'Failed to update tenant status' });
    }
  });

  // Get notifications for a tenant
  app.get('/api/tenants/:id/notifications', async (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const notifications = await notificationService.getNotificationsForTenant(id, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await notificationService.markNotificationAsRead(id);
      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // Authentication routes

  // Enhanced login with MFA support
  app.post('/api/v2/auth/login', async (req, res) => {
    try {
      const { email, password, tenantId, orgId, mfaCode } = req.body;

      if (!email || !password || (!tenantId && !orgId)) {
        return res
          .status(400)
          .json({ message: 'Email, password, and tenantId (or orgId) are required' });
      }

      // If orgId is provided, convert it to tenantId
      let actualTenantId = tenantId;
      if (orgId && !tenantId) {
        const tenant = await storage.getTenantByOrgId(orgId);
        if (!tenant) {
          return res.status(404).json({ message: 'Tenant not found' });
        }
        actualTenantId = tenant.id;
      }

      const { enhancedAuthService } = await import('./services/auth-enhanced');
      const result = await enhancedAuthService.login(
        email,
        password,
        actualTenantId,
        mfaCode,
        req.ip,
        req.get('User-Agent')
      );

      if (!result.success) {
        const statusCode = result.requiresMFA ? 202 : result.lockedUntil ? 423 : 401;
        return res.status(statusCode).json({
          message: result.error,
          requiresMFA: result.requiresMFA,
          mfaTypes: result.mfaTypes,
          lockedUntil: result.lockedUntil
        });
      }

      res.json({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Logout
  app.post('/api/v2/auth/logout', authMiddleware, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);

      if (token) {
        await authService.logout(token);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Verify token
  app.get('/api/v2/auth/verify', authMiddleware, async (req, res) => {
    try {
      // Check if tenant is still active
      const tenant = await storage.getTenant(req.user!.tenantId);

      if (!tenant || tenant.status === 'suspended') {
        return res.status(403).json({
          valid: false,
          error: 'TENANT_SUSPENDED',
          message:
            "Your organization's account has been suspended. Please contact your administrator.",
          tenant: tenant
            ? {
                name: tenant.name,
                status: tenant.status,
                adminEmail: tenant.adminEmail
              }
            : null
        });
      }

      res.json({
        valid: true,
        user: req.user,
        tenant: {
          name: tenant.name,
          status: tenant.status,
          orgId: tenant.orgId
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        valid: false,
        error: 'VERIFICATION_ERROR',
        message: 'Unable to verify account status'
      });
    }
  });

  // Get current authenticated user
  app.get('/api/v2/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const tenant = await storage.getTenant(user.tenantId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
              orgId: tenant.orgId,
              plan: tenant.plan
            }
          : null
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ message: 'Failed to fetch user information' });
    }
  });

  // Register new user
  app.post('/api/v2/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, tenantId, inviteToken } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res
          .status(400)
          .json({ message: 'Email, password, first name, and last name are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      // Validate invite token if provided
      if (inviteToken && tenantId) {
        const isValidInvite = await storage.validateInviteToken(inviteToken, tenantId);
        if (!isValidInvite) {
          return res.status(400).json({ message: 'Invalid invite token' });
        }
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId: tenantId || null,
        role: tenantId ? 'user' : 'admin', // If registering with tenant, default to user
        status: 'active'
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          tenantId: newUser.tenantId,
          role: newUser.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // Log registration activity
      await storage.logSystemActivity({
        tenantId: newUser.tenantId,
        userId: newUser.id,
        action: 'user_registered',
        entityType: 'user',
        entityId: newUser.id,
        details: { email, firstName, lastName },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Send welcome email
      if (emailService) {
        try {
          await emailService.sendWelcomeEmail(email, firstName);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail registration if email fails
        }
      }

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          tenantId: newUser.tenantId,
          status: newUser.status
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  // Refresh token
  app.post('/api/v2/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
      }

      const newToken = await authService.refreshToken(refreshToken);

      if (!newToken) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      res.json({ token: newToken });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Token refresh failed' });
    }
  });

  // MFA Routes

  // Setup TOTP MFA
  app.post('/api/v2/auth/mfa/totp/setup', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { enhancedAuthService } = await import('./services/auth-enhanced');

      const mfaSetup = await enhancedAuthService.setupTOTP(userId);

      res.json({
        secret: mfaSetup.secret,
        qrCodeUrl: mfaSetup.qrCodeUrl,
        backupCodes: mfaSetup.backupCodes
      });
    } catch (error) {
      console.error('TOTP setup error:', error);
      res.status(500).json({ message: 'Failed to setup TOTP' });
    }
  });

  // Verify and enable TOTP MFA
  app.post('/api/v2/auth/mfa/totp/verify', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'TOTP token is required' });
      }

      const { enhancedAuthService } = await import('./services/auth-enhanced');
      const verified = await enhancedAuthService.verifyAndEnableTOTP(userId, token);

      if (verified) {
        res.json({ message: 'TOTP enabled successfully' });
      } else {
        res.status(400).json({ message: 'Invalid TOTP token' });
      }
    } catch (error) {
      console.error('TOTP verification error:', error);
      res.status(500).json({ message: 'Failed to verify TOTP' });
    }
  });

  // Get user MFA settings
  app.get('/api/v2/auth/mfa', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { enhancedAuthService } = await import('./services/auth-enhanced');

      const mfaSettings = await enhancedAuthService.getUserMFASettings(userId);

      // Remove sensitive information
      const sanitizedSettings = mfaSettings.map(mfa => ({
        id: mfa.id,
        mfaType: mfa.mfaType,
        isEnabled: mfa.isEnabled,
        isVerified: mfa.isVerified,
        lastUsed: mfa.lastUsed,
        createdAt: mfa.createdAt
      }));

      res.json(sanitizedSettings);
    } catch (error) {
      console.error('Error fetching MFA settings:', error);
      res.status(500).json({ message: 'Failed to fetch MFA settings' });
    }
  });

  // Disable MFA
  app.delete('/api/v2/auth/mfa/:mfaType', authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const { mfaType } = req.params;

      const { enhancedAuthService } = await import('./services/auth-enhanced');
      const disabled = await enhancedAuthService.disableMFA(userId, mfaType);

      if (disabled) {
        res.json({ message: `${mfaType.toUpperCase()} MFA disabled successfully` });
      } else {
        res.status(404).json({ message: 'MFA setting not found' });
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      res.status(500).json({ message: 'Failed to disable MFA' });
    }
  });

  // SAML SSO Routes

  // Get SAML login URL
  app.get('/api/v2/auth/saml/:tenantId/login', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { relayState } = req.query;

      const { samlService } = await import('./services/saml');
      const loginUrl = await samlService.generateAuthRequest(tenantId, relayState as string);

      res.json({ loginUrl });
    } catch (error) {
      console.error('SAML login URL error:', error);
      res.status(500).json({ message: 'Failed to generate SAML login URL' });
    }
  });

  // SAML ACS (Assertion Consumer Service) endpoint
  app.post('/api/v2/auth/saml/:tenantId/acs', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { SAMLResponse, RelayState } = req.body;

      if (!SAMLResponse) {
        return res.status(400).json({ message: 'SAML response is required' });
      }

      const { samlService } = await import('./services/saml');
      const result = await samlService.processResponse(
        tenantId,
        SAMLResponse,
        RelayState,
        req.ip,
        req.get('User-Agent')
      );

      if (result.success) {
        res.json({
          token: result.token,
          user: result.user
        });
      } else {
        res.status(401).json({ message: result.error });
      }
    } catch (error) {
      console.error('SAML ACS error:', error);
      res.status(500).json({ message: 'Failed to process SAML response' });
    }
  });

  // SAML metadata endpoint
  app.get('/api/v2/auth/saml/:tenantId/metadata', async (req, res) => {
    try {
      const { tenantId } = req.params;

      const { samlService } = await import('./services/saml');
      const metadata = await samlService.generateMetadata(tenantId);

      res.set('Content-Type', 'application/xml');
      res.send(metadata);
    } catch (error) {
      console.error('SAML metadata error:', error);
      res.status(500).json({ message: 'Failed to generate SAML metadata' });
    }
  });

  // Admin Routes for Security Management

  // Get login attempts history
  app.get('/api/v2/auth/admin/login-attempts', authMiddleware, async (req, res) => {
    try {
      const { email, tenantId, limit = 50, offset = 0 } = req.query;

      const { enhancedAuthService } = await import('./services/auth-enhanced');
      const attempts = await enhancedAuthService.getLoginHistory({
        email: email as string,
        tenantId: tenantId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(attempts);
    } catch (error) {
      console.error('Error fetching login attempts:', error);
      res.status(500).json({ message: 'Failed to fetch login attempts' });
    }
  });

  // Unlock account
  app.post('/api/v2/auth/admin/unlock', authMiddleware, async (req, res) => {
    try {
      const { email } = req.body;
      const adminUserId = (req as any).user.userId;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const { enhancedAuthService } = await import('./services/auth-enhanced');
      const unlocked = await enhancedAuthService.unlockAccount(email, adminUserId);

      if (unlocked) {
        res.json({ message: 'Account unlocked successfully' });
      } else {
        res.status(404).json({ message: 'No active lockout found for this account' });
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      res.status(500).json({ message: 'Failed to unlock account' });
    }
  });

  // Protected routes with auth middleware

  // Get users (tenant-specific)
  app.get('/api/v2/auth/users', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      // Implementation would get users for the authenticated tenant
      res.json({ message: 'Users endpoint - to be implemented' });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // RBAC routes
  app.get('/api/v2/rbac/roles', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const roles = await storage.getRolesByTenant(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  // Tenant User Management Routes

  // Get all users for a tenant
  app.get('/api/tenants/:tenantId/users', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await storage.getTenantUsers(tenantId, limit, offset);
      res.json(users);
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Create a new tenant user
  app.post('/api/tenants/:tenantId/users', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const userData = { ...req.body, tenantId };

      // Validate required fields
      if (!userData.email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user already exists
      const existingUser = await storage.getTenantUserByEmail(tenantId, userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password if provided
      if (userData.password) {
        const bcrypt = await import('bcryptjs');
        userData.passwordHash = await bcrypt.hash(userData.password, 10);
        delete userData.password;
      }

      const user = await storage.createTenantUser(userData);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_user_created',
        entityType: 'tenant_user',
        entityId: user.id,
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating tenant user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Get a specific tenant user
  app.get('/api/tenants/:tenantId/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getTenantUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching tenant user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update a tenant user
  app.patch('/api/tenants/:tenantId/users/:userId', async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const updates = req.body;

      // Hash password if provided
      if (updates.password) {
        const bcrypt = await import('bcryptjs');
        updates.passwordHash = await bcrypt.hash(updates.password, 10);
        delete updates.password;
      }

      const user = await storage.updateTenantUser(userId, updates);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_user_updated',
        entityType: 'tenant_user',
        entityId: userId,
        details: { updatedFields: Object.keys(updates) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating tenant user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete a tenant user
  app.delete('/api/tenants/:tenantId/users/:userId', async (req, res) => {
    try {
      const { tenantId, userId } = req.params;

      // Get user details for logging
      const user = await storage.getTenantUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteTenantUser(userId);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_user_deleted',
        entityType: 'tenant_user',
        entityId: userId,
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting tenant user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Tenant Role Management Routes

  // Get all roles for a tenant
  app.get('/api/tenants/:tenantId/roles', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching tenant roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  // Create a new tenant role
  app.post('/api/tenants/:tenantId/roles', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roleData = { ...req.body, tenantId };

      const role = await storage.createTenantRole(roleData);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_role_created',
        entityType: 'tenant_role',
        entityId: role.id,
        details: { name: role.name, permissions: role.permissions },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating tenant role:', error);
      res.status(500).json({ message: 'Failed to create role' });
    }
  });

  // Update a tenant role
  app.patch('/api/tenants/:tenantId/roles/:roleId', async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;
      const updates = req.body;

      const role = await storage.updateTenantRole(roleId, updates);

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_role_updated',
        entityType: 'tenant_role',
        entityId: roleId,
        details: { updatedFields: Object.keys(updates) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(role);
    } catch (error) {
      console.error('Error updating tenant role:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // Delete a tenant role
  app.delete('/api/tenants/:tenantId/roles/:roleId', async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;

      // Get role details for logging
      const role = await storage.getTenantRole(roleId);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      await storage.deleteTenantRole(roleId);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_role_deleted',
        entityType: 'tenant_role',
        entityId: roleId,
        details: { name: role.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting tenant role:', error);
      res.status(500).json({ message: 'Failed to delete role' });
    }
  });

  // User Role Assignment Routes

  // Permission Management Routes

  // Get all permissions
  app.get('/api/permissions', authMiddleware, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Failed to fetch permissions' });
    }
  });

  // Create new permission
  app.post('/api/permissions', authMiddleware, async (req, res) => {
    try {
      const { name, description, category, resource, action } = req.body;

      if (!name || !category || !resource || !action) {
        return res.status(400).json({
          message: 'Name, category, resource, and action are required'
        });
      }

      const permission = await storage.createPermission({
        name,
        description,
        category,
        resource,
        action
      });

      // Log the activity
      await storage.logSystemActivity({
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        action: 'permission_created',
        entityType: 'permission',
        entityId: permission.id,
        details: { name, category, resource, action },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(permission);
    } catch (error) {
      console.error('Error creating permission:', error);
      res.status(500).json({ message: 'Failed to create permission' });
    }
  });

  // Get permission by ID
  app.get('/api/permissions/:permissionId', authMiddleware, async (req, res) => {
    try {
      const { permissionId } = req.params;
      const permission = await storage.getPermission(permissionId);

      if (!permission) {
        return res.status(404).json({ message: 'Permission not found' });
      }

      res.json(permission);
    } catch (error) {
      console.error('Error fetching permission:', error);
      res.status(500).json({ message: 'Failed to fetch permission' });
    }
  });

  // Update permission
  app.put('/api/permissions/:permissionId', authMiddleware, async (req, res) => {
    try {
      const { permissionId } = req.params;
      const updates = req.body;

      const permission = await storage.updatePermission(permissionId, updates);

      if (!permission) {
        return res.status(404).json({ message: 'Permission not found' });
      }

      // Log the activity
      await storage.logSystemActivity({
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        action: 'permission_updated',
        entityType: 'permission',
        entityId: permissionId,
        details: { updatedFields: Object.keys(updates) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(permission);
    } catch (error) {
      console.error('Error updating permission:', error);
      res.status(500).json({ message: 'Failed to update permission' });
    }
  });

  // Delete permission
  app.delete('/api/permissions/:permissionId', authMiddleware, async (req, res) => {
    try {
      const { permissionId } = req.params;

      // Get permission details for logging
      const permission = await storage.getPermission(permissionId);
      if (!permission) {
        return res.status(404).json({ message: 'Permission not found' });
      }

      await storage.deletePermission(permissionId);

      // Log the activity
      await storage.logSystemActivity({
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        action: 'permission_deleted',
        entityType: 'permission',
        entityId: permissionId,
        details: { name: permission.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Permission deleted successfully' });
    } catch (error) {
      console.error('Error deleting permission:', error);
      res.status(500).json({ message: 'Failed to delete permission' });
    }
  });

  // Role-Permission Assignment Routes

  // Get permissions for a role
  app.get(
    '/api/tenants/:tenantId/roles/:roleId/permissions',
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
      try {
        const { roleId } = req.params;
        const permissions = await storage.getRolePermissions(roleId);
        res.json(permissions);
      } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ message: 'Failed to fetch role permissions' });
      }
    }
  );

  // Assign permission to role
  app.post(
    '/api/tenants/:tenantId/roles/:roleId/permissions',
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
      try {
        const { tenantId, roleId } = req.params;
        const { permissionId } = req.body;

        if (!permissionId) {
          return res.status(400).json({ message: 'Permission ID is required' });
        }

        const assignment = await storage.assignPermissionToRole(roleId, permissionId);

        // Log the activity
        await storage.logSystemActivity({
          tenantId,
          userId: req.user?.id,
          action: 'role_permission_assigned',
          entityType: 'role_permission',
          entityId: `${roleId}-${permissionId}`,
          details: { roleId, permissionId },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(201).json(assignment);
      } catch (error) {
        console.error('Error assigning permission to role:', error);
        res.status(500).json({ message: 'Failed to assign permission' });
      }
    }
  );

  // Remove permission from role
  app.delete(
    '/api/tenants/:tenantId/roles/:roleId/permissions/:permissionId',
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
      try {
        const { tenantId, roleId, permissionId } = req.params;

        await storage.removePermissionFromRole(roleId, permissionId);

        // Log the activity
        await storage.logSystemActivity({
          tenantId,
          userId: req.user?.id,
          action: 'role_permission_removed',
          entityType: 'role_permission',
          entityId: `${roleId}-${permissionId}`,
          details: { roleId, permissionId },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Permission removed from role successfully' });
      } catch (error) {
        console.error('Error removing permission from role:', error);
        res.status(500).json({ message: 'Failed to remove permission' });
      }
    }
  );

  // Assign role to user
  app.post('/api/tenants/:tenantId/users/:userId/roles', async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { roleId } = req.body;

      const assignment = await storage.assignTenantUserRole({
        tenantId,
        userId,
        roleId
      });

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_user_role_assigned',
        entityType: 'tenant_user_role',
        entityId: assignment.id,
        details: { userId, roleId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error assigning role to user:', error);
      res.status(500).json({ message: 'Failed to assign role' });
    }
  });

  // Get user roles
  app.get('/api/tenants/:tenantId/users/:userId/roles', async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const roles = await storage.getTenantUserRoles(tenantId, userId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({ message: 'Failed to fetch user roles' });
    }
  });

  // Remove role from user
  app.delete('/api/tenants/:tenantId/users/:userId/roles/:roleId', async (req, res) => {
    try {
      const { tenantId, userId, roleId } = req.params;

      await storage.removeTenantUserRole(userId, roleId);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'tenant_user_role_removed',
        entityType: 'tenant_user_role',
        entityId: `${userId}-${roleId}`,
        details: { userId, roleId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Role removed from user successfully' });
    } catch (error) {
      console.error('Error removing role from user:', error);
      res.status(500).json({ message: 'Failed to remove role' });
    }
  });

  // Resend onboarding email
  app.post('/api/tenants/:id/resend-email', async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenant(id);

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      const emailSent = await emailService.sendTenantOnboardingEmail({
        id: tenant.id,
        name: tenant.name,
        orgId: tenant.orgId,
        adminEmail: tenant.adminEmail,
        authApiKey: tenant.authApiKey,
        rbacApiKey: tenant.rbacApiKey
      });

      if (emailSent) {
        res.json({ message: 'Onboarding email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send onboarding email' });
      }
    } catch (error) {
      console.error('Error resending email:', error);
      res.status(500).json({ message: 'Failed to resend email' });
    }
  });

  // OAuth routes

  // Azure AD OAuth initiation
  app.get('/api/oauth/azure-ad/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      // Check if Azure AD is enabled for this tenant
      const enabledModules = (tenant.enabledModules as string[]) || [];
      if (!enabledModules.includes('azure-ad')) {
        return res.status(400).json({ message: 'Azure AD not enabled for this tenant' });
      }

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const azureConfig = moduleConfigs['azure-ad'];

      if (
        !azureConfig ||
        !azureConfig.tenantId ||
        !azureConfig.clientId ||
        !azureConfig.clientSecret
      ) {
        return res.status(400).json({ message: 'Azure AD not properly configured' });
      }

      const azureService = AzureADService.createFromTenantConfig({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/azure-ad/callback`
      });

      const authUrl = await azureService.getAuthorizationUrl(['User.Read']);

      res.json({ authUrl });
    } catch (error) {
      console.error('Error initiating Azure AD OAuth:', error);
      res.status(500).json({ message: 'Failed to initiate OAuth' });
    }
  });

  // Azure AD OAuth callback
  app.get('/api/oauth/azure-ad/callback', async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ message: 'Authorization code not provided' });
      }

      // For now, redirect to success page with code
      // In production, you'd validate the code and create a user session
      res.redirect(`/auth-success?code=${code}&provider=azure-ad`);
    } catch (error) {
      console.error('Azure AD callback error:', error);
      res.status(500).json({ message: 'OAuth callback failed' });
    }
  });

  // Auth0 OAuth initiation
  app.get('/api/oauth/auth0/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      // Check if Auth0 is enabled for this tenant
      const enabledModules = (tenant.enabledModules as string[]) || [];
      if (!enabledModules.includes('auth0')) {
        return res.status(400).json({ message: 'Auth0 not enabled for this tenant' });
      }

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const auth0Config = moduleConfigs['auth0'];

      if (
        !auth0Config ||
        !auth0Config.domain ||
        !auth0Config.clientId ||
        !auth0Config.clientSecret
      ) {
        return res.status(400).json({ message: 'Auth0 not properly configured' });
      }

      const { Auth0Service } = await import('./services/oauth/auth0');
      const auth0Service = new Auth0Service({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`
      });

      const state = auth0Service.generateState(orgId);
      const authUrl = auth0Service.getAuthUrl(state);

      res.redirect(authUrl);
    } catch (error) {
      console.error('Auth0 OAuth error:', error);
      res.status(500).json({ message: 'OAuth initialization failed' });
    }
  });

  // Auth0 OAuth callback
  app.get('/api/oauth/auth0/callback', async (req, res) => {
    try {
      const { code, state } = req.query as { code: string; state: string };

      if (!code || !state) {
        return res.status(400).json({ message: 'Missing code or state parameter' });
      }

      const { Auth0Service } = await import('./services/oauth/auth0');
      const auth0Service = new Auth0Service({
        domain: 'temp', // Will be replaced with actual config
        clientId: 'temp',
        clientSecret: 'temp',
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`
      });

      const stateData = auth0Service.parseState(state);
      if (!stateData) {
        return res.status(400).json({ message: 'Invalid state parameter' });
      }

      const tenant = await storage.getTenantByOrgId(stateData.tenantOrgId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const auth0Config = moduleConfigs['auth0'];

      // Recreate service with actual config
      const configuredAuth0Service = new Auth0Service({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`
      });

      const result = await configuredAuth0Service.handleCallback(code, state, tenant);

      if (!result) {
        return res.status(401).json({ message: 'OAuth authentication failed' });
      }

      // Redirect to tenant dashboard with token
      const redirectUrl = `/tenant/${tenant.orgId}/dashboard?token=${result.token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Auth0 callback error:', error);
      res.status(500).json({ message: 'OAuth callback failed' });
    }
  });

  // =============================================================================
  // TENANT USERS & ROLES CRUD API (For tenant portals)
  // =============================================================================

  // Tenant Users CRUD
  app.post('/api/tenants/:tenantId/users', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { roleId, ...userDataRaw } = req.body;
      const userData = insertTenantUserSchema.parse({ ...userDataRaw, tenantId });

      // Check if user already exists
      const existingUser = await storage.getTenantUserByEmail(tenantId, userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const newUser = await storage.createTenantUser(userData);

      // Assign role if provided
      if (roleId) {
        await storage.assignTenantUserRole({
          tenantId,
          userId: newUser.id,
          roleId
        });
      }

      // Fetch user with roles to return complete data
      const userWithRoles = await storage.getTenantUsers(tenantId, 1, 0);
      const createdUser = userWithRoles.find(u => u.id === newUser.id);

      res.status(201).json(createdUser || newUser);
    } catch (error) {
      console.error('Error creating tenant user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.get('/api/tenants/:tenantId/users', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const users = await storage.getTenantUsers(
        tenantId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(users);
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/tenants/:tenantId/roles', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching tenant roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  // Create a new tenant-specific role
  app.post('/api/tenants/:tenantId/roles', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { name, description, permissions, isSystem } = req.body;

      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
      }

      // Check if role name already exists for this tenant
      const existingRoles = await storage.getTenantRoles(tenantId);
      const roleExists = existingRoles.some(role => role.name.toLowerCase() === name.toLowerCase());

      if (roleExists) {
        return res.status(400).json({ message: 'A role with this name already exists' });
      }

      // Create the role
      const newRole = await storage.createTenantRole({
        tenantId,
        name,
        description,
        permissions: permissions || [],
        isSystem: isSystem || false
      });

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'role_created',
        entityType: 'tenant_role',
        entityId: newRole.id,
        details: { name, permissions: permissions || [] },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(newRole);
    } catch (error) {
      console.error('Error creating tenant role:', error);
      res.status(500).json({ message: 'Failed to create role' });
    }
  });

  // Update a tenant-specific role
  app.patch('/api/tenants/:tenantId/roles/:roleId', async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;
      const { name, description, permissions, isSystem } = req.body;

      // Get the existing role to check if it's a system role
      const existingRoles = await storage.getTenantRoles(tenantId);
      const existingRole = existingRoles.find(role => role.id === roleId);

      if (!existingRole) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Prevent modification of system roles (names only, permissions can be modified)
      if (existingRole.isSystem && name && name !== existingRole.name) {
        return res.status(400).json({ message: 'System role names cannot be modified' });
      }

      // Check for name conflicts if name is being changed
      if (name && name !== existingRole.name) {
        const roleExists = existingRoles.some(
          role => role.id !== roleId && role.name.toLowerCase() === name.toLowerCase()
        );

        if (roleExists) {
          return res.status(400).json({ message: 'A role with this name already exists' });
        }
      }

      // Update the role
      const updatedRole = await storage.updateTenantRole(roleId, {
        name: name || existingRole.name,
        description: description || existingRole.description,
        permissions: permissions || existingRole.permissions,
        isSystem: isSystem !== undefined ? isSystem : existingRole.isSystem
      });

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'role_updated',
        entityType: 'tenant_role',
        entityId: roleId,
        details: {
          name: name || existingRole.name,
          permissions: permissions || existingRole.permissions
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating tenant role:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // Delete a tenant-specific role
  app.delete('/api/tenants/:tenantId/roles/:roleId', async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;

      // Get the existing role to check if it's a system role
      const existingRoles = await storage.getTenantRoles(tenantId);
      const existingRole = existingRoles.find(role => role.id === roleId);

      if (!existingRole) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Prevent deletion of system roles
      if (existingRole.isSystem) {
        return res.status(400).json({ message: 'System roles cannot be deleted' });
      }

      // Check if any users are assigned to this role
      const tenantUsers = await storage.getTenantUsers(tenantId, 1000, 0); // Get all users
      const usersWithRole = tenantUsers.filter(
        user => (user as any).roles && (user as any).roles.some((role: any) => role.id === roleId)
      );

      if (usersWithRole.length > 0) {
        return res.status(400).json({
          message: `Cannot delete role. ${usersWithRole.length} user(s) are currently assigned to this role.`,
          usersCount: usersWithRole.length
        });
      }

      // Delete the role
      await storage.deleteTenantRole(roleId);

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'role_deleted',
        entityType: 'tenant_role',
        entityId: roleId,
        details: { name: existingRole.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting tenant role:', error);
      res.status(500).json({ message: 'Failed to delete role' });
    }
  });

  // Update tenant RBAC configuration
  app.patch('/api/tenants/:tenantId/rbac-config', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { permissionTemplate, businessType } = req.body;

      // Get current tenant data
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      // Update module configuration
      const currentModuleConfigs = (tenant as any).moduleConfigs || {};
      const updatedModuleConfigs = {
        ...currentModuleConfigs,
        rbac: {
          ...currentModuleConfigs.rbac,
          permissionTemplate,
          businessType
        }
      };

      // Update tenant with new RBAC configuration
      await storage.updateTenantModules(
        tenantId,
        tenant.enabledModules as string[],
        updatedModuleConfigs
      );

      // Trigger configuration sync event
      const { configSyncService } = await import('./services/config-sync');
      await configSyncService.triggerConfigChange({
        type: 'rbac',
        action: 'update',
        scope: 'tenant',
        targetId: tenantId,
        config: { permissionTemplate, businessType },
        triggeredBy: 'tenant-admin'
      });

      // Create/update default roles based on new configuration if business type changed
      if (businessType && businessType !== currentModuleConfigs.rbac?.businessType) {
        // Get business type data
        const businessTypes = await storage.getBusinessTypes();
        const selectedBusinessType = businessTypes.find(
          bt => bt.name.toLowerCase().replace(/\s+/g, '-') === businessType
        );

        // Get default roles for this business type
        if (selectedBusinessType) {
          const defaultRoles = await storage.getDefaultRolesByBusinessType(selectedBusinessType.id);

          // Create new default roles for the tenant if they don't exist
          for (const defaultRole of defaultRoles) {
            const existingRole = await storage.getTenantRoles(tenantId);
            const roleExists = existingRole.some(role => role.name === defaultRole.name);

            if (!roleExists) {
              await storage.createTenantRole({
                tenantId,
                name: defaultRole.name,
                description: defaultRole.description,
                permissions: defaultRole.permissions,
                isSystem: defaultRole.isSystemRole
              });
            }
          }
        }
      }

      // Log the activity
      await storage.logSystemActivity({
        tenantId,
        action: 'rbac_config_updated',
        entityType: 'tenant',
        entityId: tenantId,
        details: { permissionTemplate, businessType },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'RBAC configuration updated successfully',
        config: { permissionTemplate, businessType }
      });
    } catch (error) {
      console.error('Error updating RBAC configuration:', error);
      res.status(500).json({ message: 'Failed to update RBAC configuration' });
    }
  });

  // =============================================================================
  // PLATFORM ADMIN RBAC CONFIGURATION API
  // =============================================================================

  // Permission Templates
  app.get('/api/rbac-config/permission-templates', async (req, res) => {
    try {
      const templates = await storage.getPermissionTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching permission templates:', error);
      res.status(500).json({ message: 'Failed to fetch permission templates' });
    }
  });

  app.post('/api/rbac-config/permission-templates', async (req, res) => {
    try {
      const templateData = insertPermissionTemplateSchema.parse(req.body);
      const template = await storage.createPermissionTemplate(templateData);

      // Trigger configuration sync to all tenants using this template
      const { configSyncService } = await import('./services/config-sync');
      await configSyncService.triggerConfigChange({
        type: 'rbac',
        action: 'create',
        scope: 'platform',
        config: { permissionTemplate: template },
        triggeredBy: 'platform-admin'
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating permission template:', error);
      res.status(500).json({ message: 'Failed to create permission template' });
    }
  });

  app.get('/api/rbac-config/permission-templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPermissionTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Permission template not found' });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching permission template:', error);
      res.status(500).json({ message: 'Failed to fetch permission template' });
    }
  });

  app.put('/api/rbac-config/permission-templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertPermissionTemplateSchema.partial().parse(req.body);
      const template = await storage.updatePermissionTemplate(id, updateData);

      // Trigger configuration sync to all tenants using this template
      const { configSyncService } = await import('./services/config-sync');
      await configSyncService.triggerConfigChange({
        type: 'rbac',
        action: 'update',
        scope: 'platform',
        config: { permissionTemplate: template },
        triggeredBy: 'platform-admin'
      });

      res.json(template);
    } catch (error) {
      console.error('Error updating permission template:', error);
      res.status(500).json({ message: 'Failed to update permission template' });
    }
  });

  app.delete('/api/rbac-config/permission-templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePermissionTemplate(id);
      res.json({ message: 'Permission template deleted successfully' });
    } catch (error) {
      console.error('Error deleting permission template:', error);
      res.status(500).json({ message: 'Failed to delete permission template' });
    }
  });

  // Business Types
  app.get('/api/rbac-config/business-types', async (req, res) => {
    try {
      const businessTypes = await storage.getBusinessTypes();
      res.json(businessTypes);
    } catch (error) {
      console.error('Error fetching business types:', error);
      res.status(500).json({ message: 'Failed to fetch business types' });
    }
  });

  app.post('/api/rbac-config/business-types', async (req, res) => {
    try {
      const businessTypeData = insertBusinessTypeSchema.parse(req.body);
      const businessType = await storage.createBusinessType(businessTypeData);
      res.status(201).json(businessType);
    } catch (error) {
      console.error('Error creating business type:', error);
      res.status(500).json({ message: 'Failed to create business type' });
    }
  });

  app.get('/api/rbac-config/business-types/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const businessType = await storage.getBusinessType(id);
      if (!businessType) {
        return res.status(404).json({ message: 'Business type not found' });
      }
      res.json(businessType);
    } catch (error) {
      console.error('Error fetching business type:', error);
      res.status(500).json({ message: 'Failed to fetch business type' });
    }
  });

  app.put('/api/rbac-config/business-types/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertBusinessTypeSchema.partial().parse(req.body);
      const businessType = await storage.updateBusinessType(id, updateData);
      res.json(businessType);
    } catch (error) {
      console.error('Error updating business type:', error);
      res.status(500).json({ message: 'Failed to update business type' });
    }
  });

  app.delete('/api/rbac-config/business-types/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBusinessType(id);
      res.json({ message: 'Business type deleted successfully' });
    } catch (error) {
      console.error('Error deleting business type:', error);
      res.status(500).json({ message: 'Failed to delete business type' });
    }
  });

  // Default Roles
  app.get('/api/rbac-config/default-roles', async (req, res) => {
    try {
      const defaultRoles = await storage.getDefaultRoles();
      res.json(defaultRoles);
    } catch (error) {
      console.error('Error fetching default roles:', error);
      res.status(500).json({ message: 'Failed to fetch default roles' });
    }
  });

  app.post('/api/rbac-config/default-roles', async (req, res) => {
    try {
      const roleData = insertDefaultRoleSchema.parse(req.body);
      const role = await storage.createDefaultRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating default role:', error);
      res.status(500).json({ message: 'Failed to create default role' });
    }
  });

  app.get('/api/rbac-config/default-roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const role = await storage.getDefaultRole(id);
      if (!role) {
        return res.status(404).json({ message: 'Default role not found' });
      }
      res.json(role);
    } catch (error) {
      console.error('Error fetching default role:', error);
      res.status(500).json({ message: 'Failed to fetch default role' });
    }
  });

  app.put('/api/rbac-config/default-roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertDefaultRoleSchema.partial().parse(req.body);
      const role = await storage.updateDefaultRole(id, updateData);
      res.json(role);
    } catch (error) {
      console.error('Error updating default role:', error);
      res.status(500).json({ message: 'Failed to update default role' });
    }
  });

  app.delete('/api/rbac-config/default-roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDefaultRole(id);
      res.json({ message: 'Default role deleted successfully' });
    } catch (error) {
      console.error('Error deleting default role:', error);
      res.status(500).json({ message: 'Failed to delete default role' });
    }
  });

  app.get('/api/rbac-config/default-roles/business-type/:businessTypeId', async (req, res) => {
    try {
      const { businessTypeId } = req.params;
      const roles = await storage.getDefaultRolesByBusinessType(businessTypeId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching default roles by business type:', error);
      res.status(500).json({ message: 'Failed to fetch default roles' });
    }
  });

  // Seed sample RBAC configuration data for testing
  app.post('/api/rbac-config/seed-sample-data', async (req, res) => {
    try {
      // Create sample permission templates
      const standardTemplate = await storage.createPermissionTemplate({
        name: 'Standard Business Template',
        description: 'Basic set of permissions for general business operations',
        permissions: [
          'read_users',
          'create_users',
          'update_users',
          'manage_settings',
          'read_reports'
        ],
        businessTypes: ['general'],
        isDefault: true,
        isActive: true
      });

      const healthcareTemplate = await storage.createPermissionTemplate({
        name: 'Healthcare Compliance Template',
        description: 'HIPAA-compliant permissions for healthcare organizations',
        permissions: [
          'read_users',
          'patient_data_access',
          'hipaa_audit_access',
          'compliance_reports',
          'security_logs'
        ],
        businessTypes: ['healthcare'],
        isDefault: false,
        isActive: true
      });

      const bankingTemplate = await storage.createPermissionTemplate({
        name: 'Banking Regulatory Template',
        description: 'Comprehensive banking permissions with regulatory compliance',
        permissions: [
          'read_users',
          'create_users',
          'financial_data_access',
          'transaction_processing',
          'account_management',
          'wire_transfers',
          'loan_processing',
          'credit_analysis',
          'aml_monitoring',
          'kyc_verification',
          'regulatory_reporting',
          'sox_compliance_access',
          'basel_reporting',
          'risk_assessment',
          'fraud_detection',
          'audit_trail_access'
        ],
        businessTypes: ['banking'],
        isDefault: false,
        isActive: true
      });

      const insuranceTemplate = await storage.createPermissionTemplate({
        name: 'Insurance Operations Template',
        description: 'Insurance-specific permissions for policy and claims management',
        permissions: [
          'read_users',
          'create_users',
          'policy_management',
          'claims_processing',
          'underwriting_access',
          'actuarial_data_access',
          'premium_calculation',
          'risk_modeling',
          'insurance_compliance_reports',
          'solvency_reporting',
          'reinsurance_management',
          'regulatory_filings'
        ],
        businessTypes: ['insurance'],
        isDefault: false,
        isActive: true
      });

      // Create sample business types
      const generalBusiness = await storage.createBusinessType({
        name: 'General Business',
        description: 'Standard business operations with basic compliance requirements',
        requiredCompliance: [],
        defaultPermissions: ['read_users', 'manage_settings'],
        riskLevel: 'low',
        isActive: true,
        maxTenants: null
      });

      const healthcareBusiness = await storage.createBusinessType({
        name: 'Healthcare',
        description: 'Healthcare providers and medical facilities with HIPAA compliance',
        requiredCompliance: ['hipaa'],
        defaultPermissions: ['read_users', 'patient_data_access', 'compliance_reports'],
        riskLevel: 'high',
        isActive: true,
        maxTenants: 100
      });

      const financeBusiness = await storage.createBusinessType({
        name: 'Financial Services',
        description: 'Financial institutions with SOX and PCI compliance requirements',
        requiredCompliance: ['sox', 'pci'],
        defaultPermissions: ['read_users', 'financial_data_access', 'security_logs'],
        riskLevel: 'critical',
        isActive: true,
        maxTenants: 50
      });

      const bankingBusiness = await storage.createBusinessType({
        name: 'Banking',
        description: 'Commercial and retail banks with comprehensive regulatory oversight',
        requiredCompliance: ['basel-iii', 'dodd-frank', 'ffiec', 'glba', 'bsa-aml', 'sox', 'pci'],
        defaultPermissions: [
          'read_users',
          'financial_data_access',
          'transaction_processing',
          'account_management',
          'aml_monitoring',
          'kyc_verification',
          'regulatory_reporting'
        ],
        riskLevel: 'critical',
        isActive: true,
        maxTenants: 25
      });

      const insuranceBusiness = await storage.createBusinessType({
        name: 'Insurance',
        description: 'Insurance companies with actuarial and solvency requirements',
        requiredCompliance: ['naic', 'solvency-ii', 'ifrs17', 'sox', 'gdpr'],
        defaultPermissions: [
          'read_users',
          'policy_management',
          'claims_processing',
          'underwriting_access',
          'actuarial_data_access',
          'regulatory_filings'
        ],
        riskLevel: 'high',
        isActive: true,
        maxTenants: 30
      });

      // Create sample default roles
      await storage.createDefaultRole({
        name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: [
          'read_users',
          'create_users',
          'update_users',
          'delete_users',
          'manage_roles',
          'manage_permissions',
          'admin_panel_access'
        ],
        businessTypeId: generalBusiness.id,
        permissionTemplateId: standardTemplate.id,
        isSystemRole: true,
        canBeModified: false,
        isActive: true,
        priority: 1
      });

      await storage.createDefaultRole({
        name: 'Manager',
        description: 'Management-level access for supervisory roles',
        permissions: ['read_users', 'update_users', 'read_reports', 'manage_settings'],
        businessTypeId: generalBusiness.id,
        permissionTemplateId: standardTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 2
      });

      await storage.createDefaultRole({
        name: 'Healthcare Admin',
        description: 'Administrative role for healthcare organizations',
        permissions: [
          'read_users',
          'create_users',
          'patient_data_access',
          'hipaa_audit_access',
          'compliance_reports'
        ],
        businessTypeId: healthcareBusiness.id,
        permissionTemplateId: healthcareTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 1
      });

      // Banking specific roles
      await storage.createDefaultRole({
        name: 'Bank Administrator',
        description: 'Senior banking administrator with full system access',
        permissions: [
          'read_users',
          'create_users',
          'update_users',
          'financial_data_access',
          'transaction_processing',
          'account_management',
          'wire_transfers',
          'regulatory_reporting',
          'audit_trail_access',
          'manage_roles'
        ],
        businessTypeId: bankingBusiness.id,
        permissionTemplateId: bankingTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 1
      });

      await storage.createDefaultRole({
        name: 'Compliance Officer',
        description: 'Banking compliance and regulatory oversight',
        permissions: [
          'read_users',
          'aml_monitoring',
          'kyc_verification',
          'regulatory_reporting',
          'sox_compliance_access',
          'basel_reporting',
          'audit_trail_access',
          'risk_assessment'
        ],
        businessTypeId: bankingBusiness.id,
        permissionTemplateId: bankingTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 2
      });

      await storage.createDefaultRole({
        name: 'Bank Teller',
        description: 'Front-line banking operations with limited access',
        permissions: [
          'read_users',
          'account_management',
          'transaction_processing',
          'kyc_verification'
        ],
        businessTypeId: bankingBusiness.id,
        permissionTemplateId: bankingTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 3
      });

      await storage.createDefaultRole({
        name: 'Loan Officer',
        description: 'Credit and loan processing specialist',
        permissions: [
          'read_users',
          'account_management',
          'loan_processing',
          'credit_analysis',
          'kyc_verification',
          'risk_assessment'
        ],
        businessTypeId: bankingBusiness.id,
        permissionTemplateId: bankingTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 4
      });

      // Insurance specific roles
      await storage.createDefaultRole({
        name: 'Insurance Administrator',
        description: 'Senior insurance administrator with full system access',
        permissions: [
          'read_users',
          'create_users',
          'update_users',
          'policy_management',
          'claims_processing',
          'underwriting_access',
          'actuarial_data_access',
          'regulatory_filings',
          'manage_roles'
        ],
        businessTypeId: insuranceBusiness.id,
        permissionTemplateId: insuranceTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 1
      });

      await storage.createDefaultRole({
        name: 'Underwriter',
        description: 'Insurance underwriting and risk assessment',
        permissions: [
          'read_users',
          'policy_management',
          'underwriting_access',
          'actuarial_data_access',
          'risk_modeling',
          'premium_calculation'
        ],
        businessTypeId: insuranceBusiness.id,
        permissionTemplateId: insuranceTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 2
      });

      await storage.createDefaultRole({
        name: 'Claims Adjuster',
        description: 'Insurance claims processing and investigation',
        permissions: ['read_users', 'claims_processing', 'policy_management', 'risk_assessment'],
        businessTypeId: insuranceBusiness.id,
        permissionTemplateId: insuranceTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 3
      });

      await storage.createDefaultRole({
        name: 'Actuary',
        description: 'Actuarial analysis and statistical modeling',
        permissions: [
          'read_users',
          'actuarial_data_access',
          'risk_modeling',
          'premium_calculation',
          'solvency_reporting',
          'catastrophe_modeling'
        ],
        businessTypeId: insuranceBusiness.id,
        permissionTemplateId: insuranceTemplate.id,
        isSystemRole: false,
        canBeModified: true,
        isActive: true,
        priority: 4
      });

      res.json({
        message: 'Sample RBAC configuration data seeded successfully',
        data: {
          permissionTemplates: [
            standardTemplate,
            healthcareTemplate,
            bankingTemplate,
            insuranceTemplate
          ],
          businessTypes: [
            generalBusiness,
            healthcareBusiness,
            financeBusiness,
            bankingBusiness,
            insuranceBusiness
          ],
          defaultRoles: [
            'Administrator',
            'Manager',
            'Healthcare Admin',
            'Bank Administrator',
            'Compliance Officer',
            'Bank Teller',
            'Loan Officer',
            'Insurance Administrator',
            'Underwriter',
            'Claims Adjuster',
            'Actuary'
          ]
        }
      });
    } catch (error) {
      console.error('Error seeding sample data:', error);
      res.status(500).json({ message: 'Failed to seed sample data' });
    }
  });

  // =============================================================================
  // ENHANCED NOTIFICATION SYSTEM API
  // =============================================================================

  // Create notification
  app.post('/api/v2/notifications', authMiddleware, async (req, res) => {
    try {
      const { type, title, message, metadata, options } = req.body;
      const user = (req as any).user;

      const { enhancedNotificationService } = await import('./services/notification-enhanced');

      const notification = await enhancedNotificationService.createNotification(
        user.tenantId,
        { type, title, message, metadata },
        options
      );

      res.json(notification);
    } catch (error) {
      console.error('Failed to create notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  // Get notification delivery status
  app.get('/api/v2/notifications/:id/status', authMiddleware, async (req, res) => {
    try {
      const { enhancedNotificationService } = await import('./services/notification-enhanced');

      const status = await enhancedNotificationService.getDeliveryStatus(req.params.id);
      res.json(status);
    } catch (error) {
      console.error('Failed to get notification status:', error);
      res.status(500).json({ error: 'Failed to get notification status' });
    }
  });

  // Retry failed notification deliveries
  app.post('/api/v2/notifications/:id/retry', authMiddleware, async (req, res) => {
    try {
      const { enhancedNotificationService } = await import('./services/notification-enhanced');

      const { channel } = req.body;
      await enhancedNotificationService.retryFailedDeliveries(req.params.id, channel);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to retry notification:', error);
      res.status(500).json({ error: 'Failed to retry notification' });
    }
  });

  // Get user notification preferences
  app.get('/api/v2/user/notification-preferences', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      const { enhancedNotificationService } = await import('./services/notification-enhanced');

      const preferences = await enhancedNotificationService.getUserPreferences(
        user.userId,
        user.tenantId
      );

      res.json(preferences);
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      res.status(500).json({ error: 'Failed to get notification preferences' });
    }
  });

  // Update user notification preferences
  app.put('/api/v2/user/notification-preferences', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      const { enhancedNotificationService } = await import('./services/notification-enhanced');

      const { category, channels, quietHours, frequency, isEnabled } = req.body;

      const preferences = await enhancedNotificationService.updateUserPreferences(
        user.userId,
        user.tenantId,
        category,
        { channels, quietHours, frequency, isEnabled }
      );

      res.json(preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Register device token for push notifications
  app.post('/api/v2/user/device-tokens', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      const { deviceToken, platform, deviceInfo } = req.body;

      const [created] = await db
        .insert(deviceTokens)
        .values({
          userId: user.userId,
          token: deviceToken,
          platform,
          deviceInfo: deviceInfo || {}
        })
        .returning();

      res.json(created);
    } catch (error) {
      console.error('Failed to register device token:', error);
      res.status(500).json({ error: 'Failed to register device token' });
    }
  });

  // Deactivate device token
  app.delete('/api/v2/user/device-tokens/:token', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      const { eq, and } = await import('drizzle-orm');

      await db
        .update(deviceTokens)
        .set({ isActive: false })
        .where(and(eq(deviceTokens.token, req.params.token), eq(deviceTokens.userId, user.userId)));

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to deactivate device token:', error);
      res.status(500).json({ error: 'Failed to deactivate device token' });
    }
  });

  // Notification configuration routes (admin only)
  app.get('/api/v2/admin/notification-configs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      // Get SMS, Push, and Webhook configurations for tenant
      const { smsConfigs, pushConfigs, webhookConfigs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const [smsConfig, pushConfig, webhookConfig] = await Promise.all([
        db.select().from(smsConfigs).where(eq(smsConfigs.tenantId, user.tenantId)),
        db.select().from(pushConfigs).where(eq(pushConfigs.tenantId, user.tenantId)),
        db.select().from(webhookConfigs).where(eq(webhookConfigs.tenantId, user.tenantId))
      ]);

      res.json({
        sms: smsConfig,
        push: pushConfig,
        webhook: webhookConfig
      });
    } catch (error) {
      console.error('Failed to get notification configs:', error);
      res.status(500).json({ error: 'Failed to get notification configs' });
    }
  });

  // Configure SMS settings
  app.post('/api/v2/admin/notification-configs/sms', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { provider, config } = req.body;

      const { smsConfigs } = await import('@shared/schema');

      const [created] = await db
        .insert(smsConfigs)
        .values({
          tenantId: user.tenantId,
          provider,
          config,
          isActive: true
        })
        .returning();

      // Trigger configuration sync event
      const { configSyncService } = await import('./services/config-sync');
      await configSyncService.triggerConfigChange({
        type: 'notifications',
        action: 'update',
        scope: 'tenant',
        targetId: user.tenantId,
        config: { smsProvider: { provider, config } },
        triggeredBy: user.userId
      });

      res.json(created);
    } catch (error) {
      console.error('Failed to configure SMS:', error);
      res.status(500).json({ error: 'Failed to configure SMS' });
    }
  });

  // Configure Push notification settings
  app.post('/api/v2/admin/notification-configs/push', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { provider, platform, config } = req.body;

      const { pushConfigs } = await import('@shared/schema');

      const [created] = await db
        .insert(pushConfigs)
        .values({
          tenantId: user.tenantId,
          provider,
          platform,
          config,
          isActive: true
        })
        .returning();

      res.json(created);
    } catch (error) {
      console.error('Failed to configure push notifications:', error);
      res.status(500).json({ error: 'Failed to configure push notifications' });
    }
  });

  // Configure Webhook settings
  app.post('/api/v2/admin/notification-configs/webhook', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, url, events, headers, secret, timeout, retryCount } = req.body;

      const { webhookConfigs } = await import('@shared/schema');

      const [created] = await db
        .insert(webhookConfigs)
        .values({
          tenantId: user.tenantId,
          name,
          url,
          events,
          headers: headers || {},
          secret,
          timeout: timeout || 30,
          retryCount: retryCount || 3,
          createdBy: user.userId,
          isActive: true
        })
        .returning();

      res.json(created);
    } catch (error) {
      console.error('Failed to configure webhook:', error);
      res.status(500).json({ error: 'Failed to configure webhook' });
    }
  });

  // =============================================================================
  // BACKUP & INFRASTRUCTURE MANAGEMENT API
  // =============================================================================

  // Backup Configuration Management
  app.get('/api/v2/admin/backup-configs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;

      const { backupConfigurations } = await import('@shared/schema');
      const { eq, or, isNull } = await import('drizzle-orm');

      const configs = await db
        .select()
        .from(backupConfigurations)
        .where(
          or(
            eq(backupConfigurations.tenantId, user.tenantId),
            isNull(backupConfigurations.tenantId) // System-wide backups
          )
        );

      res.json(configs);
    } catch (error) {
      console.error('Failed to get backup configurations:', error);
      res.status(500).json({ error: 'Failed to get backup configurations' });
    }
  });

  app.post('/api/v2/admin/backup-configs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, backupType, schedule, retentionPolicy, destinations, options } = req.body;

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const config = await backupInfrastructureService.createBackupConfiguration({
        tenantId: user.tenantId,
        name,
        backupType,
        schedule,
        retentionPolicy,
        destinations,
        options,
        createdBy: user.userId
      });

      res.json(config);
    } catch (error) {
      console.error('Failed to create backup configuration:', error);
      res.status(500).json({ error: 'Failed to create backup configuration' });
    }
  });

  // Backup Job Management
  app.get('/api/v2/admin/backup-jobs', authMiddleware, async (req, res) => {
    try {
      const { limit = 50, offset = 0, status } = req.query;

      const { backupJobs, backupConfigurations } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');

      let query = db
        .select({
          id: backupJobs.id,
          configurationId: backupJobs.configurationId,
          configurationName: backupConfigurations.name,
          jobType: backupJobs.jobType,
          status: backupJobs.status,
          startedAt: backupJobs.startedAt,
          completedAt: backupJobs.completedAt,
          duration: backupJobs.duration,
          size: backupJobs.size,
          recordCount: backupJobs.recordCount,
          errorMessage: backupJobs.errorMessage,
          createdAt: backupJobs.createdAt
        })
        .from(backupJobs)
        .leftJoin(backupConfigurations, eq(backupJobs.configurationId, backupConfigurations.id))
        .orderBy(desc(backupJobs.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      if (status) {
        query = query.where(eq(backupJobs.status, status as string));
      }

      const jobs = await query;
      res.json(jobs);
    } catch (error) {
      console.error('Failed to get backup jobs:', error);
      res.status(500).json({ error: 'Failed to get backup jobs' });
    }
  });

  app.post('/api/v2/admin/backup-jobs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { configurationId, jobType = 'manual' } = req.body;

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const jobId = await backupInfrastructureService.executeBackup(
        configurationId,
        jobType,
        user.userId
      );

      res.json({ jobId, message: 'Backup job started successfully' });
    } catch (error) {
      console.error('Failed to start backup job:', error);
      res.status(500).json({ error: 'Failed to start backup job' });
    }
  });

  // Restore Job Management
  app.get('/api/v2/admin/restore-jobs', authMiddleware, async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const { restoreJobs } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');

      const jobs = await db
        .select()
        .from(restoreJobs)
        .orderBy(desc(restoreJobs.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json(jobs);
    } catch (error) {
      console.error('Failed to get restore jobs:', error);
      res.status(500).json({ error: 'Failed to get restore jobs' });
    }
  });

  app.post('/api/v2/admin/restore-jobs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { backupJobId, tenantId, restoreType, targetEnvironment, options } = req.body;

      // Require additional approval for production restores
      if (targetEnvironment === 'production' && !req.body.approvedBy) {
        return res.status(403).json({
          error: 'Production restores require explicit approval',
          requiresApproval: true
        });
      }

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const jobId = await backupInfrastructureService.createRestoreJob({
        backupJobId,
        tenantId,
        restoreType,
        targetEnvironment,
        options,
        triggeredBy: user.userId
      });

      res.json({ jobId, message: 'Restore job created successfully' });
    } catch (error) {
      console.error('Failed to create restore job:', error);
      res.status(500).json({ error: 'Failed to create restore job' });
    }
  });

  // Infrastructure Service Monitoring
  app.get('/api/v2/admin/infrastructure-services', authMiddleware, async (req, res) => {
    try {
      const { infrastructureServices } = await import('@shared/schema');

      const services = await db
        .select()
        .from(infrastructureServices)
        .orderBy(infrastructureServices.name);

      res.json(services);
    } catch (error) {
      console.error('Failed to get infrastructure services:', error);
      res.status(500).json({ error: 'Failed to get infrastructure services' });
    }
  });

  app.post('/api/v2/admin/infrastructure-services', authMiddleware, async (req, res) => {
    try {
      const {
        name,
        serviceType,
        endpoint,
        checkType,
        checkInterval,
        timeout,
        retryCount,
        expectedResponse,
        alertThreshold,
        isCritical,
        dependencies,
        tags
      } = req.body;

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const service = await backupInfrastructureService.addInfrastructureService({
        name,
        serviceType,
        endpoint,
        checkType,
        checkInterval,
        timeout,
        retryCount,
        expectedResponse,
        alertThreshold,
        isCritical,
        dependencies,
        tags
      });

      res.json(service);
    } catch (error) {
      console.error('Failed to add infrastructure service:', error);
      res.status(500).json({ error: 'Failed to add infrastructure service' });
    }
  });

  // Service Health Status
  app.get('/api/v2/admin/service-health', authMiddleware, async (req, res) => {
    try {
      const { serviceId, limit = 100 } = req.query;

      const { serviceHealthChecks, infrastructureServices } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');

      let query = db
        .select({
          id: serviceHealthChecks.id,
          serviceId: serviceHealthChecks.serviceId,
          serviceName: infrastructureServices.name,
          status: serviceHealthChecks.status,
          responseTime: serviceHealthChecks.responseTime,
          statusCode: serviceHealthChecks.statusCode,
          errorMessage: serviceHealthChecks.errorMessage,
          checkedAt: serviceHealthChecks.checkedAt
        })
        .from(serviceHealthChecks)
        .leftJoin(
          infrastructureServices,
          eq(serviceHealthChecks.serviceId, infrastructureServices.id)
        )
        .orderBy(desc(serviceHealthChecks.checkedAt))
        .limit(parseInt(limit as string));

      if (serviceId) {
        query = query.where(eq(serviceHealthChecks.serviceId, serviceId as string));
      }

      const healthChecks = await query;
      res.json(healthChecks);
    } catch (error) {
      console.error('Failed to get service health:', error);
      res.status(500).json({ error: 'Failed to get service health' });
    }
  });

  // Service Health Dashboard
  app.get('/api/v2/admin/infrastructure-dashboard', authMiddleware, async (req, res) => {
    try {
      const { infrastructureServices, serviceHealthChecks } = await import('@shared/schema');
      const { eq, desc, sql } = await import('drizzle-orm');

      // Get service summary with latest health status
      const servicesSummary = await db
        .select({
          id: infrastructureServices.id,
          name: infrastructureServices.name,
          serviceType: infrastructureServices.serviceType,
          isCritical: infrastructureServices.isCritical,
          isActive: infrastructureServices.isActive,
          latestStatus: sql`(
          SELECT status FROM ${serviceHealthChecks}
          WHERE service_id = ${infrastructureServices.id}
          ORDER BY checked_at DESC
          LIMIT 1
        )`,
          latestCheck: sql`(
          SELECT checked_at FROM ${serviceHealthChecks}
          WHERE service_id = ${infrastructureServices.id}
          ORDER BY checked_at DESC
          LIMIT 1
        )`,
          avgResponseTime: sql`(
          SELECT AVG(response_time) FROM ${serviceHealthChecks}
          WHERE service_id = ${infrastructureServices.id}
          AND checked_at > NOW() - INTERVAL '24 hours'
        )`
        })
        .from(infrastructureServices);

      // Calculate overall system health metrics
      const totalServices = servicesSummary.length;
      const healthyServices = servicesSummary.filter(s => s.latestStatus === 'healthy').length;
      const criticalServices = servicesSummary.filter(
        s => s.isCritical && s.latestStatus !== 'healthy'
      ).length;

      const systemHealth = {
        overall: totalServices > 0 ? ((healthyServices / totalServices) * 100).toFixed(1) : 0,
        totalServices,
        healthyServices,
        unhealthyServices: totalServices - healthyServices,
        criticalIssues: criticalServices
      };

      res.json({
        systemHealth,
        services: servicesSummary
      });
    } catch (error) {
      console.error('Failed to get infrastructure dashboard:', error);
      res.status(500).json({ error: 'Failed to get infrastructure dashboard' });
    }
  });

  // Disaster Recovery Plans
  app.get('/api/v2/admin/dr-plans', authMiddleware, async (req, res) => {
    try {
      const { disasterRecoveryPlans } = await import('@shared/schema');

      const plans = await db
        .select()
        .from(disasterRecoveryPlans)
        .where(eq(disasterRecoveryPlans.isActive, true))
        .orderBy(disasterRecoveryPlans.priority);

      res.json(plans);
    } catch (error) {
      console.error('Failed to get DR plans:', error);
      res.status(500).json({ error: 'Failed to get DR plans' });
    }
  });

  app.post('/api/v2/admin/dr-plans', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const {
        name,
        description,
        planType,
        rto,
        rpo,
        priority,
        triggerConditions,
        procedures,
        requiredResources,
        testSchedule
      } = req.body;

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const plan = await backupInfrastructureService.createDisasterRecoveryPlan({
        name,
        description,
        planType,
        rto,
        rpo,
        priority,
        triggerConditions,
        procedures,
        requiredResources,
        testSchedule,
        createdBy: user.userId
      });

      res.json(plan);
    } catch (error) {
      console.error('Failed to create DR plan:', error);
      res.status(500).json({ error: 'Failed to create DR plan' });
    }
  });

  // Execute DR Test
  app.post('/api/v2/admin/dr-plans/:planId/test', authMiddleware, async (req, res) => {
    try {
      const { planId } = req.params;
      const user = (req as any).user;
      const { testType = 'manual' } = req.body;

      const { backupInfrastructureService } = await import('./services/backup-infrastructure');

      const testId = await backupInfrastructureService.executeDRTest(planId, testType, user.userId);

      res.json({ testId, message: 'DR test started successfully' });
    } catch (error) {
      console.error('Failed to start DR test:', error);
      res.status(500).json({ error: 'Failed to start DR test' });
    }
  });

  // Maintenance Windows
  app.get('/api/v2/admin/maintenance-windows', authMiddleware, async (req, res) => {
    try {
      const { upcoming } = req.query;

      const { maintenanceWindows } = await import('@shared/schema');
      const { gte, desc } = await import('drizzle-orm');

      let query = db.select().from(maintenanceWindows).orderBy(desc(maintenanceWindows.startTime));

      if (upcoming === 'true') {
        query = query.where(gte(maintenanceWindows.startTime, new Date()));
      }

      const windows = await query;
      res.json(windows);
    } catch (error) {
      console.error('Failed to get maintenance windows:', error);
      res.status(500).json({ error: 'Failed to get maintenance windows' });
    }
  });

  app.post('/api/v2/admin/maintenance-windows', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const { title, description, maintenanceType, impact, affectedServices, startTime, endTime } =
        req.body;

      const { maintenanceWindows } = await import('@shared/schema');

      const [created] = await db
        .insert(maintenanceWindows)
        .values({
          title,
          description,
          maintenanceType,
          impact,
          affectedServices,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          scheduledBy: user.userId
        })
        .returning();

      res.json(created);
    } catch (error) {
      console.error('Failed to create maintenance window:', error);
      res.status(500).json({ error: 'Failed to create maintenance window' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
