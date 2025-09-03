import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

async function fixPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🔐 Fixing password for demo@example.com...\n');
    
    // Generate a new hash using bcryptjs (not bcrypt)
    const password = 'demo123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Password:', password);
    console.log('New Hash:', hash);
    console.log('');
    
    // Update the most recent demo user
    const result = await pool.query(`
      UPDATE tenant_users 
      SET password_hash = $1
      WHERE email = 'demo@example.com' 
      AND tenant_id = '0e540bd8-5d4f-433d-86a9-715111c6f25a'
      RETURNING id, email
    `, [hash]);
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated for:', result.rows[0].email);
      console.log('   User ID:', result.rows[0].id);
      
      // Test the hash
      console.log('\n🔍 Testing password verification...');
      const isValid = await bcrypt.compare(password, hash);
      console.log('   Password verification:', isValid ? '✅ PASS' : '❌ FAIL');
      
      console.log('\n====================');
      console.log('✅ Password Fixed!');
      console.log('====================');
      console.log('');
      console.log('📱 You can now login at:');
      console.log('   http://localhost:5000/tenant/demo/login');
      console.log('');
      console.log('🔑 Credentials:');
      console.log('   Email: demo@example.com');
      console.log('   Password: demo123');
      
    } else {
      console.log('❌ No user updated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPassword().catch(console.error);
