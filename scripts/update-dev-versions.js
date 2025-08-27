import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const devVersion = '1.0.0-dev.1';

console.log(`🔄 Updating all module versions to ${devVersion} for dev release...\n`);

for (const module of modules) {
  const modulePath = path.join(process.cwd(), 'packages', module);
  const packageJsonPath = path.join(modulePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    console.log(`❌ package.json not found for ${module}`);
    continue;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;

    packageJson.version = devVersion;

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log(`✅ Updated @saas-framework/${module}: ${oldVersion} → ${devVersion}`);
  } catch (error) {
    console.error(`❌ Failed to update ${module}:`, error.message);
  }
}

console.log('\n🎉 All module versions updated for dev release!');
