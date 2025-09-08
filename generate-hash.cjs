const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'TestPassword123!';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('');
  console.log('To reset the password, run this SQL query:');
  console.log('');
  console.log(`UPDATE tenant_users SET password_hash = '${hash}' WHERE email = 'admin@test.com';`);
}

generateHash().catch(console.error);
