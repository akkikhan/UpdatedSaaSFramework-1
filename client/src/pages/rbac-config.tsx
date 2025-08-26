import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save, Shield, Users, Building2, Settings, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
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
    queryKey: ['/api/rbac-config/permission-templates']
  });
};

const useBusinessTypes = () => {
  return useQuery({
    queryKey: ['/api/rbac-config/business-types']
  });
};

const useDefaultRoles = () => {
  return useQuery({
    queryKey: ['/api/rbac-config/default-roles']
  });
};

const availablePermissions = [
  // Core permissions
  'read_users', 'create_users', 'update_users', 'delete_users',
  'read_reports', 'create_reports', 'update_reports', 'delete_reports',
  'manage_settings', 'manage_roles', 'manage_permissions',
  'admin_panel_access', 'security_logs',
  
  // Healthcare permissions
  'hipaa_audit_access', 'patient_data_access', 'medical_records_access',
  'phi_access', 'healthcare_compliance_reports',
  
  // Financial/Banking permissions
  'financial_data_access', 'transaction_processing', 'account_management',
  'wire_transfers', 'loan_processing', 'credit_analysis',
  'aml_monitoring', 'kyc_verification', 'regulatory_reporting',
  'sox_compliance_access', 'pci_compliance_access', 'basel_reporting',
  'risk_assessment', 'fraud_detection', 'audit_trail_access',
  
  // Insurance permissions
  'policy_management', 'claims_processing', 'underwriting_access',
  'actuarial_data_access', 'premium_calculation', 'risk_modeling',
  'insurance_compliance_reports', 'solvency_reporting', 'reinsurance_management',
  'catastrophe_modeling', 'loss_reserves_management', 'regulatory_filings',
  
  // Compliance frameworks
  'gdpr_compliance', 'ccpa_compliance', 'nist_framework_access',
  'iso27001_compliance', 'ffiec_compliance', 'naic_compliance'
];

const complianceFrameworks = [
  'sox', 'hipaa', 'gdpr', 'pci', 'iso27001', 'ccpa', 'nist',
  // Banking specific
  'basel-iii', 'dodd-frank', 'mifid-ii', 'psd2', 'ffiec', 'glba', 'bsa-aml',
  // Insurance specific  
  'naic', 'solvency-ii', 'ifrs17', 'orsa', 'rbc', 'nydfs-cybersecurity'
];

