import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email";
import { authService } from "./services/auth";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { insertTenantSchema, insertUserSchema, insertTenantUserSchema, insertTenantRoleSchema, insertTenantUserRoleSchema } from "@shared/schema";
import { notificationService } from "./services/notification";
import { complianceService } from "./services/compliance";
import { AzureADService } from "./services/azure-ad";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes
  
  // Health check
  app.get("/api/health", async (req, res) => {
    const emailConnected = await emailService.testConnection();
    res.json({
      status: "operational",
      services: {
        database: true,
        email: emailConnected ? "operational" : "configuration_needed"
      },
      timestamp: new Date().toISOString()
    });
  });

  // Test email route for debugging
  app.post("/api/test-email", async (req, res) => {
    try {
      const { to, subject = "Test Email" } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: "Recipient email 'to' is required" });
      }

      // Test SMTP connection first
      const connectionTest = await emailService.testConnection();
      if (!connectionTest) {
        return res.status(500).json({ 
          success: false, 
          message: "SMTP connection failed. Check email configuration and credentials." 
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
          message: "Failed to send test email. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Email test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Tenant management routes (admin only for now)
  
  // Get all tenants
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Get tenant statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getTenantStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get recent tenants
  app.get("/api/tenants/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentTenants = await storage.getRecentTenants(limit);
      res.json(recentTenants);
    } catch (error) {
      console.error("Error fetching recent tenants:", error);
      res.status(500).json({ message: "Failed to fetch recent tenants" });
    }
  });

  // Get tenant by orgId
  app.get("/api/tenants/by-org-id/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant by orgId:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Update tenant status
  app.patch("/api/tenants/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
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
        message: "Tenant status updated successfully",
        status: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });
  
  // Test endpoint to suspend the test tenant (for demonstration)
  app.post("/api/test/suspend-tenant", async (req, res) => {
    try {
      const testTenant = await storage.getTenantByOrgId('test');
      if (!testTenant) {
        return res.status(404).json({ message: "Test tenant not found" });
      }
      
      await storage.updateTenantStatus(testTenant.id, 'suspended');
      
      res.json({ 
        message: "Test tenant suspended successfully. Active users will be logged out on next verification.",
        tenantId: testTenant.id,
        orgId: testTenant.orgId
      });
    } catch (error) {
      console.error("Error suspending test tenant:", error);
      res.status(500).json({ message: "Failed to suspend test tenant" });
    }
  });
  
  // Test endpoint to reactivate the test tenant 
  app.post("/api/test/reactivate-tenant", async (req, res) => {
    try {
      const testTenant = await storage.getTenantByOrgId('test');
      if (!testTenant) {
        return res.status(404).json({ message: "Test tenant not found" });
      }
      
      await storage.updateTenantStatus(testTenant.id, 'active');
      
      res.json({ 
        message: "Test tenant reactivated successfully",
        tenantId: testTenant.id,
        orgId: testTenant.orgId
      });
    } catch (error) {
      console.error("Error reactivating test tenant:", error);
      res.status(500).json({ message: "Failed to reactivate test tenant" });
    }
  });

  // Compliance and audit endpoints
  app.get("/api/compliance/audit-logs", async (req, res) => {
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
      console.error("Error fetching compliance audit logs:", error);
      res.status(500).json({ message: "Failed to fetch compliance audit logs" });
    }
  });

  app.get("/api/compliance/security-events", async (req, res) => {
    try {
      const {
        tenantId,
        severity,
        eventType,
        limit = '50',
        offset = '0'
      } = req.query;

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
      console.error("Error fetching security events:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.get("/api/compliance/summary", async (req, res) => {
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
        highRiskEvents: auditLogs.filter(log => log.riskLevel === 'high' || log.riskLevel === 'critical').length,
        securityEvents: securityEvents.length,
        criticalSecurityEvents: securityEvents.filter(event => event.severity === 'critical').length,
        complianceFrameworks: Array.from(new Set(auditLogs.flatMap(log => log.complianceFrameworks || []))),
        riskDistribution: {
          low: auditLogs.filter(log => log.riskLevel === 'low').length,
          medium: auditLogs.filter(log => log.riskLevel === 'medium').length,
          high: auditLogs.filter(log => log.riskLevel === 'high').length,
          critical: auditLogs.filter(log => log.riskLevel === 'critical').length
        }
      };

      res.json(summary);
    } catch (error) {
      console.error("Error generating compliance summary:", error);
      res.status(500).json({ message: "Failed to generate compliance summary" });
    }
  });

  // Module Management Routes
  
  // Update tenant modules
  app.patch("/api/tenants/:id/modules", async (req, res) => {
    try {
      const { id } = req.params;
      const { enabledModules, moduleConfigs } = req.body;
      
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
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
        message: "Modules updated successfully",
        changes: { enabled, disabled }
      });
    } catch (error) {
      console.error("Error updating tenant modules:", error);
      res.status(500).json({ message: "Failed to update modules" });
    }
  });
  
  // Get system logs
  app.get("/api/logs/system", async (req, res) => {
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
      console.error("Error fetching system logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });
  
  // Get email logs
  app.get("/api/logs/email", async (req, res) => {
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
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Create new tenant
  app.post("/api/tenants", async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      
      // Check if orgId is already taken
      const existingTenant = await storage.getTenantByOrgId(tenantData.orgId);
      if (existingTenant) {
        return res.status(400).json({ message: "Organization ID already exists" });
      }

      // Create tenant
      const tenant = await storage.createTenant(tenantData);
      
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
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Update tenant status
  app.patch("/api/tenants/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!['pending', 'active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateTenantStatus(id, status);
      
      // Send notification to tenant
      await notificationService.notifyTenantStatusChange(id, status, reason);
      
      res.json({ message: "Tenant status updated successfully" });
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  // Get notifications for a tenant
  app.get("/api/tenants/:id/notifications", async (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const notifications = await notificationService.getNotificationsForTenant(id, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      
      const notification = await notificationService.markNotificationAsRead(id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Authentication routes
  
  // Login
  app.post("/api/v2/auth/login", async (req, res) => {
    try {
      const { email, password, tenantId, orgId } = req.body;
      
      if (!email || !password || (!tenantId && !orgId)) {
        return res.status(400).json({ message: "Email, password, and tenantId (or orgId) are required" });
      }

      // If orgId is provided, convert it to tenantId
      let actualTenantId = tenantId;
      if (orgId && !tenantId) {
        const tenant = await storage.getTenantByOrgId(orgId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }
        actualTenantId = tenant.id;
      }

      const result = await authService.login(email, password, actualTenantId);
      
      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/v2/auth/logout", authMiddleware, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);
      
      if (token) {
        await authService.logout(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Verify token
  app.get("/api/v2/auth/verify", authMiddleware, async (req, res) => {
    try {
      // Check if tenant is still active
      const tenant = await storage.getTenant(req.user!.tenantId);
      
      if (!tenant || tenant.status === 'suspended') {
        return res.status(403).json({ 
          valid: false,
          error: 'TENANT_SUSPENDED',
          message: 'Your organization\'s account has been suspended. Please contact your administrator.',
          tenant: tenant ? {
            name: tenant.name,
            status: tenant.status,
            adminEmail: tenant.adminEmail
          } : null
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

  // Refresh token
  app.post("/api/v2/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      const newToken = await authService.refreshToken(refreshToken);
      
      if (!newToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      res.json({ token: newToken });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  // Protected routes with auth middleware
  
  // Get users (tenant-specific)
  app.get("/api/v2/auth/users", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      // Implementation would get users for the authenticated tenant
      res.json({ message: "Users endpoint - to be implemented" });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // RBAC routes
  app.get("/api/v2/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const roles = await storage.getRolesByTenant(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Tenant User Management Routes
  
  // Get all users for a tenant
  app.get("/api/tenants/:tenantId/users", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getTenantUsers(tenantId, limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Create a new tenant user
  app.post("/api/tenants/:tenantId/users", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const userData = { ...req.body, tenantId };
      
      // Validate required fields
      if (!userData.email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getTenantUserByEmail(tenantId, userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
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
      console.error("Error creating tenant user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Get a specific tenant user
  app.get("/api/tenants/:tenantId/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getTenantUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching tenant user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update a tenant user
  app.patch("/api/tenants/:tenantId/users/:userId", async (req, res) => {
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
        return res.status(404).json({ message: "User not found" });
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
      console.error("Error updating tenant user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Delete a tenant user
  app.delete("/api/tenants/:tenantId/users/:userId", async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      
      // Get user details for logging
      const user = await storage.getTenantUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Tenant Role Management Routes
  
  // Get all roles for a tenant
  app.get("/api/tenants/:tenantId/roles", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching tenant roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });
  
  // Create a new tenant role
  app.post("/api/tenants/:tenantId/roles", async (req, res) => {
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
      console.error("Error creating tenant role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });
  
  // Update a tenant role
  app.patch("/api/tenants/:tenantId/roles/:roleId", async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;
      const updates = req.body;
      
      const role = await storage.updateTenantRole(roleId, updates);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
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
      console.error("Error updating tenant role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });
  
  // Delete a tenant role
  app.delete("/api/tenants/:tenantId/roles/:roleId", async (req, res) => {
    try {
      const { tenantId, roleId } = req.params;
      
      // Get role details for logging
      const role = await storage.getTenantRole(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
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
      
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });
  
  // User Role Assignment Routes
  
  // Assign role to user
  app.post("/api/tenants/:tenantId/users/:userId/roles", async (req, res) => {
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
      console.error("Error assigning role to user:", error);
      res.status(500).json({ message: "Failed to assign role" });
    }
  });
  
  // Get user roles
  app.get("/api/tenants/:tenantId/users/:userId/roles", async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const roles = await storage.getTenantUserRoles(tenantId, userId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });
  
  // Remove role from user
  app.delete("/api/tenants/:tenantId/users/:userId/roles/:roleId", async (req, res) => {
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
      
      res.json({ message: "Role removed from user successfully" });
    } catch (error) {
      console.error("Error removing role from user:", error);
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  // Resend onboarding email
  app.post("/api/tenants/:id/resend-email", async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
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
        res.json({ message: "Onboarding email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send onboarding email" });
      }
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({ message: "Failed to resend email" });
    }
  });

  // OAuth routes
  
  // Azure AD OAuth initiation
  app.get("/api/oauth/azure-ad/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Check if Azure AD is enabled for this tenant
      const enabledModules = tenant.enabledModules as string[] || [];
      if (!enabledModules.includes('azure-ad')) {
        return res.status(400).json({ message: "Azure AD not enabled for this tenant" });
      }

      const moduleConfigs = tenant.moduleConfigs as any || {};
      const azureConfig = moduleConfigs['azure-ad'];
      
      if (!azureConfig || !azureConfig.tenantId || !azureConfig.clientId || !azureConfig.clientSecret) {
        return res.status(400).json({ message: "Azure AD not properly configured" });
      }

      const azureService = AzureADService.createFromTenantConfig({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/azure-ad/callback`,
      });

      const authUrl = await azureService.getAuthorizationUrl(['User.Read']);
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating Azure AD OAuth:", error);
      res.status(500).json({ message: "Failed to initiate OAuth" });
    }
  });

  // Azure AD OAuth callback
  app.get("/api/oauth/azure-ad/callback", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ message: "Authorization code not provided" });
      }

      // For now, redirect to success page with code
      // In production, you'd validate the code and create a user session
      res.redirect(`/auth-success?code=${code}&provider=azure-ad`);
    } catch (error) {
      console.error("Azure AD callback error:", error);
      res.status(500).json({ message: "OAuth callback failed" });
    }
  });

  // Auth0 OAuth initiation
  app.get("/api/oauth/auth0/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Check if Auth0 is enabled for this tenant
      const enabledModules = tenant.enabledModules as string[] || [];
      if (!enabledModules.includes('auth0')) {
        return res.status(400).json({ message: "Auth0 not enabled for this tenant" });
      }

      const moduleConfigs = tenant.moduleConfigs as any || {};
      const auth0Config = moduleConfigs['auth0'];
      
      if (!auth0Config || !auth0Config.domain || !auth0Config.clientId || !auth0Config.clientSecret) {
        return res.status(400).json({ message: "Auth0 not properly configured" });
      }

      const { Auth0Service } = await import('./services/oauth/auth0');
      const auth0Service = new Auth0Service({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`,
      });

      const state = auth0Service.generateState(orgId);
      const authUrl = auth0Service.getAuthUrl(state);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Auth0 OAuth error:", error);
      res.status(500).json({ message: "OAuth initialization failed" });
    }
  });

  // Auth0 OAuth callback
  app.get("/api/oauth/auth0/callback", async (req, res) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
      
      if (!code || !state) {
        return res.status(400).json({ message: "Missing code or state parameter" });
      }

      const { Auth0Service } = await import('./services/oauth/auth0');
      const auth0Service = new Auth0Service({
        domain: 'temp', // Will be replaced with actual config
        clientId: 'temp',
        clientSecret: 'temp',
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`,
      });

      const stateData = auth0Service.parseState(state);
      if (!stateData) {
        return res.status(400).json({ message: "Invalid state parameter" });
      }

      const tenant = await storage.getTenantByOrgId(stateData.tenantOrgId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const moduleConfigs = tenant.moduleConfigs as any || {};
      const auth0Config = moduleConfigs['auth0'];
      
      // Recreate service with actual config
      const configuredAuth0Service = new Auth0Service({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/auth0/callback`,
      });

      const result = await configuredAuth0Service.handleCallback(code, state, tenant);
      
      if (!result) {
        return res.status(401).json({ message: "OAuth authentication failed" });
      }

      // Redirect to tenant dashboard with token
      const redirectUrl = `/tenant/${tenant.orgId}/dashboard?token=${result.token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Auth0 callback error:", error);
      res.status(500).json({ message: "OAuth callback failed" });
    }
  });

  // =============================================================================
  // TENANT USERS & ROLES CRUD API (For tenant portals)
  // =============================================================================
  
  // Tenant Users CRUD
  app.post("/api/tenants/:tenantId/users", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const userData = insertTenantUserSchema.parse({ ...req.body, tenantId });
      
      // Check if user already exists
      const existingUser = await storage.getTenantUserByEmail(tenantId, userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const newUser = await storage.createTenantUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating tenant user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.get("/api/tenants/:tenantId/users", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const users = await storage.getTenantUsers(tenantId, parseInt(limit as string), parseInt(offset as string));
      res.json(users);
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/tenants/:tenantId/roles", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching tenant roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
