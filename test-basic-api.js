/**
 * Quick API Health Check and Basic Authentication Test
 * Testing core functionality before comprehensive testing
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    const result = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };

    if (response.headers.get('content-type')?.includes('application/json')) {
      result.data = await response.json();
    } else {
      result.text = await response.text();
    }

    return result;
  } catch (error) {
    return {
      error: error.message,
      status: 0,
      ok: false
    };
  }
}

async function runBasicTests() {
  console.log('🧪 BASIC API TESTING STARTED\n');

  // 1. Health Check
  console.log('1. Testing Health Endpoint...');
  const healthResult = await makeRequest('GET', '/api/health');
  console.log(`   Status: ${healthResult.status}`);
  if (healthResult.data) {
    console.log(`   Response: ${JSON.stringify(healthResult.data, null, 2)}`);
  }
  console.log(`   ✅ Health check: ${healthResult.ok ? 'PASSED' : 'FAILED'}\n`);

  // 2. Get All Tenants
  console.log('2. Testing Get Tenants...');
  const tenantsResult = await makeRequest('GET', '/api/tenants');
  console.log(`   Status: ${tenantsResult.status}`);
  if (tenantsResult.data) {
    console.log(`   Found ${tenantsResult.data.length} tenants`);
  }
  console.log(`   ✅ Get tenants: ${tenantsResult.ok ? 'PASSED' : 'FAILED'}\n`);

  // 3. Create Test Tenant
  console.log('3. Testing Create Tenant...');
  const testTenant = {
    orgId: `test-org-${Date.now()}`,
    name: `Test Organization ${Date.now()}`,
    adminEmail: `admin-${Date.now()}@example.com`,
    enabledModules: ['auth', 'rbac', 'logging', 'monitoring', 'notifications', 'ai-copilot'],
    moduleConfigs: {}
  };

  const createTenantResult = await makeRequest('POST', '/api/tenants', testTenant);
  console.log(`   Status: ${createTenantResult.status}`);

  let testTenantId = null;
  if (createTenantResult.data && createTenantResult.data.id) {
    testTenantId = createTenantResult.data.id;
    console.log(`   Created tenant ID: ${testTenantId}`);
  }
  console.log(`   ✅ Create tenant: ${createTenantResult.ok ? 'PASSED' : 'FAILED'}\n`);

  if (!testTenantId) {
    console.log('❌ Cannot proceed with authentication tests - no tenant created');
    return;
  }

  // 4. Test User Registration
  console.log('4. Testing User Registration...');
  const testUser = {
    email: `testuser-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    tenantId: testTenantId
  };

  const registerResult = await makeRequest('POST', '/api/v2/auth/register', testUser);
  console.log(`   Status: ${registerResult.status}`);
  if (registerResult.data) {
    console.log(`   User ID: ${registerResult.data.id || 'Not provided'}`);
  }
  console.log(`   ✅ User registration: ${registerResult.ok ? 'PASSED' : 'FAILED'}\n`);

  // 5. Test Login
  console.log('5. Testing User Login...');
  const loginData = {
    email: testUser.email,
    password: testUser.password,
    tenantId: testTenantId
  };

  const loginResult = await makeRequest('POST', '/api/v2/auth/login', loginData);
  console.log(`   Status: ${loginResult.status}`);

  let authToken = null;
  if (loginResult.data && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log(`   Token received: ${authToken.substring(0, 20)}...`);
  }
  console.log(`   ✅ User login: ${loginResult.ok ? 'PASSED' : 'FAILED'}\n`);

  // 6. Test Protected Endpoint
  if (authToken) {
    console.log('6. Testing Protected Endpoint...');
    const verifyResult = await makeRequest('GET', '/api/v2/auth/verify', null, {
      Authorization: `Bearer ${authToken}`
    });
    console.log(`   Status: ${verifyResult.status}`);
    console.log(`   ✅ Token verification: ${verifyResult.ok ? 'PASSED' : 'FAILED'}\n`);
  }

  // 7. Test Tenant Users Endpoint
  if (authToken) {
    console.log('7. Testing Tenant Users Endpoint...');
    const usersResult = await makeRequest('GET', `/api/tenants/${testTenantId}/users`, null, {
      Authorization: `Bearer ${authToken}`
    });
    console.log(`   Status: ${usersResult.status}`);
    if (usersResult.data) {
      console.log(`   Found ${usersResult.data.length || 0} users in tenant`);
    }
    console.log(`   ✅ Get tenant users: ${usersResult.ok ? 'PASSED' : 'FAILED'}\n`);
  }

  // 8. Test Tenant Roles Endpoint
  if (authToken) {
    console.log('8. Testing Tenant Roles Endpoint...');
    const rolesResult = await makeRequest('GET', `/api/tenants/${testTenantId}/roles`, null, {
      Authorization: `Bearer ${authToken}`
    });
    console.log(`   Status: ${rolesResult.status}`);
    if (rolesResult.data) {
      console.log(`   Found ${rolesResult.data.length || 0} roles in tenant`);
    }
    console.log(`   ✅ Get tenant roles: ${rolesResult.ok ? 'PASSED' : 'FAILED'}\n`);
  }

  console.log('🏁 BASIC API TESTING COMPLETED');
}

// Run the basic tests
runBasicTests().catch(console.error);
