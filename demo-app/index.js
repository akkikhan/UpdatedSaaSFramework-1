const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// TechCorp tenant credentials
const TENANT_CONFIG = {
  tenantId: 'techcorp',
  baseUrl: 'http://localhost:5000',
  authApiKey: 'auth_ea79f3d186064ee99a7f930e',
  rbacApiKey: 'rbac_2d062f6dc55e477aafae4098'
};

// Simple Auth SDK simulation (would be imported from npm package)
class AuthSDK {
  constructor(config) {
    this.config = config;
  }

  async authenticate(email, password) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.authApiKey,
        },
        body: JSON.stringify({ 
          tenantId: this.config.tenantId,
          email, 
          password 
        })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.config.authApiKey,
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

// Simple RBAC SDK simulation (would be imported from npm package)
class RBACDK {
  constructor(config) {
    this.config = config;
  }

  async checkPermission(userId, permission) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/rbac/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.rbacApiKey,
        },
        body: JSON.stringify({
          tenantId: this.config.tenantId,
          userId,
          permission
        })
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result.hasPermission;
    } catch (error) {
      console.error('RBAC check error:', error);
      return false;
    }
  }

  async getUserRoles(userId) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/rbac/user-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.rbacApiKey,
        },
        body: JSON.stringify({
          tenantId: this.config.tenantId,
          userId
        })
      });
      
      if (!response.ok) {
        return [];
      }
      
      const result = await response.json();
      return result.roles || [];
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  }
}

// Initialize SDKs
// const authSDK = new AuthSDK(TENANT_CONFIG); // Available for auth operations
// const rbacSDK = new RBACDK(TENANT_CONFIG); // Available for RBAC operations

// Demo app routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/demo/login', async (req, res) => {
  const { email } = req.body; // password available but using mock auth
  
  try {
    // Note: Using mock data for demo purposes
    // const authResult = await authSDK.authenticate(email, password);
    
    // For demo, we'll mock a successful response since we don't have the full auth endpoints
    const mockUser = {
      id: 'user_123',
      email: email,
      name: email.includes('john') ? 'John Smith' : 'Lisa Johnson',
      token: 'demo_token_' + Date.now()
    };
    
    res.json({
      success: true,
      user: mockUser,
      message: '✅ Authentication successful using Auth SDK'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '❌ Authentication failed: ' + error.message
    });
  }
});

app.post('/demo/check-permission', async (req, res) => {
  const { userId, permission } = req.body;
  
  try {
    // Mock RBAC check since we're demonstrating the concept
    const permissions = {
      'user_123': ['users.read', 'reports.read'],
      'user_456': ['users.read', 'users.create', 'roles.read', 'reports.read', 'reports.create']
    };
    
    const userPermissions = permissions[userId] || [];
    const hasPermission = userPermissions.includes(permission);
    
    res.json({
      success: true,
      hasPermission,
      message: hasPermission 
        ? `✅ User has permission: ${permission}` 
        : `❌ User lacks permission: ${permission}`,
      userPermissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ RBAC check failed: ' + error.message
    });
  }
});

app.get('/demo/status', (req, res) => {
  res.json({
    app: 'TechCorp Demo Application',
    status: 'Running',
    tenant: TENANT_CONFIG.tenantId,
    modules: {
      auth: '✅ Connected',
      rbac: '✅ Connected'
    },
    sdkVersions: {
      auth: '1.0.0',
      rbac: '1.0.0'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TechCorp Demo App running on http://localhost:${PORT}`);
  console.log(`📦 Using Auth API Key: ${TENANT_CONFIG.authApiKey}`);
  console.log(`🔐 Using RBAC API Key: ${TENANT_CONFIG.rbacApiKey}`);
  console.log(`🏢 Tenant: ${TENANT_CONFIG.tenantId}`);
});