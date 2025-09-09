import { Shield, Users, FileText, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SDKIntegrationPage() {
  return (
    <div className="aspire-page-container">
      {/* Aspire Page Header */}
      <div className="aspire-page-header">
        <div className="aspire-header-content">
          <div className="aspire-header-text">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="aspire-page-title">SDK Integration</h1>
                <p className="aspire-page-subtitle">
                  Configure and integrate authentication and RBAC SDKs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="aspire-content-wrapper">
        <div className="aspire-main-card">
          <div className="space-y-6">
            {/* Azure configuration notice */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm text-slate-700">
                <strong>Azure configuration:</strong> Tenants must register an app in Azure, set the
                redirect URI, create a client secret, and grant admin consent. See the{" "}
                <a
                  href="/docs/auth-provider-config.md"
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  auth provider guide
                </a>
                . Helpful scripts:
                <a
                  href="/scripts/azure-setup-tenant.ps1"
                  className="text-blue-600 underline ml-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  azure-setup-tenant.ps1
                </a>
                ,
                <a
                  href="/scripts/azure-credentials-manager.ps1"
                  className="text-blue-600 underline ml-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  azure-credentials-manager.ps1
                </a>
                .
              </p>
            </div>

            {/* Base URL note */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-slate-700">
                <strong>Base URL:</strong> All API requests should use the <code>/api/v2</code>{" "}
                prefix, e.g.
                <code> https://your-domain.com/api/v2</code>.
              </p>
            </div>

            {/* SDK Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">SDK Integration</h3>
              <p className="text-slate-600 mb-6">
                Integrate our authentication and RBAC SDKs into your applications for seamless
                tenant management.
              </p>
              <div className="mb-6">
                <a
                  href="/docs/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View full documentation
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Auth Client (Browser)</h4>
                      <p className="text-sm text-slate-500">@saas-framework/auth-client</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Start Azure SSO, capture the platform JWT on callback, perform local login, and
                    call APIs with auth attached.
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <code className="text-sm text-slate-800">
                      npm install @saas-framework/auth-client
                    </code>
                  </div>
                  <a
                    className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm font-medium"
                    href="/readmes/auth-client.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Auth Client README <ExternalLink className="ml-1" size={14} />
                  </a>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">RBAC SDK</h4>
                      <p className="text-sm text-slate-500">@saas-framework/rbac-sdk</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Manage roles, permissions, and access control for your application.
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <code className="text-sm text-slate-800">
                      npm install @saas-framework/rbac-sdk
                    </code>
                  </div>
                  <a
                    className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm font-medium"
                    href="/readmes/rbac-sdk.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    RBAC SDK README <ExternalLink className="ml-1" size={14} />
                  </a>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Logging SDK</h4>
                      <p className="text-sm text-slate-500">@saas-framework/logging</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Capture structured events and query logs with tenant isolation.
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <code className="text-sm text-slate-800">
                      npm install @saas-framework/logging
                    </code>
                  </div>
                  <a
                    className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm font-medium"
                    href="/readmes/logging.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Logging README <ExternalLink className="ml-1" size={14} />
                  </a>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Mail className="text-red-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Email SDK</h4>
                      <p className="text-sm text-slate-500">@saas-framework/email</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Send templated emails and critical alerts via the platform.
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <code className="text-sm text-slate-800">
                      npm install @saas-framework/email
                    </code>
                  </div>
                  <a
                    className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm font-medium"
                    href="/readmes/email.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Email README <ExternalLink className="ml-1" size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Code Examples */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Code Examples</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Auth Client Quick Start</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{`import { startAzure, handleSuccessFromUrl, loginWithPassword, fetchWithAuth } from '@saas-framework/auth-client';

// 1) Azure SSO button click (orgId from your tenant config)
async function onMicrosoftSignIn(orgId) {
  await startAzure(orgId); // redirects to Microsoft
}

// 2) On your success route after our callback returns ?token=...
handleSuccessFromUrl(); // stores our JWT

// 3) Optional local login
await loginWithPassword({ orgId: 'demo', email: 'user@example.com', password: '••••••••' });

// 4) Call APIs with auth header attached
const res = await fetchWithAuth('/api/v2/tenant/me');
const me = await res.json();`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-3">RBAC Integration</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{`import { SaaSRBAC } from '@saas-framework/rbac';

const rbac = new SaaSRBAC({
  apiKey: 'rbac_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com/api/v2'
});

// Check permissions
const canCreate = await rbac.hasPermission(userId, 'user.create');

// Express middleware
app.use(rbac.middleware(['user.read']));`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Logging SDK</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{`import { SaaSLogging } from '@saas-framework/logging';

const logger = new SaaSLogging({
  apiKey: 'logging_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com', // SDK appends /api/v2/logging
  tenantId: 'your-tenant-id'
});

await logger.info('User logged in', { userId });`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Email SDK</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{`import { SaaSEmail } from '@saas-framework/email';

const email = new SaaSEmail({
  apiKey: 'email_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com/api/v2'
});

await email.sendEmail({
  tenantId: 'tenant-123',
  to: ['user@example.com'],
  subject: 'Welcome',
  html: '<p>Hello</p>'
});`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Combined Usage</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{`import express from 'express';
import { SaaSAuth } from '@saas-framework/auth';
import { SaaSRBAC } from '@saas-framework/rbac';

const app = express();

// Initialize SDKs
const auth = new SaaSAuth({
  apiKey: 'auth_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: 'rbac_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com/api/v2'
});

// Protected route with permission check
app.get('/users', 
  auth.middleware(),                    // Validate JWT
  rbac.middleware(['user.read']),       // Check permission
  async (req, res) => {
    // Route logic - user is authenticated and has permission
    res.json({ users: await getUsers() });
  }
);`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* API Endpoints Reference */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">API Endpoints</h3>
              <p className="text-slate-600 mb-6">
                Reference for the available API endpoints through our gateway.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Authentication API</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div>
                      <code className="text-slate-800">POST /api/v2/auth/login</code> - User login
                    </div>
                    <div>
                      <code className="text-slate-800">POST /api/v2/auth/logout</code> - Invalidate
                      session
                    </div>
                    <div>
                      <code className="text-slate-800">GET /api/v2/auth/verify</code> - Verify token
                      validity
                    </div>
                    <div>
                      <code className="text-slate-800">POST /api/v2/auth/refresh</code> - Refresh
                      JWT token
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-2">RBAC API</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div>
                      <code className="text-slate-800">GET /api/v2/rbac/roles</code> - List tenant
                      roles
                    </div>
                    <div>
                      <code className="text-slate-800">POST /api/v2/rbac/roles</code> - Create role
                    </div>
                    <div>
                      <code className="text-slate-800">GET /api/v2/rbac/permissions</code> - List
                      available permissions
                    </div>
                    <div>
                      <code className="text-slate-800">POST /api/v2/rbac/check-permission</code> -
                      Check user permission
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Logging API</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div>
                      <code className="text-slate-800">POST /api/v2/logging/events</code> - Ingest
                      log event
                    </div>
                    <div>
                      <code className="text-slate-800">GET /api/v2/logging/events</code> - Query
                      logs
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Email API</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div>
                      <code className="text-slate-800">POST /api/v2/email/send</code> - Send email
                    </div>
                    <div>
                      <code className="text-slate-800">GET /api/v2/email/status/:id</code> - Check
                      status
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
