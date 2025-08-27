import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
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
import { type CreateTenantData } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle,
  ChevronDown,
  Key,
  Loader2,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { z } from 'zod';

// Updated form schema with authentication provider configs
const formSchema = z.object({
  // Basic Information
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  contactEmail: z.string().email('Please enter a valid email address'),
  domainName: z.string().optional(),
  description: z.string().optional(),

  // Module Selection
  enabledModules: z.array(z.string()).min(1, 'Please select at least one module'),

  // Authentication Configuration
  authProviders: z.array(z.string()).optional(),
  auth0Config: z
    .object({
      domain: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional()
    })
    .optional(),
  azureAdConfig: z
    .object({
      tenantId: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional()
    })
    .optional(),
  samlConfig: z
    .object({
      entityId: z.string().optional(),
      ssoUrl: z.string().optional(),
      certificate: z.string().optional()
    })
    .optional(),
  jwtConfig: z
    .object({
      secret: z.string().optional(),
      algorithm: z.string().optional(),
      expiresIn: z.string().optional()
    })
    .optional(),

  // RBAC Configuration
  businessType: z.string().optional(),
  roleTemplate: z.string().optional(),

  // Notifications Configuration (only SMTP)
  emailHost: z.string().optional(),
  emailPort: z.string().optional(),
  emailUser: z.string().optional(),
  emailPassword: z.string().optional(),
  emailFrom: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

// Available modules with honest descriptions
const availableModules = [
  {
    id: 'enhanced-authentication',
    label: 'Enhanced Authentication',
    description: 'Supports Auth0, Azure AD, SAML, and JWT authentication',
    icon: Key,
    required: false,
    category: 'security',
    hasConfig: true
  },
  {
    id: 'rbac',
    label: 'Role-Based Access Control',
    description: 'User roles and permissions management',
    icon: Shield,
    required: true,
    category: 'security',
    hasConfig: true
  },
  {
    id: 'user-management',
    label: 'User Management',
    description: 'Basic user CRUD operations and invitations',
    icon: Users,
    required: true,
    category: 'core',
    hasConfig: false
  },
  {
    id: 'notifications-email',
    label: 'Email Notifications',
    description: 'SMTP-based email notifications only',
    icon: Bell,
    required: false,
    category: 'communication',
    hasConfig: true
  }
];

// Authentication providers
const authProviders = [
  { id: 'auth0', label: 'Auth0', description: 'Auth0 Universal Login' },
  { id: 'azure-ad', label: 'Azure AD', description: 'Microsoft Azure Active Directory' },
  { id: 'saml', label: 'SAML 2.0', description: 'SAML-based SSO' },
  { id: 'jwt', label: 'JWT', description: 'JSON Web Token authentication' }
];

// Fetch dynamic data hooks
function useBusinessTypesData() {
  return useQuery({
    queryKey: ['/api/config/business-types'],
    queryFn: async () => {
      const response = await fetch('/api/config/business-types');
      if (!response.ok) return [];
      return response.json();
    }
  });
}

function useRoleTemplatesData() {
  return useQuery({
    queryKey: ['/api/config/role-templates'],
    queryFn: async () => {
      const response = await fetch('/api/config/role-templates');
      if (!response.ok) return [];
      return response.json();
    }
  });
}

// Wizard steps (simplified to 3 steps)
const steps = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Organization details and contact information'
  },
  {
    id: 2,
    title: 'Module Selection & Configuration',
    description: 'Choose modules and configure them inline'
  },
  {
    id: 3,
    title: 'Review & Create',
    description: 'Review configuration and create tenant'
  }
];

