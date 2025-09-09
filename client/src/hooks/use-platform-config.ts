import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePermissionTemplates() {
  return useQuery({
    queryKey: ["/api/rbac-config/permission-templates"],
    queryFn: () => api.getPermissionTemplates(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useSsoProviders() {
  return useQuery({
    queryKey: ["/api/admin/auth/providers"],
    queryFn: () => api.getAuthProviders(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useBusinessTypes() {
  return useQuery({
    queryKey: ["/api/rbac-config/business-types"],
    queryFn: () => api.getBusinessTypes(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useDefaultRoles() {
  return useQuery({
    queryKey: ["/api/rbac-config/default-roles"],
    queryFn: () => api.getDefaultRoles(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useCustomRules() {
  return useQuery({
    queryKey: ["/api/rbac-config/custom-rules"],
    queryFn: () => api.getCustomRules(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

