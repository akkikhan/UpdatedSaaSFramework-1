const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres'
});

async function checkTableStructure() {
  try {
    console.log('🔍 Checking platform_admins table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'platform_admins'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Platform admins columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkTableStructure();
