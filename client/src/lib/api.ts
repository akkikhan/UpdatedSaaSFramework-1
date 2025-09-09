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
  status: "pending" | "active" | "suspended";
  authApiKey: string;
  rbacApiKey: string;
  enabledModules: string[];
  moduleConfigs: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  emailSent?: boolean;
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
    const response = await apiRequest("GET", "/api/tenants");
    return response.json();
  },

  async getTenant(id: string): Promise<Tenant> {
    const response = await apiRequest("GET", `/api/tenants/${id}`);
    return response.json();
  },

  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const response = await apiRequest("POST", "/api/tenants", data);
    return response.json();
  },

  async updateTenantStatus(id: string, status: string): Promise<void> {
    await apiRequest("PATCH", `/api/tenants/${id}/status`, { status });
  },

  async resendOnboardingEmail(id: string): Promise<void> {
    await apiRequest("POST", `/api/tenants/${id}/resend-email`);
  },

  async getNotificationHistory(
    tenantId: string,
    opts: {
      recipientId?: string;
      channel?: string;
      status?: string;
      template?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (opts.recipientId) params.set("recipientId", opts.recipientId);
    if (opts.channel) params.set("channel", opts.channel);
    if (opts.status) params.set("status", opts.status);
    if (opts.template) params.set("template", opts.template);
    if (typeof opts.limit === "number") params.set("limit", String(opts.limit));
    if (typeof opts.offset === "number") params.set("offset", String(opts.offset));
    const qs = params.toString();
    const response = await apiRequest(
      "GET",
      `/api/notifications/history${qs ? `?${qs}` : ""}`,
      undefined,
      { "x-tenant-id": tenantId }
    );
    return response.json();
  },

  async bulkResendNotifications(tenantId: string, ids: string[]): Promise<void> {
    await apiRequest(
      "POST",
      "/api/notifications/bulk-resend",
      { ids },
      { "x-tenant-id": tenantId }
    );
  },

  async deleteTenant(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/tenants/${id}`);
  },

  async updateTenantModules(
    id: string,
    payload: { enabledModules?: string[]; moduleConfigs?: Record<string, any> }
  ): Promise<void> {
    await apiRequest("PATCH", `/api/tenants/${id}/modules`, payload);
  },

  async configureTenantAzureAD(
    id: string,
    payload: { tenantId: string; clientId: string; clientSecret: string; callbackUrl?: string }
  ): Promise<void> {
    await apiRequest("POST", `/api/tenants/${id}/azure-ad/config`, payload);
  },

  async getAuthProviders(): Promise<Array<{ id: string; label: string }>> {
    const response = await apiRequest("GET", "/api/admin/auth/providers");
    return response.json();
  },

  async getPermissionTemplates(): Promise<any[]> {
    const response = await apiRequest("GET", "/api/rbac-config/permission-templates");
    return response.json();
  },

  async getBusinessTypes(): Promise<any[]> {
    const response = await apiRequest("GET", "/api/rbac-config/business-types");
    return response.json();
  },

  async getDefaultRoles(): Promise<any[]> {
    const response = await apiRequest("GET", "/api/rbac-config/default-roles");
    return response.json();
  },

  async getCustomRules(): Promise<any[]> {
    const response = await apiRequest("GET", "/api/rbac-config/custom-rules");
    return response.json();
  },

  async approveModuleRequest(id: string): Promise<void> {
    await apiRequest("POST", `/api/admin/module-requests/${id}/approve`);
  },

  async dismissModuleRequest(id: string): Promise<void> {
    await apiRequest("POST", `/api/admin/module-requests/${id}/dismiss`);
  },

  // Statistics
  async getStats(): Promise<TenantStats> {
    const response = await apiRequest("GET", "/api/stats");
    return response.json();
  },

  async getRecentTenants(limit: number = 5): Promise<Tenant[]> {
    const response = await apiRequest("GET", `/api/tenants/recent?limit=${limit}`);
    return response.json();
  },

  // Health check
  async getHealthStatus(): Promise<{
    status: string;
    services: {
      database: "operational" | "unavailable";
      email: "operational" | "unavailable";
    };
    system: {
      uptime: number;
      memory: Record<string, number>;
    };
    timestamp: string;
  }> {
    const response = await apiRequest("GET", "/api/health");
    return response.json();
  },

  async sendTestEmail(to?: string): Promise<{ success: boolean; to: string }> {
    const response = await apiRequest("POST", "/api/email/test", to ? { to } : {});
    return response.json();
  },
};
