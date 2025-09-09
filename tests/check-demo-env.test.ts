import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const script = path.join(__dirname, '..', 'scripts', 'check-demo-env.mjs');

describe('check-demo-env script', () => {
  it('fails when variables are missing', () => {
    const result = spawnSync('node', [script], { env: {} });
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Missing required demo environment variables');
  });

  it('succeeds when variables are present', () => {
    const env = { ...process.env, LOGGING_API_KEY: 'x', EMAIL_API_KEY: 'y' };
    const result = spawnSync('node', [script], { env });
    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toContain('All required demo environment variables are set.');
  });
});
