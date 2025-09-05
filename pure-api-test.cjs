/**
 * Pure Node.js API Key Authentication Test - No imports that might cause conflicts
 */

const http = require('http');

console.log('🧪 Testing API Key Authentication Fix');
console.log('=====================================');

const API_KEY = 'auth_abc123def456ghi789jkl012';

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function test() {
    try {
        console.log('\n1. Testing server health...');
        const health = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/health',
            method: 'GET'
        });
        
        console.log(`Status: ${health.statusCode}`);
        if (health.statusCode === 200) {
            console.log('✅ Server is running');
        } else {
            throw new Error('Server not responding correctly');
        }
        
        console.log('\n2. Testing API key authentication...');
        const auth = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        }, JSON.stringify({}));
        
        console.log(`Status: ${auth.statusCode}`);
        console.log('Response:', JSON.stringify(auth.data, null, 2));
        
        if (auth.statusCode === 200 && auth.data.success) {
            console.log('\n✅ API KEY AUTHENTICATION WORKING!');
            console.log('✅ External NPM packages can now authenticate!');
            console.log('✅ The authentication system has been FIXED!');
            
            console.log('\n3. Testing tenant info endpoint...');
            const tenant = await makeRequest({
                hostname: 'localhost',
                port: 5000,
                path: '/tenant/info',
                method: 'GET',
                headers: {
                    'X-API-Key': API_KEY
                }
            });
            
            console.log(`Status: ${tenant.statusCode}`);
            console.log('Response:', JSON.stringify(tenant.data, null, 2));
            
            if (tenant.statusCode === 200) {
                console.log('\n🎉 COMPLETE SUCCESS!');
                console.log('🎉 API key validation middleware is working perfectly!');
                console.log('🎉 External authentication system is now functional!');
            }
            
        } else {
            console.log('\n❌ Authentication failed - API key not working');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

test();
