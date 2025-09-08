async function createSimpleTestUser() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🔍 Creating simple test user...\n');
  
  try {
    // Get tenant ID
    const tenantRes = await fetch(`${BASE_URL}/api/tenants/by-org-id/test-company`);
    const tenant = await tenantRes.json();
    
    console.log('✅ Tenant found:', tenant.orgId);
    
    // Register a new simple user
    const registerData = {
      name: 'Demo Company',
      orgId: 'demo',
      adminEmail: 'demo@example.com',
      adminName: 'Demo Admin',
      adminPassword: 'demo123',
      enabledModules: ['auth', 'rbac']
    };
    
    console.log('\n📝 Creating demo tenant with simple password...');
    const registerRes = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData)
    });
    
    const result = await registerRes.json();
    
    if (registerRes.ok) {
      console.log('✅ Demo tenant created successfully!');
      console.log('   ID:', result.tenant.id);
      console.log('   OrgId:', result.tenant.orgId);
      
      // Test login with new user
      console.log('\n🔐 Testing login with demo user...');
      const demoTenantRes = await fetch(`${BASE_URL}/api/tenants/by-org-id/demo`);
      const demoTenant = await demoTenantRes.json();
      
      const loginRes = await fetch(`${BASE_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'demo@example.com',
          password: 'demo123',
          tenantId: demoTenant.id
        })
      });
      
      const loginData = await loginRes.json();
      
      if (loginRes.ok) {
        console.log('✅ Login successful with demo user!');
        console.log('   Token:', loginData.token.substring(0, 30) + '...');
        
        console.log('\n====================');
        console.log('✅ Demo Setup Complete!');
        console.log('====================');
        console.log('');
        console.log('📱 You can now login at:');
        console.log('   http://localhost:5000/tenant/demo/login');
        console.log('');
        console.log('🔑 Credentials:');
        console.log('   Email: demo@example.com');
        console.log('   Password: demo123');
        console.log('');
        console.log('Or try the original tenant:');
        console.log('   http://localhost:5000/tenant/test-company/login');
        console.log('   (Password issue needs to be fixed)');
      } else {
        console.log('❌ Login failed with demo user:', loginData.message);
      }
      
    } else {
      if (result.message && result.message.includes('already exists')) {
        console.log('ℹ️  Demo tenant already exists');
        console.log('');
        console.log('📱 Try logging in at:');
        console.log('   http://localhost:5000/tenant/demo/login');
        console.log('');
        console.log('🔑 Credentials:');
        console.log('   Email: demo@example.com');
        console.log('   Password: demo123');
      } else {
        console.log('❌ Failed to create demo tenant:', result.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSimpleTestUser().catch(console.error);
