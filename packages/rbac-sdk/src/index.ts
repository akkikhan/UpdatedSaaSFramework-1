import { z } from 'zod';

// Types
export interface RBACConfig {
  apiKey: string;
  baseUrl: string;
  tenantId: string;
}

export interface RolePermissionDetail {
  resource: string;
  action: string;
  scope?: string;
  conditions?: unknown[];
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  permissionDetails: RolePermissionDetail[];
  tenantId: string;
  createdAt: Date;
  updatedAt?: Date;
  inheritsFrom?: string[];
  metadata?: Record<string, unknown>;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

// Validation schemas
const permissionDetailSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
  scope: z.enum(['tenant', 'resource', 'global']).optional(),
  conditions: z.array(z.unknown()).optional(),
  description: z.string().optional(),
});

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  permissionDetails: z.array(permissionDetailSchema).optional(),
  inheritsFrom: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const permissionCheckSchema = z.object({
  userId: z.string(),
  resource: z.string(),
  action: z.string(),
});

export class SaaSFactoryRBAC {
  private config: RBACConfig;

  constructor(config: RBACConfig) {
    this.config = config;
  }

  /**
   * Check if user has permission for resource and action
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const validated = permissionCheckSchema.parse({ userId, resource, action });
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/check-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        },
        body: JSON.stringify(validated)
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.hasPermission === true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/users/${userId}/roles`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user roles');
      }

      const roles = await response.json();
      return roles.map((role: any) => ({
        ...role,
        createdAt: new Date(role.createdAt)
      }));
    } catch (error) {
      console.error('Failed to get user roles:', error);
      throw error;
    }
  }

  /**
   * Get all roles for tenant
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/roles`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const roles = await response.json();
      return roles.map((role: any) => ({
        ...role,
        createdAt: new Date(role.createdAt)
      }));
    } catch (error) {
      console.error('Failed to get roles:', error);
      throw error;
    }
  }

  /**
   * Create new role
   */
  async createRole(roleData: { name: string; description?: string; permissions: string[] }): Promise<Role> {
    const validated = roleSchema.parse(roleData);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        },
        body: JSON.stringify(validated)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create role');
      }

      const role = await response.json();
      return {
        ...role,
        createdAt: new Date(role.createdAt)
      };
    } catch (error) {
      console.error('Failed to create role:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        },
        body: JSON.stringify({ roleId })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to assign role:', error);
      return false;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove role:', error);
      return false;
    }
  }

  /**
   * Get available permissions
   */
  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/permissions`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Tenant-ID': this.config.tenantId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get permissions:', error);
      throw error;
    }
  }

  /**
   * Middleware function for Express.js to check permissions
   */
  requirePermission(resource: string, action: string) {
    return async (req: any, res: any, next: any) => {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const hasPermission = await this.hasPermission(userId, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    };
  }

  /**
   * Higher-order component for React to check permissions
   */
  static withPermission(resource: string, action: string, fallback?: React.ComponentType) {
    return function<P extends object>(Component: React.ComponentType<P>) {
      return function PermissionWrapper(props: P & { rbac: SaaSFactoryRBAC; userId: string }) {
        const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);

        React.useEffect(() => {
          props.rbac.hasPermission(props.userId, resource, action)
            .then(setHasPermission)
            .catch(() => setHasPermission(false));
        }, [props.userId, props.rbac]);

        if (hasPermission === null) {
          return null; // Loading state
        }

        if (!hasPermission) {
          return fallback ? React.createElement(fallback) : null;
        }

        return React.createElement(Component, props);
      };
    };
  }
}

// React hooks (if using React)
export function useRBAC(config: RBACConfig) {
  const rbac = new SaaSFactoryRBAC(config);
  
  return {
    hasPermission: rbac.hasPermission.bind(rbac),
    getUserRoles: rbac.getUserRoles.bind(rbac),
    getRoles: rbac.getRoles.bind(rbac),
    createRole: rbac.createRole.bind(rbac),
    assignRole: rbac.assignRole.bind(rbac),
    removeRole: rbac.removeRole.bind(rbac),
    getPermissions: rbac.getPermissions.bind(rbac)
  };
}

// Export default class
export default SaaSFactoryRBAC;