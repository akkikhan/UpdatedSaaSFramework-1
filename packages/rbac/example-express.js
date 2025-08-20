// Express.js RBAC Integration Example
const express = require('express');
const { SaaSAuth } = require('@saas-framework/auth');
const { SaaSRBAC } = require('@saas-framework/rbac');

const app = express();
app.use(express.json());

// Initialize both Auth and RBAC SDKs
const auth = new SaaSAuth({
  apiKey: 'auth_your-tenant-key',
  baseUrl: 'https://your-saas-platform.com/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: 'rbac_your-tenant-key',
  baseUrl: 'https://your-saas-platform.com/api/v2/rbac'
});

// Apply auth middleware to all protected routes
app.use(auth.middleware());

// Admin-only route - requires admin role
app.get('/admin/users', 
  rbac.roleMiddleware(['Admin']),
  async (req, res) => {
    res.json({
      message: 'Admin access granted',
      users: [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' }
      ]
    });
  }
);

// Route requiring specific permission
app.post('/users', 
  rbac.middleware(['user.create']),
  async (req, res) => {
    // User has 'user.create' permission
    res.json({
      message: 'User created successfully',
      user: req.body
    });
  }
);

// Route requiring multiple permissions (user must have ALL)
app.put('/users/:id', 
  rbac.middleware(['user.update', 'user.read'], { requireAll: true }),
  async (req, res) => {
    res.json({
      message: 'User updated successfully',
      userId: req.params.id
    });
  }
);

// Route requiring any of multiple permissions (user needs at least ONE)
app.get('/dashboard', 
  rbac.middleware(['dashboard.read', 'admin.access']),
  async (req, res) => {
    res.json({
      message: 'Dashboard access granted',
      permissions: req.user.permissions
    });
  }
);

// Dynamic permission checking
app.get('/check-permissions', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check multiple permissions
    const permissions = await rbac.hasPermissions(userId, [
      'user.create',
      'user.delete',
      'admin.access'
    ]);
    
    res.json({
      userId,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's roles and permissions
app.get('/user/roles', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [roles, permissions] = await Promise.all([
      rbac.getUserRoles(userId),
      rbac.getUserPermissions(userId)
    ]);
    
    res.json({
      userId,
      roles,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('RBAC server running on http://localhost:3001');
});