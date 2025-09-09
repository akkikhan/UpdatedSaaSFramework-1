import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/hooks/use-tenants";
import TenantLayout from "@/components/tenants/tenant-layout";

export default function TenantAttentionPage() {
  const { tenantId } = useParams();
  const { data: tenant, isLoading } = useTenant(tenantId);

  if (isLoading) {
    return <div className="p-4">Loading tenant data...</div>;
  }

  if (!tenant) {
    return <div className="p-4">Tenant not found</div>;
  }

  const authProviders = (tenant.moduleConfigs as any)?.auth?.providers || [];
  const providerStatus = (type: string) =>
    authProviders.some((p: any) => p.type === type) ? "Active" : "Missing";
  const providers = [
    { id: "azure-ad", label: "Azure AD" },
    { id: "auth0", label: "Auth0" },
    { id: "manual", label: "Manual" },
  ];
  const rbacEnabled = Array.isArray(tenant.enabledModules) && tenant.enabledModules.includes("rbac");

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
            <p className="text-sm text-slate-600">No pending requests</p>

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
              {providers.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <Badge variant={providerStatus(p.id) === "Active" ? "default" : "destructive"}>
                    {providerStatus(p.id)}
                  </Badge>
                </div>
              ))}
            </div>
            <Link href={`/tenants/${tenant.id}/sso`}>
              <Button className="w-full mt-2" variant="outline">Configure SSO Providers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}
