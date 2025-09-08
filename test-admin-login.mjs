// Simple Platform Admin Login Test
import fetch from 'node-fetch';

async function testPlatformAdminLogin() {
    console.log('Testing Platform Admin Login...\n');
    
    // Try to login with default credentials
    const credentials = [
        { email: "khan.aakib@outlook.com", password: "admin123" },
        { email: "admin@yourcompany.com", password: "admin123" },
        { email: "akki@primussoft.com", password: "admin123" },
        // Try some other common defaults
        { email: "khan.aakib@outlook.com", password: "Admin123!" },
        { email: "admin@yourcompany.com", password: "password" },
    ];
    
    for (const cred of credentials) {
        try {
            console.log(`Trying: ${cred.email} / ${cred.password}`);
            
            const response = await fetch('http://localhost:5000/api/platform/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cred)
            });
            
            if (response.status === 200) {
                const data = await response.json();
                console.log(`✅ SUCCESS! Login works with:`);
                console.log(`   Email: ${cred.email}`);
                console.log(`   Password: ${cred.password}`);
                console.log(`   Token: ${data.token ? data.token.substring(0, 50) + '...' : 'N/A'}`);
                console.log('');
                console.log('Next steps:');
                console.log('1. Go to: http://localhost:5000/admin/login');
                console.log('2. Use these credentials to login');
                console.log('3. Then navigate to the OnBoard wizard');
                console.log('4. The OnBoard button should work now!');
                return;
            } else {
                console.log(`   ❌ Failed (${response.status})`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n❌ No default credentials worked.');
    console.log('\nTo fix this, you have two options:');
    console.log('\nOption 1: Use Azure AD login (if configured)');
    console.log('- Go to: http://localhost:5000/admin/login');
    console.log('- Click "Sign in with Azure AD"');
    console.log('- Use your khan.aakib@outlook.com Microsoft account');
    console.log('\nOption 2: Create a new platform admin');
    console.log('You\'ll need to manually update the database or use a SQL command.');
}

testPlatformAdminLogin();
