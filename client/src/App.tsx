import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/layout/admin-layout";
import AuthGuard from "@/components/auth/AuthGuard";
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
import PasswordResetRequest from "@/pages/password-reset-request";
import PasswordResetConfirm from "@/pages/password-reset-confirm";
import PasswordChange from "@/pages/password-change";
import AzureTestPage from "@/pages/azure-test";
import AuthSuccessPage from "@/pages/auth-success";
import AuthErrorPage from "@/pages/auth-error";
import TenantSuccessPage from "@/pages/tenant-success";
import RBACManagementPage from "@/pages/rbac-management";
import RBACConfigPage from "@/pages/rbac-config";
import ComplianceDashboard from "@/pages/compliance-dashboard";
import TenantAttentionPage from "@/pages/tenant-attention";
import PlatformAdminLogin from "@/pages/platform-admin-login";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      {/* Authentication Result Pages */}
      <Route path="/auth-success" component={AuthSuccessPage} />
      <Route path="/auth-error" component={AuthErrorPage} />
      {/* Backward-compatible aliases used by server redirects */}
      <Route path="/auth/success" component={AuthSuccessPage} />
      <Route path="/auth/error" component={AuthErrorPage} />

      {/* Admin Login Page - MUST come before protected routes */}
      <Route path="/admin/login" component={PlatformAdminLogin} />

      {/* Tenant Portal Routes */}
      <Route path="/tenant/:orgId/login" component={TenantLogin} />
      <Route path="/tenant/:orgId/password/forgot" component={PasswordResetRequest} />
      <Route path="/tenant/:orgId/password/reset" component={PasswordResetConfirm} />
      <Route path="/tenant/:orgId/password/change" component={PasswordChange} />
      <Route path="/tenant/:orgId/dashboard" component={TenantDashboard} />
      <Route path="/tenant/:orgId/*" component={TenantDashboard} />

      {/* Protected Admin Portal Routes */}
      <Route>
        <AuthGuard>
          <AdminLayout>
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/tenants" component={TenantsPage} />
              <Route path="/tenants/add" component={AddTenantPage} />
              <Route path="/tenants/wizard" component={OnboardingWizard} />
              <Route path="/tenants/success" component={TenantSuccessPage} />
              <Route path="/tenants/:tenantId/rbac" component={RBACManagementPage} />
              <Route path="/tenants/:tenantId/attention" component={TenantAttentionPage} />
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
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  // Handle token from URL when redirected from Azure AD login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const isAdmin = urlParams.get("admin");

    if (token) {
      // Store token in localStorage for persistence
      localStorage.setItem("platformAdminToken", token);

      // Clear URL parameters to clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // Refresh the query client to re-fetch data with the new token
      queryClient.invalidateQueries();

      console.log("Platform admin token stored from URL");
    }

    // Check if token exists in localStorage
    const existingToken = localStorage.getItem("platformAdminToken");
    if (!existingToken && window.location.pathname !== "/admin/login") {
      // If no token and not on login page, user might need to login
      console.log("No platform admin token found");
    }
  }, []);

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
