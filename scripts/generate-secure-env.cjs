const crypto = require('crypto');
const fs = require('fs');

function generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function generateSecureEnv() {
    const template = fs.readFileSync('.env.template', 'utf8');
    let secureEnv = template;

    // Generate secure JWT secret
    const jwtSecret = generateSecureSecret(32);
    secureEnv = secureEnv.replace('generate-a-strong-64-character-secret-key-for-production-use-only', jwtSecret);

    // Save as .env.secure.example
    fs.writeFileSync('.env.secure.example', secureEnv);
    
    console.log('✅ Generated secure environment template: .env.secure.example');
    console.log('🔐 JWT Secret generated:', jwtSecret.substring(0, 8) + '...');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Copy .env.secure.example to .env');
    console.log('2. Replace placeholder values with your real credentials');
    console.log('3. Never commit .env to version control');
}

generateSecureEnv();
