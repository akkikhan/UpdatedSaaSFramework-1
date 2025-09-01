const { Pool } = require('pg');

async function fixDatabaseConstraint() {
    console.log('🔧 Starting database constraint fix...');
    
    const pool = new Pool({
        connectionString: 'postgresql://postgres:NGPTmpisb@95@db.kakmznvbklmtpskudngq.supabase.co:5432/postgres'
    });

    try {
        // Test connection first
        console.log('🔌 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Check current constraint
        console.log('🔍 Checking current password_hash constraint...');
        const currentCheck = await pool.query(
            'SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
            ['platform_admins', 'password_hash']
        );
        
        console.log('Current password_hash nullable status:', currentCheck.rows[0]?.is_nullable);

        // Drop NOT NULL constraint if exists
        console.log('🔧 Executing ALTER TABLE command...');
        await pool.query('ALTER TABLE platform_admins ALTER COLUMN password_hash DROP NOT NULL');
        console.log('✅ ALTER TABLE executed successfully');

        // Verify the change
        console.log('🔍 Verifying the constraint fix...');
        const verifyCheck = await pool.query(
            'SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
            ['platform_admins', 'password_hash']
        );

        const isNullable = verifyCheck.rows[0]?.is_nullable;
        console.log('✅ VERIFICATION: password_hash nullable =', isNullable);

        if (isNullable === 'YES') {
            console.log('🎉 DATABASE CONSTRAINT FIXED SUCCESSFULLY');
            console.log('✅ Azure AD authentication is now unblocked');
            return true;
        } else {
            console.log('❌ DATABASE CONSTRAINT FIX FAILED');
            return false;
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.error('Full error:', error);
        return false;
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Execute the fix
fixDatabaseConstraint()
    .then(success => {
        if (success) {
            console.log('\n✅ TASK 1.1 COMPLETED: Database constraint fixed');
            process.exit(0);
        } else {
            console.log('\n❌ TASK 1.1 FAILED: Database constraint not fixed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
