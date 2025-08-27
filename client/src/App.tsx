import AdminLayout from '@/components/layout/admin-layout';
import { RealtimeSyncProvider } from '@/components/providers/realtime-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminDashboard from '@/pages/admin-dashboard';
import AuthErrorPage from '@/pages/auth-error';
import AuthSuccessPage from '@/pages/auth-success';
import AzureTestPage from '@/pages/azure-test';
import ComplianceDashboard from '@/pages/compliance-dashboard';
import ConfigSyncDashboard from '@/pages/config-sync-dashboard';
import EmailTemplatesPage from '@/pages/email-templates';
import EnhancedLogin from '@/pages/enhanced-login';
import InfrastructureDashboard from '@/pages/infrastructure-dashboard';
import LogsPage from '@/pages/logs';
import MfaManagement from '@/pages/mfa-management';
import ModuleManagementPage from '@/pages/module-management';
import MonitoringDashboard from '@/pages/monitoring-dashboard';
import NotFound from '@/pages/not-found';
import NotificationCenter from '@/pages/notification-center';
import OnboardingWizard from '@/pages/onboarding-wizard';
import RBACConfigPage from '@/pages/rbac-config';
import RBACManagementPage from '@/pages/rbac-management';
import SDKIntegrationPage from '@/pages/sdk-integration';
import SecurityAdmin from '@/pages/security-admin';
import SystemHealthPage from '@/pages/system-health';
import TenantDashboard from '@/pages/tenant-dashboard';
import TenantLogin from '@/pages/tenant-login';
import TenantPortalPage from '@/pages/tenant-portal';
import TenantSuccessPage from '@/pages/tenant-success';
import TenantsPage from '@/pages/tenants';
import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { queryClient } from './lib/queryClient';

function Router() {
  return (
    <Switch>
      {/* Authentication Result Pages */}
      <Route path='/auth-success' component={AuthSuccessPage} />
      <Route path='/auth-error' component={AuthErrorPage} />

      {/* Tenant Portal Routes */}
      <Route path='/tenant/:orgId/login' component={TenantLogin} />
      <Route path='/tenant/:orgId/enhanced-login' component={EnhancedLogin} />
      <Route path='/tenant/:orgId/mfa' component={MfaManagement} />
      <Route path='/tenant/:orgId/dashboard' component={TenantDashboard} />
      <Route path='/tenant/:orgId/*' component={TenantDashboard} />

      {/* Admin Portal Routes */}
      <Route>
        <AdminLayout>
          <Switch>
            <Route path='/' component={AdminDashboard} />
            <Route path='/admin' component={AdminDashboard} />
            <Route path='/tenants' component={TenantsPage} />
            <Route path='/tenants/add' component={OnboardingWizard} />
            <Route path='/tenants/wizard' component={OnboardingWizard} />
            <Route path='/tenants/success' component={TenantSuccessPage} />
            <Route path='/tenants/:tenantId/portal' component={TenantPortalPage} />
            <Route path='/tenants/:tenantId/rbac' component={RBACManagementPage} />
            <Route path='/rbac-config' component={RBACConfigPage} />
            <Route path='/modules' component={ModuleManagementPage} />
            <Route path='/logs' component={LogsPage} />
            <Route path='/compliance' component={ComplianceDashboard} />
            <Route path='/sdk' component={SDKIntegrationPage} />
            <Route path='/emails' component={EmailTemplatesPage} />
            <Route path='/system' component={SystemHealthPage} />
            <Route path='/sync' component={ConfigSyncDashboard} />
            <Route path='/security' component={SecurityAdmin} />
            <Route path='/notifications' component={NotificationCenter} />
            <Route path='/infrastructure' component={InfrastructureDashboard} />
            <Route path='/monitoring' component={MonitoringDashboard} />
            <Route path='/test-azure' component={AzureTestPage} />
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
      <RealtimeSyncProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </RealtimeSyncProvider>
    </QueryClientProvider>
  );
}

export default App;
