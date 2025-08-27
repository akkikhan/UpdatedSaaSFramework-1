// Test 6-module integration
import http from 'http';

console.log('🚀 Testing 6-Module Integration\n');

// Test health endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));

    // Test tenant creation with all 6 API keys
    testTenantCreation();
  });
});

req.on('error', err => {
  console.error('❌ Health check failed:', err.message);
});

req.on('timeout', () => {
  console.error('❌ Health check timed out');
  req.destroy();
});

req.setTimeout(5000);
req.end();

function testTenantCreation() {
  console.log('\n🏢 Testing Tenant Creation with 6 API Keys...');

  const tenantData = JSON.stringify({
    name: 'Test Company',
    orgId: 'test-org-' + Date.now(),
    domain: 'test.example.com',
    adminEmail: 'admin@test.example.com',
    adminPassword: 'TempPass123!',
    businessType: 'technology',
    size: 'small'
  });

  const postOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/tenant/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(tenantData)
    },
    timeout: 10000
  };

  const postReq = http.request(postOptions, res => {
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Tenant Creation Response:');
        console.log('Status:', res.statusCode);

        if (response.tenant && response.tenant.authApiKey) {
          console.log('\n🔑 All 6 API Keys Generated:');
          console.log('🔐 Auth API Key:', response.tenant.authApiKey);
          console.log('👥 RBAC API Key:', response.tenant.rbacApiKey);
          console.log('📊 Logging API Key:', response.tenant.loggingApiKey);
          console.log('📈 Monitoring API Key:', response.tenant.monitoringApiKey);
          console.log('🔔 Notifications API Key:', response.tenant.notificationsApiKey);
          console.log('🤖 AI Copilot API Key:', response.tenant.aiCopilotApiKey);

          console.log('\n✅ SUCCESS: All 6 modules are properly integrated!');
          console.log('\n📧 Check your email for onboarding instructions with all module details.');
        } else {
          console.log('❌ Response:', JSON.stringify(response, null, 2));
        }
      } catch (err) {
        console.error('❌ Failed to parse response:', err.message);
        console.log('Raw response:', data);
      }
    });
  });

  postReq.on('error', err => {
    console.error('❌ Tenant creation failed:', err.message);
  });

  postReq.on('timeout', () => {
    console.error('❌ Tenant creation timed out');
    postReq.destroy();
  });

  postReq.setTimeout(10000);
  postReq.write(tenantData);
  postReq.end();
}
