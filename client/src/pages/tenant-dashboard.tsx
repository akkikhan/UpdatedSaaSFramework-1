import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Shield, Key, Settings, Copy, Eye, EyeOff, Plus } from "lucide-react";
import { useTenantAuth } from "@/hooks/use-tenant-auth";
import { useToast } from "@/hooks/use-toast";

export default function TenantDashboard() {
  const { orgId } = useParams();
  const { user, logout } = useTenantAuth();
  const { toast } = useToast();
  const [showApiKeys, setShowApiKeys] = useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = `/tenant/${orgId}/login`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">Please log in to access the tenant portal</p>
          <Button onClick={() => window.location.href = `/tenant/${orgId}/login`}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Get tenant data from API
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/by-org-id/${orgId}`],
    enabled: !!orgId
  }) as { data: any };
  
  const { data: tenantUsers = [] } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/users`],
    enabled: !!tenant?.id
  }) as { data: any[] };
  
  const { data: tenantRoles = [] } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/roles`],
    enabled: !!tenant?.id
  }) as { data: any[] };
  
  // Check if tenant is suspended and handle accordingly
  if (tenant && tenant.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Account Suspended</h2>
          <p className="text-slate-600 mb-6">
            Your organization's account has been suspended. Please contact your administrator for assistance.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>Organization:</strong> {tenant.name}<br />
              <strong>Status:</strong> {tenant.status}<br />
              <strong>Contact:</strong> {tenant.adminEmail}
            </p>
          </div>
          <Button 
            onClick={() => {
              logout.mutate();
              window.location.href = `/tenant/${orgId}/login`;
            }}
            className="w-full"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Loading...</h2>
          <p className="text-slate-600">Fetching tenant information</p>
        </div>
      </div>
    );
  }
  
  const tenantInfo = {
    name: tenant.name || 'Unknown',
    status: tenant.status || 'unknown',
    authApiKey: tenant.authApiKey || '',
    rbacApiKey: tenant.rbacApiKey || '',
    enabledModules: (tenant.enabledModules as string[]) || ['auth', 'rbac'],
    moduleConfigs: tenant.moduleConfigs || {},
    users: tenantUsers || [],
    roles: tenantRoles || []
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {tenantInfo.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">{tenantInfo.name}</h1>
                <p className="text-sm text-slate-500">Tenant Portal</p>
              </div>
              <Badge variant={tenantInfo.status === 'active' ? 'default' : 'secondary'}>
                {tenantInfo.status.charAt(0).toUpperCase() + tenantInfo.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{user.email}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            {tenantInfo.enabledModules.includes('rbac') && (
              <TabsTrigger value="roles">Roles</TabsTrigger>
            )}
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantInfo.users.length}</div>
                  <p className="text-xs text-slate-600">+0 from last week</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
                  <Shield className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantInfo.roles.length}</div>
                  <p className="text-xs text-slate-600">System defined</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
                  <Key className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantInfo.enabledModules.length}</div>
                  <p className="text-xs text-slate-600">{tenantInfo.enabledModules.join(', ')}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">1. Install SDKs</p>
                    <p className="text-sm text-slate-600 mt-1">npm install @saas-framework/auth @saas-framework/rbac</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">2. Configure API Keys</p>
                    <p className="text-sm text-slate-600 mt-1">Use your Auth and RBAC API keys from the API Keys tab</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">3. Integrate Authentication</p>
                    <p className="text-sm text-slate-600 mt-1">Start with user login and JWT token validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users</CardTitle>
                  <Button data-testid="button-add-user">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tenantInfo.users as any[]).length > 0 ? (tenantInfo.users as any[]).map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">User</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-user-${user.id}`}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No users found. Add users to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Roles & Permissions</CardTitle>
                  <Button data-testid="button-add-role">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(tenantInfo.roles as any[]).length > 0 ? (tenantInfo.roles as any[]).map((role: any) => (
                  <Card key={role.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{role.name}</CardTitle>
                          <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                        </div>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-role-${role.id}`}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((permission: string) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-slate-500">
                    No custom roles found. Default system roles are used.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enabled Authentication Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenantInfo.enabledModules.map((module) => (
                  <Card key={module}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base capitalize">
                            {module === 'azure-ad' ? 'Azure Active Directory' : 
                             module === 'auth0' ? 'Auth0' : 
                             module === 'rbac' ? 'Role-Based Access Control' : 
                             'Core Authentication'}
                          </CardTitle>
                          <p className="text-sm text-slate-600 mt-1">
                            {module === 'azure-ad' ? 'Single sign-on with Microsoft Azure AD' :
                             module === 'auth0' ? 'Universal authentication with Auth0' :
                             module === 'rbac' ? 'Advanced role and permission management' :
                             'Basic JWT authentication and user management'}
                          </p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </CardHeader>
                    {(module === 'azure-ad' || module === 'auth0') && (tenantInfo.moduleConfigs as any)[module] && (
                      <CardContent className="pt-0">
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-slate-700">Configuration:</p>
                          {module === 'azure-ad' && (
                            <>
                              <p className="text-xs text-slate-600">Tenant ID: {tenantInfo.moduleConfigs[module].tenantId}</p>
                              <p className="text-xs text-slate-600">Client ID: {tenantInfo.moduleConfigs[module].clientId}</p>
                              <p className="text-xs text-slate-600">Domain: {tenantInfo.moduleConfigs[module].domain}</p>
                            </>
                          )}
                          {module === 'auth0' && (
                            <>
                              <p className="text-xs text-slate-600">Domain: {(tenantInfo.moduleConfigs as any)[module]?.domain}</p>
                              <p className="text-xs text-slate-600">Client ID: {(tenantInfo.moduleConfigs as any)[module]?.clientId}</p>
                            </>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>API Keys</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => setShowApiKeys(!showApiKeys)}
                    data-testid="button-toggle-api-keys"
                  >
                    {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showApiKeys ? "Hide" : "Show"} Keys
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Authentication API Key</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                        {showApiKeys ? tenantInfo.authApiKey : '•'.repeat(32)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tenantInfo.authApiKey, 'Auth API Key')}
                        data-testid="button-copy-auth-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Use this key for user authentication and JWT token management
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>RBAC API Key</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                        {showApiKeys ? tenantInfo.rbacApiKey : '•'.repeat(32)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tenantInfo.rbacApiKey, 'RBAC API Key')}
                        data-testid="button-copy-rbac-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Use this key for role and permission management
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}