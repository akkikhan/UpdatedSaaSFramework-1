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
          authApiKey: tenant.authApiKey,
          rbacApiKey: tenant.rbacApiKey,
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
        authApiKey: tenant.authApiKey,
        rbacApiKey: tenant.rbacApiKey,
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
        authApiKey: tenant.authApiKey,
        rbacApiKey: tenant.rbacApiKey,
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

  // Login
  app.post("/api/v2/auth/login", async (req, res) => {
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
  app.post("/api/v2/auth/logout", async (req, res) => {
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

  // Return server instance
  return createServer(app);
}
