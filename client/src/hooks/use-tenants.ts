import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useTenants() {
  return useQuery({
    queryKey: ["/api/tenants"],
    queryFn: () => api.getTenants(),
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ["/api/tenants", id],
    queryFn: () => api.getTenant(id as string),
    enabled: !!id,
  });
}

export function useRecentTenants(limit: number = 5) {
  return useQuery({
    queryKey: ["/api/tenants/recent", limit],
    queryFn: () => api.getRecentTenants(limit),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: api.createTenant,
    onSuccess: tenantData => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/recent"] });
      // Don't show toast here - the onboarding wizard will handle the redirect to success page
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTenantStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateTenantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Tenant status updated successfully",
      });
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant status",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTenantModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { enabledModules?: string[]; moduleConfigs?: Record<string, any> };
    }) => api.updateTenantModules(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Tenant modules updated",
      });
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to update modules",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: api.deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Tenant deleted" });
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    },
  });
}

export function useResendOnboardingEmail() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: api.resendOnboardingEmail,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Onboarding email sent successfully",
      });
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to send onboarding email",
        variant: "destructive",
      });
    },
  });
}

export function useNotificationHistory(
  tenantId: string | undefined,
  filters: {
    recipientId?: string;
    channel?: string;
    status?: string;
    template?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  return useQuery({
    queryKey: ["/api/notifications/history", tenantId, filters],
    queryFn: () => api.getNotificationHistory(tenantId as string, filters),
    enabled: !!tenantId,
    refetchInterval: 5000,
  });
}

export function useBulkResendNotifications(tenantId: string | undefined) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkResendNotifications(tenantId as string, ids),
    onSuccess: () => {
      toast({ title: "Success", description: "Notifications resent" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend notifications",
        variant: "destructive",
      });
    },
  });
}
