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

  const httpServer = createServer(app);
  return httpServer;
}
