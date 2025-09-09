import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Install dependencies from a provided offline cache or fallback registries.
function ensureDeps() {
  const hasModules = fs.existsSync('node_modules') && fs.readdirSync('node_modules').length > 0;
  if (hasModules) return;

  const cacheDir = path.resolve('npm-packages-offline-cache');
  const cacheArg = fs.existsSync(cacheDir) ? ` --offline --cache=${cacheDir}` : '';
  const registries = [process.env.NPM_REGISTRY, 'https://registry.npmmirror.com', 'https://registry.npmjs.org'];

  for (const reg of registries.filter(Boolean)) {
    try {
      execSync(
        `npm ci --ignore-scripts --no-audit --no-fund${cacheArg} --fetch-retries=0 --registry=${reg}`,
        { stdio: 'inherit' }
      );
      return;
    } catch {
      console.warn(`Dependency install failed using ${reg}`);
    }
  }

  console.error('Failed to install dependencies. Provide cached packages or registry access.');
  process.exit(1);
}

ensureDeps();

// Minimal .env loader to avoid external dependencies
const envPath = path.resolve('.env.test');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=([\s\S]*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const required = ['LOGGING_API_KEY', 'EMAIL_API_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required demo environment variables: ${missing.join(', ')}`);
  process.exit(1);
} else {
  console.log('All required demo environment variables are set.');
}
