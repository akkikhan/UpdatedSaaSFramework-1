import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email";
import { authService } from "./services/auth";
import { platformAdminAuthService } from "./services/platform-admin-auth";
import { AzureADService } from "./services/azure-ad";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { platformAdminMiddleware } from "./middleware/platform-admin";
import {
  insertTenantSchema,
  insertUserSchema,
  insertTenantUserSchema,
  insertTenantRoleSchema,
  insertTenantUserRoleSchema,
  insertPermissionTemplateSchema,
  insertBusinessTypeSchema,
  insertDefaultRoleSchema,
} from "@shared/schema";
import { notificationService } from "./services/notification";
import { complianceService } from "./services/compliance";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    const emailConnected = await emailService.testConnection();
    res.json({
      status: "operational",
      services: {
        database: true,
        email: emailConnected ? "operational" : "configuration_needed",
      },
      timestamp: new Date().toISOString(),
    });
  });

  // CLEAN AZURE AD OAUTH ROUTES

  // Start Azure AD OAuth flow
  app.get("/api/auth/azure/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;

      console.log(`Starting Azure AD OAuth for orgId: ${orgId}`);

      // Get tenant by orgId
      const tenant = await storage.getTenantByOrgId(orgId);
      if (!tenant) {
        console.log(`Tenant not found for orgId: ${orgId}`);
        return res.status(404).json({ message: "Tenant not found" });
      }

      console.log(`Found tenant: ${tenant.name} (ID: ${tenant.id})`);

      // Check if tenant has Azure AD configured
      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;

      if (!authConfig?.providers) {
        return res.status(400).json({ message: "Authentication not configured for this tenant" });
      }

      // Find Azure AD provider
      const azureProvider = authConfig.providers.find((p: any) => p.type === "azure-ad");
      if (!azureProvider || !azureProvider.enabled) {
        return res
          .status(400)
          .json({ message: "Azure AD authentication not enabled for this tenant" });
      }

      console.log(`Azure AD provider found for tenant ${tenant.name}`);

      // Create Azure AD service instance
      const azureADService = new AzureADService({
        tenantId: azureProvider.config.tenantId,
        clientId: azureProvider.config.clientId,
        clientSecret: azureProvider.config.clientSecret,
        redirectUri:
          azureProvider.config.redirectUri ||
          azureProvider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/azure/callback`,
      });

      // Generate authorization URL
      const authUrl = await azureADService.getAuthorizationUrl(
        ["User.Read", "User.ReadBasic.All"],
        tenant.id
      );

      console.log(`Generated Azure AD auth URL for tenant ${tenant.name}`);

      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Azure AD OAuth:", error);
      res.status(500).json({ message: "Failed to start Azure AD authentication" });
    }
  });

  // Handle Azure AD OAuth callback (CLEAN IMPLEMENTATION)
  app.get("/api/auth/azure/callback", async (req, res) => {
    console.log("=== AZURE AD CALLBACK EXECUTING ===");
    console.log("Query parameters:", req.query);

    try {
      const { code, state, error } = req.query;

      console.log("Code provided:", !!code);
      console.log("State provided:", !!state);
      console.log("Error provided:", !!error);

      if (error) {
        console.error("Azure AD OAuth error:", error);
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/error?error=${encodeURIComponent(error as string)}`
        );
      }

      if (!code || !state) {
        console.error("Missing required parameters - Code:", !!code, "State:", !!state);
        return res.status(400).json({ message: "Missing authorization code or state" });
      }

      // Parse state to get tenant ID
      let stateData;
      try {
        stateData = JSON.parse(decodeURIComponent(state as string));
        console.log("Parsed state data:", stateData);
      } catch (stateError) {
        console.error("State parsing error:", stateError);
        return res.status(400).json({ message: "Invalid state parameter" });
      }

      if (!stateData.tenantId) {
        console.error("Missing tenant ID in state. State keys:", Object.keys(stateData));
        return res.status(400).json({ message: "Missing tenant ID in state" });
      }

      console.log(`Looking up tenant with ID: ${stateData.tenantId}`);

      // Get tenant configuration
      const tenant = await storage.getTenant(stateData.tenantId);
      console.log(
        "Tenant lookup result:",
        tenant ? `Found: ${tenant.name} (${tenant.orgId})` : "NOT FOUND"
      );

      if (!tenant) {
        console.error(`Tenant not found in database for ID: ${stateData.tenantId}`);
        return res.status(404).json({ message: "Tenant not found" });
      }

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;
      const azureProvider = authConfig?.providers?.find((p: any) => p.type === "azure-ad");

      if (!azureProvider) {
        console.error("Azure AD provider not found in tenant configuration");
        return res.status(400).json({ message: "Azure AD not configured for this tenant" });
      }

      console.log("Creating Azure AD service instance...");

      // Create Azure AD service instance
      const azureADService = new AzureADService({
        tenantId: azureProvider.config.tenantId,
        clientId: azureProvider.config.clientId,
        clientSecret: azureProvider.config.clientSecret,
        redirectUri:
          azureProvider.config.redirectUri ||
          azureProvider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/azure/callback`,
      });

      console.log("Handling Azure AD callback...");

      // Handle the callback
      const authResult = await azureADService.handleCallback(
        code as string,
        state as string,
        tenant.id
      );

      console.log(`User provisioned: ${authResult.user.email}`);

      // Generate JWT for the application
      const tokenPayload = {
        userId: authResult.user.id,
        tenantId: tenant.id,
        email: authResult.user.email,
        permissions: [], // TODO: Get from user roles
        type: "tenant_user",
      };

      const jwt = require("jsonwebtoken");
      const appToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: "8h" });

      console.log("Generated JWT token for user");

      // Log successful login
      await storage.logSystemActivity({
        tenantId: tenant.id,
        adminUserId: authResult.user.id,
        action: "azure_ad_login_success",
        entityType: "tenant_user",
        entityId: authResult.user.id,
        details: {
          email: authResult.user.email,
          provider: "azure-ad",
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      console.log("Logged successful Azure AD login");

      // Redirect to success page with token
      const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/success?token=${appToken}&tenant=${tenant.orgId}`;

      console.log(`Redirecting to: ${redirectUrl}`);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Azure AD callback error:", error);

      // Log failed login attempt
      if (req.query.state) {
        try {
          const stateData = JSON.parse(decodeURIComponent(req.query.state as string));
          if (stateData.tenantId) {
            await storage.logSystemActivity({
              tenantId: stateData.tenantId,
              action: "azure_ad_login_failed",
              entityType: "tenant_user",
              entityId: "unknown",
              details: {
                error: error instanceof Error ? error.message : "Unknown error",
                provider: "azure-ad",
              },
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
            });
          }
        } catch (logError) {
          console.error("Error logging failed login attempt:", logError);
        }
      }

      const errorUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/error?error=${encodeURIComponent("Authentication failed")}`;
      res.redirect(errorUrl);
    }
  });

  // Platform Admin Authentication Routes

  // Platform admin login
  app.post("/api/platform/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await platformAdminAuthService.login(email, password);

      if (!result) {
        return res.status(401).json({ message: "Invalid platform admin credentials" });
      }

      // Log platform admin login
      await storage.logSystemActivity({
        action: "platform_admin_login",
        entityType: "platform_admin",
        entityId: result.admin.id,
        details: { email: result.admin.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(result);
    } catch (error) {
      console.error("Platform admin login error:", error);
      res.status(500).json({ message: "Platform admin login failed" });
    }
  });

  // Get all tenants (PLATFORM ADMIN ONLY)
  app.get("/api/tenants", platformAdminMiddleware, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
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

  // Create new tenant (PLATFORM ADMIN ONLY)
  app.post("/api/tenants", platformAdminMiddleware, async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);

      // Check if orgId is already taken
      const existingTenant = await storage.getTenantByOrgId(tenantData.orgId);
      if (existingTenant) {
        return res.status(400).json({ message: "Organization ID already exists" });
      }

      // Create tenant
      const tenant = await storage.createTenant(tenantData);

      console.log(`Tenant created successfully: ${tenant.name} (${tenant.orgId})`);

      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }

      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Configure Azure AD for a tenant (PLATFORM ADMIN ONLY)
  app.post("/api/tenants/:id/azure-ad/config", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tenantId, clientId, clientSecret, redirectUri, callbackUrl } = req.body;

      // Validate required fields
      if (!tenantId || !clientId || !clientSecret) {
        return res.status(400).json({
          message: "Missing required Azure AD configuration fields",
          required: ["tenantId", "clientId", "clientSecret"],
        });
      }

      // Get current tenant configuration
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Update module configuration
      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      if (!moduleConfigs.auth) {
        moduleConfigs.auth = { providers: [] };
      }
      if (!moduleConfigs.auth.providers) {
        moduleConfigs.auth.providers = [];
      }

      // Remove existing Azure AD provider if any
      moduleConfigs.auth.providers = moduleConfigs.auth.providers.filter(
        (p: any) => p.type !== "azure-ad"
      );

      // Add new Azure AD provider
      moduleConfigs.auth.providers.push({
        type: "azure-ad",
        name: "Azure AD SSO",
        priority: 1,
        config: {
          tenantId,
          clientId,
          clientSecret,
          redirectUri:
            redirectUri ||
            callbackUrl ||
            `${process.env.BASE_URL || "http://localhost:3001"}/api/auth/azure/callback`,
        },
        userMapping: {
          emailField: "mail",
          nameField: "displayName",
          roleField: "groups",
        },
        enabled: true,
      });

      // Update tenant
      const enabledModules = (tenant.enabledModules as string[]) || [];
      if (!enabledModules.includes("auth")) {
        enabledModules.push("auth");
      }

      await storage.updateTenantModules(id, enabledModules, moduleConfigs);

      console.log(`Azure AD configured for tenant: ${tenant.name}`);

      res.json({
        message: "Azure AD configured successfully",
        provider: {
          type: "azure-ad",
          name: "Azure AD SSO",
          enabled: true,
        },
      });
    } catch (error) {
      console.error("Error configuring Azure AD:", error);
      res.status(500).json({ message: "Failed to configure Azure AD" });
    }
  });

  return createServer(app);
}
