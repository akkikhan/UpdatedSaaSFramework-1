/**
 * Simple API Endpoint Validation
 * Tests individual endpoints with simple HTTP requests
 */

import http from 'http';
import https from 'https';

function makeSimpleRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const dataString = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = protocol.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            text: responseData
          });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testBasicEndpoints() {
  console.log('🔍 TESTING BASIC API ENDPOINTS\n');

  const baseUrl = 'http://localhost:5000';

  try {
    // Test 1: Health Check
    console.log('1. Health Check...');
    const health = await makeSimpleRequest(`${baseUrl}/api/health`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Services: ${health.data ? JSON.stringify(health.data.services) : 'N/A'}`);
    console.log(`   ✅ Health: ${health.status === 200 ? 'PASS' : 'FAIL'}\n`);

    // Test 2: Get Stats
    console.log('2. Get Stats...');
    const stats = await makeSimpleRequest(`${baseUrl}/api/stats`);
    console.log(`   Status: ${stats.status}`);
    if (stats.data) {
      console.log(`   Total Tenants: ${stats.data.totalTenants || 0}`);
      console.log(`   Active Tenants: ${stats.data.activeTenants || 0}`);
    }
    console.log(`   ✅ Stats: ${stats.status === 200 ? 'PASS' : 'FAIL'}\n`);

    // Test 3: Get Tenants
    console.log('3. Get Tenants...');
    const tenants = await makeSimpleRequest(`${baseUrl}/api/tenants`);
    console.log(`   Status: ${tenants.status}`);
    if (tenants.data) {
      console.log(`   Tenant Count: ${tenants.data.length}`);
    }
    console.log(`   ✅ Tenants: ${tenants.status === 200 ? 'PASS' : 'FAIL'}\n`);

    // Test 4: Create Tenant
    console.log('4. Create Tenant...');
    const newTenant = {
      orgId: `api-test-${Date.now()}`,
      name: `API Test Tenant ${Date.now()}`,
      adminEmail: `apitest-${Date.now()}@example.com`,
      enabledModules: ['auth', 'rbac'],
      moduleConfigs: {}
    };

    const createResult = await makeSimpleRequest(`${baseUrl}/api/tenants`, 'POST', newTenant);
    console.log(`   Status: ${createResult.status}`);

    let tenantId = null;
    if (createResult.data && createResult.data.id) {
      tenantId = createResult.data.id;
      console.log(`   Tenant ID: ${tenantId}`);
    }
    console.log(`   ✅ Create Tenant: ${createResult.status === 201 ? 'PASS' : 'FAIL'}\n`);

    if (tenantId) {
      // Test 5: Register User
      console.log('5. Register User...');
      const newUser = {
        email: `testuser-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'API',
        lastName: 'Test',
        tenantId: tenantId
      };

      const userResult = await makeSimpleRequest(
        `${baseUrl}/api/v2/auth/register`,
        'POST',
        newUser
      );
      console.log(`   Status: ${userResult.status}`);
      console.log(`   ✅ Register User: ${userResult.status === 201 ? 'PASS' : 'FAIL'}\n`);

      // Test 6: Login
      console.log('6. Login User...');
      const loginData = {
        email: newUser.email,
        password: newUser.password,
        tenantId: tenantId
      };

      const loginResult = await makeSimpleRequest(
        `${baseUrl}/api/v2/auth/login`,
        'POST',
        loginData
      );
      console.log(`   Status: ${loginResult.status}`);

      let token = null;
      if (loginResult.data && loginResult.data.token) {
        token = loginResult.data.token;
        console.log(`   Token: ${token.substring(0, 30)}...`);
      }
      console.log(`   ✅ Login: ${loginResult.status === 200 ? 'PASS' : 'FAIL'}\n`);

      // Test 7: Get Tenant Users (requires auth)
      if (token) {
        console.log('7. Get Tenant Users...');
        try {
          const usersUrl = `${baseUrl}/api/tenants/${tenantId}/users`;
          // Create request with auth header
          const usersResult = await new Promise((resolve, reject) => {
            const parsedUrl = new URL(usersUrl);
            const options = {
              hostname: parsedUrl.hostname,
              port: parsedUrl.port || 80,
              path: parsedUrl.pathname,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              }
            };

            const req = http.request(options, res => {
              let data = '';
              res.on('data', chunk => (data += chunk));
              res.on('end', () => {
                try {
                  resolve({
                    status: res.statusCode,
                    data: data ? JSON.parse(data) : null
                  });
                } catch (e) {
                  resolve({
                    status: res.statusCode,
                    text: data
                  });
                }
              });
            });

            req.on('error', reject);
            req.end();
          });

          console.log(`   Status: ${usersResult.status}`);
          if (usersResult.data) {
            console.log(`   Users: ${usersResult.data.length || 0}`);
          }
          console.log(`   ✅ Get Users: ${usersResult.status === 200 ? 'PASS' : 'FAIL'}\n`);
        } catch (error) {
          console.log(`   Error: ${error.message}`);
          console.log(`   ✅ Get Users: FAIL\n`);
        }
      }
    }

    console.log('🏁 BASIC ENDPOINT TESTING COMPLETED');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBasicEndpoints();
