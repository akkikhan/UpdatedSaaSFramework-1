import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/layout/admin-layout";
import AdminDashboard from "@/pages/admin-dashboard";
import TenantsPage from "@/pages/tenants";
import AddTenantPage from "@/pages/add-tenant";
import SDKIntegrationPage from "@/pages/sdk-integration";
import EmailTemplatesPage from "@/pages/email-templates";
import SystemHealthPage from "@/pages/system-health";
import TenantLogin from "@/pages/tenant-login";
import TenantDashboard from "@/pages/tenant-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
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
            <Route path="/sdk" component={SDKIntegrationPage} />
            <Route path="/emails" component={EmailTemplatesPage} />
            <Route path="/system" component={SystemHealthPage} />
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
