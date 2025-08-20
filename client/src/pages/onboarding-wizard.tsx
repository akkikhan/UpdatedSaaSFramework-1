import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  Mail, 
  Settings, 
  Key, 
  CheckCircle, 
  Users, 
  Shield,
  Globe,
  Zap
} from "lucide-react";
import { useCreateTenant } from "@/hooks/use-tenants";

const formSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  orgId: z.string().min(2, "Organization ID must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Organization ID can only contain lowercase letters, numbers, and hyphens"),
  adminEmail: z.string().email("Please enter a valid email address"),
  sendEmail: z.boolean().default(true),
  enabledModules: z.array(z.enum(["auth", "rbac", "azure-ad", "auth0", "saml"])).default(["auth"]),
  moduleConfigs: z.object({
    "azure-ad": z.object({
      tenantId: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      domain: z.string().optional(),
    }).optional(),
    "auth0": z.object({
      domain: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }).optional(),
    "saml": z.object({
      entryPoint: z.string().optional(),
      issuer: z.string().optional(),
      cert: z.string().optional(),
      identifierFormat: z.string().optional(),
    }).optional(),
  }).default({}),
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Organization details and admin contact",
    icon: Building2,
  },
  {
    id: "modules",
    title: "Authentication Modules",
    description: "Choose your authentication providers",
    icon: Shield,
  },
  {
    id: "configuration",
    title: "Module Configuration",
    description: "Configure selected authentication modules",
    icon: Settings,
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review your settings and create the tenant",
    icon: CheckCircle,
  },
];

