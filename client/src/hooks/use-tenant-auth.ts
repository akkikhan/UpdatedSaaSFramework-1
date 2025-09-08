import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getOrgIdFromLocation(): string | null {
  try {
    const match = window.location.pathname.match(/\/tenant\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function getTenantToken(orgId?: string | null): string | null {
  const oid = orgId ?? getOrgIdFromLocation();
  if (oid) {
    const namespaced = localStorage.getItem(`tenant_token_${oid}`);
    if (namespaced) return namespaced;
  }
  return localStorage.getItem("tenant_token");
}

function setTenantToken(orgId: string, token: string, user: any) {
  localStorage.setItem("tenant_token", token);
  localStorage.setItem("tenant_user", JSON.stringify(user));
  if (orgId) {
    localStorage.setItem(`tenant_token_${orgId}`, token);
    localStorage.setItem(`tenant_user_${orgId}`, JSON.stringify(user));
  }
}

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
      const tenantResponse = await apiRequest("GET", `/api/tenants/by-org-id/${data.orgId}`);
      if (!tenantResponse.ok) {
        throw new Error("Tenant not found");
      }
      const tenant = await tenantResponse.json();

      // Then login with tenant ID
      const loginResponse = await apiRequest("POST", "/api/v2/auth/login", {
        email: data.email,
        password: data.password,
        tenantId: tenant.id,
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(error.message || "Login failed");
      }

      const loginResult = await loginResponse.json();

      // Store token (global + org-scoped)
      setTenantToken(data.orgId, loginResult.token, loginResult.user);

      return loginResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/me"] });
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: error => {
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
  const { toast } = useToast();

  // Get current user from localStorage for now
  let user = (() => {
    try {
      const orgId = getOrgIdFromLocation();
      const namespaced = orgId ? localStorage.getItem(`tenant_user_${orgId}`) : null;
      const stored = namespaced || localStorage.getItem("tenant_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Verify token and check tenant status
  const { data: verifyData } = useQuery({
    queryKey: ["/api/v2/auth/verify"],
    queryFn: async () => {
      const token = getTenantToken();
      if (!token) return null;

      const response = await fetch("/api/v2/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle suspended tenant
        if (errorData?.error === "TENANT_SUSPENDED") {
          localStorage.removeItem("tenant_token");
          localStorage.removeItem("tenant_user");
          toast({
            title: "Account Suspended",
            description: errorData.message || "Your organization's account has been suspended.",
            variant: "destructive",
          });
          // Force page reload to show suspension notice
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return null;
        }

        localStorage.removeItem("tenant_token");
        localStorage.removeItem("tenant_user");
        return null;
      }

      return response.json();
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds for suspension
  });

  // If local user is missing but verifyData exists, synthesize a minimal user
  if (!user && (verifyData as any)?.user) {
    try {
      user = {
        id: (verifyData as any).user.userId,
        email: (verifyData as any).user.email,
        tenantId: (verifyData as any).user.tenantId,
        isActive: true,
      } as any;
    } catch {}
  }

  const logout = useMutation({
    mutationFn: async () => {
      const token = getTenantToken();
      if (token) {
        // Create a custom fetch with auth header
        await fetch("/api/v2/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
      const orgId = getOrgIdFromLocation();
      if (orgId) {
        localStorage.removeItem(`tenant_token_${orgId}`);
        localStorage.removeItem(`tenant_user_${orgId}`);
      }
      localStorage.removeItem("tenant_token");
      localStorage.removeItem("tenant_user");
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
