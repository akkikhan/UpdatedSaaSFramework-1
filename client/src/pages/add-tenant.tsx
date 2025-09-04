import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Key, Mail, Settings } from "lucide-react";
import { useCreateTenant } from "@/hooks/use-tenants";

const formSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  orgId: z
    .string()
    .min(2, "Organization ID must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Organization ID can only contain lowercase letters, numbers, and hyphens"
    ),
  adminEmail: z.string().email("Please enter a valid email address"),
  sendEmail: z.boolean().default(true),
  enabledModules: z
    .array(
      z.enum([
        "auth",
        "rbac",
        "azure-ad",
        "auth0",
        "saml",
        "logging",
        "notifications",
        "ai-copilot",
      ])
    )
    .default(["auth", "rbac"]),
  moduleConfigs: z
    .object({
      rbac: z
        .object({
          permissionTemplate: z.string().optional(),
          businessType: z.string().optional(),
          customPermissions: z.array(z.string()).optional(),
          defaultRoles: z.array(z.string()).optional(),
        })
        .optional(),
      "azure-ad": z
        .object({
          tenantId: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          domain: z.string().optional(),
          redirectUri: z.string().optional(),
        })
        .optional(),
      auth0: z
        .object({
          domain: z.string().optional(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          audience: z.string().optional(),
          callbackUrl: z.string().optional(),
          logoutUrl: z.string().optional(),
        })
        .optional(),
      saml: z
        .object({
          entryPoint: z.string().optional(),
          issuer: z.string().optional(),
          cert: z.string().optional(),
          identifierFormat: z.string().optional(),
          callbackUrl: z.string().optional(),
        })
        .optional(),
      logging: z
        .object({
          levels: z.array(z.string()).optional(),
          destinations: z.array(z.string()).optional(),
          retentionDays: z.number().optional(),
          redactionEnabled: z.boolean().optional(),
        })
        .optional(),
      notifications: z
        .object({
          channels: z.array(z.string()).optional(),
          emailProvider: z.string().optional(),
        })
        .optional(),
      "ai-copilot": z
        .object({
          provider: z.string().optional(),
          model: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
});

type FormData = z.infer<typeof formSchema>;

export default function AddTenantPage() {
  const [, setLocation] = useLocation();
  const createTenant = useCreateTenant();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      orgId: "",
      adminEmail: "",
      sendEmail: true,
      enabledModules: ["auth", "rbac"],
      moduleConfigs: {},
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Ensure dependencies: Logging requires Auth
      if (data.enabledModules.includes("logging") && !data.enabledModules.includes("auth")) {
        data.enabledModules = Array.from(new Set([...(data.enabledModules || []), "auth"]));
      }
      await createTenant.mutateAsync(data);
      setLocation("/tenants");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Auto-generate org ID from org name
  const handleNameChange = (value: string) => {
    const autoOrgId = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!form.getValues("orgId") || form.getValues("orgId") === autoOrgId.slice(0, -1)) {
      form.setValue("orgId", autoOrgId);
    }
  };

  const watchedModules = form.watch("enabledModules");

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold text-slate-800">Add New Tenant</h1>
            <p className="text-slate-600">
              Create a new tenant organization with authentication modules
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the organization details and admin contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            {...field}
                            onChange={e => {
                              field.onChange(e);
                              handleNameChange(e.target.value);
                            }}
                            data-testid="input-org-name"
                          />
                        </FormControl>
                        <FormDescription>The display name for this organization</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orgId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization ID</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-corp" {...field} data-testid="input-org-id" />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, numbers, hyphens only)
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
                      <FormLabel>Administrator Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@acme.com"
                          {...field}
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormDescription>
                        Primary contact and initial admin user for this tenant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sendEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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

            {/* Authentication Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Authentication Modules
                </CardTitle>
                <CardDescription>
                  Select which authentication modules to enable for this tenant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="enabledModules"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            id: "auth",
                            label: "Authentication",
                            description: "Basic authentication with email/password",
                            required: true,
                          },
                          {
                            id: "rbac",
                            label: "Role-Based Access Control",
                            description: "Permission management system",
                            required: false,
                          },
                          {
                            id: "azure-ad",
                            label: "Azure Active Directory",
                            description: "Microsoft Azure AD integration",
                            required: false,
                          },
                          {
                            id: "auth0",
                            label: "Auth0",
                            description: "Auth0 identity platform integration",
                            required: false,
                          },
                          {
                            id: "saml",
                            label: "SAML",
                            description: "Security Assertion Markup Language integration",
                            required: false,
                          },
                          {
                            id: "logging",
                            label: "Logging & Monitoring",
                            description: "Comprehensive audit trail and security monitoring",
                            required: false,
                          },
                          {
                            id: "notifications",
                            label: "Notifications",
                            description: "Multi-channel messaging and alerts system",
                            required: false,
                          },
                          {
                            id: "ai-copilot",
                            label: "AI Copilot",
                            description: "Intelligent automation and user assistance",
                            required: false,
                          },
                        ].map(module => (
                          <FormField
                            key={module.id}
                            control={form.control}
                            name="enabledModules"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium">
                                    {module.label}
                                    {module.required && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {module.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Module Configurations */}
                {watchedModules.includes("logging") && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="text-sm text-slate-700">
                      <div className="font-medium">Logging Dependencies</div>
                      <ul className="list-disc pl-5 mt-1">
                        <li>
                          <span className="font-medium">Required:</span> Authentication (Auth)
                        </li>
                        <li>
                          <span className="font-medium">Recommended:</span> RBAC (access control),
                          Notifications (alerts)
                        </li>
                      </ul>
                      {!watchedModules.includes("auth") && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                          Auth is not selected; it will be enabled automatically for Logging.
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm">Levels</Label>
                        <Input
                          placeholder="error,warning,info"
                          onChange={e => {
                            const current = form.getValues("moduleConfigs") || {};
                            (current as any).logging = (current as any).logging || {};
                            (current as any).logging.levels = (e.target.value || "")
                              .split(",")
                              .map(s => s.trim())
                              .filter(Boolean);
                            form.setValue("moduleConfigs", current);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Destinations</Label>
                        <Input value="database" disabled />
                      </div>
                      <div>
                        <Label className="text-sm">Retention Days</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          onChange={e => {
                            const current = form.getValues("moduleConfigs") || {};
                            (current as any).logging = (current as any).logging || {};
                            (current as any).logging.retentionDays = parseInt(
                              e.target.value || "30",
                              10
                            );
                            form.setValue("moduleConfigs", current);
                          }}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id="onboard-redaction"
                            type="checkbox"
                            onChange={e => {
                              const current = form.getValues("moduleConfigs") || {};
                              (current as any).logging = (current as any).logging || {};
                              (current as any).logging.redactionEnabled = e.target.checked;
                              form.setValue("moduleConfigs", current);
                            }}
                          />
                          <Label htmlFor="onboard-redaction" className="text-xs">
                            Enable PII redaction
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {watchedModules.includes("rbac") && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">RBAC Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Permission Template</Label>
                        <Select
                          defaultValue="standard"
                          onValueChange={value => {
                            const currentConfigs = form.getValues("moduleConfigs") || {};
                            form.setValue("moduleConfigs", {
                              ...currentConfigs,
                              rbac: { permissionTemplate: value, businessType: "general" },
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Business Type</Label>
                        <Select defaultValue="general">
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {watchedModules.includes("azure-ad") && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">Azure AD Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="moduleConfigs.azure-ad.tenantId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tenant ID *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="moduleConfigs.azure-ad.clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="moduleConfigs.azure-ad.clientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your client secret" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="moduleConfigs.azure-ad.redirectUri"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Redirect URI</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-app.com/auth/callback" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {watchedModules.includes("auth0") && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">Auth0 Configuration</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="moduleConfigs.auth0.domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Domain *</FormLabel>
                              <FormControl>
                                <Input placeholder="your-domain.auth0.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="moduleConfigs.auth0.clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client ID *</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Auth0 Client ID" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="moduleConfigs.auth0.clientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Secret *</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Your client secret"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="moduleConfigs.auth0.audience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audience</FormLabel>
                              <FormControl>
                                <Input placeholder="https://your-api.auth0.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {watchedModules.includes("saml") && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">SAML Configuration</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="moduleConfigs.saml.entryPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entry Point URL *</FormLabel>
                              <FormControl>
                                <Input placeholder="https://your-idp.com/sso" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="moduleConfigs.saml.issuer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Issuer *</FormLabel>
                              <FormControl>
                                <Input placeholder="your-saml-issuer" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Identifier Format</Label>
                          <Select defaultValue="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
                                Email Address
                              </SelectItem>
                              <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">
                                Persistent
                              </SelectItem>
                              <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">
                                Transient
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormField
                          control={form.control}
                          name="moduleConfigs.saml.callbackUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Callback URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://your-app.com/saml/acs" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/tenants")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenant.isPending}
                data-testid="button-create-tenant"
              >
                {createTenant.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
