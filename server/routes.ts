import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email";
import { authService } from "./services/auth";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { insertTenantSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes
  
  // Health check
  app.get("/api/health", async (req, res) => {
    const isEmailWorking = await emailService.testConnection();
    res.json({
      status: "operational",
      services: {
        database: true,
        email: isEmailWorking
      },
      timestamp: new Date().toISOString()
    });
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
      res.json({ message: "Tenant status updated successfully" });
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
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
      
      // Send email notification if there are changes
      if (enabled.length > 0 || disabled.length > 0) {
        await emailService.sendModuleStatusEmail(
          {
            id: tenant.id,
            name: tenant.name,
            adminEmail: tenant.adminEmail
          },
          { enabled, disabled }
        );
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
      
      // Send onboarding email if requested
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
        }
      }

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
      const { status } = req.body;
      
      if (!['pending', 'active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateTenantStatus(id, status);
      res.json({ message: "Tenant status updated successfully" });
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  // Authentication routes
  
  // Login
  app.post("/api/v2/auth/login", async (req, res) => {
    try {
      const { email, password, tenantId } = req.body;
      
      if (!email || !password || !tenantId) {
        return res.status(400).json({ message: "Email, password, and tenantId are required" });
      }

      const result = await authService.login(email, password, tenantId);
      
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
    res.json({ 
      valid: true, 
      user: req.user 
    });
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

  // RBAC routes (placeholder)
  app.get("/api/v2/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const roles = await storage.getRolesByTenant(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
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

      const { AzureADService } = await import('./services/oauth/azure-ad');
      const azureService = new AzureADService({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/azure-ad/callback`,
      });

      const state = azureService.generateState(orgId);
      const authUrl = await azureService.getAuthUrl(state);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Azure AD OAuth error:", error);
      res.status(500).json({ message: "OAuth initialization failed" });
    }
  });

  // Azure AD OAuth callback
  app.get("/api/oauth/azure-ad/callback", async (req, res) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
      
      if (!code || !state) {
        return res.status(400).json({ message: "Missing code or state parameter" });
      }

      const { AzureADService } = await import('./services/oauth/azure-ad');
      const azureService = new AzureADService({
        tenantId: 'temp', // Will be replaced with actual config
        clientId: 'temp',
        clientSecret: 'temp',
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/azure-ad/callback`,
      });

      const stateData = azureService.parseState(state);
      if (!stateData) {
        return res.status(400).json({ message: "Invalid state parameter" });
      }

      const tenant = await storage.getTenantByOrgId(stateData.tenantOrgId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const moduleConfigs = tenant.moduleConfigs as any || {};
      const azureConfig = moduleConfigs['azure-ad'];
      
      // Recreate service with actual config
      const configuredAzureService = new AzureADService({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret,
        redirectUri: `${req.protocol}://${req.get('host')}/api/oauth/azure-ad/callback`,
      });

      const result = await configuredAzureService.handleCallback(code, state, tenant);
      
      if (!result) {
        return res.status(401).json({ message: "OAuth authentication failed" });
      }

      // Redirect to tenant dashboard with token
      const redirectUrl = `/tenant/${tenant.orgId}/dashboard?token=${result.token}`;
      res.redirect(redirectUrl);
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

  const httpServer = createServer(app);
  return httpServer;
}
