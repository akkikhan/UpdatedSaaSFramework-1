import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, Bell, Cloud } from "lucide-react";

export default function TenantAttentionPage() {
  const { tenantId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenants", tenantId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tenants/${tenantId}`);
      return res.json();
    },
    enabled: !!tenantId,
  }) as { data: any };

  const { data: requests = [] } = useQuery({
    queryKey: ["/api/admin/module-requests", tenantId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/module-requests");
      const all = await res.json();
      return (all || []).filter((r: any) => r.tenantId === tenantId);
    },
    refetchInterval: 5000,
  }) as { data: any[] };

  const approveMutation = useMutation({
    mutationFn: async (req: any) => {
      await apiRequest("POST", `/api/admin/module-requests/${req.id}/approve`, {
        tenantId: req.tenantId,
        moduleId: req.details?.moduleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      toast({ title: "Approved", description: "Module request approved" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (req: any) => {
      await apiRequest("POST", `/api/admin/module-requests/${req.id}/dismiss`, {
        tenantId: req.tenantId,
        moduleId: req.details?.moduleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
      toast({ title: "Dismissed", description: "Module request dismissed" });
    },
  });

  const enableRBAC = async () => {
    const next = Array.from(new Set([...(tenant?.enabledModules || []), "auth", "rbac"]));
    await apiRequest("PATCH", `/api/tenants/${tenantId}/modules`, {
      enabledModules: next,
      moduleConfigs: tenant?.moduleConfigs || {},
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
    toast({ title: "RBAC Enabled" });
  };

  const disableRBAC = async () => {
    const next = (tenant?.enabledModules || []).filter((m: string) => m !== "rbac");
    await apiRequest("PATCH", `/api/tenants/${tenantId}/modules`, {
      enabledModules: next,
      moduleConfigs: tenant?.moduleConfigs || {},
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
    toast({ title: "RBAC Disabled" });
  };

  const providers = tenant?.moduleConfigs?.auth?.providers || [];
  const hasSSO = Array.isArray(providers)
    ? providers.some((p: any) => ["azure-ad", "auth0", "saml"].includes(p?.type))
    : false;
  const hasRBAC = (tenant?.enabledModules || []).includes("rbac");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenant Needs Attention</h1>
        <div className="text-slate-500">{tenant?.name}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-sm text-slate-500">No pending requests</div>
            ) : (
              requests.map(r => (
                <div key={r.id} className="flex items-center justify-between border rounded p-2">
                  <div className="text-sm">
                    <Badge variant="secondary" className="mr-2">
                      {r.details?.moduleId}
                    </Badge>
                    {r.details?.action}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(r)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismissMutation.mutate(r)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> RBAC Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              RBAC: {hasRBAC ? <Badge>Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}
            </div>
            <div className="flex gap-2">
              {!hasRBAC ? (
                <Button size="sm" onClick={enableRBAC}>
                  Enable RBAC
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={disableRBAC}>
                  Disable RBAC
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" /> SSO Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Azure/Auth0/SAML:{" "}
              {hasSSO ? <Badge>Configured</Badge> : <Badge variant="destructive">Missing</Badge>}
            </div>
            {!hasSSO && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/modules?tenantId=${tenantId}`)}
              >
                Configure Azure AD
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
