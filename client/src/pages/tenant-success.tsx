import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Mail, Building2 } from "lucide-react";
import { useLocation } from "wouter";

interface TenantData {
  id: string;
  name: string;
  orgId: string;
  adminEmail: string;
  emailSent?: boolean;
}

export default function TenantSuccessPage() {
  const [, setLocation] = useLocation();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("newTenantData");
      if (stored) {
        setTenantData(JSON.parse(stored));
        sessionStorage.removeItem("newTenantData");
      }
    } catch {
      setTenantData(null);
    }
  }, []);

  const portalUrl = tenantData ? `${window.location.origin}/tenant/${tenantData.orgId}/` : "";
  const emailNotice = tenantData?.emailSent !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800">Tenant Created Successfully</h1>
          {tenantData ? (
            <p className="text-lg text-green-700">
              {tenantData.name} is ready.{" "}
              {emailNotice ? "We've emailed the onboarding credentials to" : "Reach out to"}{" "}
              <span className="font-semibold">{tenantData.adminEmail}</span>.
            </p>
          ) : (
            <p className="text-lg text-green-700">
              The tenant has been provisioned. You can return to the tenant list when you're ready.
            </p>
          )}
        </div>

        {tenantData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Tenant Details
              </CardTitle>
              <CardDescription>Keep this information handy for quick access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-600">Organization ID</span>
                <p className="font-mono text-sm">{tenantData.orgId}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600">Admin Email</span>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span>{tenantData.adminEmail}</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600">Tenant Portal</span>
                <p className="font-mono text-sm break-all">{portalUrl}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-600" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>1. Share the onboarding email with the tenant administrator.</p>
            <p>2. Ask them to sign in and change the temporary password right away.</p>
            <p>3. Configure users, roles, and module settings from the tenant portal.</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => setLocation("/tenants")}>Manage Tenants</Button>
          <Button onClick={() => setLocation("/onboarding-wizard")}>Create Another Tenant</Button>
        </div>
      </div>
    </div>
  );
}
