#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 Publishing all SaaS Framework modules to npm...\n');

  // Check if user is logged in to npm
  try {
    const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
    console.log(`👤 Logged in as: ${whoami}\n`);
  } catch (error) {
    console.error('❌ You are not logged in to npm. Please run "npm login" first.');
    process.exit(1);
  }

  // Ask for confirmation
  const proceed = await askQuestion(
    '🤔 Do you want to proceed with publishing all 8 modules? (y/N): '
  );

  if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
    console.log('❌ Publishing cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n📦 Starting publication process...\n');

  let successCount = 0;
  let failCount = 0;
  const results: { module: string; status: string; error?: string }[] = [];

  for (const module of modules) {
    const modulePath = path.join(process.cwd(), 'packages', module);

    if (!existsSync(modulePath)) {
      console.log(`❌ Module directory not found: ${module}`);
      results.push({ module, status: 'failed', error: 'Directory not found' });
      failCount++;
      continue;
    }

    try {
      console.log(`📤 Publishing @saas-framework/${module}...`);

      // Change to module directory
      process.chdir(modulePath);

      // Check if dist directory exists
      if (!existsSync('dist')) {
        console.log(`  ⚠️  No dist directory found for ${module}. Building first...`);
        execSync('npm run build', { stdio: 'inherit' });
      }

      // Publish the module
      execSync('npm publish --access public', { stdio: 'inherit' });

      console.log(`✅ Successfully published @saas-framework/${module}\n`);
      results.push({ module, status: 'success' });
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to publish ${module}:`, error.message);
      results.push({ module, status: 'failed', error: error.message });
      failCount++;
    } finally {
      // Return to root directory
      process.chdir(path.join(__dirname, '..'));
    }
  }

  console.log('\n📊 Publication Summary:');
  console.log(`✅ Successful publications: ${successCount}`);
  console.log(`❌ Failed publications: ${failCount}\n`);

  console.log('📋 Detailed Results:');
  results.forEach(({ module, status, error }) => {
    const statusIcon = status === 'success' ? '✅' : '❌';
    console.log(`${statusIcon} @saas-framework/${module}: ${status}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  });

  if (successCount > 0) {
    console.log('\n🎉 Published modules are now available for installation:');
    results
      .filter(r => r.status === 'success')
      .forEach(({ module }) => {
        console.log(`   npm install @saas-framework/${module}`);
      });
  }

  rl.close();
}

main().catch(console.error);
