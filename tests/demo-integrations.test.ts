import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('demo integrations', () => {
  test('dotnet program wires email API key and sends confirmations', () => {
    const content = readFileSync(join(__dirname, '..', 'examples/claims-dotnet/Program.cs'), 'utf-8');
    expect(content).toMatch(/EMAIL_API_KEY/);
    expect(content).toMatch(/SendConfirmationEmail/);
  });

  test('angular demo exposes RBAC role management UI', () => {
    const content = readFileSync(
      join(__dirname, '..', 'examples/claims-angular/src/pages/rbac.component.ts'),
      'utf-8'
    );
    expect(content).toMatch(/RbacComponent/);
    expect(content).toMatch(/createRole/);
  });
});
