const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres'
});

async function fixDB() {
  try {
    console.log('🔧 Executing ALTER TABLE command...');
    await pool.query('ALTER TABLE platform_admins ALTER COLUMN password_hash DROP NOT NULL');
    console.log('✅ ALTER TABLE executed successfully');
    
    const check = await pool.query(
      'SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', 
      ['platform_admins', 'password_hash']
    );
    console.log('✅ VERIFICATION: password_hash nullable =', check.rows[0]?.is_nullable);
    
    if (check.rows[0]?.is_nullable === 'YES') {
      console.log('🎉 DATABASE CONSTRAINT FIXED SUCCESSFULLY');
    } else {
      console.log('❌ DATABASE CONSTRAINT FIX FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }
  
  pool.end();
}

fixDB();
