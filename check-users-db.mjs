import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🔍 Checking tenant users in database...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        email,
        tenant_id,
        status,
        password_hash IS NOT NULL as has_password,
        LENGTH(password_hash) as password_length,
        SUBSTRING(password_hash, 1, 10) as hash_prefix
      FROM tenant_users 
      WHERE email IN ('admin@test.com', 'demo@example.com')
      ORDER BY created_at DESC
    `);
    
    console.log('Found', result.rows.length, 'users:\n');
    
    result.rows.forEach(user => {
      console.log('User:', user.email);
      console.log('  ID:', user.id);
      console.log('  Tenant ID:', user.tenant_id);
      console.log('  Status:', user.status);
      console.log('  Has Password:', user.has_password);
      console.log('  Password Length:', user.password_length);
      console.log('  Hash Prefix:', user.hash_prefix);
      console.log('');
    });
    
    if (result.rows.length === 0) {
      console.log('❌ No users found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);
