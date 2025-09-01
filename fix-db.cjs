const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres'
  });

  try {
    console.log('🔧 Checking current database schema...');
    
    // Check current status
    const checkResult = await pool.query(
      'SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', 
      ['platform_admins', 'password_hash']
    );
    
    console.log('Current password_hash nullable status:', checkResult.rows[0]?.is_nullable);
    
    if (checkResult.rows[0]?.is_nullable !== 'YES') {
      console.log('🔧 Fixing database constraint...');
      await pool.query('ALTER TABLE platform_admins ALTER COLUMN password_hash DROP NOT NULL');
      console.log('✅ ALTER TABLE command executed');
      
      // Verify fix
      const verifyResult = await pool.query(
        'SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', 
        ['platform_admins', 'password_hash']
      );
      
      if (verifyResult.rows[0]?.is_nullable === 'YES') {
        console.log('🎉 TASK 1.1 COMPLETED SUCCESSFULLY - DATABASE CONSTRAINT FIXED');
      } else {
        console.log('❌ TASK 1.1 FAILED - DATABASE CONSTRAINT NOT FIXED');
        process.exit(1);
      }
    } else {
      console.log('✅ Database constraint already fixed');
      console.log('🎉 TASK 1.1 COMPLETED SUCCESSFULLY');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
