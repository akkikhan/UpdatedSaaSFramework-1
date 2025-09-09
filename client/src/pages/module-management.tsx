import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MODULE_DEPENDENCIES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Shield,
  Key,
  Cloud,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  Search,
  FileText,
  Bell,
  Bot,
  Package,
  BarChart3,
  RotateCcw,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  orgId: string;
  adminEmail: string;
  status: string;
  enabledModules: string[];
  moduleConfigs: Record<string, any>;
}

const moduleUpdateSchema = z.object({
  enabledModules: z.array(z.string()),
  moduleConfigs: z.record(z.any()).optional(),
  notifyTenant: z.boolean().optional(),
});

type ModuleUpdateFormData = z.infer<typeof moduleUpdateSchema>;

const availableModules = [
  {
    id: "auth",
    name: "Core Authentication",
    description: "JWT-based authentication with user management",
    icon: Key,
    category: "Authentication",
    required: true,
  },
  {
    id: "rbac",
    name: "Role-Based Access Control",
    description: "Advanced role and permission management system",
    icon: Shield,
    category: "Authorization",
    required: true,
  },
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    description: "Single sign-on with Microsoft Azure AD",
    icon: Cloud,
    category: "SSO",
    configurable: true,
  },
  {
    id: "auth0",
    name: "Auth0 Integration",
    description: "Universal authentication with Auth0 platform",
    icon: Users,
    category: "SSO",
    configurable: true,
  },
  {
    id: "saml",
    name: "SAML SSO",
    description: "SAML-based single sign-on integration",
    icon: Settings,
    category: "SSO",
    configurable: true,
  },
  {
    id: "logging",
    name: "Logging & Monitoring",
    description: "Comprehensive audit trail and security monitoring",
    icon: FileText,
    category: "Operations",
    configurable: true,
    priority: "high",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Multi-channel messaging and alerts system",
    icon: Bell,
    category: "Communication",
    configurable: true,
    priority: "medium",
  },
  {
    id: "ai-copilot",
    name: "AI Copilot",
    description: "Intelligent automation and user assistance",
    icon: Bot,
    category: "AI/ML",
    configurable: true,
    priority: "low",
  },
];

// Define module dependency relationships. Key is module requiring other modules.

