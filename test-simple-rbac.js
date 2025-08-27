const http = require('http');

// Simple test to verify server is responding
console.log('🔍 Testing server health...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, res => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);

  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response:', data);

    if (res.statusCode === 200) {
      console.log('🎉 Server is healthy! Running comprehensive tests...');
      runComprehensiveTests();
    } else {
      console.log('❌ Server health check failed');
      process.exit(1);
    }
  });
});

req.on('error', error => {
  console.log('❌ Connection failed:', error.message);
  console.log('⚠️ Make sure server is running on localhost:5000');
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Request timeout - server may not be responding');
  req.destroy();
  process.exit(1);
});

req.end();

function runComprehensiveTests() {
  console.log('\n🚀 STARTING COMPREHENSIVE RBAC ENDPOINT TESTING');
  console.log('=' * 60);

  const tests = [
    // Authentication endpoints
    { name: 'Health Check', method: 'GET', path: '/api/health', auth: false },
    {
      name: 'Login Test',
      method: 'POST',
      path: '/api/v2/auth/login',
      auth: false,
      data: { email: 'test@example.com', password: 'password123' }
    },
    {
      name: 'Register Test',
      method: 'POST',
      path: '/api/v2/auth/register',
      auth: false,
      data: {
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      }
    },

    // Tenant endpoints
    { name: 'Get Tenants', method: 'GET', path: '/api/tenants', auth: false },
    { name: 'Get Stats', method: 'GET', path: '/api/stats', auth: false },

    // Permission endpoints
    { name: 'Get Permissions', method: 'GET', path: '/api/permissions', auth: true }
  ];

  let testIndex = 0;
  let results = { total: 0, passed: 0, failed: 0 };

  function runNextTest() {
    if (testIndex >= tests.length) {
      console.log('\n📊 FINAL RESULTS:');
      console.log(`Total Tests: ${results.total}`);
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
      return;
    }

    const test = tests[testIndex++];
    results.total++;

    console.log(`\n🔍 Testing: ${test.name} (${test.method} ${test.path})`);

    const postData = test.data ? JSON.stringify(test.data) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: test.path,
      method: test.method,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${test.name}: PASSED (${res.statusCode})`);
          results.passed++;
        } else if (res.statusCode === 401 && test.auth) {
          console.log(`✅ ${test.name}: PASSED (${res.statusCode} - Auth required as expected)`);
          results.passed++;
        } else {
          console.log(`❌ ${test.name}: FAILED (${res.statusCode})`);
          console.log(`   Response: ${data.substring(0, 200)}...`);
          results.failed++;
        }
        setTimeout(runNextTest, 100); // Small delay between tests
      });
    });

    req.on('error', error => {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      results.failed++;
      setTimeout(runNextTest, 100);
    });

    req.on('timeout', () => {
      console.log(`❌ ${test.name}: TIMEOUT`);
      results.failed++;
      req.destroy();
      setTimeout(runNextTest, 100);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  }

  runNextTest();
}
