const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Tenant configuration loaded from environment variables
const TENANT_CONFIG = {
  tenantId: process.env.TENANT_ID || 'replace_with_tenant_id',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  authApiKey: process.env.AUTH_API_KEY || 'replace_with_auth_api_key',
  rbacApiKey: process.env.RBAC_API_KEY || 'replace_with_rbac_api_key'
};

// Simple Auth SDK simulation (would be imported from npm package)
class AuthSDK {
  constructor(config) {
    this.config = config;
  }

  async authenticate(email, password) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.authApiKey}`,
          'X-Tenant-ID': this.config.tenantId,
        },
        body: JSON.stringify({ email, password, tenantId: this.config.tenantId })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Authentication failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': this.config.tenantId,
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

  async checkPermission(token, userId, permission) {
    try {
      const [resource, action] = permission.split('.');
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/check-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': this.config.tenantId,
        },
        body: JSON.stringify({ userId, resource, action })
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

  async getUserRoles(token, userId) {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/rbac/users/${userId}/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': this.config.tenantId,
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  }
}

// Initialize SDKs
const authSDK = new AuthSDK(TENANT_CONFIG); // Available for auth operations
const rbacSDK = new RBACDK(TENANT_CONFIG); // Available for RBAC operations

// Demo app routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/demo/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const authResult = await authSDK.authenticate(email, password);
    res.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
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
  const { token, userId, permission } = req.body;

  try {
    const hasPermission = await rbacSDK.checkPermission(token, userId, permission);
    res.json({
      success: true,
      hasPermission,
      message: hasPermission
        ? `✅ User has permission: ${permission}`
        : `❌ User lacks permission: ${permission}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '❌ RBAC check failed: ' + error.message
    });
  }
});

app.post('/demo/user-roles', async (req, res) => {
  const { token, userId } = req.body;

  try {
    const roles = await rbacSDK.getUserRoles(token, userId);
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to load roles: ' + error.message });
  }
});

app.get('/demo/status', (req, res) => {
  res.json({
    app: 'SaaS Demo Application',
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

app.get('/demo/config', (req, res) => {
  res.json(TENANT_CONFIG);
});

app.listen(PORT, () => {
  console.log(`🚀 SaaS Demo App running on http://localhost:${PORT}`);
  console.log(`📦 Using Auth API Key: ${TENANT_CONFIG.authApiKey}`);
  console.log(`🔐 Using RBAC API Key: ${TENANT_CONFIG.rbacApiKey}`);
  console.log(`🏢 Tenant: ${TENANT_CONFIG.tenantId}`);
});
