import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export interface SaaSRBACConfig {
  apiKey: string;
  baseUrl: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // seconds
  realTimeUpdates?: boolean;
  websocketUrl?: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  hierarchy?: number; // 0 = highest, 999 = lowest
  metadata?: Record<string, any>;
}

export interface Permission {
  id: string;
  tenantId: string;
  key: string;
  description: string;
  category: string;
  isSystem: boolean;
  isActive: boolean;
  scope?: "global" | "tenant" | "user";
  resource?: string;
  action?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: "time" | "ip" | "location" | "device" | "custom";
  operator: "equals" | "contains" | "in" | "range" | "matches";
  value: any;
  metadata?: Record<string, any>;
}

export interface UserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  isActive: boolean;
  scope?: string; // Optional scope restriction
}

export interface PolicyRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: "allow" | "deny";
  priority: number; // Higher number = higher priority
  conditions: PolicyCondition[];
  actions: string[];
  resources: string[];
  isActive: boolean;
}

export interface PolicyCondition {
  type: "user" | "role" | "time" | "location" | "device" | "custom";
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "in"
    | "not_in"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "regex"
    | "gt"
    | "lt"
    | "gte"
    | "lte";
  value: any;
}

export interface AccessContext {
  userId: string;
  tenantId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  appliedPolicies: string[];
  missingPermissions?: string[];
  conditionalAccess?: ConditionalAccess;
}

export interface ConditionalAccess {
  requireMFA: boolean;
  requireApproval: boolean;
  timeRestriction?: TimeRestriction;
  locationRestriction?: LocationRestriction;
}

export interface TimeRestriction {
  allowedDays: string[]; // ['monday', 'tuesday', ...]
  allowedHours: { start: string; end: string }; // '09:00' to '17:00'
  timezone: string;
}

export interface LocationRestriction {
  allowedCountries?: string[];
  allowedRegions?: string[];
  allowedIPs?: string[];
  deniedIPs?: string[];
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  result: "allowed" | "denied";
  reason: string;
  context: AccessContext;
  timestamp: Date;
}

/**
 * Enterprise Role-Based Access Control (RBAC) SDK
 *
 * Features:
 * - Hierarchical roles and permissions
 * - Dynamic policy evaluation
 * - Real-time permission updates
 * - Conditional access controls
 * - Audit logging and compliance
 * - Time and location-based restrictions
 * - Performance optimization with caching
 */
export class SaaSRBAC {
  private config: SaaSRBACConfig;
  private permissionCache: Map<string, { data: any; expiry: number }> = new Map();
  private websocket?: WebSocket;

  constructor(config: SaaSRBACConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      realTimeUpdates: false,
      ...config,
    };

