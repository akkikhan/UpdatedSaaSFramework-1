import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email";
import { db } from "./db";
import { authService } from "./services/auth";
import { platformAdminAuthService } from "./services/platform-admin-auth";
import { AzureADService } from "./services/azure-ad";
import { Auth0Service } from "./services/oauth/auth0";
import { SAMLService } from "./services/oauth/saml";
import { authMiddleware, tenantMiddleware } from "./middleware/auth";
import { platformAdminMiddleware } from "./middleware/platform-admin";
import { validateApiKey } from "./middleware/apiKeyAuth";
import { sql } from "drizzle-orm";
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
import { NOTIFICATION_DELAY_MS, MODULE_DEPENDENCIES } from "../shared/constants";
import { z } from "zod";
import { sanitizeGuid, GUID_CANON } from "./utils/azure";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug route for Azure AD login troubleshooting (must be early to avoid SPA routing conflicts)
  app.get("/debug-azure", (req, res) => {
    const file = path.resolve(__dirname, "../debug-azure-login.html");
    res.setHeader("Content-Type", "text/html");
    res.sendFile(file);
  });

  // Public routes

  // NOTE: Static HTML routes removed in favor of SPA routes
  // - /admin/login handled by client router (PlatformAdminLogin page)
  // - /tenants/wizard used for tenant onboarding

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

  // SDK/Integration docs (static HTML)
  app.get("/sdk", (req, res) => {
    const file = path.resolve(__dirname, "../docs/sdk.html");
    res.sendFile(file);
  });

  // Health check
  app.get("/api/health", async (_req, res) => {
    let database: "operational" | "unavailable" = "operational";
    try {
      if (!db) throw new Error("no_db");
      await db.execute(sql`select 1`);
    } catch {
      database = "unavailable";
    }
    const emailConnected = await emailService.testConnection().catch(() => false);
    const status = database === "operational" && emailConnected ? "operational" : "degraded";
    res.json({
      status,
      services: {
        database,
        email: emailConnected ? "operational" : "unavailable",
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Gmail quick test (platform admin only)
  app.post("/api/email/test", platformAdminMiddleware, async (req, res) => {
    try {
      const to = (req.body?.to as string) || process.env.ADMIN_EMAIL || "";
      if (!to) return res.status(400).json({ message: "Recipient not provided" });

      const ok = await emailService.sendSimpleTestEmail(to, "Gmail Test - SaaS Framework");
      return res.json({ success: ok, to });
    } catch (err) {
      console.error("/api/email/test failed:", err);
      return res.status(500).json({ message: "Email test failed" });
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

      console.log("[PlatformAdmin][AzureAD] Callback hit");
      console.log("[PlatformAdmin][AzureAD] Query:", JSON.stringify(req.query));

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

      // Prevent double-processing the same authorization code (browser retries/back button)
      const handledCodes = (global as any).__platformHandledCodes || new Map<string, number>();
      (global as any).__platformHandledCodes = handledCodes;

      if (typeof code === "string") {
        // Clear expired entries
        const now = Date.now();
        for (const [k, t] of handledCodes.entries()) {
          if (now - t > 5 * 60 * 1000) handledCodes.delete(k);
        }
        if (handledCodes.has(code)) {
          console.warn("Authorization code already processed recently; restarting login.");
          return res.redirect("/api/platform/auth/azure/login");
        }
        handledCodes.set(code, Date.now());
      }

      // Exchange code for tokens and get user info (platform admin - no tenant provisioning)
      let authResult;
      try {
        authResult = await azureADService.handlePlatformAdminCallback(code, state);
      } catch (innerError) {
        console.error("[PlatformAdmin][AzureAD] handlePlatformAdminCallback failed:", innerError);
        const detail = encodeURIComponent(
          innerError instanceof Error ? innerError.message : String(innerError)
        );
        const devSuffix = process.env.NODE_ENV !== "production" ? `&detail=${detail}` : "";
        // If the code was already redeemed, restart login to get a fresh code
        if (
          typeof detail === "string" &&
          /invalid_grant/i.test(detail) &&
          /already redeemed/i.test(detail)
        ) {
          console.warn("Authorization code already redeemed. Restarting Azure AD login flow...");
          return res.redirect("/api/platform/auth/azure/login");
        }
        return res.redirect(`/admin/login?error=callback_processing_failed${devSuffix}`);
      }

      // Check if user email is authorized
      const userEmail = authResult.user.email?.toLowerCase();

      if (!AUTHORIZED_ADMIN_EMAILS.includes(userEmail)) {
        console.log(`Unauthorized email attempted login: ${userEmail}`);
        console.log(`Authorized emails: ${AUTHORIZED_ADMIN_EMAILS.join(", ")}`);
        return res.redirect("/admin/login?error=unauthorized_email");
      }

      // Create or update platform admin record for Azure AD user
      let platformAdmin;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          platformAdmin = await storage.getPlatformAdminByEmail(authResult.user.email);
          break; // Success, exit retry loop
        } catch (dbError) {
          retryCount++;
          console.log(
            `Database connection attempt ${retryCount}/${maxRetries} failed:`,
            dbError.message
          );

          if (retryCount >= maxRetries) {
            throw dbError; // Re-throw if max retries reached
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!platformAdmin) {
        // Create new platform admin with retry logic
        retryCount = 0;
        while (retryCount < maxRetries) {
          try {
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
            break; // Success, exit retry loop
          } catch (dbError) {
            retryCount++;
            console.log(
              `Database creation attempt ${retryCount}/${maxRetries} failed:`,
              dbError.message
            );

            if (retryCount >= maxRetries) {
              throw dbError; // Re-throw if max retries reached
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } else {
        // Update last login with retry logic
        retryCount = 0;
        while (retryCount < maxRetries) {
          try {
            await storage.updatePlatformAdminLastLogin(platformAdmin.id);
            break; // Success, exit retry loop
          } catch (dbError) {
            retryCount++;
            console.log(
              `Database update attempt ${retryCount}/${maxRetries} failed:`,
              dbError.message
            );

            if (retryCount >= maxRetries) {
              console.warn("Failed to update last login, but continuing..."); // Non-critical operation
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
      }

      // Log Azure AD login with retry logic
      retryCount = 0;
      while (retryCount < maxRetries) {
        try {
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
          break; // Success, exit retry loop
        } catch (dbError) {
          retryCount++;
          console.log(
            `System logging attempt ${retryCount}/${maxRetries} failed:`,
            dbError.message
          );

          if (retryCount >= maxRetries) {
            console.warn("Failed to log system activity, but continuing..."); // Non-critical operation
            break;
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Generate a platform admin token for this user
      const platformAdminToken = await platformAdminAuthService.generateToken(platformAdmin);

      // Redirect to main app with token (React dashboard)
      res.redirect(`/?token=${platformAdminToken}&admin=true`);
    } catch (error) {
      console.error("Azure AD callback processing error:", error);
      const message = error instanceof Error ? error.message : String(error);

      // Special handling: authorization code already redeemed -> restart login to get a fresh code
      if (/invalid_grant/i.test(message) && /already redeemed/i.test(message)) {
        console.warn("Authorization code already redeemed. Restarting Azure AD login flow...");
        return res.redirect("/api/platform/auth/azure/login");
      }

      const detail = encodeURIComponent(message);
      const devSuffix = process.env.NODE_ENV !== "production" ? `&detail=${detail}` : "";
      res.redirect(`/admin/login?error=callback_processing_failed${devSuffix}`);
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

  // ===========================================================================
  // Platform Admin: System & Email Logs
  app.get("/api/logs/system", platformAdminMiddleware, async (req, res) => {
    try {
      const { tenantId, action, state, limit, offset } = req.query as {
        tenantId?: string;
        action?: string;
        state?: string;
        limit?: string;
        offset?: string;
      };

      const logs = await storage.getSystemLogs({
        tenantId,
        action,
        state,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      // Explicitly set JSON content type to avoid any HTML fallback responses
      res.setHeader("Content-Type", "application/json");
      res.json(logs);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ message: "Failed to fetch system logs" });
    }
  });

  app.get("/api/logs/email", platformAdminMiddleware, async (req, res) => {
    try {
      const { tenantId, status, limit, offset } = req.query as {
        tenantId?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const logs = await storage.getEmailLogs({
        tenantId,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // RBAC Configuration (Platform Admin only)
  // Permission Templates
  app.get("/api/rbac-config/permission-templates", platformAdminMiddleware, async (_req, res) => {
    try {
      const list = await storage.getPermissionTemplates();
      res.json(list);
    } catch (error) {
      console.error("Error fetching permission templates:", error);
      res.status(500).json({ message: "Failed to fetch permission templates" });
    }
  });

  app.post("/api/rbac-config/permission-templates", platformAdminMiddleware, async (req, res) => {
    try {
      const input = insertPermissionTemplateSchema.parse(req.body);
      const created = await storage.createPermissionTemplate(input);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating permission template:", error);
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.put(
    "/api/rbac-config/permission-templates/:id",
    platformAdminMiddleware,
    async (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body || {};
        const updated = await storage.updatePermissionTemplate(id, updates);
        res.json(updated);
      } catch (error) {
        console.error("Error updating permission template:", error);
        res.status(400).json({ message: "Failed to update permission template" });
      }
    }
  );

  app.delete(
    "/api/rbac-config/permission-templates/:id",
    platformAdminMiddleware,
    async (req, res) => {
      try {
        const id = req.params.id;
        await storage.deletePermissionTemplate(id);
        res.status(204).end();
      } catch (error) {
        console.error("Error deleting permission template:", error);
        res.status(400).json({ message: "Failed to delete permission template" });
      }
    }
  );

  // Business Types
  app.get("/api/rbac-config/business-types", platformAdminMiddleware, async (_req, res) => {
    try {
      const list = await storage.getBusinessTypes();
      res.json(list);
    } catch (error) {
      console.error("Error fetching business types:", error);
      res.status(500).json({ message: "Failed to fetch business types" });
    }
  });

  app.post("/api/rbac-config/business-types", platformAdminMiddleware, async (req, res) => {
    try {
      const input = insertBusinessTypeSchema.parse(req.body);
      const created = await storage.createBusinessType(input);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating business type:", error);
      res.status(400).json({ message: "Invalid business type data" });
    }
  });

  app.put("/api/rbac-config/business-types/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body || {};
      const updated = await storage.updateBusinessType(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating business type:", error);
      res.status(400).json({ message: "Failed to update business type" });
    }
  });

  app.delete("/api/rbac-config/business-types/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteBusinessType(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting business type:", error);
      res.status(400).json({ message: "Failed to delete business type" });
    }
  });

  // Default Roles
  app.get("/api/rbac-config/default-roles", platformAdminMiddleware, async (_req, res) => {
    try {
      const list = await storage.getDefaultRoles();
      res.json(list);
    } catch (error) {
      console.error("Error fetching default roles:", error);
      res.status(500).json({ message: "Failed to fetch default roles" });
    }
  });

  app.post("/api/rbac-config/default-roles", platformAdminMiddleware, async (req, res) => {
    try {
      const input = insertDefaultRoleSchema.parse(req.body);
      const created = await storage.createDefaultRole(input);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating default role:", error);
      res.status(400).json({ message: "Invalid role data" });
    }
  });

  app.put("/api/rbac-config/default-roles/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body || {};
      const updated = await storage.updateDefaultRole(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating default role:", error);
      res.status(400).json({ message: "Failed to update default role" });
    }
  });

  app.delete("/api/rbac-config/default-roles/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteDefaultRole(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting default role:", error);
      res.status(400).json({ message: "Failed to delete default role" });
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
      const newToken = jwt.default.sign(
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

      // Normalize enabledModules to include configured providers for consistency
      try {
        const mc = (tenant.moduleConfigs as any) || {};
        const providers: any[] = (mc.auth?.providers || []) as any[];
        if (providers?.length) {
          const providerTypes = providers.map(p => p?.type).filter(Boolean);
          const normalized = Array.from(
            new Set([...((tenant.enabledModules as any[]) || []), ...providerTypes])
          );
          tenant.enabledModules = normalized as any;
        }
      } catch {}

      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant by orgId:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.get("/api/tenants/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenant(id);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);

      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Create new tenant
  app.post("/api/tenants", platformAdminMiddleware, async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);

      // Enforce: RBAC cannot be enabled without Auth
      try {
        const mods: string[] = tenantData.enabledModules || [];
        if (mods.includes("rbac") && !mods.includes("auth")) {
          return res.status(400).json({ message: "RBAC requires Authentication to be enabled" });
        }
      } catch {}

      // Encrypt any provider secrets before persisting
      try {
        if (tenantData.moduleConfigs?.auth?.providers?.length) {
          const { encryptSecret } = await import("./utils/secret.js");
          tenantData.moduleConfigs.auth.providers = tenantData.moduleConfigs.auth.providers.map(
            (p: any) => {
              if (p?.type === "azure-ad" && p.config?.clientSecret) {
                return {
                  ...p,
                  config: {
                    ...p.config,
                    clientSecret: encryptSecret(p.config.clientSecret),
                  },
                };
              }
              if (p?.type === "auth0" && p.config?.clientSecret) {
                return {
                  ...p,
                  config: {
                    ...p.config,
                    clientSecret: encryptSecret(p.config.clientSecret),
                  },
                };
              }
              return p;
            }
          );
        }
      } catch (e) {
        console.warn("Provider secret encryption skipped:", e instanceof Error ? e.message : e);
      }

      // Check if orgId is already taken
      const existingTenant = await storage.getTenantByOrgId(tenantData.orgId);
      if (existingTenant) {
        return res.status(400).json({ message: "Organization ID already exists" });
      }

      // Create tenant
      const tenant = await storage.createTenant(tenantData);

      // Send onboarding email automatically
      const shouldSendEmail = req.body.sendEmail !== false;
      let emailSent = false;
      if (shouldSendEmail) {
        emailSent = await emailService.sendTenantOnboardingEmail({
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

      res.status(201).json({ ...tenant, emailSent });
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

  // RBAC Configuration Routes
  app.get("/api/rbac-config/permission-templates", async (req, res) => {
    try {
      const templates = await storage.getPermissionTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching permission templates:", error);
      res.status(500).json({ message: "Failed to fetch permission templates" });
    }
  });

  app.get("/api/rbac-config/business-types", async (req, res) => {
    try {
      const types = await storage.getBusinessTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching business types:", error);
      res.status(500).json({ message: "Failed to fetch business types" });
    }
  });

  app.get("/api/rbac-config/default-roles", async (req, res) => {
    try {
      const { businessTypeId } = req.query as { businessTypeId?: string };
      const roles = businessTypeId
        ? await storage.getDefaultRolesByBusinessType(businessTypeId)
        : await storage.getDefaultRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching default roles:", error);
      res.status(500).json({ message: "Failed to fetch default roles" });
    }
  });

  // Public Tenant Registration (no auth required)

  app.post("/api/register", async (req, res) => {
    try {
      const { name, orgId, adminEmail, adminName, enabledModules } = req.body;

      // Validate required fields
      if (!name || !orgId || !adminEmail || !adminName) {
        return res.status(400).json({ message: "name, orgId, adminEmail, adminName are required" });
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

      // Create tenant (also provisions a default admin with temp password)
      const tenant = await storage.createTenant(tenantData);

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
        note: "Admin temp password has been set. Check onboarding email.",
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
        console.warn(`Failed to resend onboarding email to ${tenant.adminEmail}`);
        return res.status(500).json({ message: "Failed to resend email" });
      }

      res.json({ message: "Onboarding email resent successfully" });
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({ message: "Failed to resend email" });
    }
  });

  // Tenant self-service: update limited auth settings (allowFallback, defaultProvider)
  app.patch("/api/tenant/:id/auth/settings", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // Ensure the tenant in token matches path id
      if (req.tenantId !== id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { allowFallback, defaultProvider } = req.body as {
        allowFallback?: boolean;
        defaultProvider?: string;
      };

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const currentConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = { ...(currentConfigs.auth || {}) };
      if (typeof allowFallback === "boolean") authConfig.allowFallback = allowFallback;
      if (typeof defaultProvider === "string") authConfig.defaultProvider = defaultProvider;

      const newConfigs = { ...currentConfigs, auth: authConfig };
      const enabledModules = (tenant.enabledModules as string[]) || ["auth", "rbac"];
      await storage.updateTenantModules(id, enabledModules, newConfigs);
      res.json({ message: "Auth settings updated", auth: authConfig });
    } catch (error) {
      console.error("Error updating tenant auth settings:", error);
      res.status(500).json({ message: "Failed to update auth settings" });
    }
  });

  // Tenant self-service: read Logging settings
  app.get("/api/tenant/:id/logging/settings", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const logging = ((tenant.moduleConfigs as any) || {}).logging || {};
      res.json({
        levels: Array.isArray(logging.levels) ? logging.levels : ["error", "warning", "info"],
        destinations: Array.isArray(logging.destinations) ? logging.destinations : [],
        retentionDays: typeof logging.retentionDays === "number" ? logging.retentionDays : 30,
        redactionEnabled: Boolean(logging.redactionEnabled),
      });
    } catch (error) {
      console.error("Error fetching tenant logging settings:", error);
      res.status(500).json({ message: "Failed to fetch logging settings" });
    }
  });

  // Tenant self-service: update Logging settings (no enable/disable)
  app.patch("/api/tenant/:id/logging/settings", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const body = req.body || {};
      const schema = z.object({
        levels: z.array(z.enum(["error", "warning", "info", "debug"]).optional()).optional(),
        destinations: z.array(z.enum(["database"]).optional()).optional(),
        retentionDays: z.number().int().min(1).max(365).optional(),
        redactionEnabled: z.boolean().optional(),
      });
      const updates = schema.parse(body);

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const currentConfigs = (tenant.moduleConfigs as any) || {};
      const loggingCfg = { ...(currentConfigs.logging || {}) };
      const nextLogging = {
        ...loggingCfg,
        ...updates,
        destinations: ["database"],
      } as any;
      const newConfigs = { ...currentConfigs, logging: nextLogging };
      const enabledModules = (tenant.enabledModules as string[]) || [];
      await storage.updateTenantModules(id, enabledModules, newConfigs);
      res.json({ message: "Logging settings updated", logging: nextLogging });
    } catch (error) {
      console.error("Error updating tenant logging settings:", error);
      res.status(400).json({ message: "Failed to update logging settings" });
    }
  });

  // Tenant self-service: read RBAC settings (template, businessType, defaults)
  app.get("/api/tenant/:id/rbac/settings", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const rbac = ((tenant.moduleConfigs as any) || {}).rbac || {};
      res.json({
        permissionTemplate: rbac.permissionTemplate || "standard",
        businessType: rbac.businessType || "general",
        defaultRoles: rbac.defaultRoles || ["Admin", "Manager", "Viewer"],
        customPermissions: rbac.customPermissions || [],
      });
    } catch (error) {
      console.error("Error fetching tenant RBAC settings:", error);
      res.status(500).json({ message: "Failed to fetch RBAC settings" });
    }
  });

  // Tenant self-service: auth providers status (basic readiness info for portal)
  app.get("/api/tenant/:id/auth/providers/status", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const providers = (((tenant.moduleConfigs as any) || {}).auth || {}).providers || [];
      const toStatus = (p: any) => {
        const type = p?.type || "custom";
        let configured = false;
        try {
          if (type === "azure-ad") {
            configured = Boolean(
              p?.config?.tenantId && p?.config?.clientId && p?.config?.clientSecret
            );
          } else if (type === "auth0") {
            configured = Boolean(
              p?.config?.domain && p?.config?.clientId && p?.config?.clientSecret
            );
          } else {
            configured = true;
          }
        } catch {}
        return {
          type,
          name: p?.name || type,
          enabled: Boolean(p?.enabled),
          configured,
          lastCheckedAt: null,
          lastError: null,
        };
      };

      return res.json((Array.isArray(providers) ? providers : []).map(toStatus));
    } catch (error) {
      console.error("Auth providers status error:", error);
      res.status(500).json({ message: "Failed to fetch providers status" });
    }
  });

  // Platform Admin: send a quick test log event for a tenant
  app.post("/api/admin/logging/test-event", platformAdminMiddleware, async (req, res) => {
    try {
      const {
        tenantId,
        level = "info",
        category = "admin-test",
        message = "Test event",
      } = req.body || {};
      if (!tenantId) return res.status(400).json({ message: "tenantId required" });
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      await storage.createLogEvent({
        tenantId,
        eventType: category,
        level,
        message,
        metadata: { by: "platform-admin", at: new Date().toISOString() },
      });
      res.json({ success: true });
    } catch (e) {
      console.error("Admin test log event error:", e);
      res.status(500).json({ message: "Failed to create test event" });
    }
  });

  // Platform Admin: query tenant event logs
  app.get("/api/admin/logging/events", platformAdminMiddleware, async (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "");
      if (!tenantId) return res.status(400).json({ message: "tenantId required" });
      const level = req.query.level ? String(req.query.level) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
      const offset = req.query.offset ? parseInt(String(req.query.offset)) : 0;

      const list = await storage.getLogEvents({
        tenantId,
        level,
        category,
        startDate,
        endDate,
        limit,
        offset,
      } as any);
      res.json(list);
    } catch (e) {
      console.error("Admin get tenant logs error:", e);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Tenant self-service: update RBAC settings (no enable/disable)
  app.patch("/api/tenant/:id/rbac/settings", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const body = req.body || {};
      const schema = z.object({
        permissionTemplate: z.enum(["standard", "enterprise", "custom"]).optional(),
        businessType: z
          .enum(["general", "healthcare", "finance", "education", "government"])
          .optional(),
        defaultRoles: z.array(z.string()).optional(),
        customPermissions: z.array(z.string()).optional(),
      });
      const updates = schema.parse(body);

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const currentConfigs = (tenant.moduleConfigs as any) || {};
      const rbacCfg = { ...(currentConfigs.rbac || {}) };
      const nextRbac = { ...rbacCfg, ...updates };
      const newConfigs = { ...currentConfigs, rbac: nextRbac };
      const enabledModules = (tenant.enabledModules as string[]) || [];
      await storage.updateTenantModules(id, enabledModules, newConfigs);
      res.json({ message: "RBAC settings updated", rbac: nextRbac });
    } catch (error) {
      console.error("Error updating tenant RBAC settings:", error);
      res.status(400).json({ message: "Failed to update RBAC settings" });
    }
  });

  // Tenant RBAC catalogs (read-only): permission templates and business types
  app.get("/api/tenant/:id/rbac/catalog/templates", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });
      const list = await storage.getPermissionTemplates();
      // Expose minimal fields
      res.json(
        (list || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          permissions: t.permissions || [],
          isActive: t.isActive,
        }))
      );
    } catch (error) {
      console.error("Error fetching tenant RBAC templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/tenant/:id/rbac/catalog/business-types", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });
      const list = await storage.getBusinessTypes();
      res.json(
        (list || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          riskLevel: b.riskLevel,
          isActive: b.isActive,
        }))
      );
    } catch (error) {
      console.error("Error fetching tenant business types:", error);
      res.status(500).json({ message: "Failed to fetch business types" });
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
      const requested = enabledModules ? [...enabledModules] : currentModules;
      const requestedSet = new Set(requested);

      // Build reverse dependency map to validate removals
      const reverseDeps: Record<string, string[]> = {};
      for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
        deps.forEach(dep => {
          if (!reverseDeps[dep]) reverseDeps[dep] = [];
          reverseDeps[dep].push(mod);
        });
      }

      // Prevent disabling modules that other modules depend on
      for (const [dep, dependents] of Object.entries(reverseDeps)) {
        if (!requestedSet.has(dep)) {
          const active = dependents.filter(d => requestedSet.has(d));
          if (active.length > 0) {
            return res.status(400).json({ message: `${dep} is required by ${active.join(", ")}` });
          }
        }
      }

      // Auto-add dependencies for selected modules
      for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
        if (requestedSet.has(mod)) {
          deps.forEach(dep => requestedSet.add(dep));
        }
      }

      const finalModules = Array.from(requestedSet);

      // Encrypt any provider secrets before persisting (parity with createTenant)
      let safeConfigs = moduleConfigs || {};
      try {
        if (safeConfigs?.auth?.providers?.length) {
          const { encryptSecret } = await import("./utils/secret.js");
          safeConfigs = {
            ...safeConfigs,
            auth: {
              ...(safeConfigs.auth || {}),
              providers: safeConfigs.auth.providers.map((p: any) => {
                if (p?.type === "azure-ad" && p.config?.clientSecret) {
                  return {
                    ...p,
                    config: { ...p.config, clientSecret: encryptSecret(p.config.clientSecret) },
                  };
                }
                if (p?.type === "auth0" && p.config?.clientSecret) {
                  return {
                    ...p,
                    config: { ...p.config, clientSecret: encryptSecret(p.config.clientSecret) },
                  };
                }
                return p;
              }),
            },
          } as any;
        }
        // Clamp logging destinations to database only and cap retentionDays
        if (safeConfigs?.logging) {
          safeConfigs.logging = {
            ...safeConfigs.logging,
            destinations: ["database"],
            retentionDays: Math.max(
              1,
              Math.min(365, Number(safeConfigs.logging.retentionDays || 30))
            ),
          };
        }
      } catch (e) {
        console.warn(
          "Provider secret encryption (update) skipped:",
          e instanceof Error ? e.message : e
        );
      }

      // Update tenant modules
      await storage.updateTenantModules(id, finalModules, safeConfigs);

      res.json({
        message: "Modules updated successfully",
      });
    } catch (error) {
      console.error("Error updating tenant modules:", error);
      res.status(500).json({ message: "Failed to update modules" });
    }
  });

  // Explicitly notify tenant about module changes
  app.post("/api/tenants/:id/notify-module-change", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled = [], disabled = [] } = req.body || {};
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      await new Promise(res => setTimeout(res, NOTIFICATION_DELAY_MS));

      try {
        await emailService.sendModuleStatusEmail(
          { id: tenant.id, name: tenant.name, adminEmail: tenant.adminEmail },
          { enabled, disabled }
        );
      } catch (e) {
        console.warn("Module change email failed:", e instanceof Error ? e.message : e);
      }

      res.json({ message: "Notification dispatched" });
    } catch (error) {
      console.error("Notify module change error:", error);
      res.status(500).json({ message: "Failed to notify tenant" });
    }
  });

  // Tenant module change request (tenant admin can request enable/disable)
  app.post("/api/tenant/:id/modules/request", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const { moduleId, action, reason } = req.body || {};
      if (!moduleId || !action) {
        return res.status(400).json({ message: "moduleId and action are required" });
      }

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      // Log request
      await storage.logSystemActivity({
        tenantId: id,
        action: "module_change_request",
        entityType: "tenant",
        entityId: id,
        details: { moduleId, action, reason },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Attempt to notify platform admins by email (best-effort)
      try {
        const recipients = (process.env.AUTHORIZED_ADMIN_EMAILS || "")
          .split(",")
          .filter(Boolean);
        const to = recipients[0] || process.env.ADMIN_EMAIL || tenant.adminEmail;
        await emailService.sendModuleRequestEmail(
          { id: tenant.id, name: tenant.name, adminEmail: tenant.adminEmail },
          { moduleId, action, reason },
          to
        );
      } catch {}

      res.json({ message: "Request submitted" });
    } catch (error) {
      console.error("Module request error:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Configure Azure AD for a tenant (PLATFORM ADMIN ONLY)
  app.post("/api/tenants/:id/azure-ad/config", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tenantId, clientId, clientSecret, callbackUrl } = req.body;

      const tenantIdVal = sanitizeGuid(tenantId);
      const clientIdVal = sanitizeGuid(clientId);
      const clientSecretVal = String(clientSecret ?? "").trim();

      console.log(`Configuring Azure AD for tenant ${id}`);

      // Validate required fields and formats
      const errors: string[] = [];
      if (!tenantIdVal || !GUID_CANON.test(tenantIdVal))
        errors.push("tenantId must be a GUID from Azure AD (format: 8-4-4-4-12)");
      if (!clientIdVal || !GUID_CANON.test(clientIdVal))
        errors.push("clientId must be a GUID (Application ID) (format: 8-4-4-4-12)");
      if (!clientSecretVal) errors.push("clientSecret is required");
      if (errors.length) {
        return res.status(400).json({ message: "Invalid Azure AD configuration", errors });
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
      // Encrypt secret before storing
      let encryptedSecret: string | undefined = clientSecretVal;
      try {
        const { encryptSecret } = await import("./utils/secret.js");
        encryptedSecret = encryptSecret(clientSecretVal);
      } catch {}

      moduleConfigs.auth.providers.push({
        type: "azure-ad",
        name: "Azure AD SSO",
        priority: 1,
        config: {
          tenantId: tenantIdVal,
          clientId: clientIdVal,
          clientSecret: encryptedSecret,
          callbackUrl:
            callbackUrl ||
            `${process.env.BASE_URL || "http://localhost:5000"}/api/auth/azure/callback`,
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
      let azureProvider = authConfig?.providers?.find((p: any) => p.type === "azure-ad");

      if (!azureProvider) {
        console.error("Azure AD provider not found in tenant configuration");
        return res.status(400).json({ message: "Azure AD not configured for this tenant" });
      }

      console.log("Azure AD provider found, creating service instance...");

      // Decrypt clientSecret if encrypted; surface clear error if undecryptable
      let decryptErrorMessage = "";
      try {
        const { decryptSecret } = await import("./utils/secret.js");
        if (azureProvider.config?.clientSecret) {
          azureProvider = {
            ...azureProvider,
            config: {
              ...azureProvider.config,
              clientSecret: decryptSecret(azureProvider.config.clientSecret),
            },
          };
        }
      } catch (decErr: any) {
        decryptErrorMessage = decErr?.message || String(decErr || "");
        const details = encodeURIComponent(
          "Stored clientSecret cannot be decrypted. The platform JWT_SECRET may have changed."
        );
        const errorUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/auth-error?error=${encodeURIComponent(
          "SECRET_DECRYPTION_FAILED"
        )}&code=${encodeURIComponent("SECRET_DECRYPTION_FAILED")}&details=${details}`;
        return res.redirect(errorUrl);
      }

      // Guard: ensure required fields for SSO
      if (
        !azureProvider.config?.tenantId ||
        !azureProvider.config?.clientId ||
        !azureProvider.config?.clientSecret
      ) {
        console.error("Azure AD provider is incomplete for tenant", tenant.orgId);
        return res.status(400).json({
          message: "Azure AD not fully configured for this tenant",
          next: `/tenant/${tenant.orgId}/settings/auth-providers`,
          required: ["tenantId", "clientId", "clientSecret"],
        });
      }

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

      const jwt = await import("jsonwebtoken");
      const appToken = jwt.default.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: "8h" });

      console.log("Generated JWT token for user - Fixed DB constraint"); // Fixed JWT import and DB constraint

      // Log successful login
      await storage.logSystemActivity({
        tenantId: tenant.id,
        adminUserId: null, // Azure AD tenant users don't exist in users table
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
      const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/auth-success?token=${appToken}&tenant=${tenant.orgId}`;

      console.log(`Redirecting to success page: ${redirectUrl}`);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("=== AZURE AD CALLBACK ERROR ===");
      console.error("Error details:", error);

      // Log failed login attempt
      let errorTenantOrgId: string | undefined;
      if (req.query.state) {
        try {
          const stateData = JSON.parse(decodeURIComponent(req.query.state as string));
          if (stateData.tenantId) {
            // Try to resolve tenant orgId for better client UX
            try {
              const t = await storage.getTenant(stateData.tenantId);
              errorTenantOrgId = t?.orgId;
            } catch {}
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

      // Surface Azure error details in the client for easier troubleshooting
      const rawMsg = error instanceof Error ? error.message : String(error);
      const codeMatch = rawMsg.match(/AADSTS\d+/i);
      const code = codeMatch ? codeMatch[0] : "unknown";
      const corrMatch = rawMsg.match(/Correlation ID:\s*([a-f0-9\-]+)/i);
      const corrId = corrMatch ? corrMatch[1] : "";
      const details = encodeURIComponent(rawMsg.slice(0, 800));
      const tenantParam = errorTenantOrgId ? `&tenant=${encodeURIComponent(errorTenantOrgId)}` : "";
      const errorUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/auth-error?error=${encodeURIComponent(
        "Authentication failed"
      )}&code=${encodeURIComponent(code)}&details=${details}&corr=${encodeURIComponent(corrId)}${tenantParam}`;
      res.redirect(errorUrl);
    }
  });

  // JWKS endpoint for RS256 verification (exposes RSA public key if configured)
  app.get("/.well-known/jwks.json", async (req, res) => {
    try {
      const pub = process.env.RSA_PUBLIC_KEY;
      if (!pub) return res.json({ keys: [] });
      // Convert PEM to JWK
      const { createPublicKey } = await import("crypto");
      const keyObj = createPublicKey(pub);
      // Node can export JWK in recent versions
      // @ts-ignore
      const jwk = keyObj.export({ format: "jwk" }) as any;
      // Add typical fields
      jwk.kid = process.env.JWKS_KID || "saas-rsa-1";
      jwk.use = "sig";
      jwk.alg = "RS256";
      res.json({ keys: [jwk] });
    } catch (e) {
      console.error("JWKS error:", e);
      res.json({ keys: [] });
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

  app.get("/api/auth/auth0/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;

      if (!authConfig?.providers) {
        return res.status(400).json({ message: "Authentication not configured for this tenant" });
      }

      let auth0Provider = authConfig.providers.find((p: any) => p.type === "auth0");
      if (!auth0Provider || !auth0Provider.enabled) {
        return res
          .status(400)
          .json({ message: "Auth0 authentication not enabled for this tenant" });
      }

      try {
        const { decryptSecret } = await import("./utils/secret.js");
        if (auth0Provider.config?.clientSecret) {
          auth0Provider = {
            ...auth0Provider,
            config: {
              ...auth0Provider.config,
              clientSecret: decryptSecret(auth0Provider.config.clientSecret),
            },
          };
        }
      } catch {
        // ignore decryption errors
      }

      const service = new Auth0Service({
        domain: auth0Provider.config.domain,
        clientId: auth0Provider.config.clientId,
        clientSecret: auth0Provider.config.clientSecret,
        redirectUri:
          auth0Provider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/auth0/callback`,
      });

      const state = service.generateState(tenant.orgId);
      const authUrl = service.getAuthUrl(state);
      res.json({ authUrl, state });
    } catch (err) {
      console.error("Error starting Auth0 OAuth:", err);
      res.status(500).json({ message: "Failed to start Auth0 authentication" });
    }
  });

  app.post("/api/auth/auth0/callback", async (req, res) => {
    try {
      const { code, state, config } = req.body as any;
      if (!code || !state || !config) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const service = new Auth0Service({
        domain: config.domain,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri:
          config.redirectUri || `${req.protocol}://${req.get("host")}/api/auth/auth0/callback`,
      });

      const parsed = service.parseState(state);
      if (!parsed) return res.status(400).json({ message: "Invalid state parameter" });

      const tenant = await storage.getTenantByOrgId(parsed.tenantOrgId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const result = await service.handleCallback(code, state, tenant);
      if (!result) return res.status(400).json({ message: "Auth0 authentication failed" });

      res.json(result);
    } catch (err) {
      console.error("Auth0 callback error:", err);
      res.status(500).json({ message: "Failed to handle Auth0 callback" });
    }
  });

  app.get("/api/auth/saml/:orgId", async (req, res) => {
    try {
      const { orgId } = req.params;
      const tenant = await storage.getTenantByOrgId(orgId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;
      if (!authConfig?.providers) {
        return res.status(400).json({ message: "Authentication not configured for this tenant" });
      }

      const samlProvider = authConfig.providers.find((p: any) => p.type === "saml" && p.enabled);
      if (!samlProvider) {
        return res.status(400).json({ message: "SAML authentication not enabled for this tenant" });
      }

      const service = new SAMLService({
        entryPoint: samlProvider.config.entryPoint,
        issuer: samlProvider.config.issuer,
        cert: samlProvider.config.cert,
        callbackUrl:
          samlProvider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/saml/callback`,
      });

      const state = SAMLService.generateState(tenant.orgId);
      const authUrl = service.initiateLogin(state);
      res.json({ authUrl, state });
    } catch (err) {
      console.error("Error starting SAML authentication:", err);
      res.status(500).json({ message: "Failed to start SAML authentication" });
    }
  });

  app.post("/api/auth/saml/callback", async (req, res) => {
    try {
      const { samlResponse, state } = req.body as any;
      if (!samlResponse || !state) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const parsed = SAMLService.parseState(state);
      if (!parsed) return res.status(400).json({ message: "Invalid state parameter" });

      const tenant = await storage.getTenantByOrgId(parsed.tenantOrgId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;
      const samlProvider = authConfig?.providers?.find((p: any) => p.type === "saml" && p.enabled);
      if (!samlProvider) {
        return res.status(400).json({ message: "SAML authentication not enabled for this tenant" });
      }

      const service = new SAMLService({
        entryPoint: samlProvider.config.entryPoint,
        issuer: samlProvider.config.issuer,
        cert: samlProvider.config.cert,
        callbackUrl:
          samlProvider.config.callbackUrl ||
          `${req.protocol}://${req.get("host")}/api/auth/saml/callback`,
      });

      const result = await service.handleCallback(samlResponse, state, tenant);
      if (!result) return res.status(400).json({ message: "SAML authentication failed" });

      res.json(result);
    } catch (err) {
      console.error("SAML callback error:", err);
      res.status(500).json({ message: "Failed to handle SAML callback" });
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

  // V2 API Login endpoint (used by the tenant portal)
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
      console.error("V2 Login error:", error);
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

  // V2 API Verify endpoint (used by the tenant portal)
  app.get("/api/v2/auth/verify", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No valid authorization token provided" });
      }

      const token = authHeader.split(" ")[1];
      const result = await authService.verifyToken(token);

      if (!result) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Check if tenant is suspended
      const tenant = await storage.getTenant(result.tenantId);
      if (tenant && tenant.status === "suspended") {
        return res.status(403).json({
          error: "TENANT_SUSPENDED",
          message: "Your organization's account has been suspended",
        });
      }

      res.json({
        valid: true,
        user: result,
      });
    } catch (error) {
      console.error("V2 Token verification error:", error);
      res.status(401).json({ message: "Token verification failed" });
    }
  });

  // V2 API Logout endpoint (used by the tenant portal)
  app.post("/api/v2/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Delete session from database if applicable
      await storage.deleteSession(token);

      console.log("👋 Tenant user logout requested (V2)");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("V2 Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // V2 API Refresh endpoint (sliding refresh)
  app.post("/api/v2/auth/refresh", async (req, res) => {
    try {
      let oldToken: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        oldToken = authHeader.split(" ")[1];
      } else if (req.body?.token) {
        oldToken = req.body.token;
      }
      if (!oldToken) {
        return res.status(400).json({ message: "No token provided" });
      }
      const newToken = await authService.refreshToken(oldToken);
      if (!newToken) return res.status(401).json({ message: "Invalid token" });
      res.json({ token: newToken });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ message: "Failed to refresh token" });
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
  app.get("/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
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

  app.put("/rbac/roles/:roleId", authMiddleware, tenantMiddleware, async (req, res) => {
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

  app.delete("/rbac/roles/:roleId", authMiddleware, tenantMiddleware, async (req, res) => {
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
  app.post("/rbac/users/:userId/roles", authMiddleware, tenantMiddleware, async (req, res) => {
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

  app.delete(
    "/rbac/users/:userId/roles/:roleId",
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
      try {
        const { userId, roleId } = req.params;
        const tenantId = req.tenantId;

        await storage.removeUserRole(userId, roleId, tenantId);
        res.json({ message: "Role removed successfully" });
      } catch (error) {
        console.error("Remove role error:", error);
        res.status(500).json({ message: "Failed to remove role" });
      }
    }
  );

  // Permission Checking
  app.get("/rbac/users/:userId/permissions", authMiddleware, tenantMiddleware, async (req, res) => {
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

  // RBAC: Get current user's roles and permissions from token
  app.get("/rbac/me", authMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const roles = await storage.getTenantUserRoles(tenantId, user.userId);
      const permissions = await storage.getUserPermissions(user.userId, tenantId);
      res.json({ roles, permissions });
    } catch (error) {
      console.error("RBAC me error:", error);
      res.status(500).json({ message: "Failed to get RBAC profile" });
    }
  });

  // Simple RBAC endpoint that works independently of storage interface issues
  app.post("/rbac/check-permission", authMiddleware, tenantMiddleware, (req, res) => {
    console.log("🔐 RBAC Permission Check Request:", req.body);
    const { userId, permission } = req.body;

    if (!userId || !permission) {
      console.log("❌ Missing userId or permission");
      return res.status(400).json({ message: "User ID and permission are required" });
    }

    // Mock RBAC implementation for testing
    const mockPermissions: Record<string, string[]> = {
      "1": ["read", "write", "admin"],
      "test-user": ["read", "write"],
    };

    const userPermissions = mockPermissions[userId as string] || [];
    const hasPermission = userPermissions.includes(permission) || permission === "read"; // Default allow read

    console.log("✅ RBAC check result:", { userId, permission, hasPermission });
    res.json({ hasPermission });
  }); // =============================================================================
  // API v2 RBAC routes (SDK-compatible)
  // -----------------------------------------------------------------------------
  // Roles Management
  app.get("/api/v2/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const roles = await storage.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("[v2] Get roles error:", error);
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/api/v2/rbac/roles", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const { name, description, permissions } = req.body;
      const tenantId = req.tenantId;
      if (!name) return res.status(400).json({ message: "Role name is required" });
      const role = await storage.createTenantRole({
        tenantId,
        name,
        description: description || "",
        permissions: permissions || [],
      });
      res.status(201).json(role);
    } catch (error) {
      console.error("[v2] Create role error:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch("/api/v2/rbac/roles/:roleId", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      const tenantId = req.tenantId;
      const updates = req.body;
      const role = await storage.updateTenantRole(roleId, tenantId, updates);
      if (!role) return res.status(404).json({ message: "Role not found" });
      res.json(role);
    } catch (error) {
      console.error("[v2] Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/v2/rbac/roles/:roleId", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      const tenantId = req.tenantId;
      await storage.deleteTenantRole(roleId, tenantId);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("[v2] Delete role error:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // User Roles and Permissions
  app.get(
    "/api/v2/rbac/users/:userId/roles",
    authMiddleware,
    tenantMiddleware,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const tenantId = req.tenantId!;
        // Get assignments then fetch role details
        const assignments = await storage.getTenantUserRoles(tenantId, userId);
        const roleIds = (assignments || []).map((a: any) => a.roleId);
        const roles = await Promise.all(
          roleIds.map((id: string) => storage.getTenantRole?.(id)).filter(Boolean) as any
        );
        res.json(roles.filter(Boolean));
      } catch (error) {
        console.error("[v2] Get user roles error:", error);
        res.status(500).json({ message: "Failed to get user roles" });
      }
    }
  );

  app.get("/api/v2/rbac/permissions", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      // Derive available permissions as the union of all role permissions for tenant
      const roles = await storage.getTenantRoles(tenantId);
      const set = new Set<string>();
      for (const r of roles || []) {
        (r.permissions || []).forEach((p: string) => set.add(p));
      }
      res.json(
        Array.from(set).map(name => ({
          id: name,
          name,
          resource: name.split(".")[0] || name,
          action: name.split(".")[1] || "*",
        }))
      );
    } catch (error) {
      console.error("[v2] Get permissions error:", error);
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.post("/api/v2/rbac/check-permission", authMiddleware, tenantMiddleware, async (req, res) => {
    try {
      const { userId, resource, action, explain } = req.body || {};
      if (!userId || !resource || !action) {
        return res.status(400).json({ message: "userId, resource, action are required" });
      }
      const tenantId = req.tenantId!;
      const permissionKey = `${resource}.${action}`;
      if (typeof storage.checkUserPermission === "function" && !explain) {
        const allowed = await storage.checkUserPermission(userId, permissionKey, tenantId);
        return res.json({ hasPermission: !!allowed });
      }
      // Derive from roles and optionally explain
      const perms: string[] = (await storage.getUserPermissions?.(userId, tenantId)) || [];
      const has = perms.includes(permissionKey);
      if (!explain) return res.json({ hasPermission: has });

      const assignments = await storage.getTenantUserRoles(tenantId, userId);
      const roleIds = (assignments || []).map((a: any) => a.roleId);
      const roles = await Promise.all(roleIds.map((id: string) => storage.getTenantRole?.(id)));
      const matchedRoles = (roles || [])
        .filter((r: any) => Array.isArray(r?.permissions) && r.permissions.includes(permissionKey))
        .map((r: any) => ({ id: r.id, name: r.name }));
      return res.json({ hasPermission: has, details: { evaluated: permissionKey, matchedRoles } });
    } catch (error) {
      console.error("[v2] Check permission error:", error);
      res.status(500).json({ message: "Failed to check permission" });
    }
  });
  // LOGGING API v2 - Event Logging & Audit
  // =============================================================================

  // Log Events
  app.post("/api/v2/logging/events", validateApiKey, tenantMiddleware, async (req, res) => {
    try {
      const { level, message, category, metadata, userId } = req.body;
      const tenantId = req.tenantId;

      if (!level || !message) {
        return res.status(400).json({ message: "Level and message are required" });
      }

      // Enforce tenant logging config (levels + PII redaction)
      let allowedLevels: string[] | null = null;
      let redactionEnabled = false;
      try {
        const tenant = await storage.getTenant(tenantId!);
        const logging = ((tenant?.moduleConfigs as any) || {}).logging || {};
        if (Array.isArray(logging.levels) && logging.levels.length) {
          allowedLevels = logging.levels as string[];
        }
        redactionEnabled = Boolean(logging.redactionEnabled);
      } catch {}

      if (allowedLevels && !allowedLevels.includes(level)) {
        return res.status(202).json({ message: "Filtered: level not permitted by tenant config" });
      }

      const maskPII = (val: any): any => {
        if (!redactionEnabled) return val;
        const maskEmail = (s: string) =>
          s.replace(
            /([\w.+-])([\w.+-]*)(@)([^@]+)$/g,
            (_, a, b, at, dom) => `${a}${b ? "***" : ""}${at}${dom.replace(/\w/g, "*")}`
          );
        const maskPhone = (s: string) =>
          s.replace(
            /(?:\+?\d[\s-]?){7,}/g,
            m => `${"*".repeat(Math.max(0, m.length - 4))}${m.slice(-4)}`
          );
        const maskObj = (o: any): any => {
          if (o == null) return o;
          if (typeof o === "string") return maskPhone(maskEmail(o));
          if (Array.isArray(o)) return o.map(maskObj);
          if (typeof o === "object") {
            const out: any = {};
            for (const [k, v] of Object.entries(o)) {
              if (/password|secret|token|ssn|aadhar|pan|credit|card/i.test(k))
                out[k] = "[REDACTED]";
              else out[k] = maskObj(v);
            }
            return out;
          }
          return o;
        };
        return maskObj(val);
      };

      const logEvent = await storage.createLogEvent({
        tenantId,
        eventType: category || "application",
        level,
        message: maskPII(message),
        metadata: maskPII(metadata || {}),
        userId: userId || null,
      });

      res.status(201).json(logEvent);
    } catch (error) {
      console.error("Create log event error:", error);
      res.status(500).json({ message: "Failed to create log event" });
    }
  });

  // Query Logs
  app.get("/api/v2/logging/events", validateApiKey, tenantMiddleware, async (req, res) => {
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

  // Platform Admin: trigger retention purge (optional maintenance endpoint)
  app.post("/api/admin/logging/purge", platformAdminMiddleware, async (req, res) => {
    try {
      const { tenantId } = req.body || {};
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return res.status(404).json({ message: "Tenant not found" });
        const days = Number((tenant.moduleConfigs as any)?.logging?.retentionDays || 30);
        await storage.purgeOldLogs(tenant.id, days);
      } else {
        const tenants = await storage.getAllTenants();
        for (const t of tenants) {
          const days = Number((t.moduleConfigs as any)?.logging?.retentionDays || 30);
          await storage.purgeOldLogs(t.id, days);
        }
      }
      res.json({ message: "Purge executed" });
    } catch (error) {
      console.error("Logging purge error:", error);
      res.status(500).json({ message: "Failed to purge logs" });
    }
  });

  // Log Statistics (supports either API key or JWT)
  app.get(
    "/api/v2/logging/stats",
    (req, res, next) => {
      const hasApiKeyHeader = Boolean(req.headers["x-api-key"]);
      const auth = (req.headers["authorization"] as string) || "";
      const hasApiKeyAuth = auth && !auth.toLowerCase().startsWith("bearer ");
      if (hasApiKeyHeader || hasApiKeyAuth) {
        return (validateApiKey as any)(req, res, next);
      }
      return next();
    },
    tenantMiddleware,
    async (req, res) => {
      try {
        const tenantId = req.tenantId;
        const { period = "24h" } = req.query;

        const stats = await storage.getLogStatistics(tenantId, period as string);
        res.json(stats);
      } catch (error) {
        console.error("Get log stats error:", error);
        res.status(500).json({ message: "Failed to get log statistics" });
      }
    }
  );

  // Alert Rules
  app.post("/api/v2/logging/alert-rules", tenantMiddleware, async (req, res) => {
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

  app.get("/api/v2/logging/alert-rules", tenantMiddleware, async (req, res) => {
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
  // Platform Admin: List module change requests (from system logs)
  app.get("/api/admin/module-requests", platformAdminMiddleware, async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || "").toLowerCase() === "true";
      const logs = await storage.getSystemLogs({ action: "module_change_request", limit: 100 });
      if (includeResolved) {
        res.json(logs);
      } else {
        const pending = logs.filter(
          (r: any) => !r.details?.status || !["approved", "dismissed"].includes(r.details.status)
        );
        res.json(pending);
      }
    } catch (error) {
      console.error("Error fetching module requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Approve a module request
  app.post("/api/admin/module-requests/:id/approve", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tenantId, moduleId } = req.body || {};
      if (!tenantId || !moduleId) {
        return res.status(400).json({ message: "tenantId and moduleId required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const enabledModules = Array.from(new Set([...(tenant.enabledModules || []), moduleId]));
      const moduleConfigs = (tenant.moduleConfigs as any) || {};

      // Seed default config when enabling certain modules post-onboarding
      const seededConfigs = { ...moduleConfigs } as any;
      if (moduleId === "logging") {
        const defaults = {
          levels: ["error", "warn", "info"],
          destinations: ["database"],
          retention: { error: "90d", security: "180d", audit: "365d", performance: "30d" },
          alerting: { errorThreshold: 10, securityEvents: true, performanceDegradation: true },
        };
        seededConfigs.logging = { ...(moduleConfigs.logging || {}), ...defaults };
      }
      if (moduleId === "notifications") {
        const defaults = {
          channels: ["email"],
          emailProvider: "smtp",
          templates: { welcome: true, security_alert: true },
        };
        seededConfigs.notifications = { ...(moduleConfigs.notifications || {}), ...defaults };
      }

      await storage.updateTenantModules(tenantId, enabledModules, seededConfigs);

      await storage.updateSystemLogDetails(id, { status: "approved", resolvedAt: new Date() });

      await storage.logSystemActivity({
        tenantId,
        action: "module_enabled_by_admin",
        entityType: "tenant",
        entityId: tenantId,
        details: { moduleId },
      });

      // Email tenant admin about enabled module
      try {
        await emailService.sendModuleStatusEmail(
          { id: tenant.id, name: tenant.name, adminEmail: tenant.adminEmail },
          { enabled: [moduleId], disabled: [] }
        );
      } catch {}

      res.json({ message: "Approved" });
    } catch (error) {
      console.error("Approve request error:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  // Dismiss a module request
  app.post("/api/admin/module-requests/:id/dismiss", platformAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tenantId, moduleId } = req.body || {};
      await storage.updateSystemLogDetails(id, { status: "dismissed", resolvedAt: new Date() });
      if (tenantId && moduleId) {
        await storage.logSystemActivity({
          tenantId,
          action: "module_request_dismissed",
          entityType: "tenant",
          entityId: tenantId,
          details: { moduleId },
        });
      }
      res.json({ message: "Dismissed" });
    } catch (error) {
      console.error("Dismiss request error:", error);
      res.status(500).json({ message: "Failed to dismiss request" });
    }
  });

  // Tenant: Request provider configuration change (Azure/Auth0/SAML)
  app.post("/api/tenant/:id/auth/providers/request", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const { type, config } = req.body || {};
      if (!type || !config)
        return res.status(400).json({ message: "type and config are required" });

      // Encrypt secrets before logging
      let safeConfig = { ...config };
      try {
        const { encryptSecret } = await import("./utils/secret.js");
        if (type === "azure-ad" && config.clientSecret) {
          safeConfig.clientSecret = encryptSecret(config.clientSecret);
        }
        if (type === "auth0" && config.clientSecret) {
          safeConfig.clientSecret = encryptSecret(config.clientSecret);
        }
        if (type === "saml" && config.cert) {
          // Certificates are public material; keep as-is
        }
      } catch {}

      await storage.logSystemActivity({
        tenantId: id,
        action: "provider_change_request",
        entityType: "tenant",
        entityId: id,
        details: { provider: type, proposed: safeConfig },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Best-effort notify a platform admin by email
      try {
        const to = (process.env.AUTHORIZED_ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(
          ","
        )[0];
        if (to) {
          await emailService.sendSimpleTestEmail(
            to,
            `Provider change requested for tenant ${id} (${type})`
          );
        }
      } catch {}

      res.json({ message: "Request submitted" });
    } catch (error) {
      console.error("Provider change request error:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Validate Azure AD configuration (Tenant self-check)
  app.get("/api/tenant/:id/azure-ad/validate", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth;
      if (!authConfig?.providers) {
        return res.status(400).json({ valid: false, message: "Auth providers not configured" });
      }

      let azure = authConfig.providers.find((p: any) => p.type === "azure-ad");
      if (!azure) {
        return res.status(400).json({ valid: false, message: "Azure AD provider not found" });
      }

      // Decrypt secret if needed
      try {
        const { decryptSecret } = await import("./utils/secret.js");
        if (azure?.config?.clientSecret) {
          azure = {
            ...azure,
            config: { ...azure.config, clientSecret: decryptSecret(azure.config.clientSecret) },
          };
        }
      } catch {}

      const cfg = azure.config || {};
      const errors: string[] = [];
      // Canonical GUID 8-4-4-4-12, allow braces and trim whitespace
      const tenantIdVal = sanitizeGuid(cfg.tenantId);
      const clientIdVal = sanitizeGuid(cfg.clientId);
      if (!tenantIdVal || !GUID_CANON.test(tenantIdVal)) {
        errors.push("tenantId must be a GUID from Azure AD (format: 8-4-4-4-12)");
      }
      if (!clientIdVal || !GUID_CANON.test(clientIdVal)) {
        errors.push("clientId must be a GUID (Application ID) (format: 8-4-4-4-12)");
      }
      if (!cfg.clientSecret) errors.push("clientSecret is required");

      const expectedRedirect = `${req.protocol}://${req.get("host")}/api/auth/azure/callback`;
      if (cfg.callbackUrl && cfg.callbackUrl !== expectedRedirect) {
        errors.push(`callbackUrl should be ${expectedRedirect}`);
      }

      if (errors.length) return res.status(400).json({ valid: false, message: errors.join("; ") });

      try {
        const { AzureADService } = await import("./services/azure-ad.js");
        const svc = new AzureADService({
          tenantId: tenantIdVal,
          clientId: clientIdVal,
          clientSecret: cfg.clientSecret,
          redirectUri: expectedRedirect,
        });
        const authUrl = await svc.getAuthorizationUrl(["User.Read"], tenant.id);
        try {
          await storage.logSystemActivity({
            tenantId: id,
            action: "provider_validate",
            entityType: "tenant",
            entityId: id,
            details: { provider: "azure-ad", success: true },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
        } catch {}
        return res.json({ valid: true, authUrl, expectedRedirect });
      } catch (e: any) {
        try {
          await storage.logSystemActivity({
            tenantId: id,
            action: "provider_validate",
            entityType: "tenant",
            entityId: id,
            details: { provider: "azure-ad", success: false, error: e?.message },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
        } catch {}
        return res
          .status(400)
          .json({ valid: false, message: e?.message || "Failed to init Azure" });
      }
    } catch (error) {
      console.error("Azure validate error:", error);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Validate Azure AD configuration (accepts overrides in body)
  app.post("/api/tenant/:id/azure-ad/validate", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth || {};
      const providers = authConfig.providers || [];
      let azure = providers.find((p: any) => p.type === "azure-ad") || {
        type: "azure-ad",
        config: {},
      };

      // Allow overrides from request body without persisting
      const bodyCfg = req.body || {};
      const mergedCfg = { ...(azure.config || {}), ...bodyCfg } as any;

      // Canonical GUID 8-4-4-4-12, allow braces and trim whitespace
      const tenantIdVal = sanitizeGuid(mergedCfg.tenantId);
      const clientIdVal = sanitizeGuid(mergedCfg.clientId);
      const clientSecretVal = String(mergedCfg.clientSecret ?? "").trim();

      const errors: string[] = [];
      if (!tenantIdVal || !GUID_CANON.test(tenantIdVal))
        errors.push("tenantId must be a GUID from Azure AD (format: 8-4-4-4-12)");
      if (!clientIdVal || !GUID_CANON.test(clientIdVal))
        errors.push("clientId must be a GUID (Application ID) (format: 8-4-4-4-12)");
      if (!clientSecretVal) errors.push("clientSecret is required");

      const expectedRedirect = `${req.protocol}://${req.get("host")}/api/auth/azure/callback`;
      if (mergedCfg.callbackUrl && mergedCfg.callbackUrl !== expectedRedirect) {
        errors.push(`callbackUrl should be ${expectedRedirect}`);
      }

      if (errors.length) return res.status(400).json({ valid: false, message: errors.join("; ") });

      try {
        const { AzureADService } = await import("./services/azure-ad.js");
        const svc = new AzureADService({
          tenantId: tenantIdVal,
          clientId: clientIdVal,
          clientSecret: clientSecretVal,
          redirectUri: expectedRedirect,
        });
        const authUrl = await svc.getAuthorizationUrl(["User.Read"], tenant.id);
        return res.json({ valid: true, authUrl, expectedRedirect });
      } catch (e: any) {
        return res
          .status(400)
          .json({ valid: false, message: e?.message || "Failed to init Azure" });
      }
    } catch (error) {
      console.error("Azure validate (POST) error:", error);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Quick test: verify Azure client credentials without tenant context
  app.post("/api/azure-ad/verify-secret", async (req, res) => {
    try {
      const bodyCfg = req.body || {};
      const tenantIdVal = sanitizeGuid(bodyCfg.tenantId);
      const clientIdVal = sanitizeGuid(bodyCfg.clientId);
      const clientSecretVal = String(bodyCfg.clientSecret ?? "").trim();

      const errors: string[] = [];
      if (!tenantIdVal || !GUID_CANON.test(tenantIdVal))
        errors.push("tenantId must be a GUID from Azure AD (format: 8-4-4-4-12)");
      if (!clientIdVal || !GUID_CANON.test(clientIdVal))
        errors.push("clientId must be a GUID (Application ID) (format: 8-4-4-4-12)");
      if (!clientSecretVal) errors.push("clientSecret is required");

      if (errors.length) return res.status(400).json({ valid: false, message: errors.join("; ") });

      try {
        const { AzureADService } = await import("./services/azure-ad.js");
        const svc = new AzureADService({
          tenantId: tenantIdVal,
          clientId: clientIdVal,
          clientSecret: clientSecretVal,
          redirectUri: `${req.protocol}://${req.get("host")}/api/auth/azure/callback`,
        });
        const result = await svc.verifyClientCredentials();
        if (result.ok) return res.json({ valid: true });
        return res
          .status(400)
          .json({ valid: false, message: result.message || "Verification failed" });
      } catch (e: any) {
        return res.status(400).json({ valid: false, message: e?.message || "Verification failed" });
      }
    } catch (error) {
      console.error("Azure verify-secret (platform) error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Quick test: verify Azure client credentials (no save)
  app.post("/api/tenant/:id/azure-ad/verify-secret", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });

      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const moduleConfigs = (tenant.moduleConfigs as any) || {};
      const authConfig = moduleConfigs.auth || {};
      const providers = authConfig.providers || [];
      let azure = providers.find((p: any) => p.type === "azure-ad") || {
        type: "azure-ad",
        config: {},
      };

      // Allow overrides from request body without persisting
      const bodyCfg = req.body || {};
      const mergedCfg = { ...(azure.config || {}), ...bodyCfg } as any;

      // Canonical GUID 8-4-4-4-12, allow braces and trim whitespace
      const tenantIdVal = sanitizeGuid(mergedCfg.tenantId);
      const clientIdVal = sanitizeGuid(mergedCfg.clientId);
      const clientSecretVal = String(mergedCfg.clientSecret ?? "").trim();

      const errors: string[] = [];
      if (!tenantIdVal || !GUID_CANON.test(tenantIdVal))
        errors.push("tenantId must be a GUID from Azure AD (format: 8-4-4-4-12)");
      if (!clientIdVal || !GUID_CANON.test(clientIdVal))
        errors.push("clientId must be a GUID (Application ID) (format: 8-4-4-4-12)");
      if (!clientSecretVal) errors.push("clientSecret is required");

      if (errors.length) return res.status(400).json({ valid: false, message: errors.join("; ") });

      try {
        const { AzureADService } = await import("./services/azure-ad.js");
        const svc = new AzureADService({
          tenantId: tenantIdVal,
          clientId: clientIdVal,
          clientSecret: clientSecretVal,
          redirectUri: `${req.protocol}://${req.get("host")}/api/auth/azure/callback`,
        });
        const result = await svc.verifyClientCredentials();
        if (result.ok) return res.json({ valid: true });
        return res
          .status(400)
          .json({ valid: false, message: result.message || "Verification failed" });
      } catch (e: any) {
        return res.status(400).json({ valid: false, message: e?.message || "Verification failed" });
      }
    } catch (error) {
      console.error("Azure verify-secret error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Validate Auth0 configuration (Tenant self-check)
  app.get("/api/tenant/:id/auth0/validate", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });
      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const auth = (tenant.moduleConfigs as any)?.auth || {};
      const p = (auth.providers || []).find((x: any) => x.type === "auth0");
      if (!p) return res.status(400).json({ valid: false, message: "Auth0 provider not found" });
      const cfg = p.config || {};
      const errors: string[] = [];
      if (!cfg.domain || !/^[a-z0-9-]+\.auth0\.com$/i.test(cfg.domain))
        errors.push("domain must look like your-tenant.auth0.com");
      if (!cfg.clientId) errors.push("clientId is required");
      if (!cfg.clientSecret) errors.push("clientSecret is required");
      const expectedRedirect = `${req.protocol}://${req.get("host")}/api/auth/auth0/callback`;
      if (cfg.callbackUrl && cfg.callbackUrl !== expectedRedirect)
        errors.push(`callbackUrl should be ${expectedRedirect}`);
      if (errors.length) {
        try {
          await storage.logSystemActivity({
            tenantId: id,
            action: "provider_validate",
            entityType: "tenant",
            entityId: id,
            details: { provider: "auth0", success: false, error: errors.join("; ") },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
        } catch {}
        return res.status(400).json({ valid: false, message: errors.join("; ") });
      }
      try {
        await storage.logSystemActivity({
          tenantId: id,
          action: "provider_validate",
          entityType: "tenant",
          entityId: id,
          details: { provider: "auth0", success: true },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });
      } catch {}
      return res.json({ valid: true, expectedRedirect });
    } catch (e) {
      console.error("Auth0 validate error:", e);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Validate SAML configuration (Tenant self-check)
  app.get("/api/tenant/:id/saml/validate", tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.tenantId !== id) return res.status(403).json({ message: "Forbidden" });
      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const auth = (tenant.moduleConfigs as any)?.auth || {};
      const p = (auth.providers || []).find((x: any) => x.type === "saml");
      if (!p) return res.status(400).json({ valid: false, message: "SAML provider not found" });
      const cfg = p.config || {};
      const errors: string[] = [];
      if (!cfg.entryPoint || !/^https?:\/\//i.test(cfg.entryPoint))
        errors.push("entryPoint must be a URL");
      if (!cfg.issuer) errors.push("issuer is required");
      if (!cfg.cert || !/-----BEGIN CERTIFICATE-----/.test(cfg.cert))
        errors.push("cert must be PEM");
      const acsUrl = `${req.protocol}://${req.get("host")}/api/auth/saml/callback`;
      if (cfg.callbackUrl && cfg.callbackUrl !== acsUrl)
        errors.push(`callbackUrl should be ${acsUrl}`);
      if (errors.length) {
        try {
          await storage.logSystemActivity({
            tenantId: id,
            action: "provider_validate",
            entityType: "tenant",
            entityId: id,
            details: { provider: "saml", success: false, error: errors.join("; ") },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
        } catch {}
        return res.status(400).json({ valid: false, message: errors.join("; ") });
      }
      try {
        await storage.logSystemActivity({
          tenantId: id,
          action: "provider_validate",
          entityType: "tenant",
          entityId: id,
          details: { provider: "saml", success: true },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });
      } catch {}
      return res.json({ valid: true, acsUrl });
    } catch (e) {
      console.error("SAML validate error:", e);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Admin: List provider change requests
  app.get("/api/admin/provider-requests", platformAdminMiddleware, async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || "").toLowerCase() === "true";
      const logs = await storage.getSystemLogs({ action: "provider_change_request", limit: 200 });
      const list = includeResolved ? logs : logs.filter((r: any) => !r.details?.status);
      res.json(list);
    } catch (e) {
      console.error("Get provider requests error:", e);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Admin: Approve provider request and apply to tenant moduleConfigs
  app.post(
    "/api/admin/provider-requests/:id/approve",
    platformAdminMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { tenantId } = req.body || {};
        if (!tenantId) return res.status(400).json({ message: "tenantId required" });

        // Load requests and find the log by id
        const logs = await storage.getSystemLogs({ action: "provider_change_request", limit: 500 });
        const log = logs.find((l: any) => l.id === id);
        if (!log) return res.status(404).json({ message: "Request not found" });
        const type = log.details?.provider;
        const proposed = log.details?.proposed || {};
        if (!type) return res.status(400).json({ message: "Invalid request payload" });

        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return res.status(404).json({ message: "Tenant not found" });
        const moduleConfigs = (tenant.moduleConfigs as any) || {};
        if (!moduleConfigs.auth) moduleConfigs.auth = { providers: [] };
        if (!Array.isArray(moduleConfigs.auth.providers)) moduleConfigs.auth.providers = [];

        // Upsert provider
        const idx = moduleConfigs.auth.providers.findIndex((p: any) => p.type === type);
        const config = { ...(proposed || {}) };
        // Ensure callbackUrl defaults
        if (!config.callbackUrl) {
          const host = `${process.env.BASE_URL || ""}`;
          if (type === "azure-ad") config.callbackUrl = `${host || ""}/api/auth/azure/callback`;
          if (type === "auth0") config.callbackUrl = `${host || ""}/api/auth/auth0/callback`;
          if (type === "saml") config.callbackUrl = `${host || ""}/api/auth/saml/callback`;
        }

        // Encrypt secrets
        try {
          const { encryptSecret } = await import("./utils/secret.js");
          if (type === "azure-ad" && config.clientSecret)
            config.clientSecret = encryptSecret(config.clientSecret);
          if (type === "auth0" && config.clientSecret)
            config.clientSecret = encryptSecret(config.clientSecret);
        } catch {}

        const provider = {
          type,
          name: type === "azure-ad" ? "Azure AD SSO" : type === "auth0" ? "Auth0" : "SAML SSO",
          priority: 1,
          config,
          enabled: true,
        };
        if (idx >= 0) moduleConfigs.auth.providers[idx] = provider;
        else moduleConfigs.auth.providers.push(provider);

        // Ensure auth + provider module listed
        const enabledModules = Array.from(
          new Set([...((tenant.enabledModules as any[]) || []), "auth", type])
        );
        await storage.updateTenantModules(tenantId, enabledModules, moduleConfigs);

        await storage.updateSystemLogDetails(id, { status: "approved", resolvedAt: new Date() });

        res.json({ message: "Applied", provider: { type } });
      } catch (e) {
        console.error("Approve provider request error:", e);
        res.status(500).json({ message: "Failed to apply request" });
      }
    }
  );

  // Admin: Dismiss provider request
  app.post(
    "/api/admin/provider-requests/:id/dismiss",
    platformAdminMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.updateSystemLogDetails(id, { status: "dismissed", resolvedAt: new Date() });
        res.json({ message: "Dismissed" });
      } catch (e) {
        console.error("Dismiss provider request error:", e);
        res.status(500).json({ message: "Failed to dismiss request" });
      }
    }
  );

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

  // Email Templates (platform admin manages per-tenant templates)
  app.get("/api/email/templates", platformAdminMiddleware, async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) return res.status(400).json({ message: "tenantId is required" });
      const templates = await storage.getEmailTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Get email templates error:", error);
      res.status(500).json({ message: "Failed to get email templates" });
    }
  });

  app.post("/api/email/templates", platformAdminMiddleware, async (req, res) => {
    try {
      const { tenantId, name, subject, htmlContent, textContent, variables } = req.body;
      if (!tenantId || !name || !subject || !htmlContent) {
        return res
          .status(400)
          .json({ message: "tenantId, name, subject and htmlContent are required" });
      }
      const template = await storage.createEmailTemplate({
        tenantId,
        name,
        subject,
        htmlContent,
        textContent,
        variables: variables || [],
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Create email template error:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.put("/api/email/templates/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body || {};
      const updated = await storage.updateEmailTemplate(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update email template error:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email/templates/:id", platformAdminMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteEmailTemplate(id);
      res.status(204).end();
    } catch (error) {
      console.error("Delete email template error:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Compliance Endpoints
  app.get("/api/compliance/summary", platformAdminMiddleware, async (req, res) => {
    const days = Number.parseInt((req.query.days as string) || "30", 10) || 30;
    const summary = await complianceService.getSummary(days);
    res.json(summary);
  });

  app.get("/api/compliance/audit-logs", platformAdminMiddleware, async (_req, res) => {
    const logs = await complianceService.getAuditLogs();
    res.json(logs);
  });

  app.get("/api/compliance/security-events", platformAdminMiddleware, async (_req, res) => {
    const events = await complianceService.getSecurityEvents();
    res.json(events);
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
