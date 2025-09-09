import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRole, filterRevokedRoles } from '../shared/rbac-utils.mjs';
import { shouldRetry, updateSessionDiagnostics, fetchWithRetry } from '../shared/session-utils.mjs';

test('assignRole adds role only once', () => {
  const user = { roles: ['viewer'] };
  assignRole(user, 'admin');
  assignRole(user, 'admin');
  assert.deepEqual(user.roles.sort(), ['admin', 'viewer']);
});

test('filterRevokedRoles removes revoked entries', () => {
  const roles = ['admin', 'editor', 'viewer'];
  const filtered = filterRevokedRoles(roles, ['editor']);
  assert.deepEqual(filtered, ['admin', 'viewer']);
});

test('shouldRetry respects max attempts', () => {
  assert.equal(shouldRetry(2, 3), true);
  assert.equal(shouldRetry(3, 3), false);
});

test('updateSessionDiagnostics increments attempts and sets timestamp', () => {
  const diag1 = updateSessionDiagnostics();
  assert.equal(diag1.attempts, 1);
  const diag2 = updateSessionDiagnostics(diag1, 'fail');
  assert.equal(diag2.attempts, 2);
  assert.equal(diag2.lastError, 'fail');
  assert.ok(diag2.lastErrorTime >= diag1.lastErrorTime);
  assert.equal(diag2.logs.length, 2);
});

test('fetchWithRetry records logs for each failure', async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return { ok: false, status: 500 };
  };
  const diag = { logs: [] };
  await assert.rejects(() => fetchWithRetry(fakeFetch, 'http://test', {}, diag, 2));
  assert.equal(calls, 2);
  assert.equal(diag.logs.length, 2);
});
