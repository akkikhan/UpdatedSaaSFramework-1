const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function debugTenantAuth() {
    console.log('🔍 DEBUGGING TENANT USER AUTHENTICATION');
    console.log('=====================================');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        const client = await pool.connect();
        console.log('✅ Database connected');

        // Check if tenant exists
        console.log('\n1. Checking if tenant exists...');
        const tenantResult = await client.query('SELECT * FROM tenants WHERE org_id = $1', ['fresh-test-123']);
        console.log('   Tenants found:', tenantResult.rows.length);
        
        if (tenantResult.rows.length > 0) {
            const tenant = tenantResult.rows[0];
            console.log('   Tenant ID:', tenant.id);
            console.log('   Tenant Name:', tenant.name);
            console.log('   Tenant Status:', tenant.status);

            // Check if tenant user exists
            console.log('\n2. Checking if tenant user exists...');
            const userResult = await client.query('SELECT * FROM tenant_users WHERE tenant_id = $1', [tenant.id]);
            console.log('   Tenant users found:', userResult.rows.length);
            
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                console.log('   User ID:', user.id);
                console.log('   User Email:', user.email);
                console.log('   User Status:', user.status);
                console.log('   Password Hash Exists:', !!user.password_hash);
                console.log('   Password Hash Length:', user.password_hash?.length || 0);
                
                // Check if email matches what we're trying to login with
                if (user.email === 'fresh@test.com') {
                    console.log('✅ Email matches login attempt');
                } else {
                    console.log('❌ Email mismatch - User email:', user.email, 'Login email: fresh@test.com');
                }
            } else {
                console.log('❌ CRITICAL ISSUE: No tenant user found!');
                console.log('💡 The createTenantUser call in registration is failing silently');
            }
        } else {
            console.log('❌ CRITICAL ISSUE: Tenant not found!');
        }

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        console.error('Full error:', error);
        await pool.end();
    }
}

debugTenantAuth();
