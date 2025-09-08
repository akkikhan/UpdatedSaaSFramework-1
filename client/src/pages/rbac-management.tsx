import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle

} from "lucide-react";
import { useParams, Link } from "wouter";
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

  permissionTemplate: z.string(),
  businessType: z.string(),
});

type RoleForm = z.infer<typeof roleSchema>;
type PermissionForm = z.infer<typeof permissionSchema>;
type RBACConfigForm = z.infer<typeof rbacConfigSchema>;



export default function RBACManagementPage() {
  const { tenantId } = useParams();
  const [activeSection, setActiveSection] = useState("configuration");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingPermission, setEditingPermission] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tenant data
  const { data: tenant } = useQuery({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["/api/tenants", tenantId, "roles"],
    enabled: !!tenantId,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["/api/tenants", tenantId, "permissions"],
    enabled: !!tenantId,
  });

  // Pull RBAC configuration options from platform admin APIs
  const { data: permissionTemplates = [] } = useQuery({
    queryKey: ["/api/rbac-config/permission-templates"],
  });

  const { data: businessTypes = [] } = useQuery({
    queryKey: ["/api/rbac-config/business-types"],
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
      permissionTemplate: "",
      businessType: "",
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
      if (!response.ok) throw new Error("Failed to create role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "roles"] });
      toast({ title: "Role created successfully" });
      setIsRoleDialogOpen(false);
      roleForm.reset();
    },
  });

  const permissionTemplatesQuery = useQuery({
    queryKey: ["/api/rbac-config/permission-templates"],
  });
  const businessTypesQuery = useQuery({
    queryKey: ["/api/rbac-config/business-types"],
  });
  const defaultRolesQuery = useQuery({
    queryKey: ["/api/rbac-config/default-roles"],
  });


  const renderConfiguration = () => (
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
          <h3 className="text-lg font-semibold mb-4">Permission Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {permissionTemplatesQuery.data?.map((template: any) => (
              <Card key={template.id} className="relative cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">{template.name}</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                  <p className="text-xs text-blue-600 font-medium">{template.permissions.length} permissions</p>
                </CardContent>
              </Card>
            ))}

          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Business Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessTypesQuery.data?.map((bt: any) => (
              <Card key={bt.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">{bt.name}</h4>
                  </div>
                  <p className="text-sm text-slate-600">{bt.description}</p>
                </CardContent>
              </Card>
            ))}

          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Current Configuration</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Permission Template:</strong>{" "}
                {tenant?.moduleConfigs?.rbac?.permissionTemplate || "N/A"}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Business Type:</strong>{" "}
                {tenant?.moduleConfigs?.rbac?.businessType || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Apply Configuration Changes</Button>
        </div>
      </CardContent>
    </Card>
  );

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
        {defaultRolesQuery.data?.map((role: any) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">{role.name}</h3>
                    <Badge variant="outline">Default</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission: string, idx: number) => (
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
        ))}
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-6">
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

      <div className="space-y-4">
        {permissionTemplatesQuery.data?.[0]?.permissions.map((permission: string, index: number) => (
          <Card key={index}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="font-medium text-sm">{permission}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAssignments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Role Assignments
        </CardTitle>
        <CardDescription>Assign roles to users and manage their permissions</CardDescription>
      </CardHeader>
      <CardContent className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <h3 className="font-semibold mb-2">No users assigned</h3>
        <p className="text-sm text-slate-600 mb-4">
          User assignment functionality will be available once you have users in your tenant
        </p>
        <Button variant="outline">Import Users</Button>
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
