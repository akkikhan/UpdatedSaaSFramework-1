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
  CheckCircle, XCircle, Cog, Power, PowerOff, ExternalLink, UserCheck,
  BarChart3, TrendingUp, Calendar, Bell, Search, Filter, Download,
  RefreshCw, MoreVertical, Home, BookOpen, Mail, Menu
} from "lucide-react";
import { useTenantAuth } from "@/hooks/use-tenant-auth";
import { useToast } from "@/hooks/use-toast";

// Form schemas
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
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = `/tenant/${orgId}/login`;
  };

  // Add navigation click handler
  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false); // Close mobile menu when navigating
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
      <div className="dashboard-container flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Access Denied</h2>
          <p className="text-slate-600 mb-8 text-lg">Please log in to access the tenant portal</p>
          <Button 
            onClick={() => (window.location.href = `/tenant/${orgId}/login`)} 
            className="btn-primary px-8 py-3 text-lg rounded-xl"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="dashboard-container flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading Portal...</h2>
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
    <div className="dashboard-container">
      {/* Mobile Menu Overlay */}
      <div 
        className={`qerza-mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* QERZA Sidebar Navigation */}
      <div className={`qerza-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="qerza-sidebar-header">
          <div className="qerza-sidebar-logo">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {tenantInfo.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-qerza-primary">QERZA</h2>
              <p className="text-xs text-qerza-secondary">Tenant Portal</p>
            </div>
          </div>
        </div>
        
        <nav className="qerza-sidebar-nav">
          <div className="space-y-1">
            <div 
              className={`qerza-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleNavigation('overview')}
              style={{ cursor: 'pointer' }}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'modules' ? 'active' : ''}`}
              onClick={() => handleNavigation('modules')}
              style={{ cursor: 'pointer' }}
            >
              <Settings className="w-5 h-5" />
              <span>Modules</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'authentication' ? 'active' : ''}`}
              onClick={() => handleNavigation('authentication')}
              style={{ cursor: 'pointer' }}
            >
              <Shield className="w-5 h-5" />
              <span>Authentication</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => handleNavigation('logs')}
              style={{ cursor: 'pointer' }}
            >
              <FileText className="w-5 h-5" />
              <span>Logs</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'users' ? 'active' : ''} ${!isAuthEnabled ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => isAuthEnabled && handleNavigation('users')}
              style={{ cursor: isAuthEnabled ? 'pointer' : 'not-allowed' }}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'roles' ? 'active' : ''} ${!isRbacEnabled ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => isRbacEnabled && handleNavigation('roles')}
              style={{ cursor: isRbacEnabled ? 'pointer' : 'not-allowed' }}
            >
              <Key className="w-5 h-5" />
              <span>Roles</span>
            </div>
            <div 
              className={`qerza-nav-item ${activeTab === 'api-keys' ? 'active' : ''}`}
              onClick={() => handleNavigation('api-keys')}
              style={{ cursor: 'pointer' }}
            >
              <Database className="w-5 h-5" />
              <span>API Keys</span>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer - User Profile */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="qerza-card p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.email.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-qerza-primary truncate">{user.email}</p>
                <p className="text-xs text-qerza-secondary">Administrator</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              data-testid="button-logout"
              className="w-full qerza-btn-secondary text-sm"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* QERZA Main Content */}
      <div className="qerza-main-content">
        {/* Mobile Header */}
        <div className="qerza-mobile-header lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleMobileMenu}
              className="qerza-mobile-menu-btn"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {tenantInfo.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-qerza-primary">{tenantInfo.name}</h1>
              </div>
            </div>
            <div className="w-8 h-8" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* QERZA Header - Desktop */}
        <div className="qerza-card mx-6 mt-6 mb-6 hidden lg:block">
          <div className="qerza-card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="qerza-profile-avatar">
                  {tenantInfo.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-qerza-primary">{tenantInfo.name}</h1>
                    <Badge 
                      className={`qerza-badge ${
                        tenantInfo.status === "active" 
                          ? "qerza-badge-success" 
                          : "qerza-badge-error"
                      }`}
                    >
                      {tenantInfo.status.charAt(0).toUpperCase() + tenantInfo.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-qerza-secondary font-medium">Tenant Management Portal</p>
                    <div className="flex items-center space-x-2">
                      <div className="qerza-status-dot qerza-status-online"></div>
                      <span className="text-sm text-qerza-secondary font-medium">Live</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <Button variant="outline" size="sm" className="qerza-btn-secondary">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="sm" className="qerza-btn-secondary">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="qerza-btn-secondary">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* QERZA Content Area */}
        <div className="px-6 pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
            <div style={{ display: 'none' }}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="modules">Modules</TabsTrigger>
                <TabsTrigger value="authentication">Authentication</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="users" disabled={!isAuthEnabled}>Users</TabsTrigger>
                <TabsTrigger value="roles" disabled={!isRbacEnabled}>Roles</TabsTrigger>
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              </TabsList>
            </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="stat-card stat-card-green">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-bold text-white">Total Users</CardTitle>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-3xl font-bold text-white mb-1">{tenantInfo.users.length}</div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-white/80" />


            {/* Users Tab */}
            <TabsContent value="users">
              {!isAuthEnabled ? (
                <div className="qerza-card">
                  <div className="qerza-card-header">
                    <div className="qerza-card-title">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mr-4">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      Authentication Module Disabled
                    </div>
                  </div>
                  <div className="qerza-card-content">
                    <div className="qerza-empty-state">
                      <div className="qerza-empty-icon">
                        <Users className="h-10 w-10" />
                      </div>
                      <h3 className="qerza-empty-title">User Management Unavailable</h3>
                      <p className="qerza-empty-description">
                        The Authentication module has been disabled by your platform administrator.
                      </p>
                      <Badge className="qerza-badge qerza-badge-error mt-4 px-4 py-2">
                        Module Disabled
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="qerza-card">
                  <div className="qerza-card-header">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="qerza-card-title">
                          <Users className="w-6 h-6 mr-3 text-blue-600" />
                          User Management
                        </div>
                        <div className="qerza-card-description">
                          Manage tenant users and their access permissions
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button variant="outline" className="qerza-btn-secondary">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                          <DialogTrigger asChild>
                            <Button data-testid="button-add-user" className="qerza-btn-primary">
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
                    </div>
                  </div>
                  <div className="qerza-card-content">
                    <div className="overflow-x-auto">
                      <table className="qerza-table">
                        <thead className="qerza-table-header">
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenantInfo.users.length > 0 ? (
                            tenantInfo.users.map((user: any) => (
                              <tr key={user.id} className="qerza-table-row">
                                <td className="qerza-table-cell">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-sm font-bold">
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                      </span>
                                    </div>
                                    <span className="font-semibold text-qerza-primary">{user.firstName} {user.lastName}</span>
                                  </div>
                                </td>
                                <td className="qerza-table-cell font-medium">{user.email}</td>
                                <td className="qerza-table-cell">
                                  <Badge className={`qerza-badge ${
                                    user.status === "active" ? "qerza-badge-success" : "qerza-badge-error"
                                  }`}>
                                    {user.status}
                                  </Badge>
                                </td>
                                <td className="qerza-table-cell font-medium">
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="qerza-table-cell text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowEditUserModal(true);
                                      }}
                                      className="qerza-btn-ghost hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="qerza-btn-ghost hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="qerza-table-cell">
                                <div className="qerza-empty-state">
                                  <div className="qerza-empty-icon">
                                    <Users className="h-8 w-8" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-qerza-primary mb-2">No users found</h3>
                                  <p className="text-qerza-secondary">Add users to get started with your tenant portal.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Edit User Modal */}
              {showEditUserModal && selectedUser && (
                <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
                  <UserModal
                    title="Edit User"
                    tenantId={tenant?.id}
                    user={selectedUser}
                    onSuccess={() => {
                      setShowEditUserModal(false);
                      setSelectedUser(null);
                      queryClient.invalidateQueries({ queryKey: ["/auth/users", tenant?.id] });
                    }}
                  />
                </Dialog>
              )}
            </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles">
              <div className="qerza-card">
                <div className="qerza-card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="qerza-card-title">
                        <Key className="w-6 h-6 mr-3 text-purple-600" />
                        Roles & Permissions
                      </div>
                      <div className="qerza-card-description">
                        Define roles and manage access permissions
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button variant="outline" className="qerza-btn-secondary">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Dialog open={showAddRoleModal} onOpenChange={setShowAddRoleModal}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-role" className="qerza-btn-primary">
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
                  </div>
                </div>
                <div className="qerza-card-content space-y-6">
                  {tenantInfo.roles.length > 0 ? (
                    tenantInfo.roles.map((role: any) => (
                      <div key={role.id} className="qerza-card border-l-4 border-purple-500">
                        <div className="qerza-card-header">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                                <Key className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-qerza-primary">{role.name}</h3>
                                <p className="text-qerza-secondary font-medium mt-1">{role.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRole(role);
                                  setShowEditRoleModal(true);
                                }}
                                className="qerza-btn-ghost hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRole(role.id)}
                                className="qerza-btn-ghost hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="qerza-card-content pt-0">
                          <div>
                            <h4 className="text-sm font-semibold text-qerza-primary mb-3">Permissions</h4>
                            <div className="flex flex-wrap gap-2">
                              {role.permissions?.map((permission: string) => (
                                <Badge 
                                  key={permission} 
                                  className="qerza-badge qerza-badge-info px-3 py-1"
                                >
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="qerza-empty-state">
                      <div className="qerza-empty-icon">
                        <Key className="h-10 w-10" />
                      </div>
                      <h3 className="qerza-empty-title">No Custom Roles</h3>
                      <p className="qerza-empty-description">
                        Default system roles are currently being used. Create custom roles to define specific permissions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Edit Role Modal */}
              {showEditRoleModal && selectedRole && (
                <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
                  <RoleModal
                    title="Edit Role"
                    tenantId={tenant?.id}
                    role={selectedRole}
                    availablePermissions={AVAILABLE_PERMISSIONS}
                    onSuccess={() => {
                      setShowEditRoleModal(false);
                      setSelectedRole(null);
                      queryClient.invalidateQueries({ queryKey: ["/api/v2/rbac/roles", tenant?.id] });
                    }}
                  />
                </Dialog>
              )}
            </TabsContent>

            {/* Modules Tab */}
            <TabsContent value="modules" className="space-y-6">
              <div className="qerza-card">
                <div className="qerza-card-header">
                  <div className="qerza-card-title">
                    <Cog className="w-6 h-6 mr-3 text-purple-600" />
                    Module Management
                  </div>
                  <div className="qerza-card-description">
                    Enable and configure system modules for your tenant
                  </div>
                </div>
                <div className="qerza-card-content">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { 
                        id: "auth", 
                        name: "Authentication", 
                        description: "Core user authentication and session management", 
                        required: true, 
                        icon: Shield,
                        color: "blue"
                      },
                      { 
                        id: "rbac", 
                        name: "RBAC", 
                        description: "Role-based access control and permissions", 
                        required: true, 
                        icon: Users,
                        color: "green"
                      },
                      { 
                        id: "logging", 
                        name: "Logging", 
                        description: "Application activity logging and monitoring", 
                        required: false, 
                        icon: FileText,
                        color: "orange"
                      },
                      { 
                        id: "azure-ad", 
                        name: "Azure AD", 
                        description: "Azure Active Directory integration and SSO", 
                        required: false, 
                        icon: Cloud,
                        color: "purple"
                      },
                    ].map(module => {
                      const isEnabled = tenantInfo.enabledModules.includes(module.id);
                      const Icon = module.icon;
                      
                      return (
                        <div key={module.id} className={`qerza-module-card ${isEnabled ? 'enabled' : 'disabled'}`}>
                          <div className="qerza-module-header">
                            <div className="flex items-center space-x-4">
                              <div className={`qerza-module-icon ${isEnabled ? 'enabled' : 'disabled'}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-qerza-primary">{module.name}</h3>
                                {module.required && (
                                  <Badge className="qerza-badge qerza-badge-warning text-xs mt-1">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className={`qerza-module-status ${isEnabled ? 'enabled' : 'disabled'}`}></div>
                          </div>
                          <div className="space-y-4">
                            <p className="text-qerza-secondary leading-relaxed">{module.description}</p>
                            <div className="flex items-center justify-between pt-2">
                              <Badge className={`qerza-badge ${
                                isEnabled ? "qerza-badge-success" : "qerza-badge-error"
                              }`}>
                                {isEnabled ? "Enabled" : "Disabled"}
                              </Badge>
                              <div className="flex space-x-2">
                                {!module.required && (
                                  <Button size="sm" variant="outline" className="qerza-btn-secondary text-sm">
                                    {isEnabled ? "Disable" : "Enable"}
                                  </Button>
                                )}
                                {isEnabled && (
                                  <Button size="sm" className="qerza-btn-primary text-sm">
                                    <Cog className="w-4 h-4 mr-2" />
                                    Configure
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="space-y-6">
              <div className="qerza-card">
                <div className="qerza-card-header">
                  <div className="qerza-card-title">
                    <Shield className="w-6 h-6 mr-3 text-blue-600" />
                    Authentication Settings
                  </div>
                  <div className="qerza-card-description">
                    Configure authentication providers and security settings
                  </div>
                </div>
                <div className="qerza-card-content space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="qerza-label">Default Provider</Label>
                      <Select defaultValue="local">
                        <SelectTrigger className="qerza-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="azure-ad">Azure AD</SelectItem>
                          <SelectItem value="local">Local (JWT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="qerza-label">Session Timeout</Label>
                      <Select defaultValue="24h">
                        <SelectTrigger className="qerza-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">1 Hour</SelectItem>
                          <SelectItem value="8h">8 Hours</SelectItem>
                          <SelectItem value="24h">24 Hours</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-qerza-primary mb-4">Security Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="qerza-card p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-qerza-primary">Two-Factor Authentication</h4>
                            <p className="text-sm text-qerza-secondary">Enhanced account security</p>
                          </div>
                          <Badge className="qerza-badge qerza-badge-success">Active</Badge>
                        </div>
                      </div>
                      <div className="qerza-card p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-qerza-primary">Password Strength</h4>
                            <p className="text-sm text-qerza-secondary">Enforced complexity rules</p>
                          </div>
                          <Badge className="qerza-badge qerza-badge-success">High</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <div className="qerza-card">
                <div className="qerza-card-header">
                  <div className="qerza-card-title">
                    <FileText className="w-6 h-6 mr-3 text-orange-600" />
                    Logging Configuration
                  </div>
                  <div className="qerza-card-description">
                    Configure system logging and monitoring settings
                  </div>
                </div>
                <div className="qerza-card-content">
                  <div className="space-y-6">
                    <div>
                      <Label className="qerza-label mb-3">Log Levels</Label>
                      <div className="flex flex-wrap gap-3">
                        {['error', 'warning', 'info', 'debug'].map(level => (
                          <Badge 
                            key={level} 
                            className="qerza-badge qerza-badge-purple cursor-pointer hover:bg-purple-200 transition-all duration-200 px-3 py-2"
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="qerza-label">Retention Period</Label>
                        <Select defaultValue="30">
                          <SelectTrigger className="qerza-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                            <SelectItem value="90">90 Days</SelectItem>
                            <SelectItem value="365">1 Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="qerza-label">Export Format</Label>
                        <Select defaultValue="json">
                          <SelectTrigger className="qerza-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="xml">XML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Log Statistics */}
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-bold text-qerza-primary mb-4">Recent Activity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="qerza-card text-center p-4 border-l-4 border-red-500">
                          <div className="text-2xl font-bold text-red-700">12</div>
                          <div className="text-sm text-red-600 font-medium">Errors</div>
                        </div>
                        <div className="qerza-card text-center p-4 border-l-4 border-amber-500">
                          <div className="text-2xl font-bold text-amber-700">45</div>
                          <div className="text-sm text-amber-600 font-medium">Warnings</div>
                        </div>
                        <div className="qerza-card text-center p-4 border-l-4 border-blue-500">
                          <div className="text-2xl font-bold text-blue-700">1.2K</div>
                          <div className="text-sm text-blue-600 font-medium">Info</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
                        <p className="text-sm text-slate-600">Enforced complexity rules</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border border-green-200">High</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="modern-card">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-slate-800 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-orange-600" />
                  Logging Configuration
                </CardTitle>
                <p className="text-slate-600">Configure system logging and monitoring settings</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Log Levels</Label>
                    <div className="flex flex-wrap gap-3">
                      {['error', 'warning', 'info', 'debug'].map(level => (
                        <Badge 
                          key={level} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-purple-100 hover:text-purple-800 hover:border-purple-200 transition-all duration-200 px-3 py-2 font-semibold"
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Retention Period</Label>
                      <Select defaultValue="30">
                        <SelectTrigger className="modern-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="90">90 Days</SelectItem>
                          <SelectItem value="365">1 Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Export Format</Label>
                      <Select defaultValue="json">
                        <SelectTrigger className="modern-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Log Statistics */}
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-200">
                        <div className="text-2xl font-bold text-red-700">12</div>
                        <div className="text-sm text-red-600 font-medium">Errors</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">45</div>
                        <div className="text-sm text-amber-600 font-medium">Warnings</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">1.2K</div>
                        <div className="text-sm text-blue-600 font-medium">Info</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <Card className="modern-card">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-800 flex items-center">
                      <Database className="w-6 h-6 mr-3 text-green-600" />
                      API Keys Management
                    </CardTitle>
                    <p className="text-slate-600 mt-1">Secure API keys for different system modules</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKeys(!showApiKeys)}
                    data-testid="button-toggle-api-keys"
                    className="btn-secondary"
                  >
                    {showApiKeys ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showApiKeys ? "Hide Keys" : "Show Keys"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { 
                    title: "Authentication API Key", 
                    key: tenantInfo.authApiKey, 
                    icon: Shield,
                    color: "blue",
                    description: "Used for user authentication and session management"
                  },
                  { 
                    title: "RBAC API Key", 
                    key: tenantInfo.rbacApiKey, 
                    icon: Users,
                    color: "purple", 
                    description: "Used for role-based access control operations"
                  },
                  { 
                    title: "Logging API Key", 
                    key: tenantInfo.loggingApiKey, 
                    icon: FileText,
                    color: "orange",
                    description: "Used for logging and monitoring services"
                  },
                ].map(({ title, key, icon: Icon, color, description }) => (
                  <Card key={title} className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                          color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                          color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                          'bg-gradient-to-br from-orange-500 to-orange-600'
                        }`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">{description}</p>
                        </div>
                        <Badge className={`${
                          color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          color === 'purple' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-orange-100 text-orange-800 border border-orange-200'
                        } font-semibold`}>
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-3">
                        <code className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-sm font-mono border border-slate-200">
                          {showApiKeys ? key : "•".repeat(48)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key, title)}
                          className="hover:bg-slate-100 p-3"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-slate-100 p-3"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* API Usage Statistics */}
                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">API Usage Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200">
                      <div className="text-2xl font-bold text-green-700">1,247</div>
                      <div className="text-sm text-green-600 font-medium">Total Requests</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">99.8%</div>
                      <div className="text-sm text-blue-600 font-medium">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200">
                      <div className="text-2xl font-bold text-purple-700">125ms</div>
                      <div className="text-sm text-purple-600 font-medium">Avg Response</div>
                    </div>
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

// =============================================================================
// MODAL COMPONENTS - CLEAN VERSION (NO DUPLICATES)
// =============================================================================

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
      toast({ 
        title: "Success", 
        description: `User ${user ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save user", 
        variant: "destructive" 
      });
    },
  });

  return (
    <DialogContent className="qerza-modal sm:max-w-[500px]">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {user ? "Update user information and permissions" : "Add a new user to your tenant"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="qerza-label">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="qerza-input" />
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
                    <FormLabel className="qerza-label">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">{user ? "New Password (optional)" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="qerza-select">
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
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  user ? "Update User" : "Create User"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
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
      toast({ 
        title: "Success", 
        description: `Role ${role ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save role", 
        variant: "destructive" 
      });
    },
  });

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  return (
    <DialogContent className="qerza-modal sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Key className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {role ? "Update role information and permissions" : "Create a new role with specific permissions"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            if (selectedPermissions.length === 0) {
              toast({ title: "Error", description: "Please select at least one permission", variant: "destructive" });
              return;
            }
            mutation.mutate({ ...data, permissions: selectedPermissions });
          })} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="qerza-label">Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Role description..." {...field} className="qerza-textarea" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label className="qerza-label mb-4">Permissions</Label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto bg-gray-50 border rounded-xl p-4">
                {(availablePermissions || AVAILABLE_PERMISSIONS).map(permission => (
                  <div key={permission} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor={permission} className="text-sm font-medium text-qerza-primary cursor-pointer">
                      {permission}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-qerza-secondary">
                {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  role ? "Update Role" : "Create Role"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DialogContent>
  );
}
="text-2xl font-bold text-blue-700">99.8%</div>
                        <div className="text-sm text-blue-600 font-medium">Success Rate</div>
                      </div>
                      <div className="qerza-card text-center p-4 border-l-4 border-purple-500">
                        <div className="text-2xl font-bold text-purple-700">125ms</div>
                        <div className="text-sm text-purple-600 font-medium">Avg Response</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MODAL COMPONENTS - CLEAN VERSION (NO DUPLICATES)
// =============================================================================

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
      toast({ 
        title: "Success", 
        description: `User ${user ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save user", 
        variant: "destructive" 
      });
    },
  });

  return (
    <DialogContent className="qerza-modal sm:max-w-[500px]">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {user ? "Update user information and permissions" : "Add a new user to your tenant"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="qerza-label">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="qerza-input" />
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
                    <FormLabel className="qerza-label">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">{user ? "New Password (optional)" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="qerza-select">
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
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  user ? "Update User" : "Create User"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
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
      toast({ 
        title: "Success", 
        description: `Role ${role ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save role", 
        variant: "destructive" 
      });
    },
  });

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  return (
    <DialogContent className="qerza-modal sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Key className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {role ? "Update role information and permissions" : "Create a new role with specific permissions"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            if (selectedPermissions.length === 0) {
              toast({ title: "Error", description: "Please select at least one permission", variant: "destructive" });
              return;
            }
            mutation.mutate({ ...data, permissions: selectedPermissions });
          })} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="qerza-label">Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Role description..." {...field} className="qerza-textarea" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label className="qerza-label mb-4">Permissions</Label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto bg-gray-50 border rounded-xl p-4">
                {(availablePermissions || AVAILABLE_PERMISSIONS).map(permission => (
                  <div key={permission} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor={permission} className="text-sm font-medium text-qerza-primary cursor-pointer">
                      {permission}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-qerza-secondary">
                {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  role ? "Update Role" : "Create Role"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DialogContent>
  );
}
-4 border-l-4 border-red-500">
                          <div className="text-2xl font-bold text-red-700">12</div>
                          <div className="text-sm text-red-600 font-medium">Errors</div>
                        </div>
                        <div className="qerza-card text-center p-4 border-l-4 border-amber-500">
                          <div className="text-2xl font-bold text-amber-700">45</div>
                          <div className="text-sm text-amber-600 font-medium">Warnings</div>
                        </div>
                        <div className="qerza-card text-center p-4 border-l-4 border-blue-500">
                          <div className="text-2xl font-bold text-blue-700">1.2K</div>
                          <div className="text-sm text-blue-600 font-medium">Info</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys">
              <div className="qerza-card">
                <div className="qerza-card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="qerza-card-title">
                        <Database className="w-6 h-6 mr-3 text-green-600" />
                        API Keys Management
                      </div>
                      <div className="qerza-card-description">
                        Secure API keys for different system modules
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                      data-testid="button-toggle-api-keys"
                      className="qerza-btn-secondary"
                    >
                      {showApiKeys ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showApiKeys ? "Hide Keys" : "Show Keys"}
                    </Button>
                  </div>
                </div>
                <div className="qerza-card-content space-y-6">
                  {[
                    { 
                      title: "Authentication API Key", 
                      key: tenantInfo.authApiKey, 
                      icon: Shield,
                      color: "blue",
                      description: "Used for user authentication and session management"
                    },
                    { 
                      title: "RBAC API Key", 
                      key: tenantInfo.rbacApiKey, 
                      icon: Users,
                      color: "purple", 
                      description: "Used for role-based access control operations"
                    },
                    { 
                      title: "Logging API Key", 
                      key: tenantInfo.loggingApiKey, 
                      icon: FileText,
                      color: "orange",
                      description: "Used for logging and monitoring services"
                    },
                  ].map(({ title, key, icon: Icon, color, description }) => (
                    <div key={title} className="qerza-api-key-card">
                      <div className="qerza-api-key-header">
                        <div className={`qerza-api-key-icon qerza-api-key-icon-${color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-qerza-primary">{title}</h3>
                          <p className="text-qerza-secondary text-sm mt-1">{description}</p>
                        </div>
                        <Badge className={`qerza-badge ${
                          color === 'blue' ? 'qerza-badge-info' :
                          color === 'purple' ? 'qerza-badge-purple' :
                          'qerza-badge-warning'
                        }`}>
                          Active
                        </Badge>
                      </div>
                      <div className="qerza-api-key-display">
                        <code className="qerza-api-key-value">
                          {showApiKeys ? key : "•".repeat(48)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key, title)}
                          className="qerza-btn-ghost p-3"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="qerza-btn-ghost p-3"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* API Usage Statistics */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-qerza-primary mb-4">API Usage Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="qerza-card text-center p-4 border-l-4 border-green-500">
                        <div className="text-2xl font-bold text-green-700">1,247</div>
                        <div className="text-sm text-green-600 font-medium">Total Requests</div>
                      </div>
                      <div className="qerza-card text-center p-4 border-l-4 border-blue-500">
                        <div className="text-2xl font-bold text-blue-700">99.8%</div>
                        <div className="text-sm text-blue-600 font-medium">Success Rate</div>
                      </div>
                      <div className="qerza-card text-center p-4 border-l-4 border-purple-500">
                        <div className="text-2xl font-bold text-purple-700">125ms</div>
                        <div className="text-sm text-purple-600 font-medium">Avg Response</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MODAL COMPONENTS - CLEAN VERSION (NO DUPLICATES)
// =============================================================================

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
      toast({ 
        title: "Success", 
        description: `User ${user ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save user", 
        variant: "destructive" 
      });
    },
  });

  return (
    <DialogContent className="qerza-modal sm:max-w-[500px]">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {user ? "Update user information and permissions" : "Add a new user to your tenant"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="qerza-label">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="qerza-input" />
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
                    <FormLabel className="qerza-label">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">{user ? "New Password (optional)" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="qerza-select">
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
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  user ? "Update User" : "Create User"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
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
      toast({ 
        title: "Success", 
        description: `Role ${role ? "updated" : "created"} successfully`,
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save role", 
        variant: "destructive" 
      });
    },
  });

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  return (
    <DialogContent className="qerza-modal sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
      <div className="qerza-modal-header">
        <div className="qerza-modal-title">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Key className="h-4 w-4 text-white" />
          </div>
          {title}
        </div>
        <div className="qerza-modal-description">
          {role ? "Update role information and permissions" : "Create a new role with specific permissions"}
        </div>
      </div>
      <div className="qerza-modal-content">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            if (selectedPermissions.length === 0) {
              toast({ title: "Error", description: "Please select at least one permission", variant: "destructive" });
              return;
            }
            mutation.mutate({ ...data, permissions: selectedPermissions });
          })} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="qerza-label">Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager" {...field} className="qerza-input" />
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
                  <FormLabel className="qerza-label">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Role description..." {...field} className="qerza-textarea" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label className="qerza-label mb-4">Permissions</Label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto bg-gray-50 border rounded-xl p-4">
                {(availablePermissions || AVAILABLE_PERMISSIONS).map(permission => (
                  <div key={permission} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor={permission} className="text-sm font-medium text-qerza-primary cursor-pointer">
                      {permission}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-qerza-secondary">
                {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="qerza-modal-footer">
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="qerza-btn-primary px-6"
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  role ? "Update Role" : "Create Role"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DialogContent>
  );
}