export default function ModuleManagementPage() {
  const [searchTenant, setSearchTenant] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingModules, setEditingModules] = useState(false);
  const { toast } = useToast();

  const form = useForm<ModuleUpdateFormData>({
    resolver: zodResolver(moduleUpdateSchema),
    defaultValues: {
      enabledModules: ["auth", "rbac"],
      moduleConfigs: {},
      notifyTenant: false,
    },
  });

  // Get all tenants
  const tenantsQuery = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tenants");
      return (await res.json()) as Tenant[];
    },
  });

  // Preselect logic moved below handleTenantSelect function

  // Update tenant modules mutation
  const updateModulesMutation = useMutation({
    mutationFn: async (data: {
      tenantId: string;
      modules: ModuleUpdateFormData;
      notify?: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/tenants/${data.tenantId}/modules`, data.modules);
      return res.json();
    },
    onSuccess: async (_, variables) => {
      const previous = selectedTenant?.enabledModules || [];
      const current = variables.modules.enabledModules || [];

      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Modules Updated",
        description: "Tenant modules have been successfully updated.",
      });
      setEditingModules(false);
      // Update selected tenant
      if (selectedTenant?.id === variables.tenantId) {
        const updatedTenant = tenantsQuery.data?.find(t => t.id === variables.tenantId);
        if (updatedTenant) {
          setSelectedTenant(updatedTenant);
        }
      }

      if (variables.notify) {
        const enabledDiff = current.filter(m => !previous.includes(m));
        const disabledDiff = previous.filter(m => !current.includes(m));

        try {
          await apiRequest("POST", `/api/tenants/${variables.tenantId}/notify-module-change`, {
            enabled: enabledDiff,
            disabled: disabledDiff,
          });
          // Flag the tenant portal to display snackbar notifications on next login
          localStorage.setItem(`notifyModules-${variables.tenantId}`, Date.now().toString());
          toast({
            title: "Tenant Notified",
            description: "Notification and email sent.",
          });
        } catch (e: any) {
          toast({
            title: "Notification Failed",
            description: e?.message || "Could not notify tenant",
            variant: "destructive",
          });
        }
      }
    },
    onError: error => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update modules",
        variant: "destructive",
      });
    },
  });

  const filteredTenants =
    tenantsQuery.data?.filter(
      tenant =>
        tenant.name.toLowerCase().includes(searchTenant.toLowerCase()) ||
        tenant.orgId.toLowerCase().includes(searchTenant.toLowerCase()) ||
        tenant.adminEmail.toLowerCase().includes(searchTenant.toLowerCase())
    ) || [];

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    form.reset({
      enabledModules: tenant.enabledModules || ["auth", "rbac"],
      moduleConfigs: tenant.moduleConfigs || {},
      notifyTenant: false,
    });
    setEditingModules(false);
  };

  // Auto-preselect tenant from URL param
  const searchParams = new URLSearchParams(window.location.search);
  const preselectId = searchParams.get("tenantId");
  if (preselectId && tenantsQuery.data && !selectedTenant) {
    const found = tenantsQuery.data.find(t => t.id === preselectId);
    if (found) {
      handleTenantSelect(found);
    }
  }

  const onSubmit = (data: ModuleUpdateFormData) => {
    if (!selectedTenant) return;

    const { notifyTenant, ...rest } = data;
    let payload = { ...rest };
    const addedDeps = new Set<string>();

    for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
      if (payload.enabledModules.includes(mod)) {
        deps.forEach(dep => {
          if (!payload.enabledModules.includes(dep)) {
            payload.enabledModules.push(dep);
            addedDeps.add(dep);
          }
        });
      }
    }

    if (addedDeps.size > 0) {
      toast({
        title: "Dependencies added",
        description: `${Array.from(addedDeps).join(", ")} enabled due to dependencies.`,
      });
    }

    updateModulesMutation.mutate({
      tenantId: selectedTenant.id,
      modules: payload,
      notify: notifyTenant,
    });
  };

  const getModuleStatus = (moduleId: string) => {
    if (!selectedTenant) return false;
    return selectedTenant.enabledModules?.includes(moduleId) || false;
  };

  const getModuleIcon = (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    return module?.icon || Settings;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900">Module Management</h1>
          <p className="text-gray-600 mt-2">
            Configure authentication and authorization modules for tenants
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Compact Tenant Selector */}
          <div className="xl:col-span-1">
            <Card className="bg-white shadow-sm border border-gray-200 h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  Select Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTenant}
                    onChange={e => setSearchTenant(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="input-search-tenants"
                  />
                </div>

                {/* Tenant List */}
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {tenantsQuery.isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading tenants...</div>
                  ) : filteredTenants.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {searchTenant ? "No tenants found" : "No tenants available"}
                    </div>
                  ) : (
                    filteredTenants.map(tenant => (
                      <div
                        key={tenant.id}
                        className={`group cursor-pointer transition-all duration-200 rounded-lg border p-4 hover:shadow-md ${
                          selectedTenant?.id === tenant.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                        onClick={() => handleTenantSelect(tenant)}
                        data-testid={`tenant-card-${tenant.id}`}
                      >
                        <div className="space-y-3">
                          {/* Tenant Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {tenant.name}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">{tenant.orgId}</p>
                            </div>
                            <Badge
                              variant={tenant.status === "active" ? "default" : "secondary"}
                              className={`ml-2 ${tenant.status === "active" ? "bg-green-100 text-green-800 border-green-200" : ""}`}
                            >
                              {tenant.status}
                            </Badge>
                          </div>

                          {/* Module Count */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Settings className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {(tenant.enabledModules || ["auth", "rbac"]).length} modules
                              </span>
                            </div>
                            {selectedTenant?.id === tenant.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Module Configuration */}
          <div className="xl:col-span-3 space-y-6">
            {selectedTenant ? (
              <>
                {/* Module Configuration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Settings className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-semibold text-gray-900">
                            Modules for {selectedTenant.name}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Configure authentication and feature modules
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {!editingModules ? (
                          <Button
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => setEditingModules(true)}
                            data-testid="button-edit-modules"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Modules
                          </Button>
                        ) : (
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setEditingModules(false);
                                form.reset({
                                  enabledModules: selectedTenant.enabledModules || ["auth", "rbac"],
                                  moduleConfigs: selectedTenant.moduleConfigs || {},
                                  notifyTenant: false,
                                });
                              }}
                              data-testid="button-cancel-edit"
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              onClick={form.handleSubmit(onSubmit)}
                              disabled={updateModulesMutation.isPending}
                              data-testid="button-save-modules"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {updateModulesMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                          {(editingModules
                            ? availableModules
                            : availableModules.filter(m => getModuleStatus(m.id))
                          ).map(module => {
                            const Icon = module.icon;
                            const isEnabled = editingModules
                              ? form.watch("enabledModules")?.includes(module.id)
                              : getModuleStatus(module.id);

                            return (
                              <div
                                key={module.id}
                                className={`group relative bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                                  isEnabled
                                    ? "border-green-200 bg-green-50/30 shadow-md"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                data-testid={`module-card-${module.id}`}
                              >
                                <div className="p-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                      {/* Enhanced Module Icon */}
                                      <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                          isEnabled
                                            ? "bg-green-100 text-green-600 ring-2 ring-green-200"
                                            : "bg-gray-100 text-gray-400"
                                        }`}
                                      >
                                        <Icon className="h-6 w-6" />
                                      </div>

                                      {/* Module Info */}
                                      <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-semibold text-gray-900 text-base">
                                            {module.name}
                                          </h3>
                                          <Badge
                                            variant="secondary"
                                            className={`text-xs px-2 py-1 ${
                                              module.category === "Core"
                                                ? "bg-blue-100 text-blue-800"
                                                : module.category === "SSO"
                                                  ? "bg-purple-100 text-purple-800"
                                                  : module.category === "Operations"
                                                    ? "bg-orange-100 text-orange-800"
                                                    : module.category === "Communication"
                                                      ? "bg-teal-100 text-teal-800"
                                                      : "bg-gray-100 text-gray-800"
                                            }`}
                                          >
                                            {module.category}
                                          </Badge>
                                          {module.required && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                          {module.description}
                                        </p>

                                        {/* Configuration Preview */}
                                        {isEnabled &&
                                          module.configurable &&
                                          selectedTenant.moduleConfigs?.[module.id] && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Settings className="h-3 w-3 text-blue-600" />
                                                <span className="text-xs font-medium text-blue-900">
                                                  Configuration Active
                                                </span>
                                              </div>
                                              <div className="text-xs text-blue-800 bg-white rounded p-2 border">
                                                <pre className="whitespace-pre-wrap break-words">
                                                  {JSON.stringify(
                                                    selectedTenant.moduleConfigs[module.id],
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex flex-col items-end gap-3">
                                      {/* Status Icon */}
                                      <div
                                        className={`p-2 rounded-full ${isEnabled ? "bg-green-100" : "bg-gray-100"}`}
                                      >
                                        {isEnabled ? (
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                          <XCircle className="h-5 w-5 text-gray-400" />
                                        )}
                                      </div>

                                      {/* Edit Toggle */}
                                      {editingModules && (
                                        <FormField
                                          control={form.control}
                                          name="enabledModules"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Switch
                                                  checked={field.value?.includes(module.id)}
                                                  onCheckedChange={checked => {
                                                    const current = field.value || [];
                                                    if (!checked) {
                                                      if (module.required) {
                                                        toast({
                                                          title: "Required Module",
                                                          description: `${module.name} cannot be disabled.`,
                                                          variant: "destructive",
                                                        });
                                                        return;
                                                      }

                                                      const dependents = Object.entries(
                                                        MODULE_DEPENDENCIES
                                                      )
                                                        .filter(([mod, deps]) =>
                                                          deps.includes(module.id)
                                                        )
                                                        .map(([mod]) => mod)
                                                        .filter(mod => current.includes(mod));

                                                      if (dependents.length > 0) {
                                                        toast({
                                                          title: "Dependency conflict",
                                                          description: `${module.name} is required by ${dependents.join(", ")}. Disable dependent modules first.`,
                                                          variant: "destructive",
                                                        });
                                                        return;
                                                      }

                                                      field.onChange(
                                                        current.filter(id => id !== module.id)
                                                      );
                                                    } else {
                                                      const deps =
                                                        MODULE_DEPENDENCIES[module.id] || [];
                                                      const additions = deps.filter(
                                                        dep => !current.includes(dep)
                                                      );
                                                      if (additions.length > 0) {
                                                        toast({
                                                          title: "Dependencies added",
                                                          description: `${additions.join(", ")} enabled due to dependency.`,
                                                        });
                                                      }
                                                      field.onChange([
                                                        ...current,
                                                        module.id,
                                                        ...additions,
                                                      ]);
                                                    }
                                                  }}
                                                  data-testid={`switch-${module.id}`}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <FormField
                          control={form.control}
                          name="notifyTenant"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Notify tenant about changes
                                </FormLabel>
                              </div>
                              <FormDescription>
                                Emails and dashboard alerts are sent after a short delay.
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Logging Settings (Platform Admin editable) */}
                {selectedTenant.enabledModules?.includes("logging") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Logging Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">Levels</Label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(["error", "warning", "info", "debug"] as const).map(lvl => (
                                  <FormField
                                    key={lvl}
                                    control={form.control}
                                    name="moduleConfigs.logging.levels"
                                    render={({ field }) => {
                                      const list: string[] = Array.isArray(field.value)
                                        ? (field.value as string[])
                                        : ["error", "warning", "info"];
                                      const checked = list.includes(lvl);
                                      return (
                                        <button
                                          type="button"
                                          className={`px-2 py-1 rounded text-xs border ${
                                            checked
                                              ? "bg-blue-50 border-blue-300"
                                              : "bg-slate-50 border-slate-200"
                                          }`}
                                          onClick={() => {
                                            const next = checked
                                              ? list.filter(v => v !== lvl)
                                              : Array.from(new Set([...list, lvl]));
                                            form.setValue("moduleConfigs.logging.levels", next);
                                          }}
                                        >
                                          {lvl}
                                        </button>
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">Destinations</Label>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">database</Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Database only for v1. External sinks coming soon.
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Retention Days</Label>
                              <FormField
                                control={form.control}
                                name="moduleConfigs.logging.retentionDays"
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={field.value ?? 30}
                                    onChange={e =>
                                      field.onChange(parseInt(e.target.value || "30", 10))
                                    }
                                  />
                                )}
                              />
                              <div className="mt-2 flex items-center gap-2">
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.logging.redactionEnabled"
                                  render={({ field }) => (
                                    <>
                                      <input
                                        id="admin-redaction"
                                        type="checkbox"
                                        checked={!!field.value}
                                        onChange={e => field.onChange(e.target.checked)}
                                        aria-label="Enable PII redaction"
                                      />
                                      <Label htmlFor="admin-redaction" className="text-xs">
                                        Enable PII redaction
                                      </Label>
                                    </>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button type="submit" disabled={updateModulesMutation.isPending}>
                              <Save className="h-4 w-4 mr-2" />
                              {updateModulesMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          Tip: Use Tenant Portal to view the Logging API key and try the Quickstart.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await apiRequest("POST", "/api/admin/logging/test-event", {
                                tenantId: selectedTenant.id,
                                level: "info",
                                category: "admin-test",
                                message: "Logging test from Platform Admin",
                              });
                              toast({ title: "Sent", description: "Test log event created" });
                            } catch (e: any) {
                              toast({
                                title: "Failed",
                                description: e?.message || "Could not send test event",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Send Test Event
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Module Statistics */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                      <span className="text-xl font-semibold text-gray-900">Module Statistics</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Overview of {selectedTenant.name}'s module configuration
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="group relative p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-green-200 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-700" />
                          </div>
                          <div className="text-3xl font-bold text-green-700">
                            {selectedTenant.enabledModules?.length || 0}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-green-800">Enabled Modules</div>
                          <div className="text-xs text-green-600">Currently active</div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-blue-200 rounded-lg">
                            <Package className="h-5 w-5 text-blue-700" />
                          </div>
                          <div className="text-3xl font-bold text-blue-700">
                            {availableModules.length}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-blue-800">Available Modules</div>
                          <div className="text-xs text-blue-600">Total in system</div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-purple-200 rounded-lg">
                            <Shield className="h-5 w-5 text-purple-700" />
                          </div>
                          <div className="text-3xl font-bold text-purple-700">
                            {selectedTenant.enabledModules?.filter(
                              m => availableModules.find(am => am.id === m)?.category === "SSO"
                            ).length || 0}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-purple-800">SSO Modules</div>
                          <div className="text-xs text-purple-600">Authentication systems</div>
                        </div>
                      </div>

                      <div className="group relative p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-amber-200 rounded-lg">
                            <Settings className="h-5 w-5 text-amber-700" />
                          </div>
                          <div className="text-3xl font-bold text-amber-700">
                            {Object.keys(selectedTenant.moduleConfigs || {}).length}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-amber-800">Configured</div>
                          <div className="text-xs text-amber-600">Custom settings applied</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Quick Actions</h4>
                          <p className="text-xs text-gray-600 mt-1">Common management tasks</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setEditingModules(true)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Modules
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              /* Add reset action */
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reset Config
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="min-h-[600px] flex items-center justify-center border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                <div className="text-center max-w-md mx-auto p-8">
                  <div className="mb-6">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <Settings className="h-12 w-12 text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">Select a Tenant</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Choose a tenant from the list above to manage their module configuration, view
                    statistics, and customize their platform experience.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{tenantsQuery.data?.length || 0} tenants available</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Package className="h-4 w-4" />
                      <span>{availableModules.length} modules ready</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
