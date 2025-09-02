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
    // Get API key from header
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        details: "X-API-Key header must be provided for external authentication",
      });
    }

    // Validate API key format
    if (!apiKey.startsWith("auth_") || apiKey.length < 20) {
      return res.status(401).json({
        error: "Invalid API key format",
        details: 'API key must start with "auth_" and be at least 20 characters',
      });
    }

    // Find tenant by API key
    const tenant = await storage.getTenantByAuthApiKey(apiKey);

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
