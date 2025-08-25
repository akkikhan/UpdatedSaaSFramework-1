import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Shield, Key, Settings, Copy, Eye, EyeOff, Plus, Edit, Trash2, UserCheck } from "lucide-react";
import { useTenantAuth } from "@/hooks/use-tenant-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// Form schemas
const userFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  status: z.enum(["active", "inactive"]).default("active")
});

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required")
});

type UserFormData = z.infer<typeof userFormSchema>;
type RoleFormData = z.infer<typeof roleFormSchema>;

const AVAILABLE_PERMISSIONS = [
  "users.read", "users.create", "users.update", "users.delete",
  "roles.read", "roles.create", "roles.update", "roles.delete",
  "reports.read", "reports.create", "reports.export",
  "settings.read", "settings.update",
  "admin.full_access"
];

export default function TenantDashboard() {
  const { orgId } = useParams();
  const { user, logout } = useTenantAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = `/tenant/${orgId}/login`;
  };

  // User CRUD operations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });
  
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/roles/${roleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/roles`] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      deleteRoleMutation.mutate(roleId);
    }
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
  
  // Check if modules are enabled
  const isModuleEnabled = (moduleName: string) => {
    return tenantInfo.enabledModules.includes(moduleName);
  };
  
  const isAuthEnabled = isModuleEnabled('auth');
  const isRbacEnabled = isModuleEnabled('rbac');
  const isAzureAdEnabled = isModuleEnabled('azure-ad');
  const isAuth0Enabled = isModuleEnabled('auth0');
  const isSamlEnabled = isModuleEnabled('saml');

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
            <TabsTrigger value="users" disabled={!isAuthEnabled}>
              Users {!isAuthEnabled && <span className="ml-1 text-xs opacity-60">(Disabled)</span>}
            </TabsTrigger>
            {isRbacEnabled && (
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
            {!isAuthEnabled ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Authentication Module Disabled</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">User Management Unavailable</h3>
                    <p className="text-slate-500 mb-4">
                      The Authentication module has been disabled by your platform administrator.
                      Contact your administrator to enable this feature.
                    </p>
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      Module Disabled
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Users</CardTitle>
                    <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-user">
                          <Plus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <UserModal 
                        title="Add New User" 
                        tenantId={tenant?.id}
                        onSuccess={() => {
                          setShowAddUserModal(false);
                          queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
                        }}
                      />
                    </Dialog>
                  </div>
                </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tenantInfo.users as any[]).length > 0 ? (tenantInfo.users as any[]).map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditUserModal(true);
                              }}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
            )}
            
            {/* Edit User Modal - Always available when auth is enabled */}
            {isAuthEnabled && (
              <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
                <UserModal 
                  title="Edit User" 
                  tenantId={tenant?.id}
                  user={selectedUser}
                  onSuccess={() => {
                    setShowEditUserModal(false);
                    setSelectedUser(null);
                    queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
                  }}
                />
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Roles & Permissions</CardTitle>
                  <Dialog open={showAddRoleModal} onOpenChange={setShowAddRoleModal}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-role">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </DialogTrigger>
                    <RoleModal 
                      title="Add New Role" 
                      tenantId={tenant?.id}
                      onSuccess={() => {
                        setShowAddRoleModal(false);
                        queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/roles`] });
                      }}
                    />
                  </Dialog>
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
                          {role.isSystem && (
                            <Badge variant="outline" className="text-xs mt-1">System Role</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowEditRoleModal(true);
                            }}
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.isSystem && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                              data-testid={`button-delete-role-${role.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            
            {/* Edit Role Modal */}
            <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
              <RoleModal 
                title="Edit Role" 
                tenantId={tenant?.id}
                role={selectedRole}
                onSuccess={() => {
                  setShowEditRoleModal(false);
                  setSelectedRole(null);
                  queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/roles`] });
                }}
              />
            </Dialog>
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

// UserModal Component
function UserModal({ 
  title, 
  tenantId, 
  user, 
  onSuccess 
}: { 
  title: string; 
  tenantId?: string; 
  user?: any; 
  onSuccess: () => void; 
}) {
  const { toast } = useToast();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      password: "",
      status: user?.status || "active"
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const url = user 
        ? `/api/tenants/${tenantId}/users/${user.id}`
        : `/api/tenants/${tenantId}/users`;
      
      const response = await fetch(url, {
        method: user ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `User ${user ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {user ? 'Update user information' : 'Add a new user to your organization.'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{user ? 'New Password (optional)' : 'Password'}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : (user ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

// RoleModal Component
function RoleModal({ 
  title, 
  tenantId, 
  role, 
  onSuccess 
}: { 
  title: string; 
  tenantId?: string; 
  role?: any; 
  onSuccess: () => void; 
}) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions || []
  );
  
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || []
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const url = role 
        ? `/api/tenants/${tenantId}/roles/${role.id}`
        : `/api/tenants/${tenantId}/roles`;
      
      const response = await fetch(url, {
        method: role ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, permissions: selectedPermissions }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Role ${role ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save role",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleFormData) => {
    if (selectedPermissions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one permission",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ ...data, permissions: selectedPermissions });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {role ? 'Update role information and permissions' : 'Create a new role with specific permissions.'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Name</FormLabel>
                <FormControl>
                  <Input placeholder="Manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Role description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <Label className="text-base font-semibold">Permissions</Label>
            <p className="text-sm text-slate-600 mb-3">Select the permissions for this role:</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={permission}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}