export default function RBACConfigPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);
  const [editingRole, setEditingRole] = useState<DefaultRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API queries
  const permissionTemplatesQuery = usePermissionTemplates();
  const businessTypesQuery = useBusinessTypes();
  const defaultRolesQuery = useDefaultRoles();

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Mutations
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: PermissionTemplate) => {
      if (template.id) {
        const response = await apiRequest('PUT', `/api/rbac-config/permission-templates/${template.id}`, template);
        return await response.json();
      } else {
        const response = await apiRequest('POST', '/api/rbac-config/permission-templates', template);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/permission-templates'] });
      // Invalidate all tenant data as RBAC config affects tenant portals and onboarding
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Template Saved",
        description: "Permission template has been saved successfully. All tenant configurations will be updated.",
      });
      setEditingTemplate(null);
    }
  });

  const saveBusinessTypeMutation = useMutation({
    mutationFn: async (businessType: BusinessType) => {
      if (businessType.id) {
        const response = await apiRequest('PUT', `/api/rbac-config/business-types/${businessType.id}`, businessType);
        return await response.json();
      } else {
        const response = await apiRequest('POST', '/api/rbac-config/business-types', businessType);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/business-types'] });
      // Invalidate all tenant data as business type changes affect tenant configurations
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Business Type Saved",
        description: "Business type has been saved successfully. All tenant configurations will be updated.",
      });
      setEditingBusinessType(null);
    }
  });

  const saveRoleMutation = useMutation({
    mutationFn: async (role: DefaultRole) => {
      if (role.id) {
        const response = await apiRequest('PUT', `/api/rbac-config/default-roles/${role.id}`, role);
        return await response.json();
      } else {
        const response = await apiRequest('POST', '/api/rbac-config/default-roles', role);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/default-roles'] });
      // Invalidate tenant data as default roles affect new tenant creation
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Default Role Saved",
        description: "Default role has been saved successfully. New tenants will inherit this configuration.",
      });
      setEditingRole(null);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/rbac-config/permission-templates/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/permission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Template Deleted",
        description: "Permission template has been deleted successfully. Tenant configurations updated.",
      });
    }
  });

  const deleteBusinessTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/rbac-config/business-types/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/business-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Business Type Deleted",
        description: "Business type has been deleted successfully. Tenant configurations updated.",
      });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/rbac-config/default-roles/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/default-roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({
        title: "Default Role Deleted",
        description: "Default role has been deleted successfully. New tenant creation updated.",
      });
    }
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
    <div className="container mx-auto p-6 space-y-6" data-testid="rbac-config-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="title-rbac-config">RBAC Configuration</h1>
          <p className="text-gray-600">Manage permission templates, business types, and default roles for tenant onboarding</p>
        </div>
        <Button 
          variant="outline"
          onClick={async () => {
            try {
              const response = await fetch('/api/rbac-config/seed-sample-data', { method: 'POST' });
              if (response.ok) {
                queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/permission-templates'] });
                queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/business-types'] });
                queryClient.invalidateQueries({ queryKey: ['/api/rbac-config/default-roles'] });
                queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
                toast({ title: "Sample Data Seeded", description: "Sample RBAC configuration has been created successfully. All systems updated." });
              } else {
                throw new Error('Failed to seed data');
              }
            } catch (error) {
              toast({ title: "Error", description: "Failed to seed sample data", variant: "destructive" });
            }
          }}
        >
          <Settings className="h-4 w-4 mr-2" />
          Seed Sample Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-rbac-config">
          <TabsTrigger value="templates" data-testid="tab-templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="business-types" data-testid="tab-business-types">Business Types</TabsTrigger>
          <TabsTrigger value="default-roles" data-testid="tab-default-roles">Default Roles</TabsTrigger>
        </TabsList>

        {/* Permission Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card data-testid="card-permission-templates">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permission Templates
                  </CardTitle>
                  <CardDescription>
                    Define reusable permission sets for different business scenarios
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setEditingTemplate({
                    id: '',
                    name: '',
                    description: '',
                    permissions: [],
                    businessTypes: [],
                    isDefault: false,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })}
                  data-testid="button-add-template"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {permissionTemplatesQuery.isLoading ? (
                  <div>Loading templates...</div>
                ) : permissionTemplatesQuery.data?.map((template) => (
                  <Card key={template.id} className="border" data-testid={`template-card-${template.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`template-name-${template.id}`}>{template.name}</h3>
                            {template.isDefault && (
                              <Badge variant="secondary" data-testid={`template-default-${template.id}`}>Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600" data-testid={`template-description-${template.id}`}>
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Permissions:</span>
                            <div className="flex gap-1 flex-wrap">
                              {template.permissions.slice(0, 3).map((permission) => (
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Business Types:</span>
                            <div className="flex gap-1 flex-wrap">
                              {template.businessTypes.map((type) => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permission Template Modal */}
        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate.id ? 'Edit Permission Template' : 'Create Permission Template'}
                </DialogTitle>
                <DialogDescription>
                  Define a reusable set of permissions for different business scenarios
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="Standard Business Template"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="template-default"
                      checked={editingTemplate.isDefault}
                      onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isDefault: checked })}
                    />
                    <Label htmlFor="template-default">Set as Default Template</Label>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    placeholder="Describe when this template should be used..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Business Types</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {['general', 'healthcare', 'finance', 'education', 'government'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`business-type-${type}`}
                          checked={editingTemplate.businessTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditingTemplate({
                                ...editingTemplate,
                                businessTypes: [...editingTemplate.businessTypes, type]
                              });
                            } else {
                              setEditingTemplate({
                                ...editingTemplate,
                                businessTypes: editingTemplate.businessTypes.filter(t => t !== type)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`business-type-${type}`} className="capitalize">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 max-h-80 overflow-y-auto border rounded p-3">
                    <div className="space-y-4">
                      {/* Core Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Core Permissions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availablePermissions.filter(p => 
                            ['read_users', 'create_users', 'update_users', 'delete_users', 'read_reports', 'create_reports', 'update_reports', 'delete_reports', 'manage_settings', 'manage_roles', 'manage_permissions', 'admin_panel_access', 'security_logs'].includes(p)
                          ).map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission}`}
                                checked={editingTemplate.permissions.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: [...editingTemplate.permissions, permission]
                                    });
                                  } else {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: editingTemplate.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`permission-${permission}`} className="text-xs">{permission.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Banking/Financial Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Banking & Financial</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availablePermissions.filter(p => 
                            ['financial_data_access', 'transaction_processing', 'account_management', 'wire_transfers', 'loan_processing', 'credit_analysis', 'aml_monitoring', 'kyc_verification', 'regulatory_reporting', 'sox_compliance_access', 'pci_compliance_access', 'basel_reporting', 'risk_assessment', 'fraud_detection', 'audit_trail_access'].includes(p)
                          ).map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission}`}
                                checked={editingTemplate.permissions.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: [...editingTemplate.permissions, permission]
                                    });
                                  } else {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: editingTemplate.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`permission-${permission}`} className="text-xs text-blue-700">{permission.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Insurance Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Insurance</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availablePermissions.filter(p => 
                            ['policy_management', 'claims_processing', 'underwriting_access', 'actuarial_data_access', 'premium_calculation', 'risk_modeling', 'insurance_compliance_reports', 'solvency_reporting', 'reinsurance_management', 'catastrophe_modeling', 'loss_reserves_management', 'regulatory_filings'].includes(p)
                          ).map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission}`}
                                checked={editingTemplate.permissions.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: [...editingTemplate.permissions, permission]
                                    });
                                  } else {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: editingTemplate.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`permission-${permission}`} className="text-xs text-purple-700">{permission.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Healthcare Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Healthcare</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availablePermissions.filter(p => 
                            ['hipaa_audit_access', 'patient_data_access', 'medical_records_access', 'phi_access', 'healthcare_compliance_reports'].includes(p)
                          ).map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission}`}
                                checked={editingTemplate.permissions.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: [...editingTemplate.permissions, permission]
                                    });
                                  } else {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: editingTemplate.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`permission-${permission}`} className="text-xs text-green-700">{permission.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compliance Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Compliance Frameworks</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availablePermissions.filter(p => 
                            ['gdpr_compliance', 'ccpa_compliance', 'nist_framework_access', 'iso27001_compliance', 'ffiec_compliance', 'naic_compliance'].includes(p)
                          ).map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission}`}
                                checked={editingTemplate.permissions.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: [...editingTemplate.permissions, permission]
                                    });
                                  } else {
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      permissions: editingTemplate.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`permission-${permission}`} className="text-xs text-orange-700">{permission.replace(/_/g, ' ')}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-active"
                    checked={editingTemplate.isActive}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                  />
                  <Label htmlFor="template-active">Active Template</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleSaveTemplate(editingTemplate)}
                  disabled={!editingTemplate.name || editingTemplate.permissions.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Business Types Tab */}
        <TabsContent value="business-types" className="space-y-4">
          <Card data-testid="card-business-types">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Types
                  </CardTitle>
                  <CardDescription>
                    Configure business types with specific compliance requirements
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setEditingBusinessType({
                    id: '',
                    name: '',
                    description: '',
                    requiredCompliance: [],
                    defaultPermissions: [],
                    riskLevel: 'low',
                    isActive: true,
                    maxTenants: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })}
                  data-testid="button-add-business-type"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {businessTypesQuery.isLoading ? (
                  <div>Loading business types...</div>
                ) : businessTypesQuery.data?.map((businessType) => (
                  <Card key={businessType.id} className="border" data-testid={`business-type-card-${businessType.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`business-type-name-${businessType.id}`}>
                              {businessType.name}
                            </h3>
                            <Badge className={getRiskBadgeColor(businessType.riskLevel)} data-testid={`business-type-risk-${businessType.id}`}>
                              {businessType.riskLevel.toUpperCase()}
                            </Badge>
                            {businessType.isActive && (
                              <Badge variant="secondary" data-testid={`business-type-active-${businessType.id}`}>Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600" data-testid={`business-type-description-${businessType.id}`}>
                            {businessType.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Required Compliance:</span>
                            <div className="flex gap-1 flex-wrap">
                              {businessType.requiredCompliance.map((framework) => (
                                <Badge key={framework} variant="outline" className="text-xs">
                                  {framework.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Default Permissions:</span>
                            <div className="flex gap-1 flex-wrap">
                              {businessType.defaultPermissions.slice(0, 3).map((permission) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Type Modal */}
        {editingBusinessType && (
          <Dialog open={!!editingBusinessType} onOpenChange={() => setEditingBusinessType(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBusinessType.id ? 'Edit Business Type' : 'Create Business Type'}
                </DialogTitle>
                <DialogDescription>
                  Configure business type with specific compliance requirements and risk level
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business-type-name">Business Type Name</Label>
                    <Input
                      id="business-type-name"
                      value={editingBusinessType.name}
                      onChange={(e) => setEditingBusinessType({ ...editingBusinessType, name: e.target.value })}
                      placeholder="Healthcare"
                    />
                  </div>
                  <div>
                    <Label htmlFor="risk-level">Risk Level</Label>
                    <Select 
                      value={editingBusinessType.riskLevel} 
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                        setEditingBusinessType({ ...editingBusinessType, riskLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="business-type-description">Description</Label>
                  <Textarea
                    id="business-type-description"
                    value={editingBusinessType.description}
                    onChange={(e) => setEditingBusinessType({ ...editingBusinessType, description: e.target.value })}
                    placeholder="Describe this business type and its characteristics..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Required Compliance Frameworks</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {complianceFrameworks.map((framework) => (
                      <div key={framework} className="flex items-center space-x-2">
                        <Checkbox
                          id={`compliance-${framework}`}
                          checked={editingBusinessType.requiredCompliance.includes(framework)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditingBusinessType({
                                ...editingBusinessType,
                                requiredCompliance: [...editingBusinessType.requiredCompliance, framework]
                              });
                            } else {
                              setEditingBusinessType({
                                ...editingBusinessType,
                                requiredCompliance: editingBusinessType.requiredCompliance.filter(f => f !== framework)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`compliance-${framework}`} className="uppercase text-sm">{framework}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Default Permissions</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto border rounded p-3">
                    {availablePermissions.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`default-permission-${permission}`}
                          checked={editingBusinessType.defaultPermissions.includes(permission)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditingBusinessType({
                                ...editingBusinessType,
                                defaultPermissions: [...editingBusinessType.defaultPermissions, permission]
                              });
                            } else {
                              setEditingBusinessType({
                                ...editingBusinessType,
                                defaultPermissions: editingBusinessType.defaultPermissions.filter(p => p !== permission)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`default-permission-${permission}`} className="text-sm">{permission}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-tenants">Max Tenants (optional)</Label>
                    <Input
                      id="max-tenants"
                      type="number"
                      value={editingBusinessType.maxTenants || ''}
                      onChange={(e) => setEditingBusinessType({ 
                        ...editingBusinessType, 
                        maxTenants: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="business-type-active"
                      checked={editingBusinessType.isActive}
                      onCheckedChange={(checked) => setEditingBusinessType({ ...editingBusinessType, isActive: checked })}
                    />
                    <Label htmlFor="business-type-active">Active Business Type</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingBusinessType(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleSaveBusinessType(editingBusinessType)}
                  disabled={!editingBusinessType.name}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Type
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Default Roles Tab */}
        <TabsContent value="default-roles" className="space-y-4">
          <Card data-testid="card-default-roles">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Default Roles
                  </CardTitle>
                  <CardDescription>
                    Configure default roles that will be created for new tenants
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setEditingRole({
                    id: '',
                    name: '',
                    description: '',
                    permissions: [],
                    businessTypeId: null,
                    permissionTemplateId: null,
                    isSystemRole: false,
                    canBeModified: true,
                    isActive: true,
                    priority: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })}
                  data-testid="button-add-default-role"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Default Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {defaultRolesQuery.isLoading ? (
                  <div>Loading default roles...</div>
                ) : defaultRolesQuery.data?.map((role) => (
                  <Card key={role.id} className="border" data-testid={`default-role-card-${role.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`default-role-name-${role.id}`}>{role.name}</h3>
                            {role.isSystemRole && (
                              <Badge variant="destructive" data-testid={`default-role-system-${role.id}`}>System Role</Badge>
                            )}
                            {!role.canBeModified && (
                              <Badge variant="outline" data-testid={`default-role-readonly-${role.id}`}>Read Only</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600" data-testid={`default-role-description-${role.id}`}>
                            {role.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Business Type:</span>
                              <Badge variant="secondary" className="text-xs">
                                {role.businessTypeId ? 
                                  businessTypesQuery.data?.find(bt => bt.id === role.businessTypeId)?.name || 'Unknown' : 
                                  'All Types'
                                }
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Template:</span>
                              <Badge variant="outline" className="text-xs">
                                {role.permissionTemplateId ? 
                                  permissionTemplatesQuery.data?.find(pt => pt.id === role.permissionTemplateId)?.name || 'Unknown' : 
                                  'No Template'
                                }
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Permissions:</span>
                            <div className="flex gap-1 flex-wrap">
                              {role.permissions.slice(0, 3).map((permission) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Default Role Modal */}
      {editingRole && (
        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole.id ? 'Edit Default Role' : 'Create Default Role'}
              </DialogTitle>
              <DialogDescription>
                Configure default roles that will be created for new tenants
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    placeholder="Admin"
                  />
                </div>
                <div>
                  <Label htmlFor="role-priority">Priority</Label>
                  <Input
                    id="role-priority"
                    type="number"
                    min="1"
                    value={editingRole.priority}
                    onChange={(e) => setEditingRole({ ...editingRole, priority: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                  <span className="text-xs text-gray-500">Lower number = higher priority</span>
                </div>
              </div>

              <div>
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Describe the role's purpose and scope..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-type-select">Business Type</Label>
                  <Select 
                    value={editingRole.businessTypeId || 'none'} 
                    onValueChange={(value) => setEditingRole({ ...editingRole, businessTypeId: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Business Types</SelectItem>
                      {businessTypesQuery.data?.map((businessType) => (
                        <SelectItem key={businessType.id} value={businessType.id}>
                          {businessType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="permission-template-select">Permission Template</Label>
                  <Select 
                    value={editingRole.permissionTemplateId || 'none'} 
                    onValueChange={(value) => setEditingRole({ ...editingRole, permissionTemplateId: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Template</SelectItem>
                      {permissionTemplatesQuery.data?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto border rounded p-3">
                  {availablePermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-permission-${permission}`}
                        checked={editingRole.permissions.includes(permission)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingRole({
                              ...editingRole,
                              permissions: [...editingRole.permissions, permission]
                            });
                          } else {
                            setEditingRole({
                              ...editingRole,
                              permissions: editingRole.permissions.filter(p => p !== permission)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`role-permission-${permission}`} className="text-sm">{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="role-system"
                    checked={editingRole.isSystemRole}
                    onCheckedChange={(checked) => setEditingRole({ ...editingRole, isSystemRole: checked })}
                  />
                  <Label htmlFor="role-system">System Role</Label>
                  <span className="text-xs text-gray-500">Cannot be deleted by tenants</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="role-modifiable"
                    checked={editingRole.canBeModified}
                    onCheckedChange={(checked) => setEditingRole({ ...editingRole, canBeModified: checked })}
                  />
                  <Label htmlFor="role-modifiable">Can Be Modified</Label>
                  <span className="text-xs text-gray-500">Tenants can edit permissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="role-active"
                    checked={editingRole.isActive}
                    onCheckedChange={(checked) => setEditingRole({ ...editingRole, isActive: checked })}
                  />
                  <Label htmlFor="role-active">Active Role</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSaveRole(editingRole)}
                disabled={!editingRole.name || editingRole.permissions.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Note about implementation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">RBAC Configuration Implementation</h4>
              <p className="text-sm text-blue-700 mt-1">
                This RBAC configuration system allows Platform Admins to define templates, business types, and default roles. 
                When tenants are onboarded, they inherit these configurations and can then customize their tenant-specific 
                roles and permissions through their tenant portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}