    if (this.config.realTimeUpdates && this.config.websocketUrl) {
      this.initializeWebSocket();
    }
  }

  /**
   * Enhanced permission check with context and policies
   */
  async hasPermission(
    userId: string,
    permission: string,
    context?: Partial<AccessContext>
  ): Promise<AccessDecision> {
    const fullContext: AccessContext = {
      userId,
      tenantId: context?.tenantId || "",
      timestamp: new Date(),
      ...context,
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/rbac/check-permission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify({
          userId,
          permission,
          context: fullContext,
        }),
      });

      if (!response.ok) {
        return {
          allowed: false,
          reason: "Permission check failed",
          appliedPolicies: [],
        };
      }

      const decision: AccessDecision = (await response.json()) as AccessDecision;

      // Cache positive results
      if (decision.allowed && this.config.cacheEnabled) {
        this.setCacheItem(`perm:${userId}:${permission}`, decision);
      }

      // Log audit event
      await this.logAuditEvent({
        id: uuidv4(),
        tenantId: fullContext.tenantId,
        userId,
        action: "permission_check",
        resource: permission,
        result: decision.allowed ? "allowed" : "denied",
        reason: decision.reason,
        context: fullContext,
        timestamp: new Date(),
      });

      return decision;
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : "Unknown error",
        appliedPolicies: [],
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userId: string,
    permissions: string[],
    context?: Partial<AccessContext>
  ): Promise<Record<string, AccessDecision>> {
    const results: Record<string, AccessDecision> = {};

    // Check cache first for performance
    const uncachedPermissions: string[] = [];

    if (this.config.cacheEnabled) {
      for (const permission of permissions) {
        const cached = this.getCacheItem(`perm:${userId}:${permission}`);
        if (cached) {
          results[permission] = cached;
        } else {
          uncachedPermissions.push(permission);
        }
      }
    } else {
      uncachedPermissions.push(...permissions);
    }

    // Batch check uncached permissions
    if (uncachedPermissions.length > 0) {
      try {
        const response = await fetch(`${this.config.baseUrl}/rbac/check-permissions-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
          },
          body: JSON.stringify({
            userId,
            permissions: uncachedPermissions,
            context,
          }),
        });

        if (response.ok) {
          const batchResults: Record<string, AccessDecision> = (await response.json()) as Record<
            string,
            AccessDecision
          >;
          Object.assign(results, batchResults);

          // Cache results
          if (this.config.cacheEnabled) {
            for (const [permission, decision] of Object.entries(batchResults)) {
              if (decision.allowed) {
                this.setCacheItem(`perm:${userId}:${permission}`, decision);
              }
            }
          }
        }
      } catch (error) {
        // Fallback to individual checks
        for (const permission of uncachedPermissions) {
          results[permission] = await this.hasPermission(userId, permission, context);
        }
      }
    }

    return results;
  }

  /**
   * Check role assignment
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/rbac/check-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify({ userId, roleName }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's roles with hierarchy
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/rbac/users/${userId}/roles`, {
        method: "GET",
        headers: {
          "X-API-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        return [];
      }

      return (await response.json()) as Role[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get effective permissions for user (combining all roles)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/rbac/users/${userId}/permissions`, {
        method: "GET",
        headers: {
          "X-API-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        return [];
      }

      return (await response.json()) as Permission[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<UserRole> {
    const response = await fetch(`${this.config.baseUrl}/rbac/users/${userId}/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        roleId,
        assignedBy,
        expiresAt,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Role assignment failed");
    }

    const userRole: UserRole = (await response.json()) as UserRole;

    // Clear permission cache for this user
    this.clearUserCache(userId);

    return userRole;
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/rbac/users/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: {
        "X-API-Key": this.config.apiKey,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message || "Role removal failed");
    }

    // Clear permission cache for this user
    this.clearUserCache(userId);
  }

  /**
   * Express middleware for RBAC
   */
  middleware(
    requiredPermissions: string | string[],
    options: {
      requireAll?: boolean;
      onDenied?: (req: Request, res: Response, decision: AccessDecision) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            error: "Authentication required",
            code: "AUTH_REQUIRED",
          });
        }

        const permissions = Array.isArray(requiredPermissions)
          ? requiredPermissions
          : [requiredPermissions];

        const context: Partial<AccessContext> = {
          tenantId: user.tenantId,
          sessionId: req.sessionId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        };

        if (permissions.length === 1) {
          const decision = await this.hasPermission(user.id, permissions[0], context);

          if (!decision.allowed) {
            if (options.onDenied) {
              return options.onDenied(req, res, decision);
            }
            return res.status(403).json({
              error: "Insufficient permissions",
              code: "PERMISSION_DENIED",
              required: permissions,
              reason: decision.reason,
            });
          }
        } else {
          const decisions = await this.hasPermissions(user.id, permissions, context);
          const deniedPermissions = permissions.filter(p => !decisions[p]?.allowed);

          if (options.requireAll !== false && deniedPermissions.length > 0) {
            return res.status(403).json({
              error: "Insufficient permissions",
              code: "PERMISSION_DENIED",
              required: permissions,
              missing: deniedPermissions,
            });
          } else if (
            options.requireAll === false &&
            deniedPermissions.length === permissions.length
          ) {
            return res.status(403).json({
              error: "Insufficient permissions",
              code: "PERMISSION_DENIED",
              required: permissions,
            });
          }
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: "RBAC middleware error",
          code: "RBAC_ERROR",
        });
      }
    };
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await fetch(`${this.config.baseUrl}/rbac/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }

  /**
   * Cache management
   */
  private setCacheItem(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;

    const expiry = Date.now() + this.config.cacheTTL! * 1000;
    this.permissionCache.set(key, { data, expiry });
  }

  private getCacheItem(key: string): any | null {
    if (!this.config.cacheEnabled) return null;

    const item = this.permissionCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.permissionCache.delete(key);
      return null;
    }

    return item.data;
  }

  private clearUserCache(userId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.includes(userId)) {
        this.permissionCache.delete(key);
      }
    }
  }

  private clearAllCache(): void {
    this.permissionCache.clear();
  }

  /**
   * WebSocket for real-time updates
   */
  private initializeWebSocket(): void {
    if (!this.config.websocketUrl) return;

    try {
      this.websocket = new WebSocket(this.config.websocketUrl);

      this.websocket.onmessage = event => {
        try {
          const update = JSON.parse(event.data);
          this.handleRealtimeUpdate(update);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.websocket.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
    }
  }

  private handleRealtimeUpdate(update: any): void {
    switch (update.type) {
      case "permission_changed":
      case "role_updated":
        this.clearUserCache(update.userId);
        break;
      case "policy_changed":
        this.clearAllCache();
        break;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.websocket) {
      this.websocket.close();
    }
    this.clearAllCache();
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId: string;
        permissions: string[];
      };
      sessionId?: string;
    }
  }
}

export default SaaSRBAC;
