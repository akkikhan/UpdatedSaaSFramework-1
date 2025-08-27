#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packages = [
  'auth',
  'rbac',
  'logging',
  'monitoring',
  'notifications',
  'ai-copilot',
  'auth-sdk',
  'rbac-sdk'
];

const packagesDir = path.join(__dirname, '..', 'packages');

function publishPackage(packageName) {
  const packagePath = path.join(packagesDir, packageName);
  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`❌ Package ${packageName} not found at ${packagePath}`);
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`\n📦 Publishing ${packageJson.name}@${packageJson.version}...`);

  try {
    process.chdir(packagePath);

    // Check if already published
    try {
      const viewResult = execSync(`npm view ${packageJson.name}@${packageJson.version} version`, {
        encoding: 'utf8'
      });
      if (viewResult.trim() === packageJson.version) {
        console.log(`⚠️  ${packageJson.name}@${packageJson.version} already published`);
        return true;
      }
    } catch (e) {
      // Package not published yet, continue
    }

    // Publish the package
    execSync('npm publish --access public', { stdio: 'inherit' });
    console.log(`✅ Successfully published ${packageJson.name}@${packageJson.version}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish ${packageName}:`);
    console.error(error.message);
    return false;
  }
}

// Get package name from command line or publish all
const targetPackage = process.argv[2];

if (targetPackage) {
  if (packages.includes(targetPackage)) {
    console.log(`Publishing single package: ${targetPackage}`);
    publishPackage(targetPackage);
  } else {
    console.log(
      `❌ Package '${targetPackage}' not found. Available packages: ${packages.join(', ')}`
    );
  }
} else {
  console.log('🚀 Publishing all SaaS Framework modules...\n');

  let successful = 0;
  let failed = 0;

  for (const packageName of packages) {
    if (publishPackage(packageName)) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Publishing Summary:`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${successful + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All modules published successfully!');
    console.log('\nTo install any module, customers can now run:');
    packages.forEach(pkg => {
      console.log(`  npm install @saas-framework/${pkg}`);
    });
  }
}
