import test from 'node:test';
import assert from 'node:assert/strict';
import { requireVerifiedIdentity, IdentityError } from '../worker/src/identity.mjs';
import { reserveJob, CreditError } from '../worker/src/wallet.mjs';

const identity = { verifiedBy: 'res-service-binding', userId: 'u_abcdefgh1234' };
test('identity boundary rejects untrusted browser IDs', () => {
  for (const value of [null, { userId: identity.userId }, { ...identity, banned: true }, { ...identity, suspended: true }, { ...identity, userId: 'other' }])
    assert.throws(() => requireVerifiedIdentity(value), IdentityError);
  assert.deepEqual(requireVerifiedIdentity(identity), { userId: identity.userId });
});
test('wallet rejects invalid generation parameters before charging', async () => {
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            run: async () => ({ success: true }),
            first: async () => null,
          };
        },
      };
    },
  };
  for (const invalid of [
    { jobId: 'validjob123', idempotencyKey: 'validkey123', kind: 'sfx', cost: -1 },
    { jobId: 'validjob123', idempotencyKey: 'validkey123', kind: 'voice', cost: 2 },
    { jobId: 'bad', idempotencyKey: 'validkey123', kind: 'bgm', cost: 2 },
  ]) {
    await assert.rejects(reserveJob(db, identity, invalid), CreditError);
  }
});
