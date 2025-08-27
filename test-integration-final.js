// Test 6-module integration using Node.js http
import http from 'http';

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', err => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Testing 6-Module Integration\n');

  try {
    // Test health endpoint
    console.log('📋 Testing Health Endpoint...');
    const healthOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };

    const healthResult = await makeHttpRequest(healthOptions);

    if (healthResult.statusCode === 200) {
      console.log('✅ Health Check Response:');
      console.log(JSON.stringify(JSON.parse(healthResult.data), null, 2));

      // Test tenant creation
      console.log('\n🏢 Testing Tenant Creation with 6 API Keys...');

      const tenantData = JSON.stringify({
        name: 'Test Company ' + Date.now(),
        orgId: 'test-org-' + Date.now(),
        domain: 'test' + Date.now() + '.example.com',
        adminEmail: 'admin' + Date.now() + '@test.example.com',
        adminPassword: 'TempPass123!',
        businessType: 'technology',
        size: 'small'
      });

      const tenantOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/tenant/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(tenantData)
        }
      };

      const tenantResult = await makeHttpRequest(tenantOptions, tenantData);

      if (tenantResult.statusCode === 200) {
        const tenantResponse = JSON.parse(tenantResult.data);
        console.log('✅ Tenant Creation Successful!');
        console.log('Status Code:', tenantResult.statusCode);

        if (tenantResponse.tenant) {
          console.log('\n🔑 All 6 API Keys Generated Successfully:');
          console.log('🔐 Auth API Key:', tenantResponse.tenant.authApiKey || '❌ Missing');
          console.log('👥 RBAC API Key:', tenantResponse.tenant.rbacApiKey || '❌ Missing');
          console.log('📊 Logging API Key:', tenantResponse.tenant.loggingApiKey || '❌ Missing');
          console.log(
            '📈 Monitoring API Key:',
            tenantResponse.tenant.monitoringApiKey || '❌ Missing'
          );
          console.log(
            '🔔 Notifications API Key:',
            tenantResponse.tenant.notificationsApiKey || '❌ Missing'
          );
          console.log(
            '🤖 AI Copilot API Key:',
            tenantResponse.tenant.aiCopilotApiKey || '❌ Missing'
          );

          const allKeysPresent =
            tenantResponse.tenant.authApiKey &&
            tenantResponse.tenant.rbacApiKey &&
            tenantResponse.tenant.loggingApiKey &&
            tenantResponse.tenant.monitoringApiKey &&
            tenantResponse.tenant.notificationsApiKey &&
            tenantResponse.tenant.aiCopilotApiKey;

          if (allKeysPresent) {
            console.log('\n🎉 SUCCESS: All 6 modules are properly integrated!');
            console.log(
              '✅ Tenant can now use: @saas-framework/auth, rbac, logging, monitoring, notifications, ai-copilot'
            );
            console.log(
              '\n📧 Onboarding email should contain all 6 API keys and module installation instructions.'
            );
          } else {
            console.log('\n❌ ISSUE: Some API keys are missing from the tenant creation response.');
          }
        } else {
          console.log('❌ No tenant data in response:', tenantResponse);
        }
      } else {
        console.log('❌ Tenant creation failed with status:', tenantResult.statusCode);
        console.log('Error response:', tenantResult.data);
      }
    } else {
      console.log('❌ Health check failed with status:', healthResult.statusCode);
      console.log('Response:', healthResult.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();
