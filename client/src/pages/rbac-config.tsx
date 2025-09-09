import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Save, Shield, Users, Building2, Settings, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  roles?: string[];
  businessTypes: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BusinessType {
  id: string;
  name: string;
  description: string;
  requiredCompliance: string[];
  defaultPermissions: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  isActive: boolean;
  maxTenants: number | null;
  createdAt: string;
  updatedAt: string;
}

interface DefaultRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  roles?: string[];
  businessTypeId: string | null;
  permissionTemplateId: string | null;
  isSystemRole: boolean;
  canBeModified: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// API data hooks
const usePermissionTemplates = () => {
  return useQuery({
    queryKey: ["/api/rbac-config/permission-templates"],
  });
};

const useBusinessTypes = () => {
  return useQuery({
    queryKey: ["/api/rbac-config/business-types"],
  });
};

const useDefaultRoles = () => {
  return useQuery({
    queryKey: ["/api/rbac-config/default-roles"],
  });
};

const availablePermissions = [
  "read_users",
  "create_users",
  "update_users",
  "delete_users",
  "read_reports",
  "create_reports",
  "update_reports",
  "delete_reports",
  "manage_settings",
  "manage_roles",
  "manage_permissions",
  "hipaa_audit_access",
  "patient_data_access",
  "financial_data_access",
  "compliance_reports",
  "security_logs",
  "admin_panel_access",
];

const complianceFrameworks = ["sox", "hipaa", "gdpr", "pci", "iso27001"];

