// Create demo tenant via API
const http = require('http');

const tenantData = {
  name: "Demo Company",
  orgId: "demo", 
  adminEmail: "akki@primussoft.com",
  enabledModules: ["user-management", "rbac"]
};

function createDemoTenant() {
  const postData = JSON.stringify(tenantData);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/tenants',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚀 Creating demo tenant...');
  console.log('Data:', tenantData);

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      console.log('📄 Response Body:', data);
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ Demo tenant created successfully!');
        console.log('🔗 You can now login at: http://localhost:5000/tenant/demo/login');
        console.log('📧 Email: akki@primussoft.com');
        console.log('🔑 Password: Demo123');
      } else {
        console.log('❌ Failed to create tenant');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
  });

  req.write(postData);
  req.end();
}

createDemoTenant();
