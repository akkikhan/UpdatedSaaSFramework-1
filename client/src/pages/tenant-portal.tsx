import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Settings,
  Shield,
  Users,
  Key,
  Bell,
  FileText,
  Bot,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { Link, useParams } from "wouter";
import type { Tenant } from "@/../../shared/schema";

export default function TenantPortalPage() {
  const { tenantId } = useParams();
  
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  const moduleInfo = [
    {
      id: "auth",
      label: "Authentication",
      description: "User authentication and SSO providers",
      icon: Shield,
      color: "bg-blue-500",
      status: Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("auth") ? "enabled" : "disabled",
    },
    {
      id: "rbac",
      label: "Role-Based Access Control",
      description: "Roles and permissions management",
      icon: Users,
      color: "bg-green-500",
      status: Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") ? "enabled" : "disabled",
    },
    {
      id: "logging",
      label: "Logging & Monitoring",
      description: "Comprehensive audit trail and security monitoring",
      icon: FileText,
      color: "bg-slate-500",
      status: Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("logging") ? "enabled" : "disabled",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Multi-channel messaging and alerts system",
      icon: Bell,
      color: "bg-yellow-500",
      status: Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("notifications") ? "enabled" : "disabled",
    },
    {
      id: "ai-copilot",
      label: "AI Copilot",
      description: "Intelligent automation and user assistance",
      icon: Bot,
      color: "bg-indigo-500",
      status: Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("ai-copilot") ? "enabled" : "disabled",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600">Loading tenant portal...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-slate-600">Tenant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-8 w-8 text-blue-500" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{tenant.name}</h1>
                  <p className="text-sm text-slate-600">Organization ID: {tenant.orgId}</p>
                </div>
              </div>
              <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                {tenant.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/tenants">
                <Button variant="outline">Back to Admin</Button>
              </Link>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") ? "grid-cols-5" : "grid-cols-4"}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            {Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") && (
              <TabsTrigger value="rbac">Roles & Permissions</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Active Modules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {Array.isArray(tenant.enabledModules) ? tenant.enabledModules.length : 0}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    Modules currently enabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Auth:</span>
                      <span className="font-mono text-xs">{tenant.authApiKey}</span>
                    </div>
                    {Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") && (
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-green-500" />
                        <span className="font-medium">RBAC:</span>
                        <span className="font-mono text-xs">{tenant.rbacApiKey}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">All systems operational</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Last updated: {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : 'Never'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for managing your tenant configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                    <Shield className="h-6 w-6" />
                    Configure SSO
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                    <Users className="h-6 w-6" />
                    Manage Roles
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                    <Bell className="h-6 w-6" />
                    Setup Notifications
                  </Button>
                  <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                    <Settings className="h-6 w-6" />
                    Module Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Module Management</CardTitle>
                <CardDescription>
                  Enable or disable modules and configure their settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {moduleInfo.map((module) => {
                    const Icon = module.icon;
                    const isEnabled = module.status === "enabled";
                    
                    return (
                      <div
                        key={module.id}
                        className={`flex items-center justify-between p-4 rounded-lg border $\{
                          isEnabled ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                        \}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg $\{module.color\} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{module.label}</h3>
                            <p className="text-sm text-slate-600">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isEnabled ? "default" : "secondary"}>
                            {module.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            {isEnabled ? "Configure" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Providers</CardTitle>
                <CardDescription>
                  Configure multiple authentication providers for different user groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Show current auth providers */}
                  {Array.isArray((tenant as any)?.moduleConfigs?.auth?.providers) && (tenant as any).moduleConfigs.auth.providers.length > 0 ? (
                    (tenant as any).moduleConfigs.auth.providers.map((provider: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {provider.type === 'azure-ad' && <Shield className="h-5 w-5 text-blue-500" />}
                            {provider.type === 'auth0' && <Zap className="h-5 w-5 text-orange-500" />}
                            {provider.type === 'saml' && <Globe className="h-5 w-5 text-purple-500" />}
                            <h3 className="font-semibold">{provider.name || provider.type.toUpperCase()}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {provider.priority === 1 && <Badge>Primary</Badge>}
                            {provider.priority === 2 && <Badge variant="secondary">Secondary</Badge>}
                            {provider.enabled && <Badge variant="outline" className="text-green-600">Active</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          {provider.type === 'azure-ad' && 'Microsoft Azure Active Directory integration'}
                          {provider.type === 'auth0' && 'Auth0 universal identity platform'}
                          {provider.type === 'saml' && 'SAML 2.0 enterprise single sign-on'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button size="sm">Configure</Button>
                          <Button size="sm" variant="outline">Test Connection</Button>
                          {!provider.enabled && <Button size="sm" variant="outline">Enable</Button>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Local Authentication (Default)</h3>
                        <Badge>Primary</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Username/password authentication with local database
                      </p>
                      <Button size="sm">Configure</Button>
                    </div>
                  )}
                  
                  <div className="p-4 border rounded-lg border-dashed">
                    <div className="text-center py-4">
                      <Globe className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600 mb-2">Add another authentication provider</p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm">+ Azure AD</Button>
                        <Button variant="outline" size="sm">+ Auth0</Button>
                        <Button variant="outline" size="sm">+ SAML</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rbac" className="space-y-6">
            {Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* RBAC Configuration */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>RBAC Configuration</CardTitle>
                      <CardDescription>
                        Role-Based Access Control settings for this tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Permission Template</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-blue-700">Standard</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Basic permission set with core user management and role assignment capabilities
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Business Type</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-700">General</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Standard business operations with Admin, Manager, and User roles
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Quick Actions</p>
                        <p className="text-xs text-slate-600">Manage roles and permissions</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/tenants/${tenantId}/rbac`}>
                          <Button size="sm">
                            <Users className="h-4 w-4 mr-2" />
                            Manage RBAC
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Stats */}
              <div>
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">RBAC Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Roles</span>
                      <span className="font-semibold">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Permissions</span>
                      <span className="font-semibold">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Active Users</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">RBAC Active</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    RBAC Module Not Enabled
                  </CardTitle>
                  <CardDescription>
                    Role-Based Access Control features are not available for this tenant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">RBAC Module Required</h3>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                      To manage roles and permissions for this tenant, the RBAC module needs to be enabled. 
                      Contact your platform administrator to enable this feature.
                    </p>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">RBAC Module Features:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Role creation and management</li>
                          <li>• Granular permission control</li>
                          <li>• User role assignments</li>
                          <li>• Access control enforcement</li>
                        </ul>
                      </div>
                      <Button variant="outline" className="mt-4">
                        <Settings className="h-4 w-4 mr-2" />
                        Contact Administrator
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Settings</CardTitle>
                <CardDescription>
                  General configuration and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Organization Name</label>
                    <input
                      type="text"
                      value={tenant.name}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Admin Email</label>
                    <input
                      type="email"
                      value={tenant.adminEmail}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}