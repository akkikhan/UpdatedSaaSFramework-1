import { Shield, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SDKIntegrationPage() {
  return (
    <div className="space-y-6">
      {/* SDK Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">SDK Integration</h3>
        <p className="text-slate-600 mb-6">
          Integrate our authentication and RBAC SDKs into your applications for seamless tenant management.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Authentication SDK</h4>
                <p className="text-sm text-slate-500">@saas-framework/auth</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Handle user authentication, JWT tokens, and session management.
            </p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <code className="text-sm text-slate-800">npm install @saas-framework/auth</code>
            </div>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View Documentation <ExternalLink className="ml-1" size={14} />
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">RBAC SDK</h4>
                <p className="text-sm text-slate-500">@saas-framework/rbac</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Manage roles, permissions, and access control for your application.
            </p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <code className="text-sm text-slate-800">npm install @saas-framework/rbac</code>
            </div>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              View Documentation <ExternalLink className="ml-1" size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Code Examples</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-slate-800 mb-3">Authentication Setup</h4>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-slate-300">
                <code>{`import { SaaSAuth } from '@saas-framework/auth';

const auth = new SaaSAuth({
  apiKey: 'auth_your-tenant-key',
  baseUrl: 'https://api.yourplatform.com/api/v2/auth'
});

// Login user
const session = await auth.login('user@tenant.com', 'password');

// Express middleware
app.use(auth.middleware());`}</code>
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
  baseUrl: 'https://api.yourplatform.com/api/v2/rbac'
});

// Check permissions
const canCreate = await rbac.hasPermission(userId, 'user.create');

// Express middleware
app.use(rbac.middleware(['user.read']));`}</code>
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
  baseUrl: 'https://api.yourplatform.com/api/v2/rbac'
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
              <div><code className="text-slate-800">POST /api/v2/auth/login</code> - User login</div>
              <div><code className="text-slate-800">POST /api/v2/auth/logout</code> - Invalidate session</div>
              <div><code className="text-slate-800">GET /api/v2/auth/verify</code> - Verify token validity</div>
              <div><code className="text-slate-800">POST /api/v2/auth/refresh</code> - Refresh JWT token</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-800 mb-2">RBAC API</h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <div><code className="text-slate-800">GET /api/v2/rbac/roles</code> - List tenant roles</div>
              <div><code className="text-slate-800">POST /api/v2/rbac/roles</code> - Create role</div>
              <div><code className="text-slate-800">GET /api/v2/rbac/permissions</code> - List available permissions</div>
              <div><code className="text-slate-800">POST /api/v2/rbac/check-permission</code> - Check user permission</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
