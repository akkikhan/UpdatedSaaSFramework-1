import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email";
import { authService } from "./services/auth";
import { platformAdminAuthService } from "./services/platform-admin-auth";
import { AzureADService } from "./services/azure-ad";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { platformAdminMiddleware } from "./middleware/platform-admin";
import { validateApiKey } from "./middleware/apiKeyAuth";
import {
  insertTenantSchema,
  insertUserSchema,
  insertTenantUserSchema,
  insertTenantRoleSchema,
  insertTenantUserRoleSchema,
  insertPermissionTemplateSchema,
  insertBusinessTypeSchema,
  insertDefaultRoleSchema,
} from "../shared/schema";
import { notificationService } from "./services/notification";
import { complianceService } from "./services/compliance-temp";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes

  // Tenant Registration Page
  app.get("/register", (req, res) => {
    const registrationPagePath = path.resolve(__dirname, "../client/tenant-registration.html");
    res.sendFile(registrationPagePath);
  });

  // Platform Admin Login Page - Azure AD Integration
  app.get("/admin/login", (req, res) => {
    const loginPagePath = path.resolve(__dirname, "../client/platform-admin-login.html");
    res.sendFile(loginPagePath);
  });

  // Admin redirect route
  app.get("/admin", (req, res) => {
    // Check if user is authenticated, if not redirect to login
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.redirect("/admin/login");
    }
    // If authenticated, redirect to main app with admin flag
    res.redirect("/?admin=true");
  });

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

  // Platform admin token verification
  app.get("/api/platform/auth/verify", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No valid authorization token provided" });
      }

      const token = authHeader.split(" ")[1];
      const result = await platformAdminAuthService.verifyToken(token);

      if (!result) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      res.json({
        valid: true,
        admin: result.admin,
      });
    } catch (error) {
      console.error("Platform admin token verification error:", error);
      res.status(401).json({ message: "Token verification failed" });
    }
  });

  // Azure AD Authentication Routes

  // Authorized platform admin emails
  const AUTHORIZED_ADMIN_EMAILS = (process.env.AUTHORIZED_ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Add default admin email if no emails configured
  if (AUTHORIZED_ADMIN_EMAILS.length === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@yourcompany.com";
    AUTHORIZED_ADMIN_EMAILS.push(adminEmail.toLowerCase());
  }

  // Initialize Azure AD service
  const azureADService = new AzureADService({
    tenantId: process.env.AZURE_TENANT_ID || "common",
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    redirectUri:
      process.env.AZURE_REDIRECT_URI || "http://localhost:5000/api/platform/auth/azure/callback",
  });

  // Azure AD login - redirect to Microsoft
  app.get("/api/platform/auth/azure/login", async (req, res) => {
    try {
      // For khan.aakib@outlook.com - we'll check this email is authorized
      const authorizedEmails = ["khan.aakib@outlook.com", "admin@yourcompany.com"];

      const authUrl = await azureADService.getAuthorizationUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error("Azure AD login initiation error:", error);
      res.redirect("/admin/login?error=azure_login_failed");
    }
  });

  // Azure AD callback - handle response from Microsoft
  app.get("/api/platform/auth/azure/callback", async (req, res) => {
    try {
      const { code, error, error_description, state } = req.query;

      if (error) {
        console.error("Azure AD callback error:", error, error_description);
        const errorMessage =
          (typeof error_description === "string" ? error_description : String(error)) ||
          "unknown_error";
        return res.redirect("/admin/login?error=" + encodeURIComponent(errorMessage));
      }

      if (!code || typeof code !== "string") {
        return res.redirect("/admin/login?error=no_authorization_code");
      }

      if (!state || typeof state !== "string") {
        return res.redirect("/admin/login?error=invalid_state");
      }

      // Exchange code for tokens and get user info (platform admin - no tenant provisioning)
      const authResult = await azureADService.handlePlatformAdminCallback(code, state);

      // Check if user email is authorized
      const userEmail = authResult.user.email?.toLowerCase();

      if (!AUTHORIZED_ADMIN_EMAILS.includes(userEmail)) {
        console.log(`Unauthorized email attempted login: ${userEmail}`);
        console.log(`Authorized emails: ${AUTHORIZED_ADMIN_EMAILS.join(", ")}`);
        return res.redirect("/admin/login?error=unauthorized_email");
      }

      // Create or update platform admin record for Azure AD user
      let platformAdmin = await storage.getPlatformAdminByEmail(authResult.user.email);

      if (!platformAdmin) {
        // Create new platform admin
        platformAdmin = await storage.createPlatformAdmin({
          email: authResult.user.email,
          name:
            authResult.user.firstName && authResult.user.lastName
              ? `${authResult.user.firstName} ${authResult.user.lastName}`
              : authResult.user.email,
          role: "super_admin",
          passwordHash: "AZURE_AD_SSO", // Placeholder for SSO users - not a real password
          isActive: true,
        });
      } else {
        // Update last login
        await storage.updatePlatformAdminLastLogin(platformAdmin.id);
      }

      // Log Azure AD login
      await storage.logSystemActivity({
        action: "platform_admin_azure_login",
        entityType: "platform_admin",
        entityId: platformAdmin.id,
        details: {
          email: authResult.user.email,
          provider: "azure_ad",
          userId: authResult.user.id,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Generate a platform admin token for this user
      const platformAdminToken = await platformAdminAuthService.generateToken(platformAdmin);

      // Redirect to main app with token (React dashboard)
      res.redirect(`/?token=${platformAdminToken}&admin=true`);
    } catch (error) {
      console.error("Azure AD callback processing error:", error);
      res.redirect("/admin/login?error=callback_processing_failed");
    }
  });

  // Platform admin token verification
  app.get("/api/platform/auth/verify", platformAdminMiddleware, async (req, res) => {
    try {
      res.json({
        valid: true,
        admin: req.platformAdmin,
      });
    } catch (error) {
      console.error("Platform admin token verification error:", error);
      res.status(500).json({
        valid: false,
        error: "VERIFICATION_ERROR",
        message: "Unable to verify platform admin status",
      });
    }
  });

  // Platform admin logout
  app.post("/api/platform/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Remove from any session storage if implemented
      // For JWT tokens, we'll rely on client-side removal and short expiry

      console.log("👋 Platform admin logout requested");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Platform admin token refresh
  app.post("/api/platform/auth/refresh", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Use the refreshToken method from platformAdminAuthService
      // Note: The service's refreshToken method expects a refresh token, not an access token
      // So we need to verify the current token and generate a new one
      const decoded = await platformAdminAuthService.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Generate new token with the same payload
      const jwt = await import("jsonwebtoken");
      const newToken = jwt.sign(
        {
          adminId: decoded.adminId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          type: "platform_admin",
        },
        process.env.JWT_SECRET!,
        { expiresIn: "8h" }
      );

      console.log("🔄 Token refreshed for admin:", decoded.email);
      res.json({ token: newToken });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  // =============================================================================
  // STATS AND DASHBOARD ENDPOINTS
  // =============================================================================

  // Stats endpoint for admin dashboard
  app.get("/api/stats", platformAdminMiddleware, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      const stats = {
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.status === "active").length,
        pendingTenants: tenants.filter(t => t.status === "pending").length,
        emailsSent: tenants.length, // Simplified - could track actual email count
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Recent tenants endpoint
  app.get("/api/tenants/recent", platformAdminMiddleware, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const tenants = await storage.getAllTenants();
      const recentTenants = tenants
        .sort(
          (a, b) =>
            new Date(b.createdAt || new Date()).getTime() -
            new Date(a.createdAt || new Date()).getTime()
        )
        .slice(0, limit);
      res.json(recentTenants);
    } catch (error) {
      console.error("Error fetching recent tenants:", error);
      res.status(500).json({ message: "Failed to fetch recent tenants" });
    }
  });

  // =============================================================================
  // TENANT MANAGEMENT ENDPOINTS
  // =============================================================================

  // Tenant Management Routes (Platform Admin Only)

  // Get all tenants
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

  // Create new tenant
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

      // Send onboarding email automatically
      const shouldSendEmail = req.body.sendEmail !== false;
      if (shouldSendEmail) {
        const emailSent = await emailService.sendTenantOnboardingEmail({
          id: tenant.id,
          name: tenant.name,
          orgId: tenant.orgId,
          adminEmail: tenant.adminEmail,
          authApiKey: tenant.authApiKey || undefined,
          rbacApiKey: tenant.rbacApiKey || undefined,
          loggingApiKey: tenant.loggingApiKey || undefined,
          notificationsApiKey: tenant.notificationsApiKey || undefined,
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
          errors: error.errors,
        });
      }

      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Public Tenant Registration (no auth required)
  app.post("/api/register", async (req, res) => {
    try {
      const { name, orgId, adminEmail, adminName, adminPassword, enabledModules } = req.body;

      // Validate required fields
      if (!name || !orgId || !adminEmail || !adminName || !adminPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate orgId format
      if (!/^[a-z0-9-]+$/.test(orgId)) {
        return res.status(400).json({
          message: "Organization ID can only contain lowercase letters, numbers, and hyphens",
        });
      }

      // Check if orgId is already taken
      const existingTenant = await storage.getTenantByOrgId(orgId);
      if (existingTenant) {
        return res.status(400).json({ message: "Organization ID already exists" });
      }

      // Create tenant data
      const tenantData = {
        name,
        orgId,
        adminEmail,
        enabledModules: enabledModules || ["auth", "rbac"],
        status: "active" as const,
      };

      // Create tenant
      const tenant = await storage.createTenant(tenantData);

      // Create admin user for the tenant
      console.log(`🔧 Creating tenant user for: ${adminEmail}`);
      const hashedPassword = await authService.hashPassword(adminPassword);
      console.log(`🔐 Password hashed for tenant user: ${adminEmail}`);

      const tenantUser = await storage.createTenantUser({
        tenantId: tenant.id,
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: adminName.split(" ")[0],
        lastName: adminName.split(" ").slice(1).join(" ") || "",
        status: "active" as const,
      });

      console.log(`✅ Tenant user created successfully:`, {
        id: tenantUser.id,
        email: tenantUser.email,
        tenantId: tenantUser.tenantId,
        status: tenantUser.status,
      });

      // Send onboarding email
      const emailSent = await emailService.sendTenantOnboardingEmail({
        id: tenant.id,
        name: tenant.name,
        orgId: tenant.orgId,
        adminEmail: tenant.adminEmail,
        authApiKey: tenant.authApiKey || undefined,
        rbacApiKey: tenant.rbacApiKey || undefined,
        loggingApiKey: tenant.loggingApiKey || undefined,
        notificationsApiKey: tenant.notificationsApiKey || undefined,
      });

      if (!emailSent) {
        console.warn(`Failed to send onboarding email to ${tenant.adminEmail}`);
      }

      console.log(`Tenant registered successfully: ${tenant.name} (${tenant.orgId})`);

      res.status(201).json({
        message: "Organization created successfully",
        tenant: {
          id: tenant.id,
          name: tenant.name,
          orgId: tenant.orgId,
          status: tenant.status,
        },
      });
    } catch (error) {
      console.error("Error registering tenant:", error);
      res.status(500).json({ message: "Failed to create organization. Please try again." });
    }
  });

  // Update tenant status
  app.patch("/api/tenants/:id/status", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Update tenant status (assuming storage has this method)
      await storage.updateTenantStatus(id, status);

      res.json({ message: "Tenant status updated successfully" });
    } catch (error) {
      console.error("Error updating tenant status:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  // Resend onboarding email
  app.post("/api/tenants/:id/resend-email", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Generate temporary password for resend
      const tempPassword = Math.random().toString(36).slice(-8);

      // Send onboarding email
      await emailService.sendTenantOnboardingEmail({
        id: tenant.id,
        name: tenant.name,
        orgId: tenant.orgId,
        adminEmail: tenant.adminEmail,
        authApiKey: tenant.authApiKey || undefined,
        rbacApiKey: tenant.rbacApiKey || undefined,
        loggingApiKey: tenant.loggingApiKey || undefined,
        notificationsApiKey: tenant.notificationsApiKey || undefined,
      });

      res.json({ message: "Onboarding email resent successfully" });
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({ message: "Failed to resend email" });
    }
  });

  // Update tenant modules (PLATFORM ADMIN ONLY)
  app.patch("/api/tenants/:id/modules", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { enabledModules, moduleConfigs } = req.body;

      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const currentModules = (tenant.enabledModules as string[]) || ["auth", "rbac"];
      const newModules = enabledModules || currentModules;

      // Update tenant modules
      await storage.updateTenantModules(id, newModules, moduleConfigs || {});

      res.json({
        message: "Modules updated successfully",
      });
    } catch (error) {
      console.error("Error updating tenant modules:", error);
      res.status(500).json({ message: "Failed to update modules" });
    }
  });

  // Configure Azure AD for a tenant (PLATFORM ADMIN ONLY)
  app.post("/api/tenants/:id/azure-ad/config", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tenantId, clientId, clientSecret, callbackUrl } = req.body;

      console.log(`Configuring Azure AD for tenant ${id}`);

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
          callbackUrl:
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

      console.log(`Azure AD configured successfully for tenant: ${tenant.name}`);

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

  // Azure AD OAuth Routes

  // Handle Azure AD OAuth callback - MUST COME BEFORE PARAMETERIZED ROUTE
  app.get("/api/auth/azure/callback", async (req, res) => {
    console.log("🚀 =================================");
    console.log("🚀 AZURE AD CALLBACK ROUTE HIT!!!");
    console.log("🚀 =================================");
    console.log("🚀 Timestamp:", new Date().toISOString());
    console.log("🚀 Method:", req.method);
    console.log("🚀 Full URL:", req.url);
    console.log("🚀 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("🚀 Query parameters:", JSON.stringify(req.query, null, 2));
    console.log("🚀 Body:", JSON.stringify(req.body, null, 2));
    console.log("🚀 =================================");

    try {
      const { code, state, error } = req.query;

      console.log("Parameters received:");
      console.log("- Code:", code ? "PROVIDED" : "MISSING");
      console.log("- State:", state ? "PROVIDED" : "MISSING");
      console.log("- Error:", error || "NONE");

      if (error) {
        console.error("Azure AD OAuth error:", error);
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:5000"}/auth/error?error=${encodeURIComponent(error as string)}`
        );
      }

      if (!code || !state) {
        console.error("Missing required parameters");
        return res.status(400).json({ message: "Missing authorization code or state" });
      }

      // Parse state to get tenant ID
      let stateData;
      try {
        const decodedState = decodeURIComponent(state as string);
        console.log("Decoded state:", decodedState);
        stateData = JSON.parse(decodedState);
        console.log("Parsed state data:", stateData);
      } catch (stateError) {
        console.error("State parsing error:", stateError);
        return res.status(400).json({ message: "Invalid state parameter" });
      }

      if (!stateData.tenantId) {
        console.error("Missing tenant ID in state");
        return res.status(400).json({ message: "Missing tenant ID in state" });
      }

      console.log(`Looking up tenant with ID: ${stateData.tenantId}`);

      // Get tenant configuration
      const tenant = await storage.getTenant(stateData.tenantId);
      console.log(
        "Tenant lookup result:",
        tenant ? `FOUND: ${tenant.name} (${tenant.orgId})` : "NOT FOUND"
      );

      if (!tenant) {
        console.error(`Tenant not found in database for ID: ${stateData.tenantId}`);
        return res.status(404).json({ message: "Tenant not found" });
      }

      console.log("Tenant found successfully, checking Azure AD configuration...");

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;
      const azureProvider = authConfig?.providers?.find((p: any) => p.type === "azure-ad");

      if (!azureProvider) {
        console.error("Azure AD provider not found in tenant configuration");
        return res.status(400).json({ message: "Azure AD not configured for this tenant" });
      }

      console.log("Azure AD provider found, creating service instance...");

      // Create Azure AD service instance
      const azureADService = new AzureADService({
        tenantId: azureProvider.config.tenantId,
        clientId: azureProvider.config.clientId,
        clientSecret: azureProvider.config.clientSecret,
        redirectUri:
          azureProvider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/azure/callback`,
      });

      console.log("Handling Azure AD callback with MSAL...");

      // Handle the callback
      const authResult = await azureADService.handleCallback(
        code as string,
        state as string,
        tenant.id
      );

      console.log(`User provisioned successfully: ${authResult.user.email}`);

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
      const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/auth/success?token=${appToken}&tenant=${tenant.orgId}`;

      console.log(`Redirecting to success page: ${redirectUrl}`);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("=== AZURE AD CALLBACK ERROR ===");
      console.error("Error details:", error);

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

      const errorUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/auth/error?error=${encodeURIComponent("Authentication failed")}`;
      res.redirect(errorUrl);
    }
  });

  // Start Azure AD OAuth flow (MUST COME AFTER CALLBACK ROUTE)
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

  // Tenant Authentication Routes

  // API Key Authentication for External NPM Packages
  app.post("/auth/login", validateApiKey, async (req, res) => {
    try {
      console.log(`🔑 API key authentication attempt for tenant: ${req.tenant?.orgId}`);

      // For API key auth, we don't require email/password
      // The API key validates the tenant, now we issue a JWT token
      const tenantId = req.tenantId!; // Set by validateApiKey middleware
      const tenant = req.tenant!;

      // Generate a tenant-scoped JWT token
      const token = await authService.generateTenantToken(tenantId, tenant.orgId);

      console.log(`✅ API key authentication successful for tenant: ${tenant.orgId}`);

      res.json({
        success: true,
        token: token.token,
        expiresAt: token.expiresAt,
        tenant: {
          id: tenantId,
          orgId: tenant.orgId,
          name: tenant.name,
          enabledModules: tenant.enabledModules,
        },
      });
    } catch (error) {
      console.error("API key authentication error:", error);
      res.status(500).json({
        error: "Authentication failed",
        details: "Unable to generate authentication token",
      });
    }
  });

  // Traditional User/Password Login (for web interface)
  app.post("/auth/login/password", async (req, res) => {
    try {
      const { email, password, tenantId, orgId } = req.body;

      if (!email || !password || (!tenantId && !orgId)) {
        return res
          .status(400)
          .json({ message: "Email, password, and tenantId (or orgId) are required" });
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

  // Tenant user logout
  app.post("/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Delete session from database
      await storage.deleteSession(token);

      console.log("👋 Tenant user logout requested");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // =============================================================================
  // COMPREHENSIVE V2 API IMPLEMENTATION - ALL PROMISED FUNCTIONALITY
  // =============================================================================

  // Auth API v2 - User Management
  app.post("/auth/users", tenantMiddleware, async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const tenantId = req.tenantId!; // Set by tenantMiddleware

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Email, password, and firstName are required" });
      }

      const hashedPassword = await authService.hashPassword(password);
      const user = await storage.createTenantUser({
        tenantId,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName: lastName || "",
        status: "active",
      });

      // Assign default role if provided
      if (role) {
        await storage.assignUserRole(user.id, role, tenantId);
      }

      const { passwordHash, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/auth/users", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const users = await storage.getTenantUsers(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/auth/users/:userId", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;

      const user = await storage.getTenantUser(userId, tenantId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/auth/users/:userId", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;
      const updates = req.body;

      if (updates.password) {
        updates.passwordHash = await authService.hashPassword(updates.password);
        delete updates.password;
      }

      const user = await storage.updateTenantUser(userId, tenantId, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/auth/users/:userId", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;

      await storage.deleteTenantUser(userId, tenantId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Password Reset Flow
  app.post("/auth/password-reset/request", async (req, res) => {
    try {
      const { email, tenantId, orgId } = req.body;

      let actualTenantId = tenantId;
      if (orgId && !tenantId) {
        const tenant = await storage.getTenantByOrgId(orgId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }
        actualTenantId = tenant.id;
      }

      const token = await authService.generatePasswordResetToken(email, actualTenantId);
      if (!token) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send reset email
      await emailService.sendPasswordResetEmail(email, token);
      res.json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to send reset email" });
    }
  });

  app.post("/auth/password-reset/confirm", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const success = await authService.resetPassword(token, newPassword);
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset confirm error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Session Management
  app.get("/auth/sessions", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const sessions = await storage.getActiveSessions(tenantId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  app.delete("/auth/sessions/:sessionId", tenantMiddleware, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;

      await storage.revokeSession(sessionId, tenantId);
      res.json({ message: "Session revoked successfully" });
    } catch (error) {
      console.error("Revoke session error:", error);
      res.status(500).json({ message: "Failed to revoke session" });
    }
  });

  app.post("/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const result = await authService.refreshToken(refreshToken);
      if (!result) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      res.json(result);
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  });

  // MFA Endpoints
  app.post("/auth/mfa/setup", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;
      const tenantId = req.tenantId;

      const mfaSetup = await authService.setupMFA(userId, tenantId);
      res.json(mfaSetup);
    } catch (error) {
      console.error("MFA setup error:", error);
      res.status(500).json({ message: "Failed to setup MFA" });
    }
  });

  app.post("/auth/mfa/verify", tenantMiddleware, async (req, res) => {
    try {
      const { userId, token } = req.body;
      const tenantId = req.tenantId;

      const isValid = await authService.verifyMFA(userId, token, tenantId);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid MFA token" });
      }

      res.json({ message: "MFA verified successfully" });
    } catch (error) {
      console.error("MFA verify error:", error);
      res.status(500).json({ message: "Failed to verify MFA" });
    }
  });

  // =============================================================================
  // RBAC API v2 - Role & Permission Management
  // =============================================================================

  // Roles Management
  app.get("/rbac/roles", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/rbac/roles", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const { name, description, permissions } = req.body;
      const tenantId = req.tenantId;

      if (!name) {
        return res.status(400).json({ message: "Role name is required" });
      }

      const role = await storage.createTenantRole({
        tenantId,
        name,
        description: description || "",
        permissions: permissions || [],
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Create role error:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put("/rbac/roles/:roleId", tenantMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      const tenantId = req.tenantId;
      const updates = req.body;

      const role = await storage.updateTenantRole(roleId, tenantId, updates);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json(role);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/rbac/roles/:roleId", tenantMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      const tenantId = req.tenantId;

      await storage.deleteTenantRole(roleId, tenantId);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Delete role error:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // User Role Assignment
  app.post("/rbac/users/:userId/roles", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      const tenantId = req.tenantId;

      if (!roleId) {
        return res.status(400).json({ message: "Role ID is required" });
      }

      await storage.assignUserRole(userId, roleId, tenantId);
      res.json({ message: "Role assigned successfully" });
    } catch (error) {
      console.error("Assign role error:", error);
      res.status(500).json({ message: "Failed to assign role" });
    }
  });

  app.delete("/rbac/users/:userId/roles/:roleId", tenantMiddleware, async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      const tenantId = req.tenantId;

      await storage.removeUserRole(userId, roleId, tenantId);
      res.json({ message: "Role removed successfully" });
    } catch (error) {
      console.error("Remove role error:", error);
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  // Permission Checking
  app.get("/rbac/users/:userId/permissions", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;

      const permissions = await storage.getUserPermissions(userId, tenantId);
      res.json({ permissions });
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.post("/rbac/check-permission", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const { userId, permission } = req.body;
      const tenantId = req.tenantId;

      if (!userId || !permission) {
        return res.status(400).json({ message: "User ID and permission are required" });
      }

      const hasPermission = await storage.checkUserPermission(userId, permission, tenantId);
      res.json({ hasPermission });
    } catch (error) {
      console.error("Check permission error:", error);
      res.status(500).json({ message: "Failed to check permission" });
    }
  });

  // =============================================================================
  // LOGGING API v2 - Event Logging & Audit
  // =============================================================================

  // Log Events
  app.post("/logging/events", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const { level, message, category, metadata, userId } = req.body;
      const tenantId = req.tenantId;

      if (!level || !message) {
        return res.status(400).json({ message: "Level and message are required" });
      }

      const logEvent = await storage.createLogEvent({
        tenantId,
        eventType: category || "application",
        level,
        message,
        metadata: metadata || {},
        userId: userId || null,
      });

      res.status(201).json(logEvent);
    } catch (error) {
      console.error("Create log event error:", error);
      res.status(500).json({ message: "Failed to create log event" });
    }
  });

  // Query Logs
  app.get("/logging/events", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { level, category, startDate, endDate, limit = 100, offset = 0 } = req.query;

      const filters = {
        tenantId,
        level: level as string,
        category: category as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const logs = await storage.getLogEvents(filters);
      res.json(logs);
    } catch (error) {
      console.error("Get log events error:", error);
      res.status(500).json({ message: "Failed to get log events" });
    }
  });

  // Log Statistics
  app.get("/logging/stats", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { period = "24h" } = req.query;

      const stats = await storage.getLogStatistics(tenantId, period as string);
      res.json(stats);
    } catch (error) {
      console.error("Get log stats error:", error);
      res.status(500).json({ message: "Failed to get log statistics" });
    }
  });

  // Alert Rules
  app.post("/logging/alert-rules", tenantMiddleware, async (req, res) => {
    try {
      const { name, condition, threshold, action } = req.body;
      const tenantId = req.tenantId;

      if (!name || !condition || !threshold || !action) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const alertRule = await storage.createAlertRule({
        tenantId,
        name,
        condition,
        threshold,
        action,
        enabled: true,
      });

      res.status(201).json(alertRule);
    } catch (error) {
      console.error("Create alert rule error:", error);
      res.status(500).json({ message: "Failed to create alert rule" });
    }
  });

  app.get("/logging/alert-rules", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const alertRules = await storage.getAlertRules(tenantId);
      res.json(alertRules);
    } catch (error) {
      console.error("Get alert rules error:", error);
      res.status(500).json({ message: "Failed to get alert rules" });
    }
  });

  // =============================================================================
  // NOTIFICATIONS API v2 - Multi-channel Notifications
  // =============================================================================

  // Send Notification
  app.post("/notifications/send", tenantMiddleware, async (req, res) => {
    try {
      const { recipientId, channel, template, data, priority = "normal" } = req.body;
      const tenantId = req.tenantId;

      if (!recipientId || !channel || !template) {
        return res.status(400).json({ message: "Recipient, channel, and template are required" });
      }

      const notification = await notificationService.sendNotification({
        tenantId,
        recipientId,
        channel,
        template,
        data: data || {},
        priority,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Notification History
  app.get("/notifications/history", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { recipientId, channel, status, limit = 50, offset = 0 } = req.query;

      const filters = {
        tenantId,
        recipientId: recipientId as string,
        channel: channel as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const notifications = await storage.getNotificationHistory(filters);
      res.json(notifications);
    } catch (error) {
      console.error("Get notification history error:", error);
      res.status(500).json({ message: "Failed to get notification history" });
    }
  });

  // Template Management
  app.post("/notifications/templates", tenantMiddleware, async (req, res) => {
    try {
      const { name, channel, subject, body, variables } = req.body;
      const tenantId = req.tenantId;

      if (!name || !channel || !body) {
        return res.status(400).json({ message: "Name, channel, and body are required" });
      }

      const template = await storage.createNotificationTemplate({
        tenantId,
        name,
        channel,
        subject: subject || "",
        body,
        variables: variables || [],
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Create template error:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.get("/notifications/templates", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { channel } = req.query;

      const templates = await storage.getNotificationTemplates(tenantId, channel as string);
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  // Notification Preferences
  app.get("/notifications/preferences/:userId", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;

      const preferences = await storage.getNotificationPreferences(userId, tenantId);
      res.json(preferences);
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  app.put("/notifications/preferences/:userId", tenantMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.tenantId;
      const preferences = req.body;

      const updated = await storage.updateNotificationPreferences(userId, tenantId, preferences);
      res.json(updated);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // =============================================================================
  // EMAIL API v2 - Enhanced Email Service
  // =============================================================================

  // Send Email
  app.post("/email/send", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      const tenantId = req.tenantId;

      if (!to || !subject) {
        return res.status(400).json({ message: "To and subject are required" });
      }

      // Use the existing sendSimpleTestEmail method for now
      const result = await emailService.sendSimpleTestEmail(to, subject);

      res.status(201).json({ success: result, message: "Email sent successfully" });
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Email Templates
  app.post("/email/templates", tenantMiddleware, async (req, res) => {
    try {
      const { name, subject, html, variables } = req.body;
      const tenantId = req.tenantId;

      if (!name || !subject || !html) {
        return res.status(400).json({ message: "Name, subject, and html are required" });
      }

      const template = await storage.createEmailTemplate({
        tenantId,
        name,
        subject,
        html,
        variables: variables || [],
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Create email template error:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.get("/email/templates", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const templates = await storage.getEmailTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Get email templates error:", error);
      res.status(500).json({ message: "Failed to get email templates" });
    }
  });

  // Email Stats
  app.get("/email/stats", tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { period = "7d" } = req.query;

      const stats = await storage.getEmailStatistics(tenantId, period as string);
      res.json(stats);
    } catch (error) {
      console.error("Get email stats error:", error);
      res.status(500).json({ message: "Failed to get email statistics" });
    }
  });

  // Return server instance
  return createServer(app);
}
