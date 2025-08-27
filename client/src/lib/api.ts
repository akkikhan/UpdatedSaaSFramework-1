import { apiRequest } from './queryClient';

// ===== TYPE DEFINITIONS =====

export interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  pendingTenants: number;
  emailsSent: number;
}

export interface Tenant {
  id: string;
  orgId: string;
  name: string;
  adminEmail: string;
  status: 'pending' | 'active' | 'suspended';
  authApiKey: string;
  rbacApiKey: string;
  enabledModules: string[];
  moduleConfigs: Record<string, any>;
  plan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantData {
  orgId: string;
  name: string;
  adminEmail: string;
  sendEmail?: boolean;
  enabledModules: string[];
  moduleConfigs: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  tenantId?: string;
  inviteToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
  tenantId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant?: Tenant;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  isSystemRole: boolean;
  permissions?: Permission[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  tenantId: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface CreatePermissionData {
  name: string;
  description?: string;
  category: string;
  resource: string;
  action: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  tenantId: string;
  assignedAt: string;
  assignedBy: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  assignedAt: string;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive: boolean;
}

// ===== API CLIENT =====

export const api = {
  // ===== AUTHENTICATION =====
  auth: {
    async login(data: LoginData): Promise<AuthResponse> {
      const response = await apiRequest('POST', '/api/v2/auth/login', data);
      return response.json();
    },

    async register(data: CreateUserData): Promise<AuthResponse> {
      const response = await apiRequest('POST', '/api/v2/auth/register', data);
      return response.json();
    },

    async logout(): Promise<void> {
      await apiRequest('POST', '/api/v2/auth/logout');
    },

    async getCurrentUser(): Promise<{ user: User; tenant: Tenant | null }> {
      const response = await apiRequest('GET', '/api/v2/auth/me');
      return response.json();
    },

    async verifyToken(): Promise<{ valid: boolean; user?: User; tenant?: Tenant; error?: string }> {
      const response = await apiRequest('GET', '/api/v2/auth/verify');
      return response.json();
    },

    async refreshToken(refreshToken: string): Promise<{ token: string }> {
      const response = await apiRequest('POST', '/api/v2/auth/refresh', { refreshToken });
      return response.json();
    }
  },

  // ===== MFA MANAGEMENT =====
  mfa: {
    async setupTOTP(): Promise<MFASetup> {
      const response = await apiRequest('POST', '/api/v2/auth/mfa/totp/setup');
      return response.json();
    },

    async verifyTOTP(token: string): Promise<{ verified: boolean }> {
      const response = await apiRequest('POST', '/api/v2/auth/mfa/totp/verify', { token });
      return response.json();
    },

    async getMFAMethods(): Promise<{ methods: string[] }> {
      const response = await apiRequest('GET', '/api/v2/auth/mfa');
      return response.json();
    },

    async disableMFA(mfaType: string): Promise<{ success: boolean }> {
      const response = await apiRequest('DELETE', `/api/v2/auth/mfa/${mfaType}`);
      return response.json();
    }
  },

  // ===== USER MANAGEMENT =====
  users: {
    async getUsers(tenantId: string): Promise<User[]> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}/users`);
      return response.json();
    },

    async createUser(tenantId: string, data: CreateUserData): Promise<User> {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/users`, data);
      return response.json();
    },

    async getUser(tenantId: string, userId: string): Promise<User> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}/users/${userId}`);
      return response.json();
    },

    async updateUser(tenantId: string, userId: string, updates: Partial<User>): Promise<User> {
      const response = await apiRequest('PUT', `/api/tenants/${tenantId}/users/${userId}`, updates);
      return response.json();
    },

    async deleteUser(tenantId: string, userId: string): Promise<void> {
      await apiRequest('DELETE', `/api/tenants/${tenantId}/users/${userId}`);
    },

    async inviteUser(
      tenantId: string,
      data: { email: string; firstName: string; lastName: string; role?: string }
    ): Promise<{ inviteToken: string }> {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/users/invite`, data);
      return response.json();
    },

    async resendInvite(tenantId: string, userId: string): Promise<void> {
      await apiRequest('POST', `/api/tenants/${tenantId}/users/${userId}/resend-invite`);
    }
  },

  // ===== ROLE MANAGEMENT =====
  roles: {
    async getRoles(tenantId: string): Promise<Role[]> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}/roles`);
      return response.json();
    },

    async createRole(tenantId: string, data: CreateRoleData): Promise<Role> {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/roles`, data);
      return response.json();
    },

    async getRole(tenantId: string, roleId: string): Promise<Role> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}/roles/${roleId}`);
      return response.json();
    },

    async updateRole(tenantId: string, roleId: string, updates: Partial<Role>): Promise<Role> {
      const response = await apiRequest('PUT', `/api/tenants/${tenantId}/roles/${roleId}`, updates);
      return response.json();
    },

    async deleteRole(tenantId: string, roleId: string): Promise<void> {
      await apiRequest('DELETE', `/api/tenants/${tenantId}/roles/${roleId}`);
    },

    async getRolePermissions(tenantId: string, roleId: string): Promise<Permission[]> {
      const response = await apiRequest(
        'GET',
        `/api/tenants/${tenantId}/roles/${roleId}/permissions`
      );
      return response.json();
    },

    async assignPermission(
      tenantId: string,
      roleId: string,
      permissionId: string
    ): Promise<RolePermission> {
      const response = await apiRequest(
        'POST',
        `/api/tenants/${tenantId}/roles/${roleId}/permissions`,
        { permissionId }
      );
      return response.json();
    },

    async removePermission(tenantId: string, roleId: string, permissionId: string): Promise<void> {
      await apiRequest(
        'DELETE',
        `/api/tenants/${tenantId}/roles/${roleId}/permissions/${permissionId}`
      );
    }
  },

  // ===== USER-ROLE ASSIGNMENTS =====
  userRoles: {
    async getUserRoles(tenantId: string, userId: string): Promise<Role[]> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}/users/${userId}/roles`);
      return response.json();
    },

    async assignRole(tenantId: string, userId: string, roleId: string): Promise<UserRole> {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/users/${userId}/roles`, {
        roleId
      });
      return response.json();
    },

    async removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
      await apiRequest('DELETE', `/api/tenants/${tenantId}/users/${userId}/roles/${roleId}`);
    }
  },

  // ===== PERMISSION MANAGEMENT =====
  permissions: {
    async getAllPermissions(): Promise<Permission[]> {
      const response = await apiRequest('GET', '/api/permissions');
      return response.json();
    },

    async createPermission(data: CreatePermissionData): Promise<Permission> {
      const response = await apiRequest('POST', '/api/permissions', data);
      return response.json();
    },

    async getPermission(permissionId: string): Promise<Permission> {
      const response = await apiRequest('GET', `/api/permissions/${permissionId}`);
      return response.json();
    },

    async updatePermission(
      permissionId: string,
      updates: Partial<Permission>
    ): Promise<Permission> {
      const response = await apiRequest('PUT', `/api/permissions/${permissionId}`, updates);
      return response.json();
    },

    async deletePermission(permissionId: string): Promise<void> {
      await apiRequest('DELETE', `/api/permissions/${permissionId}`);
    }
  },

  // ===== TENANT OPERATIONS =====
  tenants: {
    async getTenants(): Promise<Tenant[]> {
      const response = await apiRequest('GET', '/api/tenants');
      return response.json();
    },

    async createTenant(data: CreateTenantData): Promise<Tenant> {
      const response = await apiRequest('POST', '/api/tenants', data);
      return response.json();
    },

    async getTenant(tenantId: string): Promise<Tenant> {
      const response = await apiRequest('GET', `/api/tenants/${tenantId}`);
      return response.json();
    },

    async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
      const response = await apiRequest('PUT', `/api/tenants/${tenantId}`, updates);
      return response.json();
    },

    async updateTenantStatus(id: string, status: string): Promise<void> {
      await apiRequest('PATCH', `/api/tenants/${id}/status`, { status });
    },

    async resendOnboardingEmail(id: string): Promise<void> {
      await apiRequest('POST', `/api/tenants/${id}/resend-email`);
    },

    async deleteTenant(tenantId: string): Promise<void> {
      await apiRequest('DELETE', `/api/tenants/${tenantId}`);
    }
  },

  // ===== SESSION MANAGEMENT =====
  sessions: {
    async getSessions(): Promise<SessionInfo[]> {
      const response = await apiRequest('GET', '/api/v2/auth/sessions');
      return response.json();
    },

    async revokeSession(sessionId: string): Promise<void> {
      await apiRequest('DELETE', `/api/v2/auth/sessions/${sessionId}`);
    },

    async revokeAllSessions(): Promise<void> {
      await apiRequest('DELETE', '/api/v2/auth/sessions');
    }
  },

  // ===== OAUTH =====
  oauth: {
    async initiateAzureAD(orgId: string): Promise<{ authUrl: string }> {
      const response = await apiRequest('GET', `/api/oauth/azure-ad/${orgId}`);
      return response.json();
    },

    async initiateAuth0(orgId: string): Promise<{ authUrl: string }> {
      const response = await apiRequest('GET', `/api/oauth/auth0/${orgId}`);
      return response.json();
    }
  },

  // ===== SAML =====
  saml: {
    async initiateSAMLLogin(tenantId: string): Promise<{ authUrl: string }> {
      const response = await apiRequest('GET', `/api/v2/auth/saml/${tenantId}/login`);
      return response.json();
    },

    async getSAMLMetadata(tenantId: string): Promise<string> {
      const response = await apiRequest('GET', `/api/v2/auth/saml/${tenantId}/metadata`);
      return response.text();
    }
  },

  // ===== ADMIN UTILITIES =====
  admin: {
    async getLoginAttempts(): Promise<any[]> {
      const response = await apiRequest('GET', '/api/v2/auth/admin/login-attempts');
      return response.json();
    },

    async unlockUser(userId: string): Promise<void> {
      await apiRequest('POST', '/api/v2/auth/admin/unlock', { userId });
    },

    async getAuthUsers(): Promise<User[]> {
      const response = await apiRequest('GET', '/api/v2/auth/users');
      return response.json();
    }
  },

  // ===== STATISTICS & MONITORING =====
  stats: {
    async getStats(): Promise<TenantStats> {
      const response = await apiRequest('GET', '/api/stats');
      return response.json();
    },

    async getRecentTenants(limit: number = 5): Promise<Tenant[]> {
      const response = await apiRequest('GET', `/api/tenants/recent?limit=${limit}`);
      return response.json();
    },

    async getHealthStatus(): Promise<{
      status: string;
      services: {
        database: boolean;
        email: boolean;
      };
      timestamp: string;
    }> {
      const response = await apiRequest('GET', '/api/health');
      return response.json();
    }
  }
};

// ===== LEGACY SUPPORT =====
// Keep these for backward compatibility
export const {
  getTenants,
  createTenant,
  updateTenantStatus,
  resendOnboardingEmail,
  getStats,
  getRecentTenants,
  getHealthStatus
} = {
  getTenants: api.tenants.getTenants,
  createTenant: api.tenants.createTenant,
  updateTenantStatus: api.tenants.updateTenantStatus,
  resendOnboardingEmail: api.tenants.resendOnboardingEmail,
  getStats: api.stats.getStats,
  getRecentTenants: api.stats.getRecentTenants,
  getHealthStatus: api.stats.getHealthStatus
};
