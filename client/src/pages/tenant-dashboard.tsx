import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  Shield,
  Key,
  Settings,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useTenantAuth } from "@/hooks/use-tenant-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

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
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "reports.read",
  "reports.create",
  "reports.export",
  "settings.read",
  "settings.update",
  "admin.full_access",
];

export default function TenantDashboard() {
  const { orgId } = useParams();
  const { user, logout } = useTenantAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [manageRolesUser, setManageRolesUser] = useState<any | null>(null);
  const [showQuickstart, setShowQuickstart] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [permissionExplain, setPermissionExplain] = useState<any | null>(null);
  const [assignmentUserId, setAssignmentUserId] = useState<string>("");
  const [assignmentRoleId, setAssignmentRoleId] = useState<string>("");
  const { data: userRoles = [] } = useQuery({
    queryKey: ["/api/v2/rbac/users", assignmentUserId, "roles", orgId],
    enabled: !!assignmentUserId,
    queryFn: async () => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
      const t = tRes.ok ? await tRes.json() : null;
      if (!t) return [] as any[];
      const res = await fetch(`/api/v2/rbac/users/${assignmentUserId}/roles`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": t.id || "" },
      });
      if (!res.ok) return [] as any[];
      return res.json();
    },
  });

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

  // RBAC settings sync with platform admin onboarding selections
  const { data: rbacSettings } = useQuery({
    queryKey: ["/api/tenant", "rbac", "settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      // Need tenant to resolve id; fetch minimal tenant first
      const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
      const t = tRes.ok ? await tRes.json() : null;
      if (!t) return null;
      const res = await fetch(`/api/tenant/${t.id}/rbac/settings`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": t.id || "" },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Dynamic catalogs for RBAC editor in tenant portal
  const { data: rbacCatalog = { templates: [], businessTypes: [] } } = useQuery({
    queryKey: ["/api/tenant", orgId, "rbac", "catalog"],
    enabled: !!orgId,
    queryFn: async () => {
      const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
      const t = tRes.ok ? await tRes.json() : null;
      if (!t) return { templates: [], businessTypes: [] };
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const [tplRes, btRes] = await Promise.all([
        fetch(`/api/tenant/${t.id}/rbac/catalog/templates`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": t.id || "" },
        }),
        fetch(`/api/tenant/${t.id}/rbac/catalog/business-types`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": t.id || "" },
        }),
      ]);
      const templates = tplRes.ok ? await tplRes.json() : [];
      const businessTypes = btRes.ok ? await btRes.json() : [];
      return { templates, businessTypes } as any;
    },
  });

  // User CRUD operations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/auth/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/auth/users", tenant?.id] });
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
      const response = await fetch(`/api/v2/rbac/roles/${roleId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/rbac/roles", tenant?.id] });
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
          <Button onClick={() => (window.location.href = `/tenant/${orgId}/login`)}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Get tenant data from API with real-time polling
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/by-org-id/${orgId}`],
    enabled: !!orgId,
    refetchInterval: 5000, // Poll every 5 seconds for module changes
    refetchIntervalInBackground: true,
  }) as { data: any };

  // Guard: Only tenant admin (adminEmail) can access the portal
  if (user && tenant && user.email.toLowerCase() !== (tenant.adminEmail || "").toLowerCase()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You do not have admin access to this tenant portal</p>
          <Button onClick={() => (window.location.href = `/tenant/${orgId}/login`)}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Track previous enabled modules for real-time change detection
  const [previousModules, setPreviousModules] = useState<string[]>([]);

  // Detect module changes and show notifications
  useEffect(() => {
    if (tenant?.enabledModules && previousModules.length > 0) {
      const currentModules = tenant.enabledModules as string[];
      const newlyEnabled = currentModules.filter(m => !previousModules.includes(m));
      const newlyDisabled = previousModules.filter(m => !currentModules.includes(m));

      // Show notifications for module changes
      if (newlyEnabled.length > 0) {
        newlyEnabled.forEach(module => {
          toast({
            title: "Module Enabled",
            description: `${module.toUpperCase()} module has been enabled by your administrator.`,
            duration: 5000,
          });
        });
      }

      if (newlyDisabled.length > 0) {
        newlyDisabled.forEach(module => {
          toast({
            title: "Module Disabled",
            description: `${module.toUpperCase()} module has been disabled by your administrator.`,
            variant: "destructive",
            duration: 5000,
          });
        });
      }
    }

    // Update previous modules tracking
    if (tenant?.enabledModules) {
      setPreviousModules(tenant.enabledModules as string[]);
    }
  }, [tenant?.enabledModules, toast]);

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

  // Check if tenant is suspended and handle accordingly
  if (tenant && tenant.status === "suspended") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Account Suspended</h2>
          <p className="text-slate-600 mb-6">
            Your organization's account has been suspended. Please contact your administrator for
            assistance.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>Organization:</strong> {tenant.name}
              <br />
              <strong>Status:</strong> {tenant.status}
              <br />
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

  // Provider status (last validated/tested) — must be declared before conditional returns to keep hook order stable
  const { data: providerStatus = [] } = useQuery({
    queryKey: ["/api/tenant", tenant?.id, "providers/status"],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const headers: any = { "Content-Type": "application/json", "x-tenant-id": tenant?.id || "" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/tenant/${tenant?.id}/auth/providers/status`, { headers });
      if (!res.ok) return [] as any[];
      return res.json();
    },
  }) as { data: any[] };

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
    enabledModules: (tenant.enabledModules as string[]) || ["auth", "rbac"],
    moduleConfigs: tenant.moduleConfigs || {},
    users: tenantUsers || [],
    roles: tenantRoles || [],
  };

  // providerStatus is declared earlier (before conditional returns) to preserve hook order

  // Show banner if must change password
  const mustChange = (user as any)?.metadata?.mustChangePassword;

  // Check if modules are enabled
  const isModuleEnabled = (moduleName: string) => {
    return tenantInfo.enabledModules.includes(moduleName);
  };

  const isAuthEnabled = isModuleEnabled("auth");
  const isRbacEnabled = isModuleEnabled("rbac");
  const isLoggingEnabled = isModuleEnabled("logging");
  const providers = ((tenantInfo.moduleConfigs as any)?.auth?.providers || []) as Array<any>;
  const providerTypes = new Set((providers || []).map((p: any) => p?.type));
  // Module activation (source of truth for enabling)
  const isAzureAdModuleActive =
    tenantInfo.enabledModules.includes("azure-ad") || providerTypes.has("azure-ad");
  const isAuth0ModuleActive =
    tenantInfo.enabledModules.includes("auth0") || providerTypes.has("auth0");
  const isSamlModuleActive =
    tenantInfo.enabledModules.includes("saml") || providerTypes.has("saml");
  // Provider presence (configured)
  const hasAzureAdProvider = providerTypes.has("azure-ad");
  const hasAuth0Provider = providerTypes.has("auth0");
  const hasSamlProvider = providerTypes.has("saml");
  const roleDerivedPermissions: string[] = Array.from(
    new Set(
      ((tenantRoles as any[]) || []).flatMap((r: any) =>
        Array.isArray(r?.permissions) ? r.permissions : []
      )
    )
  );
  const customPermissions: string[] = Array.isArray((rbacSettings as any)?.customPermissions)
    ? ((rbacSettings as any).customPermissions as string[])
    : [];
  const availablePermissions: string[] = Array.from(
    new Set([
      ...(AVAILABLE_PERMISSIONS as string[]),
      ...roleDerivedPermissions,
      ...customPermissions,
    ])
  );
  availablePermissions.sort();

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
              <Badge variant={tenantInfo.status === "active" ? "default" : "secondary"}>
                {tenantInfo.status.charAt(0).toUpperCase() + tenantInfo.status.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              {/* Real-time connection indicator */}
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                  title="Live connection - monitoring for module changes"
                ></div>
                <span className="text-xs text-slate-500">Live</span>
              </div>

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
        {mustChange && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-md p-3 text-sm text-amber-900">
            For security, please change your temporary password.{" "}
            <button
              className="underline"
              onClick={() => (window.location.href = `/tenant/${orgId}/password/change`)}
            >
              Change now
            </button>
          </div>
        )}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users" disabled={!isAuthEnabled}>
              Users {!isAuthEnabled && <span className="ml-1 text-xs opacity-60">(Disabled)</span>}
            </TabsTrigger>
            {isRbacEnabled && <TabsTrigger value="roles">Roles</TabsTrigger>}
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
                  <p className="text-xs text-slate-600">{tenantInfo.enabledModules.join(", ")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mb-2">
              <Button variant="secondary" size="sm" onClick={() => setShowQuickstart(true)}>
                Open Quick Start
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Simple user-role assignment */}
                <div className="border rounded-md p-4 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label className="text-xs">User</Label>
                      <Select onValueChange={v => setAssignmentUserId(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {(tenantUsers as any[]).map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Select onValueChange={v => setAssignmentRoleId(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {(tenantRoles as any[]).map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        onClick={async () => {
                          try {
                            if (!assignmentUserId || !assignmentRoleId) return;
                            const token =
                              localStorage.getItem(`tenant_token_${orgId}`) ||
                              localStorage.getItem("tenant_token") ||
                              "";
                            const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
                            const t = tRes.ok ? await tRes.json() : null;
                            if (!t) return;
                            const res = await fetch(
                              `/api/v2/rbac/users/${assignmentUserId}/roles`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                  "x-tenant-id": t.id || "",
                                },
                                body: JSON.stringify({ roleId: assignmentRoleId }),
                              }
                            );
                            if (!res.ok) throw new Error("Assign failed");
                            toast({ title: "Role assigned" });
                            queryClient.invalidateQueries({
                              queryKey: ["/api/v2/rbac/users", assignmentUserId, "roles", orgId],
                            });
                          } catch (e: any) {
                            toast({
                              title: "Failed to assign",
                              description: e.message || "Error",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Assign Role
                      </Button>
                    </div>
                  </div>
                  {assignmentUserId && (
                    <div className="mt-3 text-sm">
                      <span className="text-slate-600">Current roles:</span>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(userRoles as any[]).map((r: any) => (
                          <Badge key={r.id} variant="outline" className="text-xs">
                            {r.name}
                            <button
                              className="ml-2 text-slate-500 hover:text-slate-700"
                              onClick={async () => {
                                try {
                                  const token =
                                    localStorage.getItem(`tenant_token_${orgId}`) ||
                                    localStorage.getItem("tenant_token") ||
                                    "";
                                  const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
                                  const t = tRes.ok ? await tRes.json() : null;
                                  if (!t) return;
                                  const res = await fetch(
                                    `/api/v2/rbac/users/${assignmentUserId}/roles/${r.id}`,
                                    {
                                      method: "DELETE",
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                        "x-tenant-id": t.id || "",
                                      },
                                    }
                                  );
                                  if (!res.ok) throw new Error("Remove failed");
                                  toast({ title: "Role removed" });
                                  queryClient.invalidateQueries({
                                    queryKey: [
                                      "/api/v2/rbac/users",
                                      assignmentUserId,
                                      "roles",
                                      orgId,
                                    ],
                                  });
                                } catch (e: any) {
                                  toast({
                                    title: "Failed to remove",
                                    description: e.message || "Error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">1. Install SDKs</p>
                    <p className="text-sm text-slate-600 mt-1">
                      npm install @saas-framework/auth @saas-framework/rbac
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">2. Configure API Keys</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Use your Auth and RBAC API keys from the API Keys tab
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">3. Integrate Authentication</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Start with Azure AD SSO (or local JWT fallback) using our SDK.
                      <a
                        href="https://github.com/akkikhan/UpdatedSaaSFramework-1/tree/tenant-portal-enhancement/packages/auth-client#readme"
                        className="text-blue-600 font-medium ml-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Auth SDK Guide →
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Dialog open={showQuickstart} onOpenChange={setShowQuickstart}>
              <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                  <DialogTitle>Quick Start</DialogTitle>
                  <DialogDescription>Auth, RBAC and Logging — essential snippets</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded border bg-slate-50">
                    <p className="font-medium mb-1">Authentication</p>
                    <p className="mb-1">Install SDK</p>
                    <code>npm i @saas-framework/auth-client</code>
                    <p className="mt-2">
                      Start SSO: <code>startAzure(orgId)</code> or use{" "}
                      <code>loginWithPassword</code>, then <code>handleSuccessFromUrl()</code>.
                    </p>
                  </div>
                  <div className="p-4 rounded border bg-slate-50">
                    <p className="font-medium mb-1">RBAC</p>
                    <p className="mb-1">Check permission</p>
                    <code>POST /api/v2/rbac/check-permission {"{ userId, resource, action }"}</code>
                    <p className="mt-2">Create roles here and assign in Users → Manage Roles.</p>
                  </div>
                  <div className="p-4 rounded border bg-slate-50">
                    <p className="font-medium mb-1">Logging</p>
                    <p className="mb-1">Send event (requires Logging API key)</p>
                    <code>POST /api/v2/logging/events</code>
                    <p className="mt-2">
                      Headers: <code>x-api-key</code>. Body:{" "}
                      <code>level, category, message, metadata</code>.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                      User Management Unavailable
                    </h3>
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
                          queryClient.invalidateQueries({
                            queryKey: ["/auth/users", tenant?.id],
                          });
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
                      {(tenantInfo.users as any[]).length > 0 ? (
                        (tenantInfo.users as any[]).map((user: any) => (
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
                    queryClient.invalidateQueries({ queryKey: ["/auth/users", tenant?.id] });
                  }}
                />
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="roles">
            {/* RBAC Settings full editor */}
            {rbacSettings && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">RBAC Settings</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        Adjust defaults for this tenant.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Permission Template</Label>
                      <Select
                        defaultValue={(rbacSettings as any)?.permissionTemplate || "standard"}
                        onValueChange={val => ((rbacSettings as any).permissionTemplate = val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {(rbacCatalog.templates as any[]).length
                            ? (rbacCatalog.templates as any[]).map((t: any) => (
                                <SelectItem
                                  key={t.id}
                                  value={(t.name || t.id).toString().toLowerCase()}
                                >
                                  {t.name}
                                </SelectItem>
                              ))
                            : [
                                <SelectItem key="standard" value="standard">
                                  Standard
                                </SelectItem>,
                                <SelectItem key="enterprise" value="enterprise">
                                  Enterprise
                                </SelectItem>,
                                <SelectItem key="custom" value="custom">
                                  Custom
                                </SelectItem>,
                              ]}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Business Type</Label>
                      <Select
                        defaultValue={(rbacSettings as any)?.businessType || "general"}
                        onValueChange={val => ((rbacSettings as any).businessType = val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(rbacCatalog.businessTypes as any[]).length
                            ? (rbacCatalog.businessTypes as any[]).map((b: any) => (
                                <SelectItem
                                  key={b.id}
                                  value={(b.name || b.id).toString().toLowerCase()}
                                >
                                  {b.name}
                                </SelectItem>
                              ))
                            : [
                                <SelectItem key="general" value="general">
                                  General
                                </SelectItem>,
                                <SelectItem key="healthcare" value="healthcare">
                                  Healthcare
                                </SelectItem>,
                                <SelectItem key="finance" value="finance">
                                  Finance
                                </SelectItem>,
                                <SelectItem key="education" value="education">
                                  Education
                                </SelectItem>,
                                <SelectItem key="government" value="government">
                                  Government
                                </SelectItem>,
                              ]}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Default Roles</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(((rbacSettings as any)?.defaultRoles || []) as string[]).map(r => (
                        <Badge key={r} variant="secondary" className="px-2 py-1">
                          <span className="mr-2">{r}</span>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() => {
                              (rbacSettings as any).defaultRoles = (
                                (rbacSettings as any).defaultRoles || []
                              ).filter((x: string) => x !== r);
                              queryClient.invalidateQueries({
                                queryKey: ["/api/tenant", "rbac", "settings", orgId],
                              });
                            }}
                            aria-label={`Remove ${r}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a role"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (!v) return;
                            const arr = Array.from(
                              new Set([
                                ...(((rbacSettings as any).defaultRoles || []) as string[]),
                                v,
                              ])
                            );
                            (rbacSettings as any).defaultRoles = arr;
                            (e.target as HTMLInputElement).value = "";
                            queryClient.invalidateQueries({
                              queryKey: ["/api/tenant", "rbac", "settings", orgId],
                            });
                          }
                        }}
                      />
                      <Button variant="secondary">Add</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Custom Permissions</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(((rbacSettings as any)?.customPermissions || []) as string[]).map(p => (
                        <Badge key={p} variant="outline" className="px-2 py-1">
                          <span className="mr-2">{p}</span>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() => {
                              (rbacSettings as any).customPermissions = (
                                (rbacSettings as any).customPermissions || []
                              ).filter((x: string) => x !== p);
                              queryClient.invalidateQueries({
                                queryKey: ["/api/tenant", "rbac", "settings", orgId],
                              });
                            }}
                            aria-label={`Remove ${p}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add permission (e.g., reports.export)"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (!v) return;
                            const arr = Array.from(
                              new Set([
                                ...(((rbacSettings as any).customPermissions || []) as string[]),
                                v,
                              ])
                            );
                            (rbacSettings as any).customPermissions = arr;
                            (e.target as HTMLInputElement).value = "";
                            queryClient.invalidateQueries({
                              queryKey: ["/api/tenant", "rbac", "settings", orgId],
                            });
                          }
                        }}
                      />
                      <Button variant="secondary">Add</Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        try {
                          const token =
                            localStorage.getItem(`tenant_token_${orgId}`) ||
                            localStorage.getItem("tenant_token") ||
                            "";
                          const tRes = await fetch(`/api/tenants/by-org-id/${orgId}`);
                          const t = tRes.ok ? await tRes.json() : null;
                          if (!t) return;
                          const res = await fetch(`/api/tenant/${t.id}/rbac/settings`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify(rbacSettings),
                          });
                          if (!res.ok) throw new Error("Save failed");
                          queryClient.invalidateQueries({
                            queryKey: ["/api/tenant", "rbac", "settings", orgId],
                          });
                          toast({ title: "RBAC settings saved" });
                        } catch (e: any) {
                          toast({
                            title: "Failed to save",
                            description: e.message || "Error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
                      availablePermissions={availablePermissions}
                      onSuccess={() => {
                        setShowAddRoleModal(false);
                        queryClient.invalidateQueries({
                          queryKey: ["/api/v2/rbac/roles", tenant?.id],
                        });
                      }}
                    />
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Permission check: Why allowed/denied */}
                <div className="border rounded-md p-4 bg-slate-50">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <Label className="text-xs text-slate-600">User</Label>
                      <Select onValueChange={v => setSelectedUser({ id: v })}>
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {(tenantUsers as any[]).map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Resource</Label>
                      <Input placeholder="e.g., documents" id="perm-resource" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Action</Label>
                      <Input placeholder="e.g., read" id="perm-action" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const userId = (selectedUser as any)?.id;
                        const resource = (
                          document.getElementById("perm-resource") as HTMLInputElement
                        )?.value?.trim();
                        const action = (
                          document.getElementById("perm-action") as HTMLInputElement
                        )?.value?.trim();
                        if (!userId || !resource || !action) {
                          toast({
                            title: "Missing fields",
                            description: "Select user, resource and action",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          const res = await fetch("/api/v2/rbac/check-permission", {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ userId, resource, action, explain: true }),
                          });
                          const data = await res.json();
                          const details = data?.details;
                          const allowed = data?.hasPermission;
                          setPermissionExplain({ allowed, details });
                        } catch (e: any) {
                          toast({
                            title: "Check failed",
                            description: e?.message || "Try again",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Check Access
                    </Button>
                  </div>
                  {permissionExplain && (
                    <div className="mt-3 text-sm">
                      <div
                        className={permissionExplain.allowed ? "text-green-700" : "text-red-700"}
                      >
                        {permissionExplain.allowed ? "Allowed" : "Denied"} (
                        {permissionExplain?.details?.evaluated})
                      </div>
                      {permissionExplain?.details?.matchedRoles?.length > 0 ? (
                        <div className="mt-2">
                          <span className="text-slate-600">Granted by roles:</span>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {permissionExplain.details.matchedRoles.map((r: any) => (
                              <Badge key={r.id} variant="secondary" className="text-xs">
                                {r.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-slate-600">No roles grant this permission.</div>
                      )}
                    </div>
                  )}
                </div>

                {(tenantInfo.roles as any[]).length > 0 ? (
                  (tenantInfo.roles as any[]).map((role: any) => (
                    <Card key={role.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{role.name}</CardTitle>
                            <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                            {role.isSystem && (
                              <Badge variant="outline" className="text-xs mt-1">
                                System Role
                              </Badge>
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
                  ))
                ) : (
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
                availablePermissions={availablePermissions}
                onSuccess={() => {
                  setSelectedRole(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/v2/rbac/roles", tenant?.id] });
                }}
              />
            </Dialog>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card className="max-h-[70vh] overflow-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Modules</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-500">Live status monitoring</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAuthEnabled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-900 text-sm">
                    Authentication Module is not enabled for your application. You can request
                    enablement from the Platform Admin. Users and SSO settings are unavailable until
                    enabled.
                  </div>
                )}
                {isAuthEnabled && (
                  <div className="p-4 border rounded-lg bg-white">
                    <p className="text-sm font-medium mb-3">Auth Settings</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <Label className="text-xs">Default Provider</Label>
                        <Select
                          onValueChange={async val => {
                            const headers = getAuthHeaders();
                            await fetch(`/api/tenant/${tenant?.id}/auth/settings`, {
                              method: "PATCH",
                              headers,
                              body: JSON.stringify({ defaultProvider: val }),
                            });
                            toast({ title: "Saved", description: "Default provider updated" });
                          }}
                          defaultValue={
                            (tenantInfo.moduleConfigs as any)?.auth?.defaultProvider || "local"
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="azure-ad" disabled={!isAzureAdModuleActive}>
                              Azure AD
                            </SelectItem>
                            <SelectItem value="auth0" disabled={!isAuth0ModuleActive}>
                              Auth0
                            </SelectItem>
                            <SelectItem value="local">Local (JWT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Enforce SSO Only</Label>
                        <div className="mt-2">
                          <Select
                            onValueChange={async val => {
                              const enforce = val === "true";
                              const headers = getAuthHeaders();
                              await fetch(`/api/tenant/${tenant?.id}/auth/settings`, {
                                method: "PATCH",
                                headers,
                                body: JSON.stringify({ allowFallback: !enforce }),
                              });
                              toast({
                                title: "Saved",
                                description: enforce
                                  ? "SSO only enforced"
                                  : "Fallback login allowed",
                              });
                            }}
                            defaultValue={
                              (tenantInfo.moduleConfigs as any)?.auth?.allowFallback === false
                                ? "true"
                                : "false"
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No (Allow fallback)</SelectItem>
                              <SelectItem value="true">Yes (SSO only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const res = await fetch(`/api/auth/azure/${orgId}`);
                            if (res.ok) {
                              const data = await res.json();
                              if (data?.authUrl) window.open(data.authUrl, "_blank");
                            } else {
                              toast({
                                title: "Azure SSO not ready",
                                description: "Check provider configuration",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={!isAzureAdModuleActive}
                        >
                          Test Azure SSO
                        </Button>
                        <Button
                          className="ml-2"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const headers: any = {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                              };
                              const token =
                                localStorage.getItem(`tenant_token_${orgId}`) ||
                                localStorage.getItem("tenant_token") ||
                                "";
                              if (token) headers.Authorization = `Bearer ${token}`;
                              if (tenant?.id) headers["x-tenant-id"] = tenant.id;
                              const base = window.location.origin;
                              // Switch to POST so behavior matches provider card overrides
                              const res = await fetch(
                                `${base}/api/tenant/${tenant?.id}/azure-ad/validate`,
                                { method: "POST", headers, body: JSON.stringify({}) }
                              );
                              const data = await res.json();
                              if (res.ok && data?.valid) {
                                toast({
                                  title: "Azure config looks good",
                                  description: "You can try SSO now.",
                                });
                              } else {
                                toast({
                                  title: "Azure config invalid",
                                  description: data?.message || "Fix settings and try again",
                                  variant: "destructive",
                                });
                              }
                            } catch (e: any) {
                              toast({
                                title: "Validation failed",
                                description: e?.message || "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={!isAzureAdModuleActive}
                        >
                          Validate Azure Config
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isLoggingEnabled && (
                  <>
                    <LoggingSettingsCard tenantId={tenant?.id} orgId={orgId!} />
                    <LoggingViewerCard
                      tenantId={tenant?.id}
                      orgId={orgId!}
                      loggingApiKey={(tenant as any)?.loggingApiKey}
                    />
                  </>
                )}

                {/* Authentication Providers (Accordion) */}
                {isAuthEnabled && (
                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Authentication Providers</p>
                      <span className="text-xs text-slate-500">
                        Manage connection details (requests go to admin)
                      </span>
                    </div>
                    <Accordion type="multiple" className="w-full">
                      {(isAzureAdModuleActive || providerTypes.has("azure-ad")) && (
                        <AccordionItem value="azure">
                          <AccordionTrigger>Azure Active Directory</AccordionTrigger>
                          <AccordionContent>
                            <ProviderAzureCard
                              orgId={orgId!}
                              tenantId={tenant?.id}
                              provider={(providers || []).find((p: any) => p.type === "azure-ad")}
                              isEnabled={isAzureAdModuleActive}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {(isAuth0ModuleActive || providerTypes.has("auth0")) && (
                        <AccordionItem value="auth0">
                          <AccordionTrigger>Auth0</AccordionTrigger>
                          <AccordionContent>
                            <ProviderAuth0Card
                              orgId={orgId!}
                              tenantId={tenant?.id}
                              provider={(providers || []).find((p: any) => p.type === "auth0")}
                              isEnabled={isAuth0ModuleActive}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {(isSamlModuleActive || providerTypes.has("saml")) && (
                        <AccordionItem value="saml">
                          <AccordionTrigger>SAML</AccordionTrigger>
                          <AccordionContent>
                            <ProviderSamlCard
                              orgId={orgId!}
                              tenantId={tenant?.id}
                              provider={(providers || []).find((p: any) => p.type === "saml")}
                              isEnabled={isSamlModuleActive}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </div>
                )}
                {/* Display all available modules with their current status */}
                {[
                  {
                    id: "auth",
                    name: "Core Authentication",
                    description: "Basic JWT authentication and user management",
                    required: true,
                  },
                  {
                    id: "rbac",
                    name: "Role-Based Access Control",
                    description: "Advanced role and permission management",
                    required: true,
                  },
                  {
                    id: "logging",
                    name: "Logging & Monitoring",
                    description: "Application logs, search and basic alerts",
                    required: false,
                  },
                  {
                    id: "azure-ad",
                    name: "Azure Active Directory",
                    description: "Single sign-on with Microsoft Azure AD",
                    required: false,
                  },
                  {
                    id: "auth0",
                    name: "Auth0",
                    description: "Universal authentication with Auth0",
                    required: false,
                  },
                  {
                    id: "saml",
                    name: "SAML SSO",
                    description: "SAML-based single sign-on integration",
                    required: false,
                  },
                ].map(module => {
                  const isEnabled = tenantInfo.enabledModules.includes(module.id);
                  return (
                    <Card
                      key={module.id}
                      className={`transition-all duration-500 ${isEnabled ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${isEnabled ? "bg-green-500" : "bg-slate-400"} transition-colors duration-500`}
                            ></div>
                            <div>
                              <CardTitle className="text-base">{module.name}</CardTitle>
                              <p className="text-sm text-slate-600 mt-1">{module.description}</p>
                              {module.required && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={isEnabled ? "default" : "secondary"}
                              className="transition-colors duration-500"
                            >
                              {isEnabled ? "Active" : "Disabled"}
                            </Badge>
                            {/* Request enable/disable mirrors Platform Admin governance */}
                            {!isEnabled && !module.required && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const headers = getAuthHeaders();
                                    const res = await fetch(
                                      `/api/tenant/${tenant?.id}/modules/request`,
                                      {
                                        method: "POST",
                                        headers,
                                        body: JSON.stringify({
                                          moduleId: module.id,
                                          action: "enable",
                                        }),
                                      }
                                    );
                                    if (!res.ok) throw new Error("Request failed");
                                    toast({
                                      title: "Requested",
                                      description: "Platform admin will review your request",
                                    });
                                  } catch (e: any) {
                                    toast({
                                      title: "Failed",
                                      description: e.message || "Could not send request",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Request Enable
                              </Button>
                            )}
                            {isEnabled && !module.required && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const headers = getAuthHeaders();
                                    const res = await fetch(
                                      `/api/tenant/${tenant?.id}/modules/request`,
                                      {
                                        method: "POST",
                                        headers,
                                        body: JSON.stringify({
                                          moduleId: module.id,
                                          action: "disable",
                                        }),
                                      }
                                    );
                                    if (!res.ok) throw new Error("Request failed");
                                    toast({
                                      title: "Requested",
                                      description: "Disable request sent to platform admin",
                                    });
                                  } catch (e: any) {
                                    toast({
                                      title: "Failed",
                                      description: e.message || "Could not send request",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Request Disable
                              </Button>
                            )}
                            {/* Deep-link to Configure Azure AD when RBAC present but no SSO */}
                            {module.id === "azure-ad" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Jump to provider accordion if present
                                  const el = document.querySelector('[data-provider="azure-ad"]');
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                              >
                                Configure Azure AD
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {isEnabled &&
                        (module.id === "azure-ad" || module.id === "auth0") &&
                        providerTypes.has(module.id) && (
                          <CardContent className="pt-0">
                            <div className="space-y-2 bg-white p-3 rounded-lg border border-green-200">
                              <p className="text-sm font-medium text-slate-700">Configuration:</p>
                              {module.id === "azure-ad" && (
                                <>
                                  {(() => {
                                    const cfg =
                                      (providers || []).find((p: any) => p.type === "azure-ad")
                                        ?.config || {};
                                    return (
                                      <>
                                        <p className="text-xs text-slate-600">
                                          Tenant ID: {cfg.tenantId || "—"}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          Client ID: {cfg.clientId || "—"}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          Callback: {cfg.redirectUri || cfg.callbackUrl || "—"}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </>
                              )}
                              {module.id === "auth0" && (
                                <>
                                  {(() => {
                                    const cfg =
                                      (providers || []).find((p: any) => p.type === "auth0")
                                        ?.config || {};
                                    return (
                                      <>
                                        <p className="text-xs text-slate-600">
                                          Domain: {cfg.domain || "—"}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          Audience: {cfg.audience || "—"}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          Callback: {cfg.redirectUri || cfg.callbackUrl || "—"}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          </CardContent>
                        )}
                    </Card>
                  );
                })}
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
                        {showApiKeys ? tenantInfo.authApiKey : "•".repeat(32)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tenantInfo.authApiKey, "Auth API Key")}
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
                        {showApiKeys ? tenantInfo.rbacApiKey : "•".repeat(32)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tenantInfo.rbacApiKey, "RBAC API Key")}
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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Logging API Key</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm font-mono">
                        {showApiKeys ? (tenant as any)?.loggingApiKey || "" : "•".repeat(32)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard((tenant as any)?.loggingApiKey || "", "Logging API Key")
                        }
                        data-testid="button-copy-logging-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Use this key to ingest/query logs via /logging/* endpoints
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
  onSuccess,
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
      status: user?.status || "active",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save user");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `User ${user ? "updated" : "created"} successfully`,
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
          {user ? "Update user information" : "Add a new user to your organization."}
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
              {mutation.isPending ? "Saving..." : user ? "Update User" : "Create User"}
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
  availablePermissions,
  onSuccess,
}: {
  title: string;
  tenantId?: string;
  role?: any;
  availablePermissions?: string[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
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
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save role");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Role ${role ? "updated" : "created"} successfully`,
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
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {role
            ? "Update role information and permissions"
            : "Create a new role with specific permissions."}
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
              {(availablePermissions && availablePermissions.length
                ? availablePermissions
                : AVAILABLE_PERMISSIONS
              ).map(permission => (
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
              {mutation.isPending ? "Saving..." : role ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

// Provider Cards
function LoggingSettingsCard({ tenantId, orgId }: { tenantId?: string; orgId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<string[]>(["error", "warning", "info"]);
  const [destinations, setDestinations] = useState<string>("database");
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [redactionEnabled, setRedactionEnabled] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const token =
          localStorage.getItem(`tenant_token_${orgId}`) ||
          localStorage.getItem("tenant_token") ||
          "";
        const headers: any = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        headers["x-tenant-id"] = tenantId;
        const res = await fetch(`/api/tenant/${tenantId}/logging/settings`, { headers });
        const data = await res.json();
        if (res.ok) {
          setLevels(Array.isArray(data.levels) ? data.levels : ["error", "warning", "info"]);
          setDestinations("database");
          setRetentionDays(typeof data.retentionDays === "number" ? data.retentionDays : 30);
          setRedactionEnabled(!!data.redactionEnabled);
        }
      } catch {}
      setLoading(false);
    })();
  }, [tenantId, orgId]);

  const toggleLevel = (lvl: string) => {
    setLevels(prev => (prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl]));
  };

  const save = async () => {
    try {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const headers: any = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      headers["x-tenant-id"] = tenantId || "";
      const body = {
        levels,
        destinations: ["database"],
        retentionDays,
        redactionEnabled,
      };
      const res = await fetch(`/api/tenant/${tenantId}/logging/settings`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");
      toast({ title: "Saved", description: "Logging settings updated" });
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Logging Settings</p>
        <span className="text-xs text-slate-500">Tenant-managed (enable/disable via Platform)</span>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-2">
            <Label className="text-xs">Levels</Label>
            <div className="flex flex-wrap gap-2">
              {["error", "warning", "info", "debug"].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLevel(l)}
                  className={`px-2 py-1 rounded text-xs border ${
                    levels.includes(l)
                      ? "bg-blue-50 border-blue-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Destinations (comma-separated)</Label>
            <Input value="database" disabled />
            <p className="text-[11px] text-slate-500 mt-1">Leave blank to keep default storage.</p>
          </div>
          <div>
            <Label className="text-xs">Retention Days</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={e => setRetentionDays(parseInt(e.target.value || "30", 10))}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                id="redact"
                type="checkbox"
                checked={redactionEnabled}
                onChange={e => setRedactionEnabled(e.target.checked)}
              />
              <Label htmlFor="redact" className="text-xs">
                Enable PII redaction
              </Label>
            </div>
          </div>
          <div className="md:col-span-3">
            <Button onClick={save}>Save Logging Settings</Button>
          </div>
          <div className="md:col-span-3 text-xs text-slate-500">
            Usage: send logs with your Logging API key. Example:
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 mt-2 overflow-auto">
              {`
curl -X POST \
  -H "X-API-Key: logging_..." \
  -H "Content-Type: application/json" \
  ${window.location.origin}/api/v2/logging/events \
  -d '{"level":"info","message":"hello","category":"app"}'
`}
            </pre>
            See docs/logging-quickstart.md for more.
          </div>
        </div>
      )}
    </div>
  );
}

function LoggingViewerCard({
  tenantId,
  orgId,
  loggingApiKey,
}: {
  tenantId?: string;
  orgId: string;
  loggingApiKey?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [level, setLevel] = useState<string>("all");
  const [category, setCategory] = useState<string>("");

  // Debug logging to help identify the issue
  console.log("🔧 LoggingViewerCard Debug Info:", {
    tenantId,
    orgId,
    loggingApiKey: loggingApiKey ? "PRESENT" : "MISSING",
    loggingApiKeyValue: loggingApiKey,
  });

  const fetchLogs = async () => {
    if (!loggingApiKey) {
      toast({
        title: "Missing key",
        description: "Logging API key not available",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (level && level !== "all") params.set("level", level);
      if (category) params.set("category", category);
      params.set("limit", "20");
      const res = await fetch(`/api/v2/logging/events?${params.toString()}`, {
        headers: { "X-API-Key": loggingApiKey },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied. API key might be invalid or expired.");
        }
        throw new Error(data?.message || `Failed to load logs (${res.status})`);
      }
      // Normalize shape
      const normalized = (Array.isArray(data) ? data : []).map((row: any) => {
        const ts = row.timestamp || row.time || new Date().toISOString();
        const details = row.message || row.details || {};
        const lvlRaw = row.level || details.level || "";
        const lvl = typeof lvlRaw === "string" ? String(lvlRaw).split(":")[0] : "";
        const cat =
          row.eventType ||
          details.category ||
          (typeof lvlRaw === "string" ? String(lvlRaw).split(":")[1] : "");
        return {
          id: row.id,
          time: ts,
          level: lvl || "info",
          category: cat || "application",
          message: details.message || details || "",
        };
      });
      setLogs(normalized);
    } catch (e: any) {
      toast({
        title: "Load failed",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial fetch
    if (tenantId && loggingApiKey) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, loggingApiKey]);

  return (
    <div className="p-4 border rounded-lg bg-white mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Recent Logs</p>
          {!loggingApiKey && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              API Key Missing
            </span>
          )}
          {loggingApiKey && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              API Key OK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/docs/logging-quickstart.md", "_blank")}
          >
            Open Quickstart
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div>
          <Label className="text-xs">Level</Label>
          <Select onValueChange={setLevel} defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Category</Label>
          <Input
            placeholder="e.g., application"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchLogs} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>
      <div className="overflow-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Level</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {!loggingApiKey ? (
              <tr>
                <td colSpan={4} className="p-3 text-red-600 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span>❌ Logging API key not available</span>
                    <span className="text-xs text-slate-500">
                      Contact your administrator to enable logging for this tenant
                    </span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-slate-500 text-center">
                  {loading ? "Loading..." : "No logs found"}
                </td>
              </tr>
            ) : (
              logs.map(row => (
                <tr key={row.id || row.time} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(row.time).toLocaleString()}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className="text-xs">
                      {row.level}
                    </Badge>
                  </td>
                  <td className="p-2">{row.category}</td>
                  <td className="p-2">
                    {typeof row.message === "string" ? (
                      row.message
                    ) : (
                      <code className="text-xs bg-slate-50 border px-1 py-0.5 rounded">
                        {JSON.stringify(row.message)}
                      </code>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ProviderAzureCard({
  orgId,
  tenantId,
  provider,
  isEnabled,
}: {
  orgId: string;
  tenantId?: string;
  provider?: any;
  isEnabled: boolean;
}) {
  const { toast } = useToast();
  const expectedRedirect = `${window.location.protocol}//${window.location.host}/api/auth/azure/callback`;
  const [form, setForm] = useState({
    tenantId: provider?.config?.tenantId || "",
    clientId: provider?.config?.clientId || "",
    clientSecret: "", // never prefill secrets
    redirectUri: provider?.config?.redirectUri || provider?.config?.callbackUrl || expectedRedirect,
  });

  const submitRequest = async () => {
    try {
      const base = window.location.origin;
      const headers: any = { "Content-Type": "application/json", Accept: "application/json" };
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenantId) headers["x-tenant-id"] = tenantId;
      const config: any = { ...form };
      // Don't send blank secret (prevents clearing existing secret on approval)
      if (!config.clientSecret) delete config.clientSecret;
      const res = await fetch(`${base}/api/tenant/${tenantId}/auth/providers/request`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "azure-ad",
          config,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed");
      toast({ title: "Submitted", description: "Provider change request sent to admin" });
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border rounded-md p-3 mb-3" data-provider="azure-ad">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium">Azure Active Directory</p>
          <p className="text-xs text-slate-500">
            Configure Azure AD app (single-tenant recommended)
          </p>
        </div>
        <Badge variant={provider ? "default" : "secondary"}>
          {provider ? "Configured" : "Not configured"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Tenant ID (GUID)</Label>
          <Input
            disabled={!isEnabled}
            value={form.tenantId}
            onChange={e => setForm({ ...form, tenantId: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        <div>
          <Label className="text-xs">Client ID (Application ID)</Label>
          <Input
            disabled={!isEnabled}
            value={form.clientId}
            onChange={e => setForm({ ...form, clientId: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        <div>
          <Label className="text-xs">Client Secret</Label>
          <Input
            disabled={!isEnabled}
            type="password"
            value={form.clientSecret}
            onChange={e => setForm({ ...form, clientSecret: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Redirect URI</Label>
          <Input
            disabled={!isEnabled}
            value={form.redirectUri}
            onChange={e => setForm({ ...form, redirectUri: e.target.value })}
            placeholder={expectedRedirect}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="secondary"
          disabled={!isEnabled}
          onClick={async () => {
            try {
              const headers: any = {
                "Content-Type": "application/json",
                Accept: "application/json",
              };
              const token =
                localStorage.getItem(`tenant_token_${orgId}`) ||
                localStorage.getItem("tenant_token") ||
                "";
              if (token) headers.Authorization = `Bearer ${token}`;
              if (tenantId) headers["x-tenant-id"] = tenantId;
              const base = window.location.origin;
              const res = await fetch(`${base}/api/tenant/${tenantId}/azure-ad/verify-secret`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  tenantId: form.tenantId,
                  clientId: form.clientId,
                  clientSecret: form.clientSecret,
                  redirectUri: form.redirectUri,
                }),
              });
              const data = await res.json();
              if (res.ok && data?.valid)
                toast({ title: "Secret verified", description: "Client credentials succeeded." });
              else
                toast({
                  title: "Secret invalid",
                  description: data?.message || "Client credential flow failed",
                  variant: "destructive",
                });
            } catch (e: any) {
              toast({
                title: "Verification failed",
                description: e?.message || "Unknown error",
                variant: "destructive",
              });
            }
          }}
        >
          Verify Secret
        </Button>
        <Button
          variant="outline"
          disabled={!isEnabled}
          onClick={async () => {
            try {
              const headers: any = {
                "Content-Type": "application/json",
                Accept: "application/json",
              };
              const token =
                localStorage.getItem(`tenant_token_${orgId}`) ||
                localStorage.getItem("tenant_token") ||
                "";
              if (token) headers.Authorization = `Bearer ${token}`;
              if (tenantId) headers["x-tenant-id"] = tenantId;
              const base = window.location.origin;
              const res = await fetch(`${base}/api/tenant/${tenantId}/azure-ad/validate`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  tenantId: form.tenantId,
                  clientId: form.clientId,
                  clientSecret: form.clientSecret,
                  redirectUri: form.redirectUri,
                }),
              });
              const data = await res.json();
              if (res.ok && data?.valid)
                toast({ title: "Azure config looks good", description: "You can try SSO now." });
              else
                toast({
                  title: "Azure config invalid",
                  description: data?.message || "Fix settings and try again",
                  variant: "destructive",
                });
            } catch (e: any) {
              toast({
                title: "Validation failed",
                description: e?.message || "Unknown error",
                variant: "destructive",
              });
            }
          }}
        >
          Validate
        </Button>
        <Button disabled={!isEnabled} onClick={submitRequest}>
          Request Update
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(expectedRedirect);
            toast({ title: "Copied", description: "Redirect URI copied" });
          }}
        >
          Copy Redirect URI
        </Button>
        {!isEnabled && (
          <span className="text-xs text-slate-500">
            Azure AD module is disabled. Request enable in the list below.
          </span>
        )}
      </div>
    </div>
  );
}

function ProviderAuth0Card({
  orgId,
  tenantId,
  provider,
  isEnabled,
}: {
  orgId: string;
  tenantId?: string;
  provider?: any;
  isEnabled: boolean;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    domain: provider?.config?.domain || "",
    clientId: provider?.config?.clientId || "",
    clientSecret: "",
    audience: provider?.config?.audience || "",
  });
  const expectedRedirect = `${window.location.protocol}//${window.location.host}/api/auth/auth0/callback`;

  const submitRequest = async () => {
    try {
      const cfg: any = { ...form, redirectUri: expectedRedirect };
      if (!cfg.clientSecret) delete cfg.clientSecret;
      const res = await fetch(`/api/tenant/${tenantId}/auth/providers/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "auth0", config: cfg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed");
      toast({ title: "Submitted", description: "Provider change request sent to admin" });
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border rounded-md p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium">Auth0</p>
          <p className="text-xs text-slate-500">Configure Auth0 application</p>
        </div>
        <Badge variant={provider ? "default" : "secondary"}>
          {provider ? "Configured" : "Not configured"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Domain</Label>
          <Input
            disabled={!isEnabled}
            value={form.domain}
            onChange={e => setForm({ ...form, domain: e.target.value })}
            placeholder="your-tenant.auth0.com"
          />
        </div>
        <div>
          <Label className="text-xs">Client ID</Label>
          <Input
            disabled={!isEnabled}
            value={form.clientId}
            onChange={e => setForm({ ...form, clientId: e.target.value })}
            placeholder="xxxxxxxx..."
          />
        </div>
        <div>
          <Label className="text-xs">Client Secret</Label>
          <Input
            disabled={!isEnabled}
            type="password"
            value={form.clientSecret}
            onChange={e => setForm({ ...form, clientSecret: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <div>
          <Label className="text-xs">Audience (optional)</Label>
          <Input
            disabled={!isEnabled}
            value={form.audience}
            onChange={e => setForm({ ...form, audience: e.target.value })}
            placeholder="https://api.yourapp.com"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline"
          disabled={!isEnabled}
          onClick={async () => {
            try {
              const headers: any = { "Content-Type": "application/json" };
              const token =
                localStorage.getItem(`tenant_token_${orgId}`) ||
                localStorage.getItem("tenant_token") ||
                "";
              if (token) headers.Authorization = `Bearer ${token}`;
              const res = await fetch(`/api/tenant/${tenantId}/auth0/validate`, { headers });
              const data = await res.json();
              if (res.ok && data?.valid)
                toast({
                  title: "Auth0 config looks good",
                  description: "You can test when applied.",
                });
              else
                toast({
                  title: "Auth0 config invalid",
                  description: data?.message || "Fix settings and try again",
                  variant: "destructive",
                });
            } catch (e: any) {
              toast({
                title: "Validation failed",
                description: e?.message || "Unknown error",
                variant: "destructive",
              });
            }
          }}
        >
          Validate
        </Button>
        <Button disabled={!isEnabled} onClick={submitRequest}>
          Request Update
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(expectedRedirect);
          }}
        >
          Copy Redirect URI
        </Button>
        {!isEnabled && (
          <span className="text-xs text-slate-500">
            Auth0 module is disabled. Request enable in the list below.
          </span>
        )}
      </div>
    </div>
  );
}

function ProviderSamlCard({
  orgId,
  tenantId,
  provider,
  isEnabled,
}: {
  orgId: string;
  tenantId?: string;
  provider?: any;
  isEnabled: boolean;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    entryPoint: provider?.config?.entryPoint || "",
    issuer: provider?.config?.issuer || "",
    cert: "",
  });
  const acsUrl = `${window.location.protocol}//${window.location.host}/api/auth/saml/callback`;

  const submitRequest = async () => {
    try {
      const res = await fetch(`/api/tenant/${tenantId}/auth/providers/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "saml", config: { ...form, redirectUri: acsUrl } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed");
      toast({ title: "Submitted", description: "Provider change request sent to admin" });
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium">SAML</p>
          <p className="text-xs text-slate-500">Enterprise SSO via SAML 2.0</p>
        </div>
        <Badge variant={provider ? "default" : "secondary"}>
          {provider ? "Configured" : "Not configured"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Entry Point</Label>
          <Input
            disabled={!isEnabled}
            value={form.entryPoint}
            onChange={e => setForm({ ...form, entryPoint: e.target.value })}
            placeholder="https://idp.example.com/sso"
          />
        </div>
        <div>
          <Label className="text-xs">Issuer</Label>
          <Input
            disabled={!isEnabled}
            value={form.issuer}
            onChange={e => setForm({ ...form, issuer: e.target.value })}
            placeholder="urn:your-app"
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Certificate (PEM)</Label>
          <Textarea
            disabled={!isEnabled}
            value={form.cert}
            onChange={e => setForm({ ...form, cert: e.target.value })}
            placeholder="-----BEGIN CERTIFICATE-----..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline"
          disabled={!isEnabled}
          onClick={async () => {
            try {
              const headers: any = { "Content-Type": "application/json" };
              const token =
                localStorage.getItem(`tenant_token_${orgId}`) ||
                localStorage.getItem("tenant_token") ||
                "";
              if (token) headers.Authorization = `Bearer ${token}`;
              const res = await fetch(`/api/tenant/${tenantId}/saml/validate`, { headers });
              const data = await res.json();
              if (res.ok && data?.valid)
                toast({
                  title: "SAML config looks good",
                  description: "You can test when applied.",
                });
              else
                toast({
                  title: "SAML config invalid",
                  description: data?.message || "Fix settings and try again",
                  variant: "destructive",
                });
            } catch (e: any) {
              toast({
                title: "Validation failed",
                description: e?.message || "Unknown error",
                variant: "destructive",
              });
            }
          }}
        >
          Validate
        </Button>
        <Button disabled={!isEnabled} onClick={submitRequest}>
          Request Update
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(acsUrl);
          }}
        >
          Copy ACS URL
        </Button>
        {!isEnabled && (
          <span className="text-xs text-slate-500">
            SAML module is disabled. Request enable in the list below.
          </span>
        )}
      </div>
    </div>
  );
}
