// SENIOR MANAGEMENT DEMO
// Complete Multi-Tenant Auth & RBAC Integration Example
// Shows real-world usage for any company wanting to integrate

const express = require('express');
const { SaaSAuth } = require('@saas-framework/auth');
const { SaaSRBAC } = require('@saas-framework/rbac');

const app = express();
app.use(express.json());

// ============================================
// STEP 1: INITIALIZATION WITH TENANT API KEYS
// ============================================
// Each customer gets these from their onboarding email

const auth = new SaaSAuth({
  apiKey: 'auth_10409cf4aad145939786c8e8',  // Real API key from your tenant
  baseUrl: 'https://your-platform.replit.app/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: 'rbac_801f97feaf5a4d1a8bbb9b87',  // Real API key from your tenant
  baseUrl: 'https://your-platform.replit.app/api/v2/rbac'
});

// ============================================
// STEP 2: MULTI-TENANT USER AUTHENTICATION
// ============================================

// Public login endpoint - works for ANY tenant
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate user with their tenant credentials
    const session = await auth.login(email, password);
    
    console.log(`✅ User ${email} logged in successfully`);
    console.log(`🏢 Tenant: ${session.user.tenantId}`);
    console.log(`🎫 Token: ${session.token.substring(0, 20)}...`);
    
    res.json({
      success: true,
      token: session.token,
      user: session.user,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}`);
    res.status(401).json({ error: error.message });
  }
});

// ============================================
// STEP 3: ENTERPRISE SSO INTEGRATIONS
// ============================================

// Azure AD Login (for Enterprise customers)
app.post('/login/azure', async (req, res) => {
  try {
    const { tenantId } = req.body;
    
    // Check if Azure AD module is enabled for this tenant
    const hasAzureAD = await auth.checkModuleAccess('azure-ad');
    
    if (!hasAzureAD) {
      return res.status(403).json({ 
        error: 'Azure AD not enabled for your organization',
        upgradeMessage: 'Contact support to enable Enterprise SSO'
      });
    }
    
    // Initiate Azure AD OAuth flow
    const redirectUrl = await auth.initiateSAMLLogin(tenantId);
    res.json({ redirectUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SAML Login (for Enterprise customers)
app.post('/login/saml', async (req, res) => {
  try {
    const { samlResponse, relayState } = req.body;
    
    const session = await auth.processSAMLResponse(samlResponse, relayState);
    res.json(session);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ============================================
// STEP 4: PROTECTED ROUTES WITH RBAC
// ============================================

// Basic protected route (authentication only)
app.get('/api/profile', 
  auth.middleware(), 
  (req, res) => {
    res.json({ 
      message: 'Authenticated user profile',
      user: req.user 
    });
  }
);

// Admin-only route (requires admin permission)
app.get('/api/admin/dashboard',
  auth.middleware(),
  rbac.middleware(['admin.access']),
  async (req, res) => {
    const userRoles = await rbac.getUserRoles(req.user.id);
    const userPermissions = await rbac.getUserPermissions(req.user.id);
    
    res.json({
      message: 'Admin dashboard accessed',
      userRoles,
      userPermissions,
      adminFeatures: ['user-management', 'billing', 'analytics']
    });
  }
);

// Content management with multiple permission options
app.post('/api/posts',
  auth.middleware(),
  rbac.middleware(['posts.create', 'content.admin']), // User needs ONE of these
  (req, res) => {
    res.json({ 
      message: 'Post created successfully',
      permissions: 'User has posts.create OR content.admin'
    });
  }
);

// Financial operations (requires multiple permissions)
app.get('/api/billing/invoices',
  auth.middleware(),
  rbac.middleware(['billing.read', 'finance.access'], { requireAll: true }), // User needs BOTH
  (req, res) => {
    res.json({
      message: 'Billing data accessed',
      permissions: 'User has BOTH billing.read AND finance.access',
      invoices: []
    });
  }
);

// Role-based route protection
app.get('/api/super-admin',
  auth.middleware(),
  rbac.roleMiddleware(['super-admin']),
  (req, res) => {
    res.json({ 
      message: 'Super admin area accessed',
      role: 'super-admin'
    });
  }
);

// ============================================
// STEP 5: DYNAMIC PERMISSION CHECKING
// ============================================

app.get('/api/user/capabilities', 
  auth.middleware(),
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Check multiple permissions at once
      const permissions = await rbac.hasPermissions(userId, [
        'posts.create',
        'posts.edit', 
        'posts.delete',
        'users.manage',
        'billing.access',
        'admin.access'
      ]);
      
      // Get user's roles
      const roles = await rbac.getUserRoles(userId);
      
      // Check module access
      const moduleAccess = {
        azureAD: await auth.checkModuleAccess('azure-ad'),
        saml: await auth.checkModuleAccess('saml'),
        auth0: await auth.checkModuleAccess('auth0')
      };
      
      res.json({
        user: req.user,
        permissions,
        roles: roles.map(r => ({ name: r.name, description: r.description })),
        moduleAccess,
        capabilities: {
          canCreatePosts: permissions['posts.create'],
          canManageUsers: permissions['users.manage'],
          canAccessBilling: permissions['billing.access'],
          isAdmin: permissions['admin.access'],
          hasEnterpriseSSO: moduleAccess.azureAD || moduleAccess.saml
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// STEP 6: ROLE MANAGEMENT ENDPOINTS
// ============================================

// Assign role to user (admin only)
app.post('/api/admin/users/:userId/roles',
  auth.middleware(),
  rbac.middleware(['users.manage']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      
      await rbac.assignRole(userId, roleId);
      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Remove role from user (admin only)
app.delete('/api/admin/users/:userId/roles/:roleId',
  auth.middleware(),
  rbac.middleware(['users.manage']),
  async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      
      await rbac.removeRole(userId, roleId);
      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================
// STEP 7: MULTI-TENANT ANALYTICS
// ============================================

app.get('/api/analytics/tenant-usage',
  auth.middleware(),
  rbac.middleware(['analytics.view']),
  async (req, res) => {
    res.json({
      tenantId: req.user.tenantId,
      usage: {
        activeUsers: 150,
        apiCalls: 45230,
        enabledModules: ['auth', 'rbac', 'azure-ad'],
        plan: 'Enterprise'
      },
      features: {
        authentication: 'Unlimited users',
        roleBasedAccess: 'Custom roles & permissions',
        enterpriseSSO: 'Azure AD, SAML, Auth0',
        support: '24/7 priority support'
      }
    });
  }
);

// ============================================
// DEMO ROUTES FOR TESTING
// ============================================

app.get('/demo/test-auth', async (req, res) => {
  try {
    // Test token verification
    const testToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!testToken) {
      return res.json({
        message: 'Send a POST to /login first to get a token, then use it here',
        example: 'Authorization: Bearer YOUR_TOKEN'
      });
    }
    
    const isValid = await auth.verifyToken(testToken);
    const user = isValid ? await auth.getCurrentUser(testToken) : null;
    
    res.json({
      tokenValid: isValid,
      user: user,
      testStatus: isValid ? '✅ Authentication working!' : '❌ Invalid token'
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/demo/test-rbac', 
  auth.middleware(),
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const permissions = await rbac.hasPermissions(userId, [
        'posts.create', 'admin.access', 'billing.read'
      ]);
      
      const roles = await rbac.getUserRoles(userId);
      
      res.json({
        message: '✅ RBAC working!',
        userId,
        permissions,
        roles: roles.map(r => r.name),
        testStatus: 'RBAC module fully functional'
      });
    } catch (error) {
      res.json({ error: error.message });
    }
  }
);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
🚀 SENIOR MANAGEMENT DEMO SERVER RUNNING
===========================================
📍 Server: http://localhost:${PORT}

📋 DEMO ENDPOINTS:
===========================================
Authentication:
  POST /login                          - Standard login
  POST /login/azure                    - Azure AD SSO
  POST /login/saml                     - SAML SSO

Protected Routes:
  GET  /api/profile                    - Basic auth
  GET  /api/admin/dashboard           - Admin only  
  POST /api/posts                     - Content creation
  GET  /api/billing/invoices          - Financial (strict permissions)
  GET  /api/super-admin               - Role-based access

User Management:
  GET  /api/user/capabilities         - Check user permissions
  POST /api/admin/users/:id/roles     - Assign roles
  DELETE /api/admin/users/:id/roles/:roleId - Remove roles

Analytics:
  GET  /api/analytics/tenant-usage    - Tenant metrics

Demo/Testing:
  GET  /demo/test-auth                - Test authentication
  GET  /demo/test-rbac                - Test RBAC

🎯 FEATURES DEMONSTRATED:
===========================================
✅ Multi-tenant authentication
✅ Role-based access control  
✅ Enterprise SSO (Azure AD, SAML)
✅ Granular permissions
✅ Module access control
✅ Real-time authorization
✅ Scalable architecture

💼 BUSINESS VALUE:
===========================================
• Reduce development time by 6+ months
• Enterprise-ready security out of the box
• Scalable to millions of users
• White-label ready
• Pay per tenant/module pricing model
`);
});

module.exports = app;