export default function RBACConfigPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);
  const [editingRole, setEditingRole] = useState<DefaultRole | null>(null);
  const [newTemplatePermission, setNewTemplatePermission] = useState("");
  const [newRolePermission, setNewRolePermission] = useState("");
  const [newTemplateRole, setNewTemplateRole] = useState("");
  const [newRoleRole, setNewRoleRole] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<PermissionTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API queries
  const permissionTemplatesQuery = usePermissionTemplates();
  const businessTypesQuery = useBusinessTypes();
  const defaultRolesQuery = useDefaultRoles();

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Mutations
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: PermissionTemplate) => {
      if (template.id) {
        return await apiRequest(
          `/api/rbac-config/permission-templates/${template.id}`,
          "PUT",
          template
        );
      } else {
        return await apiRequest("/api/rbac-config/permission-templates", "POST", template);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/permission-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Template Saved",
        description: "Permission template has been saved successfully.",
      });
      setEditingTemplate(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const saveBusinessTypeMutation = useMutation({
    mutationFn: async (businessType: BusinessType) => {
      if (businessType.id) {
        return await apiRequest(
          `/api/rbac-config/business-types/${businessType.id}`,
          "PUT",
          businessType
        );
      } else {
        return await apiRequest("/api/rbac-config/business-types", "POST", businessType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/business-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Business Type Saved",
        description: "Business type has been saved successfully.",
      });
      setEditingBusinessType(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async (role: DefaultRole) => {
      if (role.id) {
        return await apiRequest(`/api/rbac-config/default-roles/${role.id}`, "PUT", role);
      } else {
        return await apiRequest("/api/rbac-config/default-roles", "POST", role);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/default-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Default Role Saved",
        description: "Default role has been saved successfully.",
      });
      setEditingRole(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rbac-config/permission-templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/permission-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Template Deleted",
        description: "Permission template has been deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const deleteBusinessTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rbac-config/business-types/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/business-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Business Type Deleted",
        description: "Business type has been deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rbac-config/default-roles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-config/default-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({
        title: "Default Role Deleted",
        description: "Default role has been deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    },
  });

  const handleSaveTemplate = (template: PermissionTemplate) => {
    saveTemplateMutation.mutate(template);
  };

  const handleSaveBusinessType = (businessType: BusinessType) => {
    saveBusinessTypeMutation.mutate(businessType);
  };

  const handleSaveRole = (role: DefaultRole) => {
    saveRoleMutation.mutate(role);
  };

  return (
    <div data-testid="rbac-config-page" className="rbac-page-container">
      {/* Page Header */}
      <div className="rbac-page-header">
        <div className="rbac-header-content">
          <div className="rbac-header-text">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="rbac-page-title" data-testid="title-rbac-config">
                  RBAC Configuration
                </h1>
                <p className="rbac-page-subtitle">
                  Manage permission templates, business types, and default roles for tenant
                  onboarding
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rbac-content-wrapper">
        <div className="rbac-main-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="rbac-tabs-container">
            <TabsList className="rbac-tabs-list" data-testid="tabs-rbac-config">
              <TabsTrigger
                value="templates"
                data-testid="tab-templates"
                className="rbac-tab-trigger"
              >
                <Shield className="h-4 w-4 mr-2" />
                Permission Templates
              </TabsTrigger>
              <TabsTrigger
                value="business-types"
                data-testid="tab-business-types"
                className="rbac-tab-trigger"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Business Types
              </TabsTrigger>
              <TabsTrigger
                value="default-roles"
                data-testid="tab-default-roles"
                className="rbac-tab-trigger"
              >
                <Users className="h-4 w-4 mr-2" />
                Default Roles
              </TabsTrigger>
            </TabsList>

            {/* Permission Templates Tab */}
            <TabsContent
              value="templates"
              data-testid="card-permission-templates"
              className="rbac-tab-content"
            >
              <div className="rbac-section-header">
                <div className="rbac-section-info">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="rbac-section-title">Permission Templates</h4>
                      <p className="rbac-section-description">
                        Define reusable permission sets for different business scenarios
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    setEditingTemplate({
                      id: "",
                      name: "",
                      description: "",
                      permissions: [],
                      roles: [],
                      businessTypes: [],
                      isDefault: false,
                      isActive: true,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  data-testid="button-add-template"
                  className="rbac-primary-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {permissionTemplatesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                        Loading templates...
                      </div>
                    </div>
                  ) : (
                    (permissionTemplatesQuery.data as any[])?.map((template: any) => (
                      <Card
                        key={template.id}
                        className="rbac-data-card"
                        data-testid={`template-card-${template.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3
                                    className="rbac-card-title"
                                    data-testid={`template-name-${template.id}`}
                                  >
                                    {template.name}
                                  </h3>
                                  {template.isDefault && (
                                    <Badge
                                      className="rbac-badge bg-green-100 text-green-700 text-xs px-2 py-1"
                                      data-testid={`template-default-${template.id}`}
                                    >
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p
                                className="rbac-card-description"
                                data-testid={`template-description-${template.id}`}
                              >
                                {template.description}
                              </p>
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-slate-700 mt-1">
                                  Permissions:
                                </span>
                                <div className="flex gap-1 flex-wrap">
                                  {template.permissions.slice(0, 3).map((permission: any) => (
                                    <Badge key={permission} variant="outline" className="text-xs">
                                      {permission}
                                    </Badge>
                                  ))}
                                  {template.permissions.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{template.permissions.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {(template.roles || []).length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium text-slate-700 mt-1">
                                    Roles:
                                  </span>
                                  <div className="flex gap-1 flex-wrap">
                                    {(template.roles || []).slice(0, 3).map(role => (
                                      <Badge key={role} variant="secondary" className="text-xs">
                                        {role}
                                      </Badge>
                                    ))}
                                    {(template.roles || []).length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{(template.roles || []).length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-slate-700 mt-1">
                                  Business Types:
                                </span>
                                <div className="flex gap-1 flex-wrap">
                                  {template.businessTypes.map((type: any) => (
                                    <Badge key={type} variant="secondary" className="text-xs">
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewTemplate(template)}
                                data-testid={`button-preview-template-${template.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTemplate(template)}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!template.isDefault && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  disabled={deleteTemplateMutation.isPending}
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Business Types Tab */}
            <TabsContent
              value="business-types"
              className="space-y-6"
              data-testid="card-business-types"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Types
                  </h4>
                  <p className="text-slate-600 text-sm mt-1">
                    Configure business types with specific compliance requirements
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setEditingBusinessType({
                      id: "",
                      name: "",
                      description: "",
                      requiredCompliance: [],
                      defaultPermissions: [],
                      riskLevel: "low",
                      isActive: true,
                      maxTenants: null,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  data-testid="button-add-business-type"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business Type
                </Button>
              </div>
              <div className="grid gap-4">
                {businessTypesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                      Loading business types...
                    </div>
                  </div>
                ) : (
                  (businessTypesQuery.data as any[])?.map((businessType: any) => (
                    <Card
                      key={businessType.id}
                      className="border border-slate-200 hover:border-slate-300 transition-colors"
                      data-testid={`business-type-card-${businessType.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-semibold text-slate-900 text-lg"
                                data-testid={`business-type-name-${businessType.id}`}
                              >
                                {businessType.name}
                              </h3>
                              <Badge
                                className={getRiskBadgeColor(businessType.riskLevel)}
                                data-testid={`business-type-risk-${businessType.id}`}
                              >
                                {businessType.riskLevel.toUpperCase()}
                              </Badge>
                              {businessType.isActive && (
                                <Badge
                                  variant="secondary"
                                  data-testid={`business-type-active-${businessType.id}`}
                                >
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p
                              className="text-sm text-slate-600 leading-relaxed"
                              data-testid={`business-type-description-${businessType.id}`}
                            >
                              {businessType.description}
                            </p>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-slate-700 mt-1">
                                Required Compliance:
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {businessType.requiredCompliance.map((framework: any) => (
                                  <Badge key={framework} variant="outline" className="text-xs">
                                    {framework.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-slate-700 mt-1">
                                Default Permissions:
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {businessType.defaultPermissions
                                  .slice(0, 3)
                                  .map((permission: any) => (
                                    <Badge key={permission} variant="secondary" className="text-xs">
                                      {permission}
                                    </Badge>
                                  ))}
                                {businessType.defaultPermissions.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{businessType.defaultPermissions.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingBusinessType(businessType)}
                              data-testid={`button-edit-business-type-${businessType.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteBusinessTypeMutation.mutate(businessType.id)}
                              disabled={deleteBusinessTypeMutation.isPending}
                              data-testid={`button-delete-business-type-${businessType.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Default Roles Tab */}
            <TabsContent value="default-roles" data-testid="card-default-roles">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Default Roles
                    </h4>
                    <p className="text-slate-600 text-sm mt-1">
                      Configure default roles that will be created for new tenants
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setEditingRole({
                        id: "",
                        name: "",
                        description: "",
                        permissions: [],
                        roles: [],
                        businessTypeId: null,
                        permissionTemplateId: null,
                        isSystemRole: false,
                        canBeModified: true,
                        isActive: true,
                        priority: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    data-testid="button-add-default-role"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Default Role
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {defaultRolesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                        Loading default roles...
                      </div>
                    </div>
                  ) : (
                    (defaultRolesQuery.data as any[])?.map((role: any) => (
                      <Card
                        key={role.id}
                        className="border border-slate-200 hover:border-slate-300 transition-colors"
                        data-testid={`default-role-card-${role.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-2">
                                <h3
                                  className="font-semibold text-slate-900 text-lg"
                                  data-testid={`default-role-name-${role.id}`}
                                >
                                  {role.name}
                                </h3>
                                {role.isSystemRole && (
                                  <Badge
                                    variant="destructive"
                                    data-testid={`default-role-system-${role.id}`}
                                  >
                                    System Role
                                  </Badge>
                                )}
                                {!role.canBeModified && (
                                  <Badge
                                    variant="outline"
                                    data-testid={`default-role-readonly-${role.id}`}
                                  >
                                    Read Only
                                  </Badge>
                                )}
                              </div>
                              <p
                                className="text-sm text-slate-600 leading-relaxed"
                                data-testid={`default-role-description-${role.id}`}
                              >
                                {role.description}
                              </p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-700">
                                    Business Type:
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {role.businessType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-700">
                                    Template:
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {role.permissionTemplate}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Permissions:</span>
                                <div className="flex gap-1 flex-wrap">
                                  {role.permissions.slice(0, 3).map((permission: any) => (
                                    <Badge key={permission} variant="outline" className="text-xs">
                                      {permission}
                                    </Badge>
                                  ))}
                                  {role.permissions.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{role.permissions.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {(role.roles || []).length > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-medium">Roles:</span>
                                  <div className="flex gap-1 flex-wrap">
                                    {(role.roles || []).slice(0, 3).map((r: any) => (
                                      <Badge key={r} variant="secondary" className="text-xs">
                                        {r}
                                      </Badge>
                                    ))}
                                    {(role.roles || []).length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{(role.roles || []).length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {role.canBeModified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingRole(role)}
                                  data-testid={`button-edit-default-role-${role.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {!role.isSystemRole && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteRoleMutation.mutate(role.id)}
                                  disabled={deleteRoleMutation.isPending}
                                  data-testid={`button-delete-default-role-${role.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={open => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          {previewTemplate && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{previewTemplate.name} Preview</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-600">{previewTemplate.description}</p>
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.permissions.map(p => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              {(previewTemplate.roles || []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">Default Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {(previewTemplate.roles || []).map(r => (
                      <Badge key={r} variant="secondary" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">Business Types</p>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.businessTypes.map(b => (
                    <Badge key={b} variant="secondary" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
              <DialogFooter className="justify-end">
                <Button type="button" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog
        open={!!editingTemplate}
        onOpenChange={open => {
          if (!open) {
            setEditingTemplate(null);
            setNewTemplatePermission("");
            setNewTemplateRole("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingTemplate && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveTemplate(editingTemplate);
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate.id ? "Edit Permission Template" : "Add Permission Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={editingTemplate.description}
                  onChange={e =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availablePermissions.map(perm => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${perm}`}
                        checked={editingTemplate.permissions.includes(perm)}
                        onCheckedChange={checked => {
                          const permissions = checked
                            ? [...editingTemplate.permissions, perm]
                            : editingTemplate.permissions.filter(p => p !== perm);
                          setEditingTemplate({ ...editingTemplate, permissions });
                        }}
                      />
                      <label htmlFor={`perm-${perm}`} className="text-sm">
                        {perm}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="custom_permission"
                    value={newTemplatePermission}
                    onChange={e => setNewTemplatePermission(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const perm = newTemplatePermission.trim();
                        if (perm && !editingTemplate.permissions.includes(perm)) {
                          setEditingTemplate({
                            ...editingTemplate,
                            permissions: [...editingTemplate.permissions, perm],
                          });
                        }
                        setNewTemplatePermission("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const perm = newTemplatePermission.trim();
                      if (perm && !editingTemplate.permissions.includes(perm)) {
                        setEditingTemplate({
                          ...editingTemplate,
                          permissions: [...editingTemplate.permissions, perm],
                        });
                      }
                      setNewTemplatePermission("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {editingTemplate.permissions.filter(p => !availablePermissions.includes(p)).length >
                  0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingTemplate.permissions
                      .filter(p => !availablePermissions.includes(p))
                      .map(perm => (
                        <Badge key={perm} variant="secondary" className="px-2 py-1">
                          <span className="mr-2">{perm}</span>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() =>
                              setEditingTemplate({
                                ...editingTemplate,
                                permissions: editingTemplate.permissions.filter(p => p !== perm),
                              })
                            }
                            aria-label={`Remove ${perm}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Default Roles</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="role-name"
                    value={newTemplateRole}
                    onChange={e => setNewTemplateRole(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const role = newTemplateRole.trim();
                        if (role && !(editingTemplate.roles || []).includes(role)) {
                          setEditingTemplate({
                            ...editingTemplate,
                            roles: [...(editingTemplate.roles || []), role],
                          });
                        }
                        setNewTemplateRole("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const role = newTemplateRole.trim();
                      if (role && !(editingTemplate.roles || []).includes(role)) {
                        setEditingTemplate({
                          ...editingTemplate,
                          roles: [...(editingTemplate.roles || []), role],
                        });
                      }
                      setNewTemplateRole("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {(editingTemplate.roles || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editingTemplate.roles || []).map(role => (
                      <Badge key={role} variant="outline" className="px-2 py-1">
                        <span className="mr-2">{role}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() =>
                            setEditingTemplate({
                              ...editingTemplate,
                              roles: (editingTemplate.roles || []).filter(r => r !== role),
                            })
                          }
                          aria-label={`Remove ${role}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingTemplate.isDefault}
                  onCheckedChange={checked =>
                    setEditingTemplate({ ...editingTemplate, isDefault: checked })
                  }
                />
                <Label>Default Template</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingTemplate.isActive}
                  onCheckedChange={checked =>
                    setEditingTemplate({ ...editingTemplate, isActive: checked })
                  }
                />
                <Label>Active</Label>
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="save-template">
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Business Type Dialog */}
      <Dialog
        open={!!editingBusinessType}
        onOpenChange={open => !open && setEditingBusinessType(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingBusinessType && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveBusinessType(editingBusinessType);
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>
                  {editingBusinessType.id ? "Edit Business Type" : "Add Business Type"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="bt-name">Name</Label>
                <Input
                  id="bt-name"
                  value={editingBusinessType.name}
                  onChange={e =>
                    setEditingBusinessType({ ...editingBusinessType, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bt-description">Description</Label>
                <Textarea
                  id="bt-description"
                  value={editingBusinessType.description}
                  onChange={e =>
                    setEditingBusinessType({
                      ...editingBusinessType,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Required Compliance</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {complianceFrameworks.map(fw => (
                    <div key={fw} className="flex items-center gap-2">
                      <Checkbox
                        id={`fw-${fw}`}
                        checked={editingBusinessType.requiredCompliance.includes(fw)}
                        onCheckedChange={checked => {
                          const requiredCompliance = checked
                            ? [...editingBusinessType.requiredCompliance, fw]
                            : editingBusinessType.requiredCompliance.filter(c => c !== fw);
                          setEditingBusinessType({
                            ...editingBusinessType,
                            requiredCompliance,
                          });
                        }}
                      />
                      <label htmlFor={`fw-${fw}`} className="text-sm">
                        {fw.toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availablePermissions.map(perm => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`bt-perm-${perm}`}
                        checked={editingBusinessType.defaultPermissions.includes(perm)}
                        onCheckedChange={checked => {
                          const defaultPermissions = checked
                            ? [...editingBusinessType.defaultPermissions, perm]
                            : editingBusinessType.defaultPermissions.filter(p => p !== perm);
                          setEditingBusinessType({
                            ...editingBusinessType,
                            defaultPermissions,
                          });
                        }}
                      />
                      <label htmlFor={`bt-perm-${perm}`} className="text-sm">
                        {perm}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select
                  value={editingBusinessType.riskLevel}
                  onValueChange={value =>
                    setEditingBusinessType({
                      ...editingBusinessType,
                      riskLevel: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bt-max-tenants">Max Tenants</Label>
                <Input
                  id="bt-max-tenants"
                  type="number"
                  value={editingBusinessType.maxTenants ?? ""}
                  onChange={e =>
                    setEditingBusinessType({
                      ...editingBusinessType,
                      maxTenants: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingBusinessType.isActive}
                  onCheckedChange={checked =>
                    setEditingBusinessType({ ...editingBusinessType, isActive: checked })
                  }
                />
                <Label>Active</Label>
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingBusinessType(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="save-business-type">
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Default Role Dialog */}
      <Dialog
        open={!!editingRole}
        onOpenChange={open => {
          if (!open) {
            setEditingRole(null);
            setNewRolePermission("");
            setNewRoleRole("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingRole && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveRole(editingRole);
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>
                  {editingRole.id ? "Edit Default Role" : "Add Default Role"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  value={editingRole.name}
                  onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={editingRole.description}
                  onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select
                  value={editingRole.businessTypeId || ""}
                  onValueChange={value => setEditingRole({ ...editingRole, businessTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(businessTypesQuery.data as any[])?.map(bt => (
                      <SelectItem key={bt.id} value={bt.id}>
                        {bt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Permission Template</Label>
                <Select
                  value={editingRole.permissionTemplateId || ""}
                  onValueChange={value =>
                    setEditingRole({ ...editingRole, permissionTemplateId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {(permissionTemplatesQuery.data as any[])?.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availablePermissions.map(perm => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-perm-${perm}`}
                        checked={editingRole.permissions.includes(perm)}
                        onCheckedChange={checked => {
                          const permissions = checked
                            ? [...editingRole.permissions, perm]
                            : editingRole.permissions.filter(p => p !== perm);
                          setEditingRole({ ...editingRole, permissions });
                        }}
                      />
                      <label htmlFor={`role-perm-${perm}`} className="text-sm">
                        {perm}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="custom_permission"
                    value={newRolePermission}
                    onChange={e => setNewRolePermission(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const perm = newRolePermission.trim();
                        if (perm && !editingRole.permissions.includes(perm)) {
                          setEditingRole({
                            ...editingRole,
                            permissions: [...editingRole.permissions, perm],
                          });
                        }
                        setNewRolePermission("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const perm = newRolePermission.trim();
                      if (perm && !editingRole.permissions.includes(perm)) {
                        setEditingRole({
                          ...editingRole,
                          permissions: [...editingRole.permissions, perm],
                        });
                      }
                      setNewRolePermission("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {editingRole.permissions.filter(p => !availablePermissions.includes(p)).length >
                  0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingRole.permissions
                      .filter(p => !availablePermissions.includes(p))
                      .map(perm => (
                        <Badge key={perm} variant="secondary" className="px-2 py-1">
                          <span className="mr-2">{perm}</span>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() =>
                              setEditingRole({
                                ...editingRole,
                                permissions: editingRole.permissions.filter(p => p !== perm),
                              })
                            }
                            aria-label={`Remove ${perm}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Default Roles</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="role-name"
                    value={newRoleRole}
                    onChange={e => setNewRoleRole(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const role = newRoleRole.trim();
                        if (role && !(editingRole.roles || []).includes(role)) {
                          setEditingRole({
                            ...editingRole,
                            roles: [...(editingRole.roles || []), role],
                          });
                        }
                        setNewRoleRole("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const role = newRoleRole.trim();
                      if (role && !(editingRole.roles || []).includes(role)) {
                        setEditingRole({
                          ...editingRole,
                          roles: [...(editingRole.roles || []), role],
                        });
                      }
                      setNewRoleRole("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {(editingRole.roles || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editingRole.roles || []).map(role => (
                      <Badge key={role} variant="outline" className="px-2 py-1">
                        <span className="mr-2">{role}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() =>
                            setEditingRole({
                              ...editingRole,
                              roles: (editingRole.roles || []).filter(r => r !== role),
                            })
                          }
                          aria-label={`Remove ${role}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRole.isSystemRole}
                    onCheckedChange={checked =>
                      setEditingRole({ ...editingRole, isSystemRole: checked })
                    }
                  />
                  <Label>System Role</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRole.canBeModified}
                    onCheckedChange={checked =>
                      setEditingRole({ ...editingRole, canBeModified: checked })
                    }
                  />
                  <Label>Can Be Modified</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRole.isActive}
                    onCheckedChange={checked =>
                      setEditingRole({ ...editingRole, isActive: checked })
                    }
                  />
                  <Label>Active</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-priority">Priority</Label>
                  <Input
                    id="role-priority"
                    type="number"
                    value={editingRole.priority}
                    onChange={e =>
                      setEditingRole({ ...editingRole, priority: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="save-default-role">
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Implementation Note */}
      <Card className="rbac-info-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="rbac-info-title">RBAC Configuration Implementation</h4>
              <p className="rbac-info-description">
                This RBAC configuration system allows Platform Admins to define templates, business
                types, and default roles. When tenants are onboarded, they inherit these
                configurations and can then customize their tenant-specific roles and permissions
                through their tenant portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
