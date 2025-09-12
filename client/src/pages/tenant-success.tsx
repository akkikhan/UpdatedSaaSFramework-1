import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, ExternalLink, Key, Mail, Building2, Globe } from "lucide-react";
import { useLocation } from "wouter";

interface TenantData {
  id: string;
  name: string;
  orgId: string;
  adminEmail: string;
  authApiKey: string;
  rbacApiKey: string;
  status: string;
}

export default function TenantSuccessPage() {
  const [, setLocation] = useLocation();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);

  useEffect(() => {
    // Load branding data once and show success body instead of auto-redirect
    try {
      const savedTenantData = sessionStorage.getItem('newTenantData');
      if (savedTenantData) {
        setTenantData(JSON.parse(savedTenantData));
        sessionStorage.removeItem('newTenantData');
      }
    } catch {}
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const baseUrl = window.location.origin;
  const tenantPortalUrl = tenantData ? `${baseUrl}/tenant/${tenantData.orgId}/` : '';
  const tempPassword = 'temp123!';

  if (!tenantData) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-green-800">Success</h2>
        <p className="text-green-700 mt-2">Your tenant was created. You can close this tab.</p>
        <Button className="mt-4" onClick={() => setLocation('/tenants')}>Go to Tenants</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">Tenant Created Successfully!</h1>
          <p className="text-lg text-green-700">
            Your tenant "{tenantData.name}" is ready to use
          </p>
          <div className="mt-2 text-sm text-green-700 flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-green-600 text-white rounded-md flex items-center justify-center font-semibold">
              {tenantData.name.substring(0,2).toUpperCase()}
            </div>
            <span className="opacity-80">Org ID: {tenantData.orgId}</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Tenant Access Information */}
          <Card className="shadow-lg" data-testid="card-tenant-access">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Tenant Portal Access
              </CardTitle>
              <CardDescription>
                Access your dedicated tenant portal to manage users and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-blue-800">Portal URL</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenantPortalUrl, 'Portal URL')}
                    className="flex items-center gap-2"
                    data-testid="button-copy-url"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <code className="block text-sm bg-white p-3 rounded border break-all" data-testid="text-portal-url">
                  {tenantPortalUrl}
                </code>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-amber-800">Admin Login</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <div className="flex justify-between items-center">
                      <code className="text-sm bg-white p-2 rounded border" data-testid="text-admin-email">
                        {tenantData.adminEmail}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tenantData.adminEmail, 'Admin Email')}
                        className="flex items-center gap-1"
                        data-testid="button-copy-email"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Temporary Password:</span>
                    <div className="flex justify-between items-center">
                      <code className="text-sm bg-white p-2 rounded border" data-testid="text-temp-password">
                        {tempPassword}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tempPassword, 'Password')}
                        className="flex items-center gap-1"
                        data-testid="button-copy-password"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                asChild 
                className="w-full"
                data-testid="button-access-portal"
              >
                <a href={tenantPortalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Tenant Portal
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* API Integration */}
          <Card className="shadow-lg" data-testid="card-api-keys">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-600" />
                API Integration
              </CardTitle>
              <CardDescription>
                Use these API keys to integrate authentication into your applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-purple-800">Authentication API Key</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenantData.authApiKey, 'Auth API Key')}
                    className="flex items-center gap-2"
                    data-testid="button-copy-auth-key"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <code className="block text-xs bg-white p-3 rounded border break-all font-mono" data-testid="text-auth-api-key">
                  {tenantData.authApiKey}
                </code>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-indigo-800">RBAC API Key</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenantData.rbacApiKey, 'RBAC API Key')}
                    className="flex items-center gap-2"
                    data-testid="button-copy-rbac-key"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <code className="block text-xs bg-white p-3 rounded border break-all font-mono" data-testid="text-rbac-api-key">
                  {tenantData.rbacApiKey}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Details */}
          <Card className="shadow-lg" data-testid="card-tenant-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                Tenant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Tenant ID:</span>
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-gray-50 p-2 rounded border" data-testid="text-tenant-id">
                    {tenantData.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenantData.id, 'Tenant ID')}
                    className="flex items-center gap-1"
                    data-testid="button-copy-tenant-id"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Organization ID:</span>
                <div className="flex justify-between items-center">
                  <code className="text-sm bg-gray-50 p-2 rounded border" data-testid="text-org-id">
                    {tenantData.orgId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tenantData.orgId, 'Organization ID')}
                    className="flex items-center gap-1"
                    data-testid="button-copy-org-id"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium" data-testid="text-status">
                  {tenantData.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="shadow-lg" data-testid="card-next-steps">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Access your tenant portal using the URL and credentials above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Change the temporary password immediately</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Set up additional users and configure roles</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                  <span>Integrate the API keys into your applications</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/tenants')}
            data-testid="button-manage-tenants"
          >
            Manage All Tenants
          </Button>
          <Button 
            onClick={() => setLocation('/onboarding-wizard')}
            data-testid="button-create-another"
          >
            Create Another Tenant
          </Button>
        </div>
      </div>
    </div>
  );
}
