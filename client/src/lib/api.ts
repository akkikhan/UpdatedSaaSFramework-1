import { apiRequest } from "./queryClient";

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

export const api = {
  // Tenant operations
  async getTenants(): Promise<Tenant[]> {
    const response = await apiRequest('GET', '/api/tenants');
    return response.json();
  },

  async getTenant(id: string): Promise<Tenant> {
    const response = await apiRequest('GET', `/api/tenants/${id}`);
    return response.json();
  },

  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const response = await apiRequest('POST', '/api/tenants', data);
    return response.json();
  },

  async updateTenantStatus(id: string, status: string): Promise<void> {
    await apiRequest('PATCH', `/api/tenants/${id}/status`, { status });
  },

  async resendOnboardingEmail(id: string): Promise<void> {
    await apiRequest('POST', `/api/tenants/${id}/resend-email`);
  },

  // Statistics
  async getStats(): Promise<TenantStats> {
    const response = await apiRequest('GET', '/api/stats');
    return response.json();
  },

  async getRecentTenants(limit: number = 5): Promise<Tenant[]> {
    const response = await apiRequest('GET', `/api/tenants/recent?limit=${limit}`);
    return response.json();
  },

  // Health check
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
};
