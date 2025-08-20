import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TenantLoginData {
  email: string;
  password: string;
  orgId: string;
}

interface TenantUser {
  id: string;
  email: string;
  tenantId: string;
  isActive: boolean;
}

interface TenantLoginResponse {
  token: string;
  user: TenantUser;
  expiresAt: string;
}

export function useTenantLogin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TenantLoginData): Promise<TenantLoginResponse> => {
      // First get tenant by orgId
      const tenantResponse = await apiRequest('GET', `/api/tenants/by-org-id/${data.orgId}`);
      if (!tenantResponse.ok) {
        throw new Error('Tenant not found');
      }
      const tenant = await tenantResponse.json();

      // Then login with tenant ID
      const loginResponse = await apiRequest('POST', '/api/v2/auth/login', {
        email: data.email,
        password: data.password,
        tenantId: tenant.id
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(error.message || 'Login failed');
      }

      const loginResult = await loginResponse.json();
      
      // Store token in localStorage
      localStorage.setItem('tenant_token', loginResult.token);
      localStorage.setItem('tenant_user', JSON.stringify(loginResult.user));
      
      return loginResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/me'] });
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });
}

export function useTenantAuth() {
  const queryClient = useQueryClient();
  
  // Get current user from localStorage for now
  const user = (() => {
    try {
      const stored = localStorage.getItem('tenant_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const logout = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('tenant_token');
      if (token) {
        // Create a custom fetch with auth header
        await fetch('/api/v2/auth/logout', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_user');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    user,
    logout,
  };
}