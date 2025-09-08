import SaaSRBAC from '../src';

describe('SaaSRBAC', () => {
  it('checks permission using remote service', async () => {
    const client = new SaaSRBAC({ apiKey: 'test', baseUrl: 'https://example.com' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ allowed: false, reason: 'denied', appliedPolicies: [] }) }) as any;

    const decision = await client.hasPermission('user', 'perm');

    expect(decision.allowed).toBe(false);
    expect(global.fetch).toHaveBeenCalled();
  });
});
