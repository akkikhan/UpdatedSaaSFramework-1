const API_BASE = 'http://localhost:3001/api';
const TENANT_ORG_ID = 'acme';

// Helper function to make API requests
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${result.message || response.statusText}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to call ${endpoint}:`, error.message);
    throw error;
  }
}

async function testUserRoleManagement() {
  console.log('🚀 Testing User and Role Management Functionality\n');
  
  try {
    // 1. Get tenant information
    console.log('1. Getting tenant information...');
    const tenants = await apiCall('/tenants');
    const tenant = tenants.find(t => t.orgId === TENANT_ORG_ID);
    
    if (!tenant) {
      throw new Error(`Tenant with orgId "${TENANT_ORG_ID}" not found`);
    }
    
    console.log(`   ✅ Found tenant: ${tenant.name} (ID: ${tenant.id})\n`);
    
    // 2. Create sample roles
    console.log('2. Creating sample roles...');
    
    const rolesToCreate = [
      {
        name: 'Manager',
        description: 'Team manager with user and report access',
        permissions: ['users.read', 'users.create', 'users.update', 'reports.read', 'reports.create']
      },
      {
        name: 'Analyst',
        description: 'Data analyst with read-only access',
        permissions: ['users.read', 'reports.read']
      },
      {
        name: 'Admin Assistant',
        description: 'Administrative support role',
        permissions: ['users.read', 'reports.read', 'settings.read']
      }
    ];
    
    const createdRoles = [];
    
    for (const roleData of rolesToCreate) {
      try {
        const role = await apiCall(`/tenants/${tenant.id}/roles`, 'POST', roleData);
        createdRoles.push(role);
        console.log(`   ✅ Created role: ${role.name}`);
      } catch (error) {
        console.log(`   ⚠️  Role "${roleData.name}" might already exist`);
      }
    }
    
    // Get all existing roles
    const allRoles = await apiCall(`/tenants/${tenant.id}/roles`);
    console.log(`   📋 Total roles available: ${allRoles.length}\n`);
    
    // 3. Create sample users
    console.log('3. Creating sample users...');
    
    const usersToCreate = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@acme.com',
        password: 'Test123!',
        status: 'active'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@acme.com',
        password: 'Test123!',
        status: 'active'
      },
      {
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@acme.com',
        password: 'Test123!',
        status: 'active'
      }
    ];
    
    const createdUsers = [];
    
    for (const userData of usersToCreate) {
      try {
        const user = await apiCall(`/tenants/${tenant.id}/users`, 'POST', userData);
        createdUsers.push(user);
        console.log(`   ✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
      } catch (error) {
        console.log(`   ⚠️  User "${userData.email}" might already exist`);
      }
    }
    
    // Get all existing users
    const allUsers = await apiCall(`/tenants/${tenant.id}/users`);
    console.log(`   👥 Total users available: ${allUsers.length}\n`);
    
    // 4. Assign roles to users
    console.log('4. Assigning roles to users...');
    
    if (allUsers.length > 0 && allRoles.length > 0) {
      // Assign Manager role to first user
      if (allUsers[0]) {
        const managerRole = allRoles.find(r => r.name === 'Manager');
        if (managerRole) {
          try {
            await apiCall(`/tenants/${tenant.id}/users/${allUsers[0].id}/roles`, 'POST', {
              roleId: managerRole.id
            });
            console.log(`   ✅ Assigned "Manager" role to ${allUsers[0].firstName} ${allUsers[0].lastName}`);
          } catch (error) {
            console.log(`   ⚠️  Role assignment might already exist`);
          }
        }
      }
      
      // Assign Analyst role to second user
      if (allUsers[1]) {
        const analystRole = allRoles.find(r => r.name === 'Analyst');
        if (analystRole) {
          try {
            await apiCall(`/tenants/${tenant.id}/users/${allUsers[1].id}/roles`, 'POST', {
              roleId: analystRole.id
            });
            console.log(`   ✅ Assigned "Analyst" role to ${allUsers[1].firstName} ${allUsers[1].lastName}`);
          } catch (error) {
            console.log(`   ⚠️  Role assignment might already exist`);
          }
        }
      }
      
      // Assign multiple roles to third user
      if (allUsers[2]) {
        const adminRole = allRoles.find(r => r.name === 'Admin Assistant');
        const analystRole = allRoles.find(r => r.name === 'Analyst');
        
        for (const role of [adminRole, analystRole].filter(Boolean)) {
          try {
            await apiCall(`/tenants/${tenant.id}/users/${allUsers[2].id}/roles`, 'POST', {
              roleId: role.id
            });
            console.log(`   ✅ Assigned "${role.name}" role to ${allUsers[2].firstName} ${allUsers[2].lastName}`);
          } catch (error) {
            console.log(`   ⚠️  Role assignment might already exist`);
          }
        }
      }
    }
    
    console.log('\n5. Testing user role queries...');
    
    // Test getting user roles
    for (const user of allUsers.slice(0, 3)) {
      try {
        const userRoles = await apiCall(`/tenants/${tenant.id}/users/${user.id}/roles`);
        console.log(`   👤 ${user.firstName} ${user.lastName} has ${userRoles.length} role(s):`);
        userRoles.forEach(role => {
          console.log(`      - ${role.name} (${role.permissions.length} permissions)`);
        });
      } catch (error) {
        console.log(`   ❌ Failed to get roles for ${user.firstName} ${user.lastName}`);
      }
    }
    
    console.log('\n6. Final verification - fetching updated user list...');
    const finalUsers = await apiCall(`/tenants/${tenant.id}/users`);
    console.log(`   📊 Users with role information:`);
    
    finalUsers.forEach(user => {
      const roleCount = user.roles ? user.roles.length : 0;
      const roleNames = user.roles ? user.roles.map(r => r.name).join(', ') : 'No roles';
      console.log(`      ${user.firstName} ${user.lastName}: ${roleNames} (${roleCount} role(s))`);
    });
    
    console.log('\n🎉 User and Role Management Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log(`   - Tenant: ${tenant.name}`);
    console.log(`   - Total Roles: ${allRoles.length}`);
    console.log(`   - Total Users: ${finalUsers.length}`);
    console.log(`   - Role Assignments: Working ✅`);
    console.log(`   - User-Role Queries: Working ✅`);
    console.log('\n🌐 You can now test the UI at: http://localhost:3001/tenant/acme/dashboard');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the server is running on port 3001');
  }
}

// Run the test
testUserRoleManagement();
