import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Clock,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  MoreHorizontal
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@/../../shared/schema";

export default function TenantPortalPage() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [isConfigureRbacDialogOpen, setIsConfigureRbacDialogOpen] = useState(false);
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [newUserData, setNewUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: ""
  });
  const [rbacConfig, setRbacConfig] = useState({
    permissionTemplate: "",
    businessType: ""
  });
  const [newRoleData, setNewRoleData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    isSystem: false
  });
  
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  // Fetch tenant users
  const { data: tenantUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/tenants", tenantId, "users"],
    enabled: !!tenantId,
  });

  // Fetch tenant roles
  const { data: tenantRoles = [] } = useQuery({
    queryKey: ["/api/tenants", tenantId, "roles"],
    enabled: !!tenantId,
  });

  // Fetch RBAC configuration data for display
  const { data: permissionTemplates = [] } = useQuery({
    queryKey: ['/api/rbac-config/permission-templates'],
    enabled: !!tenantId && Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac"),
  });

  const { data: businessTypes = [] } = useQuery({
    queryKey: ['/api/rbac-config/business-types'],
    enabled: !!tenantId && Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac"),
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "users"] });
      toast({ title: "User created successfully" });
      setIsAddUserDialogOpen(false);
      setNewUserData({ firstName: "", lastName: "", email: "", roleId: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch(`/api/tenants/${tenantId}/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!response.ok) throw new Error('Failed to assign role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "users"] });
      toast({ title: "Role assigned successfully" });
      setIsAssignRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error assigning role", description: error.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/tenants/${tenantId}/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    }
  });

  const updateRbacConfigMutation = useMutation({
    mutationFn: async (config: { permissionTemplate: string; businessType: string }) => {
      const response = await fetch(`/api/tenants/${tenantId}/rbac-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update RBAC configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "RBAC configuration updated successfully" });
      setIsConfigureRbacDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error updating RBAC configuration", description: error.message, variant: "destructive" });
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string; permissions: string[]; isSystem: boolean }) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "Role created successfully" });
      setIsCreateRoleDialogOpen(false);
      setNewRoleData({ name: "", description: "", permissions: [], isSystem: false });
    },
    onError: (error: any) => {
      toast({ title: "Error creating role", description: error.message, variant: "destructive" });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (roleData: { id: string; name: string; description: string; permissions: string[]; isSystem: boolean }) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles/${roleData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "users"] });
      toast({ title: "Role updated successfully" });
      setIsEditRoleDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "users"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting role", description: error.message, variant: "destructive" });
    }
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
          <TabsList className={`grid w-full ${Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") ? "grid-cols-7" : "grid-cols-5"}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            {Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") && (
              <TabsTrigger value="roles">Roles</TabsTrigger>
            )}
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            {Array.isArray(tenant?.enabledModules) && tenant.enabledModules.includes("rbac") && (
              <TabsTrigger value="rbac">RBAC Config</TabsTrigger>
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

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Users
                    </CardTitle>
                    <CardDescription>
                      Manage users and their role assignments for this tenant
                    </CardDescription>
                  </div>
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account for this tenant
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={newUserData.firstName}
                              onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                              placeholder="John"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={newUserData.lastName}
                              onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                              placeholder="Doe"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            placeholder="john.doe@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Initial Role</Label>
                          <Select
                            value={newUserData.roleId}
                            onValueChange={(value) => setNewUserData({ ...newUserData, roleId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {tenantRoles.map((role: any) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => createUserMutation.mutate(newUserData)}
                          disabled={!newUserData.firstName || !newUserData.lastName || !newUserData.email}
                        >
                          Create User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    Loading users...
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold mb-2">No users yet</h3>
                    <p className="text-slate-600 mb-4">
                      Get started by adding your first user to this tenant
                    </p>
                    <Button onClick={() => setIsAddUserDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First User
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.map((role: any) => (
                                  <Badge key={role.id} variant="outline" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-slate-500 text-sm">No roles assigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsAssignRoleDialogOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Assign Role
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Role Assignment Dialog */}
            <Dialog open={isAssignRoleDialogOpen} onOpenChange={setIsAssignRoleDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role</DialogTitle>
                  <DialogDescription>
                    Assign a role to {selectedUser?.firstName} {selectedUser?.lastName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Role</Label>
                    <Select onValueChange={(roleId) => {
                      if (selectedUser) {
                        assignRoleMutation.mutate({ userId: selectedUser.id, roleId });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantRoles.filter((role: any) => 
                          !selectedUser?.roles?.some((userRole: any) => userRole.id === role.id)
                        ).map((role: any) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div>
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-slate-600">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* RBAC Configuration Dialog */}
            <Dialog open={isConfigureRbacDialogOpen} onOpenChange={setIsConfigureRbacDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configure RBAC Settings</DialogTitle>
                  <DialogDescription>
                    Update the permission template and business type for this tenant
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div>
                    <Label htmlFor="permission-template">Permission Template</Label>
                    <Select 
                      value={rbacConfig.permissionTemplate || 'none'} 
                      onValueChange={(value) => setRbacConfig({ 
                        ...rbacConfig, 
                        permissionTemplate: value === 'none' ? '' : value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific template</SelectItem>
                        {permissionTemplates.filter((template: any) => template.isActive).map((template: any) => (
                          <SelectItem key={template.id} value={template.name.toLowerCase().replace(/\s+/g, '-')}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-slate-600">{template.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="business-type">Business Type</Label>
                    <Select 
                      value={rbacConfig.businessType || 'none'} 
                      onValueChange={(value) => setRbacConfig({ 
                        ...rbacConfig, 
                        businessType: value === 'none' ? '' : value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific business type</SelectItem>
                        {businessTypes.filter((businessType: any) => businessType.isActive).map((businessType: any) => (
                          <SelectItem key={businessType.id} value={businessType.name.toLowerCase().replace(/\s+/g, '-')}>
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div className="font-medium">{businessType.name}</div>
                                <div className="text-sm text-slate-600">{businessType.description}</div>
                              </div>
                              <span className={`ml-2 px-1 py-0.5 text-xs rounded ${
                                businessType.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                                businessType.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                businessType.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {businessType.riskLevel.toUpperCase()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Configuration Impact</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Changing these settings will update the tenant's default roles and permissions. 
                          Existing users and roles will be preserved, but new default roles based on the 
                          selected configuration will be created.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConfigureRbacDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateRbacConfigMutation.mutate(rbacConfig)}
                    disabled={updateRbacConfigMutation.isPending}
                  >
                    {updateRbacConfigMutation.isPending ? 'Updating...' : 'Update Configuration'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Role Management</CardTitle>
                    <CardDescription>
                      Manage default and custom roles for your organization
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateRoleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantRoles?.map((role: any) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-slate-900">{role.name}</h3>
                          {role.isSystem && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              Default Role
                            </span>
                          )}
                          {!role.isSystem && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Custom Role
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.permissions?.slice(0, 3).map((permission: string) => (
                            <span
                              key={permission}
                              className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                            >
                              {permission.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {role.permissions?.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded">
                              +{role.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role);
                            setNewRoleData({
                              name: role.name,
                              description: role.description,
                              permissions: role.permissions || [],
                              isSystem: role.isSystem
                            });
                            setIsEditRoleDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Create Role Dialog */}
            <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Custom Role</DialogTitle>
                  <DialogDescription>
                    Create a new role with specific permissions for your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={newRoleData.name}
                      onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                      placeholder="e.g., Senior Analyst, Department Manager"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Input
                      id="role-description"
                      value={newRoleData.description}
                      onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                      placeholder="Brief description of this role's responsibilities"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded p-3">
                      {/* Core Permissions */}
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Core Permissions</h4>
                      </div>
                      {['read_users', 'create_users', 'update_users', 'read_reports', 'create_reports', 'manage_settings'].map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`new-permission-${permission}`}
                            checked={newRoleData.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRoleData({
                                  ...newRoleData,
                                  permissions: [...newRoleData.permissions, permission]
                                });
                              } else {
                                setNewRoleData({
                                  ...newRoleData,
                                  permissions: newRoleData.permissions.filter(p => p !== permission)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`new-permission-${permission}`} className="text-sm">
                            {permission.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      ))}

                      {/* Industry-Specific Permissions - Show based on tenant's business type */}
                      {(tenant as any)?.moduleConfigs?.rbac?.businessType === 'banking' && (
                        <>
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-blue-700 mb-2">Banking Permissions</h4>
                          </div>
                          {['financial_data_access', 'transaction_processing', 'account_management', 'loan_processing', 'kyc_verification', 'aml_monitoring'].map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`new-permission-${permission}`}
                                checked={newRoleData.permissions.includes(permission)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRoleData({
                                      ...newRoleData,
                                      permissions: [...newRoleData.permissions, permission]
                                    });
                                  } else {
                                    setNewRoleData({
                                      ...newRoleData,
                                      permissions: newRoleData.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`new-permission-${permission}`} className="text-sm text-blue-700">
                                {permission.replace(/_/g, ' ')}
                              </Label>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Insurance Permissions */}
                      {(tenant as any)?.moduleConfigs?.rbac?.businessType === 'insurance' && (
                        <>
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-purple-700 mb-2">Insurance Permissions</h4>
                          </div>
                          {['policy_management', 'claims_processing', 'underwriting_access', 'actuarial_data_access', 'premium_calculation', 'risk_modeling'].map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`new-permission-${permission}`}
                                checked={newRoleData.permissions.includes(permission)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRoleData({
                                      ...newRoleData,
                                      permissions: [...newRoleData.permissions, permission]
                                    });
                                  } else {
                                    setNewRoleData({
                                      ...newRoleData,
                                      permissions: newRoleData.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`new-permission-${permission}`} className="text-sm text-purple-700">
                                {permission.replace(/_/g, ' ')}
                              </Label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createRoleMutation.mutate(newRoleData)}
                    disabled={createRoleMutation.isPending || !newRoleData.name}
                  >
                    {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Role</DialogTitle>
                  <DialogDescription>
                    Modify role permissions and details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role-name">Role Name</Label>
                    <Input
                      id="edit-role-name"
                      value={newRoleData.name}
                      onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                      disabled={newRoleData.isSystem}
                      placeholder="Role name"
                    />
                    {newRoleData.isSystem && (
                      <p className="text-xs text-slate-500">Default role names cannot be modified</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-role-description">Description</Label>
                    <Input
                      id="edit-role-description"
                      value={newRoleData.description}
                      onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                      placeholder="Role description"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded p-3">
                      {/* Same permission checkboxes as create dialog */}
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Core Permissions</h4>
                      </div>
                      {['read_users', 'create_users', 'update_users', 'read_reports', 'create_reports', 'manage_settings', 'manage_roles'].map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-permission-${permission}`}
                            checked={newRoleData.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRoleData({
                                  ...newRoleData,
                                  permissions: [...newRoleData.permissions, permission]
                                });
                              } else {
                                setNewRoleData({
                                  ...newRoleData,
                                  permissions: newRoleData.permissions.filter(p => p !== permission)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`edit-permission-${permission}`} className="text-sm">
                            {permission.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => selectedRole && updateRoleMutation.mutate({
                      id: selectedRole.id,
                      ...newRoleData
                    })}
                    disabled={updateRoleMutation.isPending || !newRoleData.name}
                  >
                    {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                            <span className="font-medium text-blue-700">
                              {(() => {
                                const configuredTemplate = (tenant as any)?.moduleConfigs?.rbac?.permissionTemplate;
                                if (configuredTemplate) {
                                  const template = permissionTemplates.find((t: any) => 
                                    t.name.toLowerCase().replace(/\s+/g, '-') === configuredTemplate
                                  );
                                  return template?.name || configuredTemplate;
                                }
                                return permissionTemplates.find((t: any) => t.isDefault)?.name || 'Standard';
                              })()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {(() => {
                              const configuredTemplate = (tenant as any)?.moduleConfigs?.rbac?.permissionTemplate;
                              if (configuredTemplate) {
                                const template = permissionTemplates.find((t: any) => 
                                  t.name.toLowerCase().replace(/\s+/g, '-') === configuredTemplate
                                );
                                return template?.description || 'Custom permission template configuration';
                              }
                              const defaultTemplate = permissionTemplates.find((t: any) => t.isDefault);
                              return defaultTemplate?.description || 'Basic permission set with core user management and role assignment capabilities';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Business Type</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-700">
                              {(() => {
                                const configuredBusinessType = (tenant as any)?.moduleConfigs?.rbac?.businessType;
                                if (configuredBusinessType) {
                                  const businessType = businessTypes.find((bt: any) => 
                                    bt.name.toLowerCase().replace(/\s+/g, '-') === configuredBusinessType
                                  );
                                  return businessType?.name || configuredBusinessType;
                                }
                                return businessTypes.find((bt: any) => bt.name.toLowerCase() === 'general')?.name || 'General';
                              })()}
                            </span>
                            {(() => {
                              const configuredBusinessType = (tenant as any)?.moduleConfigs?.rbac?.businessType;
                              let businessType;
                              if (configuredBusinessType) {
                                businessType = businessTypes.find((bt: any) => 
                                  bt.name.toLowerCase().replace(/\s+/g, '-') === configuredBusinessType
                                );
                              } else {
                                businessType = businessTypes.find((bt: any) => bt.name.toLowerCase() === 'general');
                              }
                              if (businessType) {
                                return (
                                  <span className={`ml-2 px-1 py-0.5 text-xs rounded ${
                                    businessType.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                                    businessType.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    businessType.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {businessType.riskLevel.toUpperCase()}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {(() => {
                              const configuredBusinessType = (tenant as any)?.moduleConfigs?.rbac?.businessType;
                              if (configuredBusinessType) {
                                const businessType = businessTypes.find((bt: any) => 
                                  bt.name.toLowerCase().replace(/\s+/g, '-') === configuredBusinessType
                                );
                                return businessType?.description || 'Custom business type configuration';
                              }
                              const defaultBusinessType = businessTypes.find((bt: any) => bt.name.toLowerCase() === 'general');
                              return defaultBusinessType?.description || 'Standard business operations with Admin, Manager, and User roles';
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Available Configuration Options</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-600">Available Templates</label>
                            <div className="mt-1 space-y-1">
                              {permissionTemplates.filter((t: any) => t.isActive).map((template: any) => (
                                <div key={template.id} className="text-xs bg-blue-50 p-2 rounded flex items-center justify-between">
                                  <span className="font-medium">{template.name}</span>
                                  {template.isDefault && <span className="text-blue-600 text-xs">Default</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600">Available Business Types</label>
                            <div className="mt-1 space-y-1">
                              {businessTypes.filter((bt: any) => bt.isActive).map((businessType: any) => (
                                <div key={businessType.id} className="text-xs bg-green-50 p-2 rounded flex items-center justify-between">
                                  <span className="font-medium">{businessType.name}</span>
                                  <span className={`px-1 py-0.5 text-xs rounded ${
                                    businessType.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                                    businessType.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    businessType.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {businessType.riskLevel.toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
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
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const currentConfig = (tenant as any)?.moduleConfigs?.rbac;
                            setRbacConfig({
                              permissionTemplate: currentConfig?.permissionTemplate || '',
                              businessType: currentConfig?.businessType || ''
                            });
                            setIsConfigureRbacDialogOpen(true);
                          }}
                        >
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