import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/hooks/use-tenants";
import TenantLayout from "@/components/tenants/tenant-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { usePermissionTemplates, useSsoProviders } from "@/hooks/use-platform-config";
import { MODULES_INFO } from "../../../shared/types";

export default function TenantAttentionPage() {
  const { tenantId } = useParams();
  const { data: tenant, isLoading } = useTenant(tenantId);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["/api/admin/module-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/module-requests");
      return res.json();
    },
    refetchInterval: 5000,
  }) as unknown as {
    data: Array<{ id: string; tenantId: string; details?: { moduleId?: string; action?: string } }>;
  };

  if (isLoading) {
    return <div className="p-4">Loading tenant data...</div>;
  }

  if (!tenant) {
    return <div className="p-4">Tenant not found</div>;
  }

  const tenantRequests = pendingRequests.filter(r => r.tenantId === tenant.id);

  const { data: ssoProviders = [] } = useSsoProviders();
  const authProviders = (tenant.moduleConfigs as any)?.auth?.providers || [];
  const providerStatus = (type: string) =>
    authProviders.some((p: any) => p.type === type) ? "Active" : "Missing";
  const rbacEnabled =
    Array.isArray(tenant.enabledModules) && tenant.enabledModules.includes("rbac");

  const { data: permissionTemplates = [] } = usePermissionTemplates();
  const templateId = (tenant.moduleConfigs as any)?.rbac?.permissionTemplate;
  const currentTemplate = permissionTemplates.find((t: any) => t.id === templateId);

  const queryClient = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveModuleRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] }),
  });
  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.dismissModuleRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] }),
  });

  const approveAll = async () => {
    await Promise.all(tenantRequests.map(r => api.approveModuleRequest(r.id)));
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  const dismissAll = async () => {
    await Promise.all(tenantRequests.map(r => api.dismissModuleRequest(r.id)));
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  return (
    <TenantLayout>
      <div className="flex items-center gap-2">
        <Link href="/tenants">
          <Button variant="ghost" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Tenant Needs Attention</h1>
          <p className="text-slate-600">Manage settings for {tenant.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantRequests.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={approveAll}
                    disabled={approveMutation.isPending}
                  >
                    Approve All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={dismissAll}
                    disabled={dismissMutation.isPending}
                  >
                    Dismiss All
                  </Button>
                </div>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {tenantRequests.map(r => {
                    const moduleName =
                      MODULES_INFO[r.details?.moduleId || ""]?.name ||
                      r.details?.moduleId ||
                      "Module";
                    const actionLabel = r.details?.action
                      ? r.details.action.charAt(0).toUpperCase() + r.details.action.slice(1)
                      : "Pending";
                    return (
                      <li key={r.id} className="flex items-center justify-between">
                        <span>{`${moduleName} – ${actionLabel}`}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveMutation.mutate(r.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissMutation.mutate(r.id)}
                            disabled={dismissMutation.isPending}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No pending requests</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RBAC Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={rbacEnabled ? "default" : "destructive"}>
              {rbacEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {rbacEnabled && (
              <p className="text-sm text-slate-600">
                Template: {currentTemplate?.name || templateId || "Unknown"}
              </p>
            )}
            <Link href={`/tenants/${tenant.id}/rbac`}>
              <Button className="w-full mt-2" variant="outline">
                {rbacEnabled ? "Manage RBAC" : "Enable RBAC"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SSO Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1.5">
              {ssoProviders.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <Badge variant={providerStatus(p.id) === "Active" ? "default" : "destructive"}>
                    {providerStatus(p.id)}
                  </Badge>
                </div>
              ))}
            </div>
            <Link href={`/tenants/${tenant.id}/sso`}>
              <Button className="w-full mt-2" variant="outline">
                Configure SSO Providers
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}
