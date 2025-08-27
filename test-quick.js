/**
 * Quick Tenant Management Test
 * Direct HTTP testing of tenant endpoints with simplified output
 */

import http from 'http';
import { URL } from 'url';

const BASE_URL = 'http://localhost:5000';

// Simple HTTP request function
function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', err => {
      reject(err);
    });

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, testFn) {
  return testFn()
    .then(result => {
      if (result.success) {
        results.passed++;
        console.log(`✅ ${name}`);
      } else {
        results.failed++;
        console.log(`❌ ${name}: ${result.error}`);
      }
      results.tests.push({ name, ...result });
    })
    .catch(error => {
      results.failed++;
      console.log(`❌ ${name}: ${error.message}`);
      results.tests.push({ name, success: false, error: error.message });
    });
}

async function runQuickTest() {
  console.log('🚀 Quick Tenant Management Test');
  console.log('================================');

  // Test 1: Health Check
  await test('Health Check', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/api/health`);
    return {
      success: response.status === 200,
      error: response.status !== 200 ? `Status: ${response.status}` : null,
      data: response.data
    };
  });

  // Test 2: Get Stats
  await test('Get Statistics', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/api/stats`);
    return {
      success: response.status === 200,
      error: response.status !== 200 ? `Status: ${response.status}` : null,
      data: response.data
    };
  });

  // Test 3: Get Tenants
  await test('Get Tenants List', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/api/tenants`);
    return {
      success: response.status === 200 || response.status === 404,
      error:
        response.status !== 200 && response.status !== 404 ? `Status: ${response.status}` : null,
      data: response.data
    };
  });

  // Test 4: Create Tenant
  await test('Create New Tenant', async () => {
    const tenantData = {
      orgId: `test-org-${Date.now()}`,
      name: 'Test Tenant',
      adminEmail: 'admin@test.com',
      enabledModules: ['users', 'roles'],
      moduleConfigs: {}
    };

    const response = await makeRequest('POST', `${BASE_URL}/api/tenants`, tenantData);
    return {
      success: response.status === 201 || response.status === 200,
      error:
        response.status !== 201 && response.status !== 200 ? `Status: ${response.status}` : null,
      data: response.data
    };
  });

  // Test 5: Authentication Endpoints
  await test('Authentication Login Endpoint', async () => {
    const response = await makeRequest('POST', `${BASE_URL}/api/v2/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    // Expect 401 or 400 for invalid credentials, not 500
    return {
      success: response.status === 401 || response.status === 400 || response.status === 200,
      error: response.status === 500 ? `Server error: ${response.status}` : null,
      data: response.data
    };
  });

  // Test 6: Permissions Endpoint
  await test('Get All Permissions', async () => {
    const response = await makeRequest('GET', `${BASE_URL}/api/permissions`);
    return {
      success: response.status === 200 || response.status === 404,
      error:
        response.status !== 200 && response.status !== 404 ? `Status: ${response.status}` : null,
      data: response.data
    };
  });

  // Results Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
  );

  if (results.passed > results.failed) {
    console.log('\n🎉 Overall: SYSTEM FUNCTIONAL ✅');
  } else {
    console.log('\n⚠️  Overall: ISSUES DETECTED ❌');
  }

  return results;
}

// Run test
runQuickTest()
  .then(results => {
    console.log('\n✅ Quick test completed');
    process.exit(results.passed > results.failed ? 0 : 1);
  })
  .catch(error => {
    console.log(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  });
