import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  TenantOnboardingConfig,
  getRequiredConfigFields,
  getDefaultModuleConfig,
} from "../../../shared/tenant-config-interface";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Lock,
  Mail,
  Smartphone,
  Bell,
  Bot,
  FileText,
  Globe,
  Key,
  Settings,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface DynamicModuleFormProps {
  form: UseFormReturn<TenantOnboardingConfig>;
  selectedModules: string[];
  onModuleToggle: (moduleId: string, enabled: boolean) => void;
}

// Module definitions with icons and descriptions
const MODULES = {
  auth: {
    id: "auth",
    name: "Authentication",
    icon: Lock,
    color: "bg-blue-500",
    description: "User authentication with multiple providers",
    required: true,
  },
  rbac: {
    id: "rbac",
    name: "RBAC",
    icon: Shield,
    color: "bg-green-500",
    description: "Role-based access control and permissions",
    required: true, // Auto-enabled with auth
  },
  logging: {
    id: "logging",
    name: "Logging",
    icon: FileText,
    color: "bg-purple-500",
    description: "Application logging and monitoring",
    required: false,
  },
  notifications: {
    id: "notifications",
    name: "Notifications",
    icon: Bell,
    color: "bg-orange-500",
    description: "Multi-channel notification system",
    required: false,
  },
  aiCopilot: {
    id: "aiCopilot",
    name: "AI Copilot",
    icon: Bot,
    color: "bg-indigo-500",
    description: "AI-powered assistance and automation",
    required: false,
  },
};

export const DynamicModuleForm: React.FC<DynamicModuleFormProps> = ({
  form,
  selectedModules,
  onModuleToggle,
}) => {
  return (
    <div className="space-y-8">
      {/* Module Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Select Modules
          </CardTitle>
          <CardDescription>Choose which modules to enable for your tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(MODULES).map(module => {
              const Icon = module.icon;
              const isSelected = selectedModules.includes(module.id);
              const isRequired = module.required;

              return (
                <div
                  key={module.id}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isRequired ? "opacity-75" : ""}`}
                  onClick={() => !isRequired && onModuleToggle(module.id, !isSelected)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{module.name}</h3>
                        {isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    </div>
                    {!isRequired && (
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onModuleToggle(module.id, !isSelected)}
                        className="mt-1"
                      />
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-blue-500" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Module Configurations */}
      {selectedModules.includes("auth") && <AuthModuleConfig form={form} />}

      {selectedModules.includes("rbac") && <RBACModuleConfig form={form} />}

      {selectedModules.includes("logging") && <LoggingModuleConfig form={form} />}

      {selectedModules.includes("notifications") && <NotificationsModuleConfig form={form} />}

      {selectedModules.includes("aiCopilot") && <AICopilotModuleConfig form={form} />}
    </div>
  );
};

// Auth Module Configuration Component
const AuthModuleConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => {
  const selectedProviders = form.watch("modules.auth.providers") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Authentication Configuration
        </CardTitle>
        <CardDescription>Configure authentication providers and settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <FormField
          control={form.control}
          name="modules.auth.providers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authentication Providers *</FormLabel>
              <FormDescription>Select at least one authentication method</FormDescription>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "local", name: "Username/Password", desc: "Traditional email/password" },
                  { id: "azure-ad", name: "Azure AD", desc: "Microsoft Azure Active Directory" },
                  { id: "auth0", name: "Auth0", desc: "Auth0 identity platform" },
                  { id: "saml", name: "SAML", desc: "SAML 2.0 Single Sign-On" },
                ].map(provider => {
                  const isSelected = field.value?.includes(provider.id) || false;
                  return (
                    <div
                      key={provider.id}
                      className={`border rounded-lg p-3 cursor-pointer ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      onClick={() => {
                        const current = field.value || [];
                        const updated = isSelected
                          ? current.filter(p => p !== provider.id)
                          : [...current, provider.id];
                        field.onChange(updated);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} readOnly />
                        <div>
                          <div className="font-medium text-sm">{provider.name}</div>
                          <div className="text-xs text-gray-600">{provider.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Provider-specific configurations */}
        {selectedProviders.includes("azure-ad") && <AzureADConfig form={form} />}

        {selectedProviders.includes("auth0") && <Auth0Config form={form} />}

        {selectedProviders.includes("saml") && <SAMLConfig form={form} />}

        {selectedProviders.includes("local") && <LocalAuthConfig form={form} />}
      </CardContent>
    </Card>
  );
};

// Azure AD Configuration
const AzureADConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-blue-50">
    <h4 className="font-medium mb-4 flex items-center gap-2">
      <Globe className="w-4 h-4" />
      Azure AD Configuration
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.azureAd.tenantId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tenant ID *</FormLabel>
            <FormControl>
              <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.azureAd.clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID *</FormLabel>
            <FormControl>
              <Input placeholder="Application (client) ID" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.azureAd.clientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret *</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Client secret value" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.azureAd.redirectUri"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Redirect URI</FormLabel>
            <FormControl>
              <Input placeholder="https://yourapp.com/auth/callback" {...field} />
            </FormControl>
            <FormDescription>Optional: Will use default if not provided</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

// Other configuration components would be similar...
// For brevity, I'll create simplified versions:

const Auth0Config: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-orange-50">
    <h4 className="font-medium mb-4">Auth0 Configuration</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.auth0.domain"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domain *</FormLabel>
            <FormControl>
              <Input placeholder="your-tenant.auth0.com" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="modules.auth.providerConfigs.auth0.clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID *</FormLabel>
            <FormControl>
              <Input placeholder="Auth0 Client ID" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  </div>
);

const SAMLConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-green-50">
    <h4 className="font-medium mb-4">SAML Configuration</h4>
    <FormField
      control={form.control}
      name="modules.auth.providerConfigs.saml.entryPoint"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Entry Point URL *</FormLabel>
          <FormControl>
            <Input placeholder="https://identity-provider.com/saml/sso" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </div>
);

const LocalAuthConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => (
  <div className="border rounded-lg p-4 bg-gray-50">
    <h4 className="font-medium mb-4">Local Authentication Settings</h4>
    <Alert>
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        Default password policies will be applied. Advanced settings can be configured after
        deployment.
      </AlertDescription>
    </Alert>
  </div>
);

const RBACModuleConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({ form }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Shield className="w-5 h-5" />
        RBAC Configuration
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Standard RBAC configuration will be applied automatically with Authentication module.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

const LoggingModuleConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({
  form,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Logging Configuration
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Database logging with standard levels (error, warn, info) will be enabled by default.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

const NotificationsModuleConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({
  form,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Notifications Configuration
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormField
        control={form.control}
        name="modules.notifications.email.fromEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>From Email Address *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="noreply@yourcompany.com" {...field} />
            </FormControl>
            <FormDescription>
              This email address will be used as the sender for all system notifications
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
);

const AICopilotModuleConfig: React.FC<{ form: UseFormReturn<TenantOnboardingConfig> }> = ({
  form,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bot className="w-5 h-5" />
        AI Copilot Configuration
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          AI Copilot will be enabled with basic chat support. API keys and advanced configuration
          can be set up after tenant creation.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export default DynamicModuleForm;
