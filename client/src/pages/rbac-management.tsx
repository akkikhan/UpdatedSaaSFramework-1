import { useState, useEffect } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  Building2,
  FileText,
  CreditCard,
  GraduationCap,
  Landmark,
  CheckCircle,
} from "lucide-react";

import { useParams, Link } from "wouter";

import { useToast } from "@/hooks/use-toast";

const businessTypeIcons: Record<string, typeof Building2> = {
  general: Building2,

  healthcare: FileText,

  finance: CreditCard,

  education: GraduationCap,

  government: Landmark,
};

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
  permissionTemplateId: z.string().optional(),

  permissionTemplate: z.string().optional(),

  businessTypeId: z.string().optional(),

  businessType: z.string().optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

type PermissionForm = z.infer<typeof permissionSchema>;

type RBACConfigForm = z.infer<typeof rbacConfigSchema>;

export default function RBACManagementPage() {
  const { tenantId } = useParams();

  const tenantToken = typeof window !== "undefined" ? localStorage.getItem("tenantToken") : null;

  const platformAdminToken =
    typeof window !== "undefined" ? localStorage.getItem("platformAdminToken") : null;

  const authToken = tenantToken || platformAdminToken;

  const isPlatformAdmin = !!platformAdminToken && !tenantToken;

  const rbacBase = isPlatformAdmin ? "/api/admin/rbac" : "/api/v2/rbac";

  const [activeSection, setActiveSection] = useState("configuration");

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  const [editingRole, setEditingRole] = useState<any>(null);

  const [editingPermission, setEditingPermission] = useState<any>(null);

  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Fetch tenant data

  const { data: tenant } = useQuery({
    queryKey: ["/api/tenants", tenantId],

    enabled: !!tenantId,
  });

  const { data: roles = [], refetch: refetchRoles } = useQuery({
    queryKey: ["roles", tenantId],

    enabled: !!tenantId && !!authToken,

    queryFn: async () => {
      const res = await fetch(`${rbacBase}/roles`, {
        headers: {
          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },
      });

      if (!res.ok) throw new Error("Failed to load roles");

      return res.json();
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions", tenantId],

    enabled: !!tenantId && !!authToken,

    queryFn: async () => {
      const res = await fetch(`${rbacBase}/permissions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },
      });

      if (!res.ok) throw new Error("Failed to load permissions");

      return res.json();
    },
  });

  const { data: permissionTemplateCatalog = [] } = useQuery({
    queryKey: ["rbac-catalog-templates", tenantId],

    enabled: !!tenantId && !!authToken,

    queryFn: async () => {
      const res = await fetch(`/api/tenant/${tenantId}/rbac/catalog/templates`, {
        headers: {
          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },
      });

      if (!res.ok) throw new Error("Failed to load permission templates");

      return res.json();
    },
  });

  const { data: businessTypeCatalog = [] } = useQuery({
    queryKey: ["rbac-catalog-business-types", tenantId],

    enabled: !!tenantId && !!authToken,

    queryFn: async () => {
      const res = await fetch(`/api/tenant/${tenantId}/rbac/catalog/business-types`, {
        headers: {
          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },
      });

      if (!res.ok) throw new Error("Failed to load business types");

      return res.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", tenantId],

    enabled: !!tenantId && !!authToken,

    queryFn: async () => {
      const res = await fetch(`/auth/users`, {
        headers: {
          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },
      });

      if (!res.ok) throw new Error("Failed to load users");

      return res.json();
    },
  });

  useEffect(() => {
    if (!tenantId || !authToken || !users.length) return;

    (async () => {
      const map: Record<string, string> = {};

      for (const u of users) {
        const res = await fetch(`${rbacBase}/users/${u.id}/roles`, {
          headers: {
            Authorization: `Bearer ${authToken}`,

            "x-tenant-id": tenantId as string,
          },
        });

        if (res.ok) {
          const data = await res.json();

          if (Array.isArray(data) && data[0]) map[u.id] = data[0].id;
        }
      }

      setUserRoles(map);
    })();
  }, [tenantId, authToken, users]);

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
      permissionTemplateId: undefined,

      permissionTemplate: "standard",

      businessTypeId: undefined,

      businessType: "general",
    },
  });

  const systemRoles = Array.isArray(roles) ? roles.filter((role: any) => role.isSystem) : [];

  // Mutations

  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleForm) => {
      const response = await fetch(`${rbacBase}/roles`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${authToken}`,

          "x-tenant-id": tenantId as string,
        },

        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create role");

      return response.json();
    },

    onSuccess: () => {
      refetchRoles();

      toast({ title: "Role created successfully" });

      setIsRoleDialogOpen(false);

      roleForm.reset();
    },
  });

  const renderConfiguration = () => {
    const templateCards = Array.isArray(permissionTemplateCatalog)
      ? (permissionTemplateCatalog as any[]).map(template => {
          const permissions = Array.isArray(template.permissions) ? template.permissions : [];

          return {
            id: template.id || template.name,

            name: template.name || template.id || "Template",

            description:
              template.description ||
              `${permissions.length} permission${permissions.length === 1 ? "" : "s"} available`,

            permissionCount: permissions.length,

            isDefault: Boolean(template.isDefault),
          };
        })
      : [];

    const businessTypeCards = Array.isArray(businessTypeCatalog)
      ? (businessTypeCatalog as any[]).map(type => ({
          id: type.id || type.name,

          name: type.name || type.id || "Business Type",

          description: type.description || "Business profile",

          riskLevel: type.riskLevel,
        }))
      : [];

    const currentRbacConfig = ((tenant as any)?.moduleConfigs || {}).rbac || {};

    const templateIdentifier = (
      currentRbacConfig.permissionTemplateId ||
      currentRbacConfig.permissionTemplate ||
      ""
    ).toString();

    const businessIdentifier = (
      currentRbacConfig.businessTypeId ||
      currentRbacConfig.businessType ||
      ""
    ).toString();

    const currentTemplate = templateCards.find(card => {
      const candidate = (card.id || card.name || "").toString();

      return (
        candidate === templateIdentifier ||
        candidate.toLowerCase() === templateIdentifier.toLowerCase()
      );
    });

    const currentBusinessType = businessTypeCards.find(card => {
      const candidate = (card.id || card.name || "").toString();

      return (
        candidate === businessIdentifier ||
        candidate.toLowerCase() === businessIdentifier.toLowerCase()
      );
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            RBAC Configuration
          </CardTitle>

          <CardDescription>
            Configure permission templates and business type settings for this tenant
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Permission Templates</h3>

            {templateCards.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templateCards.map(card => (
                  <Card
                    key={card.id}
                    className="relative cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      {card.isDefault && (
                        <Badge className="absolute -top-2 -right-2 bg-blue-500">Default</Badge>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-500" />

                        <h4 className="font-semibold">{card.name}</h4>
                      </div>

                      <p className="text-sm text-slate-600 mb-2">{card.description}</p>

                      <p className="text-xs text-blue-600 font-medium">
                        {card.permissionCount} permission{card.permissionCount === 1 ? "" : "s"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No permission templates available for this tenant.
              </p>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Business Types</h3>

            <p className="text-sm text-slate-600 mb-4">
              Choose your business type to get industry-specific role templates and permission sets
              tailored to your operations.
            </p>

            {businessTypeCards.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessTypeCards.map(card => {
                  const iconKey = (card.name || "").toLowerCase();

                  const Icon = businessTypeIcons[iconKey] || Building2;

                  return (
                    <Card
                      key={card.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-blue-500" />

                          <h4 className="font-semibold">{card.name}</h4>

                          {card.riskLevel && (
                            <Badge variant="outline" className="uppercase text-[10px]">
                              {card.riskLevel}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600">{card.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No business types have been configured yet.</p>
            )}
          </div>

          {(currentTemplate || currentBusinessType) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />

                <div>
                  <h4 className="font-semibold text-blue-900">Current Configuration</h4>

                  {currentTemplate && (
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>Permission Template:</strong> {currentTemplate.name} (
                      {currentTemplate.permissionCount} permissions)
                    </p>
                  )}

                  {currentBusinessType && (
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>Business Type:</strong> {currentBusinessType.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Roles Management</h2>

          <p className="text-sm text-slate-600">
            Create and manage user roles with specific permissions
          </p>
        </div>

        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>

              <DialogDescription>
                Define a new role with specific permissions for your users
              </DialogDescription>
            </DialogHeader>

            <Form {...roleForm}>
              <form className="space-y-4">
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRoleDialogOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button type="button">Create Role</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Default Roles Display */}

      <div className="grid gap-4">
        {systemRoles.length ? (
          systemRoles.map(role => (
            <Card key={role.id || role.name}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-500" />

                      <h3 className="font-semibold">{role.name}</h3>

                      <Badge variant="outline">System Role</Badge>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">
                      {role.description || "System generated role"}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(role.permissions || []).map((permission: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">
                No system roles found. Create roles in the Roles tab to seed defaults.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderPermissions = () => {
    const permissionGroups = Array.isArray(permissions)
      ? (permissions as any[]).reduce(
          (acc, permission) => {
            const group = (permission?.category || "Uncategorized") as string;

            if (!acc[group]) acc[group] = [];

            acc[group].push(permission);

            return acc;
          },
          {} as Record<string, any[]>
        )
      : {};

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Permissions Management</h2>

            <p className="text-sm text-slate-600">
              Define granular permissions for your application
            </p>
          </div>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Permission
          </Button>
        </div>

        {/* Permission Categories */}

        <div className="space-y-4">
          {Object.entries(permissionGroups).length ? (
            Object.entries(permissionGroups).map(([category, perms]) => (
              <Card key={category}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="h-5 w-5" />

                    {category}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-3">
                    {(perms as any[]).map(permission => (
                      <div
                        key={permission.id || permission.key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-sm">{permission.key}</div>

                          <div className="text-xs text-slate-600">
                            {permission.description || "No description provided"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button variant="outline" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button variant="outline" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600">No permissions have been defined yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderAssignments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Role Assignments
        </CardTitle>

        <CardDescription>Assign roles to users and manage their permissions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {users.length === 0 ? (
          <p className="text-center text-sm text-slate-600">No users found</p>
        ) : (
          users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{u.email}</p>
              </div>

              <Select
                value={userRoles[u.id] || ""}
                onValueChange={roleId => assignRole(u.id, roleId)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Assign role" />
                </SelectTrigger>

                <SelectContent>
                  {roles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidenav */}

      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-6 w-6 text-blue-500" />

            <span className="font-semibold text-slate-800">RBAC Manager</span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("configuration")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === "configuration"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="h-4 w-4" />
              Configuration
            </button>

            <button
              onClick={() => setActiveSection("roles")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === "roles"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="h-4 w-4" />
              Roles
            </button>

            <button
              onClick={() => setActiveSection("permissions")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === "permissions"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Key className="h-4 w-4" />
              Permissions
            </button>

            <button
              onClick={() => setActiveSection("assignments")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === "assignments"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="h-4 w-4" />
              User Assignments
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}

      <div className="flex-1 flex flex-col">
        {/* Header */}

        <div className="bg-white border-b border-slate-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">RBAC Management</h1>

                <p className="text-sm text-slate-600">
                  Roles, permissions and access control for {(tenant as any)?.name || "this tenant"}
                </p>
              </div>

              <Link href={`/tenants`}>
                <Button variant="outline">← Back to Tenants</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {activeSection === "configuration" && renderConfiguration()}

          {activeSection === "roles" && renderRoles()}

          {activeSection === "permissions" && renderPermissions()}

          {activeSection === "assignments" && renderAssignments()}
        </div>
      </div>
    </div>
  );
}
