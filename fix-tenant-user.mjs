import { storage } from './server/storage.js';
import { authService } from './server/services/auth.js';

async function checkTenantUser() {
  console.log('🔍 Checking tenant user...\n');
  
  // Get tenant
  const tenant = await storage.getTenantByOrgId('test-company');
  if (!tenant) {
    console.log('❌ Tenant not found');
    process.exit(1);
  }
  
  console.log('✅ Tenant found:');
  console.log('   ID:', tenant.id);
  console.log('   Name:', tenant.name);
  console.log('   OrgId:', tenant.orgId);
  console.log('   Admin Email:', tenant.adminEmail);
  console.log('');
  
  // Get tenant user
  const user = await storage.getTenantUserByEmail(tenant.id, 'admin@test.com');
  if (!user) {
    console.log('❌ User not found in tenant');
    console.log('\n📝 Creating user...');
    
    // Create the user
    const hashedPassword = await authService.hashPassword('TestPassword123!');
    const newUser = await storage.createTenantUser({
      tenantId: tenant.id,
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      status: 'active'
    });
    
    console.log('✅ User created:');
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Status:', newUser.status);
  } else {
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Status:', user.status);
    console.log('   Has Password:', !!user.passwordHash);
    
    // Reset password to ensure it's correct
    console.log('\n🔐 Resetting password to TestPassword123!...');
    const hashedPassword = await authService.hashPassword('TestPassword123!');
    await storage.updateTenantUser(user.id, tenant.id, {
      passwordHash: hashedPassword
    });
    console.log('✅ Password reset successfully');
  }
  
  console.log('\n====================');
  console.log('✅ User is ready!');
  console.log('\n📱 Login at:');
  console.log('   http://localhost:5000/tenant/test-company/login');
  console.log('\n🔑 Credentials:');
  console.log('   Email: admin@test.com');
  console.log('   Password: TestPassword123!');
  
  process.exit(0);
}

checkTenantUser().catch(console.error);
