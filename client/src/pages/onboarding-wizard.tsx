import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTenant } from '@/hooks/use-tenants';
import { api } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CheckCircle,
  Database,
  FileText,
  Globe,
  Key,
  Loader2,
  Settings,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgId: z
    .string()
    .min(2, 'Organization ID must be at least 2 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Organization ID can only contain lowercase letters, numbers, and hyphens'
    ),
  adminEmail: z.string().email('Please enter a valid email address'),
  businessType: z.string().optional(),
  roleTemplate: z.string().optional(),
  sendEmail: z.boolean().default(true),
  enabledModules: z
    .array(
      z.enum([
        'auth',
        'rbac',
        'azure-ad',
        'auth0',
        'saml',
        'logging',
        'notifications',
        'ai-copilot'
      ])
    )
    .default(['auth']),
  moduleConfigs: z
    .object({
      rbac: z
        .object({
          permissionTemplate: z.string().optional(),
          businessType: z.string().optional(),
          customPermissions: z.array(z.string()).optional(),
          defaultRoles: z.array(z.string()).optional()
        })
        .optional(),
      'azure-ad': z
        .object({
          tenantId: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          domain: z.string().optional(),
          redirectUri: z.string().optional(),
          groupClaims: z.boolean().optional(),
          multiTenant: z.boolean().optional()
        })
        .optional(),
      auth0: z
        .object({
          domain: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          audience: z.string().optional(),
          callbackUrl: z.string().optional(),
          logoutUrl: z.string().optional()
        })
        .optional(),
      saml: z
        .object({
          entryPoint: z.string().optional(),
          issuer: z.string().optional(),
          cert: z.string().optional(),
          identifierFormat: z.string().optional(),
          callbackUrl: z.string().optional()
        })
        .optional(),
      logging: z
        .object({
          levels: z.array(z.string()).optional(),
          destinations: z.array(z.string()).optional(),
          retention: z
            .object({
              error: z.string().optional(),
              security: z.string().optional(),
              audit: z.string().optional()
            })
            .optional()
        })
        .optional(),
      notifications: z
        .object({
          channels: z.array(z.string()).optional(),
          emailProvider: z.string().optional(),
          smsProvider: z.string().optional(),
          templates: z
            .object({
              welcome: z.boolean().optional(),
              security_alert: z.boolean().optional()
            })
            .optional()
        })
        .optional(),
      'ai-copilot': z
        .object({
          provider: z.string().optional(),
          model: z.string().optional(),
          capabilities: z
            .object({
              chatSupport: z.boolean().optional(),
              codeAssistance: z.boolean().optional()
            })
            .optional()
        })
        .optional()
    })
    .default({})
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Organization details and admin contact',
    icon: Building2
  },
  {
    id: 'modules',
    title: 'Authentication Modules',
    description: 'Choose your authentication providers',
    icon: Shield
  },
  {
    id: 'configuration',
    title: 'Module Configuration',
    description: 'Configure selected authentication modules',
    icon: Settings
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your settings and create the tenant',
    icon: CheckCircle
  }
];

// API queries for dynamic data
const useModulesData = () => {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/modules');
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch modules from API, using fallback data:', error);
        return FALLBACK_MODULE_INFO;
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

const useBusinessTypesData = () => {
  return useQuery({
    queryKey: ['business-types'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/business-types');
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch business types from API, using fallback data:', error);
        return FALLBACK_BUSINESS_TYPES;
      }
    },
    staleTime: 5 * 60 * 1000
  });
};

const useRoleTemplatesData = () => {
  return useQuery({
    queryKey: ['role-templates'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/role-templates');
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch role templates from API, using fallback data:', error);
        return FALLBACK_ROLE_TEMPLATES;
      }
    },
    staleTime: 5 * 60 * 1000
  });
};

// Fallback data for offline/error scenarios
const FALLBACK_BUSINESS_TYPES = [
  { id: 'fintech', name: 'Financial Technology', compliance: ['SOX', 'PCI-DSS'] },
  { id: 'healthcare', name: 'Healthcare', compliance: ['HIPAA', 'HITECH'] },
  { id: 'education', name: 'Education', compliance: ['FERPA'] },
  { id: 'enterprise', name: 'Enterprise Software', compliance: ['SOC2', 'ISO27001'] },
  { id: 'ecommerce', name: 'E-commerce', compliance: ['PCI-DSS', 'GDPR'] },
  { id: 'government', name: 'Government', compliance: ['FedRAMP', 'FISMA'] },
  { id: 'other', name: 'Other', compliance: [] }
];

