import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Copy,
  Settings,
  ChevronRight,
  Building2,
  FileText,
  CreditCard,
  GraduationCap,
  Landmark
} from "lucide-react";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Schema definitions for forms
const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

const permissionSchema = z.object({
  key: z.string().min(2, "Permission key must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

const rbacConfigSchema = z.object({
  permissionTemplate: z.enum(["standard", "enterprise", "custom"]),
  businessType: z.enum(["general", "healthcare", "finance", "education", "government"]),
});

type RoleForm = z.infer<typeof roleSchema>;
type PermissionForm = z.infer<typeof permissionSchema>;
type RBACConfigForm = z.infer<typeof rbacConfigSchema>;

// Permission templates by business type
const PERMISSION_TEMPLATES = {
  general: {
    standard: [
      { key: "user.create", description: "Create users", category: "User Management" },
      { key: "user.read", description: "View users", category: "User Management" },
      { key: "user.update", description: "Edit users", category: "User Management" },
      { key: "user.delete", description: "Delete users", category: "User Management" },
      { key: "role.create", description: "Create roles", category: "Role Management" },
      { key: "role.read", description: "View roles", category: "Role Management" },
      { key: "role.update", description: "Edit roles", category: "Role Management" },
      { key: "role.delete", description: "Delete roles", category: "Role Management" },
    ],
    enterprise: [
      { key: "user.create", description: "Create users", category: "User Management" },
      { key: "user.read", description: "View users", category: "User Management" },
      { key: "user.update", description: "Edit users", category: "User Management" },
      { key: "user.delete", description: "Delete users", category: "User Management" },
      { key: "role.create", description: "Create roles", category: "Role Management" },
      { key: "role.read", description: "View roles", category: "Role Management" },
      { key: "role.update", description: "Edit roles", category: "Role Management" },
      { key: "role.delete", description: "Delete roles", category: "Role Management" },
      { key: "audit.read", description: "View audit logs", category: "Audit & Compliance" },
      { key: "system.config", description: "System configuration", category: "System Administration" },
      { key: "integration.manage", description: "Manage integrations", category: "System Administration" },
      { key: "report.generate", description: "Generate reports", category: "Reporting" },
      { key: "security.manage", description: "Security settings", category: "Security" },
    ]
  },
  healthcare: {
    standard: [
      { key: "patient.create", description: "Create patient records", category: "Patient Management" },
      { key: "patient.read", description: "View patient records", category: "Patient Management" },
      { key: "patient.update", description: "Update patient records", category: "Patient Management" },
      { key: "appointment.create", description: "Schedule appointments", category: "Scheduling" },
      { key: "appointment.read", description: "View appointments", category: "Scheduling" },
      { key: "medical.record.read", description: "Access medical records", category: "Medical Records" },
    ]
  },
  finance: {
    standard: [
      { key: "account.create", description: "Create accounts", category: "Account Management" },
      { key: "account.read", description: "View accounts", category: "Account Management" },
      { key: "transaction.create", description: "Create transactions", category: "Transaction Management" },
      { key: "transaction.read", description: "View transactions", category: "Transaction Management" },
      { key: "compliance.read", description: "Access compliance data", category: "Compliance" },
    ]
  }
};

// Default roles by business type
const DEFAULT_ROLES = {
  general: {
    standard: [
      { name: "Admin", description: "Full system access", permissions: ["*"] },
      { name: "Manager", description: "Management-level access", permissions: ["user.read", "role.read"] },
      { name: "User", description: "Basic user access", permissions: ["user.read"] },
    ]
  },
  healthcare: {
    standard: [
      { name: "Doctor", description: "Full patient access", permissions: ["patient.*", "medical.record.*", "appointment.*"] },
      { name: "Nurse", description: "Patient care access", permissions: ["patient.read", "patient.update", "appointment.read"] },
      { name: "Receptionist", description: "Appointment management", permissions: ["appointment.*", "patient.read"] },
    ]
  },
  finance: {
    standard: [
      { name: "Financial Manager", description: "Full financial access", permissions: ["account.*", "transaction.*", "compliance.read"] },
      { name: "Accountant", description: "Transaction management", permissions: ["account.read", "transaction.*"] },
      { name: "Auditor", description: "Read-only access", permissions: ["account.read", "transaction.read", "compliance.read"] },
    ]
  }
};

export default function RBACManagementPage() {
  const { tenantId } = useParams();
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingPermission, setEditingPermission] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tenant roles and permissions
  const { data: roles = [] } = useQuery({
    queryKey: ["/api/tenants", tenantId, "roles"],
    enabled: !!tenantId,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["/api/tenants", tenantId, "permissions"],
    enabled: !!tenantId,
  });

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  // Forms
  const roleForm = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "", permissions: [] },
  });

  const permissionForm = useForm<PermissionForm>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { key: "", description: "", category: "" },
  });

  const configForm = useForm<RBACConfigForm>({
    resolver: zodResolver(rbacConfigSchema),
    defaultValues: {
      permissionTemplate: "standard",
      businessType: "general",
    },
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleForm) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "Role created successfully" });
      setIsRoleDialogOpen(false);
      roleForm.reset();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleForm }) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "Role updated successfully" });
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tenants/${tenantId}/roles/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "Role deleted successfully" });
    },
  });

  // Helper functions
  const handleEditRole = (role: any) => {
    setEditingRole(role);
    roleForm.reset({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setIsRoleDialogOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const onRoleSubmit = (data: RoleForm) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  const businessTypeInfo = {
    general: { icon: Building2, label: "General Business", description: "Standard business operations" },
    healthcare: { icon: FileText, label: "Healthcare", description: "Healthcare providers and medical facilities" },
    finance: { icon: CreditCard, label: "Finance", description: "Financial institutions and services" },
    education: { icon: GraduationCap, label: "Education", description: "Schools and educational institutions" },
    government: { icon: Landmark, label: "Government", description: "Government agencies and public sector" },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">RBAC Management</h1>
              <p className="text-sm text-slate-600">Roles, permissions and access control for {(tenant as any)?.name || 'this tenant'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          </TabsList>

          {/* RBAC Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>RBAC Configuration</CardTitle>
                <CardDescription>
                  Configure permission templates and business type settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...configForm}>
                  <form className="space-y-6">
                    {/* Permission Template Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Permission Template</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          {
                            value: "standard",
                            label: "Standard",
                            description: "Basic set of permissions for general use",
                            recommended: true,
                          },
                          {
                            value: "enterprise",
                            label: "Enterprise",
                            description: "Advanced permissions with audit and compliance features",
                            recommended: false,
                          },
                          {
                            value: "custom",
                            label: "Custom",
                            description: "Build your own permission set from scratch",
                            recommended: false,
                          },
                        ].map((template) => (
                          <Card
                            key={template.value}
                            className="relative cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-4">
                              {template.recommended && (
                                <Badge className="absolute -top-2 -right-2 bg-blue-500">
                                  Recommended
                                </Badge>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                <Settings className="h-5 w-5 text-blue-500" />
                                <h4 className="font-semibold">{template.label}</h4>
                              </div>
                              <p className="text-sm text-slate-600">{template.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Business Type Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Business Type</h3>
                      <p className="text-sm text-slate-600">
                        Choose your business type to get industry-specific role templates and permissions
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(businessTypeInfo).map(([type, info]) => {
                          const Icon = info.icon;
                          return (
                            <Card
                              key={type}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <Icon className="h-5 w-5 text-blue-500" />
                                  <h4 className="font-semibold">{info.label}</h4>
                                </div>
                                <p className="text-sm text-slate-600">{info.description}</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" className="px-6">
                        Apply Configuration
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Roles Management</h2>
                <p className="text-sm text-slate-600">Create and manage user roles</p>
              </div>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingRole(null);
                    roleForm.reset();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRole ? "Edit Role" : "Create New Role"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRole ? "Update role details and permissions" : "Define a new role with specific permissions"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...roleForm}>
                    <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
                      <FormField
                        control={roleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Admin, Manager, User" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={roleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the role's purpose and scope" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={roleForm.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permissions</FormLabel>
                            <FormDescription>
                              Select the permissions for this role
                            </FormDescription>
                            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                              {Array.isArray(permissions) && permissions.length > 0 ? (
                                permissions.map((permission: any) => (
                                  <div key={permission.key} className="flex items-center space-x-2 py-2">
                                    <Checkbox
                                      id={permission.key}
                                      checked={field.value?.includes(permission.key)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, permission.key]);
                                        } else {
                                          field.onChange(current.filter((p: string) => p !== permission.key));
                                        }
                                      }}
                                    />
                                    <label htmlFor={permission.key} className="text-sm font-medium cursor-pointer">
                                      {permission.key}
                                    </label>
                                    {permission.description && (
                                      <span className="text-xs text-slate-600">- {permission.description}</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-600 text-center py-4">
                                  No permissions available. Create some permissions first.
                                </p>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
                          {editingRole ? "Update Role" : "Create Role"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Roles List */}
            <div className="grid gap-4">
              {Array.isArray(roles) && roles.length > 0 ? (
                roles.map((role: any) => (
                  <Card key={role.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h3 className="font-semibold">{role.name}</h3>
                            {role.isSystem && <Badge variant="secondary">System</Badge>}
                          </div>
                          {role.description && (
                            <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {role.permissions?.map((permission: string) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="font-semibold mb-2">No roles defined</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Start by creating roles to organize permissions for your users
                    </p>
                    <Button onClick={() => setIsRoleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Role
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Permissions Management</h2>
                <p className="text-sm text-slate-600">Define granular permissions for your application</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </div>

            {/* Permissions would be displayed here */}
            <Card>
              <CardContent className="p-8 text-center">
                <Key className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="font-semibold mb-2">Permissions interface</h3>
                <p className="text-sm text-slate-600">
                  Permission CRUD interface will be implemented next...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Role Assignments</CardTitle>
                <CardDescription>
                  Manage which users have which roles
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="font-semibold mb-2">User assignments interface</h3>
                <p className="text-sm text-slate-600">
                  User role assignment interface coming next...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}