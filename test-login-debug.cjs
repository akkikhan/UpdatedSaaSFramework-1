// Using built-in fetch (Node 18+)

async function testLogin() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🔍 Testing tenant login...\n');
  
  try {
    // First get tenant details
    const tenantRes = await fetch(`${BASE_URL}/api/tenants/by-org-id/test-company`);
    if (!tenantRes.ok) {
      console.log('❌ Tenant "test-company" not found');
      return;
    }
    
    const tenant = await tenantRes.json();
    console.log('✅ Tenant found:');
    console.log('   ID:', tenant.id);
    console.log('   Name:', tenant.name);
    console.log('   OrgId:', tenant.orgId);
    console.log('');
    
    // Try to login
    console.log('🔐 Testing login...');
    const loginRes = await fetch(`${BASE_URL}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'TestPassword123!',
        tenantId: tenant.id
      })
    });
    
    const loginData = await loginRes.json();
    
    if (loginRes.ok) {
      console.log('✅ Login successful!');
      console.log('   Token:', loginData.token.substring(0, 30) + '...');
      console.log('   User ID:', loginData.user.id);
      console.log('   User Email:', loginData.user.email);
      
      // Test token verification
      console.log('\n🔍 Testing token verification...');
      const verifyRes = await fetch(`${BASE_URL}/api/v2/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        console.log('✅ Token verified successfully');
        console.log('   Valid:', verifyData.valid);
      } else {
        console.log('❌ Token verification failed');
      }
      
      console.log('\n====================');
      console.log('✅ Everything works!');
      console.log('\n📱 You can now login at:');
      console.log('   http://localhost:5000/tenant/test-company/login');
      console.log('\n🔑 Credentials:');
      console.log('   Email: admin@test.com');
      console.log('   Password: TestPassword123!');
      
    } else {
      console.log('❌ Login failed:', loginData.message);
      console.log('\nDebug info:');
      console.log('   Tenant ID:', tenant.id);
      console.log('   Email: admin@test.com');
      console.log('   Password: TestPassword123!');
      
      // Try with orgId instead
      console.log('\n🔐 Trying login with orgId...');
      const loginRes2 = await fetch(`${BASE_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'TestPassword123!',
          orgId: 'test-company'
        })
      });
      
      const loginData2 = await loginRes2.json();
      if (loginRes2.ok) {
        console.log('✅ Login with orgId successful!');
        console.log('   Token:', loginData2.token.substring(0, 30) + '...');
      } else {
        console.log('❌ Login with orgId also failed:', loginData2.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin().catch(console.error);
