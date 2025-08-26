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
import { Plus, Edit, Trash2, Save, Shield, Users, Building2, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  businessTypes: string[];
  isDefault: boolean;
  createdAt: string;
}

interface BusinessType {
  id: string;
  name: string;
  description: string;
  requiredCompliance: string[];
  defaultPermissions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
}

interface DefaultRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  businessType: string;
  permissionTemplate: string;
  isSystemRole: boolean;
  canBeModified: boolean;
}

// Mock data - in real implementation, these would come from API
const mockPermissionTemplates: PermissionTemplate[] = [
  {
    id: '1',
    name: 'Standard',
    description: 'Standard permission set for most business types',
    permissions: ['read_users', 'create_users', 'update_users', 'read_reports'],
    businessTypes: ['general', 'retail', 'technology'],
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Healthcare Compliant',
    description: 'HIPAA compliant permission template for healthcare organizations',
    permissions: ['read_users', 'create_users', 'update_users', 'read_reports', 'hipaa_audit_access', 'patient_data_access'],
    businessTypes: ['healthcare', 'medical'],
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];

const mockBusinessTypes: BusinessType[] = [
  {
    id: '1',
    name: 'General',
    description: 'General business with standard requirements',
    requiredCompliance: ['sox'],
    defaultPermissions: ['read_users', 'create_users'],
    riskLevel: 'low',
    isActive: true
  },
  {
    id: '2',
    name: 'Healthcare',
    description: 'Healthcare organizations requiring HIPAA compliance',
    requiredCompliance: ['hipaa', 'sox'],
    defaultPermissions: ['read_users', 'create_users', 'hipaa_audit_access'],
    riskLevel: 'high',
    isActive: true
  },
  {
    id: '3',
    name: 'Financial Services',
    description: 'Financial institutions requiring SOX and PCI compliance',
    requiredCompliance: ['sox', 'pci', 'gdpr'],
    defaultPermissions: ['read_users', 'create_users', 'financial_data_access'],
    riskLevel: 'critical',
    isActive: true
  }
];

const mockDefaultRoles: DefaultRole[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full administrative access',
    permissions: ['*'],
    businessType: 'general',
    permissionTemplate: 'standard',
    isSystemRole: true,
    canBeModified: false
  },
  {
    id: '2',
    name: 'User Manager',
    description: 'Can manage users and basic settings',
    permissions: ['read_users', 'create_users', 'update_users', 'read_reports'],
    businessType: 'general',
    permissionTemplate: 'standard',
    isSystemRole: false,
    canBeModified: true
  },
  {
    id: '3',
    name: 'Healthcare Admin',
    description: 'Healthcare specific administrative role',
    permissions: ['read_users', 'create_users', 'update_users', 'hipaa_audit_access', 'patient_data_access'],
    businessType: 'healthcare',
    permissionTemplate: 'healthcare',
    isSystemRole: false,
    canBeModified: true
  }
];

const availablePermissions = [
  'read_users', 'create_users', 'update_users', 'delete_users',
  'read_reports', 'create_reports', 'update_reports', 'delete_reports',
  'manage_settings', 'manage_roles', 'manage_permissions',
  'hipaa_audit_access', 'patient_data_access', 'financial_data_access',
  'compliance_reports', 'security_logs', 'admin_panel_access'
];

const complianceFrameworks = ['sox', 'hipaa', 'gdpr', 'pci', 'iso27001'];

export default function RBACConfigPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);
  const [editingRole, setEditingRole] = useState<DefaultRole | null>(null);
  const { toast } = useToast();

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleSaveTemplate = (template: PermissionTemplate) => {
    // In real implementation, this would call API
    toast({
      title: "Template Saved",
      description: `Permission template "${template.name}" has been saved successfully.`,
    });
    setEditingTemplate(null);
  };

  const handleSaveBusinessType = (businessType: BusinessType) => {
    // In real implementation, this would call API
    toast({
      title: "Business Type Saved",
      description: `Business type "${businessType.name}" has been saved successfully.`,
    });
    setEditingBusinessType(null);
  };

  const handleSaveRole = (role: DefaultRole) => {
    // In real implementation, this would call API
    toast({
      title: "Default Role Saved",
      description: `Default role "${role.name}" has been saved successfully.`,
    });
    setEditingRole(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="rbac-config-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="title-rbac-config">RBAC Configuration</h1>
          <p className="text-gray-600">Manage permission templates, business types, and default roles for tenant onboarding</p>
        </div>
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
                    createdAt: new Date().toISOString()
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
                {mockPermissionTemplates.map((template) => (
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
                    isActive: true
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
                {mockBusinessTypes.map((businessType) => (
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
                    businessType: '',
                    permissionTemplate: '',
                    isSystemRole: false,
                    canBeModified: true
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
                {mockDefaultRoles.map((role) => (
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
                                {role.businessType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Template:</span>
                              <Badge variant="outline" className="text-xs">
                                {role.permissionTemplate}
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