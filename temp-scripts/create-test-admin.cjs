const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres'
});

async function createTestAdmin() {
  try {
    console.log('🔧 Creating test platform admin...');
    
    const email = 'test-admin@platform.com';
    const passwordHash = await bcrypt.hash('TestAdmin123!', 10);
    
    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM platform_admins WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      console.log('✅ Admin already exists:', email);
      return existing.rows[0];
    }
    
    // Create new admin with correct columns
    const result = await pool.query(
      'INSERT INTO platform_admins (email, password_hash, name, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email',
      [email, passwordHash, 'Test Admin', 'super_admin', true]
    );
    
    console.log('✅ Platform admin created:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

createTestAdmin();
