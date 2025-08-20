import { Request, Response, NextFunction } from 'express';

export interface SaaSRBACConfig {
  apiKey: string;
  baseUrl: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface Permission {
  id: string;
  tenantId: string;
  key: string;
  description: string;
  category: string;
  isSystem: boolean;
}

export interface UserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

export class SaaSRBAC {
  private config: SaaSRBACConfig;

  constructor(config: SaaSRBACConfig) {
    this.config = config;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/check-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({ userId, permission }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json() as { hasPermission?: boolean };
      return result.hasPermission || false;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasPermissions(userId: string, permissions: string[]): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const permission of permissions) {
      results[permission] = await this.hasPermission(userId, permission);
    }

    return results;
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const response = await fetch(`${this.config.baseUrl}/users/${userId}/roles`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user roles');
    }

    return response.json() as Promise<Role[]>;
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/users/${userId}/permissions`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
    }

    const result = await response.json() as { permissions?: string[] };
    return result.permissions || [];
  }

  /**
   * Get all available roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await fetch(`${this.config.baseUrl}/roles`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json() as Promise<Role[]>;
  }

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<Permission[]> {
    const response = await fetch(`${this.config.baseUrl}/permissions`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }

    return response.json() as Promise<Permission[]>;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/user-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ userId, roleId }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Failed to assign role');
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/user-roles/${userId}/${roleId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Failed to remove role');
    }
  }

  /**
   * Express middleware for permission checking
   */
  middleware(requiredPermissions: string[], options: { requireAll?: boolean } = { requireAll: false }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Ensure user is authenticated (should be done by auth middleware first)
      if (!req.user || !(req.user as any).id) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      try {
        const userId = (req.user as any).id;
        
        if (options.requireAll) {
          // User must have ALL specified permissions
          for (const permission of requiredPermissions) {
            const hasPermission = await this.hasPermission(userId, permission);
            if (!hasPermission) {
              return res.status(403).json({ 
                message: `Access denied: missing permission '${permission}'` 
              });
            }
          }
        } else {
          // User must have AT LEAST ONE of the specified permissions
          let hasAnyPermission = false;
          for (const permission of requiredPermissions) {
            const hasPermission = await this.hasPermission(userId, permission);
            if (hasPermission) {
              hasAnyPermission = true;
              break;
            }
          }
          
          if (!hasAnyPermission) {
            return res.status(403).json({ 
              message: `Access denied: requires one of [${requiredPermissions.join(', ')}]` 
            });
          }
        }

        next();
      } catch (error) {
        return res.status(500).json({ message: 'Permission check failed' });
      }
    };
  }

  /**
   * Express middleware for role-based access
   */
  roleMiddleware(requiredRoles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Ensure user is authenticated
      if (!req.user || !(req.user as any).id) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      try {
        const userId = (req.user as any).id;
        const userRoles = await this.getUserRoles(userId);
        const userRoleNames = userRoles.map(role => role.name);
        
        const hasRequiredRole = requiredRoles.some(roleName => 
          userRoleNames.includes(roleName)
        );

        if (!hasRequiredRole) {
          return res.status(403).json({ 
            message: `Access denied: requires role [${requiredRoles.join(', ')}]` 
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({ message: 'Role check failed' });
      }
    };
  }
}

export default SaaSRBAC;