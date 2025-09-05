import { Request, Response, NextFunction } from "express";
import { storage } from "../storage.js";

// Extend Request interface to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: any;
    }
  }
}

/**
 * Middleware to validate API keys for external NPM package authentication
 * This is what was missing - the server now validates X-API-Key headers
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // Get API key from headers: support X-API-Key or Authorization: Bearer <key> | API-Key <key>
    let apiKey = (req.headers["x-api-key"] as string) || "";
    if (!apiKey) {
      const authHeader = (req.headers["authorization"] as string) || "";
      if (authHeader) {
        const parts = authHeader.split(" ").filter(Boolean);
        if (parts.length === 2) {
          const scheme = parts[0].toLowerCase();
          const token = parts[1];
          if (scheme === "bearer" || scheme === "api-key") {
            apiKey = token;
          }
        }
      }
    }

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        details: "X-API-Key header must be provided for external authentication",
      });
    }

    // Determine which module this API key targets
    const isLoggingRoute =
      (req.path || "").startsWith("/api/v2/logging/") ||
      (req.path || "").startsWith("/api/logging/");

    // Accept either dedicated logging key (preferred for logging routes) or auth key as fallback
    const looksLikeAuthKey = apiKey.startsWith("auth_");
    const looksLikeLoggingKey = apiKey.startsWith("logging_");

    if (!looksLikeAuthKey && !looksLikeLoggingKey) {
      return res.status(401).json({
        error: "Invalid API key format",
        details: 'API key must start with "auth_" or "logging_"',
      });
    }

    // Find tenant by appropriate key
    let tenant = null as any;
    if (isLoggingRoute) {
      // Prefer logging key for logging routes; fallback to auth key for backward compatibility
      tenant = looksLikeLoggingKey
        ? await storage.getTenantByLoggingApiKey?.(apiKey)
        : await storage.getTenantByAuthApiKey(apiKey);
    } else {
      // Non-logging routes use auth key
      tenant = await storage.getTenantByAuthApiKey(apiKey);
    }

    if (!tenant) {
      return res.status(401).json({
        error: "Invalid API key",
        details: "API key not found or expired",
      });
    }

    if (tenant.status !== "active") {
      return res.status(403).json({
        error: "Tenant inactive",
        details: "Tenant account is not active",
      });
    }

    // Add tenant info to request for downstream use
    req.tenantId = tenant.id;
    req.tenant = tenant;

    console.log(`✅ API key validated for tenant: ${tenant.orgId} (${tenant.name})`);
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(500).json({
      error: "Authentication service error",
      details: "Unable to validate API key",
    });
  }
}
