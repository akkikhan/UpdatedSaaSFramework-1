// Direct database password reset
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { tenantUsers } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

dotenv.config();

const { Pool } = pg;

async function resetPassword() {
  console.log('🔐 Resetting tenant user password...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool);
  
  try {
    // Find the user
    const users = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.email, 'admin@test.com'));
    
    if (users.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Tenant ID:', user.tenantId);
    console.log('');
    
    // Generate new password hash
    const newPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔐 Updating password...');
    
    // Update the password
    await db
      .update(tenantUsers)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(tenantUsers.id, user.id));
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('====================');
    console.log('🎉 Password Reset Complete!');
    console.log('====================');
    console.log('');
    console.log('📱 You can now login at:');
    console.log('   http://localhost:5000/tenant/test-company/login');
    console.log('');
    console.log('🔑 Credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: TestPassword123!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetPassword().catch(console.error);
