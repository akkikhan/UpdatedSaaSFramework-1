import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

const azureConfigSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  testOrgId: z.string().min(1, "Test Organization ID is required")
});

type AzureConfigForm = z.infer<typeof azureConfigSchema>;

export default function AzureTestPage() {
  const [, setLocation] = useLocation();
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AzureConfigForm>({
    resolver: zodResolver(azureConfigSchema),
    defaultValues: {
      tenantId: "",
      clientId: "",
      clientSecret: "",
      testOrgId: "test-azure"
    }
  });

  const testAzureIntegration = async (data: AzureConfigForm) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // First, create or update a test tenant with Azure AD configuration
      const tenantPayload = {
        name: "Azure Test Organization",
        orgId: data.testOrgId,
        adminEmail: "admin@test.com",
        sendEmail: false,
        enabledModules: ["auth", "azure-ad"],
        moduleConfigs: {
          "azure-ad": {
            tenantId: data.tenantId,
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            domain: "test-domain.com"
          }
        }
      };

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantPayload)
      });

      if (response.ok) {
        // Now test the OAuth flow
        const oauthResponse = await fetch(`/api/oauth/azure-ad/${data.testOrgId}`);
        const oauthData = await oauthResponse.json();

        if (oauthData.authUrl) {
          setTestResult({
            success: true,
            message: "Azure AD configuration successful!",
            authUrl: oauthData.authUrl,
            tenant: await response.json()
          });
        } else {
          setTestResult({
            success: false,
            message: "Failed to generate OAuth URL",
            error: oauthData
          });
        }
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.message?.includes('already exists')) {
          // Tenant already exists, just test OAuth
          const oauthResponse = await fetch(`/api/oauth/azure-ad/${data.testOrgId}`);
          const oauthData = await oauthResponse.json();

          if (oauthData.authUrl) {
            setTestResult({
              success: true,
              message: "Azure AD configuration updated and tested successfully!",
              authUrl: oauthData.authUrl,
              existingTenant: true
            });
          } else {
            setTestResult({
              success: false,
              message: "OAuth URL generation failed",
              error: oauthData
            });
          }
        } else {
          setTestResult({
            success: false,
            message: "Failed to create test tenant",
            error: errorData
          });
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Network error occurred",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAzureAuth = () => {
    if (testResult?.authUrl) {
      window.open(testResult.authUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin")}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Azure AD Integration Test</h1>
            <p className="text-slate-600">Test your Azure AD configuration with real credentials</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                </div>
                Azure AD Configuration
              </CardTitle>
              <CardDescription>
                Enter your Azure AD application credentials to test the integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(testAzureIntegration)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Azure Tenant ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            {...field}
                            data-testid="input-tenant-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application (Client) ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            {...field}
                            data-testid="input-client-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your client secret"
                            {...field}
                            data-testid="input-client-secret"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="testOrgId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Organization ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="test-azure"
                            {...field}
                            data-testid="input-org-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                    data-testid="button-test-azure"
                  >
                    {isLoading ? "Testing..." : "Test Azure AD Integration"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Integration test results and authentication URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!testResult ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p>Enter your Azure AD credentials and click "Test Integration" to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${
                    testResult.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                      {testResult.message}
                    </span>
                  </div>

                  {testResult.success && testResult.authUrl && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Authentication URL Generated</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Click the button below to test the OAuth flow in a new window
                        </p>
                        <Button
                          onClick={openAzureAuth}
                          className="w-full flex items-center gap-2"
                          data-testid="button-open-auth"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Azure AD Login
                        </Button>
                      </div>
                      
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><strong>Test Organization:</strong> {form.getValues("testOrgId")}</p>
                        <p><strong>Tenant ID:</strong> {form.getValues("tenantId")}</p>
                        <p><strong>Status:</strong> Ready for authentication</p>
                      </div>
                    </div>
                  )}

                  {!testResult.success && testResult.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
                      <pre className="text-xs text-red-700 overflow-auto">
                        {JSON.stringify(testResult.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              How to get your Azure AD credentials for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold">1. Register Application in Azure</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Go to Azure Portal → App Registrations</li>
                  <li>• Click "New registration"</li>
                  <li>• Set redirect URI to your callback URL</li>
                  <li>• Note the Application (client) ID</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">2. Create Client Secret</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Go to Certificates & secrets</li>
                  <li>• Click "New client secret"</li>
                  <li>• Copy the secret value immediately</li>
                  <li>• Find your Tenant ID in the Overview tab</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}