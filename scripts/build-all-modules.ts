#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const modules = [
  'auth',
  'rbac',
  'logging',
  'monitoring',
  'notifications',
  'ai-copilot',
  'auth-sdk',
  'rbac-sdk'
];

console.log('🔨 Building all SaaS Framework modules for npm publishing...\n');

let successCount = 0;
let failCount = 0;

for (const module of modules) {
  const modulePath = path.join(process.cwd(), 'packages', module);

  if (!existsSync(modulePath)) {
    console.log(`❌ Module directory not found: ${module}`);
    failCount++;
    continue;
  }

  try {
    console.log(`📦 Building ${module}...`);

    // Change to module directory and build
    process.chdir(modulePath);

    // Install dependencies if node_modules doesn't exist
    if (!existsSync('node_modules')) {
      console.log(`  📥 Installing dependencies for ${module}...`);
      execSync('npm install', { stdio: 'inherit' });
    }

    // Build the module
    execSync('npm run build', { stdio: 'inherit' });

    console.log(`✅ Successfully built ${module}\n`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to build ${module}:`, error.message);
    failCount++;
  } finally {
    // Return to root directory
    process.chdir(path.join(__dirname, '..'));
  }
}

console.log('\n📊 Build Summary:');
console.log(`✅ Successful builds: ${successCount}`);
console.log(`❌ Failed builds: ${failCount}`);

if (failCount > 0) {
  console.log('\n⚠️  Some modules failed to build. Please fix the errors before publishing.');
  process.exit(1);
} else {
  console.log('\n🎉 All modules built successfully! Ready for publishing.');
}