export default function EnhancedOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const createTenant = useCreateTenant();
  const { data: businessTypes = [], isLoading: businessTypesLoading } = useBusinessTypesData();
  const { data: roleTemplates = [], isLoading: roleTemplatesLoading } = useRoleTemplatesData();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgName: '',
      contactEmail: '',
      domainName: '',
      description: '',
      enabledModules: ['rbac', 'user-management'], // Required modules pre-selected
      authProviders: [],
      businessType: '',
      roleTemplate: ''
    }
  });

  const { watch, setValue, getValues } = form;
  const enabledModules = watch('enabledModules');
  const selectedAuthProviders = watch('authProviders') || [];

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleModuleToggle = (moduleId: string, checked: boolean) => {
    const currentModules = getValues('enabledModules');
    if (checked) {
      setValue('enabledModules', [...currentModules, moduleId]);
      // Auto-expand when module is selected
      setExpandedModules(prev => new Set(Array.from(prev).concat(moduleId)));
    } else {
      setValue(
        'enabledModules',
        currentModules.filter(id => id !== moduleId)
      );
      // Collapse when module is deselected
      setExpandedModules(prev => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  const handleAuthProviderToggle = (providerId: string, checked: boolean) => {
    const currentProviders = getValues('authProviders') || [];
    if (checked) {
      setValue('authProviders', [...currentProviders, providerId]);
    } else {
      setValue(
        'authProviders',
        currentProviders.filter(id => id !== providerId)
      );
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Transform our form data to match the API's expected CreateTenantData interface
      const apiData: CreateTenantData = {
        name: data.orgName,
        orgId: data.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        adminEmail: data.contactEmail,
        sendEmail: true,
        enabledModules: data.enabledModules,
        moduleConfigs: {
          authentication: {
            providers: data.authProviders || [],
            auth0: data.auth0Config,
            azureAd: data.azureAdConfig,
            saml: data.samlConfig,
            jwt: data.jwtConfig
          },
          rbac: {
            businessType: data.businessType,
            roleTemplate: data.roleTemplate
          },
          notifications: {
            email: {
              host: data.emailHost,
              port: data.emailPort ? parseInt(data.emailPort) : undefined,
              user: data.emailUser,
              password: data.emailPassword,
              from: data.emailFrom
            }
          },
          general: {
            domainName: data.domainName,
            description: data.description
          }
        }
      };

      const result = await createTenant.mutateAsync(apiData);

      // Store tenant data in sessionStorage for the success page
      sessionStorage.setItem('newTenantData', JSON.stringify(result));

      setLocation('/tenants/success');
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8'>
      <div className='container mx-auto max-w-4xl px-4'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-slate-900'>Enhanced Tenant Setup</h1>
          <p className='mt-2 text-slate-600'>
            Create your organization with honest, implemented features
          </p>
        </div>

        {/* Progress */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            {steps.map((step, index) => (
              <div key={step.id} className='flex items-center'>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle className='h-5 w-5' /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-24 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className='h-2' />
          <div className='mt-2 text-center'>
            <h2 className='text-xl font-semibold text-slate-900'>{steps[currentStep - 1].title}</h2>
            <p className='text-slate-600'>{steps[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <AnimatePresence mode='wait'>
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key='step1'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Building2 className='h-5 w-5' />
                        Organization Information
                      </CardTitle>
                      <CardDescription>
                        Provide basic details about your organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <FormField
                          control={form.control}
                          name='orgName'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name *</FormLabel>
                              <FormControl>
                                <Input placeholder='Enter organization name' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='contactEmail'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email *</FormLabel>
                              <FormControl>
                                <Input placeholder='admin@example.com' type='email' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='domainName'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Domain Name (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder='example.com' {...field} />
                              </FormControl>
                              <FormDescription>Your organization's primary domain</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name='description'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='Brief description of your organization'
                                className='min-h-[80px]'
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Module Selection & Configuration */}
              {currentStep === 2 && (
                <motion.div
                  key='step2'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Settings className='h-5 w-5' />
                        Available Modules
                      </CardTitle>
                      <CardDescription>
                        Select modules and configure them inline. Only implemented features are
                        shown.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {availableModules.map(module => {
                        const isSelected = enabledModules.includes(module.id);
                        const isExpanded = expandedModules.has(module.id);
                        const ModuleIcon = module.icon;

                        return (
                          <div key={module.id} className='border rounded-lg'>
                            <div className='p-4'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={module.required}
                                    onCheckedChange={checked =>
                                      handleModuleToggle(module.id, checked as boolean)
                                    }
                                  />
                                  <ModuleIcon className='h-5 w-5 text-slate-600' />
                                  <div>
                                    <div className='flex items-center gap-2'>
                                      <h3 className='font-semibold text-slate-900'>
                                        {module.label}
                                      </h3>
                                      {module.required && (
                                        <Badge variant='secondary' className='text-xs'>
                                          Required
                                        </Badge>
                                      )}
                                    </div>
                                    <p className='text-sm text-slate-600'>{module.description}</p>
                                  </div>
                                </div>
                                {module.hasConfig && isSelected && (
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => toggleModuleExpansion(module.id)}
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Inline Configuration */}
                            {module.hasConfig && isSelected && (
                              <Collapsible open={isExpanded}>
                                <CollapsibleContent className='border-t bg-slate-50'>
                                  <div className='p-4 space-y-4'>
                                    {/* Enhanced Authentication Configuration */}
                                    {module.id === 'enhanced-authentication' && (
                                      <div className='space-y-4'>
                                        <h4 className='font-medium text-slate-900'>
                                          Authentication Providers
                                        </h4>
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                          {authProviders.map(provider => (
                                            <div key={provider.id} className='border rounded p-3'>
                                              <div className='flex items-center gap-2 mb-2'>
                                                <Checkbox
                                                  checked={selectedAuthProviders.includes(
                                                    provider.id
                                                  )}
                                                  onCheckedChange={checked =>
                                                    handleAuthProviderToggle(
                                                      provider.id,
                                                      checked as boolean
                                                    )
                                                  }
                                                />
                                                <span className='font-medium'>
                                                  {provider.label}
                                                </span>
                                              </div>
                                              <p className='text-sm text-slate-600 mb-3'>
                                                {provider.description}
                                              </p>

                                              {/* Provider-specific configuration */}
                                              {selectedAuthProviders.includes(provider.id) && (
                                                <div className='space-y-3 pl-6 border-l-2 border-slate-200'>
                                                  {provider.id === 'auth0' && (
                                                    <>
                                                      <FormField
                                                        control={form.control}
                                                        name='auth0Config.domain'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Auth0 Domain
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='your-domain.auth0.com'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='auth0Config.clientId'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Client ID
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='Auth0 Client ID'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='auth0Config.clientSecret'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Client Secret
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                type='password'
                                                                placeholder='Auth0 Client Secret'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                    </>
                                                  )}

                                                  {provider.id === 'azure-ad' && (
                                                    <>
                                                      <FormField
                                                        control={form.control}
                                                        name='azureAdConfig.tenantId'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Azure Tenant ID
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='your-tenant-id'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='azureAdConfig.clientId'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Application ID
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='Azure Application ID'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='azureAdConfig.clientSecret'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Client Secret
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                type='password'
                                                                placeholder='Azure Client Secret'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                    </>
                                                  )}

                                                  {provider.id === 'saml' && (
                                                    <>
                                                      <FormField
                                                        control={form.control}
                                                        name='samlConfig.entityId'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Entity ID
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='SAML Entity ID'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='samlConfig.ssoUrl'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              SSO URL
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                placeholder='https://your-idp.com/sso'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='samlConfig.certificate'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              X.509 Certificate
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Textarea
                                                                placeholder='-----BEGIN CERTIFICATE-----'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                    </>
                                                  )}

                                                  {provider.id === 'jwt' && (
                                                    <>
                                                      <FormField
                                                        control={form.control}
                                                        name='jwtConfig.secret'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              JWT Secret
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input
                                                                type='password'
                                                                placeholder='JWT signing secret'
                                                                {...field}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='jwtConfig.algorithm'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Algorithm
                                                            </FormLabel>
                                                            <Select
                                                              onValueChange={field.onChange}
                                                              value={field.value}
                                                            >
                                                              <SelectTrigger>
                                                                <SelectValue placeholder='Select algorithm' />
                                                              </SelectTrigger>
                                                              <SelectContent>
                                                                <SelectItem value='HS256'>
                                                                  HS256
                                                                </SelectItem>
                                                                <SelectItem value='HS384'>
                                                                  HS384
                                                                </SelectItem>
                                                                <SelectItem value='HS512'>
                                                                  HS512
                                                                </SelectItem>
                                                                <SelectItem value='RS256'>
                                                                  RS256
                                                                </SelectItem>
                                                              </SelectContent>
                                                            </Select>
                                                          </FormItem>
                                                        )}
                                                      />
                                                      <FormField
                                                        control={form.control}
                                                        name='jwtConfig.expiresIn'
                                                        render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel className='text-sm'>
                                                              Expires In
                                                            </FormLabel>
                                                            <FormControl>
                                                              <Input placeholder='24h' {...field} />
                                                            </FormControl>
                                                          </FormItem>
                                                        )}
                                                      />
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* RBAC Configuration */}
                                    {module.id === 'rbac' && (
                                      <div className='space-y-4'>
                                        <h4 className='font-medium text-slate-900'>
                                          RBAC Configuration
                                        </h4>
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                          <FormField
                                            control={form.control}
                                            name='businessType'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Business Type</FormLabel>
                                                <Select
                                                  onValueChange={field.onChange}
                                                  value={field.value}
                                                >
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder='Select business type' />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {businessTypesLoading ? (
                                                      <SelectItem value=''>Loading...</SelectItem>
                                                    ) : businessTypes.length > 0 ? (
                                                      businessTypes.map((type: any) => (
                                                        <SelectItem key={type.id} value={type.id}>
                                                          {type.name}
                                                        </SelectItem>
                                                      ))
                                                    ) : (
                                                      // Fallback hardcoded values when API is empty
                                                      <>
                                                        <SelectItem value='technology'>
                                                          Technology
                                                        </SelectItem>
                                                        <SelectItem value='healthcare'>
                                                          Healthcare
                                                        </SelectItem>
                                                        <SelectItem value='finance'>
                                                          Finance
                                                        </SelectItem>
                                                        <SelectItem value='retail'>
                                                          Retail
                                                        </SelectItem>
                                                        <SelectItem value='manufacturing'>
                                                          Manufacturing
                                                        </SelectItem>
                                                        <SelectItem value='education'>
                                                          Education
                                                        </SelectItem>
                                                        <SelectItem value='other'>Other</SelectItem>
                                                      </>
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name='roleTemplate'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Role Template</FormLabel>
                                                <Select
                                                  onValueChange={field.onChange}
                                                  value={field.value}
                                                >
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder='Select role template' />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {roleTemplatesLoading ? (
                                                      <SelectItem value=''>Loading...</SelectItem>
                                                    ) : roleTemplates.length > 0 ? (
                                                      roleTemplates.map((template: any) => (
                                                        <SelectItem
                                                          key={template.id}
                                                          value={template.id}
                                                        >
                                                          {template.name}
                                                        </SelectItem>
                                                      ))
                                                    ) : (
                                                      // Fallback hardcoded values when API is empty
                                                      <>
                                                        <SelectItem value='standard'>
                                                          Standard
                                                        </SelectItem>
                                                        <SelectItem value='enterprise'>
                                                          Enterprise
                                                        </SelectItem>
                                                        <SelectItem value='minimal'>
                                                          Minimal
                                                        </SelectItem>
                                                      </>
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Email Notifications Configuration */}
                                    {module.id === 'notifications-email' && (
                                      <div className='space-y-4'>
                                        <h4 className='font-medium text-slate-900'>
                                          SMTP Email Configuration
                                        </h4>
                                        <p className='text-sm text-slate-600'>
                                          Configure SMTP settings for email notifications
                                        </p>
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                          <FormField
                                            control={form.control}
                                            name='emailHost'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>SMTP Host</FormLabel>
                                                <FormControl>
                                                  <Input placeholder='smtp.gmail.com' {...field} />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name='emailPort'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>SMTP Port</FormLabel>
                                                <FormControl>
                                                  <Input placeholder='587' {...field} />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name='emailUser'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>SMTP Username</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    placeholder='your-email@domain.com'
                                                    {...field}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name='emailPassword'
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>SMTP Password</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type='password'
                                                    placeholder='Your SMTP password'
                                                    {...field}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name='emailFrom'
                                            render={({ field }) => (
                                              <FormItem className='md:col-span-2'>
                                                <FormLabel>From Address</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    placeholder='noreply@yourdomain.com'
                                                    {...field}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Review & Create */}
              {currentStep === 3 && (
                <motion.div
                  key='step3'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <CheckCircle className='h-5 w-5' />
                        Review Configuration
                      </CardTitle>
                      <CardDescription>
                        Review your tenant configuration before creating
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      {/* Organization Summary */}
                      <div>
                        <h3 className='font-semibold text-slate-900 mb-3'>
                          Organization Information
                        </h3>
                        <div className='bg-slate-50 rounded-lg p-4 space-y-2'>
                          <div>
                            <span className='font-medium'>Name:</span> {watch('orgName')}
                          </div>
                          <div>
                            <span className='font-medium'>Contact Email:</span>{' '}
                            {watch('contactEmail')}
                          </div>
                          {watch('domainName') && (
                            <div>
                              <span className='font-medium'>Domain:</span> {watch('domainName')}
                            </div>
                          )}
                          {watch('description') && (
                            <div>
                              <span className='font-medium'>Description:</span>{' '}
                              {watch('description')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected Modules */}
                      <div>
                        <h3 className='font-semibold text-slate-900 mb-3'>Selected Modules</h3>
                        <div className='space-y-2'>
                          {enabledModules.map(moduleId => {
                            const module = availableModules.find(m => m.id === moduleId);
                            if (!module) return null;
                            const ModuleIcon = module.icon;
                            return (
                              <div
                                key={moduleId}
                                className='flex items-center gap-3 bg-slate-50 rounded-lg p-3'
                              >
                                <ModuleIcon className='h-4 w-4 text-slate-600' />
                                <span className='font-medium'>{module.label}</span>
                                {module.required && (
                                  <Badge variant='secondary' className='text-xs'>
                                    Required
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Configuration Summary */}
                      {(selectedAuthProviders.length > 0 ||
                        watch('businessType') ||
                        watch('roleTemplate')) && (
                        <div>
                          <h3 className='font-semibold text-slate-900 mb-3'>
                            Configuration Summary
                          </h3>
                          <div className='bg-slate-50 rounded-lg p-4 space-y-3'>
                            {selectedAuthProviders.length > 0 && (
                              <div>
                                <span className='font-medium'>Authentication Providers:</span>
                                <div className='ml-4 mt-1'>
                                  {selectedAuthProviders.map(providerId => {
                                    const provider = authProviders.find(p => p.id === providerId);
                                    return provider ? (
                                      <div key={providerId} className='text-sm text-slate-600'>
                                        • {provider.label}
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}

                            {watch('businessType') && (
                              <div>
                                <span className='font-medium'>Business Type:</span>{' '}
                                {watch('businessType')}
                              </div>
                            )}

                            {watch('roleTemplate') && (
                              <div>
                                <span className='font-medium'>Role Template:</span>{' '}
                                {watch('roleTemplate')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className='flex items-center justify-between pt-6'>
              <Button
                type='button'
                variant='outline'
                onClick={prevStep}
                disabled={currentStep === 1}
                className='flex items-center gap-2'
              >
                <ArrowLeft className='h-4 w-4' />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button type='button' onClick={nextStep} className='flex items-center gap-2'>
                  Next
                  <ArrowRight className='h-4 w-4' />
                </Button>
              ) : (
                <Button
                  type='submit'
                  disabled={createTenant.isPending}
                  className='flex items-center gap-2'
                >
                  {createTenant.isPending ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Creating Tenant...
                    </>
                  ) : (
                    <>
                      Create Tenant
                      <CheckCircle className='h-4 w-4' />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