const FALLBACK_ROLE_TEMPLATES = [
  { id: 'startup', name: 'Startup Template', roles: ['admin', 'developer', 'user'] },
  { id: 'enterprise', name: 'Enterprise Template', roles: ['admin', 'manager', 'analyst', 'user'] },
  {
    id: 'financial',
    name: 'Financial Services',
    roles: ['admin', 'compliance_officer', 'analyst', 'trader', 'user']
  },
  {
    id: 'healthcare',
    name: 'Healthcare Template',
    roles: ['admin', 'doctor', 'nurse', 'patient', 'staff']
  },
  { id: 'education', name: 'Education Template', roles: ['admin', 'teacher', 'student', 'parent'] }
];

const FALLBACK_MODULE_INFO = [
  {
    id: 'auth',
    label: 'Enhanced Authentication',
    description: 'Complete authentication suite: JWT, Azure AD, Auth0, SAML, and MFA',
    icon: Key,
    color: 'bg-blue-500',
    recommended: true,
    required: true,
    status: 'production',
    npmPackage: '@saas-framework/auth',
    features: [
      'Basic JWT Auth',
      'Azure AD SSO',
      'Auth0 Integration',
      'SAML 2.0',
      'Multi-Factor Auth'
    ]
  },
  {
    id: 'rbac',
    label: 'Role-Based Access Control',
    description: 'Advanced role and permission management with compliance frameworks',
    icon: Users,
    color: 'bg-green-500',
    recommended: true,
    required: false,
    status: 'production',
    npmPackage: '@saas-framework/rbac',
    features: [
      'Custom Roles',
      'Granular Permissions',
      'Industry Templates',
      'Compliance (SOX, HIPAA)'
    ]
  },
  {
    id: 'logging',
    label: 'Logging & Audit Trails',
    description: 'Comprehensive compliance logging, audit trails, and security monitoring',
    icon: FileText,
    color: 'bg-slate-500',
    recommended: true,
    required: false,
    priority: 'high',
    status: 'production',
    npmPackage: '@saas-framework/logging',
    features: ['Structured Logging', 'Audit Trails', 'Security Events', 'Compliance Reports']
  },
  {
    id: 'monitoring',
    label: 'Monitoring & Metrics',
    description: 'Basic health monitoring and alerting (Advanced metrics in development)',
    icon: FileText,
    color: 'bg-purple-500',
    recommended: true,
    required: false,
    priority: 'high',
    status: 'beta',
    npmPackage: '@saas-framework/monitoring',
    features: ['Health Checks', 'Basic Alerts'],
    betaNote: 'Performance Metrics and Real-time Dashboards coming soon'
  },
  {
    id: 'notifications',
    label: 'Multi-Channel Notifications',
    description: 'Email notifications with template management (SMS and push coming soon)',
    icon: Bell,
    color: 'bg-yellow-500',
    recommended: true,
    required: false,
    priority: 'medium',
    status: 'beta',
    npmPackage: '@saas-framework/notifications',
    features: ['Email (SMTP)', 'Templates', 'In-App Notifications'],
    betaNote: 'SMS, Push Notifications, and Webhooks in development'
  },
  {
    id: 'ai-copilot',
    label: 'AI Copilot & Automation',
    description: 'Configuration interface ready (AI integrations in development)',
    icon: Bot,
    color: 'bg-indigo-500',
    recommended: false,
    required: false,
    priority: 'low',
    status: 'development',
    npmPackage: '@saas-framework/ai-copilot',
    features: ['Configuration Interface'],
    developmentNote: 'Risk Analysis, Fraud Detection, and AI Insights coming soon'
  }
];

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const createTenant = useCreateTenant();

  // Dynamic data queries
  const {
    data: modulesData = [],
    isLoading: modulesLoading,
    error: modulesError
  } = useModulesData();
  const { data: businessTypes = [], isLoading: businessTypesLoading } = useBusinessTypesData();
  const { data: roleTemplates = [], isLoading: roleTemplatesLoading } = useRoleTemplatesData();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      orgId: '',
      adminEmail: '',
      businessType: '',
      roleTemplate: '',
      sendEmail: true,
      enabledModules: ['auth'],
      moduleConfigs: {}
    }
  });

  const watchedModules = form.watch('enabledModules');

  // Use dynamic modules data or fallback
  const MODULE_INFO = modulesData.length > 0 ? modulesData : FALLBACK_MODULE_INFO;

  const handleNameChange = (name: string) => {
    const orgId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');

    form.setValue('orgId', orgId);
  };

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Submitting tenant data:', data);
      const newTenant = await createTenant.mutateAsync(data);
      console.log('Tenant created successfully:', newTenant);

      // Store tenant data in sessionStorage for the success page
      sessionStorage.setItem('newTenantData', JSON.stringify(newTenant));
      console.log('Tenant data stored in sessionStorage');

      // Redirect to success page instead of tenants list
      console.log('Redirecting to success page');
      setLocation('/tenants/success');
    } catch (error) {
      console.error('Error creating tenant:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic info
        return form.getValues('name') && form.getValues('orgId') && form.getValues('adminEmail');
      case 1: // Modules
        return watchedModules.length > 0;
      case 2: // Configuration
        return true; // Optional configurations
      default:
        return true;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6'>
      <div className='max-w-4xl mx-auto pb-20'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8'>
          <Button
            variant='ghost'
            onClick={() => setLocation('/tenants')}
            className='flex items-center gap-2'
            data-testid='button-back'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to Tenants
          </Button>
          <div>
            <h1 className='text-3xl font-bold text-slate-800'>Tenant Onboarding</h1>
            <p className='text-slate-600'>Follow the guided setup to create your new tenant</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div className='text-sm font-medium text-slate-700'>
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <div className='text-sm text-slate-500'>{Math.round(progress)}% Complete</div>
          </div>
          <Progress value={progress} className='mb-4' />

          {/* Step Indicators */}
          <div className='flex items-center justify-between'>
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className='flex flex-col items-center'>
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }
                  `}
                  >
                    {isCompleted ? (
                      <CheckCircle className='h-6 w-6' />
                    ) : (
                      <StepIcon className='h-6 w-6' />
                    )}
                  </div>
                  <div className='text-center'>
                    <div
                      className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-600'}`}
                    >
                      {step.title}
                    </div>
                    <div className='text-xs text-slate-500 max-w-24'>{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AnimatePresence mode='wait'>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 0: Basic Information */}
                {currentStep === 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Building2 className='h-5 w-5 text-blue-500' />
                        Organization Details
                      </CardTitle>
                      <CardDescription>
                        Enter your organization information and admin contact details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          control={form.control}
                          name='name'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder='Acme Corporation'
                                  {...field}
                                  onChange={e => {
                                    field.onChange(e);
                                    handleNameChange(e.target.value);
                                  }}
                                  data-testid='input-org-name'
                                />
                              </FormControl>
                              <FormDescription>
                                The display name for your organization
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='orgId'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization ID *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder='acme-corp'
                                  {...field}
                                  data-testid='input-org-id'
                                />
                              </FormControl>
                              <FormDescription>
                                Unique identifier (URL slug) - auto-generated from name
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name='adminEmail'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Administrator Email *</FormLabel>
                            <FormControl>
                              <Input
                                type='email'
                                placeholder='admin@acme.com'
                                {...field}
                                data-testid='input-admin-email'
                              />
                            </FormControl>
                            <FormDescription>
                              Primary contact and initial admin user - will receive API keys and
                              setup instructions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='sendEmail'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid='checkbox-send-email'
                              />
                            </FormControl>
                            <div className='space-y-1 leading-none'>
                              <FormLabel>Send Welcome Email</FormLabel>
                              <FormDescription>
                                Automatically send onboarding instructions and API keys to the admin
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Step 1: Module Selection */}
                {currentStep === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Shield className='h-5 w-5 text-green-500' />
                        Authentication Modules
                      </CardTitle>
                      <CardDescription>
                        Select the authentication methods you want to enable for your tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      {/* Loading State */}
                      {modulesLoading && (
                        <div className='flex items-center justify-center p-8'>
                          <Loader2 className='h-6 w-6 animate-spin mr-2' />
                          <span>Loading available modules...</span>
                        </div>
                      )}

                      {/* Error State */}
                      {modulesError && (
                        <div className='flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
                          <Database className='h-5 w-5 text-yellow-600 mr-2' />
                          <div>
                            <p className='text-yellow-800 font-medium'>Using offline module data</p>
                            <p className='text-yellow-700 text-sm'>
                              Unable to load latest modules from server
                            </p>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name='enabledModules'
                        render={() => (
                          <FormItem>
                            <div className='grid grid-cols-1 gap-4'>
                              {MODULE_INFO.map(module => {
                                const ModuleIcon = module.icon;
                                return (
                                  <FormField
                                    key={module.id}
                                    control={form.control}
                                    name='enabledModules'
                                    render={({ field }) => (
                                      <FormItem className='flex flex-row items-start space-x-4 space-y-0 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-colors p-4'>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(module.id as any)}
                                            onCheckedChange={checked => {
                                              return checked
                                                ? field.onChange([...field.value, module.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value: string) => value !== module.id
                                                    )
                                                  );
                                            }}
                                            disabled={module.required}
                                            data-testid={`checkbox-module-${module.id}`}
                                          />
                                        </FormControl>
                                        <div
                                          className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}
                                        >
                                          <ModuleIcon className='h-6 w-6 text-white' />
                                        </div>
                                        <div className='flex-1 space-y-2'>
                                          <div className='flex items-center gap-2'>
                                            <FormLabel className='text-base font-semibold cursor-pointer'>
                                              {module.label}
                                            </FormLabel>
                                            {module.recommended && (
                                              <Badge variant='secondary' className='text-xs'>
                                                Recommended
                                              </Badge>
                                            )}
                                            {module.required && (
                                              <Badge variant='destructive' className='text-xs'>
                                                Required
                                              </Badge>
                                            )}
                                          </div>
                                          <FormDescription className='text-sm text-slate-600'>
                                            {module.description}
                                          </FormDescription>
                                        </div>
                                      </FormItem>
                                    )}
                                  />
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Module Configuration */}
                {currentStep === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Settings className='h-5 w-5 text-purple-500' />
                        Module Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your selected authentication and authorization modules
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className='space-y-8'>
                        {/* RBAC Configuration - Always show if RBAC is enabled */}
                        {watchedModules.includes('rbac') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-green-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Shield className='h-5 w-5 text-green-500' />
                              RBAC Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                  <Label className='text-sm font-medium'>Permission Template</Label>
                                  <Select
                                    defaultValue='standard'
                                    onValueChange={value => {
                                      const currentConfigs = form.getValues('moduleConfigs') || {};
                                      form.setValue('moduleConfigs', {
                                        ...currentConfigs,
                                        rbac: {
                                          permissionTemplate: value,
                                          businessType:
                                            form.getValues('moduleConfigs.rbac.businessType') ||
                                            'general',
                                          customPermissions:
                                            form.getValues(
                                              'moduleConfigs.rbac.customPermissions'
                                            ) || []
                                        }
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder='Select permission template' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='minimal'>Minimal (Basic CRUD)</SelectItem>
                                      <SelectItem value='standard'>
                                        Standard (User Management + CRUD)
                                      </SelectItem>
                                      <SelectItem value='enterprise'>
                                        Enterprise (Full Admin Access)
                                      </SelectItem>
                                      <SelectItem value='custom'>
                                        Custom (Configure Later)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className='text-xs text-slate-600 mt-1'>
                                    Choose a permission template that matches your organization's
                                    needs
                                  </p>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Business Type</Label>
                                  <Select
                                    defaultValue='general'
                                    onValueChange={value => {
                                      const currentConfigs = form.getValues('moduleConfigs') || {};
                                      const currentRbac = currentConfigs.rbac || {};
                                      form.setValue('moduleConfigs', {
                                        ...currentConfigs,
                                        rbac: {
                                          ...currentRbac,
                                          businessType: value
                                        }
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder='Select business type' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='general'>General Business</SelectItem>
                                      <SelectItem value='saas'>SaaS Platform</SelectItem>
                                      <SelectItem value='ecommerce'>E-commerce</SelectItem>
                                      <SelectItem value='healthcare'>Healthcare</SelectItem>
                                      <SelectItem value='finance'>Financial Services</SelectItem>
                                      <SelectItem value='education'>Education</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className='text-xs text-slate-600 mt-1'>
                                    Pre-configured permissions for your industry
                                  </p>
                                </div>
                              </div>
                              <div className='space-y-3'>
                                <Label className='text-sm font-medium'>
                                  Default Role Hierarchy
                                </Label>
                                <div className='space-y-2'>
                                  <div className='flex items-center justify-between p-2 bg-white rounded border'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='default' className='text-xs'>
                                        Super Admin
                                      </Badge>
                                      <span className='text-sm text-slate-600'>
                                        Full system access, tenant management
                                      </span>
                                    </div>
                                    <span className='text-xs text-slate-400'>Required</span>
                                  </div>
                                  <div className='flex items-center justify-between p-2 bg-white rounded border'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='secondary' className='text-xs'>
                                        Admin
                                      </Badge>
                                      <span className='text-sm text-slate-600'>
                                        User management, all permissions
                                      </span>
                                    </div>
                                    <span className='text-xs text-slate-400'>Recommended</span>
                                  </div>
                                  <div className='flex items-center justify-between p-2 bg-white rounded border'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='outline' className='text-xs'>
                                        Manager
                                      </Badge>
                                      <span className='text-sm text-slate-600'>
                                        Team management, limited admin
                                      </span>
                                    </div>
                                    <span className='text-xs text-slate-400'>Optional</span>
                                  </div>
                                  <div className='flex items-center justify-between p-2 bg-white rounded border'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='outline' className='text-xs'>
                                        User
                                      </Badge>
                                      <span className='text-sm text-slate-600'>
                                        Standard user permissions
                                      </span>
                                    </div>
                                    <span className='text-xs text-slate-400'>Default</span>
                                  </div>
                                  <div className='flex items-center justify-between p-2 bg-white rounded border'>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant='outline' className='text-xs'>
                                        Viewer
                                      </Badge>
                                      <span className='text-sm text-slate-600'>
                                        Read-only access
                                      </span>
                                    </div>
                                    <span className='text-xs text-slate-400'>Limited</span>
                                  </div>
                                </div>
                                <p className='text-xs text-slate-600 mt-1'>
                                  Role hierarchy will be created based on your permission template
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {watchedModules.includes('azure-ad') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-blue-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Globe className='h-5 w-5 text-blue-500' />
                              Azure Active Directory Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.azure-ad.tenantId'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Azure Tenant ID *</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Azure AD Directory (tenant) ID
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.azure-ad.clientId'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Application (Client) ID *</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Your Azure AD Application ID
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.azure-ad.clientSecret'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Client Secret *</FormLabel>
                                      <FormControl>
                                        <Input
                                          type='password'
                                          placeholder='Your Azure AD Client Secret'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Azure AD application secret value
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.azure-ad.domain'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Domain (Optional)</FormLabel>
                                      <FormControl>
                                        <Input placeholder='your-domain.com' {...field} />
                                      </FormControl>
                                      <FormDescription>Your organization domain</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name='moduleConfigs.azure-ad.redirectUri'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Redirect URI</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder='https://your-app.com/auth/azure/callback'
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      OAuth redirect URI configured in Azure AD
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className='bg-blue-50 p-3 rounded-lg border border-blue-200'>
                                <p className='text-sm font-medium text-blue-800'>
                                  Additional Settings (Optional)
                                </p>
                                <div className='mt-2 space-y-2'>
                                  <label className='flex items-center space-x-2'>
                                    <input type='checkbox' className='rounded' defaultChecked />
                                    <span className='text-sm text-blue-700'>
                                      Enable group claims
                                    </span>
                                  </label>
                                  <label className='flex items-center space-x-2'>
                                    <input type='checkbox' className='rounded' defaultChecked />
                                    <span className='text-sm text-blue-700'>
                                      Multi-tenant support
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {watchedModules.includes('auth0') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-orange-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Zap className='h-5 w-5 text-orange-500' />
                              Auth0 Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.domain'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Auth0 Domain *</FormLabel>
                                      <FormControl>
                                        <Input placeholder='your-domain.auth0.com' {...field} />
                                      </FormControl>
                                      <FormDescription>Your Auth0 tenant domain</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.clientId'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Client ID *</FormLabel>
                                      <FormControl>
                                        <Input placeholder='Your Auth0 Client ID' {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        Your Auth0 application client ID
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.clientSecret'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Client Secret *</FormLabel>
                                      <FormControl>
                                        <Input
                                          type='password'
                                          placeholder='Your Auth0 Client Secret'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>Auth0 application secret</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.audience'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Audience (API Identifier)</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='https://your-api.auth0.com'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        API identifier for JWT tokens
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.callbackUrl'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Callback URL</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='https://your-app.com/callback'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>OAuth callback URL</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.auth0.logoutUrl'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Logout URL</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='https://your-app.com/logout'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>Post-logout redirect URL</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {watchedModules.includes('saml') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-purple-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Shield className='h-5 w-5 text-purple-500' />
                              SAML Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.saml.entryPoint'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>SSO Entry Point URL *</FormLabel>
                                      <FormControl>
                                        <Input placeholder='https://your-idp.com/sso' {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        Your identity provider's SSO URL
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.saml.issuer'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Issuer *</FormLabel>
                                      <FormControl>
                                        <Input placeholder='your-saml-issuer' {...field} />
                                      </FormControl>
                                      <FormDescription>SAML issuer identifier</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name='moduleConfigs.saml.cert'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>X.509 Certificate *</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder='-----BEGIN CERTIFICATE-----&#10;MIICertificate...&#10;-----END CERTIFICATE-----'
                                        rows={4}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Identity provider's public certificate (PEM format)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.saml.identifierFormat'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Identifier Format</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={
                                          field.value ||
                                          'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
                                        }
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder='Select identifier format' />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value='urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'>
                                            Email Address
                                          </SelectItem>
                                          <SelectItem value='urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'>
                                            Unspecified
                                          </SelectItem>
                                          <SelectItem value='urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'>
                                            Persistent
                                          </SelectItem>
                                          <SelectItem value='urn:oasis:names:tc:SAML:2.0:nameid-format:transient'>
                                            Transient
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        NameID format for SAML assertions
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name='moduleConfigs.saml.callbackUrl'
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Callback URL</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='https://your-app.com/saml/acs'
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Assertion Consumer Service URL
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Logging Module Configuration */}
                        {watchedModules.includes('logging') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-slate-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <FileText className='h-5 w-5 text-slate-500' />
                              Logging & Monitoring Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                  <Label className='text-sm font-medium'>Log Levels</Label>
                                  <div className='space-y-2 mt-2'>
                                    {['error', 'warn', 'info', 'debug', 'trace'].map(level => (
                                      <label key={level} className='flex items-center space-x-2'>
                                        <input
                                          type='checkbox'
                                          className='rounded'
                                          defaultChecked={level === 'error' || level === 'warn'}
                                        />
                                        <span className='text-sm capitalize'>{level}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Destinations</Label>
                                  <div className='space-y-2 mt-2'>
                                    {['database', 'elasticsearch', 'cloudwatch', 'datadog'].map(
                                      dest => (
                                        <label key={dest} className='flex items-center space-x-2'>
                                          <input
                                            type='checkbox'
                                            className='rounded'
                                            defaultChecked={dest === 'database'}
                                          />
                                          <span className='text-sm capitalize'>{dest}</span>
                                        </label>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className='bg-slate-100 p-3 rounded-lg'>
                                <p className='text-sm font-medium text-slate-700'>
                                  Retention Settings
                                </p>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-600'>
                                  <div>Security logs: 7 years</div>
                                  <div>Error logs: 1 year</div>
                                  <div>Performance logs: 90 days</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notifications Module Configuration */}
                        {watchedModules.includes('notifications') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-yellow-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Bell className='h-5 w-5 text-yellow-500' />
                              Notifications Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                  <Label className='text-sm font-medium'>
                                    Notification Channels
                                  </Label>
                                  <div className='space-y-2 mt-2'>
                                    {['email', 'sms', 'push', 'webhook', 'slack'].map(channel => (
                                      <label key={channel} className='flex items-center space-x-2'>
                                        <input
                                          type='checkbox'
                                          className='rounded'
                                          defaultChecked={channel === 'email'}
                                        />
                                        <span className='text-sm capitalize'>{channel}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Email Provider</Label>
                                  <Select defaultValue='sendgrid'>
                                    <SelectTrigger className='mt-2'>
                                      <SelectValue placeholder='Select provider' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='sendgrid'>SendGrid</SelectItem>
                                      <SelectItem value='mailgun'>Mailgun</SelectItem>
                                      <SelectItem value='ses'>Amazon SES</SelectItem>
                                      <SelectItem value='smtp'>Custom SMTP</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className='bg-yellow-100 p-3 rounded-lg'>
                                <p className='text-sm font-medium text-yellow-800'>
                                  Default Templates
                                </p>
                                <div className='space-y-1 mt-2 text-xs text-yellow-700'>
                                  <div>✓ Welcome email</div>
                                  <div>✓ Security alerts</div>
                                  <div>✓ Payment notifications</div>
                                  <div>✓ Trial ending reminders</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Copilot Module Configuration */}
                        {watchedModules.includes('ai-copilot') && (
                          <div className='space-y-4 border rounded-lg p-4 bg-indigo-50'>
                            <h4 className='text-lg font-semibold flex items-center gap-2'>
                              <Bot className='h-5 w-5 text-indigo-500' />
                              AI Copilot Configuration
                            </h4>
                            <div className='space-y-4'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                  <Label className='text-sm font-medium'>AI Provider</Label>
                                  <Select
                                    defaultValue='openai'
                                    onValueChange={value => {
                                      const currentConfigs = form.getValues('moduleConfigs') || {};
                                      form.setValue('moduleConfigs', {
                                        ...currentConfigs,
                                        'ai-copilot': { provider: value }
                                      });
                                    }}
                                  >
                                    <SelectTrigger className='mt-2'>
                                      <SelectValue placeholder='Select AI provider' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='openai'>OpenAI</SelectItem>
                                      <SelectItem value='anthropic'>Anthropic (Claude)</SelectItem>
                                      <SelectItem value='azure-openai'>Azure OpenAI</SelectItem>
                                      <SelectItem value='aws-bedrock'>AWS Bedrock</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className='text-sm font-medium'>Model</Label>
                                  <Select defaultValue='gpt-4o'>
                                    <SelectTrigger className='mt-2'>
                                      <SelectValue placeholder='Select model' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='gpt-4o'>GPT-4o</SelectItem>
                                      <SelectItem value='gpt-4'>GPT-4</SelectItem>
                                      <SelectItem value='claude-3-sonnet'>
                                        Claude 3 Sonnet
                                      </SelectItem>
                                      <SelectItem value='claude-3-haiku'>Claude 3 Haiku</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div>
                                <Label className='text-sm font-medium'>AI Capabilities</Label>
                                <div className='grid grid-cols-2 gap-2 mt-2'>
                                  {[
                                    { id: 'chatSupport', label: 'Chat Support' },
                                    { id: 'codeAssistance', label: 'Code Assistance' },
                                    { id: 'documentAnalysis', label: 'Document Analysis' },
                                    { id: 'workflowAutomation', label: 'Workflow Automation' }
                                  ].map(capability => (
                                    <label
                                      key={capability.id}
                                      className='flex items-center space-x-2'
                                    >
                                      <input type='checkbox' className='rounded' defaultChecked />
                                      <span className='text-sm'>{capability.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className='bg-indigo-100 p-3 rounded-lg border border-indigo-200'>
                                <p className='text-sm font-medium text-indigo-800'>
                                  Safety Settings
                                </p>
                                <div className='space-y-2 mt-2'>
                                  <label className='flex items-center space-x-2'>
                                    <input type='checkbox' className='rounded' defaultChecked />
                                    <span className='text-sm text-indigo-700'>
                                      Content filtering
                                    </span>
                                  </label>
                                  <label className='flex items-center space-x-2'>
                                    <input type='checkbox' className='rounded' defaultChecked />
                                    <span className='text-sm text-indigo-700'>PII detection</span>
                                  </label>
                                  <label className='flex items-center space-x-2'>
                                    <input type='checkbox' className='rounded' defaultChecked />
                                    <span className='text-sm text-indigo-700'>Rate limiting</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <CheckCircle className='h-5 w-5 text-green-500' />
                        Review & Create Tenant
                      </CardTitle>
                      <CardDescription>
                        Review your configuration and create your new tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {/* Organization Info */}
                        <div className='space-y-4'>
                          <h4 className='font-semibold text-slate-800'>Organization Details</h4>
                          <div className='space-y-2'>
                            <div>
                              <span className='text-sm text-slate-500'>Name:</span>
                              <p className='font-medium'>{form.watch('name')}</p>
                            </div>
                            <div>
                              <span className='text-sm text-slate-500'>ID:</span>
                              <p className='font-medium text-blue-600'>{form.watch('orgId')}</p>
                            </div>
                            <div>
                              <span className='text-sm text-slate-500'>Admin Email:</span>
                              <p className='font-medium'>{form.watch('adminEmail')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Enabled Modules */}
                        <div className='space-y-4'>
                          <h4 className='font-semibold text-slate-800'>Authentication Modules</h4>
                          <div className='space-y-2'>
                            {watchedModules.map(moduleId => {
                              const module = MODULE_INFO.find(m => m.id === moduleId);
                              if (!module) return null;
                              const ModuleIcon = module.icon;

                              return (
                                <div key={moduleId} className='flex items-center gap-2'>
                                  <div
                                    className={`w-6 h-6 rounded ${module.color} flex items-center justify-center`}
                                  >
                                    <ModuleIcon className='h-4 w-4 text-white' />
                                  </div>
                                  <span className='font-medium'>{module.label}</span>
                                  {module.status && (
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full ${
                                        module.status === 'production'
                                          ? 'bg-green-100 text-green-700'
                                          : module.status === 'beta'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {module.status === 'production'
                                        ? 'Production'
                                        : module.status === 'beta'
                                          ? 'Beta'
                                          : 'Development'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* RBAC Configuration - Only show if RBAC module is selected */}
                      {watchedModules.includes('rbac') && (
                        <div className='border-t pt-6'>
                          <h4 className='font-semibold text-slate-800 mb-4'>RBAC Configuration</h4>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {/* Business Type */}
                            <div className='space-y-2'>
                              <FormField
                                control={form.control}
                                name='businessType'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Business Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder='Select business type' />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value='healthcare'>Healthcare</SelectItem>
                                        <SelectItem value='finance'>Finance</SelectItem>
                                        <SelectItem value='retail'>Retail</SelectItem>
                                        <SelectItem value='education'>Education</SelectItem>
                                        <SelectItem value='technology'>Technology</SelectItem>
                                        <SelectItem value='manufacturing'>Manufacturing</SelectItem>
                                        <SelectItem value='other'>Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Role Template */}
                            <div className='space-y-2'>
                              <FormField
                                control={form.control}
                                name='roleTemplate'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Initial Role Template</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder='Choose role template' />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value='admin-only'>Admin Only</SelectItem>
                                        <SelectItem value='basic-hierarchy'>
                                          Basic Hierarchy
                                        </SelectItem>
                                        <SelectItem value='department-based'>
                                          Department Based
                                        </SelectItem>
                                        <SelectItem value='project-based'>Project Based</SelectItem>
                                        <SelectItem value='custom'>Custom Setup</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                        <h5 className='font-medium text-blue-800 mb-2'>What happens next?</h5>
                        <ul className='text-sm text-blue-700 space-y-1'>
                          <li>• Tenant will be created with unique API keys</li>
                          <li>• Admin user account will be set up with temporary password</li>
                          {form.watch('sendEmail') && (
                            <li>• Welcome email will be sent with setup instructions</li>
                          )}
                          <li>• You can configure additional settings from the tenant dashboard</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className='flex justify-between mt-8 mb-8'>
              <Button
                type='button'
                variant='outline'
                onClick={prevStep}
                disabled={currentStep === 0}
                className='flex items-center gap-2'
              >
                <ArrowLeft className='h-4 w-4' />
                Previous
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  type='button'
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className='flex items-center gap-2'
                >
                  Next
                  <ArrowRight className='h-4 w-4' />
                </Button>
              ) : (
                <Button
                  type='submit'
                  disabled={createTenant.isPending || !canProceed()}
                  className='flex items-center gap-2'
                  data-testid='button-create-tenant'
                >
                  {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
                  <CheckCircle className='h-4 w-4' />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
