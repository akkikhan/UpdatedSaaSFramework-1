import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, Shield, Key, Settings, Copy, Eye, EyeOff, Plus, Edit, Trash2, 
  Database, Server, Cloud, Activity, FileText, LogOut, AlertCircle,
  CheckCircle, XCircle, Cog, Power, PowerOff, ExternalLink, UserCheck
} from "lucide-react";
import { useTenantAuth } from "@/hooks/use-tenant-auth";
import { useToast } from "@/hooks/use-toast";

// Form schemas (keep existing ones)
const userFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

type UserFormData = z.infer<typeof userFormSchema>;
type RoleFormData = z.infer<typeof roleFormSchema>;

const AVAILABLE_PERMISSIONS = [
  "users.read", "users.create", "users.update", "users.delete",
  "roles.read", "roles.create", "roles.update", "roles.delete",
  "reports.read", "reports.create", "reports.export",
  "settings.read", "settings.update", "admin.full_access",
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

  // Helper to get auth headers for tenant-scoped routes
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
    return {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenant?.id || "",
      "Content-Type": "application/json",
    } as Record<string, string>;
  };

  // Get tenant data from API
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/by-org-id/${orgId}`],
    enabled: !!orgId,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  }) as { data: any };

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ["/auth/users", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const res = await fetch(`/auth/users`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenant?.id || "" },
      });
      if (!res.ok) throw new Error("Failed to get users");
      return res.json();
    },
  }) as { data: any[] };

  const { data: tenantRoles = [] } = useQuery({
    queryKey: ["/api/v2/rbac/roles", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const res = await fetch(`/api/v2/rbac/roles`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenant?.id || "" },
      });
      if (!res.ok) throw new Error("Failed to get roles");
      return res.json();
    },
  }) as { data: any[] };

  // CRUD mutations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/auth/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/auth/users", tenant?.id] });
      toast({ title: "Success", description: "User deleted successfully" });
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
      const response = await fetch(`/api/v2/rbac/roles/${roleId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/rbac/roles", tenant?.id] });
      toast({ title: "Success", description: "Role deleted successfully" });
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
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
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
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">Please log in to access the tenant portal</p>
          <Button onClick={() => (window.location.href = `/tenant/${orgId}/login`)} className="w-full">
            Go to Login
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
    name: tenant.name || "Unknown",
    status: tenant.status || "unknown",
    authApiKey: tenant.authApiKey || "",
    rbacApiKey: tenant.rbacApiKey || "",
    loggingApiKey: tenant.loggingApiKey || "",
    enabledModules: (tenant.enabledModules as string[]) || ["auth", "rbac"],
    moduleConfigs: tenant.moduleConfigs || {},
    users: tenantUsers || [],
    roles: tenantRoles || [],
  };

  const isModuleEnabled = (moduleName: string) => {
    return tenantInfo.enabledModules.includes(moduleName);
  };

  const isAuthEnabled = isModuleEnabled("auth");
  const isRbacEnabled = isModuleEnabled("rbac");
  const isLoggingEnabled = isModuleEnabled("logging");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {tenantInfo.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">{tenantInfo.name}</h1>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-slate-500">Tenant Portal</p>
                  <Badge variant={tenantInfo.status === "active" ? "default" : "secondary"}>
                    {tenantInfo.status.charAt(0).toUpperCase() + tenantInfo.status.slice(1)}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-500">Live</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{user.email}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="modules">
              <Settings className="w-4 h-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="authentication">
              <Shield className="w-4 h-4 mr-2" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="users" disabled={!isAuthEnabled}>
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" disabled={!isRbacEnabled}>
              <Key className="w-4 h-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Database className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantInfo.users.length}</div>
                  <p className="text-xs text-slate-600">Active users</p>
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
                  <p className="text-xs text-slate-600">{tenantInfo.enabledModules.join(", ")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                  <Activity className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.2K</div>
                  <p className="text-xs text-slate-600">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-20 flex flex-col items-center justify-center space-y-2">
                    <Settings className="w-6 h-6" />
                    <span>Configure Modules</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2" disabled={!isAuthEnabled}>
                    <Users className="w-6 h-6" />
                    <span>Manage Users</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                    <FileText className="w-6 h-6" />
                    <span>View Logs</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Module Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: "auth", name: "Authentication", description: "Core user authentication", required: true, icon: Shield },
                    { id: "rbac", name: "RBAC", description: "Role-based access control", required: true, icon: Users },
                    { id: "logging", name: "Logging", description: "Application logging", required: false, icon: FileText },
                    { id: "azure-ad", name: "Azure AD", description: "Azure Active Directory SSO", required: false, icon: Cloud },
                  ].map(module => {
                    const isEnabled = tenantInfo.enabledModules.includes(module.id);
                    const Icon = module.icon;
                    
                    return (
                      <Card key={module.id} className={`${isEnabled ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isEnabled ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{module.name}</CardTitle>
                                {module.required && (
                                  <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                                )}
                              </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-slate-600">{module.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant={isEnabled ? "default" : "secondary"}>
                              {isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <div className="flex space-x-2">
                              {!module.required && (
                                <Button size="sm" variant="outline">
                                  {isEnabled ? "Disable" : "Enable"}
                                </Button>
                              )}
                              {isEnabled && (
                                <Button size="sm">
                                  <Cog className="w-4 h-4 mr-1" />
                                  Configure
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Default Provider</Label>
                    <Select defaultValue="local">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="azure-ad">Azure AD</SelectItem>
                        <SelectItem value="local">Local (JWT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session Timeout</Label>
                    <Select defaultValue="24h">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logging Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Log Levels</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['error', 'warning', 'info', 'debug'].map(level => (
                        <Badge key={level} variant="secondary" className="cursor-pointer">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Retention Period</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="90">90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
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
                    </p>
                    <Badge variant="outline" className="text-red-600 border-red-200">Module Disabled</Badge>
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
                          queryClient.invalidateQueries({ queryKey: ["/auth/users", tenant?.id] });
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
                      {tenantInfo.users.length > 0 ? (
                        tenantInfo.users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.status === "active" ? "default" : "secondary"}>
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
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
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
          </TabsContent>

          {/* Roles Tab */}
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
                      availablePermissions={AVAILABLE_PERMISSIONS}
                      onSuccess={() => {
                        setShowAddRoleModal(false);
                        queryClient.invalidateQueries({ queryKey: ["/api/v2/rbac/roles", tenant?.id] });
                      }}
                    />
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenantInfo.roles.length > 0 ? (
                  tenantInfo.roles.map((role: any) => (
                    <Card key={role.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{role.name}</CardTitle>
                            <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role);
                                setShowEditRoleModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions?.map((permission: string) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No custom roles found. Default system roles are used.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
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
                {[
                  { title: "Authentication API Key", key: tenantInfo.authApiKey, icon: Shield },
                  { title: "RBAC API Key", key: tenantInfo.rbacApiKey, icon: Users },
                  { title: "Logging API Key", key: tenantInfo.loggingApiKey, icon: FileText },
                ].map(({ title, key, icon: Icon }) => (
                  <Card key={title}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                          {showApiKeys ? key : "•".repeat(32)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key, title)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Modal Components
function UserModal({ title, tenantId, user, onSuccess }: {
  title: string;
  tenantId?: string;
  user?: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { orgId } = useParams();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      password: "",
      status: user?.status || "active",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const token = localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const url = user ? `/auth/users/${user.id}` : `/auth/users`;
      const response = await fetch(url, {
        method: user ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId || "",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save user");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: `User ${user ? "updated" : "created"} successfully` });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save user", variant: "destructive" });
    },
  });

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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
                <FormLabel>{user ? "New Password (optional)" : "Password"}</FormLabel>
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
                      <SelectValue />
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
              {mutation.isPending ? "Saving..." : user ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function RoleModal({ title, tenantId, role, availablePermissions, onSuccess }: {
  title: string;
  tenantId?: string;
  role?: any;
  availablePermissions?: string[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { orgId } = useParams();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || []);
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const token = localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const url = role ? `/api/v2/rbac/roles/${role.id}` : `/api/v2/rbac/roles`;
      const response = await fetch(url, {
        method: role ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId || "",
        },
        body: JSON.stringify({ ...data, permissions: selectedPermissions }),
      });
      if (!response.ok) throw new Error("Failed to save role");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: `Role ${role ? "updated" : "created"} successfully` });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save role", variant: "destructive" });
    },
  });

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => {
          if (selectedPermissions.length === 0) {
            toast({ title: "Error", description: "Please select at least one permission", variant: "destructive" });
            return;
          }
          mutation.mutate({ ...data, permissions: selectedPermissions });
        })} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 mt-2">
              {(availablePermissions || AVAILABLE_PERMISSIONS).map(permission => (
                <div key={permission} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={permission} className="text-sm font-medium">
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : role ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
