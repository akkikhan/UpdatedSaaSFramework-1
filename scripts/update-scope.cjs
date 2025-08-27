#!/usr/bin/env node

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

console.log('🔄 Updating package scopes from @saas-framework to @akkikhan...\n');

packages.forEach(packageName => {
  const packagePath = path.join(packagesDir, packageName);
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update the name
    const oldName = packageJson.name;
    packageJson.name = packageJson.name.replace('@saas-framework/', '@akkikhan/saas-framework-');
    
    // Update repository if it exists
    if (packageJson.repository && packageJson.repository.url) {
      packageJson.repository.url = packageJson.repository.url.replace('saas-framework/', 'akkikhan/');
    }
    
    // Write back to file
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    
    console.log(`✅ Updated ${oldName} → ${packageJson.name}`);
  } else {
    console.log(`❌ Package ${packageName} not found at ${packagePath}`);
  }
});

console.log('\n🎉 All package scopes updated!');
console.log('\nNow you can publish with:');
packages.forEach(pkg => {
  console.log(`  npm publish --access public  # from packages/${pkg}/`);
});
