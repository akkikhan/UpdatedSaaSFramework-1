import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/layout/admin-layout";
import AdminDashboard from "@/pages/admin-dashboard";
import TenantsPage from "@/pages/tenants";
import AddTenantPage from "@/pages/add-tenant";
import OnboardingWizard from "@/pages/onboarding-wizard";
import ModuleManagementPage from "@/pages/module-management";
import LogsPage from "@/pages/logs";
import SDKIntegrationPage from "@/pages/sdk-integration";
import EmailTemplatesPage from "@/pages/email-templates";
import SystemHealthPage from "@/pages/system-health";
import TenantLogin from "@/pages/tenant-login";
import TenantDashboard from "@/pages/tenant-dashboard";
import AzureTestPage from "@/pages/azure-test";
import AuthSuccessPage from "@/pages/auth-success";
import AuthErrorPage from "@/pages/auth-error";
import TenantSuccessPage from "@/pages/tenant-success";
import TenantPortalPage from "@/pages/tenant-portal";
import RBACManagementPage from "@/pages/rbac-management";
import RBACConfigPage from "@/pages/rbac-config";
import ComplianceDashboard from "@/pages/compliance-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Authentication Result Pages */}
      <Route path="/auth-success" component={AuthSuccessPage} />
      <Route path="/auth-error" component={AuthErrorPage} />
      
      {/* Tenant Portal Routes */}
      <Route path="/tenant/:orgId/login" component={TenantLogin} />
      <Route path="/tenant/:orgId/dashboard" component={TenantDashboard} />
      <Route path="/tenant/:orgId/*" component={TenantDashboard} />
      
      {/* Admin Portal Routes */}
      <Route>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/tenants" component={TenantsPage} />
            <Route path="/tenants/add" component={AddTenantPage} />
            <Route path="/tenants/wizard" component={OnboardingWizard} />
            <Route path="/tenants/success" component={TenantSuccessPage} />
            <Route path="/tenants/:tenantId/portal" component={TenantPortalPage} />
            <Route path="/tenants/:tenantId/rbac" component={RBACManagementPage} />
            <Route path="/rbac-config" component={RBACConfigPage} />
            <Route path="/modules" component={ModuleManagementPage} />
            <Route path="/logs" component={LogsPage} />
            <Route path="/compliance" component={ComplianceDashboard} />
            <Route path="/sdk" component={SDKIntegrationPage} />
            <Route path="/emails" component={EmailTemplatesPage} />
            <Route path="/system" component={SystemHealthPage} />
            <Route path="/test-azure" component={AzureTestPage} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