const MODULE_INFO = [
  {
    id: "auth",
    label: "Basic Authentication",
    description: "Email/password authentication with secure password policies",
    icon: Key,
    color: "bg-blue-500",
    recommended: true,
    required: true,
  },
  {
    id: "rbac",
    label: "Role-Based Access Control",
    description: "Advanced permission management with custom roles and policies",
    icon: Users,
    color: "bg-green-500",
    recommended: true,
    required: false,
  },
  {
    id: "azure-ad",
    label: "Azure Active Directory",
    description: "Microsoft Azure AD integration for enterprise SSO",
    icon: Globe,
    color: "bg-blue-600",
    recommended: false,
    required: false,
  },
  {
    id: "auth0",
    label: "Auth0",
    description: "Auth0 identity platform with social login options",
    icon: Zap,
    color: "bg-orange-500",
    recommended: false,
    required: false,
  },
  {
    id: "saml",
    label: "SAML",
    description: "SAML 2.0 integration for enterprise identity providers",
    icon: Shield,
    color: "bg-purple-500",
    recommended: false,
    required: false,
  },
];

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const createTenant = useCreateTenant();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      sendEmail: true,
      enabledModules: ["auth"],
      moduleConfigs: {},
    },
  });

  const watchedModules = form.watch("enabledModules");

  const handleNameChange = (name: string) => {
    const orgId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    form.setValue("orgId", orgId);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const newTenant = await createTenant.mutateAsync(data);
      
      // Store tenant data in sessionStorage for the success page
      sessionStorage.setItem('newTenantData', JSON.stringify(newTenant));
      
      // Redirect to success page instead of tenants list
      setLocation("/tenants/success");
    } catch (error) {
      console.error("Error creating tenant:", error);
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
        return form.getValues("name") && form.getValues("orgId") && form.getValues("adminEmail");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/tenants")}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Tenant Onboarding</h1>
            <p className="text-slate-600">Follow the guided setup to create your new tenant</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-slate-700">
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <div className="text-sm text-slate-500">
              {Math.round(progress)}% Complete
            </div>
          </div>
          <Progress value={progress} className="mb-4" />
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2
                    ${isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}
                  `}>
                    {isCompleted ? <CheckCircle className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
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
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-500" />
                        Organization Details
                      </CardTitle>
                      <CardDescription>
                        Enter your organization information and admin contact details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Corporation"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleNameChange(e.target.value);
                                  }}
                                  data-testid="input-org-name"
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
                          name="orgId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization ID *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="acme-corp"
                                  {...field}
                                  data-testid="input-org-id"
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
                        name="adminEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Administrator Email *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="admin@acme.com"
                                {...field}
                                data-testid="input-admin-email"
                              />
                            </FormControl>
                            <FormDescription>
                              Primary contact and initial admin user - will receive API keys and setup instructions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sendEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-send-email"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
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
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Authentication Modules
                      </CardTitle>
                      <CardDescription>
                        Select the authentication methods you want to enable for your tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="enabledModules"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 gap-4">
                              {MODULE_INFO.map((module) => {
                                const ModuleIcon = module.icon;
                                return (
                                  <FormField
                                    key={module.id}
                                    control={form.control}
                                    name="enabledModules"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-4 space-y-0 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-colors p-4">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(module.id as any)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, module.id])
                                                : field.onChange(field.value?.filter((value: string) => value !== module.id))
                                            }}
                                            disabled={module.required}
                                            data-testid={`checkbox-module-${module.id}`}
                                          />
                                        </FormControl>
                                        <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}>
                                          <ModuleIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <FormLabel className="text-base font-semibold cursor-pointer">
                                              {module.label}
                                            </FormLabel>
                                            {module.recommended && (
                                              <Badge variant="secondary" className="text-xs">Recommended</Badge>
                                            )}
                                            {module.required && (
                                              <Badge variant="destructive" className="text-xs">Required</Badge>
                                            )}
                                          </div>
                                          <FormDescription className="text-sm text-slate-600">
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
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-500" />
                        Module Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure your selected authentication modules (optional - can be configured later)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {watchedModules.length === 1 && watchedModules.includes("auth") ? (
                        <div className="text-center py-8 text-slate-500">
                          <Settings className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                          <p className="text-lg">No additional configuration needed</p>
                          <p className="text-sm">Basic authentication doesn't require additional setup</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {watchedModules.includes("azure-ad") && (
                            <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-500" />
                                Azure Active Directory Configuration
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.azure-ad.tenantId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Azure Tenant ID</FormLabel>
                                      <FormControl>
                                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                                      </FormControl>
                                      <FormDescription>Your Azure AD Directory (tenant) ID</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.azure-ad.clientId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Application (Client) ID</FormLabel>
                                      <FormControl>
                                        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                                      </FormControl>
                                      <FormDescription>Your Azure AD Application ID</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}

                          {watchedModules.includes("auth0") && (
                            <div className="space-y-4 border rounded-lg p-4 bg-orange-50">
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Zap className="h-5 w-5 text-orange-500" />
                                Auth0 Configuration
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.auth0.domain"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Auth0 Domain</FormLabel>
                                      <FormControl>
                                        <Input placeholder="your-domain.auth0.com" {...field} />
                                      </FormControl>
                                      <FormDescription>Your Auth0 domain</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.auth0.clientId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Client ID</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Your Auth0 Client ID" {...field} />
                                      </FormControl>
                                      <FormDescription>Your Auth0 application client ID</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}

                          {watchedModules.includes("saml") && (
                            <div className="space-y-4 border rounded-lg p-4 bg-purple-50">
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-purple-500" />
                                SAML Configuration
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.saml.entryPoint"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>SSO Entry Point URL</FormLabel>
                                      <FormControl>
                                        <Input placeholder="https://your-idp.com/sso" {...field} />
                                      </FormControl>
                                      <FormDescription>Your identity provider's SSO URL</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="moduleConfigs.saml.issuer"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Issuer</FormLabel>
                                      <FormControl>
                                        <Input placeholder="your-saml-issuer" {...field} />
                                      </FormControl>
                                      <FormDescription>SAML issuer identifier</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Review & Create Tenant
                      </CardTitle>
                      <CardDescription>
                        Review your configuration and create your new tenant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Organization Info */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-slate-800">Organization Details</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-slate-500">Name:</span>
                              <p className="font-medium">{form.watch("name")}</p>
                            </div>
                            <div>
                              <span className="text-sm text-slate-500">ID:</span>
                              <p className="font-medium text-blue-600">{form.watch("orgId")}</p>
                            </div>
                            <div>
                              <span className="text-sm text-slate-500">Admin Email:</span>
                              <p className="font-medium">{form.watch("adminEmail")}</p>
                            </div>
                          </div>
                        </div>

                        {/* Enabled Modules */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-slate-800">Authentication Modules</h4>
                          <div className="space-y-2">
                            {watchedModules.map((moduleId) => {
                              const module = MODULE_INFO.find(m => m.id === moduleId);
                              if (!module) return null;
                              const ModuleIcon = module.icon;
                              
                              return (
                                <div key={moduleId} className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded ${module.color} flex items-center justify-center`}>
                                    <ModuleIcon className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="font-medium">{module.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-800 mb-2">What happens next?</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Tenant will be created with unique API keys</li>
                          <li>• Admin user account will be set up with temporary password</li>
                          {form.watch("sendEmail") && <li>• Welcome email will be sent with setup instructions</li>}
                          <li>• You can configure additional settings from the tenant dashboard</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 mb-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createTenant.isPending || !canProceed()}
                  className="flex items-center gap-2"
                  data-testid="button-create-tenant"
                >
                  {createTenant.isPending ? "Creating..." : "Create Tenant"}
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}